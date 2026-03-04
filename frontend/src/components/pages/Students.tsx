import { useEffect, useState, useRef } from "react";
import {
  Plus,
  Edit,
  Trash2,
  Camera,
  X,
  Search,
  Upload,
  User,
  Phone,
  Hash,
  Building2,
  CheckCircle2,
  AlertCircle,
  Image as ImageIcon,
} from "lucide-react";
import { studentsAPI } from "../../services/api";
import faceRecognitionService from "../../services/faceRecognition";

interface Student {
  _id: string;
  name: string;
  rollNumber: string;
  department: string;
  parentPhone: string;
  photoUrl: string | null;
  faceDescriptor: number[] | null;
}

const API_BASE = "http://localhost:5000";

function StudentAvatar({
  student,
  size = "md",
}: {
  student: Student;
  size?: "sm" | "md" | "lg";
}) {
  const [imgError, setImgError] = useState(false);
  const sizeClasses = {
    sm: "w-10 h-10 text-sm",
    md: "w-14 h-14 text-lg",
    lg: "w-20 h-20 text-2xl",
  };

  if (student.photoUrl && !imgError) {
    return (
      <div
        className={`${sizeClasses[size]} rounded-full overflow-hidden ring-2 ring-white/10 flex-shrink-0`}
      >
        <img
          src={`${API_BASE}${student.photoUrl}`}
          alt={student.name}
          className="w-full h-full object-cover"
          onError={() => setImgError(true)}
        />
      </div>
    );
  }

  const initials = student.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  const colors = [
    "from-blue-500 to-cyan-400",
    "from-purple-500 to-pink-400",
    "from-emerald-500 to-teal-400",
    "from-orange-500 to-amber-400",
    "from-rose-500 to-red-400",
    "from-indigo-500 to-violet-400",
  ];
  const color = colors[student.name.charCodeAt(0) % colors.length];

  return (
    <div
      className={`${sizeClasses[size]} rounded-full bg-gradient-to-br ${color} flex items-center justify-center font-bold text-white flex-shrink-0 ring-2 ring-white/10`}
    >
      {initials}
    </div>
  );
}

export default function Students() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    rollNumber: "",
    department: "",
    parentPhone: "",
  });
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [toast, setToast] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchStudents();
    faceRecognitionService.loadModels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Attach media stream to <video> after render
  useEffect(() => {
    if (showCamera && stream && videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(console.error);
    }
  }, [showCamera, stream]);

  // Auto-dismiss toast
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 3500);
      return () => clearTimeout(t);
    }
  }, [toast]);

  async function fetchStudents() {
    try {
      const response = await studentsAPI.getAll();
      setStudents(response.data.data);
    } catch (error) {
      console.error("Error fetching students:", error);
      showToast("error", "Failed to load students");
    } finally {
      setLoading(false);
    }
  }

  function showToast(type: "success" | "error", message: string) {
    setToast({ type, message });
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  }

  function processFile(file: File) {
    if (!file.type.startsWith("image/")) {
      showToast("error", "Please select an image file");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      showToast("error", "Image must be under 10MB");
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => setPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  }

  function clearPhoto() {
    setPhotoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function startCamera() {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: "user" },
      });
      setShowCamera(true);
      setStream(mediaStream);
    } catch (error) {
      console.error("Error accessing camera:", error);
      showToast("error", "Unable to access camera. Check permissions.");
    }
  }

  function stopCamera() {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setShowCamera(false);
  }

  async function capturePhoto() {
    if (!videoRef.current) return;
    const video = videoRef.current;
    if (
      video.readyState < 2 ||
      video.videoWidth === 0 ||
      video.videoHeight === 0
    ) {
      showToast("error", "Camera still loading. Please wait...");
      return;
    }
    setCapturing(true);
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
    setPhotoPreview(dataUrl);
    setCapturing(false);
    stopCamera();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    try {
      let faceDescriptor = null;
      let photoData = photoPreview;

      // Only extract face descriptor from new photos (data URLs), not existing server URLs
      if (photoPreview && photoPreview.startsWith("data:")) {
        const img = new Image();
        img.src = photoPreview;
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
        });
        try {
          const descriptor =
            await faceRecognitionService.extractFaceDescriptor(img);
          faceDescriptor = JSON.stringify(descriptor);
        } catch (error) {
          console.error("Face extraction error:", error);
          showToast("error", "Could not detect face. Try another photo.");
          setSubmitting(false);
          return;
        }
      } else if (photoPreview && !photoPreview.startsWith("data:")) {
        // Editing with existing photo, don't re-send photoData
        photoData = null;
      }

      const payload = { ...formData, photoData, faceDescriptor };

      if (editingStudent) {
        await studentsAPI.update(editingStudent._id, payload);
        showToast("success", "Student updated successfully!");
      } else {
        await studentsAPI.create(payload);
        showToast("success", "Student added successfully!");
      }

      resetForm();
      fetchStudents();
    } catch (error: unknown) {
      console.error("Error saving student:", error);
      const msg = (error as { response?: { data?: { message?: string } } })
        ?.response?.data?.message;
      showToast("error", msg || "Failed to save student");
    } finally {
      setSubmitting(false);
    }
  }

  function resetForm() {
    setFormData({ name: "", rollNumber: "", department: "", parentPhone: "" });
    setPhotoPreview(null);
    setEditingStudent(null);
    setShowModal(false);
    stopCamera();
  }

  function handleEdit(student: Student) {
    setEditingStudent(student);
    setFormData({
      name: student.name,
      rollNumber: student.rollNumber,
      department: student.department,
      parentPhone: student.parentPhone,
    });
    if (student.photoUrl) {
      setPhotoPreview(`${API_BASE}${student.photoUrl}`);
    }
    setShowModal(true);
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this student?")) return;
    try {
      await studentsAPI.delete(id);
      showToast("success", "Student deleted successfully");
      fetchStudents();
    } catch (error) {
      console.error("Error deleting student:", error);
      showToast("error", "Failed to delete student");
    }
  }

  const filteredStudents = students.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.rollNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.department.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const departments = [...new Set(students.map((s) => s.department))];

  // ─── Loading skeleton ──────────────────────────────────
  if (loading) {
    return (
      <div className="p-6 md:p-8 space-y-6">
        <div className="animate-pulse space-y-6">
          <div className="flex justify-between">
            <div className="h-9 bg-gray-700/60 rounded-lg w-48" />
            <div className="h-10 bg-gray-700/60 rounded-lg w-36" />
          </div>
          <div className="h-12 bg-gray-700/40 rounded-xl w-full max-w-md" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-56 bg-gray-800/60 rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-6 relative">
      {/* ─── Toast notification ─── */}
      {toast && (
        <div
          className={`fixed top-6 right-6 z-[60] flex items-center gap-3 px-5 py-3 rounded-xl shadow-2xl border backdrop-blur-sm animate-[slideIn_0.3s_ease-out] ${
            toast.type === "success"
              ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
              : "bg-red-500/15 border-red-500/30 text-red-400"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
          )}
          <span className="text-sm font-medium">{toast.message}</span>
        </div>
      )}

      {/* ─── Header ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
            Students
          </h1>
          <p className="text-gray-500 mt-1 text-sm">
            {students.length} student{students.length !== 1 ? "s" : ""}{" "}
            registered
            {departments.length > 0 &&
              ` across ${departments.length} department${departments.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 px-5 py-2.5 rounded-xl text-white font-semibold shadow-lg shadow-blue-600/20 transition-all duration-200 hover:shadow-blue-500/30 hover:-translate-y-0.5 active:translate-y-0"
        >
          <Plus className="w-4 h-4" />
          Add Student
        </button>
      </div>

      {/* ─── Search bar ─── */}
      <div className="relative max-w-md">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by name, roll number, or department..."
          className="w-full bg-gray-800/60 border border-gray-700/50 rounded-xl pl-11 pr-4 py-3 text-white text-sm placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40 transition-all"
        />
      </div>

      {/* ─── Students grid ─── */}
      {filteredStudents.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-20 h-20 rounded-full bg-gray-800/60 flex items-center justify-center mb-4">
            <User className="w-8 h-8 text-gray-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-400">
            {searchQuery ? "No students found" : "No students yet"}
          </h3>
          <p className="text-gray-600 text-sm mt-1 max-w-xs">
            {searchQuery
              ? "Try a different search term"
              : 'Click "Add Student" to register your first student'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filteredStudents.map((student) => (
            <div
              key={student._id}
              className="group relative bg-gradient-to-b from-gray-800/80 to-gray-800/40 rounded-2xl border border-gray-700/40 hover:border-gray-600/60 transition-all duration-300 hover:shadow-xl hover:shadow-black/20 hover:-translate-y-1 overflow-hidden"
            >
              {/* Face descriptor badge */}
              {student.faceDescriptor && (
                <div className="absolute top-3 right-3 z-10">
                  <div className="flex items-center gap-1 bg-emerald-500/15 text-emerald-400 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-emerald-500/20">
                    <CheckCircle2 className="w-3 h-3" />
                    Face ID
                  </div>
                </div>
              )}

              <div className="p-5 pb-4">
                {/* Avatar + info */}
                <div className="flex items-center gap-4 mb-4">
                  <StudentAvatar student={student} size="lg" />
                  <div className="min-w-0 flex-1">
                    <h3 className="text-base font-semibold text-white truncate">
                      {student.name}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-1">
                      <Hash className="w-3 h-3 text-gray-500" />
                      <span className="text-xs text-gray-400 font-mono">
                        {student.rollNumber}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Building2 className="w-3 h-3 text-gray-500" />
                      <span className="text-xs text-gray-400">
                        {student.department}
                      </span>
                    </div>
                    {student.parentPhone && (
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Phone className="w-3 h-3 text-gray-500" />
                        <span className="text-xs text-gray-400">
                          {student.parentPhone}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions footer */}
              <div className="flex border-t border-gray-700/40">
                <button
                  onClick={() => handleEdit(student)}
                  className="flex-1 flex items-center justify-center gap-2 py-3 text-sm text-gray-400 hover:text-blue-400 hover:bg-blue-500/5 transition-colors"
                >
                  <Edit className="w-3.5 h-3.5" />
                  Edit
                </button>
                <div className="w-px bg-gray-700/40" />
                <button
                  onClick={() => handleDelete(student._id)}
                  className="flex-1 flex items-center justify-center gap-2 py-3 text-sm text-gray-400 hover:text-red-400 hover:bg-red-500/5 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── Modal ─── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div
            className="bg-gray-900 border border-gray-700/60 rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="sticky top-0 bg-gray-900/95 backdrop-blur-sm border-b border-gray-700/40 px-6 py-4 flex justify-between items-center rounded-t-2xl z-10">
              <div>
                <h2 className="text-xl font-bold text-white">
                  {editingStudent ? "Edit Student" : "New Student"}
                </h2>
                <p className="text-gray-500 text-xs mt-0.5">
                  {editingStudent
                    ? "Update student information"
                    : "Register a new student with photo"}
                </p>
              </div>
              <button
                onClick={resetForm}
                className="text-gray-500 hover:text-white hover:bg-gray-800 p-2 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {/* ─── Photo section ─── */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  Photo
                </label>

                {/* Preview */}
                {photoPreview && !showCamera && (
                  <div className="relative mb-4 flex justify-center">
                    <div className="relative group/photo">
                      <img
                        src={photoPreview}
                        alt="Preview"
                        className="w-32 h-32 object-cover rounded-2xl ring-2 ring-white/10 shadow-lg"
                        onError={() => {
                          clearPhoto();
                          showToast("error", "Failed to load image preview");
                        }}
                      />
                      <button
                        type="button"
                        onClick={clearPhoto}
                        className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 rounded-full p-1.5 shadow-lg transition-colors"
                      >
                        <X className="w-3 h-3 text-white" />
                      </button>
                      <div className="absolute inset-0 bg-black/40 rounded-2xl opacity-0 group-hover/photo:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="text-white text-xs font-medium">
                          Click X to remove
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Camera */}
                {showCamera && (
                  <div className="space-y-3 mb-3">
                    <div className="relative rounded-xl overflow-hidden bg-black ring-1 ring-gray-700/50">
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full aspect-video object-cover"
                      />
                      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-3 flex gap-2">
                        <button
                          type="button"
                          onClick={capturePhoto}
                          disabled={capturing}
                          className="flex-1 flex items-center justify-center gap-2 bg-white hover:bg-gray-100 disabled:opacity-50 px-4 py-2.5 rounded-xl text-gray-900 font-semibold text-sm transition-colors"
                        >
                          <Camera className="w-4 h-4" />
                          {capturing ? "Capturing..." : "Capture"}
                        </button>
                        <button
                          type="button"
                          onClick={stopCamera}
                          className="bg-gray-800/80 hover:bg-gray-700 px-4 py-2.5 rounded-xl text-white text-sm transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Upload zone + buttons */}
                {!showCamera && !photoPreview && (
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragOver(true);
                    }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer ${
                      dragOver
                        ? "border-blue-500 bg-blue-500/10"
                        : "border-gray-700/60 hover:border-gray-600 bg-gray-800/30"
                    }`}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <div className="w-12 h-12 rounded-full bg-gray-700/50 flex items-center justify-center mx-auto mb-3">
                      <ImageIcon className="w-5 h-5 text-gray-400" />
                    </div>
                    <p className="text-sm text-gray-400 mb-1">
                      Drag & drop an image here, or click to browse
                    </p>
                    <p className="text-[11px] text-gray-600">
                      PNG, JPG, WEBP up to 10MB
                    </p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoChange}
                      className="hidden"
                    />
                  </div>
                )}

                {/* Camera / Upload toggle buttons */}
                {!showCamera && !photoPreview && (
                  <div className="flex gap-2 mt-3">
                    <button
                      type="button"
                      onClick={startCamera}
                      className="flex-1 flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-700 border border-gray-700/60 px-4 py-2.5 rounded-xl text-gray-300 text-sm font-medium transition-colors"
                    >
                      <Camera className="w-4 h-4" />
                      Use Camera
                    </button>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex-1 flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-700 border border-gray-700/60 px-4 py-2.5 rounded-xl text-gray-300 text-sm font-medium transition-colors"
                    >
                      <Upload className="w-4 h-4" />
                      Upload File
                    </button>
                  </div>
                )}
              </div>

              {/* ─── Form fields ─── */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">
                    <User className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5 text-gray-500" />
                    Full Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    placeholder="e.g. John Doe"
                    className="w-full bg-gray-800/60 border border-gray-700/50 rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">
                    <Hash className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5 text-gray-500" />
                    Roll Number
                  </label>
                  <input
                    type="text"
                    name="rollNumber"
                    value={formData.rollNumber}
                    onChange={handleInputChange}
                    required
                    disabled={!!editingStudent}
                    placeholder="e.g. 24911A12H0"
                    className="w-full bg-gray-800/60 border border-gray-700/50 rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">
                    <Building2 className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5 text-gray-500" />
                    Department
                  </label>
                  <input
                    type="text"
                    name="department"
                    value={formData.department}
                    onChange={handleInputChange}
                    required
                    placeholder="e.g. IT"
                    className="w-full bg-gray-800/60 border border-gray-700/50 rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40 transition-all"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">
                    <Phone className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5 text-gray-500" />
                    Parent Phone
                  </label>
                  <input
                    type="tel"
                    name="parentPhone"
                    value={formData.parentPhone}
                    onChange={handleInputChange}
                    required
                    pattern="[0-9]{10}"
                    placeholder="e.g. 9876543210"
                    className="w-full bg-gray-800/60 border border-gray-700/50 rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40 transition-all"
                  />
                </div>
              </div>

              {/* ─── Submit buttons ─── */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 bg-gray-800 hover:bg-gray-700 border border-gray-700/50 px-4 py-2.5 rounded-xl text-gray-300 font-medium text-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2.5 rounded-xl text-white font-semibold text-sm shadow-lg shadow-blue-600/20 transition-all"
                >
                  {submitting
                    ? "Saving..."
                    : editingStudent
                      ? "Update Student"
                      : "Create Student"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
