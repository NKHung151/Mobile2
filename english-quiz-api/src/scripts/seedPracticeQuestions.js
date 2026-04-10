// english-quiz-api/src/scripts/seedPracticeQuestions.js
// Chạy: node src/scripts/seedPracticeQuestions.js
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });
const mongoose = require("mongoose");
const PracticeQuestion = require("../models/PracticeQuestion");
const TopicLevel = require("../models/TopicLevel");
const Topic = require("../models/Topic");

/*
 * CƠ CHẾ PHÂN BỔ:
 * Mỗi topic-level có counter bắt đầu từ 0.
 * Câu thứ N → exerciseOrder = (N % 2) + 1
 * Để mỗi exercise có đúng 4 dạng khác nhau (multiple_choice, fill_in_blank, reorder, error_detection),
 * thứ tự trong mảng phải là: MC, FIB, RE, ED, MC, FIB, RE, ED
 * → Exercise 1 nhận câu 1(MC), 3(RE), 5(MC), 7(RE)  -- các câu lẻ
 * → Exercise 2 nhận câu 2(FIB), 4(ED), 6(FIB), 8(ED)
 * Để mỗi exercise có ĐỦ 4 DẠNG KHÁC NHAU, thứ tự đúng phải là:
 * Vị trí 0(→Ex1): MC, Vị trí 1(→Ex2): FIB, Vị trí 2(→Ex1): RE, Vị trí 3(→Ex2): ED,
 * Vị trí 4(→Ex1): FIB, Vị trí 5(→Ex2): MC, Vị trí 6(→Ex1): ED, Vị trí 7(→Ex2): RE
 * Kết quả: Ex1 = MC, RE, FIB, ED ✓  |  Ex2 = FIB, ED, MC, RE ✓
 */

const SAMPLE_QUESTIONS = [

  // ══════════════════════════════════════════════════════════
  // TOPIC: Simple Sentences
  // ══════════════════════════════════════════════════════════

  // ── Simple Sentences – Beginner (8 câu) ──────────────────
  // Vị trí 0 → Ex1: multiple_choice
  {
    topicTitle: "Simple Sentences",
    level: "beginner",
    type: "multiple_choice",
    question: "Which of the following is a correct simple sentence?",
    options: [
      "Because she was tired.",
      "She went to school.",
      "Running fast every morning.",
      "When the rain stopped.",
    ],
    correct_option_index: 1,
    explanation:
      "A simple sentence must have a subject ('She') and a complete verb ('went to school'). The other options are sentence fragments missing a complete subject-verb structure.",
    grammar_tip: "Simple sentence = Subject + Verb (+ Object/Complement).",
    example: "The cat sat on the mat.",
  },
  // Vị trí 1 → Ex2: fill_in_blank
  {
    topicTitle: "Simple Sentences",
    level: "beginner",
    type: "fill_in_blank",
    question: "She ___ (go) to the market every Saturday.",
    correct_answer: "goes",
    explanation:
      "'She' is third person singular, so the verb 'go' must add -s: 'goes'. This is subject-verb agreement in the Simple Present tense.",
    grammar_tip: "He/She/It + verb + s/es in Simple Present.",
    example: "He plays football on Sundays.",
  },
  // Vị trí 2 → Ex1: reorder
  {
    topicTitle: "Simple Sentences",
    level: "beginner",
    type: "reorder",
    question: "Rearrange the words to form a correct sentence:",
    words: ["likes", "Tom", "music", "classical"],
    correct_order: [1, 0, 3, 2],
    explanation:
      "The correct order is: Subject (Tom) + Verb (likes) + Object (classical music). Adjectives come before the noun they modify.",
    grammar_tip: "Adjective comes before the noun: 'classical music', not 'music classical'.",
    example: "She drinks hot coffee.",
  },
  // Vị trí 3 → Ex2: error_detection
  {
    topicTitle: "Simple Sentences",
    level: "beginner",
    type: "error_detection",
    question: "Find the error in the sentence:",
    sentence_parts: ["My brother", "go", "to school", "every day."],
    error_index: 1,
    corrected_part: "goes",
    explanation:
      "'My brother' is third person singular. The verb must be 'goes', not 'go'.",
    grammar_tip: "Subject-verb agreement: He/She/It → verb + s/es.",
    example: "My sister goes to work early.",
  },
  // Vị trí 4 → Ex1: fill_in_blank
  {
    topicTitle: "Simple Sentences",
    level: "beginner",
    type: "fill_in_blank",
    question: "The children ___ (play) in the garden right now.",
    correct_answer: "are playing",
    explanation:
      "'Right now' signals Present Continuous tense. Formula: subject + am/is/are + verb-ing. 'The children' is plural, so we use 'are playing'.",
    grammar_tip: "Use Present Continuous (am/is/are + verb-ing) for actions happening right now.",
    example: "She is reading a book at the moment.",
  },
  // Vị trí 5 → Ex2: multiple_choice
  {
    topicTitle: "Simple Sentences",
    level: "beginner",
    type: "multiple_choice",
    question: "Which sentence has a compound subject?",
    options: [
      "She sings beautifully.",
      "Tom and Mary love pizza.",
      "He reads and writes every day.",
      "The dog runs fast.",
    ],
    correct_option_index: 1,
    explanation:
      "'Tom and Mary' is a compound subject — two subjects sharing one verb 'love'. Option C has a compound predicate (two verbs), not a compound subject.",
    grammar_tip: "Compound subject = two or more subjects joined by 'and' sharing one verb.",
    example: "My mother and father work in the same hospital.",
  },
  // Vị trí 6 → Ex1: error_detection
  {
    topicTitle: "Simple Sentences",
    level: "beginner",
    type: "error_detection",
    question: "Find the error in the sentence:",
    sentence_parts: ["Everyone", "love", "ice cream", "in summer."],
    error_index: 1,
    corrected_part: "loves",
    explanation:
      "'Everyone' is an indefinite pronoun and takes a singular verb. The correct form is 'loves'.",
    grammar_tip: "Everyone, nobody, someone, anyone → singular verb.",
    example: "Nobody knows the answer.",
  },
  // Vị trí 7 → Ex2: reorder
  {
    topicTitle: "Simple Sentences",
    level: "beginner",
    type: "reorder",
    question: "Rearrange the words to form a correct sentence:",
    words: ["quickly", "runs", "the", "boy", "tall"],
    correct_order: [2, 4, 3, 1, 0],
    explanation:
      "Correct order: The (article) + tall (adjective) + boy (subject) + runs (verb) + quickly (adverb). Adjectives precede nouns; adverbs follow verbs.",
    grammar_tip: "Article + Adjective + Noun + Verb + Adverb.",
    example: "The young girl dances gracefully.",
  },

  // ── Simple Sentences – Intermediate (8 câu) ──────────────
  // Vị trí 0 → Ex1: multiple_choice
  {
    topicTitle: "Simple Sentences",
    level: "intermediate",
    type: "multiple_choice",
    question: "Which sentence uses a transitive verb correctly?",
    options: [
      "She arrived the station.",
      "He donated the charity.",
      "She kicked the ball hard.",
      "They slept the night.",
    ],
    correct_option_index: 2,
    explanation:
      "'Kick' is a transitive verb that requires a direct object. 'The ball' is the direct object. 'Arrive' and 'sleep' are intransitive and cannot take direct objects.",
    grammar_tip: "Transitive verb = requires a direct object. Intransitive verb = no direct object.",
    example: "He threw the ball over the fence.",
  },
  // Vị trí 1 → Ex2: fill_in_blank
  {
    topicTitle: "Simple Sentences",
    level: "intermediate",
    type: "fill_in_blank",
    question: "The soup ___ (taste) delicious — I can smell it from here.",
    correct_answer: "tastes",
    explanation:
      "'Taste' here is a linking verb connecting the subject 'The soup' to its complement 'delicious'. Linking verbs (taste, smell, look, seem) are not used in continuous form when expressing a state.",
    grammar_tip: "Stative/linking verbs (taste, smell, feel, seem) use simple tense, not continuous.",
    example: "This coffee smells wonderful.",
  },
  // Vị trí 2 → Ex1: reorder
  {
    topicTitle: "Simple Sentences",
    level: "intermediate",
    type: "reorder",
    question: "Rearrange the words to form a correct sentence with an appositive:",
    words: ["a", "doctor", "my", "brother", "hospital", "works", "at", "the"],
    correct_order: [2, 3, 0, 1, 5, 6, 7, 4],
    explanation:
      "Correct: 'My brother, a doctor, works at the hospital.' The appositive 'a doctor' renames the subject 'my brother' and is set off by commas.",
    grammar_tip: "An appositive is a noun phrase that renames the subject; it is placed directly after the noun.",
    example: "Her sister, a famous chef, opened a new restaurant.",
  },
  // Vị trí 3 → Ex2: error_detection
  {
    topicTitle: "Simple Sentences",
    level: "intermediate",
    type: "error_detection",
    question: "Find the error in the sentence:",
    sentence_parts: ["Running to school,", "the rain", "started", "suddenly."],
    error_index: 1,
    corrected_part: "she",
    explanation:
      "This is a dangling modifier. The participial phrase 'Running to school' must logically refer to the subject of the main clause. The rain cannot run to school. The correct subject should be a person.",
    grammar_tip: "The participial phrase must agree with the subject of the main clause to avoid a dangling modifier.",
    example: "Running to school, she got caught in the rain.",
  },
  // Vị trí 4 → Ex1: fill_in_blank
  {
    topicTitle: "Simple Sentences",
    level: "intermediate",
    type: "fill_in_blank",
    question: "___ (swim) is excellent exercise for the whole body.",
    correct_answer: "Swimming",
    explanation:
      "A gerund (verb + -ing) can function as the subject of a sentence. 'Swimming' acts as the subject here, followed by the linking verb 'is'.",
    grammar_tip: "Gerund (verb + -ing) can be the subject of a sentence.",
    example: "Reading improves vocabulary significantly.",
  },
  // Vị trí 5 → Ex2: multiple_choice
  {
    topicTitle: "Simple Sentences",
    level: "intermediate",
    type: "multiple_choice",
    question: "Which sentence correctly uses a linking verb?",
    options: [
      "She became successfully after years of work.",
      "He seemed very nervously during the interview.",
      "The milk turned sour after two days.",
      "They appeared happily at the news.",
    ],
    correct_option_index: 2,
    explanation:
      "After linking verbs (become, seem, appear, turn, smell, taste), we use adjectives, not adverbs. 'Sour' is an adjective correctly following the linking verb 'turned'.",
    grammar_tip: "Linking verb + adjective (NOT adverb): She looks happy. He seems nervous.",
    example: "The flower smells sweet.",
  },
  // Vị trí 6 → Ex1: error_detection
  {
    topicTitle: "Simple Sentences",
    level: "intermediate",
    type: "error_detection",
    question: "Find the error in the sentence:",
    sentence_parts: ["To learn", "a new language", "take", "a lot of time and effort."],
    error_index: 2,
    corrected_part: "takes",
    explanation:
      "When an infinitive phrase ('To learn a new language') acts as the subject, it is treated as singular, requiring 'takes' (third person singular).",
    grammar_tip: "Infinitive or gerund as subject → singular verb.",
    example: "To travel the world requires money and courage.",
  },
  // Vị trí 7 → Ex2: reorder
  {
    topicTitle: "Simple Sentences",
    level: "intermediate",
    type: "reorder",
    question: "Rearrange the words to form a correct sentence:",
    words: ["the", "excited", "trip", "packed", "about", "she", "bags", "her"],
    correct_order: [5, 1, 3, 7, 3, 0, 2],
    explanation:
      "Correct: 'Excited about the trip, she packed her bags.' The participial phrase 'Excited about the trip' correctly modifies the subject 'she'.",
    grammar_tip: "Participial phrase + comma + subject + verb. The phrase must logically describe the subject.",
    example: "Tired after the long journey, he went straight to bed.",
  },

  // ── Simple Sentences – Pre-TOEIC (8 câu) ────────────────
  // Vị trí 0 → Ex1: multiple_choice
  {
    topicTitle: "Simple Sentences",
    level: "pre-toeic",
    type: "multiple_choice",
    question: "The board of directors ___ scheduled to meet next Thursday.",
    options: ["is", "are", "were", "have"],
    correct_option_index: 0,
    explanation:
      "In formal/business English, collective nouns like 'board of directors' are treated as singular units, so they take singular verbs ('is').",
    grammar_tip: "Collective nouns (committee, board, team, staff) → singular verb in American English.",
    example: "The committee has reached a decision.",
  },
  // Vị trí 1 → Ex2: fill_in_blank
  {
    topicTitle: "Simple Sentences",
    level: "pre-toeic",
    type: "fill_in_blank",
    question: "The number of applicants for this position ___ increased significantly this year.",
    correct_answer: "has",
    explanation:
      "'The number of' takes a singular verb. Compare with 'A number of applicants have applied' where 'a number of' takes a plural verb.",
    grammar_tip: "'The number of' + plural noun → singular verb. 'A number of' + plural noun → plural verb.",
    example: "The number of students in the class has grown.",
  },
  // Vị trí 2 → Ex1: reorder
  {
    topicTitle: "Simple Sentences",
    level: "pre-toeic",
    type: "reorder",
    question: "Rearrange to form a professional business sentence:",
    words: ["submitted", "the", "deadline", "before", "report", "was", "the"],
    correct_order: [1, 4, 5, 0, 3, 1, 2],
    explanation:
      "Correct: 'The report was submitted before the deadline.' This is a passive simple sentence in the past tense commonly used in business writing.",
    grammar_tip: "Passive simple sentence: Subject + was/were + past participle + time expression.",
    example: "The contract was signed by both parties.",
  },
  // Vị trí 3 → Ex2: error_detection
  {
    topicTitle: "Simple Sentences",
    level: "pre-toeic",
    type: "error_detection",
    question: "Find the error in this business sentence:",
    sentence_parts: ["Neither the manager", "nor the employees", "was", "informed about the decision."],
    error_index: 2,
    corrected_part: "were",
    explanation:
      "With 'neither...nor', the verb agrees with the noun closer to it. 'The employees' (plural) is closer, so the verb must be 'were'.",
    grammar_tip: "Neither...nor / Either...or → verb agrees with the noun closest to it.",
    example: "Neither the director nor the staff members were present.",
  },
  // Vị trí 4 → Ex1: fill_in_blank
  {
    topicTitle: "Simple Sentences",
    level: "pre-toeic",
    type: "fill_in_blank",
    question: "Each of the new employees ___ required to complete a training program.",
    correct_answer: "is",
    explanation:
      "'Each of' is followed by a plural noun but takes a singular verb because the pronoun 'each' refers to individuals one at a time.",
    grammar_tip: "'Each of', 'every one of', 'either of' → singular verb.",
    example: "Each of the documents is ready for review.",
  },
  // Vị trí 5 → Ex2: multiple_choice
  {
    topicTitle: "Simple Sentences",
    level: "pre-toeic",
    type: "multiple_choice",
    question: "The CEO, along with his senior advisors, ___ a statement to the press.",
    options: ["have released", "release", "released", "were releasing"],
    correct_option_index: 2,
    explanation:
      "When a subject is followed by phrases like 'along with', 'as well as', or 'together with', the verb agrees with the main subject. 'The CEO' is singular → past tense singular 'released'. The phrase 'along with his senior advisors' is parenthetical.",
    grammar_tip: "Subject + 'along with/as well as/together with' + phrase → verb agrees with main subject only.",
    example: "The president, along with his cabinet members, signed the bill.",
  },
  // Vị trí 6 → Ex1: error_detection
  {
    topicTitle: "Simple Sentences",
    level: "pre-toeic",
    type: "error_detection",
    question: "Find the error in this TOEIC-style sentence:",
    sentence_parts: ["Statistics", "show", "that consumer confidence", "have risen steadily."],
    error_index: 3,
    corrected_part: "has risen steadily",
    explanation:
      "'Consumer confidence' is an uncountable noun/singular concept acting as the subject of the relative clause. It requires 'has risen', not 'have risen'.",
    grammar_tip: "Abstract and uncountable nouns (confidence, information, advice) → singular verb.",
    example: "Consumer spending has increased by 3% this quarter.",
  },
  // Vị trí 7 → Ex2: reorder
  {
    topicTitle: "Simple Sentences",
    level: "pre-toeic",
    type: "reorder",
    question: "Rearrange to form a correct formal sentence:",
    words: ["profitability", "significantly", "the", "improved", "company's", "has"],
    correct_order: [2, 4, 0, 5, 3, 1],
    explanation:
      "Correct: 'The company's profitability has improved significantly.' Subject (The company's profitability) + Present Perfect auxiliary (has) + past participle (improved) + adverb (significantly).",
    grammar_tip: "In formal writing, adverbs of degree often appear at the end of the clause.",
    example: "The firm's revenue has grown substantially this quarter.",
  },

  // ══════════════════════════════════════════════════════════
  // TOPIC: Tenses
  // ══════════════════════════════════════════════════════════

  // ── Tenses – Beginner (8 câu) ────────────────────────────
  // Vị trí 0 → Ex1: multiple_choice
  {
    topicTitle: "Tenses",
    level: "beginner",
    type: "multiple_choice",
    question: "Which sentence is in the Simple Present tense?",
    options: [
      "She was eating lunch.",
      "She eats lunch every day.",
      "She will eat lunch soon.",
      "She has eaten lunch.",
    ],
    correct_option_index: 1,
    explanation:
      "Simple Present uses the base form of the verb (eats for he/she/it). It describes habits and routines. 'Every day' is a key time signal.",
    grammar_tip: "Simple Present time signals: always, usually, often, every day, never.",
    example: "He drinks coffee every morning.",
  },
  // Vị trí 1 → Ex2: fill_in_blank
  {
    topicTitle: "Tenses",
    level: "beginner",
    type: "fill_in_blank",
    question: "Look! The children ___ (play) in the yard.",
    correct_answer: "are playing",
    explanation:
      "'Look!' signals something happening at this moment, so we use Present Continuous (am/is/are + verb-ing). 'The children' is plural → 'are playing'.",
    grammar_tip: "Present Continuous time signals: look!, listen!, now, at the moment, right now.",
    example: "Listen! Someone is knocking at the door.",
  },
  // Vị trí 2 → Ex1: reorder
  {
    topicTitle: "Tenses",
    level: "beginner",
    type: "reorder",
    question: "Rearrange the words to form a correct sentence in Simple Past:",
    words: ["yesterday", "she", "a", "book", "read"],
    correct_order: [1, 4, 2, 3, 0],
    explanation:
      "Correct: 'She read a book yesterday.' 'Read' is an irregular verb — its Simple Past form is also 'read' (pronounced /rɛd/). 'Yesterday' is a Simple Past signal.",
    grammar_tip: "Simple Past irregular verb: read → read. Time signal: yesterday, last night, ago.",
    example: "He went to the cinema last Friday.",
  },
  // Vị trí 3 → Ex2: error_detection
  {
    topicTitle: "Tenses",
    level: "beginner",
    type: "error_detection",
    question: "Find the error in the sentence:",
    sentence_parts: ["Last night,", "I have watched", "a great movie", "with my friends."],
    error_index: 1,
    corrected_part: "I watched",
    explanation:
      "'Last night' is a specific past time expression. We must use Simple Past, not Present Perfect. Present Perfect cannot be used with specific finished time expressions.",
    grammar_tip: "Never use Present Perfect with: yesterday, last week, in 2010, ago, when.",
    example: "I saw him yesterday. (NOT: I have seen him yesterday.)",
  },
  // Vị trí 4 → Ex1: fill_in_blank
  {
    topicTitle: "Tenses",
    level: "beginner",
    type: "fill_in_blank",
    question: "She ___ (not/eat) meat. She is a vegetarian.",
    correct_answer: "does not eat",
    explanation:
      "For negative Simple Present with he/she/it, use does not + base verb. The main verb does NOT add -s when 'does' is used.",
    grammar_tip: "Negative Simple Present: He/She/It + does not (doesn't) + base verb.",
    example: "He doesn't drink coffee.",
  },
  // Vị trí 5 → Ex2: multiple_choice
  {
    topicTitle: "Tenses",
    level: "beginner",
    type: "multiple_choice",
    question: "Which sentence uses 'will' correctly for a spontaneous decision?",
    options: [
      "I will go to Paris next month — I booked the ticket last week.",
      "Oh, the phone is ringing! I'll answer it.",
      "Tonight, I will cook dinner — I planned it yesterday.",
      "She will take the exam next Monday.",
    ],
    correct_option_index: 1,
    explanation:
      "'Will' is used for spontaneous decisions made at the moment of speaking. 'Oh, the phone is ringing — I'll answer it' is a decision made at that instant.",
    grammar_tip: "'Will' = spontaneous decision. 'Be going to' = pre-planned decision.",
    example: "A: There's no milk. B: I'll go and buy some.",
  },
  // Vị trí 6 → Ex1: error_detection
  {
    topicTitle: "Tenses",
    level: "beginner",
    type: "error_detection",
    question: "Find the error in the sentence:",
    sentence_parts: ["I", "am knowing", "the answer", "to that question."],
    error_index: 1,
    corrected_part: "know",
    explanation:
      "'Know' is a stative verb expressing a mental state. Stative verbs are not used in continuous tenses.",
    grammar_tip: "Stative verbs (know, believe, want, love, hate, see, hear) → use Simple, not Continuous.",
    example: "I know the answer. (NOT: I am knowing the answer.)",
  },
  // Vị trí 7 → Ex2: reorder
  {
    topicTitle: "Tenses",
    level: "beginner",
    type: "reorder",
    question: "Rearrange the words to form a correct future sentence:",
    words: ["going", "she", "is", "study", "to", "medicine"],
    correct_order: [1, 2, 0, 4, 3, 5],
    explanation:
      "Correct: 'She is going to study medicine.' Formula: Subject + am/is/are + going to + base verb. This expresses a plan or intention.",
    grammar_tip: "Be going to = planned intention. Formula: am/is/are + going to + base verb.",
    example: "We are going to visit my grandparents next weekend.",
  },

  // ── Tenses – Intermediate (8 câu) ────────────────────────
  // Vị trí 0 → Ex1: multiple_choice
  {
    topicTitle: "Tenses",
    level: "intermediate",
    type: "multiple_choice",
    question: "By the time she arrived, they ___ all the food.",
    options: ["eat", "ate", "had eaten", "have eaten"],
    correct_option_index: 2,
    explanation:
      "Past Perfect (had + past participle) is used for an action completed BEFORE another past action. Eating was completed before she arrived.",
    grammar_tip: "Past Perfect: had + past participle — for the earlier of two past events.",
    example: "When I got home, my family had already started dinner.",
  },
  // Vị trí 1 → Ex2: fill_in_blank
  {
    topicTitle: "Tenses",
    level: "intermediate",
    type: "fill_in_blank",
    question: "She ___ (study) for 3 hours when the power went out.",
    correct_answer: "had been studying",
    explanation:
      "Past Perfect Continuous (had been + verb-ing) emphasizes the duration of an ongoing activity before another past event.",
    grammar_tip: "Past Perfect Continuous = had been + verb-ing. Shows duration before a past event.",
    example: "They had been waiting for an hour before the bus arrived.",
  },
  // Vị trí 2 → Ex1: reorder
  {
    topicTitle: "Tenses",
    level: "intermediate",
    type: "reorder",
    question: "Rearrange to form a correct Present Perfect sentence:",
    words: ["visited", "never", "Paris", "I", "have"],
    correct_order: [3, 4, 1, 0, 2],
    explanation:
      "Correct: 'I have never visited Paris.' Formula: Subject + have/has + adverb + past participle. 'Never' goes between 'have' and the main verb.",
    grammar_tip: "Present Perfect: Subject + have/has + (never/already/just) + past participle.",
    example: "She has already finished her homework.",
  },
  // Vị trí 3 → Ex2: error_detection
  {
    topicTitle: "Tenses",
    level: "intermediate",
    type: "error_detection",
    question: "Find the error in the sentence:",
    sentence_parts: ["She has lived", "in Hanoi", "since", "ten years."],
    error_index: 3,
    corrected_part: "for ten years",
    explanation:
      "'Since' is used with a specific point in time (since 2010, since Monday). 'For' is used with a duration (for ten years, for a long time).",
    grammar_tip: "'Since' + starting point. 'For' + duration of time.",
    example: "I have worked here for five years / since 2019.",
  },
  // Vị trí 4 → Ex1: fill_in_blank
  {
    topicTitle: "Tenses",
    level: "intermediate",
    type: "fill_in_blank",
    question: "This time tomorrow, she ___ (fly) to Japan.",
    correct_answer: "will be flying",
    explanation:
      "Future Continuous (will be + verb-ing) describes an action in progress at a specific moment in the future. 'This time tomorrow' signals a future moment.",
    grammar_tip: "Future Continuous: will be + verb-ing. For actions in progress at a future moment.",
    example: "At 8 PM tonight, I will be watching the match.",
  },
  // Vị trí 5 → Ex2: multiple_choice
  {
    topicTitle: "Tenses",
    level: "intermediate",
    type: "multiple_choice",
    question: "We cannot use Present Perfect with ___.",
    options: [
      "just",
      "already",
      "last Monday",
      "recently",
    ],
    correct_option_index: 2,
    explanation:
      "Present Perfect cannot be used with specific finished time expressions like 'last Monday', 'yesterday', or 'in 2010'. These require Simple Past.",
    grammar_tip: "Use Simple Past (not Present Perfect) with specific past time: yesterday, last week, in [year], ago.",
    example: "I met him last Monday. (NOT: I have met him last Monday.)",
  },
  // Vị trí 6 → Ex1: error_detection
  {
    topicTitle: "Tenses",
    level: "intermediate",
    type: "error_detection",
    question: "Find the error in the sentence:",
    sentence_parts: ["When she", "will arrive,", "we will start", "the meeting."],
    error_index: 1,
    corrected_part: "arrives,",
    explanation:
      "In time clauses (when, as soon as, before, after, until), we use Present Simple, not Future tense, even when referring to future events.",
    grammar_tip: "Time clauses with when/as soon as/before/after → Simple Present for future meaning.",
    example: "Call me when you arrive. (NOT: when you will arrive)",
  },
  // Vị trí 7 → Ex2: reorder
  {
    topicTitle: "Tenses",
    level: "intermediate",
    type: "reorder",
    question: "Rearrange to form a Future Perfect sentence:",
    words: ["graduated", "will", "she", "2030", "have", "by"],
    correct_order: [2, 1, 4, 0, 5, 3],
    explanation:
      "Correct: 'She will have graduated by 2030.' Future Perfect (will have + past participle) describes an action completed before a specific future point.",
    grammar_tip: "Future Perfect: will have + past participle. Use with 'by + future time'.",
    example: "By next year, we will have finished the project.",
  },

  // ── Tenses – Pre-TOEIC (8 câu) ──────────────────────────
  // Vị trí 0 → Ex1: multiple_choice
  {
    topicTitle: "Tenses",
    level: "pre-toeic",
    type: "multiple_choice",
    question: "The new branch office ___ for six months before the company decided to close it.",
    options: [
      "has been operating",
      "had been operating",
      "was operating",
      "operated",
    ],
    correct_option_index: 1,
    explanation:
      "Past Perfect Continuous (had been + verb-ing) emphasizes the duration of an ongoing past activity before another completed past event (the decision to close). This is a common structure in TOEIC Part 5.",
    grammar_tip: "Past Perfect Continuous: had been + verb-ing — duration before a past reference point.",
    example: "The factory had been producing goods for 20 years before it shut down.",
  },
  // Vị trí 1 → Ex2: fill_in_blank
  {
    topicTitle: "Tenses",
    level: "pre-toeic",
    type: "fill_in_blank",
    question: "By the end of this fiscal year, the company ___ (achieve) its revenue target.",
    correct_answer: "will have achieved",
    explanation:
      "Future Perfect (will have + past participle) is used to express completion of an action before a specific future point ('by the end of this fiscal year').",
    grammar_tip: "Future Perfect: will have + past participle. Triggered by 'by + future time'.",
    example: "By 2030, the team will have completed the five-year plan.",
  },
  // Vị trí 2 → Ex1: reorder
  {
    topicTitle: "Tenses",
    level: "pre-toeic",
    type: "reorder",
    question: "Rearrange to form a correct TOEIC-level sentence:",
    words: ["have", "department", "since", "the", "merged", "been", "sales", "the", "two", "divisions"],
    correct_order: [3, 7, 0, 5, 4, 8, 9, 2, 0, 6],
    explanation:
      "Correct: 'The sales department has merged the two divisions since...' or 'The two divisions have been merged since...' Present Perfect Passive is common in business English for recent actions with current relevance.",
    grammar_tip: "Present Perfect (have/has + past participle) = past action with present relevance.",
    example: "The company has expanded its operations since last year.",
  },
  // Vị trí 3 → Ex2: error_detection
  {
    topicTitle: "Tenses",
    level: "pre-toeic",
    type: "error_detection",
    question: "Find the error in this TOEIC-style sentence:",
    sentence_parts: ["The quarterly report", "had been submitted", "as soon as the manager", "will approve it."],
    error_index: 3,
    corrected_part: "approves it",
    explanation:
      "In time clauses (as soon as, when, before, after), the present tense is used even for future meaning. 'Will approve' is incorrect; use 'approves'.",
    grammar_tip: "Time clauses (as soon as, once, when) → Simple Present for future events.",
    example: "The report will be sent as soon as the CEO approves it.",
  },
  // Vị trí 4 → Ex1: fill_in_blank
  {
    topicTitle: "Tenses",
    level: "pre-toeic",
    type: "fill_in_blank",
    question: "Sales ___ (rise) steadily for the past three quarters, and analysts predict continued growth.",
    correct_answer: "have been rising",
    explanation:
      "Present Perfect Continuous (have/has been + verb-ing) is used for an ongoing action that started in the past and continues to the present, often emphasizing duration. 'For the past three quarters' confirms duration.",
    grammar_tip: "Present Perfect Continuous: have/has been + verb-ing — ongoing duration from past to now.",
    example: "Revenue has been increasing since the new strategy was implemented.",
  },
  // Vị trí 5 → Ex2: multiple_choice
  {
    topicTitle: "Tenses",
    level: "pre-toeic",
    type: "multiple_choice",
    question: "The shipment ___ before the warehouse closed for the holidays.",
    options: [
      "has arrived",
      "arrived",
      "had arrived",
      "was arriving",
    ],
    correct_option_index: 2,
    explanation:
      "Past Perfect (had arrived) shows that the shipment's arrival was completed before another past event (the warehouse closing). This is the earlier of two past actions.",
    grammar_tip: "Past Perfect: had + past participle — for the event that happened FIRST in the past.",
    example: "The client had left by the time we called.",
  },
  // Vị trí 6 → Ex1: error_detection
  {
    topicTitle: "Tenses",
    level: "pre-toeic",
    type: "error_detection",
    question: "Find the error in this TOEIC-style sentence:",
    sentence_parts: ["The marketing team", "has launched", "the new campaign", "since last Tuesday."],
    error_index: 1,
    corrected_part: "launched",
    explanation:
      "'Since last Tuesday' indicates a specific point in the recent past, but combined with 'launched' (a one-time completed action), Simple Past is more natural. Present Perfect with 'since' works for ongoing states, not one-time events.",
    grammar_tip: "For a single completed action at a specific past time, use Simple Past. Present Perfect + 'since' = state/ongoing activity.",
    example: "The team launched the campaign last Tuesday.",
  },
  // Vị trí 7 → Ex2: reorder
  {
    topicTitle: "Tenses",
    level: "pre-toeic",
    type: "reorder",
    question: "Rearrange to form a correct business sentence:",
    words: ["next", "completing", "will", "the", "be", "project", "team", "month", "the", "by"],
    correct_order: [3, 6, 0, 4, 2, 1, 8, 5, 9, 7],
    explanation:
      "Correct: 'The team will be completing the project by next month.' Future Continuous (will be + verb-ing) describes an ongoing action at a future time. 'By next month' provides the future reference point.",
    grammar_tip: "Future Continuous: will be + verb-ing — action in progress at a future time.",
    example: "This time next week, the auditors will be reviewing our accounts.",
  },

  // ══════════════════════════════════════════════════════════
  // TOPIC: Active / Passive
  // ══════════════════════════════════════════════════════════

  // ── Active/Passive – Beginner (8 câu) ────────────────────
  // Vị trí 0 → Ex1: multiple_choice
  {
    topicTitle: "Active / Passive",
    level: "beginner",
    type: "multiple_choice",
    question: "Which sentence is in the passive voice?",
    options: [
      "The chef cooks the meal.",
      "The meal is cooked by the chef.",
      "She cleaned the room.",
      "They are building a house.",
    ],
    correct_option_index: 1,
    explanation:
      "In passive voice, the subject receives the action. 'The meal' (subject) receives the action 'is cooked'. The formula is: be + past participle.",
    grammar_tip: "Passive voice: Subject + be + past participle (+ by + agent).",
    example: "The letter was written by her.",
  },
  // Vị trí 1 → Ex2: fill_in_blank
  {
    topicTitle: "Active / Passive",
    level: "beginner",
    type: "fill_in_blank",
    question: "English ___ (speak) all over the world.",
    correct_answer: "is spoken",
    explanation:
      "Simple Present Passive: am/is/are + past participle. 'English' is singular → 'is spoken'. The agent is omitted because it's obvious (people in general).",
    grammar_tip: "Simple Present Passive: am/is/are + past participle.",
    example: "Rice is grown in Vietnam.",
  },
  // Vị trí 2 → Ex1: reorder
  {
    topicTitle: "Active / Passive",
    level: "beginner",
    type: "reorder",
    question: "Rearrange to form a correct passive sentence:",
    words: ["the", "manager", "letter", "was", "sent", "the", "by"],
    correct_order: [2, 3, 4, 6, 0, 1, 5],
    explanation:
      "Correct: 'The letter was sent by the manager.' Simple Past Passive: Subject + was/were + past participle + by + agent.",
    grammar_tip: "Simple Past Passive: was/were + past participle.",
    example: "The cake was baked by my mother.",
  },
  // Vị trí 3 → Ex2: error_detection
  {
    topicTitle: "Active / Passive",
    level: "beginner",
    type: "error_detection",
    question: "Find the error in the passive sentence:",
    sentence_parts: ["The window", "was broke", "by the ball", "during the game."],
    error_index: 1,
    corrected_part: "was broken",
    explanation:
      "'Broke' is the Simple Past form of 'break'. In passive voice, we need the past participle 'broken'. Passive = was + past participle, not was + Simple Past.",
    grammar_tip: "Passive voice uses the past PARTICIPLE, not the Simple Past form. break → broken.",
    example: "The vase was broken accidentally.",
  },
  // Vị trí 4 → Ex1: fill_in_blank
  {
    topicTitle: "Active / Passive",
    level: "beginner",
    type: "fill_in_blank",
    question: "The road ___ (repair) right now. We have to take a different route.",
    correct_answer: "is being repaired",
    explanation:
      "'Right now' signals Present Continuous. Present Continuous Passive: am/is/are + being + past participle.",
    grammar_tip: "Present Continuous Passive: am/is/are + being + past participle.",
    example: "The building is being painted this week.",
  },
  // Vị trí 5 → Ex2: multiple_choice
  {
    topicTitle: "Active / Passive",
    level: "beginner",
    type: "multiple_choice",
    question: "Which verb CANNOT be made passive?",
    options: ["write", "arrive", "build", "eat"],
    correct_option_index: 1,
    explanation:
      "'Arrive' is an intransitive verb — it does not take a direct object. Only transitive verbs (which take objects) can be converted to passive voice.",
    grammar_tip: "Only transitive verbs (with a direct object) can be made passive. Intransitive verbs (arrive, sleep, die) cannot.",
    example: "She arrived early. (Cannot say: 'Early was arrived by her.')",
  },
  // Vị trí 6 → Ex1: error_detection
  {
    topicTitle: "Active / Passive",
    level: "beginner",
    type: "error_detection",
    question: "Find the error in the passive sentence:",
    sentence_parts: ["Three people", "were injure", "in the accident", "last night."],
    error_index: 1,
    corrected_part: "were injured",
    explanation:
      "The passive requires the past participle 'injured', not the base form 'injure'. Passive = was/were + past participle.",
    grammar_tip: "Passive: be + past participle. 'Injure' → past participle is 'injured'.",
    example: "Two workers were injured at the construction site.",
  },
  // Vị trí 7 → Ex2: reorder
  {
    topicTitle: "Active / Passive",
    level: "beginner",
    type: "reorder",
    question: "Rearrange to form a passive sentence in Present Perfect:",
    words: ["been", "the", "has", "report", "submitted"],
    correct_order: [1, 3, 2, 0, 4],
    explanation:
      "Correct: 'The report has been submitted.' Present Perfect Passive: have/has + been + past participle. The agent is omitted as it is not important.",
    grammar_tip: "Present Perfect Passive: have/has + been + past participle.",
    example: "The application has been approved.",
  },

  // ── Active/Passive – Intermediate (8 câu) ────────────────
  // Vị trí 0 → Ex1: multiple_choice
  {
    topicTitle: "Active / Passive",
    level: "intermediate",
    type: "multiple_choice",
    question: "The new policy ___ by the board last month.",
    options: [
      "has been approved",
      "was approved",
      "is approved",
      "had approved",
    ],
    correct_option_index: 1,
    explanation:
      "'Last month' indicates a specific past time, so Simple Past Passive (was/were + past participle) is correct. Present Perfect cannot be used with 'last month'.",
    grammar_tip: "Simple Past Passive: was/were + past participle — with specific past time expressions.",
    example: "The contract was signed by both parties last week.",
  },
  // Vị trí 1 → Ex2: fill_in_blank
  {
    topicTitle: "Active / Passive",
    level: "intermediate",
    type: "fill_in_blank",
    question: "The annual report ___ (submit) before Friday. (future obligation)",
    correct_answer: "must be submitted",
    explanation:
      "Modal Passive: modal + be + past participle. 'Must be submitted' expresses obligation in the passive voice for a future action.",
    grammar_tip: "Modal Passive: modal (must/can/should/will) + be + past participle.",
    example: "All forms must be completed in black ink.",
  },
  // Vị trí 2 → Ex1: reorder
  {
    topicTitle: "Active / Passive",
    level: "intermediate",
    type: "reorder",
    question: "Rearrange to form a Past Continuous Passive sentence:",
    words: ["the", "when", "being", "accident", "built", "bridge", "was", "occurred", "was", "the"],
    correct_order: [0, 5, 2, 6, 4, 1, 0, 3, 8, 7],
    explanation:
      "Correct: 'The bridge was being built when the accident occurred.' Past Continuous Passive: was/were + being + past participle.",
    grammar_tip: "Past Continuous Passive: was/were + being + past participle.",
    example: "The road was being repaired when we drove past.",
  },
  // Vị trí 3 → Ex2: error_detection
  {
    topicTitle: "Active / Passive",
    level: "intermediate",
    type: "error_detection",
    question: "Find the error in the passive sentence:",
    sentence_parts: ["She", "was gave", "a promotion", "by her supervisor."],
    error_index: 1,
    corrected_part: "was given",
    explanation:
      "'Gave' is the Simple Past of 'give'. The past participle is 'given'. Passive voice requires the past participle: was/were + past participle.",
    grammar_tip: "Irregular verbs: give → gave → given. Passive uses past participle (3rd column), not Simple Past.",
    example: "She was given a second chance by the committee.",
  },
  // Vị trí 4 → Ex1: fill_in_blank
  {
    topicTitle: "Active / Passive",
    level: "intermediate",
    type: "fill_in_blank",
    question: "It ___ (report) that the company has doubled its profits this year.",
    correct_answer: "is reported",
    explanation:
      "Impersonal passive with reporting verbs: It + is/was + past participle + that-clause. This structure is common in academic and news writing.",
    grammar_tip: "Impersonal passive: It is said/reported/believed/known + that-clause.",
    example: "It is believed that the suspect has fled the country.",
  },
  // Vị trí 5 → Ex2: multiple_choice
  {
    topicTitle: "Active / Passive",
    level: "intermediate",
    type: "multiple_choice",
    question: "She hates ___. It makes her feel undermined.",
    options: [
      "to criticize",
      "being criticized",
      "be criticized",
      "having criticized",
    ],
    correct_option_index: 1,
    explanation:
      "After verbs like hate, love, enjoy, avoid, the gerund form is used. The passive gerund is 'being + past participle': 'being criticized' = someone criticizes her.",
    grammar_tip: "Passive gerund: being + past participle. Used after hate/love/enjoy/avoid/dislike.",
    example: "He enjoys being praised for his work.",
  },
  // Vị trí 6 → Ex1: error_detection
  {
    topicTitle: "Active / Passive",
    level: "intermediate",
    type: "error_detection",
    question: "Find the error:",
    sentence_parts: ["The task", "needs", "be done", "immediately."],
    error_index: 2,
    corrected_part: "to be done",
    explanation:
      "After 'need', we use the infinitive. In passive, the structure is: need + to be + past participle.",
    grammar_tip: "Need + to be + past participle: 'The work needs to be reviewed.'",
    example: "The form needs to be signed by the director.",
  },
  // Vị trí 7 → Ex2: reorder
  {
    topicTitle: "Active / Passive",
    level: "intermediate",
    type: "reorder",
    question: "Rearrange to form a passive sentence using a reporting verb:",
    words: ["to", "be", "she", "is", "an", "expert", "said"],
    correct_order: [2, 3, 6, 0, 1, 4, 5],
    explanation:
      "Correct: 'She is said to be an expert.' Personal passive with reporting verbs: Subject + is/are + past participle (said/known/believed) + to be/to have.",
    grammar_tip: "Personal passive: She is said to be... / He is known to have...",
    example: "He is known to be one of the best surgeons in the country.",
  },

  // ── Active/Passive – Pre-TOEIC (8 câu) ──────────────────
  // Vị trí 0 → Ex1: multiple_choice
  {
    topicTitle: "Active / Passive",
    level: "pre-toeic",
    type: "multiple_choice",
    question: "All employees are required ___ the new compliance training by the end of the quarter.",
    options: [
      "completing",
      "to complete",
      "complete",
      "to be completed",
    ],
    correct_option_index: 1,
    explanation:
      "'Are required to + base verb' is an active infinitive structure meaning employees must do the action. 'To be completed' would mean employees are completed, which is nonsensical.",
    grammar_tip: "Be required to + base verb = obligation. Distinguish between active and passive infinitives.",
    example: "Staff are required to submit timesheets every Friday.",
  },
  // Vị trí 1 → Ex2: fill_in_blank
  {
    topicTitle: "Active / Passive",
    level: "pre-toeic",
    type: "fill_in_blank",
    question: "The merger ___ (expect) to create over 2,000 new jobs in the region.",
    correct_answer: "is expected",
    explanation:
      "Personal passive with expecting: Subject + is/are + expected + to-infinitive. This structure is very common in TOEIC Part 5 and business English.",
    grammar_tip: "is/are expected/predicted/projected to + base verb — common in business/news writing.",
    example: "The new plant is expected to open next spring.",
  },
  // Vị trí 2 → Ex1: reorder
  {
    topicTitle: "Active / Passive",
    level: "pre-toeic",
    type: "reorder",
    question: "Rearrange to form a correct formal passive sentence:",
    words: ["will", "the", "audited", "accounts", "be", "by", "an", "external", "firm"],
    correct_order: [1, 3, 0, 4, 2, 5, 6, 7, 8],
    explanation:
      "Correct: 'The accounts will be audited by an external firm.' Future Passive: will + be + past participle. Common in TOEIC business correspondence questions.",
    grammar_tip: "Future Passive: will + be + past participle.",
    example: "The project will be reviewed by senior management.",
  },
  // Vị trí 3 → Ex2: error_detection
  {
    topicTitle: "Active / Passive",
    level: "pre-toeic",
    type: "error_detection",
    question: "Find the error in this TOEIC-style sentence:",
    sentence_parts: ["The new product line", "is anticipated", "to be launch", "in the fourth quarter."],
    error_index: 2,
    corrected_part: "to be launched",
    explanation:
      "Passive infinitive: to be + past participle. 'Launch' must be in the past participle form 'launched'. The structure is: is anticipated + to be + past participle.",
    grammar_tip: "Passive infinitive: to be + past participle. 'launched', not 'launch'.",
    example: "The software is expected to be released next month.",
  },
  // Vị trí 4 → Ex1: fill_in_blank
  {
    topicTitle: "Active / Passive",
    level: "pre-toeic",
    type: "fill_in_blank",
    question: "Had the safety protocols ___ (follow), the accident could have been avoided.",
    correct_answer: "been followed",
    explanation:
      "Past Perfect Passive in a Third Conditional: Had + subject + been + past participle. This is an inverted conditional without 'if'.",
    grammar_tip: "Inverted Third Conditional Passive: Had + subject + been + past participle, would have + past participle.",
    example: "Had the warning been heeded, the disaster would have been prevented.",
  },
  // Vị trí 5 → Ex2: multiple_choice
  {
    topicTitle: "Active / Passive",
    level: "pre-toeic",
    type: "multiple_choice",
    question: "The findings of the research ___ in a peer-reviewed journal next year.",
    options: [
      "will publish",
      "will be published",
      "are publishing",
      "have published",
    ],
    correct_option_index: 1,
    explanation:
      "The findings cannot publish themselves — they are published by researchers. A passive construction is needed. 'Will be published' is the Future Passive, appropriate for a future plan.",
    grammar_tip: "When the subject cannot perform the action itself, use passive voice.",
    example: "The report will be distributed to all stakeholders.",
  },
  // Vị trí 6 → Ex1: error_detection
  {
    topicTitle: "Active / Passive",
    level: "pre-toeic",
    type: "error_detection",
    question: "Find the error in this formal business sentence:",
    sentence_parts: ["The proposal", "has been thoroughly reviewed", "and it", "approved yesterday."],
    error_index: 3,
    corrected_part: "was approved yesterday",
    explanation:
      "'Yesterday' is a specific past time expression requiring Simple Past Passive ('was approved'). Present Perfect cannot be used with 'yesterday'.",
    grammar_tip: "Specific past time (yesterday, last week) → Simple Past Passive: was/were + past participle.",
    example: "The application was submitted yesterday.",
  },
  // Vị trí 7 → Ex2: reorder
  {
    topicTitle: "Active / Passive",
    level: "pre-toeic",
    type: "reorder",
    question: "Rearrange to form a formal passive sentence with a causative meaning:",
    words: ["the", "director", "had", "the", "financial", "reviewed", "report", "thoroughly"],
    correct_order: [0, 1, 2, 3, 4, 6, 5, 7],
    explanation:
      "Correct: 'The director had the financial report reviewed thoroughly.' Causative have: Subject + had + object + past participle (+ adverb). This means the director arranged for someone else to review the report.",
    grammar_tip: "Causative have: have/had + object + past participle = arrange for someone else to do something.",
    example: "She had her car serviced at the garage.",
  },

  // ══════════════════════════════════════════════════════════
  // TOPIC: Conditionals
  // ══════════════════════════════════════════════════════════

  // ── Conditionals – Beginner (8 câu) ──────────────────────
  // Vị trí 0 → Ex1: multiple_choice
  {
    topicTitle: "Conditionals",
    level: "beginner",
    type: "multiple_choice",
    question: "Which sentence is a Zero Conditional?",
    options: [
      "If it rains tomorrow, we will cancel the trip.",
      "If you heat ice, it melts.",
      "If I had money, I would travel.",
      "If she had studied, she would have passed.",
    ],
    correct_option_index: 1,
    explanation:
      "Zero Conditional: If + Simple Present, Simple Present. It expresses general truths and scientific facts. 'If you heat ice, it melts' is always true.",
    grammar_tip: "Zero Conditional: If + Simple Present, Simple Present — for universal truths.",
    example: "If you don't water plants, they die.",
  },
  // Vị trí 1 → Ex2: fill_in_blank
  {
    topicTitle: "Conditionals",
    level: "beginner",
    type: "fill_in_blank",
    question: "If it ___ (rain) tomorrow, we will cancel the picnic.",
    correct_answer: "rains",
    explanation:
      "First Conditional: If + Simple Present (present tense in the if-clause), will + base verb in the main clause. 'Rain' → 'rains' (third person singular).",
    grammar_tip: "First Conditional: If + Simple Present, will + base verb.",
    example: "If she studies hard, she will pass the exam.",
  },
  // Vị trí 2 → Ex1: reorder
  {
    topicTitle: "Conditionals",
    level: "beginner",
    type: "reorder",
    question: "Rearrange to form a First Conditional sentence:",
    words: ["miss", "hurry", "will", "the", "you", "don't", "if", "bus", "you"],
    correct_order: [6, 8, 5, 1, 2, 4, 3, 7],
    explanation:
      "Correct: 'If you don't hurry, you will miss the bus.' First Conditional with negative if-clause: If + Simple Present negative, will + base verb.",
    grammar_tip: "If + do not/does not + base verb, will + base verb.",
    example: "If you don't eat breakfast, you will feel hungry.",
  },
  // Vị trí 3 → Ex2: error_detection
  {
    topicTitle: "Conditionals",
    level: "beginner",
    type: "error_detection",
    question: "Find the error in the conditional sentence:",
    sentence_parts: ["If I", "would have", "more time,", "I would travel more."],
    error_index: 1,
    corrected_part: "had",
    explanation:
      "Never use 'would' in the if-clause. Second Conditional if-clause uses Simple Past. Correct: 'If I had more time, I would travel more.'",
    grammar_tip: "NEVER use 'would' in the if-clause of a conditional sentence.",
    example: "If she had a car, she would drive to work.",
  },
  // Vị trí 4 → Ex1: fill_in_blank
  {
    topicTitle: "Conditionals",
    level: "beginner",
    type: "fill_in_blank",
    question: "If I were rich, I ___ (buy) a big house by the beach.",
    correct_answer: "would buy",
    explanation:
      "Second Conditional: If + Simple Past, would + base verb. Expresses imaginary or hypothetical present/future situations.",
    grammar_tip: "Second Conditional: If + Simple Past, would + base verb — for hypothetical situations.",
    example: "If she knew the answer, she would tell you.",
  },
  // Vị trí 5 → Ex2: multiple_choice
  {
    topicTitle: "Conditionals",
    level: "beginner",
    type: "multiple_choice",
    question: "'Unless you hurry, you will be late.' What does 'unless' mean here?",
    options: [
      "if",
      "because",
      "if not",
      "when",
    ],
    correct_option_index: 2,
    explanation:
      "'Unless' means 'if not'. The sentence means: 'If you don't hurry, you will be late.' It introduces a negative condition.",
    grammar_tip: "'Unless' = 'if not'. Use it to introduce a negative condition.",
    example: "Unless you study, you won't pass. = If you don't study, you won't pass.",
  },
  // Vị trí 6 → Ex1: error_detection
  {
    topicTitle: "Conditionals",
    level: "beginner",
    type: "error_detection",
    question: "Find the error in the conditional sentence:",
    sentence_parts: ["If she", "will study", "harder,", "she will pass the exam."],
    error_index: 1,
    corrected_part: "studies",
    explanation:
      "In the if-clause of a First Conditional, use Simple Present — NOT 'will'. The future meaning is expressed in the main clause with 'will'.",
    grammar_tip: "If-clause: Simple Present (no 'will'). Main clause: will + base verb.",
    example: "If he arrives on time, we will start the meeting.",
  },
  // Vị trí 7 → Ex2: reorder
  {
    topicTitle: "Conditionals",
    level: "beginner",
    type: "reorder",
    question: "Rearrange to form a Second Conditional sentence:",
    words: ["I", "were", "if", "you", "apologize", "I", "would"],
    correct_order: [2, 0, 1, 3, 5, 6, 4],
    explanation:
      "Correct: 'If I were you, I would apologize.' Second Conditional with the common phrase 'If I were you' — gives advice about hypothetical situations. Use 'were' for all subjects.",
    grammar_tip: "'If I were you' uses 'were' for all subjects in formal English. Gives advice.",
    example: "If I were you, I would see a doctor immediately.",
  },

  // ── Conditionals – Intermediate (8 câu) ──────────────────
  // Vị trí 0 → Ex1: multiple_choice
  {
    topicTitle: "Conditionals",
    level: "intermediate",
    type: "multiple_choice",
    question: "If she had studied harder, she ___ the exam.",
    options: [
      "would pass",
      "will have passed",
      "would have passed",
      "had passed",
    ],
    correct_option_index: 2,
    explanation:
      "Third Conditional: If + Past Perfect, would have + past participle. It expresses a hypothetical result of an unreal past condition. She didn't study hard → she didn't pass.",
    grammar_tip: "Third Conditional: If + Past Perfect, would have + past participle — for unreal past situations.",
    example: "If I had known about the party, I would have come.",
  },
  // Vị trí 1 → Ex2: fill_in_blank
  {
    topicTitle: "Conditionals",
    level: "intermediate",
    type: "fill_in_blank",
    question: "If she had taken the job in London, she ___ (be) a senior manager by now.",
    correct_answer: "would be",
    explanation:
      "This is a Mixed Conditional: past condition (If + Past Perfect) + present result (would + base verb). The job decision was in the past, but the result affects the present.",
    grammar_tip: "Mixed Conditional Type 1: If + Past Perfect (past condition), would + base verb (present result).",
    example: "If he had finished university, he would have a better job now.",
  },
  // Vị trí 2 → Ex1: reorder
  {
    topicTitle: "Conditionals",
    level: "intermediate",
    type: "reorder",
    question: "Rearrange to form a Third Conditional sentence:",
    words: ["have", "had", "if", "I", "helped", "known,", "I", "would", "you"],
    correct_order: [2, 3, 1, 5, 6, 7, 4, 0, 8],
    explanation:
      "Correct: 'If I had known, I would have helped you.' Third Conditional: If + Subject + had + past participle, Subject + would + have + past participle.",
    grammar_tip: "Third Conditional: If + had + p.p., would + have + p.p.",
    example: "If they had arrived earlier, they would have met the CEO.",
  },
  // Vị trí 3 → Ex2: error_detection
  {
    topicTitle: "Conditionals",
    level: "intermediate",
    type: "error_detection",
    question: "Find the error in the mixed conditional:",
    sentence_parts: ["If I", "am braver,", "I would have spoken up", "at the meeting yesterday."],
    error_index: 1,
    corrected_part: "were braver,",
    explanation:
      "Mixed Conditional Type 2: present condition + past result. The if-clause needs Simple Past ('were', not 'am') because it describes an unreal present condition.",
    grammar_tip: "Mixed Conditional Type 2: If + Simple Past (present condition), would have + past participle (past result).",
    example: "If she were more confident, she would have applied for the job.",
  },
  // Vị trí 4 → Ex1: fill_in_blank
  {
    topicTitle: "Conditionals",
    level: "intermediate",
    type: "fill_in_blank",
    question: "___ you need any assistance, please do not hesitate to contact us. (formal inversion)",
    correct_answer: "Should",
    explanation:
      "First Conditional inversion: 'Should + subject + base verb' replaces 'If + subject + should + base verb'. This is formal and common in business writing.",
    grammar_tip: "First Conditional formal inversion: Should + subject + base verb = If + subject + should.",
    example: "Should you have any questions, feel free to contact me.",
  },
  // Vị trí 5 → Ex2: multiple_choice
  {
    topicTitle: "Conditionals",
    level: "intermediate",
    type: "multiple_choice",
    question: "I wish I ___ more time to travel. I'm always too busy.",
    options: [
      "have",
      "had",
      "had had",
      "will have",
    ],
    correct_option_index: 1,
    explanation:
      "'Wish' about the present uses Simple Past. 'I wish I had...' expresses a desire for a present/future situation to be different. The reality is: I don't have more time.",
    grammar_tip: "Wish + Simple Past = present wish (current situation is different from desired).",
    example: "I wish I spoke better English.",
  },
  // Vị trí 6 → Ex1: error_detection
  {
    topicTitle: "Conditionals",
    level: "intermediate",
    type: "error_detection",
    question: "Find the error in the wish sentence:",
    sentence_parts: ["I wish", "I have studied", "harder", "when I was at university."],
    error_index: 1,
    corrected_part: "I had studied",
    explanation:
      "'Wish' about the past uses Past Perfect. 'I wish I had studied harder' expresses regret about a past event. The reality: I didn't study hard enough.",
    grammar_tip: "Wish + Past Perfect = past regret. 'I wish I had done...'",
    example: "I wish I had saved more money when I was young.",
  },
  // Vị trí 7 → Ex2: reorder
  {
    topicTitle: "Conditionals",
    level: "intermediate",
    type: "reorder",
    question: "Rearrange to form a formal conditional using inversion:",
    words: ["the", "truth,", "differently", "known", "had", "she", "acted", "have", "she", "would"],
    correct_order: [4, 5, 3, 1, 8, 9, 7, 6, 0, 2],
    explanation:
      "Correct: 'Had she known the truth, she would have acted differently.' Third Conditional inversion: Had + subject + past participle, would have + past participle.",
    grammar_tip: "Third Conditional formal inversion: Had + subject + p.p., would + have + p.p.",
    example: "Had the team prepared better, they would have won the competition.",
  },

  // ── Conditionals – Pre-TOEIC (8 câu) ────────────────────
  // Vị trí 0 → Ex1: multiple_choice
  {
    topicTitle: "Conditionals",
    level: "pre-toeic",
    type: "multiple_choice",
    question: "___ the shipment on time, we would have met the production deadline.",
    options: [
      "If we receive",
      "Had we received",
      "If we had receive",
      "We had received",
    ],
    correct_option_index: 1,
    explanation:
      "This is a Third Conditional with formal inversion. 'Had we received' replaces 'If we had received'. This structure is common in formal business and TOEIC contexts.",
    grammar_tip: "Formal Third Conditional inversion: Had + subject + past participle (no 'if').",
    example: "Had the budget been approved, we would have launched earlier.",
  },
  // Vị trí 1 → Ex2: fill_in_blank
  {
    topicTitle: "Conditionals",
    level: "pre-toeic",
    type: "fill_in_blank",
    question: "You can use the conference room ___ (as long as) you book it in advance.",
    correct_answer: "as long as",
    explanation:
      "'As long as' introduces a condition meaning 'on the condition that' or 'provided that'. It replaces 'if' in conditional sentences expressing a requirement.",
    grammar_tip: "'As long as' / 'provided that' / 'on condition that' = conditional 'if' with a specific requirement.",
    example: "You may leave early as long as you finish your tasks.",
  },
  // Vị trí 2 → Ex1: reorder
  {
    topicTitle: "Conditionals",
    level: "pre-toeic",
    type: "reorder",
    question: "Rearrange to form a formal inverted Second Conditional:",
    words: ["reconsider", "your", "position,", "in", "I", "were", "would", "I"],
    correct_order: [5, 4, 3, 2, 4, 7, 6, 0],
    explanation:
      "Correct: 'Were I in your position, I would reconsider.' Second Conditional formal inversion: Were + subject + complement, would + base verb.",
    grammar_tip: "Second Conditional inversion: Were + subject + adjective/noun, would + base verb.",
    example: "Were the company to expand, it would need additional funding.",
  },
  // Vị trí 3 → Ex2: error_detection
  {
    topicTitle: "Conditionals",
    level: "pre-toeic",
    type: "error_detection",
    question: "Find the error in this business conditional:",
    sentence_parts: ["The project", "would have been completed", "on time", "if the team had work harder."],
    error_index: 3,
    corrected_part: "if the team had worked harder",
    explanation:
      "In the if-clause of Third Conditional, the Past Perfect must be used: 'had worked' (past participle), not 'had work' (base form).",
    grammar_tip: "Third Conditional if-clause: If + had + past participle (NOT base form).",
    example: "If they had allocated more resources, the project would have succeeded.",
  },
  // Vị trí 4 → Ex1: fill_in_blank
  {
    topicTitle: "Conditionals",
    level: "pre-toeic",
    type: "fill_in_blank",
    question: "If only the management ___ (listen) to the employees' concerns earlier, the strike could have been avoided.",
    correct_answer: "had listened",
    explanation:
      "'If only' expresses a strong regret about the past and uses Past Perfect, just like Third Conditional. 'Had listened' is correct.",
    grammar_tip: "'If only' + Past Perfect = strong regret about the past.",
    example: "If only we had invested in better technology, we would be more competitive now.",
  },
  // Vị trí 5 → Ex2: multiple_choice
  {
    topicTitle: "Conditionals",
    level: "pre-toeic",
    type: "multiple_choice",
    question: "___ the terms of the agreement not be acceptable, we reserve the right to withdraw.",
    options: [
      "If",
      "Should",
      "Had",
      "Were",
    ],
    correct_option_index: 1,
    explanation:
      "This is a First Conditional formal inversion using 'Should'. 'Should + subject + base verb' is used in formal/legal English instead of 'If + subject + should/were to'.",
    grammar_tip: "Formal First Conditional inversion: Should + subject + base verb (common in contracts and legal writing).",
    example: "Should you wish to cancel, please notify us in writing.",
  },
  // Vị trí 6 → Ex1: error_detection
  {
    topicTitle: "Conditionals",
    level: "pre-toeic",
    type: "error_detection",
    question: "Find the error in this TOEIC-style formal sentence:",
    sentence_parts: ["Were the company", "to expand overseas,", "it will require", "additional capital investment."],
    error_index: 2,
    corrected_part: "it would require",
    explanation:
      "'Were + subject + to + base verb' is Second Conditional inversion — expressing a hypothetical scenario. The main clause must use 'would', not 'will'.",
    grammar_tip: "'Were + subject + to + verb' inversion → main clause uses 'would', not 'will'.",
    example: "Were the proposal to be accepted, it would represent a major shift in strategy.",
  },
  // Vị trí 7 → Ex2: reorder
  {
    topicTitle: "Conditionals",
    level: "pre-toeic",
    type: "reorder",
    question: "Rearrange to form a complex conditional common in TOEIC business contexts:",
    words: ["not", "submitted", "the", "on", "will", "be", "proposal", "time,", "considered", "if", "it"],
    correct_order: [9, 2, 6, 0, 3, 7, 10, 4, 5, 8],
    explanation:
      "Correct: 'If the proposal is not submitted on time, it will not be considered.' First Conditional Passive: If + Simple Present Passive, will + be + past participle.",
    grammar_tip: "First Conditional can use passive in either or both clauses.",
    example: "If the form is not completed correctly, it will be returned.",
  },

  // ══════════════════════════════════════════════════════════
  // TOPIC: Articles
  // ══════════════════════════════════════════════════════════

  // ── Articles – Beginner (8 câu) ──────────────────────────
  // Vị trí 0 → Ex1: multiple_choice
  {
    topicTitle: "Articles",
    level: "beginner",
    type: "multiple_choice",
    question: "Choose the correct article: I saw ___ dog in the park. ___ dog was barking.",
    options: [
      "the / a",
      "a / the",
      "a / a",
      "the / the",
    ],
    correct_option_index: 1,
    explanation:
      "Use 'a' for the first mention (new, unspecific information). Use 'the' for the second mention (now specific and identifiable to the listener).",
    grammar_tip: "First mention → a/an. Second mention (specific) → the.",
    example: "I bought a book. The book was very interesting.",
  },
  // Vị trí 1 → Ex2: fill_in_blank
  {
    topicTitle: "Articles",
    level: "beginner",
    type: "fill_in_blank",
    question: "She is ___ engineer. She works at ___ large company in Hanoi.",
    correct_answer: "an / a",
    explanation:
      "'Engineer' starts with a vowel sound → 'an'. 'Large' starts with a consonant sound → 'a'. Both are indefinite articles for first mention.",
    grammar_tip: "Use 'an' before vowel sounds, 'a' before consonant sounds.",
    example: "He is an architect. She works at a hospital.",
  },
  // Vị trí 2 → Ex1: reorder
  {
    topicTitle: "Articles",
    level: "beginner",
    type: "reorder",
    question: "Rearrange to form a correct sentence using the correct article:",
    words: ["a", "sun", "the", "rises", "in", "east", "the"],
    correct_order: [2, 1, 3, 4, 0, 6, 5],
    explanation:
      "Correct: 'The sun rises in the east.' 'The sun' uses 'the' because it is unique (there is only one sun). 'The east' uses 'the' as it refers to a specific direction.",
    grammar_tip: "Use 'the' with unique nouns (the sun, the moon) and directions (the north, the east).",
    example: "The moon shines at night.",
  },
  // Vị trí 3 → Ex2: error_detection
  {
    topicTitle: "Articles",
    level: "beginner",
    type: "error_detection",
    question: "Find the article error in the sentence:",
    sentence_parts: ["She plays", "the tennis", "every weekend", "with her friends."],
    error_index: 1,
    corrected_part: "tennis",
    explanation:
      "Sports do not use articles in English. We say 'play tennis', 'play football', 'play basketball' — never 'play the tennis'.",
    grammar_tip: "No article with sports: play football, play tennis, play golf.",
    example: "He loves playing basketball.",
  },
  // Vị trí 4 → Ex1: fill_in_blank
  {
    topicTitle: "Articles",
    level: "beginner",
    type: "fill_in_blank",
    question: "___ Pacific Ocean is ___ largest ocean on Earth.",
    correct_answer: "The / the",
    explanation:
      "Use 'the' with ocean names (the Pacific Ocean). Use 'the' with superlatives (the largest). Both require definite articles.",
    grammar_tip: "Use 'the' with: oceans, seas, rivers, superlatives, unique things.",
    example: "The Amazon is the longest river in South America.",
  },
  // Vị trí 5 → Ex2: multiple_choice
  {
    topicTitle: "Articles",
    level: "beginner",
    type: "multiple_choice",
    question: "Which sentence uses articles INCORRECTLY?",
    options: [
      "She speaks French fluently.",
      "He plays the piano beautifully.",
      "They visited the France last year.",
      "The Nile is the longest river in Africa.",
    ],
    correct_option_index: 2,
    explanation:
      "Most country names do not use 'the'. 'France' is a regular country name — it should not have 'the'. Only plural or specific country names use 'the' (the USA, the Netherlands).",
    grammar_tip: "No 'the' with most country names: France, Japan, Vietnam, Brazil.",
    example: "She studied in Japan for two years.",
  },
  // Vị trí 6 → Ex1: error_detection
  {
    topicTitle: "Articles",
    level: "beginner",
    type: "error_detection",
    question: "Find the article error:",
    sentence_parts: ["I had", "a breakfast", "early this morning", "before going to work."],
    error_index: 1,
    corrected_part: "breakfast",
    explanation:
      "Meals (breakfast, lunch, dinner, brunch) do not use articles in general usage. 'I had breakfast' is correct. No article needed.",
    grammar_tip: "No article with meals: have breakfast/lunch/dinner.",
    example: "We usually have dinner at 7 PM.",
  },
  // Vị trí 7 → Ex2: reorder
  {
    topicTitle: "Articles",
    level: "beginner",
    type: "reorder",
    question: "Rearrange to form a correct sentence with proper article usage:",
    words: ["is", "a", "doctor", "she", "hospital", "at", "the", "works"],
    correct_order: [3, 1, 2, 7, 6, 5, 4],
    explanation:
      "Correct: 'She is a doctor. She works at the hospital.' 'A doctor' = profession, first mention, unspecific. 'The hospital' = specific, known location in context.",
    grammar_tip: "Use 'a/an' for professions and first mention. Use 'the' for specific, known locations.",
    example: "He is a teacher. He works at the school near our house.",
  },

  // ── Articles – Intermediate (8 câu) ──────────────────────
  // Vị trí 0 → Ex1: multiple_choice
  {
    topicTitle: "Articles",
    level: "intermediate",
    type: "multiple_choice",
    question: "Which sentence uses the zero article correctly?",
    options: [
      "The life is beautiful.",
      "The dogs are loyal animals.",
      "Dogs are loyal animals.",
      "A gold is a precious metal.",
    ],
    correct_option_index: 2,
    explanation:
      "Zero article (no article) is used with plural countable nouns and uncountable nouns when making general statements. 'Dogs' (plural) in a general statement needs no article.",
    grammar_tip: "General statements: Plural nouns and uncountable nouns → zero article.",
    example: "Water is essential for life. Children love playing.",
  },
  // Vị trí 1 → Ex2: fill_in_blank
  {
    topicTitle: "Articles",
    level: "intermediate",
    type: "fill_in_blank",
    question: "She listens to ___ radio every morning, but she doesn't watch ___ news on TV.",
    correct_answer: "the / the",
    explanation:
      "Use 'the' with specific media: 'the radio', 'the news', 'the internet'. These are treated as specific, known entities.",
    grammar_tip: "Use 'the' with: the radio, the news, the internet, the cinema.",
    example: "He heard the announcement on the radio.",
  },
  // Vị trí 2 → Ex1: reorder
  {
    topicTitle: "Articles",
    level: "intermediate",
    type: "reorder",
    question: "Rearrange to form a sentence about abstract nouns with correct articles:",
    words: ["the", "love", "she", "felt", "was", "real", "and", "deep"],
    correct_order: [2, 4, 0, 1, 3, 6, 5, 7],
    explanation:
      "Correct: 'The love she felt was real and deep.' When an abstract noun is made specific by a relative clause or context, use 'the'. Compare: 'Love is blind' (general) vs 'The love she felt' (specific).",
    grammar_tip: "Abstract nouns: no article for general (Love is blind) → 'the' for specific (The love she felt).",
    example: "The courage he showed was admirable.",
  },
  // Vị trí 3 → Ex2: error_detection
  {
    topicTitle: "Articles",
    level: "intermediate",
    type: "error_detection",
    question: "Find the article error:",
    sentence_parts: ["He studies", "the physics", "at the university", "in the city."],
    error_index: 1,
    corrected_part: "physics",
    explanation:
      "Academic subjects and fields of study do not use 'the': physics, mathematics, history, biology. 'He studies physics' is correct.",
    grammar_tip: "No article with academic subjects: study physics, learn mathematics, teach history.",
    example: "She majors in chemistry at university.",
  },
  // Vị trí 4 → Ex1: fill_in_blank
  {
    topicTitle: "Articles",
    level: "intermediate",
    type: "fill_in_blank",
    question: "My son is in ___ hospital, so I'm going to ___ hospital to visit him.",
    correct_answer: "the / the",
    explanation:
      "Both use 'the' here. 'In the hospital' means in a specific hospital (as a patient or visitor). When we know which specific institution is meant, we use 'the'. Note: 'in hospital' (British, as a patient) vs 'in the hospital' (American or visitor).",
    grammar_tip: "Use 'the hospital/school/prison' when referring to a specific building. Use 'in hospital/school/prison' (British) for the institution's function.",
    example: "The patient is in the hospital on the third floor.",
  },
  // Vị trí 5 → Ex2: multiple_choice
  {
    topicTitle: "Articles",
    level: "intermediate",
    type: "multiple_choice",
    question: "Which sentence correctly uses 'the' with a nationality?",
    options: [
      "A French are known for their cuisine.",
      "The French are known for their cuisine.",
      "French are known for their cuisine.",
      "Frenches are known for their cuisine.",
    ],
    correct_option_index: 1,
    explanation:
      "'The + nationality adjective' refers to the people of that nation as a group. 'The French' means 'French people'. This structure requires 'the' and uses the adjective form (not a noun).",
    grammar_tip: "The + nationality adjective = the people of that nation: the French, the Vietnamese, the Japanese.",
    example: "The Japanese are renowned for their work ethic.",
  },
  // Vị trí 6 → Ex1: error_detection
  {
    topicTitle: "Articles",
    level: "intermediate",
    type: "error_detection",
    question: "Find the article error in this sentence:",
    sentence_parts: ["She plays", "a violin", "in the", "city orchestra."],
    error_index: 1,
    corrected_part: "the violin",
    explanation:
      "Musical instruments use 'the' when referring to playing them as an activity: play the piano, play the violin, play the guitar.",
    grammar_tip: "Use 'the' with musical instruments: play the piano/violin/guitar.",
    example: "He has been playing the piano since he was five.",
  },
  // Vị trí 7 → Ex2: reorder
  {
    topicTitle: "Articles",
    level: "intermediate",
    type: "reorder",
    question: "Rearrange to form a correct sentence using articles with 'the rich' and 'the poor':",
    words: ["between", "the", "gap", "rich", "and", "the", "poor", "is", "the", "growing"],
    correct_order: [8, 2, 7, 1, 3, 4, 5, 6, 9],
    explanation:
      "Correct: 'The gap between the rich and the poor is growing.' 'The + adjective' refers to a group of people: the rich (rich people), the poor (poor people), the elderly.",
    grammar_tip: "The + adjective = group of people: the rich, the poor, the elderly, the disabled.",
    example: "The government must do more to protect the elderly.",
  },

  // ── Articles – Pre-TOEIC (8 câu) ────────────────────────
  // Vị trí 0 → Ex1: multiple_choice
  {
    topicTitle: "Articles",
    level: "pre-toeic",
    type: "multiple_choice",
    question: "The company achieved ___ highest revenue in ___ history of the organization last quarter.",
    options: [
      "the / a",
      "a / the",
      "the / the",
      "a / a",
    ],
    correct_option_index: 2,
    explanation:
      "'The highest' uses 'the' with superlatives. 'The history of the organization' is a specific history identified by 'of the organization', so 'the' is required.",
    grammar_tip: "Use 'the' with superlatives and with nouns made specific by 'of' phrases.",
    example: "It was the most important decision in the history of the company.",
  },
  // Vị trí 1 → Ex2: fill_in_blank
  {
    topicTitle: "Articles",
    level: "pre-toeic",
    type: "fill_in_blank",
    question: "___ number of qualified candidates has declined significantly, while ___ number of open positions keeps growing.",
    correct_answer: "The / the",
    explanation:
      "Both use 'the'. 'The number of' refers to a specific count being discussed — 'the' makes it definite and specific. This structure requires 'the'.",
    grammar_tip: "'The number of' always takes 'the' because it refers to a specific measured quantity.",
    example: "The number of complaints received this month was lower than expected.",
  },
  // Vị trí 2 → Ex1: reorder
  {
    topicTitle: "Articles",
    level: "pre-toeic",
    type: "reorder",
    question: "Rearrange to form a formal sentence with correct article usage:",
    words: ["was", "the", "Bank", "of", "England", "established", "in", "1694", "the"],
    correct_order: [8, 1, 2, 3, 4, 0, 5, 6, 7],
    explanation:
      "Correct: 'The Bank of England was established in 1694.' Institutions that include 'of' in their name typically use 'the': the Bank of England, the University of Oxford.",
    grammar_tip: "Use 'the' with institutional names containing 'of': the Bank of England, the University of Tokyo.",
    example: "The Ministry of Finance announced new tax regulations.",
  },
  // Vị trí 3 → Ex2: error_detection
  {
    topicTitle: "Articles",
    level: "pre-toeic",
    type: "error_detection",
    question: "Find the article error in this TOEIC-style sentence:",
    sentence_parts: ["The research indicates", "that a gold", "has historically outperformed", "other investments during crises."],
    error_index: 1,
    corrected_part: "that gold",
    explanation:
      "Uncountable nouns used in general statements take no article. 'Gold' as a material/commodity in a general statement requires zero article.",
    grammar_tip: "Uncountable nouns in general statements: zero article. Gold, water, oil, information — no 'a/an'.",
    example: "Oil prices have surged this month.",
  },
  // Vị trí 4 → Ex1: fill_in_blank
  {
    topicTitle: "Articles",
    level: "pre-toeic",
    type: "fill_in_blank",
    question: "She was appointed ___ CEO of ___ company after 15 years of service.",
    correct_answer: "the / the",
    explanation:
      "Unique positions (CEO, president, director) in context often use 'the'. 'The company' is a specific company mentioned in context.",
    grammar_tip: "Unique positions/roles in context: the CEO, the president, the director (only one person holds that role).",
    example: "He was named the chairman of the board of directors.",
  },
  // Vị trí 5 → Ex2: multiple_choice
  {
    topicTitle: "Articles",
    level: "pre-toeic",
    type: "multiple_choice",
    question: "Investors should consider diversifying into ___ emerging markets such as ___ Southeast Asia.",
    options: [
      "the / the",
      "— / —",
      "the / —",
      "— / the",
    ],
    correct_option_index: 1,
    explanation:
      "'Emerging markets' is a general plural noun → zero article. 'Southeast Asia' is a proper geographical noun → zero article (geographical regions without 'the' unless they include a common noun like 'the Middle East').",
    grammar_tip: "General plural nouns → zero article. Geographical region names (Southeast Asia, Eastern Europe) → zero article unless they contain a common noun.",
    example: "Many companies are expanding into South America.",
  },
  // Vị trí 6 → Ex1: error_detection
  {
    topicTitle: "Articles",
    level: "pre-toeic",
    type: "error_detection",
    question: "Find the article error in this TOEIC Part 5 sentence:",
    sentence_parts: ["Please contact", "the human resources department", "to arrange", "a interview."],
    error_index: 3,
    corrected_part: "an interview",
    explanation:
      "'Interview' begins with a vowel sound (/ɪ/), so it requires 'an', not 'a'. The rule is based on sound, not spelling.",
    grammar_tip: "Use 'an' before vowel sounds: an interview, an hour, an honest person, an MBA.",
    example: "She has an interview scheduled for Monday morning.",
  },
  // Vị trí 7 → Ex2: reorder
  {
    topicTitle: "Articles",
    level: "pre-toeic",
    type: "reorder",
    question: "Rearrange to form a correct TOEIC-level sentence:",
    words: ["an", "sent", "behalf", "on", "was", "email", "the", "management", "of"],
    correct_order: [0, 5, 4, 3, 8, 6, 7],
    explanation:
      "Correct: 'An email was sent on behalf of the management.' 'An email' = first mention, singular countable → 'an'. 'The management' = specific group in context → 'the'.",
    grammar_tip: "Singular countable, first mention → a/an. Specific group in context → the.",
    example: "A memo was distributed on behalf of the executive team.",
  },

  // ══════════════════════════════════════════════════════════
  // TOPIC: Modal Verbs
  // ══════════════════════════════════════════════════════════

  // ── Modal Verbs – Beginner (8 câu) ───────────────────────
  // Vị trí 0 → Ex1: multiple_choice
  {
    topicTitle: "Modal Verbs",
    level: "beginner",
    type: "multiple_choice",
    question: "Which sentence is grammatically CORRECT?",
    options: [
      "She cans swim very well.",
      "She can swims very well.",
      "She can swim very well.",
      "She can to swim very well.",
    ],
    correct_option_index: 2,
    explanation:
      "Modal verbs do not add -s for third person singular, and they are followed by the base form (infinitive without 'to').",
    grammar_tip: "Modal verb + base verb (no -s, no 'to'). She can swim. He must go.",
    example: "He can speak three languages.",
  },
  // Vị trí 1 → Ex2: fill_in_blank
  {
    topicTitle: "Modal Verbs",
    level: "beginner",
    type: "fill_in_blank",
    question: "You ___ (must/not) smoke in this area. It's strictly prohibited.",
    correct_answer: "must not",
    explanation:
      "'Must not' (mustn't) expresses prohibition — something that is forbidden. This is different from 'don't have to' which means it's not necessary.",
    grammar_tip: "'Must not' = prohibition (forbidden). 'Don't have to' = no obligation (optional).",
    example: "You must not use your phone during the exam.",
  },
  // Vị trí 2 → Ex1: reorder
  {
    topicTitle: "Modal Verbs",
    level: "beginner",
    type: "reorder",
    question: "Rearrange to form a correct sentence with a modal verb:",
    words: ["should", "you", "a", "see", "doctor", "you", "if", "feel", "unwell"],
    correct_order: [1, 0, 3, 2, 4, 6, 5, 7, 8],
    explanation:
      "Correct: 'You should see a doctor if you feel unwell.' 'Should' expresses advice. It is followed by the base verb 'see'.",
    grammar_tip: "'Should' = advice/recommendation. Follow with base verb.",
    example: "You should drink more water every day.",
  },
  // Vị trí 3 → Ex2: error_detection
  {
    topicTitle: "Modal Verbs",
    level: "beginner",
    type: "error_detection",
    question: "Find the error in the sentence:",
    sentence_parts: ["Does she", "can speak", "English", "fluently?"],
    error_index: 1,
    corrected_part: "can she speak",
    explanation:
      "Modal verbs form questions by inverting subject and modal. Do NOT use 'does/do' with modals. Correct: 'Can she speak English fluently?'",
    grammar_tip: "Modal verb questions: Modal + subject + base verb? (No do/does/did).",
    example: "Can he drive? Should they go? Must we stay?",
  },
  // Vị trí 4 → Ex1: fill_in_blank
  {
    topicTitle: "Modal Verbs",
    level: "beginner",
    type: "fill_in_blank",
    question: "___ I borrow your pen? Mine has run out of ink.",
    correct_answer: "May",
    explanation:
      "'May I' is used for formal/polite requests for permission. 'Can I' is more informal. In formal contexts, 'May I' is preferred.",
    grammar_tip: "'May I' = polite/formal permission request. 'Can I' = informal.",
    example: "May I come in? May I ask you a question?",
  },
  // Vị trí 5 → Ex2: multiple_choice
  {
    topicTitle: "Modal Verbs",
    level: "beginner",
    type: "multiple_choice",
    question: "'You don't have to come to the meeting.' What does this sentence mean?",
    options: [
      "You are forbidden from coming to the meeting.",
      "You are required to come to the meeting.",
      "It is not necessary for you to come to the meeting.",
      "You definitely won't come to the meeting.",
    ],
    correct_option_index: 2,
    explanation:
      "'Don't have to' means there is no obligation — it is optional. This is very different from 'must not' which means something is prohibited.",
    grammar_tip: "'Don't have to' = no obligation (optional). 'Must not' = forbidden.",
    example: "You don't have to wear a tie, but you can if you want to.",
  },
  // Vị trí 6 → Ex1: error_detection
  {
    topicTitle: "Modal Verbs",
    level: "beginner",
    type: "error_detection",
    question: "Find the error:",
    sentence_parts: ["When she was young,", "she could", "to run", "very fast."],
    error_index: 2,
    corrected_part: "run",
    explanation:
      "Modal verbs are followed by the base form (infinitive WITHOUT 'to'). 'Could run' is correct; 'could to run' is incorrect.",
    grammar_tip: "Modal + base verb (NO 'to'): could run, must go, should eat.",
    example: "He could swim across the river when he was a teenager.",
  },
  // Vị trí 7 → Ex2: reorder
  {
    topicTitle: "Modal Verbs",
    level: "beginner",
    type: "reorder",
    question: "Rearrange to form a correct polite request:",
    words: ["the", "close", "could", "window", "you", "please"],
    correct_order: [2, 4, 0, 1, 3, 5],
    explanation:
      "Correct: 'Could you please close the window?' 'Could you + base verb' is a polite request form. 'Please' can come after the subject or at the end.",
    grammar_tip: "'Could you + base verb?' = polite request. More formal than 'Can you?'",
    example: "Could you please send me the report by Friday?",
  },

  // ── Modal Verbs – Intermediate (8 câu) ───────────────────
  // Vị trí 0 → Ex1: multiple_choice
  {
    topicTitle: "Modal Verbs",
    level: "intermediate",
    type: "multiple_choice",
    question: "She ___ be tired — she's been working for 12 hours straight.",
    options: [
      "can't",
      "might not",
      "must",
      "should",
    ],
    correct_option_index: 2,
    explanation:
      "'Must' expresses strong logical deduction (near certainty) based on evidence. Working for 12 hours is clear evidence that she is tired.",
    grammar_tip: "Modals of deduction: must (certain) > should (expected) > might/may/could (possible) > can't (impossible).",
    example: "He must be hungry — he hasn't eaten all day.",
  },
  // Vị trí 1 → Ex2: fill_in_blank
  {
    topicTitle: "Modal Verbs",
    level: "intermediate",
    type: "fill_in_blank",
    question: "You ___ (should) have called me — I was worried about you.",
    correct_answer: "should have called",
    explanation:
      "'Should have + past participle' expresses criticism or regret about something that did not happen in the past. You didn't call → that was wrong.",
    grammar_tip: "'Should have + past participle' = past regret or criticism about what didn't happen.",
    example: "I should have studied harder for the exam.",
  },
  // Vị trí 2 → Ex1: reorder
  {
    topicTitle: "Modal Verbs",
    level: "intermediate",
    type: "reorder",
    question: "Rearrange to form a correct sentence about past ability:",
    words: ["been", "she", "have", "could", "a", "doctor", "but", "teacher", "a", "chose", "to", "be"],
    correct_order: [1, 3, 2, 0, 4, 5, 6, 1, 9, 10, 11, 7],
    explanation:
      "Correct: 'She could have been a doctor but chose to be a teacher.' 'Could have + past participle' expresses an unrealized ability or possibility in the past.",
    grammar_tip: "'Could have + past participle' = past possibility that didn't happen (unrealized ability).",
    example: "He could have won the race, but he fell near the finish line.",
  },
  // Vị trí 3 → Ex2: error_detection
  {
    topicTitle: "Modal Verbs",
    level: "intermediate",
    type: "error_detection",
    question: "Find the error in the sentence:",
    sentence_parts: ["He", "must have stole", "the money —", "no one else was there."],
    error_index: 1,
    corrected_part: "must have stolen",
    explanation:
      "'Must have + past participle' requires the past participle form. 'Steal' → past participle is 'stolen', not 'stole' (which is the Simple Past).",
    grammar_tip: "Perfect modal: must/might/could/should + have + PAST PARTICIPLE (not Simple Past).",
    example: "He must have forgotten about the meeting.",
  },
  // Vị trí 4 → Ex1: fill_in_blank
  {
    topicTitle: "Modal Verbs",
    level: "intermediate",
    type: "fill_in_blank",
    question: "She ___ (used to) wake up at 5 AM every day, but now she sleeps until 8.",
    correct_answer: "used to",
    explanation:
      "'Used to + base verb' describes a past habit or state that no longer exists. She no longer wakes up at 5 AM — this was her past habit.",
    grammar_tip: "'Used to + base verb' = past habit or state (no longer true now).",
    example: "I used to live in the countryside, but now I live in the city.",
  },
  // Vị trí 5 → Ex2: multiple_choice
  {
    topicTitle: "Modal Verbs",
    level: "intermediate",
    type: "multiple_choice",
    question: "You ___ be more careful. That was a very dangerous mistake.",
    options: [
      "had better to",
      "had better",
      "have better",
      "would better",
    ],
    correct_option_index: 1,
    explanation:
      "'Had better + base verb' gives strong advice, often with an implied warning. 'Had better' is a fixed expression — no 'to', no 'have', no 'would'.",
    grammar_tip: "'Had better + base verb' = strong advice/warning. No 'to' after 'better'.",
    example: "You had better leave now or you'll miss your train.",
  },
  // Vị trí 6 → Ex1: error_detection
  {
    topicTitle: "Modal Verbs",
    level: "intermediate",
    type: "error_detection",
    question: "Find the error in the sentence:",
    sentence_parts: ["I am used to", "wake up", "early every morning,", "even on weekends."],
    error_index: 1,
    corrected_part: "waking up",
    explanation:
      "'Be used to' means 'be accustomed to' and is followed by a gerund (verb + -ing), not a base verb. 'I am used to waking up early' is correct.",
    grammar_tip: "'Be used to' + gerund (verb-ing): I am used to waking up. / She is used to commuting.",
    example: "He is used to working under pressure.",
  },
  // Vị trí 7 → Ex2: reorder
  {
    topicTitle: "Modal Verbs",
    level: "intermediate",
    type: "reorder",
    question: "Rearrange to form a sentence expressing past impossibility:",
    words: ["stolen", "it", "all", "have", "day", "been", "with", "me", "he", "can't", "he", "was"],
    correct_order: [8, 9, 3, 0, 1, 11, 5, 6, 10, 7, 4],
    explanation:
      "Correct: 'He can't have stolen it — he was with me all day.' 'Can't have + past participle' expresses impossibility about a past action based on evidence.",
    grammar_tip: "'Can't have + past participle' = impossibility in the past (we're almost certain it didn't happen).",
    example: "She can't have passed the exam — she didn't study at all.",
  },

  // ── Modal Verbs – Pre-TOEIC (8 câu) ─────────────────────
  // Vị trí 0 → Ex1: multiple_choice
  {
    topicTitle: "Modal Verbs",
    level: "pre-toeic",
    type: "multiple_choice",
    question: "All visitors ___ register at the front desk before entering the premises.",
    options: [
      "can",
      "might",
      "are required to",
      "would",
    ],
    correct_option_index: 2,
    explanation:
      "'Are required to' expresses a rule-based obligation, commonly used in formal and business English. This is stronger and more formal than 'should' and is typical in TOEIC signs and notices.",
    grammar_tip: "'Be required to' = formal obligation (rule or policy). Common in TOEIC Part 1, 2, 5.",
    example: "Employees are required to wear identification badges at all times.",
  },
  // Vị trí 1 → Ex2: fill_in_blank
  {
    topicTitle: "Modal Verbs",
    level: "pre-toeic",
    type: "fill_in_blank",
    question: "The annual audit ___ (must) have revealed serious discrepancies in the accounts.",
    correct_answer: "must have revealed",
    explanation:
      "'Must have + past participle' expresses strong deductive reasoning about a past event based on available evidence. The accounts show discrepancies — therefore the audit must have revealed them.",
    grammar_tip: "'Must have + past participle' = strong certainty about a past action/event (deduction from evidence).",
    example: "There must have been a problem with the system — all records are missing.",
  },
  // Vị trí 2 → Ex1: reorder
  {
    topicTitle: "Modal Verbs",
    level: "pre-toeic",
    type: "reorder",
    question: "Rearrange to form a TOEIC-level formal sentence:",
    words: ["been", "the", "could", "have", "issue", "resolved", "sooner", "have", "we", "if", "consulted", "experts"],
    correct_order: [1, 4, 1, 2, 3, 6, 9, 8, 0, 5, 10, 11],
    explanation:
      "Correct: 'The issue could have been resolved sooner if we had consulted experts.' 'Could have been + past participle' = Past Perfect Passive Modal expressing an unrealized past possibility.",
    grammar_tip: "Modal Perfect Passive: could/should/would + have been + past participle.",
    example: "The project should have been completed on time if more resources had been allocated.",
  },
  // Vị trí 3 → Ex2: error_detection
  {
    topicTitle: "Modal Verbs",
    level: "pre-toeic",
    type: "error_detection",
    question: "Find the error in this TOEIC-style sentence:",
    sentence_parts: ["Employees", "are supposed to", "complete", "the training module by get certified."],
    error_index: 3,
    corrected_part: "the training module before getting certified",
    explanation:
      "After prepositions like 'before', 'after', 'by', we use gerunds (verb-ing), not base verbs. 'By getting certified' or 'before getting certified' is correct.",
    grammar_tip: "Preposition (before/after/by/without) + gerund (verb-ing).",
    example: "You must complete the safety course before operating the machinery.",
  },
  // Vị trí 4 → Ex1: fill_in_blank
  {
    topicTitle: "Modal Verbs",
    level: "pre-toeic",
    type: "fill_in_blank",
    question: "The CEO ___ (might) not have been aware of the financial irregularities at the time.",
    correct_answer: "might not have been aware",
    explanation:
      "'Might not have been + adjective/past participle' expresses uncertainty or possibility about a past state. It suggests the CEO possibly didn't know — but we're not certain.",
    grammar_tip: "'Might not have + past participle' = past uncertainty/possibility about something that may or may not have occurred.",
    example: "She might not have received the email due to a technical error.",
  },
  // Vị trí 5 → Ex2: multiple_choice
  {
    topicTitle: "Modal Verbs",
    level: "pre-toeic",
    type: "multiple_choice",
    question: "The new regulations ___ significantly impact operating costs, so businesses should plan accordingly.",
    options: [
      "must",
      "ought to have",
      "could",
      "should have",
    ],
    correct_option_index: 2,
    explanation:
      "'Could' here expresses future possibility — the regulations might or might not have a significant impact. 'Must' would imply certainty, which is too strong in this context.",
    grammar_tip: "'Could' = future possibility (less certain than 'will' or 'must'). Appropriate for predictions in business contexts.",
    example: "The new tax policy could affect thousands of small businesses.",
  },
  // Vị trí 6 → Ex1: error_detection
  {
    topicTitle: "Modal Verbs",
    level: "pre-toeic",
    type: "error_detection",
    question: "Find the error in this formal business sentence:",
    sentence_parts: ["Staff members", "are able to", "accessed the system", "using their employee ID."],
    error_index: 2,
    corrected_part: "access the system",
    explanation:
      "'Are able to' is a semi-modal meaning 'can', and it must be followed by a base verb (infinitive without 'to'), not a past tense or participle form.",
    grammar_tip: "'Be able to' + base verb. 'Are able to access' (NOT 'accessed').",
    example: "Managers are able to view all employee records.",
  },
  // Vị trí 7 → Ex2: reorder
  {
    topicTitle: "Modal Verbs",
    level: "pre-toeic",
    type: "reorder",
    question: "Rearrange to form a correct formal TOEIC sentence:",
    words: ["have", "the", "contract", "should", "been", "lawyer", "reviewed", "by", "a", "before", "signing"],
    correct_order: [1, 2, 3, 4, 5, 6, 0, 7, 8, 9, 10],
    explanation:
      "Correct: 'The contract should have been reviewed by a lawyer before signing.' This is a Perfect Modal Passive expressing regret or criticism about a past omission.",
    grammar_tip: "Perfect Modal Passive: should/could/must + have been + past participle.",
    example: "The report should have been submitted before the deadline.",
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
      `✅ Đã thêm: ${q.topicTitle} [${q.level}] (${q.type}) vào Bài tập ${exerciseOrder}`
    );
  }

  console.log("Quá trình thêm hoàn tất.");
  process.exit(0);
}

const PracticeExercise = require("../models/PracticeExercise");

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});