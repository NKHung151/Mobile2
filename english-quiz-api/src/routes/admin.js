const express = require('express');
const multer = require('multer');
const router = express.Router();
const { createTopic, listTopics, getTopic, updateTopic, deleteTopic, bulkUpload, debugTopic } = require('../controllers/adminController');
const adminAuth = require('../middleware/adminAuth');
const { validate } = require('../middleware/validateRequest');
const { adminLimiter } = require('../middleware/rateLimiter');

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
    files: 20 // Max 20 files per request
  },
  fileFilter: (req, file, cb) => {
    // Accept only .vtt files
    if (file.originalname.toLowerCase().endsWith('.vtt') || 
        file.mimetype === 'text/vtt' ||
        file.mimetype === 'text/plain') {
      cb(null, true);
    } else {
      cb(new Error('Only .vtt files are allowed'), false);
    }
  }
});

router.use(adminAuth);
router.use(adminLimiter);

/**
 * POST /api/admin/topics
 * Create topic - supports both file upload and JSON
 * 
 * Option 1: File Upload (multipart/form-data)
 * - topic_id: string (required)
 * - title: string (required)
 * - files: .vtt files (required)
 * - metadata: JSON string (optional)
 * 
 * Option 2: JSON Body (application/json)
 * - topic_id: string (required)
 * - title: string (required)
 * - files: array of {filename, content} (required)
 * - metadata: object (optional)
 */
router.post('/topics', upload.array('files', 20), createTopic);

/**
 * GET /api/admin/topics
 * List topics with pagination
 */
router.get('/topics', validate('pagination', 'query'), listTopics);

/**
 * GET /api/admin/topics/:topic_id
 * Get single topic details with sample chunks
 */
router.get('/topics/:topic_id', getTopic);

/**
 * GET /api/admin/topics/:topic_id/debug
 * Debug endpoint - Get detailed topic and chunk info
 */
router.get('/topics/:topic_id/debug', debugTopic);

/**
 * PUT /api/admin/topics/:topic_id
 * Update topic - supports both file upload and JSON
 */
router.put('/topics/:topic_id', upload.array('files', 20), updateTopic);

/**
 * DELETE /api/admin/topics/:topic_id
 * Delete topic and all its chunks
 */
router.delete('/topics/:topic_id', deleteTopic);

/**
 * POST /api/admin/topics/bulk
 * Bulk upload topics (JSON only)
 */
router.post('/topics/bulk', validate('bulkUpload'), bulkUpload);

module.exports = router;
