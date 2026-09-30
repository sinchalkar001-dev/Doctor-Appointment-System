const mongoose = require('mongoose');
const { env } = require('./env');

mongoose.set('strictQuery', true);

async function connectDB(uri = env.mongoUri) {
  await mongoose.connect(uri);
  const { host, name } = mongoose.connection;
  console.log(`MongoDB connected: ${host}/${name}`);
  return mongoose.connection;
}

async function disconnectDB() {
  await mongoose.disconnect();
}

module.exports = { connectDB, disconnectDB };
