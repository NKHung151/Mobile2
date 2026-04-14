const mongoose = require("mongoose");

const sessionAnswerSchema = new mongoose.Schema(
  {
    session_id: {
      type: String,
      required: true,
      index: true,
    },
    user_id: {
      type: String,
      required: true,
      index: true,
    },
    question_id: {
      type: String,
      required: true,
    },
    question_text: {
      type: String,
    },
    question_type: {
      type: String,
      enum: ["quiz", "multiple_choice","fill_in_blank","reorder","error_detection", "fillup", "listening", "homophone_groups"],
      default: "quiz",
    },
    // User's answer
    user_answer: {
      type: String,
      required: true,
    },
    // Correct answer
    correct_answer: {
      type: Object,
      required: true,
    },
    // Answer details
    is_correct: {
      type: Boolean,
      required: true,
    },
    explanation: String,
    // Options (for multiple choice)
    options: [String],
    // Time to answer
    time_spent_seconds: {
      type: Number,
      default: 0,
    },
    // Metadata
    source_id: String, // e.g. quiz_id, topic_id, homophone_group_id
    source_type: String, // e.g. "quiz", "homophone_groups", "listening_part2"
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  }
);

// Indexes for efficient queries
sessionAnswerSchema.index({ session_id: 1, user_id: 1 });
sessionAnswerSchema.index({ user_id: 1, created_at: -1 });
sessionAnswerSchema.index({ session_id: 1 });

module.exports = mongoose.model("SessionAnswer", sessionAnswerSchema, "session_answers");
