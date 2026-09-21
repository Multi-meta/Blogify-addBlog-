// ============================================================
// Seed demo travel data into the EXISTING database.
//
//   node scripts/seedTravelDemo.js
//
// Creates (only what is missing, so it is safe to run again and never
// overwrites edits an admin made):
//   - 5 travel blogs + 5 destinations linked to them
//   - Travel Guide content for the Basic / Premium / Ultimate plans
//   - a rate card for every destination
//   - test accounts: an admin, a test user and a second user
//   - 2 approved + 1 pending user-written guides
//   - one paid (mock-gateway) subscription for the second user and one
//     pending report on a guide, so the report -> refund flow can be tried
//
// It uses the same models and services as the website. Set MONGO_URI to
// seed a different database (default: the site's own local database).
// Only local databases are allowed unless SEED_ALLOW_REMOTE=true, because the
// demo accounts (including an admin) have passwords that are written in this file.
// ============================================================

const mongoose = require("mongoose");

const User = require("../models/user");
const Blog = require("../models/blog");
const Plan = require("../models/plan");
const Payment = require("../models/payment");
const Destination = require("../models/destination");
const TravelContent = require("../models/travelContent");
const RateCardItem = require("../models/rateCardItem");
const TravelGuide = require("../models/travelGuide");
const GuideReport = require("../models/guideReport");
const { seedDefaultPlans, activatePayment, getActiveSubscription } = require("../services/subscription");
const { recordUnlocks } = require("../services/guides");
const destinations = require("./travelDemoData");

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/blogify";

const ACCOUNTS = {
  admin:    { fullName: "Travel Admin",  email: "traveladmin@example.com",    password: "TravelAdmin@123",    role: "ADMIN" },
  tester:   { fullName: "Travel Tester", email: "traveltest@example.com",     password: "TravelTest@123",     role: "USER" },
  reporter: { fullName: "Riya Reporter", email: "travelreporter@example.com", password: "TravelReporter@123", role: "USER" },
};

const esc = (text) => String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// The article's HTML (what the rich-text editor would produce)
function blogHtml(dest) {
  const b = dest.blog;
  const button = `<p><a href="/travel/${dest.slug}">Travel Guide</a></p>`;
  const list = (items) => `<ul>${items.map((i) => `<li><p>${esc(i)}</p></li>`).join("")}</ul>`;
  return [
    `<h2><strong>${esc(b.heading)}</strong></h2>`,
    `<img src="${dest.cover}" alt="${esc(dest.title)}">`,
    `<p>${esc(b.intro)}</p>`,
    button,
    `<h2><strong>About ${esc(dest.title)}</strong></h2>`,
    `<p>${esc(b.about)}</p>`,
    `<h2><strong>Places to Visit</strong></h2>`,
    `<ul>${b.places.map(([n, d]) => `<li><p><strong>${esc(n)}</strong> – ${esc(d)}</p></li>`).join("")}</ul>`,
    `<h2><strong>How to Reach</strong></h2>`,
    list(b.reach),
    `<h2><strong>Estimated Expenses</strong></h2>`,
    list(b.expenses),
    `<p>Prices are approximate and change with the season.</p>`,
    `<h2><strong>Travel Tips</strong></h2>`,
    list(b.tips),
    `<h2><strong>Want the full plan?</strong></h2>`,
    `<p>The Travel Guide has routes, hotels, rentals, restaurants, guides, a day-by-day itinerary and a rate card for ${esc(dest.title)}. Sign in and subscribe to unlock it.</p>`,
    button,
  ].join("");
}

// ── helpers ───────────────────────────────────────────────────
async function ensureUser({ fullName, email, password, role }) {
  let user = await User.findOne({ email });
  if (!user) {
    user = new User({ fullName, email, password, role });
  } else {
    // Known password so the documented login always works
    user.fullName = fullName;
    user.role = role;
    user.password = password;
  }
  await user.save(); // the model hashes the password on save
  return user;
}

// Insert only if missing; report whether it was created
async function insertIfMissing(Model, filter, doc) {
  const res = await Model.updateOne(filter, { $setOnInsert: doc }, { upsert: true });
  return res.upsertedCount > 0;
}

// The user guides. `minPlan` is the plan level that unlocks the guide.
function userGuides(destBySlug, plansByRank, users) {
  return [
    {
      author: users.tester, destination: destBySlug.kerala, minPlan: plansByRank[1], status: "approved",
      adminNote: "Thanks for sharing.",
      title: "Kerala – User Travel Guide: 6 days on a mid budget",
      sections: [
        ["how_to_reach", "How I travelled", "I took the Bengaluru to Ernakulam overnight train in 3AC (about ₹1,500) and came back the same way. It took 11 hours each way and I slept well."],
        ["local_transport", "Transportation", "In Kochi I used autos and the metro. Kochi to Munnar was a KSRTC bus (₹220). In Alleppey I hired a scooter for ₹450 a day."],
        ["hotel", "Where I stayed", "A homestay in Fort Kochi (₹3,200 a night with breakfast), a lakeside room in Alleppey (₹2,800) and a plantation cottage in Munnar (₹4,000)."],
        ["restaurant", "Food", "Best meals: karimeen fry in Alleppey (₹450), appam and stew for breakfast in Fort Kochi (₹150) and a banana-leaf sadya in Munnar (₹200). Average daily food spend ₹900."],
        ["places", "Personal recommendations", "Do the sunrise at Eravikulam and the Alleppey canoe ride at 7 am, when it is quiet. The Kathakali show at Fort Kochi was a highlight."],
        ["other", "Houseboat", "We booked an AC houseboat for one night through a local operator for about ₹2,000 for two, including lunch and dinner. It was great value and the crew was friendly."],
        ["expenses", "What I spent", "About ₹19,000 per person for 6 days, everything included (train, stay, food, scooter, boat and entry fees)."],
        ["other", "Travel tips", "Book trains early, carry a light raincoat and keep cash for small eateries. Start the Munnar road before 8 am to avoid traffic."],
      ],
    },
    {
      author: users.tester, destination: destBySlug.goa, minPlan: plansByRank[1], status: "pending",
      title: "Goa – User Travel Guide: quiet South Goa in 4 days",
      sections: [
        ["how_to_reach", "How I travelled", "Konkan Railway from Mumbai to Madgaon (sleeper ₹600). A pre-paid taxi to Palolem cost ₹800."],
        ["hotel", "Where I stayed", "A beach hut in Palolem for ₹1,800 a night and a guesthouse in Agonda for ₹2,200."],
        ["restaurant", "Food", "Fish thali at a local place in Agonda for ₹220. The seafood shacks on Palolem beach are pricier but good."],
        ["expenses", "What I spent", "About ₹9,500 for 4 days including train, stay and food."],
        ["other", "Travel tips", "South Goa is quiet from November to February. Carry cash; some places don't take cards."],
      ],
    },
    {
      author: users.reporter, destination: destBySlug.jaipur, minPlan: plansByRank[1], status: "approved",
      adminNote: "",
      title: "Jaipur – Weekend on foot: a local's guide",
      sections: [
        ["places", "Places to visit", "Walk from Hawa Mahal to the City Palace, then take an auto to Amber Fort. Do the fort before 10 am for shade."],
        ["restaurant", "Food", "Breakfast of pyaaz kachori near Johari Bazaar, dal baati churma at lunch and lassi at the 100-year-old shops."],
        ["local_transport", "Transportation", "Autos cost ₹80 to ₹150 for most old-city rides. City buses go to Amber for ₹20."],
        ["expenses", "What I spent", "Two days cost about ₹3,000 per person without a hotel."],
      ],
    },
  ].map((g) => ({
    ...g,
    sections: g.sections.map(([category, title, body]) => ({ category, title, body })),
  }));
}

async function main() {
  // The demo accounts have known passwords (they are printed in the README/hand-off),
  // so never let this run against a shared or production database by accident.
  const isLocal = /^mongodb:\/\/(127\.0\.0\.1|localhost)[:/]/.test(MONGO_URI);
  if (!isLocal && process.env.SEED_ALLOW_REMOTE !== "true") {
    throw new Error("Refusing to seed a non-local database (demo accounts have known passwords). Set SEED_ALLOW_REMOTE=true only if you really mean it.");
  }
  await mongoose.connect(MONGO_URI);
  console.log(`Connected to ${MONGO_URI}`);
  await seedDefaultPlans();

  const plans = await Plan.find({ isActive: true }).sort({ rank: 1 });
  const plansByRank = {};
  plans.forEach((p) => { plansByRank[p.rank] = p; });
  if (!plansByRank[1] || !plansByRank[2] || !plansByRank[3]) {
    throw new Error("Expected plans with access levels 1, 2 and 3 (Basic, Premium, Ultimate).");
  }
  const tierPlan = { basic: plansByRank[1], premium: plansByRank[2], ultimate: plansByRank[3] };
  console.log("Plans:", plans.map((p) => `${p.name} ₹${p.price} (level ${p.rank})`).join(", "));

  const users = {
    admin: await ensureUser(ACCOUNTS.admin),
    tester: await ensureUser(ACCOUNTS.tester),
    reporter: await ensureUser(ACCOUNTS.reporter),
  };
  console.log("Accounts ready:", Object.values(ACCOUNTS).map((a) => `${a.email} (${a.role})`).join(", "));

  // ── blogs, destinations, content, rate cards ──
  const destBySlug = {};
  let counts = { blogs: 0, content: 0, rates: 0 };
  for (const d of destinations) {
    let blog = await Blog.findOne({ title: d.blog.title });
    if (!blog) {
      blog = await Blog.create({
        title: d.blog.title,
        body: blogHtml(d),
        coverImageURL: d.cover,
        category: "Travel",
        subcategory: d.blog.sub,
        createdBy: users.admin._id,
      });
      counts.blogs++;
    }

    let dest = await Destination.findOne({ slug: d.slug });
    if (!dest) {
      dest = await Destination.create({ title: d.title, slug: d.slug, isPublished: true });
    }
    // Keep an existing destination's data, fill gaps, and link it to the new article
    dest.location = dest.location || d.location;
    dest.summary = dest.summary || d.summary;
    dest.coverImageURL = dest.coverImageURL || d.cover;
    dest.blogId = blog._id;
    dest.isPublished = true;
    await dest.save();
    destBySlug[d.slug] = dest;

    for (const tier of ["basic", "premium", "ultimate"]) {
      const rank = { basic: 1, premium: 2, ultimate: 3 }[tier];
      let i = 0;
      for (const [category, title, body, contact] of d[tier]) {
        const created = await insertIfMissing(
          TravelContent,
          { destination: dest._id, title },
          { destination: dest._id, category, title, body, contact: contact || "", minPlan: tierPlan[tier]._id, order: rank * 100 + i }
        );
        if (created) counts.content++;
        i++;
      }
    }

    let r = 0;
    for (const [tier, service, price, unit, notes] of d.rates) {
      const rank = { basic: 1, premium: 2, ultimate: 3 }[tier];
      const created = await insertIfMissing(
        RateCardItem,
        { destination: dest._id, service },
        { destination: dest._id, service, price, unit, notes, minPlan: tierPlan[tier]._id, order: rank * 100 + r }
      );
      if (created) counts.rates++;
      r++;
    }
  }
  console.log(`Created: ${counts.blogs} blogs, ${counts.content} guide items, ${counts.rates} rate-card rows`);

  // ── user-written guides ──
  const guideDocs = {};
  for (const g of userGuides(destBySlug, plansByRank, users)) {
    let guide = await TravelGuide.findOne({ author: g.author._id, title: g.title });
    if (!guide) {
      guide = await TravelGuide.create({
        destination: g.destination._id,
        author: g.author._id,
        title: g.title,
        sections: g.sections,
        status: g.status,
        minPlan: g.status === "approved" ? g.minPlan._id : undefined,
        adminNote: g.adminNote || "",
        reviewedBy: g.status === "approved" ? users.admin._id : undefined,
        reviewedAt: g.status === "approved" ? new Date() : undefined,
      });
    }
    guideDocs[g.title] = guide;
  }
  const keralaGuide = guideDocs["Kerala – User Travel Guide: 6 days on a mid budget"];

  // ── a real (mock-gateway) paid subscription for the second user ──
  // Goes through the same activation code as the site's checkout. The mock
  // gateway moves no money; it is labelled "mock" in the payments table.
  let sub = await getActiveSubscription(users.reporter._id);
  if (!sub) {
    const plan = plansByRank[2];
    const payment = await Payment.create({
      user: users.reporter._id, plan: plan._id, planName: plan.name, type: "new",
      amount: plan.price, currency: plan.currency, durationDays: plan.durationDays, gateway: "mock",
    });
    await Payment.updateOne({ _id: payment._id }, { gatewayOrderId: `mock_order_${payment._id}` });
    await activatePayment(payment._id, { gatewayPaymentId: `mock_pay_${payment._id}` });
    sub = await getActiveSubscription(users.reporter._id);
    console.log(`Riya Reporter now has a paid ${plan.name} subscription (mock gateway).`);
  }

  // She has opened the Kerala guide page, so it counts as shown to her
  // (this is what makes her refund-eligible and drives revenue tracking)
  await recordUnlocks(users.reporter, sub, destBySlug.kerala._id, [null, keralaGuide._id]);

  // ── one pending report on the Kerala guide ──
  const reported = await insertIfMissing(
    GuideReport,
    { guide: keralaGuide._id, reportedBy: users.reporter._id },
    {
      guide: keralaGuide._id,
      guideTitle: keralaGuide.title,
      destination: destBySlug.kerala._id,
      guideAuthor: users.tester._id,
      reportedBy: users.reporter._id,
      reason: "incorrect",
      description: "The houseboat price is wrong. An AC houseboat with meals costs ₹9,000 to ₹16,000 a night, not ₹2,000. I was quoted far more than this guide says.",
    }
  );
  console.log(reported ? "Created the pending report." : "Report already exists.");

  console.log("\nDone.");
  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
