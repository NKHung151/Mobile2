// english-quiz-api/src/controllers/practiceController.js
const {
  getTopicsWithProgress,
  startPracticeSession,
  submitPracticeAnswer,
  getSessionState,
} = require("../services/practiceService");
const Topic = require("../models/Topic");

/**
 * GET /api/practice/topics/:userId
 * Returns all topics with per-level unlock status for user
 */
const getTopicsForPractice = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const topics = await Topic.find({}).lean();
    const withProgress = await getTopicsWithProgress(userId, topics.map(t => ({ ...t, toObject: () => t })));
    // Re-fetch as proper mongoose docs for toObject()
    const topicDocs = await Topic.find({});
    const result = await getTopicsWithProgress(userId, topicDocs);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/practice/start
 * Body: { user_id, topic_id, level, exercise_id }
 */
const startSession = async (req, res, next) => {
  try {
    const { user_id, topic_id, level, exercise_id } = req.body;
    if (!user_id || !topic_id || !level || !exercise_id) {
      return res.status(400).json({ success: false, message: "user_id, topic_id, level, exercise_id required" });
    }
    const data = await startPracticeSession(user_id, topic_id, level, exercise_id);
    res.json({ success: true, ...data });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/practice/answer
 * Body: { user_id, session_id, answer, time_spent_ms? }
 */
const submitAnswer = async (req, res, next) => {
  try {
    const { user_id, session_id, answer, time_spent_ms } = req.body;
    if (!user_id || !session_id || answer === undefined) {
      return res.status(400).json({ success: false, message: "user_id, session_id, answer required" });
    }
    const data = await submitPracticeAnswer(user_id, session_id, answer, time_spent_ms || 0);
    res.json({ success: true, ...data });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/practice/session/:userId/:sessionId
 * Get current session state (resume)
 */
const getSession = async (req, res, next) => {
  try {
    const { userId, sessionId } = req.params;
    const data = await getSessionState(userId, sessionId);
    res.json({ success: true, ...data });
  } catch (err) {
    next(err);
  }
};

module.exports = { getTopicsForPractice, startSession, submitAnswer, getSession };
