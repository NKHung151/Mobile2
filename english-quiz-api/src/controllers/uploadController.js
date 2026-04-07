const path = require("path");
const config = require("../config");

const uploadFile = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: "No file uploaded" });
    }

    const type = req.query.type || "other";
    const filePath = `uploads/${type}/${req.file.filename}`;

    return res.json({
      success: true,
      data: {
        url: filePath,
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        type: req.file.mimetype,
      },
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  uploadFile,
};
