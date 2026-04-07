import React, { useMemo, useState, useEffect, useCallback } from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { getCourses, updateCourseStar, getPracticeHistory } from "../services/api";

const LIBRARY_TABS = [
  { id: "lessons", label: "Học phần" },
  { id: "history", label: "Lịch sử học" },
  // { id: "folders", label: "Thư mục" },
  // { id: "recent", label: "Gần đây" },
];

export default function LibraryScreen({ navigation }) {
  const [activeTab, setActiveTab] = useState("lessons");
  const [searchText, setSearchText] = useState("");
  const [courses, setCourses] = useState([]);
  const [practiceHistory, setPracticeHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadData = useCallback(async (refresh = false) => {
    try {
      setError("");
      if (refresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      if (activeTab === "lessons") {
        const response = await getCourses();
        setCourses(response?.data || []);
      } else if (activeTab === "history") {
        const response = await getPracticeHistory();
        setPracticeHistory(response?.data || []);
      }
    } catch (err) {
      setError(err.message || "Không thể tải dữ liệu");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [activeTab]);

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      loadData();
    });

    return unsubscribe;
  }, [navigation, loadData]);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const filteredCourses = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();
    if (!keyword) return courses;

    return courses.filter((course) => {
      const title = course?.title?.toLowerCase() || "";
      const description = course?.description?.toLowerCase() || "";
      return title.includes(keyword) || description.includes(keyword);
    });
  }, [courses, searchText]);

  const filteredPractices = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();
    if (!keyword) return practiceHistory;

    return practiceHistory.filter((practice) => {
      const courseTitle = practice?.courseTitle?.toLowerCase() || "";
      return courseTitle.includes(keyword);
    });
  }, [practiceHistory, searchText]);

  const todayCourses = useMemo(() => {
    const now = new Date();
    return filteredCourses.filter((course) => {
      const createdAt = new Date(course.createdAt);
      const diffMs = now - createdAt;
      return diffMs <= 24 * 60 * 60 * 1000;
    });
  }, [filteredCourses]);

  const previousWeekCourses = useMemo(() => {
    const now = new Date();
    return filteredCourses.filter((course) => {
      const createdAt = new Date(course.createdAt);
      const diffMs = now - createdAt;
      return diffMs > 24 * 60 * 60 * 1000 && diffMs <= 7 * 24 * 60 * 60 * 1000;
    });
  }, [filteredCourses]);

  const olderCourses = useMemo(() => {
    const now = new Date();
    return filteredCourses.filter((course) => {
      const createdAt = new Date(course.createdAt);
      const diffMs = now - createdAt;
      return diffMs > 7 * 24 * 60 * 60 * 1000;
    });
  }, [filteredCourses]);

  const todayPractices = useMemo(() => {
    const now = new Date();
    return filteredPractices.filter((practice) => {
      const startedAt = new Date(practice.started_at);
      const diffMs = now - startedAt;
      return diffMs <= 24 * 60 * 60 * 1000;
    });
  }, [filteredPractices]);

  const previousWeekPractices = useMemo(() => {
    const now = new Date();
    return filteredPractices.filter((practice) => {
      const startedAt = new Date(practice.started_at);
      const diffMs = now - startedAt;
      return diffMs > 24 * 60 * 60 * 1000 && diffMs <= 7 * 24 * 60 * 60 * 1000;
    });
  }, [filteredPractices]);

  const olderPractices = useMemo(() => {
    const now = new Date();
    return filteredPractices.filter((practice) => {
      const startedAt = new Date(practice.started_at);
      const diffMs = now - startedAt;
      return diffMs > 7 * 24 * 60 * 60 * 1000;
    });
  }, [filteredPractices]);

  const renderLessonItem = (item) => (
    <TouchableOpacity key={item._id} style={styles.lessonItem} activeOpacity={0.7} onPress={() => navigation.navigate("CourseDetail", { courseId: item._id })}>
      <View style={styles.lessonIconContainer}>
        <Text style={styles.lessonIcon}>📚</Text>
      </View>
      <View style={styles.lessonContent}>
        <Text style={styles.lessonTitle}>{item.title}</Text>
        <Text style={styles.lessonMeta}>{item.is_public ? "Công khai" : "Riêng tư"}</Text>
        <Text style={styles.lessonInstructor}>{item.description || "Không có mô tả"}</Text>
      </View>
      <TouchableOpacity
        onPress={async (e) => {
          e.stopPropagation();
          const next = !Boolean(item?.course_user?.is_star);
          try {
            await updateCourseStar(item._id, next);
            setCourses((prev) =>
              prev.map((course) =>
                course._id === item._id
                  ? {
                      ...course,
                      course_user: {
                        ...(course.course_user || {}),
                        is_star: next,
                      },
                    }
                  : course,
              ),
            );
          } catch (err) {
            // Ignore quick-star errors in list.
          }
        }}
        hitSlop={{ top: 8, left: 8, right: 8, bottom: 8 }}
      >
        <Ionicons name={item?.course_user?.is_star ? "star" : "star-outline"} size={20} color={item?.course_user?.is_star ? "#FBBF24" : "#6B7280"} />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderPracticeItem = (item) => {
    const startDate = new Date(item.started_at);
    const finishDate = item.finished_at ? new Date(item.finished_at) : null;
    
    const formatTime = (date) => {
      const hours = date.getHours().toString().padStart(2, "0");
      const minutes = date.getMinutes().toString().padStart(2, "0");
      return `${hours}:${minutes}`;
    };

    const timeRange = finishDate ? `${formatTime(startDate)} - ${formatTime(finishDate)}` : `${formatTime(startDate)}`;

    return (
      <View key={item._id} style={styles.lessonItem}>
        <View style={styles.lessonIconContainer}>
          <Text style={styles.lessonIcon}>⏱️</Text>
        </View>
        <View style={styles.lessonContent}>
          <Text style={styles.lessonTitle}>{item.courseTitle}</Text>
          <Text style={styles.lessonMeta}>{item.status === "completed" ? "Hoàn thành" : "Đang làm"}</Text>
          <View style={styles.practiceMetaContainer}>
            <Text style={styles.lessonMeta}>{timeRange}</Text>
            <Text style={styles.lessonMeta}>•</Text>
            <Text style={styles.lessonMeta}>Tiến độ: {item.progress}%</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderSection = (title, sectionCourses) => {
    if (!sectionCourses.length) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {sectionCourses.map((item) => activeTab === "lessons" ? renderLessonItem(item) : renderPracticeItem(item))}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => loadData(true)} tintColor="#FFFFFF" />}
      >
        {/* Tabs with Plus Icon */}
        <View style={styles.tabsContainer}>
          {LIBRARY_TABS.map((tab) => (
            <TouchableOpacity key={tab.id} style={[styles.tab, activeTab === tab.id && styles.activeTab]} onPress={() => setActiveTab(tab.id)}>
              <Text style={[styles.tabText, activeTab === tab.id && styles.activeTabText]}>{tab.label}</Text>
            </TouchableOpacity>
          ))}
          {activeTab === "lessons" && (
            <TouchableOpacity style={styles.plusButton} activeOpacity={0.7} onPress={() => navigation.navigate("AddCourse")}>
              <Ionicons name="add" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          )}
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#9CA3AF" style={styles.searchIcon} />
          <TextInput style={styles.searchInput} placeholder="Tìm kiếm" placeholderTextColor="#6B7280" value={searchText} onChangeText={setSearchText} />
        </View>

        {/* Sort */}
        <View style={styles.sortContainer}>
          <Text style={styles.sortLabel}>Tất cả</Text>
          <TouchableOpacity activeOpacity={0.7} onPress={() => loadData(true)}>
            <Ionicons name="swap-vertical" size={18} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <View style={styles.emptyContainer}>
            <ActivityIndicator size="large" color="#FFFFFF" />
          </View>
        ) : null}

        {!isLoading && !!error ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>{error}</Text>
          </View>
        ) : null}

        {!isLoading && !error ? (
          <>
            {activeTab === "lessons" ? (
              <>
                {renderSection("Hôm nay", todayCourses)}
                {renderSection("Tuần trước", previousWeekCourses)}
                {renderSection("Cũ hơn", olderCourses)}

                {!filteredCourses.length ? (
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>Không có học phần nào</Text>
                  </View>
                ) : null}
              </>
            ) : (
              <>
                {renderSection("Hôm nay", todayPractices)}
                {renderSection("Tuần trước", previousWeekPractices)}
                {renderSection("Cũ hơn", olderPractices)}

                {!filteredPractices.length ? (
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>Không có lịch sử học nào</Text>
                  </View>
                ) : null}
              </>
            )}
          </>
        ) : null}
      </ScrollView>
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
    paddingHorizontal: 16,
    paddingVertical: 0,
  },

  // Tabs
  tabsContainer: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 20,
    alignItems: "center",
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#374151",
    backgroundColor: "#1E2235",
  },
  activeTab: {
    backgroundColor: "#5B7FFF",
    borderColor: "#5B7FFF",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#9CA3AF",
  },
  activeTabText: {
    color: "#FFFFFF",
  },
  plusButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#5B7FFF",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: "auto",
  },

  // Search
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1E2235",
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#374151",
    marginBottom: 16,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
    color: "#FFFFFF",
  },

  // Sort
  sortContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  sortLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#9CA3AF",
  },

  // Sections
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: 12,
  },

  // Lesson Item
  lessonItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1E2235",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#374151",
  },
  lessonIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: "rgba(255, 107, 107, 0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  lessonIcon: {
    fontSize: 20,
  },
  lessonContent: {
    flex: 1,
  },
  lessonTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: 3,
  },
  lessonMeta: {
    fontSize: 13,
    color: "#9CA3AF",
    marginBottom: 2,
  },
  lessonInstructor: {
    fontSize: 12,
    color: "#6B7280",
  },
  practiceMetaContainer: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 32,
  },
  emptyText: {
    color: "#9CA3AF",
    fontSize: 14,
    textAlign: "center",
  },
});
