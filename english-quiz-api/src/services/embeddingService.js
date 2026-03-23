const config = require("../config");
const logger = require("../utils/logger");
const genAI = require("../config/gemini");

const BATCH_SIZE = 100;

const BASE_URL = "https://generativelanguage.googleapis.com/v1";

async function listAvailableModels() {
  try {
    if (genAI && typeof genAI.listModels === "function") {
      const models = await genAI.listModels();
      return models;
    }
  } catch (err) {
    logger.warn("Failed to list Gemini models:", err.message || err);
  }
  return null;
}

async function generateEmbedding(text) {
  try {
    const url = `${BASE_URL}/models/${config.gemini.embeddingModel}:embedContent?key=${config.gemini.apiKey}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: `models/${config.gemini.embeddingModel}`,
        content: { parts: [{ text }] },
      }),
    });

    if (!response.ok) {
      logger.warn(
        `Embedding model ${config.gemini.embeddingModel} failed with ${response.status}. Will skip vector search.`,
      );
      return null; // Return null instead of throwing
    }

    const data = await response.json();
    return data.embedding.values;
  } catch (error) {
    logger.warn(`Embedding error: ${error.message}. Will skip vector search.`);
    return null; // Return null instead of throwing
  }
}

async function generateEmbeddingsBatch(texts) {
  const allEmbeddings = [];

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);

    try {
      const model = genAI.getGenerativeModel({ model: config.gemini.embeddingModel });

      // Generate embeddings for each text in the batch
      const embeddings = await Promise.all(
        batch.map(async (text) => {
          const result = await model.embedContent(text);
          return result.embedding.values;
        })
      );

      allEmbeddings.push(...embeddings);
      logger.debug(`Generated embeddings for batch ${Math.floor(i / BATCH_SIZE) + 1}`);
    } catch (error) {
      logger.error(`Error generating embeddings for batch starting at ${i}:`, error);
      throw error;
    }
  }

  return allEmbeddings;
}

module.exports = {
  generateEmbedding,
  generateEmbeddingsBatch,
};
