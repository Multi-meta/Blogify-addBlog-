const { Schema, model } = require("mongoose");

// "This subscription was shown this content." One row per subscription per
// piece of content; `guide` is null for the destination's official (admin)
// content. It is the basis for both revenue tracking and refund eligibility,
// because a subscription buys access to a plan, not to single guides.
const guideUnlockSchema = new Schema(
    {
        user: { type: Schema.Types.ObjectId, ref: "user", required: true, index: true },
        subscription: { type: Schema.Types.ObjectId, ref: "subscription", required: true },
        destination: { type: Schema.Types.ObjectId, ref: "destination", required: true },
        guide: { type: Schema.Types.ObjectId, ref: "travelguide", default: null },
    },
    { timestamps: true }
);

guideUnlockSchema.index({ subscription: 1, destination: 1, guide: 1 }, { unique: true });
guideUnlockSchema.index({ guide: 1 });

module.exports = model("guideunlock", guideUnlockSchema);
