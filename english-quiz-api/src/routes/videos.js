const express = require("express");
const router = express.Router();
const videoController = require("../controllers/videoController");

/**
 * Định nghĩa các API route cho đối tượng Video bài học.
 */

// Route lấy danh sách toàn bộ video (Public)
// GET /api/videos
router.get("/", videoController.getVideos);

// Route tạo mới một video (Public / Admin)
// POST /api/videos
router.post("/", videoController.createVideo);

module.exports = router;
