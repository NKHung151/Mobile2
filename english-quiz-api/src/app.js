require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");

const { connectDatabase } = require("./config/database");
const config = require("./config");
const logger = require("./utils/logger");

// Routes
const quizRoutes = require("./routes/quiz");
const chatRoutes = require("./routes/chat");
const conversationRoutes = require("./routes/conversations");
const adminRoutes = require("./routes/admin");
const healthRoutes = require("./routes/health");
const topicsRoutes = require("./routes/topics");
const learningHistoryRoutes = require("./routes/learningHistory");
const transcriptionRoutes = require("./routes/transcription");
const authRoutes = require("./routes/auth");
const coursesRoutes = require("./routes/courses");
const vocabulariesRoutes = require("./routes/vocabularies");
const uploadRoutes = require("./routes/upload");
const progressRoutes = require("./routes/progress");
const settingsRoutes = require("./routes/settings");
const homophoneGroupsRoutes = require("./routes/homophoneGroups");
const videosRoutes = require("./routes/videos");
const Video = require("./models/Video");
const questionResponseRoutes = require("./routes/questionResponse");



// Middleware
const { errorHandler, notFoundHandler } = require("./middleware/errorHandler");
const { generalLimiter } = require("./middleware/rateLimiter");

const app = express();

// Security middleware
app.use(helmet());

// CORS configuration - allow all origins in development
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    // In development, allow all origins
    if (config.nodeEnv === "development") {
      return callback(null, true);
    }

    // In production, check against allowed origins
    const allowedOrigins = config.cors.origins;
    if (allowedOrigins === "*" || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    callback(new Error("Not allowed by CORS"));
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "x-api-key", "x-user-id", "Authorization"],
  credentials: true,
};

app.use(cors(corsOptions));

// Handle preflight requests
app.options("*", cors(corsOptions));

// Body parsing
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Static file serving
app.use("/uploads", express.static(require("path").join(__dirname, "../uploads")));

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    logger.http(`${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`);
  });
  next();
});

// Rate limiting
app.use(generalLimiter);
const practiceRoutes = require("./routes/practice");
app.use("/api/practice", practiceRoutes);

// Routes
app.use("/health", healthRoutes);
app.use("/api/topics", topicsRoutes); // Public topics endpoint (no auth required)
app.use("/api/quiz", quizRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/transcription", transcriptionRoutes); // Transcription practice endpoints
app.use("/api/conversations", conversationRoutes);
app.use("/api/learning", learningHistoryRoutes); // Learning history endpoints
app.use("/api/admin", adminRoutes); // Admin endpoints (API key required)
app.use("/api/auth", authRoutes); // Authentication endpoints
app.use("/api/courses", coursesRoutes); // Course CRUD endpoints
app.use("/api/videos", videosRoutes); // Video learning endpoints (public)
app.use("/api", vocabulariesRoutes); // Vocabulary CRUD endpoints by course
app.use("/api", uploadRoutes); // File upload endpoints
app.use("/api/progress", progressRoutes); // User learning progress endpoints
app.use("/api/settings", settingsRoutes); // User setting endpoints
app.use("/api/homophone-groups", homophoneGroupsRoutes); // Homophone groups learning endpoints
app.use("/api/question-response", questionResponseRoutes); // Question-Response practice endpoints



// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

const startServer = async () => {
  try {
    await connectDatabase();
    logger.info("Connected to MongoDB");

    // Tự động seed dữ liệu video mẫu nếu bảng Video rỗng
    try {
      const videoCount = await Video.countDocuments();
      if (videoCount === 0) {
        logger.info("No videos found in database. Seeding default videos...");
        const defaultVideos = [
          {
            videoId: "cfRnccxqoII",
            youtubeId: "cfRnccxqoII",
            title: "English Grammar Basics",
            category: "Grammar",
            description: "Learn fundamental English grammar rules and sentence structures to build a strong foundation for your English learning journey."
          },
          {
            videoId: "Uha9IrpZQhw",
            youtubeId: "Uha9IrpZQhw",
            title: "Grammar Practice Tips",
            category: "Grammar",
            description: "Improve your grammar with practical exercises and real-world examples that help you communicate more effectively."
          },
          {
            videoId: "b-_IquFj-CE",
            youtubeId: "b-_IquFj-CE",
            title: "Essential Vocabulary",
            category: "Vocabulary",
            description: "Build your English vocabulary effectively with proven memorization techniques and contextual learning methods."
          },
          {
            videoId: "OqdLrih2G9A",
            youtubeId: "OqdLrih2G9A",
            title: "Vocabulary Booster",
            category: "Vocabulary",
            description: "Expand your word bank with daily practice routines and spaced repetition strategies for long-term retention."
          },
          {
            videoId: "tjOEpwXzF_o",
            youtubeId: "tjOEpwXzF_o",
            title: "IELTS Preparation Guide",
            category: "Ielts/Toeic",
            description: "Prepare for IELTS exam with proven strategies covering all four skills: Listening, Reading, Writing, and Speaking."
          },
          {
            videoId: "UXnIa93cJ5Q",
            youtubeId: "UXnIa93cJ5Q",
            title: "TOEIC Listening Skills",
            category: "Ielts/Toeic",
            description: "Master TOEIC listening section techniques with tips on note-taking, prediction, and time management."
          }
        ];
        await Video.insertMany(defaultVideos);
        logger.info("Successfully seeded default videos.");
      }
    } catch (seedError) {
      logger.error("Failed to seed default videos:", seedError);
    }

    app.listen(config.port, () => {
      logger.info(`Server running on port ${config.port} in ${config.nodeEnv} mode`);
      logger.info("CORS enabled for all origins in development mode");
    });
  } catch (error) {
    logger.error("Failed to start server:", error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on("SIGTERM", () => {
  logger.info("SIGTERM received. Shutting down gracefully...");
  process.exit(0);
});

process.on("SIGINT", () => {
  logger.info("SIGINT received. Shutting down gracefully...");
  process.exit(0);
});

process.on("unhandledRejection", (reason) => {
  logger.error("Unhandled Rejection:", reason);
});

process.on("uncaughtException", (error) => {
  logger.error("Uncaught Exception:", error);
  process.exit(1);
});

startServer();

module.exports = app;
