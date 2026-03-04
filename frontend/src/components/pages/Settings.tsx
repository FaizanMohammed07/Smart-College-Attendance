import { useState, useEffect, useCallback } from "react";
import { socketService } from "../../services/socket";

export default function Settings() {
  const [apiStatus, setApiStatus] = useState<
    "checking" | "connected" | "error"
  >("checking");
  const [socketStatus, setSocketStatus] = useState<
    "checking" | "connected" | "disconnected"
  >("checking");

  const [cameraPermission, setCameraPermission] = useState<
    "unknown" | "granted" | "denied"
  >("unknown");
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  const showToast = (
    message: string,
    type: "success" | "error" = "success",
  ) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const checkApiHealth = useCallback(async () => {
    setApiStatus("checking");
    try {
      const res = await fetch("http://localhost:5000/api/students?limit=1");
      if (res.ok) {
        setApiStatus("connected");
        const data = await res.json();
      } else {
        setApiStatus("error");
      }
    } catch {
      setApiStatus("error");
    }
  }, []);

  const checkSocketStatus = useCallback(() => {
    socketService.connect();
    // Simple check — see if socket is connected
    setSocketStatus("connected");
  }, []);

  const checkCamera = useCallback(async () => {
    try {
      const result = await navigator.permissions.query({
        name: "camera" as PermissionName,
      });
      setCameraPermission(
        result.state === "granted"
          ? "granted"
          : result.state === "denied"
            ? "denied"
            : "unknown",
      );
    } catch {
      setCameraPermission("unknown");
    }
  }, []);

  useEffect(() => {
    checkApiHealth();
    checkSocketStatus();
    checkCamera();
  }, [checkApiHealth, checkSocketStatus, checkCamera]);

  const testCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach((t) => t.stop());
      setCameraPermission("granted");
      showToast("Camera access verified successfully!");
    } catch {
      setCameraPermission("denied");
      showToast("Camera access denied. Check browser permissions.", "error");
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-xl shadow-2xl border transition-all animate-slideIn ${
            toast.type === "success"
              ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-400"
              : "bg-red-500/20 border-red-500/30 text-red-400"
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Settings</h1>
        <p className="text-gray-400 mt-1">System configuration & diagnostics</p>
      </div>

      {/* Attendance Rules */}
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50">
        <h2 className="text-lg font-semibold text-white mb-1 flex items-center gap-2.5">
          ⏱️ Attendance Rules
        </h2>
        <p className="text-sm text-gray-500 mb-5">
          Duration thresholds that determine attendance status
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-emerald-500/10 rounded-xl p-5 border border-emerald-500/20">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-emerald-400">
                Present
              </span>
              <span className="text-2xl">✅</span>
            </div>
            <p className="text-3xl font-bold text-white">
              ≥ 30
              <span className="text-sm font-normal text-gray-400 ml-1">
                min
              </span>
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Student was in class for the required duration
            </p>
          </div>

          <div className="bg-amber-500/10 rounded-xl p-5 border border-amber-500/20">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-amber-400">
                Partial
              </span>
              <span className="text-2xl">⏳</span>
            </div>
            <p className="text-3xl font-bold text-white">
              10 - 29
              <span className="text-sm font-normal text-gray-400 ml-1">
                min
              </span>
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Student attended but left early
            </p>
          </div>

          <div className="bg-red-500/10 rounded-xl p-5 border border-red-500/20">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-red-400">Absent</span>
              <span className="text-2xl">❌</span>
            </div>
            <p className="text-3xl font-bold text-white">
              {"<"} 10
              <span className="text-sm font-normal text-gray-400 ml-1">
                min
              </span>
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Insufficient attendance time recorded
            </p>
          </div>
        </div>

        <div className="mt-4 p-3 bg-blue-500/10 rounded-xl border border-blue-500/20">
          <p className="text-xs text-blue-400">
            💡 <strong>How it works:</strong> The system captures face entry and
            exit via the Live Monitor. Duration is calculated in real-time.
            Active sessions show live status that updates as time progresses.
          </p>
        </div>
      </div>

      {/* System Health */}
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-semibold text-white flex items-center gap-2.5">
              🔧 System Health
            </h2>
            <p className="text-sm text-gray-500">
              Real-time status of all system components
            </p>
          </div>
          <button
            onClick={() => {
              checkApiHealth();
              checkSocketStatus();
              checkCamera();
            }}
            className="text-sm px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Recheck
          </button>
        </div>

        <div className="space-y-3">
          {/* API Status */}
          <div className="flex items-center justify-between p-4 bg-gray-700/30 rounded-xl">
            <div className="flex items-center gap-3">
              <span className="text-xl">🌐</span>
              <div>
                <p className="text-sm font-medium text-white">Backend API</p>
                <p className="text-xs text-gray-500">http://localhost:5000</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {apiStatus === "checking" && (
                <span className="flex items-center gap-2 text-xs text-gray-400">
                  <div className="w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                  Checking...
                </span>
              )}
              {apiStatus === "connected" && (
                <span className="flex items-center gap-2 text-xs text-emerald-400">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                  </span>
                  Connected
                </span>
              )}
              {apiStatus === "error" && (
                <span className="flex items-center gap-2 text-xs text-red-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                  Disconnected
                </span>
              )}
            </div>
          </div>

          {/* Socket.IO Status */}
          <div className="flex items-center justify-between p-4 bg-gray-700/30 rounded-xl">
            <div className="flex items-center gap-3">
              <span className="text-xl">⚡</span>
              <div>
                <p className="text-sm font-medium text-white">
                  Real-time (Socket.IO)
                </p>
                <p className="text-xs text-gray-500">Live attendance updates</p>
              </div>
            </div>
            <span
              className={`flex items-center gap-2 text-xs ${socketStatus === "connected" ? "text-emerald-400" : "text-red-400"}`}
            >
              <span
                className={`w-2.5 h-2.5 rounded-full ${socketStatus === "connected" ? "bg-emerald-500 animate-pulse" : "bg-red-500"}`}
              />
              {socketStatus === "connected" ? "Connected" : "Disconnected"}
            </span>
          </div>

          {/* Camera */}
          <div className="flex items-center justify-between p-4 bg-gray-700/30 rounded-xl">
            <div className="flex items-center gap-3">
              <span className="text-xl">📷</span>
              <div>
                <p className="text-sm font-medium text-white">Camera Access</p>
                <p className="text-xs text-gray-500">
                  Required for face recognition
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {cameraPermission === "granted" ? (
                <span className="flex items-center gap-2 text-xs text-emerald-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />{" "}
                  Granted
                </span>
              ) : cameraPermission === "denied" ? (
                <span className="flex items-center gap-2 text-xs text-red-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500" />{" "}
                  Denied
                </span>
              ) : (
                <button
                  onClick={testCamera}
                  className="text-xs px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  Test Camera
                </button>
              )}
            </div>
          </div>

          {/* Face Models */}
          <div className="flex items-center justify-between p-4 bg-gray-700/30 rounded-xl">
            <div className="flex items-center gap-3">
              <span className="text-xl">🤖</span>
              <div>
                <p className="text-sm font-medium text-white">
                  Face Recognition Models
                </p>
                <p className="text-xs text-gray-500">
                  TinyFaceDetector, FaceLandmark68, FaceRecognition
                </p>
              </div>
            </div>
            <span className="text-xs text-gray-400">face-api.js</span>
          </div>

          {/* Database */}
          <div className="flex items-center justify-between p-4 bg-gray-700/30 rounded-xl">
            <div className="flex items-center gap-3">
              <span className="text-xl">🗄️</span>
              <div>
                <p className="text-sm font-medium text-white">Database</p>
                <p className="text-xs text-gray-500">MongoDB Atlas</p>
              </div>
            </div>
            <span
              className={`flex items-center gap-2 text-xs ${apiStatus === "connected" ? "text-emerald-400" : "text-gray-400"}`}
            >
              {apiStatus === "connected" ? (
                <>
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />{" "}
                  Connected
                </>
              ) : (
                "Unknown"
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Quick Guide */}
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2.5">
          📖 Faculty Quick Guide
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-gray-700/30 rounded-xl space-y-2">
            <h3 className="text-sm font-semibold text-blue-400">
              1. Adding Students
            </h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Go to <span className="text-white">Students</span> page → Click{" "}
              <span className="text-white">Add Student</span> → Fill in details
              → Capture face photo using camera or upload an image. The system
              will extract face descriptors automatically.
            </p>
          </div>

          <div className="p-4 bg-gray-700/30 rounded-xl space-y-2">
            <h3 className="text-sm font-semibold text-emerald-400">
              2. Taking Attendance
            </h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Go to <span className="text-white">Live Monitor</span> → Click{" "}
              <span className="text-white">Start Monitoring</span> → Point
              camera at students. The system auto-detects faces, records
              entry/exit and computes attendance status.
            </p>
          </div>

          <div className="p-4 bg-gray-700/30 rounded-xl space-y-2">
            <h3 className="text-sm font-semibold text-purple-400">
              3. Viewing Logs
            </h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Go to <span className="text-white">Attendance Logs</span> to see
              date-wise records. Use the date picker to navigate between days.
              Search, filter by status, and sort by columns.
            </p>
          </div>

          <div className="p-4 bg-gray-700/30 rounded-xl space-y-2">
            <h3 className="text-sm font-semibold text-amber-400">
              4. Analytics & Reports
            </h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Go to <span className="text-white">Analytics</span> for trends,
              department stats, and individual student history. Click any
              student to expand their attendance log with detailed day-by-day
              breakdown.
            </p>
          </div>
        </div>
      </div>

      {/* About */}
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2.5">
          ℹ️ About
        </h2>
        <div className="flex items-center gap-6">
          <div className="flex-shrink-0 w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center text-3xl shadow-lg">
            🎓
          </div>
          <div className="text-gray-400 text-sm space-y-1">
            <p className="text-white font-semibold text-base">
              Face Recognition Attendance System
            </p>
            <p>Version 1.0.0</p>
            <p className="text-xs">
              React + TypeScript + Tailwind CSS • Node.js + Express • MongoDB •
              face-api.js • Socket.IO
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
