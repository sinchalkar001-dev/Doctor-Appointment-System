const fs = require('fs');
const path = require('path');
const cors = require('cors');
const express = require('express');
const morgan = require('morgan');
const { env } = require('./config/env');
const { errorHandler, notFound } = require('./middleware/errorHandler');
const securityHeaders = require('./middleware/securityHeaders');
const realtime = require('./services/realtime');
const adminRoutes = require('./routes/admin');
const appointmentRoutes = require('./routes/appointments');
const authRoutes = require('./routes/auth');
const doctorPortalRoutes = require('./routes/doctorPortal');
const doctorRoutes = require('./routes/doctors');
const eventRoutes = require('./routes/events');

function corsOptions() {
  if (!env.clientOrigin) return { origin: true };
  const allowed = env.clientOrigin.split(',').map((origin) => origin.trim()).filter(Boolean);
  return { origin: allowed };
}

/** Build the Express app. Kept separate from server.js so it can be tested without listening. */
function createApp() {
  const app = express();
  app.disable('x-powered-by');

  app.use(securityHeaders);
  app.use(cors(corsOptions()));
  if (!env.isTest) {
    app.use(
      morgan(env.isProduction ? 'combined' : 'dev', {
        // The live-updates stream carries a token in its URL, so it is never logged.
        skip: (req) => req.originalUrl.startsWith('/api/events'),
      })
    );
  }
  app.use(express.json({ limit: '100kb' }));

  app.get('/api/health', (req, res) => {
    res.json({ success: true, status: 'ok', uptimeSeconds: Math.round(process.uptime()), liveConnections: realtime.connectionCount() });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/doctors', doctorRoutes);
  app.use('/api/appointments', appointmentRoutes);
  app.use('/api/doctor', doctorPortalRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/events', eventRoutes);
  app.use('/api', notFound);

  // In production the server also hosts the built React app (npm run build).
  const clientBuild = path.join(__dirname, '..', 'client', 'build');
  if (fs.existsSync(path.join(clientBuild, 'index.html'))) {
    app.use(express.static(clientBuild, { index: false, maxAge: env.isProduction ? '1h' : 0 }));
    app.get('*', (req, res) => res.sendFile(path.join(clientBuild, 'index.html')));
  }

  app.use(errorHandler);
  return app;
}

module.exports = { createApp };
