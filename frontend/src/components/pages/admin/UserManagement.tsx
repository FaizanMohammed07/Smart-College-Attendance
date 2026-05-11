import { useState, useEffect, useCallback } from 'react';
import { adminAPI } from '../../../services/api';

interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  facultyProfile?: any;
  studentProfile?: any;
  childStudent?: any;
  createdAt: string;
}

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'student' as string });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (roleFilter) params.role = roleFilter;
      const res = await adminAPI.getUsers(params);
      setUsers(res.data.data);
    } catch { /* ignore */ } finally { setLoading(false); }
  }, [roleFilter]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editingUser) {
        await adminAPI.updateUser(editingUser._id, form);
        showToast('User updated');
      } else {
        await adminAPI.createUser(form);
        showToast('User created');
      }
      setShowForm(false);
      setEditingUser(null);
      setForm({ name: '', email: '', password: '', role: 'student' });
      fetchUsers();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Error saving user');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this user?')) return;
    try {
      await adminAPI.deleteUser(id);
      showToast('User deleted');
      fetchUsers();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Error deleting user');
    }
  };

  const startEdit = (user: User) => {
    setEditingUser(user);
    setForm({ name: user.name, email: user.email, password: '', role: user.role });
    setShowForm(true);
  };

  const roleBadge = (role: string) => {
    const colors: Record<string, string> = {
      admin: 'bg-red-900/50 text-red-300',
      faculty: 'bg-emerald-900/50 text-emerald-300',
      student: 'bg-purple-900/50 text-purple-300',
      parent: 'bg-amber-900/50 text-amber-300',
    };
    return colors[role] || 'bg-gray-700 text-gray-300';
  };

  return (
    <div className="p-6 space-y-6">
      {toast && (
        <div className="fixed top-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 animate-pulse">
          {toast}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">User Management</h1>
          <p className="text-gray-400 mt-1">Manage system accounts for all roles</p>
        </div>
        <button onClick={() => { setEditingUser(null); setForm({ name: '', email: '', password: '', role: 'student' }); setShowForm(true); }}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">
          + Add User
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {['', 'admin', 'faculty', 'student', 'parent'].map(r => (
          <button key={r} onClick={() => setRoleFilter(r)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${roleFilter === r ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}>
            {r || 'All'}
          </button>
        ))}
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-40 p-4" onClick={() => setShowForm(false)}>
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-white mb-4">{editingUser ? 'Edit User' : 'Create User'}</h2>
            <div className="space-y-4">
              <input placeholder="Full Name" value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <input placeholder="Email" type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <input placeholder={editingUser ? 'New password (leave blank to keep)' : 'Password'} type="password"
                value={form.password} onChange={e => setForm({...form, password: e.target.value})}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <select value={form.role} onChange={e => setForm({...form, role: e.target.value})}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="admin">Admin</option>
                <option value="faculty">Faculty</option>
                <option value="student">Student</option>
                <option value="parent">Parent</option>
              </select>
              <div className="flex gap-3 pt-2">
                <button onClick={handleSave} disabled={saving}
                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-medium">
                  {saving ? 'Saving...' : editingUser ? 'Update' : 'Create'}
                </button>
                <button onClick={() => setShowForm(false)}
                  className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg font-medium">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400">Loading users...</div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center text-gray-400">No users found</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">Name</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">Email</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">Role</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">Status</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {users.map(u => (
                <tr key={u._id} className="hover:bg-gray-700/50">
                  <td className="px-4 py-3 text-sm text-white font-medium">{u.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-300">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${roleBadge(u.role)}`}>{u.role}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${u.isActive ? 'bg-green-900/50 text-green-300' : 'bg-gray-700 text-gray-400'}`}>
                      {u.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button onClick={() => startEdit(u)} className="text-blue-400 hover:text-blue-300 text-sm">Edit</button>
                    {u.role !== 'admin' && (
                      <button onClick={() => handleDelete(u._id)} className="text-red-400 hover:text-red-300 text-sm">Delete</button>
                    )}
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
