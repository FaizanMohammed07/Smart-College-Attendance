import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { attendanceAPI } from "../../services/api";
import { socketService } from "../../services/socket";

const API_BASE = "http://localhost:5000";

interface AttendanceLog {
  _id: string;
  studentId: {
    _id: string;
    name: string;
    rollNumber: string;
    department: string;
    photoUrl?: string;
  };
  date: string;
  entryTime: string;
  exitTime: string | null;
  duration: number;
  status: "Present" | "Partial" | "Absent";
  isActive: boolean;
}

const StudentAvatar = ({
  name,
  photoUrl,
}: {
  name: string;
  photoUrl?: string;
}) => {
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
        className="w-8 h-8 rounded-full object-cover border-2 border-white/10"
      />
    );
  }
  return (
    <div
      className={`w-8 h-8 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-white text-xs font-bold border-2 border-white/10`}
    >
      {initials}
    </div>
  );
};

export default function AttendanceLogs() {
  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterDate, setFilterDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [filterStatus, setFilterStatus] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<
    "name" | "entry" | "duration" | "status"
  >("entry");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced search — updates the actual query 200ms after the user stops typing
  const handleSearchChange = useCallback((value: string) => {
    setSearchInput(value);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setSearchQuery(value);
    }, 200);
  }, []);

  const fetchLogs = useCallback(async () => {
    try {
      const params: any = {};
      if (filterDate) params.date = filterDate;
      if (filterStatus) params.status = filterStatus;

      const response = await attendanceAPI.getLogs(params);
      setLogs(response.data.data);
    } catch (error) {
      console.error("Error fetching logs:", error);
    } finally {
      setLoading(false);
    }
  }, [filterDate, filterStatus]);

  useEffect(() => {
    fetchLogs();

    socketService.connect();
    socketService.on("attendance:entry", fetchLogs);
    socketService.on("attendance:exit", fetchLogs);

    return () => {
      socketService.off("attendance:entry", fetchLogs);
      socketService.off("attendance:exit", fetchLogs);
    };
  }, [fetchLogs]);

  function getStatusBadge(status: string, isActive: boolean) {
    if (isActive) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          Active
        </span>
      );
    }
    const styles: Record<string, string> = {
      Present: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
      Partial: "bg-amber-500/15 text-amber-400 border-amber-500/30",
      Absent: "bg-red-500/15 text-red-400 border-red-500/30",
    };
    return (
      <span
        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${styles[status] || "bg-gray-500/15 text-gray-400 border-gray-500/30"}`}
      >
        {status}
      </span>
    );
  }

  function formatTime(dateString: string) {
    return new Date(dateString).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function formatDuration(minutes: number) {
    if (minutes < 1) return "< 1m";
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}m`;
    return `${hours}h ${mins}m`;
  }

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const SortIcon = ({ field }: { field: typeof sortField }) => (
    <svg
      className={`w-3.5 h-3.5 transition-transform ${sortField === field ? "text-blue-400" : "text-gray-600"} ${sortField === field && sortDirection === "asc" ? "rotate-180" : ""}`}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 9l-7 7-7-7"
      />
    </svg>
  );

  // Filter and sort (memoized for performance)
  const filteredLogs = useMemo(() => {
    return logs
      .filter((log) => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
          log.studentId?.name?.toLowerCase().includes(q) ||
          log.studentId?.rollNumber?.toLowerCase().includes(q) ||
          log.studentId?.department?.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        const dir = sortDirection === "asc" ? 1 : -1;
        switch (sortField) {
          case "name":
            return (
              dir *
              (a.studentId?.name || "").localeCompare(b.studentId?.name || "")
            );
          case "entry":
            return (
              dir *
              (new Date(a.entryTime).getTime() -
                new Date(b.entryTime).getTime())
            );
          case "duration":
            return dir * (a.duration - b.duration);
          case "status":
            return dir * a.status.localeCompare(b.status);
          default:
            return 0;
        }
      });
  }, [logs, searchQuery, sortField, sortDirection]);

  const presentCount = logs.filter((l) => l.status === "Present").length;
  const partialCount = logs.filter((l) => l.status === "Partial").length;
  const absentCount = logs.filter((l) => l.status === "Absent").length;
  const activeCount = logs.filter((l) => l.isActive).length;
  const avgDuration =
    logs.length > 0
      ? Math.round(logs.reduce((sum, l) => sum + l.duration, 0) / logs.length)
      : 0;

  // Quick date navigation
  const goToDate = (offset: number) => {
    const d = new Date(filterDate);
    d.setDate(d.getDate() + offset);
    setFilterDate(d.toISOString().split("T")[0]);
  };

  const isToday = filterDate === new Date().toISOString().split("T")[0];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400">Loading attendance logs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Attendance Logs</h1>
          <p className="text-gray-400 mt-1">
            View and manage daily attendance records
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => goToDate(-1)}
            className="p-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-400 hover:text-white hover:border-gray-600 transition-colors"
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
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500 text-sm"
          />
          <button
            onClick={() => goToDate(1)}
            className="p-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-400 hover:text-white hover:border-gray-600 transition-colors"
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
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
          {!isToday && (
            <button
              onClick={() =>
                setFilterDate(new Date().toISOString().split("T")[0])
              }
              className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
            >
              Today
            </button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-gradient-to-br from-emerald-600/20 to-emerald-800/20 rounded-2xl p-4 border border-emerald-500/30">
          <p className="text-xs text-gray-400">Present</p>
          <p className="text-2xl font-bold text-emerald-400">{presentCount}</p>
        </div>
        <div className="bg-gradient-to-br from-amber-600/20 to-amber-800/20 rounded-2xl p-4 border border-amber-500/30">
          <p className="text-xs text-gray-400">Partial</p>
          <p className="text-2xl font-bold text-amber-400">{partialCount}</p>
        </div>
        <div className="bg-gradient-to-br from-red-600/20 to-red-800/20 rounded-2xl p-4 border border-red-500/30">
          <p className="text-xs text-gray-400">Absent</p>
          <p className="text-2xl font-bold text-red-400">{absentCount}</p>
        </div>
        <div className="bg-gradient-to-br from-green-600/20 to-green-800/20 rounded-2xl p-4 border border-green-500/30">
          <p className="text-xs text-gray-400">Active Now</p>
          <div className="flex items-center gap-2">
            <p className="text-2xl font-bold text-green-400">{activeCount}</p>
            {activeCount > 0 && (
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
              </span>
            )}
          </div>
        </div>
        <div className="bg-gradient-to-br from-cyan-600/20 to-cyan-800/20 rounded-2xl p-4 border border-cyan-500/30">
          <p className="text-xs text-gray-400">Avg Duration</p>
          <p className="text-2xl font-bold text-cyan-400">
            {formatDuration(avgDuration)}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        <div className="flex-1 relative group">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-blue-400 transition-colors"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" strokeLinecap="round" strokeWidth={2} />
          </svg>
          <input
            type="text"
            placeholder="Search by name, roll number, department..."
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full pl-10 pr-8 py-2.5 bg-gray-800/80 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-sm transition-all"
          />
          {searchInput && (
            <button
              onClick={() => {
                setSearchInput("");
                setSearchQuery("");
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
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
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
        </div>
        <div className="relative">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="appearance-none bg-gray-800/80 border border-gray-700 rounded-xl text-white pl-4 pr-10 py-2.5 text-sm outline-none focus:border-blue-500 cursor-pointer transition-all hover:border-gray-600"
          >
            <option value="">All Status</option>
            <option value="Present">Present</option>
            <option value="Partial">Partial</option>
            <option value="Absent">Absent</option>
          </select>
          <svg
            className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
        <span className="text-sm text-gray-500 self-center whitespace-nowrap">
          {filteredLogs.length} record{filteredLogs.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Table */}
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-900/50 border-b border-gray-700/50">
              <tr>
                <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  #
                </th>
                <th
                  className="px-4 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider cursor-pointer hover:text-white transition-colors"
                  onClick={() => handleSort("name")}
                >
                  <span className="flex items-center gap-1">
                    Student <SortIcon field="name" />
                  </span>
                </th>
                <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Department
                </th>
                <th
                  className="px-4 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider cursor-pointer hover:text-white transition-colors"
                  onClick={() => handleSort("entry")}
                >
                  <span className="flex items-center gap-1">
                    Entry <SortIcon field="entry" />
                  </span>
                </th>
                <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Exit
                </th>
                <th
                  className="px-4 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider cursor-pointer hover:text-white transition-colors"
                  onClick={() => handleSort("duration")}
                >
                  <span className="flex items-center gap-1">
                    Duration <SortIcon field="duration" />
                  </span>
                </th>
                <th
                  className="px-4 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider cursor-pointer hover:text-white transition-colors"
                  onClick={() => handleSort("status")}
                >
                  <span className="flex items-center gap-1">
                    Status <SortIcon field="status" />
                  </span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700/50">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center">
                    <svg
                      className="w-12 h-12 mx-auto mb-3 text-gray-700"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                      />
                    </svg>
                    <p className="text-gray-400">No attendance logs found</p>
                    <p className="text-xs text-gray-600 mt-1">
                      Try changing the date or filters
                    </p>
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log, idx) => (
                  <tr
                    key={log._id}
                    className="hover:bg-gray-700/30 transition-colors group"
                  >
                    <td className="px-4 py-3 text-xs font-mono text-gray-600">
                      {idx + 1}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <StudentAvatar
                          name={log.studentId?.name || "Unknown"}
                          photoUrl={log.studentId?.photoUrl}
                        />
                        <div>
                          <p className="text-sm font-medium text-white">
                            {log.studentId?.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {log.studentId?.rollNumber}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-400">
                      {log.studentId?.department}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-300 font-mono">
                      {formatTime(log.entryTime)}
                    </td>
                    <td className="px-4 py-3 text-sm font-mono">
                      {log.exitTime ? (
                        <span className="text-gray-300">
                          {formatTime(log.exitTime)}
                        </span>
                      ) : (
                        <span className="text-gray-600">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={`font-medium ${
                          log.duration >= 30
                            ? "text-emerald-400"
                            : log.duration >= 10
                              ? "text-amber-400"
                              : "text-red-400"
                        }`}
                      >
                        {formatDuration(log.duration)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {getStatusBadge(log.status, log.isActive)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
