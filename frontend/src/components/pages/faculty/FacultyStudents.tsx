import { useState, useEffect } from 'react';
import { facultyAPI } from '../../../services/api';

export default function FacultyStudents() {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await facultyAPI.getStudents();
        setStudents(res.data.data);
      } catch { /* */ }
      finally { setLoading(false); }
    };
    load();
  }, []);

  const filtered = students.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.rollNumber.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">My Students</h1>
          <p className="text-gray-400 mt-1">Students in your assigned classrooms</p>
        </div>
        <span className="text-gray-400 text-sm">{students.length} students</span>
      </div>

      <input placeholder="Search by name or roll number..." value={search} onChange={e => setSearch(e.target.value)}
        className="w-full max-w-md px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500" />

      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-gray-400">No students found</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">Name</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">Roll Number</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">Department</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">Classroom</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {filtered.map(s => (
                <tr key={s._id} className="hover:bg-gray-700/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                        {s.name.charAt(0)}
                      </div>
                      <span className="text-white text-sm font-medium">{s.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-300 font-mono">{s.rollNumber}</td>
                  <td className="px-4 py-3 text-sm text-gray-300">{s.department}</td>
                  <td className="px-4 py-3 text-sm text-gray-300">{s.classroom?.name || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
