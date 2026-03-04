import { useState, useEffect, useCallback } from "react";
import { analyticsAPI } from "../../services/api";
import { socketService } from "../../services/socket";

const API_BASE = "http://localhost:5000";

interface DashboardData {
  totalStudents: number;
  studentsPresent: number;
  studentsPartial: number;
  studentsAbsent: number;
  studentsActive: number;
  studentsNotAppeared: number;
  attendancePercentage: number;
  avgDuration: number;
  recentActivity: any[];
  departmentBreakdown: any[];
  notAppeared: any[];
  date: string;
}

// Gradient avatar for students without photos
const StudentAvatar = ({
  name,
  photoUrl,
  size = "sm",
}: {
  name: string;
  photoUrl?: string;
  size?: "sm" | "md" | "lg";
}) => {
  const sizeClasses = {
    sm: "w-8 h-8 text-xs",
    md: "w-10 h-10 text-sm",
    lg: "w-12 h-12 text-base",
  };
  const gradients = [
    "from-blue-400 to-indigo-600",
    "from-emerald-400 to-teal-600",
    "from-orange-400 to-red-600",
    "from-purple-400 to-pink-600",
    "from-cyan-400 to-blue-600",
    "from-amber-400 to-orange-600",
  ];
  const initials =
    name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase() || "?";
  const gradient = gradients[name?.charCodeAt(0) % gradients.length || 0];

  if (photoUrl) {
    return (
      <img
        src={photoUrl.startsWith("http") ? photoUrl : `${API_BASE}${photoUrl}`}
        alt={name}
        className={`${sizeClasses[size]} rounded-full object-cover border-2 border-white/10 shadow-sm`}
      />
    );
  }
  return (
    <div
      className={`${sizeClasses[size]} rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-bold shadow-sm border-2 border-white/10`}
    >
      {initials}
    </div>
  );
};

// Attendance ring chart component
const AttendanceRing = ({
  percentage,
  size = 120,
}: {
  percentage: number;
  size?: number;
}) => {
  const radius = (size - 16) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDash = (percentage / 100) * circumference;
  const color =
    percentage >= 75 ? "#10b981" : percentage >= 50 ? "#f59e0b" : "#ef4444";

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#1e293b"
          strokeWidth="10"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - strokeDash}
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-2xl font-bold text-white">{percentage}%</span>
        <span className="text-xs text-gray-400">today</span>
      </div>
    </div>
  );
};

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await analyticsAPI.getDashboard();
      if (res.data.success) setData(res.data.data);
    } catch (err) {
      console.error("Failed to fetch dashboard:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();

    // Live clock
    const clockInterval = setInterval(() => setCurrentTime(new Date()), 1000);

    // Refresh on attendance events
    socketService.connect();
    socketService.on("attendance:entry", fetchDashboard);
    socketService.on("attendance:exit", fetchDashboard);

    // Auto-refresh every 30s
    const refreshInterval = setInterval(fetchDashboard, 30000);

    return () => {
      clearInterval(clockInterval);
      clearInterval(refreshInterval);
      socketService.off("attendance:entry", fetchDashboard);
      socketService.off("attendance:exit", fetchDashboard);
    };
  }, [fetchDashboard]);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getTimeSince = (time: string) => {
    const mins = Math.floor((Date.now() - new Date(time).getTime()) / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    return `${hrs}h ${mins % 60}m ago`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-gray-400">
          Failed to load dashboard data. Make sure the server is running.
        </p>
      </div>
    );
  }

  const statCards = [
    {
      label: "Total Students",
      value: data.totalStudents,
      icon: "👥",
      color: "from-blue-600/20 to-blue-800/20 border-blue-500/30",
      textColor: "text-blue-400",
    },
    {
      label: "Present Today",
      value: data.studentsPresent,
      icon: "✅",
      color: "from-emerald-600/20 to-emerald-800/20 border-emerald-500/30",
      textColor: "text-emerald-400",
    },
    {
      label: "Partial",
      value: data.studentsPartial,
      icon: "⏳",
      color: "from-amber-600/20 to-amber-800/20 border-amber-500/30",
      textColor: "text-amber-400",
    },
    {
      label: "Currently Active",
      value: data.studentsActive,
      icon: "📡",
      color: "from-purple-600/20 to-purple-800/20 border-purple-500/30",
      textColor: "text-purple-400",
      pulse: data.studentsActive > 0,
    },
    {
      label: "Not Appeared",
      value: data.studentsNotAppeared,
      icon: "🚫",
      color: "from-red-600/20 to-red-800/20 border-red-500/30",
      textColor: "text-red-400",
    },
    {
      label: "Avg Duration",
      value: `${data.avgDuration}m`,
      icon: "⏱️",
      color: "from-cyan-600/20 to-cyan-800/20 border-cyan-500/30",
      textColor: "text-cyan-400",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Dashboard</h1>
          <p className="text-gray-400 mt-1">{formatDate(currentTime)}</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl px-5 py-3 border border-gray-700/50">
            <span className="text-2xl font-mono font-bold text-white">
              {formatTime(currentTime)}
            </span>
          </div>
          <button
            onClick={fetchDashboard}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-xl transition-colors flex items-center gap-2"
          >
            <svg
              className="w-4 h-4"
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
            Refresh
          </button>
        </div>
      </div>

      {/* Top Row: Attendance Ring + Stat Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Attendance Ring */}
        <div className="lg:col-span-3 bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50 flex flex-col items-center justify-center">
          <h3 className="text-sm font-medium text-gray-400 mb-4">
            Today's Attendance
          </h3>
          <AttendanceRing percentage={data.attendancePercentage} size={140} />
          <div className="mt-4 flex gap-4 text-xs">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span className="text-gray-400">
                Present {data.studentsPresent}
              </span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span className="text-gray-400">
                Partial {data.studentsPartial}
              </span>
            </span>
          </div>
        </div>

        {/* Stat Cards Grid */}
        <div className="lg:col-span-9 grid grid-cols-2 md:grid-cols-3 gap-4">
          {statCards.map((card) => (
            <div
              key={card.label}
              className={`bg-gradient-to-br ${card.color} backdrop-blur-sm rounded-2xl p-5 border transition-transform hover:scale-[1.02]`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-2xl">{card.icon}</span>
                {card.pulse && (
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-purple-500" />
                  </span>
                )}
              </div>
              <p className={`text-3xl font-bold ${card.textColor}`}>
                {card.value}
              </p>
              <p className="text-sm text-gray-400 mt-1">{card.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Middle Row: Recent Activity + Department Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Live Activity Feed */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
              </span>
              Live Activity
            </h3>
            <span className="text-xs text-gray-500">
              {data.recentActivity.length} recent
            </span>
          </div>

          {data.recentActivity.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <svg
                className="w-12 h-12 mb-3 opacity-50"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="text-sm">No activity yet today</p>
              <p className="text-xs mt-1">
                Entries will appear here in real-time
              </p>
            </div>
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto pr-1 custom-scrollbar">
              {data.recentActivity.map((act) => (
                <div
                  key={act._id}
                  className="flex items-center gap-3 p-3 bg-gray-700/30 rounded-xl hover:bg-gray-700/50 transition-colors"
                >
                  <StudentAvatar
                    name={act.student?.name || "Unknown"}
                    photoUrl={act.student?.photoUrl}
                    size="md"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {act.student?.name || "Unknown"}
                    </p>
                    <p className="text-xs text-gray-400">
                      {act.student?.rollNumber} • {act.student?.department}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    {act.isActive ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                        In Class
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-600/30 text-gray-400 border border-gray-600/30">
                        Left • {act.duration}m
                      </span>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      {getTimeSince(act.entryTime)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Department Breakdown */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            🏫 Department Breakdown
          </h3>

          {data.departmentBreakdown.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <svg
                className="w-12 h-12 mb-3 opacity-50"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                />
              </svg>
              <p className="text-sm">No department data yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {data.departmentBreakdown.map((dept) => {
                const total = dept.total;
                const presentPct =
                  total > 0 ? Math.round((dept.present / total) * 100) : 0;
                const partialPct =
                  total > 0 ? Math.round((dept.partial / total) * 100) : 0;

                return (
                  <div key={dept.department} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-white">
                        {dept.department}
                      </span>
                      <div className="flex items-center gap-3 text-xs text-gray-400">
                        <span className="text-emerald-400">
                          {dept.present} present
                        </span>
                        <span className="text-amber-400">
                          {dept.partial} partial
                        </span>
                        <span className="text-red-400">
                          {dept.absent} absent
                        </span>
                      </div>
                    </div>
                    <div className="h-3 bg-gray-700 rounded-full overflow-hidden flex">
                      {presentPct > 0 && (
                        <div
                          className="h-full bg-emerald-500 transition-all duration-500"
                          style={{ width: `${presentPct}%` }}
                        />
                      )}
                      {partialPct > 0 && (
                        <div
                          className="h-full bg-amber-500 transition-all duration-500"
                          style={{ width: `${partialPct}%` }}
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Row: Not Appeared Students */}
      {data.notAppeared.length > 0 && (
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-red-500/20">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              ⚠️ Students Not Appeared Today
            </h3>
            <span className="text-sm bg-red-500/20 text-red-400 px-3 py-1 rounded-full border border-red-500/30">
              {data.notAppeared.length} / {data.totalStudents} missing
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {data.notAppeared.map((student: any) => (
              <div
                key={student._id}
                className="flex items-center gap-3 p-3 bg-gray-700/30 rounded-xl border border-gray-600/30 hover:border-red-500/30 transition-colors"
              >
                <StudentAvatar
                  name={student.name}
                  photoUrl={student.photoUrl}
                  size="sm"
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {student.name}
                  </p>
                  <p className="text-xs text-gray-400">
                    {student.rollNumber} • {student.department}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
