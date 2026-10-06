// ============================================================
// Image uploads — shared by blog covers, editor images and avatars.
// Files are kept in memory by multer and then saved into MongoDB (models/image),
// so they survive Render restarts. Only real image types are accepted, and the
// stored type comes from that check, so nobody can upload an .html or .svg page
// that would run scripts on our domain.
// ============================================================

const multer = require("multer");
const Image = require("../models/image");

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const MAX_IMAGE_MB = 5;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_MB * 1024 * 1024, files: 1 },
  fileFilter: function (req, file, cb) {
    if (IMAGE_TYPES.includes(file.mimetype)) return cb(null, true);
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

// Saves a multer file into MongoDB and returns the URL to store on the blog/user
async function saveImage(file, userId) {
  const image = await Image.create({
    data: file.buffer,
    contentType: file.mimetype,
    size: file.size,
    uploadedBy: userId,
  });
  return `/uploads/db/${image._id}`;
}

module.exports = { uploadImage, saveImage };
