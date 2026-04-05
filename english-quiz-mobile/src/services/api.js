import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE_URL } from "../constants/config";

export const AUTH_TOKEN_KEY = "@english_quiz_auth_token";

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
  async (config) => {
    const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
    if (token && !config.headers?.Authorization) {
      config.headers = {
        ...(config.headers || {}),
        Authorization: `Bearer ${token}`,
      };
    }
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
  async (response) => {
    console.log("[API] Response:", JSON.stringify(response.data, null, 2).substring(0, 500));

    // Persist JWT token after login/register so protected APIs work.
    const token = response?.data?.token;
    if (token && (response.config?.url?.includes("/api/auth/login") || response.config?.url?.includes("/api/auth/register"))) {
      await AsyncStorage.setItem(AUTH_TOKEN_KEY, token);
    }

    return response;
  },
  (error) => {
    const message = error.response?.data?.error || error.message || "An error occurred";
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

export const submitTranscription = async (userId, topicId, sentenceId, transcription, score) => {
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

// ==================== COURSE API ====================

export const getCourses = async () => {
  const response = await api.get("/api/courses");
  return response.data;
};

export const getCourseById = async (courseId) => {
  const response = await api.get(`/api/courses/${courseId}`);
  return response.data;
};

export const createCourse = async (payload) => {
  const response = await api.post("/api/courses", payload);
  return response.data;
};

export const updateCourse = async (courseId, payload) => {
  const response = await api.put(`/api/courses/${courseId}`, payload);
  return response.data;
};

export const deleteCourse = async (courseId) => {
  const response = await api.delete(`/api/courses/${courseId}`);
  return response.data;
};

// ==================== VOCABULARY API ====================

export const getCourseVocabularies = async (courseId) => {
  const response = await api.get(`/api/courses/${courseId}/vocabularies`);
  return response.data;
};

export const createVocabulary = async (courseId, payload) => {
  const response = await api.post(`/api/courses/${courseId}/vocabularies`, payload);
  return response.data;
};

export const updateVocabulary = async (courseId, vocabularyId, payload) => {
  const response = await api.put(`/api/courses/${courseId}/vocabularies/${vocabularyId}`, payload);
  return response.data;
};

export const deleteVocabulary = async (courseId, vocabularyId) => {
  const response = await api.delete(`/api/courses/${courseId}/vocabularies/${vocabularyId}`);
  return response.data;
};

// ==================== UPLOAD API ====================

export const uploadFile = async (file, fileType) => {
  const formData = new FormData();
  formData.append("file", {
    uri: file.uri,
    type: file.type || (fileType === "image" ? "image/jpeg" : "audio/mpeg"),
    name: file.name || `${fileType}_${Date.now()}`,
  });

  const response = await api.post(`/api/upload?type=${fileType}`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  // Validate response structure
  if (!response.data || typeof response.data !== "object") {
    throw new Error("Invalid upload response format");
  }

  return response.data;
};

// ==================== SETTING API ====================

export const getMySetting = async () => {
  const response = await api.get("/api/settings/me");
  return response.data;
};

export const updateMySetting = async (payload) => {
  const response = await api.put("/api/settings/me", payload);
  return response.data;
};

export const clearAuthToken = async () => {
  await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
};

export default api;
