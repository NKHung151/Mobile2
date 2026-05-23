const { v4: uuidv4 } = require('uuid');
const HomophoneGroup = require('../models/HomophoneGroup');
const genAI = require('../config/gemini');
const config = require('../config');
const logger = require('../utils/logger');

// In-memory question store (keyed by question_id, TTL ~10 min)
const questionStore = new Map();
const QUESTION_TTL_MS = 10 * 60 * 1000;

// Per-word deterministic sentence bank
// Each word has ONLY sentences where THAT word fits correctly
// No ambiguity, no validation needed
const HOMOPHONE_SENTENCE_BANK = {
  hear: [
    "I can _____ you clearly.",
    "Did you _____ that sound?",
    "Can you _____ the music?",
    "I didn't _____ you come in.",
    "Can everyone _____ me at the back?",
  ],
  here: [
    "Come _____ and sit down.",
    "I am _____ waiting for you.",
    "Put the bag _____.",
    "My friend is _____ now.",
    "We live _____ in this city.",
  ],
  there: [
    "They live _____ in the mountains.",
    "Look over _____.",
    "Is anyone _____ right now?",
    "I saw a dog _____ yesterday.",
    "The tree is _____ by the river.",
  ],
  their: [
    "This is _____ house.",
    "_____ friends are coming today.",
    "I like _____ ideas.",
    "Is this _____ car?",
    "_____ teacher is very kind.",
  ],
  to: [
    "I want _____ go home.",
    "She went _____ the store.",
    "Can I come _____?",
    "Let's go _____ the beach.",
    "I'm happy _____ see you.",
  ],
  too: [
    "This coffee is _____ hot.",
    "He is _____ tall for that car.",
    "That music is _____ loud.",
    "This is _____ expensive.",
    "You are _____ kind.",
  ],
  two: [
    "We have _____ cats.",
    "I have _____ sisters.",
    "One plus one is _____.",
    "She has _____ children.",
    "There are _____ cars in the garage.",
  ],
  see: [
    "I can _____ the beach from here.",
    "Do you _____ that boat?",
    "I didn't _____ him at the party.",
    "Can you _____ the mountain in the distance?",
    "Let me _____ your drawings.",
  ],
  sea: [
    "We love swimming in the _____.",
    "The _____ is beautiful today.",
    "The _____ is very calm this morning.",
    "Fish live in the _____.",
    "We went to the _____ for vacation.",
  ],
  right: [
    "Turn _____ at the traffic light.",
    "He is _____ about that.",
    "Is this the _____ way to the station?",
    "You are _____.",
    "Go _____ and then left.",
  ],
  write: [
    "Can you _____ your name here?",
    "Please _____ the answer on the paper.",
    "She likes to _____ in her diary.",
    "Can I _____ your email address?",
    "I need to _____ a letter.",
  ],
  know: [
    "I don't _____ the answer.",
    "Do you _____ him?",
    "I didn't _____ it was raining.",
    "Does she _____ how to swim?",
    "Nobody _____ where he went.",
  ],
  no: [
    "Say _____ if you disagree.",
    "_____, I don't want to go.",
    "There is _____ milk in the fridge.",
    "_____ one was home when I called.",
    "He said _____ to my invitation.",
  ],
  sun: [
    "The _____ is shining today.",
    "The _____ rises in the east.",
    "We stayed in the _____ all day.",
    "The _____ is very hot today.",
    "At night, we cannot see the _____.",
  ],
  son: [
    "My _____ likes to play soccer.",
    "She has one daughter and one _____.",
    "His _____ is a doctor.",
    "The _____ and father look alike.",
    "Her _____ studies at university.",
  ],
  not: [
    "This is _____ the right way.",
    "I'm _____ ready yet.",
    "That's _____ allowed.",
    "He is _____ here today.",
    "We will _____ forget this day.",
  ],
  knot: [
    "There is a _____ in my shoelace.",
    "She tied a _____ in the rope.",
    "Can you untie this _____?",
    "The _____ was very tight.",
    "I need to make a _____ here.",
  ],
  brake: [
    "Press the _____ to stop the car.",
    "Step on the _____ if you need to stop.",
    "The _____ is not working properly.",
    "I applied the _____ quickly.",
    "The car's _____ suddenly failed.",
  ],
  break: [
    "Please _____ the window.",
    "We had a _____ for lunch.",
    "Can you _____ this into pieces?",
    "Don't _____ the glass!",
    "I hope I don't _____ it.",
  ],
  wear: [
    "I like to _____ blue shirts.",
    "She always _____ a hat in summer.",
    "What will you _____ to the party?",
    "He _____ a suit to the meeting.",
    "I don't like to _____ dresses.",
  ],
  where: [
    "_____ are you going?",
    "Can you tell me _____ the bathroom is?",
    "_____ did you put my keys?",
    "I don't know _____ he lives.",
    "Tell me _____ you are from.",
  ],
};

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
 * VALIDATION: Check if a sentence is grammatically valid for a specific word
 * Edge case #4 fix: Prevents sentences meant for other words in the group
 * 
 * Example:
 *   sentence: "The _____ is shining brightly"
 *   word: "sun"     → ✅ Valid (makes sense)
 *   word: "hot"     → ❌ Invalid (doesn't make sense - "The hot is shining brightly" is wrong)
 */
async function validateSentenceForWord(sentence, word, homophoneGroup, model) {
  try {
    const otherWords = homophoneGroup.words.filter(w => w.toLowerCase() !== word.toLowerCase()).join(', ');
    
    const validationPrompt = `You are a grammar validator. Check if this sentence is GRAMMATICALLY CORRECT and makes SEMANTIC SENSE when the blank is filled with the target word.

Sentence with blank: "${sentence}"
Target word to fill: "${word}"
Other words in this homophones group (do NOT fit): ${otherWords}

Answer ONLY with JSON, no explanation:
{
  "is_valid": true/false,
  "reason": "brief reason"
}

Rules for VALID:
1. "${word}" fits naturally and grammatically in the blank
2. The sentence is NOT better with another word from this group
3. Native English speakers would use this sentence only with "${word}"

Answer now:`;

    const result = await model.generateContent(validationPrompt);
    const responseText = result.response.text().trim();
    
    // Parse JSON response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      logger.warn(`[HomophoneGroups] Validation response not JSON: "${responseText}"`);
      return false;
    }
    
    const validation = JSON.parse(jsonMatch[0]);
    return validation.is_valid === true;
  } catch (err) {
    logger.warn(`[HomophoneGroups] Validation error: ${err.message}`);
    return false;
  }
}

/**
 * Generate a sentence using Gemini AI with a blank for the homophone word
 * Includes validation to prevent edge case #4 (wrong word assigned)
 */
async function generateSentenceWithAI(word, homophoneGroup, maxRetries = 3) {
  let attempts = 0;
  let lastError = null;

  while (attempts < maxRetries) {
    attempts++;
    try {
      const otherWords = homophoneGroup.words.filter(w => w.toLowerCase() !== word.toLowerCase()).slice(0, 3).join(', ');

      const prompt = `You are an English teacher for beginner learners. Create ONE natural sentence with a blank (_____ ) where ONLY the word "${word}" fits perfectly.

CRITICAL:
- The blank must be filled ONLY by "${word}", not by: ${otherWords}
- Do NOT create a sentence that also fits: ${otherWords}
- The sentence must be grammatically correct when "${word}" is inserted
- Keep it simple (max 12 words) for A2-B1 learners

Examples of GOOD sentences (ONLY fit the target word):
- "I can _____ the music" (ONLY "hear" fits, not "here")
- "They live over _____" (ONLY "there" fits, not "their")  
- "I want _____ go home" (ONLY "to" fits, not "too" or "two")

Example of BAD sentence (multiple words fit):
- "The _____ is shining" (fits "sun" AND "star" — DO NOT CREATE THIS)

Return ONLY the sentence with blank, no quotes, no explanation:`;

      const model = genAI.getGenerativeModel({ model: config.gemini.model });
      const result = await model.generateContent(prompt);
      let sentence = result.response.text().trim().replace(/^["']|["']$/g, '');

      // Check if sentence has blank marker
      if (!sentence.includes('_____') && !sentence.includes('[blank]')) {
        logger.warn(`[HomophoneGroups] Attempt ${attempts}: AI sentence missing blank: "${sentence}"`);
        lastError = 'No blank marker in sentence';
        continue;
      }

      // VALIDATE the sentence
      const isValid = await validateSentenceForWord(sentence, word, homophoneGroup, model);
      if (!isValid) {
        logger.warn(`[HomophoneGroups] Attempt ${attempts}: Validation failed for sentence: "${sentence}" with word: "${word}"`);
        lastError = 'Validation failed - sentence fits other words';
        continue;
      }

      logger.info(`[HomophoneGroups] ✅ AI sentence generated (attempt ${attempts}): "${sentence}" for word: "${word}"`);
      return sentence;
    } catch (err) {
      lastError = err.message;
      logger.warn(`[HomophoneGroups] Attempt ${attempts} error: ${err.message}`);
    }
  }

  logger.warn(`[HomophoneGroups] AI generation failed after ${maxRetries} retries. Last error: ${lastError}`);
  return null;
}

/**
 * Generate contextual fallback sentences with blanks for homophones
 * Now uses homophone-specific templates for better accuracy
 */
function generateFallbackSentence(word, homophoneGroup) {
  // Look up word-specific sentences from per-word deterministic bank
  const sentences = HOMOPHONE_SENTENCE_BANK[word.toLowerCase()];
  
  if (sentences && sentences.length > 0) {
    const sentence = sentences[Math.floor(Math.random() * sentences.length)];
    logger.info(`[HomophoneGroups] Using word-specific fallback for "${word}": "${sentence}"`);
    return sentence;
  }

  // Fallback to generic templates if word not found in bank
  const genericTemplates = [
    `I can _____ you very clearly.`,
    `They went _____ last summer.`,
    `She _____ a beautiful song.`,
    `We need to _____ this problem.`,
    `He _____ the answer quickly.`,
    `I _____ to the store yesterday.`,
    `She _____ the window is open.`,
    `Can you _____ my name correctly?`,
    `Please _____ my homework.`,
    `The _____ is very high today.`,
    `I _____ to go home now.`,
    `They _____ to the beach.`,
    `She _____ the door carefully.`,
    `We _____ this work together.`,
    `I _____ your message.`,
    `Please _____ attention in class.`,
    `The _____ is shining brightly.`,
    `I _____ the book on the table.`,
    `Can you _____ me find my keys?`,
    `She _____ to be very intelligent.`,
  ];

  const sentence = genericTemplates[Math.floor(Math.random() * genericTemplates.length)];
  logger.info(`[HomophoneGroups] Using generic fallback template for "${word}": "${sentence}"`);
  return sentence;
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
 * Includes AI with validation + fallback with homophones-specific sentences
 */
async function generateQuestion(homophoneGroup) {
  // Pick a random correct word
  const correctIndex = Math.floor(Math.random() * homophoneGroup.words.length);
  const correctWord = homophoneGroup.words[correctIndex];
  const correctPhonetic = homophoneGroup.phonetics[correctIndex] || null;

  // Try AI sentence first (with validation to prevent edge case #4)
  let sentence = await generateSentenceWithAI(correctWord, homophoneGroup);
  
  // If AI fails, use homophones-specific fallback (or generic fallback if not available)
  if (!sentence) {
    sentence = generateFallbackSentence(correctWord, homophoneGroup);
    logger.info(`[HomophoneGroups] Fallback to template for "${correctWord}": "${sentence}"`);
  }

  // Build choices array with phonetics + meanings
  const choices = shuffle(
    homophoneGroup.words.map((word, i) => ({
      word,
      phonetic: homophoneGroup.phonetics[i] || null,
      meaning:  homophoneGroup.meanings[i]  || null
    }))
  );

  const correctMeaning = homophoneGroup.meanings[correctIndex] || null;

  const question_id = uuidv4();
  const question = {
    question_id,
    source_id: homophoneGroup._id,
    source_type: 'homophone_groups',
    sentence,
    correct_answer: correctWord,
    correct_phonetic: correctPhonetic,
    correct_meaning: correctMeaning,
    choices,
    created_at: Date.now()
  };

  // Store for answer validation
  cleanExpiredQuestions();
  questionStore.set(question_id, question);

  logger.info(`[HomophoneGroups] Question created: id=${question_id}, correct="${correctWord}", sentence="${sentence}"`);

  // Return without leaking correct_answer to client
  // But send correctAnswerForAudio for text-to-speech (to make audio sound complete)
  return {
    question_id,
    source_id: homophoneGroup._id,
    source_type: 'homophone_groups',
    sentence,
    correctAnswerForAudio: correctWord, // ONLY for audio pronunciation, not to show
    choices // [{word, phonetic, meaning}]
  };
}

/**
 * Validate answer + return full question data for saving
 */
function checkAnswerWithData(question_id, user_answer) {
  cleanExpiredQuestions();
  const question = questionStore.get(question_id);

  if (!question) {
    throw new Error('Question not found or expired. Please start a new question.');
  }

  const is_correct = question.correct_answer.toLowerCase() === user_answer.toLowerCase();

  logger.info(
    `[HomophoneGroups] Answer: id=${question_id}, user="${user_answer}", correct="${question.correct_answer}", result=${is_correct}`
  );

  // Return full data for saving (BEFORE deleting from store)
  const fullData = {
    is_correct,
    correct_answer: question.correct_answer,
    correct_phonetic: question.correct_phonetic,
    correct_meaning: question.correct_meaning || null,
    source_id: question.source_id,
    sentence: question.sentence,
    choices: question.choices,
    user_answer,
  };

  // Remove from store after answered
  questionStore.delete(question_id);

  return fullData;
}

/**
 * Validate answer
 */
function checkAnswer(question_id, user_answer) {
  const data = checkAnswerWithData(question_id, user_answer);
  return {
    is_correct: data.is_correct,
    correct_answer: data.correct_answer,
    correct_phonetic: data.correct_phonetic,
    source_id: data.source_id
  };
}

module.exports = { getRandomHomophoneGroup, generateQuestion, checkAnswer, checkAnswerWithData };
