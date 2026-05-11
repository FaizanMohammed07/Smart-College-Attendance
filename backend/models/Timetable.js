import mongoose from 'mongoose';

const timetableEntrySchema = new mongoose.Schema({
  day: {
    type: String,
    enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    required: true,
  },
  startTime: {
    type: String, // "09:00"
    required: true,
  },
  endTime: {
    type: String, // "10:00"
    required: true,
  },
  subject: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject',
    required: true,
  },
  faculty: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Faculty',
    required: true,
  },
  classroom: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Classroom',
    required: true,
  },
  // Which students group / department / section this applies to
  department: {
    type: String,
    required: true,
    trim: true,
  },
  semester: {
    type: Number,
    default: 1,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

timetableEntrySchema.index({ day: 1, faculty: 1 });
timetableEntrySchema.index({ day: 1, classroom: 1 });
timetableEntrySchema.index({ department: 1, semester: 1 });

const Timetable = mongoose.model('Timetable', timetableEntrySchema);
export default Timetable;
