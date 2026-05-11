import Notification from '../models/Notification.js';
import User from '../models/User.js';
import Student from '../models/Student.js';
import AttendanceLog from '../models/AttendanceLog.js';

// @desc    Get notifications for current user
// @route   GET /api/notifications
export const getNotifications = async (req, res) => {
  try {
    const { limit = 30, unreadOnly } = req.query;
    const filter = { recipient: req.user._id };
    if (unreadOnly === 'true') filter.isRead = false;

    const notifications = await Notification.find(filter)
      .populate('relatedStudent', 'name rollNumber department')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    const unreadCount = await Notification.countDocuments({ recipient: req.user._id, isRead: false });

    res.json({ success: true, data: notifications, unreadCount });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching notifications', error: error.message });
  }
};

// @desc    Mark notification as read
// @route   PUT /api/notifications/:id/read
export const markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user._id },
      { isRead: true },
      { new: true }
    );
    if (!notification) return res.status(404).json({ success: false, message: 'Notification not found' });
    res.json({ success: true, data: notification });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error updating notification', error: error.message });
  }
};

// @desc    Mark all as read
// @route   PUT /api/notifications/read-all
export const markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { recipient: req.user._id, isRead: false },
      { isRead: true }
    );
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error marking notifications', error: error.message });
  }
};

// ── NOTIFICATION GENERATORS (called by attendance system) ──

// Create a notification and emit via socket
export const createNotification = async (io, data) => {
  try {
    const notification = await Notification.create(data);
    const populated = await Notification.findById(notification._id)
      .populate('relatedStudent', 'name rollNumber');

    // Emit to the specific user via their userId room
    io.to(`user:${data.recipient}`).emit('notification:new', populated);

    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
  }
};

// Check and send absence notifications to parents
export const checkAbsenceNotifications = async (io) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const currentHour = new Date().getHours();

    // Only check after 3 PM (end of school day)
    if (currentHour < 15) return;

    const allStudents = await Student.find({ isActive: true });

    for (const student of allStudents) {
      const todayLog = await AttendanceLog.findOne({ studentId: student._id, date: today });

      if (!todayLog) {
        // Student was absent — notify parent
        const parentUser = await User.findOne({ childStudent: student._id, role: 'parent', isActive: true });
        if (!parentUser) continue;

        // Check if notification already sent today
        const existing = await Notification.findOne({
          recipient: parentUser._id,
          type: 'absent_alert',
          relatedStudent: student._id,
          createdAt: { $gte: new Date(today) },
        });
        if (existing) continue;

        await createNotification(io, {
          recipient: parentUser._id,
          recipientRole: 'parent',
          type: 'absent_alert',
          title: 'Absence Alert',
          message: `Your child ${student.name} (${student.rollNumber}) was absent today.`,
          relatedStudent: student._id,
          metadata: { date: today },
        });

        // Also notify the student
        const studentUser = await User.findOne({ studentProfile: student._id, role: 'student', isActive: true });
        if (studentUser) {
          await createNotification(io, {
            recipient: studentUser._id,
            recipientRole: 'student',
            type: 'absent_alert',
            title: 'Attendance Alert',
            message: `You were marked absent today. If this is an error, contact your faculty.`,
            relatedStudent: student._id,
            metadata: { date: today },
          });
        }
      }
    }
  } catch (error) {
    console.error('Error checking absence notifications:', error);
  }
};

// Check consecutive absences
export const checkConsecutiveAbsences = async (io) => {
  try {
    const allStudents = await Student.find({ isActive: true });
    const today = new Date();

    for (const student of allStudents) {
      // Check last 3 days
      let consecutiveAbsent = 0;
      for (let i = 0; i < 3; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        // Skip weekends
        if (d.getDay() === 0 || d.getDay() === 6) continue;
        const dateStr = d.toISOString().split('T')[0];
        const log = await AttendanceLog.findOne({ studentId: student._id, date: dateStr });
        if (!log) consecutiveAbsent++;
      }

      if (consecutiveAbsent >= 3) {
        const parentUser = await User.findOne({ childStudent: student._id, role: 'parent', isActive: true });
        if (!parentUser) continue;

        const existing = await Notification.findOne({
          recipient: parentUser._id,
          type: 'consecutive_absent',
          relatedStudent: student._id,
          createdAt: { $gte: new Date(today.toISOString().split('T')[0]) },
        });
        if (existing) continue;

        await createNotification(io, {
          recipient: parentUser._id,
          recipientRole: 'parent',
          type: 'consecutive_absent',
          title: '⚠️ Multiple Absences Alert',
          message: `Your child ${student.name} has been absent for ${consecutiveAbsent} consecutive days. Please contact the institution.`,
          relatedStudent: student._id,
          metadata: { consecutiveDays: consecutiveAbsent },
        });
      }
    }
  } catch (error) {
    console.error('Error checking consecutive absences:', error);
  }
};
