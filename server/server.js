const http = require('http');
const { assertEnv, env } = require('./config/env');
const { connectDB, disconnectDB } = require('./config/db');
const { createApp } = require('./app');
const realtime = require('./services/realtime');

async function start() {
  assertEnv();

  try {
    await connectDB();
  } catch (error) {
    console.error(`Could not connect to MongoDB at ${env.mongoUri}: ${error.message}`);
    console.error('Start MongoDB locally, or set MONGODB_URI in server/.env to a MongoDB Atlas connection string.');
    process.exit(1);
  }

  const server = http.createServer(createApp());
  server.listen(env.port, () => {
    console.log(`E-Medico API running on http://localhost:${env.port} (${env.nodeEnv})`);
  });

  let closing = false;
  const shutdown = (signal) => {
    if (closing) return;
    closing = true;
    console.log(`${signal} received, shutting down`);
    // Live-update streams stay open forever, so end them or server.close() never finishes.
    realtime.closeAll();
    server.close(async () => {
      await disconnectDB();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000).unref();
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

start().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
