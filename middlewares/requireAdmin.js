/**
 * requireAdmin middleware
 * Attaches after checkForAuthenticationCookie.
 * Returns 403 if the request user is not authenticated or not an ADMIN.
 */
function requireAdmin(req, res, next) {
    if (!req.user || req.user.role !== "ADMIN") {
        return res.status(403).json({ success: false, error: "Admin access required." });
    }
    return next();
}

module.exports = requireAdmin;
