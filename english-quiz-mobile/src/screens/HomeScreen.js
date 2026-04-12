import React, { useState, useEffect, useRef } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Animated, Dimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useUser } from "../context/UserContext";
import { getTopics } from "../services/api";
import { COLORS, SHADOWS } from "../constants/config";

const { width } = Dimensions.get("window");

export default function HomeScreen({ navigation }) {
  const { userId, userData, setUserId, isLoading: userLoading } = useUser();
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    // Entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  useEffect(() => {
    fetchTopics();
  }, []);

  const fetchTopics = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getTopics();
      setTopics(response.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleNavigate = (screen) => {
    if (!userId && !userData?.username) {
      alert("Please login first");
      return;
    }
    navigation.navigate(screen);
  };

  if (userLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Animated.View
        style={[
          styles.animatedContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
          },
        ]}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <View style={styles.logoIcon}>
              <Text style={styles.logoEmoji}>🎓</Text>
            </View>
          </View>
          <Text style={styles.title}>English Quiz</Text>
          <Text style={styles.subtitle}>Learn & speak with confidence</Text>
        </View>

        {/* User Profile Card */}
        <TouchableOpacity style={[styles.card, styles.userCard]} onPress={() => navigation.navigate("UserProfile")} activeOpacity={0.85}>
          <View style={styles.cardHeader}>
            <View style={styles.iconCircle}>
              <Ionicons name="person" size={18} color={COLORS.primary} />
            </View>
            <Text style={styles.cardTitle}>Your Profile</Text>
          </View>
          <View style={styles.inputContainer}>
            <Text style={styles.usernameDisplay}>{userData?.username || userId || "User"}</Text>
            {userData?.username || userId ? (
              <View style={styles.checkBadge}>
                <Ionicons name="checkmark" size={14} color="#fff" />
              </View>
            ) : null}
          </View>
          <Text style={styles.hint}>Track your progress across sessions</Text>
        </TouchableOpacity>

        {/* Main Actions */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity style={[styles.actionCard, styles.practiceCard]} onPress={() => handleNavigate("Practice")} activeOpacity={0.9}>
            <View style={styles.actionContent}>
              <View style={styles.actionIconWrapper}>
                <Ionicons name="school" size={28} color="#fff" />
              </View>
              <View style={styles.actionTextContainer}>
                <Text style={styles.actionTitle}>Grammar Practice</Text>
                <Text style={styles.actionDescription}>Improve grammar skills with exercises</Text>
              </View>
            </View>
            <View style={styles.actionArrow}>
              <Ionicons name="arrow-forward" size={20} color="rgba(255,255,255,0.8)" />
            </View>
            <View style={styles.cardDecoration} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionCard, styles.quizCard]} onPress={() => handleNavigate("Quiz")} activeOpacity={0.9}>
            <View style={styles.actionContent}>
              <View style={styles.actionIconWrapper}>
                <Ionicons name="school" size={28} color="#fff" />
              </View>
              <View style={styles.actionTextContainer}>
                <Text style={styles.actionTitle}>Start Quiz</Text>
                <Text style={styles.actionDescription}>Test your knowledge with AI questions</Text>
              </View>
            </View>
            <View style={styles.actionArrow}>
              <Ionicons name="arrow-forward" size={20} color="rgba(255,255,255,0.8)" />
            </View>
            <View style={styles.cardDecoration} />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.actionCard, styles.chatCard]} onPress={() => handleNavigate("Chat")} activeOpacity={0.9}>
            <View style={styles.actionContent}>
              <View style={[styles.actionIconWrapper, styles.chatIconWrapper]}>
                <Ionicons name="chatbubbles" size={28} color="#fff" />
              </View>
              <View style={styles.actionTextContainer}>
                <Text style={styles.actionTitle}>Chat with Tutor</Text>
                <Text style={styles.actionDescription}>Ask questions & learn interactively</Text>
              </View>
            </View>
            <View style={styles.actionArrow}>
              <Ionicons name="arrow-forward" size={20} color="rgba(255,255,255,0.8)" />
            </View>
            <View style={[styles.cardDecoration, styles.chatDecoration]} />
          </TouchableOpacity>

          {/* Transcribe card hidden */}

          <TouchableOpacity style={[styles.actionCard, styles.libraryCard]} onPress={() => handleNavigate("Library")} activeOpacity={0.9}>
            <View style={styles.actionContent}>
              <View style={[styles.actionIconWrapper, { backgroundColor: "rgba(255,255,255,0.18)" }]}>
                <Ionicons name="library" size={28} color="#fff" />
              </View>
              <View style={styles.actionTextContainer}>
                <Text style={styles.actionTitle}>Flashcards</Text>
                <Text style={styles.actionDescription}>Remember vocab & phrases faster</Text>
              </View>
            </View>
            <View style={styles.actionArrow}>
              <Ionicons name="arrow-forward" size={20} color="rgba(255,255,255,0.8)" />
            </View>
            <View style={styles.cardDecoration} />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.actionCard, styles.videoCard]} onPress={() => handleNavigate("ListVideo")} activeOpacity={0.9}>
            <View style={styles.actionContent}>
              <View style={[styles.actionIconWrapper, { backgroundColor: "rgba(255,255,255,0.18)" }]}>
                <Ionicons name="play-circle" size={28} color="#fff" />
              </View>
              <View style={styles.actionTextContainer}>
                <Text style={styles.actionTitle}>Learning Video</Text>
                <Text style={styles.actionDescription}>Learn through video</Text>
              </View>
            </View>
            <View style={styles.actionArrow}>
              <Ionicons name="arrow-forward" size={20} color="rgba(255,255,255,0.8)" />
            </View>
            <View style={styles.cardDecoration} />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.actionCard, styles.homophoneCard]} onPress={() => handleNavigate("HomophoneGroups")} activeOpacity={0.9}>
            <View style={styles.actionContent}>
              <View style={[styles.actionIconWrapper, styles.homophoneIconWrapper]}>
                <Ionicons name="ear" size={28} color="#fff" />
              </View>
              <View style={styles.actionTextContainer}>
                <Text style={styles.actionTitle}>Homophone Groups</Text>
                <Text style={styles.actionDescription}>Master words that sound the same</Text>
              </View>
            </View>
            <View style={styles.actionArrow}>
              <Ionicons name="arrow-forward" size={20} color="rgba(255,255,255,0.8)" />
            </View>
            <View style={[styles.cardDecoration, styles.homophoneDecoration]} />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.actionCard, styles.listeningCard]} onPress={() => handleNavigate("ListeningPart2")} activeOpacity={0.9}>
            <View style={styles.actionContent}>
              <View style={[styles.actionIconWrapper, styles.listeningIconWrapper]}>
                <Ionicons name="headset" size={28} color="#fff" />
              </View>
              <View style={styles.actionTextContainer}>
                <Text style={styles.actionTitle}>Question - Response</Text>
                <Text style={styles.actionDescription}>Listen and choose the right response</Text>
              </View>
            </View>
            <View style={styles.actionArrow}>
              <Ionicons name="arrow-forward" size={20} color="rgba(255,255,255,0.8)" />
            </View>
            <View style={[styles.cardDecoration, styles.listeningDecoration]} />
          </TouchableOpacity>
        </View>

        {/* Topics Section */}
        <View style={styles.topicsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Available Topics</Text>
            <View style={styles.topicBadge}>
              <Text style={styles.topicBadgeText}>{topics.length}</Text>
            </View>
          </View>

          {loading ? (
            <View style={styles.topicsLoading}>
              <ActivityIndicator size="small" color={COLORS.primary} />
              <Text style={styles.loadingText}>Loading topics...</Text>
            </View>
          ) : error ? (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={24} color={COLORS.error} />
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={fetchTopics}>
                <Text style={styles.retryText}>Try Again</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.topicsList}>
              {topics.slice(0, 6).map((topic, index) => (
                <View key={topic.topic_id} style={[styles.topicChip, { backgroundColor: getChipColor(index) }]}>
                  <Text style={styles.topicChipText}>{topic.title}</Text>
                </View>
              ))}
              {topics.length > 6 && (
                <View style={[styles.topicChip, styles.moreChip]}>
                  <Text style={styles.moreChipText}>+{topics.length - 6} more</Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* History Button */}
        <TouchableOpacity style={styles.historyButton} onPress={() => handleNavigate("History")} activeOpacity={0.8}>
          <View style={styles.historyIconCircle}>
            <Ionicons name="time" size={20} color={COLORS.primary} />
          </View>
          <Text style={styles.historyButtonText}>View My Progress</Text>
          <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
        </TouchableOpacity>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Learn English the smart way 🚀</Text>
        </View>
      </Animated.View>
    </ScrollView>
  );
}

const getChipColor = (index) => {
  const colors = ["rgba(255, 107, 107, 0.12)", "rgba(78, 205, 196, 0.12)", "rgba(255, 217, 61, 0.12)", "rgba(162, 155, 254, 0.12)", "rgba(255, 159, 67, 0.12)", "rgba(116, 185, 255, 0.12)"];
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
  animatedContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
  },

  // Header
  header: {
    alignItems: "center",
    marginBottom: 28,
    paddingTop: 10,
  },
  logoContainer: {
    marginBottom: 16,
  },
  logoIcon: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: COLORS.card,
    justifyContent: "center",
    alignItems: "center",
    ...SHADOWS.medium,
  },
  logoEmoji: {
    fontSize: 36,
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    fontWeight: "500",
  },

  // Cards
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    ...SHADOWS.small,
  },
  userCard: {
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "rgba(255, 107, 107, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: COLORS.text,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.background,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text,
    fontWeight: "500",
  },
  usernameDisplay: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text,
    fontWeight: "600",
  },
  checkBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.success,
    justifyContent: "center",
    alignItems: "center",
  },
  hint: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 10,
  },

  // Action Cards
  actionsContainer: {
    gap: 14,
    marginBottom: 24,
  },
  actionCard: {
    borderRadius: 20,
    padding: 22,
    position: "relative",
    overflow: "hidden",
  },
  practiceCard: {
    backgroundColor: "#4CAF50", // xanh lá chính
  },
  quizCard: {
    backgroundColor: COLORS.primary,
  },
  chatCard: {
    backgroundColor: COLORS.secondary,
  },
  transcribeCard: {
    backgroundColor: "#10B981",
  },
  libraryCard: {
    backgroundColor: "#8B5CF6",
  },
  videoCard: {
    backgroundColor: "#E74C3C",
  },
  homophoneCard: {
    backgroundColor: "#9B59B6",
  },
  homophoneIconWrapper: {
    backgroundColor: "rgba(255, 255, 255, 0.25)",
  },
  homophoneDecoration: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  listeningCard: {
    backgroundColor: "#3498DB",
  },
  listeningIconWrapper: {
    backgroundColor: "rgba(255, 255, 255, 0.25)",
  },
  listeningDecoration: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  actionContent: {
    flexDirection: "row",
    alignItems: "center",
    zIndex: 1,
  },
  actionIconWrapper: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  chatIconWrapper: {
    backgroundColor: "rgba(255, 255, 255, 0.25)",
  },
  actionTextContainer: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 4,
  },
  actionDescription: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.85)",
    fontWeight: "500",
  },
  actionArrow: {
    position: "absolute",
    top: 22,
    right: 22,
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  cardDecoration: {
    position: "absolute",
    bottom: -30,
    right: -30,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  chatDecoration: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },

  // Topics
  topicsSection: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.text,
  },
  topicBadge: {
    marginLeft: 10,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  topicBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#fff",
  },
  topicsLoading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  loadingText: {
    marginLeft: 10,
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  topicsList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  topicChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  topicChipText: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: "600",
  },
  moreChip: {
    backgroundColor: COLORS.backgroundDark,
  },
  moreChipText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: "600",
  },
  errorContainer: {
    alignItems: "center",
    padding: 20,
    backgroundColor: COLORS.card,
    borderRadius: 16,
  },
  errorText: {
    color: COLORS.textSecondary,
    marginVertical: 10,
    textAlign: "center",
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
  },
  retryText: {
    color: "#fff",
    fontWeight: "600",
  },

  // History
  historyButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.small,
  },
  historyIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255, 107, 107, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  historyButtonText: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text,
    fontWeight: "600",
  },

  // Footer
  footer: {
    alignItems: "center",
    marginTop: 24,
  },
  footerText: {
    fontSize: 14,
    color: COLORS.textMuted,
    fontWeight: "500",
  },
});
