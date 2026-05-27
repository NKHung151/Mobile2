const Course = require("../models/Course");
const CourseUser = require("../models/CourseUser");

/**
 * TÌM KHÓA HỌC & KIỂM TRA QUYỀN TRUY CẬP
 *
 * Endpoint: Được gọi từ vocabularyController (getCourseVocabularies)
 *
 * Mục đích:
 * - Kiểm tra user có quyền truy cập course không
 * - Auto-create CourseUser nếu public course + user mới
 * - Trả về course + quyền + enrollment record
 *
 * Logic Quyền Truy Cập:
 * 1. Nếu user = creator → ✅ Allow (can always access own course)
 * 2. Nếu course is_public = false (private) → ❌ Deny (chỉ creator)
 * 3. Nếu user chưa enrolled → Auto-create enrollment
 * 4. Trả về course + isOwner flag + courseUser record
 *
 * Ứng dụng trong Focus Mode:
 * - Check trước khi load vocabularies
 * - Auto-enroll user nếu là public course
 * - Dùng courseUser._id làm key để query VocabularyUser
 *
 * @param {ObjectId} courseId - ID khóa học cần check
 * @param {ObjectId} userId - ID người dùng hiện tại
 * @returns {Object} {course, isOwner, courseUser} hoặc {error}
 * @throws {404} Course not found
 * @throws {403} Access denied (private course + not owner)
 *
 * Ví dụ:
 * - Public course, user mới → ✅ Auto-create enrollment, return course
 * - Public course, user cũ → ✅ Return existing enrollment
 * - Private course, creator → ✅ Return course
 * - Private course, other user → ❌ 403 Forbidden
 */
async function findCourseWithAccess(courseId, userId) {
  // ========== BƯỚC 1: Tìm course ==========
  const course = await Course.findById(courseId);
  if (!course) {
    return { error: { status: 404, message: "Course not found" } };
  }

  // ========== BƯỚC 2: Kiểm tra creator ==========
  const isOwner = course.creator.toString() === userId;

  // ========== BƯỚC 3: Tìm enrollment ==========
  // Query: Tìm CourseUser của user này trong course này
  let courseUser = await CourseUser.findOne({ course: courseId, user: userId });

  // ========== BƯỚC 4: Kiểm tra quyền & auto-create ==========
  // Nếu:
  // - Không phải owner VÀ
  // - Course private (is_public = false) VÀ
  // - Chưa enrolled
  // → ❌ Deny access
  if (!isOwner && !course.is_public && !courseUser) {
    return { error: { status: 403, message: "You cannot access this course" } };
  }

  // ========== BƯỚC 5: Auto-create CourseUser nếu cần ==========
  // Nếu:
  // - Chưa có enrollment VÀ
  // - (Là owner HOẶC course public) [thỏa điều kiện trên nên là public]
  // → Auto-create enrollment để user có thể track progress
  if (!courseUser) {
    courseUser = await CourseUser.create({
      course: courseId,
      user: userId,
      is_star: false, // Mặc định: chưa đánh dấu yêu thích
    });
  }

  return { course, isOwner, courseUser };
}

/**
 * LẤY HOẶC TẠO COURSE USER
 *
 * Mục đích:
 * - Đơn giản hơn findCourseWithAccess
 * - Chỉ lấy/tạo enrollment, không kiểm tra quyền
 * - Dùng cho: Endpoints không cần kiểm tra permission
 *
 * Logic:
 * 1. Tìm CourseUser của user trong course
 * 2. Nếu không tồn tại → Tạo mới
 * 3. Trả về courseUser
 *
 * @param {ObjectId} courseId - ID khóa học
 * @param {ObjectId} userId - ID người dùng
 * @returns {Object} CourseUser document (tồn tại hoặc vừa tạo)
 *
 * Khác với findCourseWithAccess:
 * - Không kiểm tra quyền truy cập
 * - Không kiểm tra is_public
 * - Chỉ đơn thuần lấy/tạo enrollment
 * - Dùng khi chắc user có quyền rồi
 *
 * Ví dụ sử dụng:
 * - Sau khi gọi getCourseById (đã check quyền)
 * - Bây giờ chỉ cần auto-create CourseUser nếu cần
 * - Rồi proceed với business logic
 */
async function getOrCreateCourseUser(courseId, userId) {
  // Tìm enrollment
  let courseUser = await CourseUser.findOne({ course: courseId, user: userId });

  // Nếu không tồn tại → Tạo mới
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
