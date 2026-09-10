// ============================================================
// Import Script — copy blogs, authors and comments from the live
// Blogify API into your LOCAL MongoDB for development
// Run: node scripts/importFromProduction.js
// Safe to re-run: records are upserted by their original _id,
// and existing local blogs/users are left untouched
// ============================================================

require("dotenv").config();

const crypto = require("crypto");
const mongoose = require("mongoose");

const SOURCE_URL = process.env.IMPORT_SOURCE_URL || "https://blogify-addblog.onrender.com";
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/blogify";
const CONCURRENCY = 6;

const { ObjectId } = mongoose.Types;

async function getJSON(path, attempts = 3) {
  for (let attempt = 1; ; attempt++) {
    try {
      // Generous timeout: a sleeping Render free-tier server takes ~1 min to wake
      const res = await fetch(SOURCE_URL + path, { signal: AbortSignal.timeout(90_000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      if (attempt >= attempts) throw new Error(`GET ${path} failed: ${err.message}`);
      console.log(`  retrying ${path} (${err.message})`);
    }
  }
}

// Run fn over items with at most `limit` requests in flight
async function mapLimit(items, limit, fn) {
  const results = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
    }
  }
  await Promise.all(Array.from({ length: limit }, worker));
  return results;
}

async function importData() {
  // Never write placeholder users into Atlas or any other remote database
  if (!/^mongodb:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//.test(MONGO_URI)) {
    throw new Error("MONGO_URI is not a local database — refusing to import. Point it at localhost.");
  }

  console.log(`Fetching blogs from ${SOURCE_URL}...`);
  const { blogs } = await getJSON("/api/blogs");
  console.log(`  ${blogs.length} blogs`);

  console.log("Fetching comments...");
  let checked = 0;
  const commentLists = await mapLimit(blogs, CONCURRENCY, async (blog) => {
    const data = await getJSON(`/blog/${blog._id}`);
    checked++;
    if (checked % 50 === 0 || checked === blogs.length) {
      console.log(`  ${checked}/${blogs.length} blogs checked`);
    }
    return data.comments || [];
  });
  const comments = commentLists.flat();
  console.log(`  ${comments.length} comments`);

  // Everyone who wrote a blog or comment — the API only exposes name + avatar
  const people = new Map();
  for (const item of [...blogs, ...comments]) {
    if (item.createdBy?._id) people.set(item.createdBy._id, item.createdBy);
  }

  await mongoose.connect(MONGO_URI);
  const db = mongoose.connection.db;
  console.log(`Connected to ${MONGO_URI}`);

  // Users: create display-only placeholders for people missing locally.
  // The random password never matches a hash, so nobody can sign in as them.
  let usersAdded = 0;
  for (const person of people.values()) {
    const now = new Date();
    const result = await db.collection("users").updateOne(
      { _id: new ObjectId(person._id) },
      {
        $setOnInsert: {
          fullName: person.fullName || "Unknown Author",
          email: `imported.${person._id}@blogify.local`,
          password: crypto.randomBytes(32).toString("hex"),
          salt: crypto.randomBytes(16).toString("hex"),
          profileImageURL: person.profileImageURL || "/images/default.png",
          role: "USER",
          createdAt: now,
          updatedAt: now,
        },
      },
      { upsert: true }
    );
    usersAdded += result.upsertedCount;
  }

  const blogResult = await db.collection("blogs").bulkWrite(
    blogs.map((b) => ({
      updateOne: {
        filter: { _id: new ObjectId(b._id) },
        update: {
          $set: {
            title: b.title,
            body: b.body,
            coverImageURL: b.coverImageURL ?? null,
            category: b.category || "",
            subcategory: b.subcategory || "",
            createdBy: b.createdBy?._id ? new ObjectId(b.createdBy._id) : null,
            createdAt: new Date(b.createdAt),
            updatedAt: new Date(b.updatedAt || b.createdAt),
          },
        },
        upsert: true,
      },
    }))
  );

  const commentResult = comments.length
    ? await db.collection("comments").bulkWrite(
        comments.map((c) => ({
          updateOne: {
            filter: { _id: new ObjectId(c._id) },
            update: {
              $set: {
                content: c.content,
                blogId: new ObjectId(c.blogId),
                createdBy: c.createdBy?._id ? new ObjectId(c.createdBy._id) : null,
                createdAt: new Date(c.createdAt),
                updatedAt: new Date(c.updatedAt || c.createdAt),
              },
            },
            upsert: true,
          },
        }))
      )
    : { upsertedCount: 0, modifiedCount: 0 };

  console.log("\nDone.");
  console.log(`  Blogs:    ${blogResult.upsertedCount} added, ${blogResult.modifiedCount} updated`);
  console.log(`  Comments: ${commentResult.upsertedCount} added, ${commentResult.modifiedCount} updated`);
  console.log(`  Users:    ${usersAdded} placeholder author(s) added`);
}

importData()
  .catch((err) => {
    console.error("Import failed:", err.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
