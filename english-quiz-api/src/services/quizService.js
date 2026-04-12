const genAI = require("../config/gemini");
const Topic = require("../models/Topic");
const Chunk = require("../models/Chunk");
const Conversation = require("../models/Conversation");
const { generateEmbedding } = require("./embeddingService");
const config = require("../config");
const logger = require("../utils/logger");

const MAX_SCORE = config.quiz.maxScorePerQuestion;

function buildQuestionPrompt(
  topic,
  context,
  questionNumber,
  totalQuestions,
  previousQuestions,
) {
  const prevQuestionsText =
    previousQuestions.length > 0
      ? `\n\nPREVIOUS QUESTIONS (do not repeat):\n${previousQuestions.map((q, i) => `${i + 1}. ${q}`).join("\n")}`
      : "";

  return `You are an English learning quiz master for: "${topic.title}"

LESSON CONTENT:
"""
${context}
"""
${prevQuestionsText}

Question ${questionNumber} of ${totalQuestions}.

RULES:
1. Create a question testing the lesson content
2. Mix types: fill-in-blank, correct/incorrect, transformation
3. Keep questions clear and appropriate for English learners
4. For fill-in-blank use: "I ___ (verb) already."
5. DO NOT repeat previous questions

Respond with ONLY the question text.`;
}

function buildEvaluationPrompt(topic, context, question, userAnswer, maxScore) {
  return `You are an English learning evaluator for: "${topic.title}"

LESSON CONTENT:
"""
${context}
"""

QUESTION: "${question}"
STUDENT'S ANSWER: "${userAnswer}"

Evaluate and respond in this EXACT JSON format:
{
  "score": <0-${maxScore}>,
  "is_correct": <boolean>,
  "feedback": {
    "summary": "<one line: Perfect!, Great!, Good try!, etc.>",
    "explanation": "<why the answer is correct/incorrect>",
    "correct_answer": "<correct answer if wrong, null if correct>",
    "grammar_tip": "<relevant grammar tip>",
    "example": "<example sentence>"
  }
}

SCORING (0-${maxScore}):
- ${maxScore}: Perfect
- ${maxScore - 1}: Minor issues
- ${Math.floor(maxScore / 2) + 1}-${maxScore - 2}: Partially correct
- 1-${Math.floor(maxScore / 2)}: Mostly incorrect
- 0: Completely wrong

Be encouraging. Respond with ONLY JSON.`;
}

/**
 * Get chunks for a topic - tries vector search first, falls back to regular query
 */
async function getTopicChunks(topicId, query) {
  // First, check if any chunks exist for this topic
  const chunkCount = await Chunk.countDocuments({ topic_id: topicId });
  logger.info(`Found ${chunkCount} chunks for topic ${topicId}`);

  if (chunkCount === 0) {
    return [];
  }

  // Try vector search first (if embedding works)
  try {
    const queryEmbedding = await generateEmbedding(query || "english lesson");

    // If embedding failed, skip to fallback
    if (!queryEmbedding) {
      logger.info(
        `Embedding not available, skipping vector search for topic ${topicId}`,
      );
      throw new Error("Embedding failed");
    }

    const results = await Chunk.aggregate([
      {
        $vectorSearch: {
          index: config.vectorSearch.indexName,
          path: "embedding",
          queryVector: queryEmbedding,
          numCandidates: config.vectorSearch.numCandidates,
          limit: config.vectorSearch.limit,
          filter: { topic_id: topicId },
        },
      },
      {
        $project: {
          content: 1,
          file_name: 1,
          chunk_index: 1,
          score: { $meta: "vectorSearchScore" },
        },
      },
    ]);

    if (results.length > 0) {
      logger.info(
        `Vector search returned ${results.length} chunks for topic ${topicId}`,
      );
      return results;
    }
  } catch (vectorError) {
    logger.warn(
      `Vector search failed for topic ${topicId}, falling back to regular query: ${vectorError.message}`,
    );
  }

  // Fallback: Regular MongoDB query (get all chunks for this topic)
  const fallbackResults = await Chunk.find({ topic_id: topicId })
    .sort({ chunk_index: 1 })
    .limit(config.vectorSearch.limit)
    .select("content file_name chunk_index");

  logger.info(
    `Fallback query returned ${fallbackResults.length} chunks for topic ${topicId}`,
  );
  return fallbackResults;
}

function getPreviousQuestions(messages) {
  return messages
    .filter((m) => m.role === "assistant" && m.type === "question")
    .map((m) => m.content);
}

async function generateQuestion(
  topic,
  context,
  questionNumber,
  totalQuestions,
  previousQuestions,
) {
  const messages = [
    {
      role: "system",
      content: buildQuestionPrompt(
        topic,
        context,
        questionNumber,
        totalQuestions,
        previousQuestions,
      ),
    },
    { role: "user", content: "Generate the next question." },
  ];

  const prompt = messages.map((m) => m.content).join("\n\n");
  return tryGenerateWithFallbacks(prompt);
}

async function evaluateAnswer(topic, context, question, userAnswer) {
  const messages = [
    {
      role: "system",
      content: buildEvaluationPrompt(
        topic,
        context,
        question,
        userAnswer,
        MAX_SCORE,
      ),
    },
    { role: "user", content: "Evaluate this answer." },
  ];

  const prompt = messages.map((m) => m.content).join("\n\n");

  const responseText = await tryGenerateWithFallbacks(prompt);

  try {
    const cleaned = responseText
      .trim()
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();
    return JSON.parse(cleaned);
  } catch (error) {
    logger.error("Failed to parse evaluation:", error);
    return {
      score: Math.floor(MAX_SCORE / 2),
      is_correct: false,
      feedback: {
        summary: "Thanks for your answer!",
        explanation: "Let's continue.",
        correct_answer: null,
        grammar_tip: "Keep practicing!",
        example: null,
      },
    };
  }
}

async function tryGenerateWithFallbacks(prompt) {
  const primaryModel = config.gemini.model;
  const tried = [];
  let modelsToTry = [primaryModel];

  // Try primary model first
  for (const model of modelsToTry) {
    if (!model) continue;
    tried.push(model);

    try {
      logger.info(`Trying Gemini model: ${model}`);
      const modelInstance = genAI.getGenerativeModel({ model });
      const result = await modelInstance.generateContent(prompt);
      const response = await result.response;
      const text = response.text().trim();
      logger.info(`✓ Model ${model} succeeded`);
      return text;
    } catch (err) {
      const errorMsg = err.message || err.toString();

      // Handle quota exceeded errors - don't retry
      if (errorMsg.includes("429") || errorMsg.includes("quota")) {
        logger.warn(
          `Model ${model} hit quota limit. Trying to fetch available models...`,
        );
        // Try to auto-detect and use another model
        break;
      }

      // Handle bad API key - don't retry
      if (
        errorMsg.includes("API_KEY_INVALID") ||
        errorMsg.includes("API key not valid") ||
        errorMsg.includes("400 Bad Request")
      ) {
        logger.error(`Invalid API key. Check GEMINI_API_KEY in .env`);
        throw new Error(
          "API_KEY_INVALID: Check your GEMINI_API_KEY in .env file",
        );
      }

      // If 404, will try to fetch available models
      if (errorMsg.includes("404") || errorMsg.includes("not found")) {
        logger.warn(
          `Model ${model} not found (404). Fetching available models...`,
        );
        break;
      }

      logger.warn(`Model ${model} failed: ${errorMsg.substring(0, 100)}...`);
      break;
    }
  }

  // If primary model failed, try to fetch available models from API
  logger.info("Attempting to auto-detect available models...");
  try {
    if (genAI && typeof genAI.listModels === "function") {
      const response = await genAI.listModels();

      if (response && response.models) {
        const availableModels = [];
        for (const model of response.models) {
          const modelName = model.name.replace(/^models\//, "");
          const supportedMethods = model.supportedGenerationMethods || [];

          if (supportedMethods.includes("generateContent")) {
            availableModels.push(modelName);
          }
        }

        logger.info(
          `Found ${availableModels.length} available models: ${availableModels.slice(0, 5).join(", ")}...`,
        );

        // Try each available model
        for (const model of availableModels) {
          if (tried.includes(model)) continue; // Skip already tried models
          tried.push(model);

          try {
            logger.info(`Trying auto-detected model: ${model}`);
            const modelInstance = genAI.getGenerativeModel({ model });
            const result = await modelInstance.generateContent(prompt);
            const response = await result.response;
            const text = response.text().trim();
            logger.info(`✓ Model ${model} succeeded`);
            return text;
          } catch (err) {
            const errorMsg = err.message || err.toString();

            if (errorMsg.includes("429") || errorMsg.includes("quota")) {
              logger.warn(`Model ${model} hit quota limit, trying next...`);
              continue;
            }

            logger.warn(
              `Model ${model} failed: ${errorMsg.substring(0, 80)}...`,
            );
            continue;
          }
        }
      }
    }
  } catch (fetchErr) {
    logger.warn(`Could not fetch available models: ${fetchErr.message}`);
  }

  logger.error(`All models failed: ${tried.join(", ")}`);
  throw new Error(
    `Gemini API request failed after trying ${tried.length} models. Check your API key validity and usage quota.`,
  );
}

function buildFeedbackMessage(evaluation) {
  const fb = evaluation.feedback;
  let msg = `${fb.summary}\n\nScore: ${evaluation.score}/${MAX_SCORE}\n\n${fb.explanation}`;
  if (fb.correct_answer) msg += `\n\nCorrect answer: ${fb.correct_answer}`;
  if (fb.grammar_tip) msg += `\n\nTip: ${fb.grammar_tip}`;
  if (fb.example) msg += `\n\nExample: "${fb.example}"`;
  return msg;
}

function getGrade(percentage) {
  if (percentage >= 90) return { grade: "A", label: "Excellent!" };
  if (percentage >= 80) return { grade: "B", label: "Great job!" };
  if (percentage >= 70) return { grade: "C", label: "Good work!" };
  if (percentage >= 60) return { grade: "D", label: "Keep practicing!" };
  return { grade: "F", label: "More practice needed" };
}

function generateFinalSummary(conversation) {
  const percentage = Math.round(
    (conversation.total_score / conversation.max_possible_score) * 100,
  );
  const gradeInfo = getGrade(percentage);

  const evaluations = conversation.messages.filter(
    (m) => m.type === "evaluation",
  );
  const perfectAnswers = evaluations.filter(
    (e) => e.score === MAX_SCORE,
  ).length;
  const goodAnswers =
    evaluations.filter((e) => e.score >= MAX_SCORE - 1).length - perfectAnswers;

  return {
    total_score: conversation.total_score,
    max_possible_score: conversation.max_possible_score,
    percentage,
    grade: gradeInfo.grade,
    grade_label: gradeInfo.label,
    performance: {
      perfect_answers: perfectAnswers,
      good_answers: goodAnswers,
      total_questions: conversation.total_questions,
    },
  };
}

async function startQuiz(userId, topicId, totalQuestions) {
  // Check if topic exists
  const topic = await Topic.findOne({ topic_id: topicId });
  if (!topic) {
    throw new Error(
      `Topic "${topicId}" not found. Please check the topic ID or create the topic first.`,
    );
  }

  // Get chunks for this topic
  const relevantChunks = await getTopicChunks(topicId, topic.title);

  if (!relevantChunks || relevantChunks.length === 0) {
    throw new Error(
      `No content found for topic "${topicId}". Please upload VTT files for this topic.`,
    );
  }

  const context = relevantChunks.map((c) => c.content).join("\n\n---\n\n");
  logger.info(
    `Context length for topic ${topicId}: ${context.length} characters`,
  );

  let conversation = await Conversation.findOne({
    user_id: userId,
    topic_id: topicId,
    mode: "quiz",
  });

  if (conversation) {
    // Reset existing conversation
    conversation.current_question = 1;
    conversation.total_questions = totalQuestions;
    conversation.total_score = 0;
    conversation.max_possible_score = 0;
    conversation.status = "in_progress";
    conversation.messages = [];
  } else {
    // Create new conversation
    conversation = new Conversation({
      user_id: userId,
      topic_id: topicId,
      mode: "quiz",
      current_question: 1,
      total_questions: totalQuestions,
      total_score: 0,
      max_possible_score: 0,
      status: "in_progress",
      messages: [],
    });
  }

  // Generate first question
  const question = await generateQuestion(
    topic,
    context,
    1,
    totalQuestions,
    [],
  );

  conversation.messages.push({
    role: "assistant",
    type: "question",
    question_number: 1,
    content: question,
    timestamp: new Date(),
  });

  await conversation.save();
  logger.info(
    `Quiz started: user=${userId}, topic=${topicId}, questions=${totalQuestions}`,
  );

  return {
    session_id: conversation._id.toString(),
    topic_id: topicId,
    topic_title: topic.title,
    question_number: 1,
    total_questions: totalQuestions,
    question,
    status: "in_progress",
  };
}

async function submitAnswer(userId, topicId, userAnswer) {
  const topic = await Topic.findOne({ topic_id: topicId });
  if (!topic) throw new Error(`Topic ${topicId} not found`);

  const conversation = await Conversation.findOne({
    user_id: userId,
    topic_id: topicId,
    mode: "quiz",
  });
  if (!conversation) throw new Error("No active quiz. Start a new quiz.");
  if (conversation.status === "completed")
    throw new Error("Quiz completed. Start a new quiz.");
  if (conversation.status === "not_started")
    throw new Error("Quiz not started.");

  const lastQuestion = conversation.messages
    .filter((m) => m.type === "question")
    .pop();
  if (!lastQuestion) throw new Error("No question to answer.");

  // Get relevant chunks for evaluation
  const relevantChunks = await getTopicChunks(topicId, lastQuestion.content);
  const context = relevantChunks.map((c) => c.content).join("\n\n---\n\n");

  // Save user's answer
  conversation.messages.push({
    role: "user",
    type: "answer",
    content: userAnswer,
    question_number: conversation.current_question,
    timestamp: new Date(),
  });

  // Evaluate answer
  const evaluation = await evaluateAnswer(
    topic,
    context,
    lastQuestion.content,
    userAnswer,
  );
  const feedbackMessage = buildFeedbackMessage(evaluation);

  // Save evaluation
  conversation.messages.push({
    role: "assistant",
    type: "evaluation",
    question_number: conversation.current_question,
    content: feedbackMessage,
    score: evaluation.score,
    max_score: MAX_SCORE,
    is_correct: evaluation.is_correct,
    feedback: evaluation.feedback,
    timestamp: new Date(),
  });

  conversation.total_score += evaluation.score;
  conversation.max_possible_score += MAX_SCORE;

  // Check if quiz is complete
  if (conversation.current_question >= conversation.total_questions) {
    conversation.status = "completed";
    await conversation.save();

    return {
      session_id: conversation._id.toString(),
      topic_id: topicId,
      topic_title: topic.title,
      question_number: conversation.current_question,
      total_questions: conversation.total_questions,
      your_answer: userAnswer,
      // Data for saving to SessionAnswer
      question_id: `quiz_${conversation._id.toString()}_q${conversation.current_question}`,
      question_text: lastQuestion.content,
      correct_answer: evaluation.feedback,
      is_correct: evaluation.is_correct,
      evaluation: {
        score: evaluation.score,
        max_score: MAX_SCORE,
        is_correct: evaluation.is_correct,
        feedback: evaluation.feedback,
        feedback_message: feedbackMessage,
      },
      status: "completed",
      final_results: generateFinalSummary(conversation),
    };
  }

  // Generate next question
  conversation.current_question += 1;
  const previousQuestions = getPreviousQuestions(conversation.messages);
  const nextQuestion = await generateQuestion(
    topic,
    context,
    conversation.current_question,
    conversation.total_questions,
    previousQuestions,
  );

  conversation.messages.push({
    role: "assistant",
    type: "question",
    question_number: conversation.current_question,
    content: nextQuestion,
    timestamp: new Date(),
  });

  await conversation.save();

  return {
    session_id: conversation._id.toString(),
    topic_id: topicId,
    topic_title: topic.title,
    question_number: conversation.current_question,
    total_questions: conversation.total_questions,
    your_answer: userAnswer,
    // Data for saving to SessionAnswer
    question_id: `quiz_${conversation._id.toString()}_q${conversation.current_question - 1}`,
    question_text: lastQuestion.content,
    correct_answer: evaluation.feedback,
    is_correct: evaluation.is_correct,
    evaluation: {
      score: evaluation.score,
      max_score: MAX_SCORE,
      is_correct: evaluation.is_correct,
      feedback: evaluation.feedback,
      feedback_message: feedbackMessage,
    },
    next_question: nextQuestion,
    progress: {
      current_score: conversation.total_score,
      max_possible_score: conversation.max_possible_score,
      percentage: Math.round(
        (conversation.total_score / conversation.max_possible_score) * 100,
      ),
    },
    status: "in_progress",
  };
}

async function getQuizStatus(userId, topicId) {
  const conversation = await Conversation.findOne({
    user_id: userId,
    topic_id: topicId,
    mode: "quiz",
  });

  if (!conversation)
    return {
      status: "not_started",
      message: "No quiz found. Start a new quiz.",
    };

  const topic = await Topic.findOne({ topic_id: topicId });
  const percentage =
    conversation.max_possible_score > 0
      ? Math.round(
          (conversation.total_score / conversation.max_possible_score) * 100,
        )
      : 0;

  const response = {
    session_id: conversation._id.toString(),
    topic_id: topicId,
    topic_title: topic?.title || "Unknown",
    status: conversation.status,
    current_question: conversation.current_question,
    total_questions: conversation.total_questions,
    progress: {
      total_score: conversation.total_score,
      max_possible_score: conversation.max_possible_score,
      percentage,
    },
  };

  if (conversation.status === "completed") {
    response.final_results = generateFinalSummary(conversation);
  }

  response.history = conversation.messages;
  return response;
}

async function submitAnswerStream(
  userId,
  topicId,
  userAnswer,
  onChunk,
  onComplete,
) {
  const result = await submitAnswer(userId, topicId, userAnswer);

  const feedbackMsg = result.evaluation.feedback_message;
  for (const char of feedbackMsg) {
    onChunk(char);
    await new Promise((resolve) => setTimeout(resolve, 10));
  }

  onComplete(result);
}

module.exports = { startQuiz, submitAnswer, submitAnswerStream, getQuizStatus };
