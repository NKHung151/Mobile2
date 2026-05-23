const express = require('express');
const router = express.Router();
const {
  startQuestionResponseSession,
  submitQuestionResponseAnswer,
  completeQuestionResponseSession,
  deleteQuestionResponseSession,
} = require('../controllers/questionResponseController');
const { chatLimiter } = require('../middleware/rateLimiter');

router.use(chatLimiter);

// POST /api/question-response/session/start - Start a new listening session
router.post('/session/start', startQuestionResponseSession);

// POST /api/question-response/answer - Submit answer to current question
router.post('/answer', submitQuestionResponseAnswer);

// POST /api/question-response/session/complete - Complete the listening session
router.post('/session/complete', completeQuestionResponseSession);

// DELETE /api/question-response/session/:session_id - Delete incomplete session (HYBRID 70%)
router.delete('/session/:session_id', deleteQuestionResponseSession);

module.exports = router;
