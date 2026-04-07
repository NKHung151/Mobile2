const mongoose = require("mongoose");

const courseUserSchema = new mongoose.Schema(
  {
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
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

courseUserSchema.index({ course: 1, user: 1 }, { unique: true });

module.exports = mongoose.model("CourseUser", courseUserSchema);
