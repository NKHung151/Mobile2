import React, { useState, useEffect, useRef, useMemo } from "react";
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
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useUser } from "../context/UserContext";
import { useProgressData } from "../hooks/useProgressData";
import { formatDate, formatDuration, getModeLabel, getModeEmoji, getModeBadgeColor } from "../utils/formatters";
import { LineChart, BarChart, PieChart } from "react-native-chart-kit";
import { COLORS, SHADOWS } from "../constants/config";

const { width } = Dimensions.get("window");

/**
 * Local ProgressReport Component (Merged)
 */
function ProgressReport({ statistics, sessions }) {
  if (!sessions || sessions.length === 0) {
    return (
      <View style={reportStyles.container}>
        <Text style={reportStyles.noData}>📚 No learning sessions yet!</Text>
        <Text style={reportStyles.noData}>Complete some sessions first!</Text>
      </View>
    );
  }

  const getAccuracyFromSession = (s) => {
    const qAnswered = s.questions_answered || s.questionsAnswered || s.questions || 0;
    const correct = s.correct_answers || s.correctAnswers || s.correct || 0;
    if (qAnswered > 0) return Math.round((correct / qAnswered) * 100);
    return s.accuracy_percentage || 0;
  };

  const buildLast7Days = () => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      days.push(d);
    }

    const completed = sessions.filter((s) => s.status === "completed");

    return days.map((day) => {
      const nextDay = new Date(day);
      nextDay.setDate(nextDay.getDate() + 1);

      const daySessions = completed.filter((s) => {
        const ts = new Date(s.created_at);
        return ts >= day && ts < nextDay;
      });

      const label = `${day.getMonth() + 1}/${day.getDate()}`;

      if (daySessions.length === 0) return { label, accuracy: 0 };

      const totalQuestions = daySessions.reduce((sum, s) => sum + (s.questions_answered || 0), 0);
      const totalCorrect = daySessions.reduce((sum, s) => sum + (s.correct_answers || 0), 0);

      return { 
        label, 
        accuracy: totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0 
      };
    });
  };

  const last7Days = buildLast7Days();
  const labels = last7Days.map((d) => d.label);
  const data = last7Days.map((d) => d.accuracy);

  const chartConfig = {
    backgroundGradientFrom: COLORS.card,
    backgroundGradientTo: COLORS.card,
    color: (opacity = 1) => `rgba(79, 70, 229, ${opacity})`,
    strokeWidth: 2,
    decimalPlaces: 0,
    fromZero: true,
  };

  const accuracyData = {
    labels,
    datasets: [
      { data, color: (opacity = 1) => `rgba(79, 70, 229, ${opacity})` },
      { data: [100], color: () => "transparent", withDots: false },
    ],
  };

  const statsData = statistics?.overall || statistics || {
    total_sessions: sessions.length,
    overall_accuracy_percentage: sessions.length > 0 
      ? Math.round(sessions.reduce((sum, s) => sum + getAccuracyFromSession(s), 0) / sessions.length) 
      : 0,
  };

  const overallAccuracy = statsData.overall_accuracy_percentage || 0;

  return (
    <ScrollView style={reportStyles.container} showsVerticalScrollIndicator={false}>
      <View style={reportStyles.masterySection}>
        <View style={[reportStyles.masteryCard, { borderColor: COLORS.primary }]}>
          <Text style={reportStyles.masteryLabel}>Overall Accuracy</Text>
          <Text style={[reportStyles.masteryAccuracy, { color: COLORS.primary }]}>{overallAccuracy}%</Text>
          <View style={reportStyles.masteryProgressBar}>
            <View style={[reportStyles.masteryProgress, { width: `${overallAccuracy}%`, backgroundColor: COLORS.primary }]} />
          </View>
        </View>
      </View>

      <View style={reportStyles.section}>
        <Text style={reportStyles.sectionTitle}>📊 Learning Overview</Text>
        <View style={reportStyles.summaryBox}>
          <Text style={reportStyles.summaryText}>Total Sessions Completed: {sessions.length}</Text>
        </View>
      </View>

      <View style={reportStyles.section}>
        <Text style={reportStyles.sectionTitle}>📈 Accuracy Trend</Text>
        <View style={reportStyles.chartContainer}>
          <LineChart data={accuracyData} width={width - 40} height={200} chartConfig={chartConfig} bezier style={reportStyles.chart} />
        </View>
      </View>
    </ScrollView>
  );
}

const reportStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: 16 },
  masterySection: { marginBottom: 20 },
  masteryCard: { backgroundColor: COLORS.surface, borderRadius: 12, padding: 20, alignItems: "center", borderLeftWidth: 4, ...SHADOWS.md },
  masteryLabel: { fontSize: 18, fontWeight: "700", color: COLORS.text, marginBottom: 8 },
  masteryAccuracy: { fontSize: 24, fontWeight: "800", marginBottom: 12 },
  masteryProgressBar: { width: "100%", height: 8, backgroundColor: COLORS.border, borderRadius: 4, overflow: "hidden" },
  masteryProgress: { height: "100%", borderRadius: 4 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: COLORS.text, marginBottom: 12 },
  summaryBox: { backgroundColor: COLORS.surface, borderRadius: 10, padding: 16, borderLeftWidth: 4, borderLeftColor: COLORS.primary, ...SHADOWS.sm },
  summaryText: { fontSize: 14, fontWeight: "600", color: COLORS.text },
  chartContainer: { backgroundColor: COLORS.surface, borderRadius: 12, padding: 10, alignItems: "center", ...SHADOWS.sm },
  chart: { borderRadius: 12 },
  noData: { color: COLORS.textSecondary, fontSize: 16, textAlign: "center", marginTop: 20 },
});

export default function HistoryScreen({ navigation }) {
  const { userId } = useUser();
  const {
    sessions,
    statistics,
    dashboard,
    recommendations,
    loading,
    loadingRecommendations,
    error,
    fetchAllData,
    fetchAIRecommendations
  } = useProgressData(userId);

  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [selectedModeFilter, setSelectedModeFilter] = useState("all");
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fetchAllData();
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [fetchAllData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAllData();
    setRefreshing(false);
  };

  const handleViewSessionDetails = (session) => {
    navigation.navigate("SessionDetails", {
      sessionId: session.session_id,
      userId: userId,
      topic_title: session.topic_title
    });
  };

  // Get filtered sessions based on selected mode
  const getFilteredSessions = () => {
    if (selectedModeFilter === "all") {
      return sessions;
    }
    if (selectedModeFilter === "question_response") {
      return sessions.filter(session => session.mode === "question_response");
    }
    return sessions.filter(session => session.mode === selectedModeFilter);
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
                {today.accuracy_percentage ?? 0}%
              </Text>
              <Text style={styles.statLabel}>Accuracy</Text>
            </View>
          </View>
        </View>

        {/* Last 7 Days */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📈 Last 7 Days</Text>
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
            onPress={fetchAIRecommendations}
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
    const badgeColor = getModeBadgeColor(item.mode);
    const emoji = getModeEmoji(item.mode);
    const modeLabel = getModeLabel(item.mode);

    // Override legacy topic_title for question_response records (old DB records still say "Listening Part 2")
    const displayTitle = (item.mode === 'question_response' && item.topic_title === 'Listening Part 2')
      ? 'Question - Response'
      : item.topic_title;

    // Practice: show level · exercise from learning_tags
    const sublabel = item.mode === 'practice' && item.learning_tags?.length > 0
      ? item.learning_tags.join(' · ')
      : null;

    return (
      <TouchableOpacity
        style={styles.historyCard}
        activeOpacity={0.7}
        onPress={() => {
          const message = `Mode: ${item.mode}\nStatus: ${item.status}\nCorrect: ${item.correct_answers ?? 0}/${item.questions_answered ?? 0}\nAccuracy: ${item.accuracy_percentage}%\nDuration: ${formatDuration(item.duration_minutes)}`;
          if (Platform.OS === 'web') {
            window.alert(`${item.topic_title}\n\n${message}`);
          } else {
            Alert.alert(item.topic_title, message);
          }
        }}
      >
        {/* Header row: emoji + title + mode badge */}
        <View style={styles.historyHeader}>
          <Text style={styles.historyEmoji}>{emoji}</Text>
          <View style={styles.historyTitle}>
            <Text style={styles.historyTitleText}>{displayTitle}</Text>
            {sublabel && (
              <Text style={styles.historySublabel}>{sublabel}</Text>
            )}
          </View>
          <View style={[styles.modeBadge, { backgroundColor: badgeColor + '22' }]}>
            <Text style={[styles.modeBadgeText, { color: badgeColor }]}>{modeLabel}</Text>
          </View>
        </View>

        {/* Stats row: accuracy + duration + review button */}
        <View style={styles.historyDetails}>
          <View style={styles.historyDetail}>
            <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
            <Text style={styles.historyDetailText}>
              {item.accuracy_percentage ?? 0}%
            </Text>
          </View>
          <View style={styles.historyDetail}>
            <Ionicons name="time" size={16} color={COLORS.info || '#0984e3'} />
            <Text style={styles.historyDetailText}>
              {formatDuration(item.duration_minutes)}
            </Text>
          </View>
          
          {/* Review Answers button - inline */}
          {item.status === "completed" && item.questions_answered > 0 && (
            <TouchableOpacity
              style={styles.inlineReviewButton}
              onPress={() => handleViewSessionDetails(item)}
              activeOpacity={0.6}
            >
              <Ionicons name="document-text" size={14} color={COLORS.primary} />
              <Text style={styles.inlineReviewButtonText}>Review</Text>
            </TouchableOpacity>
          )}

          <Text style={styles.historyDate}>{formatDate(item.created_at)}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderHistoryList = () => {
    const filteredSessions = getFilteredSessions();

    return (
      <FlatList
        key={"history"}
        data={filteredSessions}
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
          <View>
            {/* Filter Dropdown */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Filter by Mode:</Text>
              <View style={styles.filterButtonsContainer}>
                {[
                  { key: "all", label: "All" },
                  { key: "quiz", label: "Quiz" },
                  { key: "question_response", label: "Q&R" },
                  { key: "homophone_groups", label: "Homophone" },
                  { key: "practice", label: "Practice" },
                ].map(filter => (
                  <TouchableOpacity
                    key={filter.key}
                    style={[
                      styles.filterButton,
                      selectedModeFilter === filter.key && styles.filterButtonActive,
                    ]}
                    onPress={() => setSelectedModeFilter(filter.key)}
                  >
                    <Text
                      style={[
                        styles.filterButtonText,
                        selectedModeFilter === filter.key && styles.filterButtonTextActive,
                      ]}
                    >
                      {filter.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Section Title */}
            <View style={styles.historySectionHeader}>
              <Text style={styles.sectionTitle}>
                📖 Learning History {selectedModeFilter !== "all" && `(${getModeLabel(selectedModeFilter)})`}
              </Text>
            </View>
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
    alignItems: "flex-start",
    marginBottom: 8,
    gap: 8,
  },
  historyEmoji: {
    fontSize: 22,
    lineHeight: 26,
  },
  historyTitle: {
    flex: 1,
  },
  historyTitleText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
  },
  historySublabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
    fontStyle: "italic",
  },
  modeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  modeBadgeText: {
    fontSize: 11,
    fontWeight: "700",
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
    alignItems: "center",
    gap: 12,
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
    marginLeft: "auto",
  },
  viewDetailsButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: COLORS.primary + "12",
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
  },
  viewDetailsButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.primary,
  },
  inlineReviewButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: COLORS.primary + "15",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.primary + "40",
  },
  inlineReviewButtonText: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.primary,
  },
  filterSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  filterButtonsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: COLORS.background,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.text,
  },
  filterButtonTextActive: {
    color: "#fff",
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
