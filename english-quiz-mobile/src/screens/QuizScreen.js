import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
  Animated,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useUser } from "../context/UserContext";
import { getTopics, startQuiz, submitAnswer } from "../services/api";
import {
  initializeLearningSession,
  updateLearningProgress,
  completeLearningSessionLocally,
} from "../services/learningProgressTracker";
import {
  COLORS,
  SHADOWS,
  APP_CONFIG,
  getScoreColor,
  getGradeInfo,
} from "../constants/config";
import {
  useNotification,
  CompletionNotification,
} from "../components/NotificationCenter";

const { width } = Dimensions.get("window");

// Quiz States
const STATES = {
  SETUP: "setup",
  LOADING: "loading",
  QUESTION: "question",
  FEEDBACK: "feedback",
  RESULTS: "results",
};

export default function QuizScreen({ navigation }) {
  const { userId } = useUser();
  const { showNotification } = useNotification();

  // Setup state
  const [topics, setTopics] = useState([]);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [questionCount, setQuestionCount] = useState(
    APP_CONFIG.defaultQuestionsCount,
  );
  const [showTopicPicker, setShowTopicPicker] = useState(false);

  // Quiz state
  const [quizState, setQuizState] = useState(STATES.SETUP);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [questionNumber, setQuestionNumber] = useState(1);
  const [totalQuestions, setTotalQuestions] = useState(5);
  const [answer, setAnswer] = useState("");
  const [evaluation, setEvaluation] = useState(null);
  const [finalResults, setFinalResults] = useState(null);
  const [progress, setProgress] = useState({
    current_score: 0,
    max_possible_score: 0,
  });

  // Learning tracking state
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [correctAnswersCount, setCorrectAnswersCount] = useState(0);

  // Loading and error states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Animation
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fetchTopics();
    animateIn();
  }, []);

  // Trigger notification when quiz completes
  useEffect(() => {
    if (finalResults && quizState === STATES.RESULTS) {
      showNotification(
        "success",
        "🎉 Quiz Complete!",
        `${Math.round(finalResults.percentage || 0)}% accuracy - Great work!`,
        3000,
      );
    }
  }, [finalResults, quizState]);

  const animateIn = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const fetchTopics = async () => {
    try {
      const response = await getTopics();
      setTopics(response.data || []);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleStartQuiz = async () => {
    if (!selectedTopic) {
      alert("Please select a topic");
      return;
    }

    try {
      setQuizState(STATES.LOADING);
      setError(null);

      // Initialize learning session tracking
      console.log(
        "[QuizScreen] Initializing learning session for:",
        selectedTopic.topic_id,
      );
      const sessionId = await initializeLearningSession(
        userId,
        selectedTopic.topic_id,
        selectedTopic.title,
        "quiz",
      );
      setCurrentSessionId(sessionId);
      setCorrectAnswersCount(0);
      console.log("[QuizScreen] Learning session initialized:", sessionId);

      const response = await startQuiz(
        userId,
        selectedTopic.topic_id,
        questionCount,
      );

      setCurrentQuestion(response.question);
      setQuestionNumber(response.question_number);
      setTotalQuestions(response.total_questions);
      setProgress({ current_score: 0, max_possible_score: 0 });
      setQuizState(STATES.QUESTION);
      animateIn();
    } catch (err) {
      console.error("[QuizScreen] Error starting quiz:", err);
      setError(err.message);
      setQuizState(STATES.SETUP);
    }
  };

  const handleSubmitAnswer = async () => {
    if (!answer.trim()) {
      alert("Please enter an answer");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await submitAnswer(
        userId,
        selectedTopic.topic_id,
        answer,
      );

      setEvaluation(response.evaluation);

      // Update correct answer count
      if (response.is_correct) {
        setCorrectAnswersCount((prev) => prev + 1);
      }

      // Update learning progress
      if (currentSessionId) {
        const newScore = response.is_correct
          ? (progress.current_score || 0) + 1
          : progress.current_score || 0;
        console.log(
          "[QuizScreen] Updating progress: Q",
          questionNumber,
          "Correct:",
          correctAnswersCount + (response.is_correct ? 1 : 0),
          "Score:",
          newScore,
        );
        await updateLearningProgress(
          userId,
          selectedTopic.topic_id,
          "quiz",
          questionNumber,
          correctAnswersCount + (response.is_correct ? 1 : 0),
          newScore,
          response.total_questions || questionCount,
        );
      }

      if (response.status === "completed") {
        setFinalResults(response.final_results);
        setQuizState(STATES.FEEDBACK);

        // Complete learning session
        if (currentSessionId) {
          console.log(
            "[QuizScreen] Completing learning session:",
            currentSessionId,
          );
          await completeLearningSessionLocally(
            userId,
            selectedTopic.topic_id,
            "quiz",
            response.final_results?.total_score || newScore,
            response.final_results?.max_possible_score ||
              response.total_questions ||
              questionCount,
          );
        }
      } else {
        setProgress(response.progress);
        setQuizState(STATES.FEEDBACK);
        setCurrentQuestion(response.next_question);
        setQuestionNumber(response.question_number);
      }
      animateIn();
    } catch (err) {
      console.error("[QuizScreen] Error submitting answer:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = () => {
    if (finalResults) {
      setQuizState(STATES.RESULTS);
    } else {
      setAnswer("");
      setEvaluation(null);
      setQuizState(STATES.QUESTION);
    }
    animateIn();
  };

  const handleRestart = () => {
    // Clean up session if restarting
    if (currentSessionId) {
      console.log("[QuizScreen] Clearing session:", currentSessionId);
      // Don't call completeLearningSessionLocally here since quiz wasn't finished
    }

    setQuizState(STATES.SETUP);
    setCurrentQuestion(null);
    setCurrentSessionId(null);
    setCorrectAnswersCount(0);
    setAnswer("");
    setEvaluation(null);
    setFinalResults(null);
    setProgress({ current_score: 0, max_possible_score: 0 });
    animateIn();
  };

  // Render Setup Screen
  const renderSetup = () => (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Animated.View
        style={{ opacity: fadeAnim, transform: [{ scale: scaleAnim }] }}
      >
        {/* Header */}
        <View style={styles.setupHeader}>
          <View style={styles.setupIconContainer}>
            <Text style={styles.setupEmoji}>🎯</Text>
          </View>
          <Text style={styles.setupTitle}>Quiz Setup</Text>
          <Text style={styles.setupSubtitle}>
            Choose your topic and get started!
          </Text>
        </View>

        {/* Setup Card */}
        <View style={styles.setupCard}>
          {/* Topic Selection */}
          <Text style={styles.label}>Select Topic</Text>
          <TouchableOpacity
            style={styles.pickerButton}
            onPress={() => setShowTopicPicker(true)}
            activeOpacity={0.8}
          >
            <View style={styles.pickerIconContainer}>
              <Ionicons name="book" size={18} color={COLORS.primary} />
            </View>
            <Text
              style={[styles.pickerText, !selectedTopic && styles.placeholder]}
            >
              {selectedTopic ? selectedTopic.title : "Choose a topic"}
            </Text>
            <View style={styles.pickerChevron}>
              <Ionicons
                name="chevron-down"
                size={18}
                color={COLORS.textMuted}
              />
            </View>
          </TouchableOpacity>

          {/* Question Count */}
          <Text style={[styles.label, { marginTop: 24 }]}>
            Number of Questions
          </Text>
          <View style={styles.countContainer}>
            <TouchableOpacity
              style={styles.countButton}
              onPress={() =>
                setQuestionCount(
                  Math.max(APP_CONFIG.minQuestionsCount, questionCount - 1),
                )
              }
              activeOpacity={0.8}
            >
              <Ionicons name="remove" size={22} color="#fff" />
            </TouchableOpacity>
            <View style={styles.countDisplay}>
              <Text style={styles.countText}>{questionCount}</Text>
              <Text style={styles.countLabel}>questions</Text>
            </View>
            <TouchableOpacity
              style={[styles.countButton, styles.countButtonAdd]}
              onPress={() =>
                setQuestionCount(
                  Math.min(APP_CONFIG.maxQuestionsCount, questionCount + 1),
                )
              }
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={22} color="#fff" />
            </TouchableOpacity>
          </View>

          {error && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={18} color={COLORS.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[
              styles.startButton,
              !selectedTopic && styles.startButtonDisabled,
            ]}
            onPress={handleStartQuiz}
            disabled={!selectedTopic}
            activeOpacity={0.9}
          >
            <Text style={styles.startButtonText}>Begin Quiz</Text>
            <Ionicons name="arrow-forward" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Topic Picker Modal */}
        <Modal
          visible={showTopicPicker}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowTopicPicker(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHandle} />
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Topic</Text>
                <TouchableOpacity
                  onPress={() => setShowTopicPicker(false)}
                  style={styles.modalClose}
                >
                  <Ionicons
                    name="close"
                    size={22}
                    color={COLORS.textSecondary}
                  />
                </TouchableOpacity>
              </View>
              <ScrollView
                style={styles.topicList}
                showsVerticalScrollIndicator={false}
              >
                {topics.map((topic, index) => (
                  <TouchableOpacity
                    key={topic.topic_id}
                    style={[
                      styles.topicItem,
                      selectedTopic?.topic_id === topic.topic_id &&
                        styles.topicItemSelected,
                    ]}
                    onPress={() => {
                      setSelectedTopic(topic);
                      setShowTopicPicker(false);
                    }}
                    activeOpacity={0.8}
                  >
                    <View
                      style={[
                        styles.topicIcon,
                        { backgroundColor: getTopicColor(index) },
                      ]}
                    >
                      <Text style={styles.topicIconText}>
                        {topic.title.charAt(0)}
                      </Text>
                    </View>
                    <View style={styles.topicInfo}>
                      <Text style={styles.topicItemText}>{topic.title}</Text>
                      {topic.metadata?.difficulty && (
                        <Text style={styles.topicDifficulty}>
                          {topic.metadata.difficulty}
                        </Text>
                      )}
                    </View>
                    {selectedTopic?.topic_id === topic.topic_id && (
                      <View style={styles.topicCheck}>
                        <Ionicons name="checkmark" size={18} color="#fff" />
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </Animated.View>
    </ScrollView>
  );

  // Render Loading Screen
  const renderLoading = () => (
    <View style={styles.centerContainer}>
      <View style={styles.loadingCard}>
        <View style={styles.loadingIconContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
        <Text style={styles.loadingTitle}>Preparing Your Quiz</Text>
        <Text style={styles.loadingText}>AI is crafting your questions...</Text>
      </View>
    </View>
  );

  // Render Question Screen
  const renderQuestion = () => (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Animated.View
        style={{ opacity: fadeAnim, transform: [{ scale: scaleAnim }] }}
      >
        {/* Progress Section */}
        <View style={styles.progressSection}>
          <View style={styles.progressInfo}>
            <Text style={styles.progressLabel}>Question</Text>
            <Text style={styles.progressNumbers}>
              <Text style={styles.currentNumber}>{questionNumber}</Text>
              <Text style={styles.totalNumber}>/{totalQuestions}</Text>
            </Text>
          </View>
          <View style={styles.scoreInfo}>
            <Ionicons name="star" size={18} color={COLORS.accent} />
            <Text style={styles.scoreInfoText}>
              {progress.current_score} pts
            </Text>
          </View>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressBarContainer}>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${((questionNumber - 1) / totalQuestions) * 100}%` },
              ]}
            />
          </View>
        </View>

        {/* Question Card */}
        <View style={styles.questionCard}>
          <View style={styles.questionBadge}>
            <Text style={styles.questionBadgeText}>Q{questionNumber}</Text>
          </View>
          <Text style={styles.questionText}>{currentQuestion}</Text>
        </View>

        {/* Answer Input */}
        <View style={styles.answerSection}>
          <Text style={styles.answerLabel}>Your Answer</Text>
          <View style={styles.answerInputContainer}>
            <TextInput
              style={styles.answerInput}
              placeholder="Type your answer here..."
              placeholderTextColor={COLORS.textMuted}
              value={answer}
              onChangeText={setAnswer}
              multiline
              numberOfLines={4}
            />
          </View>
        </View>

        {error && (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={18} color={COLORS.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmitAnswer}
          disabled={loading}
          activeOpacity={0.9}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={styles.submitButtonText}>Submit Answer</Text>
              <Ionicons name="send" size={18} color="#fff" />
            </>
          )}
        </TouchableOpacity>
      </Animated.View>
    </ScrollView>
  );

  // Render Feedback Screen
  const renderFeedback = () => {
    const scoreColor = getScoreColor(evaluation?.score || 0);
    const score = evaluation?.score || 0;

    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
      >
        <Animated.View
          style={{ opacity: fadeAnim, transform: [{ scale: scaleAnim }] }}
        >
          {/* Score Display */}
          <View style={styles.feedbackHeader}>
            <View style={[styles.scoreBadge, { backgroundColor: scoreColor }]}>
              <Text style={styles.scoreBadgeNumber}>{score}</Text>
              <Text style={styles.scoreBadgeMax}>/5</Text>
            </View>
            <Text style={styles.feedbackTitle}>
              {score === 5
                ? "Perfect! 🎉"
                : score >= 3
                  ? "Good job! 👍"
                  : "Keep going! 💪"}
            </Text>
          </View>

          {/* Feedback Card */}
          <View style={styles.feedbackCard}>
            {evaluation?.feedback?.summary && (
              <Text style={styles.feedbackSummary}>
                {evaluation.feedback.summary}
              </Text>
            )}

            {evaluation?.feedback?.explanation && (
              <Text style={styles.feedbackExplanation}>
                {evaluation.feedback.explanation}
              </Text>
            )}

            {evaluation?.feedback?.correct_answer && (
              <View style={styles.feedbackSection}>
                <View style={styles.feedbackSectionHeader}>
                  <View
                    style={[
                      styles.feedbackIcon,
                      { backgroundColor: "rgba(0, 184, 148, 0.1)" },
                    ]}
                  >
                    <Ionicons
                      name="checkmark-circle"
                      size={16}
                      color={COLORS.success}
                    />
                  </View>
                  <Text style={styles.feedbackLabel}>Correct Answer</Text>
                </View>
                <Text style={styles.feedbackValue}>
                  {evaluation.feedback.correct_answer}
                </Text>
              </View>
            )}

            {evaluation?.feedback?.grammar_tip && (
              <View style={styles.feedbackSection}>
                <View style={styles.feedbackSectionHeader}>
                  <View
                    style={[
                      styles.feedbackIcon,
                      { backgroundColor: "rgba(253, 203, 110, 0.1)" },
                    ]}
                  >
                    <Ionicons name="bulb" size={16} color={COLORS.accent} />
                  </View>
                  <Text style={styles.feedbackLabel}>Grammar Tip</Text>
                </View>
                <Text style={styles.feedbackValue}>
                  {evaluation.feedback.grammar_tip}
                </Text>
              </View>
            )}

            {evaluation?.feedback?.example && (
              <View style={styles.feedbackSection}>
                <View style={styles.feedbackSectionHeader}>
                  <View
                    style={[
                      styles.feedbackIcon,
                      { backgroundColor: "rgba(116, 185, 255, 0.1)" },
                    ]}
                  >
                    <Ionicons
                      name="document-text"
                      size={16}
                      color={COLORS.info}
                    />
                  </View>
                  <Text style={styles.feedbackLabel}>Example</Text>
                </View>
                <Text style={styles.feedbackExample}>
                  "{evaluation.feedback.example}"
                </Text>
              </View>
            )}
          </View>

          {/* Continue Button */}
          <TouchableOpacity
            style={styles.continueButton}
            onPress={handleContinue}
            activeOpacity={0.9}
          >
            <Text style={styles.continueButtonText}>
              {finalResults ? "See Results" : "Next Question"}
            </Text>
            <Ionicons name="arrow-forward" size={20} color="#fff" />
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    );
  };

  // Render Results Screen
  const renderResults = () => {
    const gradeInfo = getGradeInfo(finalResults?.percentage || 0);
    const percentage = finalResults?.percentage || 0;

    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
      >
        <Animated.View
          style={{ opacity: fadeAnim, transform: [{ scale: scaleAnim }] }}
        >
          {/* Celebration Header */}
          <View style={styles.resultsHeader}>
            <Text style={styles.celebrationEmoji}>{gradeInfo.emoji}</Text>
            <Text style={styles.resultsTitle}>{gradeInfo.label}</Text>
            <Text style={styles.resultsSubtitle}>Quiz Completed!</Text>
          </View>

          {/* Score Circle */}
          <View style={styles.scoreCircleContainer}>
            <View
              style={[styles.scoreCircle, { borderColor: gradeInfo.color }]}
            >
              <Text
                style={[styles.scorePercentage, { color: gradeInfo.color }]}
              >
                {percentage}%
              </Text>
              <Text style={styles.gradeText}>Grade {finalResults?.grade}</Text>
            </View>
          </View>

          {/* Stats Card */}
          <View style={styles.statsCard}>
            <Text style={styles.statsTitle}>Performance Summary</Text>

            <View style={styles.statRow}>
              <View style={styles.statInfo}>
                <View
                  style={[
                    styles.statIcon,
                    { backgroundColor: "rgba(78, 205, 196, 0.1)" },
                  ]}
                >
                  <Ionicons
                    name="help-circle"
                    size={18}
                    color={COLORS.secondary}
                  />
                </View>
                <Text style={styles.statLabel}>Total Questions</Text>
              </View>
              <Text style={styles.statValue}>
                {finalResults?.performance?.total_questions}
              </Text>
            </View>

            <View style={styles.statRow}>
              <View style={styles.statInfo}>
                <View
                  style={[
                    styles.statIcon,
                    { backgroundColor: "rgba(0, 184, 148, 0.1)" },
                  ]}
                >
                  <Ionicons name="star" size={18} color={COLORS.scorePerfect} />
                </View>
                <Text style={styles.statLabel}>Perfect Answers</Text>
              </View>
              <Text style={[styles.statValue, { color: COLORS.scorePerfect }]}>
                {finalResults?.performance?.perfect_answers}
              </Text>
            </View>

            <View style={styles.statRow}>
              <View style={styles.statInfo}>
                <View
                  style={[
                    styles.statIcon,
                    { backgroundColor: "rgba(85, 239, 196, 0.1)" },
                  ]}
                >
                  <Ionicons
                    name="thumbs-up"
                    size={18}
                    color={COLORS.scoreGreat}
                  />
                </View>
                <Text style={styles.statLabel}>Good Answers</Text>
              </View>
              <Text style={[styles.statValue, { color: COLORS.scoreGreat }]}>
                {finalResults?.performance?.good_answers}
              </Text>
            </View>

            <View style={styles.statRow}>
              <View style={styles.statInfo}>
                <View
                  style={[
                    styles.statIcon,
                    { backgroundColor: "rgba(255, 217, 61, 0.1)" },
                  ]}
                >
                  <Ionicons name="trophy" size={18} color={COLORS.accent} />
                </View>
                <Text style={styles.statLabel}>Total Score</Text>
              </View>
              <Text style={styles.statValue}>
                {finalResults?.total_score}/{finalResults?.max_possible_score}
              </Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.resultActions}>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={handleRestart}
              activeOpacity={0.8}
            >
              <Ionicons name="refresh" size={20} color={COLORS.primary} />
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.homeButton}
              onPress={() => navigation.navigate("Home")}
              activeOpacity={0.9}
            >
              <Ionicons name="home" size={20} color="#fff" />
              <Text style={styles.homeButtonText}>Home</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </ScrollView>
    );
  };

  // Main render switch
  switch (quizState) {
    case STATES.LOADING:
      return renderLoading();
    case STATES.QUESTION:
      return renderQuestion();
    case STATES.FEEDBACK:
      return renderFeedback();
    case STATES.RESULTS:
      return renderResults();
    default:
      return renderSetup();
  }
}

const getTopicColor = (index) => {
  const colors = [
    "rgba(255, 107, 107, 0.15)",
    "rgba(78, 205, 196, 0.15)",
    "rgba(255, 217, 61, 0.15)",
    "rgba(162, 155, 254, 0.15)",
    "rgba(255, 159, 67, 0.15)",
    "rgba(116, 185, 255, 0.15)",
  ];
  return colors[index % colors.length];
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
    padding: 20,
  },

  // Setup styles
  setupHeader: {
    alignItems: "center",
    marginBottom: 24,
  },
  setupIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: COLORS.card,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    ...SHADOWS.medium,
  },
  setupEmoji: {
    fontSize: 36,
  },
  setupTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 6,
  },
  setupSubtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  setupCard: {
    backgroundColor: COLORS.card,
    borderRadius: 24,
    padding: 24,
    ...SHADOWS.medium,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textSecondary,
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  pickerButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.background,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  pickerIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(255, 107, 107, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  pickerText: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text,
    fontWeight: "500",
  },
  placeholder: {
    color: COLORS.textMuted,
  },
  pickerChevron: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: COLORS.backgroundDark,
    justifyContent: "center",
    alignItems: "center",
  },
  countContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 20,
    paddingVertical: 8,
  },
  countButton: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    ...SHADOWS.small,
  },
  countButtonAdd: {
    backgroundColor: COLORS.secondary,
  },
  countDisplay: {
    alignItems: "center",
    minWidth: 80,
  },
  countText: {
    fontSize: 40,
    fontWeight: "700",
    color: COLORS.text,
  },
  countLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: -4,
  },
  startButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    padding: 18,
    marginTop: 24,
    gap: 10,
    ...SHADOWS.small,
  },
  startButtonDisabled: {
    backgroundColor: COLORS.textMuted,
  },
  startButtonText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#fff",
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 107, 107, 0.1)",
    borderRadius: 12,
    padding: 14,
    marginTop: 16,
    gap: 10,
  },
  errorText: {
    flex: 1,
    color: COLORS.error,
    fontSize: 14,
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: "75%",
    paddingBottom: 20,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 12,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.text,
  },
  modalClose: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.background,
    justifyContent: "center",
    alignItems: "center",
  },
  topicList: {
    padding: 16,
  },
  topicItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 16,
    marginBottom: 10,
    backgroundColor: COLORS.background,
    borderWidth: 2,
    borderColor: "transparent",
  },
  topicItemSelected: {
    borderColor: COLORS.primary,
    backgroundColor: "rgba(255, 107, 107, 0.05)",
  },
  topicIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  topicIconText: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text,
  },
  topicInfo: {
    flex: 1,
  },
  topicItemText: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
  },
  topicDifficulty: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
    textTransform: "capitalize",
  },
  topicCheck: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
  },

  // Loading styles
  loadingCard: {
    backgroundColor: COLORS.card,
    borderRadius: 24,
    padding: 40,
    alignItems: "center",
    width: "100%",
    maxWidth: 320,
    ...SHADOWS.medium,
  },
  loadingIconContainer: {
    marginBottom: 20,
  },
  loadingTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 8,
  },
  loadingText: {
    fontSize: 15,
    color: COLORS.textSecondary,
  },

  // Question styles
  progressSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  progressInfo: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8,
  },
  progressLabel: {
    fontSize: 15,
    color: COLORS.textSecondary,
    fontWeight: "500",
  },
  progressNumbers: {
    fontSize: 15,
  },
  currentNumber: {
    fontSize: 22,
    fontWeight: "700",
    color: COLORS.text,
  },
  totalNumber: {
    fontSize: 16,
    color: COLORS.textMuted,
    fontWeight: "500",
  },
  scoreInfo: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 217, 61, 0.15)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 6,
  },
  scoreInfoText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
  },
  progressBarContainer: {
    marginBottom: 24,
  },
  progressBar: {
    height: 8,
    backgroundColor: COLORS.border,
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: COLORS.primary,
    borderRadius: 4,
  },
  questionCard: {
    backgroundColor: COLORS.card,
    borderRadius: 24,
    padding: 24,
    marginBottom: 20,
    ...SHADOWS.medium,
  },
  questionBadge: {
    alignSelf: "flex-start",
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 10,
    marginBottom: 16,
  },
  questionBadgeText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#fff",
  },
  questionText: {
    fontSize: 20,
    fontWeight: "600",
    color: COLORS.text,
    lineHeight: 30,
  },
  answerSection: {
    marginBottom: 20,
  },
  answerLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textSecondary,
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  answerInputContainer: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: COLORS.border,
    ...SHADOWS.small,
  },
  answerInput: {
    padding: 18,
    fontSize: 16,
    color: COLORS.text,
    minHeight: 120,
    textAlignVertical: "top",
  },
  submitButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    padding: 18,
    gap: 10,
    ...SHADOWS.small,
  },
  submitButtonDisabled: {
    backgroundColor: COLORS.textMuted,
  },
  submitButtonText: {
    fontSize: 17,
    fontWeight: "600",
    color: "#fff",
  },

  // Feedback styles
  feedbackHeader: {
    alignItems: "center",
    marginBottom: 24,
  },
  scoreBadge: {
    flexDirection: "row",
    alignItems: "baseline",
    paddingHorizontal: 28,
    paddingVertical: 16,
    borderRadius: 20,
    marginBottom: 16,
    ...SHADOWS.medium,
  },
  scoreBadgeNumber: {
    fontSize: 42,
    fontWeight: "700",
    color: "#fff",
  },
  scoreBadgeMax: {
    fontSize: 22,
    fontWeight: "600",
    color: "rgba(255,255,255,0.8)",
  },
  feedbackTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: COLORS.text,
  },
  feedbackCard: {
    backgroundColor: COLORS.card,
    borderRadius: 24,
    padding: 24,
    marginBottom: 24,
    ...SHADOWS.medium,
  },
  feedbackSummary: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 12,
  },
  feedbackExplanation: {
    fontSize: 16,
    color: COLORS.textSecondary,
    lineHeight: 24,
  },
  feedbackSection: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  feedbackSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    gap: 10,
  },
  feedbackIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  feedbackLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  feedbackValue: {
    fontSize: 16,
    color: COLORS.text,
    lineHeight: 24,
  },
  feedbackExample: {
    fontSize: 16,
    color: COLORS.text,
    fontStyle: "italic",
    lineHeight: 24,
  },
  continueButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    padding: 18,
    gap: 10,
    ...SHADOWS.small,
  },
  continueButtonText: {
    fontSize: 17,
    fontWeight: "600",
    color: "#fff",
  },

  // Results styles
  resultsHeader: {
    alignItems: "center",
    marginBottom: 24,
  },
  celebrationEmoji: {
    fontSize: 64,
    marginBottom: 12,
  },
  resultsTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 4,
  },
  resultsSubtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  scoreCircleContainer: {
    alignItems: "center",
    marginBottom: 24,
  },
  scoreCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: COLORS.card,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 6,
    ...SHADOWS.medium,
  },
  scorePercentage: {
    fontSize: 44,
    fontWeight: "700",
  },
  gradeText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    fontWeight: "600",
  },
  statsCard: {
    backgroundColor: COLORS.card,
    borderRadius: 24,
    padding: 24,
    marginBottom: 24,
    ...SHADOWS.medium,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 20,
  },
  statRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  statInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  statLabel: {
    fontSize: 15,
    color: COLORS.textSecondary,
  },
  statValue: {
    fontSize: 17,
    fontWeight: "700",
    color: COLORS.text,
  },
  resultActions: {
    flexDirection: "row",
    gap: 12,
  },
  retryButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 18,
    gap: 8,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.primary,
  },
  homeButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    padding: 18,
    gap: 8,
    ...SHADOWS.small,
  },
  homeButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
});
