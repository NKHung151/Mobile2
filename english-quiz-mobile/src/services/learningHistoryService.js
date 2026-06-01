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
 * Khởi tạo một phiên học tập mới trên API backend.
 * 
 * @param {string} userId - ID người dùng
 * @param {string} topicId - ID chủ đề học tập
 * @param {string} topicTitle - Tiêu đề của chủ đề
 * @param {string} mode - Chế độ học tập (ví dụ: 'homophone_groups', 'question_response')
 * @returns {Promise<Object>} Response object chứa session_id vừa tạo
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
    mode, 
  });
  return response.data;
};

/**
 * Cập nhật tiến độ của phiên học hiện tại trong quá trình học tập.
 * 
 * @param {string} sessionId - ID của phiên học tập
 * @param {string} userId - ID người dùng
 * @param {number} questionsAnswered - Số câu đã trả lời
 * @param {number} correctAnswers - Số câu trả lời đúng
 * @param {number} totalScore - Tổng số điểm đạt được
 * @param {number} maxScore - Điểm số tối đa của phiên
 * @param {string} status - Trạng thái phiên ('completed', 'abandoned')
 * @returns {Promise<Object>} Trả về trạng thái lưu trữ cập nhật tiến trình
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
 * Đánh dấu phiên học tập hiện tại đã hoàn thành.
 * 
 * @param {string} sessionId - ID phiên học tập
 * @param {string} userId - ID người dùng sở hữu phiên
 * @returns {Promise<Object>} Phản hồi từ server xác nhận hoàn tất thành công
 */
export const completeLearningSession = async (sessionId, userId) => {
  const response = await learningApi.post("/api/learning/session/complete", {
    session_id: sessionId,
    user_id: userId,
  });
  return response.data;
};

/**
 * Lấy lịch sử học tập của học viên với các tham số phân trang và lọc chế độ.
 * 
 * @param {string} userId - ID của học viên cần lấy lịch sử
 * @param {Object} [options={}] - Các tùy chọn lọc dữ liệu
 * @param {number} [options.limit=50] - Số lượng bản ghi giới hạn
 * @param {number} [options.skip=0] - Số bản ghi bỏ qua
 * @param {string} [options.status] - Trạng thái phiên cần lọc
 * @param {string} [options.mode] - Chế độ học tập cần lọc
 * @param {string} [options.topicId] - ID chủ đề học tập
 * @returns {Promise<Object>} Danh sách lịch sử các phiên học và tổng số phiên
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
 * Truy xuất chỉ số thống kê học tập tổng quát của học viên.
 * 
 * @param {string} userId - ID học viên
 * @returns {Promise<Object>} Response object chứa các trường dữ liệu statistics tổng quan và theo tuần
 */
export const getLearningStatistics = async (userId) => {
  const response = await learningApi.get("/api/learning/statistics", {
    params: { user_id: userId },
  });
  return response.data;
};

/**
 * Truy xuất tiến trình học tập của một chủ đề cụ thể.
 * 
 * @param {string} userId - ID học viên
 * @param {string} topicId - ID chủ đề
 * @returns {Promise<Object>} Tiến độ học tập của chủ đề (số phiên hoàn thành, tỷ lệ chính xác)
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
 * Lấy chỉ số Dashboard tổng hợp của học viên trong ngày hôm nay và tuần này.
 * 
 * @param {string} userId - ID học viên
 * @returns {Promise<Object>} Số liệu Dashboard (thời gian học, số câu trả lời, top chủ đề cần review)
 */
export const getLearningDashboard = async (userId) => {
  const response = await learningApi.get("/api/learning/dashboard", {
    params: { user_id: userId },
  });
  return response.data;
};

/**
 * Gọi API backend lấy lời khuyên học tập cá nhân hóa do mô hình Gemini AI phân tích.
 * 
 * @param {string} userId - ID học viên
 * @returns {Promise<Object>} Gợi ý AI chứa chủ đề yếu nhất và lời khuyên tiếng Việt cụ thể
 */
export const getRecommendations = async (userId) => {
  const params = { user_id: userId };
  const response = await learningApi.get("/api/learning/recommendations", {
    params,
  });
  return response.data;
};

/**
 * Xóa sạch toàn bộ lịch sử học tập của học viên khỏi cơ sở dữ liệu.
 * 
 * @param {string} userId - ID học viên cần xóa lịch sử
 * @returns {Promise<Object>} Kết quả thực hiện xóa thành công
 */
export const deleteAllLearningHistory = async (userId) => {
  const response = await learningApi.delete("/api/learning/history", {
    params: { user_id: userId },
  });
  return response.data;
};

/**
 * Lấy danh sách đáp án chi tiết và các câu hỏi của một phiên học chỉ định.
 * 
 * @param {string} sessionId - ID phiên học tập cần xem lại
 * @param {string} userId - ID học viên sở hữu phiên
 * @returns {Promise<Object>} Đối tượng chứa session thông tin chung và mảng answers chi tiết từng câu
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
 * Lưu trữ đáp án chi tiết của một câu hỏi đã hoàn thành trong phiên học.
 * 
 * @param {string} sessionId - ID phiên học đang diễn ra
 * @param {string} userId - ID học viên thực hiện câu hỏi
 * @param {Object} answerData - Dữ liệu câu trả lời (bao gồm câu hỏi, đáp án chọn, độ chính xác, transcript)
 * @returns {Promise<Object>} Kết quả lưu trữ bản ghi thành công
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
