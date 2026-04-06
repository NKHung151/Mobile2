const LearningHistory = require('../models/LearningHistory');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

/**
 * POST /api/listening-part2/history/save
 * Save a completed listening session to history
 * Now saves to LearningHistory collection instead of separate ListeningPart2History
 */
async function saveListeningSession(req, res, next) {
  try {
    const {
      user_id,
      total_questions,
      correct_answers,
      questions_summary,
      start_time,
      end_time,
      device_type,
    } = req.body;

    if (!user_id || total_questions === undefined || correct_answers === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: user_id, total_questions, correct_answers',
      });
    }

    // Calculate accuracy
    const accuracy_percentage = (correct_answers / total_questions) * 100;

    // Create history record in LearningHistory collection with mode='listening_part2'
    const session_id = uuidv4();
    const history = new LearningHistory({
      session_id,
      user_id,
      topic_id: 'listening_part2',
      topic_title: 'Listening Part 2',
      mode: 'listening_part2',
      status: 'completed',
      total_questions,
      questions_answered: total_questions,
      correct_answers,
      incorrect_answers: total_questions - correct_answers,
      accuracy_percentage: Math.round(accuracy_percentage),
      completion_percentage: 100,
      questions_summary: questions_summary || [],
      start_time: start_time ? new Date(start_time) : new Date(),
      end_time: end_time ? new Date(end_time) : new Date(),
      device_type: device_type || 'mobile',
    });

    await history.save();

    logger.info(
      `[ListeningPart2History] Session saved to LearningHistory: session=${session_id}, user=${user_id}, score=${correct_answers}/${total_questions} (${accuracy_percentage.toFixed(1)}%)`
    );

    res.status(201).json({
      success: true,
      session_id,
      accuracy_percentage,
      message: 'Listening session saved to history',
    });
  } catch (error) {
    logger.error(`[ListeningPart2History] Error saving session: ${error.message}`);
    next(error);
  }
}

/**
 * GET /api/listening-part2/history/:userId
 * Get all listening history for a user
 */
async function getUserListeningHistory(req, res, next) {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameter: userId',
      });
    }

    const sessions = await LearningHistory.find({ user_id: userId, mode: 'listening_part2' })
      .sort({ created_at: -1 })
      .limit(100);

    // Calculate statistics
    const stats = {
      total_sessions: sessions.length,
      total_questions: sessions.reduce((sum, s) => sum + s.total_questions, 0),
      total_correct: sessions.reduce((sum, s) => sum + s.correct_answers, 0),
      average_accuracy: sessions.length > 0
        ? (sessions.reduce((sum, s) => sum + s.accuracy_percentage, 0) / sessions.length)
        : 0,
      best_accuracy: sessions.length > 0
        ? Math.max(...sessions.map(s => s.accuracy_percentage))
        : 0,
      total_time_seconds: sessions.reduce((sum, s) => sum + (s.duration_minutes * 60), 0),
    };

    logger.info(
      `[ListeningPart2History] Fetched history for user=${userId}, sessions=${sessions.length}`
    );

    res.json({
      success: true,
      sessions,
      statistics: stats,
    });
  } catch (error) {
    logger.error(`[ListeningPart2History] Error fetching history: ${error.message}`);
    next(error);
  }
}

/**
 * GET /api/listening-part2/history/:userId/stats
 * Get listening statistics for a user
 */
async function getUserListeningStats(req, res, next) {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameter: userId',
      });
    }

    const sessions = await LearningHistory.find({ user_id: userId, mode: 'listening_part2' });

    if (sessions.length === 0) {
      return res.json({
        success: true,
        statistics: {
          total_sessions: 0,
          total_questions: 0,
          total_correct: 0,
          average_accuracy: 0,
          best_accuracy: 0,
          worst_accuracy: 0,
          total_time_seconds: 0,
          improvement_trend: [],
        },
      });
    }

    // Sort by date for trend analysis
    const sortedSessions = sessions.sort((a, b) => a.created_at - b.created_at);

    // Calculate improvement trend (last 10 sessions)
    const recentSessions = sortedSessions.slice(-10);
    const improvement_trend = recentSessions.map(s => ({
      date: s.created_at,
      accuracy: s.accuracy_percentage,
      correct: s.correct_answers,
      total: s.total_questions,
    }));

    const statistics = {
      total_sessions: sessions.length,
      total_questions: sessions.reduce((sum, s) => sum + s.total_questions, 0),
      total_correct: sessions.reduce((sum, s) => sum + s.correct_answers, 0),
      average_accuracy: (sessions.reduce((sum, s) => sum + s.accuracy_percentage, 0) / sessions.length),
      best_accuracy: Math.max(...sessions.map(s => s.accuracy_percentage)),
      worst_accuracy: Math.min(...sessions.map(s => s.accuracy_percentage)),
      total_time_seconds: sessions.reduce((sum, s) => sum + (s.duration_minutes * 60), 0),
      improvement_trend,
    };

    logger.info(
      `[ListeningPart2History] Stats fetched for user=${userId}, avg_accuracy=${statistics.average_accuracy.toFixed(1)}%`
    );

    res.json({
      success: true,
      statistics,
    });
  } catch (error) {
    logger.error(`[ListeningPart2History] Error fetching stats: ${error.message}`);
    next(error);
  }
}

/**
 * GET /api/listening-part2/history/session/:sessionId
 * Get details of a specific session
 */
async function getSessionDetails(req, res, next) {
  try {
    const { sessionId } = req.params;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameter: sessionId',
      });
    }

    const session = await LearningHistory.findOne({ session_id: sessionId, mode: 'listening_part2' });

    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found',
      });
    }

    logger.info(`[ListeningPart2History] Session details fetched: session=${sessionId}`);

    res.json({
      success: true,
      session,
    });
  } catch (error) {
    logger.error(`[ListeningPart2History] Error fetching session: ${error.message}`);
    next(error);
  }
}

/**
 * DELETE /api/listening-part2/history/session/:sessionId
 * Delete a specific session
 */
async function deleteSession(req, res, next) {
  try {
    const { sessionId } = req.params;
    const { user_id } = req.body;

    if (!sessionId || !user_id) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: sessionId, user_id',
      });
    }

    const result = await LearningHistory.deleteOne({
      session_id: sessionId,
      user_id,
      mode: 'listening_part2',
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Session not found',
      });
    }

    logger.info(
      `[ListeningPart2History] Session deleted: session=${sessionId}, user=${user_id}`
    );

    res.json({
      success: true,
      message: 'Session deleted successfully',
    });
  } catch (error) {
    logger.error(`[ListeningPart2History] Error deleting session: ${error.message}`);
    next(error);
  }
}

module.exports = {
  saveListeningSession,
  getUserListeningHistory,
  getUserListeningStats,
  getSessionDetails,
  deleteSession,
};
