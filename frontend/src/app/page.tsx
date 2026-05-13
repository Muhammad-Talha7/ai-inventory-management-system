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
  Clock,
  CheckCircle2,
  XCircle,
  LayoutGrid,
  Loader2,
  ChevronRight,
  Brain,
  ShoppingCart,
  Sparkles,
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

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

const ForecastTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-slate-200 px-3 py-2 rounded-xl shadow-lg text-xs">
        <p className="font-bold text-slate-400 mb-0.5">{label}</p>
        <p className="font-black text-indigo-600">
          {payload[0].value} <span className="font-medium text-slate-400">units</span>
        </p>
      </div>
    );
  }
  return null;
};

export default function Home() {
  const { user } = useAuth();
  const router = useRouter();
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [forecastData, setForecastData] = useState<any[]>([]);
  const [forecastProduct, setForecastProduct] = useState<string>('');
  const [forecastLoading, setForecastLoading] = useState(true);

  const [reorderData, setReorderData] = useState<any[]>([]);
  const [reorderLoading, setReorderLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
    fetchForecastPreview();
    fetchReorderPreview();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await apiFetch('/dashboard/');
      if (response.success) setDashboardData(response.data);
    } catch (err: any) {
      console.error('Failed to fetch dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchForecastPreview = async () => {
    try {
      setForecastLoading(true);
      const prodRes = await apiFetch('/products/?limit=1');
      if (prodRes.success && prodRes.data.length > 0) {
        const pid = prodRes.data[0].product_id;
        setForecastProduct(prodRes.data[0].product_name);
        const fRes = await apiFetch(`/forecast/${pid}?weeks=8`);
        if (fRes.success) {
          setForecastData(
            fRes.data.map((d: any) => ({
              ...d,
              label: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            }))
          );
        }
      }
    } catch {
      // silently fail — model may not be trained yet
    } finally {
      setForecastLoading(false);
    }
  };

  const fetchReorderPreview = async () => {
    try {
      setReorderLoading(true);
      const res = await apiFetch('/forecast/reorder-suggestions');
      if (res.success) setReorderData(res.data.slice(0, 5));
    } catch {
      // silently fail
    } finally {
      setReorderLoading(false);
    }
  };

  const getUrgencyStyle = (s: any) => {
    const ratio = s.suggested_reorder_quantity / s.projected_demand;
    if (ratio >= 0.7) return { dot: 'bg-red-500', badge: 'bg-red-50 text-red-600' };
    if (ratio >= 0.35) return { dot: 'bg-amber-400', badge: 'bg-amber-50 text-amber-600' };
    return { dot: 'bg-blue-400', badge: 'bg-blue-50 text-blue-600' };
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
          <span className="flex items-center gap-1.5 text-xs font-semibold rounded-full px-3 py-1.5 bg-emerald-50 text-emerald-600 border border-emerald-100">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            System Live
          </span>
        </div>
      </div>

      {/* ── AI Row (TOP): Forecast Chart + Reorder Suggestions ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-7">

        {/* AI Forecast Mini Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-indigo-50 rounded-full text-indigo-600 text-[10px] font-black uppercase tracking-widest mb-1">
                <Sparkles size={10} />
                AI Powered
              </div>
              <h2 className="text-base font-bold text-slate-800">Demand Forecast</h2>
              <p className="text-xs text-slate-400 mt-0.5 truncate max-w-xs">
                {forecastProduct ? `8-week prediction · ${forecastProduct}` : '8-week demand prediction'}
              </p>
            </div>
            <button
              onClick={() => router.push('/forecasts')}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 shrink-0"
            >
              Full Analysis
              <ChevronRight size={14} />
            </button>
          </div>

          <div className="p-6">
            {forecastLoading ? (
              <div className="h-[220px] flex flex-col items-center justify-center bg-slate-50 rounded-xl gap-3">
                <Brain size={32} className="text-indigo-300 animate-bounce" />
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Generating Predictions...</p>
              </div>
            ) : forecastData.length === 0 ? (
              <div className="h-[220px] flex flex-col items-center justify-center bg-slate-50 rounded-xl gap-3">
                <Brain size={32} className="text-slate-300" />
                <p className="text-sm font-bold text-slate-400">Model not trained yet</p>
                <button
                  onClick={() => router.push('/forecasts')}
                  className="text-xs font-bold text-indigo-600 hover:underline"
                >
                  Train the model →
                </button>
              </div>
            ) : (
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={forecastData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                    <defs>
                      <linearGradient id="dashForecast" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                      dataKey="label"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                      dy={8}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                    />
                    <Tooltip content={<ForecastTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="predicted_demand"
                      stroke="#6366f1"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#dashForecast)"
                      dot={{ r: 3, fill: '#6366f1', strokeWidth: 0 }}
                      activeDot={{ r: 5, fill: '#6366f1' }}
                      animationDuration={1500}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        {/* Reorder Suggestions Panel */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-5 py-5 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <ShoppingCart size={16} className="text-rose-500" />
                Reorder Suggestions
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">Products under forecasted demand</p>
            </div>
            <button
              onClick={() => router.push('/reorder')}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 shrink-0"
            >
              View All
              <ChevronRight size={14} />
            </button>
          </div>

          <div className="flex-1 p-4 space-y-2 overflow-y-auto">
            {reorderLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl animate-pulse">
                  <div className="w-8 h-8 bg-slate-100 rounded-lg shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-2.5 bg-slate-100 rounded w-3/4" />
                    <div className="h-2 bg-slate-50 rounded w-1/2" />
                  </div>
                  <div className="h-5 w-10 bg-slate-100 rounded-lg" />
                </div>
              ))
            ) : reorderData.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-3">
                <CheckCircle2 size={36} className="text-emerald-400" />
                <p className="text-sm font-bold text-slate-500 text-center">All products well stocked!</p>
                <p className="text-xs text-slate-400 text-center">No reorders needed in the next 30 days.</p>
              </div>
            ) : (
              reorderData.map((s: any) => {
                const style = getUrgencyStyle(s);
                const covered = Math.min(100, Math.round((s.current_stock / s.projected_demand) * 100));
                return (
                  <div
                    key={s.product_id}
                    className="p-3 rounded-xl border border-slate-100 bg-slate-50 hover:border-slate-200 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${style.dot}`} />
                        <p className="text-xs font-bold text-slate-800 truncate">{s.product_name}</p>
                      </div>
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg shrink-0 ${style.badge}`}>
                        +{Math.round(s.suggested_reorder_quantity)}
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          covered < 40 ? 'bg-red-500' : covered < 70 ? 'bg-amber-400' : 'bg-blue-400'
                        }`}
                        style={{ width: `${covered}%` }}
                      />
                    </div>
                    <div className="flex justify-between mt-1.5">
                      <p className="text-[10px] text-slate-400 font-medium">Stock: {s.current_stock}</p>
                      <p className="text-[10px] text-indigo-500 font-bold">{covered}% covered</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {reorderData.length > 0 && (
            <div className="px-4 pb-4 pt-2 border-t border-slate-100">
              <button
                onClick={() => router.push('/reorder')}
                className="w-full py-2.5 text-xs font-bold text-rose-600 bg-rose-50 rounded-xl hover:bg-rose-100 transition-colors"
              >
                View All {reorderData.length}+ Suggestions →
              </button>
            </div>
          )}
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-7">
        {stats.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </div>

      {/* Main Content: Transactions + Alerts */}
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
                      <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${
                        tx.type === 'IN' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
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
                      <p className="text-xs text-slate-500 font-medium">
                        {new Date(tx.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
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
                <div key={item.product_id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 hover:border-amber-200 transition-colors">
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
