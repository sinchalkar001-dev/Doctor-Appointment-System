const { env } = require('../config/env');

function duplicateKeyMessage(error) {
  const fields = Object.keys(error.keyPattern || error.keyValue || {});
  if (fields.includes('email')) return 'An account with this email already exists.';
  if (fields.includes('doctor') && fields.includes('time')) return 'That time was booked a moment ago. Choose another time.';
  if (fields.includes('user')) return 'That sign-in is already linked to another doctor.';
  return 'This record already exists.';
}

/** 404 for unknown API routes, so they never fall through to the React app. */
function notFound(req, res) {
  res.status(404).json({ success: false, message: `No API route for ${req.method} ${req.originalUrl.split('?')[0]}` });
}

// Express recognises error handlers by their four arguments, so `next` must stay.
// eslint-disable-next-line no-unused-vars
function errorHandler(error, req, res, next) {
  let status = error.status || error.statusCode || 500;
  let message = error.message || 'Something went wrong.';

  if (error.name === 'CastError') {
    status = 400;
    message = 'That id is not valid.';
  } else if (error.name === 'ValidationError') {
    status = 400;
    message = Object.values(error.errors || {})[0]?.message || 'Some fields are not valid.';
  } else if (error.code === 11000) {
    status = 409;
    message = duplicateKeyMessage(error);
  } else if (error.type === 'entity.parse.failed') {
    status = 400;
    message = 'The request body is not valid JSON.';
  } else if (error.type === 'entity.too.large') {
    status = 413;
    message = 'The request body is too large.';
  }

  if (status >= 500) console.error(error);

  res.status(status).json({
    success: false,
    message: status >= 500 && env.isProduction ? 'Something went wrong on our side. Try again.' : message,
    ...(error.details ? { errors: error.details } : {}),
  });
}

module.exports = { notFound, errorHandler };
