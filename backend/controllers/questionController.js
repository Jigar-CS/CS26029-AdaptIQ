const Question = require('../models/Question');
const ActivityLog = require('../models/ActivityLog');
const csvImportService = require('../services/csvImportService');
const { success, created, notFound, error } = require('../utils/responseFormatter');

const getAllQuestions = async (req, res, next) => {
  try {
    const { topic_id, difficulty, search, page, limit } = req.query;
    const result = await Question.findAll({
      topic_id,
      difficulty,
      search,
      page,
      limit,
    });
    return success(res, result);
  } catch (err) {
    next(err);
  }
};

const getQuestionById = async (req, res, next) => {
  try {
    const question = await Question.findById(req.params.id);
    if (!question) {
      return notFound(res, 'Question not found');
    }
    return success(res, { question });
  } catch (err) {
    next(err);
  }
};

const createQuestion = async (req, res, next) => {
  try {
    const {
      topic_id,
      question_text,
      option_a,
      option_b,
      option_c,
      option_d,
      correct_option,
      difficulty,
      explanation,
    } = req.body;

    const hash = Question.generateQuestionHash(question_text);
    const exists = await Question.existsByHash(topic_id, hash);
    if (exists) {
      return error(
        res,
        'DUPLICATE_QUESTION',
        'A duplicate question already exists in this topic',
        409
      );
    }

    const id = await Question.create({
      topic_id,
      question_text,
      option_a,
      option_b,
      option_c,
      option_d,
      correct_option,
      difficulty,
      explanation,
    });

    const question = await Question.findById(id);
    return created(res, { question }, 'Question created successfully');
  } catch (err) {
    next(err);
  }
};

const updateQuestion = async (req, res, next) => {
  try {
    const existing = await Question.findById(req.params.id);
    if (!existing) {
      return notFound(res, 'Question not found');
    }

    const topicId = req.body.topic_id || existing.topic_id;
    const questionText = req.body.question_text || existing.question_text;

    if (req.body.question_text) {
      const newHash = Question.generateQuestionHash(questionText);
      if (newHash !== existing.question_hash) {
        const hashExists = await Question.existsByHash(topicId, newHash);
        if (hashExists) {
          return error(
            res,
            'DUPLICATE_QUESTION',
            'A duplicate question already exists in this topic',
            409
          );
        }
      }
    }

    await Question.update(req.params.id, req.body);
    const updated = await Question.findById(req.params.id);
    return success(res, { question: updated }, 'Question updated successfully');
  } catch (err) {
    next(err);
  }
};

const deleteQuestion = async (req, res, next) => {
  try {
    const existing = await Question.findById(req.params.id);
    if (!existing) {
      return notFound(res, 'Question not found');
    }

    await Question.softDelete(req.params.id);
    return success(res, {}, 'Question deleted successfully');
  } catch (err) {
    next(err);
  }
};

const importCsv = async (req, res, next) => {
  try {
    if (!req.file) {
      return error(res, 'NO_FILE_UPLOADED', 'Please upload a CSV file', 400);
    }

    const report = await csvImportService.importCsv({
      filePath: req.file.path,
      defaultTopicId: req.body.topic_id,
    });

    ActivityLog.log({
      user_id: req.user?.id || null,
      action_type: 'CSV_IMPORT',
      details: {
        filename: req.file.originalname,
        total_rows: report.total_rows,
        inserted: report.inserted,
        skipped_duplicates: report.skipped_duplicates,
        errors_count: report.errors ? report.errors.length : 0,
      },
    });

    return success(res, { report }, 'CSV import processed successfully');
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAllQuestions,
  getQuestionById,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  importCsv,
};
