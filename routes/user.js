const { Router } = require("express");
const User = require("../models/user");
const { validateToken } = require("../services/authentication");

const router = Router();

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
            .cookie("token", token, { httpOnly: true })
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
            .cookie("token", token, { httpOnly: true })
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
    res.clearCookie("token").json({ success: true });
});

module.exports = router;