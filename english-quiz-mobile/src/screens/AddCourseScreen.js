import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import * as DocumentPicker from "expo-document-picker";
import { createCourse, createVocabulary, uploadFile } from "../services/api";
import { API_BASE_URL } from "../constants/config";

const LANGUAGE_CODES = [
  { label: "English (en)", value: "en" },
  { label: "Vietnamese (vi)", value: "vi" },
  { label: "Spanish (es)", value: "es" },
  { label: "French (fr)", value: "fr" },
  { label: "German (de)", value: "de" },
  { label: "Chinese Simplified (zh-CN)", value: "zh-CN" },
  { label: "Japanese (ja)", value: "ja" },
  { label: "Korean (ko)", value: "ko" },
];

export default function AddCourseScreen({ navigation, route }) {
  const [lessonTitle, setLessonTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [words, setWords] = useState([
    {
      id: Date.now(),
      term: "",
      definition: "",
      term_image_url: "",
      def_image_url: "",
      term_language_code: "vi",
      definition_language_code: "vi",
    },
  ]);

  useEffect(() => {
    const importedWords = route?.params?.importedWords;
    if (Array.isArray(importedWords) && importedWords.length) {
      setWords(
        importedWords.map((item, index) => ({
          id: Date.now() + index,
          term: item.term || "",
          definition: item.definition || "",
          term_image_url: item.term_image_url || "",
          def_image_url: item.def_image_url || "",
          term_language_code: item.term_language_code || "vi",
          definition_language_code: item.definition_language_code || "vi",
        })),
      );
    }
  }, [route?.params?.importedWords]);

  const addNewCard = () => {
    const newCard = {
      id: Date.now(),
      term: "",
      definition: "",
      term_image_url: "",
      def_image_url: "",
      term_language_code: "vi",
      definition_language_code: "vi",
    };
    setWords([...words, newCard]);
  };

  // ĐÃ SỬA: Dùng functional update (prevWords) để tránh lỗi Stale State
  const updateWord = (id, field, value) => {
    setWords((prevWords) =>
      prevWords.map((word) => {
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

  const pickFile = async (wordId, field, fileType) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: fileType === "image" ? ["image/*"] : ["audio/*"],
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        setIsSaving(true);

        const uploadResponse = await uploadFile(file, fileType);
        console.log("Upload response:", uploadResponse);
        if (uploadResponse.success && uploadResponse.data?.url) {
          const fullUrl = `${API_BASE_URL}/${uploadResponse.data.url}`;
          updateWord(wordId, field, fullUrl);
          Alert.alert("Thành công", "Tệp đã tải lên thành công");
        } else {
          throw new Error("Không nhận được link ảnh từ server");
        }
      }
    } catch (err) {
      Alert.alert("Lỗi", err.message || "Không thể tải tệp lên");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async () => {
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

    try {
      setIsSaving(true);

      const createdCourseResponse = await createCourse({
        title: lessonTitle.trim(),
        description: description.trim(),
        is_public: isPublic,
      });

      const createdCourse = createdCourseResponse?.data;
      const courseId = createdCourse?._id;

      if (!courseId) {
        throw new Error("Không thể tạo học phần");
      }

      for (const word of words) {
        console.log(word);
        await createVocabulary(courseId, {
          term: word.term.trim(),
          definition: word.definition.trim(),
          term_image_url: (word.term_image_url || "").trim(),
          def_image_url: (word.def_image_url || "").trim(),
          term_language_code: word.term_language_code,
          definition_language_code: word.definition_language_code,
          is_started: false,
        });
      }

      Alert.alert("Thành công", "Đã lưu học phần", [
        {
          text: "OK",
          onPress: () => navigation.replace("CourseDetail", { courseId }),
        },
      ]);
    } catch (err) {
      Alert.alert("Lỗi", err.message || "Không thể lưu học phần");
    } finally {
      setIsSaving(false);
    }
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
          <Text style={styles.lessonNumber}>Số thẻ: {words.length}</Text>
          <View style={styles.divider} />
          <TextInput style={styles.titleInput} placeholder="Tiêu đề" placeholderTextColor="#6B7280" value={lessonTitle} onChangeText={setLessonTitle} />
          <View style={styles.divider} />
          <TextInput style={styles.titleInput} placeholder="Mô tả" placeholderTextColor="#6B7280" value={description} onChangeText={setDescription} />

          <View style={styles.visibilityRow}>
            <Text style={styles.visibilityLabel}>Công khai</Text>
            <TouchableOpacity style={[styles.visibilityToggle, isPublic && styles.visibilityToggleActive]} onPress={() => setIsPublic((prev) => !prev)} activeOpacity={0.7}>
              <Text style={[styles.visibilityToggleText, isPublic && styles.visibilityToggleTextActive]}>{isPublic ? "Bật" : "Tắt"}</Text>
            </TouchableOpacity>
          </View>
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

            {/* Term Section */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Nhập thuật ngữ</Text>
              <TextInput style={styles.wordInput} placeholder="Nhập thuật ngữ..." placeholderTextColor="#6B7280" value={word.term} onChangeText={(text) => updateWord(word.id, "term", text)} />
            </View>

            <View style={styles.divider} />

            {/* Term Image URL */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Tải ảnh cho thuật ngữ</Text>
              <TouchableOpacity style={styles.uploadButton} onPress={() => pickFile(word.id, "term_image_url", "image")} activeOpacity={0.7}>
                <Ionicons name="image" size={20} color="#5B7FFF" />
                <Text style={styles.uploadButtonText}>{word.term_image_url ? "Đổi ảnh" : "Chọn ảnh"}</Text>
              </TouchableOpacity>
              {word.term_image_url ? (
                <Text style={styles.fileNameText} numberOfLines={1}>
                  ✓ Ảnh đã tải lên
                </Text>
              ) : null}
            </View>

            <View style={styles.divider} />
            {/* Term Language Code Selector */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Chọn ngôn ngữ cho âm thanh thuật ngữ</Text>
              <View style={styles.pickerContainer}>
                <Picker selectedValue={word.term_language_code} onValueChange={(value) => updateWord(word.id, "term_language_code", value)} style={styles.picker}>
                  {LANGUAGE_CODES.map((lang) => (
                    <Picker.Item key={lang.value} label={lang.label} value={lang.value} />
                  ))}
                </Picker>
              </View>
            </View>

            <View style={styles.divider} />

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

            <View style={styles.divider} />

            {/* Definition Image URL */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Tải ảnh cho định nghĩa</Text>
              <TouchableOpacity style={styles.uploadButton} onPress={() => pickFile(word.id, "def_image_url", "image")} activeOpacity={0.7}>
                <Ionicons name="image" size={20} color="#5B7FFF" />
                <Text style={styles.uploadButtonText}>{word.def_image_url ? "Đổi ảnh" : "Chọn ảnh"}</Text>
              </TouchableOpacity>
              {word.def_image_url ? (
                <Text style={styles.fileNameText} numberOfLines={1}>
                  ✓ Ảnh đã tải lên
                </Text>
              ) : null}
            </View>

            <View style={styles.divider} />

            {/* Definition Language Code Selector */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Chọn ngôn ngữ cho âm thanh định nghĩa</Text>
              <View style={styles.pickerContainer}>
                <Picker selectedValue={word.definition_language_code} onValueChange={(value) => updateWord(word.id, "definition_language_code", value)} style={styles.picker}>
                  {LANGUAGE_CODES.map((lang) => (
                    <Picker.Item key={lang.value} label={lang.label} value={lang.value} />
                  ))}
                </Picker>
              </View>
            </View>
          </View>
        ))}

        {/* Bottom padding for floating button */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Floating Add Button */}
      {isSaving ? (
        <View style={styles.savingOverlay}>
          <ActivityIndicator size="large" color="#FFFFFF" />
          <Text style={styles.savingText}>Đang lưu học phần...</Text>
        </View>
      ) : null}

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
  visibilityRow: {
    marginTop: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  visibilityLabel: {
    color: "#9CA3AF",
    fontSize: 13,
    fontWeight: "600",
  },
  visibilityToggle: {
    borderWidth: 1,
    borderColor: "#374151",
    backgroundColor: "#0A0E27",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  visibilityToggleActive: {
    borderColor: "#5B7FFF",
    backgroundColor: "rgba(91, 127, 255, 0.2)",
  },
  visibilityToggleText: {
    color: "#9CA3AF",
    fontSize: 12,
    fontWeight: "700",
  },
  visibilityToggleTextActive: {
    color: "#FFFFFF",
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
  uploadButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#5B7FFF",
    backgroundColor: "rgba(91, 127, 255, 0.1)",
    gap: 8,
  },
  uploadButtonText: {
    fontSize: 14,
    color: "#5B7FFF",
    fontWeight: "600",
  },
  fileNameText: {
    fontSize: 12,
    color: "#10B981",
    marginTop: 6,
    fontStyle: "italic",
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: "#374151",
    borderRadius: 8,
    backgroundColor: "#1E2235",
    overflow: "hidden",
  },
  picker: {
    color: "#FFFFFF",
    backgroundColor: "#1E2235",
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
  savingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 20,
  },
  savingText: {
    marginTop: 12,
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
});
