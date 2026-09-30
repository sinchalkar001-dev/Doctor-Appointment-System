const express = require('express');
const { body, query } = require('express-validator');
const Appointment = require('../models/Appointment');
const Doctor = require('../models/Doctor');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');
const { validate, validId } = require('../middleware/validate');
const {
  applyStatusChange,
  broadcastAppointment,
  populateParties,
  toClient,
} = require('../services/appointments');
const { toDateKey } = require('../services/availability');
const asyncHandler = require('../utils/asyncHandler');
const HttpError = require('../utils/httpError');

// Every admin route requires a signed-in admin. Before, any signed-in user could reach these.
const router = express.Router();
router.use(protect, authorize('admin'));

// GET /api/admin/stats
router.get(
  '/stats',
  asyncHandler(async (req, res) => {
    const today = toDateKey(new Date());
    const [totalDoctors, totalUsers, byStatus, todayAppointments, doctorsWithPortal] = await Promise.all([
      Doctor.countDocuments(),
      User.countDocuments(),
      Appointment.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Appointment.countDocuments({ date: today, status: { $in: Appointment.ACTIVE_STATUSES } }),
      Doctor.countDocuments({ user: { $type: 'objectId' } }),
    ]);

    const counts = Object.fromEntries(byStatus.map((row) => [row._id, row.count]));
    res.json({
      success: true,
      stats: {
        totalDoctors,
        totalUsers,
        totalAppointments: byStatus.reduce((sum, row) => sum + row.count, 0),
        pendingAppointments: counts.pending || 0,
        confirmedAppointments: counts.confirmed || 0,
        completedAppointments: counts.completed || 0,
        cancelledAppointments: counts.cancelled || 0,
        todayAppointments,
        doctorsWithPortal,
      },
    });
  })
);

// GET /api/admin/appointments?status=&page=&limit=
router.get(
  '/appointments',
  query('status').optional({ values: 'falsy' }).isIn(Appointment.STATUSES).withMessage('Unknown status.'),
  validate,
  asyncHandler(async (req, res) => {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const filter = req.query.status ? { status: req.query.status } : {};

    const [appointments, total] = await Promise.all([
      Appointment.find(filter)
        .populate('user', 'name email phone')
        .populate('doctor', 'name specialization')
        .sort({ date: -1, time: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Appointment.countDocuments(filter),
    ]);

    res.json({
      success: true,
      appointments: appointments.map(toClient),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 },
    });
  })
);

const updateStatus = asyncHandler(async (req, res) => {
  const appointment = await Appointment.findById(req.params.id);
  if (!appointment) throw new HttpError(404, 'Appointment not found.');

  applyStatusChange(appointment, req.body.status, { by: 'admin', reason: req.body.reason });
  await appointment.save();
  await populateParties(appointment);
  broadcastAppointment(appointment, req.body.status, req.user);

  res.json({ success: true, message: `Appointment ${req.body.status}`, appointment: toClient(appointment) });
});

const statusRules = [
  validId(),
  body('status').isIn(['confirmed', 'completed', 'cancelled']).withMessage('Choose confirmed, completed or cancelled.'),
  body('reason').optional().isString().isLength({ max: 300 }).withMessage('Keep the reason under 300 characters.'),
  validate,
];

// PATCH /api/admin/appointments/:id, and PUT kept for older clients.
router.patch('/appointments/:id', ...statusRules, updateStatus);
router.put('/appointments/:id', ...statusRules, updateStatus);

// GET /api/admin/doctors: includes each doctor's portal sign-in, if any.
router.get(
  '/doctors',
  asyncHandler(async (req, res) => {
    const doctors = await Doctor.find().populate('user', 'email').sort({ name: 1 });
    res.json({
      success: true,
      doctors: doctors.map((doctor) => {
        const plain = doctor.toObject();
        plain.account = doctor.user ? { email: doctor.user.email } : null;
        delete plain.user;
        return plain;
      }),
    });
  })
);

// GET /api/admin/users
router.get(
  '/users',
  asyncHandler(async (req, res) => {
    const users = await User.find().sort({ createdAt: -1 });
    res.json({ success: true, users: users.map((user) => user.toPublic({ _id: user._id })) });
  })
);

module.exports = router;
