const genAI = require("../config/gemini");
const config = require("../config");
const logger = require("./logger");

/**
 * Cache for available models - populated on first use
 */
let availableModelsCache = null;
let cacheTimestamp = null;
const CACHE_TTL = 3600000; // 1 hour in milliseconds

/**
 * Dynamically fetch list of available Gemini models that support generateContent
 * Filters to only models that support text generation
 * @returns {Promise<string[]>} - Array of available model names
 */
async function getAvailableGenerativeModels() {
  try {
    // Return cached result if still valid
    if (
      availableModelsCache &&
      cacheTimestamp &&
      Date.now() - cacheTimestamp < CACHE_TTL
    ) {
      logger.info(
        `[AIHelper] Using cached available models (${availableModelsCache.length} models)`,
      );
      return availableModelsCache;
    }

    logger.info("[AIHelper] Fetching available Gemini models from API...");

    if (!genAI || typeof genAI.listModels !== "function") {
      logger.warn(
        "[AIHelper] genAI.listModels not available, using fallback models",
      );
      return getFallbackModels();
    }

    const response = await genAI.listModels();

    // Extract model names that support generateContent
    const models = [];
    if (response && response.models) {
      for (const model of response.models) {
        const modelName = model.name.replace(/^models\//, ""); // Remove 'models/' prefix if present
        const supportedMethods = model.supportedGenerationMethods || [];

        // Only include models that support generateContent
        if (supportedMethods.includes("generateContent")) {
          models.push(modelName);
        }
      }
    }

    if (models.length === 0) {
      logger.warn(
        "[AIHelper] No generative models found, using fallback models",
      );
      return getFallbackModels();
    }

    // Cache the result
    availableModelsCache = models;
    cacheTimestamp = Date.now();

    logger.info(
      `[AIHelper] Found ${models.length} available generative models: ${models.slice(0, 5).join(", ")}${models.length > 5 ? "..." : ""}`,
    );

    return models;
  } catch (error) {
    logger.error(
      `[AIHelper] Error fetching available models: ${error.message}`,
    );
    return getFallbackModels();
  }
}

/**
 * Fallback models to try if listModels fails
 */
function getFallbackModels() {
  return [
    "gemini-2.5-flash", // Latest fast model (what user had working)
    "gemini-2.5-pro", // Latest pro model
    "gemini-1.5-pro", // Standard pro model
    "gemini-1.5-flash", // Standard flash model
    "gemini-pro", // Legacy pro model
  ];
}

/**
 * Generate content using Gemini with automatic fallback to alternative models
 * Dynamically fetches available models from API to avoid 404 errors
 * @param {string} prompt - The prompt to generate content from
 * @returns {Promise<string>} - The generated text response
 */
async function generateWithFallbacks(prompt) {
  const tried = new Set();
  const base = config.gemini.model;
  const failedWith = new Map(); // Track error types

  // Get available models from API (or fallback list)
  let candidates = [];
  try {
    const candidates = [
      config.gemini.model,
      ...getFallbackModels(),
    ];

    // Prefer config model first if it's in available list
    if (base && availableModels.includes(base)) {
      candidates.push(base);
    }

    // Add all available models
    availableModels.forEach((m) => {
      if (!candidates.includes(m)) candidates.push(m);
    });
  } catch (err) {
    logger.warn(`[AIHelper] Error getting available models: ${err.message}`);
    // Fallback: try config model and fallback list
    if (base && !candidates.includes(base)) candidates.push(base);
    getFallbackModels().forEach((m) => {
      if (!candidates.includes(m)) candidates.push(m);
    });
  }

  logger.info(
    `[AIHelper] Will try ${candidates.length} models: ${candidates.slice(0, 3).join(", ")}...`,
  );

  for (const candidate of candidates) {
    if (!candidate || tried.has(candidate)) continue;
    tried.add(candidate);

    try {
      logger.info(`[AIHelper] Trying Gemini model: ${candidate}`);
      const modelInstance = genAI.getGenerativeModel({ model: candidate });
      const result = await modelInstance.generateContent(prompt);
      const response = await result.response;
      const text = response.text().trim();

      // Persist working model for subsequent calls
      if (config.gemini.model !== candidate) {
        logger.info(
          `[AIHelper] Switching Gemini model from ${config.gemini.model} to ${candidate}`,
        );
        config.gemini.model = candidate;
      }

      logger.info(
        `[AIHelper] Successfully generated content using model: ${candidate}`,
      );
      return text;
    } catch (err) {
      const errorMsg = err.message || err.toString();

      // Handle quota exceeded - skip this model and try next
      if (errorMsg.includes("429") || errorMsg.includes("quota")) {
        logger.warn(
          `[AIHelper] Model ${candidate} hit quota limit (429). Trying next candidate...`,
        );
        failedWith.set(candidate, "quota");
        continue; // Try next model instead of throwing
      }

      // Handle not found
      if (errorMsg.includes("404") || errorMsg.includes("not found")) {
        logger.warn(
          `[AIHelper] Model ${candidate} not found (404), trying next candidate`,
        );
        failedWith.set(candidate, "404");
        continue;
      }

      logger.warn(
        `[AIHelper] Model ${candidate} failed: ${errorMsg.substring(0, 150)}`,
      );
      failedWith.set(candidate, "error");
      continue;
    }
  }

  // All models failed. Check failure reasons
  const quotaFailures = [...failedWith.values()].filter(
    (e) => e === "quota",
  ).length;
  const allFailures = failedWith.size;

  if (quotaFailures > 0 && quotaFailures === allFailures) {
    // All models failed due to quota
    logger.error(
      `[AIHelper] All models hit quota limit: ${[...tried].join(", ")}. Please upgrade your Gemini API plan.`,
    );
    throw new Error(
      "API_QUOTA_EXCEEDED: All Gemini models hit quota limit. Please upgrade your plan or try again later.",
    );
  }

  throw new Error(
    `[AIHelper] All Gemini model candidates failed: ${[...tried].join(", ")}. Please check your API key and ensure your account has access to generative models.`,
  );
}

module.exports = {
  generateWithFallbacks,
};
