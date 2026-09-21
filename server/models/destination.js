const { Schema, model } = require("mongoose");

// A place users can plan a trip to. Its detailed content lives in
// TravelContent + RateCardItem, each tagged with the plan that unlocks it.
const destinationSchema = new Schema(
    {
        title: { type: String, required: true, trim: true },
        slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
        location: { type: String, default: "" },
        summary: { type: String, default: "" }, // public teaser shown before subscribing
        coverImageURL: { type: String, default: "" },
        blogId: { type: Schema.Types.ObjectId, ref: "blog" }, // optional article it belongs to
        isPublished: { type: Boolean, default: true },
    },
    { timestamps: true }
);

module.exports = model("destination", destinationSchema);
