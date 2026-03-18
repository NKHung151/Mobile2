const Topic = require('../models/Topic');
const Chunk = require('../models/Chunk');
const { processTopicFiles, updateTopicFiles, deleteTopic } = require('../services/chunkingService');
const { parseVTT } = require('../services/vttParser');
const logger = require('../utils/logger');

/**
 * Process uploaded VTT files or JSON content
 */
function extractFilesFromRequest(req) {
  const files = [];

  // Option 1: Files uploaded via multipart/form-data
  if (req.files && req.files.length > 0) {
    for (const file of req.files) {
      files.push({
        filename: file.originalname,
        content: file.buffer.toString('utf-8')
      });
    }
    logger.info(`Extracted ${files.length} files from upload`);
  }
  
  // Option 2: Files provided in JSON body
  if (req.body.files && Array.isArray(req.body.files)) {
    for (const file of req.body.files) {
      if (file.filename && file.content) {
        files.push({
          filename: file.filename,
          content: file.content
        });
      }
    }
    logger.info(`Extracted ${files.length} files from JSON body`);
  }

  return files;
}

/**
 * Create topic - supports both file upload and JSON
 * POST /api/admin/topics
 */
async function createTopic(req, res, next) {
  try {
    const { topic_id, title, metadata } = req.body;
    
    // Parse metadata if it's a string (from form-data)
    let parsedMetadata = metadata;
    if (typeof metadata === 'string') {
      try {
        parsedMetadata = JSON.parse(metadata);
      } catch (e) {
        parsedMetadata = {};
      }
    }

    const files = extractFilesFromRequest(req);

    if (files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No files provided. Upload VTT files or provide files in JSON body.'
      });
    }

    logger.info(`Creating topic: ${topic_id} with ${files.length} files`);
    const result = await processTopicFiles(topic_id, title, files, parsedMetadata);
    
    res.status(201).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
}

/**
 * List topics with pagination
 * GET /api/admin/topics
 */
async function listTopics(req, res, next) {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const [topics, total] = await Promise.all([
      Topic.find().sort({ created_at: -1 }).skip(skip).limit(parseInt(limit)),
      Topic.countDocuments()
    ]);

    res.json({
      success: true,
      data: topics,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get single topic with chunk count
 * GET /api/admin/topics/:topic_id
 */
async function getTopic(req, res, next) {
  try {
    const { topic_id } = req.params;
    const topic = await Topic.findOne({ topic_id });

    if (!topic) {
      return res.status(404).json({ success: false, error: 'Topic not found' });
    }

    // Get actual chunk count from database
    const chunkCount = await Chunk.countDocuments({ topic_id });
    
    // Get sample chunks (first 3)
    const sampleChunks = await Chunk.find({ topic_id })
      .sort({ chunk_index: 1 })
      .limit(3)
      .select('file_name chunk_index content');

    res.json({ 
      success: true, 
      topic: {
        ...topic.toObject(),
        actual_chunk_count: chunkCount
      },
      sample_chunks: sampleChunks.map(c => ({
        file_name: c.file_name,
        chunk_index: c.chunk_index,
        content_preview: c.content.substring(0, 200) + (c.content.length > 200 ? '...' : '')
      }))
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Update topic - supports both file upload and JSON
 * PUT /api/admin/topics/:topic_id
 */
async function updateTopic(req, res, next) {
  try {
    const { topic_id } = req.params;
    const { title, metadata } = req.body;

    // Parse metadata if it's a string (from form-data)
    let parsedMetadata = metadata;
    if (typeof metadata === 'string') {
      try {
        parsedMetadata = JSON.parse(metadata);
      } catch (e) {
        parsedMetadata = undefined;
      }
    }

    const files = extractFilesFromRequest(req);

    if (files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No files provided. Upload VTT files or provide files in JSON body.'
      });
    }

    logger.info(`Updating topic: ${topic_id} with ${files.length} files`);
    const result = await updateTopicFiles(topic_id, title, files, parsedMetadata);
    
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
}

/**
 * Delete topic
 * DELETE /api/admin/topics/:topic_id
 */
async function deleteTopicHandler(req, res, next) {
  try {
    const { topic_id } = req.params;
    logger.info(`Deleting topic: ${topic_id}`);
    const result = await deleteTopic(topic_id);
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
}

/**
 * Bulk upload topics (JSON only)
 * POST /api/admin/topics/bulk
 */
async function bulkUpload(req, res, next) {
  try {
    const { topics } = req.body;
    const results = [];

    for (const topic of topics) {
      try {
        const result = await processTopicFiles(topic.topic_id, topic.title, topic.files, topic.metadata);
        results.push({ topic_id: topic.topic_id, success: true, ...result });
      } catch (error) {
        results.push({ topic_id: topic.topic_id, success: false, error: error.message });
      }
    }

    const successful = results.filter(r => r.success).length;
    res.json({
      success: true,
      summary: { total: topics.length, successful, failed: topics.length - successful },
      results
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Debug endpoint - Get topic debug info
 * GET /api/admin/topics/:topic_id/debug
 */
async function debugTopic(req, res, next) {
  try {
    const { topic_id } = req.params;
    
    const topic = await Topic.findOne({ topic_id });
    const chunkCount = await Chunk.countDocuments({ topic_id });
    const chunks = await Chunk.find({ topic_id })
      .sort({ chunk_index: 1 })
      .select('file_name chunk_index content embedding');

    const hasEmbeddings = chunks.every(c => c.embedding && c.embedding.length > 0);
    const embeddingDimensions = chunks[0]?.embedding?.length || 0;

    res.json({
      success: true,
      debug: {
        topic_exists: !!topic,
        topic_id: topic_id,
        topic_title: topic?.title || 'N/A',
        chunk_count: chunkCount,
        has_embeddings: hasEmbeddings,
        embedding_dimensions: embeddingDimensions,
        chunks: chunks.map(c => ({
          file_name: c.file_name,
          chunk_index: c.chunk_index,
          content_length: c.content?.length || 0,
          content_preview: c.content?.substring(0, 100) || '',
          has_embedding: !!(c.embedding && c.embedding.length > 0),
          embedding_length: c.embedding?.length || 0
        }))
      }
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { 
  createTopic, 
  listTopics, 
  getTopic, 
  updateTopic, 
  deleteTopic: deleteTopicHandler, 
  bulkUpload,
  debugTopic
};
