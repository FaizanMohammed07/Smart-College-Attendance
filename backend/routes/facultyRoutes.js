import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import {
  getMyTimetable,
  getMyStudents,
  getMyClassAttendance,
  getFacultyDashboard,
} from '../controllers/facultyController.js';

const router = express.Router();

router.use(protect, authorize('faculty', 'admin'));

router.get('/dashboard', getFacultyDashboard);
router.get('/timetable', getMyTimetable);
router.get('/students', getMyStudents);
router.get('/attendance', getMyClassAttendance);

export default router;
