'use client';

import { useState } from 'react';
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
  Package
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'staff'
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      }
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
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
    <div className="max-w-[1280px] mx-auto px-4 py-8">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">User Management</h1>
        <p className="text-sm text-slate-500 mt-1">
          Create and manage system access for your team members.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Registration Form */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <UserPlus size={18} className="text-indigo-600" />
              Register New User
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            {success && (
              <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-1">
                <CheckCircle2 className="text-emerald-500" size={20} />
                <p className="text-sm font-bold text-emerald-700">User registered successfully!</p>
              </div>
            )}

            {error && (
              <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-1">
                <AlertCircle className="text-rose-500" size={20} />
                <p className="text-sm font-bold text-rose-700">{error}</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    required
                    type="text"
                    placeholder="John Doe"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    required
                    type="email"
                    placeholder="john@example.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Initial Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    required
                    type="password"
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">System Role</label>
                <div className="relative">
                  <Shield className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <select
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none appearance-none"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  >
                    <option value="staff">Staff (View & Stock Only)</option>
                    <option value="manager">Manager (Product Editing)</option>
                    <option value="admin">Administrator (Full Access)</option>
                  </select>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 disabled:opacity-70 mt-4"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : (
                <>
                  <UserPlus size={20} />
                  Create User Account
                </>
              )}
            </button>
          </form>
        </div>

        {/* Roles Info */}
        <div className="space-y-6">
          <div className="bg-indigo-600 rounded-2xl p-8 text-white shadow-xl shadow-indigo-100 relative overflow-hidden">
            <Users className="absolute -right-8 -bottom-8 w-40 h-40 text-indigo-500 opacity-20" />
            <h3 className="text-xl font-bold mb-6">Permission Hierarchy</h3>

            <div className="space-y-6 relative z-10">
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-lg bg-indigo-500/30 flex items-center justify-center shrink-0">
                  <Shield size={20} />
                </div>
                <div>
                  <p className="font-bold text-sm">Administrator</p>
                  <p className="text-xs text-indigo-100 mt-1 leading-relaxed">Full access to system settings, user management, and all inventory modules.</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-lg bg-indigo-500/30 flex items-center justify-center shrink-0">
                  <Package size={20} />
                </div>
                <div>
                  <p className="font-bold text-sm">Manager</p>
                  <p className="text-xs text-indigo-100 mt-1 leading-relaxed">Can add/edit products and categories, manage stock, and view all reports.</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-lg bg-indigo-500/30 flex items-center justify-center shrink-0">
                  <ArrowRight size={20} />
                </div>
                <div>
                  <p className="font-bold text-sm">Staff</p>
                  <p className="text-xs text-indigo-100 mt-1 leading-relaxed">Limited to stock movements (IN/OUT) and viewing current inventory levels.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6">
            <h4 className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-2">
              <AlertCircle size={16} className="text-indigo-600" />
              Security Policy
            </h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              New users will be able to log in immediately using the email and password you provide. Ensure you follow your company's password security guidelines when creating new accounts.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
