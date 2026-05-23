const mongoose = require('mongoose');

const questionResponseSchema = new mongoose.Schema({
  audioUrl: {
    type: String,
    required: true
  },
  content: {
    transcript: {
      type: String,
      required: true
    },
    translation: {
      type: String,
      default: ''
    }
  },
  options: [{
    text: {
      type: String,
      required: true
    },
    translation: {
      type: String,
      default: ''
    },
    isCorrect: {
      type: Boolean,
      default: false
    }
  }]
});

// Validate exactly one correct answer per question
questionResponseSchema.pre('save', function(next) {
  const correctCount = this.options.filter(opt => opt.isCorrect).length;
  if (correctCount !== 1) {
    throw new Error('Each question must have exactly one correct answer');
  }
  next();
});

module.exports = mongoose.model('QuestionResponse', questionResponseSchema, 'question_responses');
