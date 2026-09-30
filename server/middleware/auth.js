const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { env } = require('../config/env');
const User = require('../models/User');
const HttpError = require('../utils/httpError');
const asyncHandler = require('../utils/asyncHandler');

function signToken(user) {
  return jwt.sign({ id: String(user._id), role: user.role }, env.jwtSecret, { expiresIn: env.jwtExpire });
}

function bearerToken(req) {
  const header = req.get('authorization') || '';
  const [scheme, token] = header.split(' ');
  return scheme && scheme.toLowerCase() === 'bearer' && token ? token.trim() : '';
}

/**
 * Verify a token and load its account fresh from the database, so a deleted
 * account, a changed role or a changed password takes effect immediately.
 */
async function userFromToken(token) {
  if (!token) throw new HttpError(401, 'Sign in to continue.');

  let payload;
  try {
    payload = jwt.verify(token, env.jwtSecret);
  } catch (error) {
    throw new HttpError(
      401,
      error.name === 'TokenExpiredError' ? 'Your session has expired. Sign in again.' : 'Your session isn’t valid. Sign in again.'
    );
  }

  if (!mongoose.isValidObjectId(payload.id)) throw new HttpError(401, 'Your session isn’t valid. Sign in again.');

  const user = await User.findById(payload.id).select('+passwordChangedAt');
  if (!user) throw new HttpError(401, 'This account no longer exists.');
  if (user.passwordChangedAt && payload.iat * 1000 < user.passwordChangedAt.getTime()) {
    throw new HttpError(401, 'Your password was changed. Sign in again.');
  }
  return user;
}

const protect = asyncHandler(async (req, res, next) => {
  req.user = await userFromToken(bearerToken(req));
  next();
});

/** Role-based access control: allow only the listed roles. */
function authorize(...roles) {
  return function checkRole(req, res, next) {
    if (!req.user) return next(new HttpError(401, 'Sign in to continue.'));
    if (!roles.includes(req.user.role)) return next(new HttpError(403, 'Your account doesn’t have access to this.'));
    return next();
  };
}

module.exports = { signToken, userFromToken, protect, authorize };
