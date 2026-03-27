// english-quiz-api/src/scripts/seedPracticeQuestions.js
// Run: node src/scripts/seedPracticeQuestions.js
require("dotenv").config({ path: '../../.env' });
const mongoose = require("mongoose");
const PracticeQuestion = require("../models/PracticeQuestion");
const TopicLevel = require("../models/TopicLevel");
const Topic = require("../models/Topic");

const SAMPLE_QUESTIONS = [
  // ── Simple Sentences – Beginner ──────────────────────────────────────
  {
    topicTitle: "Simple Sentences",
    level: "beginner",
    type: "multiple_choice",
    question: "Which sentence is a correct simple sentence?",
    options: [
      "Because she was tired.",
      "She went to school.",
      "Running fast every morning.",
      "When the rain stopped.",
    ],
    correct_option_index: 1,
    explanation:
      "A simple sentence must have a subject ('She') and a predicate ('went to school'). The other options are fragments because they lack a complete subject-verb structure.",
    grammar_tip: "Simple sentence = Subject + Verb (+ Object/Complement)",
    example: "The cat sat on the mat.",
  },
  {
    topicTitle: "Simple Sentences",
    level: "beginner",
    type: "fill_in_blank",
    question: "She ___ to the market every Saturday. (go)",
    correct_answer: "goes",
    explanation:
      "'She' is third-person singular, so the verb 'go' must take the -s ending: 'goes'. This is simple present tense subject-verb agreement.",
    grammar_tip: "He/She/It + verb+s/es in simple present.",
    example: "He plays football on Sundays.",
  },
  {
    topicTitle: "Simple Sentences",
    level: "beginner",
    type: "reorder",
    question: "Rearrange the words to form a correct sentence:",
    words: ["likes", "Tom", "music", "classical"],
    correct_order: [1, 0, 3, 2], // Tom likes classical music
    explanation:
      "The correct order is: Subject (Tom) + Verb (likes) + Object (classical music). Adjectives come before the noun they modify.",
    grammar_tip: "Adjective comes before the noun: 'classical music', not 'music classical'.",
    example: "She drinks hot coffee.",
  },
  {
    topicTitle: "Simple Sentences",
    level: "beginner",
    type: "error_detection",
    question: "Find the error in the sentence:",
    sentence_parts: ["My brother", "go", "to school", "every day."],
    error_index: 1,
    corrected_part: "goes",
    explanation:
      "'My brother' is third-person singular. The verb should be 'goes', not 'go'.",
    grammar_tip: "Subject-verb agreement: He/She/It → verb + s/es",
    example: "My sister goes to work early.",
  },
  // ── Tenses – Intermediate ────────────────────────────────────────────
  {
    topicTitle: "Tenses",
    level: "intermediate",
    type: "multiple_choice",
    question: "By the time she arrived, they ___ all the food.",
    options: ["eat", "ate", "had eaten", "have eaten"],
    correct_option_index: 2,
    explanation:
      "Past Perfect (had + past participle) is used for an action completed BEFORE another past action. 'Had eaten' shows the food was finished before she arrived.",
    grammar_tip: "Past Perfect: had + past participle — for the earlier of two past events.",
    example: "When I got home, my family had already started dinner.",
  },
  {
    topicTitle: "Tenses",
    level: "intermediate",
    type: "fill_in_blank",
    question: "She ___ (study) for 3 hours when the power went out.",
    correct_answer: "had been studying",
    explanation:
      "Past Perfect Continuous (had been + verb-ing) emphasizes the duration of an activity that was in progress before another past event.",
    grammar_tip:
      "Past Perfect Continuous = had been + verb-ing. Used for ongoing actions before a past event.",
    example: "They had been waiting for an hour before the bus came.",
  },
  {
    topicTitle: "Tenses",
    level: "intermediate",
    type: "reorder",
    question: "Rearrange to form a correct sentence using present perfect:",
    words: ["visited", "never", "Paris", "I", "have"],
    correct_order: [3, 4, 1, 0, 2], // I have never visited Paris
    explanation:
      "Present Perfect: Subject + have/has + past participle. Negative adverb 'never' goes between have and the main verb.",
    grammar_tip: "I/You/We/They + have; He/She/It + has + past participle.",
    example: "She has never eaten sushi.",
  },
  {
    topicTitle: "Tenses",
    level: "intermediate",
    type: "error_detection",
    question: "Find the error:",
    sentence_parts: ["Last night,", "I have watched", "a great movie", "with my friends."],
    error_index: 1,
    corrected_part: "I watched",
    explanation:
      "'Last night' signals a specific past time, so Simple Past ('watched') is required. Present Perfect cannot be used with specific past time expressions.",
    grammar_tip: "Use Simple Past, NOT Present Perfect, with specific time markers: yesterday, last week, in 2020.",
    example: "I saw him yesterday. (NOT: I have seen him yesterday.)",
  },
  // ── Active / Passive – Pre-TOEIC ─────────────────────────────────────
  {
    topicTitle: "Active / Passive",
    level: "pre-toeic",
    type: "multiple_choice",
    question:
      "The new policy ___ by the board of directors last month.",
    options: [
      "approved",
      "was approved",
      "has been approved",
      "approves",
    ],
    correct_option_index: 1,
    explanation:
      "'Last month' indicates Simple Past. Passive = was/were + past participle. The subject (policy) receives the action.",
    grammar_tip: "Passive Voice: be + past participle. Match tense of 'be' to the time signal.",
    example: "The letter was sent by the manager yesterday.",
  },
  {
    topicTitle: "Active / Passive",
    level: "pre-toeic",
    type: "fill_in_blank",
    question: "The report will ___ (submit) before Friday.",
    correct_answer: "be submitted",
    explanation:
      "Future passive: will + be + past participle. 'Submit' becomes 'be submitted' in passive voice with future tense.",
    grammar_tip: "Future Passive: will + be + past participle.",
    example: "The results will be announced tomorrow.",
  },
];

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to MongoDB");

  for (const q of SAMPLE_QUESTIONS) {
    // Find matching topic
    const topic = await Topic.findOne({
      title: { $regex: new RegExp(q.topicTitle, "i") },
    });

    if (!topic) {
      console.warn(`⚠️  Topic not found: ${q.topicTitle} — skipping`);
      continue;
    }

    const { topicTitle, ...questionData } = q;
    await PracticeQuestion.findOneAndUpdate(
      { topic_id: topic._id, level: q.level, type: q.type, question: q.question },
      { ...questionData, topic_id: topic._id },
      { upsert: true }
    );

    // Ensure TopicLevel config exists
    const LEVELS = ["beginner", "intermediate", "pre-toeic"];
    for (let i = 0; i < LEVELS.length; i++) {
      await TopicLevel.findOneAndUpdate(
        { topic_id: topic._id, level: LEVELS[i] },
        { unlock_threshold: 5, order: i },
        { upsert: true }
      );
    }

    console.log(`✅  Seeded: ${q.topicTitle} [${q.level}] (${q.type})`);
  }

  console.log("Seeding complete.");
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
