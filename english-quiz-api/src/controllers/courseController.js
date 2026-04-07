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
    const [creatorCourses, courseUsers] = await Promise.all([
      Course.find({ creator: req.user.id }).sort({ createdAt: -1 }),
      CourseUser.find({ user: req.user.id }),
    ]);

    const courseUserMap = new Map(courseUsers.map((item) => [item.course.toString(), item]));

    // Combine: courses of creator + courses user has joined
    const courseIdSet = new Set();
    creatorCourses.forEach((course) => courseIdSet.add(course._id.toString()));
    courseUsers.forEach((item) => courseIdSet.add(item.course.toString()));

    console.log("[getCourses] courseIdSet:", Array.from(courseIdSet));
    const allCourseIds = Array.from(courseIdSet);
    const allCourses = await Course.find({ _id: { $in: allCourseIds } }).sort({ createdAt: -1 });

    console.log("[getCourses] allCourses count:", allCourses.length);
    const courses = allCourses.map((course) => {
      const courseUser = courseUserMap.get(course._id.toString());
      return {
        ...course.toObject(),
        course_user: courseUser ? {
          _id: courseUser._id,
          is_star: courseUser.is_star,
        } : null,
      };
    });

    return res.json({
      success: true,
      data: courses,
    });
  } catch (error) {
    console.error("[getCourses] Error:", error.message, error);
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

    // Find the CourseUser record for this user and course
    const courseUser = await CourseUser.findOne({ course: id, user: req.user.id });
    if (!courseUser) {
      return res.status(404).json({ success: false, error: "Course not found in library" });
    }

    // Delete only user's related data: VocabularyUser and CourseUserPractice
    await Promise.all([
      VocabularyUser.deleteMany({ course_user: courseUser._id }),
      CourseUserPractice.deleteMany({ course_user: courseUser._id }),
      courseUser.deleteOne(),
    ]);

    return res.json({
      success: true,
      message: "Course removed from library successfully",
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

// Generate share code for course
const shareCourse = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, error: "Invalid course id" });
    }

    const course = await Course.findById(id);
    if (!course) {
      return res.status(404).json({ success: false, error: "Course not found" });
    }

    // Only creator can share
    if (course.creator.toString() !== req.user.id) {
      return res.status(403).json({ success: false, error: "Only creator can share this course" });
    }

    // Generate share code if not exists
    if (!course.share_code) {
      const generateShareCode = () => {
        return Math.random().toString(36).substring(2, 8).toUpperCase() + Date.now().toString(36).toUpperCase();
      };

      course.share_code = generateShareCode();
      await course.save();
    }

    return res.json({
      success: true,
      data: {
        course_id: course._id,
        share_code: course.share_code,
        share_link: `https://english-quiz-mobile.com/share/${course.share_code}`,
      },
    });
  } catch (error) {
    return next(error);
  }
};

// Redeem share code to add course to user
const redeemShareCode = async (req, res, next) => {
  try {
    const { share_code } = req.body;

    if (!share_code) {
      return res.status(400).json({ success: false, error: "share_code is required" });
    }

    const course = await Course.findOne({ share_code: share_code.trim().toUpperCase() });
    if (!course) {
      return res.status(404).json({ success: false, error: "Invalid share code" });
    }

    // Get or create course user
    console.log("[redeemShareCode] Creating CourseUser:", { courseId: course._id, userId: req.user.id });
    const courseUser = await getOrCreateCourseUser(course._id, req.user.id);
    console.log("[redeemShareCode] CourseUser created:", courseUser);

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
    console.error("[redeemShareCode] Error:", error.message, error);
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
  shareCourse,
  redeemShareCode,
};
