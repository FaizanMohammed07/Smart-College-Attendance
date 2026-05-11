import { useState, useEffect } from 'react';
import { studentDashAPI } from '../../../services/api';

export default function StudentAttendance() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await studentDashAPI.getAttendance({ page, limit: 20 });
        setLogs(res.data.data);
        setTotalPages(res.data.pages);
      } catch { /* */ }
      finally { setLoading(false); }
    };
    load();
  }, [page]);

  const statusColor = (s: string) => {
    if (s === 'Present') return 'bg-green-900/50 text-green-300';
    if (s === 'Partial') return 'bg-yellow-900/50 text-yellow-300';
    return 'bg-red-900/50 text-red-300';
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">My Attendance History</h1>
        <p className="text-gray-400 mt-1">View your complete attendance records</p>
      </div>

      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400">Loading...</div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-gray-400">No attendance records found</div>
        ) : (
          <>
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">Date</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">Entry Time</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">Exit Time</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">Duration</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {logs.map((log: any) => (
                  <tr key={log._id} className="hover:bg-gray-700/50">
                    <td className="px-4 py-3 text-sm text-white font-medium">{log.date}</td>
                    <td className="px-4 py-3 text-sm text-gray-300">
                      {log.entryTime ? new Date(log.entryTime).toLocaleTimeString() : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-300">
                      {log.exitTime ? new Date(log.exitTime).toLocaleTimeString() : log.isActive ? '🟢 Active' : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-300">{log.duration} min</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor(log.status)}`}>
                        {log.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 p-4 border-t border-gray-700">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="px-3 py-1 bg-gray-700 text-gray-300 rounded disabled:opacity-50 text-sm">Prev</button>
                <span className="text-gray-400 text-sm">Page {page} of {totalPages}</span>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  className="px-3 py-1 bg-gray-700 text-gray-300 rounded disabled:opacity-50 text-sm">Next</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
