// API Base URL - use your machine's IP address for mobile
// For emulator/mobile devices, use the machine's IP instead of localhost

// export const API_BASE_URL = "http://localhost:3000";
export const API_BASE_URL = "http://192.168.1.46:3000";


// App Configuration
export const APP_CONFIG = {
  defaultQuestionsCount: 5,
  maxQuestionsCount: 10,
  minQuestionsCount: 1,
};

// Parlo-Inspired Color Palette
export const COLORS = {
  // Primary colors - Warm and inviting
  primary: "#FF6B6B", // Warm coral
  primaryDark: "#EE5A5A",
  primaryLight: "#FF8E8E",
  secondary: "#4ECDC4", // Soft teal
  secondaryDark: "#3DBDB5",
  secondaryLight: "#7EDED7",

  // Accent colors
  accent: "#FFD93D", // Golden yellow for achievements
  accentOrange: "#FF9F43",
  purple: "#A29BFE",

  // Background colors - Clean and light
  background: "#F8F7F4", // Warm off-white
  backgroundLight: "#FFFFFF",
  backgroundDark: "#F0EFEC",
  card: "#FFFFFF",
  cardHover: "#FAFAF9",
  surface: "#F3F4F6", // Light gray for surfaces
  danger: "#FF6B6B", // Alias for error

  // Text colors
  text: "#2D3436", // Deep charcoal
  textSecondary: "#636E72",
  textMuted: "#B2BEC3",
  textLight: "#DFE6E9",

  // Score colors - More vibrant
  scorePerfect: "#00B894", // Emerald green
  scoreGreat: "#55EFC4", // Mint
  scoreGood: "#FDCB6E", // Honey
  scoreNeedsWork: "#FF9F43", // Orange
  scoreIncorrect: "#FF6B6B", // Coral

  // Chat bubble colors
  userBubble: "#FF6B6B",
  botBubble: "#F0EFEC",

  // Status colors
  success: "#00B894",
  error: "#FF6B6B",
  warning: "#FDCB6E",
  info: "#74B9FF",

  // Border and shadow
  border: "#E8E6E1",
  borderLight: "#F0EFEC",
  shadow: "rgba(45, 52, 54, 0.08)",
  shadowDark: "rgba(45, 52, 54, 0.15)",

  // Transparent
  overlay: "rgba(45, 52, 54, 0.5)",
  overlayLight: "rgba(45, 52, 54, 0.3)",

  // Gradient colors
  gradientStart: "#FF6B6B",
  gradientEnd: "#FF9F43",
};

// Grade Configuration with new colors
export const GRADES = {
  A: { min: 90, emoji: "🎉", label: "Excellent!", color: COLORS.scorePerfect },
  B: { min: 80, emoji: "⭐", label: "Great job!", color: COLORS.scoreGreat },
  C: { min: 70, emoji: "👍", label: "Good work!", color: COLORS.scoreGood },
  D: {
    min: 60,
    emoji: "💪",
    label: "Keep going!",
    color: COLORS.scoreNeedsWork,
  },
  F: {
    min: 0,
    emoji: "📚",
    label: "Keep practicing!",
    color: COLORS.scoreIncorrect,
  },
};

// Get score color based on score value (0-5)
export const getScoreColor = (score) => {
  if (score === 5) return COLORS.scorePerfect;
  if (score === 4) return COLORS.scoreGreat;
  if (score === 3) return COLORS.scoreGood;
  if (score >= 1) return COLORS.scoreNeedsWork;
  return COLORS.scoreIncorrect;
};

// Get grade info based on percentage
export const getGradeInfo = (percentage) => {
  if (percentage >= 90) return GRADES.A;
  if (percentage >= 80) return GRADES.B;
  if (percentage >= 70) return GRADES.C;
  if (percentage >= 60) return GRADES.D;
  return GRADES.F;
};

// Shadow styles for different elevations
export const SHADOWS = {
  small: {
    shadowColor: COLORS.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  medium: {
    shadowColor: COLORS.text,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  large: {
    shadowColor: COLORS.text,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
  },
};
