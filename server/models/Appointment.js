const mongoose = require('mongoose');
const { DATE_PATTERN, TIME_PATTERN } = require('../services/availability');

const STATUSES = ['pending', 'confirmed', 'completed', 'cancelled'];
// Statuses that hold a slot. A doctor can have only one of these per date and time.
const ACTIVE_STATUSES = ['pending', 'confirmed'];

const appointmentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doctor',
      required: true,
    },
    date: {
      type: String,
      required: [true, 'Choose a date.'],
      match: [DATE_PATTERN, 'Use YYYY-MM-DD for the date.'],
    },
    time: {
      type: String,
      required: [true, 'Choose a time.'],
      match: [TIME_PATTERN, 'Use HH:mm for the time.'],
    },
    reason: {
      type: String,
      default: '',
      trim: true,
      maxlength: [500, 'Keep the reason under 500 characters.'],
    },
    status: {
      type: String,
      enum: STATUSES,
      default: 'pending',
    },
    // Mirrors ACTIVE_STATUSES so the partial unique index below can enforce one booking per slot,
    // even when two patients submit at the same moment.
    active: {
      type: Boolean,
      default: true,
    },
    cancelledBy: {
      type: String,
      enum: ['patient', 'doctor', 'admin'],
    },
    cancelReason: {
      type: String,
      default: '',
      trim: true,
      maxlength: 300,
    },
    doctorNote: {
      type: String,
      default: '',
      trim: true,
      maxlength: 1000,
    },
  },
  { timestamps: true }
);

appointmentSchema.pre('validate', function syncActiveFlag() {
  this.active = ACTIVE_STATUSES.includes(this.status);
});

appointmentSchema.index(
  { doctor: 1, date: 1, time: 1 },
  { unique: true, partialFilterExpression: { active: true }, name: 'one_active_booking_per_slot' }
);
appointmentSchema.index({ user: 1, date: -1 });
appointmentSchema.index({ status: 1, date: 1 });

appointmentSchema.statics.STATUSES = STATUSES;
appointmentSchema.statics.ACTIVE_STATUSES = ACTIVE_STATUSES;

module.exports = mongoose.model('Appointment', appointmentSchema);
