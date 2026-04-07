const mongoose = require("mongoose");
const Course = require("../models/Course");
const Vocabulary = require("../models/Vocabulary");
const VocabularyUser = require("../models/VocabularyUser");
const { findCourseWithAccess } = require("../services/courseUserService");

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
      term_image_url = "",
      def_image_url = "",
      term_language_code = "vi",
      definition_language_code = "vi",
    } = req.body;

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
      term_image_url,
      def_image_url,
      term_language_code,
      definition_language_code,
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

    const access = await findCourseWithAccess(courseId, req.user.id);
    if (access.error) {
      return res.status(access.error.status).json({ success: false, error: access.error.message });
    }

    const { courseUser } = access;

    const vocabularies = await Vocabulary.find({ course: courseId }).sort({ createdAt: 1 });

    const vocabularyUsers = await VocabularyUser.find({
      course_user: courseUser._id,
      vocabulary: { $in: vocabularies.map((item) => item._id) },
    }).lean();

    const vocabularyUserMap = new Map(vocabularyUsers.map((item) => [item.vocabulary.toString(), item]));

    const result = vocabularies.map((item) => {
      const userState = vocabularyUserMap.get(item._id.toString());
      return {
        ...item.toObject(),
        user_state: {
          is_memorized: Boolean(userState?.is_memorized),
          is_star: Boolean(userState?.is_star),
        },
      };
    });

    return res.json({ success: true, data: result });
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

    const fields = ["term", "definition", "term_image_url", "def_image_url", "term_language_code", "definition_language_code"];
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
