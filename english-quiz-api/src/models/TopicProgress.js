const mongoose = require("mongoose");

const topicProgressSchema = new mongoose.Schema(
  {
    user_id: {
      type: String,
      required: true,
      index: true,
    },
    topic_id: {
      type: String,
      required: true,
      index: true,
    },
    topic_title: {
      type: String,
      required: true,
    },
    // Learning statistics
    total_sessions: {
      type: Number,
      default: 0,
    },
    completed_sessions: {
      type: Number,
      default: 0,
    },
    quiz_sessions: {
      type: Number,
      default: 0,
    },
    chat_sessions: {
      type: Number,
      default: 0,
    },
    // Performance metrics
    total_questions_answered: {
      type: Number,
      default: 0,
    },
    total_correct_answers: {
      type: Number,
      default: 0,
    },
    average_accuracy: {
      type: Number,
      default: 0,
    },
    highest_score: {
      type: Number,
      default: 0,
    },
    total_score_points: {
      type: Number,
      default: 0,
    },
    // Time invested
    total_time_minutes: {
      type: Number,
      default: 0,
    },
    average_time_per_session_minutes: {
      type: Number,
      default: 0,
    },
    last_study_date: {
      type: Date,
      default: null,
    },
    // Progress status
    mastery_percentage: {
      type: Number,
      default: 0,
    },
    level: {
      type: String,
      enum: ["beginner", "elementary", "intermediate", "advanced", "expert"],
      default: "beginner",
    },
    // Streak tracking
    current_study_streak: {
      type: Number,
      default: 0,
    },
    longest_study_streak: {
      type: Number,
      default: 0,
    },
    last_streak_date: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  },
);

// Compound index for efficient queries
topicProgressSchema.index({ user_id: 1, topic_id: 1 }, { unique: true });
topicProgressSchema.index({ user_id: 1, updated_at: -1 });

// Virtual for progress percentage
topicProgressSchema.virtual("progress_percentage").get(function () {
  if (this.total_questions_answered === 0) return 0;
  return Math.round(
    (this.total_correct_answers / this.total_questions_answered) * 100,
  );
});

topicProgressSchema.set("toJSON", { virtuals: true });
topicProgressSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("TopicProgress", topicProgressSchema);
