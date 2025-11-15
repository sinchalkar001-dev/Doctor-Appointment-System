const express = require('express');
const router = express.Router();

// simple placeholder admin route
router.get('/', (req, res)=>{
  res.json({ message: 'admin endpoint (mock)' });
});

module.exports = router;
