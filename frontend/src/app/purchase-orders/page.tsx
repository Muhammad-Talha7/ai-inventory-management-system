'use client';

import React, { useState, useEffect } from 'react';
import { ClipboardList, CheckCircle2, Clock, Calendar, RefreshCw, XCircle, Plus, AlertCircle, ChevronDown, ChevronRight, Trash2, Scan } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

interface PurchaseOrderItem {
  id: number;
  order_id: number;
  product_id: string;
  order_quantity: number;
  received_quantity?: number;
  product_name: string;
  sku: string;
}

const ProductSearchSelect = ({ value, onChange, products }: { value: string, onChange: (val: string) => void, products: any[] }) => {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  
  useEffect(() => {
    if (value && !open) {
      const p = products.find(p => p.product_id === value);
      if (p) setSearch(`${p.product_name} (${p.sku})`);
    }
  }, [value, products, open]);

  const filtered = products.filter(p => p.product_name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="relative flex-1">
      <input 
        type="text" 
        value={search}
        onChange={e => { setSearch(e.target.value); setOpen(true); }}
        onFocus={() => { setOpen(true); setSearch(''); }}
        onBlur={() => setTimeout(() => setOpen(false), 200)}
        placeholder="Search product name or SKU..."
        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium text-slate-700 text-sm"
      />
      {open && (
         <div className="absolute top-full left-0 mt-1 w-full max-h-48 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-1">
            {filtered.length === 0 ? (
              <div className="px-4 py-2 text-sm text-slate-500">No products found.</div>
            ) : filtered.map(p => (
               <div 
                  key={p.product_id} 
                  onClick={() => { onChange(p.product_id); setOpen(false); }} 
                  className="px-4 py-2 text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 cursor-pointer transition-colors"
               >
                 <div className="font-bold">{p.product_name}</div>
                 <div className="text-[10px] uppercase tracking-wider text-slate-500">{p.sku}</div>
               </div>
            ))}
         </div>
      )}
    </div>
  );
};

interface PurchaseOrder {
  order_id: number;
  status: string;
  created_at: string;
  received_by?: number;
  approved_by?: number;
  rejected_by?: number;
  receiving_notes?: string;
  supplier_id?: string;
  items: PurchaseOrderItem[];
}

export default function PurchaseOrdersPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedOrders, setExpandedOrders] = useState<Set<number>>(new Set());
  
  // Weekly Pagination State
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [weekLabel, setWeekLabel] = useState<string>('');

  // Manual Order State
  const [showManualModal, setShowManualModal] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [manualItems, setManualItems] = useState<{product_id: string, quantity: number, tempId: number}[]>([]);
  const [creating, setCreating] = useState(false);
  const [nextTempId, setNextTempId] = useState(1);

  // Edit Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingOrder, setEditingOrder] = useState<PurchaseOrder | null>(null);
  const [editing, setEditing] = useState(false);

  // Receive Modal State
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [selectedPoForReceive, setSelectedPoForReceive] = useState<PurchaseOrder | null>(null);
  const [receiveQuantities, setReceiveQuantities] = useState<Record<number, number>>({});
  const [receiveNotes, setReceiveNotes] = useState('');
  const [receiving, setReceiving] = useState(false);

  // Reject Modal State
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedPoForReject, setSelectedPoForReject] = useState<PurchaseOrder | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejecting, setRejecting] = useState(false);

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

  useEffect(() => {
    const fetchDeps = async () => {
      try {
        const [suppRes, prodRes] = await Promise.all([
          apiFetch('/suppliers/'),
          apiFetch('/products?limit=1000')
        ]);
        if (Array.isArray(suppRes)) setSuppliers(suppRes);
        if (prodRes.success) setProducts(prodRes.data);
      } catch (err: any) {}
    };
    fetchDeps();
  }, []);

  const toggleExpand = (orderId: number) => {
    const newExpanded = new Set(expandedOrders);
    if (newExpanded.has(orderId)) {
      newExpanded.delete(orderId);
    } else {
      newExpanded.add(orderId);
    }
    setExpandedOrders(newExpanded);
  };

  const handleCancelOrder = async (orderId: number) => {
    try {
      await apiFetch(`/purchase-orders/${orderId}/status?status=Cancelled`, {
        method: 'PATCH',
      });
      setOrders(orders.map(o => o.order_id === orderId ? { ...o, status: 'Cancelled' } : o));
    } catch (err: any) {
      alert(err.message || 'Failed to cancel the order.');
    }
  };

  const handleCompleteOrder = async (orderId: number) => {
    try {
      await apiFetch(`/purchase-orders/${orderId}/approve`, {
        method: 'POST',
      });
      fetchOrders();
    } catch (err: any) {
      alert(err.message || 'Failed to complete the order.');
    }
  };

  const handleOpenReceiveModal = (order: PurchaseOrder) => {
    setSelectedPoForReceive(order);
    const initialQuantities: Record<number, number> = {};
    order.items.forEach(item => {
      initialQuantities[item.id] = item.order_quantity;
    });
    setReceiveQuantities(initialQuantities);
    setReceiveNotes('');
    setShowReceiveModal(true);
  };

  const handleSubmitReceive = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPoForReceive) return;
    
    try {
      setReceiving(true);
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
        setShowReceiveModal(false);
        fetchOrders();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to receive order.');
    } finally {
      setReceiving(false);
    }
  };

  const handleOpenRejectModal = (order: PurchaseOrder) => {
    setSelectedPoForReject(order);
    setRejectReason('');
    setShowRejectModal(true);
  };

  const handleSubmitReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPoForReject || !rejectReason.trim()) return;
    
    try {
      setRejecting(true);
      const res = await apiFetch(`/purchase-orders/${selectedPoForReject.order_id}/reject`, {
        method: 'POST',
        body: JSON.stringify({
          reason: rejectReason
        })
      });
      if (res.success) {
        setShowRejectModal(false);
        setOrders(orders.map(o => o.order_id === selectedPoForReject.order_id ? { ...o, status: 'Rejected' } : o));
      }
    } catch (err: any) {
      alert(err.message || 'Failed to reject order.');
    } finally {
      setRejecting(false);
    }
  };

  const handleOpenManualModal = () => {
    setShowManualModal(true);
    setManualItems([]);
    setSelectedSupplierId('');
  };

  const handleOpenEditModal = (order: PurchaseOrder) => {
    setEditingOrder(order);
    setSelectedSupplierId(order.supplier_id || '');
    setManualItems(order.items.map((item, index) => ({
      product_id: item.product_id,
      quantity: item.order_quantity,
      tempId: index
    })));
    setNextTempId(order.items.length);
    setShowEditModal(true);
  };

  const handleUpdateItems = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrder || manualItems.length === 0) return;
    
    try {
      setEditing(true);
      const payloadItems = manualItems.map(item => ({
        product_id: item.product_id,
        order_quantity: item.quantity
      }));
      
      const res = await apiFetch(`/purchase-orders/${editingOrder.order_id}/items`, {
        method: 'PATCH',
        body: JSON.stringify({ items: payloadItems })
      });
      
      if (res.success) {
        setShowEditModal(false);
        fetchOrders();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update order items');
    } finally {
      setEditing(false);
    }
  };
  
  const handleSupplierChange = (suppId: string) => {
    setSelectedSupplierId(suppId);
    setManualItems([]);
    const suppProducts = products.filter(p => p.supplier_id === suppId);
    if (suppProducts.length > 0) {
      setManualItems([{product_id: suppProducts[0].product_id, quantity: 1, tempId: nextTempId}]);
      setNextTempId(nextTempId + 1);
    }
  };

  const addManualItem = () => {
    const suppProducts = products.filter(p => p.supplier_id === selectedSupplierId);
    if (suppProducts.length > 0) {
      setManualItems([...manualItems, {product_id: suppProducts[0].product_id, quantity: 1, tempId: nextTempId}]);
      setNextTempId(nextTempId + 1);
    }
  };
  
  const removeManualItem = (tempId: number) => {
    setManualItems(manualItems.filter(item => item.tempId !== tempId));
  };

  const updateManualItem = (tempId: number, field: string, value: any) => {
    setManualItems(manualItems.map(item => 
      item.tempId === tempId ? { ...item, [field]: value } : item
    ));
  };

  const handleCreateManualOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (manualItems.length === 0) return;
    
    try {
      setCreating(true);
      const payloadItems = manualItems.map(item => ({
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
        setShowManualModal(false);
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
          {user?.role === 'staff' && (
            <button
              onClick={() => window.location.href = '/scanner?mode=PO'}
              className="flex items-center gap-2 px-5 py-3 bg-emerald-600 text-white rounded-2xl font-bold text-sm hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100"
            >
              <Scan size={16} />
              Scan Delivery
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
                  <th className="w-10"></th>
                  <th className="text-left px-6 py-4">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Order ID</span>
                  </th>
                  <th className="text-left px-6 py-4">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Supplier</span>
                  </th>
                  <th className="text-left px-6 py-4">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Items</span>
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
                    <React.Fragment key={`po-${o.order_id}`}>
                      <tr className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors">
                        <td className="px-4 py-5 text-center">
                          <button onClick={() => toggleExpand(o.order_id)} className="p-1 text-slate-400 hover:text-slate-600 rounded">
                            {expandedOrders.has(o.order_id) ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                          </button>
                        </td>
                        <td className="px-6 py-5 font-bold text-slate-900 text-sm">
                          #{o.order_id}
                        </td>
                        <td className="px-6 py-5">
                          <p className="font-bold text-slate-900 text-sm">
                            {suppliers.find(s => s.supplier_id === o.supplier_id)?.name || o.supplier_id || 'Unknown'}
                          </p>
                        </td>
                        <td className="px-6 py-5">
                          <p className="font-bold text-slate-900 text-sm">{o.items.length} Product(s)</p>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                            Total qty: {o.items.reduce((acc, item) => acc + item.order_quantity, 0)}
                          </p>
                        </td>
                        <td className="px-6 py-5 text-center">
                          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                            o.status === 'Scheduled' ? 'bg-amber-100 text-amber-700' : 
                            o.status === 'Pending Approval' ? 'bg-indigo-100 text-indigo-700' :
                            o.status === 'Completed' ? 'bg-emerald-100 text-emerald-700' : 
                            o.status === 'Rejected' ? 'bg-rose-100 text-rose-700' :
                            o.status === 'Cancelled' ? 'bg-red-100 text-red-700' :
                            'bg-slate-100 text-slate-700'
                          }`}>
                            {o.status === 'Scheduled' ? <Clock size={12} /> : 
                             o.status === 'Pending Approval' ? <AlertCircle size={12} /> : 
                             o.status === 'Completed' ? <CheckCircle2 size={12} /> : 
                             o.status === 'Rejected' ? <XCircle size={12} /> : 
                             o.status === 'Cancelled' ? <XCircle size={12} /> : null}
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
                              <span className="px-3 py-1.5 bg-slate-50 text-slate-400 rounded-xl text-xs font-bold border border-slate-100">
                                Awaiting Delivery
                              </span>
                            )}
                            {o.status === 'Pending Approval' && user?.role === 'manager' && (
                              <button
                                onClick={() => handleCompleteOrder(o.order_id)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-xl text-xs font-bold hover:bg-emerald-100 transition-all shadow-sm"
                              >
                                <CheckCircle2 size={14} />
                                Approve
                              </button>
                            )}
                            {o.status === 'Pending Approval' && user?.role === 'manager' && (
                              <button
                                onClick={() => handleOpenRejectModal(o)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 text-rose-600 rounded-xl text-xs font-bold hover:bg-rose-100 transition-all shadow-sm"
                              >
                                <XCircle size={14} />
                                Reject
                              </button>
                            )}
                            {(o.status === 'Scheduled' || o.status === 'Pending Approval') && user?.role === 'manager' && (
                              <>
                                <button
                                  onClick={() => handleOpenEditModal(o)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-xl text-xs font-bold hover:bg-blue-100 transition-all shadow-sm"
                                >
                                  <RefreshCw size={14} />
                                  Edit Items
                                </button>
                                <button
                                  onClick={() => handleCancelOrder(o.order_id)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-200 transition-all shadow-sm"
                                >
                                  <XCircle size={14} />
                                  Cancel
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                      {expandedOrders.has(o.order_id) && (
                        <tr key={`items-${o.order_id}`} className="bg-slate-50/50">
                          <td></td>
                          <td colSpan={5} className="p-4">
                            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                              <table className="w-full">
                                <thead>
                                  <tr className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                                    <th className="text-left px-4 py-2">Product</th>
                                    <th className="text-left px-4 py-2">SKU</th>
                                    <th className="text-right px-4 py-2">Ordered Qty</th>
                                    <th className="text-right px-4 py-2">Received Qty</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {o.items.map(item => (
                                    <tr key={item.id} className="border-b border-slate-50 last:border-0">
                                      <td className="px-4 py-3 text-sm font-bold text-slate-800">{item.product_name}</td>
                                      <td className="px-4 py-3 text-xs text-slate-500">{item.sku}</td>
                                      <td className="px-4 py-3 text-sm font-medium text-slate-700 text-right">{item.order_quantity}</td>
                                      <td className="px-4 py-3 text-sm font-bold text-indigo-600 text-right">
                                        {item.received_quantity !== null && item.received_quantity !== undefined ? item.received_quantity : '-'}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
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
          <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
              <h2 className="text-xl font-black text-slate-900">Create Manual Order</h2>
              <button onClick={() => setShowManualModal(false)} className="text-slate-400 hover:text-slate-600">
                <XCircle size={24} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-4 grow">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Supplier</label>
                  <select
                    value={selectedSupplierId}
                    onChange={(e) => handleSupplierChange(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium text-slate-700"
                  >
                    <option value="">Select a Supplier</option>
                    {suppliers.map(s => (
                      <option key={s.supplier_id} value={s.supplier_id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                
                {selectedSupplierId && (
                  <div className="space-y-3">
                    <div className="flex text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">
                      <div className="flex-1">Product</div>
                      <div className="w-24 text-center">Quantity</div>
                      <div className="w-10"></div>
                    </div>
                    
                    {manualItems.map((item, index) => (
                      <div key={item.tempId} className="flex gap-3 items-center bg-slate-50 p-2 rounded-xl border border-slate-100">
                        <ProductSearchSelect 
                          value={item.product_id}
                          onChange={(val) => updateManualItem(item.tempId, 'product_id', val)}
                          products={products.filter(p => p.supplier_id === selectedSupplierId)}
                        />
                    
                        <input
                          type="number"
                          required
                          min="1"
                          value={item.quantity}
                          onChange={e => updateManualItem(item.tempId, 'quantity', parseInt(e.target.value) || 0)}
                          className="w-24 px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-bold text-slate-900 text-center text-sm"
                        />
                    
                        <button 
                          type="button" 
                          onClick={() => removeManualItem(item.tempId)}
                          disabled={manualItems.length === 1}
                          className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-400"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}

                    <button 
                      type="button"
                      onClick={addManualItem}
                      className="w-full py-3 mt-2 border-2 border-dashed border-slate-200 text-slate-500 font-bold rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-colors flex items-center justify-center gap-2 text-sm"
                    >
                      <Plus size={16} /> Add Another Product
                    </button>
                  </div>
                )}
              </div>
            </div>
            
            <div className="px-6 py-4 border-t border-slate-100 flex gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setShowManualModal(false)}
                className="flex-1 px-4 py-3 border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateManualOrder}
                disabled={creating || manualItems.length === 0}
                className="flex-1 px-4 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {creating && <RefreshCw size={16} className="animate-spin" />}
                Create Order ({manualItems.length} items)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Receive Order Modal */}
      {showReceiveModal && selectedPoForReceive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
              <h2 className="text-xl font-black text-slate-900">Receive Order #{selectedPoForReceive.order_id}</h2>
              <button onClick={() => setShowReceiveModal(false)} className="text-slate-400 hover:text-slate-600">
                <XCircle size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmitReceive} className="p-6 overflow-y-auto space-y-6 grow">
              
              <div className="space-y-3">
                <div className="flex text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">
                  <div className="flex-1">Product</div>
                  <div className="w-24 text-center">Ordered</div>
                  <div className="w-24 text-center">Received</div>
                </div>
                
                {selectedPoForReceive.items.map(item => (
                  <div key={item.id} className="flex gap-3 items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <div className="flex-1">
                      <p className="font-bold text-slate-900 text-sm">{item.product_name}</p>
                      <p className="text-xs text-slate-500">{item.sku}</p>
                    </div>
                    <div className="w-24 text-center font-bold text-slate-600 text-lg">
                      {item.order_quantity}
                    </div>
                    <div className="w-24">
                      <input
                        type="number"
                        required
                        min="0"
                        value={receiveQuantities[item.id] !== undefined ? receiveQuantities[item.id] : item.order_quantity}
                        onChange={e => setReceiveQuantities({...receiveQuantities, [item.id]: parseInt(e.target.value) || 0})}
                        className="w-full px-2 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-bold text-indigo-600 text-center"
                      />
                    </div>
                  </div>
                ))}
              </div>
              
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Notes (Optional)</label>
                <textarea
                  value={receiveNotes}
                  onChange={e => setReceiveNotes(e.target.value)}
                  placeholder="E.g., 2 boxes were damaged..."
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium text-slate-700 min-h-[80px]"
                />
              </div>
              
              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowReceiveModal(false)}
                  className="flex-1 px-4 py-3 border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={receiving}
                  className="flex-1 px-4 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {receiving && <RefreshCw size={16} className="animate-spin" />}
                  Confirm Receipt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reject Order Modal */}
      {showRejectModal && selectedPoForReject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-xl font-black text-slate-900">Reject Order #{selectedPoForReject.order_id}</h2>
              <button onClick={() => setShowRejectModal(false)} className="text-slate-400 hover:text-slate-600">
                <XCircle size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmitReject} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Rejection Reason</label>
                <textarea
                  required
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                  placeholder="Explain why this order is being rejected..."
                  className="w-full px-4 py-3 bg-slate-50 border border-rose-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 font-medium text-slate-700 min-h-[120px]"
                />
              </div>
              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowRejectModal(false)}
                  className="flex-1 px-4 py-3 border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={rejecting}
                  className="flex-1 px-4 py-3 bg-rose-600 text-white font-bold rounded-xl hover:bg-rose-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {rejecting && <RefreshCw size={16} className="animate-spin" />}
                  Confirm Rejection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Edit Items Modal */}
      {showEditModal && editingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
              <h2 className="text-xl font-black text-slate-900">Edit Items for Order #{editingOrder.order_id}</h2>
              <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-slate-600">
                <XCircle size={24} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-4 grow">
              <div className="space-y-3">
                <div className="flex text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">
                  <div className="flex-1">Product</div>
                  <div className="w-24 text-center">Quantity</div>
                  <div className="w-10"></div>
                </div>
                
                {manualItems.map((item) => (
                  <div key={item.tempId} className="flex gap-3 items-center bg-slate-50 p-2 rounded-xl border border-slate-100">
                    <ProductSearchSelect 
                      value={item.product_id}
                      onChange={(val) => updateManualItem(item.tempId, 'product_id', val)}
                      products={products.filter(p => p.supplier_id === selectedSupplierId)}
                    />
                    
                    <input
                      type="number"
                      required
                      min="1"
                      value={item.quantity}
                      onChange={e => updateManualItem(item.tempId, 'quantity', parseInt(e.target.value) || 0)}
                      className="w-24 px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-bold text-slate-900 text-center text-sm"
                    />
                    
                    <button 
                      type="button" 
                      onClick={() => removeManualItem(item.tempId)}
                      disabled={manualItems.length === 1}
                      className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-400"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
              
              <button 
                type="button"
                onClick={addManualItem}
                className="w-full py-3 mt-2 border-2 border-dashed border-slate-200 text-slate-500 font-bold rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-colors flex items-center justify-center gap-2 text-sm"
              >
                <Plus size={16} /> Add Another Product
              </button>
            </div>
            
            <div className="px-6 py-4 border-t border-slate-100 flex gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="flex-1 px-4 py-3 border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUpdateItems}
                disabled={editing || manualItems.length === 0}
                className="flex-1 px-4 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {editing && <RefreshCw size={16} className="animate-spin" />}
                Save Changes ({manualItems.length} items)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
