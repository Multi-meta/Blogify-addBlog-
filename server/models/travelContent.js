const { Schema, model } = require("mongoose");
const { CATEGORY_KEYS } = require("../data/travelCategories");

// One piece of travel information (a hotel, a train option, an itinerary...).
// `minPlan` decides who can read it: plans of equal or higher rank.
const travelContentSchema = new Schema(
    {
        destination: { type: Schema.Types.ObjectId, ref: "destination", required: true, index: true },
        category: { type: String, enum: CATEGORY_KEYS, required: true },
        title: { type: String, required: true, trim: true },
        body: { type: String, default: "" },    // plain text, line breaks kept
        contact: { type: String, default: "" }, // phone / link / booking info
        minPlan: { type: Schema.Types.ObjectId, ref: "plan", required: true },
        order: { type: Number, default: 0 },
    },
    { timestamps: true }
);

module.exports = model("travelcontent", travelContentSchema);
