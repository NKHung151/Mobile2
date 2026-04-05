const express = require("express");
const { createCoursePractice, getLatestCoursePractice, updateCourseProgress, updateVocabularyMemorized, getPracticeHistory } = require("../controllers/progressController");
const { authenticateToken } = require("../middleware/auth");
const { validate } = require("../middleware/validateRequest");

const router = express.Router();

router.use(authenticateToken);

router.post("/courses/:courseId/practices", validate("progressCourseParams", "params"), validate("progressPracticeCreate"), createCoursePractice);

router.get("/courses/:courseId/latest", validate("progressCourseParams", "params"), getLatestCoursePractice);

// Get all practice history for the current user
router.get("/history", getPracticeHistory);

// Update course learning status/progress
router.put("/courses/:courseId", validate("progressCourseParams", "params"), validate("progressCourseUpdate"), updateCourseProgress);

// Mark a vocabulary as started/memorized for current user
router.put("/vocabularies/:vocabularyId", validate("progressVocabularyParams", "params"), validate("progressVocabularyUpdate"), updateVocabularyMemorized);

module.exports = router;
