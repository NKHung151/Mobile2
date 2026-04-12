import axios from "axios";
import { API_BASE_URL } from "../constants/config";

// Create axios instance for learning API
const learningApi = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30000,
});

// Request interceptor
learningApi.interceptors.request.use(
  (config) => {
    console.log(`[LearningAPI] ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error("[LearningAPI] Request Error:", error);
    return Promise.reject(error);
  },
);

// Response interceptor
learningApi.interceptors.response.use(
  (response) => {
    console.log("[LearningAPI] Success:", response.data);
    return response;
  },
  (error) => {
    const message =
      error.response?.data?.error || error.message || "An error occurred";
    console.error("[LearningAPI] Error:", message);
    return Promise.reject(new Error(message));
  },
);

/**
 * Start a new learning session
 */
export const startLearningSession = async (
  userId,
  topicId,
  topicTitle,
  mode,
) => {
  const response = await learningApi.post("/api/learning/session/start", {
    user_id: userId,
    topic_id: topicId,
    topic_title: topicTitle,
    mode, // 'quiz' or 'chat'
  });
  return response.data;
};

/**
 * Update session progress during learning
 */
export const updateSessionProgress = async (
  sessionId,
  userId,
  questionsAnswered,
  correctAnswers,
  totalScore,
  maxScore,
  status,
) => {
  const response = await learningApi.post("/api/learning/session/update", {
    session_id: sessionId,
    user_id: userId,
    questions_answered: questionsAnswered,
    correct_answers: correctAnswers,
    total_score: totalScore,
    max_score: maxScore,
    status,
  });
  return response.data;
};

/**
 * Complete a learning session
 */
export const completeLearningSession = async (sessionId, userId) => {
  const response = await learningApi.post("/api/learning/session/complete", {
    session_id: sessionId,
    user_id: userId,
  });
  return response.data;
};

/**
 * Get user's learning history
 */
export const getLearningHistory = async (userId, options = {}) => {
  const {
    limit = 50,
    skip = 0,
    status = null,
    mode = null,
    topicId = null,
  } = options;

  const params = {
    user_id: userId,
    limit,
    skip,
  };

  if (status) params.status = status;
  if (mode) params.mode = mode;
  if (topicId) params.topic_id = topicId;

  const response = await learningApi.get("/api/learning/history", { params });
  return response.data;
};

/**
 * Get learning statistics
 */
export const getLearningStatistics = async (userId) => {
  const response = await learningApi.get("/api/learning/statistics", {
    params: { user_id: userId },
  });
  return response.data;
};

/**
 * Get topic progress
 */
export const getTopicProgress = async (userId, topicId) => {
  const response = await learningApi.get("/api/learning/topic-progress", {
    params: {
      user_id: userId,
      topic_id: topicId,
    },
  });
  return response.data;
};

/**
 * Get learning dashboard data
 */
export const getLearningDashboard = async (userId) => {
  const response = await learningApi.get("/api/learning/dashboard", {
    params: { user_id: userId },
  });
  return response.data;
};

/**
 * Get personalized AI recommendations for next learning topic
 * Requires Gemini API to be configured and quota available
 */
export const getRecommendations = async (userId) => {
  const params = { user_id: userId };
  const response = await learningApi.get("/api/learning/recommendations", {
    params,
  });
  return response.data;
};

/**
 * Delete learning history
 */
export const deleteAllLearningHistory = async (userId) => {
  const response = await learningApi.delete("/api/learning/history", {
    params: { user_id: userId },
  });
  return response.data;
};

/**
 * Get detailed answers for a specific session
 * Returns all questions, user answers, correct answers, and results
 */
export const getSessionAnswers = async (sessionId, userId) => {
  const response = await learningApi.get(
    `/api/learning/session/${sessionId}/answers`,
    {
      params: { user_id: userId },
    }
  );
  return response.data;
};

/**
 * Save an answer during a session
 * Called after each question is answered
 */
export const saveSessionAnswer = async (sessionId, userId, answerData) => {
  const response = await learningApi.post(
    `/api/learning/session/${sessionId}/answer`,
    {
      user_id: userId,
      ...answerData,
    }
  );
  return response.data;
};
