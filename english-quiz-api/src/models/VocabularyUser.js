const mongoose = require('mongoose');

const vocabularyUserSchema = new mongoose.Schema(
  {
    vocabulary: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vocabulary',
      required: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    course_user_practice: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CourseUserPractice',
      required: true,
      index: true,
    },
    is_started: {
      type: Boolean,
      default: false,
    },
    is_memorized: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

vocabularyUserSchema.index({ vocabulary: 1, user: 1 }, { unique: true });

module.exports = mongoose.model('VocabularyUser', vocabularyUserSchema);
