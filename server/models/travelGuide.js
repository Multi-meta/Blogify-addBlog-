const { Schema, model } = require("mongoose");
const { CATEGORY_KEYS } = require("../data/travelCategories");

// A community-written travel guide for one destination. The admin's own
// ("official") guide is the destination's TravelContent + rate card, so every
// TravelGuide row has an author.
//
// Users write it, then the admin reviews it: `status` starts as "pending",
// and only "approved" guides are shown to subscribers. The admin also picks
// `minPlan` (which subscription level unlocks the whole guide).
const sectionSchema = new Schema(
    {
        category: { type: String, enum: CATEGORY_KEYS, required: true },
        title: { type: String, required: true, trim: true },
        body: { type: String, default: "" },    // plain text, line breaks kept
        contact: { type: String, default: "" }, // phone / link / booking info
    },
    { _id: true }
);

const travelGuideSchema = new Schema(
    {
        destination: { type: Schema.Types.ObjectId, ref: "destination", required: true, index: true },
        author: { type: Schema.Types.ObjectId, ref: "user", required: true, index: true },
        title: { type: String, required: true, trim: true },
        sections: { type: [sectionSchema], default: [] },
        status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending", index: true },
        minPlan: { type: Schema.Types.ObjectId, ref: "plan" }, // set by the admin
        adminNote: { type: String, default: "" },               // shown to the author
        reviewedBy: { type: Schema.Types.ObjectId, ref: "user" },
        reviewedAt: { type: Date },
    },
    { timestamps: true }
);

module.exports = model("travelguide", travelGuideSchema);
