const mongoose = require("mongoose");
const Course = require("../models/Course");
const CourseUser = require("../models/CourseUser");
const Vocabulary = require("../models/Vocabulary");
const VocabularyUser = require("../models/VocabularyUser");
const CourseUserPractice = require("../models/CourseUserPractice");
const { findCourseWithAccess, getOrCreateCourseUser } = require("../services/courseUserService");

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

const createCourse = async (req, res, next) => {
  try {
    const { title, description = "", is_public = false } = req.body;

    if (!title) {
      return res.status(400).json({
        success: false,
        error: "title is required",
      });
    }

    const course = await Course.create({
      creator: req.user.id,
      title,
      description,
      is_public,
    });

    const courseUser = await getOrCreateCourseUser(course._id, req.user.id);

    return res.status(201).json({
      success: true,
      data: {
        ...course.toObject(),
        course_user: {
          _id: courseUser._id,
          is_star: courseUser.is_star,
        },
      },
    });
  } catch (error) {
    return next(error);
  }
};

const getCourses = async (req, res, next) => {
  try {
    const [ownerOrPublicCourses, courseUsers] = await Promise.all([
      Course.find({
        $or: [{ creator: req.user.id }, { is_public: true }],
      }).sort({ createdAt: -1 }),
      CourseUser.find({ user: req.user.id }),
    ]);

    const courseUserMap = new Map(courseUsers.map((item) => [item.course.toString(), item]));
    const courseIdSet = new Set(ownerOrPublicCourses.map((item) => item._id.toString()));

    courseUsers.forEach((item) => {
      courseIdSet.add(item.course.toString());
    });

    const allCourseIds = Array.from(courseIdSet);
    const allCourses = await Course.find({ _id: { $in: allCourseIds } }).sort({ createdAt: -1 });

    const courses = await Promise.all(
      allCourses.map(async (course) => {
        const existing = courseUserMap.get(course._id.toString()) || (await getOrCreateCourseUser(course._id, req.user.id));
        return {
          ...course.toObject(),
          course_user: {
            _id: existing._id,
            is_star: existing.is_star,
          },
        };
      }),
    );

    return res.json({
      success: true,
      data: courses,
    });
  } catch (error) {
    return next(error);
  }
};

const getCourseById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, error: "Invalid course id" });
    }

    const access = await findCourseWithAccess(id, req.user.id);
    if (access.error) {
      return res.status(access.error.status).json({ success: false, error: access.error.message });
    }

    const { course, courseUser } = access;

    return res.json({
      success: true,
      data: {
        ...course.toObject(),
        course_user: {
          _id: courseUser._id,
          is_star: courseUser.is_star,
        },
      },
    });
  } catch (error) {
    return next(error);
  }
};

const updateCourse = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, description, is_public } = req.body;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, error: "Invalid course id" });
    }

    const course = await Course.findById(id);
    if (!course) {
      return res.status(404).json({ success: false, error: "Course not found" });
    }

    if (course.creator.toString() !== req.user.id) {
      return res.status(403).json({ success: false, error: "Only creator can update this course" });
    }

    if (title !== undefined) course.title = title;
    if (description !== undefined) course.description = description;
    if (is_public !== undefined) course.is_public = is_public;

    await course.save();

    return res.json({ success: true, data: course });
  } catch (error) {
    return next(error);
  }
};

const deleteCourse = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, error: "Invalid course id" });
    }

    const course = await Course.findById(id);
    if (!course) {
      return res.status(404).json({ success: false, error: "Course not found" });
    }

    if (course.creator.toString() !== req.user.id) {
      return res.status(403).json({ success: false, error: "Only creator can delete this course" });
    }

    const vocabularies = await Vocabulary.find({ course: course._id }).select("_id").lean();
    const vocabularyIds = vocabularies.map((item) => item._id);
    const courseUsers = await CourseUser.find({ course: course._id }).select("_id").lean();
    const courseUserIds = courseUsers.map((item) => item._id);

    await Promise.all([
      vocabularyIds.length ? VocabularyUser.deleteMany({ vocabulary: { $in: vocabularyIds } }) : Promise.resolve(),
      courseUserIds.length ? VocabularyUser.deleteMany({ course_user: { $in: courseUserIds } }) : Promise.resolve(),
      courseUserIds.length ? CourseUserPractice.deleteMany({ course_user: { $in: courseUserIds } }) : Promise.resolve(),
      Vocabulary.deleteMany({ course: course._id }),
      CourseUser.deleteMany({ course: course._id }),
      course.deleteOne(),
    ]);

    return res.json({
      success: true,
      message: "Course deleted successfully",
    });
  } catch (error) {
    return next(error);
  }
};

const updateCourseStar = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { is_star } = req.body;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, error: "Invalid course id" });
    }

    const access = await findCourseWithAccess(id, req.user.id);
    if (access.error) {
      return res.status(access.error.status).json({ success: false, error: access.error.message });
    }

    const courseUser = access.courseUser;
    if (is_star === undefined) {
      courseUser.is_star = !courseUser.is_star;
    } else {
      courseUser.is_star = Boolean(is_star);
    }

    await courseUser.save();

    return res.json({
      success: true,
      data: {
        _id: courseUser._id,
        course: courseUser.course,
        user: courseUser.user,
        is_star: courseUser.is_star,
      },
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  createCourse,
  getCourses,
  getCourseById,
  updateCourse,
  deleteCourse,
  updateCourseStar,
};
