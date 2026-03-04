import AttendanceLog from "../models/AttendanceLog.js";
import Student from "../models/Student.js";

// Helper: compute live status for an attendance log
function computeLiveStatus(log) {
  if (log.exitTime && log.duration !== undefined) {
    // Closed session — use stored values
    return { duration: log.duration, status: log.status };
  }
  // Active session — compute from now
  const minutes = Math.floor(
    (Date.now() - new Date(log.entryTime).getTime()) / 60000,
  );
  let status = "Absent";
  if (minutes >= 30) status = "Present";
  else if (minutes >= 10) status = "Partial";
  return { duration: minutes, status };
}

// @desc    Get dashboard statistics (enhanced)
// @route   GET /api/analytics/dashboard
// @access  Public
export const getDashboardStats = async (req, res) => {
  try {
    const today = new Date().toISOString().split("T")[0];

    const totalStudents = await Student.countDocuments({ isActive: true });
    const todayLogs = await AttendanceLog.find({ date: today }).populate(
      "studentId",
      "name rollNumber department photoUrl",
    );

    // Compute live statuses
    const enriched = todayLogs.map((log) => {
      const live = computeLiveStatus(log);
      return {
        ...log.toObject(),
        duration: live.duration,
        status: live.status,
      };
    });

    const presentCount = enriched.filter((l) => l.status === "Present").length;
    const partialCount = enriched.filter((l) => l.status === "Partial").length;
    const absentCount = enriched.filter((l) => l.status === "Absent").length;
    const activeCount = enriched.filter((l) => l.isActive).length;

    const attendancePercentage =
      totalStudents > 0
        ? Math.round(((presentCount + partialCount) / totalStudents) * 100)
        : 0;

    // Recent activity (last 10 entries/exits)
    const recentActivity = enriched
      .sort((a, b) => new Date(b.entryTime) - new Date(a.entryTime))
      .slice(0, 10)
      .map((l) => ({
        _id: l._id,
        student: l.studentId,
        entryTime: l.entryTime,
        exitTime: l.exitTime,
        duration: l.duration,
        status: l.status,
        isActive: l.isActive,
      }));

    // Department breakdown for today
    const deptMap = {};
    enriched.forEach((l) => {
      const dept = l.studentId?.department || "Unknown";
      if (!deptMap[dept])
        deptMap[dept] = { present: 0, partial: 0, absent: 0, total: 0 };
      deptMap[dept].total++;
      if (l.status === "Present") deptMap[dept].present++;
      else if (l.status === "Partial") deptMap[dept].partial++;
      else deptMap[dept].absent++;
    });
    const departmentBreakdown = Object.entries(deptMap).map(([dept, d]) => ({
      department: dept,
      ...d,
    }));

    // Students not yet appeared today
    const appearedIds = todayLogs.map((l) => l.studentId?._id?.toString());
    const notAppeared = await Student.find({
      isActive: true,
      _id: { $nin: appearedIds },
    })
      .select("name rollNumber department photoUrl")
      .lean();

    // Average duration today (only closed sessions)
    const closedLogs = enriched.filter((l) => !l.isActive && l.duration > 0);
    const avgDuration =
      closedLogs.length > 0
        ? Math.round(
            closedLogs.reduce((sum, l) => sum + l.duration, 0) /
              closedLogs.length,
          )
        : 0;

    res.json({
      success: true,
      data: {
        totalStudents,
        studentsPresent: presentCount,
        studentsPartial: partialCount,
        studentsAbsent: absentCount,
        studentsActive: activeCount,
        studentsNotAppeared: notAppeared.length,
        attendancePercentage,
        avgDuration,
        recentActivity,
        departmentBreakdown,
        notAppeared: notAppeared.slice(0, 20),
        date: today,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching dashboard statistics",
      error: error.message,
    });
  }
};

// @desc    Get attendance trends
// @route   GET /api/analytics/trends
// @access  Public
export const getAttendanceTrends = async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const totalStudents = await Student.countDocuments({ isActive: true });
    const trends = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];

      const logs = await AttendanceLog.find({ date: dateStr });

      // Compute live status for today's logs
      const enriched = logs.map((log) => {
        const live = computeLiveStatus(log);
        return {
          ...log.toObject(),
          duration: live.duration,
          status: live.status,
        };
      });

      const present = enriched.filter((l) => l.status === "Present").length;
      const partial = enriched.filter((l) => l.status === "Partial").length;
      const absent = enriched.filter((l) => l.status === "Absent").length;

      trends.push({
        date: dateStr,
        present,
        partial,
        absent,
        appeared: logs.length,
        total: totalStudents,
        percentage:
          totalStudents > 0
            ? Math.round(((present + partial) / totalStudents) * 100)
            : 0,
      });
    }

    res.json({ success: true, data: trends });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching attendance trends",
      error: error.message,
    });
  }
};

// @desc    Get department-wise statistics
// @route   GET /api/analytics/departments
// @access  Public
export const getDepartmentStats = async (req, res) => {
  try {
    const today = new Date().toISOString().split("T")[0];
    const departments = await Student.distinct("department", {
      isActive: true,
    });
    const stats = [];

    for (const department of departments) {
      const students = await Student.find({ department, isActive: true });
      const studentIds = students.map((s) => s._id);

      const logs = await AttendanceLog.find({
        date: today,
        studentId: { $in: studentIds },
      });

      const enriched = logs.map((log) => {
        const live = computeLiveStatus(log);
        return {
          ...log.toObject(),
          duration: live.duration,
          status: live.status,
        };
      });

      const present = enriched.filter((l) => l.status === "Present").length;
      const partial = enriched.filter((l) => l.status === "Partial").length;

      stats.push({
        department,
        totalStudents: students.length,
        present,
        partial,
        appeared: logs.length,
        percentage:
          students.length > 0
            ? Math.round(((present + partial) / students.length) * 100)
            : 0,
      });
    }

    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching department statistics",
      error: error.message,
    });
  }
};

// @desc    Get student attendance history
// @route   GET /api/analytics/student/:studentId
// @access  Public
export const getStudentHistory = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { startDate, endDate, limit = 30 } = req.query;

    const student = await Student.findById(studentId)
      .select("name rollNumber department photoUrl")
      .lean();
    if (!student) {
      return res
        .status(404)
        .json({ success: false, message: "Student not found" });
    }

    const filter = { studentId };
    if (startDate && endDate) {
      filter.date = { $gte: startDate, $lte: endDate };
    }

    const history = await AttendanceLog.find(filter)
      .sort({ date: -1 })
      .limit(parseInt(limit))
      .lean();

    const enriched = history.map((log) => {
      const live = computeLiveStatus(log);
      return { ...log, duration: live.duration, status: live.status };
    });

    const totalDays = enriched.length;
    const presentDays = enriched.filter((l) => l.status === "Present").length;
    const partialDays = enriched.filter((l) => l.status === "Partial").length;
    const absentDays = enriched.filter((l) => l.status === "Absent").length;
    const avgDuration =
      totalDays > 0
        ? Math.round(
            enriched.reduce((sum, l) => sum + l.duration, 0) / totalDays,
          )
        : 0;
    const attendancePercentage =
      totalDays > 0
        ? Math.round(((presentDays + partialDays) / totalDays) * 100)
        : 0;

    res.json({
      success: true,
      data: {
        student,
        totalDays,
        presentDays,
        partialDays,
        absentDays,
        avgDuration,
        attendancePercentage,
        history: enriched,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching student history",
      error: error.message,
    });
  }
};

// @desc    Get all students with attendance summary
// @route   GET /api/analytics/students-summary
// @access  Public
export const getStudentsSummary = async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));
    const startStr = startDate.toISOString().split("T")[0];

    const students = await Student.find({ isActive: true }).lean();

    const summaries = await Promise.all(
      students.map(async (student) => {
        const logs = await AttendanceLog.find({
          studentId: student._id,
          date: { $gte: startStr },
        }).lean();

        const enriched = logs.map((log) => {
          const live = computeLiveStatus(log);
          return { ...log, duration: live.duration, status: live.status };
        });

        const totalDays = enriched.length;
        const presentDays = enriched.filter(
          (l) => l.status === "Present",
        ).length;
        const partialDays = enriched.filter(
          (l) => l.status === "Partial",
        ).length;
        const percentage =
          totalDays > 0
            ? Math.round(((presentDays + partialDays) / totalDays) * 100)
            : 0;

        return {
          _id: student._id,
          name: student.name,
          rollNumber: student.rollNumber,
          department: student.department,
          photoUrl: student.photoUrl,
          totalDays,
          presentDays,
          partialDays,
          absentDays: totalDays - presentDays - partialDays,
          percentage,
        };
      }),
    );

    // Sort by percentage descending
    summaries.sort((a, b) => b.percentage - a.percentage);

    res.json({ success: true, data: summaries });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching students summary",
      error: error.message,
    });
  }
};
