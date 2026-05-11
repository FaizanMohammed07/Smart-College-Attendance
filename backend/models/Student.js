import mongoose from "mongoose";

const studentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [100, "Name cannot exceed 100 characters"],
    },
    rollNumber: {
      type: String,
      required: [true, "Roll number is required"],
      unique: true,
      trim: true,
      uppercase: true,
    },
    department: {
      type: String,
      required: [true, "Department is required"],
      trim: true,
    },
    parentPhone: {
      type: String,
      required: [true, "Parent phone is required"],
      match: [/^[0-9]{10}$/, "Please enter a valid 10-digit phone number"],
    },
    // Primary display photo (first captured)
    photoUrl: {
      type: String,
      default: null,
    },
    // All captured variation photos – up to 8
    photoUrls: {
      type: [String],
      default: [],
    },
    // LEGACY single descriptor (kept for backward compat, auto-migrated)
    faceDescriptor: {
      type: [Number],
      default: null,
    },
    // Multi-angle face descriptors – one per captured photo
    faceDescriptors: {
      type: [[Number]],
      default: [],
    },
    // Labels for each captured photo
    photoLabels: {
      type: [String],
      default: [],
    },
    classroom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Classroom",
      default: null,
    },
    parentUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    subjects: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Subject",
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

// Indexes for better query performance
studentSchema.index({ rollNumber: 1 });
studentSchema.index({ department: 1 });
studentSchema.index({ isActive: 1 });

const Student = mongoose.model("Student", studentSchema);

export default Student;
