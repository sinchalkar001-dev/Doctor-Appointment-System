const mongoose = require('mongoose');

const doctorSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a doctor name']
  },
  specialization: {
    type: String,
    required: [true, 'Please provide specialization']
  },
  fees: {
    type: Number,
    required: [true, 'Please provide consultation fees']
  },
  experience: {
    type: Number,
    default: 0
  },
  phone: {
    type: String,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Doctor', doctorSchema);
