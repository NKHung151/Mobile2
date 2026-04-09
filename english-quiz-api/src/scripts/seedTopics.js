
require("dotenv").config({ path: '../../.env' });
const mongoose = require("mongoose");
const Topic = require("../models/Topic");
const Chunk = require("../models/Chunk");
const { parseVTT } = require("../services/vttParser");
// ===== MOCK EMBEDDING =====
function fakeEmbedding(text) {
  return Array(3072).fill(0).map(() => Math.random());
}

// ===== CHUNK TEXT =====
function splitIntoChunks(text, chunkSize = 200) {
  const words = text.split(" ");
  const chunks = [];

  for (let i = 0; i < words.length; i += chunkSize) {
    chunks.push(words.slice(i, i + chunkSize).join(" "));
  }

  return chunks;
}
const topics = [
  {
      topic_id: "simple-sentences",
      title: "Simple Sentences",
      "files": [
          {
            "filename": "simple_sentences.vtt",
            "content": "WEBVTT\n\n00:00:00.000 --> 00:00:05.000\nA simple sentence has one subject and one verb.\n\n00:00:05.000 --> 00:00:10.000\nIt expresses a complete idea.\n\n00:00:10.000 --> 00:00:15.000\nThe structure is subject plus verb.\n\n00:00:15.000 --> 00:00:20.000\nExample: She runs.\n\n00:00:20.000 --> 00:00:25.000\nExample: They play football.\n\n00:00:25.000 --> 00:00:30.000\nA simple sentence can have an object.\n\n00:00:30.000 --> 00:00:35.000\nExample: He reads a book.\n\n00:00:35.000 --> 00:00:40.000\nIt can also have adjectives or adverbs.\n\n00:00:40.000 --> 00:00:45.000\nExample: She runs quickly."
          }
        ]
    },
    {
      topic_id: "tenses",
      title: "Tenses",
       "files": [
           {
             "filename": "tenses.vtt",
             "content": "WEBVTT\n\n00:00:00.000 --> 00:00:05.000\nTenses show the time of an action.\n\n00:00:05.000 --> 00:00:10.000\nThere are past, present, and future tenses.\n\n00:00:10.000 --> 00:00:15.000\nPresent tense describes actions happening now.\n\n00:00:15.000 --> 00:00:20.000\nExample: She eats.\n\n00:00:20.000 --> 00:00:25.000\nPast tense describes actions in the past.\n\n00:00:25.000 --> 00:00:30.000\nExample: She ate.\n\n00:00:30.000 --> 00:00:35.000\nFuture tense describes actions in the future.\n\n00:00:35.000 --> 00:00:40.000\nExample: She will eat.\n\n00:00:40.000 --> 00:00:45.000\nEach tense has different forms."
           }
         ]
    },
    {
      topic_id: "active-passive",
      title: "Active / Passive",
      "files": [
          {
            "filename": "active_passive.vtt",
            "content": "WEBVTT\n\n00:00:00.000 --> 00:00:05.000\nVoice shows the relationship between subject and action.\n\n00:00:05.000 --> 00:00:10.000\nThere are two types: active and passive.\n\n00:00:10.000 --> 00:00:15.000\nIn active voice, the subject does the action.\n\n00:00:15.000 --> 00:00:20.000\nExample: She writes a letter.\n\n00:00:20.000 --> 00:00:25.000\nIn passive voice, the subject receives the action.\n\n00:00:25.000 --> 00:00:30.000\nExample: A letter is written by her.\n\n00:00:30.000 --> 00:00:35.000\nPassive voice uses be plus past participle.\n\n00:00:35.000 --> 00:00:40.000\nIt is used when the action is more important than the subject."
          }
        ]
    }
];

async function seedTopics() {
  await mongoose.connect(process.env.MONGODB_URI);

  for (const t of topics) {
    let totalChunks = 0;

    // 1. UPSERT TOPIC
    await Topic.findOneAndUpdate(
      { topic_id: t.topic_id },
      {
        topic_id: t.topic_id,
        title: t.title
      },
      { upsert: true }
    );

    // 2. CLEAR OLD CHUNKS
    await Chunk.deleteMany({ topic_id: t.topic_id });

    // 3. PROCESS FILES
    for (const file of t.files) {
      // 👉 dùng parser của bạn
      const cleanText = parseVTT(file.content);

      // 👉 chunk text
      const chunks = splitIntoChunks(cleanText, 50); // 50 words/chunk cho demo

      let chunkIndex = 0;

      for (const c of chunks) {
        await Chunk.create({
          topic_id: t.topic_id,
          file_name: file.filename,
          chunk_index: chunkIndex++,
          content: c,
          embedding: fakeEmbedding(c)
        });

        totalChunks++;
      }
    }

    // 4. UPDATE STATS
    await Topic.updateOne(
      { topic_id: t.topic_id },
      {
        file_count: t.files.length,
        total_chunks: totalChunks
      }
    );

    console.log(`✅ ${t.title} | chunks: ${totalChunks}`);
  }

  console.log("🎉 DONE");
  process.exit();
}

seedTopics();