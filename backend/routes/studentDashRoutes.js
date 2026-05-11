import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import {
  getStudentDashboard,
  getStudentTimetable,
  getStudentAttendance,
  getStudentSubjects,
} from '../controllers/studentDashController.js';

const router = express.Router();

router.use(protect, authorize('student', 'admin'));

router.get('/dashboard', getStudentDashboard);
router.get('/timetable', getStudentTimetable);
router.get('/attendance', getStudentAttendance);
router.get('/subjects', getStudentSubjects);

export default router;
