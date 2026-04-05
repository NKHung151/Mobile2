const mongoose = require("mongoose");

const vocabularyUserSchema = new mongoose.Schema(
  {
    vocabulary: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vocabulary",
      required: true,
      index: true,
    },
    course_user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CourseUser",
      required: true,
      index: true,
    },
    is_memorized: {
      type: Boolean,
      default: false,
      index: true,
    },
    is_star: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

vocabularyUserSchema.index({ vocabulary: 1, course_user: 1 }, { unique: true });

module.exports = mongoose.model("VocabularyUser", vocabularyUserSchema);
