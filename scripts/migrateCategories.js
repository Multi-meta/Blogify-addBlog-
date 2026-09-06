// ============================================================
// Migration Script — add empty category/subcategory to old blogs
// Run once: node scripts/migrateCategories.js
// ============================================================

const mongoose = require("mongoose");
const Blog = require("../models/blog");

async function migrate() {
  await mongoose.connect("mongodb://127.0.0.1:27017/blogify");
  console.log("Connected to MongoDB");

  const result = await Blog.updateMany(
    { $or: [{ category: { $exists: false } }, { subcategory: { $exists: false } }] },
    { $set: { category: "", subcategory: "" } }
  );

  console.log(`Updated ${result.modifiedCount} blog(s) with default category/subcategory.`);
  await mongoose.disconnect();
  console.log("Done.");
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
