// ============================================================
// Stripe webhook — POST /api/subscription/stripe/webhook
//
// Stripe calls this after a payment settles. This is the trusted path that
// grants a plan: the request is only accepted if its signature checks out
// against STRIPE_WEBHOOK_SECRET, so nobody can fake a "payment succeeded".
// Mounted in index.js with express.raw() because the signature covers the
// exact bytes of the body.
//
// Events handled (the ones `stripe listen` forwards):
//   payment_intent.succeeded       -> activate the plan (idempotent)
//   payment_intent.payment_failed  -> remember why it failed; the payment stays
//                                     open so the user can retry with another card
//   charge.refunded                -> acknowledged. Refunds started from the admin
//                                     screen are already recorded when they are made.
// ============================================================

const Payment = require("../models/payment");
const { activatePayment } = require("../services/subscription");

async function stripeWebhook(req, res) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!process.env.STRIPE_SECRET_KEY || !secret) {
    console.error("Stripe webhook called but Stripe is not configured.");
    return res.status(503).send("Stripe is not configured.");
  }

  let event;
  try {
    const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
    event = stripe.webhooks.constructEvent(req.body, req.headers["stripe-signature"], secret);
  } catch (error) {
    // Bad signature or malformed body: not from Stripe
    return res.status(400).send("Invalid signature.");
  }

  try {
    if (event.type === "payment_intent.succeeded") {
      const intent = event.data.object;
      const payment = await Payment.findOne({ gateway: "stripe", gatewayOrderId: intent.id });
      const matches =
        payment &&
        String(payment._id) === intent.metadata.paymentId &&
        Math.round(payment.amount * 100) === intent.amount &&
        payment.currency.toLowerCase() === intent.currency;
      if (matches) {
        await activatePayment(payment._id, { gatewayPaymentId: intent.latest_charge || intent.id });
      } else {
        console.error(`Stripe webhook: ${intent.id} does not match any pending payment; ignored.`);
      }
    } else if (event.type === "payment_intent.payment_failed") {
      const intent = event.data.object;
      await Payment.updateOne(
        { gateway: "stripe", gatewayOrderId: intent.id, status: "created" },
        { failureReason: (intent.last_payment_error && intent.last_payment_error.message) || "Payment failed." }
      );
    }
    // charge.refunded and anything else: nothing to do, just acknowledge
    return res.json({ received: true });
  } catch (error) {
    console.error("Stripe webhook handling failed:", error);
    // A 5xx makes Stripe retry later
    return res.status(500).send("Webhook handler error.");
  }
}

module.exports = stripeWebhook;
