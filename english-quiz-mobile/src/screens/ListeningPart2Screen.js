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
import { Audio } from "expo-av";
import { Ionicons } from "@expo/vector-icons";
import { useUser } from "../context/UserContext";
import {
  startListeningSession,
  submitListeningAnswer,
  completeListeningPart2Session,
  deleteListeningPart2Session,
} from "../services/api";
import { COLORS, SHADOWS } from "../constants/config";

const STATES = {
  SETUP: "setup",
  LOADING: "loading",
  QUESTION: "question",
  FEEDBACK: "feedback",
  RESULTS: "results",
  ERROR: "error",
};

const QUESTION_OPTIONS = [5, 10, 15, 20];
const OPTION_LABELS = ["A", "B", "C"];

export default function ListeningPart2Screen({ navigation }) {
  const { userId } = useUser();

  // Setup state
  const [selectedQuestionCount, setSelectedQuestionCount] = useState(null);

  // Session state
  const [state, setState] = useState(STATES.SETUP);
  const [sessionId, setSessionId] = useState(null);
  const [question, setQuestion] = useState(null);
  const [questionNumber, setQuestionNumber] = useState(1);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [selectedOptionIndex, setSelectedOptionIndex] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [showNextButton, setShowNextButton] = useState(false);
  const [nextQuestionData, setNextQuestionData] = useState(null);

  // Audio state
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const soundRef = useRef(null);

  // Session tracking for history
  const sessionStartTimeRef = useRef(null);
  const questionsSummaryRef = useRef([]);

  // Flag to prevent navigation loop when intentionally exiting
  const isIntentionalExitRef = useRef(false);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    console.log("[ListeningPart2Screen] Mounted - userId:", userId);
    animateIn();
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, []);

  /**
   * Exit handling (HYBRID 70% rule)
   * Show confirmation dialog when user tries to exit
   */
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      // If user intentionally exiting (after confirming), allow navigation
      if (isIntentionalExitRef.current) {
        console.log('[ListeningPart2Screen] Allowing intentional exit');
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
  }, [navigation, sessionId, state, questionNumber, totalQuestions, userId]);

  /**
   * Confirm exit dialog with HYBRID 70% rule
   */
  const handleConfirmExit = () => {
    const total = selectedQuestionCount || 0;
    const answered = questionNumber - 1; // Current is not answered yet
    const threshold = total * 0.7;
    const isEnough = answered >= threshold;

    console.log(`[ListeningPart2Screen] Confirm exit - answered: ${answered}/${total} (threshold: ${threshold}, isEnough: ${isEnough})`);

    if (isEnough) {
      // CASE 1: ≥ 70% → Offer to save session
      Alert.alert(
        "Confirm Exit",
        `You have completed ${answered} of ${total} questions (${Math.round((answered / total) * 100)}%). Do you want to save your progress?`,
        [
          {
            text: "Continue",
            style: "cancel",
            onPress: () => console.log("[ListeningPart2Screen] Continue session"),
          },
          {
            text: "End",
            style: "default",
            onPress: async () => {
              try {
                console.log("[ListeningPart2Screen] Completing session before exit");
                await completeListeningPart2Session(sessionId, userId);
                console.log("[ListeningPart2Screen] Session completed, setting exit flag");
                isIntentionalExitRef.current = true; // Mark as intentional exit
                navigation.goBack();
              } catch (err) {
                console.error("[ListeningPart2Screen] Error completing session:", err);
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
        `You have only completed ${answered} of ${total} questions (${Math.round((answered / total) * 100)}%). If you exit now, your progress will NOT be saved.`,
        [
          {
            text: "Continue Studying",
            style: "cancel",
            onPress: () => console.log("[ListeningPart2Screen] Continue session"),
          },
          {
            text: "Exit",
            style: "destructive",
            onPress: async () => {
              try {
                console.log("[ListeningPart2Screen] Deleting incomplete session");
                await deleteListeningPart2Session(sessionId, userId);
                console.log("[ListeningPart2Screen] Session deleted, setting exit flag");
                isIntentionalExitRef.current = true; // Mark as intentional exit
                navigation.goBack();
              } catch (err) {
                console.warn("[ListeningPart2Screen] Error deleting session:", err);
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
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 350,
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

  const handleStartSession = async (questionCount) => {
    try {
      setState(STATES.LOADING);
      setSelectedQuestionCount(questionCount);
      setCorrectCount(0);
      setError(null);

      // Initialize session tracking
      sessionStartTimeRef.current = new Date();
      questionsSummaryRef.current = [];

      console.log("[ListeningPart2] Starting session with", questionCount, "questions");
      const response = await startListeningSession(userId, questionCount);
      
      setSessionId(response.session_id);
      setQuestion(response.question);
      setQuestionNumber(response.question_number);
      setTotalQuestions(response.total_questions);
      setState(STATES.QUESTION);
      setSelectedOptionIndex(null);
      setResult(null);
      setShowNextButton(false);
      setNextQuestionData(null);
      animateIn();

      // Auto-play audio
      setTimeout(() => playAudio(response.question.audioUrl), 600);
    } catch (err) {
      setError(err.message);
      setState(STATES.ERROR);
    }
  };

  const playAudio = async (audioUrl) => {
    try {
      setIsPlaying(true);
      setAudioProgress(0);
      
      // Unload previous sound if exists
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
      }

      // Load and play new sound
      const { sound } = await Audio.Sound.createAsync(
        { uri: audioUrl },
        { shouldPlay: true }
      );
      soundRef.current = sound;

      // Get duration when loaded
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && !status.didJustFinish) {
          // Update progress bar
          if (status.durationMillis > 0) {
            const progress = status.positionMillis / status.durationMillis;
            setAudioProgress(progress);
            setAudioDuration(Math.ceil(status.durationMillis / 1000));
          }
        }
        
        if (status.didJustFinish) {
          setIsPlaying(false);
          setAudioProgress(0);
        }
      });

      await sound.playAsync();
    } catch (err) {
      console.error("[ListeningPart2] Error playing audio:", err);
      setIsPlaying(false);
    }
  };

  const handleReplayAudio = async () => {
    if (question && question.audioUrl) {
      await playAudio(question.audioUrl);
    }
  };

  /**
   * Handle Finish button press - show confirm dialog
   */
  const handleEndPress = () => {
    handleConfirmExit();
  };

  // Just highlight the selected option — does NOT submit yet
  const handleSelectOption = (optionIndex) => {
    if (state !== STATES.QUESTION) return;
    setSelectedOptionIndex(optionIndex);
  };

  // Stop audio + submit the selected answer
  const handleCheckAnswer = async () => {
    if (selectedOptionIndex === null || state !== STATES.QUESTION) return;

    // Stop audio immediately
    setIsPlaying(false);
    if (soundRef.current) {
      try { await soundRef.current.stopAsync(); } catch (_) {}
    }

    try {
      setState(STATES.LOADING);
      const response = await submitListeningAnswer(sessionId, userId, selectedOptionIndex);

      setResult(response);
      setState(STATES.FEEDBACK);

      if (response.is_correct) {
        setCorrectCount(correctCount + 1);
      }

      const newCorrectCount = response.is_correct ? correctCount + 1 : correctCount;
      questionsSummaryRef.current.push({
        question_id: response.question_id || `q_${questionNumber}`,
        is_correct: response.is_correct,
        user_answer: OPTION_LABELS[selectedOptionIndex],
        correct_answer: OPTION_LABELS[response.correct_index],
      });

      setNextQuestionData({
        isComplete: response.session_complete,
        nextQuestion: response.next_question,
        questionNumber: response.question_number,
        totalQuestions: response.total_questions,
        newCorrectCount: newCorrectCount,
      });
      setShowNextButton(true);
    } catch (err) {
      console.error("[ListeningPart2] Error checking answer:", err);
      setError(err.message);
      setState(STATES.ERROR);
    }
  };

  const handleNextQuestion = async () => {
    if (!nextQuestionData) return;

    try {
      if (nextQuestionData.isComplete) {
        // Stop audio before going to results
        setIsPlaying(false);
        if (soundRef.current) {
          try { await soundRef.current.stopAsync(); } catch (_) {}
        }
        // Complete session (same pattern as HomophoneGroups)
        await completeListeningPart2Session(sessionId, userId);
        setState(STATES.RESULTS);
        animateIn();
      } else {
        setQuestion(nextQuestionData.nextQuestion);
        setQuestionNumber(nextQuestionData.questionNumber);
        setTotalQuestions(nextQuestionData.totalQuestions);
        setSelectedOptionIndex(null);
        setResult(null);
        setShowNextButton(false);
        setNextQuestionData(null);
        setAudioProgress(0);
        setAudioDuration(0);
        setState(STATES.QUESTION);
        animateIn();

        // Play next audio after brief delay
        setTimeout(() => {
          if (nextQuestionData.nextQuestion && nextQuestionData.nextQuestion.audioUrl) {
            playAudio(nextQuestionData.nextQuestion.audioUrl);
          }
        }, 300);
      }
    } catch (err) {
      console.error("[ListeningPart2] Error moving to next question:", err);
      setError(err.message);
      setState(STATES.ERROR);
    }
  };

  const handleRestart = () => {
    // Stop and unload audio before going back to setup
    setIsPlaying(false);
    if (soundRef.current) {
      soundRef.current.unloadAsync();
    }
    setSelectedQuestionCount(null);
    setState(STATES.SETUP);
    setSessionId(null);
    setQuestion(null);
    setQuestionNumber(1);
    setTotalQuestions(0);
    setSelectedOptionIndex(null);
    setResult(null);
    setCorrectCount(0);
    setError(null);
    setAudioProgress(0);
    setAudioDuration(0);
    setShowNextButton(false);
    setNextQuestionData(null);
    sessionStartTimeRef.current = null;
    questionsSummaryRef.current = [];
    // Delay animateIn so React re-renders SETUP first, then fade-in plays
    setTimeout(() => animateIn(), 50);
  };

  const handleHome = () => {
    setIsPlaying(false);
    setAudioProgress(0);
    setAudioDuration(0);
    if (soundRef.current) {
      soundRef.current.unloadAsync();
    }
    navigation.navigate("Home");
  };

  const getOptionStyle = (index) => {
    if (state !== STATES.FEEDBACK) {
      return [styles.optionButton, selectedOptionIndex === index && styles.optionSelected];
    }
    
    // Highlight correct option in green
    if (index === result.correct_index) {
      return [styles.optionButton, styles.optionCorrect];
    }
    
    // Highlight wrong selected option in red
    if (index === selectedOptionIndex && !result.is_correct) {
      return [styles.optionButton, styles.optionWrong];
    }
    
    return [styles.optionButton, styles.optionDim];
  };

  const getOptionTextStyle = (index) => {
    if (state !== STATES.FEEDBACK) {
      return [styles.optionLabel, selectedOptionIndex === index && styles.optionLabelSelected];
    }
    
    if (index === result.correct_index) {
      return [styles.optionLabel, styles.optionLabelCorrect];
    }
    
    if (index === selectedOptionIndex && !result.is_correct) {
      return [styles.optionLabel, styles.optionLabelWrong];
    }
    
    return [styles.optionLabel, styles.optionLabelDim];
  };

  // ── SETUP ────────────────────────────────────────────────
  if (state === STATES.SETUP) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.setupContent}>
        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          }}
        >
          <View style={styles.setupHeader}>
            <View style={styles.setupIconContainer}>
              <Text style={styles.setupEmoji}>🎧</Text>
            </View>
            <Text style={styles.setupTitle}>Listening Part 2</Text>
            <Text style={styles.setupSubtitle}>TOEIC Practice</Text>
            <Text style={styles.setupDescription}>
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

  // ── ERROR ────────────────────────────────────────────────
  if (state === STATES.ERROR) {
    return (
      <View style={styles.center}>
        <Ionicons name="alert-circle" size={60} color={COLORS.error} />
        <Text style={styles.errorTitle}>Error</Text>
        <Text style={styles.errorMessage}>{error}</Text>
        <TouchableOpacity style={styles.errorButton} onPress={handleRestart}>
          <Text style={styles.errorButtonText}>Restart</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── QUESTION ─────────────────────────────────────────────
  if (state === STATES.QUESTION) {
    if (!question) {
      return (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading question...</Text>
        </View>
      );
    }

    return (
      <Animated.ScrollView
        style={[
          styles.container,
          { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
        ]}
        contentContainerStyle={styles.questionContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerProgress}>
            Question {questionNumber} / {totalQuestions}
          </Text>
          <View
            style={[
              styles.progressBar,
              {
                width: `${(questionNumber / totalQuestions) * 100}%`,
              },
            ]}
          />
        </View>

        {/* Audio Player */}
        <View style={styles.audioCard}>
          <TouchableOpacity
            style={[styles.playButton, isPlaying && styles.playButtonPlaying]}
            onPress={handleReplayAudio}
            disabled={isPlaying}
          >
            <Ionicons
              name={isPlaying ? "pause" : "play"}
              size={40}
              color={COLORS.primary}
            />
          </TouchableOpacity>
          <Text style={styles.audioText}>
            {isPlaying ? "Playing..." : "🔁 Replay"}
          </Text>
          
          {/* Audio Progress Bar */}
          {isPlaying && (
            <View style={styles.audioProgressContainer}>
              <View style={styles.audioProgressBar}>
                <View 
                  style={[
                    styles.audioProgressFill,
                    { width: `${audioProgress * 100}%` }
                  ]}
                />
              </View>
              <Text style={styles.audioProgressTime}>
                {Math.ceil(audioProgress * audioDuration)}s / {audioDuration}s
              </Text>
            </View>
          )}
        </View>

        {/* Options */}
        {question && question.options && question.options.length > 0 ? (
          <View style={styles.optionsContainer}>
            {question.options.map((option, index) => (
              <TouchableOpacity
                key={index}
                style={getOptionStyle(index)}
                onPress={() => handleSelectOption(index)}
                disabled={state !== STATES.QUESTION}
                activeOpacity={0.7}
              >
                <Text style={getOptionTextStyle(index)}>
                  {OPTION_LABELS[index]}
                </Text>
                <Text style={styles.optionText}>{option.text}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={styles.optionsContainer}>
            <Text style={styles.loadingText}>Loading options...</Text>
          </View>
        )}

        {/* Check Answer Button */}
        <TouchableOpacity
          style={[
            styles.checkAnswerButton,
            selectedOptionIndex === null && styles.checkAnswerButtonDisabled,
          ]}
          onPress={handleCheckAnswer}
          disabled={selectedOptionIndex === null}
          activeOpacity={0.85}
        >
          <Text style={styles.checkAnswerButtonText}>Check Answer</Text>
        </TouchableOpacity>

        {/* Finish Button */}
        {(state === STATES.QUESTION || state === STATES.FEEDBACK) && ( 
          <TouchableOpacity 
            style={styles.finishBtn} 
            onPress={handleEndPress}
            activeOpacity={0.8}
          >
            <Text style={styles.finishBtnText}>Finish</Text>
          </TouchableOpacity>
        )}
      </Animated.ScrollView>
    );
  }

  // ── FEEDBACK ─────────────────────────────────────────────
  if (state === STATES.FEEDBACK) {
    if (!question || !result) {
      return (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading feedback...</Text>
        </View>
      );
    }

    return (
      <Animated.ScrollView
        style={[
          styles.container,
          { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
        ]}
        contentContainerStyle={styles.feedbackContent}
      >
        {/* Result Header */}
        <View
          style={[
            styles.resultHeader,
            result.is_correct
              ? styles.resultHeaderCorrect
              : styles.resultHeaderWrong,
          ]}
        >
          <Ionicons
            name={result.is_correct ? "checkmark-circle" : "close-circle"}
            size={60}
            color={result.is_correct ? COLORS.success : COLORS.error}
          />
          <Text style={styles.resultText}>
            {result.is_correct ? "Correct!" : "Incorrect"}
          </Text>
        </View>

        {/* Options with Feedback */}
        {question.options && question.options.length > 0 ? (
          <View style={styles.optionsContainer}>
            {question.options.map((option, index) => (
              <View
                key={index}
                style={[
                  styles.feedbackOption,
                  index === result.correct_index
                    ? styles.feedbackOptionCorrect
                    : index === selectedOptionIndex && !result.is_correct
                    ? styles.feedbackOptionWrong
                    : styles.feedbackOptionNeutral,
                ]}
              >
                <View style={styles.feedbackOptionHeader}>
                  <Text
                    style={[
                      styles.feedbackOptionLabel,
                      index === result.correct_index
                        ? styles.feedbackOptionLabelCorrect
                        : index === selectedOptionIndex && !result.is_correct
                        ? styles.feedbackOptionLabelWrong
                        : styles.feedbackOptionLabelNeutral,
                    ]}
                  >
                    {OPTION_LABELS[index]}
                  </Text>
                  {index === result.correct_index && (
                    <Ionicons name="checkmark" size={20} color={COLORS.success} />
                  )}
                </View>
                <Text style={styles.feedbackOptionText}>{option.text}</Text>
                {option.translation && (
                  <Text style={styles.feedbackOptionTranslation}>
                    {option.translation}
                  </Text>
                )}
              </View>
            ))}
          </View>
        ) : null}

        {/* Transcription & Translation */}
        {result.transcript && (
          <View style={styles.transcriptCard}>
            <Text style={styles.transcriptLabel}>Transcript:</Text>
            <Text style={styles.transcriptText}>{result.transcript}</Text>
            {result.translation && (
              <>
                <Text style={styles.translationLabel}>Translation:</Text>
                <Text style={styles.translationText}>{result.translation}</Text>
              </>
            )}
          </View>
        )}

        {/* Next / View Results Button */}
        {showNextButton && (
          <TouchableOpacity
            style={[
              styles.nextButton,
              nextQuestionData?.isComplete && styles.nextButtonFinish,
            ]}
            onPress={handleNextQuestion}
            activeOpacity={0.85}
          >
            <Ionicons name="arrow-forward" size={20} color="#fff" />
            <Text style={styles.nextButtonText}>
              {nextQuestionData?.isComplete ? "View Results" : "Next Question"}
            </Text>
          </TouchableOpacity>
        )}
      </Animated.ScrollView>
    );
  }

  // ── RESULTS ──────────────────────────────────────────────
  if (state === STATES.RESULTS) {
    const accuracy = totalQuestions > 0
      ? Math.round((correctCount / totalQuestions) * 100)
      : 0;

    const getTitle = () => {
      if (accuracy >= 90) return "Perfect! 🏆";
      if (accuracy >= 70) return "Great Job! 🎉";
      if (accuracy >= 50) return "Good Effort! 💪";
      return "Keep Practicing! 📚";
    };

    const getFeedbackTitle = () => {
      if (accuracy >= 90) return "Outstanding! 🌟";
      if (accuracy >= 70) return "Excellent! 💪";
      return "Good effort! 📚";
    };

    const getFeedbackText = () => {
      if (accuracy >= 90) return "You're mastering TOEIC Listening Part 2!";
      if (accuracy >= 70) return "Keep practicing to reach perfection!";
      return "Keep practicing, you'll improve!";
    };

    return (
      <Animated.ScrollView
        style={[
          styles.container,
          { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
        ]}
        contentContainerStyle={styles.resultsContent}
      >
        <View style={styles.resultsCard}>
          {/* Icon */}
          <View style={styles.resultsIconContainer}>
            <Text style={styles.resultsEmoji}>
              {accuracy >= 70 ? "🎉" : "👏"}
            </Text>
          </View>

          {/* Dynamic Title */}
          <Text style={styles.resultsTitle}>{getTitle()}</Text>
          <Text style={styles.resultsSubtitle}>Quiz Completed</Text>

          {/* Score Card */}
          <View style={styles.scoreCardRow}>
            <View style={styles.scoreCardItem}>
              <Text style={styles.scoreCardLabel}>ACCURACY</Text>
              <Text style={[styles.scoreCardValue, { color: accuracy >= 70 ? COLORS.success : COLORS.error }]}>
                {accuracy}%
              </Text>
            </View>
            <View style={styles.scoreCardDivider} />
            <View style={styles.scoreCardItem}>
              <Text style={styles.scoreCardLabel}>CORRECT</Text>
              <Text style={styles.scoreCardValue}>
                {correctCount}/{totalQuestions}
              </Text>
            </View>
          </View>

          {/* Feedback Card */}
          <View style={styles.feedbackCard}>
            <Text style={styles.feedbackCardTitle}>{getFeedbackTitle()}</Text>
            <Text style={styles.feedbackCardText}>{getFeedbackText()}</Text>
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
            style={styles.homeButton}
            onPress={handleHome}
            activeOpacity={0.9}
          >
            <Ionicons name="home" size={20} color={COLORS.primary} />
            <Text style={styles.homeButtonText}>Home</Text>
          </TouchableOpacity>
        </View>
      </Animated.ScrollView>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#111827",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#111827",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#E5E7EB",
  },

  // SETUP
  setupContent: {
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  setupHeader: {
    alignItems: "center",
    marginBottom: 40,
  },
  setupIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#1F2937",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  setupEmoji: {
    fontSize: 48,
  },
  setupTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 8,
  },
  setupSubtitle: {
    fontSize: 16,
    color: "#9CA3AF",
    marginBottom: 16,
  },
  setupDescription: {
    fontSize: 14,
    color: "#D1D5DB",
  },
  setupCard: {
    backgroundColor: "#1F2937",
    borderRadius: 16,
    padding: 24,
    ...SHADOWS.small,
  },
  setupLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#E5E7EB",
    marginBottom: 16,
  },
  questionOptionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  questionOption: {
    width: "48%",
    paddingVertical: 16,
    marginBottom: 12,
    backgroundColor: "#374151",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  questionOptionText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#60A5FA",
  },

  // QUESTION STATE
  questionContent: {
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  header: {
    marginBottom: 24,
  },
  headerProgress: {
    fontSize: 14,
    color: "#9CA3AF",
    marginBottom: 8,
  },
  progressBar: {
    height: 6,
    backgroundColor: "#60A5FA",
    borderRadius: 3,
  },
  audioCard: {
    backgroundColor: "#1F2937",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    marginBottom: 24,
    ...SHADOWS.small,
  },
  playButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#374151",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  playButtonPlaying: {
    backgroundColor: "#1F37A0",
  },
  audioText: {
    fontSize: 14,
    color: "#D1D5DB",
  },
  audioProgressContainer: {
    marginTop: 16,
    width: "100%",
    gap: 8,
  },
  audioProgressBar: {
    width: "100%",
    height: 6,
    backgroundColor: "#374151",
    borderRadius: 3,
    overflow: "hidden",
  },
  audioProgressFill: {
    height: "100%",
    backgroundColor: "#60A5FA",
    borderRadius: 3,
  },
  audioProgressTime: {
    fontSize: 12,
    color: "#9CA3AF",
    textAlign: "center",
  },
  optionsContainer: {
    gap: 12,
  },
  optionButton: {
    backgroundColor: "#374151",
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#374151",
  },
  optionSelected: {
    borderColor: "#60A5FA",
    backgroundColor: "#1F3A5F",
  },
  optionCorrect: {
    borderColor: "#10B981",
    backgroundColor: "#064E3B",
  },
  optionWrong: {
    borderColor: "#EF4444",
    backgroundColor: "#5F2120",
  },
  optionDim: {
    opacity: 0.5,
  },
  optionLabel: {
    fontSize: 18,
    fontWeight: "700",
    color: "#E5E7EB",
    marginRight: 12,
    minWidth: 28,
  },
  optionLabelSelected: {
    color: "#60A5FA",
  },
  optionLabelCorrect: {
    color: "#10B981",
  },
  optionLabelWrong: {
    color: "#EF4444",
  },
  optionLabelDim: {
    color: "#6B7280",
  },
  optionText: {
    flex: 1,
    fontSize: 14,
    color: "#E5E7EB",
  },

  // FEEDBACK STATE
  feedbackContent: {
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  resultHeader: {
    alignItems: "center",
    paddingVertical: 24,
    marginBottom: 24,
    borderRadius: 16,
  },
  resultHeaderCorrect: {
    backgroundColor: "#065F46",
  },
  resultHeaderWrong: {
    backgroundColor: "#7F1D1D",
  },
  resultText: {
    fontSize: 28,
    fontWeight: "700",
    color: "#FFFFFF",
    marginTop: 12,
  },
  feedbackOption: {
    backgroundColor: "#1F2937",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
  },
  feedbackOptionCorrect: {
    backgroundColor: "#064E3B",
    borderLeftColor: "#10B981",
  },
  feedbackOptionWrong: {
    backgroundColor: "#5F2120",
    borderLeftColor: "#EF4444",
  },
  feedbackOptionNeutral: {
    borderLeftColor: "#374151",
  },
  feedbackOptionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  feedbackOptionLabel: {
    fontSize: 16,
    fontWeight: "700",
  },
  feedbackOptionLabelCorrect: {
    color: "#10B981",
  },
  feedbackOptionLabelWrong: {
    color: "#EF4444",
  },
  feedbackOptionLabelNeutral: {
    color: "#E5E7EB",
  },
  feedbackOptionText: {
    fontSize: 14,
    color: "#E5E7EB",
    marginBottom: 4,
  },
  feedbackOptionTranslation: {
    fontSize: 12,
    color: "#9CA3AF",
    fontStyle: "italic",
  },
  transcriptCard: {
    backgroundColor: "#1F2937",
    borderRadius: 12,
    padding: 16,
    marginTop: 24,
  },
  transcriptLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#9CA3AF",
    textTransform: "uppercase",
    marginBottom: 8,
  },
  transcriptText: {
    fontSize: 14,
    color: "#E5E7EB",
    lineHeight: 20,
    marginBottom: 16,
  },
  translationLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#9CA3AF",
    textTransform: "uppercase",
    marginBottom: 8,
  },
  translationText: {
    fontSize: 14,
    color: "#D1D5DB",
    lineHeight: 20,
    fontStyle: "italic",
  },

  // CHECK ANSWER BUTTON (QUESTION state)
  checkAnswerButton: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 30,
    marginTop: 14,
    marginBottom: 8,
    gap: 8,
    alignSelf: "center",
    minWidth: 140,
    borderWidth: 0,
    ...SHADOWS.small,
  },
  checkAnswerButtonDisabled: {
    backgroundColor: "#374151",
    opacity: 0.5,
  },
  checkAnswerButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 0.3,
  },

  finishBtn: {
    backgroundColor: "#DC2626", // Nền đỏ đậm
    borderRadius: 12,
    paddingVertical: 12,        // Độ cao vừa vặn
    paddingHorizontal: 30,      // Độ rộng vừa đủ để chữ "Finish" trông cân đối
    marginTop: 20,
    alignSelf: "center",        // Căn giữa màn hình và co nút theo nội dung
    ...SHADOWS.small,
    minWidth: 140,              // Đảm bảo nút đủ lớn để dễ bấm
  },
  finishBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",           // Chữ trắng
    textAlign: "center",
    letterSpacing: 0.5,
  },

  // NEXT / VIEW RESULTS BUTTON (FEEDBACK state)
  nextButton: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#3B82F6",
    borderRadius: 14,
    paddingVertical: 15,
    marginTop: 20,
    gap: 8,
  },
  nextButtonFinish: {
    backgroundColor: COLORS.primary,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  // RESULTS
  resultsContent: {
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  resultsCard: {
    backgroundColor: "#1F2937",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    ...SHADOWS.small,
  },
  resultsIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#111827",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  resultsEmoji: {
    fontSize: 40,
  },
  resultsTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 4,
    textAlign: "center",
  },
  resultsSubtitle: {
    fontSize: 14,
    color: "#9CA3AF",
    marginBottom: 24,
  },
  scoreCardRow: {
    flexDirection: "row",
    backgroundColor: "#111827",
    borderRadius: 12,
    padding: 16,
    width: "100%",
    marginBottom: 16,
  },
  scoreCardItem: {
    flex: 1,
    alignItems: "center",
  },
  scoreCardDivider: {
    width: 1,
    backgroundColor: "#374151",
    marginHorizontal: 8,
  },
  scoreCardLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  scoreCardValue: {
    fontSize: 26,
    fontWeight: "700",
    color: "#60A5FA",
  },
  feedbackCard: {
    backgroundColor: "#111827",
    borderRadius: 12,
    padding: 16,
    width: "100%",
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  feedbackCardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  feedbackCardText: {
    fontSize: 13,
    color: "#9CA3AF",
  },
  retryButton: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    width: "100%",
    gap: 8,
    marginBottom: 12,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  homeButton: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#111827",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.primary,
    paddingVertical: 14,
    width: "100%",
    gap: 8,
  },
  homeButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.primary,
  },

  // ERROR
  errorTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#FFFFFF",
    marginTop: 16,
  },
  errorMessage: {
    fontSize: 14,
    color: "#E5E7EB",
    marginTop: 8,
    textAlign: "center",
  },
  errorButton: {
    marginTop: 24,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: "#60A5FA",
    borderRadius: 10,
  },
  errorButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
