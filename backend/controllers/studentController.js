import Student from "../models/Student.js";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// @desc    Get all students
// @route   GET /api/students
// @access  Public
export const getAllStudents = async (req, res) => {
  try {
    const { department, isActive } = req.query;
    const filter = {};

    if (department) filter.department = department;
    if (isActive !== undefined) filter.isActive = isActive === "true";

    const students = await Student.find(filter).sort({ createdAt: -1 }).lean();

    res.json({
      success: true,
      count: students.length,
      data: students,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching students",
      error: error.message,
    });
  }
};

// @desc    Get single student
// @route   GET /api/students/:id
// @access  Public
export const getStudentById = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    res.json({
      success: true,
      data: student,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching student",
      error: error.message,
    });
  }
};

// @desc    Create new student
// @route   POST /api/students
// @access  Public
export const createStudent = async (req, res) => {
  try {
    const {
      name,
      rollNumber,
      department,
      parentPhone,
      faceDescriptor,
      photoData,
    } = req.body;

    // Check if student with roll number already exists
    const existingStudent = await Student.findOne({
      rollNumber: rollNumber.toUpperCase(),
    });
    if (existingStudent) {
      return res.status(400).json({
        success: false,
        message: "Student with this roll number already exists",
      });
    }

    let photoUrl = null;

    // Save photo if provided
    if (photoData) {
      const base64Data = photoData.replace(/^data:image\/\w+;base64,/, "");
      const buffer = Buffer.from(base64Data, "base64");
      const filename = `${uuidv4()}.jpg`;
      const filepath = path.join(uploadsDir, filename);

      fs.writeFileSync(filepath, buffer);
      photoUrl = `/uploads/${filename}`;
    }

    const student = await Student.create({
      name,
      rollNumber: rollNumber.toUpperCase(),
      department,
      parentPhone,
      photoUrl,
      faceDescriptor: faceDescriptor ? JSON.parse(faceDescriptor) : null,
    });

    res.status(201).json({
      success: true,
      message: "Student created successfully",
      data: student,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error creating student",
      error: error.message,
    });
  }
};

// @desc    Update student
// @route   PUT /api/students/:id
// @access  Public
export const updateStudent = async (req, res) => {
  try {
    const { name, department, parentPhone, faceDescriptor, photoData } =
      req.body;

    const student = await Student.findById(req.params.id);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    // Update fields
    if (name) student.name = name;
    if (department) student.department = department;
    if (parentPhone) student.parentPhone = parentPhone;
    if (faceDescriptor) {
      student.faceDescriptor = JSON.parse(faceDescriptor);
    }

    // Update photo if provided
    if (photoData) {
      // Delete old photo if exists
      if (student.photoUrl) {
        const oldPhotoPath = path.join(__dirname, "..", student.photoUrl);
        if (fs.existsSync(oldPhotoPath)) {
          fs.unlinkSync(oldPhotoPath);
        }
      }

      const base64Data = photoData.replace(/^data:image\/\w+;base64,/, "");
      const buffer = Buffer.from(base64Data, "base64");
      const filename = `${uuidv4()}.jpg`;
      const filepath = path.join(uploadsDir, filename);

      fs.writeFileSync(filepath, buffer);
      student.photoUrl = `/uploads/${filename}`;
    }

    await student.save();

    res.json({
      success: true,
      message: "Student updated successfully",
      data: student,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating student",
      error: error.message,
    });
  }
};

// @desc    Delete student
// @route   DELETE /api/students/:id
// @access  Public
export const deleteStudent = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    // Delete photo if exists
    if (student.photoUrl) {
      const photoPath = path.join(__dirname, "..", student.photoUrl);
      if (fs.existsSync(photoPath)) {
        fs.unlinkSync(photoPath);
      }
    }

    await student.deleteOne();

    res.json({
      success: true,
      message: "Student deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error deleting student",
      error: error.message,
    });
  }
};

// @desc    Get students with face descriptors (for face recognition)
// @route   GET /api/students/faces/descriptors
// @access  Public
export const getStudentsWithFaces = async (req, res) => {
  try {
    const students = await Student.find({
      faceDescriptor: { $ne: null },
      isActive: true,
    })
      .select("_id name rollNumber department faceDescriptor")
      .lean();

    res.json({
      success: true,
      count: students.length,
      data: students,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching students with faces",
      error: error.message,
    });
  }
};
