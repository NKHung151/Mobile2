import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Animated,
  RefreshControl,
  FlatList,
  Alert,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useUser } from "../context/UserContext";
import { getConversations } from "../services/api";
import {
  getLearningHistory,
  getLearningStatistics,
  getLearningDashboard,
  getRecommendations,
} from "../services/learningHistoryService";
import { LineChart, BarChart, PieChart } from "react-native-chart-kit";
import { COLORS, SHADOWS } from "../constants/config";
import ProgressReport from "../components/ProgressReport";

export default function HistoryScreen({ navigation }) {
  const { userId } = useUser();
  const [sessions, setSessions] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("dashboard");
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fetchAllData();
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, []);

  // Recommendations state
  const [recommendations, setRecommendations] = useState(null);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);

  const fetchRecommendations = async () => {
    try {
      setLoadingRecommendations(true);
      const resp = await getRecommendations(userId);
      setRecommendations(resp);
    } catch (e) {
      console.error("[History] Recommendations error:", e.message || e);
    } finally {
      setLoadingRecommendations(false);
    }
  };

  const fetchAllData = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log("[History] ===== FETCHING DATA =====");
      console.log("[History] User ID:", userId);

      if (!userId) {
        setError("User ID not set. Please enter a User ID on Home Screen.");
        setLoading(false);
        return;
      }

      // Fetch learning history
      console.log("[History] Fetching learning history...");
      const historyResponse = await getLearningHistory(userId);
      console.log("[History] History Response:", historyResponse);
      console.log(
        "[History] Sessions count:",
        historyResponse.sessions?.length || 0,
      );
      setSessions(historyResponse.sessions || []);

      // Fetch statistics
      console.log("[History] Fetching statistics...");
      const statsResponse = await getLearningStatistics(userId);
      console.log("[History] Statistics Response:", statsResponse);
      setStatistics(statsResponse.statistics);

      // Fetch dashboard
      console.log("[History] Fetching dashboard...");
      const dashboardResponse = await getLearningDashboard(userId);
      console.log("[History] Dashboard Response:", dashboardResponse);
      setDashboard(dashboardResponse.dashboard);

      console.log("[History] ===== DATA FETCH COMPLETE =====");
    } catch (err) {
      console.error("[History] ===== ERROR =====");
      console.error("[History] Error message:", err.message);
      console.error("[History] Error details:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAllData();
    setRefreshing(false);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "Unknown";

    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const formatDuration = (minutes) => {
    if (minutes < 60) {
      return `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const renderDashboardCard = () => {
    if (!dashboard) return null;

    const { today, this_week, topics_overview } = dashboard;

    return (
      <Animated.ScrollView
        style={[{ opacity: fadeAnim }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Today's Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📅 Today</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{today.sessions_completed}</Text>
              <Text style={styles.statLabel}>Sessions</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{today.total_time_minutes}</Text>
              <Text style={styles.statLabel}>Minutes</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{today.questions_answered}</Text>
              <Text style={styles.statLabel}>Questions</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>
                {today.questions_answered > 0
                  ? Math.round(
                      (today.correct_answers / today.questions_answered) * 100,
                    )
                  : 0}
                %
              </Text>
              <Text style={styles.statLabel}>Accuracy</Text>
            </View>
          </View>
        </View>

        {/* This Week */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📊 This Week</Text>
          <View style={styles.weekCard}>
            <View style={styles.weekStat}>
              <Ionicons name="book" size={24} color={COLORS.primary} />
              <View>
                <Text style={styles.weekStatValue}>
                  {this_week.sessions_completed}
                </Text>
                <Text style={styles.weekStatLabel}>Sessions</Text>
              </View>
            </View>
            <View style={styles.weekStat}>
              <Ionicons name="calendar" size={24} color={COLORS.success} />
              <View>
                <Text style={styles.weekStatValue}>{this_week.study_days}</Text>
                <Text style={styles.weekStatLabel}>Study Days</Text>
              </View>
            </View>
            <View style={styles.weekStat}>
              <Ionicons name="time" size={24} color={COLORS.warning} />
              <View>
                <Text style={styles.weekStatValue}>
                  {formatDuration(this_week.total_time_minutes)}
                </Text>
                <Text style={styles.weekStatLabel}>Total Time</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Top Topics */}
        {topics_overview && topics_overview.top_topics.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🎯 Top Topics</Text>
            {topics_overview.top_topics.map((topic, index) => (
              <View key={index} style={styles.topicCard}>
                <View style={styles.topicInfo}>
                  <Text style={styles.topicName}>{topic.topic_title}</Text>
                  <Text style={styles.topicStats}>
                    {topic.sessions_completed} sessions •{" "}
                    {topic.mastery_percentage}% mastery
                  </Text>
                  <View
                    style={[styles.progressBar, styles.progressBarContainer]}
                  >
                    <View
                      style={[
                        styles.progressBar,
                        {
                          width: `${topic.mastery_percentage}%`,
                          backgroundColor: COLORS.primary,
                        },
                      ]}
                    />
                  </View>
                </View>
                <View style={styles.levelBadge}>
                  <Text style={styles.levelText}>{topic.current_level}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
        {/* Recommendations Preview */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💡 AI Recommendations</Text>
          {loadingRecommendations ? (
            <ActivityIndicator size="small" color={COLORS.primary} />
          ) : recommendations ? (
            <>
              {/* AI Advice Section */}
              {recommendations.ai_advice ? (
                <View style={[styles.recoCard, styles.aiAdviceCard]}>
                  <Text style={styles.aiAdviceTitle}>
                    ✨ Personalized Learning Path
                  </Text>
                  <Text style={styles.aiAdviceText}>
                    {recommendations.ai_advice}
                  </Text>
                </View>
              ) : (
                <View style={[styles.recoCard, styles.errorCard]}>
                  <Text style={styles.errorText}>
                    {recommendations.ai_error ||
                      "Unable to generate AI recommendations. Please try again."}
                  </Text>
                </View>
              )}
            </>
          ) : (
            <Text style={{ color: COLORS.textSecondary }}>
              Tap "Get Recommendations" to see AI-powered learning suggestions.
            </Text>
          )}
          <TouchableOpacity
            style={styles.recoButton}
            onPress={fetchRecommendations}
          >
            <Text style={styles.recoButtonText}>
              {loadingRecommendations
                ? "Loading..."
                : recommendations?.ai_advice
                  ? "Refresh Recommendations"
                  : "Get AI Recommendations"}
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.ScrollView>
    );
  };

  const renderHistoryCard = ({ item }) => {
    const statusIcons = {
      completed: "✅",
      in_progress: "⏳",
      abandoned: "❌",
    };

    return (
      <TouchableOpacity
        style={styles.historyCard}
        activeOpacity={0.7}
        onPress={() => {
          Alert.alert(
            item.topic_title,
            `Mode: ${item.mode}\nStatus: ${item.status}\nScore: ${item.total_score}/${item.max_score}\nAccuracy: ${item.accuracy_percentage}%\nDuration: ${item.duration_minutes} minutes`,
          );
        }}
      >
        <View style={styles.historyHeader}>
          <View style={styles.historyTitle}>
            <Text style={styles.historyTitleText}> {item.topic_title}</Text>
            <Text style={styles.historyMode}>
              {item.mode === "quiz" ? "📝 Quiz" : "💬 Chat"}
            </Text>
          </View>
          <Text style={styles.statusIcon}>
            {statusIcons[item.status] || "•"}
          </Text>
        </View>

        <View style={styles.historyDetails}>
          <View style={styles.historyDetail}>
            <Ionicons name="star" size={16} color={COLORS.warning} />
            <Text style={styles.historyDetailText}>
              {item.total_score}/{item.max_score}
            </Text>
          </View>
          <View style={styles.historyDetail}>
            <Ionicons
              name="checkmark-circle"
              size={16}
              color={COLORS.success}
            />
            <Text style={styles.historyDetailText}>
              {item.accuracy_percentage}%
            </Text>
          </View>
          <View style={styles.historyDetail}>
            <Ionicons name="time" size={16} color={COLORS.info} />
            <Text style={styles.historyDetailText}>
              {item.duration_minutes}m
            </Text>
          </View>
        </View>

        <Text style={styles.historyDate}>{formatDate(item.created_at)}</Text>
      </TouchableOpacity>
    );
  };

  const renderHistoryList = () => {
    return (
      <FlatList
        key={"history"}
        data={sessions}
        renderItem={renderHistoryCard}
        keyExtractor={(item) => item.session_id}
        scrollEnabled={true}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>📚</Text>
            <Text style={styles.emptyTitle}>No Learning History</Text>
            <Text style={styles.emptyText}>
              Start a quiz or chat session to see your history here
            </Text>
          </View>
        }
        ListHeaderComponent={
          <View style={styles.historySectionHeader}>
            <Text style={styles.sectionTitle}>📖 Learning History</Text>
            <Text style={styles.historyCount}>
              {sessions.length} {sessions.length === 1 ? "session" : "sessions"}
            </Text>
          </View>
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />
    );
  };

  // Statistics tab removed - merged into Reports for simplicity

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading your progress...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "dashboard" && styles.tabActive]}
          onPress={() => setActiveTab("dashboard")}
        >
          <Ionicons
            name="grid"
            size={20}
            color={
              activeTab === "dashboard" ? COLORS.primary : COLORS.textSecondary
            }
          />
          <Text
            style={[
              styles.tabText,
              activeTab === "dashboard" && styles.tabTextActive,
            ]}
          >
            Dashboard
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === "history" && styles.tabActive]}
          onPress={() => setActiveTab("history")}
        >
          <Ionicons
            name="book"
            size={20}
            color={
              activeTab === "history" ? COLORS.primary : COLORS.textSecondary
            }
          />
          <Text
            style={[
              styles.tabText,
              activeTab === "history" && styles.tabTextActive,
            ]}
          >
            History
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === "reports" && styles.tabActive]}
          onPress={() => setActiveTab("reports")}
        >
          <Ionicons
            name="document"
            size={20}
            color={
              activeTab === "reports" ? COLORS.primary : COLORS.textSecondary
            }
          />
          <Text
            style={[
              styles.tabText,
              activeTab === "reports" && styles.tabTextActive,
            ]}
          >
            Reports
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>⚠️ {error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={fetchAllData}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {activeTab === "dashboard" && renderDashboardCard()}
        {activeTab === "history" && renderHistoryList()}
        {activeTab === "reports" && (
          <ProgressReport statistics={statistics} sessions={sessions} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  tabBar: {
    flexDirection: "row",
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingTop: 12,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 3,
    borderBottomColor: "transparent",
  },
  tabActive: {
    borderBottomColor: COLORS.primary,
  },
  tabText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
    fontWeight: "600",
  },
  tabTextActive: {
    color: COLORS.primary,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  section: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 10,
  },
  statCard: {
    width: "48%",
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "700",
    color: COLORS.primary,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  weekCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 12,
  },
  weekStat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 8,
  },
  weekStatValue: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text,
  },
  weekStatLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  topicCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  topicInfo: {
    flex: 1,
  },
  topicName: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
  },
  topicStats: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginVertical: 4,
  },
  progressBarContainer: {
    height: 6,
    backgroundColor: COLORS.border,
    borderRadius: 3,
    overflow: "hidden",
    marginTop: 6,
  },
  progressBar: {
    height: "100%",
    borderRadius: 3,
  },
  levelBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  levelText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#fff",
    textTransform: "capitalize",
  },
  recoCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    padding: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  recoTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.text,
  },
  recoText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 6,
  },
  recoMeta: {
    marginTop: 8,
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  recoButton: {
    marginTop: 10,
    alignSelf: "flex-start",
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  recoButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  aiAdviceCard: {
    backgroundColor: "#F0F7FF",
    borderColor: COLORS.primary,
    borderWidth: 1.5,
    marginBottom: 12,
  },
  errorCard: {
    backgroundColor: "#FFF5F5",
    borderColor: COLORS.error,
    borderWidth: 1.5,
    marginBottom: 12,
  },
  aiAdviceTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.primary,
    marginBottom: 8,
  },
  aiAdviceText: {
    fontSize: 13,
    color: COLORS.text,
    lineHeight: 18,
  },
  errorText: {
    fontSize: 13,
    color: COLORS.error,
    lineHeight: 18,
    fontStyle: "italic",
  },
  historyCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  historyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  historyTitle: {
    flex: 1,
  },
  historyTitleText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
  },
  historyMode: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  statusIcon: {
    fontSize: 18,
  },
  historyDetails: {
    flexDirection: "row",
    gap: 16,
    marginVertical: 8,
  },
  historyDetail: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  historyDetailText: {
    fontSize: 12,
    color: COLORS.text,
    fontWeight: "500",
  },
  historyDate: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  historySectionHeader: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  historyCount: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: "center",
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  bigStatCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  bigStatItem: {
    width: "48%",
    paddingVertical: 12,
    alignItems: "center",
  },
  bigStatLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  bigStatValue: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.primary,
  },
  detailedStats: {
    marginTop: 12,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: "hidden",
  },
  detailedStatRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  detailedStatLabel: {
    fontSize: 13,
    color: COLORS.text,
  },
  detailedStatValue: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.primary,
  },
  weeklyCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: "row",
    justifyContent: "space-around",
  },
  weeklyItem: {
    alignItems: "center",
  },
  weeklyLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  weeklyValue: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.primary,
  },
  topicsOverview: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  topicsCount: {
    fontSize: 13,
    color: COLORS.text,
    textAlign: "center",
  },
  errorContainer: {
    margin: 16,
    padding: 12,
    backgroundColor: "#ffebee",
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: "#f44336",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  errorText: {
    flex: 1,
    color: "#c62828",
    fontSize: 13,
  },
  retryButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#f44336",
    borderRadius: 6,
  },
  retryButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 12,
  },
});
