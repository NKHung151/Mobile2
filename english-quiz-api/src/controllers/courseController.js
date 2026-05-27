/**
 * ============================================================================
 * COURSE CONTROLLER
 * ============================================================================
 * Handles all course-related API endpoints:
 * - CRUD operations for courses (create, read, update, delete)
 * - Course access management (star/favorite courses, share/redeem)
 * - Course user enrollment (auto-create on first access)
 * 
 * Key Concepts:
 * 1. Access Control: Only creators can update/delete/share courses
 *    - Public courses: Any user can join (auto-enrolled via findCourseWithAccess)
 *    - Private courses: Only creator and enrolled users can access
 * 
 * 2. Data Structure:
 *    - Course: Shared course data (title, description, vocabulary list, creator)
 *    - CourseUser: User's enrollment record (is_star, join_timestamp)
 *    - Returns combined response: {...course, course_user: {...courseUser}}
 * 
 * 3. Share System: Creator generates share_code → other users redeem via code
 * 
 * 4. Cascade Delete: When user removes course from library:
 *    - Delete all VocabularyUser records (user's progress on vocab)
 *    - Delete all CourseUserPractice records (user's session history)
 *    - Delete CourseUser record (enrollment)
 *    - Note: Course & Vocabulary data remain untouched (shared resources)
 * ============================================================================
 */

const mongoose = require("mongoose");
const Course = require("../models/Course");
const CourseUser = require("../models/CourseUser");
const Vocabulary = require("../models/Vocabulary");
const VocabularyUser = require("../models/VocabularyUser");
const CourseUserPractice = require("../models/CourseUserPractice");
const { findCourseWithAccess, getOrCreateCourseUser } = require("../services/courseUserService");

/**
 * Validates MongoDB ObjectId format.
 * Returns true if id is valid ObjectId, false otherwise.
 * Used to catch invalid IDs early and return 400 Bad Request.
 */
function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

/**
 * CREATE COURSE
 * POST /api/courses
 * 
 * Creates a new course with the authenticated user as creator.
 * 
 * Request Body:
 *   - title (string, required): Course name
 *   - description (string, optional): Course description
 *   - is_public (boolean, optional, default: false): Public courses allow any user to join
 * 
 * Process:
 *   1. Validate title is provided
 *   2. Create Course record with creator = current user
 *   3. Auto-create CourseUser enrollment for creator (via getOrCreateCourseUser)
 *   4. Return combined response with course + course_user
 * 
 * Response: 201 Created
 *   - ...course: Full course object
 *   - course_user: {_id, is_star} - Creator's enrollment record
 */
const createCourse = async (req, res, next) => {
  try {
    const { title, description = "", is_public = false } = req.body;

    // Validate required field
    if (!title) {
      return res.status(400).json({
        success: false,
        error: "title is required",
      });
    }

    // Create course with creator as current user
    const course = await Course.create({
      creator: req.user.id,
      title,
      description,
      is_public,
    });

    // Auto-enroll creator as a course user
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

/**
 * GET ALL COURSES FOR USER
 * GET /api/courses
 * 
 * Returns all courses accessible to the user:
 * 1. Courses created by user (where creator = current user)
 * 2. Courses user has enrolled in (joined via public course or share code)
 * 
 * Data Merging Pattern:
 *   - Query 1: All creator courses (fast, index on creator)
 *   - Query 2: All CourseUser enrollments for user (fast, index on user)
 *   - Build Set: Combine course IDs from both queries (O(n))
 *   - Query 3: Fetch all courses by IDs (optimized single query)
 *   - Map: CourseUser → Map[course_id] for O(1) lookup
 *   - Result: Merge course + course_user for each course
 * 
 * Response: 200 OK
 *   - Array of courses, sorted by createdAt (newest first)
 *   - Each course includes: {...course, course_user: {...courseUser or null}}
 *   - course_user is null if user hasn't enrolled (shouldn't happen for own courses)
 */
const getCourses = async (req, res, next) => {
  try {
    // Parallel queries to fetch courses created by user and courses user joined
    const [creatorCourses, courseUsers] = await Promise.all([
      Course.find({ creator: req.user.id }).sort({ createdAt: -1 }),
      CourseUser.find({ user: req.user.id }),
    ]);

    // Build Map for O(1) lookup: course_id → CourseUser record
    const courseUserMap = new Map(courseUsers.map((item) => [item.course.toString(), item]));

    // Combine: Collect all unique course IDs from both sources
    const courseIdSet = new Set();
    creatorCourses.forEach((course) => courseIdSet.add(course._id.toString()));
    courseUsers.forEach((item) => courseIdSet.add(item.course.toString()));

    console.log("[getCourses] courseIdSet:", Array.from(courseIdSet));
    
    // Single optimized query to fetch all courses by IDs
    const allCourseIds = Array.from(courseIdSet);
    const allCourses = await Course.find({ _id: { $in: allCourseIds } }).sort({ createdAt: -1 });

    console.log("[getCourses] allCourses count:", allCourses.length);
    
    // Merge: Combine course data with user's CourseUser enrollment record
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

/**
 * GET COURSE BY ID
 * GET /api/courses/:id
 * 
 * Fetches a single course with access control.
 * 
 * Access Control (via findCourseWithAccess):
 *   1. Is user the creator? → Allow access
 *   2. Is course public? → Auto-enroll user (create CourseUser)
 *   3. Is user already enrolled? → Allow access
 *   4. Otherwise → 403 Forbidden (private course, not owner, not enrolled)
 * 
 * Process:
 *   1. Validate course ID format
 *   2. Check access with findCourseWithAccess (implements logic above)
 *   3. Return merged course + course_user
 * 
 * Response: 200 OK
 *   - ...course: Full course object
 *   - course_user: {_id, is_star} - User's enrollment record
 * 
 * Error Cases:
 *   - 400 Bad Request: Invalid ObjectId format
 *   - 403 Forbidden: Private course, user not authorized
 *   - 404 Not Found: Course doesn't exist
 */
const getCourseById = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Validate ObjectId format
    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, error: "Invalid course id" });
    }

    // Check access control: owner? public? enrolled?
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

/**
 * UPDATE COURSE
 * PUT /api/courses/:id
 * 
 * Updates course metadata. Only creator can modify.
 * 
 * Request Body (partial update - only provide fields to change):
 *   - title (string, optional)
 *   - description (string, optional)
 *   - is_public (boolean, optional)
 * 
 * Process:
 *   1. Validate course ID format
 *   2. Fetch course by ID
 *   3. Check authorization: only creator can update
 *   4. Apply changes (only fields provided in request)
 *   5. Save and return updated course
 * 
 * Response: 200 OK
 *   - Updated course object
 * 
 * Error Cases:
 *   - 400 Bad Request: Invalid ObjectId format
 *   - 403 Forbidden: User is not the creator
 *   - 404 Not Found: Course doesn't exist
 */
const updateCourse = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, description, is_public } = req.body;

    // Validate ObjectId format
    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, error: "Invalid course id" });
    }

    // Fetch course
    const course = await Course.findById(id);
    if (!course) {
      return res.status(404).json({ success: false, error: "Course not found" });
    }

    // Authorization: Only creator can update
    if (course.creator.toString() !== req.user.id) {
      return res.status(403).json({ success: false, error: "Only creator can update this course" });
    }

    // Apply selective updates (only fields provided)
    if (title !== undefined) course.title = title;
    if (description !== undefined) course.description = description;
    if (is_public !== undefined) course.is_public = is_public;

    await course.save();

    return res.json({ success: true, data: course });
  } catch (error) {
    return next(error);
  }
};

/**
 * DELETE/REMOVE COURSE FROM LIBRARY
 * DELETE /api/courses/:id
 * 
 * Removes course from user's library (not a full course deletion).
 * Only deletes user-specific data, leaving course intact for other users.
 * 
 * Cascade Delete Process:
 *   1. Find CourseUser enrollment record
 *   2. Delete all VocabularyUser records (user's progress: is_memorized, is_star)
 *   3. Delete all CourseUserPractice sessions (user's practice history)
 *   4. Delete CourseUser record (enrollment)
 *   5. Course & Vocabulary data remain (shared resources)
 * 
 * Data Preservation:
 *   - Other users' progress is NOT affected
 *   - Course stays available for other enrolled users
 *   - Creator can delete course metadata separately if needed
 * 
 * Response: 200 OK
 *   - message: "Course removed from library successfully"
 * 
 * Error Cases:
 *   - 400 Bad Request: Invalid ObjectId format
 *   - 404 Not Found: Course not found or user not enrolled
 */
const deleteCourse = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Validate ObjectId format
    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, error: "Invalid course id" });
    }

    // Check if course exists
    const course = await Course.findById(id);
    if (!course) {
      return res.status(404).json({ success: false, error: "Course not found" });
    }

    // Find the CourseUser record linking this user to this course
    const courseUser = await CourseUser.findOne({ course: id, user: req.user.id });
    if (!courseUser) {
      return res.status(404).json({ success: false, error: "Course not found in library" });
    }

    // Cascade delete: Remove all user-specific data related to this course
    await Promise.all([
      // Delete user's vocabulary progress (is_memorized, is_star, etc.)
      VocabularyUser.deleteMany({ course_user: courseUser._id }),
      // Delete user's practice session records
      CourseUserPractice.deleteMany({ course_user: courseUser._id }),
      // Delete enrollment record itself
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

/**
 * TOGGLE COURSE STAR/FAVORITE
 * PATCH /api/courses/:id/star
 * 
 * Marks course as star/favorite or removes star status.
 * Starred courses appear at top of user's course list.
 * 
 * Request Body (optional):
 *   - is_star (boolean, optional)
 *     - If omitted: Toggle current star status
 *     - If true/false: Set to that value
 * 
 * Process:
 *   1. Validate course ID format
 *   2. Check access control (via findCourseWithAccess)
 *   3. Toggle or set is_star on CourseUser record
 *   4. Save and return updated CourseUser
 * 
 * Response: 200 OK
 *   - Updated CourseUser record with is_star value
 * 
 * Error Cases:
 *   - 400 Bad Request: Invalid ObjectId format
 *   - 403 Forbidden: User not authorized to access course
 *   - 404 Not Found: Course doesn't exist
 */
const updateCourseStar = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { is_star } = req.body;

    // Validate ObjectId format
    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, error: "Invalid course id" });
    }

    // Check access control and get CourseUser record
    const access = await findCourseWithAccess(id, req.user.id);
    if (access.error) {
      return res.status(access.error.status).json({ success: false, error: access.error.message });
    }

    const courseUser = access.courseUser;
    
    // Toggle or set star status
    if (is_star === undefined) {
      // No value provided: toggle current state
      courseUser.is_star = !courseUser.is_star;
    } else {
      // Value provided: set to that value
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

/**
 * SHARE COURSE - GENERATE SHARE CODE
 * POST /api/courses/:id/share
 * 
 * Generates a shareable code that other users can redeem to join course.
 * Only creator can generate share code.
 * 
 * Share Code Format:
 *   - Random alphanumeric suffix (6 chars from Math.random)
 *   - Timestamp suffix (36-base encoded, ensures uniqueness)
 *   - Example: "A3F2X9XYZ" (9 characters total)
 * 
 * Process:
 *   1. Validate course ID format
 *   2. Check authorization: only creator can share
 *   3. Generate share code if not already exists
 *   4. Return course_id, share_code, and shareable URL
 * 
 * Response: 200 OK
 *   - course_id: Course ID
 *   - share_code: The code to share with others
 *   - share_link: Pre-formatted share URL
 * 
 * Error Cases:
 *   - 400 Bad Request: Invalid ObjectId format
 *   - 403 Forbidden: User is not the creator
 *   - 404 Not Found: Course doesn't exist
 * 
 * Idempotent: Calling multiple times returns same code (reuse if exists)
 */
const shareCourse = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Validate ObjectId format
    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, error: "Invalid course id" });
    }

    // Fetch course
    const course = await Course.findById(id);
    if (!course) {
      return res.status(404).json({ success: false, error: "Course not found" });
    }

    // Authorization: Only creator can generate share code
    if (course.creator.toString() !== req.user.id) {
      return res.status(403).json({ success: false, error: "Only creator can share this course" });
    }

    // Generate share code if not already exists (idempotent)
    if (!course.share_code) {
      const generateShareCode = () => {
        // Combine random string + timestamp for unique code
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

/**
 * REDEEM SHARE CODE - JOIN COURSE
 * POST /api/courses/redeem
 * 
 * Allows user to join a course using a share code generated by creator.
 * Automatically enrolls user as a CourseUser after validation.
 * 
 * Request Body:
 *   - share_code (string, required): Code from shareCourse endpoint
 * 
 * Process:
 *   1. Validate share_code is provided
 *   2. Lookup Course by share_code (case-insensitive)
 *   3. Auto-enroll user via getOrCreateCourseUser
 *   4. Return course + course_user enrollment record
 * 
 * Flow:
 *   - Creator generates share_code via /share endpoint
 *   - Shares the code with others (manually or via link)
 *   - User redeems code → system creates CourseUser enrollment
 *   - User can now access course, create flashcard sessions, etc.
 * 
 * Response: 200 OK
 *   - ...course: Full course object
 *   - course_user: {_id, is_star} - New/existing enrollment record
 * 
 * Error Cases:
 *   - 400 Bad Request: share_code not provided
 *   - 404 Not Found: Invalid or non-existent share code
 * 
 * Idempotent: If user redeems same code multiple times, returns same CourseUser
 *            (unique constraint on {course, user} prevents duplicates)
 */
const redeemShareCode = async (req, res, next) => {
  try {
    const { share_code } = req.body;

    // Validate share_code is provided
    if (!share_code) {
      return res.status(400).json({ success: false, error: "share_code is required" });
    }

    // Look up course by share code (case-insensitive)
    const course = await Course.findOne({ share_code: share_code.trim().toUpperCase() });
    if (!course) {
      return res.status(404).json({ success: false, error: "Invalid share code" });
    }

    // Auto-enroll user (get or create CourseUser)
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
