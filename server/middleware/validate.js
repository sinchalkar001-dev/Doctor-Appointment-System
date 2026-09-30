const { param, validationResult } = require('express-validator');

/** Answer 400 with the first message per field when express-validator rules fail. */
function validate(req, res, next) {
  const result = validationResult(req);
  if (result.isEmpty()) return next();
  const errors = result.array({ onlyFirstError: true }).map((error) => ({ field: error.path, message: error.msg }));
  return res.status(400).json({ success: false, message: errors[0].message, errors });
}

/** Reject malformed Mongo ids before they reach a query. */
const validId = (name = 'id') => param(name).isMongoId().withMessage('That id is not valid.');

module.exports = { validate, validId };
