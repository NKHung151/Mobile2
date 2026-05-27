const mongoose = require("mongoose");

/**
 * VOCABULARY USER MODEL - Theo dõi tiến độ học từng từ vựng
 *
 * Mục đích:
 * - Lưu trữ trạng thái học tập của user cho từng từ vựng
 * - Theo dõi: người dùng đã ghi nhớ chưa? đã đánh dấu yêu thích chưa?
 * - Dùng trong Focus Mode để hiển thị trạng thái từng thẻ
 *
 * Mối quan hệ:
 * - CourseUser (1) → VocabularyUser (nhiều)
 * - Vocabulary (1) → VocabularyUser (nhiều)
 * - Combine: (Vocabulary, CourseUser) = unique pair
 *
 * Ví dụ:
 * - User1 đã ghi nhớ "apple" trong Course1? → VocabularyUser{is_memorized: true}
 * - User2 chưa ghi nhớ "apple" nhưng yêu thích? → VocabularyUser{is_memorized: false, is_star: true}
 * - User3 chưa có record cho "apple" → Auto-create on first interaction
 */
const vocabularyUserSchema = new mongoose.Schema(
  {
    /**
     * vocabulary: ObjectId - Từ vựng
     * - Required: Bắt buộc
     * - Index: Tối ưu query tìm records của 1 từ
     * - Reference: Tham chiếu Vocabulary model
     */
    vocabulary: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vocabulary",
      required: true,
      index: true,
    },

    /**
     * course_user: ObjectId - Enrollment record của user
     * - Required: Bắt buộc
     * - Index: Tối ưu query lấy progress của user
     * - Dùng để: getCourseVocabularies query (get all progress for this enrollment)
     * - Foreign Key: Tham chiếu CourseUser model
     *
     * Tại sao không trực tiếp dùng user_id?
     * - Vì cần phân biệt user's progress PER COURSE
     * - Example: User1 ghi nhớ "apple" trong Course1, nhưng không ghi nhớ trong Course2
     * - Dùng course_user làm khóa = đúng scope
     */
    course_user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CourseUser",
      required: true,
      index: true,
    },

    /**
     * is_memorized: Boolean - Người dùng đã ghi nhớ từ này chưa?
     * - Default: false (chưa đánh dấu)
     * - Toggleable: User click nút "Đã ghi nhớ" trong Focus Mode
     * - Indexed: Tối ưu query lọc từ chưa ghi nhớ
     *
     * Tính toán Progress:
     * - progress% = (count memorized / total) * 100
     * - unmemorized_count = count(!is_memorized)
     *
     * Hiển thị trong Focus Mode:
     * - Icon checkmark nếu is_memorized = true
     * - Icon ellipse nếu is_memorized = false
     */
    is_memorized: {
      type: Boolean,
      default: false,
      index: true,
    },

    /**
     * is_star: Boolean - Người dùng đánh dấu từ này yêu thích chưa?
     * - Default: false (chưa đánh dấu)
     * - Toggleable: User click star icon trong Focus Mode
     * - Indexed: Tối ưu query lọc từ yêu thích
     *
     * Sử dụng:
     * - Hiển thị trong Focus Mode: star icon (vàng nếu is_star=true)
     * - Có thể filter "Chỉ xem từ yêu thích" (future feature)
     * - Không ảnh hưởng progress%, chỉ là bookmark
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
 * UNIQUE CONSTRAINT: {vocabulary: 1, course_user: 1}
 *
 * Nguyên nhân:
 * - Mỗi user chỉ track 1 record PER vocabulary PER course
 * - Ngăn chặn duplicate progress tracking
 * - Tự động enforce ở database level
 *
 * Ví dụ:
 * ✅ [Vocab1, CourseUser1(User1->Course1)] - OK
 * ✅ [Vocab1, CourseUser2(User2->Course1)] - OK (User2 có record riêng)
 * ✅ [Vocab1, CourseUser3(User1->Course2)] - OK (khác course)
 * ❌ [Vocab1, CourseUser1] twice - DUPLICATE ERROR!
 */
vocabularyUserSchema.index({ vocabulary: 1, course_user: 1 }, { unique: true });

module.exports = mongoose.model("VocabularyUser", vocabularyUserSchema);
