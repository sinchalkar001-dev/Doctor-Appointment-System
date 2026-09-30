/*
 * Resets the database named in MONGODB_URI and fills it with demo data:
 * an admin, two patients, eight doctors with portal sign-ins and working
 * hours, and appointments spread across the past and the coming days.
 *
 * Run with: npm run seed   (from the project root or the server folder)
 */

const { env } = require('../config/env');
const { connectDB, disconnectDB } = require('../config/db');
const Appointment = require('../models/Appointment');
const Doctor = require('../models/Doctor');
const User = require('../models/User');
const { addDays, generateSlots, toDateKey } = require('../services/availability');

const PASSWORD = 'password123';

const DOCTORS = [
  {
    name: 'Dr. Sarah Johnson',
    specialization: 'Cardiology',
    fees: 150,
    experience: 12,
    phone: '+1-555-0101',
    email: 'sarah.johnson@example.com',
    availability: { days: [1, 2, 3, 4, 5], start: '09:00', end: '17:00', breakStart: '13:00', breakEnd: '14:00', slotMinutes: 30 },
  },
  {
    name: 'Dr. Michael Chen',
    specialization: 'Neurology',
    fees: 180,
    experience: 15,
    phone: '+1-555-0102',
    email: 'michael.chen@example.com',
    availability: { days: [1, 3, 5], start: '10:00', end: '18:00', breakStart: '13:30', breakEnd: '14:30', slotMinutes: 30 },
  },
  {
    name: 'Dr. Emily Rodriguez',
    specialization: 'Pediatrics',
    fees: 120,
    experience: 8,
    phone: '+1-555-0103',
    email: 'emily.rodriguez@example.com',
    availability: { days: [1, 2, 3, 4, 5, 6], start: '08:30', end: '14:30', breakStart: '', breakEnd: '', slotMinutes: 20 },
  },
  {
    name: 'Dr. James Wilson',
    specialization: 'Dermatology',
    fees: 130,
    experience: 10,
    phone: '+1-555-0104',
    email: 'james.wilson@example.com',
    availability: { days: [2, 4, 6], start: '11:00', end: '19:00', breakStart: '15:00', breakEnd: '15:30', slotMinutes: 30 },
  },
  {
    name: 'Dr. Lisa Anderson',
    specialization: 'Orthopedics',
    fees: 160,
    experience: 14,
    phone: '+1-555-0105',
    email: 'lisa.anderson@example.com',
    availability: { days: [1, 2, 3, 4, 5], start: '09:00', end: '16:30', breakStart: '12:45', breakEnd: '13:30', slotMinutes: 45 },
  },
  {
    name: 'Dr. Robert Taylor',
    specialization: 'General Practitioner',
    fees: 100,
    experience: 18,
    phone: '+1-555-0106',
    email: 'robert.taylor@example.com',
    availability: { days: [1, 2, 3, 4, 5, 6], start: '08:00', end: '18:00', breakStart: '13:00', breakEnd: '14:00', slotMinutes: 15 },
  },
  {
    name: 'Dr. Emma Martinez',
    specialization: 'Ophthalmology',
    fees: 140,
    experience: 11,
    phone: '+1-555-0107',
    email: 'emma.martinez@example.com',
    availability: { days: [1, 2, 4, 5], start: '09:30', end: '17:30', breakStart: '13:00', breakEnd: '14:00', slotMinutes: 30 },
  },
  {
    name: 'Dr. David Thompson',
    specialization: 'Psychiatry',
    fees: 170,
    experience: 13,
    phone: '+1-555-0108',
    email: 'david.thompson@example.com',
    availability: { days: [1, 2, 3, 4], start: '12:00', end: '20:00', breakStart: '16:00', breakEnd: '17:00', slotMinutes: 60 },
  },
];

/** First working day for a doctor, searching forwards (or backwards) from `offset` days away. */
function workingDay(availability, offset, direction = 1) {
  const today = new Date();
  for (let step = 0; step < 21; step += 1) {
    const key = toDateKey(addDays(today, offset + step * direction));
    const slots = generateSlots(availability, key);
    if (slots.length > 0) return { date: key, slots };
  }
  throw new Error('No working day found for seed data');
}

async function seed() {
  await connectDB();
  console.log(`Resetting ${env.mongoUri}`);

  await Promise.all([Appointment.deleteMany({}), Doctor.deleteMany({}), User.deleteMany({})]);
  await Promise.all([User.init(), Doctor.init(), Appointment.init()]);

  const admin = await User.create({ name: 'Admin User', email: 'admin@example.com', password: PASSWORD, role: 'admin' });
  const john = await User.create({ name: 'John Doe', email: 'john@example.com', password: PASSWORD, phone: '+1-555-0142' });
  const jane = await User.create({ name: 'Jane Smith', email: 'jane@example.com', password: PASSWORD, phone: '+1-555-0187' });

  const doctors = {};
  for (const entry of DOCTORS) {
    const { email, ...profile } = entry;
    const account = await User.create({ name: profile.name, email, password: PASSWORD, role: 'doctor', phone: profile.phone });
    doctors[profile.name] = await Doctor.create({ ...profile, user: account._id });
  }

  const booking = (patient, doctorName, offset, { slotIndex = 1, direction = 1, ...fields }) => {
    const doctor = doctors[doctorName];
    const day = workingDay(doctor.availability, offset, direction);
    return { user: patient._id, doctor: doctor._id, date: day.date, time: day.slots[Math.min(slotIndex, day.slots.length - 1)], ...fields };
  };

  const appointments = [
    booking(john, 'Dr. Sarah Johnson', 1, { reason: 'Follow-up on blood pressure readings from last month' }),
    booking(john, 'Dr. Emily Rodriguez', 3, { slotIndex: 6, status: 'confirmed', reason: 'Vaccination schedule check for my son' }),
    booking(john, 'Dr. James Wilson', 6, { slotIndex: 2, reason: 'Rash on the forearm for two weeks' }),
    booking(john, 'Dr. Emma Martinez', 5, {
      slotIndex: 4,
      status: 'cancelled',
      cancelledBy: 'patient',
      reason: 'Blurred vision when reading',
    }),
    booking(john, 'Dr. Robert Taylor', -9, {
      direction: -1,
      slotIndex: 8,
      status: 'completed',
      reason: 'Annual check-up',
      doctorNote: 'Blood work normal. Recheck cholesterol in six months.',
    }),
    booking(jane, 'Dr. Michael Chen', 1, { slotIndex: 3, reason: 'Recurring migraines in the evening' }),
    booking(jane, 'Dr. Sarah Johnson', 2, { slotIndex: 4, status: 'confirmed', reason: 'Palpitations after exercise' }),
    booking(jane, 'Dr. Sarah Johnson', -6, {
      direction: -1,
      slotIndex: 2,
      status: 'completed',
      reason: 'ECG review',
      doctorNote: 'ECG within normal limits. Continue current plan.',
    }),
    booking(jane, 'Dr. Lisa Anderson', 4, { slotIndex: 1, reason: 'Knee pain when climbing stairs' }),
  ];

  for (const appointment of appointments) {
    await Appointment.create(appointment);
  }

  console.log(`Seeded 1 admin, 2 patients, ${DOCTORS.length} doctors and ${appointments.length} appointments.`);
  console.log(`\nDemo sign-ins (password: ${PASSWORD})`);
  console.log(`  Patient  john@example.com`);
  console.log(`  Patient  jane@example.com`);
  console.log(`  Doctor   ${DOCTORS[0].email}`);
  console.log(`  Admin    ${admin.email}`);
}

seed()
  .then(() => disconnectDB())
  .catch(async (error) => {
    console.error(`Seeding failed: ${error.message}`);
    await disconnectDB().catch(() => {});
    process.exitCode = 1;
  });
