require('dotenv').config();
const { connectDatabase } = require('../src/config/database');
const LearningHistory = require('../src/models/LearningHistory');
const TopicProgress = require('../src/models/TopicProgress');
const SessionAnswer = require('../src/models/SessionAnswer');
const mongoose = require('mongoose');

async function migrate() {
  try {
    console.log('Connecting to MongoDB...');
    await connectDatabase();
    console.log('Connected.');

    // 1. Migrate LearningHistory
    console.log('Migrating LearningHistory records...');
    const lhResult = await LearningHistory.updateMany(
      { 
        $or: [
          { mode: 'listening_part2' },
          { topic_id: 'listening_part2' },
          { topic_title: 'Listening Part 2' }
        ]
      },
      [
        {
          $set: {
            mode: {
              $cond: { if: { $eq: ['$mode', 'listening_part2'] }, then: 'question_response', else: '$mode' }
            },
            topic_id: {
              $cond: { if: { $eq: ['$topic_id', 'listening_part2'] }, then: 'question_response', else: '$topic_id' }
            },
            topic_title: {
              $cond: { 
                if: { $or: [{ $eq: ['$topic_title', 'Listening Part 2'] }, { $eq: ['$topic_title', 'listening_part2'] }] }, 
                then: 'Question - Response', 
                else: '$topic_title' 
              }
            }
          }
        }
      ]
    );
    console.log(`LearningHistory records updated: ${lhResult.modifiedCount}`);

    // 2. Migrate TopicProgress
    console.log('Migrating TopicProgress records...');
    const tpResult = await TopicProgress.updateMany(
      {
        $or: [
          { topic_id: 'listening_part2' },
          { topic_title: 'Listening Part 2' }
        ]
      },
      [
        {
          $set: {
            topic_id: {
              $cond: { if: { $eq: ['$topic_id', 'listening_part2'] }, then: 'question_response', else: '$topic_id' }
            },
            topic_title: {
              $cond: { 
                if: { $or: [{ $eq: ['$topic_title', 'Listening Part 2'] }, { $eq: ['$topic_title', 'listening_part2'] }] }, 
                then: 'Question - Response', 
                else: '$topic_title' 
              }
            }
          }
        }
      ]
    );
    console.log(`TopicProgress records updated: ${tpResult.modifiedCount}`);

    // 3. Migrate SessionAnswer
    console.log('Migrating SessionAnswer records...');
    const saResult = await SessionAnswer.updateMany(
      { source_type: 'listening_part2' },
      { $set: { source_type: 'question_response' } }
    );
    console.log(`SessionAnswer records updated: ${saResult.modifiedCount}`);

    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
    process.exit(0);
  }
}

migrate();
