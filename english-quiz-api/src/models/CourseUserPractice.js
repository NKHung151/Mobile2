const mongoose = require("mongoose");

const courseUserPracticeSchema = new mongoose.Schema(
  {
    course_user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CourseUser",
      required: true,
      index: true,
    },
    unmemorized_count: {
      type: Number,
      min: 0,
      default: 0,
      index: true,
    },
    progress: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: ["completed", "in_progress"],
      default: "in_progress",
      index: true,
    },
    started_at: {
      type: Date,
      default: Date.now,
    },
    finished_at: {
      type: Date,
      default: null,
    },
    is_finished: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

courseUserPracticeSchema.index({ course_user: 1, started_at: -1 });
courseUserPracticeSchema.index({ course_user: 1, is_finished: 1, started_at: -1 });

module.exports = mongoose.model("CourseUserPractice", courseUserPracticeSchema);
