const express = require('express');
const { body } = require('express-validator');
const Doctor = require('../models/Doctor');
const User = require('../models/User');
const { protect, signToken } = require('../middleware/auth');
const rateLimit = require('../middleware/rateLimit');
const { validate } = require('../middleware/validate');
const asyncHandler = require('../utils/asyncHandler');
const HttpError = require('../utils/httpError');

const router = express.Router();

// Slow down password guessing: 20 attempts per 15 minutes per IP address.
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20 });

const emailRule = body('email').trim().toLowerCase().isEmail().withMessage('Enter a valid email address.');
const nameRule = body('name').trim().isLength({ min: 2, max: 80 }).withMessage('Enter a name of 2 to 80 characters.');
const newPasswordRule = (field) =>
  body(field).isString().isLength({ min: 6, max: 128 }).withMessage('Use a password of 6 to 128 characters.');
const phoneRule = body('phone')
  .optional()
  .trim()
  .isLength({ max: 30 })
  .matches(/^[+\d\s()-]*$/)
  .withMessage('Use digits, spaces, +, - and brackets for the phone number.');

/** Token plus the public profile; doctors also get the id of their directory profile. */
async function sessionFor(user) {
  let extra = {};
  if (user.role === 'doctor') {
    const profile = await Doctor.findOne({ user: user._id }).select('_id');
    if (profile) extra = { doctorId: profile._id };
  }
  return { token: signToken(user), user: user.toPublic(extra) };
}

// POST /api/auth/register: patients create their own accounts. Roles are never taken from the body.
router.post(
  '/register',
  authLimiter,
  nameRule,
  emailRule,
  newPasswordRule('password'),
  validate,
  asyncHandler(async (req, res) => {
    const { name, email, password } = req.body;
    if (await User.exists({ email })) {
      throw new HttpError(409, 'An account with this email already exists. Sign in instead.');
    }
    const user = await User.create({ name, email, password, role: 'user' });
    res.status(201).json({ success: true, message: 'Account created', ...(await sessionFor(user)) });
  })
);

// POST /api/auth/login
router.post(
  '/login',
  authLimiter,
  emailRule,
  body('password').isString().notEmpty().withMessage('Enter your password.'),
  validate,
  asyncHandler(async (req, res) => {
    const user = await User.findOne({ email: req.body.email }).select('+password');
    if (!user || !(await user.comparePassword(req.body.password))) {
      throw new HttpError(401, 'The email or password is incorrect.');
    }
    res.json({ success: true, message: 'Signed in', ...(await sessionFor(user)) });
  })
);

// GET /api/auth/me
router.get(
  '/me',
  protect,
  asyncHandler(async (req, res) => {
    const { user } = await sessionFor(req.user);
    res.json({ success: true, user });
  })
);

// PUT /api/auth/me: update name and phone.
router.put(
  '/me',
  protect,
  nameRule.optional(),
  phoneRule,
  validate,
  asyncHandler(async (req, res) => {
    if (req.body.name !== undefined) req.user.name = req.body.name;
    if (req.body.phone !== undefined) req.user.phone = req.body.phone;
    await req.user.save();

    if (req.user.role === 'doctor' && req.body.name !== undefined) {
      await Doctor.updateOne({ user: req.user._id }, { name: req.user.name });
    }

    const { user } = await sessionFor(req.user);
    res.json({ success: true, message: 'Profile updated', user });
  })
);

// PUT /api/auth/password: returns a fresh token; tokens issued earlier stop working.
router.put(
  '/password',
  protect,
  authLimiter,
  body('currentPassword').isString().notEmpty().withMessage('Enter your current password.'),
  newPasswordRule('newPassword'),
  validate,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id).select('+password');
    // 400, not 401: a wrong current password must not sign the person out.
    if (!(await user.comparePassword(req.body.currentPassword))) {
      throw new HttpError(400, 'Your current password is incorrect.');
    }
    if (req.body.currentPassword === req.body.newPassword) {
      throw new HttpError(400, 'Choose a new password that is different from the current one.');
    }
    user.password = req.body.newPassword;
    await user.save();
    res.json({ success: true, message: 'Password changed', ...(await sessionFor(user)) });
  })
);

module.exports = router;
