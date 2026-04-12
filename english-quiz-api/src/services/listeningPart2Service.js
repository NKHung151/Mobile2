const { v4: uuidv4 } = require('uuid');
const ListeningPart2 = require('../models/ListeningPart2');
const logger = require('../utils/logger');
const config = require('../config');

// In-memory session store (keyed by session_id, TTL ~30 min)
const sessionStore = new Map();
const SESSION_TTL_MS = 30 * 60 * 1000;

function cleanExpiredSessions() {
  const now = Date.now();
  for (const [id, session] of sessionStore.entries()) {
    if (now - session.created_at > SESSION_TTL_MS) {
      sessionStore.delete(id);
    }
  }
}

/**
 * Start a listening session with random questions
 * Uses MongoDB $sample to guarantee no duplicates
 */
async function startSession(user_id, question_count = 10) {
  try {
    // Validate question_count
    const count = Math.max(5, Math.min(question_count, 20));

    // Use $sample to get random questions without duplicates
    // Keep isCorrect in memory for validation, but strip before sending to client
    const questions = await ListeningPart2.aggregate([
      { $sample: { size: count } }
    ]);

    if (questions.length === 0) {
      throw new Error('No listening questions found in database');
    }

    const session_id = uuidv4();
    const session = {
      session_id,
      user_id,
      questions,        // Full questions WITH isCorrect (for server-side validation)
      current_index: 0,
      correct_count: 0,
      created_at: Date.now()
    };

    cleanExpiredSessions();
    sessionStore.set(session_id, session);

    logger.info(
      `[ListeningPart2] Session started: session=${session_id}, user=${user_id}, questions=${count}`
    );

    // Return first question WITHOUT isCorrect to client
    return {
      session_id,
      question: stripCorrectAnswers(questions[0]),
      question_number: 1,
      total_questions: questions.length
    };
  } catch (error) {
    logger.error('[ListeningPart2] Error in startSession:', error);
    throw error;
  }
}

/**
 * Strip isCorrect field from question options (for client)
 */
function stripCorrectAnswers(question) {
  return {
    audioUrl: question.audioUrl,
    content: question.content,
    options: question.options.map(opt => ({
      text: opt.text,
      translation: opt.translation
    }))
  };
}

/**
 * Submit answer for current question - with full data for saving
 */
function submitAnswer(session_id, selected_option_index) {
  try {
    cleanExpiredSessions();
    const session = sessionStore.get(session_id);

    if (!session) {
      throw new Error('Session not found or expired');
    }

    if (selected_option_index < 0 || selected_option_index > 2) {
      throw new Error('Invalid option index');
    }

    const currentQuestion = session.questions[session.current_index];
    const selectedOption = currentQuestion.options[selected_option_index];
    const correctIndex = currentQuestion.options.findIndex(opt => opt.isCorrect);
    const is_correct = selectedOption.isCorrect;

    if (is_correct) {
      session.correct_count++;
    }

    // Build full result with data for saving answers
    const result = {
      is_correct,
      correct_index: correctIndex,
      transcript: currentQuestion.content.transcript,
      translation: currentQuestion.content.translation,
      // Data for saving to SessionAnswer
      question_id: currentQuestion._id ? currentQuestion._id.toString() : `listening_${session.current_index}`,
      question_text: currentQuestion.content.transcript,
      user_answer_index: selected_option_index,
      user_answer: currentQuestion.options[selected_option_index]?.text || `Option ${selected_option_index + 1}`,
      correct_answer: currentQuestion.options[correctIndex]?.text || `Option ${correctIndex + 1}`,
      all_options: currentQuestion.options.map(opt => opt.text),
    };

    session.current_index++;

    // Check if more questions remain
    if (session.current_index < session.questions.length) {
      const nextQuestion = session.questions[session.current_index];
      result.next_question = stripCorrectAnswers(nextQuestion);
      result.question_number = session.current_index + 1;
      result.total_questions = session.questions.length;
    } else {
      // Session complete
      result.session_complete = true;
      result.correct_count = session.correct_count;
      result.total_questions = session.questions.length;
      sessionStore.delete(session_id);
      
      logger.info(
        `[ListeningPart2] Session completed: session=${session_id}, score=${session.correct_count}/${session.questions.length}`
      );
    }

    return result;
  } catch (error) {
    logger.error('[ListeningPart2] Error in submitAnswer:', error);
    throw error;
  }
}

module.exports = {
  startSession,
  submitAnswer
};
