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
const homophoneGroupsRoutes = require("./routes/homophoneGroups");
const listeningPart2Routes = require("./routes/listeningPart2");
const listeningPart2HistoryRoutes = require("./routes/listeningPart2History");

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
    logger.http(
      `${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`,
    );
  });
  next();
});

// Rate limiting
app.use(generalLimiter);

// Routes
app.use("/health", healthRoutes);
app.use("/api/topics", topicsRoutes); // Public topics endpoint (no auth required)
app.use("/api/quiz", quizRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/conversations", conversationRoutes);
app.use("/api/learning", learningHistoryRoutes);
app.use("/api/homophone-groups", homophoneGroupsRoutes); // Homophone Groups listening practice
app.use("/api/listening-part2", listeningPart2Routes); // Listening Part 2 TOEIC practice
app.use("/api/listening-part2-history", listeningPart2HistoryRoutes); // Listening Part 2 History
app.use("/api/admin", adminRoutes); // Admin endpoints (API key required)

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

const startServer = async () => {
  try {
    await connectDatabase();
    logger.info("Connected to MongoDB");

    app.listen(config.port, () => {
      logger.info(
        `Server running on port ${config.port} in ${config.nodeEnv} mode`,
      );
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
