const mongoose = require("mongoose");

/**
 * VOCABULARY MODEL - Mô hình từ vựng trong khóa học
 *
 * Mục đích: Lưu trữ các cặp từ vựng (term + definition) với hỗ trợ hình ảnh và multilingual
 *
 * Mối quan hệ:
 * - Một khóa học (Course) có nhiều từ vựng (Vocabulary)
 * - Mỗi từ vựng được theo dõi tiến độ riêng cho từng người dùng qua VocabularyUser
 *
 * Sử dụng trong Focus Mode (flashcard learning):
 * - term: Hiển thị trên mặt trước của flashcard
 * - definition: Hiển thị trên mặt sau khi người dùng lật thẻ
 * - Hỗ trợ audio qua Google TTS với term_language_code và definition_language_code
 */
const vocabularySchema = new mongoose.Schema(
  {
    /**
     * course: ObjectId - Khóa học chứa từ vựng này
     * - Required: Bắt buộc (mỗi vocabulary phải thuộc 1 course)
     * - Indexed: Để tối ưu query getCourseVocabularies()
     * - Reference: Tham chiếu đến Course model
     */
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
      index: true,
    },

    /**
     * term: String - Từ cần học (thường là tiếng Anh)
     * - Required: Bắt buộc
     * - maxlength: 200 ký tự (đủ cho hầu hết từ vựng)
     * - trim: Loại bỏ khoảng trắng đầu/cuối
     * - Hiển thị trên mặt trước flashcard khi frontLanguage === "english"
     */
    term: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },

    /**
     * definition: String - Định nghĩa hoặc dịch nghĩa (thường là tiếng Việt)
     * - Required: Bắt buộc
     * - maxlength: 2000 ký tự (cho phép mô tả chi tiết)
     * - trim: Loại bỏ khoảng trắng đầu/cuối
     * - Hiển thị trên mặt sau khi lật flashcard
     */
    definition: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },

    /**
     * term_image_url: String - URL hình ảnh minh họa cho từ vựng
     * - Optional: Có thể để trống (default: "")
     * - Được hiển thị trên mặt trước flashcard nếu có
     * - Hỗ trợ bất kỳ host nào có HTTPS
     * - Dùng để giúp người dùng ghi nhớ tốt hơn thông qua hình ảnh
     */
    term_image_url: {
      type: String,
      default: "",
      trim: true,
      maxlength: 1000,
    },

    /**
     * def_image_url: String - URL hình ảnh minh họa cho định nghĩa
     * - Optional: Có thể để trống (default: "")
     * - Được hiển thị trên mặt sau flashcard nếu có
     * - Giúp minh họa ý nghĩa của từ vựng bằng hình ảnh
     */
    def_image_url: {
      type: String,
      default: "",
      trim: true,
      maxlength: 1000,
    },

    /**
     * term_language_code: String - Mã ngôn ngữ cho term (cho Google TTS)
     * - Default: "vi" (Tiếng Việt)
     * - Ví dụ: "en" (English), "vi" (Vietnamese), "fr" (Français)
     * - Sử dụng cho generateGoogleTTSUrl() để phát âm thanh đúng
     * - Cho phép từ vựng mixed-language (ví dụ: term tiếng Anh, definition tiếng Việt)
     */
    term_language_code: {
      type: String,
      default: "vi",
      trim: true,
      maxlength: 10,
    },

    /**
     * definition_language_code: String - Mã ngôn ngữ cho definition (cho Google TTS)
     * - Default: "vi" (Tiếng Việt)
     * - Ví dụ: "en", "vi", "fr"
     * - Sử dụng cho generateGoogleTTSUrl() để phát âm thanh định nghĩa
     */
    definition_language_code: {
      type: String,
      default: "vi",
      trim: true,
      maxlength: 10,
    },
  },
  {
    timestamps: true, // Tự động thêm createdAt và updatedAt
  },
);

module.exports = mongoose.model("Vocabulary", vocabularySchema);
