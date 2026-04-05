const mongoose = require("mongoose");

const vocabularySchema = new mongoose.Schema(
  {
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
      index: true,
    },
    term: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    definition: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    example: {
      type: String,
      default: "",
      trim: true,
      maxlength: 2000,
    },
    term_image_url: {
      type: String,
      default: "",
      trim: true,
      maxlength: 1000,
    },
    def_image_url: {
      type: String,
      default: "",
      trim: true,
      maxlength: 1000,
    },
    term_language_code: {
      type: String,
      default: "vi",
      trim: true,
      maxlength: 10,
    },
    definition_language_code: {
      type: String,
      default: "vi",
      trim: true,
      maxlength: 10,
    },
    is_started: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("Vocabulary", vocabularySchema);
