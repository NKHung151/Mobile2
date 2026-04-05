const mongoose = require('mongoose');

const courseUserPracticeSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
      index: true,
    },
    status: {
      type: Number,
      enum: [0, 1],
      default: 0,
      index: true,
    },
    progress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    created_at: {
      type: Date,
      default: Date.now,
      immutable: true,
    },
  },
  {
    timestamps: true,
  },
);

courseUserPracticeSchema.index({ user: 1, course: 1 }, { unique: true });

module.exports = mongoose.model('CourseUserPractice', courseUserPracticeSchema);
