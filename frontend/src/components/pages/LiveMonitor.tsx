import { useEffect, useState, useRef } from "react";
import {
  Video,
  VideoOff,
  Users,
  AlertCircle,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { studentsAPI, attendanceAPI } from "../../services/api";
import socketService from "../../services/socket";
import faceRecognitionService from "../../services/faceRecognition";

interface Student {
  _id: string;
  name: string;
  rollNumber: string;
  department: string;
  faceDescriptor: number[];
}

interface DetectedStudent {
  studentId: string;
  name: string;
  rollNumber: string;
  department: string;
  lastSeen: number; // timestamp ms
  entryTime: number; // timestamp ms
  confidence: number;
  entryRecorded: boolean;
}

export default function LiveMonitor() {
  const [isActive, setIsActive] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [detectedList, setDetectedList] = useState<DetectedStudent[]>([]);
  const [error, setError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const detectionIntervalRef = useRef<number | null>(null);
  const exitCheckIntervalRef = useRef<number | null>(null);
  const detectedMapRef = useRef<Map<string, DetectedStudent>>(new Map());
  const studentsRef = useRef<Student[]>([]);

  // Keep studentsRef in sync
  useEffect(() => {
    studentsRef.current = students;
  }, [students]);

  useEffect(() => {
    loadModels();
    fetchStudents();
    socketService.connect();
    return () => {
      stopMonitoring();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Attach stream to video when both are ready
  useEffect(() => {
    if (isActive && stream && videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(console.error);
      videoRef.current.onloadedmetadata = () => {
        startDetection();
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, stream]);

  // Manage exit-check interval
  useEffect(() => {
    if (isActive) {
      startExitCheck();
    }
    return () => stopExitCheck();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive]);

  async function loadModels() {
    try {
      const loaded = await faceRecognitionService.loadModels();
      setModelsLoaded(loaded);
    } catch (err) {
      console.error("Error loading models:", err);
      setError("Failed to load face detection models");
    }
  }

  async function fetchStudents() {
    try {
      const response = await studentsAPI.getFacesDescriptors();
      const data = response.data.data;
      setStudents(data);
      if (data.length > 0) {
        faceRecognitionService.loadLabeledDescriptors(data);
      }
    } catch (err) {
      console.error("Error fetching students:", err);
      setError("Failed to fetch students");
    }
  }

  async function startMonitoring() {
    if (!modelsLoaded) {
      setError("Face detection models are still loading. Please wait.");
      return;
    }
    if (studentsRef.current.length === 0) {
      setError(
        "No students with face data found. Please add students with photos first.",
      );
      return;
    }
    try {
      setError(null);
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: "user" },
      });
      setStream(mediaStream);
      setIsActive(true);
    } catch (err) {
      console.error("Error accessing camera:", err);
      setError("Unable to access camera. Please check permissions.");
    }
  }

  function stopMonitoring() {
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      setStream(null);
    }
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }
    stopExitCheck();
    setIsActive(false);
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext("2d");
      ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  }

  function startDetection() {
    if (!videoRef.current || !canvasRef.current) return;
    if (detectionIntervalRef.current)
      clearInterval(detectionIntervalRef.current);

    detectionIntervalRef.current = window.setInterval(async () => {
      if (!videoRef.current || !canvasRef.current) return;
      try {
        const results = await faceRecognitionService.detectFaces(
          videoRef.current,
          canvasRef.current,
        );
        if (results.length > 0) {
          for (const result of results) {
            await handleFaceDetected(result.studentId, result.confidence);
          }
        }
      } catch (err) {
        console.error("Detection error:", err);
      }
    }, 2000);
  }

  async function handleFaceDetected(studentId: string, confidence: number) {
    const student = studentsRef.current.find((s) => s._id === studentId);
    if (!student) return;

    const now = Date.now();
    const map = detectedMapRef.current;
    const existing = map.get(studentId);

    if (!existing) {
      // New face — record entry via API
      const entry: DetectedStudent = {
        studentId: student._id,
        name: student.name,
        rollNumber: student.rollNumber,
        department: student.department,
        lastSeen: now,
        entryTime: now,
        confidence,
        entryRecorded: false,
      };
      map.set(studentId, entry);

      try {
        await attendanceAPI.recordEntry(studentId);
        entry.entryRecorded = true;
        socketService.emit("face:detected", { studentId, confidence });
      } catch (err) {
        console.error("Error recording entry:", err);
      }
    } else {
      // Already seen — update last-seen timestamp
      existing.lastSeen = now;
      existing.confidence = confidence;
    }

    syncListFromMap();
  }

  function syncListFromMap() {
    setDetectedList(Array.from(detectedMapRef.current.values()));
  }

  function startExitCheck() {
    if (exitCheckIntervalRef.current) return;

    exitCheckIntervalRef.current = window.setInterval(() => {
      const now = Date.now();
      const EXIT_THRESHOLD = 30_000; // 30 seconds not seen → mark exit
      const map = detectedMapRef.current;
      let changed = false;

      map.forEach(async (detected, studentId) => {
        if (now - detected.lastSeen > EXIT_THRESHOLD) {
          map.delete(studentId);
          changed = true;
          try {
            await attendanceAPI.recordExit(studentId);
          } catch (err) {
            console.error("Error recording exit:", err);
          }
        }
      });

      if (changed) syncListFromMap();
    }, 5000);
  }

  function stopExitCheck() {
    if (exitCheckIntervalRef.current) {
      clearInterval(exitCheckIntervalRef.current);
      exitCheckIntervalRef.current = null;
    }
  }

  function formatElapsed(entryMs: number) {
    const seconds = Math.floor((Date.now() - entryMs) / 1000);
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  }

  return (
    <div className="p-6 md:p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
          Live Monitor
        </h1>
        <p className="text-gray-500 mt-1 text-sm">
          Real-time face recognition & attendance tracking
        </p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <span className="text-red-400 text-sm">{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Camera feed */}
        <div className="lg:col-span-2">
          <div className="bg-gradient-to-b from-gray-800/80 to-gray-800/40 rounded-2xl border border-gray-700/40 overflow-hidden">
            <div className="flex items-center justify-between p-5 pb-0">
              <h2 className="text-lg font-semibold text-white">Camera Feed</h2>
              <button
                onClick={isActive ? stopMonitoring : startMonitoring}
                disabled={!modelsLoaded}
                className={`flex items-center gap-2 px-5 py-2 rounded-xl font-semibold text-sm transition-all shadow-lg ${
                  isActive
                    ? "bg-red-500 hover:bg-red-600 text-white shadow-red-500/20"
                    : "bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white shadow-blue-600/20"
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {isActive ? (
                  <>
                    <VideoOff className="w-4 h-4" />
                    Stop
                  </>
                ) : (
                  <>
                    <Video className="w-4 h-4" />
                    Start Monitoring
                  </>
                )}
              </button>
            </div>

            <div className="p-5">
              <div className="relative bg-black rounded-xl overflow-hidden aspect-video">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                <canvas
                  ref={canvasRef}
                  className="absolute top-0 left-0 w-full h-full"
                />
                {!isActive && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80">
                    <div className="text-center">
                      <Video className="w-14 h-14 text-gray-600 mx-auto mb-3" />
                      <p className="text-gray-500 text-sm">
                        {modelsLoaded
                          ? "Click Start Monitoring to begin"
                          : "Loading models..."}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Status bar */}
            <div className="px-5 pb-4 flex items-center gap-5 text-xs">
              <div className="flex items-center gap-2">
                <div
                  className={`w-2 h-2 rounded-full ${
                    modelsLoaded ? "bg-emerald-500" : "bg-yellow-500"
                  } animate-pulse`}
                />
                <span className="text-gray-500">
                  {modelsLoaded ? "Models ready" : "Loading models..."}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-3.5 h-3.5 text-gray-500" />
                <span className="text-gray-500">
                  {students.length} registered
                </span>
              </div>
              {isActive && (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                  <span className="text-gray-500">Scanning...</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Detected panel */}
        <div className="bg-gradient-to-b from-gray-800/80 to-gray-800/40 rounded-2xl border border-gray-700/40 flex flex-col max-h-[600px]">
          <div className="p-5 pb-3 border-b border-gray-700/40">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Detected</h2>
              {detectedList.length > 0 && (
                <span className="bg-blue-500/15 text-blue-400 text-[11px] font-bold px-2 py-0.5 rounded-full">
                  {detectedList.length}
                </span>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {detectedList.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Users className="w-10 h-10 text-gray-700 mb-3" />
                <p className="text-gray-600 text-sm">
                  {isActive
                    ? "Scanning for faces..."
                    : "Start monitoring to detect students"}
                </p>
              </div>
            ) : (
              detectedList.map((d) => (
                <div
                  key={d.studentId}
                  className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/40 hover:border-gray-600/60 transition-colors"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <h3 className="font-semibold text-white text-sm truncate">
                      {d.name}
                    </h3>
                    <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                      <CheckCircle2 className="w-3 h-3" />
                      {Math.round(d.confidence * 100)}%
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 font-mono">
                    {d.rollNumber}
                  </p>
                  <p className="text-xs text-gray-500">{d.department}</p>
                  <div className="flex items-center gap-1.5 mt-2 text-[11px] text-gray-500">
                    <Clock className="w-3 h-3" />
                    In class: {formatElapsed(d.entryTime)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
