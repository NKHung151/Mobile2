module.exports = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || "development",

  mongodb: {
    uri: process.env.MONGODB_URI,
  },

  gemini: {
    apiKey: process.env.GEMINI_API_KEY,
    model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
    embeddingModel: process.env.EMBEDDING_MODEL || "gemini-embedding-001",
    maxTokens: parseInt(process.env.MAX_TOKENS_RESPONSE, 10) || 500,
  },

  openai: {
    // OpenAI settings removed (not used). Keep env vars in .env.example if needed.
  },

  admin: {
    apiKey: process.env.ADMIN_API_KEY,
  },

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 60000,
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100,
  },

  vectorSearch: {
    indexName: process.env.VECTOR_SEARCH_INDEX_NAME || "chunk_vector_index",
    numCandidates:
      parseInt(process.env.VECTOR_SEARCH_NUM_CANDIDATES, 10) || 100,
    limit: parseInt(process.env.VECTOR_SEARCH_LIMIT, 10) || 5,
  },

  quiz: {
    defaultQuestions: parseInt(process.env.DEFAULT_QUESTIONS_PER_QUIZ, 10) || 5,
    maxQuestions: parseInt(process.env.MAX_QUESTIONS_PER_QUIZ, 10) || 10,
    maxScorePerQuestion: parseInt(process.env.MAX_SCORE_PER_QUESTION, 10) || 5,
  },

  chat: {
    maxConversationHistory:
      parseInt(process.env.MAX_CONVERSATION_HISTORY, 10) || 10,
  },

  chunking: {
    chunkSize: parseInt(process.env.CHUNK_SIZE, 10) || 500,
    chunkOverlap: parseInt(process.env.CHUNK_OVERLAP, 10) || 50,
  },

  cors: {
    origins: process.env.CORS_ORIGINS
      ? process.env.CORS_ORIGINS.split(",")
      : "*",
  },

  logging: {
    level: process.env.LOG_LEVEL || "info",
  },
};
