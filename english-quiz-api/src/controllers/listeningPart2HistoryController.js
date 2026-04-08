const LearningHistory = require('../models/LearningHistory');
const TopicProgress = require('../models/TopicProgress');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

/**
 * POST /api/listening-part2-history/save
 * Save a completed listening part2 session to history
 * Body: {
 *   user_id,
 *   total_questions,
 *   correct_answers,
 *   questions_summary (optional array),
 *   start_time,
 *   end_time,
 *   device_type (optional)
 * }
 */
async function saveListeningSession(req, res, next) {
  try {
    const {
      user_id,
      total_questions = 10,
      correct_answers = 0,
      questions_summary,
      start_time,
      end_time,
      device_type
    } = req.body;

    // Validate required fields
    if (!user_id) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: user_id'
      });
    }

    if (total_questions === undefined || total_questions === null) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: total_questions'
      });
    }

    // Create a new learning history session
    const session_id = uuidv4();
    const startDate = start_time ? new Date(start_time) : new Date();
    const endDate = end_time ? new Date(end_time) : new Date();

    const learningSession = new LearningHistory({
      session_id,
      user_id,
      topic_id: 'listening_part2',
      topic_title: 'Listening Part 2',
      mode: 'listening_part2',
      status: 'completed',
      start_time: startDate,
      end_time: endDate,
      total_questions,
      questions_answered: total_questions,
      correct_answers,
      incorrect_answers: total_questions - correct_answers,
      accuracy_percentage:
        total_questions > 0
          ? Math.round((correct_answers / total_questions) * 100)
          : 0,
      completion_percentage: 100,
      device_type: device_type || 'mobile',
    });

    // Store questions summary if provided
    if (questions_summary && Array.isArray(questions_summary)) {
      learningSession.questions_summary = questions_summary;
    }

    // Save the session
    await learningSession.save();

    logger.info(
      `[ListeningPart2History] Session saved: session=${session_id}, user=${user_id}, score=${correct_answers}/${total_questions}`
    );

    // Update topic progress
    try {
      await updateTopicProgress(user_id, learningSession);
    } catch (error) {
      logger.warn(
        `[ListeningPart2History] Failed to update topic progress: ${error.message}`
      );
      // Don't fail the request if topic progress update fails
    }

    res.status(201).json({
      success: true,
      message: 'Listening session saved to history',
      session_id,
      accuracy_percentage: learningSession.accuracy_percentage,
    });
  } catch (error) {
    logger.error(
      `[ListeningPart2History] Error saving session: ${error.message}`
    );
    next(error);
  }
}

/**
 * Update topic progress based on completed listening session
 */
async function updateTopicProgress(user_id, session) {
  try {
    let topicProgress = await TopicProgress.findOne({
      user_id,
      topic_id: 'listening_part2'
    });

    if (!topicProgress) {
      topicProgress = new TopicProgress({
        user_id,
        topic_id: 'listening_part2',
        topic_title: 'Listening Part 2'
      });
    }

    // Update session counts
    topicProgress.total_sessions = (topicProgress.total_sessions || 0) + 1;
    if (session.status === 'completed') {
      topicProgress.completed_sessions =
        (topicProgress.completed_sessions || 0) + 1;
    }

    // Update learning metrics
    topicProgress.total_questions_answered += session.questions_answered || 0;
    topicProgress.total_correct_answers += session.correct_answers || 0;

    // Update highest score
    const currentScore = session.correct_answers || 0;
    if (currentScore > (topicProgress.highest_score || 0)) {
      topicProgress.highest_score = currentScore;
    }

    // Update time spent
    if (session.duration_minutes) {
      topicProgress.total_time_minutes += session.duration_minutes;
    }
    if (topicProgress.total_sessions > 0) {
      topicProgress.average_time_per_session_minutes = Math.round(
        topicProgress.total_time_minutes / topicProgress.total_sessions
      );
    }

    // Update accuracy
    if (topicProgress.total_questions_answered > 0) {
      topicProgress.average_accuracy = Math.round(
        (topicProgress.total_correct_answers /
          topicProgress.total_questions_answered) *
          100
      );
      topicProgress.mastery_percentage = topicProgress.average_accuracy;
    }

    // Update last study date
    topicProgress.last_study_date = new Date();

    // Update level based on mastery
    if (topicProgress.mastery_percentage >= 90)
      topicProgress.level = 'expert';
    else if (topicProgress.mastery_percentage >= 75)
      topicProgress.level = 'advanced';
    else if (topicProgress.mastery_percentage >= 60)
      topicProgress.level = 'intermediate';
    else if (topicProgress.mastery_percentage >= 40)
      topicProgress.level = 'elementary';
    else topicProgress.level = 'beginner';

    await topicProgress.save();

    logger.info(
      `[ListeningPart2History] Topic progress updated: user=${user_id}, sessions=${topicProgress.total_sessions}, mastery=${topicProgress.mastery_percentage}%`
    );
  } catch (error) {
    logger.error(
      `[ListeningPart2History] Error updating topic progress: ${error.message}`
    );
    throw error;
  }
}

/**
 * GET /api/listening-part2-history/:user_id
 * Get listening history for a user
 */
async function getUserListeningHistory(req, res, next) {
  try {
    const { user_id } = req.params;
    const { limit = 20, skip = 0 } = req.query;

    if (!user_id) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameter: user_id'
      });
    }

    const sessions = await LearningHistory.find({
      user_id,
      mode: 'listening_part2',
      status: 'completed'
    })
      .sort({ created_at: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    const total = await LearningHistory.countDocuments({
      user_id,
      mode: 'listening_part2',
      status: 'completed'
    });

    res.json({
      success: true,
      total,
      count: sessions.length,
      limit: parseInt(limit),
      skip: parseInt(skip),
      sessions
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/listening-part2-history/:user_id/stats
 * Get listening statistics for a user
 */
async function getUserListeningStats(req, res, next) {
  try {
    const { user_id } = req.params;

    if (!user_id) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameter: user_id'
      });
    }

    const sessions = await LearningHistory.find({
      user_id,
      mode: 'listening_part2',
      status: 'completed'
    });

    if (sessions.length === 0) {
      return res.json({
        success: true,
        stats: {
          total_sessions: 0,
          total_time_minutes: 0,
          total_questions_answered: 0,
          total_correct_answers: 0,
          average_accuracy: 0,
          highest_score: 0,
          recent_sessions: []
        }
      });
    }

    // Calculate statistics
    let totalTimeMinutes = 0;
    let totalQuestionsAnswered = 0;
    let totalCorrectAnswers = 0;
    let highestScore = 0;

    sessions.forEach((session) => {
      totalTimeMinutes += session.duration_minutes || 0;
      totalQuestionsAnswered += session.questions_answered || 0;
      totalCorrectAnswers += session.correct_answers || 0;
      if ((session.correct_answers || 0) > highestScore) {
        highestScore = session.correct_answers || 0;
      }
    });

    const averageAccuracy =
      totalQuestionsAnswered > 0
        ? Math.round((totalCorrectAnswers / totalQuestionsAnswered) * 100)
        : 0;

    const stats = {
      total_sessions: sessions.length,
      total_time_minutes: totalTimeMinutes,
      total_questions_answered: totalQuestionsAnswered,
      total_correct_answers: totalCorrectAnswers,
      average_accuracy: averageAccuracy,
      highest_score: highestScore,
      recent_sessions: sessions.slice(0, 5).map((s) => ({
        session_id: s.session_id,
        score: s.correct_answers,
        accuracy: s.accuracy_percentage,
        date: s.created_at
      }))
    };

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/listening-part2-history/session/:session_id
 * Get details for a specific listening session
 */
async function getSessionDetails(req, res, next) {
  try {
    const { session_id } = req.params;

    const session = await LearningHistory.findOne({
      session_id,
      mode: 'listening_part2'
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    res.json({
      success: true,
      session
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  saveListeningSession,
  getUserListeningHistory,
  getUserListeningStats,
  getSessionDetails
};
