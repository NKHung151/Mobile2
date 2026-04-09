const path = require('path');
require("dotenv").config({ path: path.join(__dirname, '../../.env') });
const mongoose = require("mongoose");
const PracticeQuestion = require("../models/PracticeQuestion");
const PracticeExercise = require("../models/PracticeExercise");

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  const ex = await PracticeExercise.find();
  console.log("Exercises:", ex.length);
  const q = await PracticeQuestion.find({ exercise_id: { $exists: true } });
  console.log("Questions with exercise:", q.length);
  const qno = await PracticeQuestion.find({ exercise_id: { $exists: false } });
  console.log("Questions without exercise:", qno.length);
  process.exit(0);
}
check();
