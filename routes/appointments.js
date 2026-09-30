const express = require('express');
const Appointment = require('../models/Appointment');
const Doctor = require('../models/Doctor');
const auth = require('../middleware/auth');

const router = express.Router();

// GET /api/appointments - Get user's appointments
router.get('/', auth, async (req, res) => {
  try {
    const appointments = await Appointment.find({ user: req.user.id })
      .populate('doctor', 'name specialization fees phone image')
      .sort({ date: -1, time: -1 });

    res.json({
      success: true,
      appointments
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// GET /api/appointments/:id - Get single appointment
router.get('/:id', auth, async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id)
      .populate('doctor', 'name specialization fees phone image');

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    // Check if user owns this appointment
    if (appointment.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this appointment'
      });
    }

    res.json({
      success: true,
      appointment
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// POST /api/appointments - Create appointment
router.post('/', auth, async (req, res) => {
  try {
    const { doctorId, date, time, reason } = req.body;

    // Validation
    if (!doctorId || !date || !time) {
      return res.status(400).json({
        success: false,
        message: 'Please provide doctorId, date, and time'
      });
    }

    // Check if doctor exists
    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found'
      });
    }

    // Check if appointment slot is available
    const existingAppointment = await Appointment.findOne({
      doctor: doctorId,
      date,
      time,
      status: { $ne: 'cancelled' }
    });

    if (existingAppointment) {
      return res.status(400).json({
        success: false,
        message: 'This appointment slot is already booked'
      });
    }

    // Create appointment
    const appointment = await Appointment.create({
      user: req.user.id,
      doctor: doctorId,
      date,
      time,
      reason: reason || '',
      status: 'pending'
    });

    const populatedAppointment = await appointment.populate('doctor', 'name specialization fees phone image');

    res.status(201).json({
      success: true,
      message: 'Appointment booked successfully',
      appointment: populatedAppointment
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// PUT /api/appointments/:id - Update appointment
router.put('/:id', auth, async (req, res) => {
  try {
    const { date, time, reason, status } = req.body;

    let appointment = await Appointment.findById(req.params.id);
    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    // Check if user owns this appointment
    if (appointment.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this appointment'
      });
    }

    // Update only allowed fields
    if (date) appointment.date = date;
    if (time) appointment.time = time;
    if (reason !== undefined) appointment.reason = reason;
    if (status) appointment.status = status;

    await appointment.save();
    const populatedAppointment = await appointment.populate('doctor', 'name specialization fees phone image');

    res.json({
      success: true,
      message: 'Appointment updated successfully',
      appointment: populatedAppointment
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// DELETE /api/appointments/:id - Cancel appointment
router.delete('/:id', auth, async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    // Check if user owns this appointment
    if (appointment.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to cancel this appointment'
      });
    }

    appointment.status = 'cancelled';
    await appointment.save();

    res.json({
      success: true,
      message: 'Appointment cancelled successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;