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

export const getTopic = async (topicId) => {
  const response = await api.get(`/api/topics/${topicId}`);
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

export const getQuizStatus = async (userId, topicId) => {
  const response = await api.get(`/api/quiz/status`, {
    params: { user_id: userId, topic_id: topicId },
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

// ==================== TRANSCRIPTION API ====================

export const getTranscriptionSentences = async (topicId) => {
  const response = await api.get(`/api/transcription/sentences`, {
    params: { topic_id: topicId },
  });
  return response.data;
};

export const submitTranscription = async (
  userId,
  topicId,
  sentenceId,
  transcription,
  score,
) => {
  const response = await api.post("/api/transcription/submit", {
    user_id: userId,
    topic_id: topicId,
    sentence_id: sentenceId,
    transcription,
    score,
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

export const getConversationDetails = async (userId, topicId, mode) => {
  const response = await api.get(`/api/conversations/${topicId}`, {
    params: { user_id: userId, mode },
  });
  return response.data;
};

export const deleteConversation = async (userId, topicId, mode) => {
  const response = await api.delete(`/api/conversations/${topicId}`, {
    params: { user_id: userId, mode },
  });
  return response.data;
};

// ==================== AUTH API ====================

export const loginUser = async (username, password) => {
  const response = await api.post("/api/auth/login", { username, password });
  return response.data;
};

export const registerUser = async ({ username, email, phone, password }) => {
  const response = await api.post("/api/auth/register", {
    username,
    email,
    phone,
    password,
  });
  return response.data;
};

export const getUserProfile = async (userId) => {
  const response = await api.get(`/api/auth/profile/${userId}`);
  return response.data;
};

export const updateUserProfile = async (userId, data) => {
  const response = await api.put(`/api/auth/profile/${userId}`, data);
  return response.data;
};

export default api;
