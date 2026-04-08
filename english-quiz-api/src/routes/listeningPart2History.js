const express = require('express');
const router = express.Router();
const {
  saveListeningSession,
  getUserListeningHistory,
  getUserListeningStats,
  getSessionDetails
} = require('../controllers/listeningPart2HistoryController');

// POST /api/listening-part2-history/save - Save a completed listening session
router.post('/save', saveListeningSession);

// GET /api/listening-part2-history/:user_id - Get all listening sessions for a user
router.get('/:user_id', getUserListeningHistory);

// GET /api/listening-part2-history/:user_id/stats - Get listening statistics for a user
router.get('/:user_id/stats', getUserListeningStats);

// GET /api/listening-part2-history/session/:session_id - Get details for a specific session
router.get('/session/:session_id', getSessionDetails);

module.exports = router;
