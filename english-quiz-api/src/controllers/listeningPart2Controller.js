const { startSession, submitAnswer } = require('../services/listeningPart2Service');
const LearningHistory = require('../models/LearningHistory');
const logger = require('../utils/logger');

/**
 * POST /api/listening-part2/session/start
 * Start a new listening session and create a LearningHistory record
 */
async function startListeningSession(req, res, next) {
  try {
    const { user_id, question_count } = req.body;

    if (!user_id) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: user_id'
      });
    }

    logger.info(`[ListeningPart2] Start session: user=${user_id}, count=${question_count}`);
    const result = await startSession(user_id, question_count);

    // Create LearningHistory record (same pattern as HomophoneGroups)
    const learningSession = new LearningHistory({
      session_id: result.session_id,
      user_id,
      topic_id: 'listening_part2',
      topic_title: 'Listening Part 2',
      mode: 'listening_part2',
      status: 'started',
      start_time: new Date(),
      total_questions: result.total_questions,
      device_type: req.headers['user-agent'] || 'unknown',
    });
    await learningSession.save();

    logger.info(`[ListeningPart2] LearningHistory created: session=${result.session_id}`);

    res.status(201).json({
      success: true,
      ...result
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/listening-part2/answer
 * Submit answer and update LearningHistory in-place (same pattern as HomophoneGroups)
 */
async function submitListeningAnswer(req, res, next) {
  try {
    const { session_id, selected_option_index, user_id } = req.body;

    if (!session_id || selected_option_index === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: session_id, selected_option_index'
      });
    }

    if (selected_option_index < 0 || selected_option_index > 2) {
      return res.status(400).json({
        success: false,
        error: 'Invalid option index. Must be 0, 1, or 2'
      });
    }

    logger.info(`[ListeningPart2] Submit answer: session=${session_id}, option=${selected_option_index}`);
    const result = submitAnswer(session_id, selected_option_index);

    // Update LearningHistory in-place if user_id provided (same pattern as HomophoneGroups)
    if (session_id && user_id) {
      try {
        const session = await LearningHistory.findOne({ session_id, user_id });
        if (session) {
          if (session.status === 'started') {
            session.status = 'in_progress';
          }
          session.questions_answered = (session.questions_answered || 0) + 1;
          if (result.is_correct) {
            session.correct_answers = (session.correct_answers || 0) + 1;
          } else {
            session.incorrect_answers = (session.incorrect_answers || 0) + 1;
          }
          if (session.questions_answered > 0) {
            session.accuracy_percentage = Math.round(
              (session.correct_answers / session.questions_answered) * 100
            );
          }
          await session.save();
        }
      } catch (historyErr) {
        logger.warn(`[ListeningPart2] Could not update LearningHistory: ${historyErr.message}`);
      }
    }

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/listening-part2/session/complete
 * Complete the session and finalize LearningHistory (same pattern as HomophoneGroups)
 */
async function completeListeningSession(req, res, next) {
  try {
    const { session_id, user_id } = req.body;

    if (!session_id || !user_id) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: session_id, user_id'
      });
    }

    const session = await LearningHistory.findOne({ session_id, user_id });
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    session.status = 'completed';
    session.end_time = new Date();

    if (session.end_time && session.start_time) {
      const durationMs = session.end_time - session.start_time;
      session.duration_minutes = Math.round(durationMs / 1000 / 60);
      if (session.questions_answered > 0) {
        session.time_per_question_seconds = Math.round(
          durationMs / 1000 / session.questions_answered
        );
      }
    }

    await session.save();

    logger.info(
      `[ListeningPart2] Session completed: session=${session_id}, accuracy=${session.accuracy_percentage}%`
    );

    res.json({
      success: true,
      message: 'Session completed',
      session,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  startListeningSession,
  submitListeningAnswer,
  completeListeningSession,
};
