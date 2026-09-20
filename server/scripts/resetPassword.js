// ============================================================
// Reset Password Script — set a new password for an account
// Use it to replace a leaked password (e.g. the admin account)
// Run: node scripts/resetPassword.js
// Connects to MONGO_URI from .env — point it at Atlas to change a
// live account. Nothing is hard-coded: you type the email and the
// new password when prompted (the password is not shown).
// ============================================================

require("dotenv").config();

const readline = require("readline");
const mongoose = require("mongoose");
const User = require("../models/user");

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/blogify";
const MIN_LENGTH = 12;

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const lines = rl[Symbol.asyncIterator]();

// Hide typed characters while a password is being entered
let muted = false;
const writeToOutput = rl._writeToOutput.bind(rl);
rl._writeToOutput = (text) => {
  if (!muted) writeToOutput(text);
};

async function ask(question, { hidden = false } = {}) {
  process.stdout.write(question);
  muted = hidden;
  const { value = "" } = await lines.next();
  if (hidden) {
    muted = false;
    process.stdout.write("\n");
  }
  return value;
}

async function resetPassword() {
  const email = (await ask("Account email: ")).trim().toLowerCase();
  const password = await ask(`New password (min ${MIN_LENGTH} characters, hidden): `, { hidden: true });
  const confirm = await ask("Repeat new password: ", { hidden: true });

  if (password.length < MIN_LENGTH) throw new Error(`Password must be at least ${MIN_LENGTH} characters.`);
  if (password !== confirm) throw new Error("Passwords do not match.");

  await mongoose.connect(MONGO_URI);
  console.log(`Connected to ${MONGO_URI.replace(/\/\/[^@/]+@/, "//***@")}`);

  const user = await User.findOne({ email });
  if (!user) throw new Error(`No account found for ${email}.`);

  user.password = password; // the pre-save hook hashes it with a fresh salt
  // Only validate the password field, so older accounts whose email predates
  // the current email rules can still be updated
  await user.save({ validateModifiedOnly: true });
  console.log(`Password updated for ${email}.`);
}

resetPassword()
  .catch((err) => {
    console.error("Reset failed:", err.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    rl.close();
    await mongoose.disconnect();
  });
