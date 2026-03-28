import React, { useState } from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

export default function AddCourseScreen({ navigation }) {
  const [lessonTitle, setLessonTitle] = useState("");
  const [words, setWords] = useState([
    {
      id: Date.now(),
      term: "",
      termDisplay: "",
      definition: "",
      definitionDisplay: "",
    },
  ]);

  const addNewCard = () => {
    const newCard = {
      id: Date.now(),
      term: "",
      termDisplay: "",
      definition: "",
      definitionDisplay: "",
    };
    setWords([...words, newCard]);
  };

  const updateWord = (id, field, value) => {
    setWords(
      words.map((word) => {
        if (word.id === id) {
          return { ...word, [field]: value };
        }
        return word;
      }),
    );
  };

  const deleteWord = (id) => {
    if (words.length === 1) {
      Alert.alert("Lỗi", "Phải có ít nhất một thẻ");
      return;
    }
    setWords(words.filter((word) => word.id !== id));
  };

  const handleSave = () => {
    // Validation
    if (!lessonTitle.trim()) {
      Alert.alert("Lỗi", "Vui lòng nhập tiêu đề học phần");
      return;
    }

    const hasEmptyCards = words.some((word) => !word.term.trim() || !word.definition.trim());
    if (hasEmptyCards) {
      Alert.alert("Lỗi", "Vui lòng điền đầy đủ thuật ngữ và định nghĩa cho tất cả các thẻ");
      return;
    }

    // TODO: Save to backend/storage
    Alert.alert("Thành công", "Đã lưu học phần", [{ text: "OK", onPress: () => navigation.goBack() }]);
  };

  const handleImportExcel = () => {
    navigation.navigate("ImportExcel");
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Tạo học phần</Text>

        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.headerButton}>
            <Ionicons name="settings-outline" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleSave} style={styles.headerButton}>
            <Ionicons name="checkmark" size={28} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false} contentContainerStyle={styles.contentContainer}>
        {/* Lesson Info Card */}
        <View style={styles.lessonCard}>
          <Text style={styles.lessonNumber}>Bài {words.length}</Text>
          <View style={styles.divider} />
          <TextInput style={styles.titleInput} placeholder="Tiêu đề" placeholderTextColor="#6B7280" value={lessonTitle} onChangeText={setLessonTitle} />
        </View>

        {/* Import Excel Button */}
        <View style={styles.importContainer}>
          <TouchableOpacity style={styles.importButton} activeOpacity={0.7} onPress={handleImportExcel}>
            <Text style={styles.importButtonText}>Import Excel</Text>
          </TouchableOpacity>
        </View>

        {/* Word Cards */}
        {words.map((word, index) => (
          <View key={word.id} style={styles.wordCard}>
            {/* Delete Button */}
            {words.length > 1 && (
              <TouchableOpacity style={styles.deleteButton} onPress={() => deleteWord(word.id)} activeOpacity={0.7}>
                <Ionicons name="close-circle" size={24} color="#EF4444" />
              </TouchableOpacity>
            )}

            {/* Term Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Nhập thuật ngữ</Text>
              <TextInput style={styles.wordInput} placeholder="Nhập thuật ngữ..." placeholderTextColor="#6B7280" value={word.term} onChangeText={(text) => updateWord(word.id, "term", text)} />
            </View>

            <View style={styles.divider} />

            {/* Definition Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Nhập định nghĩa</Text>
              <TextInput
                style={styles.wordInput}
                placeholder="Nhập định nghĩa..."
                placeholderTextColor="#6B7280"
                value={word.definition}
                onChangeText={(text) => updateWord(word.id, "definition", text)}
                multiline
              />
            </View>
          </View>
        ))}

        {/* Bottom padding for floating button */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Floating Add Button */}
      <TouchableOpacity style={styles.floatingButton} onPress={addNewCard} activeOpacity={0.8}>
        <Ionicons name="add" size={32} color="#FFFFFF" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A0E27",
  },

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#0A0E27",
  },
  headerButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  headerRight: {
    flexDirection: "row",
    gap: 8,
  },

  // Content
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
  },

  // Lesson Info Card
  lessonCard: {
    backgroundColor: "#1E2235",
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    marginBottom: 12,
  },
  lessonNumber: {
    fontSize: 14,
    color: "#9CA3AF",
    marginBottom: 8,
  },
  divider: {
    height: 1,
    backgroundColor: "#374151",
    marginVertical: 8,
  },
  titleInput: {
    fontSize: 16,
    color: "#FFFFFF",
    paddingVertical: 8,
  },

  // Import Button
  importContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  importButton: {
    backgroundColor: "#5B7FFF",
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  importButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },

  // Word Cards
  wordCard: {
    backgroundColor: "#1E2235",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    position: "relative",
  },
  deleteButton: {
    position: "absolute",
    top: 12,
    right: 12,
    zIndex: 10,
  },

  // Input Group
  inputGroup: {
    paddingVertical: 4,
  },
  inputLabel: {
    fontSize: 13,
    color: "#9CA3AF",
    marginBottom: 8,
  },
  wordInput: {
    fontSize: 15,
    color: "#FFFFFF",
    paddingVertical: 4,
  },

  // Display Group
  displayGroup: {
    paddingVertical: 8,
  },
  displayLabel: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 4,
  },
  displayValue: {
    fontSize: 15,
    color: "#D1D5DB",
    fontStyle: "italic",
  },

  // Floating Button
  floatingButton: {
    position: "absolute",
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#5B7FFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
  },
});
