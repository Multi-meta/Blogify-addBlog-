const { Router } = require("express");
const mongoose = require("mongoose");

const Plan = require("../models/plan");
const Subscription = require("../models/subscription");
const Payment = require("../models/payment");
const Destination = require("../models/destination");
const TravelContent = require("../models/travelContent");
const RateCardItem = require("../models/rateCardItem");
const TravelGuide = require("../models/travelGuide");
const GuideReport = require("../models/guideReport");
const Blog = require("../models/blog");
const User = require("../models/user");
const requireAdmin = require("../middlewares/requireAdmin");
const { TRAVEL_CATEGORIES, CATEGORY_KEYS } = require("../data/travelCategories");
const { expireStaleSubscriptions, trusted } = require("../services/subscription");
const { computeRevenue, findRefundablePayment, refundPayment, cheapestPlan } = require("../services/guides");
const { guideFields } = require("../utils/guides");
const { HttpError, handle, str } = require("../utils/route");

// Mounted at /admin — everything here is admin-only
const router = Router();
router.use(requireAdmin);

const isId = (value) => typeof value === "string" && mongoose.isValidObjectId(value);

function idParam(value, label) {
  if (!isId(value)) throw new HttpError(404, `${label} not found.`);
  return value;
}

function wholeNumber(value, label, { min = 0, fallback } = {}) {
  if ((value === undefined || value === "" || value === null) && fallback !== undefined) return fallback;
  const n = Number(value);
  if (!Number.isInteger(n) || n < min) throw new HttpError(400, `${label} must be a whole number of ${min} or more.`);
  return n;
}

function money(value, label) {
  const n = Number(value);
  if (value === "" || value === null || !Number.isFinite(n) || n < 0) {
    throw new HttpError(400, `${label} must be 0 or more.`);
  }
  return Math.round(n * 100) / 100;
}

// A content / rate-card item must point at a plan that exists
async function planOrFail(value) {
  if (!isId(value)) throw new HttpError(400, "Choose which plan unlocks this.");
  const plan = await Plan.findById(value);
  if (!plan) throw new HttpError(400, "That plan does not exist.");
  return plan._id;
}

// ════════════════════════════════════════════════════════════════
// PLANS
// ════════════════════════════════════════════════════════════════
function planFields(body) {
  const name = str(body.name, 80);
  if (!name) throw new HttpError(400, "Plan name is required.");

  const rawFeatures = Array.isArray(body.features)
    ? body.features
    : typeof body.features === "string" ? body.features.split("\n") : [];
  const features = rawFeatures.map((f) => str(f, 200)).filter(Boolean).slice(0, 30);

  return {
    name,
    description: str(body.description, 300),
    price: money(body.price, "Price"),
    rank: wholeNumber(body.rank, "Access level (rank)", { min: 1 }),
    durationDays: wholeNumber(body.durationDays, "Duration", { min: 1, fallback: 30 }),
    features,
    isActive: body.isActive === undefined ? true : Boolean(body.isActive),
  };
}

router.get("/plans", handle(async (req, res) => {
  await expireStaleSubscriptions();
  const [plans, subscriberAgg] = await Promise.all([
    Plan.find().sort({ rank: 1, price: 1 }).lean(),
    Subscription.aggregate([
      { $match: { status: "active" } },
      { $group: { _id: "$plan", count: { $sum: 1 } } },
    ]),
  ]);
  const counts = {};
  subscriberAgg.forEach((row) => { counts[String(row._id)] = row.count; });
  return res.json({
    success: true,
    plans: plans.map((p) => ({ ...p, activeSubscribers: counts[String(p._id)] || 0 })),
  });
}));

router.post("/plans", handle(async (req, res) => {
  const plan = await Plan.create(planFields(req.body));
  return res.json({ success: true, plan });
}));

router.put("/plans/:id", handle(async (req, res) => {
  const plan = await Plan.findById(idParam(req.params.id, "Plan"));
  if (!plan) throw new HttpError(404, "Plan not found.");
  Object.assign(plan, planFields(req.body));
  await plan.save();
  return res.json({ success: true, plan });
}));

// A plan that has content, subscribers or payments attached can't be deleted
// without orphaning them — deactivate it instead (hidden from buyers, existing
// subscribers keep their access until expiry).
router.delete("/plans/:id", handle(async (req, res) => {
  const id = idParam(req.params.id, "Plan");
  const [content, rates, subs, payments, guides] = await Promise.all([
    TravelContent.countDocuments({ minPlan: id }),
    RateCardItem.countDocuments({ minPlan: id }),
    Subscription.countDocuments({ plan: id }),
    Payment.countDocuments({ plan: id }),
    TravelGuide.countDocuments({ minPlan: id }),
  ]);
  if (content + rates + subs + payments + guides > 0) {
    throw new HttpError(
      409,
      "This plan is in use (content, subscribers or payments). Deactivate it instead of deleting."
    );
  }
  const plan = await Plan.findByIdAndDelete(id);
  if (!plan) throw new HttpError(404, "Plan not found.");
  return res.json({ success: true });
}));

// ════════════════════════════════════════════════════════════════
// DESTINATIONS
// ════════════════════════════════════════════════════════════════
const slugify = (text) =>
  text.toLowerCase().normalize("NFKD").replace(/[^\w\s-]/g, "").trim()
    .replace(/[\s_-]+/g, "-").replace(/^-+|-+$/g, "");

async function slugTaken(slug, excludeId) {
  const filter = { slug };
  if (excludeId) filter._id = trusted({ $ne: excludeId });
  return Boolean(await Destination.exists(filter));
}

async function uniqueSlug(base, excludeId) {
  const root = base || "destination";
  let slug = root;
  let n = 1;
  while (await slugTaken(slug, excludeId)) slug = `${root}-${++n}`;
  return slug;
}

async function destinationFields(body, existing) {
  const title = str(body.title, 120);
  if (!title) throw new HttpError(400, "Destination title is required.");

  // Slug is part of the public URL (/travel/<slug>) and of links inside blog
  // posts, so it is only regenerated for new destinations or set explicitly.
  let slug = existing ? existing.slug : await uniqueSlug(slugify(title));
  const wanted = str(body.slug, 80).toLowerCase();
  if (wanted && wanted !== slug) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(wanted)) {
      throw new HttpError(400, "Slug may only contain lowercase letters, numbers and hyphens.");
    }
    if (await slugTaken(wanted, existing && existing._id)) throw new HttpError(409, "That slug is already used.");
    slug = wanted;
  }

  const cover = str(body.coverImageURL, 500);
  if (cover && !/^(\/|https?:\/\/)/i.test(cover)) {
    throw new HttpError(400, "Cover image must be a link starting with / or http(s)://");
  }

  let blogId = null;
  if (body.blogId) {
    if (!isId(body.blogId) || !(await Blog.exists({ _id: body.blogId }))) {
      throw new HttpError(400, "The linked blog does not exist.");
    }
    blogId = body.blogId;
  }

  return {
    title,
    slug,
    location: str(body.location, 120),
    summary: str(body.summary, 500),
    coverImageURL: cover,
    blogId,
    isPublished: body.isPublished === undefined ? true : Boolean(body.isPublished),
  };
}

router.get("/destinations", handle(async (req, res) => {
  const [destinations, contentAgg, rateAgg] = await Promise.all([
    Destination.find().populate("blogId", "title").sort({ title: 1 }).lean(),
    TravelContent.aggregate([{ $group: { _id: "$destination", count: { $sum: 1 } } }]),
    RateCardItem.aggregate([{ $group: { _id: "$destination", count: { $sum: 1 } } }]),
  ]);
  const contentCounts = {};
  const rateCounts = {};
  contentAgg.forEach((row) => { contentCounts[String(row._id)] = row.count; });
  rateAgg.forEach((row) => { rateCounts[String(row._id)] = row.count; });

  return res.json({
    success: true,
    destinations: destinations.map((d) => ({
      ...d,
      contentCount: contentCounts[String(d._id)] || 0,
      rateCardCount: rateCounts[String(d._id)] || 0,
    })),
  });
}));

router.post("/destinations", handle(async (req, res) => {
  const destination = await Destination.create(await destinationFields(req.body));
  return res.json({ success: true, destination });
}));

// Everything about one destination, unfiltered, for the admin editor
router.get("/destinations/:id", handle(async (req, res) => {
  const id = idParam(req.params.id, "Destination");
  const destination = await Destination.findById(id);
  if (!destination) throw new HttpError(404, "Destination not found.");

  const [content, rateCard, plans] = await Promise.all([
    TravelContent.find({ destination: id }).populate("minPlan", "name price rank").sort({ order: 1, createdAt: 1 }),
    RateCardItem.find({ destination: id }).populate("minPlan", "name price rank").sort({ order: 1, createdAt: 1 }),
    Plan.find().sort({ rank: 1 }),
  ]);
  return res.json({ success: true, destination, content, rateCard, plans, categories: TRAVEL_CATEGORIES });
}));

router.put("/destinations/:id", handle(async (req, res) => {
  const destination = await Destination.findById(idParam(req.params.id, "Destination"));
  if (!destination) throw new HttpError(404, "Destination not found.");
  Object.assign(destination, await destinationFields(req.body, destination));
  await destination.save();
  return res.json({ success: true, destination });
}));

router.delete("/destinations/:id", handle(async (req, res) => {
  const id = idParam(req.params.id, "Destination");
  const destination = await Destination.findByIdAndDelete(id);
  if (!destination) throw new HttpError(404, "Destination not found.");
  await Promise.all([
    TravelContent.deleteMany({ destination: id }),
    RateCardItem.deleteMany({ destination: id }),
    TravelGuide.deleteMany({ destination: id }),
  ]);
  return res.json({ success: true });
}));

// ════════════════════════════════════════════════════════════════
// TRAVEL CONTENT  (hotels, transport, guides, itinerary, ...)
// ════════════════════════════════════════════════════════════════
async function contentFields(body) {
  const category = str(body.category, 40);
  if (!CATEGORY_KEYS.includes(category)) throw new HttpError(400, "Choose a valid section.");
  const title = str(body.title, 160);
  if (!title) throw new HttpError(400, "Title is required.");
  return {
    category,
    title,
    body: str(body.body, 8000),
    contact: str(body.contact, 500),
    minPlan: await planOrFail(body.minPlan),
    order: wholeNumber(body.order, "Order", { fallback: 0 }),
  };
}

router.post("/destinations/:id/content", handle(async (req, res) => {
  const id = idParam(req.params.id, "Destination");
  if (!(await Destination.exists({ _id: id }))) throw new HttpError(404, "Destination not found.");
  const item = await TravelContent.create({ ...(await contentFields(req.body)), destination: id });
  return res.json({ success: true, item: await item.populate("minPlan", "name price rank") });
}));

router.put("/travel-content/:id", handle(async (req, res) => {
  const item = await TravelContent.findById(idParam(req.params.id, "Content"));
  if (!item) throw new HttpError(404, "Content not found.");
  Object.assign(item, await contentFields(req.body));
  await item.save();
  return res.json({ success: true, item: await item.populate("minPlan", "name price rank") });
}));

router.delete("/travel-content/:id", handle(async (req, res) => {
  const item = await TravelContent.findByIdAndDelete(idParam(req.params.id, "Content"));
  if (!item) throw new HttpError(404, "Content not found.");
  return res.json({ success: true });
}));

// ════════════════════════════════════════════════════════════════
// RATE CARD
// ════════════════════════════════════════════════════════════════
async function rateFields(body) {
  const service = str(body.service, 120);
  if (!service) throw new HttpError(400, "Service name is required.");
  return {
    service,
    price: money(body.price, "Price"),
    unit: str(body.unit, 40),
    notes: str(body.notes, 300),
    minPlan: await planOrFail(body.minPlan),
    order: wholeNumber(body.order, "Order", { fallback: 0 }),
  };
}

router.post("/destinations/:id/rate-card", handle(async (req, res) => {
  const id = idParam(req.params.id, "Destination");
  if (!(await Destination.exists({ _id: id }))) throw new HttpError(404, "Destination not found.");
  const item = await RateCardItem.create({ ...(await rateFields(req.body)), destination: id });
  return res.json({ success: true, item: await item.populate("minPlan", "name price rank") });
}));

router.put("/rate-card/:id", handle(async (req, res) => {
  const item = await RateCardItem.findById(idParam(req.params.id, "Rate card item"));
  if (!item) throw new HttpError(404, "Rate card item not found.");
  Object.assign(item, await rateFields(req.body));
  await item.save();
  return res.json({ success: true, item: await item.populate("minPlan", "name price rank") });
}));

router.delete("/rate-card/:id", handle(async (req, res) => {
  const item = await RateCardItem.findByIdAndDelete(idParam(req.params.id, "Rate card item"));
  if (!item) throw new HttpError(404, "Rate card item not found.");
  return res.json({ success: true });
}));

// ════════════════════════════════════════════════════════════════
// COMMUNITY GUIDES  (written by users, reviewed here)
// ════════════════════════════════════════════════════════════════
const GUIDE_STATUSES = ["pending", "approved", "rejected"];

router.get("/guides", handle(async (req, res) => {
  const [guides, plans, revenue] = await Promise.all([
    TravelGuide.find()
      .populate("author", "fullName email")
      .populate("destination", "title slug")
      .populate("minPlan", "name price rank")
      .sort({ updatedAt: -1 })
      .limit(300)
      .lean(),
    Plan.find().sort({ rank: 1 }),
    computeRevenue(),
  ]);

  // Pending first, so the review queue is what the admin sees
  const order = { pending: 0, approved: 1, rejected: 2 };
  guides.sort((a, b) => order[a.status] - order[b.status]);

  return res.json({
    success: true,
    guides: guides.map((g) => ({ ...g, revenue: revenue.guides[String(g._id)] || { gross: 0, unlocks: 0, authorShare: 0 } })),
    plans,
    categories: TRAVEL_CATEGORIES,
    revenue: { sharePercent: revenue.sharePercent, official: revenue.official },
  });
}));

// Edit a guide's content and/or review it (approve / reject / change its level)
router.put("/guides/:id", handle(async (req, res) => {
  const guide = await TravelGuide.findById(idParam(req.params.id, "Guide"));
  if (!guide) throw new HttpError(404, "Guide not found.");

  Object.assign(guide, guideFields(req.body));
  guide.adminNote = str(req.body.adminNote, 500);

  if (req.body.minPlan) guide.minPlan = await planOrFail(req.body.minPlan);
  const status = str(req.body.status, 20);
  if (status) {
    if (!GUIDE_STATUSES.includes(status)) throw new HttpError(400, "Invalid status.");
    if (status === "approved" && !guide.minPlan) {
      const fallback = await cheapestPlan();
      if (!fallback) throw new HttpError(400, "Create a plan first, then choose which plan unlocks this guide.");
      guide.minPlan = fallback._id;
    }
    guide.status = status;
    guide.reviewedBy = req.user._id;
    guide.reviewedAt = new Date();
  }

  await guide.save();
  return res.json({ success: true, guide });
}));

router.delete("/guides/:id", handle(async (req, res) => {
  const guide = await TravelGuide.findByIdAndDelete(idParam(req.params.id, "Guide"));
  if (!guide) throw new HttpError(404, "Guide not found.");
  // Reports about it are kept (they hold a copy of the title) so the admin can still
  // rule on them, and refund if the guide was wrong. Unlock history stays for revenue.
  return res.json({ success: true });
}));

// ════════════════════════════════════════════════════════════════
// GUIDE REPORTS  (subscribers flagging a community guide)
// ════════════════════════════════════════════════════════════════
router.get("/guide-reports", handle(async (req, res) => {
  const status = str(req.query.status, 20);
  const filter = GUIDE_STATUSES.includes(status) ? { status } : {};

  const rows = await GuideReport.find(filter)
    .populate("destination", "title slug")
    .populate("guideAuthor", "fullName email")
    .populate("reportedBy", "fullName email")
    .sort({ createdAt: -1 })
    .limit(200)
    .lean();

  // `guide` is looked up by hand (not populated) so a removed guide leaves its id
  // intact: the refund lookup below still needs it.
  const guideRows = await TravelGuide.find({ _id: trusted({ $in: rows.map((r) => r.guide) }) }).select("title status").lean();
  const guideById = new Map(guideRows.map((g) => [String(g._id), g]));

  // Can this reporter be refunded? Only shown once the admin found the guide incorrect.
  const withRefund = await Promise.all(rows.map(async (r) => {
    const base = { ...r, guide: guideById.get(String(r.guide)) || null, refundable: null };
    if (r.verdict !== "incorrect" || (r.refund && r.refund.payment)) return base;
    const payment = r.reportedBy && await findRefundablePayment(r.reportedBy._id, r.guide);
    if (payment) base.refundable = { paymentId: payment._id, amount: payment.amount, planName: payment.planName };
    return base;
  }));

  const pending = await GuideReport.countDocuments({ status: "pending" });
  return res.json({ success: true, reports: withRefund, pending });
}));

// action: correct  = the guide is fine (report dismissed)
//         incorrect = the guide is wrong (report upheld)
//         approve / reject = accept or dismiss the report without a finding on the guide
const REPORT_ACTIONS = {
  correct:   { status: "rejected", verdict: "correct" },
  incorrect: { status: "approved", verdict: "incorrect" },
  approve:   { status: "approved" },
  reject:    { status: "rejected" },
};

router.patch("/guide-reports/:id", handle(async (req, res) => {
  const report = await GuideReport.findById(idParam(req.params.id, "Report"));
  if (!report) throw new HttpError(404, "Report not found.");
  const change = REPORT_ACTIONS[str(req.body.action, 20)];
  if (!change) throw new HttpError(400, "Unknown action.");
  if (report.refund && report.refund.payment) throw new HttpError(409, "This report has been refunded and can't be changed.");

  Object.assign(report, change, {
    adminNote: str(req.body.adminNote, 500),
    resolvedBy: req.user._id,
    resolvedAt: new Date(),
  });
  await report.save();
  return res.json({ success: true, report });
}));

// 100% refund of the reporter's payment. Only after the guide was found incorrect,
// and only if the reporter was actually shown that guide on a paid subscription.
router.post("/guide-reports/:id/refund", handle(async (req, res) => {
  const report = await GuideReport.findById(idParam(req.params.id, "Report"));
  if (!report) throw new HttpError(404, "Report not found.");
  if (report.verdict !== "incorrect") throw new HttpError(400, "Mark the guide as incorrect before refunding.");
  if (report.refund && report.refund.payment) throw new HttpError(409, "Already refunded.");

  const payment = await findRefundablePayment(report.reportedBy, report.guide);
  if (!payment) throw new HttpError(400, "This user has no paid subscription that gave them access to this guide.");

  const refunded = await refundPayment(payment, `Incorrect travel guide: ${report.guideTitle}`);
  report.refund = { payment: refunded.paymentId, amount: refunded.amount, refundedAt: new Date() };
  await report.save();
  return res.json({ success: true, refund: report.refund });
}));

// ════════════════════════════════════════════════════════════════
// USERS & THEIR PLAN  (view every user's level; grant / remove a plan by hand)
// ════════════════════════════════════════════════════════════════
router.get("/user-subscriptions", handle(async (req, res) => {
  await expireStaleSubscriptions();
  const [users, active] = await Promise.all([
    User.find().select("fullName email role createdAt").sort({ createdAt: -1 }).limit(500).lean(),
    Subscription.find({ status: "active" }).sort({ planRank: -1 }).lean(),
  ]);
  const byUser = new Map();
  active.forEach((s) => { if (!byUser.has(String(s.user))) byUser.set(String(s.user), s); });
  return res.json({
    success: true,
    users: users.map((u) => ({ ...u, subscription: byUser.get(String(u._id)) || null })),
  });
}));

// Give a user a plan directly (planId), or take their plan away (planId: null).
// Creates no payment: it is an admin grant, clearly marked, and earns no revenue.
router.put("/user-subscriptions/:userId", handle(async (req, res) => {
  const user = await User.findById(idParam(req.params.userId, "User"));
  if (!user) throw new HttpError(404, "User not found.");

  let plan = null;
  if (req.body.planId) {
    plan = await Plan.findById(idParam(req.body.planId, "Plan"));
    if (!plan) throw new HttpError(404, "Plan not found.");
  }

  await Subscription.updateMany({ user: user._id, status: "active" }, { status: "cancelled" });
  let subscription = null;
  if (plan) {
    const now = new Date();
    subscription = await Subscription.create({
      user: user._id,
      plan: plan._id,
      planName: plan.name,
      planRank: plan.rank,
      pricePaid: 0,
      startDate: now,
      expiryDate: new Date(now.getTime() + plan.durationDays * 24 * 60 * 60 * 1000),
      grantedByAdmin: true,
    });
  }
  return res.json({ success: true, subscription });
}));

// ════════════════════════════════════════════════════════════════
// SUBSCRIBERS & REVENUE
// ════════════════════════════════════════════════════════════════
router.get("/subscriptions", handle(async (req, res) => {
  await expireStaleSubscriptions();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [activeSubscribers, revenueAgg, recentAgg, subscriptions, payments, refundAgg] = await Promise.all([
    Subscription.countDocuments({ status: "active" }),
    Payment.aggregate([{ $match: { status: "paid" } }, { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } }]),
    Payment.aggregate([{ $match: { status: "paid", paidAt: { $gte: thirtyDaysAgo } } }, { $group: { _id: null, total: { $sum: "$amount" } } }]),
    Subscription.find().populate("user", "fullName email").sort({ createdAt: -1 }).limit(100),
    Payment.find().populate("user", "fullName email").sort({ createdAt: -1 }).limit(100),
    Payment.aggregate([{ $match: { status: "refunded" } }, { $group: { _id: null, total: { $sum: "$refundAmount" }, count: { $sum: 1 } } }]),
  ]);

  return res.json({
    success: true,
    summary: {
      activeSubscribers,
      revenueTotal: revenueAgg[0] ? revenueAgg[0].total : 0,
      paidPayments: revenueAgg[0] ? revenueAgg[0].count : 0,
      revenueLast30Days: recentAgg[0] ? recentAgg[0].total : 0,
      refundedTotal: refundAgg[0] ? refundAgg[0].total : 0,
      refundedCount: refundAgg[0] ? refundAgg[0].count : 0,
    },
    subscriptions,
    payments,
  });
}));

module.exports = router;
