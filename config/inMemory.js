// In-memory fallback storage for when MongoDB is not available
// This allows the app to run in DEMO MODE

const inMemoryStore = {
  users: [],
  appointments: [],
  doctors: [
    {
      _id: 'd1',
      name: 'Dr. Ayesha Khan',
      specialization: 'General Physician',
      fees: 500,
      experience: 8,
      phone: '+91-9876543210',
      createdAt: new Date()
    },
    {
      _id: 'd2',
      name: 'Dr. Rohit Mehra',
      specialization: 'Cardiologist',
      fees: 1200,
      experience: 12,
      phone: '+91-9876543211',
      createdAt: new Date()
    },
    {
      _id: 'd3',
      name: 'Dr. Sangeeta Rao',
      specialization: 'Dermatologist',
      fees: 700,
      experience: 6,
      phone: '+91-9876543212',
      createdAt: new Date()
    },
    {
      _id: 'd4',
      name: 'Dr. Vikram Singh',
      specialization: 'Orthopedic Surgeon',
      fees: 1500,
      experience: 15,
      phone: '+91-9876543213',
      createdAt: new Date()
    },
    {
      _id: 'd5',
      name: 'Dr. Priya Patel',
      specialization: 'Pediatrician',
      fees: 600,
      experience: 5,
      phone: '+91-9876543214',
      createdAt: new Date()
    }
  ]
};

const makeId = () => 'id_' + Math.random().toString(36).slice(2, 11);

module.exports = {
  store: inMemoryStore,
  makeId
};
