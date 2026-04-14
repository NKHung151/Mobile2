require("dotenv").config({path: '../../.env'  });
const mongoose = require("mongoose");
const Topic = require("../models/Topic");
const Chunk = require("../models/Chunk");
const { parseVTT } = require("../services/vttParser");

// ===== NHÚNG GIẢ =====
function fakeEmbedding(text) {
  return Array(3072).fill(0).map(() => Math.random());
}

// ===== CHIA ĐOẠN VĂN BẢN =====
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
    files: [
      {
        filename: "simple_sentences.vtt",
        content: `WEBVTT

00:00:00.000 --> 00:00:05.000
A simple sentence has one independent clause with a subject and a verb.

00:00:05.000 --> 00:00:10.000
It expresses a complete thought and can stand alone.

00:00:10.000 --> 00:00:15.000
The basic structure is: Subject + Verb.

00:00:15.000 --> 00:00:20.000
Example: She runs. "She" is the subject, "runs" is the verb.

00:00:20.000 --> 00:00:25.000
Example: They play football. "They" is the subject, "play" is the verb.

00:00:25.000 --> 00:00:30.000
A simple sentence can have a direct object after the verb.

00:00:30.000 --> 00:00:35.000
Example: He reads a book. "a book" is the direct object.

00:00:35.000 --> 00:00:40.000
A simple sentence can also have an indirect object.

00:00:40.000 --> 00:00:45.000
Example: She gave him a gift. "him" is the indirect object.

00:00:45.000 --> 00:00:50.000
Adjectives can be added to describe nouns in a simple sentence.

00:00:50.000 --> 00:00:55.000
Example: The tall boy runs fast. "tall" describes "boy."

00:00:55.000 --> 00:01:00.000
Adverbs modify verbs, adjectives, or other adverbs.

00:01:00.000 --> 00:01:05.000
Example: She runs quickly. "quickly" modifies "runs."

00:01:05.000 --> 00:01:10.000
A simple sentence can have a compound subject.

00:01:10.000 --> 00:01:15.000
Example: Tom and Mary like pizza. Two subjects share one verb.

00:01:15.000 --> 00:01:20.000
A simple sentence can also have a compound predicate.

00:01:20.000 --> 00:01:25.000
Example: She sings and dances. One subject has two verbs.

00:01:25.000 --> 00:01:30.000
A simple sentence cannot have two independent clauses joined without punctuation.

00:01:30.000 --> 00:01:35.000
Adding a second independent clause without a conjunction creates a run-on sentence.

00:01:35.000 --> 00:01:40.000
Subject-verb agreement is essential in simple sentences.

00:01:40.000 --> 00:01:45.000
A singular subject takes a singular verb: She walks. He reads.

00:01:45.000 --> 00:01:50.000
A plural subject takes a plural verb: They walk. We read.

00:01:50.000 --> 00:01:55.000
Indefinite pronouns like "everyone" and "nobody" take singular verbs.

00:01:55.000 --> 00:02:00.000
Example: Everyone loves chocolate. Nobody knows the answer.

00:02:00.000 --> 00:02:05.000
Prepositional phrases can be added to give more detail.

00:02:05.000 --> 00:02:10.000
Example: The cat sits on the mat. "on the mat" is a prepositional phrase.

00:02:10.000 --> 00:02:15.000
A simple sentence can start with an adverb for emphasis.

00:02:15.000 --> 00:02:20.000
Example: Slowly, he opened the door.

00:02:20.000 --> 00:02:25.000
Imperative sentences are a type of simple sentence that give commands.

00:02:25.000 --> 00:02:30.000
Example: Open the window. Sit down. Please be quiet.

00:02:30.000 --> 00:02:35.000
The subject "you" is implied in imperative sentences.

00:02:35.000 --> 00:02:40.000
Exclamatory sentences express strong emotion.

00:02:40.000 --> 00:02:45.000
Example: What a beautiful day! How fast she runs!

00:02:45.000 --> 00:02:50.000
Interrogative simple sentences ask questions.

00:02:50.000 --> 00:02:55.000
Example: Does she run? Did he read the book?

00:02:55.000 --> 00:03:00.000
Negative simple sentences use "not" or auxiliary verbs.

00:03:00.000 --> 00:03:05.000
Example: She does not run. He did not read the book.

00:03:05.000 --> 00:03:10.000
Contractions are common in negative sentences: doesn't, didn't, can't, won't.

00:03:10.000 --> 00:03:15.000
Transitive verbs require a direct object: She kicked the ball.

00:03:15.000 --> 00:03:20.000
Intransitive verbs do not require a direct object: He sleeps. She arrived.

00:03:20.000 --> 00:03:25.000
Linking verbs connect the subject to a subject complement.

00:03:25.000 --> 00:03:30.000
Common linking verbs: be, seem, appear, become, feel, look, smell, taste, sound.

00:03:30.000 --> 00:03:35.000
After a linking verb, use an adjective, not an adverb.

00:03:35.000 --> 00:03:40.000
Example: She looks happy. NOT: She looks happily.

00:03:40.000 --> 00:03:45.000
Gerunds (verb + -ing) can be subjects of simple sentences.

00:03:45.000 --> 00:03:50.000
Example: Swimming is good exercise. Reading improves vocabulary.

00:03:50.000 --> 00:03:55.000
Infinitives (to + verb) can also function as subjects.

00:03:55.000 --> 00:04:00.000
Example: To learn English takes time.

00:04:00.000 --> 00:04:05.000
Appositives rename the subject and are set off by commas.

00:04:05.000 --> 00:04:10.000
Example: My brother, a doctor, works at the hospital.

00:04:10.000 --> 00:04:15.000
Collective nouns like "team" or "committee" are usually treated as singular.

00:04:15.000 --> 00:04:20.000
Example: The team is ready. The committee has decided.

00:04:20.000 --> 00:04:25.000
"The number of" takes a singular verb; "a number of" takes a plural verb.

00:04:25.000 --> 00:04:30.000
Example: The number of students is increasing. A number of students are absent.

00:04:30.000 --> 00:04:35.000
Simple sentences are the foundation of all English grammar.

00:04:35.000 --> 00:04:40.000
Mastering simple sentences helps you build compound and complex sentences.`,
      },
    ],
  },
  {
    topic_id: "tenses",
    title: "Tenses",
    files: [
      {
        filename: "tenses.vtt",
        content: `WEBVTT

00:00:00.000 --> 00:00:05.000
Tenses indicate the time of an action: past, present, or future.

00:00:05.000 --> 00:00:10.000
English has 12 main tenses divided into simple, continuous, perfect, and perfect continuous.

00:00:10.000 --> 00:00:15.000
The Simple Present tense describes habits, routines, and general facts.

00:00:15.000 --> 00:00:20.000
Formula: Subject + base verb. Add -s or -es for he, she, it.

00:00:20.000 --> 00:00:25.000
Example: She eats breakfast every day. The sun rises in the east.

00:00:25.000 --> 00:00:30.000
Time signals for Simple Present: always, usually, often, sometimes, never, every day.

00:00:30.000 --> 00:00:35.000
The Present Continuous tense describes actions happening right now.

00:00:35.000 --> 00:00:40.000
Formula: Subject + am/is/are + verb-ing.

00:00:40.000 --> 00:00:45.000
Example: She is eating lunch right now. They are playing football.

00:00:45.000 --> 00:00:50.000
Time signals for Present Continuous: now, at the moment, currently, right now, look, listen.

00:00:50.000 --> 00:00:55.000
Some verbs are not used in continuous tenses. These are called stative verbs.

00:00:55.000 --> 00:01:00.000
Stative verbs include: know, believe, want, need, love, hate, see, hear, smell, seem.

00:01:00.000 --> 00:01:05.000
Incorrect: I am knowing the answer. Correct: I know the answer.

00:01:05.000 --> 00:01:10.000
The Present Perfect tense connects the past to the present.

00:01:10.000 --> 00:01:15.000
Formula: Subject + have/has + past participle.

00:01:15.000 --> 00:01:20.000
Example: She has visited Paris. They have finished the project.

00:01:20.000 --> 00:01:25.000
Time signals for Present Perfect: just, already, yet, ever, never, since, for, recently.

00:01:25.000 --> 00:01:30.000
"Since" is used with a starting point: She has lived here since 2015.

00:01:30.000 --> 00:01:35.000
"For" is used with a duration: She has lived here for five years.

00:01:35.000 --> 00:01:40.000
Never use Present Perfect with specific finished time expressions.

00:01:40.000 --> 00:01:45.000
Incorrect: I have seen him yesterday. Correct: I saw him yesterday.

00:01:45.000 --> 00:01:50.000
The Present Perfect Continuous emphasizes how long an activity has been going on.

00:01:50.000 --> 00:01:55.000
Formula: Subject + have/has + been + verb-ing.

00:01:55.000 --> 00:02:00.000
Example: She has been studying for three hours. It has been raining since morning.

00:02:00.000 --> 00:02:05.000
The Simple Past tense describes completed actions at a specific time in the past.

00:02:05.000 --> 00:02:10.000
Formula: Subject + past tense verb. Regular verbs add -ed. Irregular verbs change form.

00:02:10.000 --> 00:02:15.000
Example: She ate breakfast. They played football yesterday.

00:02:15.000 --> 00:02:20.000
Time signals for Simple Past: yesterday, last week, in 2010, ago, when.

00:02:20.000 --> 00:02:25.000
Common irregular verbs: go went, eat ate, see saw, take took, write wrote, come came.

00:02:25.000 --> 00:02:30.000
The Past Continuous describes an action in progress at a specific past moment.

00:02:30.000 --> 00:02:35.000
Formula: Subject + was/were + verb-ing.

00:02:35.000 --> 00:02:40.000
Example: She was reading when the phone rang.

00:02:40.000 --> 00:02:45.000
Use Past Continuous with Simple Past for an interrupted action.

00:02:45.000 --> 00:02:50.000
Example: I was cooking dinner when she arrived.

00:02:50.000 --> 00:02:55.000
The Past Perfect describes an action completed before another past action.

00:02:55.000 --> 00:03:00.000
Formula: Subject + had + past participle.

00:03:00.000 --> 00:03:05.000
Example: By the time she arrived, they had already eaten.

00:03:05.000 --> 00:03:10.000
The Past Perfect Continuous shows the duration of an activity before a past event.

00:03:10.000 --> 00:03:15.000
Formula: Subject + had been + verb-ing.

00:03:15.000 --> 00:03:20.000
Example: She had been waiting for two hours before the doctor arrived.

00:03:20.000 --> 00:03:25.000
The Simple Future with "will": Subject + will + base verb.

00:03:25.000 --> 00:03:30.000
Example: She will travel to London next year.

00:03:30.000 --> 00:03:35.000
"Be going to" expresses plans and intentions: Subject + am/is/are + going to + base verb.

00:03:35.000 --> 00:03:40.000
Example: She is going to study medicine.

00:03:40.000 --> 00:03:45.000
"Will" is used for spontaneous decisions made at the moment of speaking.

00:03:45.000 --> 00:03:50.000
"Be going to" is used for pre-planned decisions.

00:03:50.000 --> 00:03:55.000
Time signals for future: tomorrow, next week, soon, later, this evening.

00:03:55.000 --> 00:04:00.000
The Future Continuous: Subject + will be + verb-ing.

00:04:00.000 --> 00:04:05.000
Example: This time tomorrow, she will be flying to Paris.

00:04:05.000 --> 00:04:10.000
The Future Perfect: Subject + will have + past participle.

00:04:10.000 --> 00:04:15.000
Example: By 2030, she will have graduated from university.

00:04:15.000 --> 00:04:20.000
In time clauses, use Present tense for future meaning: When she arrives, we will start.

00:04:20.000 --> 00:04:25.000
Do NOT say: When she will arrive. Use: When she arrives.

00:04:25.000 --> 00:04:30.000
Understanding all 12 tenses is key to accurate English communication.`,
      },
    ],
  },
  {
    topic_id: "active-passive",
    title: "Active / Passive",
    files: [
      {
        filename: "active_passive.vtt",
        content: `WEBVTT

00:00:00.000 --> 00:00:05.000
Voice shows the relationship between the subject and the action of the verb.

00:00:05.000 --> 00:00:10.000
There are two voices in English: active voice and passive voice.

00:00:10.000 --> 00:00:15.000
In active voice, the subject performs the action.

00:00:15.000 --> 00:00:20.000
Example: She wrote a letter. "She" is the agent performing the action.

00:00:20.000 --> 00:00:25.000
In passive voice, the subject receives the action.

00:00:25.000 --> 00:00:30.000
Example: A letter was written by her. "A letter" receives the action.

00:00:30.000 --> 00:00:35.000
The passive voice is formed with: be + past participle.

00:00:35.000 --> 00:00:40.000
The "be" verb must match the tense of the original active sentence.

00:00:40.000 --> 00:00:45.000
Simple Present Passive: am/is/are + past participle.

00:00:45.000 --> 00:00:50.000
Example: The cake is baked by the chef every morning.

00:00:50.000 --> 00:00:55.000
Simple Past Passive: was/were + past participle.

00:00:55.000 --> 00:01:00.000
Example: The letter was sent by the manager yesterday.

00:01:00.000 --> 00:01:05.000
Present Continuous Passive: am/is/are + being + past participle.

00:01:05.000 --> 00:01:10.000
Example: The road is being repaired right now.

00:01:10.000 --> 00:01:15.000
Past Continuous Passive: was/were + being + past participle.

00:01:15.000 --> 00:01:20.000
Example: The building was being constructed when the accident occurred.

00:01:20.000 --> 00:01:25.000
Present Perfect Passive: have/has + been + past participle.

00:01:25.000 --> 00:01:30.000
Example: The report has been submitted by the team.

00:01:30.000 --> 00:01:35.000
Past Perfect Passive: had + been + past participle.

00:01:35.000 --> 00:01:40.000
Example: The project had been completed before the deadline.

00:01:40.000 --> 00:01:45.000
Simple Future Passive: will + be + past participle.

00:01:45.000 --> 00:01:50.000
Example: The results will be announced tomorrow.

00:01:50.000 --> 00:01:55.000
Modal Passive: modal + be + past participle.

00:01:55.000 --> 00:02:00.000
Example: The rules must be followed. The problem can be solved.

00:02:00.000 --> 00:02:05.000
The agent (doer) is introduced with "by" in passive sentences.

00:02:05.000 --> 00:02:10.000
The agent is often omitted when it is unknown, unimportant, or obvious.

00:02:10.000 --> 00:02:15.000
Example: My wallet was stolen. We don't know who stole it.

00:02:15.000 --> 00:02:20.000
Passive voice is commonly used in academic and scientific writing.

00:02:20.000 --> 00:02:25.000
Example: The experiment was conducted under controlled conditions.

00:02:25.000 --> 00:02:30.000
Passive voice is used in news reports to focus on the event.

00:02:30.000 --> 00:02:35.000
Example: Three people were injured in the accident.

00:02:35.000 --> 00:02:40.000
Only transitive verbs (verbs that take an object) can be made passive.

00:02:40.000 --> 00:02:45.000
Intransitive verbs like "arrive," "sleep," and "die" cannot be passivized.

00:02:45.000 --> 00:02:50.000
Some verbs have two objects: give, send, offer, show, tell, teach, buy.

00:02:50.000 --> 00:02:55.000
Either object can become the subject of a passive sentence.

00:02:55.000 --> 00:03:00.000
Active: She gave him a book. Passive 1: He was given a book. Passive 2: A book was given to him.

00:03:00.000 --> 00:03:05.000
Impersonal passive: It is said that... It is believed that... It is reported that...

00:03:05.000 --> 00:03:10.000
Personal passive: She is said to be an expert. He is known to have won many awards.

00:03:10.000 --> 00:03:15.000
Passive infinitives: to be + past participle.

00:03:15.000 --> 00:03:20.000
Example: She wants to be promoted. The work needs to be done.

00:03:20.000 --> 00:03:25.000
Passive gerunds: being + past participle.

00:03:25.000 --> 00:03:30.000
Example: She hates being criticized. He enjoys being praised.

00:03:30.000 --> 00:03:35.000
Causative have: have/get + object + past participle.

00:03:35.000 --> 00:03:40.000
Example: She had her hair cut. He got his car repaired.

00:03:40.000 --> 00:03:45.000
To convert active to passive: move the object to subject, add be + past participle, put the agent after "by."

00:03:45.000 --> 00:03:50.000
Active: The teacher corrected the papers. Passive: The papers were corrected by the teacher.

00:03:50.000 --> 00:03:55.000
Active voice is preferred for clear and direct writing.

00:03:55.000 --> 00:04:00.000
Use passive when the agent is unknown, unimportant, or when you want a formal tone.

00:04:00.000 --> 00:04:05.000
Passive voice is important for TOEIC, IELTS, and academic writing.`,
      },
    ],
  },
  {
    topic_id: "modal-verbs",
    title: "Modal Verbs",
    files: [
      {
        filename: "modal_verbs.vtt",
        content: `WEBVTT

00:00:00.000 --> 00:00:05.000
Modal verbs are auxiliary verbs that express ability, possibility, permission, obligation, or advice.

00:00:05.000 --> 00:00:10.000
The main modal verbs are: can, could, may, might, must, shall, should, will, would, ought to.

00:00:10.000 --> 00:00:15.000
Modal verbs are always followed by the base form of the verb without "to."

00:00:15.000 --> 00:00:20.000
Example: She can swim. He must leave. They should study.

00:00:20.000 --> 00:00:25.000
Modal verbs do not add -s for third person singular: He can run. NOT: He cans run.

00:00:25.000 --> 00:00:30.000
Modal verbs do not use "do/does/did" in questions or negatives.

00:00:30.000 --> 00:00:35.000
Question: Can she swim? NOT: Does she can swim?

00:00:35.000 --> 00:00:40.000
Negative: She cannot swim. She can't swim.

00:00:40.000 --> 00:00:45.000
"Can" expresses present ability: I can speak three languages.

00:00:45.000 --> 00:00:50.000
"Can" expresses informal permission: Can I borrow your pen?

00:00:50.000 --> 00:00:55.000
"Can" expresses general possibility: Too much stress can cause health problems.

00:00:55.000 --> 00:01:00.000
"Could" expresses past ability: She could run very fast when she was young.

00:01:00.000 --> 00:01:05.000
"Could" expresses polite requests: Could you please help me?

00:01:05.000 --> 00:01:10.000
"Could" expresses present possibility: It could rain later today.

00:01:10.000 --> 00:01:15.000
"Could have + past participle" expresses an unrealized past possibility.

00:01:15.000 --> 00:01:20.000
Example: She could have been a doctor but chose to be a teacher.

00:01:20.000 --> 00:01:25.000
"May" expresses formal permission: May I come in?

00:01:25.000 --> 00:01:30.000
"May" expresses possibility: It may rain tomorrow.

00:01:30.000 --> 00:01:35.000
"Might" expresses less certain possibility: It might rain, but I'm not sure.

00:01:35.000 --> 00:01:40.000
"Might have + past participle" expresses speculation about a past event.

00:01:40.000 --> 00:01:45.000
Example: She might have missed the bus. That's why she's late.

00:01:45.000 --> 00:01:50.000
"Must" expresses strong obligation: You must wear a seatbelt.

00:01:50.000 --> 00:01:55.000
"Must" expresses logical deduction: She must be tired — she has been working all day.

00:01:55.000 --> 00:02:00.000
"Must not" (mustn't) expresses prohibition: You must not smoke in this area.

00:02:00.000 --> 00:02:05.000
"Don't have to" means no obligation: You don't have to come if you're busy.

00:02:05.000 --> 00:02:10.000
"Must not" and "don't have to" are very different. Mustn't = forbidden. Don't have to = optional.

00:02:10.000 --> 00:02:15.000
"Should" expresses advice or recommendation: You should see a doctor.

00:02:15.000 --> 00:02:20.000
"Should have + past participle" expresses regret or criticism about the past.

00:02:20.000 --> 00:02:25.000
Example: You should have called me. I should have studied more.

00:02:25.000 --> 00:02:30.000
"Ought to" is similar to "should" but slightly more formal.

00:02:30.000 --> 00:02:35.000
Example: You ought to apologize. Children ought to respect their elders.

00:02:35.000 --> 00:02:40.000
"Shall" is used in questions to offer or suggest: Shall we dance? Shall I open the window?

00:02:40.000 --> 00:02:45.000
"Will" expresses future intention or a spontaneous decision: I'll answer the phone.

00:02:45.000 --> 00:02:50.000
"Would" expresses polite requests: Would you mind helping me?

00:02:50.000 --> 00:02:55.000
"Would" is used in Second Conditional: If I had more time, I would travel.

00:02:55.000 --> 00:03:00.000
"Would" expresses past habits: When I was young, I would play outside every day.

00:03:00.000 --> 00:03:05.000
Perfect modals: modal + have + past participle.

00:03:05.000 --> 00:03:10.000
"Must have + past participle" expresses certainty about a past action.

00:03:10.000 --> 00:03:15.000
Example: She must have left already — her coat is gone.

00:03:15.000 --> 00:03:20.000
"Can't have + past participle" expresses impossibility about a past action.

00:03:20.000 --> 00:03:25.000
Example: He can't have stolen it — he was with me all day.

00:03:25.000 --> 00:03:30.000
"Should have + past participle" means something was the right thing to do but wasn't done.

00:03:30.000 --> 00:03:35.000
Modals of deduction: must (certain), may/might/could (possible), can't (impossible).

00:03:35.000 --> 00:03:40.000
"Had better + base verb" gives strong advice with an implied warning.

00:03:40.000 --> 00:03:45.000
Example: You had better leave now or you will miss the train.

00:03:45.000 --> 00:03:50.000
"Used to + base verb" describes past habits or states that no longer exist.

00:03:50.000 --> 00:03:55.000
Example: I used to smoke but I quit. She used to live in London.

00:03:55.000 --> 00:04:00.000
"Be used to + gerund" means being accustomed to something.

00:04:00.000 --> 00:04:05.000
Example: I am used to waking up early. She is used to working long hours.

00:04:05.000 --> 00:04:10.000
Do not confuse "used to do" (past habit) with "be used to doing" (accustomed to).

00:04:10.000 --> 00:04:15.000
Incorrect: I used to living here. Correct: I am used to living here.

00:04:15.000 --> 00:04:20.000
Modal verbs are very common in TOEIC, IELTS, and TOEFL grammar sections.`,
      },
    ],
  },
];

async function seedTopics() {
  await mongoose.connect(process.env.MONGODB_URI);

  for (const t of topics) {
    let totalChunks = 0;

    // 1. CẬP NHẬT CHỦ ĐỀ
    await Topic.findOneAndUpdate(
      { topic_id: t.topic_id },
      { topic_id: t.topic_id, title: t.title },
      { upsert: true }
    );

    // 2. XÓA CÁC KHỐI CŨ
    await Chunk.deleteMany({ topic_id: t.topic_id });

    // 3. XỬ LÝ TỆP
    for (const file of t.files) {
      const cleanText = parseVTT(file.content);
      const chunks = splitIntoChunks(cleanText, 50);

      let chunkIndex = 0;
      for (const c of chunks) {
        await Chunk.create({
          topic_id: t.topic_id,
          file_name: file.filename,
          chunk_index: chunkIndex++,
          content: c,
          embedding: fakeEmbedding(c),
        });
        totalChunks++;
      }
    }

    // 4. CẬP NHẬT THỐNG KÊ
    await Topic.updateOne(
      { topic_id: t.topic_id },
      { file_count: t.files.length, total_chunks: totalChunks }
    );

    console.log(`✅ ${t.title} | chunks: ${totalChunks}`);
  }

  console.log("🎉 HOÀN THÀNH");
  process.exit();
}

seedTopics();