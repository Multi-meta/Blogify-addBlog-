const { Router } = require("express");
const mongoose = require("mongoose");
const crypto = require("crypto");
const path   = require("path");
const multer = require("multer");

const User    = require("../models/user");
const Blog    = require("../models/blog");
const Comment = require("../models/comment");
const { validateToken, createTokenForUser } = require("../services/authentication");
const requireAuth = require("../middlewares/requireAuth");

const router = Router();

// Auth cookie settings. The Vercel frontend proxies API calls, so the browser
// treats them as same-site: "lax" works in production and stops other
// websites from sending this cookie along with forged form posts (CSRF).
const COOKIE_OPTIONS = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
};
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // same lifetime as the JWT

// ── Multer — avatar image uploads ─────────────────────────────
const IMAGE_EXTENSIONS = {
    "image/jpeg": ".jpg",
    "image/png":  ".png",
    "image/gif":  ".gif",
    "image/webp": ".webp",
};
const MAX_AVATAR_MB = 5;

const avatarUpload = multer({
    storage: multer.diskStorage({
        destination: function (req, file, cb) {
            cb(null, path.resolve("./public/uploads/avatars/"));
        },
        filename: function (req, file, cb) {
            const name = `${Date.now()}-${crypto.randomBytes(8).toString("hex")}`;
            cb(null, name + IMAGE_EXTENSIONS[file.mimetype]);
        },
    }),
    limits: { fileSize: MAX_AVATAR_MB * 1024 * 1024, files: 1 },
    fileFilter: function (req, file, cb) {
        if (IMAGE_EXTENSIONS[file.mimetype]) return cb(null, true);
        const error = new Error("Only JPEG, PNG, GIF or WebP images are allowed.");
        error.status = 400;
        cb(error);
    },
});

// Wraps multer so upload errors come back as JSON (not Express default HTML)
function uploadAvatar(req, res, next) {
    const handler = avatarUpload.single("avatar");
    handler(req, res, (err) => {
        if (!err) return next();
        const message = err.code === "LIMIT_FILE_SIZE"
            ? `Image must be ${MAX_AVATAR_MB} MB or smaller.`
            : err.message;
        const status = err instanceof multer.MulterError ? 400 : err.status || 500;
        return res.status(status).json({ success: false, error: message });
    });
}

// ── GET /user/me — validate cookie and return logged-in user ───
// Called by React on page load to restore auth state
router.get("/me", (req, res) => {
    const token = req.cookies["token"];
    if (!token) return res.status(401).json({ success: false });

    try {
        const payload = validateToken(token);
        return res.json({ success: true, user: payload });
    } catch {
        return res.status(401).json({ success: false });
    }
});

// ── GET /user/profile — fresh user data from DB (for dashboard) ─
router.get("/profile", requireAuth, async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select("-password -salt");
        if (!user) return res.status(404).json({ success: false, error: "User not found" });
        return res.json({ success: true, user });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});

// ── POST /user/signin — authenticate and set cookie ────────────
router.post("/signin", async (req, res) => {
    const { email, password } = req.body;
    try {
        const token = await User.matchPasswordAndGenerateToken(email, password);
        const user = await User.findOne({ email }).select("-password -salt");
        return res
            .cookie("token", token, { ...COOKIE_OPTIONS, maxAge: COOKIE_MAX_AGE })
            .json({ success: true, user });
    } catch (error) {
        return res.status(401).json({ success: false, error: "Incorrect Email or Password" });
    }
});

// ── POST /user/signup — register a new user ────────────────────
router.post("/signup", async (req, res) => {
    const { fullName, email, password } = req.body;
    try {
        const user = await User.create({ fullName, email, password });
        const token = await User.matchPasswordAndGenerateToken(email, password);
        const safeUser = await User.findById(user._id).select("-password -salt");
        return res
            .cookie("token", token, { ...COOKIE_OPTIONS, maxAge: COOKIE_MAX_AGE })
            .json({ success: true, user: safeUser });
    } catch (error) {
        // MongoDB duplicate key error → friendly message
        const isDuplicate = error.code === 11000 || (error.message && error.message.includes('E11000'));
        const message = isDuplicate
            ? 'An account with this email already exists. Please sign in instead.'
            : error.message;
        return res.status(400).json({ success: false, error: message });
    }
});

// ── GET /user/logout — clear the auth cookie ──────────────────
router.get("/logout", (req, res) => {
    // Must use the same attributes the cookie was set with, or browsers keep it
    res.clearCookie("token", COOKIE_OPTIONS).json({ success: true });
});

// ── POST /user/update-avatar — upload / replace profile picture ─
// Saves file, updates DB, re-issues JWT so the new URL is in the cookie payload
// Users who skip this keep the default /images/default.png set by the User model
router.post("/update-avatar", requireAuth, uploadAvatar, async (req, res) => {
    if (!req.file) return res.status(400).json({ success: false, error: "No image uploaded." });
    try {
        const profileImageURL = `/uploads/avatars/${req.file.filename}`;
        const user = await User.findByIdAndUpdate(
            req.user._id,
            { profileImageURL },
            { new: true }
        ).select("-password -salt");

        // Re-issue JWT cookie so the new avatar URL is stored in the cookie payload
        const newToken = createTokenForUser(user);
        return res
            .cookie("token", newToken, { ...COOKIE_OPTIONS, maxAge: COOKIE_MAX_AGE })
            .json({ success: true, user });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});

// ── GET /user/stats — personal statistics for the user dashboard ─
router.get("/stats", requireAuth, async (req, res) => {
    try {
        const userId = req.user._id;

        // All blogs written by this user
        const blogs = await Blog.find({ createdBy: userId })
            .select("_id title category createdAt")
            .lean();

        const blogIds = blogs.map((b) => b._id);

        // Count comments per blog in one aggregation pass
        const commentAgg = await Comment.aggregate([
            { $match: { blogId: { $in: blogIds } } },
            { $group: { _id: "$blogId", count: { $sum: 1 } } },
        ]);

        const commentMap = {};
        commentAgg.forEach((c) => { commentMap[String(c._id)] = c.count; });

        let totalCommentsReceived = 0;
        let topBlog = null;
        let topBlogComments = -1;

        blogs.forEach((blog) => {
            const count = commentMap[String(blog._id)] || 0;
            totalCommentsReceived += count;
            if (count > topBlogComments) {
                topBlogComments = count;
                topBlog = { _id: blog._id, title: blog.title, commentCount: count };
            }
        });

        // Category breakdown (sorted by frequency)
        const categoryMap = {};
        blogs.forEach((blog) => {
            if (blog.category) {
                categoryMap[blog.category] = (categoryMap[blog.category] || 0) + 1;
            }
        });
        const categoryBreakdown = Object.entries(categoryMap)
            .map(([category, count]) => ({ category, count }))
            .sort((a, b) => b.count - a.count);

        // 5 most recent blogs for the activity list
        const recentBlogs = [...blogs]
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, 5)
            .map((b) => ({ _id: b._id, title: b.title, createdAt: b.createdAt }));

        return res.json({
            success: true,
            stats: {
                totalBlogs: blogs.length,
                totalCommentsReceived,
                topBlog,
                categoryBreakdown,
                recentBlogs,
            },
        });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});

// ── GET /user/comments-received — all comments on the user's blogs ─
router.get("/comments-received", requireAuth, async (req, res) => {
    try {
        const userId = req.user._id;
        const blogs = await Blog.find({ createdBy: userId }).select("_id title").lean();
        const blogIds = blogs.map((b) => b._id);

        const blogTitleMap = {};
        blogs.forEach((b) => { blogTitleMap[String(b._id)] = b.title; });

        const comments = await Comment.find({ blogId: mongoose.trusted({ $in: blogIds }) })
            .populate("createdBy", "fullName profileImageURL")
            .sort({ createdAt: -1 })
            .lean();

        const enriched = comments.map((c) => ({
            ...c,
            blogTitle: blogTitleMap[String(c.blogId)] || "Unknown Blog",
        }));

        return res.json({ success: true, comments: enriched });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;

