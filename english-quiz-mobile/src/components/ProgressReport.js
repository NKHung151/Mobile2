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

  /**
   * Build Last 7 Days — from 6 days ago to today
   * Each day = sum of all completed sessions that day
   * Accuracy = weighted average: totalCorrect / totalQuestions * 100
   */
  const buildLast7Days = () => {
    if (!sessions || sessions.length === 0) {
      return [];
    }

    // Create 7 days array from 6 days ago to today
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      days.push(d);
    }

    // Filter only completed sessions
    const completed = sessions.filter((s) => s.status === "completed");

    // Group sessions by day and calculate weighted accuracy
    return days.map((day) => {
      const nextDay = new Date(day);
      nextDay.setDate(nextDay.getDate() + 1);

      const daySessions = completed.filter((s) => {
        const ts = new Date(s.created_at || s.createdAt || s.timestamp || s.date);
        return ts >= day && ts < nextDay;
      });

      // Label: M/D format
      const label = `${day.getMonth() + 1}/${day.getDate()}`;

      if (daySessions.length === 0) {
        return { label, accuracy: 0, hasData: false };
      }

      // Weighted average: total correct / total questions * 100
      const totalQuestions = daySessions.reduce(
        (sum, s) => sum + (s.questions_answered || s.questionsAnswered || s.questions || 0),
        0
      );
      const totalCorrect = daySessions.reduce(
        (sum, s) => sum + (s.correct_answers || s.correctAnswers || s.correct || 0),
        0
      );

      const accuracy =
        totalQuestions > 0
          ? Math.round((totalCorrect / totalQuestions) * 100)
          : 0;

      return { label, accuracy, hasData: true, sessionCount: daySessions.length };
    });
  };

  const last7Days = buildLast7Days();
  const labels = last7Days.map((d) => d.label);
  const data = last7Days.map((d) => d.accuracy);

  const chartConfig = {
    backgroundGradientFrom: COLORS.card,
    backgroundGradientFromOpacity: 1,
    backgroundGradientTo: COLORS.card,
    backgroundGradientToOpacity: 1,
    color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})`,
    strokeWidth: 2,
    barPercentage: 0.5,
    decimalPlaces: 0,
    fromZero: true,
    segments: 5,
  };

  // Build chart data with ghost dataset to force Y-axis max to 100%
  const accuracyData = {
    labels,
    datasets: [
      {
        data: data.length > 0 ? data : [0],
        color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})`,
        strokeWidth: 2,
      },
      {
        // Ghost dataset to force Y-max = 100
        data: [100],
        color: () => "transparent",
        strokeWidth: 0,
        withDots: false,
      },
    ],
  };

  // Debug: print labels and data arrays for easier inspection
  try {
    console.log("[ProgressReport] last 7 days labels:", labels);
    console.log("[ProgressReport] last 7 days accuracy values:", data);
  } catch (e) {}

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

  // Prefer server-provided overall_accuracy, but if missing (null/undefined)
  // fall back to the computedAverage. Note: 0 is a valid value and should not fallback.
  const overallAccuracy =
    statsData.overall_accuracy_percentage != null
      ? statsData.overall_accuracy_percentage
      : statsData.average_accuracy != null
      ? statsData.average_accuracy
      : computedAverage || 0;

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
            Completed Sessions
          </Text>
          <Text style={[styles.statValue, { marginTop: 8 }]}>
            {sessions ? sessions.length : 0}
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
