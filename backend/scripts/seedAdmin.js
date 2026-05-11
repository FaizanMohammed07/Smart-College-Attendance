import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "../models/User.js";
import { connectDB } from "../config/database.js";

dotenv.config();

const seedAdmin = async () => {
  try {
    await connectDB();

    const existing = await User.findOne({ email: "admin@college.edu" });
    if (existing) {
      console.log("Admin user already exists:", existing.email);
      process.exit(0);
    }

    const admin = await User.create({
      name: "System Admin",
      email: "admin@college.edu",
      password: "admin123",
      role: "admin",
    });

    console.log("✅ Admin user created successfully");
    console.log("   Email:    admin@college.edu");
    console.log("   Password:   ");
    console.log("   Role:     admin");
    console.log("   ID:       " + admin._id);
    console.log("\n⚠️  Change the default password after first login!");

    process.exit(0);
  } catch (error) {
    console.error("Error seeding admin:", error.message);
    process.exit(1);
  }
};

seedAdmin();
