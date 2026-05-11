import dotenv from 'dotenv';
dotenv.config();
import { connectDB } from '../config/database.js';
import User from '../models/User.js';

await connectDB();
const students = await User.find({ role: 'student' }).select('email name studentProfile').lean();
console.log('Student users:', JSON.stringify(students, null, 2));

const all = await User.find({}).select('email name role').lean();
console.log('\nAll users:', JSON.stringify(all, null, 2));
process.exit(0);
