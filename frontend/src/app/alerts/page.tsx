'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Bell, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Package, 
  Search, 
  Check,
  AlertCircle,
  Loader2,
  X,
  ArrowUpRight,
  Flag,
  UserCheck,
  ChevronDown
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

export default function AlertsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('active');
  const [searchTerm, setSearchTerm] = useState('');

  const [selectedAlert, setSelectedAlert] = useState<any>(null);
  const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [managers, setManagers] = useState<any[]>([]);
  const [selectedManagerId, setSelectedManagerId] = useState<number | ''>('');
  const [assignNotes, setAssignNotes] = useState('');
  const [assignSuccess, setAssignSuccess] = useState<string | null>(null);
  const [assignLoading, setAssignLoading] = useState(false);

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

  const fetchManagers = async () => {
    try {
      const res = await apiFetch('/alerts/managers');
      if (res.success) setManagers(res.data);
    } catch (err) {
      setManagers([]);
    }
  };

  const openAssignModal = (alert: any) => {
    setSelectedAlert(alert);
    setSelectedManagerId('');
    setAssignNotes('');
    setAssignSuccess(null);
    setIsAssignModalOpen(true);
    fetchManagers();
  };

  const handleAssign = async () => {
    if (!selectedAlert || !selectedManagerId) return;
    setAssignLoading(true);
    try {
      const res = await apiFetch(`/alerts/${selectedAlert.id}/assign`, {
        method: 'POST',
        body: JSON.stringify({ manager_id: selectedManagerId, notes: assignNotes }),
      });
      if (res.success) {
        setAssignSuccess(`Investigation assigned to ${res.data.assigned_to}. They have been notified.`);
        fetchAlerts();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to assign investigation');
    } finally {
      setAssignLoading(false);
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

  const getAlertStyle = (alert: any) => {
    if (alert.is_resolved) return { icon: 'bg-slate-100 text-slate-400', border: 'border-slate-100 opacity-70' };
    if (alert.alert_type === 'AUDIT_ISSUE') return { icon: 'bg-rose-100 text-rose-600', border: 'border-rose-200 bg-rose-50/30' };
    if (alert.alert_type === 'INVESTIGATION_ASSIGNED') return { icon: 'bg-amber-100 text-amber-600', border: 'border-amber-200 bg-amber-50/30' };
    if (['LOW_STOCK', 'PO_OVERDUE', 'STOCK_REQ_REJECTED'].includes(alert.alert_type)) return { icon: 'bg-rose-50 text-rose-500', border: 'border-slate-200' };
    if (['STOCK_REQ_APPROVED', 'PO_APPROVED'].includes(alert.alert_type)) return { icon: 'bg-emerald-50 text-emerald-500', border: 'border-slate-200' };
    return { icon: 'bg-indigo-50 text-indigo-500', border: 'border-slate-200' };
  };

  const getAlertIcon = (alert: any) => {
    if (alert.is_resolved) return <CheckCircle2 size={24} />;
    if (alert.alert_type === 'AUDIT_ISSUE') return <Flag size={24} />;
    if (alert.alert_type === 'INVESTIGATION_ASSIGNED') return <UserCheck size={24} />;
    return <AlertTriangle size={24} />;
  };

  return (
    <div className="max-w-[1000px] mx-auto px-4 py-8">
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
            Monitor and manage inventory issues and system notifications.
          </p>
        </div>
        <button
          onClick={() => fetchAlerts()}
          className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
        >
          <Clock size={20} />
        </button>
      </div>

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
          {['active', 'resolved', 'all'].map(f => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`flex-1 md:flex-none px-4 py-1.5 text-xs font-bold rounded-md transition-all capitalize ${statusFilter === f ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              {f === 'resolved' ? 'Marked done' : f}
            </button>
          ))}
        </div>
      </div>

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
            No {statusFilter === 'active' ? 'active' : ''} alerts found.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAlerts.map((alert) => {
            const style = getAlertStyle(alert);
            const isAuditIssue = alert.alert_type === 'AUDIT_ISSUE';
            return (
              <div
                key={alert.id}
                className={`group bg-white p-5 rounded-2xl border transition-all hover:shadow-lg hover:shadow-slate-100 ${style.border}`}
              >
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-xl shrink-0 ${style.icon}`}>
                    {getAlertIcon(alert)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded ${
                        isAuditIssue ? 'bg-rose-100 text-rose-600' :
                        alert.alert_type === 'INVESTIGATION_ASSIGNED' ? 'bg-amber-100 text-amber-700' :
                        alert.is_resolved ? 'bg-slate-100 text-slate-500' : 'bg-red-50 text-red-500'
                      }`}>
                        {alert.alert_type.replace(/_/g, ' ')}
                      </span>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                        {new Date(alert.created_at).toLocaleDateString()} at {new Date(alert.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <h3 className={`text-base font-bold mb-2 ${alert.is_resolved ? 'text-slate-500 line-through' : 'text-slate-900'}`}>
                      {alert.message}
                    </h3>
                    <div className="flex items-center gap-4">
                      {alert.product_id && alert.product_name && (
                        <div className="flex items-center gap-1.5 text-xs font-medium">
                          <Package size={14} className="text-slate-400" />
                          <span className="text-slate-500">Product: </span>
                          <span className="text-slate-900 font-bold">{alert.product_name}</span>
                          <span className="text-slate-400 font-mono">({alert.product_id})</span>
                        </div>
                      )}
                      {alert.is_resolved && (
                        <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-bold">
                          <Check size={14} />
                          <span>Marked done{alert.resolved_by_name ? ` by ${alert.resolved_by_name}` : ''}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {!alert.is_resolved && (
                    <div className="shrink-0 flex items-center gap-2">
                      {isAuditIssue && user?.role === 'admin' && (
                        <button
                          onClick={() => openAssignModal(alert)}
                          className="flex items-center gap-2 px-4 py-2 bg-rose-600 text-white text-xs font-bold rounded-lg hover:bg-rose-700 transition-colors shadow-lg shadow-rose-100"
                        >
                          <UserCheck size={14} />
                          Assign Investigation
                        </button>
                      )}
                      <button
                        onClick={() => { setSelectedAlert(alert); setIsResolveModalOpen(true); }}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-800 transition-colors shadow-lg shadow-slate-200"
                      >
                        <Check size={14} />
                        Mark as done
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {isAssignModalOpen && selectedAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-rose-100 rounded-xl flex items-center justify-center">
                  <UserCheck size={18} className="text-rose-600" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Assign Investigation</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Select a manager to investigate this issue</p>
                </div>
              </div>
              <button onClick={() => { setIsAssignModalOpen(false); setAssignSuccess(null); }} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-rose-50 border border-rose-100 rounded-xl p-4">
                <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-1">Flagged Issue</p>
                <p className="text-sm font-medium text-rose-800 leading-relaxed">{selectedAlert.message}</p>
              </div>

              {assignSuccess ? (
                <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl text-sm font-bold text-emerald-700 text-center">
                  {assignSuccess}
                </div>
              ) : (
                <>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Assign to Manager</label>
                    <div className="relative">
                      <select
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-500/20 outline-none appearance-none"
                        value={selectedManagerId}
                        onChange={e => setSelectedManagerId(Number(e.target.value))}
                      >
                        <option value="">Select a manager...</option>
                        {managers.map(m => (
                          <option key={m.user_id} value={m.user_id}>{m.name} ({m.email})</option>
                        ))}
                      </select>
                      <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                    {managers.length === 0 && (
                      <p className="text-xs text-amber-600 font-medium">No managers found. Create a manager in User Management first.</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Additional Notes for Manager (Optional)</label>
                    <textarea
                      rows={3}
                      placeholder="e.g. Focus on transactions from last 7 days. Check the stock adjustment history for Product P0023."
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-500/20 outline-none transition-all resize-none"
                      value={assignNotes}
                      onChange={e => setAssignNotes(e.target.value)}
                    />
                  </div>

                  <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">What happens next?</p>
                    <ol className="space-y-1.5 text-xs text-slate-600 font-medium list-decimal list-inside">
                      <li>The selected manager receives an <span className="font-bold text-amber-700">INVESTIGATION ASSIGNED</span> alert.</li>
                      <li>This flagged issue will be marked as done from your alerts.</li>
                      <li>The manager reviews the audit logs and adjusts stock if needed.</li>
                      <li>Every action is permanently logged in the audit trail.</li>
                    </ol>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={() => { setIsAssignModalOpen(false); }}
                      className="flex-1 px-4 py-3 text-sm font-bold text-slate-600 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAssign}
                      disabled={!selectedManagerId || assignLoading}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-bold text-white bg-rose-600 rounded-xl hover:bg-rose-700 transition-colors shadow-lg shadow-rose-100 disabled:opacity-60"
                    >
                      {assignLoading ? <Loader2 size={16} className="animate-spin" /> : <UserCheck size={16} />}
                      {assignLoading ? 'Assigning...' : 'Assign Investigation'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {isResolveModalOpen && selectedAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-8 flex flex-col items-center text-center">
              {selectedAlert.alert_type === 'LOW_STOCK' && selectedAlert.current_stock < selectedAlert.min_stock ? (
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
                      {submitting ? 'Marking done...' : 'Dismiss Anyway (Force Mark as done)'}
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
                  <h2 className="text-xl font-bold text-slate-900 mb-2">Mark as done?</h2>
                  <p className="text-sm text-slate-500 mb-8 leading-relaxed">
                    {selectedAlert.alert_type === 'LOW_STOCK'
                      ? `The stock level is now healthy (${selectedAlert.current_stock} units). Are you sure you want to mark this alert as done?`
                      : `Are you sure you want to mark this notification as done? It will be hidden after 24 hours.`}
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
                      {submitting ? 'Marking done...' : 'Yes, Mark as done'}
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
