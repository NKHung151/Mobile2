import React, { useState, useRef, useEffect, useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Animated, Modal, Switch, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { getCourseVocabularies, getMySetting, updateMySetting, updateVocabularyProgress, createCoursePracticeSession, updateCoursePracticeProgress } from "../services/api";

const { width } = Dimensions.get("window");

export default function CourseDetailFocusMode({ navigation, route }) {
  const { courseId } = route.params;
  const [cards, setCards] = useState([]);
  const [originalCards, setOriginalCards] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const flipAnim = useRef(new Animated.Value(0)).current;

  // Practice Tracking - Dùng Ref để lưu duy nhất 1 ID của phiên học
  const practiceIdRef = useRef(null);
  const isInitializingRef = useRef(false);

  // Settings
  const [isSettingsVisible, setIsSettingsVisible] = useState(false);
  const [isShuffled, setIsShuffled] = useState(false);
  const [frontLanguage, setFrontLanguage] = useState("english");

  useEffect(() => {
    let isMounted = true;

    const initData = async () => {
      if (isInitializingRef.current || practiceIdRef.current) return;

      try {
        isInitializingRef.current = true;
        setIsLoading(true);

        const [vocabRes, settingRes] = await Promise.all([getCourseVocabularies(courseId), getMySetting()]);

        const loadedCards = vocabRes?.data || [];
        if (isMounted) {
          setCards(loadedCards);
          setOriginalCards(loadedCards);
        }

        // TẠO BẢN GHI 1 LẦN DUY NHẤT KHI VÀO MÀN HÌNH
        if (loadedCards.length > 0 && !practiceIdRef.current) {
          const initialUnmemorized = loadedCards.filter((c) => !c.user_state?.is_memorized).length;

          const res = await createCoursePracticeSession(courseId, {
            status: "in_progress",
            progress: 0,
            unmemorized_count: initialUnmemorized,
            started_at: new Date().toISOString(),
          });

          if (res?.data?._id || res?.data?.id) {
            practiceIdRef.current = res.data._id || res.data.id;
            console.log("Đã tạo Practice Session ID:", practiceIdRef.current);
          }
        }

        if (settingRes?.data?.front_side === "definition" && isMounted) {
          setFrontLanguage("vietnamese");
        }
      } catch (err) {
        console.error("Init Error:", err);
        if (isMounted) setError("Không thể tải dữ liệu luyện tập");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    initData();

    return () => {
      isMounted = false;
      // Lưu ý: KHÔNG reset practiceIdRef.current ở đây để tránh Strict Mode tạo lại 2 lần
    };
  }, [courseId]);

  // HÀM UPDATE BẢN GHI (KHÔNG TẠO MỚI)
  const syncProgress = async (updatedCards = cards, index = currentSlideIndex, options = {}) => {
    if (!practiceIdRef.current) {
      console.log("Bỏ qua đồng bộ: Chưa có practiceId");
      return;
    }

    const { finishSession = false } = options;
    const total = updatedCards.length;
    const currentUnmemorized = updatedCards.filter((c) => !c.user_state?.is_memorized).length;
    const progressPercent = total > 0 ? Math.round(((index + 1) / total) * 100) : 0;

    // Chỉ cần đã hiển thị đến thẻ cuối là completed, không phụ thuộc memorized.
    const isCompletedByViewed = total > 0 && index >= total - 1;
    const nowIso = new Date().toISOString();

    try {
      // Chỉ GỌI CẬP NHẬT vào practiceIdRef.current đã lưu
      await updateCoursePracticeProgress(courseId, {
        practiceId: practiceIdRef.current,
        progress: progressPercent,
        unmemorized_count: currentUnmemorized,
        status: isCompletedByViewed ? "completed" : "in_progress",
        finished_at: isCompletedByViewed || finishSession ? nowIso : null,
        is_finished: finishSession,
      });
      console.log("Đã đồng bộ tiến độ thành công vào ID:", practiceIdRef.current);
    } catch (e) {
      console.log("Lỗi đồng bộ tiến độ:", e);
    }
  };

  // Đồng bộ một lần cuối khi thoát để khóa phiên hiện tại
  const handleClose = async () => {
    await syncProgress(cards, currentSlideIndex, { finishSession: true });
    navigation.goBack();
  };

  const handleFlipCard = () => {
    Animated.timing(flipAnim, {
      toValue: isFlipped ? 0 : 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
    setIsFlipped(!isFlipped);
  };

  const handleNext = () => {
    if (currentSlideIndex < cards.length - 1) {
      const nextIndex = currentSlideIndex + 1;
      setCurrentSlideIndex(nextIndex);
      setIsFlipped(false);
      flipAnim.setValue(0);
      syncProgress(cards, nextIndex);
    }
  };

  const handlePrev = () => {
    if (currentSlideIndex > 0) {
      const nextIndex = currentSlideIndex - 1;
      setCurrentSlideIndex(nextIndex);
      setIsFlipped(false);
      flipAnim.setValue(0);
      syncProgress(cards, nextIndex);
    }
  };

  const toggleStar = async () => {
    const card = cards[currentSlideIndex];
    const nextStar = !card.user_state?.is_star;

    try {
      await updateVocabularyProgress(card._id, { is_star: nextStar });
      const newCards = [...cards];
      newCards[currentSlideIndex].user_state.is_star = nextStar;
      setCards(newCards);
      syncProgress(newCards, currentSlideIndex);
    } catch (e) {
      Alert.alert("Lỗi", "Không thể cập nhật đánh dấu");
    }
  };

  const toggleMemorized = async () => {
    const card = cards[currentSlideIndex];
    const nextMem = !card.user_state?.is_memorized;

    try {
      await updateVocabularyProgress(card._id, { is_memorized: nextMem });
      const newCards = [...cards];
      newCards[currentSlideIndex].user_state.is_memorized = nextMem;
      setCards(newCards);
      syncProgress(newCards, currentSlideIndex);
    } catch (e) {
      Alert.alert("Lỗi", "Không thể cập nhật trạng thái");
    }
  };

  const currentCard = cards[currentSlideIndex];

  const frontInterpolate = flipAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });
  const backInterpolate = flipAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["180deg", "360deg"],
  });

  if (isLoading)
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#5B7FFF" />
      </View>
    );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        {/* Đổi thành handleClose để đảm bảo luôn sync trước khi thoát */}
        <TouchableOpacity onPress={handleClose} style={styles.headerIcon}>
          <Ionicons name="close" size={26} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.progressText}>
          {currentSlideIndex + 1}/{cards.length}
        </Text>
        <TouchableOpacity onPress={() => setIsSettingsVisible(true)} style={styles.headerIcon}>
          <Ionicons name="settings-outline" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statPillRed}>
          <Text style={styles.statTextRed}>{cards.filter((c) => !c.user_state?.is_memorized).length}</Text>
        </View>
        <View style={styles.statPillGreen}>
          <Text style={styles.statTextGreen}>{cards.filter((c) => c.user_state?.is_memorized).length}</Text>
        </View>
      </View>

      {/* Flashcard Area */}
      <View style={styles.cardContainer}>
        <View style={styles.cardWrapper}>
          {/* MẶT TRƯỚC */}
          <Animated.View pointerEvents={isFlipped ? "none" : "auto"} style={[styles.card, { transform: [{ perspective: 1000 }, { rotateY: frontInterpolate }] }]}>
            {/* [SỬA LỖI UI]: Đưa nút Star RA NGOÀI cardTouchable và cấp zIndex cao hơn */}
            <TouchableOpacity onPress={toggleStar} style={styles.starIcon}>
              <Ionicons name={currentCard?.user_state?.is_star ? "star" : "star-outline"} size={26} color={currentCard?.user_state?.is_star ? "#FBBF24" : "#6B7280"} />
            </TouchableOpacity>

            <TouchableOpacity onPress={handleFlipCard} activeOpacity={1} style={styles.cardTouchable}>
              <View style={styles.cardContent}>
                <Text style={styles.cardWord}>{frontLanguage === "english" ? currentCard?.term : currentCard?.definition}</Text>
              </View>
            </TouchableOpacity>
          </Animated.View>

          {/* MẶT SAU */}
          <Animated.View pointerEvents={isFlipped ? "auto" : "none"} style={[styles.card, styles.cardBack, { transform: [{ perspective: 1000 }, { rotateY: backInterpolate }] }]}>
            {/* [SỬA LỖI UI]: Đưa nút Star RA NGOÀI cardTouchable và cấp zIndex cao hơn */}
            <TouchableOpacity onPress={toggleStar} style={styles.starIcon}>
              <Ionicons name={currentCard?.user_state?.is_star ? "star" : "star-outline"} size={26} color={currentCard?.user_state?.is_star ? "#FBBF24" : "#6B7280"} />
            </TouchableOpacity>

            <TouchableOpacity onPress={handleFlipCard} activeOpacity={1} style={styles.cardTouchable}>
              <View style={styles.cardContent}>
                <Text style={styles.cardWord}>{frontLanguage === "english" ? currentCard?.definition : currentCard?.term}</Text>
              </View>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity onPress={handlePrev} disabled={currentSlideIndex === 0}>
          <Ionicons name="chevron-back-circle" size={32} color={currentSlideIndex === 0 ? "#4B5563" : "#9CA3AF"} />
        </TouchableOpacity>

        <TouchableOpacity onPress={toggleMemorized} style={styles.memorizedButton}>
          <Ionicons name={currentCard?.user_state?.is_memorized ? "checkmark-circle" : "ellipse-outline"} size={20} color="#FFFFFF" />
          <Text style={styles.footerText}>{currentCard?.user_state?.is_memorized ? "Đã thuộc" : "Đánh dấu đã thuộc"}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleNext} disabled={currentSlideIndex >= cards.length - 1}>
          <Ionicons name="chevron-forward-circle" size={32} color={currentSlideIndex >= cards.length - 1 ? "#4B5563" : "#9CA3AF"} />
        </TouchableOpacity>
      </View>

      {/* Settings Modal (Không thay đổi) */}
      <Modal visible={isSettingsVisible} transparent animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setIsSettingsVisible(false)}>
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Tùy chọn</Text>

            <View style={styles.actionButtonsRow}>
              <TouchableOpacity
                style={[styles.actionButton, isShuffled && styles.actionButtonActive]}
                onPress={() => {
                  const shuffled = [...cards].sort(() => Math.random() - 0.5);
                  setCards(shuffled);
                  setIsShuffled(true);
                  setCurrentSlideIndex(0);
                }}
              >
                <Ionicons name="shuffle-outline" size={24} color={isShuffled ? "#5B7FFF" : "#6B7280"} />
                <Text style={[styles.actionButtonText, isShuffled && styles.actionButtonTextActive]}>Trộn thẻ</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, !isShuffled && styles.actionButtonActive]}
                onPress={() => {
                  setCards(originalCards);
                  setIsShuffled(false);
                  setCurrentSlideIndex(0);
                }}
              >
                <Ionicons name="refresh-outline" size={24} color={!isShuffled ? "#5B7FFF" : "#6B7280"} />
                <Text style={[styles.actionButtonText, !isShuffled && styles.actionButtonTextActive]}>Khôi phục</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#080B1C" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16 },
  headerIcon: { padding: 4 },
  progressText: { fontSize: 16, fontWeight: "600", color: "#FFFFFF" },
  statsContainer: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 20, marginBottom: 16 },
  statPillRed: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: "rgba(239, 68, 68, 0.5)" },
  statTextRed: { color: "#EF4444", fontWeight: "600" },
  statPillGreen: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: "rgba(16, 185, 129, 0.5)" },
  statTextGreen: { color: "#10B981", fontWeight: "600" },
  cardContainer: { flex: 1, paddingHorizontal: 20 },
  cardWrapper: { flex: 1 },
  card: { flex: 1, backgroundColor: "#1E2235", borderRadius: 16, backfaceVisibility: "hidden", elevation: 8 },
  cardBack: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  cardTouchable: { flex: 1 },
  // THÊM zIndex vào starIcon để đảm bảo ưu tiên nhận event chạm
  starIcon: { position: "absolute", top: 16, right: 16, padding: 8, zIndex: 999, elevation: 999 },
  cardContent: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20 },
  cardWord: { fontSize: 32, fontWeight: "700", color: "#FFFFFF", textAlign: "center" },
  footer: { flexDirection: "row", justifyContent: "center", alignItems: "center", paddingVertical: 24, gap: 20 },
  memorizedButton: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 25, backgroundColor: "rgba(91, 127, 255, 0.2)" },
  footerText: { color: "#FFFFFF", fontWeight: "500" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" },
  modalContent: { backgroundColor: "#1A1D2E", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  modalHandle: { width: 40, height: 4, backgroundColor: "#4B5563", borderRadius: 2, alignSelf: "center", marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: "700", color: "#FFFFFF", textAlign: "center", marginBottom: 20 },
  actionButtonsRow: { flexDirection: "row", gap: 12 },
  actionButton: { flex: 1, backgroundColor: "#252838", borderRadius: 12, padding: 16, alignItems: "center", borderWidth: 2, borderColor: "transparent" },
  actionButtonActive: { borderColor: "#5B7FFF" },
  actionButtonText: { color: "#6B7280", marginTop: 8, fontSize: 12 },
  actionButtonTextActive: { color: "#5B7FFF" },
});
