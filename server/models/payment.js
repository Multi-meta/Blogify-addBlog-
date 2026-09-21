const { Schema, model } = require("mongoose");

// Every checkout attempt, successful or not = the payment history.
// Gateway fields stay generic so Razorpay (or any other) can fill them later.
const paymentSchema = new Schema(
    {
        user: { type: Schema.Types.ObjectId, ref: "user", required: true, index: true },
        plan: { type: Schema.Types.ObjectId, ref: "plan", required: true },
        planName: { type: String, required: true },
        subscription: { type: Schema.Types.ObjectId, ref: "subscription" },
        type: { type: String, enum: ["new", "renewal", "upgrade"], required: true },
        amount: { type: Number, required: true, min: 0 }, // rupees actually charged
        currency: { type: String, default: "INR" },
        durationDays: { type: Number, required: true },
        status: {
            type: String,
            enum: ["created", "paid", "failed", "refunded"],
            default: "created",
            index: true,
        },
        gateway: { type: String, default: "mock" },
        gatewayOrderId: { type: String, default: "" },
        gatewayPaymentId: { type: String, default: "" },
        gatewaySignature: { type: String, default: "" },
        failureReason: { type: String, default: "" },
        paidAt: { type: Date },
        // Filled in when the payment is refunded (see services/guides.js)
        refundedAt: { type: Date },
        refundAmount: { type: Number },
        refundReason: { type: String, default: "" },
        gatewayRefundId: { type: String, default: "" },
    },
    { timestamps: true }
);

module.exports = model("payment", paymentSchema);
