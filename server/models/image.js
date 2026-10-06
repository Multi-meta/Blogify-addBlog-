const { Schema, model } = require("mongoose");

// Uploaded images (blog covers, editor images, avatars) are stored in MongoDB
// itself, because Render's free disk is wiped on every restart/redeploy.
// Served by GET /uploads/db/:id (see routes/images.js).
const imageSchema = new Schema({
    data: {
        type: Buffer,
        required: true,
    },
    contentType: {
        type: String,
        required: true,
    },
    size: {
        type: Number,
        required: true,
    },
    uploadedBy: {
        type: Schema.Types.ObjectId,
        ref: "user",
    },
}, { timestamps: true }
);

const Image = model("image", imageSchema);

module.exports = Image;
