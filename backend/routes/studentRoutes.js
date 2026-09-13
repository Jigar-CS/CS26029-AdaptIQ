const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const { body, param } = require('express-validator');
const router = express.Router();
const authenticate = require('../middleware/authenticate');
const profileGate = require('../middleware/profileGate');
const validate = require('../middleware/validate');
const { testSubmissionLimiter, testStartLimiter } = require('../middleware/rateLimiter');
const userController = require('../controllers/userController');
const topicController = require('../controllers/topicController');
const adaptiveController = require('../controllers/adaptiveController');
const placementScoreController = require('../controllers/placementScoreController');
const companyTestController = require('../controllers/companyTestController');
const performanceController = require('../controllers/performanceController');
const recommendationController = require('../controllers/recommendationController');
const { UPLOAD_DIR, MAX_PHOTO_SIZE, MAX_RESUME_SIZE } = require('../config/env');

const uploadDir = path.join(__dirname, '..', UPLOAD_DIR);
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${crypto.randomUUID()}${ext}`);
  },
});

const photoUpload = multer({
  storage,
  limits: { fileSize: MAX_PHOTO_SIZE },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error('Only JPG, PNG, and WEBP images are allowed'));
    }
    cb(null, true);
  },
}).single('photo');

const resumeUpload = multer({
  storage,
  limits: { fileSize: MAX_RESUME_SIZE },
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== 'application/pdf') {
      return cb(new Error('Only PDF resumes are allowed'));
    }
    cb(null, true);
  },
}).single('resume');

const profileRules = [
  body('name').optional().trim().notEmpty().withMessage('Name is required'),
  body('email').optional().isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('phone')
    .optional()
    .trim()
    .matches(/^[0-9+() -]{7,20}$/)
    .withMessage('Valid phone number format required (7-20 digits)'),
  body('college').optional().trim().notEmpty().withMessage('College is required'),
  body('branch').optional().trim().notEmpty().withMessage('Branch is required'),
  body('graduation_year')
    .optional()
    .isInt({ min: 2020, max: 2035 })
    .withMessage('Graduation year must be between 2020 and 2035'),
  body('cgpa')
    .optional()
    .isFloat({ min: 0, max: 10 })
    .withMessage('CGPA must be between 0 and 10'),
  body('linkedin_url')
    .optional({ nullable: true, checkFalsy: true })
    .isURL()
    .withMessage('LinkedIn URL must be valid'),
];

const passwordRules = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters'),
];

const startAdaptiveRules = [
  body('topic_id')
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage('topic_id must be a positive integer'),
];

const testIdParamRules = [
  param('testId').isInt({ min: 1 }).withMessage('Valid test ID is required'),
];

const adaptiveAnswerRules = [
  param('testId').isInt({ min: 1 }).withMessage('Valid test ID is required'),
  body('question_id').isInt({ min: 1 }).withMessage('Valid question ID is required'),
  body('selected_option')
    .trim()
    .toUpperCase()
    .isIn(['A', 'B', 'C', 'D'])
    .withMessage('selected_option must be A, B, C, or D'),
  body('response_time_seconds')
    .optional()
    .isFloat({ min: 0, max: 3600 })
    .withMessage('response_time_seconds must be between 0 and 3600'),
];

const companyTestIdParamRules = [
  param('id').isInt({ min: 1 }).withMessage('Valid company test ID is required'),
];

const companyAnswerRules = [
  param('id').isInt({ min: 1 }).withMessage('Valid company test ID is required'),
  body('question_id').isInt({ min: 1 }).withMessage('Valid question ID is required'),
  body('selected_option')
    .trim()
    .toUpperCase()
    .isIn(['A', 'B', 'C', 'D'])
    .withMessage('selected_option must be A, B, C, or D'),
  body('time_spent_seconds')
    .optional()
    .isFloat({ min: 0, max: 7200 })
    .withMessage('time_spent_seconds must be between 0 and 7200'),
];

// Profile
router.get('/profile', authenticate, userController.getProfile);
router.put('/profile', authenticate, profileRules, validate, userController.updateProfile);
router.put('/profile/password', authenticate, passwordRules, validate, userController.updatePassword);
router.post('/profile/photo', authenticate, (req, res, next) => photoUpload(req, res, (err) => {
  if (err) {
    err.status = 400;
    err.code = 'INVALID_PHOTO_UPLOAD';
    return next(err);
  }
  next();
}), userController.uploadProfilePhoto);
router.post('/profile/resume', authenticate, (req, res, next) => resumeUpload(req, res, (err) => {
  if (err) {
    err.status = 400;
    err.code = 'INVALID_RESUME_UPLOAD';
    return next(err);
  }
  next();
}), userController.uploadResume);

// Topics (shared Student + Admin read)
router.get('/topics', authenticate, topicController.getAllTopics);

// Placeholder routes — to be implemented in future phases
const stub = (msg) => (req, res) => res.json({ success: true, data: {}, message: msg });

router.post('/practice/start',               authenticate, stub('Practice not yet implemented'));
router.post('/practice/:testId/answer',      authenticate, stub('Practice not yet implemented'));
router.post('/practice/:testId/complete',    authenticate, stub('Practice not yet implemented'));

// Adaptive Test (Topic or Full)
router.post('/adaptive/start',               authenticate, profileGate, testStartLimiter, startAdaptiveRules, validate, adaptiveController.start);
router.get('/adaptive/:testId/next-batch',   authenticate, testIdParamRules, validate, adaptiveController.getNextBatch);
router.post('/adaptive/:testId/answer',      authenticate, testSubmissionLimiter, adaptiveAnswerRules, validate, adaptiveController.submitAnswer);
router.get('/adaptive/:testId/status',       authenticate, testIdParamRules, validate, adaptiveController.getStatus);
router.post('/adaptive/:testId/complete',    authenticate, testIdParamRules, validate, adaptiveController.complete);

// Placement Score
router.get('/placement-score',               authenticate, placementScoreController.getLatest);
router.get('/placement-score/history',       authenticate, placementScoreController.getHistory);

// Company Mock Test (fixed question set, timed, server-enforced auto-submit)
router.get('/company-tests',                 authenticate, companyTestController.getStandardTest);
router.post('/company-tests/:id/start',      authenticate, profileGate, testStartLimiter, companyTestIdParamRules, validate, companyTestController.start);
router.post('/company-tests/:id/answer',     authenticate, testSubmissionLimiter, companyAnswerRules, validate, companyTestController.submitAnswer);
router.post('/company-tests/:id/complete',   authenticate, companyTestIdParamRules, validate, companyTestController.complete);

// Performance & Analytics
router.get('/performance/summary',           authenticate, performanceController.getSummary);
router.get('/performance/by-topic',          authenticate, performanceController.getByTopic);
router.get('/performance/history',           authenticate, performanceController.getHistory);

// Recommendations
router.get('/recommendations',               authenticate, recommendationController.getRecommendations);
router.put('/recommendations/:id/dismiss',   authenticate, param('id').isInt({ min: 1 }).withMessage('Valid recommendation ID required'), validate, recommendationController.dismissRecommendation);

module.exports = router;
