const mongoose = require('mongoose');
const { DEFAULT_AVAILABILITY, SLOT_LENGTHS, TIME_PATTERN } = require('../services/availability');

const optionalTime = {
  validator: (value) => value === '' || TIME_PATTERN.test(value),
  message: 'Use HH:mm for break times.',
};

// Weekly working pattern that appointment slots are generated from.
const availabilitySchema = new mongoose.Schema(
  {
    days: {
      type: [Number],
      default: () => [...DEFAULT_AVAILABILITY.days],
      validate: {
        validator: (days) => days.every((day) => Number.isInteger(day) && day >= 0 && day <= 6),
        message: 'Working days must be numbers from 0 (Sunday) to 6 (Saturday).',
      },
    },
    start: { type: String, default: DEFAULT_AVAILABILITY.start, match: [TIME_PATTERN, 'Use HH:mm for the start time.'] },
    end: { type: String, default: DEFAULT_AVAILABILITY.end, match: [TIME_PATTERN, 'Use HH:mm for the end time.'] },
    breakStart: { type: String, default: DEFAULT_AVAILABILITY.breakStart, validate: optionalTime },
    breakEnd: { type: String, default: DEFAULT_AVAILABILITY.breakEnd, validate: optionalTime },
    slotMinutes: { type: Number, default: DEFAULT_AVAILABILITY.slotMinutes, enum: SLOT_LENGTHS },
  },
  { _id: false }
);

const doctorSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Enter the doctor’s name.'],
      trim: true,
      maxlength: 80,
    },
    specialization: {
      type: String,
      required: [true, 'Enter a department.'],
      trim: true,
      maxlength: 60,
    },
    fees: {
      type: Number,
      required: [true, 'Enter the consultation fee.'],
      min: [0, 'The fee can’t be negative.'],
    },
    experience: {
      type: Number,
      default: 0,
      min: 0,
      max: 70,
    },
    phone: {
      type: String,
      default: '',
      trim: true,
      maxlength: 30,
    },
    availability: {
      type: availabilitySchema,
      default: () => ({}),
    },
    // Optional sign-in for the doctor portal.
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true }
);

doctorSchema.index({ user: 1 }, { unique: true, partialFilterExpression: { user: { $type: 'objectId' } } });
doctorSchema.index({ specialization: 1, name: 1 });

module.exports = mongoose.model('Doctor', doctorSchema);
