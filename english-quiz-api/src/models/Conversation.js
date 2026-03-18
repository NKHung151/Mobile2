const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['user', 'assistant'],
    required: true
  },
  type: {
    type: String,
    enum: ['question', 'answer', 'evaluation', 'chat'],
    default: 'chat'
  },
  content: {
    type: String,
    required: true
  },
  question_number: {
    type: Number,
    default: null
  },
  score: {
    type: Number,
    default: null
  },
  max_score: {
    type: Number,
    default: null
  },
  is_correct: {
    type: Boolean,
    default: null
  },
  feedback: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

const conversationSchema = new mongoose.Schema({
  user_id: {
    type: String,
    required: true,
    index: true
  },
  topic_id: {
    type: String,
    required: true,
    index: true
  },
  mode: {
    type: String,
    enum: ['quiz', 'chat'],
    default: 'quiz'
  },
  current_question: {
    type: Number,
    default: 0
  },
  total_questions: {
    type: Number,
    default: 5
  },
  total_score: {
    type: Number,
    default: 0
  },
  max_possible_score: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['not_started', 'in_progress', 'completed'],
    default: 'not_started'
  },
  messages: [messageSchema]
}, {
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
});

conversationSchema.index({ user_id: 1, topic_id: 1, mode: 1 }, { unique: true });
conversationSchema.index({ updated_at: -1 });

conversationSchema.virtual('score_percentage').get(function() {
  if (this.max_possible_score === 0) return 0;
  return Math.round((this.total_score / this.max_possible_score) * 100);
});

conversationSchema.set('toJSON', { virtuals: true });
conversationSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Conversation', conversationSchema);
