const express = require('express');
const router = express.Router();
const Doctor = require('../models/Doctor');
const mongoose = require('mongoose');
const { store } = require('../config/inMemory');

// Check if MongoDB is connected
const isMongoConnected = () => mongoose.connection.readyState === 1;

// GET /api/v1/doctor
router.get('/', async (req, res) => {
  try {
    if (isMongoConnected()) {
      const doctors = await Doctor.find().sort({ createdAt: -1 });
      res.json(doctors);
    } else {
      // Use in-memory storage (DEMO MODE)
      res.json(store.doctors);
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message || 'Server error fetching doctors' });
  }
});

// GET /api/v1/doctor/:id
router.get('/:id', async (req, res) => {
  try {
    if (isMongoConnected()) {
      const doctor = await Doctor.findById(req.params.id);
      if (!doctor) {
        return res.status(404).json({ message: 'Doctor not found' });
      }
      res.json(doctor);
    } else {
      // Use in-memory storage
      const doctor = store.doctors.find(d => d._id === req.params.id);
      if (!doctor) {
        return res.status(404).json({ message: 'Doctor not found' });
      }
      res.json(doctor);
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message || 'Server error fetching doctor' });
  }
});

module.exports = router;
