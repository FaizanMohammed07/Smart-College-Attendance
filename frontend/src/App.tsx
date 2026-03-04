import { useState, useEffect } from "react";
import Dashboard from "./components/pages/Dashboard";
import LiveMonitor from "./components/pages/LiveMonitor";
import Students from "./components/pages/Students";
import AttendanceLogs from "./components/pages/AttendanceLogs";
import Analytics from "./components/pages/Analytics";
import Settings from "./components/pages/Settings";

const PAGES = [
  "dashboard",
  "live-monitor",
  "students",
  "attendance-logs",
  "analytics",
  "settings",
] as const;
type Page = (typeof PAGES)[number];

function getPageFromHash(): Page {
  const hash = window.location.hash.replace("#", "");
  return PAGES.includes(hash as Page) ? (hash as Page) : "dashboard";
}

function App() {
  const [currentPage, setCurrentPage] = useState<Page>(getPageFromHash);

  // Sync hash ↔ state
  useEffect(() => {
    function onHashChange() {
      setCurrentPage(getPageFromHash());
    }
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  function navigate(page: Page) {
    window.location.hash = page;
    setCurrentPage(page);
  }

  function renderPage() {
    switch (currentPage) {
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
      default:
        return <Dashboard />;
    }
  }

  return (
    <div className="flex h-screen bg-gray-900">
      <div className="w-64 bg-gray-800 border-r border-gray-700 flex flex-col">
        <div className="p-6 border-b border-gray-700">
          <h1 className="text-2xl font-bold text-white">Smart Classroom</h1>
          <p className="text-sm text-gray-400 mt-1">Attendance System</p>
        </div>

        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            {[
              { id: "dashboard", name: "Dashboard", icon: "📊" },
              { id: "live-monitor", name: "Live Monitor", icon: "📹" },
              { id: "students", name: "Students", icon: "👥" },
              { id: "attendance-logs", name: "Attendance Logs", icon: "📋" },
              { id: "analytics", name: "Analytics", icon: "📈" },
              { id: "settings", name: "Settings", icon: "⚙️" },
            ].map((item) => (
              <li key={item.id}>
                <button
                  onClick={() => navigate(item.id as Page)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    currentPage === item.id
                      ? "bg-blue-600 text-white"
                      : "text-gray-300 hover:bg-gray-700 hover:text-white"
                  }`}
                >
                  <span>{item.icon}</span>
                  <span className="font-medium">{item.name}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div className="p-4 border-t border-gray-700">
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
              A
            </div>
            <div>
              <p className="text-sm font-medium text-white">Admin</p>
              <p className="text-xs text-gray-400">admin@classroom.com</p>
            </div>
          </div>
        </div>
      </div>

      <main className="flex-1 overflow-y-auto">{renderPage()}</main>
    </div>
  );
}

export default App;
