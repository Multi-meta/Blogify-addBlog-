const { Router } = require("express");
const mongoose = require("mongoose");

const Destination = require("../models/destination");
const TravelContent = require("../models/travelContent");
const RateCardItem = require("../models/rateCardItem");
const TravelGuide = require("../models/travelGuide");
const GuideReport = require("../models/guideReport");
const requireAuth = require("../middlewares/requireAuth");
const { TRAVEL_CATEGORIES } = require("../data/travelCategories");
const { getAccess, canAccess } = require("../services/subscription");
const { recordUnlocks } = require("../services/guides");
const { guideFields, REPORT_REASONS } = require("../utils/guides");
const { HttpError, handle, str } = require("../utils/route");

// Mounted at /api/travel
const router = Router();

const planSummary = (plan) =>
  plan ? { _id: plan._id, name: plan.name, price: plan.price, rank: plan.rank } : null;

// Locked items keep only what's needed to tempt an upgrade: which section they
// belong to and which plan unlocks them. The title is withheld too — for a hotel
// or a guide the title IS the valuable part (its name). Nothing else leaves the server.
function presentContent(item, access) {
  const unlocked = canAccess(access, item.minPlan);
  return {
    _id: item._id,
    category: item.category,
    title: unlocked ? item.title : null,
    requiredPlan: planSummary(item.minPlan),
    locked: !unlocked,
    body: unlocked ? item.body : null,
    contact: unlocked ? item.contact : null,
  };
}

function presentRateItem(item, access) {
  const unlocked = canAccess(access, item.minPlan);
  return {
    _id: item._id,
    service: item.service,
    requiredPlan: planSummary(item.minPlan),
    locked: !unlocked,
    price: unlocked ? item.price : null,
    unit: unlocked ? item.unit : null,
    notes: unlocked ? item.notes : null,
  };
}

// A community guide as a subscriber sees it. Locked ones reveal nothing but the
// plan that unlocks them. The author's name is public (credit), their email never is.
function presentGuide(guide, access, user) {
  const unlocked = canAccess(access, guide.minPlan);
  return {
    _id: guide._id,
    requiredPlan: planSummary(guide.minPlan),
    locked: !unlocked,
    title: unlocked ? guide.title : null,
    sections: unlocked ? guide.sections : [],
    author: unlocked && guide.author ? { _id: guide.author._id, fullName: guide.author.fullName } : null,
    isMine: !!guide.author && String(guide.author._id) === String(user._id),
    updatedAt: guide.updatedAt,
  };
}

const isId = (value) => typeof value === "string" && mongoose.isValidObjectId(value);

// ── GET /api/travel — public list of destinations (the "teaser" catalogue) ──
router.get("/", handle(async (req, res) => {
  const destinations = await Destination.find({ isPublished: true })
    .select("title slug location summary coverImageURL blogId")
    .sort({ title: 1 });
  return res.json({ success: true, destinations });
}));

// ── GET /api/travel/guides/mine — the signed-in user's own guides ──
router.get("/guides/mine", requireAuth, handle(async (req, res) => {
  const guides = await TravelGuide.find({ author: req.user._id })
    .populate("destination", "title slug")
    .sort({ updatedAt: -1 });
  return res.json({ success: true, guides, categories: TRAVEL_CATEGORIES });
}));

// ── PUT /api/travel/guides/:id — author edits their guide ──
// Any edit sends it back to the admin for review, so approved content
// can't be swapped for something unreviewed.
router.put("/guides/:id", requireAuth, handle(async (req, res) => {
  const guide = isId(req.params.id) && await TravelGuide.findById(req.params.id);
  if (!guide || String(guide.author) !== String(req.user._id)) throw new HttpError(404, "Guide not found.");
  Object.assign(guide, guideFields(req.body), { status: "pending", adminNote: "" });
  guide.set("reviewedBy", undefined);
  guide.set("reviewedAt", undefined);
  await guide.save();
  return res.json({ success: true, guide });
}));

// ── DELETE /api/travel/guides/:id — author withdraws a guide that isn't live ──
router.delete("/guides/:id", requireAuth, handle(async (req, res) => {
  const guide = isId(req.params.id) && await TravelGuide.findById(req.params.id);
  if (!guide || String(guide.author) !== String(req.user._id)) throw new HttpError(404, "Guide not found.");
  if (guide.status === "approved") {
    throw new HttpError(400, "A published guide can only be removed by an admin. You can edit it instead.");
  }
  await guide.deleteOne();
  return res.json({ success: true });
}));

// ── POST /api/travel/guides/:id/report — flag a community guide ──
// Only someone who can actually read the guide can report it.
router.post("/guides/:id/report", requireAuth, handle(async (req, res) => {
  const guide = isId(req.params.id) && await TravelGuide.findOne({ _id: req.params.id, status: "approved" })
    .populate("minPlan", "rank");
  if (!guide) throw new HttpError(404, "Guide not found.");
  if (String(guide.author) === String(req.user._id)) throw new HttpError(400, "You can't report your own guide.");

  const access = await getAccess(req.user);
  if (!canAccess(access, guide.minPlan)) throw new HttpError(403, "You can only report guides you can view.");

  const reason = str(req.body.reason, 20);
  if (!REPORT_REASONS.includes(reason)) throw new HttpError(400, "Choose a reason for the report.");
  const description = str(req.body.description, 1000);
  if (reason === "other" && !description) throw new HttpError(400, "Please describe the problem.");

  if (await GuideReport.exists({ guide: guide._id, reportedBy: req.user._id, status: "pending" })) {
    throw new HttpError(409, "You have already reported this guide. The admin will review it.");
  }

  await GuideReport.create({
    guide: guide._id,
    guideTitle: guide.title,
    destination: guide.destination,
    guideAuthor: guide.author,
    reportedBy: req.user._id,
    reason,
    description,
  });
  return res.json({ success: true });
}));

// ── GET /api/travel/:slug/info — public basics, for the contribute page ──
router.get("/:slug/info", handle(async (req, res) => {
  const destination = await Destination.findOne({ slug: String(req.params.slug).toLowerCase(), isPublished: true })
    .select("title slug location summary");
  if (!destination) throw new HttpError(404, "Destination not found.");
  return res.json({ success: true, destination, categories: TRAVEL_CATEGORIES });
}));

// ── POST /api/travel/:slug/guides — any signed-in user shares their own guide ──
router.post("/:slug/guides", requireAuth, handle(async (req, res) => {
  const destination = await Destination.findOne({ slug: String(req.params.slug).toLowerCase(), isPublished: true });
  if (!destination) throw new HttpError(404, "Destination not found.");

  const pending = await TravelGuide.countDocuments({ author: req.user._id, status: "pending" });
  if (pending >= 10) throw new HttpError(429, "You already have 10 guides waiting for review. Please wait for the admin to review some.");

  const guide = await TravelGuide.create({
    ...guideFields(req.body),
    destination: destination._id,
    author: req.user._id,
  });
  return res.json({ success: true, guide });
}));

// ── GET /api/travel/:slug — the full travel plan, filtered by subscription ──
router.get("/:slug", requireAuth, handle(async (req, res) => {
  const access = await getAccess(req.user);
  if (!access.isAdmin && !access.subscription) {
    throw new HttpError(403, "An active subscription is required to view travel guides.", {
      code: "SUBSCRIPTION_REQUIRED",
    });
  }

  const filter = { slug: String(req.params.slug).toLowerCase() };
  if (!access.isAdmin) filter.isPublished = true;
  const destination = await Destination.findOne(filter);
  if (!destination) throw new HttpError(404, "Destination not found.");

  const [content, rateCard, guides] = await Promise.all([
    TravelContent.find({ destination: destination._id })
      .populate("minPlan", "name price rank")
      .sort({ order: 1, createdAt: 1 }),
    RateCardItem.find({ destination: destination._id })
      .populate("minPlan", "name price rank")
      .sort({ order: 1, createdAt: 1 }),
    TravelGuide.find({ destination: destination._id, status: "approved" })
      .populate("minPlan", "name price rank")
      .populate("author", "fullName")
      .sort({ updatedAt: -1 }),
  ]);

  const sections = content.map((item) => presentContent(item, access));
  const rows = rateCard.map((item) => presentRateItem(item, access));
  const communityGuides = guides.map((g) => presentGuide(g, access, req.user));

  // Note what this subscription has been shown (revenue + refund tracking).
  // A tracking hiccup must never stop the page from loading.
  if (!access.isAdmin) {
    const shown = [];
    if ([...sections, ...rows].some((i) => !i.locked)) shown.push(null); // the admin's official content
    communityGuides.filter((g) => !g.locked).forEach((g) => shown.push(g._id));
    recordUnlocks(req.user, access.subscription, destination._id, shown)
      .catch((error) => console.error("recordUnlocks failed:", error.message));
  }

  const plan = access.subscription && access.subscription.plan;
  return res.json({
    success: true,
    destination,
    categories: TRAVEL_CATEGORIES,
    sections,
    rateCard: rows,
    guides: communityGuides,
    reportReasons: REPORT_REASONS,
    access: {
      isAdmin: access.isAdmin,
      planName: access.isAdmin ? "Admin" : plan ? plan.name : access.subscription.planName,
      rank: access.isAdmin ? null : access.rank,
      expiryDate: access.subscription ? access.subscription.expiryDate : null,
    },
  });
}));

module.exports = router;
