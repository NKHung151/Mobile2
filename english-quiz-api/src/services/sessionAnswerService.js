/**
 * Service to save session answers for all quiz modes
 * Called from controllers when user submits an answer
 */
const SessionAnswer = require("../models/SessionAnswer");
const logger = require("../utils/logger");

/**
 * Save answer for QUIZ mode
 */
async function saveQuizAnswer(sessionId, userId, questionId, questionText, userAnswer, correctAnswer, isCorrect, options = null) {
  try {
    const answer = new SessionAnswer({
      session_id: sessionId,
      user_id: userId,
      question_id: questionId || `quiz_${Date.now()}`, // Generate if not provided
      question_text: questionText,
      question_type: "quiz",
      user_answer: userAnswer,
      correct_answer: correctAnswer,
      is_correct: isCorrect,
      explanation: null,
      options: options,
      source_type: "quiz",
    });
    await answer.save();
    logger.info(`[SaveAnswer] Quiz answer saved: session=${sessionId}, question=${questionId}`);
    return answer;
  } catch (err) {
    logger.error(`[SaveAnswer] Quiz save error: ${err.message}`);
    throw err;
  }
}

/**
 * Save answer for PRACTICE mode
 */
async function savePracticeAnswer(sessionId, userId, exerciseId, questionText, questionType, userAnswer, correctAnswer, isCorrect, timeSpent = 0) {
  try {
    const answer = new SessionAnswer({
      session_id: sessionId,
      user_id: userId,
      question_id: exerciseId || `practice_${Date.now()}`,
      question_text: questionText,
      question_type: questionType, // "multiple_choice", "fill_in_blank", "reorder", "error_detection"
      user_answer: JSON.stringify(userAnswer), // Practice answers may be complex (arrays, etc)
      correct_answer: JSON.stringify(correctAnswer),
      is_correct: isCorrect,
      explanation: null,
      time_spent_seconds: timeSpent,
      source_type: "practice",
    });
    await answer.save();
    logger.info(`[SaveAnswer] Practice answer saved: session=${sessionId}, type=${questionType}`);
    return answer;
  } catch (err) {
    logger.error(`[SaveAnswer] Practice save error: ${err.message}`);
    throw err;
  }
}

/**
 * Save answer for HOMOPHONE GROUPS mode
 */
async function saveHomophoneAnswer(sessionId, userId, questionId, sentence, userAnswer, correctAnswer, isCorrect, choices = null) {
  try {
    const answer = new SessionAnswer({
      session_id: sessionId,
      user_id: userId,
      question_id: questionId,
      question_text: sentence, // Store the sentence
      question_type: "homophone_groups",
      user_answer: userAnswer,
      correct_answer: correctAnswer,
      is_correct: isCorrect,
      explanation: null,
      options: choices ? choices.map((c) => c.word) : null, // Extract words from choice objects
      source_type: "homophone_groups",
    });
    await answer.save();
    logger.info(`[SaveAnswer] Homophone answer saved: session=${sessionId}, question=${questionId}`);
    return answer;
  } catch (err) {
    logger.error(`[SaveAnswer] Homophone save error: ${err.message}`);
    throw err;
  }
}

/**
 * Save answer for LISTENING PART 2 (QUESTION-RESPONSE) mode
 */
async function saveListeningAnswer(sessionId, userId, questionId, questionText, selectedOptionIndex, options, correctOptionIndex, isCorrect) {
  try {
    // Convert option index to actual text
    const userAnswer = options[selectedOptionIndex] || `Option ${selectedOptionIndex + 1}`;
    const correctAnswer = options[correctOptionIndex] || `Option ${correctOptionIndex + 1}`;

    logger.info(`[SaveAnswer] Listening - session: ${sessionId}, user: ${userId}, question: ${questionId}`);
    logger.info(`[SaveAnswer] Listening - selectedIndex: ${selectedOptionIndex}, correctIndex: ${correctOptionIndex}`);
    logger.info(`[SaveAnswer] Listening - userAnswer: ${userAnswer}, correctAnswer: ${correctAnswer}`);
    logger.info(`[SaveAnswer] Listening - options: ${JSON.stringify(options)}`);

    const answer = new SessionAnswer({
      session_id: sessionId,
      user_id: userId,
      question_id: questionId,
      question_text: questionText,
      question_type: "listening",
      user_answer: userAnswer,
      correct_answer: correctAnswer,
      is_correct: isCorrect,
      explanation: null,
      options: options, // Store all options
      source_type: "listening_part2",
    });
    await answer.save();
    logger.info(`[SaveAnswer] Listening answer saved successfully: answer_id=${answer._id}`);
    return answer;
  } catch (err) {
    logger.error(`[SaveAnswer] Listening save error: ${err.message}`, err);
    throw err;
  }
}

module.exports = {
  saveQuizAnswer,
  savePracticeAnswer,
  saveHomophoneAnswer,
  saveListeningAnswer,
};
