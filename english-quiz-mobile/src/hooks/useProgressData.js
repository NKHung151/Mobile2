import { useState, useCallback } from 'react';
import { 
  getLearningHistory, 
  getLearningStatistics, 
  getLearningDashboard, 
  getRecommendations 
} from '../services/learningHistoryService';

/**
 * Custom Hook quản lý trạng thái và đồng bộ hóa dữ liệu tiến trình học tập của học viên.
 * Thực hiện tải đồng thời dữ liệu lịch sử, thống kê cơ bản thông qua Promise.all,
 * đồng thời tách biệt việc tải gợi ý AI bất đồng bộ để tránh nghẽn luồng xử lý UI chính.
 * 
 * @param {string} userId - ID của học viên đang đăng nhập hệ thống
 * @returns {Object} Đối tượng chứa các state (sessions, statistics, dashboard, recommendations, loading, loadingRecommendations, error) và các hàm fetchAllData, fetchAIRecommendations
 */
export const useProgressData = (userId) => {
  const [sessions, setSessions] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [recommendations, setRecommendations] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Tải đồng thời tất cả các dữ liệu thống kê cơ bản bao gồm Lịch sử học tập,
   * Số liệu thống kê chi tiết và Chỉ số Dashboard thông qua API Gateway.
   * Lọc bỏ các phiên 'chat' và 'transcribe' không thuộc phạm vi đồ án.
   * 
   * @async
   * @function fetchAllData
   * @returns {Promise<void>}
   */
  const fetchAllData = useCallback(async () => {
    if (!userId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const [historyResponse, statsResponse, dashboardResponse] = await Promise.all([
        getLearningHistory(userId, { limit: 100 }),
        getLearningStatistics(userId),
        getLearningDashboard(userId),
      ]);

      if (historyResponse.success) {
        // Lọc nghiệp vụ: Chỉ giữ lại các phiên trắc nghiệm tương tác câu hỏi
        const rawSessions = historyResponse.sessions || [];
        setSessions(rawSessions.filter(s => s.mode !== 'chat' && s.mode !== 'transcribe'));
      }
      
      if (statsResponse.success) {
        setStatistics(statsResponse.statistics);
      }
      
      if (dashboardResponse.success) {
        setDashboard(dashboardResponse.dashboard);
      }
    } catch (err) {
      console.error("[useProgressData] fetchAllData failed:", err);
      setError(err.message || "Failed to fetch progress data");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  /**
   * Tải các lời khuyên học tập cá nhân hóa do Gemini AI phân tích.
   * Chạy bất đồng bộ, độc lập với luồng tải thống kê cơ bản để tăng trải nghiệm người dùng.
   * 
   * @async
   * @function fetchAIRecommendations
   * @returns {Promise<void>}
   */
  const fetchAIRecommendations = useCallback(async () => {
    if (!userId) return;
    
    setLoadingRecommendations(true);
    try {
      const response = await getRecommendations(userId);
      if (response.success) {
        setRecommendations({
          ai_advice: response.ai_advice,
          weakest_topic: response.weakest_topic,
          ai_error: response.ai_error
        });
      }
    } catch (err) {
      console.error("[useProgressData] fetchAIRecommendations failed:", err);
    } finally {
      setLoadingRecommendations(false);
    }
  }, [userId]);

  return {
    sessions,
    statistics,
    dashboard,
    recommendations,
    loading,
    loadingRecommendations,
    error,
    fetchAllData,
    fetchAIRecommendations
  };
};
