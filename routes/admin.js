const express = require('express');
const User = require('../models/User');
const Doctor = require('../models/Doctor');
const Appointment = require('../models/Appointment');
const auth = require('../middleware/auth');

const router = express.Router();

// Middleware to check if user is admin
const adminOnly = (req, res, next) => {
  // For now, we'll allow authenticated users to access admin routes
  // In production, add proper role checking
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
  next();
};

// GET /api/admin/stats - Dashboard statistics
router.get('/stats', auth, adminOnly, async (req, res) => {
  try {
    const totalDoctors = await Doctor.countDocuments();
    const totalUsers = await User.countDocuments();
    const totalAppointments = await Appointment.countDocuments();
    const pendingAppointments = await Appointment.countDocuments({ status: 'pending' });
    const confirmedAppointments = await Appointment.countDocuments({ status: 'confirmed' });

    res.json({
      success: true,
      stats: {
        totalDoctors,
        totalUsers,
        totalAppointments,
        pendingAppointments,
        confirmedAppointments
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// GET /api/admin/appointments - Get all appointments
router.get('/appointments', auth, adminOnly, async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    let query = {};
    if (status) {
      query.status = status;
    }

    const appointments = await Appointment.find(query)
      .populate('user', 'name email')
      .populate('doctor', 'name specialization')
      .limit(limit * 1)
      .skip(skip)
      .sort({ date: -1 });

    const total = await Appointment.countDocuments(query);

    res.json({
      success: true,
      appointments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// PUT /api/admin/appointments/:id - Update appointment status
router.put('/appointments/:id', auth, adminOnly, async (req, res) => {
  try {
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Please provide status'
      });
    }

    const appointment = await Appointment.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    ).populate('user', 'name email')
     .populate('doctor', 'name specialization');

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    res.json({
      success: true,
      message: 'Appointment status updated',
      appointment
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// GET /api/admin/doctors - Get all doctors
router.get('/doctors', auth, adminOnly, async (req, res) => {
  try {
    const doctors = await Doctor.find().sort({ name: 1 });

    res.json({
      success: true,
      doctors
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// GET /api/admin/users - Get all users
router.get('/users', auth, adminOnly, async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });

    res.json({
      success: true,
      users
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;