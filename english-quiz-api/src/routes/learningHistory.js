const express = require("express");
const router = express.Router();
const {
  startLearningSession,
  updateSessionProgress,
  completeLearningSession,
  getUserLearningHistory,
  getLearningStatistics,
  getTopicProgress,
  getLearningDashboard,
  deleteLearningHistory,
  getRecommendations,
} = require("../controllers/learningHistoryController");
const { validate } = require("../middleware/validateRequest");

// POST /api/learning/session/start - Start a new learning session
router.post("/session/start", startLearningSession);

// POST /api/learning/session/update - Update session progress
router.post("/session/update", updateSessionProgress);

// POST /api/learning/session/complete - Complete a learning session
router.post("/session/complete", completeLearningSession);

// GET /api/learning/history?user_id=xxx - Get user learning history
router.get("/history", getUserLearningHistory);

// GET /api/learning/statistics?user_id=xxx - Get learning statistics
router.get("/statistics", getLearningStatistics);

// GET /api/learning/topic-progress?user_id=xxx&topic_id=yyy - Get topic progress
router.get("/topic-progress", getTopicProgress);

// GET /api/learning/dashboard?user_id=xxx - Get learning dashboard data
router.get("/dashboard", getLearningDashboard);

// GET /api/learning/recommendations?user_id=xxx&ai=true - Get study recommendations
router.get("/recommendations", getRecommendations);

// DELETE /api/learning/history?user_id=xxx - Delete learning history
router.delete("/history", deleteLearningHistory);

module.exports = router;
