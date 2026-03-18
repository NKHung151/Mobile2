const { processChat, processChatStream } = require('../services/chatService');
const logger = require('../utils/logger');

async function chat(req, res, next) {
  try {
    const { user_id, topic_id, message } = req.body;
    logger.info(`Chat: user=${user_id}, topic=${topic_id}`);
    const result = await processChat(user_id, topic_id, message);
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
}

async function chatStream(req, res, next) {
  try {
    const { user_id, topic_id, message } = req.body;
    
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    let isConnected = true;
    req.on('close', () => { isConnected = false; });

    await processChatStream(
      user_id, topic_id, message,
      (content) => { if (isConnected && content) res.write(`data: ${JSON.stringify({ content })}\\n\\n`); },
      (result) => {
        if (isConnected) {
          res.write(`data: ${JSON.stringify({ done: true, conversation_id: result.conversation_id })}\\n\\n`);
          res.end();
        }
      }
    );
  } catch (error) {
    res.write(`data: ${JSON.stringify({ error: error.message })}\\n\\n`);
    res.end();
  }
}

module.exports = { chat, chatStream };
