import mongoose from "mongoose";

const attendanceLogSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: [true, "Student ID is required"],
    },
    date: {
      type: String, // Format: YYYY-MM-DD
      required: true,
      index: true,
    },
    entryTime: {
      type: Date,
      required: true,
    },
    exitTime: {
      type: Date,
      default: null,
    },
    duration: {
      type: Number, // Duration in minutes
      default: 0,
    },
    status: {
      type: String,
      enum: ["Present", "Partial", "Absent"],
      default: "Absent",
    },
    isActive: {
      type: Boolean,
      default: true, // True if student is currently in class
    },
  },
  {
    timestamps: true,
  },
);

// Compound index for efficient queries
attendanceLogSchema.index({ studentId: 1, date: 1 });
attendanceLogSchema.index({ date: 1, status: 1 });
attendanceLogSchema.index({ isActive: 1 });

// Method to calculate and update attendance status based on duration
attendanceLogSchema.methods.updateStatus = function () {
  if (this.duration >= 30) {
    this.status = "Present";
  } else if (this.duration >= 10) {
    this.status = "Partial";
  } else {
    this.status = "Absent";
  }
  return this.status;
};

// Static method to calculate duration between entry and exit
attendanceLogSchema.statics.calculateDuration = function (entryTime, exitTime) {
  const entry = new Date(entryTime);
  const exit = new Date(exitTime);
  const durationMs = exit - entry;
  return Math.floor(durationMs / (1000 * 60)); // Convert to minutes
};

const AttendanceLog = mongoose.model("AttendanceLog", attendanceLogSchema);

export default AttendanceLog;
