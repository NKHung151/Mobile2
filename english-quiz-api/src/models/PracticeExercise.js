const mongoose = require("mongoose");

const practiceExerciseSchema = new mongoose.Schema(
  {
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
    title: {
      type: String,
      required: true,
    },
    order: {
      type: Number,
      required: true, // 1, 2, 3...
    },
  },
  { timestamps: true }
);

practiceExerciseSchema.index({ topic_id: 1, level: 1, order: 1 });

module.exports = mongoose.model("PracticeExercise", practiceExerciseSchema);
