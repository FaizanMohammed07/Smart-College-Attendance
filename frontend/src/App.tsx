import { useState, useEffect } from "react";
import { useAuth, AuthProvider } from "./contexts/AuthContext";
import Login from "./components/pages/Login";

// Admin pages (existing)
import Dashboard from "./components/pages/Dashboard";
import LiveMonitor from "./components/pages/LiveMonitor";
import Students from "./components/pages/Students";
import AttendanceLogs from "./components/pages/AttendanceLogs";
import Analytics from "./components/pages/Analytics";
import Settings from "./components/pages/Settings";

// New admin management pages
import UserManagement from "./components/pages/admin/UserManagement";
import FacultyManagement from "./components/pages/admin/FacultyManagement";
import ClassroomManagement from "./components/pages/admin/ClassroomManagement";
import SubjectManagement from "./components/pages/admin/SubjectManagement";
import TimetableManagement from "./components/pages/admin/TimetableManagement";

// Faculty pages
import FacultyDashboard from "./components/pages/faculty/FacultyDashboard";
import FacultyTimetable from "./components/pages/faculty/FacultyTimetable";
import FacultyAttendance from "./components/pages/faculty/FacultyAttendance";
import FacultyStudents from "./components/pages/faculty/FacultyStudents";

// Student pages
import StudentDashboard from "./components/pages/student/StudentDashboard";
import StudentTimetable from "./components/pages/student/StudentTimetable";
import StudentAttendance from "./components/pages/student/StudentAttendance";

// Parent pages
import ParentDashboard from "./components/pages/parent/ParentDashboard";
import ParentAttendance from "./components/pages/parent/ParentAttendance";

// Shared
import NotificationPanel from "./components/shared/NotificationPanel";

/* ── Role → page definitions ── */
interface NavItem {
  id: string;
  name: string;
  icon: string;
}

const ADMIN_NAV: NavItem[] = [
  { id: "dashboard", name: "Dashboard", icon: "📊" },
  { id: "live-monitor", name: "Live Monitor", icon: "📹" },
  { id: "students", name: "Students", icon: "👥" },
  { id: "attendance-logs", name: "Attendance Logs", icon: "📋" },
  { id: "analytics", name: "Analytics", icon: "📈" },
  { id: "user-management", name: "User Management", icon: "🔑" },
  { id: "faculty-mgmt", name: "Faculty", icon: "🎓" },
  { id: "classroom-mgmt", name: "Classrooms", icon: "🏫" },
  { id: "subject-mgmt", name: "Subjects", icon: "📚" },
  { id: "timetable-mgmt", name: "Timetable", icon: "🗓️" },
  { id: "settings", name: "Settings", icon: "⚙️" },
];

const FACULTY_NAV: NavItem[] = [
  { id: "faculty-dashboard", name: "Dashboard", icon: "📊" },
  { id: "faculty-timetable", name: "My Timetable", icon: "🗓️" },
  { id: "faculty-attendance", name: "Class Attendance", icon: "📋" },
  { id: "faculty-students", name: "My Students", icon: "👥" },
];

const STUDENT_NAV: NavItem[] = [
  { id: "student-dashboard", name: "Dashboard", icon: "📊" },
  { id: "student-timetable", name: "Timetable", icon: "🗓️" },
  { id: "student-attendance", name: "My Attendance", icon: "📋" },
];

const PARENT_NAV: NavItem[] = [
  { id: "parent-dashboard", name: "Dashboard", icon: "📊" },
  { id: "parent-attendance", name: "Attendance History", icon: "📋" },
];

function getNavForRole(role: string): NavItem[] {
  switch (role) {
    case "admin":
      return ADMIN_NAV;
    case "faculty":
      return FACULTY_NAV;
    case "student":
      return STUDENT_NAV;
    case "parent":
      return PARENT_NAV;
    default:
      return [];
  }
}

function getDefaultPage(role: string): string {
  switch (role) {
    case "admin":
      return "dashboard";
    case "faculty":
      return "faculty-dashboard";
    case "student":
      return "student-dashboard";
    case "parent":
      return "parent-dashboard";
    default:
      return "dashboard";
  }
}

function renderPage(pageId: string) {
  switch (pageId) {
    // Admin pagesimport
    case "dashboard":
      return <Dashboard />;
    case "live-monitor":
      return <LiveMonitor />;
    case "students":
      return <Students />;
    case "attendance-logs":
      return <AttendanceLogs />;
    case "analytics":
      return <Analytics />;
    case "settings":
      return <Settings />;
    case "user-management":
      return <UserManagement />;
    case "faculty-mgmt":
      return <FacultyManagement />;
    case "classroom-mgmt":
      return <ClassroomManagement />;
    case "subject-mgmt":
      return <SubjectManagement />;
    case "timetable-mgmt":
      return <TimetableManagement />;
    // Faculty pages
    case "faculty-dashboard":
      return <FacultyDashboard />;
    case "faculty-timetable":
      return <FacultyTimetable />;
    case "faculty-attendance":
      return <FacultyAttendance />;
    case "faculty-students":
      return <FacultyStudents />;
    // Student pages
    case "student-dashboard":
      return <StudentDashboard />;
    case "student-timetable":
      return <StudentTimetable />;
    case "student-attendance":
      return <StudentAttendance />;
    // Parent pages
    case "parent-dashboard":
      return <ParentDashboard />;
    case "parent-attendance":
      return <ParentAttendance />;
    default:
      return <Dashboard />;
  }
}

function AppContent() {
  const { user, loading, logout } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);

  const nav = user ? getNavForRole(user.role) : [];
  const defaultPage = user ? getDefaultPage(user.role) : "dashboard";

  const getPageFromHash = (): string => {
    const hash = window.location.hash.replace("#", "");
    if (!hash || hash === "login") return defaultPage;
    const valid = nav.some((n) => n.id === hash);
    return valid ? hash : defaultPage;
  };

  const [currentPage, setCurrentPage] = useState<string>(defaultPage);

  // Sync hash ↔ state
  useEffect(() => {
    if (user) {
      setCurrentPage(getPageFromHash());
    }
    function onHashChange() {
      if (user) setCurrentPage(getPageFromHash());
    }
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, [user, nav]);

  function navigate(page: string) {
    window.location.hash = page;
    setCurrentPage(page);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center animate-fadeIn">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-2xl shadow-blue-500/30 mx-auto mb-5">
            <span className="text-2xl">📷</span>
          </div>
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400 text-sm font-medium">Loading Smart Classroom...</p>
        </div>
      </div>
    );
  }

  if (!user) return <Login />;

  const roleLabel =
    user.role === "admin"
      ? "Administrator"
      : user.role === "faculty"
        ? "Faculty"
        : user.role === "student"
          ? "Student"
          : "Parent";

  const roleColor =
    user.role === "admin"
      ? "bg-blue-600"
      : user.role === "faculty"
        ? "bg-emerald-600"
        : user.role === "student"
          ? "bg-purple-600"
          : "bg-amber-600";

  return (
    <div className="flex h-screen bg-gray-900">
      {/* Sidebar */}
      <div className="w-64 bg-gray-800/80 backdrop-blur-xl border-r border-gray-700/50 flex flex-col">
        <div className="p-6 border-b border-gray-700/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <span className="text-white text-lg">📷</span>
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight">Smart Classroom</h1>
              <p className="text-[11px] text-gray-500 font-medium">AI Attendance System</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 overflow-y-auto custom-scrollbar">
          <ul className="space-y-0.5">
            {nav.map((item) => (
              <li key={item.id}>
                <button
                  onClick={() => navigate(item.id)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[13px] transition-all duration-200 ${
                    currentPage === item.id
                      ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-600/20"
                      : "text-gray-400 hover:bg-gray-700/50 hover:text-gray-200"
                  }`}
                >
                  <span className="text-base">{item.icon}</span>
                  <span className="font-medium">{item.name}</span>
                  {currentPage === item.id && (
                    <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white/80" />
                  )}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div className="p-3 border-t border-gray-700/50 space-y-1">
          {/* Notification bell */}
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-gray-400 hover:bg-gray-700/50 hover:text-gray-200 transition-all text-[13px]"
          >
            <span className="text-base">🔔</span>
            <span className="font-medium">Notifications</span>
          </button>

          <div className="flex items-center gap-3 px-3.5 py-3 rounded-xl bg-gray-700/30">
            <div
              className={`w-9 h-9 ${roleColor} rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-lg`}
            >
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">
                {user.name}
              </p>
              <p className="text-[11px] text-gray-500 font-medium">{roleLabel}</p>
            </div>
          </div>

          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-red-400 hover:bg-red-900/20 hover:text-red-300 transition-all text-[13px]"
          >
            <span className="text-base">🚪</span>
            <span className="font-medium">Sign Out</span>
          </button>
        </div>
      </div>

      {/* Main */}
      <main className="flex-1 overflow-y-auto relative bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800">
        <div className="p-6 animate-fadeIn">
          {renderPage(currentPage)}
        </div>
        {showNotifications && (
          <NotificationPanel onClose={() => setShowNotifications(false)} />
        )}
      </main>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
