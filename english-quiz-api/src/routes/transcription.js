const express = require("express");
const router = express.Router();
const {
  getSentences,
  submitTranscription,
} = require("../controllers/transcriptionController");
const { validate } = require("../middleware/validateRequest");
const { chatLimiter } = require("../middleware/rateLimiter");

router.use(chatLimiter);

// GET /api/transcription/sentences - Get sentences for a topic
router.get(
  "/sentences",
  validate("transcriptionSentences", "query"),
  getSentences,
);

// POST /api/transcription/submit - Submit a transcription
router.post("/submit", validate("transcriptionSubmit"), submitTranscription);

module.exports = router;
