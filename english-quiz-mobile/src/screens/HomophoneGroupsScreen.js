import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Animated,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Speech from "expo-speech";
import { useUser } from "../context/UserContext";
import {
  startHomophoneGroupsSession,
  startHomophoneGroups,
  submitHomophoneGroupsAnswer,
  completeHomophoneGroupsSession,
  deleteHomophoneGroupsSession,
} from "../services/api";
import { COLORS, SHADOWS } from "../constants/config";

const STATES = {
  SETUP: "setup",
  LOADING: "loading",
  LISTENING: "listening",
  ANSWERED: "answered",
  RESULTS: "results",
  ERROR: "error",
};

const QUESTION_OPTIONS = [5, 10, 15, 20];

export default function HomophoneGroupsScreen({ navigation }) {
  const { userId } = useUser();

  // Setup state
  const [selectedQuestionCount, setSelectedQuestionCount] = useState(null);

  // Quiz state
  const [state, setState] = useState(STATES.SETUP);
  const [question, setQuestion] = useState(null);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [result, setResult] = useState(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState(null);

  // Learning session state
  const [sessionId, setSessionId] = useState(null);
  const [correctAnswersCount, setCorrectAnswersCount] = useState(0);
  const [totalAnswersCount, setTotalAnswersCount] = useState(0);

  // Flag to prevent navigation loop when intentionally exiting
  const isIntentionalExitRef = useRef(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    console.log("[HomophoneGroupsScreen] Mounted - state:", state, "userId:", userId);
    animateIn(); // Trigger animation on mount
    return () => Speech.stop();
  }, []);

  /**
   * Exit handling (HYBRID 70% rule)
   * Show confirmation dialog when user tries to exit
   */
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      // If user intentionally exiting (after confirming), allow navigation
      if (isIntentionalExitRef.current) {
        console.log('[HomophoneGroupsScreen] Allowing intentional exit');
        isIntentionalExitRef.current = false; // Reset flag
        return;
      }

      // Only handle if session is in progress
      if (!sessionId || state === STATES.SETUP || state === STATES.RESULTS) {
        return; // Allow normal navigation
      }

      // Prevent navigation and show dialog instead
      e.preventDefault();
      handleConfirmExit();
    });

    return unsubscribe;
  }, [navigation, sessionId, state, totalAnswersCount, selectedQuestionCount, userId]);

  /**
   * Confirm exit dialog with HYBRID 70% rule
   */
  const handleConfirmExit = () => {
    const total = selectedQuestionCount || 0;
    const threshold = total * 0.7;
    const isEnough = totalAnswersCount >= threshold;

    console.log(`[HomophoneGroupsScreen] Confirm exit - answered: ${totalAnswersCount}/${total} (threshold: ${threshold}, isEnough: ${isEnough})`);

    if (isEnough) {
      // CASE 1: ≥ 70% → Offer to save session
      Alert.alert(
        "Confirm Exit",
        `You have completed ${totalAnswersCount} of ${total} questions (${Math.round((totalAnswersCount / total) * 100)}%). Do you want to save your progress?`,
        [
          {
            text: "Continue",
            style: "cancel",
            onPress: () => console.log("[HomophoneGroupsScreen] Continue session"),
          },
          {
            text: "End Session",
            style: "default",
            onPress: async () => {
              try {
                console.log("[HomophoneGroupsScreen] Completing session before exit");
                await completeHomophoneGroupsSession(sessionId, userId);
                console.log("[HomophoneGroupsScreen] Session completed, setting exit flag");
                isIntentionalExitRef.current = true; // Mark as intentional exit
                navigation.goBack();
              } catch (err) {
                console.error("[HomophoneGroupsScreen] Error completing session:", err);
                isIntentionalExitRef.current = true; // Still exit even on error
                navigation.goBack();
              }
            },
          },
        ]
      );
    } else {
      // CASE 2: < 70% → Warn about data loss
      Alert.alert(
        "Incomplete Session",
        `You have only completed ${totalAnswersCount} of ${total} questions (${Math.round((totalAnswersCount / total) * 100)}%). If you exit now, your progress will NOT be saved.`,
        [
          {
            text: "Continue Studying",
            style: "cancel",
            onPress: () => console.log("[HomophoneGroupsScreen] Continue session"),
          },
          {
            text: "Exit",
            style: "destructive",
            onPress: async () => {
              try {
                console.log("[HomophoneGroupsScreen] Deleting incomplete session");
                await deleteHomophoneGroupsSession(sessionId, userId);
                console.log("[HomophoneGroupsScreen] Session deleted, setting exit flag");
                isIntentionalExitRef.current = true; // Mark as intentional exit
                navigation.goBack();
              } catch (err) {
                console.warn("[HomophoneGroupsScreen] Error deleting session:", err);
                isIntentionalExitRef.current = true; // Still exit even on error
                navigation.goBack();
              }
            },
          },
        ]
      );
    }
  };

  const animateIn = () => {
    fadeAnim.setValue(0);
    scaleAnim.setValue(0.95);
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, tension: 50, friction: 7, useNativeDriver: true }),
    ]).start();
  };

  const handleStartSession = async (questionCount) => {
    try {
      setState(STATES.LOADING);
      setSelectedQuestionCount(questionCount);
      setCorrectAnswersCount(0);
      setTotalAnswersCount(0);
      setError(null);

      // Initialize learning session
      const sessionResponse = await startHomophoneGroupsSession(userId);
      setSessionId(sessionResponse.session_id);
      console.log("[HomophoneGroupsScreen] Session initialized:", sessionResponse.session_id);

      // Load first question
      await loadQuestion();
    } catch (err) {
      setError(err.message);
      setState(STATES.ERROR);
    }
  };

  const loadQuestion = async () => {
    try {
      setState(STATES.LOADING);
      setSelectedAnswer(null);
      setResult(null);
      setError(null);
      Speech.stop();

      const data = await startHomophoneGroups();
      setQuestion(data);
      setState(STATES.LISTENING);
      animateIn();

      // Auto-speak on load
      setTimeout(() => speakSentence(data.sentence, data.correctAnswerForAudio), 600);
    } catch (err) {
      setError(err.message);
      setState(STATES.ERROR);
    }
  };

  const speakSentence = (sentence, correctAnswer) => {
    Speech.stop();
    setIsSpeaking(true);
    
    // Replace blank marker with correct answer for natural audio playback
    // e.g., "I can _____ you" + "hear" → "I can hear you"
    const sentenceForAudio = sentence.replace(/_____|<blank>|\[blank\]/gi, correctAnswer);
    
    Speech.speak(sentenceForAudio, {
      language: "en-US",
      rate: 0.85,
      pitch: 1.0,
      onDone: () => setIsSpeaking(false),
      onError: () => setIsSpeaking(false),
    });
  };

  const handleAnswer = async (chosenWord) => {
    if (state !== STATES.LISTENING || !question) return;
    Speech.stop();
    setSelectedAnswer(chosenWord);

    try {
      const data = await submitHomophoneGroupsAnswer(
        question.question_id,
        chosenWord,
        sessionId,
        userId
      );
      setResult(data);
      setState(STATES.ANSWERED);

      // Update answer counts
      const newTotalAnswers = totalAnswersCount + 1;
      const newCorrectAnswers = data.is_correct ? correctAnswersCount + 1 : correctAnswersCount;
      
      setTotalAnswersCount(newTotalAnswers);
      if (data.is_correct) {
        setCorrectAnswersCount(newCorrectAnswers);
      }

      // AUTO-COMPLETE: Check if finished all questions (MANDATORY)
      if (newTotalAnswers >= selectedQuestionCount) {
        console.log(`[HomophoneGroupsScreen] ✅ All ${selectedQuestionCount} questions answered - AUTO COMPLETING`);
        
        // Wait 1.5s for visual feedback, then auto-complete
        setTimeout(async () => {
          try {
            await completeHomophoneGroupsSession(sessionId, userId);
            console.log("[HomophoneGroupsScreen] Session auto-completed");
          } catch (err) {
            console.error("[HomophoneGroupsScreen] Auto-complete error:", err);
          }
          
          // Navigate to RESULTS
          setState(STATES.RESULTS);
          animateIn();
        }, 1500);
      }
    } catch (err) {
      setError(err.message);
      setState(STATES.ERROR);
    }
  };

  const handleCompleteSession = async () => {
    try {
      if (sessionId) {
        // Session likely already completed by auto-complete
        // But re-confirm completion (idempotent - MongoDB won't double-save completed sessions)
        try {
          await completeHomophoneGroupsSession(sessionId, userId);
          console.log("[HomophoneGroupsScreen] Session completion confirmed");
        } catch (err) {
          // May be already completed, ignore
          console.warn("[HomophoneGroupsScreen] Completion error (may already be completed):", err.message);
        }
      }
      navigation.goBack();
    } catch (err) {
      console.error("[HomophoneGroupsScreen] Error completing session:", err);
      navigation.goBack();
    }
  };

  /**
   * Handle End button press - show confirm dialog
   */
  const handleEndPress = () => {
    handleConfirmExit();
  };

  const handleRestart = () => {
    setSelectedQuestionCount(null);
    setState(STATES.SETUP);
    setQuestion(null);
    setSessionId(null);
    setCorrectAnswersCount(0);
    setTotalAnswersCount(0);
    setSelectedAnswer(null);
    setResult(null);
    setError(null);
    animateIn();
  };

  const getChoiceStyle = (word) => {
    if (state !== STATES.ANSWERED) return styles.choiceButton;
    if (word === result?.correct_answer) return [styles.choiceButton, styles.choiceCorrect];
    if (word === selectedAnswer && !result?.is_correct) return [styles.choiceButton, styles.choiceWrong];
    return [styles.choiceButton, styles.choiceDim];
  };

  const getChoiceTextStyle = (word) => {
    if (state !== STATES.ANSWERED) return styles.choiceText;
    if (word === result?.correct_answer) return [styles.choiceText, styles.choiceTextCorrect];
    if (word === selectedAnswer && !result?.is_correct) return [styles.choiceText, styles.choiceTextWrong];
    return [styles.choiceText, styles.choiceTextDim];
  };

  // ── SETUP ────────────────────────────────────────────────
  if (state === STATES.SETUP) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.setupContent}>
        <Animated.View style={{ opacity: fadeAnim, transform: [{ scale: scaleAnim }] }}>
          <View style={styles.setupHeader}>
            <View style={styles.setupIconContainer}>
              <Text style={styles.setupEmoji}>👂</Text>
            </View>
            <Text style={styles.setupTitle}>Homophone Groups</Text>
            <Text style={styles.setupSubtitle}>
              How many questions do you want?
            </Text>
          </View>

          <View style={styles.setupCard}>
            <Text style={styles.setupLabel}>Select Number of Questions</Text>
            <View style={styles.questionOptionsGrid}>
              {QUESTION_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option}
                  style={styles.questionOption}
                  onPress={() => handleStartSession(option)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.questionOptionText}>{option}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Animated.View>
      </ScrollView>
    );
  }

  // ── LOADING ──────────────────────────────────────────────
  if (state === STATES.LOADING) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading question...</Text>
      </View>
    );
  }

  // ── ERROR ─────────────────────────────────────────────────
  if (state === STATES.ERROR) {
    return (
      <View style={styles.center}>
        <Ionicons name="alert-circle" size={48} color={COLORS.error} />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={loadQuestion}>
          <Text style={styles.retryBtnText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── RESULTS ──────────────────────────────────────────────
  if (state === STATES.RESULTS) {
    const accuracy = totalAnswersCount > 0 
      ? Math.round((correctAnswersCount / totalAnswersCount) * 100)
      : 0;
    
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.setupContent}>
        <Animated.View style={{ opacity: fadeAnim, transform: [{ scale: scaleAnim }] }}>
          <View style={styles.resultsContainer}>
            <View style={styles.resultsIconContainer}>
              <Text style={styles.resultsEmoji}>{accuracy >= 70 ? "🎉" : "👏"}</Text>
            </View>
            
            <Text style={styles.resultsTitle}>
                {accuracy >= 90 ? "Perfect! 🏆" : accuracy >= 70 ? "Great Job! 🎉" : accuracy >= 50 ? "Good Effort! 💪" : "Keep Practicing! 📚"}
              </Text>
            <Text style={styles.resultsSubtitle}>Quiz Completed</Text>

            {/* Score Card */}
            <View style={styles.resultsCard}>
              <View style={styles.resultsRow}>
                <View style={styles.resultsItem}>
                  <Text style={styles.resultsItemLabel}>Accuracy</Text>
                  <Text style={styles.resultsItemValue}>{accuracy}%</Text>
                </View>
                <View style={styles.resultsDivider} />
                <View style={styles.resultsItem}>
                  <Text style={styles.resultsItemLabel}>Correct</Text>
                  <Text style={styles.resultsItemValue}>{correctAnswersCount}/{totalAnswersCount}</Text>
                </View>
              </View>
            </View>

            {/* Feedback */}
            <View style={styles.feedbackCard}>
              <Text style={styles.feedbackTitle}>
                {accuracy >= 90 ? "Perfect! 🌟" : accuracy >= 70 ? "Excellent! 💪" : "Good effort! 📚"}
              </Text>
              <Text style={styles.feedbackText}>
                {accuracy >= 90 
                  ? "You're mastering these pairs!" 
                  : accuracy >= 70 
                  ? "Keep practicing to improve!"
                  : "Keep practicing, you'll improve!"}
              </Text>
            </View>

            {/* Buttons */}
            <TouchableOpacity 
              style={styles.retryButton} 
              onPress={handleRestart}
              activeOpacity={0.9}
            >
              <Ionicons name="reload" size={20} color="#fff" />
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.homeBtn}
              onPress={handleCompleteSession}
              activeOpacity={0.9}
            >
              <Ionicons name="home" size={20} color={COLORS.primary} />
              <Text style={styles.homeBtnText}>Home</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </ScrollView>
    );
  }

  // ── MAIN QUIZ ──────────────────────────────────────────────
  if (!question) return null;

  // ── CHECK USER ID ────────────────────────────────────────
  if (!userId) {
    return (
      <View style={styles.center}>
        <Ionicons name="alert-circle" size={48} color={COLORS.error} />
        <Text style={styles.errorText}>User ID not found. Please login again.</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.retryBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── MAIN ──────────────────────────────────────────────────
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Animated.View style={{ opacity: fadeAnim, transform: [{ scale: scaleAnim }] }}>

        {/* Header with progress */}
        <View style={styles.header}>

          {/* Score display */}
          <View style={styles.scoreBar}>
            <View style={styles.scoreItem}>
              <Text style={styles.scoreLabel}>Correct</Text>
              <Text style={styles.scoreValue}>{correctAnswersCount}</Text>
            </View>
            <View style={styles.scoreDivider} />
            <View style={styles.scoreItem}>
              <Text style={styles.scoreLabel}>Total</Text>
              <Text style={styles.scoreValue}>{totalAnswersCount}</Text>
            </View>
            <View style={styles.scoreDivider} />
            <View style={styles.scoreItem}>
              <Text style={styles.scoreLabel}>Accuracy</Text>
              <Text style={styles.scoreValue}>
                {totalAnswersCount > 0
                  ? Math.round((correctAnswersCount / totalAnswersCount) * 100)
                  : 0}
                %
              </Text>
            </View>
          </View>
        </View>

        {/* Listen Card */}
        <View style={styles.listenCard}>
          <TouchableOpacity
            style={[styles.speakBtn, isSpeaking && styles.speakBtnActive]}
            onPress={() => speakSentence(question.sentence, question.correctAnswerForAudio)}
            activeOpacity={0.8}
          >
            <Ionicons
              name={isSpeaking ? "volume-high" : "volume-medium"}
              size={32}
              color="#fff"
            />
            <Text style={styles.speakBtnText}>
              {isSpeaking ? "Speaking..." : "Listen"}
            </Text>
          </TouchableOpacity>

          {state === STATES.ANSWERED && (
            <View style={styles.sentenceBox}>
              <Text style={styles.sentenceLabel}>Sentence</Text>
              <Text style={styles.sentenceText}>{question.sentence}</Text>
            </View>
          )}
        </View>

        {/* Choices */}
        <View style={styles.choicesSection}>
          <Text style={styles.choicesLabel}>Which word did you hear?</Text>
          <View style={styles.choicesGrid}>
            {question.choices.map((choice) => (
              <TouchableOpacity
                key={choice.word}
                style={getChoiceStyle(choice.word)}
                onPress={() => handleAnswer(choice.word)}
                disabled={state === STATES.ANSWERED}
                activeOpacity={0.85}
              >
                <Text style={getChoiceTextStyle(choice.word)}>{choice.word}</Text>
                {choice.phonetic && (
                  <Text style={styles.phoneticText}>{choice.phonetic}</Text>
                )}
                {/* Hiển thị nghĩa tiếng Việt khi đã trả lời */}
                {state === STATES.ANSWERED && choice.meaning && (
                  <Text style={styles.meaningText}>{choice.meaning}</Text>
                )}
                {state === STATES.ANSWERED && choice.word === result?.correct_answer && (
                  <Ionicons name="checkmark-circle" size={20} color="#00B894" style={styles.choiceIcon} />
                )}
                {state === STATES.ANSWERED && choice.word === selectedAnswer && !result?.is_correct && (
                  <Ionicons name="close-circle" size={20} color={COLORS.error} style={styles.choiceIcon} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Result Banner */}
        {state === STATES.ANSWERED && result && (
          <Animated.View style={[
            styles.resultBanner,
            result.is_correct ? styles.resultCorrect : styles.resultWrong
          ]}>
            <Text style={styles.resultEmoji}>{result.is_correct ? "🎉" : "💡"}</Text>
            <View style={styles.resultTextContainer}>
              <Text style={styles.resultTitle}>
                {result.is_correct ? "Correct!" : "Not quite!"}
              </Text>
              {!result.is_correct && (
                <Text style={styles.resultSub}>
                  The answer is <Text style={styles.resultWord}>{result.correct_answer}</Text>
                  {result.correct_phonetic ? ` ${result.correct_phonetic}` : ""}
                </Text>
              )}
              {/* Nghĩa tiếng Việt của đáp án đúng */}
              {result.correct_meaning && (
                <Text style={styles.resultMeaning}>
                  Nghĩa: {result.correct_meaning}
                </Text>
              )}
            </View>
          </Animated.View>
        )}

        {/* Next Button */}
        {state === STATES.ANSWERED && totalAnswersCount < selectedQuestionCount && (
          <TouchableOpacity style={styles.nextBtn} onPress={loadQuestion} activeOpacity={0.9}>
            <Text style={styles.nextBtnText}>Next Question</Text>
            <Ionicons name="arrow-forward" size={20} color="#fff" />
          </TouchableOpacity>
        )}

        {/* Finish Button (shown during session) */}
        {(state === STATES.LISTENING || state === STATES.ANSWERED) && (
          <TouchableOpacity 
            style={styles.finishBtn} 
            onPress={handleEndPress}
            activeOpacity={0.8}
          >
            <Text style={styles.finishBtnText}>Finish</Text>
          </TouchableOpacity>
        )}

      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#111827" },
  content: { padding: 20, paddingBottom: 40 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24, backgroundColor: "#111827" },

  // Header
  header: { marginBottom: 24, paddingTop: 8 },
  headerTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  headerEmoji: { fontSize: 40 },
  headerTitle: { fontSize: 22, fontWeight: "700", color: "#FFFFFF" },
  headerSub: { fontSize: 13, color: "#9CA3AF", marginTop: 2 },
  exitBtn: { padding: 8, marginRight: -8 },

  // Score bar
  scoreBar: {
    flexDirection: "row",
    backgroundColor: "#1F2937",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "space-around",
    ...SHADOWS.small,
  },
  scoreItem: { alignItems: "center", flex: 1 },
  scoreLabel: { fontSize: 12, color: "#9CA3AF", fontWeight: "600", textTransform: "uppercase" },
  scoreValue: { fontSize: 18, fontWeight: "700", color: COLORS.primary, marginTop: 4 },
  scoreDivider: { width: 1, height: 24, backgroundColor: "#374151", marginHorizontal: 8 },

  // Listen Card
  listenCard: { backgroundColor: "#1F2937", borderRadius: 20, padding: 20, marginBottom: 20, ...SHADOWS.medium, alignItems: "center" },
  speakBtn: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: COLORS.primary, paddingVertical: 16, paddingHorizontal: 32,
    borderRadius: 16, ...SHADOWS.medium
  },
  speakBtnActive: { backgroundColor: COLORS.secondary },
  speakBtnText: { fontSize: 18, fontWeight: "700", color: "#fff" },
  sentenceBox: { marginTop: 16, alignItems: "center", width: "100%" },
  sentenceLabel: { fontSize: 12, color: "#9CA3AF", marginBottom: 4, fontWeight: "600", textTransform: "uppercase" },
  sentenceText: { fontSize: 16, color: "#E5E7EB", textAlign: "center", fontStyle: "italic", lineHeight: 24 },

  // Choices
  choicesSection: { marginBottom: 20 },
  choicesLabel: { fontSize: 15, fontWeight: "600", color: "#9CA3AF", marginBottom: 14, textAlign: "center" },
  choicesGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, justifyContent: "center" },
  choiceButton: {
    width: "46%", backgroundColor: "#374151", borderRadius: 16,
    paddingVertical: 18, paddingHorizontal: 12, alignItems: "center",
    borderWidth: 2, borderColor: "#374151", ...SHADOWS.small, position: "relative"
  },
  choiceCorrect: { backgroundColor: "rgba(0, 184, 148, 0.2)", borderColor: "#10B981" },
  choiceWrong: { backgroundColor: "rgba(239, 68, 68, 0.2)", borderColor: COLORS.error },
  choiceDim: { opacity: 0.45 },
  choiceText: { fontSize: 20, fontWeight: "700", color: "#E5E7EB" },
  choiceTextCorrect: { color: "#10B981" },
  choiceTextWrong: { color: COLORS.error },
  choiceTextDim: { color: "#6B7280" },
  phoneticText: { fontSize: 12, color: "#9CA3AF", marginTop: 4 },
  meaningText:  { fontSize: 11, color: "#6EE7B7", marginTop: 3, fontStyle: "italic", textAlign: "center" },
  choiceIcon: { position: "absolute", top: 8, right: 8 },

  // Result
  resultBanner: {
    flexDirection: "row", alignItems: "center", gap: 12,
    borderRadius: 16, padding: 16, marginBottom: 16, ...SHADOWS.small
  },
  resultCorrect: { backgroundColor: "rgba(16, 185, 129, 0.15)" },
  resultWrong: { backgroundColor: "rgba(239, 68, 68, 0.15)" },
  resultEmoji: { fontSize: 32 },
  resultTextContainer: { flex: 1 },
  resultTitle: { fontSize: 18, fontWeight: "700", color: "#FFFFFF" },
  resultSub: { fontSize: 14, color: "#D1D5DB", marginTop: 2 },
  resultWord: { fontWeight: "700", color: "#FFFFFF" },
  resultMeaning: { fontSize: 13, color: "#6EE7B7", marginTop: 5, fontStyle: "italic" },

  // Next
  nextBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: COLORS.primary, borderRadius: 16, paddingVertical: 16, ...SHADOWS.medium
  },
  nextBtnText: { fontSize: 17, fontWeight: "700", color: "#fff" },

  // Finish Button
  finishBtn: {
    alignSelf: "center",
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginTop: 10,
    marginBottom: 20,
  },
  finishBtnText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#6B7280",
    textDecorationLine: "underline",
    textDecorationColor: "#4B5563",
  },

  // Error / loading
  loadingText: { marginTop: 12, fontSize: 15, color: "#9CA3AF" },
  errorText: { fontSize: 15, color: "#9CA3AF", textAlign: "center", marginVertical: 16 },
  retryBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 28, paddingVertical: 12, borderRadius: 12 },
  retryBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },

  // Setup Screen
  setupContent: { padding: 20, paddingBottom: 40, justifyContent: "center", minHeight: "100%" },
  setupHeader: { alignItems: "center", marginBottom: 32, marginTop: 40 },
  setupIconContainer: { width: 80, height: 80, borderRadius: 40, backgroundColor: `${COLORS.primary}15`, justifyContent: "center", alignItems: "center", marginBottom: 16 },
  setupEmoji: { fontSize: 48 },
  setupTitle: { fontSize: 28, fontWeight: "700", color: "#FFFFFF", marginBottom: 8, textAlign: "center" },
  setupSubtitle: { fontSize: 16, color: "#9CA3AF", textAlign: "center" },

  setupCard: { backgroundColor: "#1F2937", borderRadius: 20, padding: 24, marginBottom: 20, ...SHADOWS.medium },
  setupLabel: { fontSize: 16, fontWeight: "700", color: "#E5E7EB", marginBottom: 20, textAlign: "center" },
  questionOptionsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, justifyContent: "center" },
  questionOption: { 
    width: "45%", 
    backgroundColor: COLORS.primary, 
    borderRadius: 16, 
    paddingVertical: 20, 
    alignItems: "center", 
    justifyContent: "center",
    ...SHADOWS.small
  },
  questionOptionText: { fontSize: 24, fontWeight: "700", color: "#fff" },

  // Results Screen
  resultsContainer: { alignItems: "center", marginVertical: 20 },
  resultsIconContainer: { width: 100, height: 100, borderRadius: 50, backgroundColor: `${COLORS.primary}15`, justifyContent: "center", alignItems: "center", marginBottom: 20 },
  resultsEmoji: { fontSize: 56 },
  resultsTitle: { fontSize: 32, fontWeight: "700", color: "#FFFFFF", marginBottom: 4, textAlign: "center" },
  resultsSubtitle: { fontSize: 18, color: "#9CA3AF", marginBottom: 28, textAlign: "center" },

  resultsCard: { width: "100%", backgroundColor: "#1F2937", borderRadius: 16, padding: 20, marginBottom: 24, ...SHADOWS.small },
  resultsRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-around" },
  resultsItem: { alignItems: "center", flex: 1 },
  resultsItemLabel: { fontSize: 12, color: "#9CA3AF", fontWeight: "600", textTransform: "uppercase", marginBottom: 8 },
  resultsItemValue: { fontSize: 28, fontWeight: "700", color: COLORS.primary },
  resultsDivider: { width: 1, height: 40, backgroundColor: "#374151", marginHorizontal: 12 },

  feedbackCard: { width: "100%", backgroundColor: `${COLORS.primary}15`, borderRadius: 16, padding: 20, marginBottom: 28, borderLeftWidth: 4, borderLeftColor: COLORS.primary },
  feedbackTitle: { fontSize: 18, fontWeight: "700", color: "#FFFFFF", marginBottom: 8 },
  feedbackText: { fontSize: 15, color: "#D1D5DB", lineHeight: 22 },

  retryButton: {
    width: "100%", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: COLORS.primary, borderRadius: 16, paddingVertical: 16, marginBottom: 12, ...SHADOWS.medium
  },
  retryButtonText: { fontSize: 17, fontWeight: "700", color: "#fff" },
  homeBtn: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "transparent",
    borderRadius: 16,
    paddingVertical: 15,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
  },
  homeBtnText: { fontSize: 17, fontWeight: "700", color: COLORS.primary },
});
