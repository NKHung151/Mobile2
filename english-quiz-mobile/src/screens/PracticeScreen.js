// english-quiz-mobile/src/screens/PracticeScreen.js
import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
  Animated,
  Dimensions,
  Alert,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useUser } from "../context/UserContext";
import {
  getPracticeTopics,
  startPractice,
  submitPracticeAnswer,
} from "../services/practiceApi";
import { COLORS, SHADOWS } from "../constants/config";

const { width } = Dimensions.get("window");

const LEVELS = [
  {
    key: "beginner",
    label: "Beginner",
    icon: "🌱",
    color: "#00b894",
    description: "Build your foundation",
  },
  {
    key: "intermediate",
    label: "Intermediate",
    icon: "🔥",
    color: "#e17055",
    description: "Strengthen your skills",
  },
  {
    key: "pre-toeic",
    label: "Pre-TOEIC",
    icon: "🏆",
    color: "#6c5ce7",
    description: "TOEIC preparation",
  },
];

const QUESTION_TYPE_LABELS = {
  multiple_choice: "Multiple Choice",
  fill_in_blank: "Fill in the Blank",
  reorder: "Reorder Sentence",
  error_detection: "Find the Error",
};

// ─── Practice states ────────────────────────────────────────────────────────
const STATES = {
  SETUP: "setup",
  LOADING: "loading",
  QUESTION: "question",
  FEEDBACK: "feedback",
  RESULTS: "results",
};

export default function PracticeScreen({ navigation }) {
  const { userId } = useUser();
  // Setup
  const [topics, setTopics] = useState([]);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [selectedLevel, setSelectedLevel] = useState(null);
  const [showTopicPicker, setShowTopicPicker] = useState(false);
  const [loadingTopics, setLoadingTopics] = useState(true);

  // Session
  const [practiceState, setPracticeState] = useState(STATES.SETUP);
  const [sessionId, setSessionId] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [questionNumber, setQuestionNumber] = useState(1);
  const [totalQuestions, setTotalQuestions] = useState(10);
  const [score, setScore] = useState(0);

  // Answer state per question type
  const [selectedOption, setSelectedOption] = useState(null);
  const [fillAnswer, setFillAnswer] = useState("");
  const [reorderedWords, setReorderedWords] = useState([]);
  const [selectedErrorIndex, setSelectedErrorIndex] = useState(null);

  // Feedback & results
  const [feedback, setFeedback] = useState(null);
  const [isCorrect, setIsCorrect] = useState(null);
  const [finalResults, setFinalResults] = useState(null);

  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [questionStartTime, setQuestionStartTime] = useState(Date.now());

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  const animateIn = useCallback(() => {
    fadeAnim.setValue(0);
    scaleAnim.setValue(0.95);
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, tension: 60, friction: 8, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, scaleAnim]);

  useEffect(() => {
    fetchTopics();
    animateIn();
  }, [animateIn]);

  const fetchTopics = async () => {
    try {
      setLoadingTopics(true);
      const res = await getPracticeTopics(userId);
      setTopics(res.data.data || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoadingTopics(false);
    }
  };

  const handleStartPractice = async () => {
    if (!selectedTopic || !selectedLevel) {
      Alert.alert("Missing info", "Please select a topic and level.");
      return;
    }
    try {
      setPracticeState(STATES.LOADING);
      setError(null);
      const res = await startPractice(userId, selectedTopic._id, selectedLevel.key);
      const data = res.data;
      setSessionId(data.session_id);
      setTotalQuestions(data.total_questions);
      setQuestionNumber(data.question_number);
      setCurrentQuestion(data.question);
      setScore(0);
      resetAnswerState(data.question);
      setQuestionStartTime(Date.now());
      setPracticeState(STATES.QUESTION);
      animateIn();
    } catch (e) {
      setError(e.response?.data?.message || e.message);
      setPracticeState(STATES.SETUP);
    }
  };

  const resetAnswerState = (q) => {
    setSelectedOption(null);
    setFillAnswer("");
    setSelectedErrorIndex(null);
    if (q?.type === "reorder" && q.words) {
      setReorderedWords([...q.words]);
    }
  };

  const getUserAnswer = () => {
    switch (currentQuestion?.type) {
      case "multiple_choice": return selectedOption;
      case "fill_in_blank": return fillAnswer;
      case "reorder": {
        // Map current order back to original word indices
        const original = [...currentQuestion.words];
        return reorderedWords.map((w) => original.indexOf(w));
      }
      case "error_detection": return selectedErrorIndex;
      default: return null;
    }
  };

  const canSubmit = () => {
    switch (currentQuestion?.type) {
      case "multiple_choice": return selectedOption !== null;
      case "fill_in_blank": return fillAnswer.trim().length > 0;
      case "reorder": return reorderedWords.length > 0;
      case "error_detection": return selectedErrorIndex !== null;
      default: return false;
    }
  };

  const handleSubmit = async () => {
    const answer = getUserAnswer();
    if (answer === null || answer === undefined) return;
    try {
      setSubmitting(true);
      setError(null);
      const timeSpent = Date.now() - questionStartTime;
      const res = await submitPracticeAnswer(userId, sessionId, answer, timeSpent);
      const data = res.data;
      setIsCorrect(data.is_correct);
      setFeedback(data.feedback);
      if (data.status === "completed") {
        setFinalResults(data.final_results);
        // Update score display
        setScore((data.final_results?.score || 0));
      } else {
        setScore(data.progress?.current_score || 0);
      }
      setPracticeState(STATES.FEEDBACK);
      animateIn();
    } catch (e) {
      setError(e.response?.data?.message || e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleContinue = () => {
    if (finalResults) {
      setPracticeState(STATES.RESULTS);
    } else {
      // Advance to next question from feedback.next_question is already stored server-side
      // We need to re-fetch... actually server returned next_question in response
      // Let's store it
      setPracticeState(STATES.QUESTION);
      animateIn();
    }
  };

  // Store next_question from submit response
  const [nextQuestion, setNextQuestion] = useState(null);
  const handleSubmitWithNext = async () => {
    const answer = getUserAnswer();
    if (answer === null || answer === undefined) return;
    try {
      setSubmitting(true);
      setError(null);
      const timeSpent = Date.now() - questionStartTime;
      const res = await submitPracticeAnswer(userId, sessionId, answer, timeSpent);
      const data = res.data;
      setIsCorrect(data.is_correct);
      setFeedback(data.feedback);
      if (data.status === "completed") {
        setFinalResults(data.final_results);
        setScore(data.final_results?.score || 0);
        setNextQuestion(null);
      } else {
        setScore(data.progress?.current_score || 0);
        setNextQuestion(data.next_question);
        setQuestionNumber(data.next_question_number);
      }
      setPracticeState(STATES.FEEDBACK);
      animateIn();
    } catch (e) {
      setError(e.response?.data?.message || e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleContinueWithNext = () => {
    if (finalResults) {
      setPracticeState(STATES.RESULTS);
    } else if (nextQuestion) {
      setCurrentQuestion(nextQuestion);
      resetAnswerState(nextQuestion);
      setQuestionStartTime(Date.now());
      setFeedback(null);
      setIsCorrect(null);
      setPracticeState(STATES.QUESTION);
      animateIn();
    }
  };

  const handleRestart = () => {
    setSessionId(null);
    setCurrentQuestion(null);
    setFinalResults(null);
    setFeedback(null);
    setNextQuestion(null);
    setScore(0);
    setPracticeState(STATES.SETUP);
    animateIn();
  };

  // ─── Renders ───────────────────────────────────────────────────────────────

  const renderSetup = () => (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Animated.View style={{ opacity: fadeAnim, transform: [{ scale: scaleAnim }] }}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerIcon}><Text style={{ fontSize: 36 }}>📚</Text></View>
          <Text style={styles.title}>Practice</Text>
          <Text style={styles.subtitle}>Choose your topic and level</Text>
        </View>

        <View style={styles.card}>
          {/* Topic picker */}
          <Text style={styles.label}>Select Topic</Text>
          <TouchableOpacity
            style={styles.pickerButton}
            onPress={() => setShowTopicPicker(true)}
            activeOpacity={0.8}
          >
            <View style={styles.pickerIcon}>
              <Ionicons name="book" size={18} color={COLORS.primary} />
            </View>
            <Text style={[styles.pickerText, !selectedTopic && styles.placeholder]}>
              {selectedTopic ? selectedTopic.title : "Choose a topic"}
            </Text>
            <Ionicons name="chevron-down" size={18} color={COLORS.textMuted} />
          </TouchableOpacity>

          {/* Level selection */}
          {selectedTopic && (
            <>
              <Text style={[styles.label, { marginTop: 24 }]}>Select Level</Text>
              <View style={styles.levelsContainer}>
                {LEVELS.map((lvl) => {
                  const topicLevelData = selectedTopic.levels?.find((l) => l.level === lvl.key);
                  const isUnlocked = topicLevelData?.is_unlocked ?? lvl.key === "beginner";
                  const correctCount = topicLevelData?.correct_count || 0;
                  const threshold = topicLevelData?.unlock_threshold || 5;
                  const isSelected = selectedLevel?.key === lvl.key;

                  return (
                    <TouchableOpacity
                      key={lvl.key}
                      style={[
                        styles.levelCard,
                        isSelected && { borderColor: lvl.color, borderWidth: 2 },
                        !isUnlocked && styles.levelLocked,
                      ]}
                      onPress={() => isUnlocked && setSelectedLevel(lvl)}
                      activeOpacity={isUnlocked ? 0.8 : 1}
                    >
                      <View style={[styles.levelIconBg, { backgroundColor: lvl.color + "22" }]}>
                        <Text style={{ fontSize: 24 }}>{lvl.icon}</Text>
                      </View>
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={[styles.levelLabel, !isUnlocked && { color: COLORS.textMuted }]}>
                          {lvl.label}
                        </Text>
                        <Text style={styles.levelDesc}>{lvl.description}</Text>
                        {!isUnlocked && (
                          <View style={styles.unlockProgress}>
                            <View style={styles.unlockBar}>
                              <View
                                style={[
                                  styles.unlockFill,
                                  {
                                    width: `${Math.min(100, (correctCount / threshold) * 100)}%`,
                                    backgroundColor: lvl.color,
                                  },
                                ]}
                              />
                            </View>
                            <Text style={styles.unlockText}>
                              {correctCount}/{threshold} to unlock
                            </Text>
                          </View>
                        )}
                      </View>
                      {isUnlocked ? (
                        isSelected ? (
                          <View style={[styles.checkBadge, { backgroundColor: lvl.color }]}>
                            <Ionicons name="checkmark" size={16} color="#fff" />
                          </View>
                        ) : null
                      ) : (
                        <Ionicons name="lock-closed" size={20} color={COLORS.textMuted} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          )}

          {error && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={16} color={COLORS.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[
              styles.startButton,
              (!selectedTopic || !selectedLevel) && styles.startButtonDisabled,
            ]}
            onPress={handleStartPractice}
            disabled={!selectedTopic || !selectedLevel}
            activeOpacity={0.9}
          >
            <Text style={styles.startButtonText}>Start Practice</Text>
            <Ionicons name="arrow-forward" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Topic picker modal */}
        <Modal
          visible={showTopicPicker}
          animationType="slide"
          transparent
          onRequestClose={() => setShowTopicPicker(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHandle} />
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Topic</Text>
                <TouchableOpacity onPress={() => setShowTopicPicker(false)} style={styles.modalClose}>
                  <Ionicons name="close" size={22} color={COLORS.textSecondary} />
                </TouchableOpacity>
              </View>
              {loadingTopics ? (
                <ActivityIndicator style={{ margin: 40 }} color={COLORS.primary} />
              ) : (
                <ScrollView style={styles.topicList} showsVerticalScrollIndicator={false}>
                  {topics.map((topic, idx) => (
                    <TouchableOpacity
                      key={topic._id}
                      style={[
                        styles.topicItem,
                        selectedTopic?._id === topic._id && styles.topicItemSelected,
                      ]}
                      onPress={() => {
                        setSelectedTopic(topic);
                        setSelectedLevel(null);
                        setShowTopicPicker(false);
                      }}
                      activeOpacity={0.8}
                    >
                      <View style={[styles.topicIconBg, { backgroundColor: getTopicColor(idx) }]}>
                        <Text style={styles.topicInitial}>{topic.title.charAt(0)}</Text>
                      </View>
                      <Text style={styles.topicItemText}>{topic.title}</Text>
                      {selectedTopic?._id === topic._id && (
                        <View style={styles.topicCheck}>
                          <Ionicons name="checkmark" size={16} color="#fff" />
                        </View>
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>
          </View>
        </Modal>
      </Animated.View>
    </ScrollView>
  );

  const renderLoading = () => (
    <View style={styles.centerContainer}>
      <View style={styles.loadingCard}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingTitle}>Preparing Questions</Text>
        <Text style={styles.loadingSubtitle}>Mixing question types for you...</Text>
      </View>
    </View>
  );

  const renderQuestion = () => {
    if (!currentQuestion) return null;
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Animated.View style={{ opacity: fadeAnim, transform: [{ scale: scaleAnim }] }}>
          {/* Progress bar */}
          <View style={styles.progressRow}>
            <Text style={styles.progressText}>
              <Text style={styles.progressCurrent}>{questionNumber}</Text>
              <Text style={styles.progressTotal}>/{totalQuestions}</Text>
            </Text>
            <View style={styles.scoreChip}>
              <Ionicons name="star" size={14} color={COLORS.accent} />
              <Text style={styles.scoreChipText}>{score} pts</Text>
            </View>
          </View>
          <View style={styles.progressBarBg}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${((questionNumber - 1) / totalQuestions) * 100}%` },
              ]}
            />
          </View>

          {/* Type badge */}
          <View style={styles.typeBadge}>
            <Text style={styles.typeBadgeText}>
              {QUESTION_TYPE_LABELS[currentQuestion.type] || currentQuestion.type}
            </Text>
          </View>

          {/* Question card */}
          <View style={styles.questionCard}>
            <Text style={styles.questionText}>{currentQuestion.question}</Text>
          </View>

          {/* Answer area */}
          {renderAnswerInput()}

          {error && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={16} color={COLORS.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.submitBtn, (!canSubmit() || submitting) && styles.submitBtnDisabled]}
            onPress={handleSubmitWithNext}
            disabled={!canSubmit() || submitting}
            activeOpacity={0.9}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.submitBtnText}>Submit Answer</Text>
                <Ionicons name="send" size={18} color="#fff" />
              </>
            )}
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    );
  };

  const renderAnswerInput = () => {
    if (!currentQuestion) return null;
    switch (currentQuestion.type) {
      case "multiple_choice":
        return (
          <View style={styles.optionsContainer}>
            {currentQuestion.options?.map((opt, i) => (
              <TouchableOpacity
                key={i}
                style={[styles.optionCard, selectedOption === i && styles.optionSelected]}
                onPress={() => setSelectedOption(i)}
                activeOpacity={0.8}
              >
                <View
                  style={[
                    styles.optionBullet,
                    selectedOption === i && { backgroundColor: COLORS.primary },
                  ]}
                >
                  <Text
                    style={[
                      styles.optionBulletText,
                      selectedOption === i && { color: "#fff" },
                    ]}
                  >
                    {String.fromCharCode(65 + i)}
                  </Text>
                </View>
                <Text style={styles.optionText}>{opt}</Text>
              </TouchableOpacity>
            ))}
          </View>
        );

      case "fill_in_blank":
        return (
          <View style={styles.fillContainer}>
            <Text style={styles.answerLabel}>YOUR ANSWER</Text>
            <View style={styles.fillInputWrapper}>
              <TextInput
                style={styles.fillInput}
                placeholder="Type your answer..."
                placeholderTextColor={COLORS.textMuted}
                value={fillAnswer}
                onChangeText={setFillAnswer}
                autoCapitalize="none"
              />
            </View>
          </View>
        );

      case "reorder":
        return (
          <View style={styles.reorderContainer}>
            <Text style={styles.answerLabel}>TAP TO REORDER</Text>
            <View style={styles.reorderWords}>
              {reorderedWords.map((word, i) => (
                <TouchableOpacity
                  key={`${word}-${i}`}
                  style={styles.wordChip}
                  onLongPress={() => {
                    // Move word to end as simple interaction
                    const arr = [...reorderedWords];
                    arr.splice(i, 1);
                    arr.push(word);
                    setReorderedWords(arr);
                  }}
                  onPress={() => {
                    // Tap to cycle position (move earlier)
                    if (i === 0) return;
                    const arr = [...reorderedWords];
                    [arr[i], arr[i - 1]] = [arr[i - 1], arr[i]];
                    setReorderedWords(arr);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.wordChipText}>{word}</Text>
                  <View style={styles.wordChipArrows}>
                    <Ionicons name="arrow-up" size={10} color={COLORS.textMuted} />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.reorderHint}>
              Tap a word to move it left · Long press to move to end
            </Text>
          </View>
        );

      case "error_detection":
        return (
          <View style={styles.errorDetectContainer}>
            <Text style={styles.answerLabel}>TAP THE PART WITH THE ERROR</Text>
            <View style={styles.sentenceParts}>
              {currentQuestion.sentence_parts?.map((part, i) => (
                <TouchableOpacity
                  key={i}
                  style={[
                    styles.sentencePart,
                    selectedErrorIndex === i && styles.sentencePartSelected,
                  ]}
                  onPress={() => setSelectedErrorIndex(i)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.sentencePartText,
                      selectedErrorIndex === i && { color: COLORS.primary, fontWeight: "700" },
                    ]}
                  >
                    {part}
                  </Text>
                  <Text style={styles.partIndex}>({i + 1})</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  const renderFeedback = () => (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Animated.View style={{ opacity: fadeAnim, transform: [{ scale: scaleAnim }] }}>
        {/* Correct/Wrong banner */}
        <View
          style={[
            styles.resultBanner,
            { backgroundColor: isCorrect ? "#00b89422" : "#ff6b6b22" },
          ]}
        >
          <Text style={{ fontSize: 48 }}>{isCorrect ? "✅" : "❌"}</Text>
          <Text
            style={[
              styles.resultBannerText,
              { color: isCorrect ? "#00b894" : "#ff6b6b" },
            ]}
          >
            {isCorrect ? "Correct!" : "Not quite!"}
          </Text>
        </View>

        {/* Feedback card */}
        <View style={styles.feedbackCard}>
          {feedback?.explanation && (
            <Text style={styles.feedbackExplanation}>{feedback.explanation}</Text>
          )}
          {feedback?.correct_answer && (
            <View style={styles.feedbackSection}>
              <View style={styles.feedbackSectionRow}>
                <View style={[styles.feedbackIcon, { backgroundColor: "#00b89422" }]}>
                  <Ionicons name="checkmark-circle" size={16} color="#00b894" />
                </View>
                <Text style={styles.feedbackSectionLabel}>Correct Answer</Text>
              </View>
              <Text style={styles.feedbackValue}>{feedback.correct_answer}</Text>
            </View>
          )}
          {feedback?.grammar_tip && (
            <View style={styles.feedbackSection}>
              <View style={styles.feedbackSectionRow}>
                <View style={[styles.feedbackIcon, { backgroundColor: "#fdcb6e22" }]}>
                  <Ionicons name="bulb" size={16} color="#fdcb6e" />
                </View>
                <Text style={styles.feedbackSectionLabel}>Grammar Tip</Text>
              </View>
              <Text style={styles.feedbackValue}>{feedback.grammar_tip}</Text>
            </View>
          )}
          {feedback?.example && (
            <View style={styles.feedbackSection}>
              <View style={styles.feedbackSectionRow}>
                <View style={[styles.feedbackIcon, { backgroundColor: "#74b9ff22" }]}>
                  <Ionicons name="document-text" size={16} color="#74b9ff" />
                </View>
                <Text style={styles.feedbackSectionLabel}>Example</Text>
              </View>
              <Text style={styles.feedbackExample}>"{feedback.example}"</Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={styles.continueBtn}
          onPress={handleContinueWithNext}
          activeOpacity={0.9}
        >
          <Text style={styles.continueBtnText}>
            {finalResults ? "See Results" : "Next Question"}
          </Text>
          <Ionicons name="arrow-forward" size={20} color="#fff" />
        </TouchableOpacity>
      </Animated.View>
    </ScrollView>
  );

  const renderResults = () => {
    if (!finalResults) return null;
    const pct = finalResults.percentage || 0;
    const gradeInfo = getGradeInfo(pct);
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Animated.View style={{ opacity: fadeAnim, transform: [{ scale: scaleAnim }] }}>
          <View style={styles.resultsHeader}>
            <Text style={{ fontSize: 64 }}>{gradeInfo.emoji}</Text>
            <Text style={styles.resultsTitle}>{gradeInfo.label}</Text>
            <Text style={styles.resultsLevel}>
              {selectedTopic?.title} · {selectedLevel?.label}
            </Text>
          </View>

          <View style={[styles.scoreCircle, { borderColor: gradeInfo.color }]}>
            <Text style={[styles.scorePct, { color: gradeInfo.color }]}>{pct}%</Text>
            <Text style={styles.scoreGrade}>Grade {finalResults.grade}</Text>
          </View>

          <View style={styles.statsCard}>
            <Text style={styles.statsTitle}>Session Summary</Text>
            <StatRow icon="help-circle" color="#4ecdc4" label="Questions" value={finalResults.total} />
            <StatRow icon="checkmark-circle" color="#00b894" label="Correct" value={finalResults.score} />
            <StatRow icon="close-circle" color="#ff6b6b" label="Wrong" value={finalResults.total - finalResults.score} />
            <StatRow icon="star" color="#fdcb6e" label="Accuracy" value={`${pct}%`} />
          </View>

          <View style={styles.resultActions}>
            <TouchableOpacity style={styles.retryBtn} onPress={handleRestart} activeOpacity={0.8}>
              <Ionicons name="refresh" size={20} color={COLORS.primary} />
              <Text style={styles.retryBtnText}>Try Again</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.homeBtn}
              onPress={() => navigation.navigate("Home")}
              activeOpacity={0.9}
            >
              <Ionicons name="home" size={20} color="#fff" />
              <Text style={styles.homeBtnText}>Home</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </ScrollView>
    );
  };

  switch (practiceState) {
    case STATES.LOADING: return renderLoading();
    case STATES.QUESTION: return renderQuestion();
    case STATES.FEEDBACK: return renderFeedback();
    case STATES.RESULTS: return renderResults();
    default: return renderSetup();
  }
}

// ─── Helper components ────────────────────────────────────────────────────────
function StatRow({ icon, color, label, value }) {
  return (
    <View style={styles.statRow}>
      <View style={styles.statInfo}>
        <View style={[styles.statIcon, { backgroundColor: color + "22" }]}>
          <Ionicons name={icon} size={16} color={color} />
        </View>
        <Text style={styles.statLabel}>{label}</Text>
      </View>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

// ─── Utilities ────────────────────────────────────────────────────────────────
function getTopicColor(idx) {
  const colors = ["#ff6b6b33", "#4ecdc433", "#ffd93d33", "#a29bfe33", "#fd7e1433", "#74b9ff33"];
  return colors[idx % colors.length];
}

function getGradeInfo(pct) {
  if (pct >= 90) return { emoji: "🏆", label: "Excellent!", color: "#00b894" };
  if (pct >= 75) return { emoji: "🎉", label: "Great Job!", color: "#6c5ce7" };
  if (pct >= 60) return { emoji: "👍", label: "Good Work!", color: "#0984e3" };
  if (pct >= 50) return { emoji: "💪", label: "Keep Going!", color: "#e17055" };
  return { emoji: "📖", label: "Keep Practicing!", color: "#636e72" };
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 20, paddingBottom: 48 },
  centerContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: COLORS.background },

  // Setup
  header: { alignItems: "center", marginBottom: 28 },
  headerIcon: {
    width: 72, height: 72, borderRadius: 22,
    backgroundColor: COLORS.card,
    justifyContent: "center", alignItems: "center",
    marginBottom: 14, ...SHADOWS.medium,
  },
  title: { fontSize: 28, fontWeight: "700", color: COLORS.text, marginBottom: 4 },
  subtitle: { fontSize: 15, color: COLORS.textSecondary },
  card: { backgroundColor: COLORS.card, borderRadius: 24, padding: 24, ...SHADOWS.medium },
  label: { fontSize: 12, fontWeight: "700", color: COLORS.textSecondary, letterSpacing: 0.8, marginBottom: 10, textTransform: "uppercase" },
  pickerButton: { flexDirection: "row", alignItems: "center", backgroundColor: COLORS.background, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: COLORS.border },
  pickerIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: "#ff6b6b22", justifyContent: "center", alignItems: "center", marginRight: 10 },
  pickerText: { flex: 1, fontSize: 15, color: COLORS.text, fontWeight: "500" },
  placeholder: { color: COLORS.textMuted },

  // Levels
  levelsContainer: { gap: 10 },
  levelCard: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: COLORS.background, borderRadius: 16, padding: 14,
    borderWidth: 1.5, borderColor: COLORS.border,
  },
  levelLocked: { opacity: 0.6 },
  levelIconBg: { width: 48, height: 48, borderRadius: 14, justifyContent: "center", alignItems: "center" },
  levelLabel: { fontSize: 16, fontWeight: "700", color: COLORS.text },
  levelDesc: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  unlockProgress: { marginTop: 6 },
  unlockBar: { height: 4, backgroundColor: COLORS.border, borderRadius: 2, overflow: "hidden", marginBottom: 3 },
  unlockFill: { height: "100%", borderRadius: 2 },
  unlockText: { fontSize: 11, color: COLORS.textMuted },
  checkBadge: { width: 26, height: 26, borderRadius: 8, justifyContent: "center", alignItems: "center" },

  startButton: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    backgroundColor: COLORS.primary, borderRadius: 16, padding: 17, marginTop: 24, gap: 10,
    ...SHADOWS.small,
  },
  startButtonDisabled: { backgroundColor: COLORS.textMuted },
  startButtonText: { fontSize: 17, fontWeight: "600", color: "#fff" },

  errorBox: { flexDirection: "row", alignItems: "center", backgroundColor: "#ff6b6b15", borderRadius: 12, padding: 12, marginTop: 14, gap: 8 },
  errorText: { flex: 1, color: COLORS.error, fontSize: 13 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalContent: { backgroundColor: COLORS.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: "75%", paddingBottom: 20 },
  modalHandle: { width: 40, height: 4, backgroundColor: COLORS.border, borderRadius: 2, alignSelf: "center", marginTop: 12 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 20, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  modalTitle: { fontSize: 20, fontWeight: "700", color: COLORS.text },
  modalClose: { width: 36, height: 36, borderRadius: 10, backgroundColor: COLORS.background, justifyContent: "center", alignItems: "center" },
  topicList: { padding: 16 },
  topicItem: { flexDirection: "row", alignItems: "center", padding: 14, borderRadius: 14, marginBottom: 8, backgroundColor: COLORS.background, borderWidth: 1.5, borderColor: "transparent" },
  topicItemSelected: { borderColor: COLORS.primary, backgroundColor: "#ff6b6b08" },
  topicIconBg: { width: 42, height: 42, borderRadius: 12, justifyContent: "center", alignItems: "center", marginRight: 12 },
  topicInitial: { fontSize: 18, fontWeight: "700", color: COLORS.text },
  topicItemText: { flex: 1, fontSize: 15, fontWeight: "600", color: COLORS.text },
  topicCheck: { width: 26, height: 26, borderRadius: 7, backgroundColor: COLORS.primary, justifyContent: "center", alignItems: "center" },

  // Loading
  loadingCard: { backgroundColor: COLORS.card, borderRadius: 24, padding: 40, alignItems: "center", width: "100%", maxWidth: 320, ...SHADOWS.medium },
  loadingTitle: { fontSize: 18, fontWeight: "700", color: COLORS.text, marginTop: 20, marginBottom: 6 },
  loadingSubtitle: { fontSize: 14, color: COLORS.textSecondary },

  // Question
  progressRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  progressText: {},
  progressCurrent: { fontSize: 22, fontWeight: "700", color: COLORS.text },
  progressTotal: { fontSize: 15, color: COLORS.textMuted },
  scoreChip: { flexDirection: "row", alignItems: "center", backgroundColor: "#fdcb6e22", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, gap: 4 },
  scoreChipText: { fontSize: 13, fontWeight: "600", color: COLORS.text },
  progressBarBg: { height: 7, backgroundColor: COLORS.border, borderRadius: 4, overflow: "hidden", marginBottom: 20 },
  progressBarFill: { height: "100%", backgroundColor: COLORS.primary, borderRadius: 4 },
  typeBadge: { alignSelf: "flex-start", backgroundColor: COLORS.primary + "22", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 5, marginBottom: 14 },
  typeBadgeText: { fontSize: 12, fontWeight: "700", color: COLORS.primary, textTransform: "uppercase", letterSpacing: 0.6 },
  questionCard: { backgroundColor: COLORS.card, borderRadius: 20, padding: 22, marginBottom: 20, ...SHADOWS.medium },
  questionText: { fontSize: 18, fontWeight: "600", color: COLORS.text, lineHeight: 28 },

  // Multiple choice
  optionsContainer: { gap: 10, marginBottom: 20 },
  optionCard: { flexDirection: "row", alignItems: "center", backgroundColor: COLORS.card, borderRadius: 14, padding: 14, borderWidth: 1.5, borderColor: "transparent", ...SHADOWS.small },
  optionSelected: { borderColor: COLORS.primary, backgroundColor: "#ff6b6b08" },
  optionBullet: { width: 32, height: 32, borderRadius: 10, backgroundColor: COLORS.background, justifyContent: "center", alignItems: "center", marginRight: 12, borderWidth: 1, borderColor: COLORS.border },
  optionBulletText: { fontSize: 13, fontWeight: "700", color: COLORS.textSecondary },
  optionText: { flex: 1, fontSize: 15, color: COLORS.text },

  // Fill in blank
  fillContainer: { marginBottom: 20 },
  answerLabel: { fontSize: 11, fontWeight: "700", color: COLORS.textSecondary, letterSpacing: 0.8, marginBottom: 10 },
  fillInputWrapper: { backgroundColor: COLORS.card, borderRadius: 16, borderWidth: 1.5, borderColor: COLORS.border, ...SHADOWS.small },
  fillInput: { padding: 16, fontSize: 16, color: COLORS.text },

  // Reorder
  reorderContainer: { marginBottom: 20 },
  reorderWords: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  wordChip: { flexDirection: "row", alignItems: "center", backgroundColor: COLORS.card, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, gap: 4, ...SHADOWS.small, borderWidth: 1, borderColor: COLORS.border },
  wordChipText: { fontSize: 15, fontWeight: "500", color: COLORS.text },
  wordChipArrows: {},
  reorderHint: { fontSize: 12, color: COLORS.textMuted, marginTop: 10, fontStyle: "italic" },

  // Error detection
  errorDetectContainer: { marginBottom: 20 },
  sentenceParts: { gap: 8 },
  sentencePart: { backgroundColor: COLORS.card, borderRadius: 12, padding: 14, borderWidth: 1.5, borderColor: "transparent", flexDirection: "row", alignItems: "center", ...SHADOWS.small },
  sentencePartSelected: { borderColor: COLORS.primary, backgroundColor: "#ff6b6b08" },
  sentencePartText: { flex: 1, fontSize: 15, color: COLORS.text },
  partIndex: { fontSize: 12, color: COLORS.textMuted, marginLeft: 8 },

  // Submit
  submitBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: COLORS.primary, borderRadius: 16, padding: 17, gap: 10, ...SHADOWS.small },
  submitBtnDisabled: { backgroundColor: COLORS.textMuted },
  submitBtnText: { fontSize: 16, fontWeight: "600", color: "#fff" },

  // Feedback
  resultBanner: { alignItems: "center", borderRadius: 24, padding: 24, marginBottom: 20 },
  resultBannerText: { fontSize: 24, fontWeight: "700", marginTop: 8 },
  feedbackCard: { backgroundColor: COLORS.card, borderRadius: 24, padding: 24, marginBottom: 24, ...SHADOWS.medium },
  feedbackExplanation: { fontSize: 16, color: COLORS.text, lineHeight: 24, marginBottom: 8 },
  feedbackSection: { marginTop: 18, paddingTop: 18, borderTopWidth: 1, borderTopColor: COLORS.border },
  feedbackSectionRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  feedbackIcon: { width: 30, height: 30, borderRadius: 9, justifyContent: "center", alignItems: "center" },
  feedbackSectionLabel: { fontSize: 12, fontWeight: "700", color: COLORS.textSecondary, textTransform: "uppercase", letterSpacing: 0.6 },
  feedbackValue: { fontSize: 15, color: COLORS.text, lineHeight: 22 },
  feedbackExample: { fontSize: 15, color: COLORS.text, fontStyle: "italic", lineHeight: 22 },
  continueBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: COLORS.primary, borderRadius: 16, padding: 17, gap: 10, ...SHADOWS.small },
  continueBtnText: { fontSize: 16, fontWeight: "600", color: "#fff" },

  // Results
  resultsHeader: { alignItems: "center", marginBottom: 20 },
  resultsTitle: { fontSize: 26, fontWeight: "700", color: COLORS.text, marginTop: 10 },
  resultsLevel: { fontSize: 14, color: COLORS.textSecondary, marginTop: 4 },
  scoreCircle: { width: 150, height: 150, borderRadius: 75, borderWidth: 6, backgroundColor: COLORS.card, justifyContent: "center", alignItems: "center", alignSelf: "center", marginBottom: 24, ...SHADOWS.medium },
  scorePct: { fontSize: 38, fontWeight: "700" },
  scoreGrade: { fontSize: 14, color: COLORS.textSecondary, fontWeight: "600" },
  statsCard: { backgroundColor: COLORS.card, borderRadius: 24, padding: 22, marginBottom: 24, ...SHADOWS.medium },
  statsTitle: { fontSize: 17, fontWeight: "700", color: COLORS.text, marginBottom: 18 },
  statRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  statInfo: { flexDirection: "row", alignItems: "center", gap: 12 },
  statIcon: { width: 34, height: 34, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  statLabel: { fontSize: 14, color: COLORS.textSecondary },
  statValue: { fontSize: 16, fontWeight: "700", color: COLORS.text },
  resultActions: { flexDirection: "row", gap: 12 },
  retryBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: COLORS.card, borderRadius: 16, padding: 17, gap: 8, borderWidth: 1.5, borderColor: COLORS.primary },
  retryBtnText: { fontSize: 15, fontWeight: "600", color: COLORS.primary },
  homeBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: COLORS.primary, borderRadius: 16, padding: 17, gap: 8, ...SHADOWS.small },
  homeBtnText: { fontSize: 15, fontWeight: "600", color: "#fff" },
});
