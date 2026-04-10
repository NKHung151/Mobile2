// english-quiz-api/src/models/PracticeQuestion.js
const mongoose = require("mongoose");

const practiceQuestionSchema = new mongoose.Schema(
  {
    topic_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Topic",
      required: true,
    },
    exercise_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PracticeExercise",
      required: true,
    },
    level: {
      type: String,
      enum: ["beginner", "intermediate", "pre-toeic"],
      required: true,
    },
    type: {
      type: String,
      enum: ["multiple_choice", "fill_in_blank", "reorder", "error_detection"],
      required: true,
    },
    question: { type: String, required: true },
    // Multiple choice
    options: [String],
    correct_option_index: Number,
    // Fill in blank: question has "___" placeholder
    correct_answer: String,
    // Reorder: array of words to be sorted
    words: [String],
    correct_order: [Number], // indices of correct order
    // Error detection
    sentence_parts: [String], // parts of sentence, one has error
    error_index: Number, // index of part with error
    corrected_part: String, // the correct version
    // Shared explanation fields
    explanation: { type: String, required: true },
    grammar_tip: String,
    example: String,
  },
  { timestamps: true }
);

practiceQuestionSchema.index({ topic_id: 1, level: 1, type: 1 });

module.exports = mongoose.model("PracticeQuestion", practiceQuestionSchema);
