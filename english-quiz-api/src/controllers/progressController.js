const mongoose = require("mongoose");
const Course = require("../models/Course");
const CourseUser = require("../models/CourseUser");
const CourseUserPractice = require("../models/CourseUserPractice");
const Vocabulary = require("../models/Vocabulary");
const VocabularyUser = require("../models/VocabularyUser");
const { findCourseWithAccess } = require("../services/courseUserService");

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

async function getOrCreateOpenPractice(courseUserId, practiceId) {
  if (practiceId && isValidObjectId(practiceId)) {
    const byId = await CourseUserPractice.findOne({
      _id: practiceId,
      course_user: courseUserId,
    });

    if (byId) {
      return byId;
    }
  }

  let practice = await CourseUserPractice.findOne({
    course_user: courseUserId,
    is_finished: false,
  }).sort({ started_at: -1 });

  if (!practice) {
    practice = await CourseUserPractice.create({
      course_user: courseUserId,
      status: "in_progress",
      progress: 0,
      unmemorized_count: 0,
      started_at: new Date(),
      is_finished: false,
    });
  }

  return practice;
}

const updateCourseProgress = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const { practiceId, status, progress, unmemorized_count, started_at, finished_at, is_finished } = req.body;

    if (!isValidObjectId(courseId)) {
      return res.status(400).json({ success: false, error: "Invalid course id" });
    }

    const access = await findCourseWithAccess(courseId, req.user.id);
    if (access.error) {
      return res.status(access.error.status).json({ success: false, error: access.error.message });
    }

    const practice = await getOrCreateOpenPractice(access.courseUser._id, practiceId);

    if (practice.is_finished) {
      return res.status(409).json({
        success: false,
        error: "Practice session is already finished and cannot be updated",
      });
    }

    // If all cards were shown (progress >= 100), treat as completed.
    if (progress !== undefined && Number.isFinite(progress) && progress >= 100) {
      practice.status = "completed";
    }

    if (status !== undefined) {
      if (!["completed", "in_progress"].includes(status)) {
        return res.status(400).json({ success: false, error: "status must be completed or in_progress" });
      }

      practice.status = status;
      if (status === "completed" && !practice.finished_at) {
        practice.finished_at = finished_at ? new Date(finished_at) : new Date();
      }
    }

    if (progress !== undefined) {
      if (!Number.isFinite(progress) || progress < 0) {
        return res.status(400).json({ success: false, error: "progress must be a number greater than or equal to 0" });
      }

      practice.progress = progress;
    }

    if (unmemorized_count !== undefined) {
      if (!Number.isInteger(unmemorized_count) || unmemorized_count < 0) {
        return res.status(400).json({ success: false, error: "unmemorized_count must be an integer greater than or equal to 0" });
      }

      practice.unmemorized_count = unmemorized_count;
    }

    if (started_at !== undefined) {
      practice.started_at = new Date(started_at);
    }

    if (finished_at !== undefined) {
      practice.finished_at = finished_at ? new Date(finished_at) : null;
    }

    if (is_finished !== undefined) {
      practice.is_finished = Boolean(is_finished);
    }

    if (practice.status === "completed" && !practice.finished_at) {
      practice.finished_at = new Date();
    }

    if (practice.status === "in_progress" && !practice.is_finished) {
      practice.finished_at = null;
    }

    if (practice.is_finished) {
      if (!practice.finished_at) {
        practice.finished_at = new Date();
      }

      if (practice.status !== "completed") {
        practice.status = "completed";
      }
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
    const { is_memorized, is_star } = req.body;

    if (!isValidObjectId(vocabularyId)) {
      return res.status(400).json({ success: false, error: "Invalid vocabulary id" });
    }

    const vocabulary = await Vocabulary.findById(vocabularyId);
    if (!vocabulary) {
      return res.status(404).json({ success: false, error: "Vocabulary not found" });
    }

    const course = await Course.findById(vocabulary.course);
    if (!course) {
      return res.status(404).json({ success: false, error: "Course not found" });
    }

    let courseUser = await CourseUser.findOne({ course: course._id, user: req.user.id });
    if (!courseUser) {
      if (!course.is_public && course.creator.toString() !== req.user.id) {
        return res.status(403).json({ success: false, error: "You cannot access this vocabulary" });
      }

      courseUser = await CourseUser.create({
        course: course._id,
        user: req.user.id,
      });
    }

    let vocabularyUser = await VocabularyUser.findOne({
      vocabulary: vocabularyId,
      course_user: courseUser._id,
    });

    if (!vocabularyUser) {
      vocabularyUser = await VocabularyUser.create({
        vocabulary: vocabularyId,
        course_user: courseUser._id,
      });
    }

    if (is_memorized !== undefined) {
      vocabularyUser.is_memorized = Boolean(is_memorized);
    }

    if (is_star !== undefined) {
      vocabularyUser.is_star = Boolean(is_star);
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

const createCoursePractice = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const { progress = 0, unmemorized_count = 0, status = "in_progress", started_at, is_finished = false } = req.body;

    if (!isValidObjectId(courseId)) {
      return res.status(400).json({ success: false, error: "Invalid course id" });
    }

    const access = await findCourseWithAccess(courseId, req.user.id);
    if (access.error) {
      return res.status(access.error.status).json({ success: false, error: access.error.message });
    }

    const existingOpen = await CourseUserPractice.findOne({
      course_user: access.courseUser._id,
      is_finished: false,
    }).sort({ started_at: -1 });

    if (existingOpen) {
      return res.json({ success: true, data: existingOpen });
    }

    const normalizedStatus = progress >= 100 ? "completed" : status;
    const shouldFinish = Boolean(is_finished);

    const practice = await CourseUserPractice.create({
      course_user: access.courseUser._id,
      progress,
      unmemorized_count,
      status: normalizedStatus,
      started_at: started_at ? new Date(started_at) : new Date(),
      finished_at: shouldFinish || normalizedStatus === "completed" ? new Date() : null,
      is_finished: shouldFinish,
    });

    return res.status(201).json({ success: true, data: practice });
  } catch (error) {
    return next(error);
  }
};

const getLatestCoursePractice = async (req, res, next) => {
  try {
    const { courseId } = req.params;

    if (!isValidObjectId(courseId)) {
      return res.status(400).json({ success: false, error: "Invalid course id" });
    }

    const access = await findCourseWithAccess(courseId, req.user.id);
    if (access.error) {
      return res.status(access.error.status).json({ success: false, error: access.error.message });
    }

    const latest = await CourseUserPractice.findOne({
      course_user: access.courseUser._id,
    }).sort({ started_at: -1, createdAt: -1 });

    return res.json({
      success: true,
      data: latest,
    });
  } catch (error) {
    return next(error);
  }
};

const getPracticeHistory = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Get all CourseUser records for the current user
    const courseUsers = await CourseUser.find({ user: userId });
    const courseUserIds = courseUsers.map((cu) => cu._id);

    if (courseUserIds.length === 0) {
      return res.json({ success: true, data: [] });
    }

    // Get all CourseUserPractice records for these CourseUser records, sorted by started_at
    const practices = await CourseUserPractice.find({
      course_user: { $in: courseUserIds },
    })
      .populate({
        path: "course_user",
        populate: {
          path: "course",
          select: "title description is_public createdAt",
        },
      })
      .sort({ started_at: -1 })
      .lean();

    // Enrich each practice with course title for easier display
    const enrichedPractices = practices.map((practice) => ({
      ...practice,
      courseTitle: practice.course_user?.course?.title || "Unknown Course",
    }));

    return res.json({ success: true, data: enrichedPractices });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  createCoursePractice,
  getLatestCoursePractice,
  updateCourseProgress,
  updateVocabularyMemorized,
  getPracticeHistory,
};
