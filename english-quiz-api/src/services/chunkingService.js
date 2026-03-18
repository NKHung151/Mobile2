const Topic = require('../models/Topic');
const Chunk = require('../models/Chunk');
const { parseVTT } = require('./vttParser');
const { generateEmbeddingsBatch } = require('./embeddingService');
const config = require('../config');
const logger = require('../utils/logger');

function splitIntoChunks(text, chunkSize = config.chunking.chunkSize, overlap = config.chunking.chunkOverlap) {
  const words = text.split(/\s+/).filter(word => word.length > 0);
  const chunks = [];

  if (words.length === 0) return chunks;
  if (words.length <= chunkSize) return [words.join(' ')];

  let start = 0;
  while (start < words.length) {
    const end = Math.min(start + chunkSize, words.length);
    const chunk = words.slice(start, end).join(' ');
    chunks.push(chunk);
    start = end - overlap;
    if (start >= words.length - overlap) break;
  }

  return chunks;
}

async function processTopicFiles(topicId, title, files, metadata = {}) {
  logger.info(`Processing topic: ${topicId} with ${files.length} files`);

  const existingTopic = await Topic.findOne({ topic_id: topicId });
  if (existingTopic) {
    throw new Error(`Topic ${topicId} already exists`);
  }

  const allChunks = [];

  for (const file of files) {
    const text = parseVTT(file.content);
    
    if (!text || text.length === 0) {
      logger.warn(`No text extracted from file: ${file.filename}`);
      continue;
    }

    const textChunks = splitIntoChunks(text);

    for (let i = 0; i < textChunks.length; i++) {
      allChunks.push({
        topic_id: topicId,
        file_name: file.filename,
        chunk_index: i,
        content: textChunks[i]
      });
    }
  }

  if (allChunks.length === 0) {
    throw new Error('No content could be extracted from the provided files');
  }

  logger.info(`Created ${allChunks.length} chunks, generating embeddings...`);

  const contents = allChunks.map(chunk => chunk.content);
  const embeddings = await generateEmbeddingsBatch(contents);

  for (let i = 0; i < allChunks.length; i++) {
    allChunks[i].embedding = embeddings[i];
  }

  await Topic.create({
    topic_id: topicId,
    title,
    file_count: files.length,
    total_chunks: allChunks.length,
    metadata
  });

  const BATCH_SIZE = 100;
  for (let i = 0; i < allChunks.length; i += BATCH_SIZE) {
    const batch = allChunks.slice(i, i + BATCH_SIZE);
    await Chunk.insertMany(batch);
  }

  logger.info(`Successfully processed topic ${topicId} with ${allChunks.length} chunks`);

  return { topic_id: topicId, chunks_created: allChunks.length };
}

async function updateTopicFiles(topicId, title, files, metadata) {
  const existingTopic = await Topic.findOne({ topic_id: topicId });
  if (!existingTopic) {
    throw new Error(`Topic ${topicId} not found`);
  }

  await Chunk.deleteMany({ topic_id: topicId });
  await Topic.deleteOne({ topic_id: topicId });

  return processTopicFiles(
    topicId,
    title || existingTopic.title,
    files,
    metadata || existingTopic.metadata
  );
}

async function deleteTopic(topicId) {
  const topic = await Topic.findOne({ topic_id: topicId });
  if (!topic) {
    throw new Error(`Topic ${topicId} not found`);
  }

  await Chunk.deleteMany({ topic_id: topicId });
  await Topic.deleteOne({ topic_id: topicId });

  logger.info(`Deleted topic ${topicId}`);
  return { deleted: true, topic_id: topicId };
}

module.exports = {
  splitIntoChunks,
  processTopicFiles,
  updateTopicFiles,
  deleteTopic
};
