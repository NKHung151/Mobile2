// english-quiz-api/src/models/TopicLevel.js
const mongoose = require("mongoose");

const topicLevelSchema = new mongoose.Schema(
  {
    // Static config for each topic+level combo
    topic_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Topic",
      required: true,
    },
    level: {
      type: String,
      enum: ["beginner", "intermediate", "pre-toeic"],
      required: true,
    },
    // How many questions must be answered correctly to unlock next level
    unlock_threshold: { type: Number, default: 5 },
    order: { type: Number, default: 0 }, // 0=beginner,1=intermediate,2=pre-toeic
  },
  { timestamps: true }
);

topicLevelSchema.index({ topic_id: 1, level: 1 }, { unique: true });

module.exports = mongoose.model("TopicLevel", topicLevelSchema);
