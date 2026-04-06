const mongoose = require('mongoose');

const homophoneGroupSchema = new mongoose.Schema({
  _id: {
    type: String, // e.g. "then_den_ten_than"
    required: true
  },
  words: {
    type: [String],
    required: true,
    validate: v => v.length >= 2
  },
  phonetics: {
    type: [String],
    default: []
  },
  category: {
    type: String,
    default: null // e.g. "voiced-unvoiced", "vowel-length"
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'medium'
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

module.exports = mongoose.model('HomophoneGroup', homophoneGroupSchema, 'homophone_groups');
