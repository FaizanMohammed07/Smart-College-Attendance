import { useState, useEffect } from 'react';
import { facultyAPI } from '../../../services/api';

export default function FacultyDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await facultyAPI.getDashboard();
        setData(res.data.data);
      } catch { /* */ }
      finally { setLoading(false); }
    };
    load();
  }, []);

  if (loading) return <div className="p-6 text-gray-400">Loading dashboard...</div>;
  if (!data) return <div className="p-6 text-red-400">Failed to load dashboard. Please ensure your faculty profile is linked.</div>;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Faculty Dashboard</h1>
        <p className="text-gray-400 mt-1">Overview of your classes and students</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Today's Classes", value: data.totalClasses, color: 'text-blue-400', bg: 'bg-blue-900/20' },
          { label: 'Total Classrooms', value: data.totalClassrooms, color: 'text-emerald-400', bg: 'bg-emerald-900/20' },
          { label: 'Total Students', value: data.totalStudents, color: 'text-purple-400', bg: 'bg-purple-900/20' },
          { label: 'Active Now', value: data.activeInClass, color: 'text-amber-400', bg: 'bg-amber-900/20' },
        ].map((card, i) => (
          <div key={i} className={`${card.bg} rounded-xl border border-gray-700 p-5`}>
            <p className="text-gray-400 text-sm">{card.label}</p>
            <p className={`text-3xl font-bold mt-1 ${card.color}`}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* Today's schedule */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-5">
        <h2 className="text-lg font-semibold text-white mb-4">Today's Schedule</h2>
        {data.todaySchedule?.length === 0 ? (
          <p className="text-gray-400 text-sm">No classes scheduled today</p>
        ) : (
          <div className="space-y-3">
            {data.todaySchedule?.map((entry: any) => (
              <div key={entry._id} className="flex items-center gap-4 bg-gray-700/50 rounded-lg p-4">
                <div className="text-blue-400 font-mono text-sm min-w-[100px]">
                  {entry.startTime} - {entry.endTime}
                </div>
                <div className="flex-1">
                  <p className="text-white font-medium">{entry.subject?.name || 'N/A'}</p>
                  <p className="text-gray-400 text-sm">Room {entry.classroom?.roomNumber || '?'}</p>
                </div>
                <span className="px-3 py-1 bg-blue-900/30 text-blue-300 rounded-full text-xs font-medium">
                  {entry.subject?.code}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick attendance stats */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-5">
        <h2 className="text-lg font-semibold text-white mb-2">Today's Attendance</h2>
        <div className="flex items-center gap-6">
          <div>
            <span className="text-gray-400 text-sm">Attended: </span>
            <span className="text-green-400 font-bold">{data.todayAttended}</span>
          </div>
          <div>
            <span className="text-gray-400 text-sm">Currently Active: </span>
            <span className="text-blue-400 font-bold">{data.activeInClass}</span>
          </div>
          <div>
            <span className="text-gray-400 text-sm">Total Students: </span>
            <span className="text-white font-bold">{data.totalStudents}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
