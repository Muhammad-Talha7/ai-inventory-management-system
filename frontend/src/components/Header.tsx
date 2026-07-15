'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Search,
  Bell,
  Plus,
  X,
  AlertTriangle,
  Check,
  ArrowRight,
  Loader2,
  Package,
  Clock
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

export default function Header() {
  const { user } = useAuth();
  const router = useRouter();
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchNotifications();

    // Close dropdown on click outside
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await apiFetch('/alerts/?status=active');
      if (response.success) {
        setNotifications(response.data.slice(0, 5)); // Only show top 5
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    try {
      const response = await apiFetch(`/alerts/${id}/resolve`, { method: 'PUT' });
      if (response.success) {
        fetchNotifications();
      }
    } catch (err) {
      console.error('Resolve failed:', err);
    }
  };

  return (
    <header
      className="bg-white border-b border-slate-200 flex items-center gap-4 shrink-0 relative"
      style={{ height: '64px', padding: '0 32px', zIndex: 50 }}
    >
      {/* Search */}
      <div className="flex-1 max-w-md">
        <div className="relative">
          <Search
            size={15}
            className="absolute text-slate-400"
            style={{ top: '50%', left: 12, transform: 'translateY(-50%)' }}
          />
          <input
            type="text"
            placeholder="Search products, SKUs, alerts..."
            className="w-full bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 placeholder-slate-400 outline-none transition-all pr-4 py-2 pl-9"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 ml-auto">
        {/* New Restock Button */}
        {user?.role !== 'admin' && user?.role !== 'auditor' && (
          <button
            onClick={() => router.push('/stock')}
            className="flex items-center gap-1.5 text-white bg-indigo-600 rounded-lg text-sm font-semibold transition-all hover:bg-indigo-700 px-4 py-2"
          >
            <Plus size={15} strokeWidth={2.5} />
            New Restock
          </button>
        )}

        {/* Notifications */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => {
              setIsNotificationsOpen(!isNotificationsOpen);
              if (!isNotificationsOpen) fetchNotifications();
            }}
            className={`relative flex items-center justify-center rounded-lg border transition-all w-[38px] h-[38px] ${isNotificationsOpen ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
              }`}
          >
            <Bell size={16} />
            {notifications.length > 0 && !isNotificationsOpen && (
              <span
                className="absolute rounded-full bg-rose-500 border-2 border-white w-2.5 h-2.5"
                style={{ top: 6, right: 6 }}
              />
            )}
          </button>

          {/* Notifications Dropdown */}
          {isNotificationsOpen && (
            <div className="absolute right-0 mt-3 w-80 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="px-5 py-4 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900">Notifications</h3>
                  {notifications.length > 0 && (
                    <span className="bg-rose-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                      {notifications.length}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => fetchNotifications()}
                  className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg transition-colors"
                >
                  <Clock size={14} />
                </button>
              </div>

              <div className="max-h-[380px] overflow-y-auto">
                {loading && notifications.length === 0 ? (
                  <div className="py-12 flex flex-col items-center justify-center">
                    <Loader2 className="w-6 h-6 text-indigo-600 animate-spin mb-2" />
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Checking alerts...</p>
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="py-12 flex flex-col items-center justify-center text-center px-6">
                    <div className="w-12 h-12 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mb-4">
                      <Check size={24} />
                    </div>
                    <p className="text-sm font-bold text-slate-900">All clear!</p>
                    <p className="text-xs text-slate-400 mt-1">No active stock alerts found at the moment.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-50">
                    {notifications.map((alert) => (
                      <div
                        key={alert.id}
                        className="px-5 py-4 hover:bg-slate-50 transition-colors cursor-pointer group"
                        onClick={() => { setIsNotificationsOpen(false); router.push('/alerts'); }}
                      >
                        <div className="flex gap-3">
                          <div className={`mt-1 p-2 rounded-lg shrink-0 ${
                            alert.alert_type === 'LOW_STOCK' || alert.alert_type === 'PO_OVERDUE' || alert.alert_type === 'STOCK_REQ_REJECTED' ? 'bg-rose-50 text-rose-500' : 
                            alert.alert_type === 'STOCK_REQ_APPROVED' || alert.alert_type === 'PO_APPROVED' ? 'bg-emerald-50 text-emerald-500' :
                            alert.alert_type === 'STOCK_REQ_SUBMITTED' ? 'bg-amber-50 text-amber-500' :
                            'bg-indigo-50 text-indigo-500'
                          }`}>
                            <AlertTriangle size={14} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-slate-900 leading-tight mb-1">{alert.message}</p>
                            <div className="flex items-center gap-2 text-[10px] text-slate-400 font-medium">
                              <Package size={10} />
                              <span>{alert.product_name}</span>
                            </div>
                            <p className="text-[10px] text-slate-300 mt-2">
                              {new Date(alert.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                          <button
                            onClick={(e) => handleResolve(e, alert.id)}
                            className="h-7 w-7 rounded-full border border-slate-100 flex items-center justify-center text-slate-300 hover:bg-emerald-50 hover:text-emerald-500 hover:border-emerald-100 transition-all"
                          >
                            <Check size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-3 bg-slate-50 border-t border-slate-100">
                <button
                  onClick={() => { setIsNotificationsOpen(false); router.push('/alerts'); }}
                  className="w-full py-2 text-xs font-bold text-slate-500 hover:text-indigo-600 transition-colors flex items-center justify-center gap-1"
                >
                  View All Activity
                  <ArrowRight size={12} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="w-px bg-slate-200 mx-1 h-7" />

        {/* User */}
        <button className="flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 transition-colors hover:bg-slate-50">
          <div
            className="rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0 w-8 h-8"
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
          >
            {user?.name?.charAt(0) || 'U'}
          </div>
          <div className="text-left hidden md:block">
            <p className="text-sm font-semibold text-slate-800 leading-none mb-1">
              {user?.name || 'Loading...'}
            </p>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none">
              {user?.role || 'User'}
            </p>
          </div>
        </button>
      </div>
    </header>
  );
}
