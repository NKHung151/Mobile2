import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, SHADOWS } from "../constants/config";
import { getSessionAnswers } from "../services/learningHistoryService";

export default function SessionDetailsModal({ visible, onClose, sessionId, userId, topic_title }) {
  const [answers, setAnswers] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);

  // DEBUG: Check props
  console.log("[SessionDetailsModal] Props:", {
    visible,
    sessionId,
    userId,
    topic_title,
    topic_title_type: typeof topic_title,
  });

  useEffect(() => {
    if (visible && sessionId && userId) {
      fetchSessionDetails();
    }
  }, [visible, sessionId, userId]);

  const fetchSessionDetails = async () => {
    try {
      setLoading(true);
      console.log(`[SessionDetailsModal] Fetching answers for session: ${sessionId}, user: ${userId}`);
      
      const response = await getSessionAnswers(sessionId, userId);
      
      console.log("[SessionDetailsModal] Response:", response);
      console.log("[SessionDetailsModal] Response type:", typeof response);
      
      if (response && response.success) {
        console.log(`[SessionDetailsModal] Loaded ${response.answers?.length || 0} answers`);
        
        // Log first answer structure for debugging
        if (response.answers && response.answers.length > 0) {
          console.log("[SessionDetailsModal] First answer object:", response.answers[0]);
          console.log("[SessionDetailsModal] topic_title type:", typeof response.answers[0]?.topic_title);
        }
        
        // Log summary
        console.log("[SessionDetailsModal] Summary:", response.summary);
        
        setAnswers(response.answers || []);
        setSummary(response.summary);
      } else {
        const errorMsg = response?.error || "Failed to load session details";
        console.error("[SessionDetailsModal] Error:", errorMsg);
        Alert.alert("Error", errorMsg);
      }
    } catch (err) {
      console.error("[SessionDetailsModal] Exception:", err);
      console.error("[SessionDetailsModal] Error message:", err.message);
      console.error("[SessionDetailsModal] Error response:", err.response?.data);
      Alert.alert("Error", err.message || "Failed to load session details");
    } finally {
      setLoading(false);
    }
  };

  const renderAnswerCard = (answer) => {
    // Early return if answer is invalid
    if (!answer || typeof answer !== 'object') {
      console.warn("[SessionDetailsModal] Invalid answer object:", answer);
      return null;
    }

    // DEBUG: Log answer structure
    console.log("[SessionDetailsModal] Processing answer:", {
      question_id: answer.question_id,
      question_type: typeof answer.question_type,
      explanation: typeof answer.explanation,
      time_spent: typeof answer.time_spent_seconds,
      user_answer: typeof answer.user_answer,
    });

    const backgroundColor = answer.is_correct ? "#E8F5E9" : "#FFEBEE";
    const borderColor = answer.is_correct ? COLORS.success : COLORS.error;
    const statusIcon = answer.is_correct ? "checkmark-circle" : "close-circle";
    const statusColor = answer.is_correct ? COLORS.success : COLORS.error;

    // Helper: Safely parse JSON if string is JSON-encoded
    const safelyParse = (value) => {
      if (typeof value !== 'string') return value;
      try {
        return JSON.parse(value);
      } catch (e) {
        return value;
      }
    };

    // Helper: Convert answer to readable string
    const formatAnswer = (value, questionType = "") => {
      const parsed = safelyParse(value);
      
      if (Array.isArray(parsed)) {
        return parsed.join(", ");
      }
      
      if (typeof parsed === "object") {
        return JSON.stringify(parsed);
      }
      
      return String(parsed || "[No answer]");
    };

    const renderQuestionContent = () => {
      const questionText = String(answer.question_text || "");
      const userAnswerFormatted = formatAnswer(answer.user_answer, answer.question_type);
      const correctAnswerFormatted = formatAnswer(answer.correct_answer, answer.question_type);
      
      // Homophone groups: show sentence with blank filled
      if (answer.question_type === "homophone_groups") {
        const sentenceWithAnswer = questionText.replace(/_____|<blank>|\[blank\]/gi, userAnswerFormatted);
        const sentenceWithCorrect = questionText.replace(/_____|<blank>|\[blank\]/gi, correctAnswerFormatted);

        return (
          <View>
            <View style={styles.questionSection}>
              <Text style={styles.questionLabel}>Sentence:</Text>
              <Text style={styles.questionText}>{questionText}</Text>
            </View>

            <View style={styles.answerSection}>
              <Text style={styles.answerLabel}>Your Answer:</Text>
              <View style={[styles.answerBox, { borderColor: answer.is_correct ? COLORS.success : COLORS.error }]}>
                <Text style={[styles.answerText, { color: answer.is_correct ? COLORS.success : COLORS.error }]}>
                  {userAnswerFormatted.substring(0, 150)}
                </Text>
              </View>
              <Text style={styles.smallText}>{sentenceWithAnswer.substring(0, 200)}</Text>
            </View>

            {!answer.is_correct && (
              <View style={styles.answerSection}>
                <Text style={styles.correctLabel}>✓ Correct Answer:</Text>
                <View style={[styles.answerBox, { borderColor: COLORS.success, backgroundColor: "#E8F5E9" }]}>
                  <Text style={[styles.answerText, { color: COLORS.success }]}>
                    {correctAnswerFormatted.substring(0, 150)}
                  </Text>
                </View>
                <Text style={styles.smallText}>{sentenceWithCorrect.substring(0, 200)}</Text>
              </View>
            )}

            {answer.options && Array.isArray(answer.options) && answer.options.length > 0 && (
              <View style={styles.optionsSection}>
                <Text style={styles.optionsLabel}>Options:</Text>
                <View>
                  {answer.options.map((opt, idx) => {
                    const optText = String(typeof opt === 'string' ? opt : (typeof opt === 'object' ? JSON.stringify(opt) : opt || ""));
                    return (
                      <Text key={`opt-${idx}`} style={styles.optionText}>
                        • {optText.substring(0, 100)}
                      </Text>
                    );
                  })}
                </View>
              </View>
            )}
          </View>
        );
      }

      // Practice: multiple_choice, fill_in_blank, reorder, error_detection
      const practiceTypes = ["multiple_choice", "fill_in_blank", "reorder", "error_detection"];
      if (practiceTypes.includes(answer.question_type)) {
        return (
          <View>
            <View style={styles.questionSection}>
              <Text style={styles.questionLabel}>Question:</Text>
              <Text style={styles.questionText}>{questionText.substring(0, 300)}</Text>
            </View>

            <View style={styles.answerSection}>
              <Text style={styles.answerLabel}>Your Answer:</Text>
              <View style={[styles.answerBox, { borderColor: answer.is_correct ? COLORS.success : COLORS.error }]}>
                <Text style={[styles.answerText, { color: answer.is_correct ? COLORS.success : COLORS.error }]}>
                  {userAnswerFormatted.substring(0, 150)}
                </Text>
              </View>
            </View>

            {!answer.is_correct && (
              <View style={styles.answerSection}>
                <Text style={styles.correctLabel}>✓ Correct Answer:</Text>
                <View style={[styles.answerBox, { borderColor: COLORS.success, backgroundColor: "#E8F5E9" }]}>
                  <Text style={[styles.answerText, { color: COLORS.success }]}>
                    {correctAnswerFormatted.substring(0, 150)}
                  </Text>
                </View>
              </View>
            )}

            {answer.options && Array.isArray(answer.options) && answer.options.length > 0 && (
              <View style={styles.optionsSection}>
                <Text style={styles.optionsLabel}>Options:</Text>
                <View>
                  {answer.options.map((opt, idx) => {
                    const optText = String(typeof opt === 'string' ? opt : (typeof opt === 'object' ? JSON.stringify(opt) : opt || ""));
                    return (
                      <Text key={`opt-${idx}`} style={styles.optionText}>
                        {idx + 1}. {optText.substring(0, 100)}
                      </Text>
                    );
                  })}
                </View>
              </View>
            )}
          </View>
        );
      }

      // Quiz and Listening/Default: show simple Q&A
      return (
        <View>
          <View style={styles.questionSection}>
            <Text style={styles.questionLabel}>Question:</Text>
            <Text style={styles.questionText}>{questionText.substring(0, 300)}</Text>
          </View>

          <View style={styles.answerSection}>
            <Text style={styles.answerLabel}>Your Answer:</Text>
            <View style={[styles.answerBox, { borderColor: answer.is_correct ? COLORS.success : COLORS.error }]}>
              <Text style={[styles.answerText, { color: answer.is_correct ? COLORS.success : COLORS.error }]}>
                {userAnswerFormatted.substring(0, 150)}
              </Text>
            </View>
          </View>

          {!answer.is_correct && (
              <View style={styles.answerSection}>
                <Text style={styles.correctLabel}>✓ Correct Answer:</Text>
                <View style={[styles.answerBox, { borderColor: COLORS.success, backgroundColor: "#E8F5E9" }]}>
                  <Text style={[styles.answerText, { color: COLORS.success }]}>
                    {correctAnswerFormatted.substring(0, 150)}
                  </Text>
                </View>
              </View>
            )}

          {answer.options && Array.isArray(answer.options) && answer.options.length > 0 && (
            <View style={styles.optionsSection}>
              <Text style={styles.optionsLabel}>Options:</Text>
              <View>
                {answer.options.map((opt, idx) => {
                  const optText = String(typeof opt === 'string' ? opt : (typeof opt === 'object' ? JSON.stringify(opt) : opt || ""));
                  return (
                    <Text key={`opt-${idx}`} style={styles.optionText}>
                      {idx + 1}. {optText.substring(0, 100)}
                    </Text>
                  );
                })}
              </View>
            </View>
          )}
        </View>
      );
    };

    return (
      <View key={`${answer.question_id}-${answer.question_number}`} style={[styles.answerCard, { borderLeftColor: borderColor, backgroundColor }]}>
        {/* Question Number & Status */}
        <View style={styles.answerHeader}>
          <Text style={styles.questionNumber}>Q{answer.question_number}</Text>
          <View style={styles.statusBadge}>
            <Ionicons name={statusIcon} size={16} color={statusColor} />
            <Text style={[styles.statusText, { color: statusColor }]}>
              {answer.is_correct ? "Correct" : "Incorrect"}
            </Text>
          </View>
          {typeof answer.time_spent_seconds === "number" && answer.time_spent_seconds > 0 && (
            <Text style={styles.timeSpent}>{String(answer.time_spent_seconds)}s</Text>
          )}
        </View>

        {/* Dynamic Content */}
        <View>
          {renderQuestionContent()}
        </View>

        {/* Explanation */}
        {answer.explanation && typeof answer.explanation === "string" && answer.explanation.trim() && (
          <View style={styles.explanationSection}>
            <Text style={styles.explanationLabel}>💡 Explanation:</Text>
            <Text style={styles.explanationText}>{String(answer.explanation || "")}</Text>
          </View>
        )}

        {/* Question Type Badge */}
        <View style={styles.questionTypeRow}>
          <Text style={styles.questionType}>{String(answer.question_type || "quiz")}</Text>
        </View>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.headerButtons}>
            <Ionicons name="chevron-back" size={28} color={COLORS.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{String(topic_title || "Session Details")}</Text>
          <View style={styles.headerButtons} />
        </View>

        {/* Loading State */}
        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Loading session details...</Text>
          </View>
        ) : (
          <View style={{ flex: 1 }}>
            {/* Summary */}
            {summary && (
              <View style={styles.summarySection}>
                <View style={styles.summaryCard}>
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>Correct</Text>
                    <Text style={[styles.summaryValue, { color: COLORS.success }]}>
                      {String(summary.correct || 0)}/{String(summary.total || 0)}
                    </Text>
                  </View>
                  <View style={styles.divider} />
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>Accuracy</Text>
                    <Text style={[styles.summaryValue, { color: COLORS.primary }]}>
                      {String(summary.accuracy || 0)}%
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* Answers List */}
            {answers && answers.length > 0 ? (
              <ScrollView style={styles.answersList} showsVerticalScrollIndicator={false}>
                <View>
                  {Array.isArray(answers) && answers.map((answer, idx) => (
                    <View key={`answer-${answer.question_id || idx}-${idx}`}>
                      {renderAnswerCard(answer)}
                    </View>
                  ))}
                </View>
              </ScrollView>
            ) : (
              <ScrollView style={styles.answersList} showsVerticalScrollIndicator={false}>
                <View style={styles.emptyContainer}>
                  <Ionicons name="documents" size={48} color={COLORS.textSecondary} />
                  <Text style={styles.emptyText}>No answer records found</Text>
                  <Text style={styles.emptySubtext}>
                    Answers will appear here once you complete a session.
                  </Text>
                </View>
              </ScrollView>
            )}
          </View>
        )}
      </View>
    </Modal>
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
    paddingHorizontal: 0,
    paddingVertical: 8,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerButtons: {
    width: 50,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.text,
    flex: 1,
    textAlign: "center",
    paddingHorizontal: 8,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  summarySection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  summaryCard: {
    flexDirection: "row",
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    ...SHADOWS.card,
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
    fontWeight: "700",
  },
  divider: {
    width: 1,
    backgroundColor: COLORS.border,
  },
  answersList: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  answerCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    ...SHADOWS.card,
  },
  answerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  questionNumber: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: "rgba(0,0,0,0.05)",
    borderRadius: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  timeSpent: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  questionSection: {
    marginBottom: 12,
  },
  questionLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: "600",
    marginBottom: 4,
  },
  questionText: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
  },
  answerSection: {
    marginBottom: 12,
  },
  answerLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: "600",
    marginBottom: 4,
  },
  correctLabel: {
    fontSize: 12,
    color: COLORS.success,
    fontWeight: "600",
    marginBottom: 4,
  },
  answerBox: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    backgroundColor: "transparent",
  },
  answerText: {
    fontSize: 13,
    fontWeight: "500",
  },
  explanationSection: {
    marginBottom: 8,
    padding: 10,
    backgroundColor: "rgba(255, 193, 7, 0.1)",
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#FFC107",
  },
  explanationLabel: {
    fontSize: 12,
    color: "#F57C00",
    fontWeight: "600",
    marginBottom: 4,
  },
  explanationText: {
    fontSize: 12,
    color: COLORS.text,
    lineHeight: 18,
  },
  questionType: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontStyle: "italic",
  },
  questionTypeRow: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border || "#e0e0e0",
  },
  optionsSection: {
    marginTop: 12,
    padding: 10,
    backgroundColor: "rgba(0, 0, 0, 0.03)",
    borderRadius: 8,
  },
  optionsLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: "600",
    marginBottom: 6,
  },
  optionText: {
    fontSize: 12,
    color: COLORS.text,
    lineHeight: 18,
    marginBottom: 4,
  },
  smallText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontStyle: "italic",
    marginTop: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.textSecondary,
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 6,
    textAlign: "center",
  },
});
