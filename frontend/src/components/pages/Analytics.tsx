import { useEffect, useState } from "react";
import { analyticsAPI } from "../../services/api";

const API_BASE = "http://localhost:5000";

interface TrendData {
  date: string;
  present: number;
  partial: number;
  absent: number;
  appeared: number;
  total: number;
  percentage: number;
}

interface DepartmentStat {
  department: string;
  totalStudents: number;
  present: number;
  partial: number;
  appeared: number;
  percentage: number;
}

interface StudentSummary {
  _id: string;
  name: string;
  rollNumber: string;
  department: string;
  photoUrl?: string;
  totalDays: number;
  presentDays: number;
  partialDays: number;
  absentDays: number;
  percentage: number;
}

// Student avatar helper
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
        className="w-9 h-9 rounded-full object-cover border-2 border-white/10"
      />
    );
  }
  return (
    <div
      className={`w-9 h-9 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-white text-xs font-bold border-2 border-white/10`}
    >
      {initials}
    </div>
  );
};

type Tab = "trends" | "departments" | "students";

export default function Analytics() {
  const [activeTab, setActiveTab] = useState<Tab>("trends");
  const [trendDays, setTrendDays] = useState(7);
  const [summaryDays, setSummaryDays] = useState(30);
  const [trends, setTrends] = useState<TrendData[]>([]);
  const [departments, setDepartments] = useState<DepartmentStat[]>([]);
  const [students, setStudents] = useState<StudentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [studentSearch, setStudentSearch] = useState("");
  const [sortBy, setSortBy] = useState<"percentage" | "name" | "department">(
    "percentage",
  );
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null);
  const [studentHistory, setStudentHistory] = useState<any>(null);

  useEffect(() => {
    fetchTrends();
    fetchDepartments();
    fetchStudents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchTrends();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trendDays]);

  useEffect(() => {
    fetchStudents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [summaryDays]);

  async function fetchTrends() {
    try {
      const res = await analyticsAPI.getTrends(trendDays);
      setTrends(res.data.data);
    } catch (error) {
      console.error("Error fetching trends:", error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchDepartments() {
    try {
      const res = await analyticsAPI.getDepartments();
      setDepartments(res.data.data);
    } catch (error) {
      console.error("Error fetching departments:", error);
    }
  }

  async function fetchStudents() {
    try {
      const res = await analyticsAPI.getStudentsSummary(summaryDays);
      setStudents(res.data.data);
    } catch (error) {
      console.error("Error fetching student summaries:", error);
    }
  }

  async function viewStudentHistory(studentId: string) {
    if (expandedStudent === studentId) {
      setExpandedStudent(null);
      setStudentHistory(null);
      return;
    }
    try {
      const res = await analyticsAPI.getStudentHistory(studentId, {
        limit: 15,
      });
      setStudentHistory(res.data.data);
      setExpandedStudent(studentId);
    } catch (error) {
      console.error("Error fetching student history:", error);
    }
  }

  const getStatusColor = (pct: number) => {
    if (pct >= 75) return "text-emerald-400";
    if (pct >= 50) return "text-amber-400";
    return "text-red-400";
  };

  const getBarColor = (pct: number) => {
    if (pct >= 75) return "bg-emerald-500";
    if (pct >= 50) return "bg-amber-500";
    return "bg-red-500";
  };

  const filteredStudents = students
    .filter(
      (s) =>
        s.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
        s.rollNumber.toLowerCase().includes(studentSearch.toLowerCase()) ||
        s.department.toLowerCase().includes(studentSearch.toLowerCase()),
    )
    .sort((a, b) => {
      if (sortBy === "percentage") return b.percentage - a.percentage;
      if (sortBy === "name") return a.name.localeCompare(b.name);
      return a.department.localeCompare(b.department);
    });

  const lowAttendance = students.filter(
    (s) => s.totalDays > 0 && s.percentage < 50,
  );
  const topPerformers = students.filter(
    (s) => s.totalDays > 0 && s.percentage >= 90,
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400">Loading analytics...</p>
        </div>
      </div>
    );
  }

  const tabs = [
    {
      id: "trends" as Tab,
      label: "📈 Trends",
      desc: "Daily attendance patterns",
    },
    {
      id: "departments" as Tab,
      label: "🏫 Departments",
      desc: "Department-wise stats",
    },
    {
      id: "students" as Tab,
      label: "👤 Students",
      desc: "Individual performance",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Analytics</h1>
          <p className="text-gray-400 mt-1">
            Attendance trends, insights & student performance
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-emerald-600/20 to-emerald-800/20 rounded-2xl p-4 border border-emerald-500/30">
          <p className="text-xs text-gray-400 mb-1">Top Performers</p>
          <p className="text-2xl font-bold text-emerald-400">
            {topPerformers.length}
          </p>
          <p className="text-xs text-gray-500 mt-1">≥90% attendance</p>
        </div>
        <div className="bg-gradient-to-br from-red-600/20 to-red-800/20 rounded-2xl p-4 border border-red-500/30">
          <p className="text-xs text-gray-400 mb-1">Low Attendance</p>
          <p className="text-2xl font-bold text-red-400">
            {lowAttendance.length}
          </p>
          <p className="text-xs text-gray-500 mt-1">&lt;50% attendance</p>
        </div>
        <div className="bg-gradient-to-br from-blue-600/20 to-blue-800/20 rounded-2xl p-4 border border-blue-500/30">
          <p className="text-xs text-gray-400 mb-1">Departments</p>
          <p className="text-2xl font-bold text-blue-400">
            {departments.length}
          </p>
          <p className="text-xs text-gray-500 mt-1">tracked today</p>
        </div>
        <div className="bg-gradient-to-br from-purple-600/20 to-purple-800/20 rounded-2xl p-4 border border-purple-500/30">
          <p className="text-xs text-gray-400 mb-1">Total Students</p>
          <p className="text-2xl font-bold text-purple-400">
            {students.length}
          </p>
          <p className="text-xs text-gray-500 mt-1">enrolled</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 bg-gray-800/50 rounded-xl p-1.5 border border-gray-700/50">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.id
                ? "bg-blue-600 text-white shadow-lg"
                : "text-gray-400 hover:text-white hover:bg-gray-700/50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Trends Tab */}
      {activeTab === "trends" && (
        <div className="space-y-6">
          {/* Period Selector */}
          <div className="flex items-center gap-2">
            {[7, 14, 30].map((d) => (
              <button
                key={d}
                onClick={() => setTrendDays(d)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  trendDays === d
                    ? "bg-blue-600 text-white"
                    : "bg-gray-800 text-gray-400 hover:text-white border border-gray-700"
                }`}
              >
                {d} Days
              </button>
            ))}
          </div>

          {/* Trend Chart */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50">
            <h3 className="text-lg font-semibold text-white mb-6">
              Attendance Trend
            </h3>

            {trends.length === 0 ? (
              <p className="text-gray-400 text-center py-12">
                No trend data available
              </p>
            ) : (
              <>
                {/* Visual Bar Chart */}
                <div className="flex items-end gap-2 h-48 mb-6">
                  {trends.map((trend) => {
                    const maxAppeared = Math.max(
                      ...trends.map((t) => t.appeared || t.total),
                      1,
                    );
                    const barHeight =
                      maxAppeared > 0
                        ? (trend.appeared / maxAppeared) * 100
                        : 0;
                    const date = new Date(trend.date + "T00:00:00");
                    const dayName = date.toLocaleDateString("en-US", {
                      weekday: "short",
                    });
                    const isToday =
                      trend.date === new Date().toISOString().split("T")[0];

                    return (
                      <div
                        key={trend.date}
                        className="flex-1 flex flex-col items-center gap-1"
                      >
                        <span
                          className={`text-xs font-medium ${getStatusColor(trend.percentage)}`}
                        >
                          {trend.percentage}%
                        </span>
                        <div
                          className="w-full relative"
                          style={{ height: `${Math.max(barHeight, 4)}%` }}
                        >
                          {/* Stacked bar */}
                          <div className="absolute inset-0 overflow-hidden rounded-t-lg flex flex-col-reverse">
                            {trend.absent > 0 && (
                              <div
                                className="bg-red-500/80 w-full"
                                style={{
                                  height: `${(trend.absent / trend.appeared) * 100}%`,
                                }}
                              />
                            )}
                            {trend.partial > 0 && (
                              <div
                                className="bg-amber-500/80 w-full"
                                style={{
                                  height: `${(trend.partial / trend.appeared) * 100}%`,
                                }}
                              />
                            )}
                            {trend.present > 0 && (
                              <div
                                className="bg-emerald-500/80 w-full"
                                style={{
                                  height: `${(trend.present / trend.appeared) * 100}%`,
                                }}
                              />
                            )}
                          </div>
                        </div>
                        <span
                          className={`text-xs mt-1 ${isToday ? "text-blue-400 font-bold" : "text-gray-500"}`}
                        >
                          {dayName}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Legend */}
                <div className="flex items-center justify-center gap-6 text-xs text-gray-400 mb-6">
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-emerald-500" /> Present
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-amber-500" /> Partial
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-red-500" /> Absent
                  </span>
                </div>

                {/* Detailed List */}
                <div className="space-y-3">
                  {trends.map((trend) => {
                    const date = new Date(trend.date + "T00:00:00");
                    const dayName = date.toLocaleDateString("en-US", {
                      weekday: "short",
                    });
                    const monthDay = date.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    });
                    const isToday =
                      trend.date === new Date().toISOString().split("T")[0];

                    return (
                      <div
                        key={`detail-${trend.date}`}
                        className={`flex items-center gap-4 p-3 rounded-xl ${
                          isToday
                            ? "bg-blue-500/10 border border-blue-500/30"
                            : "bg-gray-700/30"
                        }`}
                      >
                        <div className="w-24 flex-shrink-0">
                          <p
                            className={`text-sm font-medium ${isToday ? "text-blue-400" : "text-white"}`}
                          >
                            {dayName}, {monthDay}
                          </p>
                          {isToday && (
                            <p className="text-xs text-blue-400/60">Today</p>
                          )}
                        </div>
                        <div className="flex-1 h-2.5 bg-gray-700 rounded-full overflow-hidden flex">
                          <div
                            className="bg-emerald-500 h-full transition-all"
                            style={{
                              width: `${trend.appeared > 0 ? (trend.present / trend.appeared) * 100 : 0}%`,
                            }}
                          />
                          <div
                            className="bg-amber-500 h-full transition-all"
                            style={{
                              width: `${trend.appeared > 0 ? (trend.partial / trend.appeared) * 100 : 0}%`,
                            }}
                          />
                          <div
                            className="bg-red-500 h-full transition-all"
                            style={{
                              width: `${trend.appeared > 0 ? (trend.absent / trend.appeared) * 100 : 0}%`,
                            }}
                          />
                        </div>
                        <div className="flex items-center gap-3 text-xs flex-shrink-0">
                          <span className="text-emerald-400">
                            {trend.present}P
                          </span>
                          <span className="text-amber-400">
                            {trend.partial}L
                          </span>
                          <span className="text-red-400">{trend.absent}A</span>
                          <span
                            className={`font-bold text-sm ${getStatusColor(trend.percentage)}`}
                          >
                            {trend.percentage}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Departments Tab */}
      {activeTab === "departments" && (
        <div className="space-y-4">
          {departments.length === 0 ? (
            <div className="bg-gray-800/50 rounded-2xl p-12 text-center border border-gray-700/50">
              <p className="text-gray-400">
                No department data available. Add students with departments to
                see stats.
              </p>
            </div>
          ) : (
            departments.map((dept) => {
              const presentPct =
                dept.totalStudents > 0
                  ? Math.round((dept.present / dept.totalStudents) * 100)
                  : 0;
              const partialPct =
                dept.totalStudents > 0
                  ? Math.round((dept.partial / dept.totalStudents) * 100)
                  : 0;
              const notPresent = dept.totalStudents - dept.appeared;

              return (
                <div
                  key={dept.department}
                  className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50 hover:border-gray-600/50 transition-colors"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-white">
                        {dept.department}
                      </h3>
                      <p className="text-sm text-gray-400">
                        {dept.totalStudents} students enrolled
                      </p>
                    </div>
                    <div
                      className={`text-3xl font-bold ${getStatusColor(dept.percentage)}`}
                    >
                      {dept.percentage}%
                    </div>
                  </div>

                  {/* Combined Progress Bar */}
                  <div className="h-4 bg-gray-700 rounded-full overflow-hidden flex mb-4">
                    {presentPct > 0 && (
                      <div
                        className="bg-emerald-500 h-full transition-all"
                        style={{ width: `${presentPct}%` }}
                      />
                    )}
                    {partialPct > 0 && (
                      <div
                        className="bg-amber-500 h-full transition-all"
                        style={{ width: `${partialPct}%` }}
                      />
                    )}
                  </div>

                  {/* Stats Row */}
                  <div className="grid grid-cols-4 gap-3">
                    <div className="text-center p-2 bg-emerald-500/10 rounded-lg">
                      <p className="text-lg font-bold text-emerald-400">
                        {dept.present}
                      </p>
                      <p className="text-xs text-gray-400">Present</p>
                    </div>
                    <div className="text-center p-2 bg-amber-500/10 rounded-lg">
                      <p className="text-lg font-bold text-amber-400">
                        {dept.partial}
                      </p>
                      <p className="text-xs text-gray-400">Partial</p>
                    </div>
                    <div className="text-center p-2 bg-blue-500/10 rounded-lg">
                      <p className="text-lg font-bold text-blue-400">
                        {dept.appeared}
                      </p>
                      <p className="text-xs text-gray-400">Appeared</p>
                    </div>
                    <div className="text-center p-2 bg-red-500/10 rounded-lg">
                      <p className="text-lg font-bold text-red-400">
                        {notPresent}
                      </p>
                      <p className="text-xs text-gray-400">Absent</p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Students Tab */}
      {activeTab === "students" && (
        <div className="space-y-4">
          {/* Controls */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <circle cx="11" cy="11" r="8" />
                <path
                  d="m21 21-4.35-4.35"
                  strokeLinecap="round"
                  strokeWidth={2}
                />
              </svg>
              <input
                type="text"
                placeholder="Search students by name, roll no, department..."
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-sm"
              />
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-gray-800 border border-gray-700 rounded-xl text-white px-3 py-2.5 text-sm outline-none focus:border-blue-500"
            >
              <option value="percentage">Sort by Attendance %</option>
              <option value="name">Sort by Name</option>
              <option value="department">Sort by Department</option>
            </select>
            <select
              value={summaryDays}
              onChange={(e) => setSummaryDays(Number(e.target.value))}
              className="bg-gray-800 border border-gray-700 rounded-xl text-white px-3 py-2.5 text-sm outline-none focus:border-blue-500"
            >
              <option value={7}>Last 7 days</option>
              <option value={14}>Last 14 days</option>
              <option value={30}>Last 30 days</option>
              <option value={60}>Last 60 days</option>
            </select>
          </div>

          {/* Low Attendance Alert */}
          {lowAttendance.length > 0 && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4">
              <p className="text-sm font-medium text-red-400 mb-2">
                ⚠️ {lowAttendance.length} student
                {lowAttendance.length > 1 ? "s" : ""} with attendance below 50%
              </p>
              <div className="flex flex-wrap gap-2">
                {lowAttendance.slice(0, 8).map((s) => (
                  <span
                    key={s._id}
                    className="text-xs bg-red-500/20 text-red-300 px-2 py-1 rounded-full"
                  >
                    {s.name} ({s.percentage}%)
                  </span>
                ))}
                {lowAttendance.length > 8 && (
                  <span className="text-xs text-red-400">
                    +{lowAttendance.length - 8} more
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Student List */}
          <div className="space-y-2">
            {filteredStudents.length === 0 ? (
              <div className="bg-gray-800/50 rounded-2xl p-12 text-center border border-gray-700/50">
                <p className="text-gray-400">No students found</p>
              </div>
            ) : (
              filteredStudents.map((student, idx) => (
                <div key={student._id}>
                  <button
                    onClick={() => viewStudentHistory(student._id)}
                    className="w-full text-left bg-gray-800/50 backdrop-blur-sm rounded-2xl p-4 border border-gray-700/50 hover:border-gray-600/50 transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-mono text-gray-600 w-6">
                        {idx + 1}
                      </span>
                      <StudentAvatar
                        name={student.name}
                        photoUrl={student.photoUrl}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">
                          {student.name}
                        </p>
                        <p className="text-xs text-gray-400">
                          {student.rollNumber} • {student.department}
                        </p>
                      </div>
                      <div className="flex items-center gap-4 text-xs">
                        <div className="hidden sm:flex items-center gap-3">
                          <span className="text-emerald-400">
                            {student.presentDays}P
                          </span>
                          <span className="text-amber-400">
                            {student.partialDays}L
                          </span>
                          <span className="text-red-400">
                            {student.absentDays}A
                          </span>
                        </div>
                        <div className="w-20 h-2 bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${getBarColor(student.percentage)}`}
                            style={{ width: `${student.percentage}%` }}
                          />
                        </div>
                        <span
                          className={`text-sm font-bold w-12 text-right ${getStatusColor(student.percentage)}`}
                        >
                          {student.percentage}%
                        </span>
                        <svg
                          className={`w-4 h-4 text-gray-500 transition-transform ${expandedStudent === student._id ? "rotate-180" : ""}`}
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
                    </div>
                  </button>

                  {/* Expanded Student History */}
                  {expandedStudent === student._id && studentHistory && (
                    <div className="mt-1 ml-10 bg-gray-900/50 rounded-xl p-4 border border-gray-700/30 space-y-3">
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-gray-400">
                          Avg Duration:{" "}
                          <span className="text-white font-medium">
                            {studentHistory.avgDuration}m
                          </span>
                        </span>
                        <span className="text-gray-400">
                          Overall:{" "}
                          <span
                            className={`font-medium ${getStatusColor(studentHistory.attendancePercentage)}`}
                          >
                            {studentHistory.attendancePercentage}%
                          </span>
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {studentHistory.history.slice(0, 10).map((h: any) => {
                          const date = new Date(h.date + "T00:00:00");
                          return (
                            <div
                              key={h._id || h.date}
                              className="flex items-center justify-between p-2 bg-gray-800/50 rounded-lg text-xs"
                            >
                              <span className="text-gray-400">
                                {date.toLocaleDateString("en-US", {
                                  weekday: "short",
                                  month: "short",
                                  day: "numeric",
                                })}
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="text-gray-500">
                                  {h.duration}m
                                </span>
                                <span
                                  className={`px-2 py-0.5 rounded-full font-medium ${
                                    h.status === "Present"
                                      ? "bg-emerald-500/20 text-emerald-400"
                                      : h.status === "Partial"
                                        ? "bg-amber-500/20 text-amber-400"
                                        : "bg-red-500/20 text-red-400"
                                  }`}
                                >
                                  {h.status}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
