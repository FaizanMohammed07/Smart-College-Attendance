import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import User from "../models/User.js";
import Student from "../models/Student.js";
import { connectDB } from "../config/database.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const seedUsers = async () => {
  try {
    await connectDB();

    // Find seeded students
    const students = await Student.find({});
    if (students.length === 0) {
      console.log("❌ No students found. Run seed.js first.");
      process.exit(1);
    }

    const usersToCreate = [];

    // Create a student user for each student
    for (const s of students) {
      const email = `${s.rollNumber.toLowerCase()}@college.edu`;
      const existing = await User.findOne({ email });
      if (!existing) {
        usersToCreate.push({
          name: s.name,
          email,
          password: "student123",
          role: "student",
          studentProfile: s._id,
        });
      }
    }

    // Also create a parent user linked to the first student
    const parentEmail = "parent@college.edu";
    const existingParent = await User.findOne({ email: parentEmail });
    if (!existingParent) {
      usersToCreate.push({
        name: `Parent of ${students[0].name}`,
        email: parentEmail,
        password: "parent123",
        role: "parent",
        childStudent: students[0]._id,
      });
    }

    if (usersToCreate.length === 0) {
      console.log("All users already exist.");
      process.exit(0);
    }

    // Insert one by one so bcrypt pre-save hook fires
    for (const u of usersToCreate) {
      await User.create(u);
      console.log(`✅ Created ${u.role}: ${u.email} / ${u.password}`);
    }

    console.log("\n🎉 All user accounts seeded!");
    process.exit(0);
  } catch (error) {
    console.error("Error seeding users:", error);
    process.exit(1);
  }
};

seedUsers();
