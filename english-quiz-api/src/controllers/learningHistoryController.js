const LearningHistory = require("../models/LearningHistory");
const TopicProgress = require("../models/TopicProgress");
const Conversation = require("../models/Conversation");
const SessionAnswer = require("../models/SessionAnswer");
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

    // Get all sessions (exclude chat and transcribe to match History display)
    const allSessions = await LearningHistory.find({
      user_id,
      mode: { $nin: ["chat", "transcribe"] },
    });
    const completedSessions = await LearningHistory.find({
      user_id,
      status: "completed",
      mode: { $nin: ["chat", "transcribe"] },
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
      { $match: { user_id, status: "completed", mode: { $nin: ["chat", "transcribe"] } } },
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
      mode: { $nin: ["chat", "transcribe"] }, // Exclude chat and transcribe to match History display
    });

    // Get this week's data — same 7-day window as FE chart (today - 6 days → today)
    const sixDaysAgo = new Date(today);
    sixDaysAgo.setDate(sixDaysAgo.getDate() - 6);

    const thisWeekSessions = await LearningHistory.find({
      user_id,
      created_at: { $gte: sixDaysAgo, $lt: tomorrow },
      status: "completed",
      mode: { $nin: ["chat", "transcribe"] }, // Exclude chat and transcribe to match History display
    });

    // Get topics to review from LearningHistory (replaced TopicProgress query)
    const topicsToReview = await LearningHistory.aggregate([
      { $match: { user_id, status: "completed", mode: { $nin: ["chat", "transcribe"] } } },
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
        // ── Constants ──────────────────────────────────────────────────
        const ALLOWED_MODES = ["quiz", "homophone_groups", "listening_part2", "practice"];

        const modeLabels = {
          quiz:             "Quiz (ôn nội dung bài học)",
          homophone_groups: "Homophone Groups (từ đồng âm)",
          listening_part2:  "Listening Part 2",
          practice:         "Practice",
        };

        const getAccuracyLevel = (accuracy) => {
          if (accuracy >= 85) return { label: "Tốt",       emoji: "🟢", note: "có thể chuyển topic mới"   };
          if (accuracy >= 70) return { label: "Khá",        emoji: "🟡", note: "cần củng cố thêm"          };
          if (accuracy >= 50) return { label: "Trung bình", emoji: "🟠", note: "cần luyện tập nhiều hơn"   };
          return               { label: "Yếu",              emoji: "🔴", note: "cần ưu tiên ôn lại từ đầu" };
        };

        const WEAK_THRESHOLD = 70;

        // ── Build enriched topic summary text ─────────────────────────
        const topicSummaryText = topicSummaries
          .slice(0, 8)
          .map((t, i) => {
            const modeStr = t.modes
              .filter(m => ALLOWED_MODES.includes(m))
              .map(m => modeLabels[m])
              .join(", ");
            const level = getAccuracyLevel(t.average_accuracy);
            return `${i + 1}. "${t.topic_title}": ${t.average_accuracy}% — ${level.emoji} ${level.label} (${level.note}) | ${t.session_count} session(s) [${modeStr}]`;
          })
          .join("\n");

        const levelCounts = {
          tot:       topicSummaries.filter(t => t.average_accuracy >= 85).length,
          kha:       topicSummaries.filter(t => t.average_accuracy >= 70 && t.average_accuracy < 85).length,
          trungBinh: topicSummaries.filter(t => t.average_accuracy >= 50 && t.average_accuracy < 70).length,
          yeu:       topicSummaries.filter(t => t.average_accuracy < 50).length,
        };

        const allWeak = topicSummaries.length > 0 &&
          topicSummaries.every(t => t.average_accuracy < WEAK_THRESHOLD);

        const totalSessions = topicSummaries.reduce((sum, t) => sum + t.session_count, 0);

        // ── 3-branch prompt ───────────────────────────────────────────
        let prompt;

        if (topicSummaries.length === 0) {
          prompt = `
You are a friendly English learning coach for Vietnamese learners at A2-B1 level.
This learner is just getting started with the app.
In Vietnamese, welcome them warmly and suggest:
1. Which feature to try first (recommend Quiz or Listening Part 2)
2. A simple goal for their first week (e.g., complete 3 sessions)
Keep it under 100 words and encouraging.
          `.trim();

        } else if (allWeak) {
          prompt = `
You are a friendly English learning coach for Vietnamese learners at A2-B1 level.

The learner is still building their foundation. All topics currently need more practice:
${topicSummaryText}

Total completed sessions: ${totalSessions}

Please respond in Vietnamese, structured as:

1. 💪 Động lực (1-2 câu — nhấn mạnh đây là giai đoạn đầu bình thường, không nản)

2. 📚 Ưu tiên học (chỉ chọn 2 topic có session_count cao nhất để tạo momentum,
   KHÔNG liệt kê hết tất cả):
   - Nêu tên topic và hoạt động cụ thể nên làm

3. 🗺️ Kế hoạch tuần này:
   - Tập trung 1-2 topic thôi, không dàn trải
   - Đặt mục tiêu cụ thể: ví dụ "đạt 70% ở topic X trước khi sang topic khác"

Giữ response dưới 200 từ. Tông điệu: động viên mạnh, không gây choáng ngợp.
          `.trim();

        } else {
          prompt = `
You are a friendly English learning coach for Vietnamese learners at A2-B1 level.

Learner's overall performance overview:
🟢 Tốt (≥85%): ${levelCounts.tot} topic(s)
🟡 Khá (70-84%): ${levelCounts.kha} topic(s)
🟠 Trung bình (50-69%): ${levelCounts.trungBinh} topic(s)
🔴 Yếu (<50%): ${levelCounts.yeu} topic(s)

Topic details (sorted weakest first):
${topicSummaryText}

Weakest area: "${weakest?.topic_title}" — ${weakest?.average_accuracy}%
Total completed sessions: ${totalSessions}

Please respond in Vietnamese, structured as:

1. 💪 Nhận xét tổng quan (1-2 câu dựa trên phân bố thực tế):
   - Nếu nhiều 🔴🟠: nhấn mạnh cần củng cố nền tảng
   - Nếu nhiều 🟢🟡: khen ngợi và khuyến khích mở rộng
   - Nếu mix đều: ghi nhận và định hướng rõ ràng

2. 📚 3 Gợi ý học tập (ưu tiên 🔴 trước, rồi 🟠):
   - Topic 🔴: gợi ý ôn lại từ đầu, tập trung mode đang dùng
   - Topic 🟠: gợi ý luyện thêm, thử mode khác nếu có
   - Topic 🟡: gợi ý củng cố trước khi chuyển topic mới

3. 🗺️ Kế hoạch tuần này (2-3 bước thực tế):
   - Topic 🟢 → review nhanh hoặc bỏ qua
   - Dành thời gian chính cho 🔴 và 🟠

Giữ response dưới 200 từ. Thân thiện, cụ thể, không gây áp lực.
          `.trim();
        }

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

/**
 * Get detailed answers for a session
 * Returns all questions, user answers, correct answers, and result for each question
 * GET /api/learning/session/:session_id/answers
 */
async function getSessionAnswers(req, res, next) {
  try {
    const { session_id } = req.params;
    const { user_id } = req.query;

    if (!session_id || !user_id) {
      logger.warn(`[SessionAnswers] Missing parameters: session_id=${session_id}, user_id=${user_id}`);
      return res.status(400).json({
        success: false,
        error: "Missing required parameters: session_id, user_id",
      });
    }

    logger.info(`[SessionAnswers] Fetching answers for session: ${session_id}, user: ${user_id}`);

    // Get session info
    const session = await LearningHistory.findOne({ session_id, user_id });
    if (!session) {
      logger.warn(`[SessionAnswers] Session not found: ${session_id}`);
      return res.status(404).json({
        success: false,
        error: "Session not found",
      });
    }

    logger.info(`[SessionAnswers] Session found - mode: ${session.mode}, topic: ${session.topic_id}`);

    // Get all answers for this session
    // Sort by question_number if available (for practice), otherwise by created_at
    const answers = await SessionAnswer.find({ session_id, user_id })
      .sort({ question_number: 1, created_at: 1 });

    logger.info(`[SessionAnswers] Found ${answers.length} answers for session: ${session_id}`);
    
    if (answers.length > 0) {
      logger.info(`[SessionAnswers] First answer - question_number: ${answers[0].question_number}, type: ${answers[0].question_type}`);
    }

    const response = {
      success: true,
      session: {
        session_id,
        user_id,
        topic_id: session.topic_id,
        topic_title: session.topic_title,
        mode: session.mode,
        status: session.status,
        total_questions: session.total_questions || answers.length,
        questions_answered: session.questions_answered || answers.length,
        correct_answers: session.correct_answers,
        accuracy_percentage: session.accuracy_percentage,
        duration_minutes: session.duration_minutes,
        started_at: session.start_time,
        completed_at: session.end_time,
      },
      answers: answers.map((answer) => ({
        question_number: answer.question_number || 0,
        question_id: answer.question_id,
        question_text: answer.question_text,
        question_type: answer.question_type,
        user_answer: answer.user_answer,
        correct_answer: answer.correct_answer,
        is_correct: answer.is_correct,
        explanation: answer.explanation,
        options: answer.options,
        time_spent_seconds: answer.time_spent_seconds,
        source_type: answer.source_type,
      })),
      summary: {
        total: answers.length,
        correct: answers.filter((a) => a.is_correct).length,
        incorrect: answers.filter((a) => !a.is_correct).length,
        accuracy: answers.length > 0 
          ? Math.round((answers.filter((a) => a.is_correct).length / answers.length) * 100)
          : 0,
        note: answers.length === 0 ? "No answers recorded yet. Make sure to call saveSessionAnswer after each question." : null,
      },
    };

    res.json(response);
  } catch (error) {
    logger.error(`[SessionAnswers] Error: ${error.message}`);
    logger.error(`[SessionAnswers] Stack: ${error.stack}`);
    next(error);
  }
}

/**
 * Save an answer for a session (called after each question answered)
 * POST /api/learning/session/:session_id/answer
 */
async function saveSessionAnswer(req, res, next) {
  try {
    const { session_id } = req.params;
    const {
      user_id,
      question_id,
      question_text,
      question_type,
      user_answer,
      correct_answer,
      is_correct,
      explanation,
      options,
      time_spent_seconds,
      source_id,
      source_type,
    } = req.body;

    if (!session_id || !user_id || !question_id || !user_answer || correct_answer === undefined) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields",
      });
    }

    logger.info(`[SaveAnswer] Saving answer for session: ${session_id}, question: ${question_id}`);

    const answer = new SessionAnswer({
      session_id,
      user_id,
      question_id,
      question_text,
      question_type,
      user_answer,
      correct_answer,
      is_correct,
      explanation,
      options,
      time_spent_seconds,
      source_id,
      source_type,
    });

    await answer.save();

    logger.info(`[SaveAnswer] Answer saved successfully`);

    res.status(201).json({
      success: true,
      answer_id: answer._id,
      message: "Answer saved",
    });
  } catch (error) {
    logger.error(`[SaveAnswer] Error: ${error.message}`);
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
  getSessionAnswers,
  saveSessionAnswer,
};
