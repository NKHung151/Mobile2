const mongoose = require("mongoose");

const sessionAnswerSchema = new mongoose.Schema(
  {
    session_id: {
      type: String, // ID của phiên học chứa câu trả lời này
      required: true,
      index: true,
    },
    user_id: {
      type: String, // ID người học sở hữu phiên và câu trả lời
      required: true,
      index: true,
    },
    question_id: {
      type: String, // ID định danh của câu hỏi gốc
      required: true,
    },
    question_text: {
      type: String, // Nội dung/văn bản câu hỏi (để hiển thị trực quan khi xem lại bài)
    },
    question_type: {
      type: String, // Kiểu câu hỏi học tập (quiz, fill_in_blank, listening, homophone_groups...)
      enum: ["quiz", "multiple_choice", "fill_in_blank", "fillup", "listening", "homophone_groups", "error_detection", "reorder"],
      default: "quiz",
    },
    // Câu trả lời của người dùng
    user_answer: {
      type: String, // Văn bản đáp án do học viên lựa chọn hoặc điền vào
      required: true,
    },
    // Đáp án chính xác
    correct_answer: {
      type: Object, // Đáp án chính xác của câu hỏi (chuỗi hoặc object lưu trữ thông tin đáp án chuẩn)
      required: true,
    },
    // Chi tiết kết quả làm bài
    is_correct: {
      type: Boolean, // Đánh giá kết quả làm bài của học viên (true = đúng, false = sai)
      required: true,
    },
    explanation: String, // Lời giải thích/dịch nghĩa của câu hỏi
    // Các phương án lựa chọn (cho câu hỏi trắc nghiệm)
    options: [String], // Danh sách hiển thị các phương án để học viên chọn lựa
    // Thời gian trả lời
    time_spent_seconds: {
      type: Number, // Số giây học viên tiêu tốn để trả lời câu hỏi này
      default: 0,
    },
    // Siêu dữ liệu liên kết nguồn
    source_id: String, // ID liên kết nguồn dữ liệu gốc (ví dụ: homophone_group_id, quiz_id)
    source_type: String, // Loại nguồn dữ liệu ('quiz', 'homophone_groups', 'question_response')
    // Số thứ tự của câu hỏi trong phiên học
    question_number: {
      type: Number, // Thứ tự câu hỏi trong phiên (phục vụ sắp xếp hiển thị khi review)
      default: 0,
    },
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  }
);

// Indexes for efficient queries
sessionAnswerSchema.index({ session_id: 1, user_id: 1 });
sessionAnswerSchema.index({ user_id: 1, created_at: -1 });
sessionAnswerSchema.index({ session_id: 1 });

module.exports = mongoose.model("SessionAnswer", sessionAnswerSchema, "session_answers");
