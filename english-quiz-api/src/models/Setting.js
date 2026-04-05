const mongoose = require('mongoose');

const settingSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    theme: {
      type: String,
      enum: ['light', 'dark'],
      default: 'light',
    },
    front_side: {
      type: String,
      enum: ['term', 'definition'],
      default: 'term',
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model('Setting', settingSchema);
