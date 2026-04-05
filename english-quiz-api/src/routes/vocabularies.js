const express = require('express');
const {
  getCourseVocabularies,
  createVocabulary,
  updateVocabulary,
  deleteVocabulary,
} = require('../controllers/vocabularyController');
const { authenticateToken } = require('../middleware/auth');
const { validate } = require('../middleware/validateRequest');

const router = express.Router();

router.use(authenticateToken);

router.get('/courses/:courseId/vocabularies', validate('vocabularyCourseParams', 'params'), getCourseVocabularies);
router.post(
  '/courses/:courseId/vocabularies',
  validate('vocabularyCourseParams', 'params'),
  validate('vocabularyCreate'),
  createVocabulary,
);
router.put(
  '/courses/:courseId/vocabularies/:vocabularyId',
  validate('vocabularyParams', 'params'),
  validate('vocabularyUpdate'),
  updateVocabulary,
);
router.delete(
  '/courses/:courseId/vocabularies/:vocabularyId',
  validate('vocabularyParams', 'params'),
  deleteVocabulary,
);

module.exports = router;
