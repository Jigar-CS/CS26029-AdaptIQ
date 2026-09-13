require('./config/env'); // validates env vars before anything else

const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const { CLIENT_ORIGIN, UPLOAD_DIR } = require('./config/env');

const uploadDir = path.join(__dirname, UPLOAD_DIR);
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const { apiLimiter } = require('./middleware/rateLimiter');
const errorHandler = require('./middleware/errorHandler');
const routes = require('./routes/index');

const app = express();

// Security headers — configure CORP to allow cross-origin assets for uploads
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// CORS — allow frontend dev server
app.use(cors({
  origin: CLIENT_ORIGIN,
  credentials: true,
}));

// Request logging
app.use(morgan('dev'));

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Serve uploaded files (profile photos, resumes) as static assets
// Files are stored under /uploads/<uuid>.<ext>
app.use('/uploads', express.static(path.join(__dirname, UPLOAD_DIR)));

// Global rate limiter
app.use('/api', apiLimiter);

// API routes
app.use('/api', routes);

// 404 handler for unknown routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: `Route ${req.method} ${req.path} not found` },
  });
});

// Global error handler (must be last)
app.use(errorHandler);

module.exports = app;
