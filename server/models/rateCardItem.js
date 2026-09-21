const { Schema, model } = require("mongoose");

// One row of a destination's rate card, e.g. "Bike Rental - 500 / day".
const rateCardItemSchema = new Schema(
    {
        destination: { type: Schema.Types.ObjectId, ref: "destination", required: true, index: true },
        service: { type: String, required: true, trim: true },
        price: { type: Number, required: true, min: 0 },
        unit: { type: String, default: "" }, // "per night", "per day", "one way"...
        notes: { type: String, default: "" },
        minPlan: { type: Schema.Types.ObjectId, ref: "plan", required: true },
        order: { type: Number, default: 0 },
    },
    { timestamps: true }
);

module.exports = model("ratecarditem", rateCardItemSchema);
