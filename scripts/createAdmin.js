/**
 * One-time admin seeder script.
 * Run: node scripts/createAdmin.js
 *
 * Creates (or upgrades) the admin account in MongoDB.
 */

const mongoose = require("mongoose");
const User = require("../models/user");

const ADMIN_EMAIL    = "utkarsh.y23@iiits.in";
const ADMIN_PASSWORD = "utkarsh16@72609";
const ADMIN_NAME     = "Utkarsh Yuvraj";

async function main() {
    await mongoose.connect("mongodb://127.0.0.1:27017/blogify");
    console.log("MongoDB connected.");

    // Check if user already exists
    let user = await User.findOne({ email: ADMIN_EMAIL });

    if (user) {
        // Upgrade existing account to ADMIN
        user.role = "ADMIN";
        // Re-set password so the pre-save hook hashes it fresh
        user.password = ADMIN_PASSWORD;
        await user.save();
        console.log(`✅ Existing user upgraded to ADMIN: ${ADMIN_EMAIL}`);
    } else {
        // Create brand-new admin account
        await User.create({
            fullName: ADMIN_NAME,
            email:    ADMIN_EMAIL,
            password: ADMIN_PASSWORD,
            role:     "ADMIN",
        });
        console.log(`✅ Admin account created: ${ADMIN_EMAIL}`);
    }

    await mongoose.disconnect();
    console.log("Done.");
}

main().catch((err) => {
    console.error("❌ Error:", err.message);
    process.exit(1);
});
