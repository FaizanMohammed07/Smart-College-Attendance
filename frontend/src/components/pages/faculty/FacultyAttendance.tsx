import { useState, useEffect } from 'react';
import { facultyAPI } from '../../../services/api';

export default function FacultyAttendance() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await facultyAPI.getAttendance({ date });
        setData(res.data);
      } catch { /* */ }
      finally { setLoading(false); }
    };
    load();
  }, [date]);

  const statusColor = (s: string) => {
    if (s === 'Present') return 'bg-green-900/50 text-green-300';
    if (s === 'Partial') return 'bg-yellow-900/50 text-yellow-300';
    return 'bg-red-900/50 text-red-300';
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Class Attendance</h1>
          <p className="text-gray-400 mt-1">View attendance for your assigned classes</p>
        </div>
        <input type="date" value={date} onChange={e => setDate(e.target.value)}
          className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>

      {loading ? (
        <div className="p-12 text-center text-gray-400">Loading...</div>
      ) : !data ? (
        <div className="p-12 text-center text-gray-400">No data available</div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
              <p className="text-gray-400 text-sm">Total Students</p>
              <p className="text-2xl font-bold text-white mt-1">{data.totalStudents}</p>
            </div>
            <div className="bg-green-900/20 rounded-xl border border-gray-700 p-4">
              <p className="text-gray-400 text-sm">Present</p>
              <p className="text-2xl font-bold text-green-400 mt-1">{data.presentCount}</p>
            </div>
            <div className="bg-yellow-900/20 rounded-xl border border-gray-700 p-4">
              <p className="text-gray-400 text-sm">Partial</p>
              <p className="text-2xl font-bold text-yellow-400 mt-1">{data.partialCount}</p>
            </div>
            <div className="bg-red-900/20 rounded-xl border border-gray-700 p-4">
              <p className="text-gray-400 text-sm">Absent</p>
              <p className="text-2xl font-bold text-red-400 mt-1">{data.absentCount}</p>
            </div>
          </div>

          {/* Attendance logs */}
          <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-700">
              <h2 className="text-white font-semibold">Attendance Records</h2>
            </div>
            {data.logs?.length === 0 ? (
              <div className="p-8 text-center text-gray-400">No attendance records for this date</div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">Student</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">Roll No</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">Entry</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">Exit</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">Duration</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {data.logs?.map((log: any) => (
                    <tr key={log._id} className="hover:bg-gray-700/50">
                      <td className="px-4 py-3 text-sm text-white">{log.studentId?.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-300 font-mono">{log.studentId?.rollNumber}</td>
                      <td className="px-4 py-3 text-sm text-gray-300">{log.entryTime ? new Date(log.entryTime).toLocaleTimeString() : '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-300">{log.exitTime ? new Date(log.exitTime).toLocaleTimeString() : log.isActive ? '🟢 Active' : '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-300">{log.duration} min</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor(log.status)}`}>{log.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Absent students */}
          {data.absentStudents?.length > 0 && (
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-5">
              <h2 className="text-white font-semibold mb-3">Absent Students ({data.absentStudents.length})</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {data.absentStudents.map((s: any) => (
                  <div key={s._id} className="bg-red-900/20 rounded-lg p-3 border border-red-900/30">
                    <p className="text-white text-sm font-medium">{s.name}</p>
                    <p className="text-gray-400 text-xs">{s.rollNumber} • {s.department}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
