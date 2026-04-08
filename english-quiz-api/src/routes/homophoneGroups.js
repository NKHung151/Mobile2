const express = require('express');
const router = express.Router();
const { start, startSession, answer, completeSession } = require('../controllers/homophoneGroupsController');
const { chatLimiter } = require('../middleware/rateLimiter');

router.use(chatLimiter);

// POST /api/homophone-groups/session/start - Initialize a learning session
router.post('/session/start', startSession);

// POST /api/homophone-groups/start - Get next question
router.post('/start', start);

// POST /api/homophone-groups/answer - Submit an answer
router.post('/answer', answer);

// POST /api/homophone-groups/session/complete - Complete session
router.post('/session/complete', completeSession);

module.exports = router;
