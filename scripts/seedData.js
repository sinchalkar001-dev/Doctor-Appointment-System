const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = require('../config/db');
const Doctor = require('../models/Doctor');
const User = require('../models/User');
const bcryptjs = require('bcryptjs');

const seedData = async () => {
  try {
    await connectDB();

    // Clear existing data
    await Doctor.deleteMany({});
    await User.deleteMany({});

    console.log('🗑️  Cleared existing data');

    // Seed doctors
    const doctors = [
      {
        name: 'Dr. Sarah Johnson',
        specialization: 'Cardiology',
        fees: 150,
        experience: 12,
        phone: '+1-555-0101',
        image: null
      },
      {
        name: 'Dr. Michael Chen',
        specialization: 'Neurology',
        fees: 180,
        experience: 15,
        phone: '+1-555-0102',
        image: null
      },
      {
        name: 'Dr. Emily Rodriguez',
        specialization: 'Pediatrics',
        fees: 120,
        experience: 8,
        phone: '+1-555-0103',
        image: null
      },
      {
        name: 'Dr. James Wilson',
        specialization: 'Dermatology',
        fees: 130,
        experience: 10,
        phone: '+1-555-0104',
        image: null
      },
      {
        name: 'Dr. Lisa Anderson',
        specialization: 'Orthopedics',
        fees: 160,
        experience: 14,
        phone: '+1-555-0105',
        image: null
      },
      {
        name: 'Dr. Robert Taylor',
        specialization: 'General Practitioner',
        fees: 100,
        experience: 18,
        phone: '+1-555-0106',
        image: null
      },
      {
        name: 'Dr. Emma Martinez',
        specialization: 'Ophthalmology',
        fees: 140,
        experience: 11,
        phone: '+1-555-0107',
        image: null
      },
      {
        name: 'Dr. David Thompson',
        specialization: 'Psychiatry',
        fees: 170,
        experience: 13,
        phone: '+1-555-0108',
        image: null
      }
    ];

    const createdDoctors = await Doctor.insertMany(doctors);
    console.log(`✅ Seeded ${createdDoctors.length} doctors`);

    // Seed demo users
    const salt = await bcryptjs.genSalt(10);
    const hashedPassword = await bcryptjs.hash('password123', salt);

    const users = [
      {
        name: 'John Doe',
        email: 'john@example.com',
        password: hashedPassword,
        role: 'user'
      },
      {
        name: 'Jane Smith',
        email: 'jane@example.com',
        password: hashedPassword,
        role: 'user'
      },
      {
        name: 'Admin User',
        email: 'admin@example.com',
        password: hashedPassword,
        role: 'admin'
      }
    ];

    const createdUsers = await User.insertMany(users);
    console.log(`✅ Seeded ${createdUsers.length} users`);

    console.log('\n🎉 Database seeded successfully!');
    console.log('\nDemo credentials:');
    console.log('Email: john@example.com, Password: password123');
    console.log('Email: admin@example.com, Password: password123');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error.message);
    process.exit(1);
  }
};

seedData();