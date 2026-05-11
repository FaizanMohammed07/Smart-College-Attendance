import dotenv from 'dotenv';
dotenv.config();
import { connectDB } from '../config/database.js';
import User from '../models/User.js';
import Student from '../models/Student.js';

await connectDB();

// Find all students
const students = await Student.find({}).lean();
let created = 0;

for (const s of students) {
  const email = `${s.rollNumber.toLowerCase()}@college.edu`;
  const password = `${s.rollNumber.toLowerCase()}123`;

  // Check if student user already exists
  let studentUser = await User.findOne({ email });
  if (!studentUser) {
    studentUser = await User.create({
      name: s.name,
      email,
      password,
      role: 'student',
      studentProfile: s._id,
    });
    console.log(`✅ Created student user: ${email} / ${password}`);
    created++;
  }

  // Link student → user if not linked
  if (!s.parentUser && s.parentPhone) {
    const parentEmail = `parent.${s.parentPhone}@college.edu`;
    let parentUser = await User.findOne({ email: parentEmail });
    if (!parentUser) {
      parentUser = await User.create({
        name: `Parent of ${s.name}`,
        email: parentEmail,
        password: s.parentPhone,
        role: 'parent',
        childStudent: s._id,
      });
      console.log(`✅ Created parent user: ${parentEmail} / ${s.parentPhone}`);
      created++;
    }
    // Link parent to student
    await Student.findByIdAndUpdate(s._id, { parentUser: parentUser._id });
  }
}

if (created === 0) {
  console.log('All students already have user accounts.');
} else {
  console.log(`\n🎉 Created ${created} missing user accounts.`);
}

process.exit(0);
