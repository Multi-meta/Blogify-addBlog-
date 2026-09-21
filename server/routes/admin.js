const { Router } = require("express");
const mongoose = require("mongoose");
const Blog    = require("../models/blog");
const Comment = require("../models/comment");
const Report  = require("../models/report");
const User    = require("../models/user");
const requireAdmin = require("../middlewares/requireAdmin");


const router = Router();

// All admin routes require ADMIN role
router.use(requireAdmin);

// ── GET /admin/reports — all pending reports ────────────────────
router.get("/reports", async (req, res) => {
    try {
        const reports = await Report.find({ status: "pending" })
            .populate("reportedBy", "fullName email profileImageURL")
            .populate("blogId", "title")
            .populate({
                path: "commentId",
                select: "content createdBy",
                populate: { path: "createdBy", select: "fullName" },
            })
            .sort({ createdAt: -1 });
        return res.json({ success: true, reports });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});

// ── DELETE /admin/reports/:id — dismiss a report ───────────────
router.delete("/reports/:id", async (req, res) => {
    try {
        await Report.findByIdAndDelete(req.params.id);
        return res.json({ success: true });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});

// ── GET /admin/blogs — all blogs (for admin dashboard) ─────────
// Optional ?since=week filters to the last 7 days
router.get("/blogs", async (req, res) => {
    try {
        const filter = {};
        if (req.query.since === "week") {
            const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
            filter.createdAt = mongoose.trusted({ $gte: sevenDaysAgo });
        }
        const blogs = await Blog.find(filter)
            .populate("createdBy", "fullName email")
            .sort({ createdAt: -1 });
        return res.json({ success: true, blogs });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});

// ── GET /admin/stats — aggregate platform-wide statistics ──────
router.get("/stats", async (req, res) => {
    try {
        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        const [totalUsers, totalBlogs, totalComments, pendingReports, blogsThisWeek, categoryAgg] =
            await Promise.all([
                User.countDocuments(),
                Blog.countDocuments(),
                Comment.countDocuments(),
                Report.countDocuments({ status: "pending" }),
                Blog.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
                Blog.aggregate([
                    { $match: { category: { $ne: "" } } },
                    { $group: { _id: "$category", count: { $sum: 1 } } },
                    { $sort: { count: -1 } },
                    { $limit: 5 },
                ]),
            ]);

        const topCategories = categoryAgg.map((c) => ({ category: c._id, count: c.count }));

        return res.json({
            success: true,
            stats: { totalUsers, totalBlogs, totalComments, pendingReports, blogsThisWeek, topCategories },
        });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});

// ── GET /admin/users — all users with blog counts ──────────────
router.get("/users", async (req, res) => {
    try {
        const users = await User.find({}).select("-password -salt").sort({ createdAt: -1 }).lean();
        const blogAgg = await Blog.aggregate([
            { $group: { _id: "$createdBy", count: { $sum: 1 } } },
        ]);
        const blogCountMap = {};
        blogAgg.forEach((b) => { blogCountMap[String(b._id)] = b.count; });
        const usersWithCounts = users.map((u) => ({
            ...u,
            blogCount: blogCountMap[String(u._id)] || 0,
        }));
        return res.json({ success: true, users: usersWithCounts });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});

// ── GET /admin/comments — all comments platform-wide ──────────
router.get("/comments", async (req, res) => {
    try {
        const comments = await Comment.find({})
            .populate("createdBy", "fullName profileImageURL")
            .populate("blogId", "title")
            .sort({ createdAt: -1 });
        return res.json({ success: true, comments });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;

