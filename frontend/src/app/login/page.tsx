'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Boxes, Mail, Lock, ArrowRight, AlertCircle, Loader2 } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      if (response.success && response.data.access_token) {
        login(response.data.access_token);
      }
    } catch (err: any) {
      setError(err.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden -z-10">
        <div className="absolute top-[10%] left-[5%] w-72 h-72 bg-indigo-100 rounded-full blur-3xl opacity-50" />
        <div className="absolute bottom-[10%] right-[5%] w-96 h-96 bg-purple-100 rounded-full blur-3xl opacity-50" />
      </div>

      <div className="w-full max-w-[420px]">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div
            className="flex items-center justify-center rounded-2xl mb-4 shadow-xl shadow-indigo-200"
            style={{ width: 60, height: 60, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
          >
            <Boxes className="text-white" size={32} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">
            Nex<span style={{ color: '#6366f1' }}>Stock</span>
          </h1>
          <p className="text-slate-500 text-sm mt-2">Sign in to manage your inventory</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
          {error && (
            <div className="mb-6 flex items-center gap-3 p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm">
              <AlertCircle size={18} className="shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5" htmlFor="email">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  id="email"
                  type="email"
                  required
                  placeholder="name@company.com"
                  className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-semibold text-slate-700" htmlFor="password">
                  Password
                </label>
                <a href="#" className="text-xs font-semibold text-indigo-600 hover:text-indigo-700">
                  Forgot password?
                </a>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  id="password"
                  type="password"
                  required
                  placeholder="••••••••"
                  className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center gap-2 py-1">
              <input
                id="remember"
                type="checkbox"
                className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <label htmlFor="remember" className="text-xs text-slate-500 font-medium cursor-pointer">
                Remember me for 30 days
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-all disabled:opacity-70 disabled:cursor-not-allowed shadow-lg shadow-indigo-100"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={18} />
              ) : (
                <>
                  Sign In
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-500">
              Don't have an account?{' '}
              <a href="#" className="font-bold text-indigo-600 hover:text-indigo-700">
                Contact your administrator
              </a>
            </p>
          </div>
        </div>

        {/* Footer info */}
        <p className="text-center text-xs text-slate-400 mt-8">
          &copy; 2026 NexStock AI Inventory Management. All rights reserved.
        </p>
      </div>
    </div>
  );
}
