import { useState, useEffect, useCallback } from 'react';
import { adminAPI } from '../../../services/api';

interface TimetableEntry {
  _id: string;
  day: string;
  startTime: string;
  endTime: string;
  subject?: { _id: string; name: string; code: string };
  faculty?: { _id: string; name: string; employeeId: string };
  classroom?: { _id: string; name: string; roomNumber: string };
  department: string;
  semester: number;
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function TimetableManagement() {
  const [entries, setEntries] = useState<TimetableEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [dayFilter, setDayFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<TimetableEntry | null>(null);
  const [form, setForm] = useState({
    day: 'Mon', startTime: '09:00', endTime: '10:00', subject: '', faculty: '', classroom: '', department: '', semester: 1,
  });
  const [subjects, setSubjects] = useState<any[]>([]);
  const [facultyList, setFacultyList] = useState<any[]>([]);
  const [classrooms, setClassrooms] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (dayFilter) params.day = dayFilter;
      const [tRes, sRes, fRes, cRes] = await Promise.all([
        adminAPI.getTimetable(params), adminAPI.getSubjects(), adminAPI.getFaculty(), adminAPI.getClassrooms(),
      ]);
      setEntries(tRes.data.data);
      setSubjects(sRes.data.data);
      setFacultyList(fRes.data.data);
      setClassrooms(cRes.data.data);
    } catch { /* */ } finally { setLoading(false); }
  }, [dayFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);
  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(''), 3000); };

  const handleSave = async () => {
    setSaving(true);
    try {
      const data = { ...form, subject: form.subject || undefined, faculty: form.faculty || undefined, classroom: form.classroom || undefined };
      if (editing) {
        await adminAPI.updateTimetable(editing._id, data);
        showToast('Entry updated');
      } else {
        await adminAPI.createTimetable(data);
        showToast('Entry created');
      }
      setShowForm(false); setEditing(null);
      resetForm();
      fetchData();
    } catch (e: any) { showToast(e.response?.data?.message || 'Error'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this entry?')) return;
    try { await adminAPI.deleteTimetable(id); showToast('Deleted'); fetchData(); }
    catch { showToast('Error'); }
  };

  const resetForm = () => setForm({ day: 'Mon', startTime: '09:00', endTime: '10:00', subject: '', faculty: '', classroom: '', department: '', semester: 1 });

  const startEdit = (e: TimetableEntry) => {
    setEditing(e);
    setForm({
      day: e.day, startTime: e.startTime, endTime: e.endTime,
      subject: e.subject?._id || '', faculty: e.faculty?._id || '', classroom: e.classroom?._id || '',
      department: e.department, semester: e.semester,
    });
    setShowForm(true);
  };

  // Group by day
  const grouped = DAYS.reduce((acc, day) => {
    const dayEntries = entries.filter(e => e.day === day);
    if (dayEntries.length > 0 || !dayFilter) acc[day] = dayEntries;
    return acc;
  }, {} as Record<string, TimetableEntry[]>);

  return (
    <div className="p-6 space-y-6">
      {toast && <div className="fixed top-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg z-50">{toast}</div>}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Timetable Management</h1>
          <p className="text-gray-400 mt-1">Configure weekly class schedules</p>
        </div>
        <button onClick={() => { setEditing(null); resetForm(); setShowForm(true); }}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium">
          + Add Entry
        </button>
      </div>

      {/* Day filter */}
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

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-40 p-4" onClick={() => setShowForm(false)}>
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-white mb-4">{editing ? 'Edit Entry' : 'Add Timetable Entry'}</h2>
            <div className="grid grid-cols-2 gap-4">
              <select value={form.day} onChange={e => setForm({...form, day: e.target.value})}
                className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <input placeholder="Department" value={form.department} onChange={e => setForm({...form, department: e.target.value})}
                className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <input type="time" value={form.startTime} onChange={e => setForm({...form, startTime: e.target.value})}
                className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <input type="time" value={form.endTime} onChange={e => setForm({...form, endTime: e.target.value})}
                className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <select value={form.subject} onChange={e => setForm({...form, subject: e.target.value})}
                className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Select Subject</option>
                {subjects.map((s: any) => <option key={s._id} value={s._id}>{s.name} ({s.code})</option>)}
              </select>
              <select value={form.faculty} onChange={e => setForm({...form, faculty: e.target.value})}
                className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Select Faculty</option>
                {facultyList.map((f: any) => <option key={f._id} value={f._id}>{f.name} ({f.employeeId})</option>)}
              </select>
              <select value={form.classroom} onChange={e => setForm({...form, classroom: e.target.value})}
                className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Select Classroom</option>
                {classrooms.map((c: any) => <option key={c._id} value={c._id}>{c.name} (Room {c.roomNumber})</option>)}
              </select>
              <input placeholder="Semester" type="number" min={1} max={8} value={form.semester} onChange={e => setForm({...form, semester: parseInt(e.target.value) || 1})}
                className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="flex gap-3 pt-4">
              <button onClick={handleSave} disabled={saving}
                className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-medium">
                {saving ? 'Saving...' : editing ? 'Update' : 'Create'}
              </button>
              <button onClick={() => setShowForm(false)}
                className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg font-medium">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="p-12 text-center text-gray-400">Loading...</div>
      ) : (
        Object.entries(grouped).map(([day, dayEntries]) => (
          <div key={day}>
            <h3 className="text-gray-300 font-semibold text-sm uppercase tracking-wide mb-2">{day}</h3>
            {dayEntries.length === 0 ? (
              <p className="text-gray-500 text-sm mb-4">No classes scheduled</p>
            ) : (
              <div className="grid gap-2 mb-4">
                {dayEntries.map(e => (
                  <div key={e._id} className="bg-gray-800 rounded-lg border border-gray-700 p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="text-blue-400 font-mono text-sm min-w-[100px]">
                        {e.startTime} - {e.endTime}
                      </div>
                      <div>
                        <p className="text-white font-medium text-sm">
                          {e.subject?.name || 'No Subject'} <span className="text-gray-400">({e.subject?.code})</span>
                        </p>
                        <p className="text-gray-400 text-xs">
                          {e.faculty?.name || 'No Faculty'} • Room {e.classroom?.roomNumber || '?'} • Sem {e.semester}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => startEdit(e)} className="text-blue-400 hover:text-blue-300 text-sm">Edit</button>
                      <button onClick={() => handleDelete(e._id)} className="text-red-400 hover:text-red-300 text-sm">Del</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}
