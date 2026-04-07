import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Animated,
  Dimensions,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, SHADOWS } from "../constants/config";

const { width } = Dimensions.get("window");

// Video data organized by category
const VIDEO_DATA = [
  {
    id: "1",
    videoId: "cfRnccxqoII",
    title: "English Grammar Basics",
    category: "Grammar",
    description: "Learn fundamental English grammar rules",
  },
  {
    id: "2",
    videoId: "Uha9IrpZQhw",
    title: "Grammar Practice Tips",
    category: "Grammar",
    description: "Improve your grammar with practical exercises",
  },
  {
    id: "3",
    videoId: "b-_IquFj-CE",
    title: "Essential Vocabulary",
    category: "Vocabulary",
    description: "Build your English vocabulary effectively",
  },
  {
    id: "4",
    videoId: "OqdLrih2G9A",
    title: "Vocabulary Booster",
    category: "Vocabulary",
    description: "Expand your word bank with daily practice",
  },
  {
    id: "5",
    videoId: "tjOEpwXzF_o",
    title: "IELTS Preparation Guide",
    category: "Ielts/Toeic",
    description: "Prepare for IELTS exam with proven strategies",
  },
  {
    id: "6",
    videoId: "UXnIa93cJ5Q",
    title: "TOEIC Listening Skills",
    category: "Ielts/Toeic",
    description: "Master TOEIC listening section techniques",
  },
];

const CATEGORIES = ["All", "Grammar", "Vocabulary", "Ielts/Toeic"];

export default function ListVideoScreen({ navigation }) {
  const [selectedCategory, setSelectedCategory] = useState("All");
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, []);

  const filteredVideos =
    selectedCategory === "All"
      ? VIDEO_DATA
      : VIDEO_DATA.filter((v) => v.category === selectedCategory);

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

  const renderVideoItem = ({ item, index }) => {
    const thumbnailUrl = `https://img.youtube.com/vi/${item.videoId}/mqdefault.jpg`;
    const categoryColor = getCategoryColor(item.category);

    return (
      <TouchableOpacity
        style={styles.videoCard}
        activeOpacity={0.85}
        onPress={() =>
          navigation.navigate("VideoPlayer", {
            videoId: item.videoId,
            title: item.title,
          })
        }
      >
        <View style={styles.thumbnailContainer}>
          <Image
            source={{ uri: thumbnailUrl }}
            style={styles.thumbnail}
            resizeMode="cover"
          />
          <View style={styles.playOverlay}>
            <View style={styles.playButton}>
              <Ionicons name="play" size={22} color="#fff" />
            </View>
          </View>
        </View>
        <View style={styles.videoInfo}>
          <Text style={styles.videoTitle} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={styles.videoDescription} numberOfLines={1}>
            {item.description}
          </Text>
          <View
            style={[
              styles.categoryTag,
              { backgroundColor: categoryColor + "18" },
            ]}
          >
            <Text style={[styles.categoryTagText, { color: categoryColor }]}>
              {item.category}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      {/* Category Tabs */}
      <View style={styles.tabsContainer}>
        {CATEGORIES.map((cat) => {
          const isActive = selectedCategory === cat;
          return (
            <TouchableOpacity
              key={cat}
              style={[styles.tab, isActive && styles.tabActive]}
              onPress={() => setSelectedCategory(cat)}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                {cat}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Video List */}
      <FlatList
        data={filteredVideos}
        renderItem={renderVideoItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons
              name="videocam-off-outline"
              size={48}
              color={COLORS.textMuted}
            />
            <Text style={styles.emptyText}>No videos in this category</Text>
          </View>
        }
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  // Category Tabs
  tabsContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  tab: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tabActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  tabTextActive: {
    color: "#fff",
  },

  // Video List
  listContent: {
    padding: 16,
    gap: 14,
    paddingBottom: 30,
  },
  videoCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.small,
  },
  thumbnailContainer: {
    width: "100%",
    height: 180,
    position: "relative",
  },
  thumbnail: {
    width: "100%",
    height: "100%",
    backgroundColor: COLORS.backgroundDark,
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  playButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    paddingLeft: 3,
  },
  videoInfo: {
    padding: 14,
  },
  videoTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 4,
  },
  videoDescription: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 10,
  },
  categoryTag: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10,
  },
  categoryTagText: {
    fontSize: 12,
    fontWeight: "700",
  },

  // Empty State
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 15,
    color: COLORS.textMuted,
    fontWeight: "500",
  },
});
