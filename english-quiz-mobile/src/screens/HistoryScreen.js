import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Animated,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '../context/UserContext';
import { getConversations } from '../services/api';
import { COLORS, SHADOWS, getGradeInfo } from '../constants/config';

export default function HistoryScreen({ navigation }) {
  const { userId } = useUser();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all');
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fetchConversations();
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, []);

  const fetchConversations = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('[History] Fetching conversations for user:', userId);
      const response = await getConversations(userId);
      console.log('[History] Response:', JSON.stringify(response, null, 2).substring(0, 1000));
      
      // The API service now always returns { conversations: [...] }
      const convs = response.conversations || [];
      console.log('[History] Conversations count:', convs.length);
      
      setConversations(convs);
    } catch (err) {
      console.error('[History] Error:', err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchConversations();
    setRefreshing(false);
  };

  const filteredConversations = conversations.filter((conv) => {
    if (activeFilter === 'all') return true;
    return conv.mode === activeFilter;
  });

  const formatDate = (conv) => {
    // Try different date field names
    const dateString = conv.updated_at || conv.updatedAt || conv.created_at || conv.createdAt;
    
    if (!dateString) return 'Unknown date';
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Unknown date';
    
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString();
  };

  const getQuizStats = (conv) => {
    if (conv.mode !== 'quiz') return null;
    
    // Try different field names for quiz results
    const results = conv.quiz_results || conv.final_results || conv.results;
    
    if (!results) {
      console.log('[History] No quiz results found for:', conv._id || conv.id);
      return null;
    }
    
    return {
      score: results.total_score || results.totalScore || 0,
      maxScore: results.max_possible_score || results.maxPossibleScore || results.maxScore || 0,
      percentage: results.percentage || 0,
      grade: results.grade || 'N/A',
    };
  };

  const getTopicTitle = (conv) => {
    // Try different field names
    return conv.topic_title || conv.topicTitle || conv.topic_id || conv.topicId || 'Unknown Topic';
  };

  const getMessageCount = (conv) => {
    // Try different field names
    if (conv.messages && Array.isArray(conv.messages)) {
      return conv.messages.length;
    }
    if (conv.message_count !== undefined) {
      return conv.message_count;
    }
    if (conv.messageCount !== undefined) {
      return conv.messageCount;
    }
    return 0;
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer}>
        <Text style={styles.emptyEmoji}>
          {activeFilter === 'quiz' ? '📝' : activeFilter === 'chat' ? '💬' : '📚'}
        </Text>
      </View>
      <Text style={styles.emptyTitle}>No History Yet</Text>
      <Text style={styles.emptyText}>
        {activeFilter === 'quiz'
          ? 'Complete a quiz to see your results here'
          : activeFilter === 'chat'
          ? 'Start a chat session to see it here'
          : 'Your learning activity will appear here'}
      </Text>
      <TouchableOpacity
        style={styles.emptyButton}
        onPress={() => navigation.navigate(activeFilter === 'chat' ? 'Chat' : 'Quiz')}
        activeOpacity={0.9}
      >
        <Text style={styles.emptyButtonText}>
          {activeFilter === 'chat' ? 'Start Chatting' : 'Start a Quiz'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading your history...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>My Progress</Text>
          <Text style={styles.subtitle}>
            {conversations.length} {conversations.length === 1 ? 'session' : 'sessions'}
          </Text>
        </View>

        {/* Filter Tabs */}
        <View style={styles.filterContainer}>
          {['all', 'quiz', 'chat'].map((filter) => (
            <TouchableOpacity
              key={filter}
              style={[
                styles.filterTab,
                activeFilter === filter && styles.filterTabActive,
              ]}
              onPress={() => setActiveFilter(filter)}
              activeOpacity={0.8}
            >
              <Ionicons
                name={
                  filter === 'all'
                    ? 'grid'
                    : filter === 'quiz'
                    ? 'school'
                    : 'chatbubbles'
                }
                size={16}
                color={activeFilter === filter ? '#fff' : COLORS.textSecondary}
              />
              <Text
                style={[
                  styles.filterTabText,
                  activeFilter === filter && styles.filterTabTextActive,
                ]}
              >
                {filter.charAt(0).toUpperCase() + filter.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Error State */}
        {error && (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={24} color={COLORS.error} />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={fetchConversations}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Conversations List */}
        <ScrollView
          style={styles.listContainer}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={COLORS.primary}
            />
          }
        >
          {filteredConversations.length === 0 ? (
            renderEmptyState()
          ) : (
            filteredConversations.map((conv, index) => {
              const stats = getQuizStats(conv);
              const gradeInfo = stats ? getGradeInfo(stats.percentage) : null;
              
              return (
                <TouchableOpacity
                  key={conv._id || conv.id || index}
                  style={styles.conversationCard}
                  activeOpacity={0.8}
                >
                  {/* Mode Badge */}
                  <View style={styles.cardHeader}>
                    <View
                      style={[
                        styles.modeBadge,
                        conv.mode === 'quiz' ? styles.quizBadge : styles.chatBadge,
                      ]}
                    >
                      <Ionicons
                        name={conv.mode === 'quiz' ? 'school' : 'chatbubbles'}
                        size={14}
                        color="#fff"
                      />
                      <Text style={styles.modeBadgeText}>
                        {conv.mode === 'quiz' ? 'Quiz' : 'Chat'}
                      </Text>
                    </View>
                    <Text style={styles.dateText}>{formatDate(conv)}</Text>
                  </View>

                  {/* Topic */}
                  <Text style={styles.topicText}>{getTopicTitle(conv)}</Text>

                  {/* Quiz Stats */}
                  {stats && (
                    <View style={styles.statsContainer}>
                      <View style={styles.statItem}>
                        <View style={[styles.gradeCircle, { backgroundColor: gradeInfo?.color || COLORS.textMuted }]}>
                          <Text style={styles.gradeText}>{stats.grade}</Text>
                        </View>
                      </View>
                      <View style={styles.scoreContainer}>
                        <Text style={styles.scoreLabel}>Score</Text>
                        <Text style={styles.scoreValue}>
                          {stats.score}/{stats.maxScore}
                        </Text>
                      </View>
                      <View style={styles.percentContainer}>
                        <Text style={styles.percentLabel}>Percentage</Text>
                        <Text style={[styles.percentValue, { color: gradeInfo?.color }]}>
                          {stats.percentage}%
                        </Text>
                      </View>
                    </View>
                  )}

                  {/* Chat Preview */}
                  {conv.mode === 'chat' && (
                    <View style={styles.chatPreview}>
                      <Ionicons name="chatbubble-ellipses" size={16} color={COLORS.textMuted} />
                      <Text style={styles.chatPreviewText}>
                        {getMessageCount(conv)} messages
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: COLORS.textSecondary,
  },
  
  // Header
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text,
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  
  // Filter Tabs
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 10,
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: COLORS.card,
    gap: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterTabActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  filterTabTextActive: {
    color: '#fff',
  },
  
  // Error
  errorContainer: {
    alignItems: 'center',
    padding: 24,
    marginHorizontal: 20,
    backgroundColor: COLORS.card,
    borderRadius: 16,
  },
  errorText: {
    color: COLORS.textSecondary,
    marginVertical: 10,
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
  },
  retryText: {
    color: '#fff',
    fontWeight: '600',
  },
  
  // List
  listContainer: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  
  // Conversation Card
  conversationCard: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    ...SHADOWS.small,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 5,
  },
  quizBadge: {
    backgroundColor: COLORS.primary,
  },
  chatBadge: {
    backgroundColor: COLORS.secondary,
  },
  modeBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  dateText: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  topicText: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 14,
  },
  
  // Quiz Stats
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 14,
    padding: 14,
    gap: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  gradeCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gradeText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  scoreContainer: {
    flex: 1,
  },
  scoreLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: 2,
  },
  scoreValue: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  percentContainer: {
    alignItems: 'flex-end',
  },
  percentLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: 2,
  },
  percentValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  
  // Chat Preview
  chatPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 12,
  },
  chatPreviewText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  
  // Empty State
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: COLORS.card,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    ...SHADOWS.medium,
  },
  emptyEmoji: {
    fontSize: 36,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 40,
  },
  emptyButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 14,
    ...SHADOWS.small,
  },
  emptyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
