const express = require('express');
const {
  createCourse,
  getCourses,
  getCourseById,
  updateCourse,
  deleteCourse,
} = require('../controllers/courseController');
const { authenticateToken } = require('../middleware/auth');
const { validate } = require('../middleware/validateRequest');

const router = express.Router();

router.use(authenticateToken);

router.post('/', validate('courseCreate'), createCourse);
router.get('/', getCourses);
router.get('/:id', validate('courseParams', 'params'), getCourseById);
router.put('/:id', validate('courseParams', 'params'), validate('courseUpdate'), updateCourse);
router.delete('/:id', validate('courseParams', 'params'), deleteCourse);

module.exports = router;
