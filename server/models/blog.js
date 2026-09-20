const {Schema, model} = require("mongoose");

const blogSchema = new Schema({
    title: {
        type: String,
        required: true,
    },
    body: {
        type: String,
        required: true,
    },
    coverImageURL:{
        type: String,
        required: false,
    },
    category: {
        type: String,
        default: "",
    },
    subcategory: {
        type: String,
        default: "",
    },
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: "user",
    },
    createdAt: { type: Date },
    updatedAt: { type: Date },
}, {timestamps: true}
);

const Blog = model("blog", blogSchema);
module.exports = Blog;