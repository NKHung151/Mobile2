import React, { createContext, useContext, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  SafeAreaView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../constants/config";

/**
 * NotificationContext
 * Manages all notifications in the app
 */
const NotificationContext = createContext(null);

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotification must be used within NotificationProvider");
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);

  const showNotification = useCallback(
    (type, title, message, duration = 4000, action = null) => {
      const id = Date.now().toString();
      const notification = {
        id,
        type, // 'success', 'error', 'info', 'warning'
        title,
        message,
        action,
      };

      setNotifications((prev) => [...prev, notification]);

      if (duration > 0) {
        setTimeout(() => {
          setNotifications((prev) => prev.filter((n) => n.id !== id));
        }, duration);
      }

      return id;
    },
    [],
  );

  const hideNotification = useCallback((id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  return (
    <NotificationContext.Provider
      value={{ notifications, showNotification, hideNotification, clearAll }}
    >
      {children}
      <NotificationStack />
    </NotificationContext.Provider>
  );
};

/**
 * NotificationStack Component
 * Renders all active notifications
 */
function NotificationStack() {
  const { notifications, hideNotification } = useNotification();

  return (
    <SafeAreaView style={styles.container} pointerEvents="box-none">
      {notifications.map((notification) => (
        <Notification
          key={notification.id}
          notification={notification}
          onDismiss={() => hideNotification(notification.id)}
        />
      ))}
    </SafeAreaView>
  );
}

/**
 * Notification Component
 * Individual notification item
 */
function Notification({ notification, onDismiss }) {
  const slideAnim = React.useRef(new Animated.Value(-200)).current;

  React.useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 70,
      friction: 10,
    }).start();
  }, []);

  const getNotificationStyle = () => {
    const baseStyle = {
      backgroundColor: COLORS.card,
      borderLeftColor: COLORS.primary,
    };

    switch (notification.type) {
      case "success":
        return {
          ...baseStyle,
          borderLeftColor: COLORS.success,
        };
      case "error":
        return {
          ...baseStyle,
          borderLeftColor: COLORS.error,
        };
      case "warning":
        return {
          ...baseStyle,
          borderLeftColor: COLORS.warning,
        };
      case "info":
        return {
          ...baseStyle,
          borderLeftColor: COLORS.info,
        };
      default:
        return baseStyle;
    }
  };

  const getIcon = () => {
    switch (notification.type) {
      case "success":
        return { name: "checkmark-circle", color: COLORS.success };
      case "error":
        return { name: "close-circle", color: COLORS.error };
      case "warning":
        return { name: "warning", color: COLORS.warning };
      case "info":
        return { name: "information-circle", color: COLORS.info };
      default:
        return { name: "notifications", color: COLORS.primary };
    }
  };

  const { name, color } = getIcon();

  return (
    <Animated.View
      style={[
        styles.notificationWrapper,
        {
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <TouchableOpacity
        style={[styles.notification, getNotificationStyle()]}
        activeOpacity={0.8}
        onPress={onDismiss}
      >
        <View style={styles.iconContainer}>
          <Ionicons name={name} size={24} color={color} />
        </View>

        <View style={styles.content}>
          <Text style={styles.title}>{notification.title}</Text>
          {notification.message && (
            <Text style={styles.message}>{notification.message}</Text>
          )}
        </View>

        {notification.action && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => {
              notification.action.onPress();
              onDismiss();
            }}
          >
            <Text style={styles.actionText}>{notification.action.label}</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.closeButton} onPress={onDismiss}>
          <Ionicons name="close" size={20} color={COLORS.textSecondary} />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
}

/**
 * CompletionNotification Component
 * Specialized notification for session completion
 */
export function CompletionNotification({ session, onDismiss }) {
  const slideAnim = React.useRef(new Animated.Value(-300)).current;
  const scaleAnim = React.useRef(new Animated.Value(0.8)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 50,
        friction: 8,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 50,
        friction: 8,
      }),
    ]).start();
  }, []);

  const getGradeEmoji = (accuracy) => {
    if (accuracy >= 90) return "🏆";
    if (accuracy >= 80) return "⭐";
    if (accuracy >= 70) return "👍";
    if (accuracy >= 60) return "💪";
    return "📚";
  };

  const scoreColor =
    session.score_percentage >= 80 ? COLORS.success : COLORS.warning;

  return (
    <Animated.View
      style={[
        styles.completionWrapper,
        {
          transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
        },
      ]}
    >
      <TouchableOpacity
        style={[
          styles.completionNotification,
          { borderColor: scoreColor, borderWidth: 2 },
        ]}
        activeOpacity={0.95}
        onPress={onDismiss}
      >
        {/* Confetti emoji */}
        <View style={styles.confetti}>
          <Text style={styles.confettiEmoji}>✨</Text>
          <Text style={styles.confettiEmoji}>🎉</Text>
          <Text style={styles.confettiEmoji}>✨</Text>
        </View>

        {/* Main content */}
        <Text style={styles.completionTitle}>Session Complete!</Text>

        <View style={styles.scoreDisplay}>
          <Text style={styles.scoreEmoji}>
            {getGradeEmoji(session.accuracy_percentage)}
          </Text>
          <View>
            <Text style={[styles.scoreValue, { color: scoreColor }]}>
              {session.total_score}/{session.max_score}
            </Text>
            <Text style={styles.scoreLabel}>
              {Math.round(session.accuracy_percentage)}% Accuracy
            </Text>
          </View>
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Ionicons name="time" size={16} color={COLORS.primary} />
            <Text style={styles.statText}>{session.duration_minutes}m</Text>
          </View>
          <View style={styles.stat}>
            <Ionicons
              name="checkmark-circle"
              size={16}
              color={COLORS.success}
            />
            <Text style={styles.statText}>
              {session.questions_answered} questions
            </Text>
          </View>
        </View>

        {/* Topic and mode */}
        <View style={styles.metaInfo}>
          <Text style={styles.topicName}>{session.topic_title}</Text>
          <Text style={styles.modeLabel}>
            {session.mode === "quiz" ? "📝 Quiz" : "💬 Chat"}
          </Text>
        </View>

        {/* Motivational message */}
        <Text style={styles.motivationalText}>
          Great work! Keep learning to improve your skills.
        </Text>

        {/* Close button */}
        <TouchableOpacity style={styles.dismissButton} onPress={onDismiss}>
          <Ionicons name="checkmark-circle" size={24} color={COLORS.success} />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  notificationWrapper: {
    marginBottom: 8,
  },
  notification: {
    flexDirection: "row",
    alignItems: "center",
    borderLeftWidth: 4,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    minHeight: 60,
  },
  iconContainer: {
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 2,
  },
  message: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  actionText: {
    color: COLORS.primary,
    fontWeight: "600",
    fontSize: 12,
  },
  closeButton: {
    padding: 4,
    marginLeft: 8,
  },
  // Completion Notification Styles
  completionWrapper: {
    marginBottom: 16,
    alignItems: "center",
    paddingHorizontal: 32,
  },
  completionNotification: {
    width: "100%",
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  confetti: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 12,
  },
  confettiEmoji: {
    fontSize: 32,
    marginHorizontal: 8,
  },
  completionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: 16,
  },
  scoreDisplay: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    paddingVertical: 12,
  },
  scoreEmoji: {
    fontSize: 48,
    marginRight: 16,
  },
  scoreValue: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 4,
  },
  scoreLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
    marginBottom: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderTopColor: COLORS.border,
    borderBottomColor: COLORS.border,
  },
  stat: {
    flexDirection: "row",
    alignItems: "center",
  },
  statText: {
    marginLeft: 8,
    color: COLORS.text,
    fontWeight: "500",
  },
  metaInfo: {
    alignItems: "center",
    marginBottom: 12,
  },
  topicName: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 4,
  },
  modeLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  motivationalText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontStyle: "italic",
    marginBottom: 16,
  },
  dismissButton: {
    padding: 8,
  },
});
