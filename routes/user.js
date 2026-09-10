const { Router } = require("express");
const User = require("../models/user");
const { validateToken } = require("../services/authentication");

const router = Router();

// Auth cookie settings. The Vercel frontend proxies API calls, so the browser
// treats them as same-site: "lax" works in production and stops other
// websites from sending this cookie along with forged form posts (CSRF).
const COOKIE_OPTIONS = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
};
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // same lifetime as the JWT

// GET /user/me — validate cookie and return logged-in user
// Called by React on page load to restore auth state
router.get("/me", (req, res) => {
    const token = req.cookies["token"];
    if (!token) return res.status(401).json({ success: false });

    try {
        const payload = validateToken(token);
        return res.json({ success: true, user: payload });
    } catch {
        return res.status(401).json({ success: false });
    }
});

// POST /user/signin — authenticate and set cookie
router.post("/signin", async (req, res) => {
    const { email, password } = req.body;
    try {
        const token = await User.matchPasswordAndGenerateToken(email, password);
        const user = await User.findOne({ email }).select("-password -salt");
        return res
            .cookie("token", token, { ...COOKIE_OPTIONS, maxAge: COOKIE_MAX_AGE })
            .json({ success: true, user });
    } catch (error) {
        return res.status(401).json({ success: false, error: "Incorrect Email or Password" });
    }
});

// POST /user/signup — register a new user
router.post("/signup", async (req, res) => {
    const { fullName, email, password } = req.body;
    try {
        const user = await User.create({ fullName, email, password });
        const token = await User.matchPasswordAndGenerateToken(email, password);
        const safeUser = await User.findById(user._id).select("-password -salt");
        return res
            .cookie("token", token, { ...COOKIE_OPTIONS, maxAge: COOKIE_MAX_AGE })
            .json({ success: true, user: safeUser });
    } catch (error) {
        // MongoDB duplicate key error → friendly message
        const isDuplicate = error.code === 11000 || (error.message && error.message.includes('E11000'));
        const message = isDuplicate
            ? 'An account with this email already exists. Please sign in instead.'
            : error.message;
        return res.status(400).json({ success: false, error: message });
    }
});

// GET /user/logout — clear the auth cookie
router.get("/logout", (req, res) => {
    // Must use the same attributes the cookie was set with, or browsers keep it
    res.clearCookie("token", COOKIE_OPTIONS).json({ success: true });
});

module.exports = router;
