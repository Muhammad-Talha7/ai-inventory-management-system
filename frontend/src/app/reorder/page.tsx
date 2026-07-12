'use client';

import { useState, useEffect } from 'react';
import {
  ShoppingCart,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Package,
  ArrowUpRight,
  Brain,
  Sparkles,
  ChevronUp,
  ChevronDown,
  Minus,
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { useRouter } from 'next/navigation';

interface ReorderSuggestion {
  product_id: string;
  product_name: string;
  current_stock: number;
  projected_demand: number;
  suggested_reorder_quantity: number;
}

type SortKey = 'suggested_reorder_quantity' | 'current_stock' | 'projected_demand' | 'product_name';
type SortDir = 'asc' | 'desc';

export default function ReorderSuggestionsPage() {
  const router = useRouter();
  const [suggestions, setSuggestions] = useState<ReorderSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('suggested_reorder_quantity');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [filter, setFilter] = useState<'all' | 'critical' | 'moderate' | 'low'>('all');

  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetchSuggestions();
  }, []);

  const fetchSuggestions = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiFetch('/forecast/reorder-suggestions');
      if (res.success) {
        setSuggestions(res.data);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch reorder suggestions. Ensure the model is trained.');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateOrders = async () => {
    try {
      setGenerating(true);
      const res = await apiFetch('/api/forecast/run-weekly', { method: 'POST' });
      alert(`Success! ${res.orders_scheduled} purchase orders were generated for the deficits.`);
      // Optionally redirect to purchase orders page
      router.push('/purchase-orders');
    } catch (err: any) {
      alert(err.message || 'Failed to generate purchase orders');
    } finally {
      setGenerating(false);
    }
  };

  const getUrgency = (s: ReorderSuggestion): 'critical' | 'moderate' | 'low' => {
    if (s.projected_demand === 0) return 'critical';
    const ratio = s.suggested_reorder_quantity / s.projected_demand;
    if (ratio >= 0.7) return 'critical';
    if (ratio >= 0.35) return 'moderate';
    return 'low';
  };

  const urgencyConfig = {
    critical: {
      label: 'Critical',
      bg: 'bg-red-50',
      text: 'text-red-600',
      badge: 'bg-red-100 text-red-700',
      bar: 'bg-red-500',
      dot: 'bg-red-500',
    },
    moderate: {
      label: 'Moderate',
      bg: 'bg-amber-50',
      text: 'text-amber-600',
      badge: 'bg-amber-100 text-amber-700',
      bar: 'bg-amber-400',
      dot: 'bg-amber-400',
    },
    low: {
      label: 'Low',
      bg: 'bg-blue-50',
      text: 'text-blue-600',
      badge: 'bg-blue-100 text-blue-700',
      bar: 'bg-blue-400',
      dot: 'bg-blue-400',
    },
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const filtered = suggestions.filter(s => filter === 'all' || getUrgency(s) === filter);
  const sorted = [...filtered].sort((a, b) => {
    const v = sortKey === 'product_name'
      ? a.product_name.localeCompare(b.product_name)
      : (a[sortKey] as number) - (b[sortKey] as number);
    return sortDir === 'asc' ? v : -v;
  });

  const counts = {
    critical: suggestions.filter(s => getUrgency(s) === 'critical').length,
    moderate: suggestions.filter(s => getUrgency(s) === 'moderate').length,
    low: suggestions.filter(s => getUrgency(s) === 'low').length,
  };

  const SortIcon = ({ k }: { k: SortKey }) => {
    if (sortKey !== k) return <Minus size={12} className="text-slate-300" />;
    return sortDir === 'desc'
      ? <ChevronDown size={12} className="text-indigo-600" />
      : <ChevronUp size={12} className="text-indigo-600" />;
  };

  const totalShortfall = suggestions.reduce((a, s) => a + s.suggested_reorder_quantity, 0);

  return (
    <div className="max-w-[1280px] mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-rose-50 rounded-full text-rose-600 font-black text-[10px] uppercase tracking-widest">
            <Brain size={12} />
            AI-Powered
          </div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900">Reorder Suggestions</h1>
          <p className="text-slate-500 font-medium max-w-xl">
            Products where <span className="text-indigo-600 font-bold">forecasted demand (30-day)</span> exceeds current stock. Sorted by most critical shortfall first.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={fetchSuggestions}
            disabled={loading || generating}
            className="flex items-center gap-2 px-5 py-3 bg-white border border-slate-200 text-slate-700 rounded-2xl font-bold text-sm hover:bg-slate-50 transition-all shadow-sm disabled:opacity-60"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            onClick={handleGenerateOrders}
            disabled={loading || generating || suggestions.length === 0}
            className="flex items-center gap-2 px-5 py-3 bg-indigo-600 text-white rounded-2xl font-bold text-sm hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 disabled:opacity-60"
          >
            {generating ? <RefreshCw size={16} className="animate-spin" /> : <ShoppingCart size={16} />}
            Generate Purchase Orders
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
          <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center mb-4">
            <Package size={20} className="text-slate-600" />
          </div>
          <p className="text-3xl font-black text-slate-900">{suggestions.length}</p>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Items Need Reorder</p>
        </div>

        <div className="bg-red-50 border border-red-100 rounded-3xl p-6">
          <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center mb-4">
            <AlertTriangle size={20} className="text-red-500" />
          </div>
          <p className="text-3xl font-black text-red-600">{counts.critical}</p>
          <p className="text-xs font-bold text-red-400 uppercase tracking-widest mt-1">Critical Shortage</p>
        </div>

        <div className="bg-amber-50 border border-amber-100 rounded-3xl p-6">
          <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center mb-4">
            <TrendingDown size={20} className="text-amber-500" />
          </div>
          <p className="text-3xl font-black text-amber-600">{counts.moderate}</p>
          <p className="text-xs font-bold text-amber-400 uppercase tracking-widest mt-1">Moderate Risk</p>
        </div>

        <div className="bg-indigo-50 border border-indigo-100 rounded-3xl p-6">
          <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center mb-4">
            <ShoppingCart size={20} className="text-indigo-500" />
          </div>
          <p className="text-3xl font-black text-indigo-600">{Math.round(totalShortfall).toLocaleString()}</p>
          <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest mt-1">Total Units to Order</p>
        </div>
      </div>

      {error ? (
        <div className="bg-rose-50 border border-rose-100 rounded-3xl p-12 flex flex-col items-center text-center space-y-4">
          <div className="w-16 h-16 bg-rose-100 text-rose-400 rounded-full flex items-center justify-center">
            <Brain size={32} />
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-900">Model Not Ready</h3>
            <p className="text-slate-500 mt-1 max-w-md">{error}</p>
          </div>
          <button
            onClick={() => router.push('/forecasts')}
            className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-colors"
          >
            Train Model on Forecasts Page
          </button>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
          {/* Filter Bar */}
          <div className="p-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-indigo-500" />
              <span className="font-black text-slate-800 text-sm">
                {sorted.length} suggestions
              </span>
            </div>
            <div className="flex gap-2">
              {(['all', 'critical', 'moderate', 'low'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                    filter === f
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100'
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  }`}
                >
                  {f === 'all' ? `All (${suggestions.length})` : f === 'critical' ? `Critical (${counts.critical})` : f === 'moderate' ? `Moderate (${counts.moderate})` : `Low (${counts.low})`}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100">
                  <th className="text-left px-6 py-4">
                    <button onClick={() => handleSort('product_name')} className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-700 transition-colors">
                      Product <SortIcon k="product_name" />
                    </button>
                  </th>
                  <th className="text-left px-6 py-4">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Urgency</span>
                  </th>
                  <th className="text-right px-6 py-4">
                    <button onClick={() => handleSort('current_stock')} className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-700 transition-colors ml-auto">
                      Current Stock <SortIcon k="current_stock" />
                    </button>
                  </th>
                  <th className="text-right px-6 py-4">
                    <button onClick={() => handleSort('projected_demand')} className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-700 transition-colors ml-auto">
                      Forecasted Demand <SortIcon k="projected_demand" />
                    </button>
                  </th>
                  <th className="text-center px-6 py-4">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Stock vs Demand</span>
                  </th>
                  <th className="text-right px-6 py-4">
                    <button onClick={() => handleSort('suggested_reorder_quantity')} className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-700 transition-colors ml-auto">
                      Reorder Qty <SortIcon k="suggested_reorder_quantity" />
                    </button>
                  </th>
                  <th className="text-right px-6 py-4">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Action</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i} className="border-b border-slate-50">
                      {Array.from({ length: 7 }).map((_, j) => (
                        <td key={j} className="px-6 py-5">
                          <div className="h-3 bg-slate-100 rounded-full animate-pulse" style={{ width: `${60 + Math.random() * 40}%` }} />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : sorted.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-20 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <CheckCircle size={40} className="text-emerald-400" />
                        <p className="font-black text-slate-700">All products are sufficiently stocked!</p>
                        <p className="text-sm text-slate-400">No reorder suggestions for the next 30 days.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  sorted.map((s, idx) => {
                    const urgency = getUrgency(s);
                    const cfg = urgencyConfig[urgency];
                    const targetStock = Math.max(s.projected_demand, s.current_stock + s.suggested_reorder_quantity);
                    const stockPct = targetStock > 0 ? Math.min(100, Math.round((s.current_stock / targetStock) * 100)) : 0;

                    return (
                      <tr
                        key={s.product_id}
                        className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors group"
                      >
                        {/* Product */}
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 ${cfg.bg} ${cfg.text} rounded-xl flex items-center justify-center font-black text-sm shrink-0`}>
                              {s.product_name.charAt(0)}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900 text-sm">{s.product_name}</p>
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{s.product_id}</p>
                            </div>
                          </div>
                        </td>

                        {/* Urgency */}
                        <td className="px-6 py-5">
                          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${cfg.badge}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                            {cfg.label}
                          </div>
                        </td>

                        {/* Current Stock */}
                        <td className="px-6 py-5 text-right">
                          <span className="font-black text-slate-900 text-sm">{s.current_stock.toLocaleString()}</span>
                          <span className="text-[10px] text-slate-400 font-bold ml-1">units</span>
                        </td>

                        {/* Forecasted */}
                        <td className="px-6 py-5 text-right">
                          <span className="font-black text-indigo-600 text-sm">{Math.round(s.projected_demand).toLocaleString()}</span>
                          <span className="text-[10px] text-slate-400 font-bold ml-1">units</span>
                        </td>

                        {/* Progress Bar */}
                        <td className="px-6 py-5">
                          <div className="w-32 mx-auto space-y-1.5">
                            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${cfg.bar}`}
                                style={{ width: `${stockPct}%` }}
                              />
                            </div>
                            <p className="text-[10px] font-black text-slate-400 text-center">
                              {stockPct}% covered
                            </p>
                          </div>
                        </td>

                        {/* Reorder Qty */}
                        <td className="px-6 py-5 text-right">
                          <div className={`inline-block px-3 py-1.5 rounded-xl font-black text-sm ${cfg.bg} ${cfg.text}`}>
                            +{Math.round(s.suggested_reorder_quantity).toLocaleString()}
                          </div>
                        </td>

                        {/* Action */}
                        <td className="px-6 py-5 text-right">
                          <button
                            onClick={() => router.push(`/forecasts?product_id=${s.product_id}`)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold hover:bg-indigo-50 hover:text-indigo-600 transition-all group-hover:shadow-sm"
                          >
                            View Forecast
                            <ArrowUpRight size={12} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Footer note */}
          {!loading && sorted.length > 0 && (
            <div className="px-6 py-4 border-t border-slate-100 flex items-center gap-2 bg-slate-50/50">
              <Brain size={14} className="text-indigo-400 shrink-0" />
              <p className="text-[11px] text-slate-400 font-medium">
                Forecasts generated by <span className="font-bold text-indigo-500">Random Forest Regressor</span> · 4-week demand projection · Sorted by most critical shortfall
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
