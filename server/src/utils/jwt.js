const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_ACCESS_SECRET;

if (!JWT_SECRET) {
    throw new Error("JWT_ACCESS_SECRET is missing in .env");
}

const generateToken = (user) => {
    return jwt.sign(
        {
            userId: user.id,
            workspaceId: user.workspaceId,
            role: user.role,
        },
        JWT_SECRET,
        {
            expiresIn: "7d",
        }
    );
};

const verifyToken = (token) => {
    return jwt.verify(token, JWT_SECRET);
};

module.exports = { generateToken, verifyToken };