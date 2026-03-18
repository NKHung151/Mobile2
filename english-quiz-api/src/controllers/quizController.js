const { startQuiz, submitAnswer, submitAnswerStream, getQuizStatus } = require('../services/quizService');
const logger = require('../utils/logger');

async function start(req, res, next) {
  try {
    const { user_id, topic_id, total_questions } = req.body;
    logger.info(`Quiz start: user=${user_id}, topic=${topic_id}`);
    const result = await startQuiz(user_id, topic_id, total_questions);
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
