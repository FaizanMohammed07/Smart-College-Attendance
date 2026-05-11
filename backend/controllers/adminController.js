import User from '../models/User.js';
import Student from '../models/Student.js';
import Faculty from '../models/Faculty.js';
import Classroom from '../models/Classroom.js';
import Subject from '../models/Subject.js';
import Timetable from '../models/Timetable.js';
import Notification from '../models/Notification.js';

// ── USER MANAGEMENT ──

// @desc    Create a new user (admin only)
// @route   POST /api/admin/users
export const createUser = async (req, res) => {
  try {
    const { name, email, password, role, studentId, facultyId, childStudentId } = req.body;

    // Check duplicate email
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    const userData = { name, email, password, role };

    // Link profile based on role
    if (role === 'student' && studentId) {
      userData.studentProfile = studentId;
    }
    if (role === 'faculty' && facultyId) {
      userData.facultyProfile = facultyId;
    }
    if (role === 'parent' && childStudentId) {
      userData.childStudent = childStudentId;
    }

    const user = await User.create(userData);

    res.status(201).json({
      success: true,
      message: `${role} account created successfully`,
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error creating user', error: error.message });
  }
};

// @desc    Get all users
// @route   GET /api/admin/users
export const getUsers = async (req, res) => {
  try {
    const { role } = req.query;
    const filter = {};
    if (role) filter.role = role;

    const users = await User.find(filter)
      .select('-password')
      .populate('facultyProfile', 'name employeeId department')
      .populate('studentProfile', 'name rollNumber department')
      .populate('childStudent', 'name rollNumber department')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: users.length, data: users });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching users', error: error.message });
  }
};

// @desc    Update user
// @route   PUT /api/admin/users/:id
export const updateUser = async (req, res) => {
  try {
    const { name, email, role, isActive, password, studentId, facultyId, childStudentId } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    if (name) user.name = name;
    if (email) user.email = email;
    if (role) user.role = role;
    if (isActive !== undefined) user.isActive = isActive;
    if (password) user.password = password;
    if (studentId) user.studentProfile = studentId;
    if (facultyId) user.facultyProfile = facultyId;
    if (childStudentId) user.childStudent = childStudentId;

    await user.save();
    res.json({ success: true, message: 'User updated', data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error updating user', error: error.message });
  }
};

// @desc    Delete user
// @route   DELETE /api/admin/users/:id
export const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (user.role === 'admin') return res.status(400).json({ success: false, message: 'Cannot delete admin' });
    await user.deleteOne();
    res.json({ success: true, message: 'User deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error deleting user', error: error.message });
  }
};

// ── FACULTY MANAGEMENT ──

// @desc    Create faculty profile
// @route   POST /api/admin/faculty
export const createFaculty = async (req, res) => {
  try {
    const { name, employeeId, department, phone, subjects, classrooms } = req.body;

    const existing = await Faculty.findOne({ employeeId: employeeId.toUpperCase() });
    if (existing) return res.status(400).json({ success: false, message: 'Employee ID already exists' });

    const faculty = await Faculty.create({
      name,
      employeeId: employeeId.toUpperCase(),
      department,
      phone,
      subjects: subjects || [],
      classrooms: classrooms || [],
    });

    res.status(201).json({ success: true, message: 'Faculty created', data: faculty });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error creating faculty', error: error.message });
  }
};

// @desc    Get all faculty
// @route   GET /api/admin/faculty
export const getAllFaculty = async (req, res) => {
  try {
    const faculty = await Faculty.find({ isActive: true })
      .populate('subjects', 'name code')
      .populate('classrooms', 'name roomNumber')
      .sort({ createdAt: -1 });
    res.json({ success: true, count: faculty.length, data: faculty });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching faculty', error: error.message });
  }
};

// @desc    Update faculty
// @route   PUT /api/admin/faculty/:id
export const updateFaculty = async (req, res) => {
  try {
    const faculty = await Faculty.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
      .populate('subjects', 'name code')
      .populate('classrooms', 'name roomNumber');
    if (!faculty) return res.status(404).json({ success: false, message: 'Faculty not found' });
    res.json({ success: true, data: faculty });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error updating faculty', error: error.message });
  }
};

// ── CLASSROOM MANAGEMENT ──

// @desc    Create classroom
// @route   POST /api/admin/classrooms
export const createClassroom = async (req, res) => {
  try {
    const classroom = await Classroom.create(req.body);
    res.status(201).json({ success: true, message: 'Classroom created', data: classroom });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error creating classroom', error: error.message });
  }
};

// @desc    Get all classrooms
// @route   GET /api/admin/classrooms
export const getAllClassrooms = async (req, res) => {
  try {
    const classrooms = await Classroom.find({ isActive: true })
      .populate('students', 'name rollNumber department')
      .sort({ createdAt: -1 });
    res.json({ success: true, count: classrooms.length, data: classrooms });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching classrooms', error: error.message });
  }
};

// @desc    Update classroom
// @route   PUT /api/admin/classrooms/:id
export const updateClassroom = async (req, res) => {
  try {
    const classroom = await Classroom.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!classroom) return res.status(404).json({ success: false, message: 'Classroom not found' });
    res.json({ success: true, data: classroom });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error updating classroom', error: error.message });
  }
};

// @desc    Delete classroom
// @route   DELETE /api/admin/classrooms/:id
export const deleteClassroom = async (req, res) => {
  try {
    await Classroom.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Classroom deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error deleting classroom', error: error.message });
  }
};

// ── SUBJECT MANAGEMENT ──

// @desc    Create subject
// @route   POST /api/admin/subjects
export const createSubject = async (req, res) => {
  try {
    const subject = await Subject.create(req.body);
    // If faculty is assigned, add to faculty's subjects array
    if (req.body.faculty) {
      await Faculty.findByIdAndUpdate(req.body.faculty, { $addToSet: { subjects: subject._id } });
    }
    res.status(201).json({ success: true, message: 'Subject created', data: subject });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error creating subject', error: error.message });
  }
};

// @desc    Get all subjects
// @route   GET /api/admin/subjects
export const getAllSubjects = async (req, res) => {
  try {
    const { department } = req.query;
    const filter = { isActive: true };
    if (department) filter.department = department;

    const subjects = await Subject.find(filter)
      .populate('faculty', 'name employeeId department')
      .sort({ department: 1, name: 1 });
    res.json({ success: true, count: subjects.length, data: subjects });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching subjects', error: error.message });
  }
};

// @desc    Update subject
// @route   PUT /api/admin/subjects/:id
export const updateSubject = async (req, res) => {
  try {
    const subject = await Subject.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
      .populate('faculty', 'name employeeId');
    if (!subject) return res.status(404).json({ success: false, message: 'Subject not found' });
    res.json({ success: true, data: subject });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error updating subject', error: error.message });
  }
};

// @desc    Delete subject
// @route   DELETE /api/admin/subjects/:id
export const deleteSubject = async (req, res) => {
  try {
    await Subject.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Subject deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error deleting subject', error: error.message });
  }
};

// ── TIMETABLE MANAGEMENT ──

// @desc    Create timetable entry
// @route   POST /api/admin/timetable
export const createTimetableEntry = async (req, res) => {
  try {
    const entry = await Timetable.create(req.body);
    const populated = await Timetable.findById(entry._id)
      .populate('subject', 'name code')
      .populate('faculty', 'name employeeId')
      .populate('classroom', 'name roomNumber');
    res.status(201).json({ success: true, message: 'Timetable entry created', data: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error creating timetable entry', error: error.message });
  }
};

// @desc    Get timetable (with filters)
// @route   GET /api/admin/timetable
export const getTimetable = async (req, res) => {
  try {
    const { day, faculty, department, classroom } = req.query;
    const filter = { isActive: true };
    if (day) filter.day = day;
    if (faculty) filter.faculty = faculty;
    if (department) filter.department = department;
    if (classroom) filter.classroom = classroom;

    const entries = await Timetable.find(filter)
      .populate('subject', 'name code')
      .populate('faculty', 'name employeeId department')
      .populate('classroom', 'name roomNumber')
      .sort({ day: 1, startTime: 1 });

    res.json({ success: true, count: entries.length, data: entries });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching timetable', error: error.message });
  }
};

// @desc    Update timetable entry
// @route   PUT /api/admin/timetable/:id
export const updateTimetableEntry = async (req, res) => {
  try {
    const entry = await Timetable.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
      .populate('subject', 'name code')
      .populate('faculty', 'name employeeId')
      .populate('classroom', 'name roomNumber');
    if (!entry) return res.status(404).json({ success: false, message: 'Entry not found' });
    res.json({ success: true, data: entry });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error updating timetable entry', error: error.message });
  }
};

// @desc    Delete timetable entry
// @route   DELETE /api/admin/timetable/:id
export const deleteTimetableEntry = async (req, res) => {
  try {
    await Timetable.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Timetable entry deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error deleting timetable entry', error: error.message });
  }
};

// ── LINK STUDENT TO PARENT ──

// @desc    Link a student to a parent user
// @route   POST /api/admin/link-parent
export const linkStudentToParent = async (req, res) => {
  try {
    const { parentUserId, studentId } = req.body;
    const parentUser = await User.findById(parentUserId);
    if (!parentUser || parentUser.role !== 'parent') {
      return res.status(400).json({ success: false, message: 'Invalid parent user' });
    }
    const student = await Student.findById(studentId);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

    parentUser.childStudent = studentId;
    await parentUser.save({ validateBeforeSave: false });

    // Also update student with parent reference
    student.parentUser = parentUserId;
    await student.save({ validateBeforeSave: false });

    res.json({ success: true, message: 'Parent linked to student successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error linking parent', error: error.message });
  }
};

// ── ASSIGN STUDENT TO CLASSROOM ──

// @desc    Assign students to a classroom
// @route   POST /api/admin/assign-classroom
export const assignStudentsToClassroom = async (req, res) => {
  try {
    const { classroomId, studentIds } = req.body;
    const classroom = await Classroom.findById(classroomId);
    if (!classroom) return res.status(404).json({ success: false, message: 'Classroom not found' });

    // Add students
    classroom.students = [...new Set([...classroom.students.map(s => s.toString()), ...studentIds])];
    await classroom.save();

    // Update student records
    await Student.updateMany(
      { _id: { $in: studentIds } },
      { classroom: classroomId }
    );

    res.json({ success: true, message: 'Students assigned to classroom' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error assigning students', error: error.message });
  }
};

// ── ADMIN OVERVIEW ──

// @desc    Get complete system overview
// @route   GET /api/admin/overview
export const getSystemOverview = async (req, res) => {
  try {
    const [
      totalUsers,
      totalStudents,
      totalFaculty,
      totalParents,
      totalClassrooms,
      totalSubjects,
    ] = await Promise.all([
      User.countDocuments({ isActive: true }),
      Student.countDocuments({ isActive: true }),
      Faculty.countDocuments({ isActive: true }),
      User.countDocuments({ role: 'parent', isActive: true }),
      Classroom.countDocuments({ isActive: true }),
      Subject.countDocuments({ isActive: true }),
    ]);

    res.json({
      success: true,
      data: { totalUsers, totalStudents, totalFaculty, totalParents, totalClassrooms, totalSubjects },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching overview', error: error.message });
  }
};
