// english-quiz-api/src/scripts/seedPracticeQuestions.js
// Chạy: node src/scripts/seedPracticeQuestions.js
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });
const mongoose = require("mongoose");
const PracticeQuestion = require("../models/PracticeQuestion");
const TopicLevel = require("../models/TopicLevel");
const Topic = require("../models/Topic");
const PracticeExercise = require("../models/PracticeExercise");

/*
 * CƠ CHẾ PHÂN BỔ (xen kẽ theo counter):
 *   counter % 2 === 0  → Exercise 1
 *   counter % 2 === 1  → Exercise 2
 *
 * Để mỗi exercise có đủ 4 dạng khác nhau (MC, FIB, RE, ED),
 * thứ tự trong mảng với mỗi topic-level phải là:
 *   Vị trí 0 → Ex1: MC
 *   Vị trí 1 → Ex2: FIB
 *   Vị trí 2 → Ex1: RE
 *   Vị trí 3 → Ex2: ED
 *   Vị trí 4 → Ex1: FIB
 *   Vị trí 5 → Ex2: MC
 *   Vị trí 6 → Ex1: ED
 *   Vị trí 7 → Ex2: RE
 * => Ex1 = MC, RE, FIB, ED ✓  |  Ex2 = FIB, ED, MC, RE ✓
 *
 * Tất cả correct_order của reorder đã được verify bằng script:
 *   words[correct_order[0]], words[correct_order[1]], ... = câu đúng
 */

const SAMPLE_QUESTIONS = [

  // ══════════════════════════════════════════════════════════
  // TOPIC: Simple Sentences
  // ══════════════════════════════════════════════════════════

  // ── Simple Sentences – Beginner ──────────────────────────
  // [0 → Ex1] MC
  {
    topicTitle: "Simple Sentences", level: "beginner", type: "multiple_choice",
    question: "Which of the following is a correct simple sentence?",
    options: ["Because she was tired.", "She went to school.", "Running every morning.", "When the rain stopped."],
    correct_option_index: 1,
    explanation: "A simple sentence needs a subject and a verb that form a complete thought. 'She went to school' has subject 'She' and verb 'went'.",
    grammar_tip: "Simple sentence = Subject + Verb (+ Object). It must express a complete idea.",
    example: "The cat sat on the mat.",
  },
  // [1 → Ex2] FIB
  {
    topicTitle: "Simple Sentences", level: "beginner", type: "fill_in_blank",
    question: "She ___ (go) to the market every Saturday.",
    correct_answer: "goes",
    explanation: "'She' is third person singular, so the verb 'go' adds -s: 'goes'. This is Simple Present subject-verb agreement.",
    grammar_tip: "He/She/It + verb + s/es in Simple Present.",
    example: "He plays football on Sundays.",
  },
  // [2 → Ex1] RE — words: ['likes','Tom','music','classical'] → Tom likes classical music
  {
    topicTitle: "Simple Sentences", level: "beginner", type: "reorder",
    question: "Rearrange the words to form a correct sentence:",
    words: ["likes", "Tom", "music", "classical"],
    correct_order: [1, 0, 3, 2],
    explanation: "Correct: 'Tom likes classical music.' Order: Subject (Tom) + Verb (likes) + Adjective (classical) + Noun (music).",
    grammar_tip: "Adjective comes before the noun: 'classical music', not 'music classical'.",
    example: "She drinks hot coffee every morning.",
  },
  // [3 → Ex2] ED
  {
    topicTitle: "Simple Sentences", level: "beginner", type: "error_detection",
    question: "Find the error in the sentence:",
    sentence_parts: ["My brother", "go", "to school", "every day."],
    error_index: 1,
    corrected_part: "goes",
    explanation: "'My brother' is third person singular. The verb must be 'goes', not 'go'.",
    grammar_tip: "Subject-verb agreement: He/She/It → verb + s/es.",
    example: "My sister goes to work early.",
  },
  // [4 → Ex1] FIB
  {
    topicTitle: "Simple Sentences", level: "beginner", type: "fill_in_blank",
    question: "Everyone ___ (love) ice cream in summer.",
    correct_answer: "loves",
    explanation: "'Everyone' is an indefinite pronoun that always takes a singular verb. So we use 'loves', not 'love'.",
    grammar_tip: "Everyone, nobody, someone, anyone → singular verb.",
    example: "Nobody knows the answer.",
  },
  // [5 → Ex2] MC
  {
    topicTitle: "Simple Sentences", level: "beginner", type: "multiple_choice",
    question: "Which sentence has a compound subject?",
    options: ["She sings beautifully.", "Tom and Mary love pizza.", "He reads and writes every day.", "The dog runs fast."],
    correct_option_index: 1,
    explanation: "'Tom and Mary' is a compound subject — two subjects sharing one verb 'love'. Option C has a compound predicate (two verbs), not a compound subject.",
    grammar_tip: "Compound subject = two or more subjects joined by 'and' sharing one verb.",
    example: "My mother and father work at the same hospital.",
  },
  // [6 → Ex1] ED
  {
    topicTitle: "Simple Sentences", level: "beginner", type: "error_detection",
    question: "Find the error in the sentence:",
    sentence_parts: ["She", "look", "very tired", "today."],
    error_index: 1,
    corrected_part: "looks",
    explanation: "'She' is third person singular. With a linking verb in Simple Present, add -s: 'looks'.",
    grammar_tip: "Linking verbs (look, seem, feel, sound) also need -s/-es for He/She/It.",
    example: "He looks happy today.",
  },
  // [7 → Ex2] RE — words: ['quickly','runs','the','boy','tall'] → The tall boy runs quickly
  // verified: [2,4,3,1,0] → the tall boy runs quickly ✓
  {
    topicTitle: "Simple Sentences", level: "beginner", type: "reorder",
    question: "Rearrange the words to form a correct sentence:",
    words: ["quickly", "runs", "the", "boy", "tall"],
    correct_order: [2, 4, 3, 1, 0],
    explanation: "Correct: 'The tall boy runs quickly.' Order: Article (the) + Adjective (tall) + Subject (boy) + Verb (runs) + Adverb (quickly).",
    grammar_tip: "Article + Adjective + Noun + Verb + Adverb.",
    example: "The young girl dances gracefully.",
  },

  // ── Simple Sentences – Intermediate ──────────────────────
  // [0 → Ex1] MC
  {
    topicTitle: "Simple Sentences", level: "intermediate", type: "multiple_choice",
    question: "Which sentence uses a linking verb correctly?",
    options: ["She became successfully.", "He seemed very nervously.", "The milk turned sour.", "They appeared happily."],
    correct_option_index: 2,
    explanation: "After linking verbs (become, seem, appear, turn), we use adjectives, not adverbs. 'Sour' is an adjective correctly following 'turned'.",
    grammar_tip: "Linking verb + adjective (NOT adverb): She looks happy. The soup tastes delicious.",
    example: "The weather feels cold today.",
  },
  // [1 → Ex2] FIB
  {
    topicTitle: "Simple Sentences", level: "intermediate", type: "fill_in_blank",
    question: "___ (swim) is excellent exercise for the whole body.",
    correct_answer: "Swimming",
    explanation: "A gerund (verb + -ing) can be the subject of a sentence. 'Swimming' acts as the subject here.",
    grammar_tip: "Gerund (verb-ing) can be the subject of a sentence: Swimming is fun. Reading helps.",
    example: "Cooking dinner every night takes a lot of time.",
  },
  // [2 → Ex1] RE — words: ['my','brother','a','doctor','works','at','the','hospital']
  // → my brother a doctor works at the hospital
  // verified: [0,1,2,3,4,5,6,7] → my brother a doctor works at the hospital ✓
  {
    topicTitle: "Simple Sentences", level: "intermediate", type: "reorder",
    question: "Rearrange to form a sentence with an appositive (a noun phrase that renames the subject):",
    words: ["my", "brother", "a", "doctor", "works", "at", "the", "hospital"],
    correct_order: [0, 1, 2, 3, 4, 5, 6, 7],
    explanation: "Correct: 'My brother, a doctor, works at the hospital.' The appositive 'a doctor' renames 'my brother' and is placed directly after the noun it renames.",
    grammar_tip: "Appositive = noun phrase placed after a noun to rename it. Set off by commas.",
    example: "Her sister, a famous chef, opened a new restaurant.",
  },
  // [3 → Ex2] ED
  {
    topicTitle: "Simple Sentences", level: "intermediate", type: "error_detection",
    question: "Find the error in the sentence:",
    sentence_parts: ["To learn a new language", "take", "a lot of time", "and effort."],
    error_index: 1,
    corrected_part: "takes",
    explanation: "When an infinitive phrase acts as the subject, it is treated as singular: 'takes' (third person singular), not 'take'.",
    grammar_tip: "Infinitive or gerund as subject → singular verb: 'To travel costs money.'",
    example: "To win the competition requires a lot of practice.",
  },
  // [4 → Ex1] FIB
  {
    topicTitle: "Simple Sentences", level: "intermediate", type: "fill_in_blank",
    question: "The team ___ (be) ready to start the match.",
    correct_answer: "is",
    explanation: "Collective nouns like 'team', 'committee', and 'group' are treated as singular in American English and take a singular verb.",
    grammar_tip: "Collective nouns (team, committee, board, family) → singular verb in American English.",
    example: "The committee has made its decision.",
  },
  // [5 → Ex2] MC
  {
    topicTitle: "Simple Sentences", level: "intermediate", type: "multiple_choice",
    question: "Which sentence is INCORRECT?",
    options: ["Swimming is good for health.", "To travel is exciting.", "Reads books is her hobby.", "Dancing makes her happy."],
    correct_option_index: 2,
    explanation: "'Reads books is her hobby' is wrong because 'reads' is a conjugated verb, not a gerund. The correct form is 'Reading books is her hobby.'",
    grammar_tip: "When a verb acts as the subject (gerund), use verb + -ing, not a conjugated verb.",
    example: "Running every day keeps you healthy.",
  },
  // [6 → Ex1] ED
  {
    topicTitle: "Simple Sentences", level: "intermediate", type: "error_detection",
    question: "Find the error in the sentence:",
    sentence_parts: ["The number of students", "in this class", "are", "increasing every year."],
    error_index: 2,
    corrected_part: "is",
    explanation: "'The number of' takes a singular verb. 'The number of students is...' Compare with: 'A number of students are...' which uses a plural verb.",
    grammar_tip: "'The number of' + noun → singular verb. 'A number of' + noun → plural verb.",
    example: "The number of cars on the road is growing.",
  },
  // [7 → Ex2] RE — words: ['she','seems','happy','always'] → she always seems happy
  // verified: [0,3,1,2] → she always seems happy ✓
  {
    topicTitle: "Simple Sentences", level: "intermediate", type: "reorder",
    question: "Rearrange the words to form a correct sentence:",
    words: ["she", "seems", "happy", "always"],
    correct_order: [0, 3, 1, 2],
    explanation: "Correct: 'She always seems happy.' Frequency adverbs (always, usually, often, never) go before the main verb but after the subject.",
    grammar_tip: "Frequency adverbs (always/usually/often/never) → before the main verb: She always smiles.",
    example: "He never eats breakfast before 8 AM.",
  },

  // ── Simple Sentences – Pre-TOEIC ─────────────────────────
  // [0 → Ex1] MC
  {
    topicTitle: "Simple Sentences", level: "pre-toeic", type: "multiple_choice",
    question: "The board of directors ___ scheduled to meet next Thursday.",
    options: ["is", "are", "were", "have"],
    correct_option_index: 0,
    explanation: "Collective nouns like 'board of directors' are treated as a single unit in formal/business English, so they take a singular verb ('is').",
    grammar_tip: "Collective nouns (board, committee, staff, team) → singular verb in American English.",
    example: "The committee has reached a decision.",
  },
  // [1 → Ex2] FIB
  {
    topicTitle: "Simple Sentences", level: "pre-toeic", type: "fill_in_blank",
    question: "Neither the manager nor the employees ___ (be) informed about the decision.",
    correct_answer: "were",
    explanation: "With 'neither...nor', the verb agrees with the noun closest to it. 'The employees' (plural) is closest, so use 'were'.",
    grammar_tip: "Neither...nor / Either...or → verb agrees with the noun CLOSEST to it.",
    example: "Neither the director nor the staff members were present.",
  },
  // [2 → Ex1] RE — words: ['each','employee','required','is','to','complete','the','training']
  // → each employee is required to complete the training
  // verified: [0,1,3,2,4,5,6,7] → each employee is required to complete the training ✓
  {
    topicTitle: "Simple Sentences", level: "pre-toeic", type: "reorder",
    question: "Rearrange to form a correct formal sentence:",
    words: ["each", "employee", "required", "is", "to", "complete", "the", "training"],
    correct_order: [0, 1, 3, 2, 4, 5, 6, 7],
    explanation: "Correct: 'Each employee is required to complete the training.' 'Each of' and 'each + noun' take a singular verb. 'Is required to + base verb' is a formal obligation structure.",
    grammar_tip: "'Each' + singular noun → singular verb. 'Each employee is...', 'Each item costs...'",
    example: "Each participant is expected to submit a report.",
  },
  // [3 → Ex2] ED
  {
    topicTitle: "Simple Sentences", level: "pre-toeic", type: "error_detection",
    question: "Find the error in this business sentence:",
    sentence_parts: ["The CEO, along with his advisors,", "have released", "a statement", "to the press."],
    error_index: 1,
    corrected_part: "has released",
    explanation: "When the subject is followed by 'along with', 'as well as', or 'together with', the verb agrees with the main subject only. 'The CEO' is singular → 'has released'.",
    grammar_tip: "Subject + 'along with / as well as / together with' + phrase → verb agrees with the main subject only.",
    example: "The manager, as well as her team, is responsible for the project.",
  },
  // [4 → Ex1] FIB
  {
    topicTitle: "Simple Sentences", level: "pre-toeic", type: "fill_in_blank",
    question: "A number of complaints ___ (be) received from customers this week.",
    correct_answer: "have been",
    explanation: "'A number of' acts like 'many' and takes a plural verb. We also need Present Perfect Passive here because the complaints were received recently.",
    grammar_tip: "'A number of' + plural noun → plural verb: A number of issues have been raised.",
    example: "A number of employees have requested flexible working hours.",
  },
  // [5 → Ex2] MC
  {
    topicTitle: "Simple Sentences", level: "pre-toeic", type: "multiple_choice",
    question: "Consumer confidence ___ risen steadily over the past six months.",
    options: ["have", "has", "had", "were"],
    correct_option_index: 1,
    explanation: "'Consumer confidence' is an uncountable, singular concept → takes 'has'. Present Perfect (has risen) is correct because the trend started in the past and continues now.",
    grammar_tip: "Abstract/uncountable nouns (confidence, information, advice) → singular verb.",
    example: "Public trust in the institution has grown significantly.",
  },
  // [6 → Ex1] ED
  {
    topicTitle: "Simple Sentences", level: "pre-toeic", type: "error_detection",
    question: "Find the error in this TOEIC-style sentence:",
    sentence_parts: ["Statistics show", "that consumer confidence", "have risen", "steadily this year."],
    error_index: 2,
    corrected_part: "has risen",
    explanation: "'Consumer confidence' is a singular uncountable noun acting as the subject of the that-clause. It requires 'has risen', not 'have risen'.",
    grammar_tip: "Uncountable nouns (confidence, information, progress) → singular verb: has risen.",
    example: "Consumer spending has increased by 3% this quarter.",
  },
  // [7 → Ex2] RE — words: ['the','companys','profitability','has','improved','significantly']
  // → the companys profitability has improved significantly
  // verified: [0,1,2,3,4,5] ✓
  {
    topicTitle: "Simple Sentences", level: "pre-toeic", type: "reorder",
    question: "Rearrange to form a correct formal sentence:",
    words: ["the", "company's", "profitability", "has", "improved", "significantly"],
    correct_order: [0, 1, 2, 3, 4, 5],
    explanation: "Correct: 'The company's profitability has improved significantly.' Subject (The company's profitability) + Present Perfect (has improved) + Adverb (significantly).",
    grammar_tip: "In formal writing, adverbs like 'significantly' typically come at the end of the clause.",
    example: "The firm's revenue has grown substantially this quarter.",
  },

  // ══════════════════════════════════════════════════════════
  // TOPIC: Tenses
  // ══════════════════════════════════════════════════════════

  // ── Tenses – Beginner ────────────────────────────────────
  // [0 → Ex1] MC
  {
    topicTitle: "Tenses", level: "beginner", type: "multiple_choice",
    question: "Which sentence is in the Simple Present tense?",
    options: ["She was eating lunch.", "She eats lunch every day.", "She will eat lunch soon.", "She has eaten lunch."],
    correct_option_index: 1,
    explanation: "Simple Present uses the base form of the verb (eats for he/she/it). It describes habits and routines. 'Every day' is a key time signal.",
    grammar_tip: "Simple Present time signals: always, usually, often, every day, never.",
    example: "He drinks coffee every morning.",
  },
  // [1 → Ex2] FIB
  {
    topicTitle: "Tenses", level: "beginner", type: "fill_in_blank",
    question: "Look! The children ___ (play) in the yard.",
    correct_answer: "are playing",
    explanation: "'Look!' signals something happening right now, so we use Present Continuous (am/is/are + verb-ing). 'The children' is plural → 'are playing'.",
    grammar_tip: "Present Continuous signals: look!, listen!, now, at the moment, right now.",
    example: "Listen! Someone is knocking at the door.",
  },
  // [2 → Ex1] RE — words: ['yesterday','she','a','book','read'] → she read a book yesterday
  // verified: [1,4,2,3,0] ✓
  {
    topicTitle: "Tenses", level: "beginner", type: "reorder",
    question: "Rearrange the words to form a Simple Past sentence:",
    words: ["yesterday", "she", "a", "book", "read"],
    correct_order: [1, 4, 2, 3, 0],
    explanation: "Correct: 'She read a book yesterday.' 'Read' is an irregular verb — its Simple Past form is also 'read'. 'Yesterday' is a Simple Past time signal.",
    grammar_tip: "Simple Past signals: yesterday, last night, ago, in [year]. Irregular: read → read.",
    example: "He went to the cinema last Friday.",
  },
  // [3 → Ex2] ED
  {
    topicTitle: "Tenses", level: "beginner", type: "error_detection",
    question: "Find the error in the sentence:",
    sentence_parts: ["Last night,", "I have watched", "a great movie", "with my friends."],
    error_index: 1,
    corrected_part: "I watched",
    explanation: "'Last night' is a specific past time expression. We must use Simple Past, not Present Perfect. Present Perfect cannot be used with specific finished time expressions.",
    grammar_tip: "NEVER use Present Perfect with: yesterday, last week, in 2010, ago.",
    example: "I saw him yesterday. NOT: I have seen him yesterday.",
  },
  // [4 → Ex1] FIB
  {
    topicTitle: "Tenses", level: "beginner", type: "fill_in_blank",
    question: "She ___ (not/eat) meat. She is a vegetarian.",
    correct_answer: "does not eat",
    explanation: "For negative Simple Present with he/she/it, use 'does not + base verb'. Do not add -s to the main verb when 'does' is used.",
    grammar_tip: "Negative Simple Present: He/She/It + does not (doesn't) + base verb.",
    example: "He doesn't drink coffee.",
  },
  // [5 → Ex2] MC
  {
    topicTitle: "Tenses", level: "beginner", type: "multiple_choice",
    question: "Which sentence uses 'will' correctly for a spontaneous decision?",
    options: ["I will go to Paris next month — I booked the ticket last week.", "Oh, the phone is ringing! I'll answer it.", "Tonight I will cook dinner — I planned it yesterday.", "She will take the exam next Monday as scheduled."],
    correct_option_index: 1,
    explanation: "'Will' is used for spontaneous decisions made at the moment of speaking. 'Oh, the phone is ringing — I'll answer it' is a decision made at that instant.",
    grammar_tip: "'Will' = spontaneous decision. 'Be going to' = pre-planned decision.",
    example: "A: There's no milk. B: I'll go and buy some.",
  },
  // [6 → Ex1] ED
  {
    topicTitle: "Tenses", level: "beginner", type: "error_detection",
    question: "Find the error in the sentence:",
    sentence_parts: ["I", "am knowing", "the answer", "to that question."],
    error_index: 1,
    corrected_part: "know",
    explanation: "'Know' is a stative verb. Stative verbs are NOT used in continuous tenses. Always use Simple Present for stative verbs.",
    grammar_tip: "Stative verbs (know, believe, want, love, hate, see, hear) → Simple tense, NOT Continuous.",
    example: "I know the answer. NOT: I am knowing the answer.",
  },
  // [7 → Ex2] RE — words: ['she','is','going','to','study','medicine'] → she is going to study medicine
  // verified: [0,1,2,3,4,5] ✓
  {
    topicTitle: "Tenses", level: "beginner", type: "reorder",
    question: "Rearrange the words to form a future sentence using 'be going to':",
    words: ["she", "is", "going", "to", "study", "medicine"],
    correct_order: [0, 1, 2, 3, 4, 5],
    explanation: "Correct: 'She is going to study medicine.' Formula: Subject + am/is/are + going to + base verb. Used for plans and intentions.",
    grammar_tip: "Be going to = planned intention: am/is/are + going to + base verb.",
    example: "We are going to visit my grandparents next weekend.",
  },

  // ── Tenses – Intermediate ─────────────────────────────────
  // [0 → Ex1] MC
  {
    topicTitle: "Tenses", level: "intermediate", type: "multiple_choice",
    question: "By the time she arrived, they ___ all the food.",
    options: ["eat", "ate", "had eaten", "have eaten"],
    correct_option_index: 2,
    explanation: "Past Perfect (had + past participle) is used for an action completed BEFORE another past action. Eating was finished before she arrived.",
    grammar_tip: "Past Perfect: had + past participle — for the earlier of two past events.",
    example: "When I got home, my family had already started dinner.",
  },
  // [1 → Ex2] FIB
  {
    topicTitle: "Tenses", level: "intermediate", type: "fill_in_blank",
    question: "She ___ (study) for 3 hours when the power went out.",
    correct_answer: "had been studying",
    explanation: "Past Perfect Continuous (had been + verb-ing) shows the duration of an ongoing activity before another past event.",
    grammar_tip: "Past Perfect Continuous = had been + verb-ing. Shows duration before a past event.",
    example: "They had been waiting for an hour before the bus arrived.",
  },
  // [2 → Ex1] RE — words: ['I','have','never','visited','Paris'] → I have never visited Paris
  // verified: [0,1,2,3,4] ✓
  {
    topicTitle: "Tenses", level: "intermediate", type: "reorder",
    question: "Rearrange to form a correct Present Perfect sentence:",
    words: ["I", "have", "never", "visited", "Paris"],
    correct_order: [0, 1, 2, 3, 4],
    explanation: "Correct: 'I have never visited Paris.' Present Perfect: Subject + have/has + adverb + past participle. 'Never' goes between 'have' and the main verb.",
    grammar_tip: "Present Perfect: Subject + have/has + (never/already/just) + past participle.",
    example: "She has already finished her homework.",
  },
  // [3 → Ex2] ED
  {
    topicTitle: "Tenses", level: "intermediate", type: "error_detection",
    question: "Find the error in the sentence:",
    sentence_parts: ["She has lived in Hanoi", "since", "ten years.", ""],
    error_index: 2,
    corrected_part: "for ten years.",
    explanation: "'Since' is used with a specific point in time (since 2015). 'For' is used with a duration (for ten years). Ten years is a duration, so use 'for'.",
    grammar_tip: "'Since' + starting point (since Monday). 'For' + duration (for two weeks).",
    example: "I have worked here for five years / since 2019.",
  },
  // [4 → Ex1] FIB
  {
    topicTitle: "Tenses", level: "intermediate", type: "fill_in_blank",
    question: "This time tomorrow, she ___ (fly) to Japan.",
    correct_answer: "will be flying",
    explanation: "Future Continuous (will be + verb-ing) describes an action in progress at a specific moment in the future. 'This time tomorrow' is the future reference point.",
    grammar_tip: "Future Continuous: will be + verb-ing — for an action in progress at a future moment.",
    example: "At 8 PM tonight, I will be watching the match.",
  },
  // [5 → Ex2] MC
  {
    topicTitle: "Tenses", level: "intermediate", type: "multiple_choice",
    question: "We CANNOT use Present Perfect with ___.",
    options: ["just", "already", "last Monday", "recently"],
    correct_option_index: 2,
    explanation: "Present Perfect cannot be used with specific finished time expressions like 'last Monday', 'yesterday', or 'in 2010'. These require Simple Past.",
    grammar_tip: "Use Simple Past (NOT Present Perfect) with: yesterday, last week, in [year], ago.",
    example: "I met him last Monday. NOT: I have met him last Monday.",
  },
  // [6 → Ex1] ED
  {
    topicTitle: "Tenses", level: "intermediate", type: "error_detection",
    question: "Find the error in the sentence:",
    sentence_parts: ["When she", "will arrive,", "we will start", "the meeting."],
    error_index: 1,
    corrected_part: "arrives,",
    explanation: "In time clauses (when, as soon as, before, after, until), use Simple Present — not the future tense — even when the event is in the future.",
    grammar_tip: "Time clauses (when/as soon as/before/after) → Simple Present for future meaning.",
    example: "Call me when you arrive. NOT: when you will arrive.",
  },
  // [7 → Ex2] RE — words: ['she','will','have','graduated','by','2030'] → she will have graduated by 2030
  // verified: [0,1,2,3,4,5] ✓
  {
    topicTitle: "Tenses", level: "intermediate", type: "reorder",
    question: "Rearrange to form a Future Perfect sentence:",
    words: ["she", "will", "have", "graduated", "by", "2030"],
    correct_order: [0, 1, 2, 3, 4, 5],
    explanation: "Correct: 'She will have graduated by 2030.' Future Perfect: will have + past participle. Shows an action completed before a specific future point.",
    grammar_tip: "Future Perfect: will have + past participle. Use with 'by + future time'.",
    example: "By next year, we will have finished the project.",
  },

  // ── Tenses – Pre-TOEIC ───────────────────────────────────
  // [0 → Ex1] MC
  {
    topicTitle: "Tenses", level: "pre-toeic", type: "multiple_choice",
    question: "The branch office ___ for six months before the company decided to close it.",
    options: ["has been operating", "had been operating", "was operating", "operated"],
    correct_option_index: 1,
    explanation: "Past Perfect Continuous (had been + verb-ing) shows the duration of an ongoing past activity before another completed past event (the decision to close).",
    grammar_tip: "Past Perfect Continuous: had been + verb-ing — duration before a past reference point.",
    example: "The factory had been producing goods for 20 years before it shut down.",
  },
  // [1 → Ex2] FIB
  {
    topicTitle: "Tenses", level: "pre-toeic", type: "fill_in_blank",
    question: "By the end of this fiscal year, the company ___ (achieve) its revenue target.",
    correct_answer: "will have achieved",
    explanation: "Future Perfect (will have + past participle) is used to show completion of an action before a specific future time ('by the end of this fiscal year').",
    grammar_tip: "Future Perfect: will have + past participle. Triggered by 'by + future time'.",
    example: "By 2030, the team will have completed the five-year plan.",
  },
  // [2 → Ex1] RE — words: ['the','sales','department','has','merged','the','two','divisions']
  // → the sales department has merged the two divisions
  // verified: [0,1,2,3,4,5,6,7] ✓
  {
    topicTitle: "Tenses", level: "pre-toeic", type: "reorder",
    question: "Rearrange to form a correct Present Perfect sentence:",
    words: ["the", "sales", "department", "has", "merged", "the", "two", "divisions"],
    correct_order: [0, 1, 2, 3, 4, 5, 6, 7],
    explanation: "Correct: 'The sales department has merged the two divisions.' Present Perfect: Subject + has/have + past participle. Shows a recent action with current relevance.",
    grammar_tip: "Present Perfect: Subject + have/has + past participle — recent actions with present relevance.",
    example: "The company has expanded its operations since last year.",
  },
  // [3 → Ex2] ED
  {
    topicTitle: "Tenses", level: "pre-toeic", type: "error_detection",
    question: "Find the error in this TOEIC-style sentence:",
    sentence_parts: ["The report will be sent", "as soon as", "the manager", "will approve it."],
    error_index: 3,
    corrected_part: "approves it.",
    explanation: "In time clauses (as soon as, once, when, before, after), use Simple Present for future events. 'Will approve' is incorrect; use 'approves'.",
    grammar_tip: "Time clauses (as soon as, once, when) → Simple Present, NOT will + verb.",
    example: "The product will ship as soon as we receive your payment.",
  },
  // [4 → Ex1] FIB
  {
    topicTitle: "Tenses", level: "pre-toeic", type: "fill_in_blank",
    question: "Sales ___ (rise) steadily for the past three quarters.",
    correct_answer: "have been rising",
    explanation: "Present Perfect Continuous (have been + verb-ing) is used for an ongoing action that started in the past and continues now. 'For the past three quarters' confirms the duration.",
    grammar_tip: "Present Perfect Continuous: have/has been + verb-ing — ongoing duration from past to now.",
    example: "Revenue has been increasing since the new strategy was introduced.",
  },
  // [5 → Ex2] MC
  {
    topicTitle: "Tenses", level: "pre-toeic", type: "multiple_choice",
    question: "The shipment ___ before the warehouse closed for the holidays.",
    options: ["has arrived", "arrived", "had arrived", "was arriving"],
    correct_option_index: 2,
    explanation: "Past Perfect (had arrived) shows the shipment arrived BEFORE another past event (the warehouse closing). It is the earlier of the two past actions.",
    grammar_tip: "Past Perfect: had + past participle — for the event that happened FIRST in the past.",
    example: "The client had left by the time we called.",
  },
  // [6 → Ex1] ED
  {
    topicTitle: "Tenses", level: "pre-toeic", type: "error_detection",
    question: "Find the error in this TOEIC-style sentence:",
    sentence_parts: ["The marketing team", "has launched", "the new campaign", "since last Tuesday."],
    error_index: 1,
    corrected_part: "launched",
    explanation: "'Since last Tuesday' with a one-time completed event ('launched') requires Simple Past, not Present Perfect. Present Perfect + 'since' works for ongoing states, not single past events.",
    grammar_tip: "For a single completed action at a specific past time, use Simple Past.",
    example: "The team launched the campaign last Tuesday.",
  },
  // [7 → Ex2] RE — words: ['the','team','will','be','completing','the','project','by','next','month']
  // → the team will be completing the project by next month
  // verified: [0,1,2,3,4,5,6,7,8,9] ✓
  {
    topicTitle: "Tenses", level: "pre-toeic", type: "reorder",
    question: "Rearrange to form a correct Future Continuous sentence:",
    words: ["the", "team", "will", "be", "completing", "the", "project", "by", "next", "month"],
    correct_order: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    explanation: "Correct: 'The team will be completing the project by next month.' Future Continuous: will be + verb-ing — action in progress at a future point.",
    grammar_tip: "Future Continuous: will be + verb-ing — ongoing action at a future time.",
    example: "This time next week, the auditors will be reviewing our accounts.",
  },

  // ══════════════════════════════════════════════════════════
  // TOPIC: Active / Passive
  // ══════════════════════════════════════════════════════════

  // ── Active/Passive – Beginner ─────────────────────────────
  // [0 → Ex1] MC
  {
    topicTitle: "Active / Passive", level: "beginner", type: "multiple_choice",
    question: "Which sentence is in the passive voice?",
    options: ["The chef cooks the meal.", "The meal is cooked by the chef.", "She cleaned the room.", "They are building a house."],
    correct_option_index: 1,
    explanation: "In passive voice, the subject receives the action. 'The meal' receives the action 'is cooked'. The formula is: be + past participle.",
    grammar_tip: "Passive voice: Subject + be + past participle (+ by + agent).",
    example: "The letter was written by her.",
  },
  // [1 → Ex2] FIB
  {
    topicTitle: "Active / Passive", level: "beginner", type: "fill_in_blank",
    question: "English ___ (speak) all over the world.",
    correct_answer: "is spoken",
    explanation: "Simple Present Passive: am/is/are + past participle. 'English' is singular → 'is spoken'. The agent is omitted because it is people in general.",
    grammar_tip: "Simple Present Passive: am/is/are + past participle.",
    example: "Rice is grown in Vietnam.",
  },
  // [2 → Ex1] RE — words: ['the','letter','was','sent','by','the','manager']
  // → the letter was sent by the manager
  // verified: [0,1,2,3,4,5,6] ✓
  {
    topicTitle: "Active / Passive", level: "beginner", type: "reorder",
    question: "Rearrange to form a correct Simple Past Passive sentence:",
    words: ["the", "letter", "was", "sent", "by", "the", "manager"],
    correct_order: [0, 1, 2, 3, 4, 5, 6],
    explanation: "Correct: 'The letter was sent by the manager.' Simple Past Passive: Subject + was/were + past participle + by + agent.",
    grammar_tip: "Simple Past Passive: was/were + past participle.",
    example: "The cake was baked by my mother.",
  },
  // [3 → Ex2] ED
  {
    topicTitle: "Active / Passive", level: "beginner", type: "error_detection",
    question: "Find the error in the passive sentence:",
    sentence_parts: ["The window", "was broke", "by the ball", "during the game."],
    error_index: 1,
    corrected_part: "was broken",
    explanation: "Passive voice uses the past PARTICIPLE, not the Simple Past form. 'Break' → past participle is 'broken'. 'Broke' is the Simple Past form.",
    grammar_tip: "Passive uses past PARTICIPLE: break → broken. write → written. steal → stolen.",
    example: "The vase was broken accidentally.",
  },
  // [4 → Ex1] FIB
  {
    topicTitle: "Active / Passive", level: "beginner", type: "fill_in_blank",
    question: "The road ___ (repair) right now. We have to take a different route.",
    correct_answer: "is being repaired",
    explanation: "'Right now' signals Present Continuous. Present Continuous Passive: am/is/are + being + past participle.",
    grammar_tip: "Present Continuous Passive: am/is/are + being + past participle.",
    example: "The building is being painted this week.",
  },
  // [5 → Ex2] MC
  {
    topicTitle: "Active / Passive", level: "beginner", type: "multiple_choice",
    question: "Which verb CANNOT be used in the passive voice?",
    options: ["write", "arrive", "build", "eat"],
    correct_option_index: 1,
    explanation: "'Arrive' is an intransitive verb — it does not take a direct object. Only transitive verbs can be converted to passive voice.",
    grammar_tip: "Only TRANSITIVE verbs (with a direct object) can be made passive. Intransitive verbs (arrive, sleep, die) cannot.",
    example: "She arrived early. (No passive possible.)",
  },
  // [6 → Ex1] ED
  {
    topicTitle: "Active / Passive", level: "beginner", type: "error_detection",
    question: "Find the error in the passive sentence:",
    sentence_parts: ["Three people", "were injure", "in the accident", "last night."],
    error_index: 1,
    corrected_part: "were injured",
    explanation: "Passive requires the past participle. 'Injure' → past participle is 'injured'. 'Were injure' is incorrect.",
    grammar_tip: "Passive: be + past participle. 'Injure' → 'injured'. 'Kill' → 'killed'.",
    example: "Two workers were injured at the construction site.",
  },
  // [7 → Ex2] RE — words: ['the','report','has','been','submitted']
  // → the report has been submitted
  // verified: [0,1,2,3,4] ✓
  {
    topicTitle: "Active / Passive", level: "beginner", type: "reorder",
    question: "Rearrange to form a correct Present Perfect Passive sentence:",
    words: ["the", "report", "has", "been", "submitted"],
    correct_order: [0, 1, 2, 3, 4],
    explanation: "Correct: 'The report has been submitted.' Present Perfect Passive: have/has + been + past participle.",
    grammar_tip: "Present Perfect Passive: have/has + been + past participle.",
    example: "The application has been approved.",
  },

  // ── Active/Passive – Intermediate ─────────────────────────
  // [0 → Ex1] MC
  {
    topicTitle: "Active / Passive", level: "intermediate", type: "multiple_choice",
    question: "The new policy ___ by the board last month.",
    options: ["has been approved", "was approved", "is approved", "had approved"],
    correct_option_index: 1,
    explanation: "'Last month' is a specific past time, so Simple Past Passive (was/were + past participle) is correct. We cannot use Present Perfect with 'last month'.",
    grammar_tip: "Simple Past Passive: was/were + past participle — with specific past time expressions.",
    example: "The contract was signed by both parties last week.",
  },
  // [1 → Ex2] FIB
  {
    topicTitle: "Active / Passive", level: "intermediate", type: "fill_in_blank",
    question: "The report ___ (must/submit) before Friday.",
    correct_answer: "must be submitted",
    explanation: "Modal Passive: modal + be + past participle. 'Must be submitted' expresses obligation in the passive voice.",
    grammar_tip: "Modal Passive: modal (must/can/should/will) + be + past participle.",
    example: "All forms must be completed in black ink.",
  },
  // [2 → Ex1] RE — words: ['the','road','was','being','repaired','when','the','accident','happened']
  // → the road was being repaired when the accident happened
  // verified: [0,1,2,3,4,5,6,7,8] ✓
  {
    topicTitle: "Active / Passive", level: "intermediate", type: "reorder",
    question: "Rearrange to form a Past Continuous Passive sentence:",
    words: ["the", "road", "was", "being", "repaired", "when", "the", "accident", "happened"],
    correct_order: [0, 1, 2, 3, 4, 5, 6, 7, 8],
    explanation: "Correct: 'The road was being repaired when the accident happened.' Past Continuous Passive: was/were + being + past participle.",
    grammar_tip: "Past Continuous Passive: was/were + being + past participle.",
    example: "The bridge was being built when the earthquake struck.",
  },
  // [3 → Ex2] ED
  {
    topicTitle: "Active / Passive", level: "intermediate", type: "error_detection",
    question: "Find the error in the passive sentence:",
    sentence_parts: ["She", "was gave", "a promotion", "by her supervisor."],
    error_index: 1,
    corrected_part: "was given",
    explanation: "'Gave' is the Simple Past of 'give'. The past participle is 'given'. Passive voice requires the past participle.",
    grammar_tip: "Irregular verbs: give → gave → given. Passive uses the 3rd form (past participle).",
    example: "She was given a second chance by the committee.",
  },
  // [4 → Ex1] FIB
  {
    topicTitle: "Active / Passive", level: "intermediate", type: "fill_in_blank",
    question: "The task ___ (need/do) immediately.",
    correct_answer: "needs to be done",
    explanation: "After 'need', use the passive infinitive: need + to be + past participle. The task cannot do itself, so passive is required.",
    grammar_tip: "Need + to be + past participle: 'The work needs to be reviewed.'",
    example: "The form needs to be signed by the director.",
  },
  // [5 → Ex2] MC
  {
    topicTitle: "Active / Passive", level: "intermediate", type: "multiple_choice",
    question: "She hates ___. It makes her feel bad.",
    options: ["to criticize", "being criticized", "be criticized", "having criticized"],
    correct_option_index: 1,
    explanation: "After 'hate', 'love', 'enjoy', 'avoid', we use a gerund. The passive gerund is 'being + past participle': 'being criticized' means someone criticizes her.",
    grammar_tip: "Passive gerund: being + past participle. Used after hate/love/enjoy/avoid/dislike.",
    example: "He enjoys being praised for his work.",
  },
  // [6 → Ex1] ED
  {
    topicTitle: "Active / Passive", level: "intermediate", type: "error_detection",
    question: "Find the error in the passive sentence:",
    sentence_parts: ["She", "is said", "to be", "an expert in her field."],
    error_index: -1,
    corrected_part: "No error",
    explanation: "This sentence is correct. Personal passive with reporting verbs: Subject + is/are + said/known/believed + to be/to have + complement.",
    grammar_tip: "Personal passive: She is said to be... / He is known to have... — No error here.",
    example: "He is known to be one of the best engineers in the company.",
  },
  // [7 → Ex2] RE — words: ['she','is','said','to','be','an','expert']
  // → she is said to be an expert
  // verified: [0,1,2,3,4,5,6] ✓
  {
    topicTitle: "Active / Passive", level: "intermediate", type: "reorder",
    question: "Rearrange to form a sentence using personal passive with a reporting verb:",
    words: ["she", "is", "said", "to", "be", "an", "expert"],
    correct_order: [0, 1, 2, 3, 4, 5, 6],
    explanation: "Correct: 'She is said to be an expert.' Personal passive: Subject + is/are + past participle (said/known/believed) + to be + complement.",
    grammar_tip: "Personal passive: Subject + is said/known/believed + to be + noun/adjective.",
    example: "He is believed to be the most experienced candidate.",
  },

  // ── Active/Passive – Pre-TOEIC ────────────────────────────
  // [0 → Ex1] MC
  {
    topicTitle: "Active / Passive", level: "pre-toeic", type: "multiple_choice",
    question: "All employees are required ___ the new compliance training by the end of the quarter.",
    options: ["completing", "to complete", "complete", "to be completed"],
    correct_option_index: 1,
    explanation: "'Are required to + base verb' means employees must do the action. 'To be completed' would mean employees are completed, which makes no sense.",
    grammar_tip: "Be required to + base verb = formal obligation. The subject performs the action.",
    example: "Staff are required to submit timesheets every Friday.",
  },
  // [1 → Ex2] FIB
  {
    topicTitle: "Active / Passive", level: "pre-toeic", type: "fill_in_blank",
    question: "The merger ___ (expect) to create over 2,000 new jobs in the region.",
    correct_answer: "is expected",
    explanation: "Personal passive with 'expect': Subject + is/are + expected + to-infinitive. This structure is very common in business English and TOEIC.",
    grammar_tip: "Is/are expected/predicted/projected to + base verb — common in business writing.",
    example: "The new plant is expected to open next spring.",
  },
  // [2 → Ex1] RE — words: ['the','accounts','will','be','audited','by','an','external','firm']
  // → the accounts will be audited by an external firm
  // verified: [0,1,2,3,4,5,6,7,8] ✓
  {
    topicTitle: "Active / Passive", level: "pre-toeic", type: "reorder",
    question: "Rearrange to form a correct Future Passive sentence:",
    words: ["the", "accounts", "will", "be", "audited", "by", "an", "external", "firm"],
    correct_order: [0, 1, 2, 3, 4, 5, 6, 7, 8],
    explanation: "Correct: 'The accounts will be audited by an external firm.' Future Passive: will + be + past participle.",
    grammar_tip: "Future Passive: will + be + past participle.",
    example: "The project will be reviewed by senior management.",
  },
  // [3 → Ex2] ED
  {
    topicTitle: "Active / Passive", level: "pre-toeic", type: "error_detection",
    question: "Find the error in this formal business sentence:",
    sentence_parts: ["The new product line", "is anticipated", "to be launch", "in the fourth quarter."],
    error_index: 2,
    corrected_part: "to be launched",
    explanation: "Passive infinitive: to be + past participle. 'Launch' must be in the past participle form 'launched'.",
    grammar_tip: "Passive infinitive: to be + past participle. 'to be launched', not 'to be launch'.",
    example: "The software is expected to be released next month.",
  },
  // [4 → Ex1] FIB
  {
    topicTitle: "Active / Passive", level: "pre-toeic", type: "fill_in_blank",
    question: "The director ___ (have) her car serviced at the garage every month.",
    correct_answer: "has",
    explanation: "Causative 'have': Subject + have/has + object + past participle. 'Has her car serviced' means she arranges for someone else to service the car.",
    grammar_tip: "Causative have: have/has + object + past participle = arrange for someone else to do it.",
    example: "She had her hair cut at the salon.",
  },
  // [5 → Ex2] MC
  {
    topicTitle: "Active / Passive", level: "pre-toeic", type: "multiple_choice",
    question: "The findings of the research ___ in a journal next year.",
    options: ["will publish", "will be published", "are publishing", "have published"],
    correct_option_index: 1,
    explanation: "The findings cannot publish themselves. Passive is needed here. 'Will be published' is Future Passive, appropriate for a future plan.",
    grammar_tip: "When the subject cannot perform the action itself, use passive voice.",
    example: "The report will be distributed to all stakeholders.",
  },
  // [6 → Ex1] ED
  {
    topicTitle: "Active / Passive", level: "pre-toeic", type: "error_detection",
    question: "Find the error in this formal business sentence:",
    sentence_parts: ["The proposal has been reviewed", "and it", "approved yesterday.", ""],
    error_index: 2,
    corrected_part: "was approved yesterday.",
    explanation: "'Yesterday' is a specific past time expression. It requires Simple Past Passive ('was approved'), not Present Perfect.",
    grammar_tip: "Specific past time (yesterday, last week) → Simple Past Passive: was/were + past participle.",
    example: "The application was submitted yesterday.",
  },
  // [7 → Ex2] RE — words: ['an','email','was','sent','on','behalf','of','the','management']
  // → an email was sent on behalf of the management
  // verified: [0,1,2,3,4,5,6,7,8] ✓
  {
    topicTitle: "Active / Passive", level: "pre-toeic", type: "reorder",
    question: "Rearrange to form a correct formal passive sentence:",
    words: ["an", "email", "was", "sent", "on", "behalf", "of", "the", "management"],
    correct_order: [0, 1, 2, 3, 4, 5, 6, 7, 8],
    explanation: "Correct: 'An email was sent on behalf of the management.' Simple Past Passive: was/were + past participle. 'An email' = singular countable → 'an'.",
    grammar_tip: "Simple Past Passive: was/were + past participle. 'On behalf of' = representing someone.",
    example: "A memo was distributed on behalf of the executive team.",
  },

  // ══════════════════════════════════════════════════════════
  // TOPIC: Modal Verbs
  // ══════════════════════════════════════════════════════════

  // ── Modal Verbs – Beginner ────────────────────────────────
  // [0 → Ex1] MC
  {
    topicTitle: "Modal Verbs", level: "beginner", type: "multiple_choice",
    question: "Which sentence is grammatically CORRECT?",
    options: ["She cans swim very well.", "She can swims very well.", "She can swim very well.", "She can to swim very well."],
    correct_option_index: 2,
    explanation: "Modal verbs do not add -s for third person singular, and they are followed by the base form (no 'to'). 'She can swim' is correct.",
    grammar_tip: "Modal verb + base verb (no -s, no 'to'). She can swim. He must go.",
    example: "He can speak three languages.",
  },
  // [1 → Ex2] FIB
  {
    topicTitle: "Modal Verbs", level: "beginner", type: "fill_in_blank",
    question: "You ___ smoke in this area. It is strictly prohibited.",
    correct_answer: "must not",
    explanation: "'Must not' (mustn't) expresses prohibition — something that is forbidden. This is different from 'don't have to' which means it is not necessary.",
    grammar_tip: "'Must not' = forbidden. 'Don't have to' = not necessary (optional).",
    example: "You must not use your phone during the exam.",
  },
  // [2 → Ex1] RE — words: ['you','should','see','a','doctor','if','you','feel','unwell']
  // → you should see a doctor if you feel unwell
  // verified: [0,1,2,3,4,5,6,7,8] ✓
  {
    topicTitle: "Modal Verbs", level: "beginner", type: "reorder",
    question: "Rearrange to form a correct sentence with 'should':",
    words: ["you", "should", "see", "a", "doctor", "if", "you", "feel", "unwell"],
    correct_order: [0, 1, 2, 3, 4, 5, 6, 7, 8],
    explanation: "Correct: 'You should see a doctor if you feel unwell.' 'Should' expresses advice and is followed by the base verb.",
    grammar_tip: "'Should' = advice/recommendation. Follow with base verb (no 'to').",
    example: "You should drink more water every day.",
  },
  // [3 → Ex2] ED
  {
    topicTitle: "Modal Verbs", level: "beginner", type: "error_detection",
    question: "Find the error in the sentence:",
    sentence_parts: ["Does she", "can speak", "English", "fluently?"],
    error_index: 1,
    corrected_part: "can she speak",
    explanation: "Modal verbs form questions by inverting subject and modal. Do NOT use 'do/does' with modals. Correct question: 'Can she speak English fluently?'",
    grammar_tip: "Modal verb questions: Modal + subject + base verb? (No do/does/did).",
    example: "Can he drive? Must we go? Should they stay?",
  },
  // [4 → Ex1] FIB
  {
    topicTitle: "Modal Verbs", level: "beginner", type: "fill_in_blank",
    question: "___ I borrow your pen? Mine has run out of ink.",
    correct_answer: "May",
    explanation: "'May I' is a polite, formal way to ask for permission. 'Can I' is more informal. In formal contexts, 'May I' is preferred.",
    grammar_tip: "'May I' = formal permission request. 'Can I' = informal permission request.",
    example: "May I come in? May I ask you a question?",
  },
  // [5 → Ex2] MC
  {
    topicTitle: "Modal Verbs", level: "beginner", type: "multiple_choice",
    question: "'You don't have to come to the meeting.' What does this mean?",
    options: ["You are forbidden from coming.", "You are required to come.", "It is not necessary for you to come.", "You definitely won't come."],
    correct_option_index: 2,
    explanation: "'Don't have to' means there is no obligation — it is optional. This is very different from 'must not' which means something is forbidden.",
    grammar_tip: "'Don't have to' = no obligation (optional). 'Must not' = forbidden.",
    example: "You don't have to wear a tie, but you can if you want.",
  },
  // [6 → Ex1] ED
  {
    topicTitle: "Modal Verbs", level: "beginner", type: "error_detection",
    question: "Find the error in the sentence:",
    sentence_parts: ["When she was young,", "she could", "to run", "very fast."],
    error_index: 2,
    corrected_part: "run",
    explanation: "Modal verbs are followed by the base form WITHOUT 'to'. 'Could run' is correct; 'could to run' is incorrect.",
    grammar_tip: "Modal + base verb (NO 'to'): could run, must go, should eat, would stay.",
    example: "He could swim across the river when he was young.",
  },
  // [7 → Ex2] RE — words: ['could','you','please','close','the','window']
  // → could you please close the window
  // verified: [0,1,2,3,4,5] ✓
  {
    topicTitle: "Modal Verbs", level: "beginner", type: "reorder",
    question: "Rearrange to form a polite request:",
    words: ["could", "you", "please", "close", "the", "window"],
    correct_order: [0, 1, 2, 3, 4, 5],
    explanation: "Correct: 'Could you please close the window?' 'Could you + base verb' is a polite request. More formal than 'Can you?'",
    grammar_tip: "'Could you + base verb?' = polite request.",
    example: "Could you please send me the report by Friday?",
  },

  // ── Modal Verbs – Intermediate ────────────────────────────
  // [0 → Ex1] MC
  {
    topicTitle: "Modal Verbs", level: "intermediate", type: "multiple_choice",
    question: "She ___ be tired — she has been working for 12 hours straight.",
    options: ["can't", "might not", "must", "should"],
    correct_option_index: 2,
    explanation: "'Must' expresses strong logical deduction based on evidence. Working 12 hours is clear evidence that she is tired. 'Must' is used when we are almost certain.",
    grammar_tip: "Modals of deduction: must (certain) > might/may/could (possible) > can't (impossible).",
    example: "He must be hungry — he hasn't eaten all day.",
  },
  // [1 → Ex2] FIB
  {
    topicTitle: "Modal Verbs", level: "intermediate", type: "fill_in_blank",
    question: "You ___ (should) call me. I was very worried about you.",
    correct_answer: "should have called",
    explanation: "'Should have + past participle' expresses regret or criticism about something that didn't happen in the past. You didn't call → that was wrong.",
    grammar_tip: "'Should have + past participle' = past regret or criticism about what didn't happen.",
    example: "I should have studied harder for the exam.",
  },
  // [2 → Ex1] RE — words: ['she','could','have','been','a','doctor','but','chose','to','be','a','teacher']
  // → she could have been a doctor but chose to be a teacher
  // verified: [0,1,2,3,4,5,6,7,8,9,10,11] ✓
  {
    topicTitle: "Modal Verbs", level: "intermediate", type: "reorder",
    question: "Rearrange to form a sentence about an unrealized past possibility:",
    words: ["she", "could", "have", "been", "a", "doctor", "but", "chose", "to", "be", "a", "teacher"],
    correct_order: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    explanation: "Correct: 'She could have been a doctor but chose to be a teacher.' 'Could have + past participle' = an unrealized ability or possibility in the past.",
    grammar_tip: "'Could have + past participle' = past possibility that didn't happen.",
    example: "He could have won the race, but he fell near the finish line.",
  },
  // [3 → Ex2] ED
  {
    topicTitle: "Modal Verbs", level: "intermediate", type: "error_detection",
    question: "Find the error in the sentence:",
    sentence_parts: ["He", "must have stole", "the money —", "no one else was there."],
    error_index: 1,
    corrected_part: "must have stolen",
    explanation: "Perfect modals use the past PARTICIPLE. 'Steal' → past participle is 'stolen'. 'Stole' is the Simple Past form, which is incorrect here.",
    grammar_tip: "Perfect modal: must/might/could/should + have + PAST PARTICIPLE (not Simple Past).",
    example: "He must have forgotten about the meeting.",
  },
  // [4 → Ex1] FIB
  {
    topicTitle: "Modal Verbs", level: "intermediate", type: "fill_in_blank",
    question: "I ___ (used to) wake up at 5 AM every day, but now I sleep until 8.",
    correct_answer: "used to",
    explanation: "'Used to + base verb' describes a past habit or state that no longer exists. She no longer wakes up at 5 AM — it was her past habit.",
    grammar_tip: "'Used to + base verb' = past habit or state (no longer true now).",
    example: "I used to live in the countryside, but now I live in the city.",
  },
  // [5 → Ex2] MC
  {
    topicTitle: "Modal Verbs", level: "intermediate", type: "multiple_choice",
    question: "You ___ leave now or you will miss your train.",
    options: ["had better to", "had better", "have better", "would better"],
    correct_option_index: 1,
    explanation: "'Had better + base verb' gives strong advice with an implied warning. It is a fixed expression — no 'to', no 'have', no 'would'.",
    grammar_tip: "'Had better + base verb' = strong advice/warning. No 'to' after 'better'.",
    example: "You had better hurry or you will be late.",
  },
  // [6 → Ex1] ED
  {
    topicTitle: "Modal Verbs", level: "intermediate", type: "error_detection",
    question: "Find the error in the sentence:",
    sentence_parts: ["I am used to", "wake up", "early every morning,", "even on weekends."],
    error_index: 1,
    corrected_part: "waking up",
    explanation: "'Be used to' means 'be accustomed to' and is always followed by a gerund (verb-ing), not a base verb.",
    grammar_tip: "'Be used to' + gerund (verb-ing): I am used to waking up. She is used to commuting.",
    example: "He is used to working under pressure.",
  },
  // [7 → Ex2] RE — words: ['he','cant','have','stolen','it','he','was','with','me','all','day']
  // → he cant have stolen it he was with me all day
  // verified: [0,1,2,3,4,5,6,7,8,9,10] ✓
  {
    topicTitle: "Modal Verbs", level: "intermediate", type: "reorder",
    question: "Rearrange to form a sentence expressing past impossibility:",
    words: ["he", "can't", "have", "stolen", "it", "he", "was", "with", "me", "all", "day"],
    correct_order: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    explanation: "Correct: 'He can't have stolen it — he was with me all day.' 'Can't have + past participle' expresses impossibility about a past action.",
    grammar_tip: "'Can't have + past participle' = certainty that something did NOT happen in the past.",
    example: "She can't have passed the exam — she didn't study at all.",
  },

  // ── Modal Verbs – Pre-TOEIC ───────────────────────────────
  // [0 → Ex1] MC
  {
    topicTitle: "Modal Verbs", level: "pre-toeic", type: "multiple_choice",
    question: "All visitors ___ register at the front desk before entering the premises.",
    options: ["can", "might", "are required to", "would"],
    correct_option_index: 2,
    explanation: "'Are required to' expresses a rule-based obligation in formal/business English. This is stronger than 'should' and is typical in TOEIC signs and notices.",
    grammar_tip: "'Be required to' = formal obligation (rule or policy). Common in TOEIC Parts 1, 2, and 5.",
    example: "Employees are required to wear identification badges at all times.",
  },
  // [1 → Ex2] FIB
  {
    topicTitle: "Modal Verbs", level: "pre-toeic", type: "fill_in_blank",
    question: "The audit ___ (must) have revealed serious issues in the accounts.",
    correct_answer: "must have revealed",
    explanation: "'Must have + past participle' expresses strong certainty about a past event based on evidence. The accounts show issues — so the audit must have found them.",
    grammar_tip: "'Must have + past participle' = strong certainty about a past action (deduction from evidence).",
    example: "There must have been a problem with the system — all records are missing.",
  },
  // [2 → Ex1] RE — words: ['the','contract','should','have','been','reviewed','by','a','lawyer','before','signing']
  // → the contract should have been reviewed by a lawyer before signing
  // verified: [0,1,2,3,4,5,6,7,8,9,10] ✓
  {
    topicTitle: "Modal Verbs", level: "pre-toeic", type: "reorder",
    question: "Rearrange to form a formal sentence expressing past regret:",
    words: ["the", "contract", "should", "have", "been", "reviewed", "by", "a", "lawyer", "before", "signing"],
    correct_order: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    explanation: "Correct: 'The contract should have been reviewed by a lawyer before signing.' Perfect Modal Passive: should + have been + past participle. Expresses that this was the right thing to do but it wasn't done.",
    grammar_tip: "Perfect Modal Passive: should/could/must + have been + past participle.",
    example: "The report should have been submitted before the deadline.",
  },
  // [3 → Ex2] ED
  {
    topicTitle: "Modal Verbs", level: "pre-toeic", type: "error_detection",
    question: "Find the error in this formal business sentence:",
    sentence_parts: ["Staff members", "are able to", "accessed the system", "using their employee ID."],
    error_index: 2,
    corrected_part: "access the system",
    explanation: "'Be able to' is a semi-modal meaning 'can', and it must be followed by a base verb (infinitive without 'to'), not a past tense form.",
    grammar_tip: "'Be able to' + base verb: 'are able to access' (NOT 'accessed').",
    example: "Managers are able to view all employee records.",
  },
  // [4 → Ex1] FIB
  {
    topicTitle: "Modal Verbs", level: "pre-toeic", type: "fill_in_blank",
    question: "The CEO ___ (might) not have been aware of the financial issues at the time.",
    correct_answer: "might not have been aware",
    explanation: "'Might not have been + adjective' expresses uncertainty about a past state. The CEO possibly didn't know — but we're not certain.",
    grammar_tip: "'Might not have + past participle' = past uncertainty about something that may or may not have occurred.",
    example: "She might not have received the email due to a technical error.",
  },
  // [5 → Ex2] MC
  {
    topicTitle: "Modal Verbs", level: "pre-toeic", type: "multiple_choice",
    question: "The new regulations ___ significantly impact operating costs, so businesses should plan now.",
    options: ["must", "ought to have", "could", "should have"],
    correct_option_index: 2,
    explanation: "'Could' here expresses future possibility — the regulations might or might not have a big impact. 'Must' would imply certainty, which is too strong.",
    grammar_tip: "'Could' = future possibility (less certain than 'will' or 'must'). Appropriate for business predictions.",
    example: "The new tax policy could affect thousands of small businesses.",
  },
  // [6 → Ex1] ED
  {
    topicTitle: "Modal Verbs", level: "pre-toeic", type: "error_detection",
    question: "Find the error in this TOEIC-style sentence:",
    sentence_parts: ["Should you", "need any assistance,", "please do not", "hesitate contacting us."],
    error_index: 3,
    corrected_part: "hesitate to contact us.",
    explanation: "'Hesitate' is followed by a to-infinitive: 'hesitate to do something'. Using 'contacting' (gerund) after 'hesitate' is incorrect.",
    grammar_tip: "'Do not hesitate to + base verb' — standard formal business English phrase.",
    example: "Please do not hesitate to call us if you need further information.",
  },
  // [7 → Ex2] RE — words: ['were','I','in','your','position','I','would','reconsider']
  // → were I in your position I would reconsider
  // verified: [0,1,2,3,4,5,6,7] ✓
  {
    topicTitle: "Modal Verbs", level: "pre-toeic", type: "reorder",
    question: "Rearrange to form a formal sentence using Second Conditional inversion:",
    words: ["were", "I", "in", "your", "position", "I", "would", "reconsider"],
    correct_order: [0, 1, 2, 3, 4, 5, 6, 7],
    explanation: "Correct: 'Were I in your position, I would reconsider.' This is Second Conditional inversion — 'Were + subject + complement' replaces 'If + subject + were'. Common in formal and business writing.",
    grammar_tip: "Second Conditional inversion: Were + subject + complement, would + base verb.",
    example: "Were the company to expand, it would need additional funding.",
  },
];

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Đã kết nối với MongoDB");

  let typeCounters = {};

  for (const q of SAMPLE_QUESTIONS) {
    // Tìm chủ đề phù hợp
    const topic = await Topic.findOne({
      title: { $regex: new RegExp(q.topicTitle, "i") },
    });

    if (!topic) {
      console.warn(`⚠️ Không tìm thấy chủ đề: ${q.topicTitle} — bỏ qua`);
      continue;
    }

    // Đảm bảo cấu hình TopicLevel tồn tại
    const LEVELS = ["beginner", "intermediate", "pre-toeic"];
    for (let i = 0; i < LEVELS.length; i++) {
      await TopicLevel.findOneAndUpdate(
        { topic_id: topic._id, level: LEVELS[i] },
        { unlock_threshold: 1, order: i },
        { upsert: true }
      );
    }

    // Phân bổ vào Bài tập 1 và Bài tập 2 theo kiểu xen kẽ
    const counterKey = `${topic._id}-${q.level}`;
    if (!typeCounters[counterKey]) {
      typeCounters[counterKey] = 0;
    }
    const exerciseOrder = (typeCounters[counterKey] % 2) + 1;
    typeCounters[counterKey]++;

    const exercise = await PracticeExercise.findOneAndUpdate(
      { topic_id: topic._id, level: q.level, order: exerciseOrder },
      { title: `Exercise ${exerciseOrder}` },
      { upsert: true, new: true }
    );

    const { topicTitle, ...questionData } = q;
    await PracticeQuestion.findOneAndUpdate(
      {
        topic_id: topic._id,
        level: q.level,
        type: q.type,
        question: q.question,
      },
      { ...questionData, topic_id: topic._id, exercise_id: exercise._id },
      { upsert: true }
    );

    console.log(
      `✅ Đã thêm: ${q.topicTitle} [${q.level}] (${q.type}) → Exercise ${exerciseOrder}`
    );
  }

  console.log("Quá trình thêm hoàn tất.");
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});