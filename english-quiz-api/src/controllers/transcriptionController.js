const Chunk = require("../models/Chunk");
const Topic = require("../models/Topic");
const logger = require("../utils/logger");

/**
 * Get transcription sentences for a topic
 * Uses chunks from the topic as transcription practice sentences
 */
async function getSentences(req, res, next) {
  try {
    const { topic_id } = req.query;
    logger.info(`Transcription: Getting sentences for topic=${topic_id}`);

    // Fetch chunks for this topic (they become transcription sentences)
    const chunks = await Chunk.find({ topic_id })
      .limit(10) // Limit to 10 sentences per session
      .select("content file_name chunk_index")
      .exec();

    if (chunks.length === 0) {
      logger.warn(`No chunks found for topic ${topic_id}`);
      return res.json({
        success: true,
        data: [],
        message: "No sentences available for this topic",
      });
    }

    // Convert chunks to sentence format
    const sentences = chunks.map((chunk, idx) => ({
      id: chunk._id.toString(),
      content: chunk.content,
      file_name: chunk.file_name,
      index: idx,
    }));

    res.json({
      success: true,
      data: sentences,
      total: sentences.length,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Submit a transcription and save it to learning history
 */
async function submitTranscription(req, res, next) {
  try {
    const { user_id, topic_id, sentence_id, transcription, score } = req.body;

    logger.info(
      `Transcription submitted: user=${user_id}, topic=${topic_id}, score=${score}`,
    );

    // Here you could save detailed transcription data to a database
    // For now, we just acknowledge the submission
    // In a real app, you'd store: user_id, topic_id, sentence_id, transcription, score, timestamp

    res.json({
      success: true,
      message: "Transcription recorded",
      score: score,
      feedback: generateFeedback(score),
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Generate feedback based on score
 */
function generateFeedback(score) {
  if (score >= 90) {
    return {
      rating: "excellent",
      message: "🎉 Perfect! You transcribed this accurately.",
      motivation: "Keep up the excellent work!",
    };
  } else if (score >= 75) {
    return {
      rating: "good",
      message: "👍 Good effort! Just a few words to improve.",
      motivation:
        "You're getting the hang of it. Listen more carefully next time.",
    };
  } else if (score >= 60) {
    return {
      rating: "okay",
      message: "💡 Keep practicing! You missed several words.",
      motivation:
        "Don't worry - listening gets easier with practice. Try again or move on.",
    };
  } else {
    return {
      rating: "needs_work",
      message:
        "📚 This one was challenging. Listen again and try to catch more words.",
      motivation:
        "Every attempt helps you improve. Consider listening to it again.",
    };
  }
}

module.exports = { getSentences, submitTranscription };
