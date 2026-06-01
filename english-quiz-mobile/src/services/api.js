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
    const errorData = error.response?.data;
    let message = "An error occurred";

    if (typeof errorData === "object" && errorData !== null) {
      // Try different error formats
      message = errorData.error || errorData.message || errorData.errors || JSON.stringify(errorData);
    } else {
      message = error.message;
    }

    console.error("[API] Response Error:", {
      status: error.response?.status,
      data: errorData,
      message: message,
    });
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

export const updateCourseStar = async (courseId, isStar) => {
  const response = await api.put(`/api/courses/${courseId}/star`, {
    is_star: Boolean(isStar),
  });
  return response.data;
};

export const shareCourse = async (courseId) => {
  const response = await api.post(`/api/courses/${courseId}/share`);
  return response.data;
};

export const redeemShareCode = async (shareCode) => {
  const response = await api.post("/api/courses/redeem/share", {
    share_code: shareCode,
  });
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

// ==================== FLASHCARD PROGRESS API ====================

export const createCoursePracticeSession = async (courseId, payload = {}) => {
  const response = await api.post(`/api/progress/courses/${courseId}/practices`, payload);
  return response.data;
};

export const getLatestCoursePractice = async (courseId) => {
  const response = await api.get(`/api/progress/courses/${courseId}/latest`);
  return response.data;
};

export const updateCoursePracticeProgress = async (courseId, payload) => {
  const response = await api.put(`/api/progress/courses/${courseId}`, payload);
  return response.data;
};

export const updateVocabularyProgress = async (vocabularyId, payload) => {
  const response = await api.put(`/api/progress/vocabularies/${vocabularyId}`, payload);
  return response.data;
};

export const getPracticeHistory = async () => {
  const response = await api.get("/api/progress/history");
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

// ==================== HOMOPHONE GROUPS API ====================

/**
 * Bắt đầu một phiên học tập luyện tập từ đồng âm (Homophone Groups).
 * 
 * @param {string} userId - ID của người dùng học viên
 * @returns {Promise<Object>} Trả về đối tượng chứa thông tin session_id và trạng thái khởi tạo
 */
export const startHomophoneGroupsSession = async (userId) => {
  const response = await api.post("/api/homophone-groups/session/start", {
    user_id: userId,
  });
  return response.data;
};

/**
 * Lấy câu hỏi từ đồng âm ngẫu nhiên tiếp theo từ API backend.
 * 
 * @returns {Promise<Object>} Đối tượng câu hỏi an toàn (question_id, choices, sentence chứa blank, correctWordForAudio)
 */
export const startHomophoneGroups = async () => {
  const response = await api.post("/api/homophone-groups/start");
  return response.data;
};

/**
 * Gửi đáp án trả lời cho câu hỏi luyện tập từ đồng âm hiện tại để kiểm định.
 * 
 * @param {string} questionId - ID định danh của câu hỏi cần chấm điểm
 * @param {string} userAnswer - Từ đồng âm do người học lựa chọn
 * @param {string} [sessionId=null] - ID phiên học hiện tại để tích lũy điểm số
 * @param {string} [userId=null] - ID người học sở hữu phiên
 * @returns {Promise<Object>} Kết quả kiểm tra đáp án chi tiết (is_correct, correct_answer, correct_phonetic...)
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
 * Đánh dấu hoàn thành phiên học luyện tập từ đồng âm hiện tại.
 * 
 * @param {string} sessionId - ID phiên học cần kết thúc
 * @param {string} userId - ID người học sở hữu phiên
 * @returns {Promise<Object>} Kết quả cập nhật phiên học tập sang trạng thái completed
 */
export const completeHomophoneGroupsSession = async (sessionId, userId) => {
  const response = await api.post("/api/homophone-groups/session/complete", {
    session_id: sessionId,
    user_id: userId,
  });
  return response.data;
};

/**
 * Hủy bỏ và xóa hoàn toàn phiên luyện tập từ đồng âm khi học viên thoát sớm dưới 70% tiến trình.
 * Áp dụng quy tắc Hybrid Early Exit Rule để tránh rác cơ sở dữ liệu.
 * 
 * @param {string} sessionId - ID phiên học cần hủy bỏ
 * @param {string} userId - ID người học sở hữu phiên
 * @returns {Promise<Object>} Trạng thái xác nhận xóa thành công bản ghi khỏi DB
 */
export const deleteHomophoneGroupsSession = async (sessionId, userId) => {
  const response = await api.delete(`/api/homophone-groups/session/${sessionId}`, {
    data: {
      user_id: userId,
    },
  });
  return response.data;
};

// ==================== QUESTION RESPONSE API ====================

/**
 * Khởi tạo một phiên thi nghe thử thách TOEIC Part 2 (Question - Response).
 * 
 * @param {string} userId - ID học viên
 * @param {number} [questionCount=10] - Số lượng câu hỏi của phiên thi
 * @returns {Promise<Object>} Đối tượng chứa session_id, danh sách các câu hỏi đã loại bỏ đáp án đúng
 */
export const startQuestionResponseSession = async (userId, questionCount = 10) => {
  const response = await api.post("/api/question-response/session/start", {
    user_id: userId,
    question_count: questionCount,
  });
  return response.data;
};

/**
 * Gửi câu trả lời của học viên đối với một câu hỏi cụ thể trong phiên thi TOEIC Part 2.
 * 
 * @param {string} sessionId - ID phiên thi đang diễn ra
 * @param {string} userId - ID học viên thực hiện câu hỏi
 * @param {number} selectedOptionIndex - Chỉ mục phương án được chọn (0 = A, 1 = B, 2 = C)
 * @returns {Promise<Object>} Kết quả kiểm tra đáp án chi tiết, transcript của câu hỏi và dịch nghĩa đầy đủ
 */
export const submitQuestionResponseAnswer = async (sessionId, userId, selectedOptionIndex) => {
  const response = await api.post("/api/question-response/answer", {
    session_id: sessionId,
    user_id: userId,
    selected_option_index: selectedOptionIndex,
  });
  return response.data;
};

/**
 * Hoàn tất và lưu trữ kết quả toàn bộ phiên làm bài TOEIC Part 2.
 * 
 * @param {string} sessionId - ID phiên thi cần kết thúc
 * @param {string} userId - ID học viên sở hữu phiên thi
 * @returns {Promise<Object>} Dữ liệu tổng hợp phiên thi đã được cập nhật thành công
 */
export const completeQuestionResponseSession = async (sessionId, userId) => {
  const response = await api.post("/api/question-response/session/complete", {
    session_id: sessionId,
    user_id: userId,
  });
  return response.data;
};

/**
 * Hủy bỏ phiên thi nghe TOEIC Part 2 khi thoát sớm dưới 70% tiến độ làm bài.
 * Áp dụng quy tắc Hybrid Early Exit Rule đảm bảo an toàn cơ sở dữ liệu.
 * 
 * @param {string} sessionId - ID phiên thi cần hủy
 * @param {string} userId - ID học viên sở hữu phiên thi
 * @returns {Promise<Object>} Kết quả thực hiện lệnh xóa bản ghi từ Express Server
 */
export const deleteQuestionResponseSession = async (sessionId, userId) => {
  const response = await api.delete(`/api/question-response/session/${sessionId}`, {
    data: {
      user_id: userId,
    },
  });
  return response.data;
};

// ==================== VIDEOS API ====================

/**
 * Lấy danh sách video bài học từ backend, có lọc theo category
 */
export const getVideos = async (category = "All") => {
  const response = await api.get("/api/videos", {
    params: { category },
  });
  return response.data;
};

export const clearAuthToken = async () => {
  await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
};

export default api;
