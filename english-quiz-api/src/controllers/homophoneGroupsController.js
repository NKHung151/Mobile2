const {
  getRandomHomophoneGroup,
  generateQuestion,
  checkAnswer
} = require('../services/homophoneGroupsService');
const LearningHistory = require('../models/LearningHistory');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

/**
 * POST /api/homophone-groups/start
 * Body: { user_id, session_id (optional), topic_id, topic_title }
 * Returns a new question: sentence + shuffled choices
 */
async function start(req, res, next) {
  try {
    const { user_id, session_id, topic_id, topic_title } = req.body;

    const homophoneGroup = await getRandomHomophoneGroup();
    const question = await generateQuestion(homophoneGroup);

    logger.info(`[HomophoneGroups] Start: question_id=${question.question_id}`);

    res.status(201).json({
      success: true,
      ...question
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/homophone-groups/session/start
 * Initialize a learning session for homophone groups
 * Body: { user_id }
 */
async function startSession(req, res, next) {
  try {
    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: user_id'
      });
    }

    const session_id = uuidv4();
    const learningSession = new LearningHistory({
      session_id,
      user_id,
      topic_id: 'homophone_groups',
      topic_title: 'Homophone Groups',
      mode: 'homophone_groups',
      status: 'started',
      start_time: new Date(),
      device_type: req.headers['user-agent'] || 'unknown',
    });

    await learningSession.save();

    logger.info(
      `[HomophoneGroups] Session started: session=${session_id}, user=${user_id}`,
    );

    res.json({
      success: true,
      session_id,
      message: 'Learning session started',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/homophone-groups/answer
 * Body: { question_id, user_answer, session_id (optional), user_id (optional) }
 * Returns: { is_correct, correct_answer, correct_phonetic }
 */
async function answer(req, res, next) {
  try {
    const { question_id, user_answer, session_id, user_id } = req.body;

    if (!question_id || !user_answer) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: question_id, user_answer'
      });
    }

    const result = checkAnswer(question_id, user_answer);

    // Track in learning history if session_id is provided
    if (session_id && user_id) {
      try {
        const session = await LearningHistory.findOne({ session_id, user_id });
        if (session) {
          // Update status from 'started' to 'in_progress' on first answer
          if (session.status === 'started') {
            session.status = 'in_progress';
          }

          session.questions_answered = (session.questions_answered || 0) + 1;
          if (result.is_correct) {
            session.correct_answers = (session.correct_answers || 0) + 1;
          } else {
            session.incorrect_answers = (session.incorrect_answers || 0) + 1;
          }

          // Calculate accuracy
          if (session.questions_answered > 0) {
            session.accuracy_percentage = Math.round(
              (session.correct_answers / session.questions_answered) * 100
            );
          }

          await session.save();
          logger.info(
            `[HomophoneGroups] Session updated: session=${session_id}, status=${session.status}, answered=${session.questions_answered}, correct=${session.correct_answers}`
          );
        }
      } catch (err) {
        logger.warn(`[HomophoneGroups] Failed to update session: ${err.message}`);
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
 * POST /api/homophone-groups/session/complete
 * Complete a learning session
 * Body: { session_id, user_id }
 */
async function completeSession(req, res, next) {
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
        error: 'Learning session not found'
      });
    }

    session.status = 'completed';
    session.end_time = new Date();

    // Calculate duration
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
      `[HomophoneGroups] Session completed: session=${session_id}, user=${user_id}, accuracy=${session.accuracy_percentage}%`,
    );

    res.json({
      success: true,
      message: 'Learning session completed',
      session,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { start, startSession, answer, completeSession };
