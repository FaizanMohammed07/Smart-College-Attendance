import mongoose from 'mongoose';

const facultySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
  },
  employeeId: {
    type: String,
    required: [true, 'Employee ID is required'],
    unique: true,
    trim: true,
    uppercase: true,
  },
  department: {
    type: String,
    required: [true, 'Department is required'],
    trim: true,
  },
  phone: {
    type: String,
    default: null,
  },
  photoUrl: {
    type: String,
    default: null,
  },
  // Subjects this faculty teaches
  subjects: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject',
  }],
  // Classrooms assigned
  classrooms: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Classroom',
  }],
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

facultySchema.index({ employeeId: 1 });
facultySchema.index({ department: 1 });

const Faculty = mongoose.model('Faculty', facultySchema);
export default Faculty;
