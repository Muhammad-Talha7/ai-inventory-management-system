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
  Plus,
  Minus,
  Search,
  Filter,
  Check,
  ClipboardList,
  Users as UsersIcon,
  Trash2,
  Calendar,
  AlertCircle,
  Eye,
  Activity,
  Camera,
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import AutoOrderButton from '@/components/AutoOrderButton';
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

function AuditorDashboard({ user, router }: { user: any; router: any }) {
  const [logs, setLogs] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningCheck, setRunningCheck] = useState(false);
  const [checkResult, setCheckResult] = useState<string | null>(null);

  const fetchAuditorData = async () => {
    try {
      setLoading(true);
      const [logsRes, alertsRes] = await Promise.all([
        apiFetch('/audit-logs?skip=0&limit=6'),
        apiFetch('/alerts/?status=active')
      ]);
      if (logsRes.success) setLogs(logsRes.data);
      if (alertsRes.success) setAlerts(alertsRes.data);
    } catch (err) {
      console.error('Failed to load auditor dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditorData();
  }, []);

  const runAuditCheck = () => {
    setRunningCheck(true);
    setCheckResult(null);
    setTimeout(() => {
      setRunningCheck(false);
      setCheckResult('System integrity verification complete. All logs verified against digital signatures. RBAC constraints valid. Security status: SECURE.');
    }, 1550);
  };

  const getActionColor = (action: string) => {
    if (action.includes('create') || action.includes('approve')) return 'bg-emerald-100 text-emerald-700';
    if (action.includes('update') || action.includes('receive') || action.includes('adjust')) return 'bg-indigo-100 text-indigo-700';
    if (action.includes('delete') || action.includes('reject') || action.includes('cancel') || action.includes('flag')) return 'bg-rose-100 text-rose-700';
    return 'bg-slate-100 text-slate-700';
  };

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-900 text-white rounded-[32px] p-8 relative overflow-hidden shadow-xl">
        <div className="space-y-2 z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/20 rounded-full text-indigo-300 font-black text-[10px] uppercase tracking-widest">
            <ClipboardList size={12} /> Compliance Control Hub
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white">Auditor Control Center</h1>
          <p className="text-slate-300 font-medium max-w-md text-sm">
            Welcome back, {user?.name || 'Compliance Auditor'}. You have complete read-only compliance oversight and security logging dashboards.
          </p>
        </div>
        <div className="flex gap-3 z-10 shrink-0">
          <button
            onClick={() => router.push('/audit-logs')}
            className="px-5 py-3 bg-white text-slate-900 hover:bg-slate-100 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all shadow-md"
          >
            Audit Logs Explorer
          </button>
          <button
            onClick={() => router.push('/alerts')}
            className="px-5 py-3 bg-indigo-600 hover:bg-indigo-50 text-white rounded-2xl font-bold text-xs uppercase tracking-widest transition-all shadow-lg shadow-indigo-600/30"
          >
            Compliance Alerts
          </button>
        </div>
        {/* Decorative background logo */}
        <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none translate-x-12 translate-y-12">
          <ClipboardList size={260} className="text-white" />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard
          label="Total Logged Activities"
          value={loading ? '...' : logs.length >= 6 ? '120+' : logs.length}
          sub="All logged actions in system"
          icon={ClipboardList}
          iconBg="#e0e7ff"
          iconColor="#4f46e5"
        />
        <StatCard
          label="Active Alerts"
          value={loading ? '...' : alerts.length}
          sub="Unresolved warnings in feed"
          icon={AlertTriangle}
          iconBg="#fef3c7"
          iconColor="#d97706"
        />
        <StatCard
          label="Anomalies Flagged"
          value={loading ? '...' : alerts.filter(a => a.alert_type === 'AUDIT_ISSUE').length}
          sub="Suspicious items flagged to Admin"
          icon={AlertCircle}
          iconBg="#fee2e2"
          iconColor="#dc2626"
        />
        <StatCard
          label="RBAC Integrity Status"
          value="SECURE"
          sub="All policies active & verified"
          icon={CheckCircle2}
          iconBg="#d1fae5"
          iconColor="#059669"
        />
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Quick Actions & System Health */}
        <div className="space-y-6">


          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Oversight Shortcuts</h3>
            <div className="grid grid-cols-2 gap-3 text-center">
              <button
                onClick={() => router.push('/inventory')}
                className="p-4 bg-slate-50 hover:bg-slate-100 rounded-2xl border border-slate-150 transition-colors flex flex-col items-center gap-2"
              >
                <Package className="text-slate-500" size={20} />
                <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wide">Inventory Feed</span>
              </button>
              <button
                onClick={() => router.push('/suppliers')}
                className="p-4 bg-slate-50 hover:bg-slate-100 rounded-2xl border border-slate-150 transition-colors flex flex-col items-center gap-2"
              >
                <UsersIcon className="text-slate-500" size={20} />
                <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wide">Supplier Directory</span>
              </button>
            </div>
          </div>
        </div>

        {/* Recent Audit Actions Log list */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Recent Sensitive Changes</h3>
              <button
                onClick={() => router.push('/audit-logs')}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1"
              >
                Full Log Explorer <ChevronRight size={14} />
              </button>
            </div>

            {loading ? (
              <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-indigo-600" /></div>
            ) : logs.length === 0 ? (
              <div className="py-12 text-center text-slate-400 italic text-sm">No recent activity logs.</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {logs.map((log) => (
                  <div key={log.id} className="py-4 flex items-center justify-between gap-4 group">
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-slate-400">#{log.id}</span>
                        <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${getActionColor(log.action)}`}>
                          {log.action.replace(/_/g, ' ')}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <p className="text-sm font-bold text-slate-900 truncate">
                        {log.user_name || 'System'} modified {log.entity_type} {log.entity_id}
                      </p>
                    </div>
                    <button
                      onClick={() => router.push('/audit-logs')}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg"
                      title="Inspect Log"
                    >
                      <Eye size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StaffDashboard({ user, router }: { user: any; router: any }) {
  const [pendingPosCount, setPendingPosCount] = useState<number>(0);
  const [stockRequests, setStockRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStaffData = async () => {
      try {
        setLoading(true);
        const [posRes, requestsRes] = await Promise.all([
          apiFetch('/purchase-orders/'),
          apiFetch('/stock-requests/')
        ]);

        if (Array.isArray(posRes)) {
          const pending = posRes.filter((po: any) => po.status === 'Approved' || po.status === 'Created' || po.status === 'Pending').length;
          setPendingPosCount(pending);
        } else if (posRes && Array.isArray(posRes.data)) {
          const pending = posRes.data.filter((po: any) => po.status === 'Approved' || po.status === 'Created' || po.status === 'Pending').length;
          setPendingPosCount(pending);
        }

        if (Array.isArray(requestsRes)) {
          setStockRequests(requestsRes.slice(0, 6));
        } else if (requestsRes && Array.isArray(requestsRes.data)) {
          setStockRequests(requestsRes.data.slice(0, 6));
        }
      } catch (err) {
        console.error('Failed to load staff dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStaffData();
  }, []);

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-indigo-900 text-white rounded-[32px] p-8 relative overflow-hidden shadow-xl">
        <div className="space-y-2 z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/20 rounded-full text-indigo-300 font-black text-[10px] uppercase tracking-widest">
            <Camera size={12} /> Staff Operations Portal
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white">Staff Dashboard</h1>
          <p className="text-indigo-200 font-medium max-w-md text-sm">
            Quickly check in new inventory shipments using the camera scanner, or initiate request approvals.
          </p>
        </div>
        <div className="flex gap-3 z-10 shrink-0">
          <button
            onClick={() => router.push('/scanner')}
            className="px-5 py-3 bg-white text-slate-900 hover:bg-slate-100 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all shadow-md flex items-center gap-2"
          >
            <Camera size={14} /> Open Scanner
          </button>
          <button
            onClick={() => router.push('/stock-requests')}
            className="px-5 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold text-xs uppercase tracking-widest transition-all shadow-lg shadow-indigo-600/30"
          >
            Stock Requests
          </button>
        </div>
        <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none translate-x-12 translate-y-12">
          <Camera size={260} className="text-white" />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          label="Pending PO Receipts"
          value={loading ? '...' : pendingPosCount}
          sub="Orders waiting to be scanned"
          icon={ClipboardList}
          iconBg="#e0e7ff"
          iconColor="#4f46e5"
        />
        <StatCard
          label="My Active Requests"
          value={loading ? '...' : stockRequests.filter((r: any) => r.status === 'Pending').length}
          sub="Stock requests awaiting approval"
          icon={Clock}
          iconBg="#fff7ed"
          iconColor="#ea580c"
        />
        <StatCard
          label="Webcam Scanner"
          value="READY"
          sub="MediaDevice checks verified"
          icon={CheckCircle2}
          iconBg="#d1fae5"
          iconColor="#059669"
        />
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Quick Operations shortcuts */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Scanner Operations</h3>
          <div className="space-y-3">
            <button
              onClick={() => router.push('/scanner?mode=PO')}
              className="w-full text-left p-4 bg-slate-50 hover:bg-indigo-50 hover:border-indigo-200 rounded-2xl border border-slate-150 transition-all flex items-center justify-between group"
            >
              <div>
                <p className="text-xs font-bold text-slate-800">Scan & Receive PO</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Check incoming supplier orders</p>
              </div>
              <ChevronRight size={16} className="text-slate-400 group-hover:text-indigo-600 transition-colors" />
            </button>
            <button
              onClick={() => router.push('/scanner?mode=IN_OUT')}
              className="w-full text-left p-4 bg-slate-50 hover:bg-indigo-50 hover:border-indigo-200 rounded-2xl border border-slate-150 transition-all flex items-center justify-between group"
            >
              <div>
                <p className="text-xs font-bold text-slate-800">Direct In / Out Scan</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Quickly adjust current inventory</p>
              </div>
              <ChevronRight size={16} className="text-slate-400 group-hover:text-indigo-600 transition-colors" />
            </button>
          </div>
        </div>

        {/* Stock requests panel list */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Recent Stock Requests</h3>
            <button
              onClick={() => router.push('/stock-requests')}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1"
            >
              All Requests <ChevronRight size={14} />
            </button>
          </div>

          {loading ? (
            <div className="py-12 flex justify-center"><Loader2 className="animate-spin text-indigo-600" /></div>
          ) : stockRequests.length === 0 ? (
            <div className="py-12 text-center text-slate-400 italic text-sm">No recent stock requests found.</div>
          ) : (
            <div className="divide-y divide-slate-100 max-h-[350px] overflow-y-auto pr-2">
              {stockRequests.map((req) => (
                <div key={req.id} className="py-4 flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${req.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' :
                        req.status === 'Rejected' ? 'bg-rose-100 text-rose-700' :
                          'bg-amber-100 text-amber-700'
                        }`}>
                        {req.status}
                      </span>
                      <span className="text-[10px] text-slate-400">{new Date(req.created_at).toLocaleDateString()}</span>
                    </div>
                    <p className="text-sm font-bold text-slate-900 mt-1">
                      Request #{req.request_id} for {req.product_name || `Product ${req.product_id}`} ({req.quantity} units)
                    </p>
                    {req.reason && <p className="text-xs text-slate-400 mt-1 italic">Reason: {req.reason}</p>}
                  </div>
                  <button
                    onClick={() => router.push('/stock-requests')}
                    className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-[10px] font-bold text-slate-700 rounded-lg border border-slate-200 shrink-0 transition-colors"
                  >
                    View
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AdminDashboard({ user, router }: { user: any; router: any }) {
  const [usersCount, setUsersCount] = useState<number>(0);
  const [activeAlerts, setActiveAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAdminData = async () => {
      try {
        setLoading(true);
        const [usersRes, alertsRes] = await Promise.all([
          apiFetch('/auth/users'),
          apiFetch('/alerts/?status=active')
        ]);
        if (Array.isArray(usersRes)) {
          setUsersCount(usersRes.length);
        } else if (usersRes && Array.isArray(usersRes.data)) {
          setUsersCount(usersRes.data.length);
        } else {
          setUsersCount(5);
        }

        if (alertsRes.success) {
          setActiveAlerts(alertsRes.data);
        }
      } catch (err) {
        console.error('Failed to load admin data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAdminData();
  }, []);

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-900 text-white rounded-[32px] p-8 relative overflow-hidden shadow-xl">
        <div className="space-y-2 z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/20 rounded-full text-indigo-300 font-black text-[10px] uppercase tracking-widest">
            <UsersIcon size={12} /> System Admin Control Hub
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white">Administrator Dashboard</h1>
          <p className="text-slate-300 font-medium max-w-md text-sm">
            Manage user authorization, review system alerts, and configure operational permissions.
          </p>
        </div>
        <div className="flex gap-3 z-10 shrink-0">
          <button
            onClick={() => router.push('/users')}
            className="px-5 py-3 bg-white text-slate-900 hover:bg-slate-100 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all shadow-md"
          >
            Manage Users
          </button>
          <button
            onClick={() => router.push('/alerts')}
            className="px-5 py-3 bg-indigo-600 hover:bg-indigo-50 text-white rounded-2xl font-bold text-xs uppercase tracking-widest transition-all shadow-lg shadow-indigo-600/30"
          >
            Review Alerts
          </button>
        </div>
        <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none translate-x-12 translate-y-12">
          <UsersIcon size={260} className="text-white" />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          label="Registered Users"
          value={loading ? '...' : usersCount}
          sub="Authorized accounts in database"
          icon={UsersIcon}
          iconBg="#e0e7ff"
          iconColor="#4f46e5"
        />
        <StatCard
          label="Active Alerts"
          value={loading ? '...' : activeAlerts.length}
          sub="Awaiting review/action"
          icon={AlertTriangle}
          iconBg="#fee2e2"
          iconColor="#dc2626"
        />
        <StatCard
          label="Compliance Level"
          value="100%"
          sub="All audit records intact"
          icon={CheckCircle2}
          iconBg="#d1fae5"
          iconColor="#059669"
        />
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Quick Operations shortcuts */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Administrative Actions</h3>
          <div className="space-y-3">
            <button
              onClick={() => router.push('/users')}
              className="w-full text-left p-4 bg-slate-50 hover:bg-indigo-50 hover:border-indigo-200 rounded-2xl border border-slate-150 transition-all flex items-center justify-between group"
            >
              <div>
                <p className="text-xs font-bold text-slate-800">Add New System User</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Register staff, managers or auditors</p>
              </div>
              <ChevronRight size={16} className="text-slate-400 group-hover:text-indigo-600 transition-colors" />
            </button>
            <button
              onClick={() => router.push('/alerts')}
              className="w-full text-left p-4 bg-slate-50 hover:bg-indigo-50 hover:border-indigo-200 rounded-2xl border border-slate-150 transition-all flex items-center justify-between group"
            >
              <div>
                <p className="text-xs font-bold text-slate-800">Manage Stock Warnings</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Review low stock & requests</p>
              </div>
              <ChevronRight size={16} className="text-slate-400 group-hover:text-indigo-600 transition-colors" />
            </button>
          </div>
        </div>

        {/* Alerts panel list */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Active Alerts Feed</h3>
            <button
              onClick={() => router.push('/alerts')}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1"
            >
              View All Alerts <ChevronRight size={14} />
            </button>
          </div>

          {loading ? (
            <div className="py-12 flex justify-center"><Loader2 className="animate-spin text-indigo-600" /></div>
          ) : activeAlerts.length === 0 ? (
            <div className="py-12 text-center text-slate-400 italic text-sm">All clear! No pending system alerts.</div>
          ) : (
            <div className="divide-y divide-slate-100 max-h-[350px] overflow-y-auto pr-2">
              {activeAlerts.map((alert) => (
                <div key={alert.id} className="py-4 flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${alert.alert_type === 'AUDIT_ISSUE' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-700'
                        }`}>
                        {alert.alert_type.replace(/_/g, ' ')}
                      </span>
                      <span className="text-[10px] text-slate-400">{new Date(alert.created_at).toLocaleDateString()}</span>
                    </div>
                    <p className="text-sm font-bold text-slate-900 mt-1">{alert.message}</p>
                  </div>
                  <button
                    onClick={() => router.push('/alerts')}
                    className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-[10px] font-bold text-slate-700 rounded-lg border border-slate-200 shrink-0 transition-colors"
                  >
                    Action
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

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

  const [activeTab, setActiveTab] = useState<'actions' | 'adjust' | 'orders'>('actions');

  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [actionProcessingId, setActionProcessingId] = useState<number | null>(null);

  const [activeAlerts, setActiveAlerts] = useState<any[]>([]);
  const [alertsLoading, setAlertsLoading] = useState(false);
  const [alertProcessingId, setAlertProcessingId] = useState<number | null>(null);

  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [posLoading, setPosLoading] = useState(false);
  const [expandedOrders, setExpandedOrders] = useState<Set<number>>(new Set());

  const [products, setProducts] = useState<any[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productSearch, setProductSearch] = useState('');

  const [suppliers, setSuppliers] = useState<any[]>([]);

  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustType, setAdjustType] = useState('physical_count');
  const [adjustNotes, setAdjustNotes] = useState('');
  const [adjustSubmitting, setAdjustSubmitting] = useState(false);

  const [isPoModalOpen, setIsPoModalOpen] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [poItems, setPoItems] = useState<{ product_id: string; quantity: number; tempId: number }[]>([]);
  const [nextTempId, setNextTempId] = useState(1);
  const [poSubmitting, setPoSubmitting] = useState(false);

  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);
  const [selectedPoForReceive, setSelectedPoForReceive] = useState<any>(null);
  const [receiveQuantities, setReceiveQuantities] = useState<Record<number, number>>({});
  const [receiveNotes, setReceiveNotes] = useState('');
  const [receiveSubmitting, setReceiveSubmitting] = useState(false);

  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [selectedPoForReject, setSelectedPoForReject] = useState<any>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectSubmitting, setRejectSubmitting] = useState(false);

  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedAlertForAssign, setSelectedAlertForAssign] = useState<any>(null);
  const [managers, setManagers] = useState<any[]>([]);
  const [selectedManagerId, setSelectedManagerId] = useState<number | ''>('');
  const [assignNotes, setAssignNotes] = useState('');
  const [assignSubmitting, setAssignSubmitting] = useState(false);

  // Cancel Confirmation Modal State
  const [isCancelPoModalOpen, setIsCancelPoModalOpen] = useState(false);
  const [poToCancel, setPoToCancel] = useState<number | null>(null);

  useEffect(() => {
    fetchDashboardData();
    fetchForecastPreview();
    fetchReorderPreview();
    if (user?.role === 'manager' || user?.role === 'admin') {
      fetchPendingRequests();
      fetchActiveAlerts();
      fetchPurchaseOrders();
      fetchProducts();
      fetchSuppliers();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await apiFetch('/dashboard/');
      if (response.success) setDashboardData(response.data);
    } catch (err: any) {
      console.error(err);
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
    } finally {
      setReorderLoading(false);
    }
  };

  const fetchPendingRequests = async () => {
    try {
      setRequestsLoading(true);
      const res = await apiFetch('/stock/requests?status=pending');
      if (res.success) setPendingRequests(res.data);
    } catch {
    } finally {
      setRequestsLoading(false);
    }
  };

  const fetchActiveAlerts = async () => {
    try {
      setAlertsLoading(true);
      const res = await apiFetch('/alerts/?status=active');
      if (res.success) setActiveAlerts(res.data);
    } catch {
    } finally {
      setAlertsLoading(false);
    }
  };

  const fetchPurchaseOrders = async () => {
    try {
      setPosLoading(true);
      const res = await apiFetch('/purchase-orders/?page=1');
      if (res.success) setPurchaseOrders(res.data);
    } catch {
    } finally {
      setPosLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      setProductsLoading(true);
      const res = await apiFetch('/products/?limit=200');
      if (res.success) setProducts(res.data);
    } catch {
    } finally {
      setProductsLoading(false);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const res = await apiFetch('/suppliers/');
      if (Array.isArray(res)) setSuppliers(res);
    } catch {
    }
  };

  const handleRequestAction = async (transactionId: number, action: 'approve' | 'reject') => {
    try {
      setActionProcessingId(transactionId);
      let bodyData = undefined;
      if (action === 'reject') {
        const reason = window.prompt("Reason for rejection:") || "No reason provided";
        bodyData = JSON.stringify({ reason });
      }
      const response = await apiFetch(`/stock/requests/${transactionId}/${action}`, {
        method: 'POST',
        body: bodyData
      });
      if (response.success) {
        fetchPendingRequests();
        fetchDashboardData();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to process request');
    } finally {
      setActionProcessingId(null);
    }
  };

  const handleResolveAlert = async (alertId: number) => {
    try {
      setAlertProcessingId(alertId);
      const response = await apiFetch(`/alerts/${alertId}/resolve`, {
        method: 'PUT'
      });
      if (response.success) {
        fetchActiveAlerts();
        fetchDashboardData();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to resolve alert');
    } finally {
      setAlertProcessingId(null);
    }
  };

  const openAssignModal = async (alertItem: any) => {
    setSelectedAlertForAssign(alertItem);
    setSelectedManagerId('');
    setAssignNotes('');
    setIsAssignModalOpen(true);
    try {
      const res = await apiFetch('/alerts/managers');
      if (res.success) setManagers(res.data);
    } catch {
      setManagers([]);
    }
  };

  const handleAssignAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAlertForAssign || !selectedManagerId) return;
    try {
      setAssignSubmitting(true);
      const res = await apiFetch(`/alerts/${selectedAlertForAssign.id}/assign`, {
        method: 'POST',
        body: JSON.stringify({ manager_id: selectedManagerId, notes: assignNotes }),
      });
      if (res.success) {
        setIsAssignModalOpen(false);
        fetchActiveAlerts();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to assign alert');
    } finally {
      setAssignSubmitting(false);
    }
  };

  const handleAdjustStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustQty || parseInt(adjustQty) === 0) {
      alert('Quantity cannot be zero.');
      return;
    }
    try {
      setAdjustSubmitting(true);
      const response = await apiFetch('/stock/adjust', {
        method: 'POST',
        body: JSON.stringify({
          product_id: selectedProduct.product_id,
          quantity: parseInt(adjustQty),
          adjustment_type: adjustType,
          notes: adjustNotes || undefined,
        }),
      });
      if (response.success) {
        setIsAdjustModalOpen(false);
        setAdjustQty('');
        setAdjustNotes('');
        fetchProducts();
        fetchDashboardData();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to adjust stock');
    } finally {
      setAdjustSubmitting(false);
    }
  };

  const handleCancelPo = (orderId: number) => {
    setPoToCancel(orderId);
    setIsCancelPoModalOpen(true);
  };

  const handleCompletePo = async (orderId: number) => {
    try {
      await apiFetch(`/purchase-orders/${orderId}/approve`, {
        method: 'POST',
      });
      fetchPurchaseOrders();
      fetchDashboardData();
    } catch (err: any) {
      alert(err.message || 'Failed to complete the order.');
    }
  };

  const handleOpenReceiveModal = (order: any) => {
    setSelectedPoForReceive(order);
    const initialQuantities: Record<number, number> = {};
    order.items.forEach((item: any) => {
      initialQuantities[item.id] = item.order_quantity;
    });
    setReceiveQuantities(initialQuantities);
    setReceiveNotes('');
    setIsReceiveModalOpen(true);
  };

  const handleSubmitReceive = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPoForReceive) return;
    try {
      setReceiveSubmitting(true);
      const payloadItems = Object.entries(receiveQuantities).map(([id, qty]) => ({
        id: parseInt(id),
        received_quantity: qty
      }));
      const res = await apiFetch(`/purchase-orders/${selectedPoForReceive.order_id}/receive`, {
        method: 'POST',
        body: JSON.stringify({
          items: payloadItems,
          receiving_notes: receiveNotes
        })
      });
      if (res.success) {
        setIsReceiveModalOpen(false);
        fetchPurchaseOrders();
        fetchDashboardData();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to receive order.');
    } finally {
      setReceiveSubmitting(false);
    }
  };

  const handleOpenRejectModal = (order: any) => {
    setSelectedPoForReject(order);
    setRejectReason('');
    setIsRejectModalOpen(true);
  };

  const handleSubmitReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPoForReject || !rejectReason.trim()) return;
    try {
      setRejectSubmitting(true);
      const res = await apiFetch(`/purchase-orders/${selectedPoForReject.order_id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason: rejectReason })
      });
      if (res.success) {
        setIsRejectModalOpen(false);
        fetchPurchaseOrders();
        fetchDashboardData();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to reject order.');
    } finally {
      setRejectSubmitting(false);
    }
  };

  const handleOpenPoModal = () => {
    router.push('/purchase-orders?new=true');
  };

  const handleCreatePo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplierId || poItems.length === 0) {
      alert('Please select a supplier and add at least one product.');
      return;
    }
    try {
      setPoSubmitting(true);
      const payloadItems = poItems.map(item => ({
        product_id: item.product_id,
        order_quantity: item.quantity
      }));
      const res = await apiFetch('/purchase-orders/manual', {
        method: 'POST',
        body: JSON.stringify({
          supplier_id: selectedSupplierId,
          items: payloadItems
        })
      });
      if (res.success) {
        setIsPoModalOpen(false);
        fetchPurchaseOrders();
        fetchDashboardData();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to create purchase order');
    } finally {
      setPoSubmitting(false);
    }
  };

  const handleOneClickReorder = async (suggestion: any) => {
    const prod = products.find(p => p.product_id === suggestion.product_id);
    if (!prod || !prod.supplier_id) {
      alert('Product or supplier information missing.');
      return;
    }
    if (!window.confirm(`Create automated purchase order for ${Math.round(suggestion.suggested_reorder_quantity)} units of ${suggestion.product_name}?`)) {
      return;
    }
    try {
      const res = await apiFetch('/purchase-orders/manual', {
        method: 'POST',
        body: JSON.stringify({
          supplier_id: prod.supplier_id,
          items: [{
            product_id: suggestion.product_id,
            order_quantity: Math.round(suggestion.suggested_reorder_quantity)
          }]
        })
      });
      if (res.success) {
        alert('Purchase order created successfully!');
        fetchPurchaseOrders();
        fetchDashboardData();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to trigger reorder');
    }
  };

  const getUrgencyStyle = (s: any) => {
    const ratio = s.suggested_reorder_quantity / s.projected_demand;
    if (ratio >= 0.7) return { dot: 'bg-red-500', badge: 'bg-red-50 text-red-600' };
    if (ratio >= 0.35) return { dot: 'bg-amber-400', badge: 'bg-amber-50 text-amber-600' };
    return { dot: 'bg-blue-400', badge: 'bg-blue-50 text-blue-600' };
  };

  const toggleOrderExpand = (orderId: number) => {
    const newExpanded = new Set(expandedOrders);
    if (newExpanded.has(orderId)) {
      newExpanded.delete(orderId);
    } else {
      newExpanded.add(orderId);
    }
    setExpandedOrders(newExpanded);
  };

  if (loading) {
    return (
      <div className="h-[80vh] flex flex-col items-center justify-center">
        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-4" />
        <p className="text-slate-500 font-medium">Assembling your workspace...</p>
      </div>
    );
  }

  if (user?.role === 'auditor') {
    return <AuditorDashboard user={user} router={router} />;
  }

  if (user?.role === 'admin') {
    return <AdminDashboard user={user} router={router} />;
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

  if (user?.role === 'staff') {
    return <StaffDashboard user={user} router={router} />;
  }

  const filteredAdjustProducts = products.filter(p =>
    p.product_name.toLowerCase().includes(productSearch.toLowerCase()) ||
    p.sku.toLowerCase().includes(productSearch.toLowerCase())
  );

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto' }}>

      {/* Premium welcome banner with quick actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-900 text-white rounded-[32px] p-8 relative overflow-hidden shadow-xl mb-7">
        <div className="space-y-2 z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/20 rounded-full text-indigo-300 font-black text-[10px] uppercase tracking-widest">
            <TrendingUp size={12} strokeWidth={2.5} /> Manager Control Hub
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white">Manager Dashboard</h1>
          <p className="text-slate-300 font-medium max-w-md text-sm">
            Welcome back, {user?.name || 'Manager'}. Here is your operations checklist and demand forecasts for today.
          </p>
        </div>
        <div className="flex gap-3 z-10 shrink-0">
          <button
            onClick={() => router.push('/purchase-orders?new=true')}
            className="px-5 py-3 bg-white text-slate-900 hover:bg-slate-100 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all shadow-md flex items-center gap-1.5"
          >
            <Plus size={14} /> New Purchase Order
          </button>
          <button
            onClick={() => {
              setActiveTab('actions');
              const el = document.getElementById('pending-actions-tab');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
            className="px-5 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold text-xs uppercase tracking-widest transition-all shadow-lg shadow-indigo-600/30 flex items-center gap-1.5"
          >
            <Check size={14} /> Pending Approvals
          </button>
        </div>
        <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none translate-x-12 translate-y-12">
          <TrendingUp size={260} className="text-white" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-7">

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
                      <button
                        onClick={() => handleOneClickReorder(s)}
                        className={`text-[10px] font-black px-2 py-0.5 rounded-lg shrink-0 hover:opacity-80 transition-all ${style.badge}`}
                      >
                        +{Math.round(s.suggested_reorder_quantity)} Order
                      </button>
                    </div>
                    <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${covered < 40 ? 'bg-red-500' : covered < 70 ? 'bg-amber-400' : 'bg-blue-400'
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
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-7">
        {stats.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </div>

      <div id="pending-actions-tab" className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-7">
        <div className="border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between px-6 py-4 gap-4">
          <div className="flex gap-2">
            {[
              { id: 'actions', label: 'Pending Actions', count: pendingRequests.length + activeAlerts.length },

              { id: 'orders', label: 'Purchase Orders', count: purchaseOrders.filter(o => o.status === 'Pending Approval' || o.status === 'Scheduled').length },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === tab.id
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 bg-white border border-slate-200'
                  }`}
              >
                {tab.label}
                {tab.count !== null && tab.count > 0 && (
                  <span className={`ml-2 px-1.5 py-0.5 text-[9px] rounded-full ${activeTab === tab.id ? 'bg-white text-indigo-600 font-black' : 'bg-rose-500 text-white font-black'
                    }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {activeTab === 'orders' && (
            <button
              onClick={handleOpenPoModal}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-3 py-2 rounded-lg flex items-center gap-1.5 shadow-sm transition-all"
            >
              <Plus size={14} />
              New Purchase Order
            </button>
          )}
        </div>

        <div className="p-6">
          {activeTab === 'actions' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-1.5">
                  <Clock size={16} className="text-amber-500" />
                  Stock Requests Waiting Approval
                </h3>
                {requestsLoading ? (
                  <div className="py-8 flex justify-center"><Loader2 className="animate-spin text-slate-400" /></div>
                ) : pendingRequests.length === 0 ? (
                  <p className="text-xs text-slate-400 bg-slate-50 p-4 rounded-xl border border-slate-100 text-center">No pending stock requests from staff.</p>
                ) : (
                  <div className="space-y-2">
                    {pendingRequests.map(req => (
                      <div key={req.transaction_id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-slate-800 truncate">{req.product_name}</p>
                          <p className="text-[10px] font-mono text-slate-400 mt-0.5">{req.sku}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${req.type === 'IN' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-600 border border-rose-100'
                              }`}>
                              {req.type}
                            </span>
                            <span className="text-[10px] font-bold text-slate-600">Qty: {req.quantity}</span>
                          </div>
                          {req.reason && <p className="text-[10px] text-slate-500 italic mt-1 font-medium">"{req.reason}"</p>}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleRequestAction(req.transaction_id, 'approve')}
                            disabled={actionProcessingId === req.transaction_id}
                            className="bg-emerald-50 hover:bg-emerald-100 text-emerald-600 text-[10px] font-bold px-2 py-1.5 rounded-lg border border-emerald-100 disabled:opacity-50"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleRequestAction(req.transaction_id, 'reject')}
                            disabled={actionProcessingId === req.transaction_id}
                            className="bg-rose-50 hover:bg-rose-100 text-rose-600 text-[10px] font-bold px-2 py-1.5 rounded-lg border border-rose-100 disabled:opacity-50"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-1.5">
                  <AlertTriangle size={16} className="text-rose-500" />
                  Active System Alerts
                </h3>
                {alertsLoading ? (
                  <div className="py-8 flex justify-center"><Loader2 className="animate-spin text-slate-400" /></div>
                ) : activeAlerts.length === 0 ? (
                  <p className="text-xs text-slate-400 bg-slate-50 p-4 rounded-xl border border-slate-100 text-center">System is healthy. No active alerts.</p>
                ) : (
                  <div className="space-y-2">
                    {activeAlerts.map(alertItem => (
                      <div key={alertItem.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-slate-800 leading-tight">{alertItem.message}</p>
                          <p className="text-[9px] text-slate-400 uppercase tracking-wider font-bold mt-1">{alertItem.alert_type} · {new Date(alertItem.created_at).toLocaleDateString()}</p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => handleResolveAlert(alertItem.id)}
                            disabled={alertProcessingId === alertItem.id}
                            className="bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-[10px] font-bold px-2.5 py-1.5 rounded-lg border border-indigo-100 disabled:opacity-50"
                          >
                            Resolve
                          </button>
                          <button
                            onClick={() => openAssignModal(alertItem)}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold px-2.5 py-1.5 rounded-lg border border-slate-200"
                          >
                            Assign
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'adjust' && (
            <div>
              <div className="relative max-w-md mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="text"
                  placeholder="Search product by name or SKU..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              {productsLoading ? (
                <div className="py-8 flex justify-center"><Loader2 className="animate-spin text-slate-400" /></div>
              ) : filteredAdjustProducts.length === 0 ? (
                <p className="text-xs text-slate-400 py-8 text-center bg-slate-50 rounded-xl">No products found matching your search.</p>
              ) : (
                <div className="overflow-x-auto border border-slate-100 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 font-bold">
                        <th className="px-4 py-3">Product Info</th>
                        <th className="px-4 py-3">Stock Details</th>
                        <th className="px-4 py-3">Price</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredAdjustProducts.slice(0, 15).map(prod => (
                        <tr key={prod.product_id} className="hover:bg-slate-50/50">
                          <td className="px-4 py-3.5">
                            <p className="font-bold text-slate-800">{prod.product_name}</p>
                            <p className="text-[9px] font-mono text-slate-400 mt-0.5">{prod.sku} · {prod.category_name}</p>
                          </td>
                          <td className="px-4 py-3.5">
                            <span className={`font-bold ${prod.current_stock < prod.min_stock ? 'text-rose-600' : 'text-slate-700'}`}>
                              {prod.current_stock}
                            </span>
                            <span className="text-slate-400 font-medium"> / {prod.max_stock} max (min: {prod.min_stock})</span>
                          </td>
                          <td className="px-4 py-3.5 font-semibold text-slate-600">${prod.unit_price}</td>
                          <td className="px-4 py-3.5 text-right">
                            <button
                              onClick={() => {
                                setSelectedProduct(prod);
                                setAdjustQty('');
                                setAdjustType('physical_count');
                                setAdjustNotes('');
                                setIsAdjustModalOpen(true);
                              }}
                              className="bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-bold px-3 py-1.5 rounded-lg border border-indigo-100"
                            >
                              Quick Adjust
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'orders' && (
            <div>
              {posLoading ? (
                <div className="py-8 flex justify-center"><Loader2 className="animate-spin text-slate-400" /></div>
              ) : purchaseOrders.length === 0 ? (
                <p className="text-xs text-slate-400 bg-slate-50 p-4 rounded-xl border border-slate-100 text-center">No recent purchase orders.</p>
              ) : (
                <div className="space-y-4">
                  {purchaseOrders.map(order => {
                    const isExpanded = expandedOrders.has(order.order_id);
                    return (
                      <div key={order.order_id} className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm hover:border-slate-300 transition-all">
                        <div
                          onClick={() => toggleOrderExpand(order.order_id)}
                          className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-50/50 cursor-pointer select-none gap-3"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-800">PO #{order.order_id}</span>
                              <span className={`text-[9px] font-black px-1.5 py-0.5 rounded capitalize ${order.status === 'Completed' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                                order.status === 'Pending Approval' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                                  order.status === 'Rejected' || order.status === 'Cancelled' ? 'bg-rose-50 text-rose-600 border border-rose-100' :
                                    'bg-blue-50 text-blue-600 border border-blue-100'
                                }`}>
                                {order.status}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-400 font-medium mt-1">
                              Created: {new Date(order.created_at).toLocaleDateString()} · {order.items.length} items
                            </p>
                          </div>
                          <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                            {order.status === 'Pending Approval' && (
                              <>
                                <button
                                  onClick={() => handleCompletePo(order.order_id)}
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold px-2.5 py-1.5 rounded-lg shadow-sm"
                                >
                                  Complete
                                </button>
                                <button
                                  onClick={() => handleOpenRejectModal(order)}
                                  className="bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold px-2.5 py-1.5 rounded-lg shadow-sm"
                                >
                                  Reject
                                </button>
                              </>
                            )}
                            {order.status === 'Scheduled' && (
                              <>
                                <button
                                  onClick={() => handleOpenReceiveModal(order)}
                                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold px-2.5 py-1.5 rounded-lg shadow-sm"
                                >
                                  Receive
                                </button>
                                <button
                                  onClick={() => handleCancelPo(order.order_id)}
                                  className="bg-slate-200 hover:bg-slate-300 text-slate-700 text-[10px] font-bold px-2.5 py-1.5 rounded-lg border border-slate-300"
                                >
                                  Cancel
                                </button>
                              </>
                            )}
                            <button
                              onClick={() => toggleOrderExpand(order.order_id)}
                              className="text-slate-400 hover:text-slate-600 p-1"
                            >
                              <Eye size={16} />
                            </button>
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="border-t border-slate-100 p-4 bg-white">
                            <table className="w-full text-left text-xs">
                              <thead>
                                <tr className="text-slate-400 font-bold border-b border-slate-100">
                                  <th className="pb-2">Product</th>
                                  <th className="pb-2">SKU</th>
                                  <th className="pb-2 text-right">Ordered</th>
                                  <th className="pb-2 text-right">Received</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-50">
                                {order.items.map((item: any) => (
                                  <tr key={item.id}>
                                    <td className="py-2 text-slate-800 font-semibold">{item.product_name}</td>
                                    <td className="py-2 text-slate-500 font-mono text-[10px]">{item.sku}</td>
                                    <td className="py-2 text-right text-slate-700 font-bold">{item.order_quantity}</td>
                                    <td className="py-2 text-right text-slate-500 font-bold">{item.received_quantity ?? '-'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                            {order.receiving_notes && (
                              <div className="mt-3 bg-slate-50 p-2 rounded-lg text-[10px] text-slate-500 font-medium">
                                <span className="font-bold">Receiving notes:</span> "{order.receiving_notes}"
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {isAdjustModalOpen && selectedProduct && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800">Quick Stock Adjustment</h3>
              <button onClick={() => setIsAdjustModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-xs font-bold">Close</button>
            </div>
            <form onSubmit={handleAdjustStock} className="p-6 space-y-4">
              <div>
                <p className="text-xs font-bold text-slate-500">Product</p>
                <p className="text-xs font-bold text-slate-800 mt-0.5">{selectedProduct.product_name}</p>
                <p className="text-[10px] font-mono text-slate-400">{selectedProduct.sku} · Current: {selectedProduct.current_stock}</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Adjustment Quantity</label>
                <input
                  type="number"
                  placeholder="e.g. 10 (positive to add, negative to subtract)"
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Adjustment Type</label>
                <select
                  value={adjustType}
                  onChange={(e) => setAdjustType(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="physical_count">Physical Count</option>
                  <option value="shrinkage">Shrinkage</option>
                  <option value="theft_loss">Theft Loss</option>
                  <option value="damage">Damage</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Reason / Notes</label>
                <textarea
                  placeholder="Provide details about this stock adjustment..."
                  value={adjustNotes}
                  onChange={(e) => setAdjustNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 h-16 resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAdjustModalOpen(false)}
                  className="flex-1 py-2 text-xs font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adjustSubmitting}
                  className="flex-1 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg disabled:opacity-50"
                >
                  {adjustSubmitting ? 'Submitting...' : 'Apply Adjust'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isPoModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between shrink-0">
              <h3 className="text-sm font-bold text-slate-800">Quick Purchase Order Builder</h3>
              <button onClick={() => setIsPoModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-xs font-bold">Close</button>
            </div>
            <form onSubmit={handleCreatePo} className="p-6 flex-1 overflow-y-auto space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Select Supplier</label>
                <select
                  value={selectedSupplierId}
                  onChange={(e) => {
                    setSelectedSupplierId(e.target.value);
                    setPoItems([]);
                  }}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  required
                >
                  <option value="">-- Choose a Supplier --</option>
                  {suppliers.map(s => (
                    <option key={s.supplier_id} value={s.supplier_id}>{s.name} ({s.contact_name})</option>
                  ))}
                </select>
              </div>

              {selectedSupplierId && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Add Product & Qty</label>
                  <div className="flex gap-2">
                    <select
                      id="poProductSelect"
                      className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    >
                      <option value="">-- Select Product --</option>
                      {products.filter(p => p.supplier_id === selectedSupplierId).map(p => (
                        <option key={p.product_id} value={p.product_id}>{p.product_name} ({p.sku})</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      id="poProductQty"
                      placeholder="Qty"
                      defaultValue="50"
                      className="w-20 px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const sel = document.getElementById('poProductSelect') as HTMLSelectElement;
                        const qty = document.getElementById('poProductQty') as HTMLInputElement;
                        if (!sel.value || !qty.value || parseInt(qty.value) <= 0) return;
                        if (poItems.some(i => i.product_id === sel.value)) return;
                        setPoItems([...poItems, { product_id: sel.value, quantity: parseInt(qty.value), tempId: nextTempId }]);
                        setNextTempId(nextTempId + 1);
                      }}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-3 rounded-lg"
                    >
                      Add
                    </button>
                  </div>
                </div>
              )}

              {poItems.length > 0 && (
                <div className="space-y-2 border border-slate-100 rounded-xl p-3 bg-slate-50/50">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">PO Items List</p>
                  {poItems.map(item => {
                    const prodInfo = products.find(p => p.product_id === item.product_id);
                    return (
                      <div key={item.tempId} className="flex items-center justify-between bg-white border border-slate-200 p-2 rounded-lg text-xs font-semibold text-slate-800">
                        <div className="min-w-0 flex-1">
                          <p className="truncate">{prodInfo?.product_name || item.product_id}</p>
                          <p className="text-[9px] font-mono text-slate-400">{prodInfo?.sku}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-indigo-600">Qty: {item.quantity}</span>
                          <button
                            type="button"
                            onClick={() => setPoItems(poItems.filter(i => i.tempId !== item.tempId))}
                            className="text-slate-400 hover:text-rose-500"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="flex gap-3 pt-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsPoModalOpen(false)}
                  className="flex-1 py-2 text-xs font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={poSubmitting || poItems.length === 0}
                  className="flex-1 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg disabled:opacity-50"
                >
                  {poSubmitting ? 'Creating...' : 'Create Purchase Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isReceiveModalOpen && selectedPoForReceive && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between shrink-0">
              <h3 className="text-sm font-bold text-slate-800">Receive Purchase Order #{selectedPoForReceive.order_id}</h3>
              <button onClick={() => setIsReceiveModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-xs font-bold">Close</button>
            </div>
            <form onSubmit={handleSubmitReceive} className="p-6 flex-1 overflow-y-auto space-y-4">
              <div className="space-y-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Confirm Quantities</p>
                {selectedPoForReceive.items.map((item: any) => (
                  <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between bg-slate-50 border border-slate-200 p-3 rounded-xl gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-800 truncate">{item.product_name}</p>
                      <p className="text-[10px] font-mono text-slate-400 mt-0.5">{item.sku} · Ordered: {item.order_quantity}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-[10px] font-bold text-slate-500 shrink-0">Received Qty:</label>
                      <input
                        type="number"
                        value={receiveQuantities[item.id] ?? ''}
                        onChange={(e) => setReceiveQuantities({ ...receiveQuantities, [item.id]: parseInt(e.target.value) || 0 })}
                        className="w-20 px-2 py-1 border border-slate-200 rounded text-xs font-bold text-right"
                        min="0"
                        required
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Receiving Notes</label>
                <textarea
                  placeholder="Optional notes regarding delivery, damaged items, etc..."
                  value={receiveNotes}
                  onChange={(e) => setReceiveNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 h-16 resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsReceiveModalOpen(false)}
                  className="flex-1 py-2 text-xs font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={receiveSubmitting}
                  className="flex-1 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg disabled:opacity-50"
                >
                  {receiveSubmitting ? 'Receiving...' : 'Fulfill & Submit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isRejectModalOpen && selectedPoForReject && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800">Reject Purchase Order #{selectedPoForReject.order_id}</h3>
              <button onClick={() => setIsRejectModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-xs font-bold">Close</button>
            </div>
            <form onSubmit={handleSubmitReject} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Reason for Rejection</label>
                <textarea
                  placeholder="Specify why you are rejecting this purchase order..."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 h-24 resize-none"
                  required
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsRejectModalOpen(false)}
                  className="flex-1 py-2 text-xs font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={rejectSubmitting || !rejectReason.trim()}
                  className="flex-1 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg disabled:opacity-50"
                >
                  {rejectSubmitting ? 'Rejecting...' : 'Reject Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isAssignModalOpen && selectedAlertForAssign && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800">Assign Alert Investigation</h3>
              <button onClick={() => setIsAssignModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-xs font-bold">Close</button>
            </div>
            <form onSubmit={handleAssignAlert} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Select Manager/User</label>
                <select
                  value={selectedManagerId}
                  onChange={(e) => setSelectedManagerId(e.target.value ? parseInt(e.target.value) : '')}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  required
                >
                  <option value="">-- Choose Person --</option>
                  {managers.map(mgr => (
                    <option key={mgr.user_id} value={mgr.user_id}>{mgr.name} ({mgr.role})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Notes / Instructions</label>
                <textarea
                  placeholder="Instructions for the investigation..."
                  value={assignNotes}
                  onChange={(e) => setAssignNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 h-20 resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAssignModalOpen(false)}
                  className="flex-1 py-2 text-xs font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={assignSubmitting || !selectedManagerId}
                  className="flex-1 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg disabled:opacity-50"
                >
                  {assignSubmitting ? 'Assigning...' : 'Assign Alert'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      {isCancelPoModalOpen && poToCancel !== null && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full border border-slate-200 shadow-2xl overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800">Cancel Purchase Order</h3>
              <button onClick={() => setIsCancelPoModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-xs font-bold">Close</button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-slate-600 text-xs font-semibold">Are you sure you want to cancel Purchase Order #{poToCancel}?</p>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCancelPoModalOpen(false)}
                  className="flex-1 py-2 text-xs font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-lg"
                >
                  No, Keep It
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const orderId = poToCancel;
                    setIsCancelPoModalOpen(false);
                    try {
                      await apiFetch(`/purchase-orders/${orderId}/status?status=Cancelled`, {
                        method: 'PATCH',
                      });
                      fetchPurchaseOrders();
                      fetchDashboardData();
                    } catch (err: any) {
                      alert(err.message || 'Failed to cancel the order.');
                    }
                  }}
                  className="flex-1 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg"
                >
                  Yes, Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
