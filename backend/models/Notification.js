import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  // Who receives this notification
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  recipientRole: {
    type: String,
    enum: ['admin', 'faculty', 'student', 'parent'],
    required: true,
  },
  type: {
    type: String,
    enum: [
      'absent_alert',
      'late_entry',
      'early_exit',
      'low_attendance',
      'consecutive_absent',
      'system',
      'general',
    ],
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  // Related student (for parent/student notifications)
  relatedStudent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    default: null,
  },
  // Metadata for the notification
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  isRead: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
});

notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ recipientRole: 1 });

const Notification = mongoose.model('Notification', notificationSchema);
export default Notification;
