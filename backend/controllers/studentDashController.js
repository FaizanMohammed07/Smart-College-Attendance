import Student from '../models/Student.js';
import AttendanceLog from '../models/AttendanceLog.js';
import Timetable from '../models/Timetable.js';
import Subject from '../models/Subject.js';
import Notification from '../models/Notification.js';

// ── STUDENT DASHBOARD CONTROLLER ──

// Helper: compute live status for active sessions
function computeLiveStatus(entryTime) {
  const now = new Date();
  const mins = Math.floor((now - new Date(entryTime)) / (1000 * 60));
  if (mins >= 30) return { status: 'Present', duration: mins };
  if (mins >= 10) return { status: 'Partial', duration: mins };
  return { status: 'Absent', duration: mins };
}

// @desc    Get student dashboard overview
// @route   GET /api/student/dashboard
export const getStudentDashboard = async (req, res) => {
  try {
    const studentProfileId = req.user.studentProfile?._id || req.user.studentProfile;
    if (!studentProfileId) {
      return res.status(400).json({ success: false, message: 'Student profile not linked' });
    }

    const student = await Student.findById(studentProfileId)
      .populate('classroom', 'name roomNumber');
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

    const today = new Date().toISOString().split('T')[0];

    // Today's attendance
    const todayLog = await AttendanceLog.findOne({ studentId: studentProfileId, date: today });

    // Overall attendance stats (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentLogs = await AttendanceLog.find({
      studentId: studentProfileId,
      createdAt: { $gte: thirtyDaysAgo },
    }).lean();

    // Calculate working days (Mon-Sat for last 30 days)
    let workingDays = 0;
    for (let d = new Date(thirtyDaysAgo); d <= new Date(); d.setDate(d.getDate() + 1)) {
      if (d.getDay() !== 0) workingDays++;
    }

    const enriched = recentLogs.map(log => {
      if (log.isActive && !log.exitTime) {
        const { status, duration } = computeLiveStatus(log.entryTime);
        return { ...log, status, duration };
      }
      return log;
    });

    const presentDays = enriched.filter(l => l.status === 'Present').length;
    const partialDays = enriched.filter(l => l.status === 'Partial').length;
    const attendancePercentage = workingDays > 0
      ? Math.round(((presentDays + partialDays * 0.5) / workingDays) * 100)
      : 0;

    // Unread notifications count
    const unreadNotifications = await Notification.countDocuments({
      recipient: req.user._id,
      isRead: false,
    });

    // Today's live status
    let todayStatus = 'Not Arrived';
    let todayDuration = 0;
    if (todayLog) {
      if (todayLog.isActive) {
        const live = computeLiveStatus(todayLog.entryTime);
        todayStatus = live.status;
        todayDuration = live.duration;
      } else {
        todayStatus = todayLog.status;
        todayDuration = todayLog.duration;
      }
    }

    res.json({
      success: true,
      data: {
        student: {
          name: student.name,
          rollNumber: student.rollNumber,
          department: student.department,
          classroom: student.classroom,
          photoUrl: student.photoUrl,
        },
        today: {
          status: todayStatus,
          duration: todayDuration,
          entryTime: todayLog?.entryTime,
          exitTime: todayLog?.exitTime,
        },
        stats: {
          attendancePercentage,
          totalPresent: presentDays,
          totalPartial: partialDays,
          totalAbsent: workingDays - presentDays - partialDays,
          workingDays,
        },
        unreadNotifications,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error loading dashboard', error: error.message });
  }
};

// @desc    Get student's timetable
// @route   GET /api/student/timetable
export const getStudentTimetable = async (req, res) => {
  try {
    const studentProfileId = req.user.studentProfile?._id || req.user.studentProfile;
    if (!studentProfileId) {
      return res.status(400).json({ success: false, message: 'Student profile not linked' });
    }

    const student = await Student.findById(studentProfileId);
    const { day } = req.query;

    const filter = { department: student.department, isActive: true };
    if (day) filter.day = day;

    // If student has a classroom, also filter by that
    if (student.classroom) {
      filter.classroom = student.classroom;
    }

    const entries = await Timetable.find(filter)
      .populate('subject', 'name code')
      .populate('faculty', 'name employeeId')
      .populate('classroom', 'name roomNumber')
      .sort({ day: 1, startTime: 1 });

    res.json({ success: true, count: entries.length, data: entries });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching timetable', error: error.message });
  }
};

// @desc    Get student's attendance history
// @route   GET /api/student/attendance
export const getStudentAttendance = async (req, res) => {
  try {
    const studentProfileId = req.user.studentProfile?._id || req.user.studentProfile;
    if (!studentProfileId) {
      return res.status(400).json({ success: false, message: 'Student profile not linked' });
    }

    const { startDate, endDate, page = 1, limit = 30 } = req.query;
    const filter = { studentId: studentProfileId };

    if (startDate) filter.date = { $gte: startDate };
    if (endDate) filter.date = { ...filter.date, $lte: endDate };

    const total = await AttendanceLog.countDocuments(filter);
    const logs = await AttendanceLog.find(filter)
      .sort({ date: -1, entryTime: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit))
      .lean();

    const enriched = logs.map(log => {
      if (log.isActive && !log.exitTime) {
        const { status, duration } = computeLiveStatus(log.entryTime);
        return { ...log, status, duration };
      }
      return log;
    });

    res.json({
      success: true,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      data: enriched,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching attendance', error: error.message });
  }
};

// @desc    Get student's subjects
// @route   GET /api/student/subjects
export const getStudentSubjects = async (req, res) => {
  try {
    const studentProfileId = req.user.studentProfile?._id || req.user.studentProfile;
    if (!studentProfileId) {
      return res.status(400).json({ success: false, message: 'Student profile not linked' });
    }

    const student = await Student.findById(studentProfileId);

    const subjects = await Subject.find({
      department: student.department,
      isActive: true,
    })
      .populate('faculty', 'name employeeId')
      .sort({ name: 1 });

    res.json({ success: true, count: subjects.length, data: subjects });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching subjects', error: error.message });
  }
};
