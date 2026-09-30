const express = require('express');
const { body } = require('express-validator');
const Appointment = require('../models/Appointment');
const Doctor = require('../models/Doctor');
const { protect } = require('../middleware/auth');
const { validate, validId } = require('../middleware/validate');
const {
  assertSlotAvailable,
  broadcastAppointment,
  populateParties,
  toClient,
} = require('../services/appointments');
const { isValidDateKey, isValidTime } = require('../services/availability');
const asyncHandler = require('../utils/asyncHandler');
const HttpError = require('../utils/httpError');

const router = express.Router();
router.use(protect);

const PATIENT_DOCTOR_FIELDS = 'name specialization fees phone availability';

const slotRules = [
  body('date').custom(isValidDateKey).withMessage('Choose a valid date.'),
  body('time').custom(isValidTime).withMessage('Choose a valid time.'),
];

/** Load an appointment that belongs to the signed-in patient, or 404 without revealing others'. */
async function findOwned(req) {
  const appointment = await Appointment.findById(req.params.id);
  if (!appointment || String(appointment.user) !== String(req.user._id)) {
    throw new HttpError(404, 'Appointment not found.');
  }
  return appointment;
}

// GET /api/appointments: the signed-in patient's appointments, newest first.
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const appointments = await Appointment.find({ user: req.user._id })
      .populate('doctor', PATIENT_DOCTOR_FIELDS)
      .sort({ date: -1, time: -1 });
    res.json({ success: true, appointments: appointments.map(toClient) });
  })
);

// GET /api/appointments/:id
router.get(
  '/:id',
  validId(),
  validate,
  asyncHandler(async (req, res) => {
    const appointment = await findOwned(req);
    await appointment.populate('doctor', PATIENT_DOCTOR_FIELDS);
    res.json({ success: true, appointment: toClient(appointment) });
  })
);

// POST /api/appointments: book an open slot.
router.post(
  '/',
  body('doctorId').isMongoId().withMessage('Choose a doctor.'),
  ...slotRules,
  body('reason')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Keep the reason under 500 characters.'),
  validate,
  asyncHandler(async (req, res) => {
    const { doctorId, date, time, reason = '' } = req.body;
    const doctor = await Doctor.findById(doctorId);
    if (!doctor) throw new HttpError(404, 'That doctor is no longer listed.');

    await assertSlotAvailable({ doctor, date, time, patientId: req.user._id });

    // The unique index still guards against two requests racing for the same slot.
    const appointment = await Appointment.create({ user: req.user._id, doctor: doctor._id, date, time, reason });
    await populateParties(appointment);
    broadcastAppointment(appointment, 'booked', req.user);

    res.status(201).json({ success: true, message: 'Appointment booked', appointment: toClient(appointment) });
  })
);

// PATCH /api/appointments/:id/reschedule: move to another open slot. It goes back to pending.
router.patch(
  '/:id/reschedule',
  validId(),
  ...slotRules,
  validate,
  asyncHandler(async (req, res) => {
    const { date, time } = req.body;
    const appointment = await findOwned(req);
    if (!Appointment.ACTIVE_STATUSES.includes(appointment.status)) {
      throw new HttpError(400, 'Only pending or confirmed appointments can be rescheduled.');
    }
    if (appointment.date === date && appointment.time === time) {
      throw new HttpError(400, 'Choose a different date or time.');
    }

    const doctor = await Doctor.findById(appointment.doctor);
    if (!doctor) throw new HttpError(400, 'This doctor is no longer listed, so the appointment can’t be moved.');

    await assertSlotAvailable({ doctor, date, time, patientId: req.user._id, excludeId: appointment._id });

    const previousDate = appointment.date;
    appointment.date = date;
    appointment.time = time;
    appointment.status = 'pending';
    await appointment.save();
    await populateParties(appointment);
    broadcastAppointment(appointment, 'rescheduled', req.user, { extraDates: [previousDate] });

    res.json({ success: true, message: 'Appointment rescheduled', appointment: toClient(appointment) });
  })
);

const cancelOwn = asyncHandler(async (req, res) => {
  const appointment = await findOwned(req);
  if (!Appointment.ACTIVE_STATUSES.includes(appointment.status)) {
    throw new HttpError(400, 'This appointment can no longer be cancelled.');
  }
  appointment.status = 'cancelled';
  appointment.cancelledBy = 'patient';
  appointment.cancelReason = String(req.body?.reason || '').trim().slice(0, 300);
  await appointment.save();
  await populateParties(appointment);
  broadcastAppointment(appointment, 'cancelled', req.user);

  res.json({ success: true, message: 'Appointment cancelled', appointment: toClient(appointment) });
});

// PATCH /api/appointments/:id/cancel, and DELETE kept for older clients.
router.patch('/:id/cancel', validId(), validate, cancelOwn);
router.delete('/:id', validId(), validate, cancelOwn);

module.exports = router;
