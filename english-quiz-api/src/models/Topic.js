const mongoose = require('mongoose');

const topicSchema = new mongoose.Schema({
  topic_id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  title: {
    type: String,
    required: true
  },
  file_count: {
    type: Number,
    default: 0
  },
  total_chunks: {
    type: Number,
    default: 0
  },
  metadata: {
    difficulty: String,
    duration: String,
    tags: [String]
  }
}, {
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
});

module.exports = mongoose.model('Topic', topicSchema);
