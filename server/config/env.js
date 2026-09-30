const path = require('path');
const dotenv = require('dotenv');

// server/.env is the home for configuration. A .env in the project root is
// still read (without overriding) so older setups keep working.
dotenv.config({ path: path.join(__dirname, '..', '.env') });
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

const nodeEnv = process.env.NODE_ENV || 'development';

const env = {
  nodeEnv,
  isProduction: nodeEnv === 'production',
  isTest: nodeEnv === 'test',
  port: Number(process.env.PORT) || 5000,
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/doctor-appointment-system',
  jwtSecret: process.env.JWT_SECRET || '',
  jwtExpire: process.env.JWT_EXPIRE || '7d',
  bcryptRounds: Number(process.env.BCRYPT_ROUNDS) || 10,
  // Comma-separated list of allowed browser origins. Empty means "reflect the caller" (development).
  clientOrigin: process.env.CLIENT_ORIGIN || '',
};

function assertEnv() {
  if (!env.jwtSecret) {
    throw new Error('JWT_SECRET is missing. Copy server/.env.example to server/.env and set a long random value.');
  }
  if (env.isProduction && env.jwtSecret.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters in production.');
  }
}

module.exports = { env, assertEnv };
