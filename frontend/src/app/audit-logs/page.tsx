'use client';

import { useState, useEffect } from 'react';
import { ShieldCheck, RefreshCw, Calendar, User, Activity, AlertTriangle, FileJson, Flag, X, Loader2 } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

interface AuditLog {
  id: number;
  user_id: number | null;
  user_name: string | null;
  user_role: string | null;
  action: string;
  entity_type: string;
  entity_id: string;
  old_values: any;
  new_values: any;
  timestamp: string;
  ip_address: string | null;
}

export default function AuditLogsPage() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const limit = 50;

  const [flagModal, setFlagModal] = useState<{ open: boolean; log: AuditLog | null }>({ open: false, log: null });
  const [flagMessage, setFlagMessage] = useState('');
  const [flagging, setFlagging] = useState(false);
  const [flagSuccess, setFlagSuccess] = useState<string | null>(null);

  // JSON Diff Modal State
  const [selectedLogForDiff, setSelectedLogForDiff] = useState<AuditLog | null>(null);

  const fetchLogs = async (pageNum: number = 1) => {
    try {
      setLoading(true);
      setError(null);
      const skip = (pageNum - 1) * limit;
      const res = await apiFetch(`/audit-logs?skip=${skip}&limit=${limit}`);
      if (res.success) {
        setLogs(res.data);
        setHasMore(res.data.length === limit);
      } else {
        setLogs([]);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch audit logs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(page);
  }, [page]);

  const openFlagModal = (log: AuditLog) => {
    setFlagModal({ open: true, log });
    setFlagMessage('');
    setFlagSuccess(null);
  };

  const closeFlagModal = () => {
    setFlagModal({ open: false, log: null });
    setFlagMessage('');
    setFlagSuccess(null);
  };

  const handleFlagSubmit = async () => {
    if (!flagModal.log || !flagMessage.trim()) return;
    setFlagging(true);
    try {
      const res = await apiFetch('/alerts/flag', {
        method: 'POST',
        body: JSON.stringify({
          message: flagMessage.trim(),
          entity_type: flagModal.log.entity_type,
          entity_id: flagModal.log.entity_id,
        }),
      });
      if (res.success) {
        setFlagSuccess('Issue flagged successfully — Admin has been notified.');
      }
    } catch (err: any) {
      setFlagSuccess(null);
      alert(err.message || 'Failed to flag issue.');
    } finally {
      setFlagging(false);
    }
  };

  const getActionColor = (action: string) => {
    if (action.includes('create') || action.includes('approve')) return 'bg-emerald-100 text-emerald-700';
    if (action.includes('update') || action.includes('receive') || action.includes('adjust')) return 'bg-indigo-100 text-indigo-700';
    if (action.includes('delete') || action.includes('reject') || action.includes('cancel') || action.includes('flag')) return 'bg-rose-100 text-rose-700';
    return 'bg-slate-100 text-slate-700';
  };

  const getEntityIcon = (entityType: string) => {
    switch (entityType) {
      case 'product':
      case 'inventory':
        return <Activity size={14} className="text-indigo-500" />;
      case 'stock_transaction':
        return <Activity size={14} className="text-amber-500" />;
      case 'purchase_order':
        return <Activity size={14} className="text-emerald-500" />;
      case 'user':
        return <User size={14} className="text-purple-500" />;
      default:
        return <Activity size={14} className="text-slate-500" />;
    }
  };

  return (
    <div className="max-w-[1280px] mx-auto px-4 py-8 space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 rounded-full text-indigo-600 font-black text-[10px] uppercase tracking-widest">
            <ShieldCheck size={12} />
            Compliance
          </div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900">Audit Logs</h1>
          <p className="text-slate-500 font-medium max-w-xl">
            Immutable tracking of all system modifications, access events, and critical actions.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1 || loading}
            className="flex items-center gap-2 px-4 py-3 bg-white border border-slate-200 text-slate-700 rounded-2xl font-bold text-sm hover:bg-slate-50 transition-all shadow-sm disabled:opacity-40"
          >
            Newer
          </button>
          <button
            onClick={() => setPage(p => p + 1)}
            disabled={!hasMore || loading}
            className="flex items-center gap-2 px-4 py-3 bg-white border border-slate-200 text-slate-700 rounded-2xl font-bold text-sm hover:bg-slate-50 transition-all shadow-sm disabled:opacity-40"
          >
            Older
          </button>
          <button
            onClick={() => fetchLogs(page)}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-3 bg-indigo-600 text-white rounded-2xl font-bold text-sm hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 disabled:opacity-60"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
        {error ? (
          <div className="p-8 text-center text-rose-500 font-medium flex items-center justify-center gap-2">
            <AlertTriangle size={20} />
            {error}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100">
                  <th className="text-left px-6 py-4"><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Log #</span></th>
                  <th className="text-left px-6 py-4"><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Timestamp</span></th>
                  <th className="text-left px-6 py-4"><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">User</span></th>
                  <th className="text-left px-6 py-4"><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Action</span></th>
                  <th className="text-left px-6 py-4"><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Entity</span></th>
                  <th className="text-left px-6 py-4"><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Changes</span></th>
                  {user?.role === 'auditor' && (
                    <th className="text-left px-6 py-4"><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Flag</span></th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading && logs.length === 0 ? (
                  Array.from({ length: 10 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: user?.role === 'auditor' ? 7 : 6 }).map((_, j) => (
                        <td key={j} className="px-6 py-5">
                          <div className="h-3 bg-slate-100 rounded-full animate-pulse" style={{ width: '60%' }} />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={user?.role === 'auditor' ? 7 : 6} className="px-6 py-20 text-center text-slate-500 font-medium">
                      No audit logs found.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-6 py-5 whitespace-nowrap">
                        <span className="text-xs font-mono font-bold text-slate-400">#{log.id}</span>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        <div className="flex items-center gap-2 text-sm text-slate-600 font-medium">
                          <Calendar size={14} className="text-slate-400" />
                          {new Date(log.timestamp).toLocaleString()}
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600 shrink-0 uppercase">
                            {log.user_name ? log.user_name.charAt(0) : 'S'}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 text-sm leading-tight">{log.user_name || 'System Actor'}</p>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mt-0.5">{log.user_role || 'SYSTEM'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${getActionColor(log.action)}`}>
                          {log.action.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2">
                          {getEntityIcon(log.entity_type)}
                          <div>
                            <p className="text-xs font-bold text-slate-700 capitalize">{log.entity_type.replace('_', ' ')}</p>
                            <p className="text-[10px] text-slate-400 font-mono mt-0.5">ID: {log.entity_id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5 max-w-xs">
                        {log.new_values || log.old_values ? (
                          <div className="relative">
                            <button
                              onClick={() => setSelectedLogForDiff(log)}
                              className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
                            >
                              <FileJson size={14} />
                              View JSON Diff
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">No diff data</span>
                        )}
                      </td>
                      {user?.role === 'auditor' && (
                        <td className="px-6 py-5">
                          <button
                            onClick={() => openFlagModal(log)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-lg text-xs font-bold transition-colors border border-rose-100"
                            title="Flag this entry as suspicious"
                          >
                            <Flag size={12} />
                            Flag
                          </button>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {flagModal.open && flagModal.log && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-rose-100 rounded-xl flex items-center justify-center">
                  <Flag size={18} className="text-rose-600" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Flag Issue to Admin</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Admin will be alerted immediately</p>
                </div>
              </div>
              <button onClick={closeFlagModal} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-1.5">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Flagging Entry</p>
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${getActionColor(flagModal.log.action)}`}>
                    {flagModal.log.action.replace(/_/g, ' ')}
                  </span>
                  <span className="text-xs font-bold text-slate-600 capitalize">{flagModal.log.entity_type.replace('_', ' ')} #{flagModal.log.entity_id}</span>
                </div>
                <p className="text-xs text-slate-500">
                  By <span className="font-bold">{flagModal.log.user_name || 'Unknown'}</span> ({flagModal.log.user_role || 'N/A'}) at {new Date(flagModal.log.timestamp).toLocaleString()}
                </p>
              </div>

              {flagSuccess ? (
                <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl text-sm font-bold text-emerald-700 text-center">
                  {flagSuccess}
                </div>
              ) : (
                <>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Describe the Issue</label>
                    <textarea
                      rows={4}
                      placeholder="e.g. Manager approved their own OUT transaction. Physical count shows 100 units but system shows 50."
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400 outline-none transition-all resize-none"
                      value={flagMessage}
                      onChange={e => setFlagMessage(e.target.value)}
                    />
                    <p className="text-[10px] text-slate-400">Be specific — the Admin will see this message verbatim.</p>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={closeFlagModal}
                      className="flex-1 px-4 py-3 text-sm font-bold text-slate-600 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleFlagSubmit}
                      disabled={!flagMessage.trim() || flagging}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-bold text-white bg-rose-600 rounded-xl hover:bg-rose-700 transition-colors shadow-lg shadow-rose-100 disabled:opacity-60"
                    >
                      {flagging ? <Loader2 size={16} className="animate-spin" /> : <Flag size={16} />}
                      {flagging ? 'Flagging...' : 'Flag Issue'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
      {/* JSON Diff Modal */}
      {selectedLogForDiff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden border border-slate-100">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                  <FileJson size={18} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Audit JSON Diff</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Showing parameters for log #{selectedLogForDiff.id}</p>
                </div>
              </div>
              <button onClick={() => setSelectedLogForDiff(null)} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-all">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-medium bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div>
                  <span className="text-slate-400 block mb-0.5">Action</span>
                  <span className="text-slate-800 font-bold uppercase">{selectedLogForDiff.action}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Entity Type</span>
                  <span className="text-slate-800 font-bold capitalize">{selectedLogForDiff.entity_type}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Entity ID</span>
                  <span className="text-slate-850 font-mono font-bold">{selectedLogForDiff.entity_id}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">IP Address</span>
                  <span className="text-slate-850 font-mono font-bold">{selectedLogForDiff.ip_address || 'N/A'}</span>
                </div>
              </div>

              <div className="font-mono text-xs">
                {selectedLogForDiff.old_values && selectedLogForDiff.new_values ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <span className="text-slate-500 font-bold uppercase tracking-wider block mb-2 px-1 text-[10px]">Old Values</span>
                      <div className="bg-rose-50/40 border border-rose-100 rounded-2xl p-4 overflow-x-auto min-h-[150px] max-h-[300px]">
                        <pre className="text-rose-700 whitespace-pre-wrap">{JSON.stringify(selectedLogForDiff.old_values, null, 2)}</pre>
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-500 font-bold uppercase tracking-wider block mb-2 px-1 text-[10px]">New Values</span>
                      <div className="bg-emerald-50/40 border border-emerald-100 rounded-2xl p-4 overflow-x-auto min-h-[150px] max-h-[300px]">
                        <pre className="text-emerald-700 whitespace-pre-wrap">{JSON.stringify(selectedLogForDiff.new_values, null, 2)}</pre>
                      </div>
                    </div>
                  </div>
                ) : selectedLogForDiff.old_values ? (
                  <div>
                    <span className="text-slate-500 font-bold uppercase tracking-wider block mb-2 px-1 text-[10px]">Removed/Old Values</span>
                    <div className="bg-rose-50/40 border border-rose-100 rounded-2xl p-4 overflow-x-auto min-h-[150px] max-h-[300px]">
                      <pre className="text-rose-700 whitespace-pre-wrap">{JSON.stringify(selectedLogForDiff.old_values, null, 2)}</pre>
                    </div>
                  </div>
                ) : (
                  <div>
                    <span className="text-slate-500 font-bold uppercase tracking-wider block mb-2 px-1 text-[10px]">Created/New Values</span>
                    <div className="bg-emerald-50/40 border border-emerald-100 rounded-2xl p-4 overflow-x-auto min-h-[150px] max-h-[300px]">
                      <pre className="text-emerald-700 whitespace-pre-wrap">{JSON.stringify(selectedLogForDiff.new_values, null, 2)}</pre>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/30 flex justify-end">
              <button
                onClick={() => setSelectedLogForDiff(null)}
                className="px-6 py-2.5 bg-slate-900 text-white hover:bg-slate-800 rounded-xl text-xs font-bold transition-colors"
              >
                Close Diff
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
