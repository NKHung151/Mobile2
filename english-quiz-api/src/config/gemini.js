const { GoogleGenerativeAI } = require("@google/generative-ai");
const config = require("./index");
const logger = require("../utils/logger");

if (!config.gemini.apiKey) {
  logger.error("ERROR: GEMINI_API_KEY not set in .env file!");
  throw new Error("GEMINI_API_KEY environment variable is required");
}

logger.info(
  `Initializing Gemini AI with API Key: ${config.gemini.apiKey.substring(0, 10)}...`,
);
logger.info(
  `Model: ${config.gemini.model}, Embedding: ${config.gemini.embeddingModel}`,
);

const genAI = new GoogleGenerativeAI(config.gemini.apiKey);

module.exports = genAI;
