import express from "express";
import {
  recordEntry,
  recordExit,
  getAttendanceLogs,
  getActiveStudents,
  getAttendanceSummary,
  updateAttendance,
} from "../controllers/attendanceController.js";

const router = express.Router();

router.post("/entry", recordEntry);
router.post("/exit", recordExit);
router.get("/logs", getAttendanceLogs);
router.get("/active", getActiveStudents);
router.get("/summary/:date", getAttendanceSummary);
router.put("/:id", updateAttendance);

export default router;
