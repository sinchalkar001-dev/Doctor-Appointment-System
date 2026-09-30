const express = require('express');
const { body, query } = require('express-validator');
const Appointment = require('../models/Appointment');
const Doctor = require('../models/Doctor');
const { protect, authorize } = require('../middleware/auth');
const { validate, validId } = require('../middleware/validate');
const realtime = require('../services/realtime');
const {
  applyStatusChange,
  broadcastAppointment,
  populateParties,
  toClient,
} = require('../services/appointments');
const { isValidDateKey, normalizeAvailability, validateAvailability } = require('../services/availability');
const asyncHandler = require('../utils/asyncHandler');
const HttpError = require('../utils/httpError');

// Everything here is for doctors signed in to their own portal.
const router = express.Router();
router.use(protect, authorize('doctor'));

router.use(
  asyncHandler(async (req, res, next) => {
    const doctor = await Doctor.findOne({ user: req.user._id });
    if (!doctor) throw new HttpError(404, 'No doctor profile is linked to this account. Ask an administrator to link it.');
    req.doctor = doctor;
    next();
  })
);

// GET /api/doctor/me
router.get('/me', (req, res) => {
  const doctor = req.doctor.toObject();
  delete doctor.user;
  res.json({ success: true, doctor });
});

// GET /api/doctor/appointments?from=&to=
router.get(
  '/appointments',
  query('from').optional().custom(isValidDateKey).withMessage('Send "from" as YYYY-MM-DD.'),
  query('to').optional().custom(isValidDateKey).withMessage('Send "to" as YYYY-MM-DD.'),
  validate,
  asyncHandler(async (req, res) => {
    const filter = { doctor: req.doctor._id };
    if (req.query.from || req.query.to) {
      filter.date = {};
      if (req.query.from) filter.date.$gte = req.query.from;
      if (req.query.to) filter.date.$lte = req.query.to;
    }
    const appointments = await Appointment.find(filter).populate('user', 'name email phone').sort({ date: 1, time: 1 });
    res.json({ success: true, appointments: appointments.map(toClient) });
  })
);

// PATCH /api/doctor/appointments/:id: confirm, complete or cancel one of the doctor's own appointments.
router.patch(
  '/appointments/:id',
  validId(),
  body('status').isIn(['confirmed', 'completed', 'cancelled']).withMessage('Choose confirmed, completed or cancelled.'),
  body('note').optional().isString().isLength({ max: 1000 }).withMessage('Keep the note under 1000 characters.'),
  body('reason').optional().isString().isLength({ max: 300 }).withMessage('Keep the reason under 300 characters.'),
  validate,
  asyncHandler(async (req, res) => {
    const appointment = await Appointment.findOne({ _id: req.params.id, doctor: req.doctor._id });
    if (!appointment) throw new HttpError(404, 'Appointment not found.');

    applyStatusChange(appointment, req.body.status, { by: 'doctor', reason: req.body.reason, note: req.body.note });
    await appointment.save();
    await populateParties(appointment);
    broadcastAppointment(appointment, req.body.status, req.user);

    res.json({ success: true, message: `Appointment ${req.body.status}`, appointment: toClient(appointment) });
  })
);

// PUT /api/doctor/availability: weekly working pattern. Existing bookings are kept.
router.put(
  '/availability',
  body().custom((value) => {
    const { errors } = validateAvailability(value);
    if (errors.length) throw new Error(errors[0]);
    return true;
  }),
  validate,
  asyncHandler(async (req, res) => {
    req.doctor.availability = normalizeAvailability(req.body);
    await req.doctor.save();
    realtime.publish({ everyone: true }, 'slots', { doctorId: String(req.doctor._id), date: null });
    res.json({ success: true, message: 'Availability saved', availability: req.doctor.availability });
  })
);

module.exports = router;
