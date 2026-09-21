// ============================================================
// Travel guide rules — unlock tracking, creator revenue, refunds.
// Routes stay thin; the money rules live here.
// ============================================================

const GuideUnlock = require("../models/guideUnlock");
const Subscription = require("../models/subscription");
const Payment = require("../models/payment");
const Plan = require("../models/plan");
const { getProvider } = require("./payment");
const { HttpError } = require("../utils/route");
const { DAY_MS } = require("./subscription");

// Share of a user-written guide's revenue that goes to its author, as a percent.
// Internal to the admin: it is never sent to normal users.
const CREATOR_SHARE_PERCENT = (() => {
  const n = Number(process.env.GUIDE_CREATOR_SHARE_PERCENT);
  return Number.isFinite(n) && n >= 0 && n <= 100 ? n : 50;
})();

// Remember which content a subscription has been shown. `guideIds` may contain
// null for the destination's official content. Safe to call on every page view.
async function recordUnlocks(user, subscription, destinationId, guideIds) {
  if (!subscription || guideIds.length === 0) return;
  await GuideUnlock.bulkWrite(
    guideIds.map((guide) => ({
      updateOne: {
        filter: { subscription: subscription._id, destination: destinationId, guide },
        update: { $setOnInsert: { user: user._id } },
        upsert: true,
      },
    }))
  );
}

// Revenue attribution. A subscription pays for a plan, not for single guides, so
// each subscription's paid money is split equally between the pieces of content it
// was shown (official content counts as one piece per destination). Refunded
// payments earn nothing. Computed on demand, so it is always consistent with
// the payments table.
async function computeRevenue() {
  const [unitsAgg, paidAgg, perContent] = await Promise.all([
    GuideUnlock.aggregate([{ $group: { _id: "$subscription", units: { $sum: 1 } } }]),
    Payment.aggregate([
      { $match: { status: "paid", subscription: { $ne: null } } },
      { $group: { _id: "$subscription", total: { $sum: "$amount" } } },
    ]),
    GuideUnlock.aggregate([
      { $group: { _id: { guide: "$guide", subscription: "$subscription" } } },
    ]),
  ]);

  const units = new Map(unitsAgg.map((r) => [String(r._id), r.units]));
  const paid = new Map(paidAgg.map((r) => [String(r._id), r.total]));

  const byGuide = new Map(); // guideId | "official" -> { gross, unlocks }
  for (const row of perContent) {
    const key = row._id.guide ? String(row._id.guide) : "official";
    const sub = String(row._id.subscription);
    const slice = (paid.get(sub) || 0) / (units.get(sub) || 1);
    const entry = byGuide.get(key) || { gross: 0, unlocks: 0 };
    entry.gross += slice;
    entry.unlocks += 1;
    byGuide.set(key, entry);
  }

  const round = (n) => Math.round(n * 100) / 100;
  const result = { sharePercent: CREATOR_SHARE_PERCENT, official: { gross: 0, unlocks: 0 }, guides: {} };
  for (const [key, { gross, unlocks }] of byGuide) {
    if (key === "official") {
      result.official = { gross: round(gross), unlocks };
    } else {
      result.guides[key] = {
        gross: round(gross),
        unlocks,
        authorShare: round((gross * CREATOR_SHARE_PERCENT) / 100),
      };
    }
  }
  return result;
}

// Which payment would a 100% refund for this user + guide return?
// The user must actually have been shown the guide, and it is the newest paid
// payment of that subscription that gets refunded.
async function findRefundablePayment(userId, guideId) {
  if (!guideId) return null; // a null guide would match the official-content rows
  const unlock = await GuideUnlock.findOne({ user: userId, guide: guideId }).sort({ createdAt: -1 });
  if (!unlock) return null;
  return Payment.findOne({ subscription: unlock.subscription, status: "paid" }).sort({ paidAt: -1 });
}

// Refund a payment in full and take back the access it bought.
async function refundPayment(payment, reason) {
  // Refund through the gateway the payment was made with, even if the site has
  // since switched provider (e.g. earlier test payments made with "mock").
  let provider;
  try {
    provider = getProvider(payment.gateway, { forRefund: true });
  } catch (error) {
    throw new HttpError(503, error.message);
  }

  // Claim it first so a double click can never refund twice
  const claimed = await Payment.findOneAndUpdate(
    { _id: payment._id, status: "paid" },
    { status: "refunded", refundedAt: new Date(), refundAmount: payment.amount, refundReason: reason }
  );
  if (!claimed) throw new HttpError(409, "This payment has already been refunded.");

  let result;
  try {
    result = await provider.refund(payment, payment.amount);
  } catch (error) {
    result = { ok: false, reason: error.message };
  }
  if (!result.ok) {
    await Payment.updateOne(
      { _id: payment._id },
      { status: "paid", $unset: { refundedAt: 1, refundAmount: 1, refundReason: 1 } }
    );
    throw new HttpError(502, `The refund could not be processed: ${result.reason || "payment provider error"}`);
  }
  await Payment.updateOne({ _id: payment._id }, { gatewayRefundId: result.gatewayRefundId || "" });

  // Take back the access: cancel the subscription, or just the refunded period
  // if it had been renewed.
  const sub = await Subscription.findById(payment.subscription);
  if (sub && sub.status === "active") {
    const stillPaid = await Payment.countDocuments({ subscription: sub._id, status: "paid" });
    if (stillPaid === 0) {
      sub.status = "cancelled";
    } else {
      sub.expiryDate = new Date(sub.expiryDate.getTime() - payment.durationDays * DAY_MS);
      if (sub.expiryDate <= new Date()) sub.status = "expired";
    }
    await sub.save();
  }
  return { paymentId: payment._id, amount: payment.amount };
}

// Lowest active plan: the default level for a newly approved guide
async function cheapestPlan() {
  return Plan.findOne({ isActive: true }).sort({ rank: 1 });
}

module.exports = {
  CREATOR_SHARE_PERCENT,
  recordUnlocks,
  computeRevenue,
  findRefundablePayment,
  refundPayment,
  cheapestPlan,
};
