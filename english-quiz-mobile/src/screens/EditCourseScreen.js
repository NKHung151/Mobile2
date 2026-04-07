import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import * as DocumentPicker from "expo-document-picker";
import { getCourseById, getCourseVocabularies, updateCourse, createVocabulary, updateVocabulary, deleteVocabulary, uploadFile } from "../services/api";
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

export default function EditCourseScreen({ navigation, route }) {
  const { courseId } = route.params;

  const [lessonTitle, setLessonTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [words, setWords] = useState([]);
  const [deletedVocabularyIds, setDeletedVocabularyIds] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);

        const [courseRes, vocabRes] = await Promise.all([getCourseById(courseId), getCourseVocabularies(courseId)]);

        const course = courseRes?.data;
        const vocabularies = vocabRes?.data || [];

        setLessonTitle(course?.title || "");
        setDescription(course?.description || "");
        setIsPublic(Boolean(course?.is_public));
        setWords(
          vocabularies.map((card) => ({
            id: card._id,
            term: card.term || "",
            definition: card.definition || "",
            term_image_url: card.term_image_url || "",
            def_image_url: card.def_image_url || "",
            term_language_code: card.term_language_code || "vi",
            definition_language_code: card.definition_language_code || "vi",
            isNew: false,
          })),
        );
      } catch (err) {
        Alert.alert("Error", err.message || "Can not load Flashcard Set data", [{ text: "OK", onPress: () => navigation.goBack() }]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [courseId, navigation]);

  const updateWord = (id, field, value) => {
    setWords((prev) => prev.map((word) => (word.id === id ? { ...word, [field]: value } : word)));
  };

  const handleLanguageChange = (id, field, newValue) => {
    const currentWord = words.find((w) => w.id === id);
    if (!currentWord) return;

    const currentValue = currentWord[field];
    if (currentValue === newValue) {
      updateWord(id, field, newValue);
      return;
    }

    const fieldLabel = field === "term_language_code" ? "Term" : "Definition";
    const targetLanguage = LANGUAGE_CODES.find((l) => l.value === newValue)?.label || newValue;

    Alert.alert("Change Language", `Do you want to change the language of all ${fieldLabel.toLowerCase()} to ${targetLanguage}?`, [
      { text: "No", onPress: () => {} },
      {
        text: "Yes",
        onPress: () => {
          setWords((prevWords) =>
            prevWords.map((word) => ({
              ...word,
              [field]: newValue,
            })),
          );
        },
      },
    ]);
  };

  const deleteWord = (id) => {
    if (words.length === 1) {
      Alert.alert("Error", "Must have at least one card");
      return;
    }

    const target = words.find((w) => w.id === id);
    if (target && !target.isNew) {
      setDeletedVocabularyIds((prev) => [...prev, id]);
    }

    setWords((prev) => prev.filter((word) => word.id !== id));
  };

  const addNewCard = () => {
    setWords((prev) => [
      ...prev,
      {
        id: `local-${Date.now()}`,
        term: "",
        definition: "",
        term_image_url: "",
        def_image_url: "",
        term_language_code: "vi",
        definition_language_code: "vi",
        isNew: true,
      },
    ]);
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

        if (uploadResponse.success && uploadResponse.data?.url) {
          const fullUrl = `${API_BASE_URL}/${uploadResponse.data.url}`;
          updateWord(wordId, field, fullUrl);
          Alert.alert("Success", "File uploaded successfully");
        } else {
          throw new Error("Failed to get image link from server");
        }
      }
    } catch (err) {
      Alert.alert("Error", err.message || "Failed to upload file");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async () => {
    if (!lessonTitle.trim()) {
      Alert.alert("Error", "Please enter a title for the flashcard set");
      return;
    }

    const hasEmptyCards = words.some((word) => !word.term.trim() || !word.definition.trim());
    if (hasEmptyCards) {
      Alert.alert("Error", "Please fill in all terms and definitions for the flashcards");
      return;
    }

    try {
      setIsSaving(true);

      await updateCourse(courseId, {
        title: lessonTitle.trim(),
        description: description.trim(),
        is_public: isPublic,
      });

      for (const vocabularyId of deletedVocabularyIds) {
        await deleteVocabulary(courseId, vocabularyId);
      }

      for (const word of words) {
        const payload = {
          term: word.term.trim(),
          definition: word.definition.trim(),
          term_image_url: word.term_image_url.trim(),
          def_image_url: word.def_image_url.trim(),
          term_language_code: word.term_language_code,
          definition_language_code: word.definition_language_code,
        };

        if (word.isNew) {
          await createVocabulary(courseId, payload);
        } else {
          await updateVocabulary(courseId, word.id, payload);
        }
      }

      Alert.alert("Success", "Changes saved successfully", [{ text: "OK", onPress: () => navigation.replace("CourseDetail", { courseId }) }]);
    } catch (err) {
      Alert.alert("Error", err.message || "Failed to save changes");
    } finally {
      setIsSaving(false);
    }
  };

  const handleImportExcel = () => {
    navigation.navigate("ImportExcel", { fromScreen: "EditCourse" });
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FFFFFF" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Edit Flashcard Set</Text>

        <View style={styles.headerRight}>
          <TouchableOpacity onPress={handleSave} style={styles.headerButton}>
            <Ionicons name="checkmark" size={28} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false} contentContainerStyle={styles.contentContainer}>
        <View style={styles.lessonCard}>
          <Text style={styles.lessonNumber}>Number of Cards: {words.length}</Text>
          <View style={styles.divider} />
          <TextInput style={styles.titleInput} placeholder="Title" placeholderTextColor="#6B7280" value={lessonTitle} onChangeText={setLessonTitle} />
          <View style={styles.divider} />
          <TextInput style={styles.titleInput} placeholder="Description" placeholderTextColor="#6B7280" value={description} onChangeText={setDescription} />

          <View style={styles.visibilityRow}>
            <Text style={styles.visibilityLabel}>Public</Text>
            <TouchableOpacity style={[styles.visibilityToggle, isPublic && styles.visibilityToggleActive]} onPress={() => setIsPublic((prev) => !prev)} activeOpacity={0.7}>
              <Text style={[styles.visibilityToggleText, isPublic && styles.visibilityToggleTextActive]}>{isPublic ? "On" : "Off"}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.importContainer}>
          <TouchableOpacity style={styles.importButton} activeOpacity={0.7} onPress={handleImportExcel}>
            <Text style={styles.importButtonText}>Import Excel</Text>
          </TouchableOpacity>
        </View>

        {words.map((word, index) => (
          <View key={word.id} style={styles.wordCard}>
            {words.length > 1 && (
              <TouchableOpacity style={styles.deleteButton} onPress={() => deleteWord(word.id)} activeOpacity={0.7}>
                <Ionicons name="close-circle" size={24} color="#EF4444" />
              </TouchableOpacity>
            )}

            <Text style={styles.wordCardTitle}>{word.term || `Card ${index + 1}`}</Text>
            <View style={styles.divider} />

            <Text style={styles.fieldLabel}>Term</Text>
            <TextInput style={styles.wordInput} placeholder="Enter term..." placeholderTextColor="#6B7280" value={word.term} onChangeText={(text) => updateWord(word.id, "term", text)} />

            <View style={styles.divider} />

            <Text style={styles.fieldLabel}>Upload Image for Term</Text>
            <TouchableOpacity style={styles.uploadButton} onPress={() => pickFile(word.id, "term_image_url", "image")} activeOpacity={0.7}>
              <Ionicons name="image" size={20} color="#5B7FFF" />
              <Text style={styles.uploadButtonText}>{word.term_image_url ? "Change Image" : "Select Image"}</Text>
            </TouchableOpacity>
            {word.term_image_url && (
              <Text style={styles.fileNameText} numberOfLines={1}>
                ✓ Image uploaded
              </Text>
            )}

            <View style={styles.divider} />

            <View style={styles.divider} />

            <Text style={styles.fieldLabel}>Definition</Text>
            <TextInput
              style={styles.wordInput}
              placeholder="Enter definition..."
              placeholderTextColor="#6B7280"
              value={word.definition}
              onChangeText={(text) => updateWord(word.id, "definition", text)}
              multiline
            />

            <View style={styles.divider} />

            <Text style={styles.fieldLabel}>Upload Image for Definition</Text>
            <TouchableOpacity style={styles.uploadButton} onPress={() => pickFile(word.id, "def_image_url", "image")} activeOpacity={0.7}>
              <Ionicons name="image" size={20} color="#5B7FFF" />
              <Text style={styles.uploadButtonText}>{word.def_image_url ? "Change Image" : "Select Image"}</Text>
            </TouchableOpacity>
            {word.def_image_url && (
              <Text style={styles.fileNameText} numberOfLines={1}>
                ✓ Image uploaded
              </Text>
            )}

            <View style={styles.divider} />

            <Text style={styles.fieldLabel}>Select Language for Term Audio</Text>
            <View style={styles.pickerContainer}>
              <Picker selectedValue={word.term_language_code} onValueChange={(value) => handleLanguageChange(word.id, "term_language_code", value)} style={styles.picker}>
                {LANGUAGE_CODES.map((lang) => (
                  <Picker.Item key={lang.value} label={lang.label} value={lang.value} />
                ))}
              </Picker>
            </View>

            <View style={styles.divider} />

            <Text style={styles.fieldLabel}>Select Language for Definition Audio</Text>
            <View style={styles.pickerContainer}>
              <Picker selectedValue={word.definition_language_code} onValueChange={(value) => handleLanguageChange(word.id, "definition_language_code", value)} style={styles.picker}>
                {LANGUAGE_CODES.map((lang) => (
                  <Picker.Item key={lang.value} label={lang.label} value={lang.value} />
                ))}
              </Picker>
            </View>
          </View>
        ))}

        <View style={{ height: 100 }} />
      </ScrollView>

      {isSaving ? (
        <View style={styles.savingOverlay}>
          <ActivityIndicator size="large" color="#FFFFFF" />
          <Text style={styles.savingText}>Saving changes...</Text>
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
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
  },
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
  wordCardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  fieldLabel: {
    fontSize: 14,
    color: "#9CA3AF",
    paddingVertical: 8,
  },
  wordInput: {
    fontSize: 15,
    color: "#FFFFFF",
    paddingVertical: 8,
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
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
