'use client';

import { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Mail,
  Lock,
  Shield,
  User,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Package,
  Trash2,
  Edit2,
  X,
  Save
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

interface UserData {
  user_id: number;
  name: string;
  email: string;
  role: string;
  created_at: string;
}

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  
  // Registration State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'staff'
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Users List State
  const [users, setUsers] = useState<UserData[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [editFormData, setEditFormData] = useState({ name: '', email: '', role: '' });
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const fetchUsers = async () => {
    try {
      setUsersLoading(true);
      const res = await apiFetch('/auth/users');
      if (res.success) {
        setUsers(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch users', err);
    } finally {
      setUsersLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser?.role === 'admin') {
      fetchUsers();
    }
  }, [currentUser]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await apiFetch('/auth/register', {
        method: 'POST',
        body: JSON.stringify(formData)
      });

      if (response.success) {
        setSuccess(true);
        setFormData({ name: '', email: '', password: '', role: 'staff' });
        fetchUsers();
      }
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (userId: number) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
      setActionLoading(userId);
      await apiFetch(`/auth/users/${userId}`, { method: 'DELETE' });
      setUsers(users.filter(u => u.user_id !== userId));
    } catch (err: any) {
      alert(err.message || 'Failed to delete user');
    } finally {
      setActionLoading(null);
    }
  };

  const handleEditClick = (user: UserData) => {
    setEditingUserId(user.user_id);
    setEditFormData({ name: user.name, email: user.email, role: user.role });
  };

  const handleSaveEdit = async (userId: number) => {
    try {
      setActionLoading(userId);
      const res = await apiFetch(`/auth/users/${userId}`, {
        method: 'PUT',
        body: JSON.stringify(editFormData)
      });
      if (res.success) {
        setUsers(users.map(u => u.user_id === userId ? res.data : u));
        setEditingUserId(null);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update user');
    } finally {
      setActionLoading(null);
    }
  };

  if (currentUser?.role !== 'admin') {
    return (
      <div className="h-[70vh] flex flex-col items-center justify-center text-center px-4">
        <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mb-6">
          <Shield size={40} />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Access Denied</h1>
        <p className="text-slate-500 max-w-sm">
          You do not have administrative privileges to access this page. Please contact your system administrator.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-[1280px] mx-auto px-4 py-8 space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">User Management</h1>
        <p className="text-sm text-slate-500 mt-1">
          Create and manage system access for your team members.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Registration Form */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50">
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <UserPlus size={18} className="text-indigo-600" />
                Register New User
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {success && (
                <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center gap-3">
                  <CheckCircle2 className="text-emerald-500" size={20} />
                  <p className="text-xs font-bold text-emerald-700">User registered successfully!</p>
                </div>
              )}

              {error && (
                <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl flex items-center gap-3">
                  <AlertCircle className="text-rose-500" size={20} />
                  <p className="text-xs font-bold text-rose-700">{error}</p>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    required
                    type="text"
                    placeholder="John Doe"
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    required
                    type="email"
                    placeholder="john@example.com"
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Initial Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    required
                    type="password"
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">System Role</label>
                <div className="relative">
                  <Shield className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <select
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none appearance-none"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  >
                    <option value="staff">Staff (View & Stock)</option>
                    <option value="manager">Manager (Edit Products)</option>
                    <option value="admin">Admin (Full Access)</option>
                    <option value="auditor">Auditor (Read Only)</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-indigo-600 text-white rounded-lg font-bold text-sm hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100 disabled:opacity-70 mt-2"
              >
                {loading ? <Loader2 className="animate-spin" size={18} /> : (
                  <>
                    <UserPlus size={18} />
                    Create User
                  </>
                )}
              </button>
            </form>
          </div>
          
          <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6">
            <h4 className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-2">
              <AlertCircle size={16} className="text-indigo-600" />
              Role Reference
            </h4>
            <div className="space-y-3 mt-4 text-xs">
              <p><strong>Admin:</strong> User Management & Oversight. No operational write access.</p>
              <p><strong>Manager:</strong> Catalog editing, inventory management, approving orders.</p>
              <p><strong>Staff:</strong> View inventory and create stock IN/OUT requests.</p>
              <p><strong>Auditor:</strong> Read-only access to view system activity and logs.</p>
            </div>
          </div>
        </div>

        {/* Right Column: User List */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden h-full flex flex-col">
            <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Users size={18} className="text-indigo-600" />
                Active Users
              </h2>
              <span className="text-xs font-bold bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full">
                {users.length} Users
              </span>
            </div>
            
            <div className="flex-1 overflow-auto p-0">
              {usersLoading ? (
                <div className="p-10 flex justify-center text-slate-400">
                  <Loader2 className="animate-spin" size={32} />
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-slate-500 font-bold text-[10px] uppercase tracking-widest text-left">
                    <tr>
                      <th className="px-6 py-3">Name</th>
                      <th className="px-6 py-3">Email</th>
                      <th className="px-6 py-3">Role</th>
                      <th className="px-6 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {users.map((u) => (
                      <tr key={u.user_id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4">
                          {editingUserId === u.user_id ? (
                            <input 
                              type="text" 
                              className="border border-slate-300 rounded px-2 py-1 text-sm w-full"
                              value={editFormData.name}
                              onChange={e => setEditFormData({...editFormData, name: e.target.value})}
                            />
                          ) : (
                            <div className="font-bold text-slate-800 flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex justify-center items-center text-[10px]">
                                {u.name.charAt(0).toUpperCase()}
                              </div>
                              {u.name}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-slate-600">
                          {editingUserId === u.user_id ? (
                            <input 
                              type="email" 
                              className="border border-slate-300 rounded px-2 py-1 text-sm w-full"
                              value={editFormData.email}
                              onChange={e => setEditFormData({...editFormData, email: e.target.value})}
                            />
                          ) : (
                            u.email
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {editingUserId === u.user_id ? (
                            <select 
                              className="border border-slate-300 rounded px-2 py-1 text-sm w-full"
                              value={editFormData.role}
                              onChange={e => setEditFormData({...editFormData, role: e.target.value})}
                            >
                              <option value="staff">Staff</option>
                              <option value="manager">Manager</option>
                              <option value="admin">Admin</option>
                              <option value="auditor">Auditor</option>
                            </select>
                          ) : (
                            <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                              u.role === 'admin' ? 'bg-rose-100 text-rose-700' :
                              u.role === 'manager' ? 'bg-indigo-100 text-indigo-700' :
                              u.role === 'auditor' ? 'bg-amber-100 text-amber-700' :
                              'bg-slate-100 text-slate-700'
                            }`}>
                              {u.role}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            {editingUserId === u.user_id ? (
                              <>
                                <button onClick={() => handleSaveEdit(u.user_id)} disabled={actionLoading === u.user_id} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded disabled:opacity-50">
                                  {actionLoading === u.user_id ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                </button>
                                <button onClick={() => setEditingUserId(null)} disabled={actionLoading === u.user_id} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded disabled:opacity-50">
                                  <X size={16} />
                                </button>
                              </>
                            ) : (
                              <>
                                <button onClick={() => handleEditClick(u)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors">
                                  <Edit2 size={16} />
                                </button>
                                <button 
                                  onClick={() => handleDelete(u.user_id)} 
                                  disabled={u.user_id === currentUser?.user_id || actionLoading === u.user_id}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
                                  title={u.user_id === currentUser?.user_id ? "Cannot delete yourself" : "Delete user"}
                                >
                                  {actionLoading === u.user_id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
