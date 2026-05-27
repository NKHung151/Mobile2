const mongoose = require('mongoose');

const homophoneGroupSchema = new mongoose.Schema({
  _id: {
    type: String, // ID định danh duy nhất của nhóm từ đồng âm, ví dụ: "then_den_ten_than"
    required: true
  },
  words: {
    type: [String], // Danh sách các từ đồng âm/gần âm cạnh tranh trong nhóm
    required: true,
    validate: v => v.length >= 2
  },
  phonetics: {
    type: [String], // Danh sách phiên âm IPA tương ứng của các từ
    default: []
  },
  meanings: {
    type: [String], // Định nghĩa nghĩa tiếng Việt tương ứng, có thứ tự song song với words[]
    default: []
  },
  category: {
    type: String, // Danh mục phân loại phát âm (e.g. "voiced-unvoiced", "vowel-length")
    default: null
  },
  difficulty: {
    type: String, // Độ khó của nhóm từ ('easy', 'medium', 'hard')
    enum: ['easy', 'medium', 'hard'],
    default: 'medium'
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } // Tự động quản lý trường thời gian tạo và cập nhật
});

module.exports = mongoose.model('HomophoneGroup', homophoneGroupSchema, 'homophone_groups');
