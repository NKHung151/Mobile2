// english-quiz-api/src/routes/practice.js
const express = require("express");
const router = express.Router();
const {
  getTopicsForPractice,
  startSession,
  submitAnswer,
  getSession,
} = require("../controllers/practiceController");

// Get topics with unlock progress for user
router.get("/topics/:userId", getTopicsForPractice);

// Start a new practice session
router.post("/start", startSession);

// Submit answer for current question
router.post("/answer", submitAnswer);

// Get/resume session state
router.get("/session/:userId/:sessionId", getSession);

module.exports = router;
