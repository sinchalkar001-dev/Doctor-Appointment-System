const express = require('express');
const { userFromToken } = require('../middleware/auth');
const realtime = require('../services/realtime');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

// GET /api/events?token=JWT
// EventSource can't send an Authorization header, so the token travels in the
// query string. Request logging skips this path so tokens never reach the logs.
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const user = await userFromToken(String(req.query.token || ''));
    realtime.subscribe(req, res, user);
  })
);

module.exports = router;
