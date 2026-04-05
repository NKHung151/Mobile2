import React, { useState, useRef, useEffect, useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Animated, Modal, Switch, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { getCourseVocabularies, getMySetting, updateMySetting } from "../services/api";

const { width } = Dimensions.get("window");

export default function CourseDetailScreen({ navigation, route }) {
  const { courseId } = route.params;
  const [cards, setCards] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const flipAnim = useRef(new Animated.Value(0)).current;

  // Settings Modal States
  const [isSettingsVisible, setIsSettingsVisible] = useState(false);
  const [isShuffled, setIsShuffled] = useState(false);
  const [isCategorized, setIsCategorized] = useState(true);
  const [frontLanguage, setFrontLanguage] = useState("english"); // "english" or "vietnamese"

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        setError("");
        const [vocabRes, settingRes] = await Promise.all([getCourseVocabularies(courseId), getMySetting()]);
        setCards(vocabRes?.data || []);

        const frontSide = settingRes?.data?.front_side;
        if (frontSide === "definition") {
          setFrontLanguage("vietnamese");
        } else {
          setFrontLanguage("english");
        }
      } catch (err) {
        setError(err.message || "Không thể tải chế độ tập trung");
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [courseId]);

  const normalizedCards = useMemo(
    () =>
      cards.map((card) => ({
        id: card._id,
        english: card.term,
        vietnamese: card.definition,
      })),
    [cards],
  );

  const currentCard = normalizedCards[currentSlideIndex] || normalizedCards[0];
  const totalCards = normalizedCards.length;

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#FFFFFF" />
      </View>
    );
  }

  if (error || !cards.length) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{error || "Học phần chưa có thẻ"}</Text>
      </View>
    );
  }

  const handleFlipCard = () => {
    Animated.timing(flipAnim, {
      toValue: isFlipped ? 0 : 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
    setIsFlipped(!isFlipped);
  };

  const handleShuffle = () => {
    setIsShuffled(true);
    // TODO: Implement shuffle logic
  };

  const handleRestore = () => {
    setIsShuffled(false);
    // TODO: Implement restore order logic
  };

  // Animation mặt trước: 0 -> 180 độ
  const frontInterpolate = flipAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });

  // Animation mặt sau: 180 -> 360 độ (để chữ không bị ngược)
  const backInterpolate = flipAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["180deg", "360deg"],
  });

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7} style={styles.headerIcon}>
          <Ionicons name="close" size={26} color="#FFFFFF" />
        </TouchableOpacity>

        <Text style={styles.progressText}>
          {currentSlideIndex + 1}/{totalCards}
        </Text>

        <TouchableOpacity onPress={() => setIsSettingsVisible(true)} activeOpacity={0.7} style={styles.headerIcon}>
          <Ionicons name="settings-outline" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Stats Row (Biết/Chưa biết) */}
      <View style={styles.statsContainer}>
        <View style={styles.statPillRed}>
          <Text style={styles.statTextRed}>0</Text>
        </View>
        <View style={styles.statPillGreen}>
          <Text style={styles.statTextGreen}>0</Text>
        </View>
      </View>

      {/* Flashcard Area */}
      <View style={styles.cardContainer}>
        <View style={styles.cardWrapper}>
          {/* Front Side (Mặt trước - Tiếng Anh) */}
          <Animated.View
            style={[
              styles.card,
              {
                transform: [{ perspective: 1000 }, { rotateY: frontInterpolate }],
              },
            ]}
          >
            <TouchableOpacity onPress={handleFlipCard} activeOpacity={1} style={styles.cardTouchable}>
              <TouchableOpacity onPress={(e) => e.stopPropagation()} style={styles.starIcon}>
                <Ionicons name="star-outline" size={24} color="#6B7280" />
              </TouchableOpacity>
              <View style={styles.cardContent}>
                <Text style={styles.cardWord}>{frontLanguage === "english" ? currentCard.english : currentCard.vietnamese}</Text>
              </View>
            </TouchableOpacity>
          </Animated.View>

          {/* Back Side (Mặt sau - Tiếng Việt) */}
          <Animated.View
            style={[
              styles.card,
              styles.cardBack,
              {
                transform: [{ perspective: 1000 }, { rotateY: backInterpolate }],
              },
            ]}
          >
            <TouchableOpacity onPress={handleFlipCard} activeOpacity={1} style={styles.cardTouchable}>
              <TouchableOpacity onPress={(e) => e.stopPropagation()} style={styles.starIcon}>
                <Ionicons name="star" size={24} color="#FBBF24" />
              </TouchableOpacity>
              <View style={styles.cardContent}>
                <Text style={styles.cardWord}>{frontLanguage === "english" ? currentCard.vietnamese : currentCard.english}</Text>
              </View>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </View>

      {/* Footer Instructions */}
      <View style={styles.footer}>
        <Ionicons name="arrow-undo-outline" size={20} color="#9CA3AF" style={{ transform: [{ rotateY: "180deg" }] }} />
        <Text style={styles.footerText}>Chạm vào thẻ để lật</Text>
      </View>

      {/* Settings Modal */}
      <Modal visible={isSettingsVisible} transparent={true} animationType="slide" onRequestClose={() => setIsSettingsVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setIsSettingsVisible(false)}>
          <TouchableOpacity style={styles.modalContent} activeOpacity={1} onPress={(e) => e.stopPropagation()}>
            {/* Modal Handle */}
            <View style={styles.modalHandle} />

            {/* Modal Title */}
            <Text style={styles.modalTitle}>Tùy chọn</Text>

            {/* Shuffle and Restore Buttons */}
            <View style={styles.actionButtonsRow}>
              <TouchableOpacity style={[styles.actionButton, isShuffled && styles.actionButtonActive]} onPress={handleShuffle} activeOpacity={0.7}>
                <Ionicons name="shuffle-outline" size={24} color={isShuffled ? "#5B7FFF" : "#6B7280"} />
                <Text style={[styles.actionButtonText, isShuffled && styles.actionButtonTextActive]}>Trộn thẻ</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.actionButton, !isShuffled && styles.actionButtonActive]} onPress={handleRestore} activeOpacity={0.7}>
                <Ionicons name="refresh-outline" size={24} color={!isShuffled ? "#5B7FFF" : "#6B7280"} />
                <Text style={[styles.actionButtonText, !isShuffled && styles.actionButtonTextActive]}>Khôi phục thứ tự</Text>
              </TouchableOpacity>
            </View>

            {/* Categorize Cards Toggle */}
            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <Text style={styles.settingTitle}>Phân loại thẻ</Text>
                <Text style={styles.settingDescription}>Phân loại các thẻ trong 1 học phần theo loại đã thuộc và chưa thuộc</Text>
              </View>
              <Switch value={isCategorized} onValueChange={setIsCategorized} trackColor={{ false: "#3E4157", true: "#5B7FFF" }} thumbColor="#FFFFFF" ios_backgroundColor="#3E4157" />
            </View>

            {/* Card Face Setup */}
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Thiết lập mặt thẻ</Text>
              <Text style={styles.sectionSubtitle}>Mặt trước</Text>

              <View style={styles.languageButtonsRow}>
                <TouchableOpacity
                  style={[styles.languageButton, frontLanguage === "english" && styles.languageButtonActive]}
                  onPress={async () => {
                    setFrontLanguage("english");
                    try {
                      await updateMySetting({ front_side: "term" });
                    } catch (e) {
                      // Ignore preference save error in UI.
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.languageButtonText, frontLanguage === "english" && styles.languageButtonTextActive]}>Tiếng anh</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.languageButton, frontLanguage === "vietnamese" && styles.languageButtonActive]}
                  onPress={async () => {
                    setFrontLanguage("vietnamese");
                    try {
                      await updateMySetting({ front_side: "definition" });
                    } catch (e) {
                      // Ignore preference save error in UI.
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.languageButtonText, frontLanguage === "vietnamese" && styles.languageButtonTextActive]}>Tiếng việt</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#080B1C", // Màu nền xanh đen tối
  },

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerIcon: {
    padding: 4,
  },
  progressText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },

  // Stats Row
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginTop: 8,
    marginBottom: 16,
  },
  statPillRed: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.5)", // Đỏ mờ
  },
  statTextRed: {
    color: "#EF4444",
    fontSize: 14,
    fontWeight: "600",
  },
  statPillGreen: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.5)", // Xanh mờ
  },
  statTextGreen: {
    color: "#10B981",
    fontSize: 14,
    fontWeight: "600",
  },

  // Card Area
  cardContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  cardWrapper: {
    flex: 1,
  },
  card: {
    width: "100%",
    height: "100%",
    backgroundColor: "#1E2235", // Màu nền thẻ xanh xám
    borderRadius: 16,
    backfaceVisibility: "hidden", // Ẩn mặt sau
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  cardBack: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  cardTouchable: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  starIcon: {
    position: "absolute",
    top: 16,
    right: 16,
    padding: 8,
    zIndex: 10,
  },
  cardContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  cardWord: {
    fontSize: 40,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "center",
  },

  // Footer
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 24,
    gap: 8,
  },
  footerText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "500",
  },

  errorText: {
    color: "#EF4444",
    fontSize: 16,
    textAlign: "center",
    marginTop: 50,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#1A1D2E",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 40,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: "#4B5563",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 24,
  },

  // Action Buttons (Shuffle/Restore)
  actionButtonsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 24,
  },
  actionButton: {
    flex: 1,
    backgroundColor: "#252838",
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 2,
    borderColor: "transparent",
  },
  actionButtonActive: {
    borderColor: "#5B7FFF",
    backgroundColor: "rgba(91, 127, 255, 0.1)",
  },
  actionButtonText: {
    color: "#6B7280",
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },
  actionButtonTextActive: {
    color: "#5B7FFF",
  },

  // Setting Row (Toggle)
  settingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#2A2D3E",
    marginBottom: 24,
  },
  settingLeft: {
    flex: 1,
    marginRight: 16,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 13,
    color: "#9CA3AF",
    lineHeight: 18,
  },

  // Card Face Setup Section
  sectionContainer: {
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: 12,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: "#9CA3AF",
    marginBottom: 12,
  },
  languageButtonsRow: {
    flexDirection: "row",
    gap: 12,
  },
  languageButton: {
    flex: 1,
    backgroundColor: "#252838",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#252838",
  },
  languageButtonActive: {
    backgroundColor: "#5B7FFF",
    borderColor: "#5B7FFF",
  },
  languageButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#9CA3AF",
  },
  languageButtonTextActive: {
    color: "#FFFFFF",
  },
});
