require("dotenv").config();

const path = require("path");
const express = require("express");
const mongoose = require("mongoose");
const cookieParser = require("cookie-parser");

const Blog = require("./models/blog");
const userRoute  = require("./routes/user");
const blogRoute  = require("./routes/blog");
const adminRoute = require("./routes/admin");

const { checkForAuthenticationCookie } = require("./middlewares/authentication");

const app = express();
const PORT = process.env.PORT || 8000;
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/blogify";

// ── CORS — allow React frontend to call this API ───────────────
const cors = require("cors");
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:5173",
  credentials: true, // required for httpOnly cookies
}));

// ── Database ───────────────────────────────────────────────────
mongoose
  .connect(MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

// ── Middleware ─────────────────────────────────────────────────
app.use(express.urlencoded({ extended: false }));
app.use(express.json());                         // parse JSON bodies from React
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
  if (!req.user) return res.status(401).json({ success: false, error: "Not authenticated" });
  try {
    const blogs = await Blog.find({ createdBy: req.user._id })
      .select("title coverImageURL createdAt")
      .sort({ createdAt: -1 });
    return res.json({ success: true, blogs });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

app.use("/user",  userRoute);
app.use("/blog",  blogRoute);
app.use("/admin", adminRoute);

// ── Start Server ───────────────────────────────────────────────
app.listen(PORT, () => console.log(`Server Started at PORT: ${PORT}`));