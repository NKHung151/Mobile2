// english-quiz-api/src/services/practiceService.js
const PracticeQuestion = require("../models/PracticeQuestion");
const PracticeSession = require("../models/PracticeSession");
const UserPracticeProgress = require("../models/UserPracticeProgress");
const TopicLevel = require("../models/TopicLevel");

const LEVELS = ["beginner", "intermediate", "pre-toeic"];
const QUESTIONS_PER_SESSION = 10;
const UNLOCK_THRESHOLD = 5; // correct answers needed to unlock next level

/**
 * Get all topics with level unlock status for a user
 */
const getTopicsWithProgress = async (userId, topics) => {
  const results = [];

  for (const topic of topics) {
    const levelsData = [];

    for (let i = 0; i < LEVELS.length; i++) {
      const level = LEVELS[i];
      const isFirst = i === 0;

      let progress = await UserPracticeProgress.findOne({
        user_id: userId,
        topic_id: topic._id,
        level,
      });

      if (!progress) {
        progress = await UserPracticeProgress.create({
          user_id: userId,
          topic_id: topic._id,
          level,
          is_unlocked: isFirst, // beginner always unlocked
          correct_count: 0,
          total_attempted: 0,
        });
      }

      // Get config threshold
      let config = await TopicLevel.findOne({ topic_id: topic._id, level });
      const threshold = config?.unlock_threshold || UNLOCK_THRESHOLD;

      levelsData.push({
        level,
        is_unlocked: progress.is_unlocked,
        correct_count: progress.correct_count,
        total_attempted: progress.total_attempted,
        unlock_threshold: threshold,
        last_practiced: progress.last_practiced,
      });
    }

    results.push({
      ...topic.toObject(),
      levels: levelsData,
    });
  }

  return results;
};

/**
 * Start a new practice session
 */
const startPracticeSession = async (userId, topicId, level) => {
  // Verify level is unlocked
  let progress = await UserPracticeProgress.findOne({
    user_id: userId,
    topic_id: topicId,
    level,
  });

  if (!progress) {
    const isFirst = level === "beginner";
    progress = await UserPracticeProgress.create({
      user_id: userId,
      topic_id: topicId,
      level,
      is_unlocked: isFirst,
    });
  }

  if (!progress.is_unlocked) {
    throw new Error(`Level ${level} is locked. Complete previous level first.`);
  }

  // Abandon any active sessions for this user/topic/level
  await PracticeSession.updateMany(
    { user_id: userId, topic_id: topicId, level, status: "active" },
    { status: "abandoned" }
  );

  // Get questions: mix of all 4 types
  const typesAvailable = [
    "multiple_choice",
    "fill_in_blank",
    "reorder",
    "error_detection",
  ];

  let questions = [];

  // Try to get ~2-3 questions per type, shuffle for variety
  for (const type of typesAvailable) {
    const typeQs = await PracticeQuestion.find({
      topic_id: topicId,
      level,
      type,
    })
      .limit(4)
      .lean();
    questions = questions.concat(typeQs);
  }

  // Shuffle
  questions = questions.sort(() => Math.random() - 0.5);

  // Take up to QUESTIONS_PER_SESSION
  questions = questions.slice(0, QUESTIONS_PER_SESSION);

  if (questions.length === 0) {
    throw new Error("No practice questions available for this topic and level.");
  }

  const session = await PracticeSession.create({
    user_id: userId,
    topic_id: topicId,
    level,
    question_ids: questions.map((q) => q._id),
    total: questions.length,
    current_index: 0,
    answers: [],
    status: "active",
  });

  const firstQuestion = sanitizeQuestion(questions[0]);

  return {
    session_id: session._id,
    total_questions: questions.length,
    question_number: 1,
    question: firstQuestion,
  };
};

/**
 * Submit answer for current question
 */
const submitPracticeAnswer = async (userId, sessionId, userAnswer, timeSpentMs = 0) => {
  const session = await PracticeSession.findOne({
    _id: sessionId,
    user_id: userId,
    status: "active",
  });

  if (!session) throw new Error("Active session not found.");

  const currentQId = session.question_ids[session.current_index];
  const question = await PracticeQuestion.findById(currentQId).lean();

  if (!question) throw new Error("Question not found.");

  // Evaluate answer based on type
  const { is_correct, feedback } = evaluateAnswer(question, userAnswer);

  // Record answer
  session.answers.push({
    question_id: currentQId,
    user_answer: userAnswer,
    is_correct,
    time_spent_ms: timeSpentMs,
  });

  if (is_correct) session.score += 1;

  const isLast = session.current_index >= session.question_ids.length - 1;

  if (isLast) {
    session.status = "completed";
    session.completed_at = new Date();
    await session.save();

    // Update user progress
    await updateUserProgress(userId, session.topic_id, session.level, session.score, session.total);

    const finalResults = buildFinalResults(session);
    return {
      status: "completed",
      is_correct,
      question_number: session.current_index + 1,
      total_questions: session.total,
      feedback,
      final_results: finalResults,
    };
  } else {
    session.current_index += 1;
    await session.save();

    const nextQId = session.question_ids[session.current_index];
    const nextQuestion = await PracticeQuestion.findById(nextQId).lean();

    return {
      status: "ongoing",
      is_correct,
      question_number: session.current_index, // already incremented
      next_question_number: session.current_index + 1,
      total_questions: session.total,
      feedback,
      next_question: sanitizeQuestion(nextQuestion),
      progress: {
        current_score: session.score,
        answered: session.current_index,
      },
    };
  }
};

/**
 * Get current state of a session (for resume)
 */
const getSessionState = async (userId, sessionId) => {
  const session = await PracticeSession.findOne({
    _id: sessionId,
    user_id: userId,
  });
  if (!session) throw new Error("Session not found.");

  const currentQId = session.question_ids[session.current_index];
  const question = await PracticeQuestion.findById(currentQId).lean();

  return {
    session_id: session._id,
    status: session.status,
    current_index: session.current_index,
    total_questions: session.total,
    question_number: session.current_index + 1,
    question: sanitizeQuestion(question),
    score: session.score,
  };
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function evaluateAnswer(question, userAnswer) {
  let is_correct = false;

  switch (question.type) {
    case "multiple_choice":
      is_correct = parseInt(userAnswer) === question.correct_option_index;
      break;

    case "fill_in_blank":
      is_correct =
        userAnswer?.toString().trim().toLowerCase() ===
        question.correct_answer?.trim().toLowerCase();
      break;

    case "reorder":
      // userAnswer should be array of indices e.g. [2,0,1,3]
      const expected = question.correct_order.join(",");
      const got = Array.isArray(userAnswer) ? userAnswer.join(",") : "";
      is_correct = got === expected;
      break;

    case "error_detection":
      is_correct = parseInt(userAnswer) === question.error_index;
      break;
  }

  const feedback = {
    is_correct,
    explanation: question.explanation,
    grammar_tip: question.grammar_tip || null,
    example: question.example || null,
    // Show correct answer
    correct_answer: getCorrectAnswerText(question),
  };

  return { is_correct, feedback };
}

function getCorrectAnswerText(question) {
  switch (question.type) {
    case "multiple_choice":
      return question.options?.[question.correct_option_index] || "";
    case "fill_in_blank":
      return question.correct_answer || "";
    case "reorder":
      const ordered = [...question.words];
      return question.correct_order.map((i) => ordered[i]).join(" ");
    case "error_detection":
      return `Part ${question.error_index + 1}: "${question.sentence_parts?.[question.error_index]}" → "${question.corrected_part}"`;
    default:
      return "";
  }
}

function sanitizeQuestion(q) {
  if (!q) return null;
  const base = {
    _id: q._id,
    type: q.type,
    question: q.question,
    level: q.level,
  };
  switch (q.type) {
    case "multiple_choice":
      return { ...base, options: q.options };
    case "fill_in_blank":
      return base; // question already has blank
    case "reorder":
      // Shuffle words for the user
      const shuffledWords = [...q.words].sort(() => Math.random() - 0.5);
      return { ...base, words: shuffledWords };
    case "error_detection":
      return { ...base, sentence_parts: q.sentence_parts };
    default:
      return base;
  }
}

function buildFinalResults(session) {
  const percentage = Math.round((session.score / session.total) * 100);
  let grade = "F";
  if (percentage >= 90) grade = "A";
  else if (percentage >= 75) grade = "B";
  else if (percentage >= 60) grade = "C";
  else if (percentage >= 50) grade = "D";

  const byType = {};
  // We don't store type on answer, but can annotate later
  return {
    score: session.score,
    total: session.total,
    percentage,
    grade,
    level: session.level,
  };
}

async function updateUserProgress(userId, topicId, level, score, total) {
  const progress = await UserPracticeProgress.findOneAndUpdate(
    { user_id: userId, topic_id: topicId, level },
    {
      $inc: { correct_count: score, total_attempted: total },
      last_practiced: new Date(),
    },
    { new: true, upsert: true }
  );

  // Check if next level should be unlocked
  const levelIndex = LEVELS.indexOf(level);
  if (levelIndex < LEVELS.length - 1) {
    const config = await TopicLevel.findOne({ topic_id: topicId, level });
    const threshold = config?.unlock_threshold || UNLOCK_THRESHOLD;

    if (progress.correct_count >= threshold) {
      const nextLevel = LEVELS[levelIndex + 1];
      await UserPracticeProgress.findOneAndUpdate(
        { user_id: userId, topic_id: topicId, level: nextLevel },
        { is_unlocked: true, unlocked_at: new Date() },
        { upsert: true, new: true }
      );
    }
  }
}

module.exports = {
  getTopicsWithProgress,
  startPracticeSession,
  submitPracticeAnswer,
  getSessionState,
};
