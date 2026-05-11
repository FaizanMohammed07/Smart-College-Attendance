import mongoose from 'mongoose';

const classroomSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Classroom name is required'],
    trim: true,
  },
  roomNumber: {
    type: String,
    required: [true, 'Room number is required'],
    unique: true,
    trim: true,
  },
  building: {
    type: String,
    default: '',
    trim: true,
  },
  capacity: {
    type: Number,
    default: 60,
  },
  department: {
    type: String,
    default: '',
    trim: true,
  },
  // Students assigned to this classroom
  students: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
  }],
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

classroomSchema.index({ roomNumber: 1 });

const Classroom = mongoose.model('Classroom', classroomSchema);
export default Classroom;
