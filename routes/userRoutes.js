const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Appointment = require('../models/Appointment');
const Doctor = require('../models/Doctor');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const auth = require('../middleware/auth');
const mongoose = require('mongoose');
const { store, makeId } = require('../config/inMemory');

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key_change_in_production';

// Check if MongoDB is connected
const isMongoConnected = () => mongoose.connection.readyState === 1;

// POST /api/v1/user/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Please provide name, email and password' });
    }

    // If MongoDB available, use database
    if (isMongoConnected()) {
      // Check if user already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ message: 'Email already registered' });
      }

      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      // Create user
      const user = await User.create({
        name,
        email,
        password: hashedPassword
      });

      // Generate JWT token
      const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '7d' });

      return res.status(201).json({
        message: 'User registered successfully',
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email
        }
      });
    } else {
      // Use in-memory storage (DEMO MODE)
      const existingUser = store.users.find(u => u.email === email);
      if (existingUser) {
        return res.status(400).json({ message: 'Email already registered' });
      }

      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      const userId = makeId();
      const user = { id: userId, name, email, password: hashedPassword };
      store.users.push(user);

      // Generate JWT token
      const token = jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: '7d' });

      return res.status(201).json({
        message: 'User registered successfully (DEMO MODE)',
        token,
        user: { id: userId, name, email }
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message || 'Server error during registration' });
  }
});

// POST /api/v1/user/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' });
    }

    if (isMongoConnected()) {
      // Find user and select password field
      const user = await User.findOne({ email }).select('+password');
      if (!user) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      // Compare password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      // Generate JWT token
      const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '7d' });

      return res.json({
        message: 'Logged in successfully',
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email
        }
      });
    } else {
      // Use in-memory storage (DEMO MODE)
      const user = store.users.find(u => u.email === email);
      if (!user) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      // Compare password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      // Generate JWT token
      const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '7d' });

      return res.json({
        message: 'Logged in successfully (DEMO MODE)',
        token,
        user: { id: user.id, name: user.name, email: user.email }
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message || 'Server error during login' });
  }
});

// GET /api/v1/user/appointments
router.get('/appointments', auth, async (req, res) => {
  try {
    if (isMongoConnected()) {
      const appointments = await Appointment.find({ user: req.user.id })
        .populate('doctor', 'name specialization fees')
        .sort({ date: -1 });

      res.json(appointments);
    } else {
      // In-memory mode: filter by user
      const appointments = store.appointments
        .filter(a => a.userId === req.user.id)
        .map(a => {
          const doctor = store.doctors.find(d => d._id === a.doctorId);
          return {
            ...a,
            doctor: doctor ? { name: doctor.name, specialization: doctor.specialization, fees: doctor.fees } : null
          };
        })
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      res.json(appointments);
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message || 'Server error fetching appointments' });
  }
});

// POST /api/v1/user/appointments
router.post('/appointments', auth, async (req, res) => {
  try {
    const { doctorId, date, time, reason } = req.body;

    // Validation
    if (!doctorId || !date || !time) {
      return res.status(400).json({ message: 'Please provide doctorId, date and time' });
    }

    if (isMongoConnected()) {
      // Verify doctor exists
      const doctor = await Doctor.findById(doctorId);
      if (!doctor) {
        return res.status(404).json({ message: 'Doctor not found' });
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

      // Populate and return
      const populatedAppt = await appointment.populate('doctor', 'name specialization fees');

      return res.status(201).json({
        message: 'Appointment booked successfully',
        appointment: populatedAppt
      });
    } else {
      // In-memory mode
      const doctor = store.doctors.find(d => d._id === doctorId);
      if (!doctor) {
        return res.status(404).json({ message: 'Doctor not found' });
      }

      const appointmentId = makeId();
      const appointment = {
        _id: appointmentId,
        userId: req.user.id,
        doctorId,
        date,
        time,
        reason: reason || '',
        status: 'pending',
        createdAt: new Date()
      };
      store.appointments.push(appointment);

      return res.status(201).json({
        message: 'Appointment booked successfully (DEMO MODE)',
        appointment: {
          ...appointment,
          doctor: { name: doctor.name, specialization: doctor.specialization, fees: doctor.fees }
        }
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message || 'Server error creating appointment' });
  }
});

module.exports = router;
