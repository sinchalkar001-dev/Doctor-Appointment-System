const express = require('express');
const { body, query } = require('express-validator');
const Appointment = require('../models/Appointment');
const Doctor = require('../models/Doctor');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');
const { validate, validId } = require('../middleware/validate');
const realtime = require('../services/realtime');
const { broadcastAppointment, populateParties, takenTimes } = require('../services/appointments');
const {
  BOOKING_WINDOW_DAYS,
  addDays,
  describeDay,
  isValidDateKey,
  normalizeAvailability,
  parseDateKey,
  toDateKey,
  validateAvailability,
} = require('../services/availability');
const asyncHandler = require('../utils/asyncHandler');
const HttpError = require('../utils/httpError');

const router = express.Router();

const PUBLIC_FIELDS = '-user -__v';

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Admin view of a doctor: public fields plus whether a portal sign-in exists. */
async function withAccount(doctor) {
  await doctor.populate('user', 'email');
  const plain = doctor.toObject();
  plain.account = doctor.user ? { email: doctor.user.email } : null;
  delete plain.user;
  return plain;
}

function doctorRules({ partial }) {
  const required = (chain) => (partial ? chain.optional() : chain);
  return [
    required(body('name')).trim().isLength({ min: 2, max: 80 }).withMessage('Enter the doctor’s name (2 to 80 characters).'),
    required(body('specialization')).trim().isLength({ min: 2, max: 60 }).withMessage('Enter a department (2 to 60 characters).'),
    required(body('fees')).isFloat({ min: 0, max: 1000000 }).withMessage('Enter a consultation fee of 0 or more.').toFloat(),
    body('experience')
      .optional({ values: 'falsy' })
      .isInt({ min: 0, max: 70 })
      .withMessage('Enter experience from 0 to 70 years.')
      .toInt(),
    body('phone')
      .optional()
      .trim()
      .isLength({ max: 30 })
      .matches(/^[+\d\s()-]*$/)
      .withMessage('Use digits, spaces, +, - and brackets for the phone number.'),
    body('availability')
      .optional()
      .custom((value) => {
        const { errors } = validateAvailability(value);
        if (errors.length) throw new Error(errors[0]);
        return true;
      }),
    body('account.email')
      .if(body('account').exists({ values: 'null' }))
      .trim()
      .toLowerCase()
      .isEmail()
      .withMessage('Enter a valid email for the doctor’s sign-in.'),
    body('account.password')
      .if(body('account').exists({ values: 'null' }))
      .isString()
      .isLength({ min: 6, max: 128 })
      .withMessage('Use a sign-in password of 6 to 128 characters.'),
  ];
}

async function createDoctorAccount({ name, phone, account }) {
  if (await User.exists({ email: account.email })) {
    throw new HttpError(409, 'An account with this sign-in email already exists.');
  }
  return User.create({ name, phone, email: account.email, password: account.password, role: 'doctor' });
}

// GET /api/doctors?specialization=&q=&page=&limit=
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const filter = {};
    if (req.query.specialization) {
      filter.specialization = new RegExp(escapeRegex(req.query.specialization), 'i');
    }
    if (req.query.q) {
      const pattern = new RegExp(escapeRegex(req.query.q), 'i');
      filter.$or = [{ name: pattern }, { specialization: pattern }];
    }

    const [doctors, total] = await Promise.all([
      Doctor.find(filter)
        .select(PUBLIC_FIELDS)
        .sort({ name: 1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Doctor.countDocuments(filter),
    ]);

    res.json({ success: true, doctors, pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 } });
  })
);

// GET /api/doctors/:id
router.get(
  '/:id',
  validId(),
  validate,
  asyncHandler(async (req, res) => {
    const doctor = await Doctor.findById(req.params.id).select(PUBLIC_FIELDS);
    if (!doctor) throw new HttpError(404, 'Doctor not found.');
    res.json({ success: true, doctor });
  })
);

// GET /api/doctors/:id/slots?date=YYYY-MM-DD: every slot that day and whether it is open.
router.get(
  '/:id/slots',
  validId(),
  query('date').custom(isValidDateKey).withMessage('Send a date as YYYY-MM-DD.'),
  validate,
  asyncHandler(async (req, res) => {
    const doctor = await Doctor.findById(req.params.id).select('availability');
    if (!doctor) throw new HttpError(404, 'Doctor not found.');
    const day = describeDay({
      availability: doctor.availability,
      dateKey: req.query.date,
      bookedTimes: await takenTimes(doctor._id, req.query.date),
    });
    res.json({ success: true, doctorId: doctor._id, availability: normalizeAvailability(doctor.availability), ...day });
  })
);

// GET /api/doctors/:id/calendar?from=YYYY-MM-DD&days=14: open-slot counts per day for the date picker.
router.get(
  '/:id/calendar',
  validId(),
  query('from').optional().custom(isValidDateKey).withMessage('Send "from" as YYYY-MM-DD.'),
  query('days').optional().isInt({ min: 1, max: 60 }).withMessage('Ask for 1 to 60 days.').toInt(),
  validate,
  asyncHandler(async (req, res) => {
    const doctor = await Doctor.findById(req.params.id).select('availability');
    if (!doctor) throw new HttpError(404, 'Doctor not found.');

    const first = req.query.from ? parseDateKey(req.query.from) : new Date();
    const count = req.query.days || 14;
    const keys = Array.from({ length: count }, (_, index) => toDateKey(addDays(first, index)));

    const booked = await Appointment.find({
      doctor: doctor._id,
      date: { $gte: keys[0], $lte: keys[keys.length - 1] },
      status: { $in: Appointment.ACTIVE_STATUSES },
    })
      .select('date time')
      .lean();

    const byDate = new Map();
    booked.forEach((row) => byDate.set(row.date, [...(byDate.get(row.date) || []), row.time]));

    const days = keys.map((dateKey) => {
      const day = describeDay({ availability: doctor.availability, dateKey, bookedTimes: byDate.get(dateKey) || [] });
      return { date: dateKey, workingDay: day.workingDay, openCount: day.openCount, totalCount: day.slots.length };
    });

    res.json({
      success: true,
      doctorId: doctor._id,
      availability: normalizeAvailability(doctor.availability),
      bookingWindowDays: BOOKING_WINDOW_DAYS,
      days,
    });
  })
);

// POST /api/doctors (admin): optional `account` creates a doctor-portal sign-in.
router.post(
  '/',
  protect,
  authorize('admin'),
  ...doctorRules({ partial: false }),
  validate,
  asyncHandler(async (req, res) => {
    const { name, specialization, fees, experience = 0, phone = '', availability, account } = req.body;

    let linkedUser = null;
    if (account) linkedUser = await createDoctorAccount({ name, phone, account });

    let doctor;
    try {
      doctor = await Doctor.create({
        name,
        specialization,
        fees,
        experience,
        phone,
        user: linkedUser ? linkedUser._id : null,
        ...(availability ? { availability: normalizeAvailability(availability) } : {}),
      });
    } catch (error) {
      if (linkedUser) await User.deleteOne({ _id: linkedUser._id });
      throw error;
    }

    realtime.publish({ everyone: true }, 'directory', { action: 'created', doctorId: String(doctor._id) });
    res.status(201).json({ success: true, message: 'Doctor added', doctor: await withAccount(doctor) });
  })
);

// PUT /api/doctors/:id (admin)
router.put(
  '/:id',
  protect,
  authorize('admin'),
  validId(),
  ...doctorRules({ partial: true }),
  validate,
  asyncHandler(async (req, res) => {
    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) throw new HttpError(404, 'Doctor not found.');

    ['name', 'specialization', 'fees', 'experience', 'phone'].forEach((field) => {
      if (req.body[field] !== undefined) doctor[field] = req.body[field];
    });
    if (req.body.availability) doctor.availability = normalizeAvailability(req.body.availability);

    let createdUser = null;
    if (req.body.account && !doctor.user) {
      createdUser = await createDoctorAccount({ name: doctor.name, phone: doctor.phone, account: req.body.account });
      doctor.user = createdUser._id;
    }

    try {
      await doctor.save();
    } catch (error) {
      if (createdUser) await User.deleteOne({ _id: createdUser._id });
      throw error;
    }

    if (doctor.user && !createdUser && req.body.name !== undefined) {
      await User.updateOne({ _id: doctor.user }, { name: doctor.name });
    }

    realtime.publish({ everyone: true }, 'directory', { action: 'updated', doctorId: String(doctor._id) });
    realtime.publish({ everyone: true }, 'slots', { doctorId: String(doctor._id), date: null });
    res.json({ success: true, message: 'Doctor updated', doctor: await withAccount(doctor) });
  })
);

// DELETE /api/doctors/:id (admin): cancels the doctor's open appointments and removes their sign-in.
router.delete(
  '/:id',
  protect,
  authorize('admin'),
  validId(),
  validate,
  asyncHandler(async (req, res) => {
    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) throw new HttpError(404, 'Doctor not found.');

    const open = await Appointment.find({ doctor: doctor._id, status: { $in: Appointment.ACTIVE_STATUSES } });
    for (const appointment of open) {
      appointment.status = 'cancelled';
      appointment.cancelledBy = 'admin';
      appointment.cancelReason = 'The doctor is no longer available at the clinic.';
      await appointment.save();
      await populateParties(appointment);
      broadcastAppointment(appointment, 'cancelled', req.user);
    }

    if (doctor.user) await User.deleteOne({ _id: doctor.user, role: 'doctor' });
    await doctor.deleteOne();

    realtime.publish({ everyone: true }, 'directory', { action: 'removed', doctorId: String(doctor._id) });
    res.json({ success: true, message: 'Doctor removed', cancelledAppointments: open.length });
  })
);

module.exports = router;
