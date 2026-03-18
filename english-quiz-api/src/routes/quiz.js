const express = require('express');
const router = express.Router();
const { start, answer, answerStream, status } = require('../controllers/quizController');
const { validate } = require('../middleware/validateRequest');
const { chatLimiter } = require('../middleware/rateLimiter');

router.use(chatLimiter);

// POST /api/quiz/start - Start quiz, bot asks first question
router.post('/start', validate('quizStart'), start);

// POST /api/quiz/answer - Submit answer, bot evaluates and asks next
router.post('/answer', validate('quizAnswer'), answer);

// POST /api/quiz/answer/stream - Submit answer with streaming
router.post('/answer/stream', validate('quizAnswer'), answerStream);

// GET /api/quiz/status - Get quiz progress
router.get('/status', validate('quizStatus', 'query'), status);

module.exports = router;
