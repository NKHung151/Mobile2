const express = require('express');
const router = express.Router();
const { listConversations, getConversation, deleteConversation } = require('../controllers/conversationController');
const { validate } = require('../middleware/validateRequest');

// GET /api/conversations?user_id=xxx
router.get('/', validate('conversationQuery', 'query'), listConversations);

// GET /api/conversations/:topic_id?user_id=xxx
router.get('/:topic_id', validate('conversationQuery', 'query'), getConversation);

// DELETE /api/conversations/:topic_id?user_id=xxx
router.delete('/:topic_id', validate('conversationQuery', 'query'), deleteConversation);

module.exports = router;
