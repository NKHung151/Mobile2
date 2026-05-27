const mongoose = require("mongoose");

/**
 * COURSE USER MODEL - Theo dõi enrollment & quyền truy cập
 *
 * Mục đích:
 * - Lưu trữ mối quan hệ giữa User và Course
 * - Theo dõi dữ liệu cấp user-course (ví dụ: is_star)
 * - Dùng cho access control (có phải chủ? đã đăng ký?)
 *
 * Mối quan hệ:
 * - User -> nhiều CourseUser -> nhiều Courses
 * - Mỗi user chỉ có 1 enrollment record per course (unique constraint)
 *
 * Sử dụng trong Focus Mode:
 * - Check permission trước khi xem vocabularies
 * - Auto-create nếu public course + user mới
 * - Dùng làm foreign key cho VocabularyUser
 */
const courseUserSchema = new mongoose.Schema(
  {
    /**
     * course: ObjectId - Khóa học
     * - Required: Bắt buộc
     * - Indexed: Tối ưu query tìm courses của user
     */
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
      index: true,
    },

    /**
     * user: ObjectId - Người dùng
     * - Required: Bắt buộc
     * - Indexed: Tối ưu query tìm users của course
     */
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    /**
     * is_star: Boolean - Người dùng đã đánh dấu "Yêu thích" course này?
     * - Default: false (chưa đánh dấu)
     * - Indexed: Tối ưu query lọc courses yêu thích
     * - Hiển thị ở Library Screen (Courses bạn thích)
     */
    is_star: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true, // createdAt, updatedAt
  },
);

/**
 * UNIQUE CONSTRAINT: {course: 1, user: 1}
 *
 * Nguyên nhân:
 * - Mỗi user chỉ có thể enroll 1 lần per course
 * - Ngăn chặn duplicate enrollment
 * - Tự động enforce ở database level
 *
 * Ví dụ:
 * ✅ [User1, Course1] - OK
 * ✅ [User1, Course2] - OK
 * ✅ [User2, Course1] - OK
 * ❌ [User1, Course1] - DUPLICATE ERROR!
 */
courseUserSchema.index({ course: 1, user: 1 }, { unique: true });

module.exports = mongoose.model("CourseUser", courseUserSchema);
