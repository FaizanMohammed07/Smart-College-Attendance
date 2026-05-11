import { useState, useEffect, useCallback } from 'react';
import { adminAPI } from '../../../services/api';

interface Faculty {
  _id: string;
  name: string;
  employeeId: string;
  department: string;
  phone: string;
  subjects: { _id: string; name: string; code: string }[];
  classrooms: { _id: string; name: string; roomNumber: string }[];
  isActive: boolean;
}

export default function FacultyManagement() {
  const [faculty, setFaculty] = useState<Faculty[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Faculty | null>(null);
  const [form, setForm] = useState({ name: '', employeeId: '', department: '', phone: '' });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');

  const fetch = useCallback(async () => {
    setLoading(true);
    try { const r = await adminAPI.getFaculty(); setFaculty(r.data.data); }
    catch { /* */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);
  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(''), 3000); };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editing) {
        await adminAPI.updateFaculty(editing._id, form);
        showToast('Faculty updated');
      } else {
        await adminAPI.createFaculty(form);
        showToast('Faculty created');
      }
      setShowForm(false); setEditing(null);
      setForm({ name: '', employeeId: '', department: '', phone: '' });
      fetch();
    } catch (e: any) { showToast(e.response?.data?.message || 'Error'); }
    finally { setSaving(false); }
  };

  const startEdit = (f: Faculty) => {
    setEditing(f);
    setForm({ name: f.name, employeeId: f.employeeId, department: f.department, phone: f.phone });
    setShowForm(true);
  };

  return (
    <div className="p-6 space-y-6">
      {toast && <div className="fixed top-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg z-50">{toast}</div>}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Faculty Management</h1>
          <p className="text-gray-400 mt-1">Manage faculty profiles and assignments</p>
        </div>
        <button onClick={() => { setEditing(null); setForm({ name: '', employeeId: '', department: '', phone: '' }); setShowForm(true); }}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium">
          + Add Faculty
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-40 p-4" onClick={() => setShowForm(false)}>
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-white mb-4">{editing ? 'Edit Faculty' : 'Add Faculty'}</h2>
            <div className="space-y-4">
              <input placeholder="Full Name" value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <input placeholder="Employee ID" value={form.employeeId} onChange={e => setForm({...form, employeeId: e.target.value})}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <input placeholder="Department" value={form.department} onChange={e => setForm({...form, department: e.target.value})}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <input placeholder="Phone" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500" />
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

      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400">Loading...</div>
        ) : faculty.length === 0 ? (
          <div className="p-12 text-center text-gray-400">No faculty found</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">Name</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">Emp ID</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">Department</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">Phone</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">Subjects</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {faculty.map(f => (
                <tr key={f._id} className="hover:bg-gray-700/50">
                  <td className="px-4 py-3 text-sm text-white font-medium">{f.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-300 font-mono">{f.employeeId}</td>
                  <td className="px-4 py-3 text-sm text-gray-300">{f.department}</td>
                  <td className="px-4 py-3 text-sm text-gray-300">{f.phone}</td>
                  <td className="px-4 py-3 text-sm text-gray-400">
                    {f.subjects?.map(s => s.code).join(', ') || '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => startEdit(f)} className="text-blue-400 hover:text-blue-300 text-sm">Edit</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
