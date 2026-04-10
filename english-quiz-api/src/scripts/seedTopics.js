require("dotenv").config({ path: '../../.env' });
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
A simple sentence cannot have two independent clauses.

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
Exclamatory simple sentences express strong emotion.

00:02:40.000 --> 00:02:45.000
Example: What a beautiful day! How fast she runs!

00:02:45.000 --> 00:02:50.000
Interrogative simple sentences ask questions.

00:02:50.000 --> 00:02:55.000
Example: Does she run? Did he read the book?

00:02:55.000 --> 00:03:00.000
Negative simple sentences use "not" or auxiliary verbs to negate.

00:03:00.000 --> 00:03:05.000
Example: She does not run. He did not read the book.

00:03:05.000 --> 00:03:10.000
Contractions are commonly used in negative sentences: doesn't, didn't, can't.

00:03:10.000 --> 00:03:15.000
Transitive verbs require a direct object: She kicked the ball.

00:03:15.000 --> 00:03:20.000
Intransitive verbs do not require a direct object: He sleeps. She arrived.

00:03:20.000 --> 00:03:25.000
Linking verbs connect the subject to a subject complement.

00:03:25.000 --> 00:03:30.000
Common linking verbs: be, seem, appear, become, feel, look, smell, taste, sound.

00:03:30.000 --> 00:03:35.000
Example: She seems happy. The soup tastes delicious.

00:03:35.000 --> 00:03:40.000
A subject complement can be a noun or adjective after a linking verb.

00:03:40.000 --> 00:03:45.000
Example: He is a doctor. (noun complement) She looks tired. (adjective complement)

00:03:45.000 --> 00:03:50.000
Noun phrases can serve as subjects: The old man in the park feeds birds.

00:03:50.000 --> 00:03:55.000
Gerunds (verb + -ing) can be subjects of simple sentences.

00:03:55.000 --> 00:04:00.000
Example: Swimming is good exercise. Reading improves vocabulary.

00:04:00.000 --> 00:04:05.000
Infinitives (to + verb) can also function as subjects.

00:04:05.000 --> 00:04:10.000
Example: To learn English takes time. To win is the goal.

00:04:10.000 --> 00:04:15.000
Appositives rename or re-identify the subject.

00:04:15.000 --> 00:04:20.000
Example: My brother, a doctor, works at the hospital.

00:04:20.000 --> 00:04:25.000
Participial phrases can add detail but must be attached to a simple sentence correctly.

00:04:25.000 --> 00:04:30.000
Example: Excited about the trip, she packed her bags.

00:04:30.000 --> 00:04:35.000
A dangling modifier occurs when the participial phrase is incorrectly placed.

00:04:35.000 --> 00:04:40.000
Incorrect: Running to school, the rain started. (Who was running? Not the rain.)

00:04:40.000 --> 00:04:45.000
Correct: Running to school, she got caught in the rain.

00:04:45.000 --> 00:04:50.000
Simple sentences are the foundation of all English grammar.

00:04:50.000 --> 00:04:55.000
Mastering simple sentences helps you build compound and complex sentences later.

00:04:55.000 --> 00:05:00.000
Practice identifying subjects and verbs in every sentence you read.`,
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
English has 12 main tenses, divided into simple, continuous, perfect, and perfect continuous.

00:00:10.000 --> 00:00:15.000
The Simple Present tense describes habits, routines, and facts.

00:00:15.000 --> 00:00:20.000
Formula: Subject + base verb (add -s/-es for he/she/it).

00:00:20.000 --> 00:00:25.000
Example: She eats breakfast every day. The sun rises in the east.

00:00:25.000 --> 00:00:30.000
Time signals for Simple Present: always, usually, often, sometimes, never, every day.

00:00:30.000 --> 00:00:35.000
The Present Continuous tense describes actions happening right now or temporary situations.

00:00:35.000 --> 00:00:40.000
Formula: Subject + am/is/are + verb-ing.

00:00:40.000 --> 00:00:45.000
Example: She is eating lunch right now. They are playing football.

00:00:45.000 --> 00:00:50.000
Time signals for Present Continuous: now, at the moment, currently, today, this week.

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
The Present Perfect Continuous emphasizes the duration of an ongoing activity.

00:01:30.000 --> 00:01:35.000
Formula: Subject + have/has + been + verb-ing.

00:01:35.000 --> 00:01:40.000
Example: She has been studying for three hours. It has been raining since morning.

00:01:40.000 --> 00:01:45.000
The Simple Past tense describes completed actions at a specific time in the past.

00:01:45.000 --> 00:01:50.000
Formula: Subject + past tense verb (regular: add -ed; irregular: special form).

00:01:50.000 --> 00:01:55.000
Example: She ate breakfast. They played football yesterday.

00:01:55.000 --> 00:02:00.000
Time signals for Simple Past: yesterday, last week, in 2010, ago, when.

00:02:00.000 --> 00:02:05.000
Common irregular verbs: go→went, eat→ate, see→saw, take→took, write→wrote.

00:02:05.000 --> 00:02:10.000
The Past Continuous tense describes an action in progress at a specific moment in the past.

00:02:10.000 --> 00:02:15.000
Formula: Subject + was/were + verb-ing.

00:02:15.000 --> 00:02:20.000
Example: She was reading when the phone rang.

00:02:20.000 --> 00:02:25.000
The Past Continuous is often used with the Simple Past for interrupted actions.

00:02:25.000 --> 00:02:30.000
Example: I was cooking dinner when she arrived.

00:02:30.000 --> 00:02:35.000
The Past Perfect tense describes an action completed before another past action.

00:02:35.000 --> 00:02:40.000
Formula: Subject + had + past participle.

00:02:40.000 --> 00:02:45.000
Example: By the time she arrived, they had already eaten.

00:02:45.000 --> 00:02:50.000
The Past Perfect Continuous emphasizes the duration of an action before a past event.

00:02:50.000 --> 00:02:55.000
Formula: Subject + had + been + verb-ing.

00:02:55.000 --> 00:03:00.000
Example: She had been waiting for two hours before the doctor arrived.

00:03:00.000 --> 00:03:05.000
The Simple Future tense describes actions that will happen in the future.

00:03:05.000 --> 00:03:10.000
Formula with "will": Subject + will + base verb.

00:03:10.000 --> 00:03:15.000
Example: She will travel to London next year.

00:03:15.000 --> 00:03:20.000
Formula with "be going to": Subject + am/is/are + going to + base verb.

00:03:20.000 --> 00:03:25.000
Example: She is going to study medicine. We use this for plans and intentions.

00:03:25.000 --> 00:03:30.000
"Will" is used for spontaneous decisions and predictions without evidence.

00:03:30.000 --> 00:03:35.000
"Be going to" is used for planned decisions and predictions with evidence.

00:03:35.000 --> 00:03:40.000
Time signals for Simple Future: tomorrow, next week, soon, in the future, later.

00:03:40.000 --> 00:03:45.000
The Future Continuous describes an action in progress at a specific future time.

00:03:45.000 --> 00:03:50.000
Formula: Subject + will be + verb-ing.

00:03:50.000 --> 00:03:55.000
Example: This time tomorrow, she will be flying to Paris.

00:03:55.000 --> 00:04:00.000
The Future Perfect describes an action that will be completed before a future point.

00:04:00.000 --> 00:04:05.000
Formula: Subject + will have + past participle.

00:04:05.000 --> 00:04:10.000
Example: By 2030, she will have graduated from university.

00:04:10.000 --> 00:04:15.000
The Future Perfect Continuous describes the duration of an action up to a future point.

00:04:15.000 --> 00:04:20.000
Formula: Subject + will have been + verb-ing.

00:04:20.000 --> 00:04:25.000
Example: By next month, she will have been working here for ten years.

00:04:25.000 --> 00:04:30.000
Never use Present Perfect with specific past time expressions like "yesterday" or "last year."

00:04:30.000 --> 00:04:35.000
Incorrect: I have seen him yesterday. Correct: I saw him yesterday.

00:04:35.000 --> 00:04:40.000
"Since" refers to a starting point: She has lived here since 2010.

00:04:40.000 --> 00:04:45.000
"For" refers to a duration: She has lived here for ten years.

00:04:45.000 --> 00:04:50.000
In time and conditional clauses, use present tense for future meaning.

00:04:50.000 --> 00:04:55.000
Example: When she arrives, we will start. (NOT: When she will arrive)

00:04:55.000 --> 00:05:00.000
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
Future Perfect Passive: will + have been + past participle.

00:01:55.000 --> 00:02:00.000
Example: The task will have been finished by Friday.

00:02:00.000 --> 00:02:05.000
Modal Passive: modal + be + past participle.

00:02:05.000 --> 00:02:10.000
Example: The rules must be followed. The problem can be solved.

00:02:10.000 --> 00:02:15.000
The agent (doer) is introduced with "by" in passive sentences.

00:02:15.000 --> 00:02:20.000
The agent is often omitted when it is unknown, unimportant, or obvious.

00:02:20.000 --> 00:02:25.000
Example: My wallet was stolen. (We don't know who stole it.)

00:02:25.000 --> 00:02:30.000
Passive voice is commonly used in academic and scientific writing.

00:02:30.000 --> 00:02:35.000
Example: The experiment was conducted under controlled conditions.

00:02:35.000 --> 00:02:40.000
Passive voice is used in news reports to focus on the event rather than the doer.

00:02:40.000 --> 00:02:45.000
Example: Three people were injured in the accident.

00:02:45.000 --> 00:02:50.000
Only transitive verbs (verbs that take an object) can be made passive.

00:02:50.000 --> 00:02:55.000
Intransitive verbs like "arrive," "sleep," "die" cannot be passivized.

00:02:55.000 --> 00:03:00.000
Incorrect: The bed was slept. Correct: He slept in the bed. (active, intransitive)

00:03:00.000 --> 00:03:05.000
Some verbs have two objects: give, send, offer, show, tell, teach, buy.

00:03:05.000 --> 00:03:10.000
Either object can become the subject of a passive sentence.

00:03:10.000 --> 00:03:15.000
Active: She gave him a book. Passive 1: He was given a book. Passive 2: A book was given to him.

00:03:15.000 --> 00:03:20.000
Causative structures use passive meaning: have/get + object + past participle.

00:03:20.000 --> 00:03:25.000
Example: She had her hair cut. He got his car repaired.

00:03:25.000 --> 00:03:30.000
Reporting verbs with passive: It is said that..., It is believed that...

00:03:30.000 --> 00:03:35.000
Example: It is reported that the economy is improving.

00:03:35.000 --> 00:03:40.000
Personal passive with reporting verbs: She is said to be an expert.

00:03:40.000 --> 00:03:45.000
He is known to have won many awards.

00:03:45.000 --> 00:03:50.000
Passive infinitives: to be + past participle.

00:03:50.000 --> 00:03:55.000
Example: She wants to be promoted. The work needs to be done.

00:03:55.000 --> 00:04:00.000
Passive gerunds: being + past participle.

00:04:00.000 --> 00:04:05.000
Example: She hates being criticized. He enjoys being praised.

00:04:05.000 --> 00:04:10.000
To convert active to passive: move the object to subject position, add be + past participle, put the original subject after "by."

00:04:10.000 --> 00:04:15.000
Active: The teacher corrected the papers. Passive: The papers were corrected by the teacher.

00:04:15.000 --> 00:04:20.000
Active voice is generally preferred for clear, direct, concise writing.

00:04:20.000 --> 00:04:25.000
Passive voice should be used deliberately, not out of habit.

00:04:25.000 --> 00:04:30.000
Understanding voice is crucial for TOEIC, IELTS, and academic English.`,
      },
    ],
  },
  {
    topic_id: "conditionals",
    title: "Conditionals",
    files: [
      {
        filename: "conditionals.vtt",
        content: `WEBVTT

00:00:00.000 --> 00:00:05.000
Conditional sentences express a condition and its result.

00:00:05.000 --> 00:00:10.000
They are also called "if sentences" and have two clauses: the if-clause and the main clause.

00:00:10.000 --> 00:00:15.000
There are five main types of conditionals in English.

00:00:15.000 --> 00:00:20.000
Zero Conditional expresses general truths and scientific facts.

00:00:20.000 --> 00:00:25.000
Formula: If + Simple Present, Simple Present.

00:00:25.000 --> 00:00:30.000
Example: If you heat water to 100°C, it boils.

00:00:30.000 --> 00:00:35.000
Example: If it rains, the ground gets wet.

00:00:35.000 --> 00:00:40.000
"When" can replace "if" in Zero Conditionals without changing the meaning.

00:00:40.000 --> 00:00:45.000
First Conditional expresses real and possible future situations.

00:00:45.000 --> 00:00:50.000
Formula: If + Simple Present, will + base verb.

00:00:50.000 --> 00:00:55.000
Example: If it rains tomorrow, we will cancel the picnic.

00:00:55.000 --> 00:01:00.000
Example: If she studies hard, she will pass the exam.

00:01:00.000 --> 00:01:05.000
Other modals can replace "will" in the main clause: can, may, might, should.

00:01:05.000 --> 00:01:10.000
Example: If he arrives late, he might miss the presentation.

00:01:10.000 --> 00:01:15.000
Second Conditional expresses imaginary, hypothetical, or unlikely present/future situations.

00:01:15.000 --> 00:01:20.000
Formula: If + Simple Past, would + base verb.

00:01:20.000 --> 00:01:25.000
Example: If I had a million dollars, I would travel the world.

00:01:25.000 --> 00:01:30.000
Example: If she were a bird, she would fly to Paris. (Use "were" for all subjects.)

00:01:30.000 --> 00:01:35.000
"Were" is preferred for all subjects in formal Second Conditional: If I were you...

00:01:35.000 --> 00:01:40.000
Could and might can also be used: If I had more time, I could read more books.

00:01:40.000 --> 00:01:45.000
Third Conditional expresses impossible or hypothetical situations in the past.

00:01:45.000 --> 00:01:50.000
Formula: If + Past Perfect, would have + past participle.

00:01:50.000 --> 00:01:55.000
Example: If she had studied harder, she would have passed the exam.

00:01:55.000 --> 00:02:00.000
Example: If I had known about the party, I would have come.

00:02:00.000 --> 00:02:05.000
Third Conditional expresses regret about past events that cannot be changed.

00:02:05.000 --> 00:02:10.000
Could have and might have can replace "would have."

00:02:10.000 --> 00:02:15.000
Example: If he had trained harder, he could have won the race.

00:02:15.000 --> 00:02:20.000
Mixed Conditionals combine different time frames.

00:02:20.000 --> 00:02:25.000
Type 1 Mixed: If + Past Perfect, would + base verb. (Past condition, present result.)

00:02:25.000 --> 00:02:30.000
Example: If she had taken the job, she would be rich now.

00:02:30.000 --> 00:02:35.000
Type 2 Mixed: If + Simple Past, would have + past participle. (Present condition, past result.)

00:02:35.000 --> 00:02:40.000
Example: If I were braver, I would have spoken up at the meeting.

00:02:40.000 --> 00:02:45.000
Inversion can be used in formal conditionals instead of "if."

00:02:45.000 --> 00:02:50.000
Second Conditional inversion: Were I in your position, I would reconsider.

00:02:50.000 --> 00:02:55.000
Third Conditional inversion: Had she known the truth, she would have acted differently.

00:02:55.000 --> 00:03:00.000
First Conditional inversion: Should you need help, please contact us.

00:03:00.000 --> 00:03:05.000
"Unless" means "if not" and can start conditional sentences.

00:03:05.000 --> 00:03:10.000
Example: Unless you hurry, we will be late. = If you don't hurry, we will be late.

00:03:10.000 --> 00:03:15.000
"As long as," "provided that," and "on condition that" can replace "if."

00:03:15.000 --> 00:03:20.000
Example: You can go out as long as you finish your homework.

00:03:20.000 --> 00:03:25.000
"Suppose" and "imagine" can introduce hypothetical conditions.

00:03:25.000 --> 00:03:30.000
Example: Suppose you won the lottery, what would you do?

00:03:30.000 --> 00:03:35.000
Wishes are related to conditionals and express desires about unreal situations.

00:03:35.000 --> 00:03:40.000
Wish + Past Simple for present wishes: I wish I had more time.

00:03:40.000 --> 00:03:45.000
Wish + Past Perfect for past regrets: I wish I had studied harder.

00:03:45.000 --> 00:03:50.000
Wish + would for annoyances or desired future changes: I wish he would stop smoking.

00:03:50.000 --> 00:03:55.000
"If only" is used to express stronger wishes and regrets.

00:03:55.000 --> 00:04:00.000
Example: If only I had listened to her advice! If only we had more money!

00:04:00.000 --> 00:04:05.000
Never use "would" in the if-clause of conditional sentences.

00:04:05.000 --> 00:04:10.000
Incorrect: If I would have time, I would visit you. Correct: If I had time, I would visit you.

00:04:10.000 --> 00:04:15.000
The if-clause can come before or after the main clause.

00:04:15.000 --> 00:04:20.000
When the if-clause comes first, use a comma to separate the two clauses.

00:04:20.000 --> 00:04:25.000
When the main clause comes first, no comma is needed.

00:04:25.000 --> 00:04:30.000
Example: We will cancel the picnic if it rains. (no comma)

00:04:30.000 --> 00:04:35.000
Conditionals are essential for expressing possibility, advice, regret, and hypothetical thinking.

00:04:35.000 --> 00:04:40.000
Mastering conditionals significantly improves IELTS, TOEFL, and TOEIC scores.`,
      },
    ],
  },
  {
    topic_id: "articles",
    title: "Articles",
    files: [
      {
        filename: "articles.vtt",
        content: `WEBVTT

00:00:00.000 --> 00:00:05.000
Articles are words that define a noun as specific or unspecific.

00:00:05.000 --> 00:00:10.000
There are three articles in English: "a," "an," and "the."

00:00:10.000 --> 00:00:15.000
"A" and "an" are indefinite articles. "The" is the definite article.

00:00:15.000 --> 00:00:20.000
Use "a" before words that begin with a consonant sound.

00:00:20.000 --> 00:00:25.000
Example: a cat, a book, a university (note: "university" starts with a /j/ sound).

00:00:25.000 --> 00:00:30.000
Use "an" before words that begin with a vowel sound.

00:00:30.000 --> 00:00:35.000
Example: an apple, an hour (note: "hour" starts with a silent "h"), an umbrella.

00:00:35.000 --> 00:00:40.000
The rule is based on sound, not spelling: "a university," "an honest man."

00:00:40.000 --> 00:00:45.000
Use "a/an" when mentioning something for the first time or when it is not specific.

00:00:45.000 --> 00:00:50.000
Example: I saw a dog in the park. (any dog, not a specific one)

00:00:50.000 --> 00:00:55.000
Use "the" when the listener knows which specific thing you are referring to.

00:00:55.000 --> 00:01:00.000
Example: I saw a dog. The dog was barking loudly. (second mention = specific)

00:01:00.000 --> 00:01:05.000
Use "the" with unique nouns: the sun, the moon, the Earth, the Internet.

00:01:05.000 --> 00:01:10.000
Use "the" when there is only one of something in context: the president, the manager.

00:01:10.000 --> 00:01:15.000
Use "the" with superlatives: the best, the most beautiful, the tallest building.

00:01:15.000 --> 00:01:20.000
Use "the" with ordinal numbers: the first chapter, the second floor.

00:01:20.000 --> 00:01:25.000
Use "the" with rivers, seas, oceans, mountain ranges, and deserts.

00:01:25.000 --> 00:01:30.000
Example: the Amazon River, the Pacific Ocean, the Alps, the Sahara Desert.

00:01:30.000 --> 00:01:35.000
Use "the" with plural country names: the United States, the Philippines, the Netherlands.

00:01:35.000 --> 00:01:40.000
Use "the" with names that include "of": the Bank of England, the University of London.

00:01:40.000 --> 00:01:45.000
Do NOT use "the" with most singular country names: France, Japan, Brazil, Vietnam.

00:01:45.000 --> 00:01:50.000
Do NOT use "the" with languages: She speaks French. He studies English.

00:01:50.000 --> 00:01:55.000
Do NOT use "the" with most proper nouns: Mount Everest, Lake Victoria, Paris.

00:01:55.000 --> 00:02:00.000
Do NOT use "the" with meals: I had breakfast at 7. Let's have lunch together.

00:02:00.000 --> 00:02:05.000
Do NOT use "the" with sports: She plays tennis. They love football.

00:02:05.000 --> 00:02:10.000
Do NOT use "the" with academic subjects: He studies physics. She teaches mathematics.

00:02:10.000 --> 00:02:15.000
Zero article (no article) is used with plural and uncountable nouns to make general statements.

00:02:15.000 --> 00:02:20.000
Example: Dogs are loyal animals. (all dogs in general) Water is essential for life.

00:02:20.000 --> 00:02:25.000
Compare: The dogs in the park were friendly. (specific dogs)

00:02:25.000 --> 00:02:30.000
Use "a/an" to describe someone's job or role: She is a doctor. He is an engineer.

00:02:30.000 --> 00:02:35.000
Use "the" when referring to a specific job title: She is the director of the company.

00:02:35.000 --> 00:02:40.000
"A/an" is used in expressions of rate: twice a day, 60 km an hour.

00:02:40.000 --> 00:02:45.000
"The" is used with musical instruments: She plays the piano. He plays the guitar.

00:02:45.000 --> 00:02:50.000
"The" is used with media: listening to the radio, watching the news.

00:02:50.000 --> 00:02:55.000
Articles with adjectives: use "a/an" with singular adjective + noun: a beautiful flower.

00:02:55.000 --> 00:03:00.000
"The" is used with adjective to refer to a group: the rich, the poor, the elderly.

00:03:00.000 --> 00:03:05.000
"The" is used with nationalities as groups: the French, the Vietnamese, the Japanese.

00:03:05.000 --> 00:03:10.000
Articles can change meaning significantly: "She is in bed" (sick/sleeping) vs "She is in the bed" (physically inside it).

00:03:10.000 --> 00:03:15.000
Other examples: go to school (as a student) vs go to the school (physically go there).

00:03:15.000 --> 00:03:20.000
In prison (as a prisoner) vs at the prison (visiting location).

00:03:20.000 --> 00:03:25.000
Go to church (for worship) vs go to the church (visit the building).

00:03:25.000 --> 00:03:30.000
Abstract nouns used in general: Life is beautiful. Love is complicated.

00:03:30.000 --> 00:03:35.000
But with specificity: The life of a soldier is difficult. The love she felt was real.

00:03:35.000 --> 00:03:40.000
Articles are among the most common errors for non-native English speakers.

00:03:40.000 --> 00:03:45.000
The key question: Is the noun specific and identifiable to both speaker and listener?

00:03:45.000 --> 00:03:50.000
If yes → use "the." If new/unspecific + singular countable → use "a/an." If general plural/uncountable → use no article.

00:03:50.000 --> 00:03:55.000
Mastering articles will significantly improve your writing and speaking accuracy.`,
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
Modal verbs are followed by the base form of the verb (infinitive without "to").

00:00:15.000 --> 00:00:20.000
Example: She can swim. He must leave. They should study.

00:00:20.000 --> 00:00:25.000
Modal verbs do not add -s for third person singular: He can run. (NOT: He cans run.)

00:00:25.000 --> 00:00:30.000
Modal verbs do not use "do/does/did" in questions or negatives.

00:00:30.000 --> 00:00:35.000
Question: Can she swim? (NOT: Does she can swim?)

00:00:35.000 --> 00:00:40.000
Negative: She cannot swim. / She can't swim.

00:00:40.000 --> 00:00:45.000
"Can" expresses present ability: I can speak three languages.

00:00:45.000 --> 00:00:50.000
"Can" expresses informal permission: Can I borrow your pen?

00:00:50.000 --> 00:00:55.000
"Can" expresses possibility: Too much stress can cause health problems.

00:00:55.000 --> 00:01:00.000
"Could" expresses past ability: She could run very fast when she was young.

00:01:00.000 --> 00:01:05.000
"Could" expresses polite requests: Could you please help me?

00:01:05.000 --> 00:01:10.000
"Could" expresses present/future possibility: It could rain later today.

00:01:10.000 --> 00:01:15.000
"Could have + past participle" expresses past possibility or unrealized ability.

00:01:15.000 --> 00:01:20.000
Example: She could have been a doctor but chose to be a teacher.

00:01:20.000 --> 00:01:25.000
"May" expresses formal permission: May I come in?

00:01:25.000 --> 00:01:30.000
"May" expresses present or future possibility: It may rain tomorrow.

00:01:30.000 --> 00:01:35.000
"Might" expresses less certain possibility than "may": It might rain, but I'm not sure.

00:01:35.000 --> 00:01:40.000
"Might have + past participle" expresses past possibility or speculation.

00:01:40.000 --> 00:01:45.000
Example: She might have missed the bus. That's why she's late.

00:01:45.000 --> 00:01:50.000
"Must" expresses strong obligation or necessity: You must wear a seatbelt.

00:01:50.000 --> 00:01:55.000
"Must" expresses logical deduction (certainty): She must be tired — she's been working all day.

00:01:55.000 --> 00:02:00.000
"Must not" (mustn't) expresses prohibition: You must not smoke in this area.

00:02:00.000 --> 00:02:05.000
"Don't have to" means no obligation (not prohibition): You don't have to come if you're busy.

00:02:05.000 --> 00:02:10.000
"Must not" ≠ "don't have to": Mustn't = forbidden. Don't have to = optional.

00:02:10.000 --> 00:02:15.000
"Have to" and "need to" also express obligation, but they are not modal verbs.

00:02:15.000 --> 00:02:20.000
"Should" expresses advice or recommendation: You should see a doctor.

00:02:20.000 --> 00:02:25.000
"Should" expresses expectation: The package should arrive tomorrow.

00:02:25.000 --> 00:02:30.000
"Should have + past participle" expresses criticism or regret about the past.

00:02:30.000 --> 00:02:35.000
Example: You should have called me. I should have studied more.

00:02:35.000 --> 00:02:40.000
"Ought to" is similar to "should" but slightly more formal.

00:02:40.000 --> 00:02:45.000
Example: You ought to apologize. Children ought to respect their elders.

00:02:45.000 --> 00:02:50.000
"Shall" is used in questions to offer or suggest: Shall we dance? Shall I open the window?

00:02:50.000 --> 00:02:55.000
"Will" expresses future intention or prediction: She will graduate next year.

00:02:55.000 --> 00:03:00.000
"Will" expresses spontaneous decisions: I'll answer the phone.

00:03:00.000 --> 00:03:05.000
"Would" expresses polite requests: Would you mind helping me?

00:03:05.000 --> 00:03:10.000
"Would" is used in Second Conditional: If I had more time, I would travel.

00:03:10.000 --> 00:03:15.000
"Would" expresses past habits: When I was young, I would play outside every day.

00:03:15.000 --> 00:03:20.000
"Would have + past participle" is used in Third Conditional: I would have helped if I had known.

00:03:20.000 --> 00:03:25.000
Perfect modals express modal meaning in the past.

00:03:25.000 --> 00:03:30.000
Modal + have + past participle: could have, should have, would have, might have, must have.

00:03:30.000 --> 00:03:35.000
"Must have + past participle" expresses certainty about a past action.

00:03:35.000 --> 00:03:40.000
Example: She must have left already — her coat is gone.

00:03:40.000 --> 00:03:45.000
"Can't have + past participle" expresses impossibility about a past action.

00:03:45.000 --> 00:03:50.000
Example: He can't have stolen it — he was with me all day.

00:03:50.000 --> 00:03:55.000
Modals of deduction: must (certainty) > should (expectation) > may/might/could (possibility) > can't (impossibility).

00:03:55.000 --> 00:04:00.000
Semi-modals include: be able to, be allowed to, be supposed to, had better, used to.

00:04:00.000 --> 00:04:05.000
"Had better" gives strong advice, often with a warning: You had better leave now.

00:04:05.000 --> 00:04:10.000
"Used to" describes past habits or states that no longer exist: I used to smoke but I quit.

00:04:10.000 --> 00:04:15.000
"Be used to + gerund" means being accustomed to: I am used to waking up early.

00:04:15.000 --> 00:04:20.000
"Get used to + gerund" means becoming accustomed to: She is getting used to driving on the left.

00:04:20.000 --> 00:04:25.000
Do not confuse "used to do" (past habit) with "be used to doing" (accustomed to).

00:04:25.000 --> 00:04:30.000
Incorrect: I used to living here. Correct: I am used to living here.

00:04:30.000 --> 00:04:35.000
Modal verbs appear frequently in IELTS, TOEIC, and TOEFL grammar questions.

00:04:35.000 --> 00:04:40.000
Understanding the nuances between modals is essential for advanced English proficiency.`,
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
      // 👉 sử dụng parser của bạn
      const cleanText = parseVTT(file.content);

      // 👉 văn bản khối
      const chunks = splitIntoChunks(cleanText, 50); // 50 từ/khối cho demo

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