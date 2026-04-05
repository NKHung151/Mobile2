const Course = require("../models/Course");
const CourseUser = require("../models/CourseUser");

async function findCourseWithAccess(courseId, userId) {
  const course = await Course.findById(courseId);
  if (!course) {
    return { error: { status: 404, message: "Course not found" } };
  }

  const isOwner = course.creator.toString() === userId;
  let courseUser = await CourseUser.findOne({ course: courseId, user: userId });

  if (!isOwner && !course.is_public && !courseUser) {
    return { error: { status: 403, message: "You cannot access this course" } };
  }

  if (!courseUser) {
    courseUser = await CourseUser.create({
      course: courseId,
      user: userId,
      is_star: false,
    });
  }

  return { course, isOwner, courseUser };
}

async function getOrCreateCourseUser(courseId, userId) {
  let courseUser = await CourseUser.findOne({ course: courseId, user: userId });
  if (!courseUser) {
    courseUser = await CourseUser.create({
      course: courseId,
      user: userId,
      is_star: false,
    });
  }

  return courseUser;
}

module.exports = {
  findCourseWithAccess,
  getOrCreateCourseUser,
};
