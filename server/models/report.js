const { Schema, model } = require("mongoose");

const reportSchema = new Schema(
    {
        blogId: {
            type: Schema.Types.ObjectId,
            ref: "blog",
            required: true,
        },
        blogTitle: {
            type: String,
        },
        reportedBy: {
            type: Schema.Types.ObjectId,
            ref: "user",
            required: true,
        },
        reason: {
            type: String,
            required: true,
        },
        status: {
            type: String,
            enum: ["pending", "dismissed"],
            default: "pending",
        },
    },
    { timestamps: true }
);

const Report = model("report", reportSchema);
module.exports = Report;
