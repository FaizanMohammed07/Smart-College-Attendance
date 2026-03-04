import AttendanceLog from "../models/AttendanceLog.js";
import Student from "../models/Student.js";

// @desc    Record attendance entry
// @route   POST /api/attendance/entry
// @access  Public
export const recordEntry = async (req, res) => {
  try {
    const { studentId } = req.body;
    const now = new Date();
    const today = now.toISOString().split("T")[0];

    // Check if student exists
    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    // Check if student already has an active session today
    let existingLog = await AttendanceLog.findOne({
      studentId,
      date: today,
      isActive: true,
    });

    if (existingLog) {
      // Already active — just return success (idempotent)
      const populatedLog = await AttendanceLog.findById(
        existingLog._id,
      ).populate("studentId", "name rollNumber department photoUrl");

      return res.json({
        success: true,
        message: "Student already has an active attendance session",
        data: populatedLog,
      });
    }

    // Create new attendance log
    const attendanceLog = await AttendanceLog.create({
      studentId,
      date: today,
      entryTime: now,
      isActive: true,
    });

    const populatedLog = await AttendanceLog.findById(
      attendanceLog._id,
    ).populate("studentId", "name rollNumber department");

    // Emit socket event for real-time update
    const io = req.app.get("io");
    io.emit("attendance:entry", populatedLog);

    res.status(201).json({
      success: true,
      message: "Entry recorded successfully",
      data: populatedLog,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error recording entry",
      error: error.message,
    });
  }
};

// @desc    Record attendance exit
// @route   POST /api/attendance/exit
// @access  Public
export const recordExit = async (req, res) => {
  try {
    const { studentId } = req.body;
    const now = new Date();
    const today = now.toISOString().split("T")[0];

    // Find active attendance log for today
    const attendanceLog = await AttendanceLog.findOne({
      studentId,
      date: today,
      isActive: true,
    });

    if (!attendanceLog) {
      return res.status(404).json({
        success: false,
        message: "No active attendance session found for this student today",
      });
    }

    // Update exit time and calculate duration
    attendanceLog.exitTime = now;
    attendanceLog.duration = AttendanceLog.calculateDuration(
      attendanceLog.entryTime,
      now,
    );
    attendanceLog.updateStatus();
    attendanceLog.isActive = false;

    await attendanceLog.save();

    const populatedLog = await AttendanceLog.findById(
      attendanceLog._id,
    ).populate("studentId", "name rollNumber department photoUrl");

    // Emit socket event for real-time update
    const io = req.app.get("io");
    io.emit("attendance:exit", populatedLog);

    res.json({
      success: true,
      message: "Exit recorded successfully",
      data: populatedLog,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error recording exit",
      error: error.message,
    });
  }
};

// @desc    Get attendance logs
// @route   GET /api/attendance/logs
// @access  Public
export const getAttendanceLogs = async (req, res) => {
  try {
    const { date, studentId, status, page = 1, limit = 50 } = req.query;
    const filter = {};

    if (date) filter.date = date;
    if (studentId) filter.studentId = studentId;
    // NOTE: status filter is applied AFTER enrichment (active sessions have stale DB status)

    const logs = await AttendanceLog.find(filter)
      .populate("studentId", "name rollNumber department photoUrl")
      .sort({ entryTime: -1 })
      .lean();

    // For active sessions, compute live duration & status on the fly
    const now = new Date();
    const enrichedLogs = logs.map((log) => {
      if (log.isActive && !log.exitTime) {
        const liveMinutes = Math.floor(
          (now - new Date(log.entryTime)) / (1000 * 60),
        );
        let liveStatus = "Absent";
        if (liveMinutes >= 30) liveStatus = "Present";
        else if (liveMinutes >= 10) liveStatus = "Partial";
        return { ...log, duration: liveMinutes, status: liveStatus };
      }
      return log;
    });

    // Apply status filter after enrichment so active sessions match correctly
    const filteredLogs = status
      ? enrichedLogs.filter((log) => log.status === status)
      : enrichedLogs;

    // Paginate
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const pagedLogs = filteredLogs.slice(skip, skip + parseInt(limit));

    res.json({
      success: true,
      count: pagedLogs.length,
      total: filteredLogs.length,
      page: parseInt(page),
      pages: Math.ceil(filteredLogs.length / parseInt(limit)),
      data: pagedLogs,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching attendance logs",
      error: error.message,
    });
  }
};

// @desc    Get today's active students
// @route   GET /api/attendance/active
// @access  Public
export const getActiveStudents = async (req, res) => {
  try {
    const today = new Date().toISOString().split("T")[0];

    const activeLogs = await AttendanceLog.find({
      date: today,
      isActive: true,
    })
      .populate("studentId", "name rollNumber department photoUrl")
      .sort({ entryTime: -1 })
      .lean();

    res.json({
      success: true,
      count: activeLogs.length,
      data: activeLogs,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching active students",
      error: error.message,
    });
  }
};

// @desc    Get attendance summary for a specific date
// @route   GET /api/attendance/summary/:date
// @access  Public
export const getAttendanceSummary = async (req, res) => {
  try {
    const { date } = req.params;

    const logs = await AttendanceLog.find({ date }).populate(
      "studentId",
      "name rollNumber department photoUrl",
    );

    const totalStudents = await Student.countDocuments({ isActive: true });

    const summary = {
      date,
      totalStudents,
      present: logs.filter((log) => log.status === "Present").length,
      partial: logs.filter((log) => log.status === "Partial").length,
      absent: totalStudents - logs.length,
      logs: logs,
    };

    res.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching attendance summary",
      error: error.message,
    });
  }
};

// @desc    Update attendance status manually
// @route   PUT /api/attendance/:id
// @access  Public
export const updateAttendance = async (req, res) => {
  try {
    const { exitTime, status } = req.body;

    const attendanceLog = await AttendanceLog.findById(req.params.id);

    if (!attendanceLog) {
      return res.status(404).json({
        success: false,
        message: "Attendance log not found",
      });
    }

    if (exitTime) {
      attendanceLog.exitTime = new Date(exitTime);
      attendanceLog.duration = AttendanceLog.calculateDuration(
        attendanceLog.entryTime,
        attendanceLog.exitTime,
      );
      attendanceLog.updateStatus();
      attendanceLog.isActive = false;
    }

    if (status && ["Present", "Partial", "Absent"].includes(status)) {
      attendanceLog.status = status;
    }

    await attendanceLog.save();

    const populatedLog = await AttendanceLog.findById(
      attendanceLog._id,
    ).populate("studentId", "name rollNumber department photoUrl");

    res.json({
      success: true,
      message: "Attendance updated successfully",
      data: populatedLog,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating attendance",
      error: error.message,
    });
  }
};
