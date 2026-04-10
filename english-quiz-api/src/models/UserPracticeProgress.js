// english-quiz-api/src/models/UserPracticeProgress.js
const mongoose = require("mongoose");

const userPracticeProgressSchema = new mongoose.Schema(
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
    correct_count: { type: Number, default: 0 },
    total_attempted: { type: Number, default: 0 },
    is_unlocked: { type: Boolean, default: false },
    // beginner is always unlocked
    unlocked_at: Date,
    last_practiced: Date,
    completed_exercises: [{ type: mongoose.Schema.Types.ObjectId, ref: "PracticeExercise" }],
},
  { timestamps: true }
);

userPracticeProgressSchema.index(
  { user_id: 1, topic_id: 1, level: 1 },
  { unique: true }
);

module.exports = mongoose.model(
  "UserPracticeProgress",
  userPracticeProgressSchema
);
