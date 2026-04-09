const express = require('express');
const router = express.Router();
const {
  startListeningSession,
  submitListeningAnswer,
  completeListeningSession,
  deleteListeningSession,
} = require('../controllers/listeningPart2Controller');
const { chatLimiter } = require('../middleware/rateLimiter');

router.use(chatLimiter);

// POST /api/listening-part2/session/start - Start a new listening session
router.post('/session/start', startListeningSession);

// POST /api/listening-part2/answer - Submit answer to current question
router.post('/answer', submitListeningAnswer);

// POST /api/listening-part2/session/complete - Complete the listening session
router.post('/session/complete', completeListeningSession);

// DELETE /api/listening-part2/session/:session_id - Delete incomplete session (HYBRID 70%)
router.delete('/session/:session_id', deleteListeningSession);

module.exports = router;
