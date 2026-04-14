import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  ScrollView,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import YoutubePlayer from "react-native-youtube-iframe";
import { COLORS, SHADOWS } from "../constants/config";

const { width } = Dimensions.get("window");

// Video data (same as ListVideoScreen for related videos)
const VIDEO_DATA = [
  {
    id: "1",
    videoId: "cfRnccxqoII",
    title: "English Grammar Basics",
    category: "Grammar",
    description: "Learn fundamental English grammar rules and sentence structures to build a strong foundation for your English learning journey.",
  },
  {
    id: "2",
    videoId: "Uha9IrpZQhw",
    title: "Grammar Practice Tips",
    category: "Grammar",
    description: "Improve your grammar with practical exercises and real-world examples that help you communicate more effectively.",
  },
  {
    id: "3",
    videoId: "b-_IquFj-CE",
    title: "Essential Vocabulary",
    category: "Vocabulary",
    description: "Build your English vocabulary effectively with proven memorization techniques and contextual learning methods.",
  },
  {
    id: "4",
    videoId: "OqdLrih2G9A",
    title: "Vocabulary Booster",
    category: "Vocabulary",
    description: "Expand your word bank with daily practice routines and spaced repetition strategies for long-term retention.",
  },
  {
    id: "5",
    videoId: "tjOEpwXzF_o",
    title: "IELTS Preparation Guide",
    category: "Ielts/Toeic",
    description: "Prepare for IELTS exam with proven strategies covering all four skills: Listening, Reading, Writing, and Speaking.",
  },
  {
    id: "6",
    videoId: "UXnIa93cJ5Q",
    title: "TOEIC Listening Skills",
    category: "Ielts/Toeic",
    description: "Master TOEIC listening section techniques with tips on note-taking, prediction, and time management.",
  },
];

const LEARNING_TIPS = [
  { icon: "bulb-outline", text: "Watch the video multiple times to improve listening comprehension", color: "#FFD93D" },
  { icon: "create-outline", text: "Take notes of new words and phrases while watching", color: "#4ECDC4" },
  { icon: "mic-outline", text: "Repeat sentences out loud to practice pronunciation", color: "#FF6B6B" },
  { icon: "refresh-outline", text: "Review the content after 24 hours to boost retention", color: "#A29BFE" },
];

const getCategoryColor = (category) => {
  switch (category) {
    case "Grammar":
      return "#FF6B6B";
    case "Vocabulary":
      return "#4ECDC4";
    case "Ielts/Toeic":
      return "#A29BFE";
    default:
      return COLORS.primary;
  }
};

export default function VideoScreen({ route, navigation }) {
  const { videoId, title } = route.params;
  const [playing, setPlaying] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Find current video info
  const currentVideo = VIDEO_DATA.find((v) => v.videoId === videoId);
  const currentCategory = currentVideo?.category || "Grammar";
  const currentDescription = currentVideo?.description || "Watch this video to improve your English skills.";

  // Related videos: same category first, then others, exclude current
  const relatedVideos = VIDEO_DATA
    .filter((v) => v.videoId !== videoId)
    .sort((a, b) => {
      if (a.category === currentCategory && b.category !== currentCategory) return -1;
      if (a.category !== currentCategory && b.category === currentCategory) return 1;
      return 0;
    });

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, []);

  const onStateChange = useCallback((state) => {
    if (state === "ended") {
      setPlaying(false);
    }
  }, []);

  const togglePlaying = useCallback(() => {
    setPlaying((prev) => !prev);
  }, []);

  const handleRelatedVideoPress = (video) => {
    // Navigate to same screen with new params (replace current)
    navigation.replace("VideoPlayer", {
      videoId: video.videoId,
      title: video.title,
    });
  };

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Back Button */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-back" size={20} color={COLORS.text} />
          <Text style={styles.backText}>BACK</Text>
        </TouchableOpacity>

        {/* Video Player */}
        <View style={styles.playerContainer}>
          <YoutubePlayer
            height={(width - 32) * (9 / 16)}
            width={width - 32}
            play={playing}
            videoId={videoId}
            onChangeState={onStateChange}
            webViewStyle={styles.webView}
          />
        </View>

        {/* Video Title & Category Badge */}
        <View style={styles.infoSection}>
          <View style={styles.titleRow}>
            <Text style={styles.videoTitle}>{title}</Text>
          </View>
          {currentVideo && (
            <View
              style={[
                styles.categoryBadge,
                { backgroundColor: getCategoryColor(currentCategory) + "18" },
              ]}
            >
              <View
                style={[
                  styles.categoryDot,
                  { backgroundColor: getCategoryColor(currentCategory) },
                ]}
              />
              <Text
                style={[
                  styles.categoryBadgeText,
                  { color: getCategoryColor(currentCategory) },
                ]}
              >
                {currentCategory}
              </Text>
            </View>
          )}
        </View>

        {/* Controls */}
        <View style={styles.controlsRow}>
          <TouchableOpacity
            style={[
              styles.controlButton,
              playing && styles.controlButtonActive,
            ]}
            onPress={togglePlaying}
            activeOpacity={0.8}
          >
            <Ionicons
              name={playing ? "pause" : "play"}
              size={22}
              color={playing ? "#fff" : COLORS.primary}
            />
            <Text
              style={[
                styles.controlText,
                playing && styles.controlTextActive,
              ]}
            >
              {playing ? "Pause" : "Play"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Description Section */}
        <View style={styles.descriptionCard}>
          <View style={styles.descriptionHeader}>
            <Ionicons name="information-circle-outline" size={20} color={COLORS.primary} />
            <Text style={styles.descriptionTitle}>About this video</Text>
          </View>
          <Text style={styles.descriptionText}>{currentDescription}</Text>
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Learning Tips */}
        <View style={styles.tipsSection}>
          <View style={styles.sectionHeader}>
            <Ionicons name="sparkles" size={20} color={COLORS.accent} />
            <Text style={styles.sectionTitle}>Learning Tips</Text>
          </View>
          {LEARNING_TIPS.map((tip, index) => (
            <View key={index} style={styles.tipItem}>
              <View style={[styles.tipIconContainer, { backgroundColor: tip.color + "18" }]}>
                <Ionicons name={tip.icon} size={18} color={tip.color} />
              </View>
              <Text style={styles.tipText}>{tip.text}</Text>
            </View>
          ))}
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Related Videos */}
        <View style={styles.relatedSection}>
          <View style={styles.sectionHeader}>
            <Ionicons name="videocam-outline" size={20} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>Related Videos</Text>
          </View>
          {relatedVideos.map((video) => {
            const thumbnailUrl = `https://img.youtube.com/vi/${video.videoId}/mqdefault.jpg`;
            const catColor = getCategoryColor(video.category);
            return (
              <TouchableOpacity
                key={video.id}
                style={styles.relatedCard}
                activeOpacity={0.85}
                onPress={() => handleRelatedVideoPress(video)}
              >
                <View style={styles.relatedThumbnailContainer}>
                  <Image
                    source={{ uri: thumbnailUrl }}
                    style={styles.relatedThumbnail}
                    resizeMode="cover"
                  />
                  <View style={styles.relatedPlayOverlay}>
                    <Ionicons name="play-circle" size={30} color="rgba(255,255,255,0.9)" />
                  </View>
                </View>
                <View style={styles.relatedInfo}>
                  <Text style={styles.relatedTitle} numberOfLines={2}>
                    {video.title}
                  </Text>
                  <Text style={styles.relatedDescription} numberOfLines={2}>
                    {video.description}
                  </Text>
                  <View
                    style={[
                      styles.relatedCategoryTag,
                      { backgroundColor: catColor + "18" },
                    ]}
                  >
                    <Text style={[styles.relatedCategoryText, { color: catColor }]}>
                      {video.category}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },

  // Back Button
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    alignSelf: "flex-start",
    paddingVertical: 6,
    paddingHorizontal: 2,
  },
  backText: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.text,
    marginLeft: 6,
    letterSpacing: 0.5,
  },

  // Player
  playerContainer: {
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#000",
    ...SHADOWS.medium,
    marginBottom: 20,
  },
  webView: {
    borderRadius: 16,
  },

  // Info
  infoSection: {
    marginBottom: 16,
  },
  titleRow: {
    marginBottom: 8,
  },
  videoTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.text,
    lineHeight: 28,
  },
  categoryBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
  },
  categoryDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 6,
  },
  categoryBadgeText: {
    fontSize: 13,
    fontWeight: "700",
  },

  // Controls
  controlsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  controlButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.small,
  },
  controlButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  controlText: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.text,
    marginLeft: 8,
  },
  controlTextActive: {
    color: "#fff",
  },

  // Description
  descriptionCard: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.small,
  },
  descriptionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  descriptionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.text,
    marginLeft: 8,
  },
  descriptionText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },

  // Divider
  divider: {
    height: 1,
    backgroundColor: COLORS.borderLight,
    marginVertical: 20,
  },

  // Learning Tips
  tipsSection: {
    marginBottom: 0,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: COLORS.text,
    marginLeft: 8,
  },
  tipItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tipIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 19,
    fontWeight: "500",
  },

  // Related Videos
  relatedSection: {
    marginBottom: 0,
  },
  relatedCard: {
    flexDirection: "row",
    backgroundColor: COLORS.card,
    borderRadius: 14,
    overflow: "hidden",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.small,
  },
  relatedThumbnailContainer: {
    width: 130,
    height: 95,
    position: "relative",
  },
  relatedThumbnail: {
    width: "100%",
    height: "100%",
    backgroundColor: COLORS.backgroundDark,
  },
  relatedPlayOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.2)",
  },
  relatedInfo: {
    flex: 1,
    padding: 10,
    justifyContent: "center",
  },
  relatedTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 3,
    lineHeight: 19,
  },
  relatedDescription: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 6,
    lineHeight: 17,
  },
  relatedCategoryTag: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  relatedCategoryText: {
    fontSize: 11,
    fontWeight: "700",
  },
});
