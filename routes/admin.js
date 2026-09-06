const { Router } = require("express");
const Blog   = require("../models/blog");
const Report = require("../models/report");
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
router.get("/blogs", async (req, res) => {
    try {
        const blogs = await Blog.find({})
            .populate("createdBy", "fullName email")
            .sort({ createdAt: -1 });
        return res.json({ success: true, blogs });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
