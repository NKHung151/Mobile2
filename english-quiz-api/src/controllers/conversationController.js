const Conversation = require('../models/Conversation');
const logger = require('../utils/logger');

async function listConversations(req, res, next) {
  try {
    const { user_id } = req.query;
    const conversations = await Conversation.find({ user_id })
      .select('topic_id mode status current_question total_questions total_score max_possible_score created_at updated_at')
      .sort({ updated_at: -1 });

    res.json({
      success: true,
      count: conversations.length,
      conversations
    });
  } catch (error) {
    next(error);
  }
}

async function getConversation(req, res, next) {
  try {
    const { topic_id } = req.params;
    const { user_id, mode = 'quiz' } = req.query;

    const conversation = await Conversation.findOne({ user_id, topic_id, mode });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        error: 'Conversation not found'
      });
    }

    res.json({
      success: true,
      conversation
    });
  } catch (error) {
    next(error);
  }
}

async function deleteConversation(req, res, next) {
  try {
    const { topic_id } = req.params;
    const { user_id, mode } = req.query;

    const filter = { user_id, topic_id };
    if (mode) filter.mode = mode;

    const result = await Conversation.deleteMany(filter);

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Conversation not found'
      });
    }

    logger.info(`Deleted conversation: user=${user_id}, topic=${topic_id}`);

    res.json({
      success: true,
      deleted: result.deletedCount
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { listConversations, getConversation, deleteConversation };
