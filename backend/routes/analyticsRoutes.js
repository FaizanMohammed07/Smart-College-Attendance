import express from "express";
import {
  getDashboardStats,
  getAttendanceTrends,
  getDepartmentStats,
  getStudentHistory,
  getStudentsSummary,
} from "../controllers/analyticsController.js";

const router = express.Router();

router.get("/dashboard", getDashboardStats);
router.get("/trends", getAttendanceTrends);
router.get("/departments", getDepartmentStats);
router.get("/students-summary", getStudentsSummary);
router.get("/student/:studentId", getStudentHistory);

export default router;
