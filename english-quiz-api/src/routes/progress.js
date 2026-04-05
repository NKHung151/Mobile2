const express = require('express');
const {
  updateCourseProgress,
  updateVocabularyMemorized,
} = require('../controllers/progressController');
const { authenticateToken } = require('../middleware/auth');
const { validate } = require('../middleware/validateRequest');

const router = express.Router();

router.use(authenticateToken);

// Update course learning status/progress
router.put(
  '/courses/:courseId',
  validate('progressCourseParams', 'params'),
  validate('progressCourseUpdate'),
  updateCourseProgress,
);

// Mark a vocabulary as started/memorized for current user
router.put(
  '/vocabularies/:vocabularyId',
  validate('progressVocabularyParams', 'params'),
  validate('progressVocabularyUpdate'),
  updateVocabularyMemorized,
);

module.exports = router;
