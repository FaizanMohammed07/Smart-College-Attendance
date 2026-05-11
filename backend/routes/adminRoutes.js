import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import {
  createUser, getUsers, updateUser, deleteUser,
  createFaculty, getAllFaculty, updateFaculty,
  createClassroom, getAllClassrooms, updateClassroom, deleteClassroom,
  createSubject, getAllSubjects, updateSubject, deleteSubject,
  createTimetableEntry, getTimetable, updateTimetableEntry, deleteTimetableEntry,
  linkStudentToParent, assignStudentsToClassroom,
  getSystemOverview,
} from '../controllers/adminController.js';

const router = express.Router();

// All admin routes require auth + admin role
router.use(protect, authorize('admin'));

// User management
router.route('/users').get(getUsers).post(createUser);
router.route('/users/:id').put(updateUser).delete(deleteUser);

// Faculty management
router.route('/faculty').get(getAllFaculty).post(createFaculty);
router.route('/faculty/:id').put(updateFaculty);

// Classroom management
router.route('/classrooms').get(getAllClassrooms).post(createClassroom);
router.route('/classrooms/:id').put(updateClassroom).delete(deleteClassroom);

// Subject management
router.route('/subjects').get(getAllSubjects).post(createSubject);
router.route('/subjects/:id').put(updateSubject).delete(deleteSubject);

// Timetable
router.route('/timetable').get(getTimetable).post(createTimetableEntry);
router.route('/timetable/:id').put(updateTimetableEntry).delete(deleteTimetableEntry);

// Linking
router.post('/link-parent', linkStudentToParent);
router.post('/assign-classroom', assignStudentsToClassroom);

// Overview
router.get('/overview', getSystemOverview);

export default router;
