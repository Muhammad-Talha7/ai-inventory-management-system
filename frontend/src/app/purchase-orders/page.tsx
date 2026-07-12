'use client';

import { useState, useEffect } from 'react';
import { ClipboardList, CheckCircle2, Clock, Calendar, RefreshCw, XCircle, Plus } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

interface PurchaseOrder {
  order_id: number;
  product_id: string;
  order_quantity: number;
  status: string;
  created_at: string;
  product_name: string;
  sku: string;
}

export default function PurchaseOrdersPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Weekly Pagination State
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [weekLabel, setWeekLabel] = useState<string>('');

  // Manual Order State
  const [showManualModal, setShowManualModal] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [manualQuantity, setManualQuantity] = useState(1);
  const [creating, setCreating] = useState(false);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiFetch(`/purchase-orders?page=${page}`);
      if (res.success) {
        setOrders(res.data);
        setHasMore(res.has_more);
        setWeekLabel(res.week_label);
      } else {
        setOrders([]);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch purchase orders.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [page]);

  const handleCancelOrder = async (orderId: number) => {
    try {
      await apiFetch(`/purchase-orders/${orderId}/status?status=Cancelled`, {
        method: 'PATCH',
      });
      // Update the local state
      setOrders(orders.map(o => o.order_id === orderId ? { ...o, status: 'Cancelled' } : o));
    } catch (err: any) {
      alert(err.message || 'Failed to cancel the order.');
    }
  };

  const handleCompleteOrder = async (orderId: number) => {
    try {
      await apiFetch(`/purchase-orders/${orderId}/status?status=Completed`, {
        method: 'PATCH',
      });
      // Update the local state
      setOrders(orders.map(o => o.order_id === orderId ? { ...o, status: 'Completed' } : o));
    } catch (err: any) {
      alert(err.message || 'Failed to complete the order.');
    }
  };

  const handleMarkReceived = async (orderId: number) => {
    try {
      await apiFetch(`/purchase-orders/${orderId}/status?status=Pending Approval`, {
        method: 'PATCH',
      });
      // Update the local state
      setOrders(orders.map(o => o.order_id === orderId ? { ...o, status: 'Pending Approval' } : o));
    } catch (err: any) {
      alert(err.message || 'Failed to mark as received.');
    }
  };

  const handleOpenManualModal = async () => {
    setShowManualModal(true);
    try {
      const res = await apiFetch('/products?limit=1000');
      if (res.success) {
        setProducts(res.data);
        if (res.data.length > 0) setSelectedProductId(res.data[0].product_id);
      }
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleCreateManualOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId || manualQuantity <= 0) return;
    
    try {
      setCreating(true);
      const res = await apiFetch('/purchase-orders/manual', {
        method: 'POST',
        body: JSON.stringify({
          product_id: selectedProductId,
          order_quantity: manualQuantity
        })
      });
      if (res.success) {
        setShowManualModal(false);
        setManualQuantity(1);
        fetchOrders();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to create manual order');
    } finally {
      setCreating(false);
    }
  };

  const totalOrders = orders.length;
  const completedOrders = orders.filter(o => o.status === 'Completed').length;
  const scheduledOrders = orders.filter(o => o.status === 'Scheduled').length;
  const pendingApprovalOrders = orders.filter(o => o.status === 'Pending Approval').length;

  return (
    <div className="max-w-[1280px] mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 rounded-full text-indigo-600 font-black text-[10px] uppercase tracking-widest">
            <ClipboardList size={12} />
            Procurement
          </div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900">Purchase Orders</h1>
          <p className="text-slate-500 font-medium max-w-xl">
            View automatically generated purchase orders from AI forecasts and manually scheduled orders.
          </p>
          {weekLabel && (
            <p className="text-indigo-600 font-bold text-sm bg-indigo-50 inline-block px-3 py-1 rounded-md mt-2">
              {weekLabel}
            </p>
          )}
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1 || loading}
            className="flex items-center gap-2 px-4 py-3 bg-white border border-slate-200 text-slate-700 rounded-2xl font-bold text-sm hover:bg-slate-50 transition-all shadow-sm disabled:opacity-40"
          >
            Newer Week
          </button>
          <button
            onClick={() => setPage(p => p + 1)}
            disabled={!hasMore || loading}
            className="flex items-center gap-2 px-4 py-3 bg-white border border-slate-200 text-slate-700 rounded-2xl font-bold text-sm hover:bg-slate-50 transition-all shadow-sm disabled:opacity-40"
          >
            Older Week
          </button>
          <button
            onClick={fetchOrders}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-3 bg-indigo-600 text-white rounded-2xl font-bold text-sm hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 disabled:opacity-60"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          {user?.role === 'manager' && (
            <button
              onClick={handleOpenManualModal}
              disabled={loading}
              className="flex items-center gap-2 px-5 py-3 bg-indigo-600 text-white rounded-2xl font-bold text-sm hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 disabled:opacity-60"
            >
              <Plus size={16} />
              Manual Order
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
          <p className="text-3xl font-black text-slate-900">{totalOrders}</p>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Total Orders</p>
        </div>
        <div className="bg-amber-50 border border-amber-100 rounded-3xl p-6">
          <p className="text-3xl font-black text-amber-600">{scheduledOrders}</p>
          <p className="text-xs font-bold text-amber-400 uppercase tracking-widest mt-1">Scheduled</p>
        </div>
        <div className="bg-indigo-50 border border-indigo-100 rounded-3xl p-6">
          <p className="text-3xl font-black text-indigo-600">{pendingApprovalOrders}</p>
          <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest mt-1">Pending Approval</p>
        </div>
        <div className="bg-emerald-50 border border-emerald-100 rounded-3xl p-6">
          <p className="text-3xl font-black text-emerald-600">{completedOrders}</p>
          <p className="text-xs font-bold text-emerald-400 uppercase tracking-widest mt-1">Completed</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
        {error ? (
          <div className="p-8 text-center text-red-500">{error}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100">
                  <th className="text-left px-6 py-4">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Order ID</span>
                  </th>
                  <th className="text-left px-6 py-4">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Product</span>
                  </th>
                  <th className="text-right px-6 py-4">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Quantity</span>
                  </th>
                  <th className="text-center px-6 py-4">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</span>
                  </th>
                  <th className="text-right px-6 py-4">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</span>
                  </th>
                  <th className="text-right px-6 py-4">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-slate-50">
                      {Array.from({ length: 6 }).map((_, j) => (
                        <td key={j} className="px-6 py-5">
                          <div className="h-3 bg-slate-100 rounded-full animate-pulse" style={{ width: '60%' }} />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : orders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-20 text-center text-slate-500">
                      No purchase orders found.
                    </td>
                  </tr>
                ) : (
                  orders.map((o) => (
                    <tr key={o.order_id} className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors">
                      <td className="px-6 py-5 font-bold text-slate-900 text-sm">
                        #{o.order_id}
                      </td>
                      <td className="px-6 py-5">
                        <p className="font-bold text-slate-900 text-sm">{o.product_name || 'Unknown Product'}</p>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{o.sku || o.product_id}</p>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <span className="font-black text-indigo-600 text-sm">{o.order_quantity.toLocaleString()}</span>
                        <span className="text-[10px] text-slate-400 font-bold ml-1">units</span>
                      </td>
                      <td className="px-6 py-5 text-center">
                        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                          o.status === 'Scheduled' ? 'bg-amber-100 text-amber-700' : 
                          o.status === 'Pending Approval' ? 'bg-indigo-100 text-indigo-700' :
                          o.status === 'Completed' ? 'bg-emerald-100 text-emerald-700' : 
                          o.status === 'Cancelled' ? 'bg-red-100 text-red-700' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {o.status === 'Scheduled' ? <Clock size={12} /> : o.status === 'Pending Approval' ? <Clock size={12} /> : o.status === 'Completed' ? <CheckCircle2 size={12} /> : o.status === 'Cancelled' ? <XCircle size={12} /> : null}
                          {o.status}
                        </div>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <div className="flex items-center justify-end gap-1.5 text-sm font-medium text-slate-600">
                          <Calendar size={14} className="text-slate-400" />
                          {o.created_at ? new Date(o.created_at).toLocaleDateString() : 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {o.status === 'Scheduled' && user?.role === 'staff' && (
                            <button
                              onClick={() => handleMarkReceived(o.order_id)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-xl text-xs font-bold hover:bg-indigo-100 transition-all shadow-sm"
                            >
                              <CheckCircle2 size={14} />
                              Mark Received
                            </button>
                          )}
                          {o.status === 'Pending Approval' && user?.role === 'manager' && (
                            <button
                              onClick={() => handleCompleteOrder(o.order_id)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-xl text-xs font-bold hover:bg-emerald-100 transition-all shadow-sm"
                            >
                              <CheckCircle2 size={14} />
                              Approve & Complete
                            </button>
                          )}
                          {o.status === 'Scheduled' && user?.role === 'manager' && (
                            <button
                              onClick={() => handleCancelOrder(o.order_id)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 text-rose-600 rounded-xl text-xs font-bold hover:bg-rose-100 transition-all shadow-sm"
                            >
                              <XCircle size={14} />
                              Cancel
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Manual Order Modal */}
      {showManualModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-xl font-black text-slate-900">Create Manual Order</h2>
              <button onClick={() => setShowManualModal(false)} className="text-slate-400 hover:text-slate-600">
                <XCircle size={24} />
              </button>
            </div>
            <form onSubmit={handleCreateManualOrder} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Product</label>
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="Search product name or SKU..."
                    value={productSearch}
                    onChange={e => {
                      const search = e.target.value;
                      setProductSearch(search);
                      const filtered = products.filter(p => 
                        p.product_name.toLowerCase().includes(search.toLowerCase()) || 
                        p.sku.toLowerCase().includes(search.toLowerCase())
                      );
                      if (filtered.length > 0 && !filtered.find(p => p.product_id === selectedProductId)) {
                        setSelectedProductId(filtered[0].product_id);
                      }
                    }}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm text-slate-700"
                  />
                  <select
                    required
                    value={selectedProductId}
                    onChange={e => setSelectedProductId(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium text-slate-700"
                  >
                    <option value="" disabled>Select a product...</option>
                    {products
                      .filter(p => p.product_name.toLowerCase().includes(productSearch.toLowerCase()) || p.sku.toLowerCase().includes(productSearch.toLowerCase()))
                      .map(p => (
                      <option key={p.product_id} value={p.product_id}>
                        {p.product_name} ({p.sku})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Quantity</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={manualQuantity}
                  onChange={e => setManualQuantity(parseInt(e.target.value) || 0)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-bold text-slate-900"
                />
              </div>
              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowManualModal(false)}
                  className="flex-1 px-4 py-3 border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 px-4 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {creating && <RefreshCw size={16} className="animate-spin" />}
                  Create Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
