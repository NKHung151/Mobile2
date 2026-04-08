const { startSession, submitAnswer } = require('../services/listeningPart2Service');
const logger = require('../utils/logger');

/**
 * POST /api/listening-part2/session/start
 * Start a new listening session
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
 * Submit answer to current question
 */
async function submitListeningAnswer(req, res, next) {
  try {
    const { session_id, selected_option_index } = req.body;

    if (!session_id || selected_option_index === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: session_id, selected_option_index'
      });
    }

    logger.info(`[ListeningPart2] Submit answer: session=${session_id}, option=${selected_option_index}`);
    const result = submitAnswer(session_id, selected_option_index);
    
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  startListeningSession,
  submitListeningAnswer
};
