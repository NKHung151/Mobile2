const mongoose = require("mongoose");

const learningSessionSchema = new mongoose.Schema(
  {
    session_id: {
      type: String, // ID định danh duy nhất của phiên học tập
      required: true,
      unique: true,
      index: true,
    },
    user_id: {
      type: String, // ID người học sở hữu phiên học này
      required: true,
      index: true,
    },
    topic_id: {
      type: String, // ID của chủ đề học tập tương ứng
      required: true,
      index: true,
    },
    topic_title: {
      type: String, // Tiêu đề của chủ đề học tập
      required: true,
    },
    mode: {
      type: String, // Chế độ/phân hệ học (quiz, chat, homophone_groups, question_response, practice)
      enum: ["quiz", "chat", "homophone_groups", "question_response", "practice"],
      required: true,
    },
    status: {
      type: String, // Trạng thái của phiên học ('started', 'in_progress', 'completed', 'abandoned')
      enum: ["started", "in_progress", "completed", "abandoned"],
      default: "started",
    },
    // Các trường dữ liệu hiệu suất học tập
    total_questions: {
      type: Number, // Tổng số câu hỏi dự kiến của phiên học
      default: 0,
    },
    questions_answered: {
      type: Number, // Số câu hỏi học viên thực tế đã làm
      default: 0,
    },
    correct_answers: {
      type: Number, // Số câu hỏi trả lời chính xác
      default: 0,
    },
    incorrect_answers: {
      type: Number, // Số câu hỏi trả lời sai
      default: 0,
    },
    total_score: {
      type: Number, // Tổng số điểm đạt được
      default: 0,
    },
    max_score: {
      type: Number, // Điểm số tối đa có thể đạt được
      default: 0,
    },
    accuracy_percentage: {
      type: Number, // Tỷ lệ chính xác của bài làm (đơn vị %)
      default: 0,
    },
    // Theo dõi thời gian
    start_time: {
      type: Date, // Thời điểm bắt đầu phiên học tập
      default: Date.now,
    },
    end_time: {
      type: Date, // Thời điểm kết thúc phiên học
      default: null,
    },
    duration_minutes: {
      type: Number, // Thời gian làm bài tính bằng phút (tính tự động tại pre-save hook)
      default: 0,
    },
    // Chỉ số tương tác chi tiết
    time_per_question_seconds: {
      type: Number, // Thời gian trả lời trung bình của một câu hỏi (giây)
      default: 0,
    },
    completion_percentage: {
      type: Number, // Tỷ lệ hoàn thành phiên học (%)
      default: 0,
    },
    // Chi tiết bổ sung
    messages_exchanged: {
      type: Number, // Số tin nhắn đã gửi nhận (dùng trong chế độ chat/AI)
      default: 0,
    },
    learning_tags: [String], // Nhãn tag phục vụ gợi ý ôn tập
    difficulties_encountered: [String], // Ghi nhận lỗi/khó khăn người dùng gặp phải
    // Siêu dữ liệu hệ thống
    device_type: String, // Loại thiết bị truy cập (ios, android, web)
    ip_address: String, // Địa chỉ IP máy khách truy cập
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  },
);

// Indexes for common queries
learningSessionSchema.index({ user_id: 1, created_at: -1 });
learningSessionSchema.index({ user_id: 1, topic_id: 1 });
learningSessionSchema.index({ user_id: 1, status: 1 });
learningSessionSchema.index({ created_at: -1 });

// Calculate duration before saving
learningSessionSchema.pre("save", function (next) {
  if (this.end_time && this.start_time) {
    const durationMs = this.end_time - this.start_time;
    this.duration_minutes = Math.round(durationMs / 1000 / 60);
  }
  next();
});

// Virtual for completion status
learningSessionSchema.virtual("is_completed").get(function () {
  return this.status === "completed";
});

learningSessionSchema.virtual("score_percentage").get(function () {
  if (this.max_score === 0) return 0;
  return Math.round((this.total_score / this.max_score) * 100);
});

learningSessionSchema.set("toJSON", { virtuals: true });
learningSessionSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("LearningHistory", learningSessionSchema);
