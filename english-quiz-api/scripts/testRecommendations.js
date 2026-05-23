/**
 * Script để test chức năng AI Recommendations
 * Query dữ liệu người dùng thực tế từ DB và lấy gợi ý
 */

require('dotenv').config();
const mongoose = require('mongoose');
const config = require('../src/config');
const logger = require('../src/utils/logger');

// Load models
const LearningHistory = require('../src/models/LearningHistory');
const TopicProgress = require('../src/models/TopicProgress');
const User = require('../src/models/User');

const connectDatabase = async () => {
  try {
    await mongoose.connect(config.mongodb.uri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000
    });
    console.log('✅ MongoDB connected');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    process.exit(1);
  }
};

const main = async () => {
  try {
    await connectDatabase();

    // 1. Lấy 1 user bất kỳ có learning history
    console.log('\n📝 Step 1: Tìm user có learning history...');
    const learningHistories = await LearningHistory.find().limit(10);
    
    if (learningHistories.length === 0) {
      console.log('❌ Không có learning history nào trong DB');
      process.exit(0);
    }

    const user_id = learningHistories[0].user_id;
    console.log(`✅ Tìm thấy user_id: ${user_id}`);

    // 2. Query dữ liệu học tập của user
    console.log('\n📊 Step 2: Query dữ liệu học tập của user...');
    const userSessions = await LearningHistory.find({ user_id, status: 'completed' });
    console.log(`✅ Tổng sessions hoàn thành: ${userSessions.length}`);

    // 3. Query topic summaries (giống như trong getRecommendations)
    console.log('\n📚 Step 3: Query topic summaries...');
    const topicSummaries = await LearningHistory.aggregate([
      { $match: { user_id, status: 'completed' } },
      {
        $group: {
          _id: '$topic_id',
          topic_title: { $first: '$topic_title' },
          total_questions: { $sum: '$questions_answered' },
          total_correct: { $sum: '$correct_answers' },
          session_count: { $sum: 1 },
          modes: { $addToSet: '$mode' },
        },
      },
      {
        $addFields: {
          average_accuracy: {
            $cond: [
              { $gt: ['$total_questions', 0] },
              { $round: [{ $multiply: [{ $divide: ['$total_correct', '$total_questions'] }, 100] }, 0] },
              0,
            ],
          },
        },
      },
      { $sort: { average_accuracy: 1 } },
    ]);

    if (topicSummaries.length === 0) {
      console.log('❌ Không có topic summaries');
      process.exit(0);
    }

    console.log(`✅ Tìm thấy ${topicSummaries.length} topics`);

    // 4. Hiển thị thông tin chi tiết
    console.log('\n' + '='.repeat(80));
    console.log('📊 DỮ LIỆU NGƯỜI DÙNG');
    console.log('='.repeat(80));
    console.log(`User ID: ${user_id}`);
    console.log(`Tổng sessions: ${userSessions.length}`);
    console.log(`Tổng topics: ${topicSummaries.length}`);

    console.log('\n' + '─'.repeat(80));
    console.log('DANH SÁCH TOPICS (sắp xếp từ yếu → mạnh):');
    console.log('─'.repeat(80));

    // Hàm helper để lấy level
    const getAccuracyLevel = (accuracy) => {
      if (accuracy >= 85) return { label: 'Tốt', emoji: '🟢', note: 'có thể chuyển topic mới' };
      if (accuracy >= 70) return { label: 'Khá', emoji: '🟡', note: 'cần củng cố thêm' };
      if (accuracy >= 50) return { label: 'Trung bình', emoji: '🟠', note: 'cần luyện tập nhiều hơn' };
      return { label: 'Yếu', emoji: '🔴', note: 'cần ưu tiên ôn lại từ đầu' };
    };

    // Modes labels
    const modeLabels = {
      quiz: 'Quiz',
      homophone_groups: 'Homophone Groups',
      question_response: 'Question - Response',
      practice: 'Practice',
    };

    topicSummaries.forEach((t, i) => {
      const level = getAccuracyLevel(t.average_accuracy);
      const modeStr = t.modes
        .filter(m => ['quiz', 'homophone_groups', 'question_response', 'practice'].includes(m))
        .map(m => modeLabels[m])
        .join(', ');
      
      console.log(`\n${i + 1}. "${t.topic_title}"`);
      console.log(`   Accuracy: ${t.average_accuracy}% ${level.emoji} ${level.label}`);
      console.log(`   Sessions: ${t.session_count} | Questions: ${t.total_questions} (${t.total_correct} correct)`);
      console.log(`   Modes: ${modeStr}`);
      console.log(`   Ghi chú: ${level.note}`);
    });

    // 5. Tính toán level counts
    console.log('\n' + '─'.repeat(80));
    console.log('PHÂN BỐ LEVEL:');
    console.log('─'.repeat(80));

    const levelCounts = {
      tot: topicSummaries.filter(t => t.average_accuracy >= 85).length,
      kha: topicSummaries.filter(t => t.average_accuracy >= 70 && t.average_accuracy < 85).length,
      trungBinh: topicSummaries.filter(t => t.average_accuracy >= 50 && t.average_accuracy < 70).length,
      yeu: topicSummaries.filter(t => t.average_accuracy < 50).length,
    };

    console.log(`🟢 Tốt (≥85%): ${levelCounts.tot} topic(s)`);
    console.log(`🟡 Khá (70-84%): ${levelCounts.kha} topic(s)`);
    console.log(`🟠 Trung bình (50-69%): ${levelCounts.trungBinh} topic(s)`);
    console.log(`🔴 Yếu (<50%): ${levelCounts.yeu} topic(s)`);

    // 6. Xác định loại prompt sẽ được tạo
    console.log('\n' + '─'.repeat(80));
    console.log('GỢI Ý AI SẼ ĐƯỢC TẠO THEO LOẠI:');
    console.log('─'.repeat(80));

    const WEAK_THRESHOLD = 70;
    const allWeak = topicSummaries.length > 0 && topicSummaries.every(t => t.average_accuracy < WEAK_THRESHOLD);

    if (topicSummaries.length === 0) {
      console.log('📌 Loại 1: NGƯỜI DÙNG MỚI (không có data)');
      console.log('   → Chào mừng + gợi ý thử Feature đầu tiên + mục tiêu tuần');
    } else if (allWeak) {
      console.log('📌 Loại 2: TẤT CẢ TOPICS YẾU (< 70%)');
      console.log('   → Động viên + Ưu tiên 2 topics có session_count cao nhất + Kế hoạch tuần');
      
      const topTwoBySession = [...topicSummaries]
        .sort((a, b) => b.session_count - a.session_count)
        .slice(0, 2);
      
      console.log('\n   Top 2 topics được gợi ý:');
      topTwoBySession.forEach((t, i) => {
        console.log(`   ${i + 1}. "${t.topic_title}" (${t.session_count} sessions, ${t.average_accuracy}%)`);
      });
    } else {
      console.log('📌 Loại 3: MIX (có topics tốt + yếu)');
      console.log('   → Nhận xét tổng quan + 3 gợi ý (ưu tiên 🔴→🟠→🟡) + Kế hoạch tuần');
      
      console.log('\n   3 topics được gợi ý (ưu tiên yếu trước):');
      let recommendations = [];
      
      // Ưu tiên 🔴
      const weakTopics = topicSummaries.filter(t => t.average_accuracy < 50);
      if (weakTopics.length > 0) recommendations.push(weakTopics[0]);
      
      // Tiếp theo 🟠
      const mediumTopics = topicSummaries.filter(t => t.average_accuracy >= 50 && t.average_accuracy < 70);
      if (mediumTopics.length > 0) recommendations.push(mediumTopics[0]);
      
      // Rồi 🟡
      const goodTopics = topicSummaries.filter(t => t.average_accuracy >= 70 && t.average_accuracy < 85);
      if (goodTopics.length > 0) recommendations.push(goodTopics[0]);
      
      recommendations.forEach((t, i) => {
        const level = getAccuracyLevel(t.average_accuracy);
        console.log(`   ${i + 1}. "${t.topic_title}" (${t.average_accuracy}% ${level.emoji}) - ${level.note}`);
      });
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ Script hoàn thành! Kết quả trên là mô tả dữ liệu sẽ được gửi đến AI');
    console.log('='.repeat(80) + '\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

main();
