const { Schema, model } = require("mongoose");

// A subscriber's "this information is wrong" report on a user-written guide.
// Title/names are copied so the report stays readable if the guide is removed.
const guideReportSchema = new Schema(
    {
        guide: { type: Schema.Types.ObjectId, ref: "travelguide", required: true, index: true },
        guideTitle: { type: String, default: "" },
        destination: { type: Schema.Types.ObjectId, ref: "destination", required: true },
        guideAuthor: { type: Schema.Types.ObjectId, ref: "user", required: true },
        reportedBy: { type: Schema.Types.ObjectId, ref: "user", required: true, index: true },
        reason: {
            type: String,
            enum: ["incorrect", "outdated", "misleading", "incomplete", "other"],
            required: true,
        },
        description: { type: String, default: "" },

        // Admin review
        status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending", index: true },
        verdict: { type: String, enum: ["correct", "incorrect"] }, // admin's finding on the guide itself
        adminNote: { type: String, default: "" },
        resolvedBy: { type: Schema.Types.ObjectId, ref: "user" },
        resolvedAt: { type: Date },

        // Set once the reporter has been refunded for this report
        refund: {
            payment: { type: Schema.Types.ObjectId, ref: "payment" },
            amount: { type: Number },
            refundedAt: { type: Date },
        },
    },
    { timestamps: true }
);

module.exports = model("guidereport", guideReportSchema);
