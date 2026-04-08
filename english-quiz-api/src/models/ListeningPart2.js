const mongoose = require('mongoose');

const listeningPart2Schema = new mongoose.Schema({
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
listeningPart2Schema.pre('save', function(next) {
  const correctCount = this.options.filter(opt => opt.isCorrect).length;
  if (correctCount !== 1) {
    throw new Error('Each question must have exactly one correct answer');
  }
  next();
});

module.exports = mongoose.model('ListeningPart2', listeningPart2Schema, 'question_responses');
