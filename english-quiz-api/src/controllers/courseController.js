const mongoose = require('mongoose');
const Course = require('../models/Course');

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

const createCourse = async (req, res, next) => {
  try {
    const { title, description = '', is_public = false } = req.body;

    if (!title) {
      return res.status(400).json({
        success: false,
        error: 'title is required',
      });
    }

    const course = await Course.create({
      creator: req.user.id,
      title,
      description,
      is_public,
    });

    return res.status(201).json({
      success: true,
      data: course,
    });
  } catch (error) {
    return next(error);
  }
};

const getCourses = async (req, res, next) => {
  try {
    const filter = {
      $or: [{ creator: req.user.id }, { is_public: true }],
    };

    const courses = await Course.find(filter).sort({ createdAt: -1 });

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
      return res.status(400).json({ success: false, error: 'Invalid course id' });
    }

    const course = await Course.findById(id);
    if (!course) {
      return res.status(404).json({ success: false, error: 'Course not found' });
    }

    const isOwner = course.creator.toString() === req.user.id;
    if (!isOwner && !course.is_public) {
      return res.status(403).json({ success: false, error: 'You cannot access this course' });
    }

    return res.json({ success: true, data: course });
  } catch (error) {
    return next(error);
  }
};

const updateCourse = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, description, is_public } = req.body;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, error: 'Invalid course id' });
    }

    const course = await Course.findById(id);
    if (!course) {
      return res.status(404).json({ success: false, error: 'Course not found' });
    }

    if (course.creator.toString() !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Only creator can update this course' });
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
      return res.status(400).json({ success: false, error: 'Invalid course id' });
    }

    const course = await Course.findById(id);
    if (!course) {
      return res.status(404).json({ success: false, error: 'Course not found' });
    }

    if (course.creator.toString() !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Only creator can delete this course' });
    }

    await course.deleteOne();

    return res.json({
      success: true,
      message: 'Course deleted successfully',
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
};
