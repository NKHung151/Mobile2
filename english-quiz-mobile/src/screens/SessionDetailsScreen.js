import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  SafeAreaView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, SHADOWS } from "../constants/config";
import { getSessionAnswers } from "../services/learningHistoryService";

export default function SessionDetailsScreen({ route, navigation }) {
  const { sessionId, userId, topic_title } = route.params || {};
  const [answers, setAnswers] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (sessionId && userId) {
      fetchSessionDetails();
    }
  }, [sessionId, userId]);

  const fetchSessionDetails = async () => {
    try {
      setLoading(true);
      const response = await getSessionAnswers(sessionId, userId);
      
      if (response && response.success) {
        setAnswers(response.answers || []);
        setSummary(response.summary);
      } else {
        const errorMsg = response?.error || "Failed to load session details";
        Alert.alert("Error", errorMsg);
      }
    } catch (err) {
      Alert.alert("Error", err.message || "Failed to load session details");
    } finally {
      setLoading(false);
    }
  };

  const renderAnswerCard = (answer) => {
    if (!answer || typeof answer !== 'object') return null;

    const backgroundColor = answer.is_correct ? "#E8F5E9" : "#FFEBEE";
    const borderColor = answer.is_correct ? COLORS.success : COLORS.error;
    const statusIcon = answer.is_correct ? "checkmark-circle" : "close-circle";
    const statusColor = answer.is_correct ? COLORS.success : COLORS.error;

    const formatAnswer = (value) => {
      if (typeof value !== 'string') return String(value || "");
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed.join(", ") : String(parsed);
      } catch (e) {
        return value;
      }
    };

    return (
      <View key={`${answer.question_id}-${answer.question_number}`} style={[styles.answerCard, { borderLeftColor: borderColor, backgroundColor }]}>
        <View style={styles.answerHeader}>
          <Text style={styles.questionNumber}>Question {answer.question_number}</Text>
          <View style={styles.statusBadge}>
            <Ionicons name={statusIcon} size={16} color={statusColor} />
            <Text style={[styles.statusText, { color: statusColor }]}>
              {answer.is_correct ? "Correct" : "Incorrect"}
            </Text>
          </View>
        </View>

        <View style={styles.questionSection}>
          <Text style={styles.questionLabel}>Question:</Text>
          <Text style={styles.questionText}>{answer.question_text}</Text>
        </View>

        <View style={styles.answerSection}>
          <Text style={styles.answerLabel}>Your Answer:</Text>
          <View style={[styles.answerBox, { borderColor }]}>
            <Text style={[styles.answerText, { color: statusColor }]}>
              {formatAnswer(answer.user_answer)}
            </Text>
          </View>
        </View>

        {!answer.is_correct && (
          <View style={styles.answerSection}>
            <Text style={styles.correctLabel}>✓ Correct Answer:</Text>
            <View style={[styles.answerBox, { borderColor: COLORS.success, backgroundColor: "#E8F5E9" }]}>
              <Text style={[styles.answerText, { color: COLORS.success }]}>
                {formatAnswer(answer.correct_answer)}
              </Text>
            </View>
          </View>
        )}

        {answer.explanation && (
          <View style={styles.explanationSection}>
            <Text style={styles.explanationLabel}>💡 Explanation:</Text>
            <Text style={styles.explanationText}>{answer.explanation}</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {topic_title || "Review Session"}
        </Text>
        <View style={styles.placeholder} />
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading details...</Text>
        </View>
      ) : (
        <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          {summary && (
            <View style={styles.summaryCard}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Score</Text>
                <Text style={[styles.summaryValue, { color: COLORS.primary }]}>
                  {summary.correct}/{summary.total}
                </Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Accuracy</Text>
                <Text style={[styles.summaryValue, { color: COLORS.success }]}>
                  {summary.accuracy}%
                </Text>
              </View>
            </View>
          )}

          {answers.length > 0 ? (
            <View style={styles.answersContainer}>
              {answers.map(renderAnswerCard)}
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="document-text-outline" size={64} color={COLORS.textSecondary} />
              <Text style={styles.emptyText}>No data for this session</Text>
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text,
    flex: 1,
    textAlign: "center",
    marginHorizontal: 12,
  },
  placeholder: {
    width: 32,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    color: COLORS.textSecondary,
  },
  scrollContainer: {
    flex: 1,
  },
  summaryCard: {
    flexDirection: "row",
    backgroundColor: COLORS.surface,
    margin: 16,
    borderRadius: 12,
    padding: 16,
    ...SHADOWS.md,
  },
  summaryItem: {
    flex: 1,
    alignItems: "center",
  },
  summaryLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: "800",
  },
  divider: {
    width: 1,
    backgroundColor: COLORS.border,
  },
  answersContainer: {
    padding: 16,
    paddingTop: 0,
  },
  answerCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 5,
    ...SHADOWS.sm,
  },
  answerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  questionNumber: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.textSecondary,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "700",
  },
  questionSection: {
    marginBottom: 12,
  },
  questionLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  questionText: {
    fontSize: 15,
    color: COLORS.text,
    lineHeight: 22,
  },
  answerSection: {
    marginBottom: 12,
  },
  answerLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  correctLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.success,
    marginBottom: 4,
  },
  answerBox: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
  },
  answerText: {
    fontSize: 14,
    fontWeight: "600",
  },
  explanationSection: {
    marginTop: 8,
    padding: 12,
    backgroundColor: "rgba(0,0,0,0.03)",
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },
  explanationLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.primary,
    marginBottom: 4,
  },
  explanationText: {
    fontSize: 13,
    color: COLORS.text,
    lineHeight: 18,
  },
  emptyContainer: {
    alignItems: "center",
    marginTop: 100,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.textSecondary,
  },
});
