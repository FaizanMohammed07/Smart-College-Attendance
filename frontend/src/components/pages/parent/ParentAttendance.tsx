import { useState, useEffect } from 'react';
import { parentAPI } from '../../../services/api';

export default function ParentAttendance() {
  const [attendance, setAttendance] = useState<any[]>([]);
  const [trends, setTrends] = useState<any>(null);
  const [tab, setTab] = useState<'history' | 'trends'>('history');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [attRes, trendRes] = await Promise.all([
          parentAPI.getAttendance({ page, limit: 20 }),
          parentAPI.getTrends(),
        ]);
        setAttendance(attRes.data.data || attRes.data.attendance || []);
        setTotal(attRes.data.pagination?.total || 0);
        setTrends(trendRes.data.data || trendRes.data);
      } catch { /* */ }
      finally { setLoading(false); }
    };
    load();
  }, [page]);

  const statusBadge = (s: string) => {
    const m: Record<string, string> = {
      Present: 'bg-green-900/30 text-green-400',
      Partial: 'bg-yellow-900/30 text-yellow-400',
      Absent: 'bg-red-900/30 text-red-400',
    };
    return m[s] || 'bg-gray-700 text-gray-400';
  };

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Child's Attendance</h1>
        <div className="flex bg-gray-800 rounded-lg p-1">
          <button
            onClick={() => setTab('history')}
            className={`px-4 py-1.5 rounded text-sm font-medium transition ${
              tab === 'history' ? 'bg-amber-600 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >History</button>
          <button
            onClick={() => setTab('trends')}
            className={`px-4 py-1.5 rounded text-sm font-medium transition ${
              tab === 'trends' ? 'bg-amber-600 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >Trends</button>
        </div>
      </div>

      {loading ? (
        <div className="text-gray-400">Loading...</div>
      ) : tab === 'history' ? (
        <>
          <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left p-4 text-gray-400 text-sm font-medium">Date</th>
                  <th className="text-left p-4 text-gray-400 text-sm font-medium">Entry</th>
                  <th className="text-left p-4 text-gray-400 text-sm font-medium">Exit</th>
                  <th className="text-left p-4 text-gray-400 text-sm font-medium">Duration</th>
                  <th className="text-left p-4 text-gray-400 text-sm font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {attendance.length === 0 ? (
                  <tr><td colSpan={5} className="p-8 text-center text-gray-500">No records found</td></tr>
                ) : attendance.map((a: any, i: number) => (
                  <tr key={i} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                    <td className="p-4 text-white">
                      {new Date(a.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </td>
                    <td className="p-4 text-gray-300">
                      {a.entryTime ? new Date(a.entryTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                    </td>
                    <td className="p-4 text-gray-300">
                      {a.exitTime ? new Date(a.exitTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                    </td>
                    <td className="p-4 text-gray-300">{a.duration ?? 0} min</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusBadge(a.status)}`}>
                        {a.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="px-3 py-1.5 rounded bg-gray-700 text-gray-300 hover:bg-gray-600 disabled:opacity-50">Prev</button>
              <span className="text-gray-400 text-sm">Page {page} of {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="px-3 py-1.5 rounded bg-gray-700 text-gray-300 hover:bg-gray-600 disabled:opacity-50">Next</button>
            </div>
          )}
        </>
      ) : (
        /* Trends Tab */
        <div className="space-y-6">
          {trends ? (
            <>
              {/* Weekly Summary */}
              {trends.weeklyStats && (
                <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
                  <h3 className="text-white font-semibold mb-4">Weekly Summary</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-400">{trends.weeklyStats.present}</p>
                      <p className="text-gray-400 text-sm">Present</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-yellow-400">{trends.weeklyStats.partial}</p>
                      <p className="text-gray-400 text-sm">Partial</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-red-400">{trends.weeklyStats.absent}</p>
                      <p className="text-gray-400 text-sm">Absent</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Monthly Summary */}
              {trends.monthlyStats && (
                <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
                  <h3 className="text-white font-semibold mb-4">Monthly Summary</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-400">{trends.monthlyStats.present}</p>
                      <p className="text-gray-400 text-sm">Present</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-yellow-400">{trends.monthlyStats.partial}</p>
                      <p className="text-gray-400 text-sm">Partial</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-red-400">{trends.monthlyStats.absent}</p>
                      <p className="text-gray-400 text-sm">Absent</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Daily Trend */}
              {trends.dailyTrend && trends.dailyTrend.length > 0 && (
                <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
                  <h3 className="text-white font-semibold mb-4">Last 7 Days</h3>
                  <div className="flex items-end gap-2 h-32">
                    {trends.dailyTrend.map((d: any, i: number) => {
                      const maxMins = 60;
                      const h = Math.max(4, (d.duration / maxMins) * 100);
                      const color = d.status === 'Present' ? 'bg-green-500' : d.status === 'Partial' ? 'bg-yellow-500' : 'bg-red-500';
                      return (
                        <div key={i} className="flex flex-col items-center flex-1">
                          <div className={`w-full rounded-t ${color}`} style={{ height: `${h}%` }} title={`${d.duration} min`} />
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(d.date).toLocaleDateString('en-US', { weekday: 'short' })}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Average duration */}
              {trends.averageDuration !== undefined && (
                <div className="bg-gray-800 rounded-xl border border-gray-700 p-5">
                  <p className="text-gray-400 text-sm">Average Daily Duration (30 days)</p>
                  <p className="text-3xl font-bold text-amber-400 mt-1">{Math.round(trends.averageDuration)} min</p>
                </div>
              )}
            </>
          ) : (
            <div className="text-gray-500 text-center p-8">No trend data available</div>
          )}
        </div>
      )}
    </div>
  );
}
