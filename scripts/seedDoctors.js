// Script to seed sample doctors into MongoDB
// Run with: node scripts/seedDoctors.js

require('dotenv').config();
const mongoose = require('mongoose');
const Doctor = require('../models/Doctor');

const SAMPLE_DOCTORS = [
  {
    name: 'Dr. Ayesha Khan',
    specialization: 'General Physician',
    fees: 500,
    experience: 8,
    phone: '+91-9876543210'
  },
  {
    name: 'Dr. Rohit Mehra',
    specialization: 'Cardiologist',
    fees: 1200,
    experience: 12,
    phone: '+91-9876543211'
  },
  {
    name: 'Dr. Sangeeta Rao',
    specialization: 'Dermatologist',
    fees: 700,
    experience: 6,
    phone: '+91-9876543212'
  },
  {
    name: 'Dr. Vikram Singh',
    specialization: 'Orthopedic Surgeon',
    fees: 1500,
    experience: 15,
    phone: '+91-9876543213'
  },
  {
    name: 'Dr. Priya Patel',
    specialization: 'Pediatrician',
    fees: 600,
    experience: 5,
    phone: '+91-9876543214'
  }
];

async function seedDatabase() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    // Clear existing doctors
    await Doctor.deleteMany({});
    console.log('Cleared existing doctors');

    // Insert sample doctors
    const doctors = await Doctor.insertMany(SAMPLE_DOCTORS);
    console.log(`Seeded ${doctors.length} doctors successfully!`);
    console.log(doctors);

    // Close connection
    await mongoose.connection.close();
    console.log('Database connection closed');
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

seedDatabase();
