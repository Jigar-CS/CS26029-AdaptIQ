const rateLimit = require('express-rate-limit');

/** Strict limiter for auth endpoints — prevents brute-force attacks (10 attempts / 15 min) */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many authentication attempts, please try again in 15 minutes.' },
  },
});

/** Rate limiter for CSV batch imports — prevents resource exhaustion (10 imports / hour) */
const csvImportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: 'RATE_LIMIT_EXCEEDED', message: 'CSV import rate limit reached. Please wait before uploading another batch.' },
  },
});

/** Rate limiter for test answer submissions — mitigates automated scraping/botting (60 answers / min) */
const testSubmissionLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many answer submissions in a short period. Please pace your responses.' },
  },
});

/** Rate limiter for creating new test sessions (10 test starts / min) */
const testStartLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many test sessions initiated. Please wait a moment.' },
  },
});

/** General API limiter */
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  authLimiter,
  csvImportLimiter,
  testSubmissionLimiter,
  testStartLimiter,
  apiLimiter,
};
