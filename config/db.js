const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/doctor-appointment-system';

    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(`✅ MongoDB Connected: ${mongoose.connection.host}`);
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    console.log('\n⚠️  To use MongoDB:');
    console.log('   1. Start MongoDB locally: mongod');
    console.log('   2. Or use MongoDB Atlas: Update MONGODB_URI in .env');
    console.log('   3. Default: mongodb://localhost:27017/doctor-appointment-system\n');
    process.exit(1);
  }
};

module.exports = connectDB;
