import mongoose from "mongoose";
import dotenv from "dotenv";
import Student from "../models/Student.js";
import { connectDB } from "../config/database.js";

dotenv.config();

const sampleStudents = [
  {
    name: "John Doe",
    rollNumber: "CS001",
    department: "Computer Science",
    parentPhone: "9876543210",
  },
  {
    name: "Jane Smith",
    rollNumber: "CS002",
    department: "Computer Science",
    parentPhone: "9876543211",
  },
  {
    name: "Bob Johnson",
    rollNumber: "EE001",
    department: "Electrical Engineering",
    parentPhone: "9876543212",
  },
  {
    name: "Alice Williams",
    rollNumber: "ME001",
    department: "Mechanical Engineering",
    parentPhone: "9876543213",
  },
  {
    name: "Charlie Brown",
    rollNumber: "CS003",
    department: "Computer Science",
    parentPhone: "9876543214",
  },
];

const seedDatabase = async () => {
  try {
    await connectDB();

    // Clear existing students
    await Student.deleteMany({});
    console.log("Cleared existing students");

    // Insert sample students
    const students = await Student.insertMany(sampleStudents);
    console.log(`Inserted ${students.length} students`);

    console.log("Database seeded successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Error seeding database:", error);
    process.exit(1);
  }
};

seedDatabase();
