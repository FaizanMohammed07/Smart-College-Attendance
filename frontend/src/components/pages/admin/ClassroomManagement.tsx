import { useState, useEffect, useCallback } from 'react';
import { adminAPI } from '../../../services/api';

interface Classroom {
  _id: string;
  name: string;
  roomNumber: string;
  building: string;
  capacity: number;
  department: string;
  students: { _id: string; name: string; rollNumber: string }[];
  isActive: boolean;
}

export default function ClassroomManagement() {
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Classroom | null>(null);
  const [form, setForm] = useState({ name: '', roomNumber: '', building: '', capacity: 60, department: '' });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try { const r = await adminAPI.getClassrooms(); setClassrooms(r.data.data); }
    catch { /* */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(''), 3000); };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editing) {
        await adminAPI.updateClassroom(editing._id, form);
        showToast('Classroom updated');
      } else {
        await adminAPI.createClassroom(form);
        showToast('Classroom created');
      }
      setShowForm(false); setEditing(null);
      setForm({ name: '', roomNumber: '', building: '', capacity: 60, department: '' });
      fetchData();
    } catch (e: any) { showToast(e.response?.data?.message || 'Error'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this classroom?')) return;
    try { await adminAPI.deleteClassroom(id); showToast('Deleted'); fetchData(); }
    catch { showToast('Error deleting'); }
  };

  const startEdit = (c: Classroom) => {
    setEditing(c);
    setForm({ name: c.name, roomNumber: c.roomNumber, building: c.building, capacity: c.capacity, department: c.department });
    setShowForm(true);
  };

  return (
    <div className="p-6 space-y-6">
      {toast && <div className="fixed top-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg z-50">{toast}</div>}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Classroom Management</h1>
          <p className="text-gray-400 mt-1">Manage classrooms and student assignments</p>
        </div>
        <button onClick={() => { setEditing(null); setForm({ name: '', roomNumber: '', building: '', capacity: 60, department: '' }); setShowForm(true); }}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium">
          + Add Classroom
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-40 p-4" onClick={() => setShowForm(false)}>
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-white mb-4">{editing ? 'Edit Classroom' : 'Add Classroom'}</h2>
            <div className="space-y-4">
              <input placeholder="Classroom Name (e.g., CSE-A 2nd Year)" value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <input placeholder="Room Number" value={form.roomNumber} onChange={e => setForm({...form, roomNumber: e.target.value})}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <input placeholder="Building" value={form.building} onChange={e => setForm({...form, building: e.target.value})}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <input placeholder="Capacity" type="number" value={form.capacity} onChange={e => setForm({...form, capacity: parseInt(e.target.value) || 60})}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <input placeholder="Department" value={form.department} onChange={e => setForm({...form, department: e.target.value})}
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

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full p-12 text-center text-gray-400">Loading...</div>
        ) : classrooms.length === 0 ? (
          <div className="col-span-full p-12 text-center text-gray-400">No classrooms found</div>
        ) : (
          classrooms.map(c => (
            <div key={c._id} className="bg-gray-800 rounded-xl border border-gray-700 p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-white font-semibold">{c.name}</h3>
                  <p className="text-gray-400 text-sm">Room {c.roomNumber} • {c.building}</p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => startEdit(c)} className="text-blue-400 hover:text-blue-300 text-sm px-2">Edit</button>
                  <button onClick={() => handleDelete(c._id)} className="text-red-400 hover:text-red-300 text-sm px-2">Del</button>
                </div>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <span className="text-gray-400">Dept: <span className="text-gray-200">{c.department}</span></span>
                <span className="text-gray-400">Cap: <span className="text-gray-200">{c.capacity}</span></span>
              </div>
              <div className="mt-2 text-sm text-gray-400">
                Students: <span className="text-blue-400 font-medium">{c.students?.length || 0}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
