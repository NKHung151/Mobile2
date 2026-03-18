import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  TouchableOpacity,
} from "react-native";
import { LineChart } from "react-native-chart-kit";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, SHADOWS } from "../constants/config";

const { width } = Dimensions.get("window");

/**
 * ProgressReport Component
 * Displays comprehensive charts and progress analytics
 */
export default function ProgressReport({ statistics, sessions }) {
  console.log("[ProgressReport] Rendering with data:");
  console.log("[ProgressReport] Statistics:", statistics);
  console.log("[ProgressReport] Sessions count:", sessions?.length || 0);

  if (!sessions || sessions.length === 0) {
    console.log("[ProgressReport] ❌ No data - showing empty state");
    return (
      <View style={styles.container}>
        <Text style={styles.noData}>� No quiz sessions yet!</Text>
        <Text style={styles.noData}>Complete some quiz sessions first!</Text>
      </View>
    );
  }

  console.log("[ProgressReport] ✅ Rendering charts with data");

  // Prepare data for accuracy trend chart
  const getAccuracyFromSession = (s) => {
    if (!s) return 0;
    // Prefer exact computed accuracy if questions answered is known
    const qAnswered =
      s.questions_answered || s.questionsAnswered || s.questions || 0;
    const correct = s.correct_answers || s.correctAnswers || s.correct || 0;
    if (qAnswered && qAnswered > 0) {
      const pctCorrect = (Number(correct) / Number(qAnswered)) * 100 || 0;
      // If there are explicit correct answers, prefer that
      if (Number.isFinite(pctCorrect) && pctCorrect > 0)
        return Math.round(pctCorrect);

      // If correct is zero but score fields exist, derive from score (handles inconsistent backend)
      const totalScore = s.total_score || s.totalScore || s.score || 0;
      const maxScore = s.max_score || s.maxScore || s.max || 0;
      if (totalScore && maxScore) {
        const pct = (Number(totalScore) / Number(maxScore)) * 100 || 0;
        if (Number.isFinite(pct))
          return Math.max(0, Math.min(100, Math.round(pct)));
      }

      // otherwise return 0 when correct_answers explicitly 0
      return 0;
    }

    // Fallback: if no questions answered field, try score ratio
    const totalScore = s.total_score || s.totalScore || s.score || 0;
    const maxScore = s.max_score || s.maxScore || s.max || 0;
    if (totalScore && maxScore) {
      const pct = (Number(totalScore) / Number(maxScore)) * 100 || 0;
      if (Number.isFinite(pct))
        return Math.max(0, Math.min(100, Math.round(pct)));
    }

    // Last resort: use any percentage-like fields
    const candidates = [
      s.accuracy_percentage,
      s.accuracy,
      s.accuracyPercent,
      s.accuracy_percent,
      s.scorePercent,
      s.score_percentage,
      s.correct_rate,
      s.percent_correct,
      s.percent,
    ];

    for (let v of candidates) {
      if (v === undefined || v === null) continue;
      const n = parseFloat(v);
      if (Number.isFinite(n)) {
        // If fraction between 0 and 1, assume it's 0-1 and convert to percent
        if (n > 0 && n <= 1) return Math.round(n * 100);
        // Clamp large values to 0-100
        return Math.max(0, Math.min(100, Math.round(n)));
      }
    }
    return 0;
  };

  const getAccuracyTrendData = () => {
    if (!sessions || sessions.length === 0) {
      return { labels: ["No data"], datasets: [{ data: [0] }] };
    }

    const recent = sessions.slice(-7).reverse();
    const labels = recent.map((s, i) => {
      // prefer a date label if available
      const ts = s.created_at || s.createdAt || s.timestamp || s.date;
      if (ts) {
        try {
          const d = new Date(ts);
          if (!isNaN(d)) return `${d.getMonth() + 1}/${d.getDate()}`;
        } catch (e) {}
      }
      return `Day ${i + 1}`;
    });

    const data = recent.map((s) => getAccuracyFromSession(s));

    return { labels, datasets: [{ data: data.length > 0 ? data : [0] }] };
  };

  const accuracyData = getAccuracyTrendData();

  // Debug: print labels and data arrays for easier inspection
  try {
    console.log("[ProgressReport] accuracy labels:", accuracyData.labels);
    console.log(
      "[ProgressReport] accuracy values:",
      accuracyData.datasets[0].data,
    );
  } catch (e) {}

  const chartConfig = {
    backgroundGradientFrom: COLORS.card,
    backgroundGradientFromOpacity: 1,
    backgroundGradientTo: COLORS.card,
    backgroundGradientToOpacity: 1,
    color: (opacity = 1) => `rgba(255, 107, 107, ${opacity})`,
    strokeWidth: 2,
    barPercentage: 0.5,
  };

  // If `statistics` is not provided, derive basic stats from `sessions`
  // Use the robust extractor `getAccuracyFromSession` to compute per-session accuracy
  const computedAverage =
    sessions && sessions.length > 0
      ? Math.round(
          sessions.reduce((sum, s) => sum + getAccuracyFromSession(s), 0) /
            sessions.length,
        )
      : 0;

  console.log("[ProgressReport] computedAverageFromSessions:", computedAverage);

  // Fix: statistics structure might be nested in "overall"; fall back to computed
  const statsData = (statistics && (statistics.overall || statistics)) || {
    total_sessions: sessions.length,
    overall_accuracy_percentage: computedAverage,
    current_study_streak: 0,
  };

  // Prefer server-provided overall_accuracy, but if it's 0 or missing
  // fall back to the computedAverage derived from session records.
  const overallAccuracy =
    statsData.overall_accuracy_percentage ||
    statsData.average_accuracy ||
    computedAverage ||
    0;

  console.log("[ProgressReport] Statistics data:", statsData);
  console.log("[ProgressReport] Overall accuracy:", overallAccuracy);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Compact Overall Accuracy */}
      <View style={styles.masterySection}>
        <View style={[styles.masteryCard, { borderColor: COLORS.primary }]}>
          <Text style={styles.masteryLevel}>Overall Accuracy</Text>
          <Text style={[styles.masteryAccuracy, { color: COLORS.primary }]}>
            {overallAccuracy}%
          </Text>
          <View style={styles.masteryProgressBar}>
            <View
              style={[
                styles.masteryProgress,
                {
                  width: `${Math.min(overallAccuracy, 100)}%`,
                  backgroundColor: COLORS.primary,
                },
              ]}
            />
          </View>
        </View>
      </View>

      {/* Key Statistic: Total Sessions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📊 Key Statistic</Text>
        <View style={[styles.quizSummary, { alignItems: "flex-start" }]}>
          <Text style={[styles.quizSummaryText, { fontSize: 18 }]}>
            Total Sessions
          </Text>
          <Text style={[styles.statValue, { marginTop: 8 }]}>
            {statsData.total_sessions || 0}
          </Text>
        </View>
      </View>

      {/* Accuracy Trend */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📈 Accuracy Trend (Last 7 Days)</Text>
        <View style={styles.chartContainer}>
          {accuracyData.datasets[0].data.length > 0 ? (
            <LineChart
              data={accuracyData}
              width={width - 40}
              height={200}
              chartConfig={chartConfig}
              bezier
              style={styles.chart}
            />
          ) : (
            <Text style={styles.noChartData}>No data available</Text>
          )}
        </View>
      </View>

      {/* (Removed) Topic Performance - compact report */}

      {/* Session Mode Distribution removed for compact report */}

      {/* (Removed) Detailed Performance Summary - compact report */}

      {/* Streak Section */}
      {statsData.current_study_streak && statsData.current_study_streak > 0 && (
        <View style={[styles.section, styles.streakSection]}>
          <View style={styles.streakContent}>
            <Text style={styles.streakEmoji}>🔥</Text>
            <View>
              <Text style={styles.streakLabel}>Current Study Streak</Text>
              <Text style={styles.streakValue}>
                {statsData.current_study_streak} days
              </Text>
            </View>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

/**
 * StatCard Component
 */
function StatCard({ icon, label, value, color }) {
  return (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <Ionicons name={icon} size={24} color={color} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

/**
 * PerformanceRow Component
 */
function PerformanceRow({ label, value, icon }) {
  return (
    <View style={styles.performanceRow}>
      <View style={styles.performanceLabel}>
        <Ionicons name={icon} size={20} color={COLORS.primary} />
        <Text style={styles.performanceLabelText}>{label}</Text>
      </View>
      <Text style={styles.performanceValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  masterySection: {
    marginBottom: 24,
  },
  masteryCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    borderLeftWidth: 4,
    ...SHADOWS.md,
  },
  masteryEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  masteryLevel: {
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: 8,
  },
  masteryAccuracy: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 16,
  },
  masteryProgressBar: {
    width: "100%",
    height: 8,
    backgroundColor: COLORS.border,
    borderRadius: 4,
    overflow: "hidden",
  },
  masteryProgress: {
    height: "100%",
    borderRadius: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  statCard: {
    width: "48%",
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    alignItems: "flex-start",
    ...SHADOWS.sm,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: COLORS.text,
    marginVertical: 8,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  chartContainer: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    ...SHADOWS.sm,
  },
  chart: {
    borderRadius: 12,
  },
  noChartData: {
    color: COLORS.textMuted,
    fontSize: 14,
    paddingVertical: 16,
  },
  legendContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 16,
    flexWrap: "wrap",
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 24,
    marginBottom: 8,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  legendLabel: {
    color: COLORS.text,
    fontSize: 12,
  },
  performanceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  performanceLabel: {
    flexDirection: "row",
    alignItems: "center",
  },
  performanceLabelText: {
    marginLeft: 12,
    color: COLORS.text,
    fontSize: 14,
  },
  performanceValue: {
    color: COLORS.primary,
    fontWeight: "bold",
    fontSize: 14,
  },
  streakSection: {
    backgroundColor: "#FFF8E1",
    borderRadius: 12,
    borderLeftColor: COLORS.warning,
    borderLeftWidth: 4,
  },
  streakContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
  },
  streakEmoji: {
    fontSize: 40,
    marginRight: 16,
  },
  streakLabel: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginBottom: 4,
  },
  streakValue: {
    color: COLORS.warning,
    fontWeight: "bold",
    fontSize: 18,
  },
  streakMessage: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontStyle: "italic",
    paddingVertical: 8,
  },
  noData: {
    color: COLORS.textMuted,
    fontSize: 16,
    textAlign: "center",
    padding: 32,
  },
  sessionTypesSummary: {
    paddingVertical: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  sessionTypeText: {
    color: COLORS.text,
    fontSize: 14,
    marginVertical: 6,
    fontWeight: "500",
  },
  quizSummary: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    borderLeftColor: COLORS.primary,
    borderLeftWidth: 4,
    ...SHADOWS.sm,
  },
  quizSummaryText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "600",
  },
});
