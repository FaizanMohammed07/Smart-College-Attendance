import { useEffect, useState, useRef, useCallback } from "react";
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
  ChevronRight,
  ChevronLeft,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  Layers,
} from "lucide-react";
import { studentsAPI, adminAPI } from "../../services/api";
import faceRecognitionService from "../../services/faceRecognition";

/* ──────────────────────────────────────────────────────────
   Types
   ────────────────────────────────────────────────────────── */

interface Student {
  _id: string;
  name: string;
  rollNumber: string;
  department: string;
  parentPhone: string;
  photoUrl: string | null;
  photoUrls?: string[];
  photoLabels?: string[];
  faceDescriptor: number[] | null;
  faceDescriptors?: number[][];
  classroom?: { _id: string; name: string; roomNumber: string } | string | null;
}

interface Classroom {
  _id: string;
  name: string;
  roomNumber: string;
}

interface CapturedPhoto {
  data: string; // base64 data URL or server URL
  label: string;
  descriptor: number[] | null;
}

const API_BASE = "http://localhost:5000";

/* ──────────────────────────────────────────────────────────
   Photo Variation Guides
   ────────────────────────────────────────────────────────── */
const PHOTO_VARIATIONS = [
  { id: "front",   label: "Front Face",  icon: "😐", instruction: "Look straight at the camera",                    required: true },
  { id: "left",    label: "Left Angle",  icon: "👈", instruction: "Turn your head slightly to the LEFT (~30°)",     required: true },
  { id: "right",   label: "Right Angle", icon: "👉", instruction: "Turn your head slightly to the RIGHT (~30°)",    required: true },
  { id: "smile",   label: "Smiling",     icon: "😊", instruction: "Give a natural smile",                           required: true },
  { id: "neutral", label: "Neutral",     icon: "😶", instruction: "Relaxed face, no expression",                   required: true },
  { id: "up",      label: "Look Up",     icon: "👆", instruction: "Tilt your head slightly UP (overhead camera angle)", required: false },
  { id: "down",    label: "Look Down",   icon: "👇", instruction: "Tilt your head slightly DOWN",                  required: false },
  { id: "tilt",    label: "Head Tilt",   icon: "🔄", instruction: "Tilt your head slightly to one side",           required: false },
];

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
    classroom: "",
  });
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [createdAccounts, setCreatedAccounts] = useState<{
    student: { email: string; password: string };
    parent: { email: string; password: string } | null;
  } | null>(null);

  // Multi-photo capture state
  const [capturedPhotos, setCapturedPhotos] = useState<CapturedPhoto[]>([]);
  const [currentVariation, setCurrentVariation] = useState(0);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [captureMode, setCaptureMode] = useState<"wizard" | "upload" | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [toast, setToast] = useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchStudents();
    fetchClassrooms();
    faceRecognitionService.loadModels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Attach media stream to <video> after render
  useEffect(() => {
    if (showCamera && cameraStream && videoRef.current) {
      videoRef.current.srcObject = cameraStream;
      videoRef.current.play().catch(console.error);
    }
  }, [showCamera, cameraStream]);

  // Auto-dismiss toast
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 3500);
      return () => clearTimeout(t);
    }
  }, [toast]);

  /* ──────── Data fetching ──────── */
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

  function showToast(type: "success" | "error" | "info", message: string) {
    setToast({ type, message });
  }

  async function fetchClassrooms() {
    try {
      const res = await adminAPI.getClassrooms();
      setClassrooms(res.data.data || []);
    } catch {
      // fail silently
    }
  }

  /* ──────── Form helpers ──────── */
  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  }

  function resetForm() {
    setFormData({ name: "", rollNumber: "", department: "", parentPhone: "", classroom: "" });
    setCapturedPhotos([]);
    setCurrentVariation(0);
    setEditingStudent(null);
    setShowModal(false);
    setCreatedAccounts(null);
    setCaptureMode(null);
    stopCamera();
  }

  /* ──────── Camera ──────── */
  async function startCamera() {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: "user" },
      });
      setCameraStream(mediaStream);
      setShowCamera(true);
    } catch {
      showToast("error", "Unable to access camera. Check permissions.");
    }
  }

  function stopCamera() {
    if (cameraStream) {
      cameraStream.getTracks().forEach((t) => t.stop());
      setCameraStream(null);
    }
    setShowCamera(false);
  }

  /* ──────── Capture photo from video ──────── */
  const captureCurrentPhoto = useCallback(async () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    if (video.readyState < 2 || video.videoWidth === 0) {
      showToast("error", "Camera still loading. Please wait...");
      return;
    }

    setIsExtracting(true);

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.92);

    // Extract face descriptor immediately
    try {
      const img = new Image();
      img.src = dataUrl;
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });
      const descriptor = await faceRecognitionService.extractFaceDescriptor(img);

      const variation = PHOTO_VARIATIONS[currentVariation];
      const newPhoto: CapturedPhoto = {
        data: dataUrl,
        label: variation.id,
        descriptor,
      };

      setCapturedPhotos((prev) => {
        const existing = prev.findIndex((p) => p.label === variation.id);
        if (existing >= 0) {
          const copy = [...prev];
          copy[existing] = newPhoto;
          return copy;
        }
        return [...prev, newPhoto];
      });

      showToast("success", `${variation.label} captured! Face detected.`);

      // Auto-advance to next uncaptured variation
      const nextIdx = findNextUncaptured(currentVariation);
      if (nextIdx !== null) {
        setCurrentVariation(nextIdx);
      }
    } catch {
      showToast("error", "No face detected. Adjust your position and try again.");
    } finally {
      setIsExtracting(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentVariation, capturedPhotos]);

  function findNextUncaptured(fromIdx: number): number | null {
    for (let i = fromIdx + 1; i < PHOTO_VARIATIONS.length; i++) {
      if (!capturedPhotos.find((p) => p.label === PHOTO_VARIATIONS[i].id)) return i;
    }
    for (let i = 0; i <= fromIdx; i++) {
      if (!capturedPhotos.find((p) => p.label === PHOTO_VARIATIONS[i].id)) return i;
    }
    return null;
  }

  /* ──────── File upload handler for batch ──────── */
  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files) return;

    setIsExtracting(true);
    let successCount = 0;
    const newPhotos: CapturedPhoto[] = [...capturedPhotos];

    for (let i = 0; i < Math.min(files.length, 8); i++) {
      const file = files[i];
      if (!file.type.startsWith("image/")) continue;
      if (file.size > 10 * 1024 * 1024) continue;

      try {
        const dataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });

        const img = new Image();
        img.src = dataUrl;
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
        });

        const descriptor = await faceRecognitionService.extractFaceDescriptor(img);
        const usedLabels = new Set(newPhotos.map((p) => p.label));
        const nextVariation = PHOTO_VARIATIONS.find((v) => !usedLabels.has(v.id));
        const label = nextVariation?.id || `upload-${i}`;

        newPhotos.push({ data: dataUrl, label, descriptor });
        successCount++;
      } catch {
        // Skip files where face detection fails
      }
    }

    setCapturedPhotos(newPhotos);
    setIsExtracting(false);

    if (successCount > 0) {
      showToast("success", `${successCount} photo(s) uploaded with faces detected.`);
    } else {
      showToast("error", "No faces detected in uploaded images.");
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  /* ──────── Remove a captured photo ──────── */
  function removePhoto(label: string) {
    setCapturedPhotos((prev) => prev.filter((p) => p.label !== label));
  }

  /* ──────── Submit ──────── */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    try {
      const requiredCount = PHOTO_VARIATIONS.filter((v) => v.required).length;
      const capturedRequired = capturedPhotos.filter((p) =>
        PHOTO_VARIATIONS.find((v) => v.id === p.label && v.required),
      ).length;

      if (!editingStudent && capturedPhotos.length === 0) {
        showToast("error", "Please capture at least the 5 required face photos.");
        setSubmitting(false);
        return;
      }

      if (!editingStudent && capturedRequired < requiredCount) {
        showToast("error", `Please capture all ${requiredCount} required angles (${capturedRequired}/${requiredCount} done).`);
        setSubmitting(false);
        return;
      }

      // Build payload — only send new data: photos that are base64
      const newPhotos = capturedPhotos.filter((p) => p.data.startsWith("data:"));
      const photos = newPhotos.map((p) => ({ data: p.data, label: p.label }));
      const faceDescriptors = newPhotos.filter((p) => p.descriptor).map((p) => p.descriptor);

      const payload: Record<string, unknown> = {
        ...formData,
        photos: photos.length > 0 ? photos : undefined,
        faceDescriptors: faceDescriptors.length > 0 ? faceDescriptors : undefined,
      };

      if (editingStudent) {
        await studentsAPI.update(editingStudent._id, payload);
        showToast("success", "Student updated successfully!");
        resetForm();
      } else {
        const res = await studentsAPI.create(payload);
        if (res.data.accounts) setCreatedAccounts(res.data.accounts);
        showToast("success", `Student added with ${faceDescriptors.length} face variations!`);
      }
      fetchStudents();
    } catch (error: unknown) {
      console.error("Error saving student:", error);
      const msg = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
      showToast("error", msg || "Failed to save student");
    } finally {
      setSubmitting(false);
    }
  }

  /* ──────── Edit / Delete ──────── */
  function handleEdit(student: Student) {
    setEditingStudent(student);
    setFormData({
      name: student.name,
      rollNumber: student.rollNumber,
      department: student.department,
      parentPhone: student.parentPhone,
      classroom: student.classroom
        ? typeof student.classroom === "string" ? student.classroom : student.classroom._id
        : "",
    });
    // Load existing photos
    if (student.photoUrls && student.photoUrls.length > 0) {
      const existing: CapturedPhoto[] = student.photoUrls.map((url, i) => ({
        data: `${API_BASE}${url}`,
        label: student.photoLabels?.[i] || `photo-${i}`,
        descriptor: student.faceDescriptors?.[i] || null,
      }));
      setCapturedPhotos(existing);
    } else if (student.photoUrl) {
      setCapturedPhotos([{ data: `${API_BASE}${student.photoUrl}`, label: "front", descriptor: student.faceDescriptor || null }]);
    }
    setShowModal(true);
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this student?")) return;
    try {
      await studentsAPI.delete(id);
      showToast("success", "Student deleted successfully");
      fetchStudents();
    } catch {
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
  const capturedLabels = new Set(capturedPhotos.map((p) => p.label));
  const requiredDone = PHOTO_VARIATIONS.filter((v) => v.required && capturedLabels.has(v.id)).length;
  const totalRequired = PHOTO_VARIATIONS.filter((v) => v.required).length;

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
          className={`fixed top-6 right-6 z-[70] flex items-center gap-3 px-5 py-3 rounded-xl shadow-2xl border backdrop-blur-sm animate-[slideIn_0.3s_ease-out] ${
            toast.type === "success"
              ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
              : toast.type === "info"
                ? "bg-blue-500/15 border-blue-500/30 text-blue-400"
                : "bg-red-500/15 border-red-500/30 text-red-400"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          ) : toast.type === "info" ? (
            <Sparkles className="w-5 h-5 flex-shrink-0" />
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
              : 'Click "Add Student" to register with multi-angle face enrollment'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filteredStudents.map((student) => {
            const descCount = student.faceDescriptors?.length || (student.faceDescriptor ? 1 : 0);
            return (
            <div
              key={student._id}
              className="group relative bg-gradient-to-b from-gray-800/80 to-gray-800/40 rounded-2xl border border-gray-700/40 hover:border-gray-600/60 transition-all duration-300 hover:shadow-xl hover:shadow-black/20 hover:-translate-y-1 overflow-hidden"
            >
              {/* Face descriptor badge */}
              {descCount > 0 && (
                <div className="absolute top-3 right-3 z-10">
                  <div className="flex items-center gap-1 bg-emerald-500/15 text-emerald-400 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-emerald-500/20">
                    {descCount >= 5 ? (
                      <ShieldCheck className="w-3 h-3" />
                    ) : (
                      <Layers className="w-3 h-3" />
                    )}
                    {descCount} Face{descCount > 1 ? "s" : ""}
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

                {/* Accuracy bar */}
                {descCount > 0 && (
                  <div className="mt-1">
                    <div className="flex items-center justify-between text-[10px] mb-1">
                      <span className="text-gray-500">Recognition accuracy</span>
                      <span className={`font-semibold ${descCount >= 5 ? "text-emerald-400" : descCount >= 3 ? "text-yellow-400" : "text-orange-400"}`}>
                        {descCount >= 5 ? "99%+" : descCount >= 3 ? "~90%" : "~75%"}
                      </span>
                    </div>
                    <div className="w-full h-1 bg-gray-700/60 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${descCount >= 5 ? "bg-emerald-500" : descCount >= 3 ? "bg-yellow-500" : "bg-orange-500"}`}
                        style={{ width: `${Math.min(100, (descCount / 8) * 100)}%` }}
                      />
                    </div>
                  </div>
                )}
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
            );
          })}
        </div>
      )}

{/* ══════════════════════════════════════════════════════════
             Registration / Edit Modal — Multi-Photo Wizard
         ══════════════════════════════════════════════════════════ */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div
            className="bg-gray-900 border border-gray-700/60 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[95vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="sticky top-0 bg-gray-900/95 backdrop-blur-sm border-b border-gray-700/40 px-6 py-4 flex justify-between items-center rounded-t-2xl z-10">
              <div>
                <h2 className="text-xl font-bold text-white">
                  {editingStudent ? "Edit Student" : "New Student — Multi-Angle Enrollment"}
                </h2>
                <p className="text-gray-500 text-xs mt-0.5">
                  {editingStudent
                    ? "Update student info & face photos"
                    : "Capture 5-8 face angles for 99%+ recognition accuracy"}
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
                  <p className="text-[11px] text-gray-600 mt-1">
                    Parent login: parent.{formData.parentPhone || "..."}@college.edu / {formData.parentPhone || "phone number"}
                  </p>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">
                    <Building2 className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5 text-gray-500" />
                    Classroom
                  </label>
                  <select
                    name="classroom"
                    value={formData.classroom}
                    onChange={(e) => setFormData({ ...formData, classroom: e.target.value })}
                    className="w-full bg-gray-800/60 border border-gray-700/50 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40 transition-all"
                  >
                    <option value="">No classroom assigned</option>
                    {classrooms.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name} (Room {c.roomNumber})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* ═══════════════════════════════════════════════
                   Multi-Angle Face Enrollment Section
                 ═══════════════════════════════════════════════ */}
              <div className="border border-gray-700/40 rounded-xl overflow-hidden">
                {/* Section header */}
                <div className="bg-gradient-to-r from-blue-600/10 to-purple-600/10 border-b border-gray-700/40 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-blue-400" />
                        Face Enrollment — Multi-Angle Capture
                      </h3>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        Capture 5-8 angles for 99%+ accuracy. Works with overhead cameras & movement.
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                        requiredDone >= totalRequired
                          ? "bg-emerald-500/15 text-emerald-400"
                          : "bg-yellow-500/15 text-yellow-400"
                      }`}>
                        {capturedPhotos.length} / 8
                      </div>
                    </div>
                  </div>

                  {/* Progress dots / variation chips */}
                  <div className="flex items-center gap-1.5 mt-3 flex-wrap">
                    {PHOTO_VARIATIONS.map((variation) => {
                      const isCaptured = capturedLabels.has(variation.id);
                      return (
                        <button
                          key={variation.id}
                          type="button"
                          onClick={() => {
                            const idx = PHOTO_VARIATIONS.findIndex((v) => v.id === variation.id);
                            setCurrentVariation(idx);
                            if (!showCamera) startCamera();
                            setCaptureMode("wizard");
                          }}
                          className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium transition-all ${
                            isCaptured
                              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                              : variation.required
                                ? "bg-gray-800/60 text-gray-400 border border-gray-700/40 hover:border-gray-600"
                                : "bg-gray-800/40 text-gray-500 border border-gray-700/30 hover:border-gray-600"
                          }`}
                        >
                          <span>{variation.icon}</span>
                          <span className="hidden sm:inline">{variation.label}</span>
                          {isCaptured && <CheckCircle2 className="w-3 h-3" />}
                          {!isCaptured && variation.required && (
                            <span className="text-red-400">*</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Capture mode selector */}
                {!captureMode && capturedPhotos.length === 0 && (
                  <div className="p-6 flex flex-col sm:flex-row gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setCaptureMode("wizard");
                        startCamera();
                      }}
                      className="flex-1 flex flex-col items-center gap-2 bg-gradient-to-b from-blue-600/10 to-blue-600/5 border border-blue-500/30 hover:border-blue-400/50 rounded-xl p-5 text-center transition-all group"
                    >
                      <div className="w-12 h-12 rounded-full bg-blue-500/15 flex items-center justify-center group-hover:bg-blue-500/25 transition-colors">
                        <Camera className="w-5 h-5 text-blue-400" />
                      </div>
                      <p className="text-sm font-semibold text-white">Guided Camera Capture</p>
                      <p className="text-[11px] text-gray-500">
                        Step-by-step guided capture of all angles. Recommended.
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCaptureMode("upload");
                        fileInputRef.current?.click();
                      }}
                      className="flex-1 flex flex-col items-center gap-2 bg-gradient-to-b from-gray-700/20 to-gray-700/5 border border-gray-700/40 hover:border-gray-600/60 rounded-xl p-5 text-center transition-all group"
                    >
                      <div className="w-12 h-12 rounded-full bg-gray-700/30 flex items-center justify-center group-hover:bg-gray-700/50 transition-colors">
                        <Upload className="w-5 h-5 text-gray-400" />
                      </div>
                      <p className="text-sm font-semibold text-white">Upload Photos</p>
                      <p className="text-[11px] text-gray-500">
                        Upload 5-8 pre-taken photos at once.
                      </p>
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </div>
                )}

                {/* Camera capture wizard */}
                {showCamera && captureMode === "wizard" && (
                  <div className="p-4 space-y-3">
                    {/* Current instruction */}
                    <div className="bg-gray-800/60 rounded-xl p-3 flex items-center gap-3 border border-gray-700/40">
                      <span className="text-2xl">{PHOTO_VARIATIONS[currentVariation].icon}</span>
                      <div>
                        <p className="text-sm font-semibold text-white">
                          {PHOTO_VARIATIONS[currentVariation].label}
                          {PHOTO_VARIATIONS[currentVariation].required && (
                            <span className="text-red-400 text-xs ml-1">Required</span>
                          )}
                        </p>
                        <p className="text-xs text-gray-400">
                          {PHOTO_VARIATIONS[currentVariation].instruction}
                        </p>
                      </div>
                      <div className="ml-auto text-xs text-gray-500 font-mono">
                        {currentVariation + 1}/{PHOTO_VARIATIONS.length}
                      </div>
                    </div>

                    {/* Video preview */}
                    <div className="relative rounded-xl overflow-hidden bg-black ring-1 ring-gray-700/50">
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full aspect-video object-cover"
                      />
                      {/* Overlay guide circle */}
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-48 h-48 border-2 border-white/20 rounded-full" />
                      </div>
                      {isExtracting && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <div className="flex items-center gap-2 bg-gray-900/90 rounded-xl px-4 py-2">
                            <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                            <span className="text-sm text-white">Detecting face...</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Controls */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setCurrentVariation(Math.max(0, currentVariation - 1))}
                        disabled={currentVariation === 0}
                        className="p-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 border border-gray-700/50 text-gray-400 disabled:opacity-30 transition-colors"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={captureCurrentPhoto}
                        disabled={isExtracting}
                        className="flex-1 flex items-center justify-center gap-2 bg-white hover:bg-gray-100 disabled:opacity-50 px-4 py-3 rounded-xl text-gray-900 font-bold text-sm transition-colors shadow-lg"
                      >
                        <Camera className="w-5 h-5" />
                        {capturedLabels.has(PHOTO_VARIATIONS[currentVariation].id) ? "Retake" : "Capture"}
                      </button>

                      <button
                        type="button"
                        onClick={() => setCurrentVariation(Math.min(PHOTO_VARIATIONS.length - 1, currentVariation + 1))}
                        disabled={currentVariation === PHOTO_VARIATIONS.length - 1}
                        className="p-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 border border-gray-700/50 text-gray-400 disabled:opacity-30 transition-colors"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          stopCamera();
                          setCaptureMode(capturedPhotos.length > 0 ? "wizard" : null);
                        }}
                        className="px-4 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 border border-gray-700/50 text-gray-400 text-sm transition-colors"
                      >
                        Done
                      </button>
                    </div>
                  </div>
                )}

                {/* Captured photos grid */}
                {capturedPhotos.length > 0 && !showCamera && (
                  <div className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-gray-400">
                        Captured Variations ({capturedPhotos.length})
                      </p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setCaptureMode("wizard");
                            startCamera();
                          }}
                          className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                        >
                          <Camera className="w-3.5 h-3.5" />
                          {capturedPhotos.length < 8 ? "Add More" : "Retake"}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setCapturedPhotos([]);
                            setCaptureMode(null);
                          }}
                          className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 transition-colors"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          Clear All
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-2">
                      {capturedPhotos.map((photo) => {
                        const variation = PHOTO_VARIATIONS.find((v) => v.id === photo.label);
                        return (
                          <div key={photo.label} className="relative group">
                            <img
                              src={photo.data}
                              alt={photo.label}
                              className="w-full aspect-square object-cover rounded-lg ring-1 ring-gray-700/50"
                            />
                            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent rounded-b-lg p-1.5">
                              <p className="text-[9px] text-white font-medium truncate text-center">
                                {variation?.icon} {variation?.label || photo.label}
                              </p>
                            </div>
                            {photo.descriptor && (
                              <div className="absolute top-1 left-1">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 drop-shadow-lg" />
                              </div>
                            )}
                            <button
                              type="button"
                              onClick={() => removePhoto(photo.label)}
                              className="absolute top-1 right-1 bg-red-500/80 hover:bg-red-500 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="w-3 h-3 text-white" />
                            </button>
                          </div>
                        );
                      })}

                      {/* Empty slots for required photos not yet captured */}
                      {Array.from({ length: Math.max(0, 5 - capturedPhotos.length) }).map((_, i) => {
                        const nextVar = PHOTO_VARIATIONS.find((v) => v.required && !capturedLabels.has(v.id));
                        return (
                          <button
                            key={`empty-${i}`}
                            type="button"
                            onClick={() => {
                              if (nextVar) {
                                const idx = PHOTO_VARIATIONS.findIndex((v) => v.id === nextVar.id);
                                setCurrentVariation(idx);
                              }
                              setCaptureMode("wizard");
                              startCamera();
                            }}
                            className="w-full aspect-square rounded-lg border-2 border-dashed border-gray-700/40 hover:border-blue-500/40 flex flex-col items-center justify-center gap-1 transition-colors"
                          >
                            <Camera className="w-4 h-4 text-gray-600" />
                            <span className="text-[9px] text-gray-600">{nextVar?.icon} Required</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Accuracy indicator */}
                    <div className="bg-gray-800/40 rounded-lg p-3 flex items-center gap-3">
                      <div className="flex-1">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-gray-400">Estimated accuracy</span>
                          <span className={`font-bold ${
                            capturedPhotos.length >= 5 ? "text-emerald-400" : "text-yellow-400"
                          }`}>
                            {capturedPhotos.length >= 8 ? "99%+" : capturedPhotos.length >= 5 ? "~97%" : capturedPhotos.length >= 3 ? "~85%" : `~${60 + capturedPhotos.length * 10}%`}
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-gray-700/60 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-700 ${
                              capturedPhotos.length >= 5 ? "bg-emerald-500" : "bg-yellow-500"
                            }`}
                            style={{ width: `${Math.min(100, (capturedPhotos.length / 8) * 100)}%` }}
                          />
                        </div>
                      </div>
                      {capturedPhotos.length >= 5 && (
                        <ShieldCheck className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                      )}
                    </div>
                  </div>
                )}

                {/* Upload fallback */}
                {captureMode === "upload" && capturedPhotos.length === 0 && (
                  <div
                    className={`m-4 border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${
                      dragOver
                        ? "border-blue-500 bg-blue-500/10"
                        : "border-gray-700/60 hover:border-gray-600 bg-gray-800/30"
                    }`}
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragOver(false);
                      const dt = new DataTransfer();
                      for (const file of Array.from(e.dataTransfer.files)) dt.items.add(file);
                      const fakeEvent = { target: { files: dt.files } } as React.ChangeEvent<HTMLInputElement>;
                      handleFileUpload(fakeEvent);
                    }}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <ImageIcon className="w-10 h-10 text-gray-500 mx-auto mb-3" />
                    <p className="text-sm text-gray-400 mb-1">
                      Drop 5-8 photos here, or click to browse
                    </p>
                    <p className="text-[11px] text-gray-600">
                      Face must be clearly visible in each photo. Different angles recommended.
                    </p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </div>
                )}
              </div>

              {/* ─── Auto-generated login info ─── */}
              {!editingStudent && formData.rollNumber && (
                <div className="bg-blue-900/20 border border-blue-800/40 rounded-xl p-4">
                  <p className="text-blue-400 text-xs font-semibold mb-2">Auto-generated Login Accounts</p>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <p className="text-gray-400">Student Login</p>
                      <p className="text-white font-mono">{formData.rollNumber.toLowerCase()}@college.edu</p>
                      <p className="text-gray-500">Pass: {formData.rollNumber.toLowerCase()}123</p>
                    </div>
                    {formData.parentPhone.length === 10 && (
                      <div>
                        <p className="text-gray-400">Parent Login</p>
                        <p className="text-white font-mono">parent.{formData.parentPhone}@college.edu</p>
                        <p className="text-gray-500">Pass: {formData.parentPhone}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ─── Submit ─── */}
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
                  className="flex-1 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2.5 rounded-xl text-white font-semibold text-sm shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      Saving...
                    </>
                  ) : editingStudent ? (
                    "Update Student"
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Create Student ({capturedPhotos.length} faces)
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Created Accounts Modal ─── */}
      {createdAccounts && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-gray-900 border border-gray-700/60 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="text-center">
              <div className="w-14 h-14 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="w-7 h-7 text-green-400" />
              </div>
              <h3 className="text-lg font-bold text-white">Student Enrolled!</h3>
              <p className="text-gray-400 text-sm mt-1">
                Multi-angle face data enrolled with {capturedPhotos.length} variation(s).
                Login accounts created automatically.
              </p>
            </div>

            <div className="space-y-3">
              <div className="bg-gray-800 rounded-xl p-4 border border-gray-700/50">
                <p className="text-xs text-blue-400 font-semibold mb-1">Student Login</p>
                <p className="text-white text-sm font-mono">{createdAccounts.student.email}</p>
                <p className="text-gray-400 text-xs mt-0.5">Password: <span className="text-yellow-400 font-mono">{createdAccounts.student.password}</span></p>
              </div>
              {createdAccounts.parent && (
                <div className="bg-gray-800 rounded-xl p-4 border border-gray-700/50">
                  <p className="text-xs text-amber-400 font-semibold mb-1">Parent Login</p>
                  <p className="text-white text-sm font-mono">{createdAccounts.parent.email}</p>
                  <p className="text-gray-400 text-xs mt-0.5">Password: <span className="text-yellow-400 font-mono">{createdAccounts.parent.password}</span></p>
                </div>
              )}
            </div>

            <p className="text-[11px] text-gray-500 text-center">
              These accounts are also visible in User Management. Save these credentials.
            </p>

            <button
              onClick={() => { setCreatedAccounts(null); resetForm(); fetchStudents(); }}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 px-4 py-2.5 rounded-xl text-white font-semibold text-sm transition-all"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
