import { useState, useEffect } from 'react';
import { facultyAPI } from '../../../services/api';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function FacultyTimetable() {
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dayFilter, setDayFilter] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const params: any = {};
        if (dayFilter) params.day = dayFilter;
        const res = await facultyAPI.getTimetable(params);
        setEntries(res.data.data);
      } catch { /* */ }
      finally { setLoading(false); }
    };
    load();
  }, [dayFilter]);

  const grouped = DAYS.reduce((acc, day) => {
    const dayEntries = entries.filter(e => e.day === day);
    if (dayEntries.length > 0) acc[day] = dayEntries;
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">My Timetable</h1>
        <p className="text-gray-400 mt-1">Your weekly class schedule</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setDayFilter('')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium ${!dayFilter ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}>
          All Days
        </button>
        {DAYS.map(d => (
          <button key={d} onClick={() => setDayFilter(d)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium ${dayFilter === d ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}>
            {d}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="p-12 text-center text-gray-400">Loading...</div>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="p-12 text-center text-gray-400">No classes scheduled</div>
      ) : (
        Object.entries(grouped).map(([day, dayEntries]) => (
          <div key={day}>
            <h3 className="text-emerald-400 font-semibold text-sm uppercase tracking-wide mb-2">{day}</h3>
            <div className="space-y-2 mb-4">
              {dayEntries.map((e: any) => (
                <div key={e._id} className="bg-gray-800 rounded-lg border border-gray-700 p-4 flex items-center gap-4">
                  <div className="text-emerald-400 font-mono text-sm min-w-[100px]">
                    {e.startTime} - {e.endTime}
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-medium">{e.subject?.name || 'N/A'} <span className="text-gray-400">({e.subject?.code})</span></p>
                    <p className="text-gray-400 text-sm">Room {e.classroom?.roomNumber || '?'} • {e.classroom?.building || ''}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
