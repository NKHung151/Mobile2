const mongoose = require('mongoose');
const Course = require('../models/Course');
const Vocabulary = require('../models/Vocabulary');
const CourseUserPractice = require('../models/CourseUserPractice');
const VocabularyUser = require('../models/VocabularyUser');

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

async function getOrCreateCoursePractice(userId, courseId) {
  let practice = await CourseUserPractice.findOne({ user: userId, course: courseId });

  if (!practice) {
    practice = await CourseUserPractice.create({
      user: userId,
      course: courseId,
      status: 0,
      progress: 0,
    });
  }

  return practice;
}

const updateCourseProgress = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const { status, progress } = req.body;

    if (!isValidObjectId(courseId)) {
      return res.status(400).json({ success: false, error: 'Invalid course id' });
    }

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ success: false, error: 'Course not found' });
    }

    const practice = await getOrCreateCoursePractice(req.user.id, courseId);

    if (status !== undefined) {
      if (![0, 1].includes(status)) {
        return res.status(400).json({ success: false, error: 'status must be 0 or 1' });
      }
      practice.status = status;
    }

    if (progress !== undefined) {
      if (!Number.isInteger(progress) || progress < 0 || progress > 100) {
        return res.status(400).json({ success: false, error: 'progress must be an integer from 0 to 100' });
      }
      practice.progress = progress;
    }

    await practice.save();

    return res.json({ success: true, data: practice });
  } catch (error) {
    return next(error);
  }
};

const updateVocabularyMemorized = async (req, res, next) => {
  try {
    const { vocabularyId } = req.params;
    const { is_started, is_memorized } = req.body;

    if (!isValidObjectId(vocabularyId)) {
      return res.status(400).json({ success: false, error: 'Invalid vocabulary id' });
    }

    const vocabulary = await Vocabulary.findById(vocabularyId);
    if (!vocabulary) {
      return res.status(404).json({ success: false, error: 'Vocabulary not found' });
    }

    const practice = await getOrCreateCoursePractice(req.user.id, vocabulary.course);

    let vocabularyUser = await VocabularyUser.findOne({
      vocabulary: vocabularyId,
      user: req.user.id,
    });

    if (!vocabularyUser) {
      vocabularyUser = await VocabularyUser.create({
        vocabulary: vocabularyId,
        user: req.user.id,
        course_user_practice: practice._id,
      });
    }

    if (is_started !== undefined) {
      vocabularyUser.is_started = Boolean(is_started);
    }

    if (is_memorized !== undefined) {
      vocabularyUser.is_memorized = Boolean(is_memorized);
    }

    await vocabularyUser.save();

    return res.json({
      success: true,
      data: vocabularyUser,
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  updateCourseProgress,
  updateVocabularyMemorized,
};
