// english-quiz-mobile/src/services/practiceApi.js
import axios from "axios";
import { API_BASE_URL } from "../constants/config";

const api = axios.create({ baseURL: API_BASE_URL });

/**
 * Fetch topics with per-level unlock status
 */
export const getPracticeTopics = (userId) =>
  api.get(`/api/practice/topics/${userId}`);

/**
 * Start a new practice session
 */
export const startPractice = (userId, topicId, level) =>
  api.post("/api/practice/start", {
    user_id: userId,
    topic_id: topicId,
    level,
  });

/**
 * Submit answer for current question
 * answer can be: number (MC/error), string (fill), number[] (reorder)
 */
export const submitPracticeAnswer = (userId, sessionId, answer, timeSpentMs = 0) =>
  api.post("/api/practice/answer", {
    user_id: userId,
    session_id: sessionId,
    answer,
    time_spent_ms: timeSpentMs,
  });

/**
 * Get/resume session state
 */
export const getPracticeSession = (userId, sessionId) =>
  api.get(`/api/practice/session/${userId}/${sessionId}`);
