import { useState, useCallback } from 'react';
import { 
  getLearningHistory, 
  getLearningStatistics, 
  getLearningDashboard, 
  getRecommendations 
} from '../services/learningHistoryService';

export const useProgressData = (userId) => {
  const [sessions, setSessions] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [recommendations, setRecommendations] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);
  const [error, setError] = useState(null);

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
        // Filter out 'chat' and 'transcribe' sessions - Business Logic encapsulated here
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
