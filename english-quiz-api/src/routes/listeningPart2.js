const express = require('express');
const router = express.Router();
const { startListeningSession, submitListeningAnswer } = require('../controllers/listeningPart2Controller');
const { chatLimiter } = require('../middleware/rateLimiter');

router.use(chatLimiter);

// POST /api/listening-part2/session/start - Start a new listening session
router.post('/session/start', startListeningSession);

// POST /api/listening-part2/answer - Submit answer to current question
router.post('/answer', submitListeningAnswer);

module.exports = router;
