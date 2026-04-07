import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import YoutubePlayer from "react-native-youtube-iframe";
import { COLORS, SHADOWS } from "../constants/config";

const { width } = Dimensions.get("window");

export default function VideoScreen({ route, navigation }) {
  const { videoId, title } = route.params;
  const [playing, setPlaying] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, []);

  const onStateChange = useCallback((state) => {
    if (state === "ended") {
      setPlaying(false);
    }
  }, []);

  const togglePlaying = useCallback(() => {
    setPlaying((prev) => !prev);
  }, []);

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Back Button */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-back" size={20} color={COLORS.text} />
          <Text style={styles.backText}>BACK</Text>
        </TouchableOpacity>

        {/* Video Player */}
        <View style={styles.playerContainer}>
          <YoutubePlayer
            height={(width - 32) * (9 / 16)}
            width={width - 32}
            play={playing}
            videoId={videoId}
            onChangeState={onStateChange}
            webViewStyle={styles.webView}
          />
        </View>

        {/* Video Title */}
        <View style={styles.infoSection}>
          <Text style={styles.videoTitle}>{title}</Text>
        </View>

        {/* Controls */}
        <View style={styles.controlsRow}>
          <TouchableOpacity
            style={[
              styles.controlButton,
              playing && styles.controlButtonActive,
            ]}
            onPress={togglePlaying}
            activeOpacity={0.8}
          >
            <Ionicons
              name={playing ? "pause" : "play"}
              size={22}
              color={playing ? "#fff" : COLORS.primary}
            />
            <Text
              style={[
                styles.controlText,
                playing && styles.controlTextActive,
              ]}
            >
              {playing ? "Pause" : "Play"}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },

  // Back Button
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    alignSelf: "flex-start",
    paddingVertical: 6,
    paddingHorizontal: 2,
  },
  backText: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.text,
    marginLeft: 6,
    letterSpacing: 0.5,
  },

  // Player
  playerContainer: {
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#000",
    ...SHADOWS.medium,
    marginBottom: 20,
  },
  webView: {
    borderRadius: 16,
  },

  // Info
  infoSection: {
    marginBottom: 20,
  },
  videoTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.text,
    lineHeight: 28,
  },

  // Controls
  controlsRow: {
    flexDirection: "row",
    gap: 12,
  },
  controlButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.small,
  },
  controlButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  controlText: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.text,
    marginLeft: 8,
  },
  controlTextActive: {
    color: "#fff",
  },
});
