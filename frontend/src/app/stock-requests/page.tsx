'use client';

import { useState, useEffect, Suspense } from 'react';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Search, 
  Filter, 
  Loader2, 
  AlertCircle,
  Package,
  User,
  Calendar,
  Plus,
  Minus,
  Scan
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

function StockRequestsPageContent() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all, pending, approved, rejected
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const LIMIT = 50;
  const [processingId, setProcessingId] = useState<number | null>(null);

  const canApprove = user?.role === 'manager';

  useEffect(() => {
    // Reset offset and fetch when search or status changes
    setOffset(0);
    fetchRequests(false);
  }, [statusFilter, searchTerm]);

  const fetchRequests = async (isLoadMore = false) => {
    try {
      if (!isLoadMore) setLoading(true);
      const currentOffset = isLoadMore ? offset + LIMIT : 0;
      
      const queryParams = new URLSearchParams({
        limit: LIMIT.toString(),
        offset: currentOffset.toString()
      });
      if (statusFilter !== 'all') queryParams.append('status', statusFilter);
      if (searchTerm) queryParams.append('search', searchTerm);

      const response = await apiFetch(`/stock/requests?${queryParams.toString()}`);
      if (response.success) {
        if (isLoadMore) {
          setRequests(prev => [...prev, ...response.data]);
        } else {
          setRequests(response.data);
        }
        setOffset(currentOffset);
        setHasMore(response.has_more);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch stock requests');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (transactionId: number, action: 'approve' | 'reject') => {
    try {
      setProcessingId(transactionId);
      
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
        fetchRequests();
      }
    } catch (err: any) {
      alert(err.message || `Failed to ${action} request`);
    } finally {
      setProcessingId(null);
    }
  };

  // Using requests directly as filtering is now done on the backend
  const filteredRequests = requests;

  const pendingCount = requests.filter(r => r.status === 'pending').length;

  return (
    <div className="max-w-[1280px] mx-auto px-4 py-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Stock Requests</h1>
          <p className="text-sm text-slate-500 mt-1">
            {canApprove 
              ? 'Review and manage pending stock IN/OUT requests from staff.' 
              : 'Track the status of your submitted stock requests.'}
          </p>
        </div>
        {canApprove && pendingCount > 0 && (
          <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-700 rounded-lg border border-amber-100 text-sm font-semibold">
            <Clock size={18} />
            {pendingCount} Pending Approvals
          </div>
        )}
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text"
            placeholder="Search by product or requester..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex items-center">
            <Filter className="absolute left-3 text-slate-400" size={16} />
            <select 
              className="pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-600 outline-none focus:ring-2 focus:ring-indigo-500/20 appearance-none"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>
      </div>

      {/* Requests List */}
      <div className="space-y-4">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center bg-white rounded-xl border border-slate-200">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-4" />
            <p className="text-slate-500 text-sm">Fetching stock requests...</p>
          </div>
        ) : error ? (
          <div className="py-20 flex flex-col items-center justify-center bg-white rounded-xl border border-slate-200">
            <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
            <h3 className="text-lg font-bold text-slate-900">Failed to load requests</h3>
            <p className="text-slate-500 text-sm">{error}</p>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center bg-white rounded-xl border border-slate-200 text-center">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
              <Package size={32} className="text-slate-300" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">No Requests Found</h3>
            <p className="text-slate-500 text-sm">There are no stock requests matching your criteria.</p>
          </div>
        ) : (
          filteredRequests.map((req) => (
            <div key={req.transaction_id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center gap-6 transition-all hover:shadow-md">
              
              {/* Type Icon & Status */}
              <div className="flex flex-col items-center justify-center shrink-0 w-24">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 ${
                  req.type === 'IN' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'
                }`}>
                  {req.type === 'IN' ? <Plus size={24} /> : <Minus size={24} />}
                </div>
                {req.status === 'pending' && <span className="px-2 py-1 text-[10px] font-bold uppercase bg-amber-50 text-amber-600 rounded border border-amber-100">Pending</span>}
                {req.status === 'approved' && <span className="px-2 py-1 text-[10px] font-bold uppercase bg-emerald-50 text-emerald-600 rounded border border-emerald-100">Approved</span>}
                {req.status === 'rejected' && <span className="px-2 py-1 text-[10px] font-bold uppercase bg-slate-100 text-slate-600 rounded border border-slate-200">Rejected</span>}
              </div>

              {/* Details */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <h3 className="text-lg font-bold text-slate-900 truncate">{req.product_name || 'Unknown Product'}</h3>
                  <span className="text-sm font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded shrink-0">ID: {req.product_id}</span>
                  {req.source?.includes('CV Scanner') && (
                    <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 shrink-0">
                      <Scan size={10} />
                      CV Scanner
                    </span>
                  )}
                </div>
                
                <p className="text-slate-600 mb-4">
                  Requested <strong className={req.type === 'IN' ? 'text-emerald-600' : 'text-red-600'}>{req.type}</strong> transaction of <strong>{req.quantity}</strong> units.
                  {req.reason && <span className="italic text-slate-500 ml-2">"{req.reason}"</span>}
                </p>

                <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs font-medium text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <User size={14} className="text-slate-400" />
                    Requester: <span className="text-slate-900">{req.requester_name || req.requested_by}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Calendar size={14} className="text-slate-400" />
                    Submitted: <span className="text-slate-900">{new Date(req.timestamp).toLocaleString()}</span>
                  </div>
                  {req.status !== 'pending' && req.approved_at && (
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <Clock size={14} />
                      Action taken at {new Date(req.approved_at).toLocaleString()}
                    </div>
                  )}
                </div>
              </div>

              {/* Actions (Managers/Admins only on Pending requests) */}
              {canApprove && req.status === 'pending' && (
                <div className="flex flex-col gap-2 shrink-0 md:w-32">
                  <button 
                    onClick={() => handleAction(req.transaction_id, 'approve')}
                    disabled={processingId === req.transaction_id || req.requested_by === user?.user_id}
                    title={req.requested_by === user?.user_id ? "Cannot approve your own request" : "Approve request"}
                    className="flex items-center justify-center gap-2 w-full px-4 py-2.5 text-sm font-bold text-white bg-emerald-500 rounded-lg hover:bg-emerald-600 transition-colors shadow-sm shadow-emerald-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {processingId === req.transaction_id ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                    Approve
                  </button>
                  <button 
                    onClick={() => handleAction(req.transaction_id, 'reject')}
                    disabled={processingId === req.transaction_id || req.requested_by === user?.user_id}
                    title={req.requested_by === user?.user_id ? "Cannot reject your own request" : "Reject request"}
                    className="flex items-center justify-center gap-2 w-full px-4 py-2.5 text-sm font-bold text-red-600 bg-red-50 border border-red-100 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {processingId === req.transaction_id ? <Loader2 size={16} className="animate-spin" /> : <XCircle size={16} />}
                    Reject
                  </button>
                </div>
              )}
            </div>
          ))
        )}
        
        {hasMore && !loading && (
          <div className="flex justify-center pt-6 pb-4">
            <button
              onClick={() => fetchRequests(true)}
              className="px-6 py-2.5 bg-white border border-slate-200 text-slate-700 font-medium rounded-lg hover:bg-slate-50 hover:text-indigo-600 transition-colors shadow-sm"
            >
              Load More Requests
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function StockRequestsPage() {
  return (
    <Suspense fallback={<div className="h-[80vh] flex items-center justify-center"><Loader2 className="w-10 h-10 text-indigo-600 animate-spin" /></div>}>
      <StockRequestsPageContent />
    </Suspense>
  );
}
