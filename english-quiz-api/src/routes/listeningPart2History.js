const express = require('express');
const {
  saveListeningSession,
  getUserListeningHistory,
  getUserListeningStats,
  getSessionDetails,
  deleteSession,
} = require('../controllers/listeningPart2HistoryController');

const router = express.Router();

/**
 * Save a listening session to history
 * POST /api/listening-part2-history/save
 */
router.post('/save', saveListeningSession);

/**
 * Get all listening history for a user
 * GET /api/listening-part2-history/:userId
 */
router.get('/:userId', getUserListeningHistory);

/**
 * Get listening statistics for a user
 * GET /api/listening-part2-history/:userId/stats
 */
router.get('/:userId/stats', getUserListeningStats);

/**
 * Get details of a specific session
 * GET /api/listening-part2-history/session/:sessionId
 */
router.get('/session/:sessionId', getSessionDetails);

/**
 * Delete a specific session
 * DELETE /api/listening-part2-history/session/:sessionId
 */
router.delete('/session/:sessionId', deleteSession);

module.exports = router;
