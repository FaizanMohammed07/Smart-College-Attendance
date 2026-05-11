import { useState, useEffect } from 'react';
import { parentAPI } from '../../../services/api';

export default function ParentDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await parentAPI.getDashboard();
        setData(res.data.data);
      } catch { /* */ }
      finally { setLoading(false); }
    };
    load();
    const interval = setInterval(load, 60000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div className="p-6 text-gray-400">Loading dashboard...</div>;
  if (!data) return <div className="p-6 text-red-400">Failed to load. Please ensure your child is linked to your account.</div>;

  const { child, today, stats } = data;

  const statusColor = (s: string) => {
    if (s === 'Present') return 'text-green-400 bg-green-900/20';
    if (s === 'Partial') return 'text-yellow-400 bg-yellow-900/20';
    if (s === 'Not Arrived') return 'text-gray-400 bg-gray-700';
    return 'text-red-400 bg-red-900/20';
  };

  const pctColor = stats.attendancePercentage >= 75 ? 'text-green-400' : stats.attendancePercentage >= 50 ? 'text-yellow-400' : 'text-red-400';

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 bg-amber-600 rounded-full flex items-center justify-center text-white text-xl font-bold">
          {child.name.charAt(0)}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">{child.name}'s Dashboard</h1>
          <p className="text-gray-400">{child.rollNumber} • {child.department}</p>
        </div>
      </div>

      {/* Today's Status */}
      <div className={`rounded-xl border border-gray-700 p-6 ${statusColor(today.status)}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-400 text-sm">Today's Status</p>
            <p className="text-3xl font-bold mt-1">{today.status}</p>
            {today.entryTime && (
              <p className="text-sm mt-2 opacity-75">
                Entered at {new Date(today.entryTime).toLocaleTimeString()}
                {today.exitTime && ` • Left at ${new Date(today.exitTime).toLocaleTimeString()}`}
                {today.isActive && ' • Currently in class'}
              </p>
            )}
          </div>
          <div className="text-right">
            <p className="text-4xl font-bold">{today.duration}</p>
            <p className="text-sm opacity-75">minutes</p>
          </div>
        </div>
      </div>

      {/* Overall Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-5">
          <p className="text-gray-400 text-sm">Attendance %</p>
          <p className={`text-3xl font-bold mt-1 ${pctColor}`}>{stats.attendancePercentage}%</p>
          <p className="text-xs text-gray-500 mt-1">Last 30 days</p>
        </div>
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-5">
          <p className="text-gray-400 text-sm">Present</p>
          <p className="text-3xl font-bold mt-1 text-green-400">{stats.totalPresent}</p>
        </div>
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-5">
          <p className="text-gray-400 text-sm">Partial</p>
          <p className="text-3xl font-bold mt-1 text-yellow-400">{stats.totalPartial}</p>
        </div>
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-5">
          <p className="text-gray-400 text-sm">Absent</p>
          <p className="text-3xl font-bold mt-1 text-red-400">{stats.totalAbsent}</p>
        </div>
      </div>

      {/* Warnings */}
      {stats.attendancePercentage < 75 && (
        <div className="bg-red-900/30 border border-red-800 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <p className="text-red-300 font-semibold">Low Attendance Alert</p>
              <p className="text-red-400 text-sm">
                Your child's attendance is {stats.attendancePercentage}% which is below the required 75%.
                Please ensure regular attendance.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Notifications count */}
      {data.unreadNotifications > 0 && (
        <div className="bg-blue-900/30 border border-blue-800 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🔔</span>
            <p className="text-blue-300">
              You have <span className="font-bold">{data.unreadNotifications}</span> unread notification(s).
              Check the notification panel for details.
            </p>
          </div>
        </div>
      )}

      {/* Child info */}
      {child.classroom && (
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-5">
          <h3 className="text-white font-semibold mb-2">Class Info</h3>
          <p className="text-gray-400 text-sm">
            Classroom: <span className="text-white">{child.classroom.name}</span>
            {child.classroom.roomNumber && <> • Room {child.classroom.roomNumber}</>}
          </p>
        </div>
      )}
    </div>
  );
}
