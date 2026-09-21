// ============================================================
// Subscription logic — plans, access checks, pricing, activation.
// Routes stay thin; every rule about who can see what lives here.
// ============================================================

const mongoose = require("mongoose");
const Plan = require("../models/plan");
const Subscription = require("../models/subscription");
const Payment = require("../models/payment");

const DAY_MS = 24 * 60 * 60 * 1000;

// mongoose "sanitizeFilter" is on globally, so operators such as $lte in our
// own (trusted) filters must be wrapped, as done elsewhere in this codebase.
const trusted = (value) => mongoose.trusted(value);

// The plans the site starts with. Only inserted when there are no plans at
// all — after that the admin owns them (edit, reprice, add, remove).
const DEFAULT_PLANS = [
  {
    name: "Basic", price: 49, rank: 1,
    description: "Budget travel — bus & train.",
    features: [
      "Bus & train routes",
      "Budget travel options",
      "Basic destination information",
      "Places to visit",
      "Basic estimated expenses",
      "Basic travel itinerary",
    ],
  },
  {
    name: "Premium", price: 99, rank: 2,
    description: "Your own car or better transport.",
    features: [
      "Everything in Basic",
      "Better hotel recommendations",
      "Car & bike rental information",
      "Better restaurants",
      "More detailed itinerary & cost estimate",
      "Additional destination tips",
    ],
  },
  {
    name: "Ultimate", price: 159, rank: 3,
    description: "Fly in for a complete, convenient trip.",
    features: [
      "Everything in Basic and Premium",
      "Flight information",
      "Premium hotel recommendations",
      "Car rental & local guide details",
      "Detailed day-by-day itinerary",
      "Complete trip budget & premium picks",
    ],
  },
];

async function seedDefaultPlans() {
  if ((await Plan.countDocuments()) > 0) return;
  await Plan.insertMany(DEFAULT_PLANS);
  console.log("Seeded default subscription plans");
}

// Flip anything past its expiry date to "expired". Done lazily whenever a
// user's access is checked, so no cron job is needed.
async function expireStaleSubscriptions(userId) {
  const filter = { status: "active", expiryDate: trusted({ $lte: new Date() }) };
  if (userId) filter.user = userId;
  await Subscription.updateMany(filter, { status: "expired" });
}

async function getActiveSubscription(userId) {
  await expireStaleSubscriptions(userId);
  return Subscription.findOne({ user: userId, status: "active" })
    .sort({ planRank: -1, expiryDate: -1 })
    .populate("plan");
}

// What a request is allowed to see. Admins see everything.
async function getAccess(user) {
  if (!user) return { rank: 0, subscription: null, isAdmin: false };
  if (user.role === "ADMIN") return { rank: Infinity, subscription: null, isAdmin: true };

  const subscription = await getActiveSubscription(user._id);
  const rank = subscription ? (subscription.plan ? subscription.plan.rank : subscription.planRank) : 0;
  return { rank, subscription, isAdmin: false };
}

// Hierarchy rule: plan of rank N unlocks everything requiring rank <= N.
function canAccess(access, requiredPlan) {
  if (access.isAdmin) return true;
  if (!requiredPlan) return false; // required plan was deleted: fail closed
  return access.rank >= requiredPlan.rank;
}

// What would buying `plan` cost this user right now?
//   no active plan            -> "new", full price
//   same plan                 -> "renewal", full price, extends the expiry
//   higher plan               -> "upgrade", price minus unused value of current plan
//   lower/equal-rank plan     -> not allowed until the current one expires
function quoteFor(currentSub, plan) {
  if (!currentSub || !currentSub.plan) {
    return { allowed: true, type: "new", amount: plan.price };
  }
  const current = currentSub.plan;

  if (String(current._id) === String(plan._id)) {
    return { allowed: true, type: "renewal", amount: plan.price };
  }
  if (plan.rank <= current.rank) {
    return {
      allowed: false,
      reason: `You already have ${current.name}, which includes this. You can switch after it expires.`,
    };
  }

  const remainingMs = Math.max(0, currentSub.expiryDate.getTime() - Date.now());
  const periodMs = current.durationDays * DAY_MS;
  const credit = Math.min(current.price, current.price * (remainingMs / periodMs));
  const amount = Math.max(1, Math.round(plan.price - credit));
  return { allowed: true, type: "upgrade", amount, credit: Math.round(credit) };
}

// Called once a payment is confirmed (browser verify call or, later, a gateway
// webhook). Idempotent: the atomic created -> paid flip means a duplicate call
// can never grant the plan twice.
async function activatePayment(paymentId, gatewayFields = {}) {
  const payment = await Payment.findOneAndUpdate(
    { _id: paymentId, status: "created" },
    { status: "paid", paidAt: new Date(), ...gatewayFields },
    { new: true }
  );
  if (!payment) return Payment.findById(paymentId); // already handled

  const plan = await Plan.findById(payment.plan);
  const now = new Date();
  const periodMs = payment.durationDays * DAY_MS;
  const current = await getActiveSubscription(payment.user);

  let subscription;
  if (current && current.plan && String(current.plan._id) === String(payment.plan)) {
    // Renewal: tack the new period onto the end of the current one
    current.expiryDate = new Date(current.expiryDate.getTime() + periodMs);
    await current.save();
    subscription = current;
  } else {
    if (current) {
      current.status = "upgraded";
      await current.save();
    }
    subscription = await Subscription.create({
      user: payment.user,
      plan: payment.plan,
      planName: plan ? plan.name : payment.planName,
      planRank: plan ? plan.rank : 0,
      pricePaid: payment.amount,
      startDate: now,
      expiryDate: new Date(now.getTime() + periodMs),
      payment: payment._id,
    });
  }

  payment.subscription = subscription._id;
  await payment.save();
  return payment;
}

module.exports = {
  DAY_MS,
  trusted,
  seedDefaultPlans,
  expireStaleSubscriptions,
  getActiveSubscription,
  getAccess,
  canAccess,
  quoteFor,
  activatePayment,
};
