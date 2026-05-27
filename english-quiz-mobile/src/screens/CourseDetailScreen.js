import React, { useState, useRef, useEffect, useCallback } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions, Animated, Modal, ActivityIndicator, Alert, Image, Clipboard } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import { COLORS } from "../constants/config";
import { getCourseById, getCourseVocabularies, deleteCourse as deleteCourseApi, updateCourseStar, updateVocabularyProgress, shareCourse, updateCourse } from "../services/api";

const { width } = Dimensions.get("window");

/**
 * TẠO URL ÂM THANH TỪ GOOGLE TTS
 *
 * Sử dụng: Phát âm thanh từ vựng trong course detail preview
 * Tương tự như CourseDetailFocusModeScreen
 */
const generateGoogleTTSUrl = (text, languageCode = "en") => {
  if (!text || text.trim() === "") {
    return "";
  }
  const encodedText = encodeURIComponent(text);
  return `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodedText}&tl=${languageCode}&client=tw-ob`;
};

/**
 * LESSON MENU ITEMS - Menu tuỳ chọn học
 *
 * Hiển thị trong modal menu:
 * - "Chế độ tập trung" → Điều hướng tới Focus Mode
 * - "Bài tập ôn tập" → Để implement
 * - "Hỏi AI" → Để implement
 */
const LESSON_MENU_ITEMS = [
  { id: 1, label: "Chế độ tập trung", icon: "flash" },
  { id: 2, label: "Bài tập ôn tập", icon: "document" },
  { id: 3, label: "Hỏi AI", icon: "chatbubble" },
];

/**
 * COURSE DETAIL SCREEN - Màn hình xem chi tiết khóa học
 *
 * Mục đích:
 * - Hiển thị thông tin khóa học (tên, mô tả)
 * - Hiển thị preview flashcards (dạng lật)
 * - Cho phép user: lật, điều hướng, đánh dấu, phát audio
 * - Điểm vào Focus Mode (chế độ tập trung)
 *
 * Khác với CourseDetailFocusModeScreen:
 * - DetailScreen: Preview mode, có header với course info
 * - FocusModeScreen: Full-screen learning mode, không có header
 * - DetailScreen: Có menu tuỳ chọn (tập trung, ôn tập, AI)
 * - FocusModeScreen: Tập trung 100% vào học
 */
export default function CourseDetailScreen({ navigation, route }) {
  const { courseId } = route.params;

  // ============ STATE: COURSE & FLASHCARDS ============
  const [course, setCourse] = useState(null); // Thông tin khóa học
  const [flashcards, setFlashcards] = useState([]); // Danh sách từ vựng
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  // ============ STATE: NAVIGATION & ANIMATION ============
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0); // Vị trí thẻ hiện tại
  const [isFlipped, setIsFlipped] = useState(false); // Trạng thái lật
  const [isMenuVisible, setIsMenuVisible] = useState(false); // Modal menu tuỳ chọn

  // ============ STATE: INTERACTIONS ============
  const [playingAudio, setPlayingAudio] = useState(null); // ID audio đang phát
  const [isUpdatingCourseStar, setIsUpdatingCourseStar] = useState(false); // Đang cập nhật star?
  const flipAnim = useRef(new Animated.Value(0)).current; // Animation value (0-1)
  const soundRef = useRef(null); // Reference đến Audio.Sound object

  /**
   * LOAD COURSE DETAIL & VOCABULARIES
   *
   * Quy trình:
   * 1. Parallel fetch: getCourseById() + getCourseVocabularies()
   * 2. Cập nhật state: course + flashcards
   * 3. Handle errors
   * 4. Set loading = false
   */
  const loadCourseDetail = useCallback(async () => {
    try {
      setIsLoading(true);
      setError("");

      // Fetch song song (Promise.all)
      const [courseRes, vocabRes] = await Promise.all([getCourseById(courseId), getCourseVocabularies(courseId)]);

      setCourse(courseRes?.data || null);
      setFlashcards(vocabRes?.data || []);
    } catch (err) {
      setError(err.message || "Không thể tải chi tiết học phần");
    } finally {
      setIsLoading(false);
    }
  }, [courseId]);

  /**
   * useEffect: Load data khi component mount hoặc courseId thay đổi
   */
  useEffect(() => {
    loadCourseDetail();
  }, [courseId, loadCourseDetail]);

  /**
   * useEffect: Cleanup audio khi component unmount
   *
   * Nguyên nhân: Tránh memory leaks
   * Gọi: soundRef.current.unloadAsync()
   */
  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, []);

  /**
   * PLAY AUDIO: Phát âm thanh từ Google TTS
   *
   * Tương tự như CourseDetailFocusModeScreen
   * Sử dụng: Khi user click audio button trên flashcard preview
   */
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

  /**
   * STOP AUDIO: Dừng phát âm thanh
   *
   * Gọi khi: User click lại audio button khi đang phát
   */
  const stopAudio = async () => {
    if (soundRef.current) {
      await soundRef.current.stopAsync();
      setPlayingAudio(null);
    }
  };

  /**
   * HANDLE FLIP CARD: Lật thẻ với animation 3D
   *
   * Animation:
   * - 600ms timing (chậm hơn Focus Mode 500ms để emphatic hơn)
   * - Flip 0 → 1 trên animation value
   * - Transform: rotateY (front/back)
   */
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

  /**
   * HANDLE NEXT SLIDE: Chuyển sang thẻ tiếp theo
   *
   * Quy trình:
   * 1. Check không phải thẻ cuối
   * 2. Tăng index
   * 3. Reset flip state & animation
   */
  const handleNextSlide = () => {
    if (currentSlideIndex < flashcards.length - 1) {
      setCurrentSlideIndex(currentSlideIndex + 1);
      setIsFlipped(false);
      flipAnim.setValue(0);
    }
  };

  /**
   * HANDLE PREV SLIDE: Chuyển sang thẻ trước đó
   *
   * Quy trình:
   * 1. Check không phải thẻ đầu
   * 2. Giảm index
   * 3. Reset flip state & animation
   */
  const handlePrevSlide = () => {
    if (currentSlideIndex > 0) {
      setCurrentSlideIndex(currentSlideIndex - 1);
      setIsFlipped(false);
      flipAnim.setValue(0);
    }
  };

  /**
   * HANDLE DELETE COURSE: Xóa khóa học
   *
   * Quy trình:
   * 1. Confirm alert
   * 2. Gọi API deleteCourseApi
   * 3. Navigate back nếu thành công
   * 4. Show error nếu fail
   *
   * Ghi chú: Chỉ creator có thể xóa
   */
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

  /**
   * NORMALIZE CARDS: Transform flashcard data để dễ sử dụng
   *
   * Từ backend format: {term, definition, user_state: {is_memorized, is_star}}
   * Sang UI format: {english, vietnamese, is_star, is_memorized}
   */
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

  /**
   * TOGGLE COURSE STAR: Đánh dấu/bỏ đánh dấu khóa học yêu thích
   *
   * Quy trình:
   * 1. Toggle giá trị
   * 2. Gọi API updateCourseStar
   * 3. Update local state
   * 4. Handle errors
   *
   * Ghi chú: Dùng isUpdatingCourseStar để tránh double-click
   */
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

  /**
   * TOGGLE VOCABULARY STAR: Đánh dấu/bỏ đánh dấu từ vựng yêu thích
   *
   * Quy trình:
   * 1. Toggle is_star
   * 2. Gọi API updateVocabularyProgress
   * 3. Update flashcards state
   * 4. Hiển thị thay đổi ngay lập tức
   */
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

  const handleShareCourse = async () => {
    if (!course) return;

    try {
      if (!course.is_public) {
        Alert.alert("Private Course", "This course is private. Do you want to make it public before sharing?", [
          { text: "Cancel", onPress: () => {} },
          {
            text: "Make Public & Share",
            onPress: async () => {
              await updateCourse(course._id, { is_public: true });
              const response = await shareCourse(course._id);
              Clipboard.setString(response.data.share_code);
              setCourse((prev) => ({
                ...(prev || {}),
                is_public: true,
              }));
              Alert.alert("Shared!", `Share code copied: ${response.data.share_code}`);
            },
          },
        ]);
      } else {
        const response = await shareCourse(course._id);
        Clipboard.setString(response.data.share_code);
        Alert.alert("Shared!", `Share code copied: ${response.data.share_code}`);
      }
    } catch (err) {
      Alert.alert("Error", err.message || "Failed to share course");
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
            <TouchableOpacity activeOpacity={0.7} style={{ marginLeft: 16 }} onPress={handleShareCourse}>
              <Ionicons name="share-social" size={24} color="#FFFFFF" />
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
                <Text style={styles.authorName}>{course.is_public ? "Public" : "Private"}</Text>
                <Text style={styles.authorMeta}>{totalTerms} Terms</Text>
              </View>
            </View>
          </View>

          {/* Focus Mode Button */}
          <TouchableOpacity onPress={() => navigation.navigate("CourseDetailFocusMode", { courseId })} activeOpacity={0.7} style={styles.focusModeButton}>
            <Ionicons name="flash" size={20} color="white" />
            <Text style={styles.focusModeButtonText}>Practice Mode</Text>
          </TouchableOpacity>

          {/* Flashcards List */}
          <View style={styles.flashcardsListSection}>
            <Text style={styles.flashcardsListTitle}>All cards</Text>
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
                <Text style={styles.modalItemText}>Edit</Text>
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
                <Text style={styles.modalItemText}>Create new flashcard set</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.modalItem, styles.modalItemDanger]} onPress={handleDeleteCourse} activeOpacity={0.7}>
                <Ionicons name="trash-outline" size={24} color="#EF4444" />
                <Text style={[styles.modalItemText, styles.modalItemTextDanger]}>Delete flashcard set</Text>
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
