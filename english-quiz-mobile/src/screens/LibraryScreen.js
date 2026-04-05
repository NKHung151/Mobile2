import React, { useMemo, useState, useEffect, useCallback } from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { getCourses } from "../services/api";

const LIBRARY_TABS = [
  { id: "lessons", label: "Học phần" },
  // { id: "folders", label: "Thư mục" },
  // { id: "recent", label: "Gần đây" },
];

export default function LibraryScreen({ navigation }) {
  const [activeTab, setActiveTab] = useState("lessons");
  const [searchText, setSearchText] = useState("");
  const [courses, setCourses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadCourses = useCallback(async (refresh = false) => {
    try {
      setError("");
      if (refresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      const response = await getCourses();
      setCourses(response?.data || []);
    } catch (err) {
      setError(err.message || "Không thể tải danh sách học phần");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      loadCourses();
    });

    return unsubscribe;
  }, [navigation, loadCourses]);

  const filteredCourses = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();
    if (!keyword) return courses;

    return courses.filter((course) => {
      const title = course?.title?.toLowerCase() || "";
      const description = course?.description?.toLowerCase() || "";
      return title.includes(keyword) || description.includes(keyword);
    });
  }, [courses, searchText]);

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
    </TouchableOpacity>
  );

  const renderSection = (title, sectionCourses) => {
    if (!sectionCourses.length) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {sectionCourses.map(renderLessonItem)}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => loadCourses(true)} tintColor="#FFFFFF" />}
      >
        {/* Tabs with Plus Icon */}
        <View style={styles.tabsContainer}>
          {LIBRARY_TABS.map((tab) => (
            <TouchableOpacity key={tab.id} style={[styles.tab, activeTab === tab.id && styles.activeTab]} onPress={() => setActiveTab(tab.id)}>
              <Text style={[styles.tabText, activeTab === tab.id && styles.activeTabText]}>{tab.label}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.plusButton} activeOpacity={0.7} onPress={() => navigation.navigate("AddCourse")}>
            <Ionicons name="add" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#9CA3AF" style={styles.searchIcon} />
          <TextInput style={styles.searchInput} placeholder="Tìm kiếm" placeholderTextColor="#6B7280" value={searchText} onChangeText={setSearchText} />
        </View>

        {/* Sort */}
        <View style={styles.sortContainer}>
          <Text style={styles.sortLabel}>Tất cả</Text>
          <TouchableOpacity activeOpacity={0.7} onPress={() => loadCourses(true)}>
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
            {renderSection("Hôm nay", todayCourses)}
            {renderSection("Tuần trước", previousWeekCourses)}
            {renderSection("Cũ hơn", olderCourses)}

            {!filteredCourses.length ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>Không có học phần nào</Text>
              </View>
            ) : null}
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
