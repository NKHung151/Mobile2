const { startQuiz, submitAnswer, submitAnswerStream, getQuizStatus } = require('../services/quizService');
const { saveQuizAnswer } = require('../services/sessionAnswerService');
const LearningHistory = require('../models/LearningHistory');
const Topic = require('../models/Topic');
const logger = require('../utils/logger');

async function start(req, res, next) {
  try {
    const { user_id, topic_id, total_questions } = req.body;
    logger.info(`Quiz start: user=${user_id}, topic=${topic_id}`);
    const result = await startQuiz(user_id, topic_id, total_questions);

    // ── Track in LearningHistory ──────────────────────────────
    try {
      const topic = await Topic.findOne({ topic_id }).lean();
      const topicTitle = topic?.title || "Quiz";
      const topicIdStr = topic?.topic_id || topic_id.toString();
      
      // Check if LearningHistory already exists for this session
      let learningSession = await LearningHistory.findOne({
        session_id: result.session_id.toString(),
        user_id,
      });
      
      if (!learningSession) {
        // Create new LearningHistory only if it doesn't exist
        learningSession = new LearningHistory({
          session_id: result.session_id.toString(),
          user_id,
          topic_id: topicIdStr,
          topic_title: topicTitle,
          mode: "quiz",
          status: "started",
          start_time: new Date(),
          total_questions: total_questions,
          device_type: req.headers["user-agent"] || "unknown",
        });
        await learningSession.save();
        logger.info(`[Quiz] LearningHistory created: session=${result.session_id}, user=${user_id}, topic=${topicTitle}`);
      }
    } catch (lhErr) {
      logger.warn(`[Quiz] Could not create LearningHistory: ${lhErr.message}`);
    }
    // ─────────────────────────────────────────────────────────

    res.status(201).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
}

async function answer(req, res, next) {
  try {
    const { user_id, topic_id, answer: userAnswer } = req.body;
    logger.info(`Quiz answer: user=${user_id}, topic=${topic_id}`);
    const result = await submitAnswer(user_id, topic_id, userAnswer);

    // Save answer details to SessionAnswer for historical review
    if (result.session_id && user_id) {
      try {
        logger.info(`[Quiz] Saving answer for session: ${result.session_id}, question: ${result.question_id}, is_correct: ${result.is_correct}`);
        await saveQuizAnswer(
          result.session_id,
          user_id,
          result.question_id,
          result.question_text,
          result.your_answer,
          result.correct_answer,
          result.is_correct,
          null,
          result.question_number,
          result.evaluation?.feedback_message || null,
          result.evaluation || null,
          result.time_spent_seconds || 0
        );
        logger.info(`[Quiz] Answer saved successfully for session: ${result.session_id}`);
      } catch (saveErr) {
        logger.error(`[Quiz] Error saving answer: ${saveErr.message}`);
        logger.error(`[Quiz] Stack: ${saveErr.stack}`);
      }
    } else {
      logger.warn(`[Quiz] Cannot save answer - session_id: ${result.session_id}, user_id: ${user_id}`);
    }

    // ── Update LearningHistory when session completes ─────────
    if (result.status === "completed" && result.final_results) {
      try {
        const lhSession = await LearningHistory.findOne({
          session_id: result.session_id.toString(),
          user_id,
        });
        if (lhSession) {
          const score = result.final_results.total_score || 0;
          const maxScore = result.final_results.max_possible_score || 0;
          const percentage = result.final_results.percentage || 0;

          lhSession.status = "completed";
          lhSession.end_time = new Date();
          lhSession.questions_answered = result.final_results.total_questions || 0;
          lhSession.correct_answers = score;
          lhSession.incorrect_answers = maxScore - score;
          lhSession.total_score = score;
          lhSession.max_score = maxScore;
          lhSession.accuracy_percentage = percentage;
          lhSession.grade = result.final_results.grade || "F";

          if (lhSession.end_time && lhSession.start_time) {
            lhSession.duration_minutes = Math.round(
              (lhSession.end_time - lhSession.start_time) / 1000 / 60
            );
          }

          await lhSession.save();
          logger.info(`[Quiz] LearningHistory completed: session=${result.session_id}, score=${score}/${maxScore}, accuracy=${percentage}%`);
        }
      } catch (lhErr) {
        logger.warn(`[Quiz] Could not complete LearningHistory: ${lhErr.message}`);
      }
    }
    // ─────────────────────────────────────────────────────────

    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
}

async function answerStream(req, res, next) {
  try {
    const { user_id, topic_id, answer: userAnswer } = req.body;
    
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    let isConnected = true;
    req.on('close', () => { isConnected = false; });

    await submitAnswerStream(
      user_id, topic_id, userAnswer,
      (content) => { if (isConnected) res.write(`data: ${JSON.stringify({ type: 'feedback', content })}\\n\\n`); },
      (result) => {
        if (isConnected) {
          res.write(`data: ${JSON.stringify({ type: 'result', ...result })}\\n\\n`);
          res.write('data: [DONE]\\n\\n');
          res.end();
        }
      }
    );
  } catch (error) {
    res.write(`data: ${JSON.stringify({ type: 'error', error: error.message })}\\n\\n`);
    res.end();
  }
}

async function status(req, res, next) {
  try {
    const { user_id, topic_id } = req.query;
    const result = await getQuizStatus(user_id, topic_id);
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
}

module.exports = { start, answer, answerStream, status };
