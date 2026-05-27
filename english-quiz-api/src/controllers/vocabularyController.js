const mongoose = require("mongoose");
const Course = require("../models/Course");
const Vocabulary = require("../models/Vocabulary");
const VocabularyUser = require("../models/VocabularyUser");
const { findCourseWithAccess } = require("../services/courseUserService");

/**
 * Kiểm tra xem string có phải ObjectId hợp lệ không
 * @param {string} id - ID cần kiểm tra
 * @returns {boolean} true nếu là ObjectId hợp lệ
 */
function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

/**
 * Kiểm tra xem người dùng có phải là chủ khóa học không
 *
 * Mục đích: Đảm bảo chỉ chủ khóa học mới có thể tạo/sửa/xóa từ vựng
 *
 * @param {ObjectId} courseId - ID khóa học
 * @param {ObjectId} userId - ID người dùng hiện tại
 * @returns {Object} {course, error} - course nếu thành công, error nếu thất bại
 */
async function ensureCourseOwner(courseId, userId) {
  const course = await Course.findById(courseId);

  if (!course) {
    return { error: { status: 404, message: "Course not found" } };
  }

  // Kiểm tra creator: chỉ creator mới được sửa
  if (course.creator.toString() !== userId) {
    return { error: { status: 403, message: "Only creator can modify vocabulary" } };
  }

  return { course };
}

/**
 * TẠO TỪ VỰNG MỚI
 *
 * Endpoint: POST /api/courses/:courseId/vocabularies
 *
 * Mục đích:
 * - Cho phép chủ khóa học thêm từ vựng mới
 * - Lưu term, definition, hình ảnh, và language codes
 * - Từ vựng sẽ xuất hiện trong Focus Mode (flashcard learning)
 *
 * Quy trình:
 * 1. Kiểm tra courseId có hợp lệ không
 * 2. Kiểm tra có term và definition không (bắt buộc)
 * 3. Kiểm tra người dùng có phải chủ khóa học không
 * 4. Tạo Vocabulary mới
 * 5. Trả về vocabulary vừa tạo
 *
 * Validation:
 * - term: bắt buộc, max 200 ký tự
 * - definition: bắt buộc, max 2000 ký tự
 * - term_image_url: optional, URL hình ảnh
 * - def_image_url: optional, URL hình ảnh
 * - term_language_code: optional, default "vi"
 * - definition_language_code: optional, default "vi"
 */
const createVocabulary = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const { term, definition, term_image_url = "", def_image_url = "", term_language_code = "vi", definition_language_code = "vi" } = req.body;

    // Kiểm tra courseId hợp lệ
    if (!isValidObjectId(courseId)) {
      return res.status(400).json({ success: false, error: "Invalid course id" });
    }

    // Kiểm tra bắt buộc: term và definition
    if (!term || !definition) {
      return res.status(400).json({ success: false, error: "term and definition are required" });
    }

    // Kiểm tra quyền: chỉ creator mới được tạo
    const check = await ensureCourseOwner(courseId, req.user.id);
    if (check.error) {
      return res.status(check.error.status).json({ success: false, error: check.error.message });
    }

    // Tạo Vocabulary mới
    const vocabulary = await Vocabulary.create({
      course: courseId,
      term,
      definition,
      term_image_url,
      def_image_url,
      term_language_code,
      definition_language_code,
    });

    return res.status(201).json({ success: true, data: vocabulary });
  } catch (error) {
    return next(error);
  }
};

/**
 * LẤY TẤT CẢ TỪ VỰNG CỦA MỘT KHÓA HỌC
 *
 * Endpoint: GET /api/courses/:courseId/vocabularies
 *
 * Mục đích:
 * - Load all flashcards cho Focus Mode
 * - Trả về từ vựng + progress của user (is_memorized, is_star)
 * - Cho phép người dùng công khai + đã đăng ký + chủ khóa học xem
 *
 * Quy trình:
 * 1. Kiểm tra courseId hợp lệ
 * 2. Kiểm tra quyền truy cập (public course, enrolled user, hoặc creator)
 *    → tự động tạo CourseUser nếu là public course
 * 3. Lấy tất cả Vocabulary của course
 * 4. Lấy VocabularyUser (progress) của user hiện tại
 * 5. Merge dữ liệu: mỗi vocabulary có thêm user_state (is_memorized, is_star)
 * 6. Trả về list với progress
 *
 * Data Merging Strategy:
 * - Fetch Vocabulary array từ database
 * - Fetch VocabularyUser array từ database
 * - Tạo Map: vocabulary_id → VocabularyUser record
 * - Dùng map.get(vocab_id) để gắn user_state vào mỗi vocabulary
 * - Nếu VocabularyUser không tồn tại → user_state = {is_memorized: false, is_star: false}
 *
 * Kết quả trả về:
 * [
 *   {
 *     _id: "vocab_id",
 *     course: "course_id",
 *     term: "apple",
 *     definition: "quả táo",
 *     term_image_url: "...",
 *     def_image_url: "...",
 *     term_language_code: "en",
 *     definition_language_code: "vi",
 *     user_state: {
 *       is_memorized: false,  // User chưa đánh dấu "Đã ghi nhớ"
 *       is_star: true         // User đã đánh dấu "Yêu thích"
 *     }
 *   },
 *   ...
 * ]
 */
const getCourseVocabularies = async (req, res, next) => {
  try {
    const { courseId } = req.params;

    // Kiểm tra courseId hợp lệ
    if (!isValidObjectId(courseId)) {
      return res.status(400).json({ success: false, error: "Invalid course id" });
    }

    // Kiểm tra quyền + auto-create CourseUser nếu là public
    const access = await findCourseWithAccess(courseId, req.user.id);
    if (access.error) {
      return res.status(access.error.status).json({ success: false, error: access.error.message });
    }

    const { courseUser } = access; // courseUser đã được tạo/lấy bởi findCourseWithAccess

    // Lấy tất cả từ vựng của course, sắp xếp theo thời gian tạo (soonest first)
    const vocabularies = await Vocabulary.find({ course: courseId }).sort({ createdAt: 1 });

    // Lấy progress của user: VocabularyUser chỉ có records của user này (via courseUser._id)
    // Map từ vocabulary_id → {is_memorized, is_star}
    const vocabularyUsers = await VocabularyUser.find({
      course_user: courseUser._id,
      vocabulary: { $in: vocabularies.map((item) => item._id) },
    }).lean();

    // TẠO MAP ĐỂ TÌMKIẾM NHANH: vocabulary_id → VocabularyUser record
    // Ví dụ: Map {"vocab_id_1" → {is_memorized: false, is_star: true}, ...}
    const vocabularyUserMap = new Map(vocabularyUsers.map((item) => [item.vocabulary.toString(), item]));

    // MERGE DATA: Mỗi vocabulary được gắn thêm user_state
    const result = vocabularies.map((item) => {
      const userState = vocabularyUserMap.get(item._id.toString());
      return {
        ...item.toObject(),
        user_state: {
          is_memorized: Boolean(userState?.is_memorized),
          is_star: Boolean(userState?.is_star),
        },
      };
    });

    return res.json({ success: true, data: result });
  } catch (error) {
    return next(error);
  }
};

/**
 * CẬP NHẬT TỪ VỰNG CÓ SẴN
 *
 * Endpoint: PUT /api/courses/:courseId/vocabularies/:vocabularyId
 *
 * Mục đích:
 * - Cho phép chủ khóa học chỉnh sửa term, definition, hình ảnh, language codes
 * - Không thể thay đổi course hay user_state (những cái đó quản lý riêng)
 *
 * Quy trình:
 * 1. Kiểm tra courseId và vocabularyId hợp lệ
 * 2. Kiểm tra người dùng là chủ khóa học
 * 3. Tìm vocabulary theo ID + course (bảo vệ: không thể update vocabulary của course khác)
 * 4. Cập nhật các field được phép (term, definition, URLs, language codes)
 * 5. Lưu và trả về vocabulary đã cập nhật
 *
 * Các field có thể cập nhật:
 * - term: từ vựng
 * - definition: định nghĩa
 * - term_image_url: hình ảnh từ
 * - def_image_url: hình ảnh định nghĩa
 * - term_language_code: mã ngôn ngữ term
 * - definition_language_code: mã ngôn ngữ definition
 */
const updateVocabulary = async (req, res, next) => {
  try {
    const { courseId, vocabularyId } = req.params;

    // Kiểm tra ID hợp lệ
    if (!isValidObjectId(courseId) || !isValidObjectId(vocabularyId)) {
      return res.status(400).json({ success: false, error: "Invalid id format" });
    }

    // Kiểm tra quyền: chỉ creator mới được update
    const check = await ensureCourseOwner(courseId, req.user.id);
    if (check.error) {
      return res.status(check.error.status).json({ success: false, error: check.error.message });
    }

    // Tìm vocabulary: PHẢI thuộc course này (bảo vệ)
    const vocabulary = await Vocabulary.findOne({ _id: vocabularyId, course: courseId });
    if (!vocabulary) {
      return res.status(404).json({ success: false, error: "Vocabulary not found in this course" });
    }

    // Cập nhật các field được phép
    const fields = ["term", "definition", "term_image_url", "def_image_url", "term_language_code", "definition_language_code"];
    fields.forEach((field) => {
      if (req.body[field] !== undefined) {
        vocabulary[field] = req.body[field];
      }
    });

    // Lưu vocabulary đã cập nhật
    await vocabulary.save();

    return res.json({ success: true, data: vocabulary });
  } catch (error) {
    return next(error);
  }
};

/**
 * XÓA TỪ VỰNG
 *
 * Endpoint: DELETE /api/courses/:courseId/vocabularies/:vocabularyId
 *
 * Mục đích:
 * - Cho phép chủ khóa học xóa từ vựng không cần thiết
 * - Xóa vocabulary → tự động xóa tất cả VocabularyUser (cascade delete logic)
 *
 * Quy trình:
 * 1. Kiểm tra courseId và vocabularyId hợp lệ
 * 2. Kiểm tra người dùng là chủ khóa học
 * 3. Tìm và xóa vocabulary (phải thuộc course này)
 * 4. Ghi chú: VocabularyUser records sẽ bị orphan (cần xóa ở tầng ứng dụng nếu cần)
 * 5. Trả về success message
 */
const deleteVocabulary = async (req, res, next) => {
  try {
    const { courseId, vocabularyId } = req.params;

    // Kiểm tra ID hợp lệ
    if (!isValidObjectId(courseId) || !isValidObjectId(vocabularyId)) {
      return res.status(400).json({ success: false, error: "Invalid id format" });
    }

    // Kiểm tra quyền: chỉ creator mới được delete
    const check = await ensureCourseOwner(courseId, req.user.id);
    if (check.error) {
      return res.status(check.error.status).json({ success: false, error: check.error.message });
    }

    // Xóa vocabulary: PHẢI thuộc course này (bảo vệ)
    const deleted = await Vocabulary.findOneAndDelete({ _id: vocabularyId, course: courseId });

    if (!deleted) {
      return res.status(404).json({ success: false, error: "Vocabulary not found in this course" });
    }

    // TODO: Xóa tất cả VocabularyUser của vocabulary này để dọn dẹp (optional)
    // await VocabularyUser.deleteMany({ vocabulary: vocabularyId });

    return res.json({ success: true, message: "Vocabulary deleted successfully" });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getCourseVocabularies,
  createVocabulary,
  updateVocabulary,
  deleteVocabulary,
};
