const express = require('express');
const router = express.Router();
const Topic = require('../models/Topic');
const Chunk = require('../models/Chunk');
const logger = require('../utils/logger');
const { validate } = require('../middleware/validateRequest');

/**
 * List topics with pagination (public endpoint)
 * GET /api/topics
 */
router.get('/', validate('pagination', 'query'), async (req, res, next) => {
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
});

/**
 * Get single topic details (public endpoint)
 * GET /api/topics/:topic_id
 */
router.get('/:topic_id', async (req, res, next) => {
  try {
    const { topic_id } = req.params;
    const topic = await Topic.findOne({ topic_id });

    if (!topic) {
      return res.status(404).json({ success: false, error: 'Topic not found' });
    }

    // Get actual chunk count from database
    const chunkCount = await Chunk.countDocuments({ topic_id });

    res.json({ 
      success: true, 
      topic: {
        ...topic.toObject(),
        actual_chunk_count: chunkCount
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
