'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Package,
  TrendingUp,
  AlertTriangle,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Clock,
  CheckCircle2,
  XCircle,
  LayoutGrid,
  Loader2,
  ChevronRight
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

function StatCard({ label, value, change, up, sub, icon: Icon, iconBg, iconColor }: any) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 flex flex-col gap-4 hover:shadow-lg transition-all duration-200 hover:-translate-y-1">
      <div className="flex items-start justify-between">
        <div
          className="flex items-center justify-center rounded-lg"
          style={{ width: 42, height: 42, background: iconBg }}
        >
          <Icon size={20} style={{ color: iconColor }} strokeWidth={2} />
        </div>
        {change && (
          <div
            className="flex items-center gap-1 text-xs font-semibold rounded-full px-2 py-0.5"
            style={{
              background: up ? '#f0fdf4' : '#fff7ed',
              color: up ? '#16a34a' : '#ea580c',
            }}
          >
            {up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
            {change}
          </div>
        )}
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-900 leading-tight">{value}</p>
        <p className="text-sm text-slate-500 mt-0.5">{label}</p>
        <p className="text-xs text-slate-400 mt-1">{sub}</p>
      </div>
    </div>
  );
}

export default function Home() {
  const { user } = useAuth();
  const router = useRouter();
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await apiFetch('/dashboard/');
      if (response.success) {
        setDashboardData(response.data);
      }
    } catch (err: any) {
      console.error('Failed to fetch dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="h-[80vh] flex flex-col items-center justify-center">
        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-4" />
        <p className="text-slate-500 font-medium">Assembling your workspace...</p>
      </div>
    );
  }

  const stats = [
    {
      label: 'Total Products',
      value: dashboardData?.total_products || 0,
      sub: 'Items in catalog',
      icon: Package,
      iconBg: '#eff6ff',
      iconColor: '#3b82f6',
    },
    {
      label: 'Inventory Value',
      value: `$${(dashboardData?.total_inventory_value || 0).toLocaleString()}`,
      sub: 'Total asset value',
      icon: DollarSign,
      iconBg: '#f0fdf4',
      iconColor: '#22c55e',
    },
    {
      label: 'Out of Stock',
      value: dashboardData?.out_of_stock_count || 0,
      sub: 'Need immediate action',
      icon: XCircle,
      iconBg: '#fff1f2',
      iconColor: '#f43f5e',
    },
    {
      label: 'Active Categories',
      value: dashboardData?.total_categories || 0,
      sub: 'Product groups',
      icon: LayoutGrid,
      iconBg: '#f5f3ff',
      iconColor: '#8b5cf6',
    },
  ];

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto' }}>
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-7">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard Overview</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Welcome back, {user?.name || 'User'}. Here's what's happening today.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="flex items-center gap-1.5 text-xs font-semibold rounded-full px-3 py-1.5 bg-emerald-50 text-emerald-600 border border-emerald-100"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            System Live
          </span>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-7">
        {stats.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </div>

      {/* Main Content: Table + Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Recent Transactions */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-800">Recent Movements</h2>
              <p className="text-xs text-slate-400 mt-0.5">Latest inbound and outbound activity</p>
            </div>
            <button
              onClick={() => router.push('/stock')}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
            >
              View Stock
              <ChevronRight size={14} />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="px-6 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Product</th>
                  <th className="px-6 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Qty</th>
                  <th className="px-6 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {(dashboardData?.recent_transactions || []).map((tx: any) => (
                  <tr key={tx.transaction_id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-slate-800 truncate max-w-[200px]">{tx.product_name}</p>
                      <p className="text-[10px] font-mono text-slate-400 mt-0.5">{tx.sku}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${tx.type === 'IN' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                        }`}>
                        {tx.type}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-sm font-bold ${tx.type === 'IN' ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {tx.type === 'IN' ? '+' : '-'}{tx.quantity}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-xs text-slate-500 font-medium">{new Date(tx.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {(!dashboardData?.recent_transactions || dashboardData.recent_transactions.length === 0) && (
              <div className="py-20 text-center">
                <Clock className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                <p className="text-slate-400 text-sm">No recent transactions recorded.</p>
              </div>
            )}
          </div>
        </div>

        {/* Critical Alerts & Low Stock */}
        <div className="space-y-6">
          {/* Low Stock Panel */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <AlertTriangle size={16} className="text-amber-500" />
                Low Stock Items
              </h2>
              <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                {dashboardData?.low_stock_count || 0} Alerting
              </span>
            </div>
            <div className="p-4 space-y-3">
              {(dashboardData?.low_stock_items || []).slice(0, 4).map((item: any) => (
                <div key={item.product_id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 group hover:border-amber-200 transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <p className="text-xs font-bold text-slate-800 truncate max-w-[150px]">{item.product_name}</p>
                    <span className="text-[10px] font-bold text-rose-500">Only {item.current_stock} left</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-rose-500 rounded-full"
                      style={{ width: `${(item.current_stock / item.min_stock) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
              {(!dashboardData?.low_stock_items || dashboardData.low_stock_items.length === 0) && (
                <div className="py-8 text-center bg-emerald-50 rounded-xl border border-emerald-100">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                  <p className="text-emerald-700 text-xs font-bold">Inventory Healthy</p>
                </div>
              )}
              <button
                onClick={() => router.push('/alerts')}
                className="w-full py-2.5 text-xs font-bold text-indigo-600 bg-indigo-50 rounded-xl hover:bg-indigo-100 transition-colors mt-2"
              >
                Manage All Alerts
              </button>
            </div>
          </div>

          {/* Quick Stats Summary */}
          <div className="bg-indigo-600 rounded-2xl p-6 text-white shadow-lg shadow-indigo-100 relative overflow-hidden">
            <TrendingUp className="absolute -right-4 -bottom-4 w-24 h-24 text-indigo-500 opacity-20" />
            <p className="text-xs font-bold uppercase tracking-widest text-indigo-100 mb-4">Operations Summary</p>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-indigo-100">Active Alerts</span>
                <span className="text-lg font-bold">{dashboardData?.active_alerts || 0}</span>
              </div>
              <div className="flex justify-between items-center border-t border-indigo-500 pt-4">
                <span className="text-sm font-medium text-indigo-100">Out of Stock</span>
                <span className="text-lg font-bold">{dashboardData?.out_of_stock_count || 0}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
