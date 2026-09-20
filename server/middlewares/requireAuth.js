/**
 * requireAuth middleware
 * Attaches after checkForAuthenticationCookie.
 * Returns 401 if the request has no valid login cookie. Put it before
 * anything with side effects, such as saving uploaded files.
 */
function requireAuth(req, res, next) {
    if (!req.user) {
        return res.status(401).json({ success: false, error: "Not authenticated" });
    }
    return next();
}

module.exports = requireAuth;
