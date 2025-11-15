const mongoose = require('mongoose');

module.exports = async function connectDB(){
  try {
    const conn = await mongoose.connect(process.env.MONGO_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`Error connecting to MongoDB: ${error.message}`);
    console.log('\n⚠️  MongoDB not available. To use MongoDB:');
    console.log('   1. Start MongoDB: mongod');
    console.log('   2. Or use MongoDB Atlas: Update MONGO_URL in .env');
    console.log('\n   For now, app will run in DEMO MODE with in-memory storage.\n');
    
    // Don't exit - allow app to run in demo mode
    return Promise.resolve();
  }
};
