import React, { useState, useRef, useEffect, useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Animated, Modal, Switch, ActivityIndicator, Alert, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import { getCourseVocabularies, getMySetting, updateMySetting, updateVocabularyProgress, createCoursePracticeSession, updateCoursePracticeProgress } from "../services/api";

const { width } = Dimensions.get("window");

/**
 * TẠO URL ÂM THANH TỪgoogle TTS (TEXT-TO-SPEECH)
 *
 * Mục đích: Tạo URL để phát âm thanh của từ vựng/định nghĩa qua Google Translate
 *
 * Google TTS API Format:
 * https://translate.google.com/translate_tts?ie=UTF-8&q=[encoded_text]&tl=[language_code]&client=tw-ob
 *
 * Ví dụ:
 * - generateGoogleTTSUrl("apple", "en")
 *   → https://translate.google.com/translate_tts?ie=UTF-8&q=apple&tl=en&client=tw-ob
 * - generateGoogleTTSUrl("quả táo", "vi")
 *   → https://translate.google.com/translate_tts?ie=UTF-8&q=qu%E1%BA%A3%20t%C3%A1o&tl=vi&client=tw-ob
 *
 * @param {string} text - Văn bản cần phát âm thanh
 * @param {string} languageCode - Mã ngôn ngữ (ví dụ: "en", "vi", "fr")
 * @returns {string} URL âm thanh hoặc chuỗi rỗng nếu text trống
 */
const generateGoogleTTSUrl = (text, languageCode = "en") => {
  if (!text || text.trim() === "") {
    return "";
  }
  const encodedText = encodeURIComponent(text);
  return `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodedText}&tl=${languageCode}&client=tw-ob`;
};

/**
 * COURSE DETAIL FOCUS MODE SCREEN - MÀN HÌNH HỌC FOCUS MODE (FLASHCARD)
 *
 * Mục đích:
 * - Cung cấp giao diện học tập toàn màn hình với flashcard
 * - Cho phép người dùng luyện tập từ vựng qua việc lật, điều hướng, đánh dấu
 * - Theo dõi tiến độ học tập (progress %)
 * - Hỗ trợ shuffle, audio, images
 *
 * Tính năng chính:
 * ✅ Hiển thị flashcard với animation flip 3D
 * ✅ Navigate prev/next giữa các thẻ
 * ✅ Đánh dấu "Đã ghi nhớ"
 * ✅ Đánh dấu "Yêu thích"
 * ✅ Phát âm thanh (Google TTS)
 * ✅ Hiển thị hình ảnh
 * ✅ Shuffle/Unshuffle thứ tự
 * ✅ Tạo practice session (1 lần duy nhất khi vào màn hình)
 * ✅ Tự động update progress khi navigate/mark
 * ✅ Đóng & save session khi thoát
 *
 * Key Implementation Details:
 * 1. Sử dụng React Ref (practiceIdRef) để lưu practice session ID
 *    - Nguyên nhân: Tránh React Strict Mode tạo lại session 2 lần
 *    - React Strict Mode unmount → mount lại component khi develop
 *    - Nếu không dùng Ref, sẽ tạo 2 session thay vì 1
 *
 * 2. Sử dụng isInitializingRef để đảm bảo chỉ tạo session 1 lần
 *    - Kiểm tra: if (isInitializingRef.current) return
 *    - Set true ngay khi bắt đầu tạo
 *    - Ngăn chặn race conditions
 *
 * 3. Data Merging với VocabularyUser
 *    - Backend trả về: [{...vocab, user_state: {is_memorized, is_star}}]
 *    - Frontend lưu vào state cards
 *    - Khi update → setState newCards với user_state mới
 *
 * 4. Progress Tracking
 *    - Tính % = (currentSlideIndex + 1) / total * 100
 *    - unmemorized_count = số thẻ chưa đánh dấu "Đã ghi nhớ"
 *    - status = "in_progress" hoặc "completed" (khi xem hết tất cả)
 */
export default function CourseDetailFocusMode({ navigation, route }) {
  const { courseId } = route.params;

  // ============ STATE: FLASHCARD DATA ============
  const [cards, setCards] = useState([]); // Mảng vocabulary, có thể bị shuffle
  const [originalCards, setOriginalCards] = useState([]); // Bản gốc, để restore khi unshuffle
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  // ============ STATE: NAVIGATION & ANIMATION ============
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0); // Vị trí thẻ hiện tại (0-based)
  const [isFlipped, setIsFlipped] = useState(false); // Trạng thái lật thẻ
  const flipAnim = useRef(new Animated.Value(0)).current; // Animation value (0 = mặt trước, 1 = mặt sau)

  // ============ PRACTICE SESSION TRACKING ============
  // ⚠️ CRITICAL: Dùng Ref thay vì State để tránh React Strict Mode tạo 2 session
  const practiceIdRef = useRef(null); // Lưu ID của practice session (1 lần duy nhất)
  const isInitializingRef = useRef(false); // Flag để đảm bảo chỉ init 1 lần

  // ============ STATE: SETTINGS ============
  const [isSettingsVisible, setIsSettingsVisible] = useState(false); // Modal cài đặt
  const [isShuffled, setIsShuffled] = useState(false); // Đã shuffle hay chưa?
  const [frontLanguage, setFrontLanguage] = useState("english"); // Ngôn ngữ mặt trước (english/vietnamese)
  const [playingAudio, setPlayingAudio] = useState(null); // ID của audio đang phát (để show pause icon)
  const soundRef = useRef(null); // Reference đến Audio.Sound object (để stop khi unmount)

  /**
   * CLEANUP: Unload âm thanh khi component unmount
   * - Nguyên nhân: Tránh memory leaks
   * - Gọi soundRef.current.unloadAsync() để giải phóng resource
   */
  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, []);

  /**
   * INIT: Load flashcards + tạo practice session
   *
   * Quy trình:
   * 1. Fetch getCourseVocabularies (trả về [{...vocab, user_state}])
   * 2. Fetch getMySetting (lấy cài đặt user: front_side = "definition"?)
   * 3. Tạo practice session (1 lần duy nhất)
   *    - Tính unmemorized_count từ flashcards
   *    - Set status = "in_progress", progress = 0
   * 4. Lưu practiceId vào Ref (không phải state!)
   *
   * ⚠️ GUARD: Kiểm tra isInitializingRef & practiceIdRef để tránh tạo 2 lần
   */
  useEffect(() => {
    let isMounted = true; // Để hủy request nếu component unmount

    const initData = async () => {
      // ⚠️ GUARD: Nếu đã init hoặc đã có practiceId, bỏ qua
      if (isInitializingRef.current || practiceIdRef.current) return;

      try {
        isInitializingRef.current = true;
        setIsLoading(true);

        // Fetch data từ backend
        const [vocabRes, settingRes] = await Promise.all([getCourseVocabularies(courseId), getMySetting()]);

        const loadedCards = vocabRes?.data || [];
        if (isMounted) {
          setCards(loadedCards);
          setOriginalCards(loadedCards); // Lưu bản gốc để restore khi unshuffle
        }

        // ========== TẠO PRACTICE SESSION (1 LẦN DUY NHẤT) ==========
        // Chỉ tạo nếu:
        // - Có flashcards
        // - Chưa có practiceId
        if (loadedCards.length > 0 && !practiceIdRef.current) {
          // Tính số từ chưa ghi nhớ
          const initialUnmemorized = loadedCards.filter((c) => !c.user_state?.is_memorized).length;

          // Gọi API tạo session
          const res = await createCoursePracticeSession(courseId, {
            status: "in_progress",
            progress: 0,
            unmemorized_count: initialUnmemorized,
            started_at: new Date().toISOString(),
          });

          // Lưu practiceId vào Ref (không phải state!)
          // ID có thể là _id hoặc id tùy backend trả
          if (res?.data?._id || res?.data?.id) {
            practiceIdRef.current = res.data._id || res.data.id;
            console.log("✅ Tạo Practice Session thành công. ID:", practiceIdRef.current);
          }
        }

        // Load cài đặt user: nếu front_side = "definition" thì bắt đầu với mặt sau
        if (settingRes?.data?.front_side === "definition" && isMounted) {
          setFrontLanguage("vietnamese");
        }
      } catch (err) {
        console.error("❌ Lỗi init:", err);
        if (isMounted) setError("Không thể tải dữ liệu luyện tập");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    initData();

    return () => {
      isMounted = false;
      // ⚠️ LƯU Ý: KHÔNG reset practiceIdRef.current ở đây
      // Nếu reset, React Strict Mode sẽ tạo session mới → vô ích
    };
  }, [courseId]);

  /**
   * UPDATE PROGRESS FUNCTION
   *
   * Mục đích: Đồng bộ tiến độ với backend (KHÔNG tạo session mới!)
   *
   * Gọi khi:
   * - Navigate next/prev
   * - Toggle memorized/star
   * - Thoát màn hình
   *
   * Tính toán:
   * - progressPercent = (currentSlideIndex + 1) / total * 100
   * - unmemorized_count = số thẻ chưa đánh dấu
   * - status = "completed" nếu đã xem hết, "in_progress" nếu chưa
   *
   * Ghi chú:
   * - Chỉ gọi nếu practiceIdRef.current tồn tại
   * - Sử dụng practiceIdRef.current (từ Ref, không phải state)
   * - Không tạo session mới!
   */
  const syncProgress = async (updatedCards = cards, index = currentSlideIndex, options = {}) => {
    // ⚠️ Guard: Nếu chưa có practiceId, bỏ qua (chưa tạo session)
    if (!practiceIdRef.current) {
      console.log("ℹ️ Bỏ qua sync: Chưa có practiceId");
      return;
    }

    const { finishSession = false } = options;

    // Tính toán progress
    const total = updatedCards.length;
    const currentUnmemorized = updatedCards.filter((c) => !c.user_state?.is_memorized).length;
    const progressPercent = total > 0 ? Math.round(((index + 1) / total) * 100) : 0;

    // Kiểm tra hoàn thành: nếu đã xem đến thẻ cuối (index >= total - 1) thì "completed"
    // Lưu ý: Không phụ thuộc vào memorized status, chỉ phụ thuộc xem hết hay chưa
    const isCompletedByViewed = total > 0 && index >= total - 1;
    const nowIso = new Date().toISOString();

    try {
      // Gọi API update progress (sử dụng practiceId từ Ref!)
      await updateCoursePracticeProgress(courseId, {
        practiceId: practiceIdRef.current, // ⚠️ Từ Ref, không phải state!
        progress: progressPercent,
        unmemorized_count: currentUnmemorized,
        status: isCompletedByViewed ? "completed" : "in_progress",
        finished_at: isCompletedByViewed || finishSession ? nowIso : null,
        is_finished: finishSession,
      });
      console.log("✅ Sync progress thành công:", {
        practiceId: practiceIdRef.current,
        progress: progressPercent,
        status: isCompletedByViewed ? "completed" : "in_progress",
      });
    } catch (e) {
      console.log("⚠️ Lỗi sync progress:", e);
    }
  };

  /**
   * HANDLE CLOSE: Thoát Focus Mode
   *
   * Mục đích: Đồng bộ tiến độ cuối cùng và tắt session trước khi thoát
   *
   * Quy trình:
   * 1. Gọi syncProgress với finishSession = true
   * 2. Set finished_at = now (đánh dấu session kết thúc)
   * 3. Gọi navigation.goBack() để quay về CourseDetail
   */
  const handleClose = async () => {
    await syncProgress(cards, currentSlideIndex, { finishSession: true });
    navigation.goBack();
  };

  /**
   * HANDLE FLIP CARD: Lật thẻ với animation 3D
   *
   * Animation:
   * - Sử dụng Animated.timing() để mượt mà
   * - Flip 0 → 1 (500ms) khi lật từ trước sang sau
   * - Transform: rotateY(perspective)
   *
   * Trạng thái:
   * - isFlipped: boolean để track
   * - flipAnim: animated value (0-1)
   */
  const handleFlipCard = () => {
    Animated.timing(flipAnim, {
      toValue: isFlipped ? 0 : 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
    setIsFlipped(!isFlipped);
  };

  /**
   * HANDLE NEXT: Chuyển sang thẻ tiếp theo
   *
   * Quy trình:
   * 1. Kiểm tra không phải thẻ cuối cùng
   * 2. Tăng currentSlideIndex
   * 3. Reset animation flip
   * 4. Sync progress
   */
  const handleNext = () => {
    if (currentSlideIndex < cards.length - 1) {
      const nextIndex = currentSlideIndex + 1;
      setCurrentSlideIndex(nextIndex);
      setIsFlipped(false);
      flipAnim.setValue(0);
      syncProgress(cards, nextIndex);
    }
  };

  /**
   * HANDLE PREV: Chuyển sang thẻ trước đó
   *
   * Quy trình:
   * 1. Kiểm tra không phải thẻ đầu tiên
   * 2. Giảm currentSlideIndex
   * 3. Reset animation flip
   * 4. Sync progress
   */
  const handlePrev = () => {
    if (currentSlideIndex > 0) {
      const nextIndex = currentSlideIndex - 1;
      setCurrentSlideIndex(nextIndex);
      setIsFlipped(false);
      flipAnim.setValue(0);
      syncProgress(cards, nextIndex);
    }
  };

  /**
   * TOGGLE STAR: Đánh dấu/bỏ đánh dấu yêu thích
   *
   * Mục đích: Cho phép người dùng đánh dấu các từ vựng yêu thích
   *
   * Quy trình:
   * 1. Lấy trạng thái hiện tại của thẻ
   * 2. Toggle is_star
   * 3. Gọi API updateVocabularyProgress
   * 4. Update state (newCards) để UI phản ứng
   * 5. Sync progress
   */
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

  /**
   * TOGGLE MEMORIZED: Đánh dấu "Đã ghi nhớ"
   *
   * Mục đích: Cho phép người dùng đánh dấu các từ đã ghi nhớ
   *
   * Quy trình:
   * 1. Lấy trạng thái hiện tại
   * 2. Toggle is_memorized
   * 3. Gọi API updateVocabularyProgress
   * 4. Update state để UI phản ứng
   * 5. Sync progress (cập nhật unmemorized_count)
   *
   * Ghi chú: Khi toggle, unmemorized_count sẽ thay đổi
   */
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

  /**
   * PLAY AUDIO: Phát âm thanh từ Google TTS
   *
   * Mục đích: Cho người dùng nghe phát âm của từ/định nghĩa
   *
   * Quy trình:
   * 1. Kiểm tra audioUrl có hợp lệ không
   * 2. Unload âm thanh cũ (nếu còn)
   * 3. Tạo Audio.Sound mới + load từ URL
   * 4. Phát âm thanh
   * 5. Lắng nghe sự kiện onPlaybackStatusUpdate (khi xong, clear playingAudio)
   *
   * Error Handling:
   * - Nếu không có audioUrl → Alert thông báo
   * - Nếu lỗi phát → Alert thông báo chi tiết lỗi
   */
  const playAudio = async (audioUrl, side = "front") => {
    if (!audioUrl) {
      Alert.alert("Thông báo", "Không có âm thanh cho mục này");
      return;
    }

    try {
      // Unload âm thanh cũ
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
      }

      // Tạo Sound object mới
      const sound = new Audio.Sound();
      soundRef.current = sound;
      await sound.loadAsync({ uri: audioUrl });
      await sound.playAsync();

      // Lắng nghe sự kiện: khi xong phát, clear playingAudio
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
   * Gọi khi: Người dùng click lại icon audio khi đang phát
   */
  const stopAudio = async () => {
    if (soundRef.current) {
      await soundRef.current.stopAsync();
      setPlayingAudio(null);
    }
  };

  // ========== ANIMATION INTERPOLATION ==========
  // Tính giá trị transform dựa trên flipAnim (0-1)
  const currentCard = cards[currentSlideIndex];
  const frontInterpolate = flipAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });
  const backInterpolate = flipAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["180deg", "360deg"],
  });

  // ========== LOADING STATE ==========
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
                {frontLanguage === "english" && currentCard?.term_image_url ? (
                  <Image source={{ uri: currentCard.term_image_url }} style={styles.cardImage} />
                ) : frontLanguage === "vietnamese" && currentCard?.def_image_url ? (
                  <Image source={{ uri: currentCard.def_image_url }} style={styles.cardImage} />
                ) : null}
                <Text style={styles.cardWord}>{frontLanguage === "english" ? currentCard?.term : currentCard?.definition}</Text>
                <TouchableOpacity
                  onPress={(e) => {
                    e.stopPropagation();
                    const text = frontLanguage === "english" ? currentCard?.term : currentCard?.definition;
                    const langCode = frontLanguage === "english" ? currentCard?.term_language_code || "en" : currentCard?.definition_language_code || "vi";
                    const audioUrl = generateGoogleTTSUrl(text, langCode);
                    const audioId = frontLanguage === "english" ? `term_${currentCard?._id}` : `def_${currentCard?._id}`;

                    if (playingAudio === audioId) {
                      stopAudio();
                    } else {
                      playAudio(audioUrl, "front");
                      setPlayingAudio(audioId);
                    }
                  }}
                  style={styles.audioButton}
                  activeOpacity={0.7}
                >
                  <Ionicons name={playingAudio === (frontLanguage === "english" ? `term_${currentCard?._id}` : `def_${currentCard?._id}`) ? "pause" : "volume-high"} size={20} color="#FFFFFF" />
                </TouchableOpacity>
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
                {frontLanguage === "english" && currentCard?.def_image_url ? (
                  <Image source={{ uri: currentCard.def_image_url }} style={styles.cardImage} />
                ) : frontLanguage === "vietnamese" && currentCard?.term_image_url ? (
                  <Image source={{ uri: currentCard.term_image_url }} style={styles.cardImage} />
                ) : null}
                <Text style={styles.cardWord}>{frontLanguage === "english" ? currentCard?.definition : currentCard?.term}</Text>
                <TouchableOpacity
                  onPress={(e) => {
                    e.stopPropagation();
                    const text = frontLanguage === "english" ? currentCard?.definition : currentCard?.term;
                    const langCode = frontLanguage === "english" ? currentCard?.definition_language_code || "vi" : currentCard?.term_language_code || "en";
                    const audioUrl = generateGoogleTTSUrl(text, langCode);
                    const audioId = frontLanguage === "english" ? `def_${currentCard?._id}` : `term_${currentCard?._id}`;

                    if (playingAudio === audioId) {
                      stopAudio();
                    } else {
                      playAudio(audioUrl, "back");
                      setPlayingAudio(audioId);
                    }
                  }}
                  style={styles.audioButton}
                  activeOpacity={0.7}
                >
                  <Ionicons name={playingAudio === (frontLanguage === "english" ? `def_${currentCard?._id}` : `term_${currentCard?._id}`) ? "pause" : "volume-high"} size={20} color="#FFFFFF" />
                </TouchableOpacity>
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
