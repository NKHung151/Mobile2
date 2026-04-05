const express = require("express");
const { uploadFile } = require("../controllers/uploadController");
const { authenticateToken } = require("../middleware/auth");
const upload = require("../middleware/multer");

const router = express.Router();

router.use(authenticateToken);

router.post("/upload", upload.single("file"), uploadFile);

module.exports = router;
