const mongoose = require("mongoose");

/**
 * COURSE USER PRACTICE MODEL - Theo dõi phiên học (session)
 *
 * Mục đích:
 * - Lưu trữ từng phiên học (practice session) của user trong 1 khóa học
 * - Theo dõi: thời gian học, tiến độ, số từ chưa ghi nhớ, trạng thái
 * - Dùng để: Hiển thị lịch sử học, statistics, resume session
 *
 * Mối quan hệ:
 * - CourseUser (1) → CourseUserPractice (nhiều)
 * - Mỗi lần user vào Focus Mode = 1 practice session
 *
 * Ví dụ Timeline:
 * - 2025-05-27 10:00: User vào Focus Mode → Tạo session (status: in_progress)
 * - 2025-05-27 10:15: User đánh dấu từ → Update progress, unmemorized_count
 * - 2025-05-27 10:30: User xem hết → Update status: completed
 * - 2025-05-27 10:30: User thoát → Set finished_at, is_finished: true
 */
const courseUserPracticeSchema = new mongoose.Schema(
  {
    /**
     * course_user: ObjectId - Mối quan hệ user-course
     * - Required: Bắt buộc (session phải thuộc user + course cụ thể)
     * - Index: Tối ưu query lấy sessions của user trong course
     * - Reference: Tham chiếu CourseUser model
     *
     * Query example:
     * - GET /history → Find all CourseUserPractice of user
     * - Filter by course_user._id
     */
    course_user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CourseUser",
      required: true,
      index: true,
    },

    /**
     * unmemorized_count: Number - Số từ vựng chưa ghi nhớ
     * - Default: 0 (bắt đầu với 0)
     * - Min: 0 (không thể âm)
     * - Indexed: Tối ưu filter "có bao nhiêu từ chưa ghi nhớ"
     *
     * Cách tính:
     * - Khi init: unmemorized_count = total_vocabularies
     * - Khi mark: unmemorized_count = count(!is_memorized)
     * - Tính mỗi lần syncProgress()
     *
     * Hiển thị:
     * - "Còn 7 từ chưa ghi nhớ"
     * - "Đã ghi nhớ 3/10"
     */
    unmemorized_count: {
      type: Number,
      min: 0,
      default: 0,
      index: true,
    },

    /**
     * progress: Number - Tiến độ session (%)
     * - Default: 0
     * - Range: 0-100 (%)
     * - Min: 0 (không thể âm)
     *
     * Cách tính:
     * - progress = ((currentSlideIndex + 1) / total) * 100
     * - Example: 3/10 cards viewed = 30%
     * - Không phụ thuộc vào memorized count, chỉ phụ thuộc xem mấy thẻ
     *
     * Update:
     * - Mỗi lần navigate (next/prev)
     * - Mỗi lần toggle memorized/star
     * - Mỗi lần thoát
     */
    progress: {
      type: Number,
      default: 0,
      min: 0,
    },

    /**
     * status: String - Trạng thái phiên học
     * - Enum: ["completed", "in_progress"]
     * - Default: "in_progress" (bắt đầu learning)
     * - Indexed: Tối ưu filter sessions đang học vs hoàn thành
     *
     * Chuyển đổi:
     * - "in_progress" → "completed" khi user xem hết tất cả cards
     *   (Điều kiện: currentSlideIndex >= total - 1)
     * - Không bao giờ quay lại "in_progress"
     *
     * Query:
     * - GET /courses/:id/stats → Filter status = completed
     * - GET /library → Show ongoing sessions (status = in_progress)
     */
    status: {
      type: String,
      enum: ["completed", "in_progress"],
      default: "in_progress",
      index: true,
    },

    /**
     * started_at: Date - Thời điểm bắt đầu phiên
     * - Default: Date.now (thời hiện tại)
     * - Indexed: Tối ưu sort (recent first)
     *
     * Sử dụng:
     * - Hiển thị "Học từ 10:00 AM"
     * - Tính duration = finished_at - started_at
     * - Sort theo thời gian để hiển thị lịch sử
     */
    started_at: {
      type: Date,
      default: Date.now,
    },

    /**
     * finished_at: Date - Thời điểm kết thúc phiên
     * - Default: null (chưa kết thúc)
     * - Set khi: User xem hết hoặc thoát khỏi Focus Mode
     * - Nullable: Nếu session bị abort, có thể null
     *
     * Sử dụng:
     * - Hiển thị "Học đến 10:30 AM"
     * - Tính learning time = finished_at - started_at
     * - Filter unfinished sessions (finished_at = null)
     */
    finished_at: {
      type: Date,
      default: null,
    },

    /**
     * is_finished: Boolean - Phiên đã kết thúc chưa?
     * - Default: false (chưa kết thúc)
     * - Indexed: Tối ưu filter sessions đang active
     * - Set true khi: User click close in Focus Mode
     *
     * Khác với status:
     * - status: "in_progress" vs "completed" (dựa xem hết cards không)
     * - is_finished: User click close button (explicit finish)
     * - Example: Có thể is_finished=false nhưng status=completed (xem hết nhưng chưa close)
     *
     * Query:
     * - GET /courses/:id/active → Find sessions with is_finished = false
     * - Để resume nếu user quay lại
     */
    is_finished: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true, // createdAt, updatedAt (tự động)
  },
);

/**
 * INDEX: {course_user: 1, started_at: -1}
 *
 * Mục đích: Tối ưu query lấy sessions gần nhất của user
 *
 * Query example:
 * - GET /history?course_user=X
 *   → Find by course_user, Sort by started_at DESC (newest first)
 * - Trả về: [Session3(10:30), Session2(10:00), Session1(09:30)]
 */
courseUserPracticeSchema.index({ course_user: 1, started_at: -1 });

/**
 * INDEX: {course_user: 1, is_finished: 1, started_at: -1}
 *
 * Mục đích: Tối ưu query lấy sessions đang active (chưa finish)
 *
 * Query example:
 * - GET /courses/:id/active → Find by course_user, is_finished=false, sorted by time
 * - Sử dụng: Resume session feature
 */
courseUserPracticeSchema.index({ course_user: 1, is_finished: 1, started_at: -1 });

module.exports = mongoose.model("CourseUserPractice", courseUserPracticeSchema);
