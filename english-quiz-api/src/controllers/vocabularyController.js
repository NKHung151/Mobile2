const mongoose = require("mongoose");
const Course = require("../models/Course");
const Vocabulary = require("../models/Vocabulary");

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

async function ensureCourseOwner(courseId, userId) {
  const course = await Course.findById(courseId);

  if (!course) {
    return { error: { status: 404, message: "Course not found" } };
  }

  if (course.creator.toString() !== userId) {
    return { error: { status: 403, message: "Only creator can modify vocabulary" } };
  }

  return { course };
}

const createVocabulary = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const {
      term,
      definition,
      example = "",
      term_image_url = "",
      def_image_url = "",
      term_language_code = "vi",
      definition_language_code = "vi",
      is_started = false,
    } = req.body;

    console.log(req.body);

    if (!isValidObjectId(courseId)) {
      return res.status(400).json({ success: false, error: "Invalid course id" });
    }

    if (!term || !definition) {
      return res.status(400).json({ success: false, error: "term and definition are required" });
    }

    const check = await ensureCourseOwner(courseId, req.user.id);
    if (check.error) {
      return res.status(check.error.status).json({ success: false, error: check.error.message });
    }

    const vocabulary = await Vocabulary.create({
      course: courseId,
      term,
      definition,
      example,
      term_image_url,
      def_image_url,
      term_language_code,
      definition_language_code,
      is_started,
    });

    return res.status(201).json({ success: true, data: vocabulary });
  } catch (error) {
    return next(error);
  }
};

const getCourseVocabularies = async (req, res, next) => {
  try {
    const { courseId } = req.params;

    if (!isValidObjectId(courseId)) {
      return res.status(400).json({ success: false, error: "Invalid course id" });
    }

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ success: false, error: "Course not found" });
    }

    const isOwner = course.creator.toString() === req.user.id;
    if (!isOwner && !course.is_public) {
      return res.status(403).json({ success: false, error: "You cannot access this course vocabularies" });
    }

    const vocabularies = await Vocabulary.find({ course: courseId }).sort({ createdAt: 1 });

    return res.json({ success: true, data: vocabularies });
  } catch (error) {
    return next(error);
  }
};

const updateVocabulary = async (req, res, next) => {
  try {
    const { courseId, vocabularyId } = req.params;

    if (!isValidObjectId(courseId) || !isValidObjectId(vocabularyId)) {
      return res.status(400).json({ success: false, error: "Invalid id format" });
    }

    const check = await ensureCourseOwner(courseId, req.user.id);
    if (check.error) {
      return res.status(check.error.status).json({ success: false, error: check.error.message });
    }

    const vocabulary = await Vocabulary.findOne({ _id: vocabularyId, course: courseId });
    if (!vocabulary) {
      return res.status(404).json({ success: false, error: "Vocabulary not found in this course" });
    }

    const fields = ["term", "definition", "example", "term_image_url", "def_image_url", "term_language_code", "definition_language_code", "is_started"];
    fields.forEach((field) => {
      if (req.body[field] !== undefined) {
        vocabulary[field] = req.body[field];
      }
    });

    await vocabulary.save();

    return res.json({ success: true, data: vocabulary });
  } catch (error) {
    return next(error);
  }
};

const deleteVocabulary = async (req, res, next) => {
  try {
    const { courseId, vocabularyId } = req.params;

    if (!isValidObjectId(courseId) || !isValidObjectId(vocabularyId)) {
      return res.status(400).json({ success: false, error: "Invalid id format" });
    }

    const check = await ensureCourseOwner(courseId, req.user.id);
    if (check.error) {
      return res.status(check.error.status).json({ success: false, error: check.error.message });
    }

    const deleted = await Vocabulary.findOneAndDelete({ _id: vocabularyId, course: courseId });

    if (!deleted) {
      return res.status(404).json({ success: false, error: "Vocabulary not found in this course" });
    }

    return res.json({ success: true, message: "Vocabulary deleted successfully" });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getCourseVocabularies,
  createVocabulary,
  updateVocabulary,
  deleteVocabulary,
};
