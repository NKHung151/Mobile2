const LearningHistory = require("../models/LearningHistory");
const TopicProgress = require("../models/TopicProgress");
const SessionAnswer = require("../models/SessionAnswer");
const { v4: uuidv4 } = require("uuid");
const logger = require("../utils/logger");
const historyService = require("../services/learningHistoryService");

/**
 * Start a new learning session
 */
async function startLearningSession(req, res, next) {
  try {
    const { user_id, topic_id, topic_title, mode } = req.body;

    if (!user_id || !topic_id || !mode) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: user_id, topic_id, mode",
      });
    }

    if (mode === "quiz") {
      return res.json({
        success: true,
        session_id: null,
        message: "Quiz session will be initialized by quiz controller",
      });
    }

    const session_id = uuidv4();
    const learningSession = new LearningHistory({
      session_id,
      user_id,
      topic_id,
      topic_title: topic_title || topic_id,
      mode,
      status: "started",
      start_time: new Date(),
      device_type: req.headers["user-agent"] || "unknown",
    });

    await learningSession.save();
    res.json({ success: true, session_id, message: "Learning session started" });
  } catch (error) {
    next(error);
  }
}

/**
 * Update learning session progress
 */
async function updateSessionProgress(req, res, next) {
  try {
    const { session_id, user_id, questions_answered, correct_answers, total_score, max_score, status } = req.body;

    const session = await LearningHistory.findOne({ session_id, user_id });
    if (!session) return res.status(404).json({ success: false, error: "Learning session not found" });

    if (questions_answered !== undefined) session.questions_answered = questions_answered;
    if (correct_answers !== undefined) {
      session.correct_answers = correct_answers;
      session.incorrect_answers = session.questions_answered - correct_answers;
    }
    if (total_score !== undefined) session.total_score = total_score;
    if (max_score !== undefined) session.max_score = max_score;
    if (status !== undefined) session.status = status;

    if (session.questions_answered > 0) {
      session.accuracy_percentage = Math.round((session.correct_answers / session.questions_answered) * 100);
    }

    await session.save();
    res.json({ success: true, message: "Session progress updated", session });
  } catch (error) {
    next(error);
  }
}

/**
 * Complete a learning session
 */
async function completeLearningSession(req, res, next) {
  try {
    const { session_id, user_id } = req.body;

    const session = await LearningHistory.findOne({ session_id, user_id });
    if (!session) return res.status(404).json({ success: false, error: "Learning session not found" });

    if (session.status !== "completed") {
      session.status = "completed";
      session.end_time = new Date();
      if (session.start_time) {
        session.duration_minutes = Math.round((session.end_time - session.start_time) / 1000 / 60);
      }
      await session.save();
    }

    await updateTopicProgress(user_id, session.topic_id, session.topic_title, session);
    res.json({ success: true, message: "Learning session completed", session });
  } catch (error) {
    next(error);
  }
}

/**
 * Update topic progress helper
 */
async function updateTopicProgress(user_id, topic_id, topic_title, session) {
  try {
    let topicProgress = await TopicProgress.findOne({ user_id, topic_id });
    if (!topicProgress) {
      topicProgress = new TopicProgress({ user_id, topic_id, topic_title });
    }

    topicProgress.total_sessions = (topicProgress.total_sessions || 0) + 1;
    topicProgress.total_questions_answered += session.questions_answered || 0;
    topicProgress.total_correct_answers += session.correct_answers || 0;
    topicProgress.total_time_minutes += session.duration_minutes || 0;
    topicProgress.last_study_date = new Date();

    if (topicProgress.total_questions_answered > 0) {
      topicProgress.average_accuracy = Math.round((topicProgress.total_correct_answers / topicProgress.total_questions_answered) * 100);
      topicProgress.mastery_percentage = topicProgress.average_accuracy;
    }

    await topicProgress.save();
  } catch (error) {
    logger.error(`Error updating topic progress: ${error.message}`);
  }
}

/**
 * Get user's learning history
 */
async function getUserLearningHistory(req, res, next) {
  try {
    const { user_id, ...filters } = req.query;
    if (!user_id) return res.status(400).json({ success: false, error: "Missing user_id" });

    const result = await historyService.getUserHistory(user_id, filters);
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
}

/**
 * Get learning statistics
 */
async function getLearningStatistics(req, res, next) {
  try {
    const { user_id } = req.query;
    if (!user_id) return res.status(400).json({ success: false, error: "Missing user_id" });

    const statistics = await historyService.getDetailedStatistics(user_id);
    res.json({ success: true, user_id, statistics });
  } catch (error) {
    next(error);
  }
}

/**
 * Get learning dashboard
 */
async function getLearningDashboard(req, res, next) {
  try {
    const { user_id } = req.query;
    if (!user_id) return res.status(400).json({ success: false, error: "Missing user_id" });

    const dashboard = await historyService.getDashboardSummary(user_id);
    res.json({ success: true, dashboard });
  } catch (error) {
    next(error);
  }
}

/**
 * Get AI recommendations
 */
async function getRecommendations(req, res, next) {
  try {
    const { user_id } = req.query;
    if (!user_id) return res.status(400).json({ success: false, error: "Missing user_id" });

    const result = await historyService.generateAISuggestions(user_id);
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
}

/**
 * Get detailed answers for a session
 */
async function getSessionAnswers(req, res, next) {
  try {
    const { session_id } = req.params;
    const { user_id } = req.query;

    if (!session_id || !user_id) return res.status(400).json({ success: false, error: "Missing parameters" });

    const result = await historyService.getSessionDetails(session_id, user_id);
    if (!result) return res.status(404).json({ success: false, error: "Session not found" });

    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
}

/**
 * Save an answer for a session
 */
async function saveSessionAnswer(req, res, next) {
  try {
    const { session_id } = req.params;
    const answerData = { ...req.body, session_id };

    const answer = new SessionAnswer(answerData);
    await answer.save();

    res.status(201).json({ success: true, answer_id: answer._id, message: "Answer saved" });
  } catch (error) {
    next(error);
  }
}

/**
 * Delete learning history
 */
async function deleteLearningHistory(req, res, next) {
  try {
    const { user_id } = req.query;
    if (!user_id) return res.status(400).json({ success: false, error: "Missing user_id" });

    const deleteHistoryResult = await LearningHistory.deleteMany({ user_id });
    const deleteProgressResult = await TopicProgress.deleteMany({ user_id });

    res.json({ success: true, message: "History deleted", deleted_sessions: deleteHistoryResult.deletedCount });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  startLearningSession,
  updateSessionProgress,
  completeLearningSession,
  getUserLearningHistory,
  getLearningStatistics,
  getLearningDashboard,
  getRecommendations,
  getSessionAnswers,
  saveSessionAnswer,
  deleteLearningHistory,
};
