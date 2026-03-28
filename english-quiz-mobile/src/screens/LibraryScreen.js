import React, { useState } from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, FlatList } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, SHADOWS } from "../constants/config";
import { LIBRARY_LESSONS, LIBRARY_TABS } from "../constants/libraryData";

export default function LibraryScreen({ navigation }) {
  const [activeTab, setActiveTab] = useState("lessons");
  const [searchText, setSearchText] = useState("");

  const renderLessonItem = (item) => (
    <TouchableOpacity key={item.id} style={styles.lessonItem} activeOpacity={0.7} onPress={() => navigation.navigate("CourseDetail", { courseId: item.id })}>
      <View style={styles.lessonIconContainer}>
        <Text style={styles.lessonIcon}>{item.icon}</Text>
      </View>
      <View style={styles.lessonContent}>
        <Text style={styles.lessonTitle}>{item.title}</Text>
        <Text style={styles.lessonMeta}>
          {item.subject} - {item.duration}
        </Text>
        <Text style={styles.lessonInstructor}>{item.instructor}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
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
          <TouchableOpacity activeOpacity={0.7}>
            <Ionicons name="swap-vertical" size={18} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        {/* Today Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Hôm nay</Text>
          {LIBRARY_LESSONS.today.map(renderLessonItem)}
        </View>

        {/* Previous Week Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tuần trước</Text>
          {LIBRARY_LESSONS.previous_week.map(renderLessonItem)}
        </View>
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
});
