'use client';

import { useState, useEffect } from 'react';
import { ClipboardList, CheckCircle2, Clock, Calendar, RefreshCw, XCircle } from 'lucide-react';
import { apiFetch } from '@/lib/api';

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
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiFetch('/purchase-orders');
      if (Array.isArray(res)) {
        setOrders(res);
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
  }, []);

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

  const totalOrders = orders.length;
  const completedOrders = orders.filter(o => o.status === 'Completed').length;
  const scheduledOrders = orders.filter(o => o.status === 'Scheduled').length;

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
        </div>
        <button
          onClick={fetchOrders}
          disabled={loading}
          className="flex items-center gap-2 px-5 py-3 bg-indigo-600 text-white rounded-2xl font-bold text-sm hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 disabled:opacity-60"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Refresh List
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
          <p className="text-3xl font-black text-slate-900">{totalOrders}</p>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Total Orders</p>
        </div>
        <div className="bg-amber-50 border border-amber-100 rounded-3xl p-6">
          <p className="text-3xl font-black text-amber-600">{scheduledOrders}</p>
          <p className="text-xs font-bold text-amber-400 uppercase tracking-widest mt-1">Scheduled</p>
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
                          o.status === 'Completed' ? 'bg-emerald-100 text-emerald-700' : 
                          o.status === 'Cancelled' ? 'bg-red-100 text-red-700' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {o.status === 'Scheduled' ? <Clock size={12} /> : o.status === 'Completed' ? <CheckCircle2 size={12} /> : o.status === 'Cancelled' ? <XCircle size={12} /> : null}
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
                        {o.status === 'Scheduled' && (
                          <button
                            onClick={() => handleCancelOrder(o.order_id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 text-rose-600 rounded-xl text-xs font-bold hover:bg-rose-100 transition-all shadow-sm"
                          >
                            <XCircle size={14} />
                            Cancel
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
