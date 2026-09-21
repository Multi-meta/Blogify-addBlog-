const { Router } = require("express");
const mongoose = require("mongoose");

const Plan = require("../models/plan");
const Payment = require("../models/payment");
const requireAuth = require("../middlewares/requireAuth");
const { getProvider } = require("../services/payment");
const {
  getActiveSubscription,
  quoteFor,
  activatePayment,
} = require("../services/subscription");
const { HttpError, handle } = require("../utils/route");

// Mounted at /api
const router = Router();

function providerOrFail() {
  try {
    return getProvider();
  } catch (error) {
    throw new HttpError(503, error.message);
  }
}

function idOrFail(value, message) {
  if (typeof value !== "string" || !mongoose.isValidObjectId(value)) {
    throw new HttpError(400, message);
  }
  return value;
}

// ── GET /api/plans — public list of plans that can be bought ────
router.get("/plans", handle(async (req, res) => {
  const plans = await Plan.find({ isActive: true }).sort({ rank: 1 });
  return res.json({ success: true, plans });
}));

// ── GET /api/subscription/me — current plan, what each plan would cost ──
// `quotes` is keyed by plan id so the UI can label buttons Subscribe /
// Upgrade / Renew (and show the pro-rated upgrade price) without guessing.
router.get("/subscription/me", requireAuth, handle(async (req, res) => {
  const current = await getActiveSubscription(req.user._id);
  const plans = await Plan.find({ isActive: true }).sort({ rank: 1 });

  const quotes = {};
  plans.forEach((plan) => { quotes[String(plan._id)] = quoteFor(current, plan); });

  const payments = await Payment.find({ user: req.user._id })
    .sort({ createdAt: -1 })
    .limit(50);

  return res.json({ success: true, current, quotes, payments });
}));

// ── POST /api/subscription/checkout — start buying / upgrading / renewing ──
// Creates a "created" Payment and asks the gateway for an order. The user gets
// nothing until /verify confirms it. The price is worked out here, never trusted
// from the browser.
router.post("/subscription/checkout", requireAuth, handle(async (req, res) => {
  const planId = idOrFail(req.body.planId, "Choose a plan.");
  const plan = await Plan.findById(planId);
  if (!plan || !plan.isActive) throw new HttpError(404, "That plan is not available.");

  const current = await getActiveSubscription(req.user._id);
  const quote = quoteFor(current, plan);
  if (!quote.allowed) throw new HttpError(400, quote.reason);

  const provider = providerOrFail();
  const payment = await Payment.create({
    user: req.user._id,
    plan: plan._id,
    planName: plan.name,
    type: quote.type,
    amount: quote.amount,
    currency: plan.currency,
    durationDays: plan.durationDays,
    gateway: provider.name,
  });

  let order;
  try {
    order = await provider.createOrder(payment);
  } catch (error) {
    payment.status = "failed";
    payment.failureReason = error.message;
    await payment.save();
    throw new HttpError(502, "Could not start the payment. Please try again later.");
  }

  payment.gatewayOrderId = order.orderId;
  await payment.save();

  return res.json({
    success: true,
    payment: { _id: payment._id, planName: plan.name, type: payment.type, amount: payment.amount },
    order,
  });
}));

// ── POST /api/subscription/verify — confirm the payment, activate the plan ──
router.post("/subscription/verify", requireAuth, handle(async (req, res) => {
  const paymentId = idOrFail(req.body.paymentId, "Payment not found.");
  const payment = await Payment.findById(paymentId);
  if (!payment || String(payment.user) !== String(req.user._id)) {
    throw new HttpError(404, "Payment not found.");
  }

  // Confirming twice (double click, retry) is harmless
  if (payment.status === "paid") {
    const current = await getActiveSubscription(req.user._id);
    return res.json({ success: true, payment, current });
  }
  if (payment.status !== "created") {
    throw new HttpError(400, "This payment can no longer be confirmed.");
  }

  const provider = providerOrFail();
  if (payment.gateway !== provider.name) {
    throw new HttpError(400, "This payment belongs to a different payment provider.");
  }

  const result = await provider.verify(payment, req.body);
  if (result.pending) {
    // Still processing at the gateway. Leave the payment open: the browser can ask again,
    // and the gateway's webhook will finish it too.
    return res.status(202).json({ success: true, pending: true, payment });
  }
  if (!result.ok) {
    await Payment.updateOne(
      { _id: payment._id, status: "created" },
      { status: "failed", failureReason: result.reason || "Payment failed." }
    );
    throw new HttpError(402, result.reason || "Payment failed.");
  }

  const done = await activatePayment(payment._id, {
    gatewayPaymentId: result.gatewayPaymentId || "",
    gatewaySignature: result.gatewaySignature || "",
  });
  const current = await getActiveSubscription(req.user._id);
  return res.json({ success: true, payment: done, current });
}));

module.exports = router;
