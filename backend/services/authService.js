const User = require('../models/User');
const ActivityLog = require('../models/ActivityLog');
const { hashPassword, comparePassword } = require('../utils/hashUtils');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../utils/jwtUtils');

const register = async ({ name, email, password }) => {
  const existing = await User.findByEmail(email);
  if (existing) {
    const err = new Error('Email already registered');
    err.status = 409;
    err.code = 'EMAIL_CONFLICT';
    throw err;
  }

  const password_hash = await hashPassword(password);
  const userId = await User.create({ name, email, password_hash });

  ActivityLog.log({
    user_id: userId,
    action_type: 'REGISTER',
    details: { email, name, role: 'student' },
  });

  const payload = { id: userId, email, role: 'student' };
  return {
    user: { id: userId, name, email, role: 'student' },
    accessToken: generateAccessToken(payload),
    refreshToken: generateRefreshToken(payload),
  };
};

const login = async ({ email, password }) => {
  const user = await User.findByEmail(email);
  if (!user) {
    const err = new Error('Invalid email or password');
    err.status = 401;
    err.code = 'INVALID_CREDENTIALS';
    throw err;
  }

  const valid = await comparePassword(password, user.password_hash);
  if (!valid) {
    const err = new Error('Invalid email or password');
    err.status = 401;
    err.code = 'INVALID_CREDENTIALS';
    throw err;
  }

  ActivityLog.log({
    user_id: user.id,
    action_type: 'LOGIN',
    details: { email: user.email, role: user.role },
  });

  const payload = { id: user.id, email: user.email, role: user.role };
  return {
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
    accessToken: generateAccessToken(payload),
    refreshToken: generateRefreshToken(payload),
  };
};

const refresh = async (token) => {
  try {
    const decoded = verifyRefreshToken(token);
    const user = await User.findById(decoded.id);
    if (!user) throw new Error('User not found');

    const payload = { id: user.id, email: user.email, role: user.role };
    return { accessToken: generateAccessToken(payload) };
  } catch {
    const err = new Error('Invalid or expired refresh token');
    err.status = 401;
    err.code = 'INVALID_REFRESH_TOKEN';
    throw err;
  }
};

module.exports = { register, login, refresh };
