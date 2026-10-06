const { Router } = require("express");
const mongoose = require("mongoose");

const Image = require("../models/image");

const router = Router();

// ── GET /uploads/db/:id — serve an image stored in MongoDB ─────
// Lives under /uploads so the Vercel proxy rule for /uploads/* already covers it
router.get("/:id", async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).end();
  try {
    const image = await Image.findById(req.params.id).select("data contentType");
    if (!image) return res.status(404).end();

    // An image's bytes never change for a given id, so browsers/CDNs can cache it forever
    res.set("Content-Type", image.contentType);
    res.set("Cache-Control", "public, max-age=31536000, immutable");
    return res.send(image.data);
  } catch {
    return res.status(500).end();
  }
});

module.exports = router;
