import React, { useState, useRef, useEffect, useCallback } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions, Animated, Modal, ActivityIndicator, Alert, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import { COLORS } from "../constants/config";
import { getCourseById, getCourseVocabularies, deleteCourse as deleteCourseApi, updateCourseStar, updateVocabularyProgress } from "../services/api";

const { width } = Dimensions.get("window");

const generateGoogleTTSUrl = (text, languageCode = "en") => {
  if (!text || text.trim() === "") {
    return "";
  }
  const encodedText = encodeURIComponent(text);
  return `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodedText}&tl=${languageCode}&client=tw-ob`;
};

const LESSON_MENU_ITEMS = [
  { id: 1, label: "Chế độ tập trung", icon: "flash" },
  { id: 2, label: "Bài tập ôn tập", icon: "document" },
  { id: 3, label: "Hỏi AI", icon: "chatbubble" },
];

export default function CourseDetailScreen({ navigation, route }) {
  const { courseId } = route.params;
  const [course, setCourse] = useState(null);
  const [flashcards, setFlashcards] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isMenuVisible, setIsMenuVisible] = useState(false);
  const [playingAudio, setPlayingAudio] = useState(null);
  const [isUpdatingCourseStar, setIsUpdatingCourseStar] = useState(false);
  const flipAnim = useRef(new Animated.Value(0)).current;
  const soundRef = useRef(null);

  const loadCourseDetail = useCallback(async () => {
    try {
      setIsLoading(true);
      setError("");

      const [courseRes, vocabRes] = await Promise.all([getCourseById(courseId), getCourseVocabularies(courseId)]);
      setCourse(courseRes?.data || null);
      setFlashcards(vocabRes?.data || []);
    } catch (err) {
      setError(err.message || "Không thể tải chi tiết học phần");
    } finally {
      setIsLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    loadCourseDetail();
  }, [courseId, loadCourseDetail]);

  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, []);

  const playAudio = async (audioUrl) => {
    if (!audioUrl) {
      Alert.alert("Thông báo", "Không có âm thanh cho mục này");
      return;
    }

    try {
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
      }

      const sound = new Audio.Sound();
      soundRef.current = sound;
      await sound.loadAsync({ uri: audioUrl });
      await sound.playAsync();
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.didJustFinish) {
          setPlayingAudio(null);
        }
      });
    } catch (err) {
      Alert.alert("Lỗi", "Không thể phát âm thanh: " + err.message);
      setPlayingAudio(null);
    }
  };

  const stopAudio = async () => {
    if (soundRef.current) {
      await soundRef.current.stopAsync();
      setPlayingAudio(null);
    }
  };

  const handleFlipCard = () => {
    Animated.timing(flipAnim, {
      toValue: isFlipped ? 0 : 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
    setIsFlipped(!isFlipped);
  };

  const currentCard = flashcards[currentSlideIndex];

  // Animation mặt trước: 0 -> 180 độ
  const frontInterpolate = flipAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });

  // Animation mặt sau: 180 -> 360 độ
  const backInterpolate = flipAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["180deg", "360deg"],
  });

  const handleNextSlide = () => {
    if (currentSlideIndex < flashcards.length - 1) {
      setCurrentSlideIndex(currentSlideIndex + 1);
      setIsFlipped(false);
      flipAnim.setValue(0);
    }
  };

  const handlePrevSlide = () => {
    if (currentSlideIndex > 0) {
      setCurrentSlideIndex(currentSlideIndex - 1);
      setIsFlipped(false);
      flipAnim.setValue(0);
    }
  };

  const handleDeleteCourse = () => {
    Alert.alert("Xóa học phần", "Bạn có chắc muốn xóa học phần này không?", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Xóa",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteCourseApi(courseId);
            setIsMenuVisible(false);
            navigation.goBack();
          } catch (err) {
            Alert.alert("Lỗi", err.message || "Không thể xóa học phần");
          }
        },
      },
    ]);
  };

  const totalTerms = flashcards.length;
  const isCourseStar = Boolean(course?.course_user?.is_star);

  const normalizedCards = Array.isArray(flashcards)
    ? flashcards.map((card) => ({
        id: card._id,
        english: card.term,
        vietnamese: card.definition,
        term_image_url: card.term_image_url,
        def_image_url: card.def_image_url,
        term_language_code: card.term_language_code,
        definition_language_code: card.definition_language_code,
        is_star: Boolean(card?.user_state?.is_star),
        is_memorized: Boolean(card?.user_state?.is_memorized),
      }))
    : [];

  const toggleCourseStar = async () => {
    if (!course || isUpdatingCourseStar) return;

    const next = !Boolean(course?.course_user?.is_star);
    setIsUpdatingCourseStar(true);
    try {
      await updateCourseStar(courseId, next);
      setCourse((prev) => ({
        ...(prev || {}),
        course_user: {
          ...(prev?.course_user || {}),
          is_star: next,
        },
      }));
    } catch (err) {
      Alert.alert("Lỗi", err.message || "Không thể cập nhật đánh dấu học phần");
    } finally {
      setIsUpdatingCourseStar(false);
    }
  };

  const toggleVocabularyStar = async (card) => {
    if (!card?._id) return;
    const next = !Boolean(card?.user_state?.is_star);

    try {
      await updateVocabularyProgress(card._id, { is_star: next });
      setFlashcards((prev) =>
        prev.map((item) =>
          item._id === card._id
            ? {
                ...item,
                user_state: {
                  ...(item.user_state || {}),
                  is_star: next,
                },
              }
            : item,
        ),
      );
    } catch (err) {
      Alert.alert("Lỗi", err.message || "Không thể cập nhật từ vựng yêu thích");
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FFFFFF" />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !course) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>{error || "Course not found"}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={28} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerIcons}>
            <TouchableOpacity activeOpacity={0.7} onPress={toggleCourseStar} disabled={isUpdatingCourseStar}>
              <Ionicons name={isCourseStar ? "bookmark" : "bookmark-outline"} size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.7} style={{ marginLeft: 16 }} onPress={() => setIsMenuVisible(true)}>
              <Ionicons name="ellipsis-vertical" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
          {/* Slide Area */}
          <View style={styles.slideContainer}>
            {flashcards.length > 0 ? (
              <View style={styles.slideWrapper}>
                {/* Front Side - Sử dụng pointerEvents để chặn click khi bị lật */}
                <Animated.View
                  pointerEvents={isFlipped ? "none" : "auto"}
                  style={[
                    styles.slide,
                    {
                      transform: [{ perspective: 1000 }, { rotateY: frontInterpolate }],
                    },
                  ]}
                >
                  <TouchableOpacity onPress={handleFlipCard} activeOpacity={0.8} style={styles.slideTouchable}>
                    <View style={styles.slideContent}>
                      {currentCard.term_image_url ? <Image source={{ uri: currentCard.term_image_url }} style={styles.cardImage} /> : null}
                      <Text style={styles.slideTopicFront}>{currentCard.term}</Text>
                      <TouchableOpacity
                        onPress={(e) => {
                          e.stopPropagation();
                          console.log("Playing Term:", currentCard.term);
                          const audioUrl = generateGoogleTTSUrl(currentCard.term, currentCard.term_language_code || "en");
                          if (playingAudio === `term_${currentCard._id}`) {
                            stopAudio();
                          } else {
                            playAudio(audioUrl);
                            setPlayingAudio(`term_${currentCard._id}`);
                          }
                        }}
                        style={styles.audioButton}
                        activeOpacity={0.7}
                      >
                        <Ionicons name={playingAudio === `term_${currentCard._id}` ? "pause" : "volume-high"} size={20} color="#FFFFFF" />
                      </TouchableOpacity>
                    </View>
                    <View style={styles.slideStarIcon}>
                      <TouchableOpacity
                        onPress={(e) => {
                          e.stopPropagation();
                          toggleVocabularyStar(currentCard);
                        }}
                        activeOpacity={0.7}
                      >
                        <Ionicons name={currentCard?.user_state?.is_star ? "star" : "star-outline"} size={24} color={COLORS.primary} />
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                </Animated.View>

                {/* Back Side - Chỉ nhận pointerEvents khi đã lật xong */}
                <Animated.View
                  pointerEvents={isFlipped ? "auto" : "none"}
                  style={[
                    styles.slide,
                    styles.slideBack,
                    {
                      transform: [{ perspective: 1000 }, { rotateY: backInterpolate }],
                    },
                  ]}
                >
                  <TouchableOpacity onPress={handleFlipCard} activeOpacity={0.8} style={styles.slideTouchable}>
                    <View style={styles.slideContent}>
                      {currentCard.def_image_url ? <Image source={{ uri: currentCard.def_image_url }} style={styles.cardImage} /> : null}
                      <Text style={styles.slideTopicBack}>{currentCard.definition}</Text>
                      <TouchableOpacity
                        onPress={(e) => {
                          e.stopPropagation();
                          console.log("Playing Def:", currentCard.definition);
                          const audioUrl = generateGoogleTTSUrl(currentCard.definition, currentCard.definition_language_code || "vi");
                          if (playingAudio === `def_${currentCard._id}`) {
                            stopAudio();
                          } else {
                            playAudio(audioUrl);
                            setPlayingAudio(`def_${currentCard._id}`);
                          }
                        }}
                        style={styles.audioButton}
                        activeOpacity={0.7}
                      >
                        <Ionicons name={playingAudio === `def_${currentCard._id}` ? "pause" : "volume-high"} size={20} color="#FFFFFF" />
                      </TouchableOpacity>
                    </View>
                    <View style={styles.slideStarIcon}>
                      <TouchableOpacity
                        onPress={(e) => {
                          e.stopPropagation();
                          toggleVocabularyStar(currentCard);
                        }}
                        activeOpacity={0.7}
                      >
                        <Ionicons name={currentCard?.user_state?.is_star ? "star" : "star-outline"} size={24} color={COLORS.primary} />
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                </Animated.View>
              </View>
            ) : (
              <View style={styles.emptySlide}>
                <Text style={styles.errorText}>Học phần chưa có thẻ từ vựng</Text>
              </View>
            )}

            {/* Navigation Buttons */}
            <View style={styles.slideNavigation}>
              <TouchableOpacity onPress={handlePrevSlide} disabled={currentSlideIndex === 0} activeOpacity={0.7} style={[styles.slideButton, currentSlideIndex === 0 && styles.slideButtonDisabled]}>
                <Ionicons name="chevron-back" size={24} color={currentSlideIndex === 0 ? COLORS.textMuted : COLORS.primary} />
              </TouchableOpacity>

              <View style={styles.dotsContainer}>
                {normalizedCards.slice(0, 10).map((_, index) => (
                  <View key={index} style={[styles.dot, index === currentSlideIndex && styles.activeDot]} />
                ))}
                {normalizedCards.length > 10 && <Text style={{ color: "#6B7280" }}>...</Text>}
              </View>

              <TouchableOpacity
                onPress={handleNextSlide}
                disabled={currentSlideIndex === normalizedCards.length - 1}
                activeOpacity={0.7}
                style={[styles.slideButton, currentSlideIndex === normalizedCards.length - 1 && styles.slideButtonDisabled]}
              >
                <Ionicons name="chevron-forward" size={24} color={currentSlideIndex === normalizedCards.length - 1 ? COLORS.textMuted : COLORS.primary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Course Info */}
          <View style={styles.courseInfo}>
            <Text style={styles.courseTitle}>{course.title}</Text>
            <View style={styles.authorInfo}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarEmoji}>👤</Text>
              </View>
              <View style={styles.authorDetails}>
                <Text style={styles.authorName}>{course.is_public ? "Công khai" : "Riêng tư"}</Text>
                <Text style={styles.authorMeta}>{totalTerms} Thuật ngữ</Text>
              </View>
            </View>
          </View>

          {/* Focus Mode Button */}
          <TouchableOpacity onPress={() => navigation.navigate("CourseDetailFocusMode", { courseId })} activeOpacity={0.7} style={styles.focusModeButton}>
            <Ionicons name="flash" size={20} color="white" />
            <Text style={styles.focusModeButtonText}>Chế độ tập trung</Text>
          </TouchableOpacity>

          {/* Menu Items */}
          <View style={styles.menuContainer}>
            {LESSON_MENU_ITEMS.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.menuItem}
                activeOpacity={0.7}
                onPress={() => {
                  if (item.id === 1) {
                    navigation.navigate("CourseDetailFocusMode", { courseId });
                  }
                }}
              >
                <View style={styles.menuIconContainer}>
                  <Ionicons name={item.icon} size={24} color={COLORS.primary} />
                </View>
                <Text style={styles.menuItemText}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Flashcards List */}
          <View style={styles.flashcardsListSection}>
            <Text style={styles.flashcardsListTitle}>Tất cả thẻ</Text>
            {normalizedCards.map((card, index) => (
              <View key={card.id} style={[styles.flashcardListItem, index === currentSlideIndex && styles.activeFlashcardListItem]}>
                <View style={styles.cardListContent}>
                  <Text style={styles.cardListNumber}>{index + 1}</Text>
                  <View style={styles.cardListTexts}>
                    <Text style={styles.cardListEnglish}>{card.english}</Text>
                    <Text style={styles.cardListVietnamese}>{card.vietnamese}</Text>
                  </View>
                  {card.is_star ? <Ionicons name="star" size={16} color={COLORS.primary} /> : null}
                </View>
              </View>
            ))}
          </View>
        </ScrollView>

        {/* Menu Modal */}
        <Modal visible={isMenuVisible} transparent={true} animationType="fade" onRequestClose={() => setIsMenuVisible(false)}>
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setIsMenuVisible(false)}>
            <TouchableOpacity style={styles.modalContent} activeOpacity={1} onPress={(e) => e.stopPropagation()}>
              <TouchableOpacity
                style={styles.modalItem}
                onPress={() => {
                  setIsMenuVisible(false);
                  navigation.navigate("EditCourse", { courseId });
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="create-outline" size={24} color="#FFFFFF" />
                <Text style={styles.modalItemText}>Sửa</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalItem}
                onPress={() => {
                  setIsMenuVisible(false);
                  navigation.navigate("AddCourse");
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="add" size={24} color="#FFFFFF" />
                <Text style={styles.modalItemText}>Tạo học phần mới</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.modalItem, styles.modalItemDanger]} onPress={handleDeleteCourse} activeOpacity={0.7}>
                <Ionicons name="trash-outline" size={24} color="#EF4444" />
                <Text style={[styles.modalItemText, styles.modalItemTextDanger]}>Xóa học phần</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#0A0E27" },
  container: { flex: 1, backgroundColor: "#0A0E27" },
  content: { flex: 1 },
  contentContainer: { paddingBottom: 40 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#1E2235",
    borderBottomWidth: 1,
    borderBottomColor: "#374151",
  },
  headerIcons: { flexDirection: "row", alignItems: "center" },
  slideContainer: { paddingHorizontal: 16, paddingVertical: 24, backgroundColor: "#1E2235", marginBottom: 20 },
  slideWrapper: { height: 280, marginBottom: 16 },
  slide: {
    height: "100%",
    width: "100%",
    backgroundColor: "#2A2D3E",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#374151",
    backfaceVisibility: "hidden",
  },
  slideBack: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  slideTouchable: { flex: 1, justifyContent: "center", alignItems: "center" },
  slideContent: { justifyContent: "center", alignItems: "center", width: "100%" },
  cardImage: { width: 150, height: 150, borderRadius: 12, marginBottom: 16 },
  audioButton: {
    marginTop: 12,
    backgroundColor: "rgba(91, 127, 255, 0.3)",
    borderRadius: 50,
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  slideTopicFront: { fontSize: 24, fontWeight: "700", color: "#FFFFFF", textAlign: "center", paddingHorizontal: 20 },
  slideTopicBack: { fontSize: 24, fontWeight: "700", color: "#9CA3AF", textAlign: "center", paddingHorizontal: 20 },
  slideStarIcon: { position: "absolute", top: 16, right: 16, padding: 8 },
  slideNavigation: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  slideButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#2A2D3E", justifyContent: "center", alignItems: "center" },
  slideButtonDisabled: { opacity: 0.5 },
  dotsContainer: { flexDirection: "row", justifyContent: "center", gap: 8, flex: 1 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#6B7280" },
  activeDot: { backgroundColor: "#FFFFFF", width: 24 },
  courseInfo: { paddingHorizontal: 16, marginBottom: 20 },
  courseTitle: { fontSize: 18, fontWeight: "600", color: "#FFFFFF", marginBottom: 12 },
  authorInfo: { flexDirection: "row", alignItems: "center" },
  avatarCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#2A2D3E", justifyContent: "center", alignItems: "center", marginRight: 12 },
  avatarEmoji: { fontSize: 24 },
  authorName: { fontSize: 15, fontWeight: "600", color: "#FFFFFF" },
  authorMeta: { fontSize: 13, color: "#9CA3AF", marginTop: 2 },
  focusModeButton: {
    marginHorizontal: 16,
    marginBottom: 24,
    backgroundColor: "#5B7FFF",
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  focusModeButtonText: { fontSize: 16, fontWeight: "700", color: "white" },
  menuContainer: { gap: 10, paddingHorizontal: 16, marginBottom: 24 },
  menuItem: { flexDirection: "row", alignItems: "center", backgroundColor: "#1E2235", borderRadius: 12, padding: 16, borderWidth: 1, borderColor: "#374151" },
  menuIconContainer: { width: 40, height: 40, borderRadius: 10, backgroundColor: "rgba(91, 127, 255, 0.2)", justifyContent: "center", alignItems: "center", marginRight: 12 },
  menuItemText: { fontSize: 15, fontWeight: "600", color: "#FFFFFF", flex: 1 },
  flashcardsListSection: { paddingHorizontal: 16, marginTop: 20 },
  flashcardsListTitle: { fontSize: 18, fontWeight: "600", color: "#FFFFFF", marginBottom: 12 },
  flashcardListItem: { backgroundColor: "#1E2235", borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: "#374151", flexDirection: "row", alignItems: "center" },
  activeFlashcardListItem: { borderColor: "#5B7FFF", backgroundColor: "rgba(91, 127, 255, 0.1)" },
  cardListNumber: { fontSize: 14, fontWeight: "600", color: "#6B7280", marginRight: 12, width: 28, textAlign: "center" },
  cardListEnglish: { fontSize: 15, fontWeight: "600", color: "#FFFFFF", marginBottom: 3 },
  cardListVietnamese: { fontSize: 13, color: "#9CA3AF" },
  errorText: { color: "#EF4444", fontSize: 16, textAlign: "center", marginTop: 20 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0, 0, 0, 0.7)", justifyContent: "flex-end" },
  modalContent: { backgroundColor: "#1A1D2E", borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 24, paddingTop: 24, paddingBottom: 40 },
  modalItem: { flexDirection: "row", alignItems: "center", paddingVertical: 16, gap: 16 },
  modalItemText: { fontSize: 16, fontWeight: "600", color: "#FFFFFF" },
  modalItemDanger: { borderTopWidth: 1, borderTopColor: "#374151", marginTop: 8, paddingTop: 24 },
  modalItemTextDanger: { color: "#EF4444" },
});
