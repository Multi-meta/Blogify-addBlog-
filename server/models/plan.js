const { Schema, model } = require("mongoose");

// A purchasable subscription plan. Everything here is admin-editable.
// Access is hierarchical: a plan includes all content that requires a plan
// with an equal or lower `rank`.
const planSchema = new Schema(
    {
        name: { type: String, required: true, trim: true },
        description: { type: String, default: "" },
        price: { type: Number, required: true, min: 0 }, // whole rupees per period
        currency: { type: String, default: "INR" },
        durationDays: { type: Number, default: 30, min: 1 },
        rank: { type: Number, required: true, min: 1 }, // higher rank = more access
        features: { type: [String], default: [] },       // marketing bullet points
        isActive: { type: Boolean, default: true },      // inactive plans can't be bought
        gatewayPlanId: { type: String, default: "" },    // e.g. a Razorpay plan id, later
    },
    { timestamps: true }
);

module.exports = model("plan", planSchema);
