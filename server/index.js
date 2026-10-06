require("dotenv").config();

const fs   = require("fs");
const path = require("path");
const express = require("express");
const mongoose = require("mongoose");
const cookieParser = require("cookie-parser");

// Ensure upload directories exist before multer needs them
fs.mkdirSync(path.resolve("./public/uploads/avatars"), { recursive: true });
fs.mkdirSync(path.resolve("./public/uploads"),          { recursive: true });


const Blog = require("./models/blog");
const userRoute = require("./routes/user");
const blogRoute = require("./routes/blog");
const adminRoute = require("./routes/admin");
const adminTravelRoute = require("./routes/adminTravel");
const subscriptionRoute = require("./routes/subscription");
const stripeWebhook = require("./routes/stripeWebhook");
const travelRoute = require("./routes/travel");
const { seedDefaultPlans } = require("./services/subscription");

const {
  checkForAuthenticationCookie,
} = require("./middlewares/authentication");

const app = express();
const PORT = process.env.PORT || 8000;
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/blogify";

app.disable("x-powered-by"); // don't advertise the framework to attackers

// ── Health check ───────────────────────────────────────────────
// Cheap endpoint (no DB, no auth) for keep-alive pings and Render health checks
app.get("/api/health", (req, res) => {
  res.json({ success: true, uptime: Math.round(process.uptime()) });
});

// ── CORS — allow React frontend to call this API ───────────────
const cors = require("cors");
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true, // required for httpOnly cookies
  }),
);

// ── Database ───────────────────────────────────────────────────
// Treat "$" keys in user input as plain values (blocks query-operator injection)
mongoose.set("sanitizeFilter", true);
mongoose
  .connect(MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .then(seedDefaultPlans)
  .catch((err) => console.error("MongoDB connection error:", err));

// ── Middleware ─────────────────────────────────────────────────
app.use((req, res, next) => {
  // Stop browsers from guessing file types, e.g. treating an upload as HTML
  res.set("X-Content-Type-Options", "nosniff");
  next();
});
// Stripe signs the exact bytes it sends, so this one route must get the raw body,
// before express.json() turns it into an object.
app.post("/api/subscription/stripe/webhook", express.raw({ type: "application/json" }), stripeWebhook);
app.use(express.urlencoded({ extended: false }));
app.use(express.json()); // parse JSON bodies from React
app.use(cookieParser());
app.use(checkForAuthenticationCookie("token"));
app.use(express.static(path.resolve("./public")));

// ── API Routes ─────────────────────────────────────────────────
// GET /api/blogs — return all blogs as JSON (used by React Home page)
app.get("/api/blogs", async (req, res) => {
  try {
    const filter = {};
    if (req.query.category) filter.category = req.query.category;
    if (req.query.subcategory) filter.subcategory = req.query.subcategory;

    const blogs = await Blog.find(filter)
      .populate("createdBy", "fullName profileImageURL")
      .sort({ createdAt: -1 });
    return res.json({ success: true, blogs });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/my-blogs — return blogs created by the logged-in user
app.get("/api/my-blogs", async (req, res) => {
  if (!req.user)
    return res.status(401).json({ success: false, error: "Not authenticated" });
  try {
    const blogs = await Blog.find({ createdBy: req.user._id })
      .select("title coverImageURL createdAt")
      .sort({ createdAt: -1 });
    return res.json({ success: true, blogs });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

app.use("/user", userRoute);
app.use("/blog", blogRoute);
app.use("/admin", adminRoute);
app.use("/admin", adminTravelRoute); // subscription plans, destinations, rate cards
app.use("/api", subscriptionRoute);  // /api/plans, /api/subscription/*
app.use("/api/travel", travelRoute);

// ── Start Server ───────────────────────────────────────────────
app.listen(PORT, () => console.log(`Server Started at PORT: ${PORT}`));

// ── Keep-alive ─────────────────────────────────────────────────
// Render's free plan sleeps a service after 15 min without inbound traffic.
// Pinging our own public URL every 10 min counts as traffic and keeps it awake.
// RENDER_EXTERNAL_URL is set automatically by Render; KEEP_ALIVE_URL overrides it.
const KEEP_ALIVE_URL = process.env.KEEP_ALIVE_URL || process.env.RENDER_EXTERNAL_URL;
if (KEEP_ALIVE_URL) {
  const pingUrl = `${KEEP_ALIVE_URL.replace(/\/$/, "")}/api/health`;
  setInterval(() => {
    fetch(pingUrl).catch((err) => console.error("Keep-alive ping failed:", err.message));
  }, 10 * 60 * 1000);
  console.log(`Keep-alive enabled: pinging ${pingUrl} every 10 min`);
}
