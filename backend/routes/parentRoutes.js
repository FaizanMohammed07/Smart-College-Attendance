import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import {
  getParentDashboard,
  getChildAttendance,
  getChildTrends,
} from '../controllers/parentController.js';

const router = express.Router();

router.use(protect, authorize('parent', 'admin'));

router.get('/dashboard', getParentDashboard);
router.get('/attendance', getChildAttendance);
router.get('/trends', getChildTrends);

export default router;
