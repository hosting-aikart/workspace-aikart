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

// Security
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }),
);

const allowedOrigins = [
  process.env.CLIENT_ORIGIN,
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
      if (
        /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin) ||
        allowedOrigins.includes(origin)
      ) {
        return callback(null, true);
      }
      return callback(new Error(`CORS: origin ${origin} not allowed`));
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

// Health
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'AIKart Workspace API is running',
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

// Fallback for task endpoints used by the client UI
app.get('/api/tasks', (req, res, next) => {
  if (req.method === 'GET') {
    return taskRoutes.handle(req, res, next);
  }
  return next();
});
module.exports = app;
