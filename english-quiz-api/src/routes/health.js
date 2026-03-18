const express = require("express");
const router = express.Router();
const { checkConnection } = require("../config/database");
const genAI = require("../config/gemini");
const config = require("../config");
const logger = require("../utils/logger");

// GET /health - Basic health check
router.get("/", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
});

// GET /health/ready - Readiness check with DB
router.get("/ready", async (req, res) => {
  const dbStatus = checkConnection();

  if (!dbStatus) {
    return res.status(503).json({
      status: "not ready",
      database: "disconnected",
      timestamp: new Date().toISOString(),
    });
  }

  res.json({
    status: "ready",
    database: "connected",
    timestamp: new Date().toISOString(),
  });
});

// GET /health/gemini - Test Gemini API key and model
router.get("/gemini", async (req, res) => {
  try {
    logger.info("Testing Gemini API connection...");

    const apiKey = config.gemini.apiKey;
    const model = config.gemini.model;

    if (!apiKey) {
      return res.status(400).json({
        status: "error",
        error: "GEMINI_API_KEY not set in .env",
        timestamp: new Date().toISOString(),
      });
    }

    // Try to get the model instance
    const modelInstance = genAI.getGenerativeModel({
      model: model,
      apiVersion: "v1beta",
    });

    // Test with a simple prompt
    const testResult = await modelInstance.generateContent("Hello");
    const response = await testResult.response;
    const text = response.text();

    logger.info(`Gemini API test successful with model: ${model}`);

    res.json({
      status: "ok",
      gemini: {
        apiKey: apiKey.substring(0, 10) + "...",
        model: model,
        embeddingModel: config.gemini.embeddingModel,
        testResponse: text.substring(0, 50) + "...",
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("Gemini API test failed:", error);

    res.status(500).json({
      status: "error",
      error: error.message,
      details: {
        apiKey: config.gemini.apiKey
          ? config.gemini.apiKey.substring(0, 10) + "..."
          : "NOT SET",
        model: config.gemini.model,
        embeddingModel: config.gemini.embeddingModel,
      },
      timestamp: new Date().toISOString(),
    });
  }
});

// GET /health/gemini/models - List available Gemini models
router.get("/gemini/models", async (req, res) => {
  try {
    logger.info("Fetching available Gemini models...");

    if (!genAI || typeof genAI.listModels !== "function") {
      return res.status(400).json({
        status: "error",
        error: "genAI.listModels not available",
        timestamp: new Date().toISOString(),
      });
    }

    const response = await genAI.listModels();
    const availableModels = [];

    if (response && response.models) {
      for (const model of response.models) {
        const modelName = model.name.replace(/^models\//, "");
        const supportedMethods = model.supportedGenerationMethods || [];

        if (supportedMethods.includes("generateContent")) {
          availableModels.push({
            name: modelName,
            supported: true,
            methods: supportedMethods,
          });
        }
      }
    }

    res.json({
      status: "ok",
      totalModels: availableModels.length,
      availableModels: availableModels,
      currentModel: config.gemini.model,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("Failed to list models:", error);

    res.status(500).json({
      status: "error",
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

module.exports = router;
