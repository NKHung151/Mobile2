const mongoose = require('mongoose');

const chunkSchema = new mongoose.Schema({
  topic_id: {
    type: String,
    required: true,
    index: true
  },
  file_name: {
    type: String,
    required: true
  },
  chunk_index: {
    type: Number,
    required: true
  },
  content: {
    type: String,
    required: true
  },
  embedding: {
    type: [Number],
    required: true
  }
}, {
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
});

chunkSchema.index({ topic_id: 1, chunk_index: 1 });

module.exports = mongoose.model('Chunk', chunkSchema);
