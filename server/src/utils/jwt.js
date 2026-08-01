const jwt = require("jsonwebtoken");

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

if (!ACCESS_SECRET) {
    throw new Error("JWT_ACCESS_SECRET is missing in .env");
}
if (!REFRESH_SECRET) {
    throw new Error("JWT_REFRESH_SECRET is missing in .env");
}

const generateToken = (user) => {
    return jwt.sign(
        {
            userId: user.id,
            workspaceId: user.workspaceId,
            role: user.role,
        },
        ACCESS_SECRET,
        { expiresIn: "15m" }
    );
};

const verifyToken = (token) => {
    return jwt.verify(token, ACCESS_SECRET);
};

const generateRefreshToken = (user) => {
    return jwt.sign(
        { userId: user.id },
        REFRESH_SECRET,
        { expiresIn: "7d" }
    );
};

const verifyRefreshToken = (token) => {
    return jwt.verify(token, REFRESH_SECRET);
};

module.exports = {
    generateToken,
    verifyToken,
    generateRefreshToken,
    verifyRefreshToken,
};