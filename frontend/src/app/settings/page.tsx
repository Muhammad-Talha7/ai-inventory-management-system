'use client';

import { useState, useEffect } from 'react';
import { 
  User, 
  Lock, 
  Shield, 
  Bell, 
  Palette, 
  Globe, 
  Save, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  Mail,
  Camera,
  LogOut,
  Info
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setProfileData(prev => ({
        ...prev,
        name: user.name,
        email: user.email
      }));
    }
  }, [user]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const body: any = { name: profileData.name, email: profileData.email };
      if (profileData.password) body.password = profileData.password;

      const response = await apiFetch('/auth/me', {
        method: 'PUT',
        body: JSON.stringify(body)
      });

      if (response.success) {
        setSuccess(true);
        setProfileData(prev => ({ ...prev, password: '' }));
        // Refresh page or context would be ideal here
        window.location.reload(); 
      }
    } catch (err: any) {
      setError(err.message || 'Update failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-[1000px] mx-auto px-4 py-8 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">System Settings</h1>
          <p className="text-slate-500 font-medium mt-1">Manage your account preferences and system configuration.</p>
        </div>
        <button 
          onClick={logout}
          className="flex items-center gap-2 px-4 py-2 text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl font-bold text-xs transition-colors"
        >
          <LogOut size={16} />
          Sign Out
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left: Navigation Tabs (Visual only for now) */}
        <div className="lg:col-span-1 space-y-2">
          {[
            { icon: User, label: 'Profile Details', active: true },
            { icon: Bell, label: 'Notifications', active: false },
            { icon: Shield, label: 'Security & Access', active: false },
            { icon: Palette, label: 'Appearance', active: false },
            { icon: Globe, label: 'Localization', active: false },
          ].map((item) => (
            <button 
              key={item.label}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold text-sm transition-all ${
                item.active 
                  ? 'bg-slate-900 text-white shadow-lg shadow-slate-200' 
                  : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              <item.icon size={18} />
              {item.label}
            </button>
          ))}
        </div>

        {/* Right: Active Settings Panel */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Profile Section */}
          <div className="glass-card rounded-[32px] overflow-hidden">
             <div className="p-8 border-b border-slate-50 bg-slate-50/30">
                <div className="flex items-center gap-6">
                   <div className="relative group">
                      <div className="w-20 h-20 rounded-[24px] bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-2xl font-black shadow-lg shadow-indigo-100">
                         {user?.name?.charAt(0) || 'U'}
                      </div>
                      <button className="absolute -bottom-2 -right-2 p-2 bg-white rounded-xl shadow-lg border border-slate-100 text-slate-400 hover:text-indigo-600 transition-colors">
                         <Camera size={14} />
                      </button>
                   </div>
                   <div>
                      <h3 className="text-xl font-black text-slate-900">{user?.name}</h3>
                      <p className="text-xs font-bold text-indigo-500 uppercase tracking-widest mt-1">{user?.role} Account</p>
                   </div>
                </div>
             </div>

             <form onSubmit={handleUpdateProfile} className="p-8 space-y-6">
                {success && (
                  <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-3">
                    <CheckCircle2 className="text-emerald-500" size={20} />
                    <p className="text-sm font-bold text-emerald-700">Profile synchronized successfully!</p>
                  </div>
                )}

                {error && (
                  <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3">
                    <AlertCircle className="text-rose-500" size={20} />
                    <p className="text-sm font-bold text-rose-700">{error}</p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Full Name</label>
                      <div className="relative">
                         <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                         <input 
                           type="text"
                           className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:bg-white focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500/20 outline-none transition-all"
                           value={profileData.name}
                           onChange={(e) => setProfileData({...profileData, name: e.target.value})}
                         />
                      </div>
                   </div>
                   <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Email Address</label>
                      <div className="relative">
                         <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                         <input 
                           type="email"
                           className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:bg-white focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500/20 outline-none transition-all"
                           value={profileData.email}
                           onChange={(e) => setProfileData({...profileData, email: e.target.value})}
                         />
                      </div>
                   </div>
                </div>

                <div className="space-y-1.5">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Update Password</label>
                   <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input 
                        type="password"
                        placeholder="Leave blank to keep current"
                        className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:bg-white focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500/20 outline-none transition-all"
                        value={profileData.password}
                        onChange={(e) => setProfileData({...profileData, password: e.target.value})}
                      />
                   </div>
                </div>

                <div className="pt-4">
                   <button 
                     type="submit"
                     disabled={loading}
                     className="w-full flex items-center justify-center gap-2 py-4 bg-slate-900 text-white rounded-[20px] font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 disabled:opacity-70"
                   >
                     {loading ? <Loader2 className="animate-spin" size={18} /> : (
                       <>
                         <Save size={18} />
                         Commit Changes
                       </>
                     )}
                   </button>
                </div>
             </form>
          </div>

          {/* System Info */}
          <div className="bg-slate-50 rounded-[32px] p-8 border border-slate-100 space-y-6">
             <h3 className="text-sm font-black text-slate-900 flex items-center gap-2 uppercase tracking-widest">
                <Info size={16} className="text-indigo-600" />
                System Information
             </h3>
             <div className="grid grid-cols-2 gap-6">
                <div>
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Version</p>
                   <p className="text-sm font-black text-slate-900">NexStock Core v2.4.1</p>
                </div>
                <div>
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Database Sync</p>
                   <p className="text-sm font-black text-emerald-600">Active / Optimized</p>
                </div>
                <div>
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Workspace ID</p>
                   <p className="text-xs font-mono text-slate-500">NS-GLOBAL-7420</p>
                </div>
                <div>
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Last Login</p>
                   <p className="text-sm font-black text-slate-900">Today, 14:22</p>
                </div>
             </div>
          </div>

        </div>
      </div>
    </div>
  );
}
