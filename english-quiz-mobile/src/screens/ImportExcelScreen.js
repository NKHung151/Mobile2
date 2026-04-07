import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import XLSX from "xlsx";

export default function ImportExcelScreen({ navigation, route }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "application/vnd.ms-excel.sheet.macroEnabled.12"],
        copyToCacheDirectory: true,
      });

      if (result.type === "success" || !result.canceled) {
        const file = result.assets ? result.assets[0] : result;
        setSelectedFile(file);
        Alert.alert("Thành công", `Đã chọn file: ${file.name}`);
      }
    } catch (err) {
      console.error("Error picking document:", err);
      Alert.alert("Lỗi", "Không thể chọn file");
    }
  };

  const parseExcelFile = async (fileUri) => {
    try {
      const base64 = await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const workbook = XLSX.read(base64, { type: "base64" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const json = XLSX.utils.sheet_to_json(worksheet);

      if (!json || json.length === 0) {
        Alert.alert("Lỗi", "File Excel trống hoặc không có dữ liệu");
        return null;
      }

      const headers = Object.keys(json[0]);
      const termCol = headers.find((h) => h.toLowerCase().includes("term") || h.toLowerCase().includes("thuật"));
      const defCol = headers.find((h) => h.toLowerCase().includes("definition") || h.toLowerCase().includes("định"));

      if (!termCol || !defCol) {
        Alert.alert("Lỗi", "File cần có cột 'Thuật ngữ' (Term) và 'Định nghĩa' (Definition)");
        return null;
      }

      const importedWords = json.map((row, index) => ({
        term: (row[termCol] || "").toString().trim(),
        definition: (row[defCol] || "").toString().trim(),
        term_image_url: "",
        def_image_url: "",
        term_language_code: "vi",
        definition_language_code: "vi",
      }));

      const filteredWords = importedWords.filter((word) => word.term && word.definition);
      if (filteredWords.length === 0) {
        Alert.alert("Lỗi", "Không có dữ liệu hợp lệ để import");
        return null;
      }

      return filteredWords;
    } catch (err) {
      console.error("Error parsing Excel:", err);
      Alert.alert("Lỗi", "Không thể đọc file Excel: " + err.message);
      return null;
    }
  };

  const handleImport = async () => {
    if (!selectedFile) {
      Alert.alert("Lỗi", "Vui lòng chọn file Excel trước");
      return;
    }

    setIsProcessing(true);
    const importedWords = await parseExcelFile(selectedFile.uri);
    setIsProcessing(false);

    if (!importedWords) return;

    Alert.alert("Thành công", `Đã import ${importedWords.length} từ`, [
      {
        text: "OK",
        onPress: () => {
          navigation.navigate(route.params?.fromScreen || "AddCourse", { importedWords });
        },
      },
    ]);
  };

  const handleSave = () => {
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Import Excel</Text>

        <View style={styles.headerRight}>
          <TouchableOpacity onPress={handleSave} style={styles.headerButton}>
            <Ionicons name="close" size={28} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.title}>Import Excel</Text>

        {/* Upload Area */}
        <View style={styles.uploadArea}>
          <TouchableOpacity style={styles.uploadButton} onPress={pickDocument} activeOpacity={0.7} disabled={isProcessing}>
            <Ionicons name="cloud-upload-outline" size={32} color="#5B7FFF" />
            <Text style={styles.uploadButtonText}>Tải file lên</Text>
          </TouchableOpacity>
        </View>

        {/* Selected File Info */}
        {selectedFile && (
          <View style={styles.fileInfo}>
            <Ionicons name="document" size={20} color="#10B981" />
            <Text style={styles.fileName} numberOfLines={1}>
              {selectedFile.name}
            </Text>
          </View>
        )}

        {/* Import Button */}
        <TouchableOpacity style={[styles.importButton, !selectedFile && styles.importButtonDisabled]} onPress={handleImport} activeOpacity={0.7} disabled={!selectedFile || isProcessing}>
          {isProcessing ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.importButtonText}>Import</Text>
          )}
        </TouchableOpacity>

        {/* Instructions */}
        <View style={styles.instructions}>
          <Text style={styles.instructionTitle}>Hướng dẫn:</Text>
          <Text style={styles.instructionText}>
            • File Excel cần có 2 cột: Thuật ngữ (Term) và Định nghĩa (Definition){"\n"}• Hàng đầu tiên là tiêu đề cột{"\n"}• Định dạng file: .xlsx, .xls{"\n"}• Các hàng trống hoặc không đầy đủ sẽ bị bỏ qua
          </Text>
        </View>
      </View>
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
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 32,
  },

  // Upload Area
  uploadArea: {
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "#5B7FFF",
    borderRadius: 16,
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
    backgroundColor: "rgba(91, 127, 255, 0.05)",
  },
  uploadButton: {
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  uploadButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#5B7FFF",
  },

  // File Info
  fileInfo: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1E2235",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    gap: 12,
  },
  fileName: {
    fontSize: 14,
    color: "#FFFFFF",
    flex: 1,
  },

  // Import Button
  importButton: {
    backgroundColor: "#5B7FFF",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 32,
  },
  importButtonDisabled: {
    backgroundColor: "#374151",
    opacity: 0.5,
  },
  importButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  // Instructions
  instructions: {
    backgroundColor: "#1E2235",
    borderRadius: 12,
    padding: 16,
  },
  instructionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: 12,
  },
  instructionText: {
    fontSize: 14,
    color: "#9CA3AF",
    lineHeight: 22,
  },
});
