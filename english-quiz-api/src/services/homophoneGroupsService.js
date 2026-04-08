const { v4: uuidv4 } = require('uuid');
const HomophoneGroup = require('../models/HomophoneGroup');
const genAI = require('../config/gemini');
const config = require('../config');
const logger = require('../utils/logger');

// In-memory question store (keyed by question_id, TTL ~10 min)
const questionStore = new Map();
const QUESTION_TTL_MS = 10 * 60 * 1000;

function cleanExpiredQuestions() {
  const now = Date.now();
  for (const [id, q] of questionStore.entries()) {
    if (now - q.created_at > QUESTION_TTL_MS) {
      questionStore.delete(id);
    }
  }
}

/**
 * Fetch a random document from the homophone_groups collection
 */
async function getRandomHomophoneGroup() {
  const count = await HomophoneGroup.countDocuments();
  if (count === 0) {
    throw new Error('No homophone groups found in database. Please seed the homophone_groups collection.');
  }
  const skip = Math.floor(Math.random() * count);
  const pair = await HomophoneGroup.findOne().skip(skip);
  return pair;
}

/**
 * Generate a sentence using Gemini AI with a blank for the homophone word
 * This creates a meaningful sentence with context clues but without revealing the answer
 */
async function generateSentenceWithAI(word) {
  try {
    const prompt = `Create a contextual English sentence (max 12 words) with a blank (_____ or [blank]) where the word "${word}" should go.

Rules:
- Replace "${word}" with _____ to mark the missing word position
- The sentence should make natural sense and provide context clues WITHOUT spoiling the answer
- Example word "${word}" could be: "their/there", "see/sea", "hear/here", "right/write", "know/no", "to/too/two"
- Keep it simple and clear for English learners (beginner level)
- The blank should be replaceable ONLY by the target word in the sentence context
- Return ONLY the sentence with the blank, no quotes, no explanation

Examples of GOOD sentences (with blanks):
- "I can _____ the beach from my window" (for "see/sea")
- "She _____ her book on the desk" (for "put/putt")
- "I _____ the door is open" (for "know/no")
- "We need to go _____" (for "there/their")

Return the sentence now:`;

    const model = genAI.getGenerativeModel({ model: config.gemini.model });
    const result = await model.generateContent(prompt);
    let sentence = result.response.text().trim().replace(/^["']|["']$/g, '');
    
    // Ensure the sentence contains the blank marker
    if (!sentence.includes('_____') && !sentence.includes('[blank]')) {
      logger.warn(`[HomophoneGroups] AI sentence missing blank: "${sentence}". Regenerating with fallback.`);
      return null;
    }
    
    logger.info(`[HomophoneGroups] AI generated sentence: "${sentence}"`);
    return sentence;
  } catch (err) {
    logger.warn(`[HomophoneGroups] AI sentence generation failed: ${err.message}`);
    return null;
  }
}

/**
 * Generate contextual fallback sentences with blanks for homophones
 * These are generic templates that work for any homophone pair
 */
function generateFallbackSentence(word) {
  // Generic templates with blanks that work for most homophones
  // The context should be vague enough to not reveal the answer but specific enough to require thought
  const templates = [
    `I can _____ you very clearly.`,              // for "hear/here"
    `They went _____ last summer.`,                // for "there/their"
    `She _____ a beautiful song.`,                 // for "sang/sun"
    `We need to _____ this problem.`,              // for "solve/soul"
    `He _____ the answer quickly.`,                // for "knew/new"
    `I _____ to the store yesterday.`,             // for "went/want"
    `She _____ the window is open.`,               // for "knows/nose"
    `Can you _____ my name correctly?`,            // for "read/red"
    `Please _____ my homework.`,                   // for "check/Czech"
    `The _____ is very high today.`,               // for "sun/son"
    `I _____ to go home now.`,                     // for "want/went"
    `They _____ to the beach.`,                    // for "went/want"
    `She _____ the door carefully.`,               // for "closed/clothes"
    `We _____ this work together.`,                // for "do/due/dew"
    `I _____ your message.`,                       // for "got/got"
    `Please _____ attention in class.`,            // for "pay/pea"
    `The _____ is shining brightly.`,              // for "sun/son"
    `I _____ the book on the table.`,              // for "put/putt"
    `Can you _____ me find my keys?`,              // for "help/kelp" or "aid/aide"
    `She _____ to be very intelligent.`,           // for "seems/seams"
  ];
  
  // Return a random template
  return templates[Math.floor(Math.random() * templates.length)];
}

/**
 * Shuffle array (Fisher-Yates)
 */
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Main: generate a full question from a HomophoneGroup
 */
async function generateQuestion(homophoneGroup) {
  // Pick a random correct word
  const correctIndex = Math.floor(Math.random() * homophoneGroup.words.length);
  const correctWord = homophoneGroup.words[correctIndex];
  const correctPhonetic = homophoneGroup.phonetics[correctIndex] || null;

  // Try AI sentence, fallback to template
  let sentence = await generateSentenceWithAI(correctWord);
  if (!sentence) {
    sentence = generateFallbackSentence(correctWord);
  }

  // Build choices array with phonetics attached
  const choices = shuffle(
    homophoneGroup.words.map((word, i) => ({
      word,
      phonetic: homophoneGroup.phonetics[i] || null
    }))
  );

  const question_id = uuidv4();
  const question = {
    question_id,
    source_id: homophoneGroup._id,
    source_type: 'homophone_groups',
    sentence,
    correct_answer: correctWord,
    correct_phonetic: correctPhonetic,
    choices,
    created_at: Date.now()
  };

  // Store for answer validation
  cleanExpiredQuestions();
  questionStore.set(question_id, question);

  logger.info(`[HomophoneGroups] Question created: id=${question_id}, correct="${correctWord}"`);

  // Return without leaking correct_answer to client
  // But send correctAnswerForAudio for text-to-speech (to make audio sound complete)
  return {
    question_id,
    source_id: homophoneGroup._id,
    source_type: 'homophone_groups',
    sentence,
    correctAnswerForAudio: correctWord, // ONLY for audio pronunciation, not to show
    choices // [{word, phonetic}]
  };
}

/**
 * Validate answer
 */
function checkAnswer(question_id, user_answer) {
  cleanExpiredQuestions();
  const question = questionStore.get(question_id);

  if (!question) {
    throw new Error('Question not found or expired. Please start a new question.');
  }

  const is_correct = question.correct_answer.toLowerCase() === user_answer.toLowerCase();

  logger.info(
    `[HomophoneGroups] Answer: id=${question_id}, user="${user_answer}", correct="${question.correct_answer}", result=${is_correct}`
  );

  // Remove from store after answered
  questionStore.delete(question_id);

  return {
    is_correct,
    correct_answer: question.correct_answer,
    correct_phonetic: question.correct_phonetic,
    source_id: question.source_id
  };
}

module.exports = { getRandomHomophoneGroup, generateQuestion, checkAnswer };
