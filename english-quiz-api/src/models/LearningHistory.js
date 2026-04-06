const mongoose = require("mongoose");

const learningSessionSchema = new mongoose.Schema(
  {
    session_id: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
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
    mode: {
      type: String,
      enum: ["quiz", "chat", "homophone_groups", "listening_part2"],
      required: true,
    },
    status: {
      type: String,
      enum: ["started", "in_progress", "completed", "abandoned"],
      default: "started",
    },
    // Performance metrics
    total_questions: {
      type: Number,
      default: 0,
    },
    questions_answered: {
      type: Number,
      default: 0,
    },
    correct_answers: {
      type: Number,
      default: 0,
    },
    incorrect_answers: {
      type: Number,
      default: 0,
    },
    total_score: {
      type: Number,
      default: 0,
    },
    max_score: {
      type: Number,
      default: 0,
    },
    accuracy_percentage: {
      type: Number,
      default: 0,
    },
    // Time tracking
    start_time: {
      type: Date,
      default: Date.now,
    },
    end_time: {
      type: Date,
      default: null,
    },
    duration_minutes: {
      type: Number,
      default: 0,
    },
    // Engagement metrics
    time_per_question_seconds: {
      type: Number,
      default: 0,
    },
    completion_percentage: {
      type: Number,
      default: 0,
    },
    // Activity details
    messages_exchanged: {
      type: Number,
      default: 0,
    },
    learning_tags: [String],
    difficulties_encountered: [String],
    // Questions summary (for listening_part2 and similar detailed modes)
    questions_summary: [{
      question_id: {
        type: String,
      },
      is_correct: {
        type: Boolean,
      },
      user_answer: {
        type: String,
      },
      correct_answer: {
        type: String,
      },
    }],
    // Metadata
    device_type: String,
    ip_address: String,
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  },
);

// Indexes for common queries
learningSessionSchema.index({ user_id: 1, created_at: -1 });
learningSessionSchema.index({ user_id: 1, topic_id: 1 });
learningSessionSchema.index({ user_id: 1, status: 1 });
learningSessionSchema.index({ created_at: -1 });

// Calculate duration before saving
learningSessionSchema.pre("save", function (next) {
  if (this.end_time && this.start_time) {
    const durationMs = this.end_time - this.start_time;
    this.duration_minutes = Math.round(durationMs / 1000 / 60);
  }
  next();
});

// Virtual for completion status
learningSessionSchema.virtual("is_completed").get(function () {
  return this.status === "completed";
});

learningSessionSchema.virtual("score_percentage").get(function () {
  if (this.max_score === 0) return 0;
  return Math.round((this.total_score / this.max_score) * 100);
});

learningSessionSchema.set("toJSON", { virtuals: true });
learningSessionSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("LearningHistory", learningSessionSchema);
