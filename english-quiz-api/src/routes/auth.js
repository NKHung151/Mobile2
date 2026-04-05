const express = require('express');
const router = express.Router();
const {
  register,
  login,
  getProfile,
  updateProfile,
} = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');

// POST /api/auth/register
router.post('/register', register);

// POST /api/auth/login
router.post('/login', login);

// GET /api/auth/profile/:userId
router.get('/profile/:userId', authenticateToken, getProfile);

// GET /api/auth/me
router.get('/me', authenticateToken, getProfile);

// PUT /api/auth/profile/:userId
router.put('/profile/:userId', authenticateToken, updateProfile);

// PUT /api/auth/me
router.put('/me', authenticateToken, updateProfile);

module.exports = router;
