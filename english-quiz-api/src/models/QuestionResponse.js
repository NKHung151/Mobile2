const mongoose = require('mongoose');

const questionResponseSchema = new mongoose.Schema({
  audioUrl: {
    type: String, // Đường dẫn URL lưu trữ file âm thanh của câu hỏi TOEIC Part 2
    required: true
  },
  content: {
    transcript: {
      type: String, // Văn bản kịch bản gốc của câu hỏi tiếng Anh
      required: true
    },
    translation: {
      type: String, // Nghĩa tiếng Việt tương ứng của kịch bản câu hỏi
      default: ''
    }
  },
  options: [{
    text: {
      type: String, // Nội dung văn bản tiếng Anh của phương án trả lời (A, B hoặc C)
      required: true
    },
    translation: {
      type: String, // Bản dịch tiếng Việt tương ứng của phương án
      default: ''
    },
    isCorrect: {
      type: Boolean, // Cờ đánh dấu phương án này có phải là đáp án đúng duy nhất hay không
      default: false
    }
  }]
});

// Hàm middleware kiểm định trước khi lưu: Đảm bảo mỗi câu hỏi có duy nhất 1 đáp án đúng
questionResponseSchema.pre('save', function(next) {
  const correctCount = this.options.filter(opt => opt.isCorrect).length;
  if (correctCount !== 1) {
    throw new Error('Each question must have exactly one correct answer');
  }
  next();
});

module.exports = mongoose.model('QuestionResponse', questionResponseSchema, 'question_responses');
