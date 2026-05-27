const { v4: uuidv4 } = require('uuid');
const QuestionResponse = require('../models/QuestionResponse');
const logger = require('../utils/logger');
const config = require('../config');

// In-memory session store (keyed by session_id, TTL ~30 min)
const sessionStore = new Map();
const SESSION_TTL_MS = 30 * 60 * 1000;

/**
 * Dọn dẹp các phiên học Question-Response đã hết hạn trong bộ nhớ đệm (In-memory store)
 * để giải phóng dung lượng bộ nhớ RAM (garbage collection thủ công).
 * Hạn dùng mặc định của một phiên học (TTL) là 30 phút.
 * 
 * @returns {void}
 */
function cleanExpiredSessions() {
  const now = Date.now();
  for (const [id, session] of sessionStore.entries()) {
    if (now - session.created_at > SESSION_TTL_MS) {
      sessionStore.delete(id);
    }
  }
}

/**
 * Khởi tạo phiên học Question-Response mới cho người dùng.
 * Bốc ngẫu nhiên một số lượng câu hỏi TOEIC Part 2 từ cơ sở dữ liệu MongoDB Atlas
 * thông qua hàm Aggregate $sample để tránh trùng lặp câu hỏi.
 * Lưu giữ phiên học đầy đủ (kèm đáp án đúng) vào RAM backend để kiểm tra chéo khi nộp bài.
 * 
 * @param {string} user_id - ID của học viên bắt đầu học
 * @param {number} [question_count=10] - Số lượng câu hỏi yêu cầu trong phiên học (từ 5 đến 20)
 * @returns {Promise<Object>} Object chứa session_id, câu hỏi đầu tiên đã ẩn đáp án đúng, số thứ tự câu hỏi và tổng số câu
 * @throws {Error} Ném lỗi nếu cơ sở dữ liệu rác/rỗng không tìm thấy câu hỏi
 */
async function startSession(user_id, question_count = 10) {
  try {
    // Validate question_count
    const count = Math.max(5, Math.min(question_count, 20));

    // Bốc ngẫu nhiên câu hỏi bằng pipeline aggregation $sample của MongoDB
    const questions = await QuestionResponse.aggregate([
      { $sample: { size: count } }
    ]);

    if (questions.length === 0) {
      throw new Error('No question-response questions found in database');
    }

    const session_id = uuidv4();
    const session = {
      session_id,
      user_id,
      questions,        // Lưu câu hỏi đầy đủ kèm đáp án đúng để đối chiếu chéo tại Server
      current_index: 0,
      correct_count: 0,
      created_at: Date.now()
    };

    cleanExpiredSessions();
    sessionStore.set(session_id, session);

    logger.info(
      `[QuestionResponse] Session started: session=${session_id}, user=${user_id}, questions=${count}`
    );

    // Trả về câu hỏi đầu tiên nhưng loại bỏ thuộc tính isCorrect của các options trước khi chuyển về client
    return {
      session_id,
      question: stripCorrectAnswers(questions[0]),
      question_number: 1,
      total_questions: questions.length
    };
  } catch (error) {
    logger.error('[QuestionResponse] Error in startSession:', error);
    throw error;
  }
}

/**
 * Loại bỏ trường isCorrect trong các lựa chọn đáp án của câu hỏi.
 * Đây là biện pháp bảo mật nhằm ngăn chặn người dùng dịch ngược mã nguồn hoặc xem devtools của client để gian lận đáp án đúng.
 * 
 * @param {Object} question - Đối tượng câu hỏi đầy đủ từ DB
 * @returns {Object} Đối tượng câu hỏi an toàn (chỉ chứa audioUrl, kịch bản transcript ẩn và các text của options)
 */
function stripCorrectAnswers(question) {
  return {
    audioUrl: question.audioUrl,
    content: question.content,
    options: question.options.map(opt => ({
      text: opt.text,
      translation: opt.translation
    }))
  };
}

/**
 * Nộp đáp án cho câu hỏi hiện tại trong phiên học và trả về kết quả kiểm tra tức thì.
 * Nếu còn câu hỏi tiếp theo, tự động trả kèm thông tin câu hỏi mới đã được loại bỏ đáp án.
 * Nếu là câu hỏi cuối cùng, cập nhật cờ hoàn thành phiên và xóa phiên học khỏi bộ nhớ RAM sessionStore.
 * 
 * @param {string} session_id - ID phiên học đang thực hiện
 * @param {number} selected_option_index - Chỉ mục phương án học viên chọn (0: A, 1: B, 2: C)
 * @returns {Object} Kết quả kiểm tra đáp án đúng/sai, transcript đầy đủ câu hỏi/lựa chọn và thông tin câu hỏi tiếp theo (nếu có)
 * @throws {Error} Ném lỗi nếu phiên học không tồn tại hoặc chỉ mục đáp án không hợp lệ
 */
function submitAnswer(session_id, selected_option_index) {
  try {
    cleanExpiredSessions();
    const session = sessionStore.get(session_id);

    if (!session) {
      throw new Error('Session not found or expired');
    }

    if (selected_option_index < 0 || selected_option_index > 2) {
      throw new Error('Invalid option index');
    }

    const currentQuestion = session.questions[session.current_index];
    const selectedOption = currentQuestion.options[selected_option_index];
    const correctIndex = currentQuestion.options.findIndex(opt => opt.isCorrect);
    const is_correct = selectedOption.isCorrect;

    if (is_correct) {
      session.correct_count++;
    }

    // Thiết lập dữ liệu kết quả chi tiết để lưu trữ vào bảng SessionAnswer
    const result = {
      is_correct,
      correct_index: correctIndex,
      transcript: currentQuestion.content.transcript,
      translation: currentQuestion.content.translation,
      // Dữ liệu thô để ghi vào SessionAnswer collection
      question_id: currentQuestion._id ? currentQuestion._id.toString() : `question_response_${session.current_index}`,
      question_text: currentQuestion.content.transcript,
      user_answer_index: selected_option_index,
      user_answer: currentQuestion.options[selected_option_index]?.text || `Option ${selected_option_index + 1}`,
      correct_answer: currentQuestion.options[correctIndex]?.text || `Option ${correctIndex + 1}`,
      all_options: currentQuestion.options.map(opt => opt.text),
    };

    session.current_index++;

    // Kiểm tra xem phiên học đã kết thúc hay còn câu hỏi tiếp theo
    if (session.current_index < session.questions.length) {
      const nextQuestion = session.questions[session.current_index];
      result.next_question = stripCorrectAnswers(nextQuestion);
      result.question_number = session.current_index + 1;
      result.total_questions = session.questions.length;
    } else {
      // Đánh dấu hoàn thành phiên học
      result.session_complete = true;
      result.correct_count = session.correct_count;
      result.total_questions = session.questions.length;
      sessionStore.delete(session_id); // Dọn dẹp vùng nhớ sau khi hoàn thành phiên học
      
      logger.info(
        `[QuestionResponse] Session completed: session=${session_id}, score=${session.correct_count}/${session.questions.length}`
      );
    }

    return result;
  } catch (error) {
    logger.error('[QuestionResponse] Error in submitAnswer:', error);
    throw error;
  }
}

module.exports = {
  startSession,
  submitAnswer
};
