const mongoose = require("mongoose");

/**
 * Schema đại diện cho thông tin các video bài học tiếng Anh.
 * CSDL MongoDB sẽ lưu trữ videoId và youtubeId để hiển thị và phát video thông qua Youtube Player API.
 */
const videoSchema = new mongoose.Schema(
  {
    // ID của video phục vụ cho frontend (có thể trùng hoặc dùng làm định danh logic)
    videoId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true
    },
    // YouTube ID chính thức của video (dùng để phát qua player và tạo ảnh thumbnail)
    youtubeId: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    // Tiêu đề của video bài học
    title: {
      type: String,
      required: true,
      trim: true
    },
    // Phân loại danh mục bài học (ví dụ: Grammar, Vocabulary, Ielts/Toeic)
    category: {
      type: String,
      required: true,
      enum: ["Grammar", "Vocabulary", "Ielts/Toeic"],
      trim: true
    },
    // Mô tả chi tiết về nội dung hoặc mục tiêu bài học của video
    description: {
      type: String,
      trim: true,
      default: ""
    }
  },
  {
    // Tự động tạo các trường created_at và updated_at
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at"
    }
  }
);

// Xuất model Video để sử dụng ở các lớp Controller và Route
module.exports = mongoose.model("Video", videoSchema);
