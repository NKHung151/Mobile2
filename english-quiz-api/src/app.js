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
// english-quiz-api/src/app.js  ── ADD these lines to your existing app.js ──

// 1. Import the router (add with your other route imports)
const practiceRoutes = require("./routes/practice");

// 2. Register it (add with your other app.use() calls)
app.use("/api/practice", practiceRoutes);

// ─── That's it. The 4 endpoints become available: ────────────────────────────
// GET  /api/practice/topics/:userId
// POST /api/practice/start
// POST /api/practice/answer
// GET  /api/practice/session/:userId/:sessionId
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

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

const startServer = async () => {
  try {
    await connectDatabase();
    logger.info("Connected to MongoDB");

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
