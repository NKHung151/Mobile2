const LearningHistory = require("../models/LearningHistory");
const TopicProgress = require("../models/TopicProgress");
const Conversation = require("../models/Conversation");
const { v4: uuidv4 } = require("uuid");
const logger = require("../utils/logger");
const { generateWithFallbacks } = require("../utils/aiHelper");
const config = require("../config");

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

    logger.info(
      `Learning session started: session=${session_id}, user=${user_id}, topic=${topic_id}, mode=${mode}`,
    );

    res.json({
      success: true,
      session_id,
      message: "Learning session started",
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Update learning session progress
 */
async function updateSessionProgress(req, res, next) {
  try {
    const {
      session_id,
      user_id,
      questions_answered,
      correct_answers,
      total_score,
      max_score,
      status,
    } = req.body;

    if (!session_id || !user_id) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: session_id, user_id",
      });
    }

    const session = await LearningHistory.findOne({ session_id, user_id });
    if (!session) {
      return res.status(404).json({
        success: false,
        error: "Learning session not found",
      });
    }

    // Update metrics
    if (questions_answered !== undefined)
      session.questions_answered = questions_answered;
    if (correct_answers !== undefined) {
      session.correct_answers = correct_answers;
      session.incorrect_answers = session.questions_answered - correct_answers;
    }
    if (total_score !== undefined) session.total_score = total_score;
    if (max_score !== undefined) session.max_score = max_score;
    if (status !== undefined) session.status = status;

    // Calculate metrics
    if (session.questions_answered > 0) {
      session.accuracy_percentage = Math.round(
        (session.correct_answers / session.questions_answered) * 100,
      );
      session.completion_percentage = Math.round(
        (session.questions_answered / session.total_questions) * 100,
      );
    }

    await session.save();

    logger.info(
      `Session progress updated: session=${session_id}, status=${status}`,
    );

    res.json({
      success: true,
      message: "Session progress updated",
      session,
    });
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

    if (!session_id || !user_id) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: session_id, user_id",
      });
    }

    const session = await LearningHistory.findOne({ session_id, user_id });
    if (!session) {
      return res.status(404).json({
        success: false,
        error: "Learning session not found",
      });
    }

    session.status = "completed";
    session.end_time = new Date();

    // Calculate duration
    if (session.end_time && session.start_time) {
      const durationMs = session.end_time - session.start_time;
      session.duration_minutes = Math.round(durationMs / 1000 / 60);

      if (session.questions_answered > 0) {
        session.time_per_question_seconds = Math.round(
          durationMs / 1000 / session.questions_answered,
        );
      }
    }

    await session.save();

    // Update topic progress
    await updateTopicProgress(
      user_id,
      session.topic_id,
      session.topic_title,
      session,
    );

    logger.info(
      `Session completed: session=${session_id}, user=${user_id}, score=${session.score_percentage}%`,
    );

    res.json({
      success: true,
      message: "Learning session completed",
      session,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Update topic progress based on completed session
 */
async function updateTopicProgress(user_id, topic_id, topic_title, session) {
  try {
    let topicProgress = await TopicProgress.findOne({ user_id, topic_id });

    if (!topicProgress) {
      topicProgress = new TopicProgress({
        user_id,
        topic_id,
        topic_title,
      });
    }

    // Update session counts
    topicProgress.total_sessions = (topicProgress.total_sessions || 0) + 1;
    if (session.status === "completed") {
      topicProgress.completed_sessions =
        (topicProgress.completed_sessions || 0) + 1;
    }
    if (session.mode === "quiz") {
      topicProgress.quiz_sessions = (topicProgress.quiz_sessions || 0) + 1;
    } else {
      topicProgress.chat_sessions = (topicProgress.chat_sessions || 0) + 1;
    }

    // Update learning metrics
    topicProgress.total_questions_answered += session.questions_answered || 0;
    topicProgress.total_correct_answers += session.correct_answers || 0;
    topicProgress.total_score_points += session.total_score || 0;

    // Update highest score
    if (session.total_score > topicProgress.highest_score) {
      topicProgress.highest_score = session.total_score;
    }

    // Update time spent
    topicProgress.total_time_minutes += session.duration_minutes || 0;
    if (topicProgress.total_sessions > 0) {
      topicProgress.average_time_per_session_minutes = Math.round(
        topicProgress.total_time_minutes / topicProgress.total_sessions,
      );
    }

    // Update accuracy
    if (topicProgress.total_questions_answered > 0) {
      topicProgress.average_accuracy = Math.round(
        (topicProgress.total_correct_answers /
          topicProgress.total_questions_answered) *
          100,
      );
      topicProgress.mastery_percentage = topicProgress.average_accuracy;
    }

    // Update last study date
    topicProgress.last_study_date = new Date();

    // Update level based on mastery
    if (topicProgress.mastery_percentage >= 90) topicProgress.level = "expert";
    else if (topicProgress.mastery_percentage >= 75)
      topicProgress.level = "advanced";
    else if (topicProgress.mastery_percentage >= 60)
      topicProgress.level = "intermediate";
    else if (topicProgress.mastery_percentage >= 40)
      topicProgress.level = "elementary";
    else topicProgress.level = "beginner";

    await topicProgress.save();
  } catch (error) {
    logger.error(`Error updating topic progress: ${error.message}`);
  }
}

/**
 * Get user's learning history (all sessions)
 */
async function getUserLearningHistory(req, res, next) {
  try {
    const { user_id } = req.query;
    const { limit = 50, skip = 0, status, mode, topic_id } = req.query;

    logger.info(`[History] Fetching history for user: ${user_id}`);

    if (!user_id) {
      return res.status(400).json({
        success: false,
        error: "Missing required parameter: user_id",
      });
    }

    let filter = { user_id };
    if (status) filter.status = status;
    if (mode) filter.mode = mode;
    if (topic_id) filter.topic_id = topic_id;

    const sessions = await LearningHistory.find(filter)
      .sort({ created_at: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    const total = await LearningHistory.countDocuments(filter);

    logger.info(
      `[History] Found ${sessions.length}/${total} sessions for user: ${user_id}`,
    );

    res.json({
      success: true,
      total,
      count: sessions.length,
      limit: parseInt(limit),
      skip: parseInt(skip),
      sessions,
    });
  } catch (error) {
    logger.error(`[History] Error fetching history: ${error.message}`);
    next(error);
  }
}

/**
 * Get detailed learning statistics for a user
 */
async function getLearningStatistics(req, res, next) {
  try {
    const { user_id } = req.query;

    logger.info(`[Statistics] Fetching statistics for user: ${user_id}`);

    if (!user_id) {
      return res.status(400).json({
        success: false,
        error: "Missing required parameter: user_id",
      });
    }

    // Get all sessions
    const allSessions = await LearningHistory.find({ user_id });
    const completedSessions = await LearningHistory.find({
      user_id,
      status: "completed",
    });

    logger.info(
      `[Statistics] Found ${allSessions.length} total sessions, ${completedSessions.length} completed`,
    );

    // Calculate overall statistics
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

    const overallAccuracy =
      totalQuestionsAnswered > 0
        ? Math.round((totalCorrectAnswers / totalQuestionsAnswered) * 100)
        : 0;

    // Get recent sessions (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentSessions = completedSessions.filter(
      (s) => s.created_at >= sevenDaysAgo,
    );

    // Get top topics from LearningHistory (replaced TopicProgress query)
    const allTopics = await LearningHistory.aggregate([
      { $match: { user_id, status: "completed" } },
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
              {
                $round: [
                  { $multiply: [{ $divide: ["$total_correct", "$total_questions"] }, 100] },
                  0,
                ],
              },
              0,
            ],
          },
        },
      },
      { $sort: { average_accuracy: -1 } },
      {
        $project: {
          topic_id: "$_id",
          topic_title: 1,
          sessions: 1,
          average_accuracy: 1,
          level: "beginner",
          mastery_percentage: "$average_accuracy",
          time_spent_minutes: "$total_time_minutes",
        },
      },
    ]);

    // Get top 5 topics for display
    const topTopics = allTopics.slice(0, 5);

    const statistics = {
      overall: {
        total_sessions: totalSessions,
        completed_sessions: totalCompleted,
        completion_rate:
          totalSessions > 0
            ? Math.round((totalCompleted / totalSessions) * 100)
            : 0,
        quiz_sessions: totalQuizzes,
        chat_sessions: totalChats,
        total_time_minutes: totalTimeMinutes,
        average_session_duration:
          totalCompleted > 0
            ? Math.round(totalTimeMinutes / totalCompleted)
            : 0,
        total_questions_answered: totalQuestionsAnswered,
        total_correct_answers: totalCorrectAnswers,
        overall_accuracy_percentage: overallAccuracy,
        total_score_points: totalScorePoints,
      },
      weekly: {
        sessions_this_week: recentSessions.length,
        study_days_this_week: new Set(
          recentSessions.map((s) => s.created_at.toDateString()),
        ).size,
      },
      topics: {
        total_topics_studied: allTopics.length,
        top_topics: topTopics,
      },
    };

    logger.info(
      `[Statistics] Returning statistics with ${statistics.topics.total_topics_studied} topics studied`,
    );

    res.json({
      success: true,
      user_id,
      statistics,
    });
  } catch (error) {
    logger.error(`[Statistics] Error fetching statistics: ${error.message}`);
    next(error);
  }
}

/**
 * Get progress for a specific topic
 */

async function getTopicProgress(req, res, next) {
  try {
    const { user_id, topic_id } = req.query;

    if (!user_id || !topic_id) {
      return res.status(400).json({
        success: false,
        error: "Missing required parameters: user_id, topic_id",
      });
    }

    const progress = await TopicProgress.findOne({ user_id, topic_id });

    if (!progress) {
      return res.status(404).json({
        success: false,
        error: "No progress found for this topic",
      });
    }

    // Get sessions for this topic
    const sessions = await LearningHistory.find({
      user_id,
      topic_id,
      status: "completed",
    })
      .sort({ created_at: -1 })
      .limit(20);

    res.json({
      success: true,
      progress,
      recent_sessions: sessions,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get learning dashboard data
 */
async function getLearningDashboard(req, res, next) {
  try {
    const { user_id } = req.query;

    logger.info(`[Dashboard] Fetching dashboard for user: ${user_id}`);

    if (!user_id) {
      logger.warn(`[Dashboard] Missing user_id parameter`);
      return res.status(400).json({
        success: false,
        error: "Missing required parameter: user_id",
      });
    }

    // Get today's activities
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todaysSessions = await LearningHistory.find({
      user_id,
      created_at: { $gte: today, $lt: tomorrow },
      status: "completed",
    });

    // Get this week's data — same 7-day window as FE chart (today - 6 days → today)
    const sixDaysAgo = new Date(today);
    sixDaysAgo.setDate(sixDaysAgo.getDate() - 6);

    const thisWeekSessions = await LearningHistory.find({
      user_id,
      created_at: { $gte: sixDaysAgo, $lt: tomorrow },
      status: "completed",
    });

    // Get topics to review from LearningHistory (replaced TopicProgress query)
    const topicsToReview = await LearningHistory.aggregate([
      { $match: { user_id, status: "completed" } },
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
              {
                $round: [
                  { $multiply: [{ $divide: ["$total_correct", "$total_questions"] }, 100] },
                  0,
                ],
              },
              0,
            ],
          },
        },
      },
      { $sort: { mastery_percentage: 1 } },
      { $limit: 5 },
      {
        $project: {
          topic_id: "$_id",
          topic_title: 1,
          current_level: "beginner",
          mastery_percentage: 1,
          sessions_completed: 1,
        },
      },
    ]);

    // Calculate metrics
    const todayStats = {
      sessions_completed: todaysSessions.length,
      total_time_minutes: todaysSessions.reduce(
        (sum, s) => sum + (s.duration_minutes || 0),
        0,
      ),
      questions_answered: todaysSessions.reduce(
        (sum, s) => sum + (s.questions_answered || 0),
        0,
      ),
      correct_answers: todaysSessions.reduce(
        (sum, s) => sum + (s.correct_answers || 0),
        0,
      ),
    };

    const weekStats = {
      sessions_completed: thisWeekSessions.length,
      study_days: new Set(
        thisWeekSessions.map((s) => s.created_at.toDateString()),
      ).size,
      total_time_minutes: thisWeekSessions.reduce(
        (sum, s) => sum + (s.duration_minutes || 0),
        0,
      ),
    };

    logger.info(
      `[Dashboard] Today: ${todayStats.sessions_completed} sessions, This week: ${weekStats.sessions_completed} sessions`,
    );

    // Calculate today's accuracy
    const todayAccuracy =
      todayStats.questions_answered > 0
        ? Math.round(
            (todayStats.correct_answers / todayStats.questions_answered) * 100,
          )
        : 0;

    const dashboardData = {
      today: {
        ...todayStats,
        questions_answered: todayStats.questions_answered,
        correct_answers: todayStats.correct_answers,
        accuracy_percentage: todayAccuracy,
      },
      this_week: {
        ...weekStats,
      },
      topics_overview: {
        total_topics: topicsToReview.length,
        top_topics: topicsToReview,
      },
    };

    res.json({
      success: true,
      dashboard: dashboardData,
    });
  } catch (error) {
    logger.error(`[Dashboard] Error fetching dashboard: ${error.message}`);
    next(error);
  }
}

/**
 * Generate learning recommendations for a user
 * - identifies weakest topic(s)
 * - suggests targeted quizzes
 * - optionally calls an AI service when configured (fallbacks to deterministic suggestions)
 */
async function getRecommendations(req, res, next) {
  try {
    const { user_id, ai = false } = req.query;

    if (!user_id) {
      return res.status(400).json({ success: false, error: "Missing user_id" });
    }

    // Use aggregation from LearningHistory to get topic summaries
    // This includes all modes: quiz, chat, homophone_groups, listening_part2, etc.
    const topicSummaries = await LearningHistory.aggregate([
      { $match: { user_id, status: "completed" } },
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
          average_accuracy:
            {
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

    // Determine weakest topic
    let weakest = null;
    if (topicSummaries && topicSummaries.length > 0) {
      const wp = topicSummaries[0];
      weakest = {
        topic_id: wp._id,
        topic_title: wp.topic_title,
        average_accuracy: wp.average_accuracy,
        session_count: wp.session_count,
        total_questions: wp.total_questions,
        total_correct: wp.total_correct,
      };
    }

    // If AI requested and configured, build comprehensive prompt with all topics
    let ai_advice = null;
    let ai_error = null;
    const aiEnabled = config?.gemini?.apiKey ? true : false;
    if (aiEnabled) {
      try {
        // Build comprehensive topic summary
        const topicSummaryText = topicSummaries
          .slice(0, 5) // Top 5 weakest topics
          .map(
            (t, i) =>
              `${i + 1}. ${t.topic_title}: ${t.average_accuracy}% (${t.session_count} sessions)`,
          )
          .join("\n");

        const prompt =
          `User learning progress summary:\n\n` +
          `Topics studied (sorted by accuracy):\n${topicSummaryText}\n\n` +
          `Weakest area: ${weakest?.topic_title || "Not determined"} (${weakest?.average_accuracy || 0}%)\n` +
          `Total completed sessions: ${topicSummaries.reduce((sum, t) => sum + t.session_count, 0)}\n\n` +
          `Based on this comprehensive progress data, provide:\n` +
          `1. A personalized encouragement message (1-2 sentences)\n` +
          `2. Three specific study recommendations prioritizing weakest areas\n` +
          `3. Suggested learning path or next topics to focus on\n` +
          `Keep it concise and motivating.`;

        ai_advice = await generateWithFallbacks(prompt);
      } catch (err) {
        const errorMsg = err.message || err.toString();

        if (errorMsg.includes("API_QUOTA_EXCEEDED")) {
          ai_error = "Gemini API quota exceeded. Please try again later.";
          logger.warn(`[Recommendations] ${ai_error}`);
        } else {
          ai_error =
            "AI advice temporarily unavailable. Please try again later.";
          logger.warn(
            `[Recommendations] AI advice generation failed: ${errorMsg.substring(0, 150)}`,
          );
        }
        ai_advice = null;
      }
    } else {
      ai_error =
        "AI recommendations not configured. Please set GEMINI_API_KEY.";
    }

    res.json({
      success: true,
      weakest_topic: weakest,
      topic_summaries: topicSummaries,
      ai_advice,
      ai_error: ai_advice ? null : ai_error,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Delete learning history for a user
 */
async function deleteLearningHistory(req, res, next) {
  try {
    const { user_id } = req.query;

    if (!user_id) {
      return res.status(400).json({
        success: false,
        error: "Missing required parameter: user_id",
      });
    }

    const deleteHistoryResult = await LearningHistory.deleteMany({ user_id });
    const deleteProgressResult = await TopicProgress.deleteMany({ user_id });

    logger.info(
      `Learning history deleted: user=${user_id}, sessions=${deleteHistoryResult.deletedCount}, progress=${deleteProgressResult.deletedCount}`,
    );

    res.json({
      success: true,
      message: "Learning history deleted",
      deleted_sessions: deleteHistoryResult.deletedCount,
      deleted_progress: deleteProgressResult.deletedCount,
    });
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
  getTopicProgress,
  getLearningDashboard,
  deleteLearningHistory,
  updateTopicProgress,
  getRecommendations,
};
