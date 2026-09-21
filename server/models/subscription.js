const { Schema, model } = require("mongoose");

// One row per purchased period. A user has at most one "active" row; renewals
// extend it, upgrades close it ("upgraded") and open a new one.
// Plan name/rank/price are copied so history stays true if the plan is edited.
const subscriptionSchema = new Schema(
    {
        user: { type: Schema.Types.ObjectId, ref: "user", required: true, index: true },
        plan: { type: Schema.Types.ObjectId, ref: "plan", required: true },
        planName: { type: String, required: true },
        planRank: { type: Number, required: true },
        pricePaid: { type: Number, required: true },
        status: {
            type: String,
            enum: ["active", "expired", "cancelled", "upgraded"],
            default: "active",
            index: true,
        },
        startDate: { type: Date, required: true },
        expiryDate: { type: Date, required: true },
        payment: { type: Schema.Types.ObjectId, ref: "payment" },
        // Set when an admin gave the plan directly (testing / support). No payment
        // exists, so it earns no revenue and can't be refunded.
        grantedByAdmin: { type: Boolean, default: false },
    },
    { timestamps: true }
);

module.exports = model("subscription", subscriptionSchema);
