import axios from "axios";
import { API_BASE_URL } from "../constants/config";

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30000, // 30 seconds timeout
});

// Request interceptor for logging
api.interceptors.request.use(
  (config) => {
    console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error("[API] Request Error:", error);
    return Promise.reject(error);
  },
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    console.log(
      "[API] Response:",
      JSON.stringify(response.data, null, 2).substring(0, 500),
    );
    return response;
  },
  (error) => {
    const message =
      error.response?.data?.error || error.message || "An error occurred";
    console.error("[API] Response Error:", message);
    return Promise.reject(new Error(message));
  },
);

// ==================== TOPICS API (Public) ====================

export const getTopics = async () => {
  const response = await api.get("/api/topics");
  return response.data;
};



// ==================== QUIZ API ====================

export const startQuiz = async (userId, topicId, totalQuestions = 5) => {
  const response = await api.post("/api/quiz/start", {
    user_id: userId,
    topic_id: topicId,
    total_questions: totalQuestions,
  });
  return response.data;
};

export const submitAnswer = async (userId, topicId, answer) => {
  const response = await api.post("/api/quiz/answer", {
    user_id: userId,
    topic_id: topicId,
    answer,
  });
  return response.data;
};



// ==================== CHAT API ====================

export const sendChatMessage = async (userId, topicId, message) => {
  const response = await api.post("/api/chat", {
    user_id: userId,
    topic_id: topicId,
    message,
  });
  return response.data;
};

// ==================== HOMOPHONE GROUPS API ====================

/**
 * Start a homophone groups learning session
 */
export const startHomophoneGroupsSession = async (userId) => {
  const response = await api.post("/api/homophone-groups/session/start", {
    user_id: userId,
  });
  return response.data;
};

/**
 * Get the next homophone groups question
 */
export const startHomophoneGroups = async () => {
  const response = await api.post("/api/homophone-groups/start");
  return response.data;
};

/**
 * Submit an answer to a homophone groups question
 */
export const submitHomophoneGroupsAnswer = async (
  questionId,
  userAnswer,
  sessionId = null,
  userId = null,
) => {
  const response = await api.post("/api/homophone-groups/answer", {
    question_id: questionId,
    user_answer: userAnswer,
    session_id: sessionId,
    user_id: userId,
  });
  return response.data;
};

/**
 * Complete a homophone groups learning session
 */
export const completeHomophoneGroupsSession = async (sessionId, userId) => {
  const response = await api.post("/api/homophone-groups/session/complete", {
    session_id: sessionId,
    user_id: userId,
  });
  return response.data;
};

// ==================== LISTENING PART 2 API ====================

/**
 * Start a listening part 2 TOEIC learning session
 */
export const startListeningSession = async (userId, questionCount = 10) => {
  const response = await api.post("/api/listening-part2/session/start", {
    user_id: userId,
    question_count: questionCount,
  });
  return response.data;
};

/**
 * Submit answer to a listening part 2 question
 */
export const submitListeningAnswer = async (sessionId, selectedOptionIndex) => {
  const response = await api.post("/api/listening-part2/answer", {
    session_id: sessionId,
    selected_option_index: selectedOptionIndex,
  });
  return response.data;
};

// ==================== LISTENING PART 2 HISTORY API ====================

/**
 * Save a completed listening session to history
 */
export const saveListeningSessionToHistory = async (
  userId,
  totalQuestions,
  correctAnswers,
  questionsSummary,
  startTime,
  endTime,
) => {
  const response = await api.post("/api/listening-part2-history/save", {
    user_id: userId,
    total_questions: totalQuestions,
    correct_answers: correctAnswers,
    questions_summary: questionsSummary,
    start_time: startTime,
    end_time: endTime,
    device_type: "mobile",
  });
  return response.data;
};

/**
 * Get all listening history for a user
 */
export const getListeningHistory = async (userId) => {
  const response = await api.get(`/api/listening-part2-history/${userId}`);
  return response.data;
};

/**
 * Get listening statistics for a user
 */
export const getListeningStats = async (userId) => {
  const response = await api.get(`/api/listening-part2-history/${userId}/stats`);
  return response.data;
};

/**
 * Get details of a specific listening session
 */
export const getListeningSessionDetails = async (sessionId) => {
  const response = await api.get(`/api/listening-part2-history/session/${sessionId}`);
  return response.data;
};

/**
 * Delete a listening session
 */
export const deleteListeningSession = async (sessionId, userId) => {
  const response = await api.delete(`/api/listening-part2-history/session/${sessionId}`, {
    data: { user_id: userId },
  });
  return response.data;
};

// ==================== CONVERSATIONS API ====================

export const getConversations = async (userId) => {
  const response = await api.get("/api/conversations", {
    params: { user_id: userId },
  });

  // Handle different response formats from backend
  const data = response.data;

  // If data is already an array, return it wrapped
  if (Array.isArray(data)) {
    return { conversations: data };
  }

  // If data has conversations array
  if (data.conversations) {
    return { conversations: data.conversations };
  }

  // If data has data array
  if (data.data) {
    return { conversations: data.data };
  }

  // Fallback - return empty array
  console.warn("[API] Unexpected conversations response format:", data);
  return { conversations: [] };
};


export default api;
