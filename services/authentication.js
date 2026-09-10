const JWT = require("jsonwebtoken");

// Never fall back to the dev secret on the live server: it is public in this
// repo, so anyone could use it to forge an admin login.
if (!process.env.JWT_SECRET && process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET environment variable is required in production");
}

const secret = process.env.JWT_SECRET || "blogify_dev_secret_change_in_production";

// Tokens expire with the auth cookie, so a stolen token can't be used forever
const TOKEN_LIFETIME = "7d";

function createTokenForUser(user){
    const payload = {
        _id: user._id,
        email: user.email,
        profileImageURl: user.profileImageURl,
        role: user.role,
    };
    const token = JWT.sign(payload, secret, { expiresIn: TOKEN_LIFETIME });
    return token;
}

function validateToken(token){
    const payload = JWT.verify(token, secret, { algorithms: ["HS256"] });
    return payload;
}

module.exports = {
    createTokenForUser,
    validateToken,
};
