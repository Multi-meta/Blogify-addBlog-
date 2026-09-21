const { Router } = require("express");
const crypto = require("crypto");
const multer = require("multer");
const mongoose = require("mongoose");
const path = require("path");

const Blog   = require("../models/blog");
const Comment = require("../models/comment");
const Report = require("../models/report");
const Destination = require("../models/destination");
const requireAuth = require("../middlewares/requireAuth");
const requireAdmin = require("../middlewares/requireAdmin");

const router = Router();

// ── Multer — image uploads (cover + inline editor images) ──────
// Only real image types are accepted, and the saved name/extension come from
// the verified type, never the client's filename, so nobody can upload an
// .html or .svg page that would run scripts on our domain.
const IMAGE_EXTENSIONS = {
  "image/jpeg": ".jpg",
  "image/png":  ".png",
  "image/gif":  ".gif",
  "image/webp": ".webp",
};
const MAX_IMAGE_MB = 5;

const upload = multer({
  storage: multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, path.resolve("./public/uploads/"));
    },
    filename: function (req, file, cb) {
      const name = `${Date.now()}-${crypto.randomBytes(8).toString("hex")}`;
      cb(null, name + IMAGE_EXTENSIONS[file.mimetype]);
    },
  }),
  limits: { fileSize: MAX_IMAGE_MB * 1024 * 1024, files: 1 },
  fileFilter: function (req, file, cb) {
    if (IMAGE_EXTENSIONS[file.mimetype]) return cb(null, true);
    const error = new Error("Only JPEG, PNG, GIF or WebP images are allowed.");
    error.status = 400;
    cb(error);
  },
});

// Runs multer for one file field and returns upload problems as JSON
function uploadImage(field) {
  const handler = upload.single(field);
  return (req, res, next) => {
    handler(req, res, (err) => {
      if (!err) return next();
      const error = err.code === "LIMIT_FILE_SIZE"
        ? `Image must be ${MAX_IMAGE_MB} MB or smaller.`
        : err.message;
      const status = err instanceof multer.MulterError ? 400 : err.status || 500;
      return res.status(status).json({ success: false, error });
    });
  };
}

// ── GET /blog/:id — fetch single blog + comments as JSON ───────
router.get("/:id", async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id).populate(
      "createdBy",
      "fullName profileImageURL"
    );
    if (!blog) return res.status(404).json({ success: false, error: "Blog not found" });

    const comments = await Comment.find({ blogId: req.params.id }).populate(
      "createdBy",
      "fullName profileImageURL"
    );

    // Travel plans the admin linked to this article (drives the "Travel Guide" button)
    const destinations = await Destination.find({ blogId: blog._id, isPublished: true })
      .select("title slug");

    return res.json({ success: true, blog, comments, destinations });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ── DELETE /blog/:id — admin only ──────────────────────────────
router.delete("/:id", requireAdmin, async (req, res) => {
  try {
    const blog = await Blog.findByIdAndDelete(req.params.id);
    if (!blog) return res.status(404).json({ success: false, error: "Blog not found" });

    // Also remove associated comments and reports
    await Comment.deleteMany({ blogId: req.params.id });
    await Report.deleteMany({ blogId: req.params.id });
    // Keep the travel plans, just detach them from the deleted article
    await Destination.updateMany({ blogId: req.params.id }, { $unset: { blogId: 1 } });

    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ── POST /blog/upload-image — inline image upload for rich editor ──
router.post("/upload-image", requireAuth, uploadImage("image"), (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, error: "No image uploaded." });
  return res.json({ success: true, url: `/uploads/${req.file.filename}` });
});

// ── PUT /blog/:id — edit a blog (author only) ──────────────────
router.put("/:id", requireAuth, uploadImage("coverImage"), async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) return res.status(404).json({ success: false, error: "Blog not found" });

    // Only the author (or admin) may edit
    if (String(blog.createdBy) !== String(req.user._id) && req.user.role !== "ADMIN") {
      return res.status(403).json({ success: false, error: "Not authorised to edit this blog." });
    }

    const { title, body, category, subcategory } = req.body;
    if (title)  blog.title = title;
    if (body)   blog.body  = body;
    if (req.file) blog.coverImageURL = `/uploads/${req.file.filename}`;
    if (category !== undefined) blog.category = category;
    if (subcategory !== undefined) blog.subcategory = subcategory;

    await blog.save();
    return res.json({ success: true, blog });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ── POST /blog/comment/:blogId — add a comment ─────────────────
router.post("/comment/:blogId", async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, error: "Not authenticated" });

    const comment = await Comment.create({
      content: req.body.content,
      blogId: req.params.blogId,
      createdBy: req.user._id,
    });

    const populated = await Comment.findById(comment._id).populate(
      "createdBy",
      "fullName profileImageURL"
    );
    return res.json({ success: true, comment: populated });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ── PUT /blog/comment/:commentId — edit a comment (admin only) ─
router.put("/comment/:commentId", requireAdmin, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.commentId)) {
      return res.status(404).json({ success: false, error: "Comment not found" });
    }

    const content = typeof req.body.content === "string" ? req.body.content.trim() : "";
    if (!content) {
      return res.status(400).json({ success: false, error: "Comment cannot be empty." });
    }

    const comment = await Comment.findByIdAndUpdate(
      req.params.commentId,
      { content },
      { new: true }
    ).populate("createdBy", "fullName profileImageURL");
    if (!comment) return res.status(404).json({ success: false, error: "Comment not found" });

    return res.json({ success: true, comment });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ── POST /blog/comment/:commentId/report — blog author reports a comment ─
// Ownership rule: only the author of the blog the comment sits on may report it
router.post("/comment/:commentId/report", requireAuth, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.commentId)) {
      return res.status(404).json({ success: false, error: "Comment not found" });
    }

    const reason = typeof req.body.reason === "string" ? req.body.reason.trim() : "";
    if (!reason) {
      return res.status(400).json({ success: false, error: "Reason is required." });
    }

    const comment = await Comment.findById(req.params.commentId);
    if (!comment) return res.status(404).json({ success: false, error: "Comment not found" });

    const blog = await Blog.findById(comment.blogId).select("title createdBy");
    if (!blog) return res.status(404).json({ success: false, error: "Blog not found" });

    if (String(blog.createdBy) !== String(req.user._id)) {
      return res.status(403).json({
        success: false,
        error: "You can only report comments on your own blogs.",
      });
    }

    const report = await Report.create({
      blogId:     blog._id,
      blogTitle:  blog.title,
      commentId:  comment._id,
      reportedBy: req.user._id,
      reason,
    });

    return res.json({ success: true, report });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ── POST /blog/report/:blogId — user reports a blog ───────────
router.post("/report/:blogId", async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, error: "Not authenticated" });

    const { reason } = req.body;
    if (!reason || !reason.trim()) {
      return res.status(400).json({ success: false, error: "Reason is required." });
    }

    const blog = await Blog.findById(req.params.blogId).select("title");
    if (!blog) return res.status(404).json({ success: false, error: "Blog not found" });

    const report = await Report.create({
      blogId:     req.params.blogId,
      blogTitle:  blog.title,
      reportedBy: req.user._id,
      reason:     reason.trim(),
    });

    return res.json({ success: true, report });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ── POST /blog — create a new blog with cover image upload ─────
router.post("/", requireAuth, uploadImage("coverImage"), async (req, res) => {
  try {
    const { title, body, category, subcategory } = req.body;
    const blog = await Blog.create({
      title,
      body,
      createdBy: req.user._id,
      coverImageURL: req.file ? `/uploads/${req.file.filename}` : null,
      category: category || "",
      subcategory: subcategory || "",
    });

    return res.json({ success: true, blog });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
