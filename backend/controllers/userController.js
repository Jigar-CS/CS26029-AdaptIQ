const fs = require('fs');
const path = require('path');
const pool = require('../config/db');
const User = require('../models/User');
const ActivityLog = require('../models/ActivityLog');
const { success, error } = require('../utils/responseFormatter');
const { hashPassword, comparePassword } = require('../utils/hashUtils');
const { UPLOAD_DIR } = require('../config/env');

const getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    return success(res, { user });
  } catch (err) {
    next(err);
  }
};

const updateProfile = async (req, res, next) => {
  try {
    const {
      name,
      email,
      phone,
      college,
      branch,
      graduation_year,
      cgpa,
      linkedin_url,
    } = req.body;

    const priorUser = await User.findById(req.user.id);
    const wasComplete = !!priorUser?.is_profile_complete;

    await User.updateProfile(req.user.id, {
      name,
      email,
      phone,
      college,
      branch,
      graduation_year,
      cgpa,
      linkedin_url,
    });

    const user = await User.findById(req.user.id);
    if (!wasComplete && user?.is_profile_complete) {
      ActivityLog.log({
        user_id: req.user.id,
        action_type: 'PROFILE_COMPLETE',
        details: {
          name: user.name,
          college: user.college,
          branch: user.branch,
          cgpa: user.cgpa,
        },
      });
    }

    return success(res, { user }, 'Profile updated successfully');
  } catch (err) {
    next(err);
  }
};

const updatePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findByIdWithPassword(req.user.id);
    if (!user) {
      return error(res, 'USER_NOT_FOUND', 'User not found', 404);
    }

    const valid = await comparePassword(currentPassword, user.password_hash);
    if (!valid) {
      return error(res, 'INVALID_CREDENTIALS', 'Current password is incorrect', 401);
    }

    const password_hash = await hashPassword(newPassword);
    await User.updatePassword(req.user.id, password_hash);
    return success(res, {}, 'Password updated successfully');
  } catch (err) {
    next(err);
  }
};

const uploadProfilePhoto = async (req, res, next) => {
  try {
    if (!req.file) {
      return error(res, 'NO_PHOTO_UPLOADED', 'No photo file was uploaded', 400);
    }

    const currentUser = await User.findById(req.user.id);
    const wasComplete = !!currentUser?.is_profile_complete;

    if (currentUser?.profile_photo_path) {
      const oldPath = path.join(__dirname, '..', UPLOAD_DIR, currentUser.profile_photo_path);
      if (fs.existsSync(oldPath)) {
        try { fs.unlinkSync(oldPath); } catch (e) { console.error('Failed to remove old photo:', e); }
      }
    }

    await User.updatePhotoPath(req.user.id, req.file.filename);
    const user = await User.findById(req.user.id);

    if (!wasComplete && user?.is_profile_complete) {
      ActivityLog.log({
        user_id: req.user.id,
        action_type: 'PROFILE_COMPLETE',
        details: {
          name: user.name,
          college: user.college,
          branch: user.branch,
          cgpa: user.cgpa,
        },
      });
    }

    return success(res, { user, photoPath: req.file.filename }, 'Profile photo uploaded successfully');
  } catch (err) {
    next(err);
  }
};

const uploadResume = async (req, res, next) => {
  try {
    if (!req.file) {
      return error(res, 'NO_RESUME_UPLOADED', 'No resume file was uploaded', 400);
    }

    const currentUser = await User.findById(req.user.id);
    const wasComplete = !!currentUser?.is_profile_complete;

    if (currentUser?.resume_path) {
      const oldPath = path.join(__dirname, '..', UPLOAD_DIR, currentUser.resume_path);
      if (fs.existsSync(oldPath)) {
        try { fs.unlinkSync(oldPath); } catch (e) { console.error('Failed to remove old resume:', e); }
      }
    }

    await User.updateResumePath(req.user.id, req.file.filename);
    const user = await User.findById(req.user.id);

    if (!wasComplete && user?.is_profile_complete) {
      ActivityLog.log({
        user_id: req.user.id,
        action_type: 'PROFILE_COMPLETE',
        details: {
          name: user.name,
          college: user.college,
          branch: user.branch,
          cgpa: user.cgpa,
        },
      });
    }

    return success(res, { user, resumePath: req.file.filename }, 'Resume uploaded successfully');
  } catch (err) {
    next(err);
  }
};

// ─── Admin: User Management ─────────────────────────────────────────────────

const getAdminUsers = async (req, res, next) => {
  try {
    const { search = '', page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const like = `%${search}%`;

    const [[{ total }]] = await pool.execute(
      `SELECT COUNT(*) AS total FROM users WHERE (name LIKE ? OR email LIKE ?)`,
      [like, like]
    );

    const [users] = await pool.execute(
      `SELECT id, name, email, role, is_active, profile_prompt_triggered, is_profile_complete, created_at
       FROM users
       WHERE (name LIKE ? OR email LIKE ?)
       ORDER BY id DESC
       LIMIT ? OFFSET ?`,
      [like, like, parseInt(limit, 10), offset]
    );

    return success(res, { users, total, page: parseInt(page, 10), limit: parseInt(limit, 10) });
  } catch (err) {
    next(err);
  }
};

const getAdminUser = async (req, res, next) => {
  try {
    const [rows] = await pool.execute(
      `SELECT id, name, email, role, is_active, phone, college, branch, graduation_year, cgpa,
              linkedin_url, profile_photo_path, resume_path,
              profile_prompt_triggered, is_profile_complete, created_at, updated_at
       FROM users WHERE id = ? LIMIT 1`,
      [req.params.id]
    );
    if (!rows[0]) return error(res, 'USER_NOT_FOUND', 'User not found', 404);
    return success(res, { user: rows[0] });
  } catch (err) {
    next(err);
  }
};

const updateAdminUser = async (req, res, next) => {
  try {
    const { role, is_active } = req.body;
    const updates = [];
    const params = [];

    if (role !== undefined) {
      if (!['student', 'admin'].includes(role)) {
        return error(res, 'INVALID_ROLE', 'Role must be student or admin', 400);
      }
      updates.push('role = ?');
      params.push(role);
    }

    if (is_active !== undefined) {
      updates.push('is_active = ?');
      params.push(is_active ? 1 : 0);
    }

    if (updates.length === 0) {
      return error(res, 'NO_FIELDS', 'No valid fields to update', 400);
    }

    params.push(req.params.id);
    await pool.execute(
      `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    const [rows] = await pool.execute(
      `SELECT id, name, email, role, is_active FROM users WHERE id = ? LIMIT 1`,
      [req.params.id]
    );
    return success(res, { user: rows[0] }, 'User updated successfully');
  } catch (err) {
    next(err);
  }
};

const deleteAdminUser = async (req, res, next) => {
  try {
    const [rows] = await pool.execute(
      'SELECT id, role FROM users WHERE id = ? LIMIT 1',
      [req.params.id]
    );
    if (!rows[0]) return error(res, 'USER_NOT_FOUND', 'User not found', 404);
    if (rows[0].role === 'admin') {
      return error(res, 'CANNOT_DELETE_ADMIN', 'Admin accounts cannot be deleted this way', 403);
    }
    // Soft delete — preserves test history
    await pool.execute('UPDATE users SET is_active = FALSE WHERE id = ?', [req.params.id]);
    return success(res, {}, 'User deactivated (soft-deleted) successfully');
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getProfile,
  updateProfile,
  updatePassword,
  uploadProfilePhoto,
  uploadResume,
  // Admin
  getAdminUsers,
  getAdminUser,
  updateAdminUser,
  deleteAdminUser,
};
