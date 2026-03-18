import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useUser } from "../context/UserContext";
import { getTopics, sendChatMessage } from "../services/api";
import {
  initializeLearningSession,
  updateLearningProgress,
  completeLearningSessionLocally,
} from "../services/learningProgressTracker";
import { COLORS, SHADOWS } from "../constants/config";
import { useNotification } from "../components/NotificationCenter";

export default function ChatScreen({ navigation }) {
  const { userId } = useUser();
  const { showNotification } = useNotification();
  const scrollViewRef = useRef(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Setup state
  const [topics, setTopics] = useState([]);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [showTopicPicker, setShowTopicPicker] = useState(false);
  const [isSetup, setIsSetup] = useState(true);

  // Chat state
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);

  // Learning tracking state
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [sessionStartTime, setSessionStartTime] = useState(null);
  const [messageCount, setMessageCount] = useState(0);

  useEffect(() => {
    fetchTopics();
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, []);

  const fetchTopics = async () => {
    try {
      const response = await getTopics();
      setTopics(response.data || []);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleStartChat = async () => {
    if (!selectedTopic) {
      alert("Please select a topic");
      return;
    }

    try {
      // Initialize learning session tracking
      console.log(
        "[ChatScreen] Initializing learning session for:",
        selectedTopic.topic_id,
      );
      const sessionId = await initializeLearningSession(
        userId,
        selectedTopic.topic_id,
        selectedTopic.title,
        "chat",
      );
      setCurrentSessionId(sessionId);
      setSessionStartTime(new Date());
      setMessageCount(0);
      console.log("[ChatScreen] Learning session initialized:", sessionId);
    } catch (err) {
      console.error("[ChatScreen] Error initializing learning session:", err);
      alert("Failed to start chat session. Please try again.");
      return;
    }

    setIsSetup(false);
    setMessages([
      {
        id: "welcome",
        role: "assistant",
        content: `Hello! 👋 I'm your English tutor for "${selectedTopic.title}". Feel free to ask me anything about this topic!`,
      },
    ]);
  };

  const handleEndSession = async () => {
    if (!currentSessionId) {
      navigation.navigate("Home");
      return;
    }

    try {
      const durationMinutes = Math.round(
        (new Date() - sessionStartTime) / 1000 / 60,
      );

      // Complete session
      await completeLearningSessionLocally(
        userId,
        selectedTopic.topic_id,
        "chat",
        0, // Chat doesn't have scores
        0,
      );

      // Show completion notification
      showNotification(
        "success",
        "💬 Chat Session Ended",
        `Duration: ${durationMinutes}m • ${messageCount} messages exchanged`,
        3000,
      );

      // Reset and navigate
      setIsSetup(true);
      setMessages([]);
      setCurrentSessionId(null);
      setSessionStartTime(null);
      setMessageCount(0);

      setTimeout(() => {
        navigation.navigate("Home");
      }, 1500);
    } catch (err) {
      console.error("[ChatScreen] Error ending session:", err);
      showNotification("error", "Error", "Failed to end session", 3000);
    }
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || sending) return;

    const userMessage = {
      id: Date.now().toString(),
      role: "user",
      content: inputText.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText("");
    setSending(true);
    setError(null);
    setMessageCount((prev) => prev + 1); // Increment message count

    try {
      const response = await sendChatMessage(
        userId,
        selectedTopic.topic_id,
        userMessage.content,
      );

      const assistantMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: response.reply,
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setMessageCount((prev) => prev + 1); // Increment for assistant message

      // Update learning progress (track message count)
      if (currentSessionId) {
        const totalMessages = messageCount + 2; // +2 for user and assistant messages
        console.log("[ChatScreen] Updating progress: Messages:", totalMessages);
        await updateLearningProgress(
          userId,
          selectedTopic.topic_id,
          "chat",
          totalMessages,
          0, // No scoring for chat
          0,
          0,
        );
      }
    } catch (err) {
      console.error("[ChatScreen] Error sending message:", err);
      setError(err.message);
      const errorMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Sorry, I encountered an error. Please try again.",
        isError: true,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setSending(false);
    }
  };

  const handleEndChat = async () => {
    // Complete learning session
    if (currentSessionId && selectedTopic) {
      try {
        console.log(
          "[ChatScreen] Completing learning session:",
          currentSessionId,
        );
        await completeLearningSessionLocally(
          userId,
          selectedTopic.topic_id,
          "chat",
          0, // No score for chat
          0,
        );
      } catch (err) {
        console.error("[ChatScreen] Error completing session:", err);
      }
    }

    setIsSetup(true);
    setMessages([]);
    setSelectedTopic(null);
    setCurrentSessionId(null);
  };

  const getTopicColor = (index) => {
    const colors = [
      "rgba(255, 107, 107, 0.15)",
      "rgba(78, 205, 196, 0.15)",
      "rgba(255, 217, 61, 0.15)",
      "rgba(162, 155, 254, 0.15)",
      "rgba(255, 159, 67, 0.15)",
      "rgba(116, 185, 255, 0.15)",
    ];
    return colors[index % colors.length];
  };

  // Render Setup Screen
  if (isSetup) {
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.setupContent}
      >
        <Animated.View style={{ opacity: fadeAnim }}>
          {/* Header */}
          <View style={styles.setupHeader}>
            <View style={styles.setupIconContainer}>
              <Text style={styles.setupEmoji}>💬</Text>
            </View>
            <Text style={styles.setupTitle}>Chat with Tutor</Text>
            <Text style={styles.setupSubtitle}>
              Get answers to your questions
            </Text>
          </View>

          {/* Setup Card */}
          <View style={styles.setupCard}>
            <Text style={styles.label}>Select Topic</Text>
            <TouchableOpacity
              style={styles.pickerButton}
              onPress={() => setShowTopicPicker(true)}
              activeOpacity={0.8}
            >
              <View style={styles.pickerIconContainer}>
                <Ionicons name="book" size={18} color={COLORS.secondary} />
              </View>
              <Text
                style={[
                  styles.pickerText,
                  !selectedTopic && styles.placeholder,
                ]}
              >
                {selectedTopic ? selectedTopic.title : "Choose a topic"}
              </Text>
              <View style={styles.pickerChevron}>
                <Ionicons
                  name="chevron-down"
                  size={18}
                  color={COLORS.textMuted}
                />
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.startButton,
                !selectedTopic && styles.startButtonDisabled,
              ]}
              onPress={handleStartChat}
              disabled={!selectedTopic}
              activeOpacity={0.9}
            >
              <Text style={styles.startButtonText}>Start Chat</Text>
              <Ionicons name="chatbubbles" size={20} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Topic Picker Modal */}
          <Modal
            visible={showTopicPicker}
            animationType="slide"
            transparent={true}
            onRequestClose={() => setShowTopicPicker(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <View style={styles.modalHandle} />
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Select Topic</Text>
                  <TouchableOpacity
                    onPress={() => setShowTopicPicker(false)}
                    style={styles.modalClose}
                  >
                    <Ionicons
                      name="close"
                      size={22}
                      color={COLORS.textSecondary}
                    />
                  </TouchableOpacity>
                </View>
                <ScrollView
                  style={styles.topicList}
                  showsVerticalScrollIndicator={false}
                >
                  {topics.map((topic, index) => (
                    <TouchableOpacity
                      key={topic.topic_id}
                      style={[
                        styles.topicItem,
                        selectedTopic?.topic_id === topic.topic_id &&
                          styles.topicItemSelected,
                      ]}
                      onPress={() => {
                        setSelectedTopic(topic);
                        setShowTopicPicker(false);
                      }}
                      activeOpacity={0.8}
                    >
                      <View
                        style={[
                          styles.topicIcon,
                          { backgroundColor: getTopicColor(index) },
                        ]}
                      >
                        <Text style={styles.topicIconText}>
                          {topic.title.charAt(0)}
                        </Text>
                      </View>
                      <View style={styles.topicInfo}>
                        <Text style={styles.topicItemText}>{topic.title}</Text>
                      </View>
                      {selectedTopic?.topic_id === topic.topic_id && (
                        <View
                          style={[
                            styles.topicCheck,
                            { backgroundColor: COLORS.secondary },
                          ]}
                        >
                          <Ionicons name="checkmark" size={18} color="#fff" />
                        </View>
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>
          </Modal>
        </Animated.View>
      </ScrollView>
    );
  }

  // Render Chat Interface
  return (
    <KeyboardAvoidingView
      style={styles.chatContainer}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Chat Header */}
      <View style={styles.chatHeader}>
        <TouchableOpacity onPress={handleEndSession} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <View style={styles.chatHeaderInfo}>
          <Text style={styles.chatHeaderTitle}>{selectedTopic?.title}</Text>
          <Text style={styles.chatHeaderSubtitle}>AI Tutor</Text>
        </View>
        <TouchableOpacity
          style={[styles.endSessionButton]}
          onPress={handleEndSession}
        >
          <Text style={styles.endSessionText}>End</Text>
        </TouchableOpacity>
      </View>

      {/* Messages */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        onContentSizeChange={() =>
          scrollViewRef.current?.scrollToEnd({ animated: true })
        }
        showsVerticalScrollIndicator={false}
      >
        {messages.map((message) => (
          <View
            key={message.id}
            style={[
              styles.messageWrapper,
              message.role === "user"
                ? styles.userMessageWrapper
                : styles.assistantMessageWrapper,
            ]}
          >
            {message.role === "assistant" && (
              <View style={styles.avatarContainer}>
                <View style={styles.botAvatar}>
                  <Text style={styles.botAvatarText}>🎓</Text>
                </View>
              </View>
            )}
            <View
              style={[
                styles.messageBubble,
                message.role === "user"
                  ? styles.userBubble
                  : styles.assistantBubble,
                message.isError && styles.errorBubble,
              ]}
            >
              <Text
                style={[
                  styles.messageText,
                  message.role === "user"
                    ? styles.userMessageText
                    : styles.assistantMessageText,
                ]}
              >
                {message.content}
              </Text>
            </View>
          </View>
        ))}

        {sending && (
          <View style={styles.typingIndicator}>
            <View style={styles.avatarContainer}>
              <View style={styles.botAvatar}>
                <Text style={styles.botAvatarText}>🎓</Text>
              </View>
            </View>
            <View style={styles.typingBubble}>
              <View style={styles.typingDot} />
              <View style={[styles.typingDot, styles.typingDotMiddle]} />
              <View style={styles.typingDot} />
            </View>
          </View>
        )}
      </ScrollView>

      {/* Input Area */}
      <View style={styles.inputContainer}>
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.textInput}
            placeholder="Type your message..."
            placeholderTextColor={COLORS.textMuted}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!inputText.trim() || sending) && styles.sendButtonDisabled,
            ]}
            onPress={handleSendMessage}
            disabled={!inputText.trim() || sending}
            activeOpacity={0.8}
          >
            <Ionicons name="send" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  setupContent: {
    padding: 20,
    paddingBottom: 40,
  },
  chatContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  // Setup styles
  setupHeader: {
    alignItems: "center",
    marginBottom: 24,
  },
  setupIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: COLORS.card,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    ...SHADOWS.medium,
  },
  setupEmoji: {
    fontSize: 36,
  },
  setupTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 6,
  },
  setupSubtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  setupCard: {
    backgroundColor: COLORS.card,
    borderRadius: 24,
    padding: 24,
    ...SHADOWS.medium,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textSecondary,
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  pickerButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.background,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  pickerIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(78, 205, 196, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  pickerText: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text,
    fontWeight: "500",
  },
  placeholder: {
    color: COLORS.textMuted,
  },
  pickerChevron: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: COLORS.backgroundDark,
    justifyContent: "center",
    alignItems: "center",
  },
  startButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.secondary,
    borderRadius: 16,
    padding: 18,
    marginTop: 24,
    gap: 10,
    ...SHADOWS.small,
  },
  startButtonDisabled: {
    backgroundColor: COLORS.textMuted,
  },
  startButtonText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#fff",
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: "75%",
    paddingBottom: 20,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 12,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.text,
  },
  modalClose: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.background,
    justifyContent: "center",
    alignItems: "center",
  },
  topicList: {
    padding: 16,
  },
  topicItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 16,
    marginBottom: 10,
    backgroundColor: COLORS.background,
    borderWidth: 2,
    borderColor: "transparent",
  },
  topicItemSelected: {
    borderColor: COLORS.secondary,
    backgroundColor: "rgba(78, 205, 196, 0.05)",
  },
  topicIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  topicIconText: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text,
  },
  topicInfo: {
    flex: 1,
  },
  topicItemText: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
  },
  topicCheck: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },

  // Chat header
  chatHeader: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.card,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    ...SHADOWS.small,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.background,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  chatHeaderInfo: {
    flex: 1,
  },
  chatHeaderTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: COLORS.text,
  },
  chatHeaderSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  onlineIndicator: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(0, 184, 148, 0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  onlineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.success,
  },
  endSessionButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: COLORS.error,
    borderRadius: 8,
  },
  endSessionText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },

  // Messages
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 20,
  },
  messageWrapper: {
    flexDirection: "row",
    marginBottom: 16,
  },
  userMessageWrapper: {
    justifyContent: "flex-end",
  },
  assistantMessageWrapper: {
    justifyContent: "flex-start",
  },
  avatarContainer: {
    marginRight: 10,
  },
  botAvatar: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: COLORS.card,
    justifyContent: "center",
    alignItems: "center",
    ...SHADOWS.small,
  },
  botAvatarText: {
    fontSize: 18,
  },
  messageBubble: {
    maxWidth: "75%",
    borderRadius: 20,
    padding: 14,
    paddingHorizontal: 18,
  },
  userBubble: {
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: 6,
  },
  assistantBubble: {
    backgroundColor: COLORS.card,
    borderBottomLeftRadius: 6,
    ...SHADOWS.small,
  },
  errorBubble: {
    backgroundColor: "rgba(255, 107, 107, 0.1)",
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  userMessageText: {
    color: "#fff",
  },
  assistantMessageText: {
    color: COLORS.text,
  },

  // Typing indicator
  typingIndicator: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginBottom: 16,
  },
  typingBubble: {
    flexDirection: "row",
    backgroundColor: COLORS.card,
    borderRadius: 20,
    borderBottomLeftRadius: 6,
    padding: 14,
    paddingHorizontal: 18,
    gap: 4,
    ...SHADOWS.small,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.textMuted,
    opacity: 0.6,
  },
  typingDotMiddle: {
    opacity: 0.8,
  },

  // Input
  inputContainer: {
    backgroundColor: COLORS.card,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "flex-end",
    backgroundColor: COLORS.background,
    borderRadius: 24,
    paddingLeft: 18,
    paddingRight: 6,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text,
    maxHeight: 100,
    paddingVertical: 10,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.secondary,
    justifyContent: "center",
    alignItems: "center",
  },
  sendButtonDisabled: {
    backgroundColor: COLORS.textMuted,
  },
});
