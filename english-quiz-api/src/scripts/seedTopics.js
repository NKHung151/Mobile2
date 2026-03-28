
require("dotenv").config({ path: '../../.env' });
const mongoose = require("mongoose");
const Topic = require("../models/Topic");

const topics = [
  {
      topic_id: "simple-sentences",
      title: "Simple Sentences"
    },
    {
      topic_id: "tenses",
      title: "Tenses"
    },
    {
      topic_id: "active-passive",
      title: "Active / Passive"
    }
];

async function seedTopics() {
  await mongoose.connect(process.env.MONGODB_URI);

  for (const t of topics) {
    await Topic.findOneAndUpdate(
      { title: t.title },
      t,
      { upsert: true }
    );
    console.log("✅ Seeded topic:", t.title);
  }

  process.exit();
}

seedTopics();