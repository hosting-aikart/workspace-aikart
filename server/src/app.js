const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');

const { apiLimiter } = require('./middleware/rateLimiter');
const { requestId } = require('./middleware/requestId');

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

// CLIENT_ORIGIN can be a single URL or a comma-separated list (e.g. a
// production domain plus a Vercel preview URL colleagues are testing
// against) — some deployed clients getting CORS-blocked while others work
// fine is the classic symptom of only one of several real frontend origins
// actually being in this list, so accept several rather than just one.
const allowedOrigins = [
  ...String(process.env.CLIENT_ORIGIN || '')
    .split(',')
    .map((o) => o.trim().replace(/\/+$/, ''))
    .filter(Boolean),
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  'http://127.0.0.1:3000',
];

// Vercel gives every branch/PR deploy of this project its own
// `<name>-<hash>-<team>.vercel.app` URL in addition to the stable
// production domain above — allow the whole project's preview subdomains
// too, rather than only whichever single URL happens to be in
// CLIENT_ORIGIN, so a colleague testing a preview link isn't CORS-blocked.
const VERCEL_PREVIEW_ORIGIN = /^https:\/\/aikart-workspace(-[a-z0-9-]+)?\.vercel\.app$/;

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or server-to-server)
      if (!origin) return callback(null, true);
      const cleanOrigin = origin.replace(/\/+$/, '');
      if (
        /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(cleanOrigin) ||
        VERCEL_PREVIEW_ORIGIN.test(cleanOrigin) ||
        allowedOrigins.includes(cleanOrigin)
      ) {
        return callback(null, true);
      }
      // Logged (not just silently rejected) so a CORS report from a user can
      // actually be diagnosed from the Railway logs afterwards, instead of
      // guessing at which origin got blocked and why.
      console.warn(`[CORS] Rejected origin "${origin}" — not in allowlist:`, allowedOrigins);
      return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  }),
);

// Request ID — mounted before logging so every access-log line and error
// can be correlated to the id echoed back in the X-Request-Id header.
app.use(requestId);

// Logging — dev format kept (this app runs behind existing log
// infrastructure that already captures stdout; reformatting to JSON here
// would be a bigger change than the audit calls for), with the request id
// appended so a specific line can be traced to a specific request/response
// pair and matched against an error log or a client-reported X-Request-Id.
morgan.token('id', (req) => req.id);
app.use(morgan(':id :method :url :status :res[content-length] - :response-time ms'));

// Body parser — file uploads (chat/email attachments, profile photos) go
// through multer as multipart/form-data with their own per-route fileSize
// limits (10MB/25MB/5MB respectively) and never hit this parser, so 1MB is
// generous for the JSON bodies this actually needs to accept while still
// capping a malicious/broken client from sending an oversized payload.
app.use(express.json({ limit: '1mb' }));
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
// const healthHandler = async (req, res) => {
//   let dbOk = true;
//   try {
//     const { getPrisma } = require('./config/prisma');
//     await getPrisma().$queryRaw`SELECT 1`;
//   } catch {
//     dbOk = false;
//   }
//   res.json({
//     status: 'ok',
//     message: 'AIKart Workspace API is running',
//     timestamp: new Date().toISOString(),
//     db: dbOk ? 'ok' : 'unreachable',
//   });
// };

const healthHandler = async (req, res) => {
  res.json({
    status: 'ok',
    message: 'AIKart Workspace API is running',
    timestamp: new Date().toISOString(),
  });
};

app.get('/health', healthHandler);
app.get('/api/health', healthHandler);

// Readiness — distinct from the liveness checks above. `/health` answers
// "is the Node process up" and must never depend on Postgres (that's what
// keeps the external keep-alive ping meaningful even while the DB is
// asleep/unreachable, per the comment above). `/ready` answers "can this
// instance actually serve real traffic" and is meant for an orchestrator's
// readiness probe (e.g. don't route traffic to this instance yet) rather
// than a public uptime ping — it checks Postgres (required) and Redis (only
// if configured; the app runs without it, so an unreachable-but-unconfigured
// Redis shouldn't fail readiness).
const readyHandler = async (req, res) => {
  const checks = { db: 'ok' };
  let ready = true;

  try {
    const { getPrisma } = require('./config/prisma');
    await getPrisma().$queryRaw`SELECT 1`;
  } catch {
    checks.db = 'unreachable';
    ready = false;
  }

  const { isConfigured, getRedis } = require('./config/redis');
  if (isConfigured()) {
    const redis = getRedis();
    checks.redis = redis?.status === 'ready' ? 'ok' : 'unreachable';
    if (checks.redis !== 'ok') ready = false;
  } else {
    checks.redis = 'not configured';
  }

  res.status(ready ? 200 : 503).json({
    status: ready ? 'ready' : 'not ready',
    checks,
    timestamp: new Date().toISOString(),
  });
};

app.get('/ready', readyHandler);
app.get('/api/ready', readyHandler);

app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: 'AIKart Workspace API Server',
    health: '/health',
  });
});

// Global rate limit — every /api/* request. Mounted after /health and
// /ready deliberately: monitors/keep-alive pings and orchestrator probes
// should never be able to trip a rate limit meant for real client traffic.
app.use('/api', apiLimiter);

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
  console.error(`[${req.id}] Express Error:`, err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    requestId: req.id,
  });
});

module.exports = app;
