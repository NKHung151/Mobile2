//const genAI = require("../config/gemini");
//const Topic = require("../models/Topic");
//const Chunk = require("../models/Chunk");
//const Conversation = require("../models/Conversation");
//const { generateEmbedding } = require("./embeddingService");
//const config = require("../config");
//const logger = require("../utils/logger");
//
//function buildSystemPrompt(topic, context) {
//  return `You are an English learning assistant for: "${topic.title}"
//
//CONTEXT (use ONLY this information):
//"""
//${context}
//"""
//
//RULES:
//1. ONLY answer questions using the context above
//2. If asked anything outside the context, respond:
//   "I can only help with questions about ${topic.title}. Please ask something related to this topic."
//3. Be helpful and use simple English for learners
//4. Give examples when explaining grammar
//5. Never make up information not in the context`;
//}
//
///**
// * Get chunks for a topic - tries vector search first, falls back to regular query
// */
//async function getTopicChunks(topicId, query) {
//  // First, check if any chunks exist for this topic
//  const chunkCount = await Chunk.countDocuments({ topic_id: topicId });
//  logger.info(`Found ${chunkCount} chunks for topic ${topicId}`);
//
//  if (chunkCount === 0) {
//    return [];
//  }
//
//  // Try vector search first
//  try {
//    const queryEmbedding = await generateEmbedding(query || "english lesson");
//
//    const results = await Chunk.aggregate([
//      {
//        $vectorSearch: {
//          index: config.vectorSearch.indexName,
//          path: "embedding",
//          queryVector: queryEmbedding,
//          numCandidates: config.vectorSearch.numCandidates,
//          limit: config.vectorSearch.limit,
//          filter: { topic_id: topicId },
//        },
//      },
//      {
//        $project: {
//          content: 1,
//          file_name: 1,
//          chunk_index: 1,
//          score: { $meta: "vectorSearchScore" },
//        },
//      },
//    ]);
//
//    if (results.length > 0) {
//      logger.info(
//        `Vector search returned ${results.length} chunks for topic ${topicId}`,
//      );
//      return results;
//    }
//  } catch (vectorError) {
//    logger.warn(
//      `Vector search failed for topic ${topicId}, falling back to regular query: ${vectorError.message}`,
//    );
//  }
//
//  // Fallback: Regular MongoDB query (get all chunks for this topic)
//  const fallbackResults = await Chunk.find({ topic_id: topicId })
//    .sort({ chunk_index: 1 })
//    .limit(config.vectorSearch.limit)
//    .select("content file_name chunk_index");
//
//  logger.info(
//    `Fallback query returned ${fallbackResults.length} chunks for topic ${topicId}`,
//  );
//  return fallbackResults;
//}
//
//async function getConversationHistory(userId, topicId) {
//  const conversation = await Conversation.findOne({
//    user_id: userId,
//    topic_id: topicId,
//    mode: "chat",
//  });
//  if (!conversation) return [];
//  return conversation.messages.slice(-config.chat.maxConversationHistory);
//}
//
//async function saveConversation(userId, topicId, userMessage, assistantReply) {
//  await Conversation.findOneAndUpdate(
//    { user_id: userId, topic_id: topicId, mode: "chat" },
//    {
//      $push: {
//        messages: {
//          $each: [
//            {
//              role: "user",
//              type: "chat",
//              content: userMessage,
//              timestamp: new Date(),
//            },
//            {
//              role: "assistant",
//              type: "chat",
//              content: assistantReply,
//              timestamp: new Date(),
//            },
//          ],
//        },
//      },
//      $set: { updated_at: new Date(), status: "in_progress" },
//    },
//    { upsert: true, new: true },
//  );
//}
//
//async function processChat(userId, topicId, message) {
//  const topic = await Topic.findOne({ topic_id: topicId });
//  if (!topic) {
//    throw new Error(
//      `Topic "${topicId}" not found. Please check the topic ID or create the topic first.`,
//    );
//  }
//
//  const relevantChunks = await getTopicChunks(topicId, message);
//
//  if (!relevantChunks || relevantChunks.length === 0) {
//    throw new Error(
//      `No content found for topic "${topicId}". Please upload VTT files for this topic.`,
//    );
//  }
//
//  const context = relevantChunks.map((c) => c.content).join("\n\n---\n\n");
//  logger.info(
//    `Context length for topic ${topicId}: ${context.length} characters`,
//  );
//
//  const history = await getConversationHistory(userId, topicId);
//
//  const systemPrompt = buildSystemPrompt(topic, context);
//
//  // Convert history to Gemini format
//  const conversationHistory = history.map((m) => ({
//    role: m.role === "user" ? "user" : "model",
//    parts: [{ text: m.content }],
//  }));
//
//  const model = genAI.getGenerativeModel({ model: config.gemini.model });
//
//  const chat = model.startChat({
//    history: conversationHistory,
//    systemInstruction: systemPrompt,
//  });
//
//  const result = await chat.sendMessage(message);
//  const reply = result.response.text();
//  await saveConversation(userId, topicId, message, reply);
//
//  const conversation = await Conversation.findOne({
//    user_id: userId,
//    topic_id: topicId,
//    mode: "chat",
//  });
//
//  return {
//    reply,
//    conversation_id: conversation._id.toString(),
//  };
//}
//
//async function processChatStream(
//  userId,
//  topicId,
//  message,
//  onChunk,
//  onComplete,
//) {
//  const topic = await Topic.findOne({ topic_id: topicId });
//  if (!topic) {
//    throw new Error(
//      `Topic "${topicId}" not found. Please check the topic ID or create the topic first.`,
//    );
//  }
//
//  const relevantChunks = await getTopicChunks(topicId, message);
//
//  if (!relevantChunks || relevantChunks.length === 0) {
//    throw new Error(
//      `No content found for topic "${topicId}". Please upload VTT files for this topic.`,
//    );
//  }
//
//  const context = relevantChunks.map((c) => c.content).join("\n\n---\n\n");
//  const history = await getConversationHistory(userId, topicId);
//
//  const systemPrompt = buildSystemPrompt(topic, context);
//
//  // Convert history to Gemini format
//  const conversationHistory = history.map((m) => ({
//    role: m.role === "user" ? "user" : "model",
//    parts: [{ text: m.content }],
//  }));
//
//  const model = genAI.getGenerativeModel({ model: config.gemini.model });
//
//  const chat = model.startChat({
//    history: conversationHistory,
//    systemInstruction: systemPrompt,
//  });
//
//  const stream = await chat.sendMessageStream(message);
//
//  let fullReply = "";
//
//  for await (const chunk of stream.stream) {
//    const content = chunk.text ? chunk.text() : "";
//    fullReply += content;
//    onChunk(content);
//  }
//
//  await saveConversation(userId, topicId, message, fullReply);
//  const conversation = await Conversation.findOne({
//    user_id: userId,
//    topic_id: topicId,
//    mode: "chat",
//  });
//
//  onComplete({
//    fullReply,
//    conversation_id: conversation._id.toString(),
//  });
//}
//
//module.exports = { processChat, processChatStream };



const genAI = require('../config/gemini');
const Topic = require('../models/Topic');
const Chunk = require('../models/Chunk');
const Conversation = require('../models/Conversation');
const { generateEmbedding } = require('./embeddingService');
const config = require('../config');
const logger = require('../utils/logger');

function buildSystemPrompt(topic, context) {
  return `You are an English learning assistant for: "${topic.title}"

CONTEXT (use ONLY this information):
"""
${context}
"""

RULES:
1. ONLY answer questions using the context above
2. If asked anything outside the context, respond:
   "I can only help with questions about ${topic.title}. Please ask something related to this topic."
3. Be helpful and use simple English for learners
4. Give examples when explaining grammar
5. Never make up information not in the context`;
}

/**
 * Get chunks for a topic - tries vector search first, falls back to regular query
 */
async function getTopicChunks(topicId, query) {
  // First, check if any chunks exist for this topic
  const chunkCount = await Chunk.countDocuments({ topic_id: topicId });
  logger.info(`Found ${chunkCount} chunks for topic ${topicId}`);

  if (chunkCount === 0) {
    return [];
  }

  // Try vector search first
  try {
    const queryEmbedding = await generateEmbedding(query || 'english lesson');

    const results = await Chunk.aggregate([
      {
        $vectorSearch: {
          index: config.vectorSearch.indexName,
          path: 'embedding',
          queryVector: queryEmbedding,
          numCandidates: config.vectorSearch.numCandidates,
          limit: config.vectorSearch.limit,
          filter: { topic_id: topicId }
        }
      },
      { $project: { content: 1, file_name: 1, chunk_index: 1, score: { $meta: 'vectorSearchScore' } } }
    ]);

    if (results.length > 0) {
      logger.info(`Vector search returned ${results.length} chunks for topic ${topicId}`);
      return results;
    }
  } catch (vectorError) {
    logger.warn(`Vector search failed for topic ${topicId}, falling back to regular query: ${vectorError.message}`);
  }

  // Fallback: Regular MongoDB query (get all chunks for this topic)
  const fallbackResults = await Chunk.find({ topic_id: topicId })
    .sort({ chunk_index: 1 })
    .limit(config.vectorSearch.limit)
    .select('content file_name chunk_index');

  logger.info(`Fallback query returned ${fallbackResults.length} chunks for topic ${topicId}`);
  return fallbackResults;
}

async function getConversationHistory(userId, topicId) {
  const conversation = await Conversation.findOne({ user_id: userId, topic_id: topicId, mode: 'chat' });
  if (!conversation) return [];
  return conversation.messages.slice(-config.chat.maxConversationHistory);
}

async function saveConversation(userId, topicId, userMessage, assistantReply) {
  await Conversation.findOneAndUpdate(
    { user_id: userId, topic_id: topicId, mode: 'chat' },
    {
      $push: {
        messages: {
          $each: [
            { role: 'user', type: 'chat', content: userMessage, timestamp: new Date() },
            { role: 'assistant', type: 'chat', content: assistantReply, timestamp: new Date() }
          ]
        }
      },
      $set: { updated_at: new Date(), status: 'in_progress' }
    },
    { upsert: true, new: true }
  );
}

async function processChat(userId, topicId, message) {
  const topic = await Topic.findOne({ topic_id: topicId });
  if (!topic) {
    throw new Error(`Topic "${topicId}" not found. Please check the topic ID or create the topic first.`);
  }

  const relevantChunks = await getTopicChunks(topicId, message);

  if (!relevantChunks || relevantChunks.length === 0) {
    throw new Error(`No content found for topic "${topicId}". Please upload VTT files for this topic.`);
  }

  const context = relevantChunks.map(c => c.content).join('\n\n---\n\n');
  logger.info(`Context length for topic ${topicId}: ${context.length} characters`);

  const history = await getConversationHistory(userId, topicId);

  // Build conversation for Gemini
  const systemPrompt = buildSystemPrompt(topic, context);
  let conversationText = systemPrompt + '\n\n';

  // Add history
  for (const msg of history) {
    conversationText += `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}\n\n`;
  }

  // Add current message
  conversationText += `User: ${message}\n\nAssistant:`;

  const model = genAI.getGenerativeModel({
    model: config.gemini.model,
    generationConfig: {
      maxOutputTokens: config.gemini.maxTokens,
      temperature: config.gemini.temperature,
    }
  });

  const result = await model.generateContent(conversationText);
  const reply = result.response.text();

  await saveConversation(userId, topicId, message, reply);

  const conversation = await Conversation.findOne({ user_id: userId, topic_id: topicId, mode: 'chat' });

  return {
    reply,
    conversation_id: conversation._id.toString()
  };
}

async function processChatStream(userId, topicId, message, onChunk, onComplete) {
  const topic = await Topic.findOne({ topic_id: topicId });
  if (!topic) {
    throw new Error(`Topic "${topicId}" not found. Please check the topic ID or create the topic first.`);
  }

  const relevantChunks = await getTopicChunks(topicId, message);

  if (!relevantChunks || relevantChunks.length === 0) {
    throw new Error(`No content found for topic "${topicId}". Please upload VTT files for this topic.`);
  }

  const context = relevantChunks.map(c => c.content).join('\n\n---\n\n');
  const history = await getConversationHistory(userId, topicId);

  // Build conversation for Gemini
  const systemPrompt = buildSystemPrompt(topic, context);
  let conversationText = systemPrompt + '\n\n';

  // Add history
  for (const msg of history) {
    conversationText += `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}\n\n`;
  }

  // Add current message
  conversationText += `User: ${message}\n\nAssistant:`;

  const model = genAI.getGenerativeModel({
    model: config.gemini.model,
    generationConfig: {
      maxOutputTokens: config.gemini.maxTokens,
      temperature: config.gemini.temperature,
    }
  });

  const result = await model.generateContentStream(conversationText);
  let fullReply = '';

  for await (const chunk of result.stream) {
    const chunkText = chunk.text();
    fullReply += chunkText;
    onChunk(chunkText);
  }

  await saveConversation(userId, topicId, message, fullReply);
  const conversation = await Conversation.findOne({ user_id: userId, topic_id: topicId, mode: 'chat' });

  onComplete({
    fullReply,
    conversation_id: conversation._id.toString()
  });
}

module.exports = { processChat, processChatStream };