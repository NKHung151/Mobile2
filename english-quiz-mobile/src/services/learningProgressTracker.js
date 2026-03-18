/**
 * Learning Progress Tracker Utility
 * Helps integrate learning history tracking with quiz and chat sessions
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  startLearningSession,
  updateSessionProgress,
  completeLearningSession,
} from "./learningHistoryService";

const STORAGE_KEY_PREFIX = "@learningSession_";

/**
 * Initialize a new learning session
 */
export const initializeLearningSession = async (
  userId,
  topicId,
  topicTitle,
  mode,
) => {
  try {
    console.log("[LearningTracker] Initializing session:", {
      userId,
      topicId,
      topicTitle,
      mode,
    });

    const response = await startLearningSession(
      userId,
      topicId,
      topicTitle,
      mode,
    );
    const sessionId = response.session_id;

    // Store session locally
    await AsyncStorage.setItem(
      `${STORAGE_KEY_PREFIX}${topicId}_${mode}`,
      JSON.stringify({
        sessionId,
        userId,
        topicId,
        topicTitle,
        mode,
        startedAt: new Date().toISOString(),
        questionsAnswered: 0,
        correctAnswers: 0,
        totalScore: 0,
        maxScore: 0,
      }),
    );

    console.log("[LearningTracker] Session initialized:", sessionId);
    return sessionId;
  } catch (error) {
    console.error("[LearningTracker] Error initializing session:", error);
    throw error;
  }
};

/**
 * Update progress during a session
 */
export const updateLearningProgress = async (
  userId,
  topicId,
  mode,
  questionsAnswered,
  correctAnswers,
  totalScore,
  maxScore,
) => {
  try {
    // Get current session from storage
    const sessionData = await AsyncStorage.getItem(
      `${STORAGE_KEY_PREFIX}${topicId}_${mode}`,
    );

    if (!sessionData) {
      console.warn("[LearningTracker] No active session found");
      return null;
    }

    const session = JSON.parse(sessionData);
    const sessionId = session.sessionId;

    // Update local data
    const updatedSession = {
      ...session,
      questionsAnswered,
      correctAnswers,
      totalScore,
      maxScore,
    };

    await AsyncStorage.setItem(
      `${STORAGE_KEY_PREFIX}${topicId}_${mode}`,
      JSON.stringify(updatedSession),
    );

    // Sync with backend (non-blocking)
    updateSessionProgress(
      sessionId,
      userId,
      questionsAnswered,
      correctAnswers,
      totalScore,
      maxScore,
      "in_progress",
    ).catch((error) => {
      console.error("[LearningTracker] Error syncing progress:", error);
    });

    console.log("[LearningTracker] Progress updated");
    return sessionId;
  } catch (error) {
    console.error("[LearningTracker] Error updating progress:", error);
    throw error;
  }
};

/**
 * Complete a learning session
 */
export const completeLearningSessionLocally = async (
  userId,
  topicId,
  mode,
  finalScore,
  maxScore,
) => {
  try {
    // Get current session
    const sessionData = await AsyncStorage.getItem(
      `${STORAGE_KEY_PREFIX}${topicId}_${mode}`,
    );

    if (!sessionData) {
      console.warn("[LearningTracker] No active session found");
      return null;
    }

    const session = JSON.parse(sessionData);
    const sessionId = session.sessionId;

    // Mark as completed on backend
    const response = await completeLearningSession(sessionId, userId);

    // Clear local session
    await AsyncStorage.removeItem(`${STORAGE_KEY_PREFIX}${topicId}_${mode}`);

    console.log("[LearningTracker] Session completed:", sessionId);
    return response;
  } catch (error) {
    console.error("[LearningTracker] Error completing session:", error);
    throw error;
  }
};

/**
 * Get active session
 */
export const getActiveSession = async (topicId, mode) => {
  try {
    const sessionData = await AsyncStorage.getItem(
      `${STORAGE_KEY_PREFIX}${topicId}_${mode}`,
    );

    if (!sessionData) return null;

    return JSON.parse(sessionData);
  } catch (error) {
    console.error("[LearningTracker] Error getting active session:", error);
    return null;
  }
};

/**
 * Clear session
 */
export const clearSession = async (topicId, mode) => {
  try {
    await AsyncStorage.removeItem(`${STORAGE_KEY_PREFIX}${topicId}_${mode}`);
    console.log("[LearningTracker] Session cleared");
  } catch (error) {
    console.error("[LearningTracker] Error clearing session:", error);
  }
};

/**
 * Get all active sessions
 */
export const getAllActiveSessions = async () => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const sessionKeys = keys.filter((key) =>
      key.startsWith(STORAGE_KEY_PREFIX),
    );

    if (sessionKeys.length === 0) return [];

    const sessions = await AsyncStorage.multiGet(sessionKeys);
    return sessions
      .map(([_, data]) => {
        try {
          return JSON.parse(data);
        } catch {
          return null;
        }
      })
      .filter(Boolean);
  } catch (error) {
    console.error("[LearningTracker] Error getting all sessions:", error);
    return [];
  }
};

/**
 * Sync all pending sessions with backend
 */
export const syncAllSessions = async () => {
  try {
    const sessions = await getAllActiveSessions();

    if (sessions.length === 0) {
      console.log("[LearningTracker] No sessions to sync");
      return { synced: 0, failed: 0 };
    }

    let synced = 0;
    let failed = 0;

    for (const session of sessions) {
      try {
        await updateSessionProgress(
          session.sessionId,
          session.userId,
          session.questionsAnswered,
          session.correctAnswers,
          session.totalScore,
          session.maxScore,
          "in_progress",
        );
        synced++;
      } catch (error) {
        console.error(
          `[LearningTracker] Failed to sync session ${session.sessionId}:`,
          error,
        );
        failed++;
      }
    }

    console.log(
      `[LearningTracker] Sync completed: ${synced} synced, ${failed} failed`,
    );
    return { synced, failed };
  } catch (error) {
    console.error("[LearningTracker] Error syncing sessions:", error);
    throw error;
  }
};
