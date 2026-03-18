import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Animated,
} from "react-native";
import * as Speech from "expo-speech";
import { Ionicons } from "@expo/vector-icons";
import { useUser } from "../context/UserContext";
import { getTopics } from "../services/api";
import {
  initializeLearningSession,
  updateLearningProgress,
  completeLearningSessionLocally,
} from "../services/learningProgressTracker";
import { COLORS, SHADOWS } from "../constants/config";
import { useNotification } from "../components/NotificationCenter";

// Mock data - Example transcription sentences
// TODO: Replace with API call to /api/transcription/sentences?topic_id=...
const MOCK_SENTENCES = [
  {
    id: "sent_001",
    content: "The quick brown fox jumps over the lazy dog.",
    difficulty: "easy",
  },
  {
    id: "sent_002",
    content: "Can you figure out a way to have everyone there in time?",
    difficulty: "medium",
  },
  {
    id: "sent_003",
    content:
      "I've been looking around for quite a while and haven't seen anything I'd like.",
    difficulty: "medium",
  },
  {
    id: "sent_004",
    content: "Would you like to have a look at my collection?",
    difficulty: "easy",
  },
  {
    id: "sent_005",
    content:
      "It's absolutely fascinating how technology has changed our daily lives.",
    difficulty: "hard",
  },
  {
    id: "sent_006",
    content: "There's a coffee shop on the corner of Fifth and Main Street.",
    difficulty: "easy",
  },
  {
    id: "sent_007",
    content: "I haven't the faintest idea what you're talking about.",
    difficulty: "hard",
  },
  {
    id: "sent_008",
    content:
      "Learning new languages opens doors to different cultures and perspectives.",
    difficulty: "medium",
  },
];

export default function TranscribeScreen({ navigation }) {
  const { userId } = useUser();
  const { showNotification } = useNotification();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Setup state
  const [topics, setTopics] = useState([]);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [showTopicPicker, setShowTopicPicker] = useState(false);
  const [isSetup, setIsSetup] = useState(true);
  const [topicsLoading, setTopicsLoading] = useState(false);

  // Transcription state
  const [sentences, setSentences] = useState([]);
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Practice state
  const [userTranscription, setUserTranscription] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);
  const [score, setScore] = useState(null);
  const [wordMatches, setWordMatches] = useState([]);

  // Learning tracking
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [sessionStartTime, setSessionStartTime] = useState(null);
  const [completedCount, setCompletedCount] = useState(0);

  useEffect(() => {
    fetchTopics();
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, []);

  useEffect(() => {
    return () => {
      Speech.stop();
    };
  }, []);

  const fetchTopics = async () => {
    try {
      setTopicsLoading(true);
      const response = await getTopics();
      setTopics(response.data || []);
    } catch (err) {
      setError(err.message);
      showNotification("error", "Error", "Failed to load topics", 3000);
    } finally {
      setTopicsLoading(false);
    }
  };

  const handleStartPractice = async () => {
    if (!selectedTopic) {
      alert("Please select a topic");
      return;
    }

    try {
      setLoading(true);

      // TODO: Replace this with actual API call
      // const response = await getTranscriptionSentences(selectedTopic.topic_id);
      // const sentenceList = response.data || response.sentences || [];

      // For now, use mock data
      const sentenceList = MOCK_SENTENCES;

      if (sentenceList.length === 0) {
        showNotification(
          "error",
          "No sentences",
          "No sentences available for this topic",
          3000,
        );
        return;
      }

      setSentences(sentenceList);
      setCurrentSentenceIndex(0);

      // Initialize learning session
      console.log(
        "[TranscribeScreen] Initializing learning session for:",
        selectedTopic.topic_id,
      );
      const sessionId = await initializeLearningSession(
        userId,
        selectedTopic.topic_id,
        selectedTopic.title,
        "transcribe",
      );
      setCurrentSessionId(sessionId);
      setSessionStartTime(new Date());
      setCompletedCount(0);
      console.log(
        "[TranscribeScreen] Learning session initialized:",
        sessionId,
      );

      setIsSetup(false);
      resetPracticeState();
    } catch (err) {
      console.error("[TranscribeScreen] Error starting practice:", err);
      showNotification(
        "error",
        "Error",
        "Failed to start practice session",
        3000,
      );
    } finally {
      setLoading(false);
    }
  };

  const resetPracticeState = () => {
    setUserTranscription("");
    setShowAnswer(false);
    setScore(null);
    setWordMatches([]);
  };

  const playAudio = async () => {
    if (!sentences[currentSentenceIndex]) return;

    try {
      setIsPlaying(true);
      Speech.stop();
      const text =
        sentences[currentSentenceIndex].content ||
        sentences[currentSentenceIndex].text ||
        sentences[currentSentenceIndex];

      Speech.speak(
        typeof text === "string" ? text : Object.values(text).join(" "),
        {
          rate: 0.95, // Slightly slower for learning
        },
      );
    } catch (e) {
      Alert.alert("Error", "Could not play audio: " + e.message);
    }
  };

  const stopAudio = () => {
    Speech.stop();
    setIsPlaying(false);
  };

  const normalize = (s) => {
    return s
      .toLowerCase()
      .replace(/[.,!?;:\"'()\[\]–—-]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  };

  const levenshtein = (a, b) => {
    const an = a.length;
    const bn = b.length;
    if (an === 0) return bn;
    if (bn === 0) return an;
    const matrix = Array.from({ length: an + 1 }, () => Array(bn + 1).fill(0));
    for (let i = 0; i <= an; i++) matrix[i][0] = i;
    for (let j = 0; j <= bn; j++) matrix[0][j] = j;
    for (let i = 1; i <= an; i++) {
      for (let j = 1; j <= bn; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + cost,
        );
      }
    }
    return matrix[an][bn];
  };

  const checkAnswer = () => {
    if (!sentences[currentSentenceIndex]) return;

    const correctText =
      typeof sentences[currentSentenceIndex] === "string"
        ? sentences[currentSentenceIndex]
        : sentences[currentSentenceIndex].content ||
          sentences[currentSentenceIndex].text;

    const normCorrect = normalize(correctText);
    const normUser = normalize(userTranscription);

    if (!normUser) {
      setScore(0);
      setWordMatches([]);
      setShowAnswer(true);
      return;
    }

    const correctWords = normCorrect.split(" ");
    const userWords = normUser.split(" ");

    // Word-level exact matching
    let matches = [];
    let matchCount = 0;
    for (let i = 0; i < correctWords.length; i++) {
      const cw = correctWords[i];
      const uw = userWords[i] || "";
      const ok = cw === uw;
      matches.push(ok);
      if (ok) matchCount++;
    }

    const wordScore = correctWords.length
      ? (matchCount / correctWords.length) * 0.7
      : 0;

    // Character-level similarity (Levenshtein ratio)
    const lev = levenshtein(normCorrect, normUser);
    const maxLen = Math.max(normCorrect.length, normUser.length);
    const charScore = maxLen ? (1 - lev / maxLen) * 0.3 : 0.3;

    // Final score
    const finalScore = Math.round((wordScore + charScore) * 100);
    setScore(finalScore);
    setWordMatches(matches);
    setShowAnswer(true);
  };

  const handleNext = async () => {
    if (score === null) {
      Alert.alert("Please check your answer first");
      return;
    }

    try {
      // TODO: Submit transcription to API
      // const sentenceId = sentences[currentSentenceIndex].id || `sentence_${currentSentenceIndex}`;
      // await submitTranscription(
      //   userId,
      //   selectedTopic.topic_id,
      //   sentenceId,
      //   userTranscription,
      //   score
      // );

      // For now, just track locally
      console.log(
        "[TranscribeScreen] Scored:",
        score,
        "User input:",
        userTranscription,
      );

      // Update learning progress
      if (currentSessionId) {
        const newCompleted = completedCount + 1;
        setCompletedCount(newCompleted);
        await updateLearningProgress(
          userId,
          selectedTopic.topic_id,
          "transcribe",
          newCompleted,
          0,
          score,
          100,
        );
      }

      // Move to next sentence or end
      if (currentSentenceIndex < sentences.length - 1) {
        setCurrentSentenceIndex(currentSentenceIndex + 1);
        resetPracticeState();
      } else {
        handleEndSession();
      }
    } catch (err) {
      console.error("[TranscribeScreen] Error:", err);
      showNotification("error", "Error", "Failed to save progress", 3000);
    }
  };

  const handleEndSession = async () => {
    if (!currentSessionId) {
      navigation.navigate("Home");
      return;
    }

    try {
      const durationMinutes = Math.round(
        (new Date() - sessionStartTime) / 1000 / 60,
      );

      await completeLearningSessionLocally(
        userId,
        selectedTopic.topic_id,
        "transcribe",
        score || 0,
        0,
      );

      showNotification(
        "success",
        "🎧 Listening Practice Complete",
        `Completed: ${completedCount}/${sentences.length} • Duration: ${durationMinutes}m`,
        3000,
      );

      setIsSetup(true);
      setSentences([]);
      setSelectedTopic(null);
      setCurrentSessionId(null);
      setCompletedCount(0);

      setTimeout(() => {
        navigation.navigate("Home");
      }, 1500);
    } catch (err) {
      console.error("[TranscribeScreen] Error ending session:", err);
      showNotification("error", "Error", "Failed to end session", 3000);
    }
  };

  const handleSkip = () => {
    Alert.alert("Skip Question", "Skip this sentence?", [
      { text: "Cancel" },
      {
        text: "Skip",
        onPress: () => {
          if (currentSentenceIndex < sentences.length - 1) {
            setCurrentSentenceIndex(currentSentenceIndex + 1);
            resetPracticeState();
          } else {
            handleEndSession();
          }
        },
      },
    ]);
  };

  // Setup view - Topic selection
  if (isSetup) {
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
      >
        <Animated.View style={[{ opacity: fadeAnim }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logoIcon}>
              <Text style={styles.logoEmoji}>🎧</Text>
            </View>
            <Text style={styles.headerTitle}>Listening Practice</Text>
            <Text style={styles.headerSubtitle}>
              Improve your ability to understand English
            </Text>
          </View>

          {/* Topic Selection */}
          <View style={[styles.card, SHADOWS.medium]}>
            <View style={styles.cardHeader}>
              <Ionicons name="list" size={20} color={COLORS.primary} />
              <Text style={styles.cardTitle}>Choose a Topic</Text>
            </View>

            {topicsLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
              </View>
            ) : topics.length === 0 ? (
              <Text style={styles.emptyText}>No topics available</Text>
            ) : (
              <ScrollView
                style={styles.topicsList}
                showsVerticalScrollIndicator={false}
              >
                {topics.map((topic, index) => (
                  <TouchableOpacity
                    key={topic.topic_id}
                    style={[
                      styles.topicItem,
                      selectedTopic?.topic_id === topic.topic_id &&
                        styles.selectedTopic,
                    ]}
                    onPress={() => setSelectedTopic(topic)}
                  >
                    <View style={styles.topicItemContent}>
                      <Text style={styles.topicName}>{topic.title}</Text>
                      {topic.metadata?.difficulty && (
                        <Text style={styles.topicDifficulty}>
                          {topic.metadata.difficulty}
                        </Text>
                      )}
                    </View>
                    {selectedTopic?.topic_id === topic.topic_id && (
                      <Ionicons
                        name="checkmark-circle"
                        size={24}
                        color={COLORS.primary}
                      />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>

          {/* Start Button */}
          <TouchableOpacity
            style={[styles.primaryButton, loading && styles.disabledButton]}
            onPress={handleStartPractice}
            disabled={loading || !selectedTopic}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons
                  name="play"
                  size={20}
                  color="#fff"
                  style={{ marginRight: 8 }}
                />
                <Text style={styles.primaryButtonText}>
                  Start Listening Practice
                </Text>
              </>
            )}
          </TouchableOpacity>

          {/* Info Cards */}
          <View style={styles.infoContainer}>
            <View style={styles.infoCard}>
              <Ionicons name="volume-high" size={24} color={COLORS.primary} />
              <Text style={styles.infoTitle}>Listen Carefully</Text>
              <Text style={styles.infoText}>
                Play the audio and listen to a native speaker
              </Text>
            </View>
            <View style={styles.infoCard}>
              <Ionicons name="create" size={24} color={COLORS.success} />
              <Text style={styles.infoTitle}>Type What You Hear</Text>
              <Text style={styles.infoText}>
                Transcribe the sentence as accurately as possible
              </Text>
            </View>
            <View style={styles.infoCard}>
              <Ionicons
                name="checkmark-done"
                size={24}
                color={COLORS.warning}
              />
              <Text style={styles.infoTitle}>Get Feedback</Text>
              <Text style={styles.infoText}>
                See your accuracy score and learn from mistakes
              </Text>
            </View>
          </View>
        </Animated.View>
      </ScrollView>
    );
  }

  // Practice view
  if (sentences.length === 0) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const currentSentence = sentences[currentSentenceIndex];
  const sentenceText =
    typeof currentSentence === "string"
      ? currentSentence
      : currentSentence.content || currentSentence.text || "";

  const progress = ((currentSentenceIndex + 1) / sentences.length) * 100;

  return (
    <View style={styles.container}>
      {/* Header with progress */}
      <View style={styles.practiceHeader}>
        <TouchableOpacity onPress={() => handleEndSession()}>
          <Ionicons name="close" size={28} color={COLORS.primary} />
        </TouchableOpacity>
        <View style={styles.progressInfo}>
          <Text style={styles.progressText}>
            {currentSentenceIndex + 1}/{sentences.length}
          </Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
        </View>
        <TouchableOpacity onPress={() => handleEndSession()}>
          <Text style={styles.skipText}>End</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.practiceContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Sentence Display */}
        <View style={[styles.card, SHADOWS.medium]}>
          <View style={styles.sentenceHeader}>
            <Ionicons name="volume-high" size={20} color={COLORS.primary} />
            <Text style={styles.sentenceLabel}>Listen to the sentence:</Text>
          </View>

          {/* Audio Controls */}
          <View style={styles.audioControls}>
            <TouchableOpacity
              style={[styles.playButton, isPlaying && styles.playButtonActive]}
              onPress={isPlaying ? stopAudio : playAudio}
            >
              <Ionicons
                name={isPlaying ? "pause" : "play"}
                size={28}
                color="#fff"
              />
            </TouchableOpacity>
            <Text style={styles.audioHint}>
              {isPlaying ? "Playing..." : "Tap to listen"}
            </Text>
          </View>

          {/* Transcription Input */}
          <Text style={styles.inputLabel}>Type what you hear:</Text>
          <TextInput
            style={[
              styles.transcriptionInput,
              showAnswer && styles.transcriptionInputDisabled,
            ]}
            placeholder="Enter the sentence you hear..."
            placeholderTextColor="#9CA3AF"
            multiline
            editable={!showAnswer}
            value={userTranscription}
            onChangeText={setUserTranscription}
            maxLength={500}
          />

          {/* Character count */}
          <Text style={styles.charCount}>{userTranscription.length}/500</Text>

          {/* Action Buttons */}
          {!showAnswer ? (
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[
                  styles.secondaryButton,
                  !userTranscription && styles.disabledButton,
                ]}
                onPress={() => setUserTranscription("")}
                disabled={!userTranscription}
              >
                <Text style={styles.secondaryButtonText}>Clear</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  !userTranscription && styles.disabledButton,
                ]}
                onPress={checkAnswer}
                disabled={!userTranscription}
              >
                <Text style={styles.primaryButtonText}>Check Answer</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={
                currentSentenceIndex < sentences.length - 1
                  ? handleNext
                  : handleEndSession
              }
            >
              <Text style={styles.primaryButtonText}>
                {currentSentenceIndex < sentences.length - 1
                  ? "Next Sentence"
                  : "Complete"}
              </Text>
            </TouchableOpacity>
          )}

          {/* Skip Button */}
          <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
            <Text style={styles.skipButtonText}>Skip This Question</Text>
          </TouchableOpacity>
        </View>

        {/* Answer Display */}
        {showAnswer && (
          <View style={[styles.card, styles.answerCard, SHADOWS.medium]}>
            <View style={styles.answerHeader}>
              <Ionicons
                name={score >= 80 ? "checkmark-circle" : "close-circle"}
                size={24}
                color={score >= 80 ? COLORS.success : COLORS.error}
              />
              <View>
                <Text style={styles.scoreLabel}>Your Score</Text>
                <Text
                  style={[
                    styles.scoreValue,
                    { color: score >= 80 ? COLORS.success : COLORS.error },
                  ]}
                >
                  {score}%
                </Text>
              </View>
            </View>

            {/* Feedback */}
            <View style={styles.feedbackSection}>
              <Text style={styles.feedbackLabel}>Correct Sentence:</Text>
              <Text style={styles.correctText}>{sentenceText}</Text>
            </View>

            {/* Word-by-word comparison */}
            <View style={styles.wordMatchSection}>
              <Text style={styles.feedbackLabel}>Word Comparison:</Text>
              <View style={styles.wordMatchContainer}>
                {normalize(sentenceText)
                  .split(" ")
                  .map((word, index) => {
                    const isMatch = wordMatches[index];
                    return (
                      <View key={index} style={styles.wordTag}>
                        <Text
                          style={[
                            styles.wordText,
                            {
                              color: isMatch ? COLORS.success : COLORS.error,
                              backgroundColor: isMatch ? "#dcfce7" : "#fee2e2",
                            },
                          ]}
                        >
                          {word}
                        </Text>
                      </View>
                    );
                  })}
              </View>
            </View>

            {/* Feedback message */}
            {score >= 90 && (
              <View style={styles.feedbackMessage}>
                <Text style={styles.excellentText}>
                  🎉 Excellent! Perfect transcription!
                </Text>
              </View>
            )}
            {score >= 70 && score < 90 && (
              <View style={styles.feedbackMessage}>
                <Text style={styles.goodText}>
                  👍 Good! Just a few mistakes to fix.
                </Text>
              </View>
            )}
            {score < 70 && (
              <View style={styles.feedbackMessage}>
                <Text style={styles.needsWorkText}>
                  💡 Keep practicing! Listen again and try to catch the words
                  you missed.
                </Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  centerContent: {
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    alignItems: "center",
    marginBottom: 24,
  },
  logoIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(37, 99, 235, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  logoEmoji: {
    fontSize: 32,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.textMuted,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.text,
    marginLeft: 12,
  },
  topicsList: {
    maxHeight: 300,
  },
  topicItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: COLORS.surface,
    marginBottom: 8,
  },
  selectedTopic: {
    backgroundColor: "rgba(37, 99, 235, 0.1)",
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },
  topicItemContent: {
    flex: 1,
  },
  topicName: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 4,
  },
  topicDifficulty: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  loadingContainer: {
    paddingVertical: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    textAlign: "center",
    color: COLORS.textMuted,
    paddingVertical: 32,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    padding: 14,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  secondaryButton: {
    borderColor: COLORS.primary,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  secondaryButtonText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: "600",
  },
  disabledButton: {
    opacity: 0.5,
  },
  infoContainer: {
    marginBottom: 16,
  },
  infoCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
    marginLeft: 12,
    marginBottom: 4,
  },
  infoText: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginLeft: 12,
    flex: 1,
  },
  practiceHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    backgroundColor: "#fff",
  },
  progressInfo: {
    flex: 1,
    marginHorizontal: 12,
  },
  progressText: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: 4,
    fontWeight: "600",
  },
  progressBar: {
    height: 4,
    backgroundColor: "#e5e7eb",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: COLORS.primary,
  },
  skipText: {
    fontSize: 14,
    color: COLORS.error,
    fontWeight: "600",
  },
  practiceContent: {
    flex: 1,
    padding: 16,
  },
  sentenceHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  sentenceLabel: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginLeft: 8,
    fontWeight: "500",
  },
  audioControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    marginBottom: 20,
  },
  playButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  playButtonActive: {
    backgroundColor: COLORS.error,
  },
  audioHint: {
    fontSize: 14,
    color: COLORS.textMuted,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 8,
  },
  transcriptionInput: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    padding: 12,
    minHeight: 100,
    fontSize: 14,
    color: COLORS.text,
    backgroundColor: COLORS.surface,
    fontFamily: "System",
    textAlignVertical: "top",
  },
  transcriptionInputDisabled: {
    backgroundColor: "#f3f4f6",
    color: COLORS.textMuted,
  },
  charCount: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: "right",
    marginTop: 4,
    marginBottom: 12,
  },
  actionButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
  },
  skipButton: {
    paddingVertical: 10,
    alignItems: "center",
    marginTop: 12,
  },
  skipButtonText: {
    color: COLORS.textMuted,
    fontSize: 14,
    fontWeight: "500",
  },
  answerCard: {
    backgroundColor: "#f8f9fa",
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  answerHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  scoreLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginLeft: 12,
  },
  scoreValue: {
    fontSize: 24,
    fontWeight: "700",
    marginLeft: 12,
  },
  feedbackSection: {
    marginBottom: 16,
  },
  feedbackLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: "600",
    marginBottom: 6,
  },
  correctText: {
    fontSize: 16,
    color: COLORS.text,
    fontWeight: "500",
    backgroundColor: "#dcfce7",
    padding: 10,
    borderRadius: 6,
  },
  wordMatchSection: {
    marginBottom: 16,
  },
  wordMatchContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  wordTag: {
    marginBottom: 6,
  },
  wordText: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    fontSize: 12,
    fontWeight: "500",
    overflow: "hidden",
  },
  feedbackMessage: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 6,
    backgroundColor: "#fff",
  },
  excellentText: {
    color: COLORS.success,
    fontWeight: "600",
    fontSize: 14,
  },
  goodText: {
    color: COLORS.warning,
    fontWeight: "600",
    fontSize: 14,
  },
  needsWorkText: {
    color: COLORS.primary,
    fontWeight: "600",
    fontSize: 14,
  },
});
