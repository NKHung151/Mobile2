const LearningHistory = require("../models/LearningHistory");
const TopicProgress = require("../models/TopicProgress");
const SessionAnswer = require("../models/SessionAnswer");
const logger = require("../utils/logger");
const { generateWithFallbacks } = require("../utils/aiHelper");
const config = require("../config");

/**
 * Get learning history sessions for a user with filtering
 */
async function getUserHistory(userId, filters = {}) {
  const { limit = 50, skip = 0, status, mode, topic_id } = filters;
  
  let filter = { user_id: userId };
  if (status) filter.status = status;
  if (mode) filter.mode = mode;
  if (topic_id) filter.topic_id = topic_id;

  const sessions = await LearningHistory.find(filter)
    .sort({ created_at: -1 })
    .limit(parseInt(limit))
    .skip(parseInt(skip));

  const total = await LearningHistory.countDocuments(filter);
  
  return { sessions, total };
}

/**
 * Calculate detailed statistics for a user
 */
async function getDetailedStatistics(userId) {
  // Get all relevant sessions
  const allSessions = await LearningHistory.find({
    user_id: userId,
    mode: { $nin: ["chat", "transcribe"] },
  });
  
  const completedSessions = allSessions.filter(s => s.status === "completed");

  const totalSessions = allSessions.length;
  const totalCompleted = completedSessions.length;
  const totalQuizzes = allSessions.filter((s) => s.mode === "quiz").length;
  const totalChats = allSessions.filter((s) => s.mode === "chat").length;

  let totalTimeMinutes = 0;
  let totalQuestionsAnswered = 0;
  let totalCorrectAnswers = 0;
  let totalScorePoints = 0;

  completedSessions.forEach((session) => {
    totalTimeMinutes += session.duration_minutes || 0;
    totalQuestionsAnswered += session.questions_answered || 0;
    totalCorrectAnswers += session.correct_answers || 0;
    totalScorePoints += session.total_score || 0;
  });

  const overallAccuracy = totalQuestionsAnswered > 0
    ? Math.round((totalCorrectAnswers / totalQuestionsAnswered) * 100)
    : 0;

  // Aggregate topics
  const allTopics = await LearningHistory.aggregate([
    { $match: { user_id: userId, status: "completed", mode: { $nin: ["chat", "transcribe"] } } },
    {
      $group: {
        _id: "$topic_id",
        topic_title: { $first: "$topic_title" },
        sessions: { $sum: 1 },
        total_questions: { $sum: "$questions_answered" },
        total_correct: { $sum: "$correct_answers" },
        total_time_minutes: { $sum: "$duration_minutes" },
      },
    },
    {
      $addFields: {
        average_accuracy: {
          $cond: [
            { $gt: ["$total_questions", 0] },
            { $round: [{ $multiply: [{ $divide: ["$total_correct", "$total_questions"] }, 100] }, 0] },
            0,
          ],
        },
      },
    },
    { $sort: { average_accuracy: -1 } }
  ]);

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const recentSessions = completedSessions.filter(s => s.created_at >= sevenDaysAgo);

  return {
    overall: {
      total_sessions: totalSessions,
      completed_sessions: totalCompleted,
      completion_rate: totalSessions > 0 ? Math.round((totalCompleted / totalSessions) * 100) : 0,
      quiz_sessions: totalQuizzes,
      chat_sessions: totalChats,
      total_time_minutes: totalTimeMinutes,
      average_session_duration: totalCompleted > 0 ? Math.round(totalTimeMinutes / totalCompleted) : 0,
      total_questions_answered: totalQuestionsAnswered,
      total_correct_answers: totalCorrectAnswers,
      overall_accuracy_percentage: overallAccuracy,
      total_score_points: totalScorePoints,
    },
    weekly: {
      sessions_this_week: recentSessions.length,
      study_days_this_week: new Set(recentSessions.map((s) => s.created_at.toDateString())).size,
    },
    topics: {
      total_topics_studied: allTopics.length,
      top_topics: allTopics.slice(0, 5),
    },
  };
}

/**
 * Get dashboard data for a user
 */
async function getDashboardSummary(userId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const todaysSessions = await LearningHistory.find({
    user_id: userId,
    created_at: { $gte: today, $lt: tomorrow },
    status: "completed",
    mode: { $nin: ["chat", "transcribe"] },
  });

  const sixDaysAgo = new Date(today);
  sixDaysAgo.setDate(sixDaysAgo.getDate() - 6);

  const thisWeekSessions = await LearningHistory.find({
    user_id: userId,
    created_at: { $gte: sixDaysAgo, $lt: tomorrow },
    status: "completed",
    mode: { $nin: ["chat", "transcribe"] },
  });

  const topicsToReview = await LearningHistory.aggregate([
    { $match: { user_id: userId, status: "completed", mode: { $nin: ["chat", "transcribe"] } } },
    {
      $group: {
        _id: "$topic_id",
        topic_title: { $first: "$topic_title" },
        total_questions: { $sum: "$questions_answered" },
        total_correct: { $sum: "$correct_answers" },
        sessions_completed: { $sum: 1 },
      },
    },
    {
      $addFields: {
        mastery_percentage: {
          $cond: [
            { $gt: ["$total_questions", 0] },
            { $round: [{ $multiply: [{ $divide: ["$total_correct", "$total_questions"] }, 100] }, 0] },
            0,
          ],
        },
      },
    },
    { $sort: { mastery_percentage: 1 } },
    { $limit: 5 }
  ]);

  const todayStats = {
    sessions_completed: todaysSessions.length,
    total_time_minutes: todaysSessions.reduce((sum, s) => sum + (s.duration_minutes || 0), 0),
    questions_answered: todaysSessions.reduce((sum, s) => sum + (s.questions_answered || 0), 0),
    correct_answers: todaysSessions.reduce((sum, s) => sum + (s.correct_answers || 0), 0),
  };

  const weekStats = {
    sessions_completed: thisWeekSessions.length,
    study_days: new Set(thisWeekSessions.map((s) => s.created_at.toDateString())).size,
    total_time_minutes: thisWeekSessions.reduce((sum, s) => sum + (s.duration_minutes || 0), 0),
  };

  return {
    today: {
      ...todayStats,
      accuracy_percentage: todayStats.questions_answered > 0 
        ? Math.round((todayStats.correct_answers / todayStats.questions_answered) * 100) 
        : 0,
    },
    this_week: weekStats,
    topics_overview: {
      total_topics: topicsToReview.length,
      top_topics: topicsToReview,
    },
  };
}

/**
 * Generate AI suggestions based on user history
 */
async function generateAISuggestions(userId) {
  const topicSummaries = await LearningHistory.aggregate([
    { $match: { user_id: userId, status: "completed" } },
    {
      $group: {
        _id: "$topic_id",
        topic_title: { $first: "$topic_title" },
        total_questions: { $sum: "$questions_answered" },
        total_correct: { $sum: "$correct_answers" },
        session_count: { $sum: 1 },
        modes: { $addToSet: "$mode" },
      },
    },
    {
      $addFields: {
        average_accuracy: {
          $cond: [
            { $gt: ["$total_questions", 0] },
            { $round: [{ $multiply: [{ $divide: ["$total_correct", "$total_questions"] }, 100] }, 0] },
            0,
          ],
        },
      },
    },
    { $sort: { average_accuracy: 1 } },
  ]);

  if (topicSummaries.length === 0) {
    return {
      weakest_topic: null,
      ai_advice: "Chào mừng bạn! Hãy bắt đầu phiên học đầu tiên để AI có thể phân tích và đưa ra lộ trình phù hợp nhé.",
      topic_summaries: []
    };
  }

  const weakest = topicSummaries[0];
  const aiEnabled = config?.gemini?.apiKey ? true : false;
  
  if (!aiEnabled) {
    return {
      weakest_topic: weakest,
      topic_summaries: topicSummaries,
      ai_error: "AI recommendations not configured. Please set GEMINI_API_KEY."
    };
  }

  // Build prompt and call Gemini (simplified for the service layer)
  const prompt = `Phân tích dữ liệu học tập của người dùng: ${JSON.stringify(topicSummaries.slice(0, 5))}. Hãy đưa ra lời khuyên học tập bằng tiếng Việt (dưới 200 từ).`;
  
  try {
    const ai_advice = await generateWithFallbacks(prompt);
    return {
      weakest_topic: weakest,
      topic_summaries: topicSummaries,
      ai_advice
    };
  } catch (err) {
    return {
      weakest_topic: weakest,
      topic_summaries: topicSummaries,
      ai_error: "AI advice temporarily unavailable."
    };
  }
}

/**
 * Get answers for a specific session with strict validation
 */
async function getSessionDetails(sessionId, userId) {
  const session = await LearningHistory.findOne({ session_id: sessionId, user_id: userId });
  if (!session) return null;

  const answers = await SessionAnswer.find({ session_id: String(sessionId), user_id: String(userId) })
    .sort({ question_number: 1, created_at: 1 })
    .lean();

  return { session, answers };
}

module.exports = {
  getUserHistory,
  getDetailedStatistics,
  getDashboardSummary,
  generateAISuggestions,
  getSessionDetails
};
