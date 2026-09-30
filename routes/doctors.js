const express = require('express');
const Doctor = require('../models/Doctor');
const auth = require('../middleware/auth');

const router = express.Router();

// GET /api/doctors - Get all doctors with optional filters
router.get('/', async (req, res) => {
  try {
    const { specialization, page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    let query = {};
    if (specialization) {
      query.specialization = new RegExp(specialization, 'i');
    }

    const doctors = await Doctor.find(query)
      .limit(limit * 1)
      .skip(skip)
      .sort({ name: 1 });

    const total = await Doctor.countDocuments(query);

    res.json({
      success: true,
      doctors,
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

// GET /api/doctors/:id - Get single doctor
router.get('/:id', async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.params.id);

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found'
      });
    }

    res.json({
      success: true,
      doctor
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// POST /api/doctors - Create doctor (admin only)
router.post('/', auth, async (req, res) => {
  try {
    const { name, specialization, fees, experience, phone, image } = req.body;

    if (!name || !specialization || !fees) {
      return res.status(400).json({
        success: false,
        message: 'Please provide required fields: name, specialization, fees'
      });
    }

    const doctor = await Doctor.create({
      name,
      specialization,
      fees,
      experience: experience || 0,
      phone: phone || '',
      image: image || null
    });

    res.status(201).json({
      success: true,
      message: 'Doctor created successfully',
      doctor
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// PUT /api/doctors/:id - Update doctor (admin only)
router.put('/:id', auth, async (req, res) => {
  try {
    const { name, specialization, fees, experience, phone, image } = req.body;

    let doctor = await Doctor.findById(req.params.id);
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found'
      });
    }

    doctor = await Doctor.findByIdAndUpdate(
      req.params.id,
      { name, specialization, fees, experience, phone, image },
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'Doctor updated successfully',
      doctor
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// DELETE /api/doctors/:id - Delete doctor (admin only)
router.delete('/:id', auth, async (req, res) => {
  try {
    const doctor = await Doctor.findByIdAndDelete(req.params.id);

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found'
      });
    }

    res.json({
      success: true,
      message: 'Doctor deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;