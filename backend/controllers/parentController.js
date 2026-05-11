import Student from '../models/Student.js';
import AttendanceLog from '../models/AttendanceLog.js';
import Notification from '../models/Notification.js';

// ── PARENT DASHBOARD CONTROLLER ──

function computeLiveStatus(entryTime) {
  const now = new Date();
  const mins = Math.floor((now - new Date(entryTime)) / (1000 * 60));
  if (mins >= 30) return { status: 'Present', duration: mins };
  if (mins >= 10) return { status: 'Partial', duration: mins };
  return { status: 'Absent', duration: mins };
}

// @desc    Get parent dashboard with child's data
// @route   GET /api/parent/dashboard
export const getParentDashboard = async (req, res) => {
  try {
    const childId = req.user.childStudent?._id || req.user.childStudent;
    if (!childId) {
      return res.status(400).json({ success: false, message: 'No child linked to this account' });
    }

    const student = await Student.findById(childId)
      .populate('classroom', 'name roomNumber');
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

    const today = new Date().toISOString().split('T')[0];
    const todayLog = await AttendanceLog.findOne({ studentId: childId, date: today });

    // Last 30 days stats
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentLogs = await AttendanceLog.find({
      studentId: childId,
      createdAt: { $gte: thirtyDaysAgo },
    }).lean();

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

    const unreadNotifications = await Notification.countDocuments({
      recipient: req.user._id,
      isRead: false,
    });

    res.json({
      success: true,
      data: {
        child: {
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
          isActive: todayLog?.isActive || false,
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

// @desc    Get child's attendance history
// @route   GET /api/parent/attendance
export const getChildAttendance = async (req, res) => {
  try {
    const childId = req.user.childStudent?._id || req.user.childStudent;
    if (!childId) {
      return res.status(400).json({ success: false, message: 'No child linked' });
    }

    const { startDate, endDate, page = 1, limit = 30 } = req.query;
    const filter = { studentId: childId };
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

// @desc    Get attendance trends for chart
// @route   GET /api/parent/trends
export const getChildTrends = async (req, res) => {
  try {
    const childId = req.user.childStudent?._id || req.user.childStudent;
    if (!childId) {
      return res.status(400).json({ success: false, message: 'No child linked' });
    }

    const { days = 14 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const logs = await AttendanceLog.find({
      studentId: childId,
      createdAt: { $gte: startDate },
    }).lean();

    // Group by date
    const byDate = {};
    logs.forEach(log => {
      const enrichedLog = log.isActive && !log.exitTime
        ? { ...log, ...computeLiveStatus(log.entryTime) }
        : log;

      if (!byDate[log.date]) {
        byDate[log.date] = { date: log.date, status: enrichedLog.status, duration: enrichedLog.duration || 0 };
      }
    });

    const trends = Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date));

    res.json({ success: true, data: trends });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching trends', error: error.message });
  }
};
