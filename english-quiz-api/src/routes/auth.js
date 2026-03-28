const express = require('express');
const router = express.Router();
const {
  register,
  login,
  getProfile,
  updateProfile,
} = require('../controllers/authController');

// POST /api/auth/register
router.post('/register', register);

// POST /api/auth/login
router.post('/login', login);

// GET /api/auth/profile/:userId
router.get('/profile/:userId', getProfile);

// PUT /api/auth/profile/:userId
router.put('/profile/:userId', updateProfile);

module.exports = router;
