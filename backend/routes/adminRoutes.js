const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');
const { body } = require('express-validator');

const router = express.Router();
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');
const topicController = require('../controllers/topicController');
const questionController = require('../controllers/questionController');
const userController = require('../controllers/userController');
const analyticsController = require('../controllers/analyticsController');
const companyTestController = require('../controllers/companyTestController');
const { UPLOAD_DIR } = require('../config/env');

const uploadDir = path.join(__dirname, '..', UPLOAD_DIR);
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer storage for CSV imports
const csvStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.csv';
    cb(null, `csv_import_${crypto.randomUUID()}${ext}`);
  },
});

const csvUpload = multer({
  storage: csvStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext !== '.csv' && file.mimetype !== 'text/csv' && file.mimetype !== 'application/vnd.ms-excel') {
      return cb(new Error('Only CSV files are allowed'));
    }
    cb(null, true);
  },
}).single('file');

// Question validation rules
const questionRules = [
  body('topic_id').isInt({ min: 1 }).withMessage('Valid topic is required'),
  body('question_text').trim().notEmpty().withMessage('Question text is required'),
  body('option_a').trim().notEmpty().withMessage('Option A is required'),
  body('option_b').trim().notEmpty().withMessage('Option B is required'),
  body('option_c').trim().notEmpty().withMessage('Option C is required'),
  body('option_d').trim().notEmpty().withMessage('Option D is required'),
  body('correct_option')
    .toUpperCase()
    .isIn(['A', 'B', 'C', 'D'])
    .withMessage('Correct option must be A, B, C, or D'),
  body('difficulty')
    .isIn(['Easy', 'Medium', 'Hard', 'easy', 'medium', 'hard'])
    .withMessage('Difficulty must be Easy, Medium, or Hard'),
  body('explanation').optional().trim(),
];

const questionUpdateRules = [
  body('topic_id').optional().isInt({ min: 1 }).withMessage('Valid topic ID required'),
  body('question_text').optional().trim().notEmpty().withMessage('Question text cannot be empty'),
  body('option_a').optional().trim().notEmpty().withMessage('Option A cannot be empty'),
  body('option_b').optional().trim().notEmpty().withMessage('Option B cannot be empty'),
  body('option_c').optional().trim().notEmpty().withMessage('Option C cannot be empty'),
  body('option_d').optional().trim().notEmpty().withMessage('Option D cannot be empty'),
  body('correct_option')
    .optional()
    .toUpperCase()
    .isIn(['A', 'B', 'C', 'D'])
    .withMessage('Correct option must be A, B, C, or D'),
  body('difficulty')
    .optional()
    .isIn(['Easy', 'Medium', 'Hard', 'easy', 'medium', 'hard'])
    .withMessage('Difficulty must be Easy, Medium, or Hard'),
  body('explanation').optional().trim(),
];

// Company test validation rules
const companyTestRules = [
  body('company_name').trim().notEmpty().withMessage('Company/test name is required'),
  body('time_limit_minutes')
    .isInt({ min: 1, max: 600 })
    .withMessage('Time limit must be between 1 and 600 minutes'),
  body('question_count')
    .isInt({ min: 1, max: 200 })
    .withMessage('Question count must be between 1 and 200'),
  body('easy_count').optional().isInt({ min: 0 }).withMessage('Easy count cannot be negative'),
  body('medium_count').optional().isInt({ min: 0 }).withMessage('Medium count cannot be negative'),
  body('hard_count').optional().isInt({ min: 0 }).withMessage('Hard count cannot be negative'),
];

const companyTestUpdateRules = [
  body('company_name').optional().trim().notEmpty().withMessage('Company/test name cannot be empty'),
  body('time_limit_minutes')
    .optional()
    .isInt({ min: 1, max: 600 })
    .withMessage('Time limit must be between 1 and 600 minutes'),
  body('question_count')
    .optional()
    .isInt({ min: 1, max: 200 })
    .withMessage('Question count must be between 1 and 200'),
  body('easy_count').optional().isInt({ min: 0 }).withMessage('Easy count cannot be negative'),
  body('medium_count').optional().isInt({ min: 0 }).withMessage('Medium count cannot be negative'),
  body('hard_count').optional().isInt({ min: 0 }).withMessage('Hard count cannot be negative'),
  body('is_active').optional().isBoolean().withMessage('is_active must be a boolean'),
];

// --- Topics (Admin) ---
router.post('/topics', authenticate, authorize('admin'), topicController.createTopic);
router.put('/topics/:id', authenticate, authorize('admin'), topicController.updateTopic);
router.delete('/topics/:id', authenticate, authorize('admin'), topicController.deleteTopic);

// --- Question Bank Management (Admin) ---
router.get('/questions', authenticate, authorize('admin'), questionController.getAllQuestions);
router.get('/questions/:id', authenticate, authorize('admin'), questionController.getQuestionById);
router.post('/questions', authenticate, authorize('admin'), questionRules, validate, questionController.createQuestion);
router.put('/questions/:id', authenticate, authorize('admin'), questionUpdateRules, validate, questionController.updateQuestion);
router.delete('/questions/:id', authenticate, authorize('admin'), questionController.deleteQuestion);

// --- CSV Batch Import ---
router.post(
  '/questions/import',
  authenticate,
  authorize('admin'),
  (req, res, next) => {
    csvUpload(req, res, (err) => {
      if (err) {
        err.status = 400;
        err.code = 'INVALID_CSV_UPLOAD';
        return next(err);
      }
      next();
    });
  },
  questionController.importCsv
);

// --- User Management (Admin) ---
router.get('/users',     authenticate, authorize('admin'), userController.getAdminUsers);
router.get('/users/:id', authenticate, authorize('admin'), userController.getAdminUser);
router.put('/users/:id', authenticate, authorize('admin'), userController.updateAdminUser);
router.delete('/users/:id', authenticate, authorize('admin'), userController.deleteAdminUser);

// --- Company Mock Test Configuration (Admin) ---
router.get('/company-tests',        authenticate, authorize('admin'), companyTestController.listAll);
router.get('/company-tests/:id',    authenticate, authorize('admin'), companyTestController.getById);
router.post('/company-tests',       authenticate, authorize('admin'), companyTestRules, validate, companyTestController.create);
router.put('/company-tests/:id',    authenticate, authorize('admin'), companyTestUpdateRules, validate, companyTestController.update);
router.delete('/company-tests/:id', authenticate, authorize('admin'), companyTestController.remove);

// Question pool attachment for a company test
router.post('/company-tests/:id/questions',                authenticate, authorize('admin'), companyTestController.attachQuestion);
router.delete('/company-tests/:id/questions/:questionId',  authenticate, authorize('admin'), companyTestController.detachQuestion);

// --- Analytics (Admin) ---
router.get('/analytics/overview',         authenticate, authorize('admin'), analyticsController.getOverview);
router.get('/analytics/topic-difficulty', authenticate, authorize('admin'), analyticsController.getTopicDifficultyBreakdown);

// --- Activity Logs stub (Phase 11) ---
router.get('/activity-logs', authenticate, authorize('admin'), (req, res) => res.json({ success: true, data: { logs: [], total: 0 }, message: 'Phase 11 — not yet implemented' }));

module.exports = router;
