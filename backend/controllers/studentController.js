import Student from "../models/Student.js";
import User from "../models/User.js";
import Classroom from "../models/Classroom.js";
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

    const students = await Student.find(filter)
      .populate("classroom", "name roomNumber")
      .sort({ createdAt: -1 })
      .lean();

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
      faceDescriptors,
      photoData,
      photos,       // Array of { data, label } objects for multi-photo
      classroom,
    } = req.body;

    // At least one photo is required
    const hasMultiPhotos = photos && Array.isArray(photos) && photos.length > 0;
    const hasSinglePhoto = !!photoData;

    if (!hasMultiPhotos && !hasSinglePhoto) {
      return res.status(400).json({
        success: false,
        message: "At least one student photo is required.",
      });
    }

    // At least one face descriptor is required
    const hasMultiDescriptors = faceDescriptors && Array.isArray(faceDescriptors) && faceDescriptors.length > 0;
    const hasSingleDescriptor = !!faceDescriptor;

    if (!hasMultiDescriptors && !hasSingleDescriptor) {
      return res.status(400).json({
        success: false,
        message: "Face descriptor is required. The photo must contain a detectable face.",
      });
    }

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

    // ── Save photos ──
    const savedPhotoUrls = [];
    const savedLabels = [];
    const parsedDescriptors = [];

    if (hasMultiPhotos) {
      for (const photo of photos) {
        const base64Data = photo.data.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(base64Data, "base64");
        const filename = `${uuidv4()}.jpg`;
        const filepath = path.join(uploadsDir, filename);
        fs.writeFileSync(filepath, buffer);
        savedPhotoUrls.push(`/uploads/${filename}`);
        savedLabels.push(photo.label || "variation");
      }
    }

    // Also save the legacy single photo if provided and no multi photos
    let primaryPhotoUrl = null;
    if (hasSinglePhoto && !hasMultiPhotos) {
      const base64Data = photoData.replace(/^data:image\/\w+;base64,/, "");
      const buffer = Buffer.from(base64Data, "base64");
      const filename = `${uuidv4()}.jpg`;
      const filepath = path.join(uploadsDir, filename);
      fs.writeFileSync(filepath, buffer);
      primaryPhotoUrl = `/uploads/${filename}`;
    } else if (savedPhotoUrls.length > 0) {
      primaryPhotoUrl = savedPhotoUrls[0]; // First photo = primary display
    }

    // Parse descriptors
    if (hasMultiDescriptors) {
      for (const desc of faceDescriptors) {
        const parsed = typeof desc === "string" ? JSON.parse(desc) : desc;
        parsedDescriptors.push(parsed);
      }
    }

    // Legacy single descriptor
    const legacyDescriptor = hasSingleDescriptor
      ? (typeof faceDescriptor === "string" ? JSON.parse(faceDescriptor) : faceDescriptor)
      : (parsedDescriptors.length > 0 ? parsedDescriptors[0] : null);

    // Create the student record
    const student = await Student.create({
      name,
      rollNumber: rollNumber.toUpperCase(),
      department,
      parentPhone,
      photoUrl: primaryPhotoUrl,
      photoUrls: savedPhotoUrls,
      photoLabels: savedLabels,
      faceDescriptor: legacyDescriptor,
      faceDescriptors: parsedDescriptors,
      classroom: classroom || null,
    });

    // ── Auto-create Student User account ──
    const studentEmail = `${rollNumber.toLowerCase()}@college.edu`;
    const studentPassword = `${rollNumber.toLowerCase()}123`;
    let studentUser = await User.findOne({ email: studentEmail });
    if (!studentUser) {
      studentUser = await User.create({
        name,
        email: studentEmail,
        password: studentPassword,
        role: "student",
        studentProfile: student._id,
      });
    } else {
      studentUser.studentProfile = student._id;
      await studentUser.save();
    }

    // ── Auto-create Parent User account ──
    let parentUser = null;
    if (parentPhone) {
      const parentEmail = `parent.${parentPhone}@college.edu`;
      const parentPassword = parentPhone;
      parentUser = await User.findOne({ email: parentEmail });
      if (!parentUser) {
        parentUser = await User.create({
          name: `Parent of ${name}`,
          email: parentEmail,
          password: parentPassword,
          role: "parent",
          childStudent: student._id,
        });
      } else {
        if (!parentUser.childStudent) {
          parentUser.childStudent = student._id;
          await parentUser.save();
        }
      }
      student.parentUser = parentUser._id;
      await student.save();
    }

    // ── Add student to classroom if provided ──
    if (classroom) {
      await Classroom.findByIdAndUpdate(classroom, {
        $addToSet: { students: student._id },
      });
    }

    res.status(201).json({
      success: true,
      message: `Student created with ${parsedDescriptors.length || 1} face variation(s)`,
      data: student,
      accounts: {
        student: { email: studentEmail, password: studentPassword },
        parent: parentPhone
          ? { email: `parent.${parentPhone}@college.edu`, password: parentPhone }
          : null,
      },
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
    const {
      name, department, parentPhone,
      faceDescriptor, faceDescriptors,
      photoData, photos,
      classroom,
    } = req.body;

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

    // ── Handle multi-photo update ──
    if (photos && Array.isArray(photos) && photos.length > 0) {
      // Delete old photos from disk
      for (const oldUrl of (student.photoUrls || [])) {
        const oldPath = path.join(__dirname, "..", oldUrl);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
      if (student.photoUrl) {
        const oldPrimary = path.join(__dirname, "..", student.photoUrl);
        if (fs.existsSync(oldPrimary)) fs.unlinkSync(oldPrimary);
      }

      const newUrls = [];
      const newLabels = [];
      for (const photo of photos) {
        if (photo.data && photo.data.startsWith("data:")) {
          const base64Data = photo.data.replace(/^data:image\/\w+;base64,/, "");
          const buffer = Buffer.from(base64Data, "base64");
          const filename = `${uuidv4()}.jpg`;
          fs.writeFileSync(path.join(uploadsDir, filename), buffer);
          newUrls.push(`/uploads/${filename}`);
        } else if (photo.data) {
          // Keep existing URL
          newUrls.push(photo.data);
        }
        newLabels.push(photo.label || "variation");
      }
      student.photoUrls = newUrls;
      student.photoLabels = newLabels;
      student.photoUrl = newUrls[0] || student.photoUrl;
    }

    // ── Handle multi-descriptors update ──
    if (faceDescriptors && Array.isArray(faceDescriptors) && faceDescriptors.length > 0) {
      const parsed = faceDescriptors.map(d => typeof d === "string" ? JSON.parse(d) : d);
      student.faceDescriptors = parsed;
      student.faceDescriptor = parsed[0]; // Keep legacy in sync
    } else if (faceDescriptor) {
      student.faceDescriptor = typeof faceDescriptor === "string" ? JSON.parse(faceDescriptor) : faceDescriptor;
    }

    // Handle classroom change
    if (classroom !== undefined) {
      const oldClassroom = student.classroom;
      student.classroom = classroom || null;
      if (oldClassroom && String(oldClassroom) !== String(classroom)) {
        await Classroom.findByIdAndUpdate(oldClassroom, {
          $pull: { students: student._id },
        });
      }
      if (classroom) {
        await Classroom.findByIdAndUpdate(classroom, {
          $addToSet: { students: student._id },
        });
      }
    }

    // Handle parent phone change
    if (parentPhone && parentPhone !== student.parentPhone) {
      student.parentPhone = parentPhone;
      const parentEmail = `parent.${parentPhone}@college.edu`;
      let parentUser = await User.findOne({ email: parentEmail });
      if (!parentUser) {
        parentUser = await User.create({
          name: `Parent of ${student.name}`,
          email: parentEmail,
          password: parentPhone,
          role: "parent",
          childStudent: student._id,
        });
      }
      student.parentUser = parentUser._id;
    }

    // Legacy single photo update (backward compat)
    if (photoData && !photos) {
      if (student.photoUrl) {
        const oldPhotoPath = path.join(__dirname, "..", student.photoUrl);
        if (fs.existsSync(oldPhotoPath)) fs.unlinkSync(oldPhotoPath);
      }
      const base64Data = photoData.replace(/^data:image\/\w+;base64,/, "");
      const buffer = Buffer.from(base64Data, "base64");
      const filename = `${uuidv4()}.jpg`;
      fs.writeFileSync(path.join(uploadsDir, filename), buffer);
      student.photoUrl = `/uploads/${filename}`;
    }

    await student.save();

    // Update linked user name
    if (name) {
      await User.findOneAndUpdate(
        { studentProfile: student._id, role: "student" },
        { name },
      );
    }

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

    // Remove linked student User account
    await User.deleteOne({ studentProfile: student._id, role: "student" });

    // Remove linked parent User account (only if no other children)
    if (student.parentUser) {
      const otherChildren = await Student.countDocuments({
        parentUser: student.parentUser,
        _id: { $ne: student._id },
      });
      if (otherChildren === 0) {
        await User.deleteOne({ _id: student.parentUser, role: "parent" });
      }
    }

    // Remove from classroom
    if (student.classroom) {
      await Classroom.findByIdAndUpdate(student.classroom, {
        $pull: { students: student._id },
      });
    }

    await student.deleteOne();

    res.json({
      success: true,
      message: "Student and linked accounts deleted successfully",
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
      isActive: true,
      $or: [
        { faceDescriptors: { $exists: true, $not: { $size: 0 } } },
        { faceDescriptor: { $ne: null } },
      ],
    })
      .select("_id name rollNumber department faceDescriptor faceDescriptors")
      .lean();

    // Normalize: ensure every student has faceDescriptors array
    const normalized = students.map((s) => ({
      ...s,
      faceDescriptors:
        s.faceDescriptors && s.faceDescriptors.length > 0
          ? s.faceDescriptors
          : s.faceDescriptor
            ? [s.faceDescriptor]
            : [],
      // Keep legacy field for backward compatibility
      faceDescriptor: s.faceDescriptor || (s.faceDescriptors?.[0] ?? null),
    }));

    res.json({
      success: true,
      count: normalized.length,
      data: normalized,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching students with faces",
      error: error.message,
    });
  }
};
