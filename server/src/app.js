const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');

const authRoutes = require('./modules/auth/auth.routes');
const profileRoutes = require('./modules/profile/profile.routes');
const adminRoutes = require('./modules/admin/admin.routes');
const projectRoutes = require('./modules/project/project.routes');
const taskRoutes = require('./modules/tasks/tasks.routes');

const app = express();
app.set('trust proxy', 1);

// Security
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }),
);

const allowedOrigins = [
  process.env.CLIENT_ORIGIN?.replace(/\/+$/, ''),
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  'http://127.0.0.1:3000',
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or server-to-server)
      if (!origin) return callback(null, true);
      const cleanOrigin = origin.replace(/\/+$/, '');
      if (
        /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(cleanOrigin) ||
        allowedOrigins.includes(cleanOrigin)
      ) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  }),
);

// Logging
app.use(morgan('dev'));

// Body parser
app.use(express.json());
app.use(cookieParser());

// ─── Health ──────────────────────────────────────────────────────────────────
// Deliberately touches the database (a trivial `SELECT 1`) rather than just
// answering from the Node process — this is also the intended target for an
// external keep-alive ping (e.g. UptimeRobot/cron-job.org hitting this every
// few minutes) to stop Neon's free-tier compute from auto-suspending after
// ~5 min idle. A ping that only reaches Express without touching Postgres
// wouldn't prevent that suspend, since Neon's timer tracks DB connection
// activity, not app-server activity — the next real request would still
// pay the multi-second cold-start cost regardless of how often /health was
// hit. If the DB is asleep/unreachable, `ok: false` still on a 200 status
// (not 500) — a monitor should alert on it, not treat it as "service down".
app.get('/api/health', async (req, res) => {
  let dbOk = true;
  try {
    const { getPrisma } = require('./config/prisma');
    await getPrisma().$queryRaw`SELECT 1`;
  } catch {
    dbOk = false;
  }
  res.json({
    status: 'ok',
    message: 'AIKart Workspace API is running',
    db: dbOk ? 'ok' : 'unreachable',
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/me', profileRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/attendance', require('./modules/attendance/attendance.routes'));
app.use('/api/announcements', require('./modules/announcement/announcement.routes'));
app.use('/api/notifications', require('./modules/notification/notification.routes'));
app.use('/api/manager', require('./modules/manager/manager.routes'));

// Google OAuth (connect, callback, status, disconnect)
app.use('/api/google', require('./modules/google/google.routes'));

// Email module (Gmail API)
app.use('/api/email', require('./modules/email/email.routes'));

// Meetings module (Google Calendar & Meet API)
app.use('/api/meetings', require('./modules/meetings/meeting.routes'));

// Chat module (real-time messaging over REST + Socket.IO)
app.use('/api/chat', require('./modules/chat/chat.routes'));

// Fallback for task endpoints used by the client UI
app.get('/api/tasks', (req, res, next) => {
  if (req.method === 'GET') {
    return taskRoutes.handle(req, res, next);
  }
  return next();
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Express Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

module.exports = app;
