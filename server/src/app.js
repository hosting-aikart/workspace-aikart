const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const morgan = require("morgan");

const authRoutes = require("./modules/auth/auth.routes");
const profileRoutes = require("./modules/profile/profile.routes");

const app = express();

// Security
app.use(helmet());

app.use(
  cors({
    origin: (origin, callback) => {
      if (
        !origin ||
        /^http:\/\/localhost:\d+$/.test(origin) ||
        origin === process.env.CLIENT_ORIGIN
      ) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: origin ${origin} not allowed`));
      }
    },
    credentials: true,
  })
);

// Logging
app.use(morgan("dev"));

// Body parser
app.use(express.json());
app.use(cookieParser());

// Health
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    message: "AIKart Workspace API is running",
  });
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/me", profileRoutes);

module.exports = app;