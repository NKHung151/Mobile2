// english-quiz-api/src/models/PracticeSession.js
const mongoose = require("mongoose");

const practiceSessionSchema = new mongoose.Schema(
  {
    user_id: { type: String, required: true },
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
    exercise_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PracticeExercise",
      required: true,
    },
    question_ids: [{ type: mongoose.Schema.Types.ObjectId, ref: "PracticeQuestion" }],
    current_index: { type: Number, default: 0 },
    answers: [
      {
        question_id: mongoose.Schema.Types.ObjectId,
        user_answer: mongoose.Schema.Types.Mixed,
        is_correct: Boolean,
        time_spent_ms: Number,
      },
    ],
    status: {
      type: String,
      enum: ["active", "completed", "abandoned"],
      default: "active",
    },
    score: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    completed_at: Date,
  },
  { timestamps: true }
);

practiceSessionSchema.index({ user_id: 1, status: 1 });

module.exports = mongoose.model("PracticeSession", practiceSessionSchema);
