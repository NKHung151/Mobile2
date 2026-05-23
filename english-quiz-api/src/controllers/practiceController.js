// english-quiz-api/src/controllers/practiceController.js
const {
  getTopicsWithProgress,
  startPracticeSession,
  submitPracticeAnswer,
  getSessionState,
} = require("../services/practiceService");
const { savePracticeAnswer } = require("../services/sessionAnswerService");
const Topic = require("../models/Topic");
const PracticeExercise = require("../models/PracticeExercise");
const LearningHistory = require("../models/LearningHistory");
const logger = require("../utils/logger");

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

    // ── Track in LearningHistory ──────────────────────────────
    try {
      const topic = await Topic.findById(topic_id).lean();
      const exercise = await PracticeExercise.findById(exercise_id).lean();
      const topicTitle = topic?.title || "Practice";
      const topicIdStr = topic?.topic_id || topic_id.toString();
      const exerciseTitle = exercise?.title || "";

      const learningSession = new LearningHistory({
        session_id: data.session_id.toString(),
        user_id,
        topic_id: topicIdStr,
        topic_title: topicTitle,
        mode: "practice",
        status: "started",
        start_time: new Date(),
        total_questions: data.total_questions,
        learning_tags: [level, exerciseTitle].filter(Boolean),
        device_type: req.headers["user-agent"] || "unknown",
      });
      await learningSession.save();
      logger.info(`[Practice] LearningHistory created: session=${data.session_id}, user=${user_id}, topic=${topicTitle}, level=${level}`);
    } catch (lhErr) {
      logger.warn(`[Practice] Could not create LearningHistory: ${lhErr.message}`);
    }
    // ─────────────────────────────────────────────────────────

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

    // Save answer details to SessionAnswer for historical review
    if (data.session_id && user_id && data.question_id) {
      try {
        await savePracticeAnswer(
          data.session_id,
          user_id,
          data.question_id,
          data.question_text,
          data.question_type,
          data.user_answer,
          data.correct_answer,
          data.is_correct,
          time_spent_ms || 0,
          data.question_number
        );
      } catch (saveErr) {
        logger.warn(`[Practice] Failed to save answer: ${saveErr.message}`);
      }
    }

    // ── Update LearningHistory when session completes ─────────
    if (data.status === "completed" && data.final_results) {
      try {
        const lhSession = await LearningHistory.findOne({
          session_id: session_id.toString(),
          user_id,
        });
        if (lhSession) {
          const score = data.final_results.score || 0;
          const total = data.final_results.total || 0;
          lhSession.status = "completed";
          lhSession.end_time = new Date();
          lhSession.questions_answered = total;
          lhSession.correct_answers = score;
          lhSession.incorrect_answers = total - score;
          lhSession.total_score = score;
          lhSession.max_score = total;
          lhSession.accuracy_percentage = total > 0 ? Math.round((score / total) * 100) : 0;
          if (lhSession.end_time && lhSession.start_time) {
            lhSession.duration_minutes = Math.round(
              (lhSession.end_time - lhSession.start_time) / 1000 / 60
            );
          }
          await lhSession.save();
          logger.info(`[Practice] LearningHistory completed: session=${session_id}, score=${score}/${total}, accuracy=${lhSession.accuracy_percentage}%`);
        }
      } catch (lhErr) {
        logger.warn(`[Practice] Could not complete LearningHistory: ${lhErr.message}`);
      }
    }
    // ─────────────────────────────────────────────────────────

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
