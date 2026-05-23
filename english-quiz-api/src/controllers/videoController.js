const Video = require("../models/Video");

/**
 * Lấy danh sách toàn bộ các video bài học.
 * Hỗ trợ lọc theo danh mục (category) nếu được truyền trong query parameters.
 * 
 * GET /api/videos
 * Query params: category (tùy chọn)
 */
const getVideos = async (req, res, next) => {
  try {
    const { category } = req.query;
    const filter = {};

    // Nếu người dùng chọn lọc theo danh mục cụ thể
    if (category && category !== "All") {
      filter.category = category;
    }

    // Lấy danh sách video từ MongoDB và sắp xếp theo ngày tạo mới nhất
    const videos = await Video.find(filter).sort({ created_at: -1 });

    return res.status(200).json({
      success: true,
      count: videos.length,
      data: videos
    });
  } catch (error) {
    // Chuyển tiếp lỗi tới middleware xử lý lỗi chung
    return next(error);
  }
};

/**
 * Thêm một video bài học mới vào cơ sở dữ liệu.
 * 
 * POST /api/videos
 * Body params: videoId, youtubeId, title, category, description
 */
const createVideo = async (req, res, next) => {
  try {
    const { videoId, youtubeId, title, category, description } = req.body;

    // Kiểm tra các trường thông tin bắt buộc
    if (!videoId || !youtubeId || !title || !category) {
      return res.status(400).json({
        success: false,
        error: "Vui lòng điền đầy đủ các trường: videoId, youtubeId, title, category."
      });
    }

    // Kiểm tra xem videoId hoặc youtubeId đã tồn tại chưa
    const existingVideo = await Video.findOne({
      $or: [{ videoId }, { youtubeId }]
    });

    if (existingVideo) {
      return res.status(400).json({
        success: false,
        error: "Video với videoId hoặc youtubeId này đã tồn tại trong hệ thống."
      });
    }

    // Tạo bản ghi video mới trong MongoDB
    const newVideo = await Video.create({
      videoId,
      youtubeId,
      title,
      category,
      description
    });

    return res.status(201).json({
      success: true,
      data: newVideo
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getVideos,
  createVideo
};
