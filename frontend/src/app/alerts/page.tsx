'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Bell, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Package, 
  Filter, 
  Search, 
  ArrowRight,
  MoreVertical,
  Check,
  AlertCircle,
  Loader2,
  X,
  ChevronRight,
  ArrowUpRight
} from 'lucide-react';
import { apiFetch } from '@/lib/api';

export default function AlertsPage() {
  const router = useRouter();
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('active'); // active, resolved, all
  const [searchTerm, setSearchTerm] = useState('');

  // Resolve Confirmation Modal
  const [selectedAlert, setSelectedAlert] = useState<any>(null);
  const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchAlerts();
  }, [statusFilter]);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      let url = '/alerts/';
      if (statusFilter !== 'all') {
        url += `?status=${statusFilter}`;
      }
      const response = await apiFetch(url);
      if (response.success) {
        setAlerts(response.data);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch alerts');
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async () => {
    if (!selectedAlert) return;
    setSubmitting(true);
    try {
      const response = await apiFetch(`/alerts/${selectedAlert.id}/resolve`, {
        method: 'PUT'
      });
      if (response.success) {
        setIsResolveModalOpen(false);
        fetchAlerts();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to resolve alert');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredAlerts = alerts.filter(alert => 
    alert.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
    alert.product_id?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activeCount = alerts.filter(a => !a.is_resolved).length;

  return (
    <div className="max-w-[1000px] mx-auto px-4 py-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">System Alerts</h1>
            {activeCount > 0 && (
              <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse">
                {activeCount} Active
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Monitor and resolve inventory issues and system notifications.
          </p>
        </div>
        <button 
          onClick={() => fetchAlerts()}
          className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
        >
          <Clock size={20} />
        </button>
      </div>

      {/* Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text"
            placeholder="Search alerts or product IDs..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center bg-slate-100 p-1 rounded-lg w-full md:w-auto">
          <button 
            onClick={() => setStatusFilter('active')}
            className={`flex-1 md:flex-none px-4 py-1.5 text-xs font-bold rounded-md transition-all ${
              statusFilter === 'active' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Active
          </button>
          <button 
            onClick={() => setStatusFilter('resolved')}
            className={`flex-1 md:flex-none px-4 py-1.5 text-xs font-bold rounded-md transition-all ${
              statusFilter === 'resolved' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Resolved
          </button>
          <button 
            onClick={() => setStatusFilter('all')}
            className={`flex-1 md:flex-none px-4 py-1.5 text-xs font-bold rounded-md transition-all ${
              statusFilter === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            All
          </button>
        </div>
      </div>

      {/* Alerts List */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-4" />
          <p className="text-slate-500 text-sm">Synchronizing alerts...</p>
        </div>
      ) : error ? (
        <div className="py-20 flex flex-col items-center justify-center text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
          <h3 className="text-lg font-bold text-slate-900">Fetch Failed</h3>
          <p className="text-slate-500 text-sm mt-1">{error}</p>
        </div>
      ) : filteredAlerts.length === 0 ? (
        <div className="py-24 flex flex-col items-center justify-center text-center">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
            <CheckCircle2 size={40} className="text-emerald-500" />
          </div>
          <h3 className="text-xl font-bold text-slate-900">All Clear!</h3>
          <p className="text-slate-500 mt-2 max-w-xs mx-auto">
            No {statusFilter === 'active' ? 'active' : ''} alerts found. Your inventory is running smoothly.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAlerts.map((alert) => (
            <div 
              key={alert.id} 
              className={`group bg-white p-5 rounded-2xl border transition-all hover:shadow-lg hover:shadow-slate-100 ${
                alert.is_resolved ? 'border-slate-100 opacity-75' : 'border-slate-200'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-xl shrink-0 ${
                  alert.is_resolved 
                    ? 'bg-slate-100 text-slate-400' 
                    : alert.alert_type === 'LOW' 
                      ? 'bg-amber-50 text-amber-500' 
                      : 'bg-indigo-50 text-indigo-500'
                }`}>
                  {alert.is_resolved ? <CheckCircle2 size={24} /> : <AlertTriangle size={24} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded ${
                        alert.is_resolved 
                          ? 'bg-slate-100 text-slate-500' 
                          : 'bg-red-50 text-red-500'
                      }`}>
                        {alert.alert_type}
                      </span>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                        {new Date(alert.created_at).toLocaleDateString()} at {new Date(alert.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                  <h3 className={`text-base font-bold mb-2 ${alert.is_resolved ? 'text-slate-500 line-through' : 'text-slate-900'}`}>
                    {alert.message}
                  </h3>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5 text-xs font-medium">
                      <Package size={14} className="text-slate-400" />
                      <span className="text-slate-500">Product: </span>
                      <span className="text-slate-900 font-bold">{alert.product_name}</span>
                      <span className="text-slate-400 font-mono">({alert.product_id})</span>
                    </div>
                    {alert.is_resolved && (
                      <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-bold">
                        <Check size={14} />
                        <span>Resolved</span>
                      </div>
                    )}
                  </div>
                </div>
                {!alert.is_resolved && (
                  <button 
                    onClick={() => { setSelectedAlert(alert); setIsResolveModalOpen(true); }}
                    className="shrink-0 flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-800 transition-colors shadow-lg shadow-slate-200"
                  >
                    <Check size={14} />
                    Resolve
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Resolve Confirmation Modal */}
      {isResolveModalOpen && selectedAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-8 flex flex-col items-center text-center">
              {selectedAlert.current_stock < selectedAlert.min_stock ? (
                <>
                  <div className="w-20 h-20 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mb-6">
                    <AlertTriangle size={40} />
                  </div>
                  <h2 className="text-xl font-bold text-slate-900 mb-2">Wait! Issue Not Fixed</h2>
                  <p className="text-sm text-slate-500 mb-6 leading-relaxed">
                    The stock for <span className="font-bold text-slate-900">"{selectedAlert.product_name}"</span> is still at <span className="font-bold text-red-500">{selectedAlert.current_stock}</span> units, which is below the minimum threshold of <span className="font-bold text-slate-900">{selectedAlert.min_stock}</span>.
                  </p>
                  <div className="flex flex-col gap-3 w-full">
                    <button 
                      onClick={() => router.push('/stock')}
                      className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                    >
                      Fix Stock First
                      <ArrowUpRight size={18} />
                    </button>
                    <button 
                      onClick={handleResolve}
                      disabled={submitting}
                      className="text-xs font-bold text-slate-400 hover:text-slate-600 py-2 transition-colors"
                    >
                      {submitting ? 'Resolving...' : 'Dismiss Anyway (Force Resolve)'}
                    </button>
                    <button 
                      onClick={() => setIsResolveModalOpen(false)}
                      className="w-full px-4 py-3 text-sm font-semibold text-slate-600 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mb-6">
                    <CheckCircle2 size={40} />
                  </div>
                  <h2 className="text-xl font-bold text-slate-900 mb-2">Resolve Alert?</h2>
                  <p className="text-sm text-slate-500 mb-8 leading-relaxed">
                    The stock level is now healthy (<span className="font-bold text-emerald-600">{selectedAlert.current_stock}</span> units). Are you sure you want to mark this alert as resolved?
                  </p>
                  <div className="flex gap-3 w-full">
                    <button 
                      onClick={() => setIsResolveModalOpen(false)}
                      className="flex-1 px-4 py-3 text-sm font-semibold text-slate-600 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={handleResolve}
                      disabled={submitting}
                      className="flex-1 px-4 py-3 text-sm font-semibold text-white bg-slate-900 rounded-xl hover:bg-slate-800 transition-colors shadow-lg shadow-slate-200 disabled:opacity-70"
                    >
                      {submitting ? 'Resolving...' : 'Yes, Resolve'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
