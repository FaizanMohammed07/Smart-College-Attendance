import { useState, useEffect, useCallback } from 'react';
import { adminAPI } from '../../../services/api';

interface Subject {
  _id: string;
  name: string;
  code: string;
  department: string;
  semester: number;
  faculty?: { _id: string; name: string; employeeId: string };
  isActive: boolean;
}

interface FacultyOption { _id: string; name: string; employeeId: string; }

export default function SubjectManagement() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [facultyList, setFacultyList] = useState<FacultyOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Subject | null>(null);
  const [form, setForm] = useState({ name: '', code: '', department: '', semester: 1, faculty: '' });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [sRes, fRes] = await Promise.all([adminAPI.getSubjects(), adminAPI.getFaculty()]);
      setSubjects(sRes.data.data);
      setFacultyList(fRes.data.data.map((f: any) => ({ _id: f._id, name: f.name, employeeId: f.employeeId })));
    } catch { /* */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(''), 3000); };

  const handleSave = async () => {
    setSaving(true);
    try {
      const data = { ...form, faculty: form.faculty || undefined };
      if (editing) {
        await adminAPI.updateSubject(editing._id, data);
        showToast('Subject updated');
      } else {
        await adminAPI.createSubject(data);
        showToast('Subject created');
      }
      setShowForm(false); setEditing(null);
      setForm({ name: '', code: '', department: '', semester: 1, faculty: '' });
      fetchData();
    } catch (e: any) { showToast(e.response?.data?.message || 'Error'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this subject?')) return;
    try { await adminAPI.deleteSubject(id); showToast('Deleted'); fetchData(); }
    catch { showToast('Error'); }
  };

  const startEdit = (s: Subject) => {
    setEditing(s);
    setForm({ name: s.name, code: s.code, department: s.department, semester: s.semester, faculty: s.faculty?._id || '' });
    setShowForm(true);
  };

  // Group by department
  const grouped = subjects.reduce((acc, s) => {
    const dept = s.department || 'Unassigned';
    if (!acc[dept]) acc[dept] = [];
    acc[dept].push(s);
    return acc;
  }, {} as Record<string, Subject[]>);

  return (
    <div className="p-6 space-y-6">
      {toast && <div className="fixed top-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg z-50">{toast}</div>}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Subject Management</h1>
          <p className="text-gray-400 mt-1">Manage subjects and assign faculty</p>
        </div>
        <button onClick={() => { setEditing(null); setForm({ name: '', code: '', department: '', semester: 1, faculty: '' }); setShowForm(true); }}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium">
          + Add Subject
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-40 p-4" onClick={() => setShowForm(false)}>
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-white mb-4">{editing ? 'Edit Subject' : 'Add Subject'}</h2>
            <div className="space-y-4">
              <input placeholder="Subject Name" value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <input placeholder="Subject Code (e.g., CS101)" value={form.code} onChange={e => setForm({...form, code: e.target.value})}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <input placeholder="Department" value={form.department} onChange={e => setForm({...form, department: e.target.value})}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <input placeholder="Semester" type="number" min={1} max={8} value={form.semester} onChange={e => setForm({...form, semester: parseInt(e.target.value) || 1})}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <select value={form.faculty} onChange={e => setForm({...form, faculty: e.target.value})}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">No Faculty Assigned</option>
                {facultyList.map(f => <option key={f._id} value={f._id}>{f.name} ({f.employeeId})</option>)}
              </select>
              <div className="flex gap-3 pt-2">
                <button onClick={handleSave} disabled={saving}
                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-medium">
                  {saving ? 'Saving...' : editing ? 'Update' : 'Create'}
                </button>
                <button onClick={() => setShowForm(false)}
                  className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg font-medium">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="p-12 text-center text-gray-400">Loading...</div>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="p-12 text-center text-gray-400">No subjects found</div>
      ) : (
        Object.entries(grouped).map(([dept, subs]) => (
          <div key={dept}>
            <h3 className="text-gray-300 font-semibold text-sm uppercase tracking-wide mb-3">{dept}</h3>
            <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden mb-4">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">Code</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">Name</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">Sem</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">Faculty</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-400 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {subs.map(s => (
                    <tr key={s._id} className="hover:bg-gray-700/50">
                      <td className="px-4 py-3 text-sm text-blue-400 font-mono">{s.code}</td>
                      <td className="px-4 py-3 text-sm text-white">{s.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-300">{s.semester}</td>
                      <td className="px-4 py-3 text-sm text-gray-300">{s.faculty ? `${s.faculty.name} (${s.faculty.employeeId})` : '—'}</td>
                      <td className="px-4 py-3 text-right space-x-2">
                        <button onClick={() => startEdit(s)} className="text-blue-400 hover:text-blue-300 text-sm">Edit</button>
                        <button onClick={() => handleDelete(s._id)} className="text-red-400 hover:text-red-300 text-sm">Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
