import React, { useState, useRef } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions, Animated, Modal } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../constants/config";
import { LESSON_DETAILS, LESSON_MENU_ITEMS } from "../constants/vocabularyData";

const { width } = Dimensions.get("window");

export default function CourseDetailScreen({ navigation, route }) {
  const { courseId } = route.params;
  const course = LESSON_DETAILS[courseId];

  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isMenuVisible, setIsMenuVisible] = useState(false);
  const flipAnim = useRef(new Animated.Value(0)).current;

  if (!course) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Course not found</Text>
      </View>
    );
  }

  const handleFlipCard = () => {
    Animated.timing(flipAnim, {
      toValue: isFlipped ? 0 : 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
    setIsFlipped(!isFlipped);
  };

  const currentSlide = course.slides[currentSlideIndex];
  const currentCard = course.flashcards[currentSlideIndex] || course.flashcards[0];

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

  const handleNextSlide = () => {
    if (currentSlideIndex < course.slides.length - 1) {
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
    console.log("Delete course:", courseId);
    setIsMenuVisible(false);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={28} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerIcons}>
            <TouchableOpacity activeOpacity={0.7}>
              <Ionicons name="bookmark-outline" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity 
              activeOpacity={0.7} 
              style={{ marginLeft: 16 }}
              onPress={() => setIsMenuVisible(true)}
            >
              <Ionicons name="ellipsis-vertical" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
          {/* Slide Area */}
          <View style={styles.slideContainer}>
            {/* Khung chứa 2 mặt thẻ */}
            <View style={styles.slideWrapper}>
              {/* Front Side (Mặt trước - Tiếng Anh) */}
              <Animated.View
                style={[
                  styles.slide,
                  {
                    transform: [{ perspective: 1000 }, { rotateY: frontInterpolate }],
                  },
                ]}
              >
                <TouchableOpacity onPress={handleFlipCard} activeOpacity={0.8} style={styles.slideTouchable}>
                  <View style={styles.slideContent}>
                    <Text style={styles.slideEmoji}>{course.image}</Text>
                    <Text style={styles.slideTopic}>{currentCard.english}</Text>
                  </View>
                  <TouchableOpacity onPress={(e) => e.stopPropagation()} style={styles.slideStarIcon}>
                    <Ionicons name="star-outline" size={24} color={COLORS.primary} />
                  </TouchableOpacity>
                </TouchableOpacity>
              </Animated.View>

              {/* Back Side (Mặt sau - Tiếng Việt) */}
              <Animated.View
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
                    <Text style={styles.slideEmoji}>{course.image}</Text>
                    <Text style={styles.slideTopic}>{currentCard.vietnamese}</Text>
                  </View>
                  <TouchableOpacity onPress={(e) => e.stopPropagation()} style={styles.slideStarIcon}>
                    <Ionicons name="star" size={24} color={COLORS.primary} />
                  </TouchableOpacity>
                </TouchableOpacity>
              </Animated.View>
            </View>

            {/* Navigation Buttons */}
            <View style={styles.slideNavigation}>
              <TouchableOpacity onPress={handlePrevSlide} disabled={currentSlideIndex === 0} activeOpacity={0.7} style={[styles.slideButton, currentSlideIndex === 0 && styles.slideButtonDisabled]}>
                <Ionicons name="chevron-back" size={24} color={currentSlideIndex === 0 ? COLORS.textMuted : COLORS.primary} />
              </TouchableOpacity>

              <View style={styles.dotsContainer}>
                {course.slides.map((_, index) => (
                  <View key={index} style={[styles.dot, index === currentSlideIndex && styles.activeDot]} />
                ))}
              </View>

              <TouchableOpacity
                onPress={handleNextSlide}
                disabled={currentSlideIndex === course.slides.length - 1}
                activeOpacity={0.7}
                style={[styles.slideButton, currentSlideIndex === course.slides.length - 1 && styles.slideButtonDisabled]}
              >
                <Ionicons name="chevron-forward" size={24} color={currentSlideIndex === course.slides.length - 1 ? COLORS.textMuted : COLORS.primary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Course Info */}
          <View style={styles.courseInfo}>
            <Text style={styles.courseTitle}>{course.title}</Text>
            <View style={styles.authorInfo}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarEmoji}>{course.avatar}</Text>
              </View>
              <View style={styles.authorDetails}>
                <Text style={styles.authorName}>{course.author}</Text>
                <Text style={styles.authorMeta}>{course.totalTerms} Thuật ngữ</Text>
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
              <TouchableOpacity key={item.id} style={styles.menuItem} activeOpacity={0.7}>
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
            {course.flashcards.map((card, index) => (
              <View key={card.id} style={[styles.flashcardListItem, index === currentSlideIndex && styles.activeFlashcardListItem]}>
                <View style={styles.cardListContent}>
                  <Text style={styles.cardListNumber}>{index + 1}</Text>
                  <View style={styles.cardListTexts}>
                    <Text style={styles.cardListEnglish}>{card.english}</Text>
                    <Text style={styles.cardListVietnamese}>{card.vietnamese}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>

        {/* Menu Modal */}
        <Modal
          visible={isMenuVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setIsMenuVisible(false)}
        >
          <TouchableOpacity 
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setIsMenuVisible(false)}
          >
            <TouchableOpacity 
              style={styles.modalContent}
              activeOpacity={1}
              onPress={(e) => e.stopPropagation()}
            >
              {/* Sửa */}
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

              {/* Tạo học phần mới */}
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

              {/* Xóa học phần */}
              <TouchableOpacity 
                style={[styles.modalItem, styles.modalItemDanger]}
                onPress={handleDeleteCourse}
                activeOpacity={0.7}
              >
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
  safeArea: {
    flex: 1,
    backgroundColor: "#0A0E27",
  },
  container: {
    flex: 1,
    backgroundColor: "#0A0E27",
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 40,
  },

  // Header
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
  headerIcons: {
    flexDirection: "row",
    alignItems: "center",
  },

  // Slide Area
  slideContainer: {
    paddingHorizontal: 16,
    paddingVertical: 24,
    backgroundColor: "#1E2235",
    marginBottom: 20,
  },
  slideWrapper: {
    height: 280,
    marginBottom: 16,
  },
  slide: {
    height: "100%",
    width: "100%",
    backgroundColor: "#2A2D3E",
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#374151",
    backfaceVisibility: "hidden",
  },
  slideBack: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  slideTouchable: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
  },
  slideContent: {
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
  },
  slideEmoji: {
    fontSize: 72,
    marginBottom: 16,
  },
  slideTopic: {
    fontSize: 28,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "center",
    paddingHorizontal: 20,
  },
  slideStarIcon: {
    position: "absolute",
    top: 16,
    right: 16,
    padding: 8,
  },

  // Navigation
  slideNavigation: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  slideButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#2A2D3E",
    justifyContent: "center",
    alignItems: "center",
  },
  slideButtonDisabled: {
    opacity: 0.5,
    backgroundColor: "#1E2235",
  },
  dotsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    flex: 1,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#6B7280",
  },
  activeDot: {
    backgroundColor: "#FFFFFF",
    width: 24,
  },

  // Course Info
  courseInfo: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  courseTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: 12,
  },
  authorInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#2A2D3E",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  avatarEmoji: {
    fontSize: 24,
  },
  authorDetails: {
    flex: 1,
  },
  authorName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  authorMeta: {
    fontSize: 13,
    color: "#9CA3AF",
    marginTop: 2,
  },

  // Focus Mode Button
  focusModeButton: {
    marginHorizontal: 16,
    marginBottom: 24,
    backgroundColor: "#5B7FFF",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  focusModeButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "white",
  },

  // Menu Items
  menuContainer: {
    gap: 10,
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1E2235",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#374151",
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "rgba(91, 127, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  menuItemText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FFFFFF",
    flex: 1,
  },

  // Flashcards List
  flashcardsListSection: {
    paddingHorizontal: 16,
    marginTop: 20,
  },
  flashcardsListTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: 12,
  },
  flashcardListItem: {
    backgroundColor: "#1E2235",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#374151",
    flexDirection: "row",
    alignItems: "center",
  },
  activeFlashcardListItem: {
    borderColor: "#5B7FFF",
    backgroundColor: "rgba(91, 127, 255, 0.1)",
  },
  cardListContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  cardListNumber: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
    marginRight: 12,
    width: 28,
    textAlign: "center",
  },
  cardListTexts: {
    flex: 1,
  },
  cardListEnglish: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: 3,
  },
  cardListVietnamese: {
    fontSize: 13,
    color: "#9CA3AF",
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
    paddingTop: 24,
    paddingBottom: 40,
  },
  modalItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    gap: 16,
  },
  modalItemText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  modalItemDanger: {
    borderTopWidth: 1,
    borderTopColor: "#374151",
    marginTop: 8,
    paddingTop: 24,
  },
  modalItemTextDanger: {
    color: "#EF4444",
  },
});
