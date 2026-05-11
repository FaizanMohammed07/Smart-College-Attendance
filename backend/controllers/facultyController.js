import Timetable from '../models/Timetable.js';
import Student from '../models/Student.js';
import Classroom from '../models/Classroom.js';
import AttendanceLog from '../models/AttendanceLog.js';

// ── FACULTY DASHBOARD CONTROLLER ──

// @desc    Get faculty timetable for today or a specific day
// @route   GET /api/faculty/timetable
export const getMyTimetable = async (req, res) => {
  try {
    const facultyProfileId = req.user.facultyProfile?._id || req.user.facultyProfile;
    if (!facultyProfileId) {
      return res.status(400).json({ success: false, message: 'Faculty profile not linked' });
    }

    const { day } = req.query;
    const filter = { faculty: facultyProfileId, isActive: true };
    if (day) {
      filter.day = day;
    }

    const entries = await Timetable.find(filter)
      .populate('subject', 'name code')
      .populate('classroom', 'name roomNumber building')
      .sort({ day: 1, startTime: 1 });

    res.json({ success: true, count: entries.length, data: entries });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching timetable', error: error.message });
  }
};

// @desc    Get students assigned to faculty's classrooms
// @route   GET /api/faculty/students
export const getMyStudents = async (req, res) => {
  try {
    const facultyProfileId = req.user.facultyProfile?._id || req.user.facultyProfile;
    if (!facultyProfileId) {
      return res.status(400).json({ success: false, message: 'Faculty profile not linked' });
    }

    const { classroomId } = req.query;

    // Get classrooms assigned to this faculty
    const timetableEntries = await Timetable.find({
      faculty: facultyProfileId,
      isActive: true,
    }).distinct('classroom');

    let studentFilter;
    if (classroomId) {
      studentFilter = { classroom: classroomId, isActive: true };
    } else {
      // Get all students from all assigned classrooms
      const classrooms = await Classroom.find({
        _id: { $in: timetableEntries },
        isActive: true,
      });
      const studentIds = classrooms.flatMap(c => c.students);
      studentFilter = { _id: { $in: studentIds }, isActive: true };
    }

    const students = await Student.find(studentFilter)
      .populate('classroom', 'name roomNumber')
      .sort({ name: 1 });

    res.json({ success: true, count: students.length, data: students });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching students', error: error.message });
  }
};

// @desc    Get today's attendance for faculty's classes
// @route   GET /api/faculty/attendance
export const getMyClassAttendance = async (req, res) => {
  try {
    const facultyProfileId = req.user.facultyProfile?._id || req.user.facultyProfile;
    if (!facultyProfileId) {
      return res.status(400).json({ success: false, message: 'Faculty profile not linked' });
    }

    const { date, classroomId } = req.query;
    const targetDate = date || new Date().toISOString().split('T')[0];

    // Get students from faculty's classrooms
    const timetableEntries = await Timetable.find({
      faculty: facultyProfileId,
      isActive: true,
    }).distinct('classroom');

    const classroomFilter = classroomId
      ? { _id: classroomId }
      : { _id: { $in: timetableEntries } };

    const classrooms = await Classroom.find({ ...classroomFilter, isActive: true });
    const studentIds = classrooms.flatMap(c => c.students);

    // Get attendance logs for these students
    const logs = await AttendanceLog.find({
      studentId: { $in: studentIds },
      date: targetDate,
    })
      .populate('studentId', 'name rollNumber department photoUrl')
      .sort({ entryTime: -1 })
      .lean();

    // Enrich active sessions with live duration
    const now = new Date();
    const enriched = logs.map(log => {
      if (log.isActive && !log.exitTime) {
        const liveMinutes = Math.floor((now - new Date(log.entryTime)) / (1000 * 60));
        let liveStatus = 'Absent';
        if (liveMinutes >= 30) liveStatus = 'Present';
        else if (liveMinutes >= 10) liveStatus = 'Partial';
        return { ...log, duration: liveMinutes, status: liveStatus };
      }
      return log;
    });

    // Students with no log today
    const loggedIds = new Set(logs.map(l => l.studentId?._id?.toString()));
    const allStudents = await Student.find({ _id: { $in: studentIds }, isActive: true })
      .select('name rollNumber department');
    const absentStudents = allStudents.filter(s => !loggedIds.has(s._id.toString()));

    res.json({
      success: true,
      date: targetDate,
      totalStudents: allStudents.length,
      presentCount: enriched.filter(l => l.status === 'Present').length,
      partialCount: enriched.filter(l => l.status === 'Partial').length,
      absentCount: absentStudents.length,
      logs: enriched,
      absentStudents,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching attendance', error: error.message });
  }
};

// @desc    Get faculty dashboard overview
// @route   GET /api/faculty/dashboard
export const getFacultyDashboard = async (req, res) => {
  try {
    const facultyProfileId = req.user.facultyProfile?._id || req.user.facultyProfile;
    if (!facultyProfileId) {
      return res.status(400).json({ success: false, message: 'Faculty profile not linked' });
    }

    const today = new Date().toISOString().split('T')[0];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const todayDay = dayNames[new Date().getDay()];

    // Today's timetable
    const todaySchedule = await Timetable.find({
      faculty: facultyProfileId,
      day: todayDay,
      isActive: true,
    })
      .populate('subject', 'name code')
      .populate('classroom', 'name roomNumber')
      .sort({ startTime: 1 });

    // Student counts from assigned classrooms
    const classroomIds = await Timetable.find({
      faculty: facultyProfileId,
      isActive: true,
    }).distinct('classroom');

    const classrooms = await Classroom.find({ _id: { $in: classroomIds }, isActive: true });
    const totalStudents = classrooms.reduce((sum, c) => sum + (c.students?.length || 0), 0);

    // Today's attendance stats
    const allStudentIds = classrooms.flatMap(c => c.students);
    const todayLogs = await AttendanceLog.find({
      studentId: { $in: allStudentIds },
      date: today,
    });

    const activeCount = todayLogs.filter(l => l.isActive).length;

    res.json({
      success: true,
      data: {
        todaySchedule,
        totalClasses: todaySchedule.length,
        totalClassrooms: classrooms.length,
        totalStudents,
        todayAttended: todayLogs.length,
        activeInClass: activeCount,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching dashboard', error: error.message });
  }
};
