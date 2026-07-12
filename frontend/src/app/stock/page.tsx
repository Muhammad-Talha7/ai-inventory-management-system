'use client';

import { useState, useEffect } from 'react';
import { 
  Truck, 
  Search, 
  Filter, 
  ArrowUpDown, 
  Plus, 
  Minus, 
  History,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownLeft,
  Loader2,
  AlertCircle,
  X,
  Calendar,
  User,
  Package
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

export default function StockPage() {
  const { user } = useAuth();
  const [stockData, setStockData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all, low, healthy, overstocked

  // Transaction Modal state
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [txType, setTxType] = useState<'IN' | 'OUT'>('IN');
  const [txQuantity, setTxQuantity] = useState('');
  const [txSource, setTxSource] = useState('Manual Adjustment');
  const [submitting, setSubmitting] = useState(false);

  // History Modal state
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [txHistory, setTxHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    fetchStock();
  }, []);

  const fetchStock = async () => {
    try {
      setLoading(true);
      const response = await apiFetch('/stock/');
      if (response.success) {
        setStockData(response.data);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch stock data');
    } finally {
      setLoading(false);
    }
  };

  const handleTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const response = await apiFetch('/stock/transaction', {
        method: 'POST',
        body: JSON.stringify({
          product_id: selectedProduct.product_id,
          type: txType,
          quantity: parseInt(txQuantity),
          source: txSource
        })
      });
      if (response.success) {
        setIsTxModalOpen(false);
        setTxQuantity('');
        fetchStock();
      }
    } catch (err: any) {
      alert(err.message || 'Transaction failed');
    } finally {
      setSubmitting(false);
    }
  };

  const fetchHistory = async (product: any) => {
    setSelectedProduct(product);
    setIsHistoryModalOpen(true);
    setLoadingHistory(true);
    try {
      const response = await apiFetch(`/stock/${product.product_id}/history`);
      if (response.success) {
        setTxHistory(response.data);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to fetch history');
    } finally {
      setLoadingHistory(false);
    }
  };

  const filteredStock = stockData.filter(item => {
    const matchesSearch = item.product_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         item.sku.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (statusFilter === 'low') return matchesSearch && item.current_stock < item.min_stock;
    if (statusFilter === 'overstocked') return matchesSearch && item.current_stock > item.max_stock;
    if (statusFilter === 'healthy') return matchesSearch && item.current_stock >= item.min_stock && item.current_stock <= item.max_stock;
    
    return matchesSearch;
  });

  const lowStockCount = stockData.filter(item => item.current_stock < item.min_stock).length;

  return (
    <div className="max-w-[1280px] mx-auto px-4 py-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Stock Management</h1>
          <p className="text-sm text-slate-500 mt-1">
            Monitor real-time stock levels and perform inventory transactions.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-700 rounded-lg border border-amber-100 text-sm font-semibold">
            <AlertTriangle size={18} />
            {lowStockCount} Low Stock Items
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Total Items</p>
          <p className="text-2xl font-bold text-slate-900">{stockData.length}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-emerald-500 uppercase tracking-widest mb-2">Healthy Stock</p>
          <p className="text-2xl font-bold text-slate-900">
            {stockData.filter(i => i.current_stock >= i.min_stock && i.current_stock <= i.max_stock).length}
          </p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-amber-500 uppercase tracking-widest mb-2">Low Stock</p>
          <p className="text-2xl font-bold text-slate-900">{lowStockCount}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-indigo-500 uppercase tracking-widest mb-2">Total Units</p>
          <p className="text-2xl font-bold text-slate-900">
            {stockData.reduce((acc, curr) => acc + curr.current_stock, 0).toLocaleString()}
          </p>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text"
            placeholder="Search by product name or SKU..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <select 
            className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-600 outline-none focus:ring-2 focus:ring-indigo-500/20"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Statuses</option>
            <option value="low">Low Stock</option>
            <option value="healthy">Healthy Stock</option>
            <option value="overstocked">Overstocked</option>
          </select>
          <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50">
            <ArrowUpDown size={18} />
            Sort
          </button>
        </div>
      </div>

      {/* Stock Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-4" />
            <p className="text-slate-500 text-sm">Fetching inventory data...</p>
          </div>
        ) : error ? (
          <div className="py-20 flex flex-col items-center justify-center">
            <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
            <h3 className="text-lg font-bold text-slate-900">Failed to load stock</h3>
            <p className="text-slate-500 text-sm">{error}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Product</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">SKU</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Stock Level</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Thresholds</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStock.map((item) => {
                  const isLow = item.current_stock < item.min_stock;
                  const isOver = item.current_stock > item.max_stock;
                  
                  return (
                    <tr key={item.product_id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-4">
                        <p className="text-sm font-semibold text-slate-900">{item.product_name}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{item.product_id}</p>
                      </td>
                      <td className="px-6 py-4">
                        <code className="text-xs font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">{item.sku}</code>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-bold ${isLow ? 'text-red-500' : isOver ? 'text-indigo-500' : 'text-slate-900'}`}>
                            {item.current_stock.toLocaleString()}
                          </span>
                          <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${isLow ? 'bg-red-500' : isOver ? 'bg-indigo-500' : 'bg-emerald-500'}`}
                              style={{ width: `${Math.min(100, (item.current_stock / item.max_stock) * 100)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-4 text-xs">
                          <div>
                            <span className="text-slate-400 block mb-0.5">Min</span>
                            <span className="font-bold text-slate-700">{item.min_stock}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block mb-0.5">Max</span>
                            <span className="font-bold text-slate-700">{item.max_stock}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {isLow ? (
                          <span className="px-2 py-1 text-[10px] font-bold uppercase bg-red-50 text-red-600 rounded-full border border-red-100">Low Stock</span>
                        ) : isOver ? (
                          <span className="px-2 py-1 text-[10px] font-bold uppercase bg-indigo-50 text-indigo-600 rounded-full border border-indigo-100">Overstocked</span>
                        ) : (
                          <span className="px-2 py-1 text-[10px] font-bold uppercase bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100">Healthy</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {user?.role === 'staff' && (
                            <>
                              <button 
                                onClick={() => { setSelectedProduct(item); setTxType('IN'); setIsTxModalOpen(true); }}
                                className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="Stock IN"
                              >
                                <Plus size={18} />
                              </button>
                              <button 
                                onClick={() => { setSelectedProduct(item); setTxType('OUT'); setIsTxModalOpen(true); }}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Stock OUT"
                              >
                                <Minus size={18} />
                              </button>
                            </>
                          )}
                          <button 
                            onClick={() => fetchHistory(item)}
                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded-lg transition-colors" title="History"
                          >
                            <History size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Transaction Modal */}
      {isTxModalOpen && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">Stock {txType === 'IN' ? 'Addition' : 'Withdrawal'}</h2>
              <button onClick={() => setIsTxModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50">
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              <div className="mb-6 p-4 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Product</p>
                <p className="text-sm font-bold text-slate-900">{selectedProduct.product_name}</p>
                <p className="text-xs text-slate-500 mt-1">Current Stock: <span className="font-bold text-slate-900">{selectedProduct.current_stock}</span> units</p>
              </div>

              <form onSubmit={handleTransaction} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Quantity to {txType === 'IN' ? 'Add' : 'Remove'}</label>
                  <div className="relative">
                    {txType === 'IN' ? (
                      <ArrowDownLeft className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-500" size={18} />
                    ) : (
                      <ArrowUpRight className="absolute left-3 top-1/2 -translate-y-1/2 text-red-500" size={18} />
                    )}
                    <input 
                      required
                      type="number"
                      min="1"
                      placeholder="Enter quantity"
                      className="w-full pl-11 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none"
                      value={txQuantity}
                      onChange={(e) => setTxQuantity(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Source / Reason</label>
                  <select 
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none appearance-none"
                    value={txSource}
                    onChange={(e) => setTxSource(e.target.value)}
                  >
                    <option value="Manual Adjustment">Manual Adjustment</option>
                    <option value="Supplier Delivery">Supplier Delivery</option>
                    <option value="Customer Return">Customer Return</option>
                    <option value="Inventory Audit">Inventory Audit</option>
                    <option value="Sales Shipment">Sales Shipment</option>
                    <option value="Damaged Goods">Damaged Goods</option>
                  </select>
                </div>

                <div className="pt-4 flex gap-3">
                  <button 
                    type="button"
                    onClick={() => setIsTxModalOpen(false)}
                    className="flex-1 px-4 py-2.5 text-sm font-semibold text-slate-600 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={submitting}
                    className={`flex-1 px-4 py-2.5 text-sm font-semibold text-white rounded-xl shadow-lg transition-colors disabled:opacity-70 flex items-center justify-center gap-2 ${
                      txType === 'IN' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-100' : 'bg-red-500 hover:bg-red-600 shadow-red-100'
                    }`}
                  >
                    {submitting ? <Loader2 size={18} className="animate-spin" /> : `Confirm ${txType}`}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* History Modal */}
      {isHistoryModalOpen && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <History className="text-indigo-600" size={24} />
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Transaction History</h2>
                  <p className="text-xs text-slate-500">{selectedProduct.product_name}</p>
                </div>
              </div>
              <button onClick={() => setIsHistoryModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50">
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              {loadingHistory ? (
                <div className="py-20 flex flex-col items-center justify-center">
                  <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-4" />
                  <p className="text-slate-500 text-sm">Loading history...</p>
                </div>
              ) : txHistory.length === 0 ? (
                <div className="py-20 flex flex-col items-center justify-center text-center">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                    <History size={32} className="text-slate-300" />
                  </div>
                  <p className="text-slate-500">No transactions recorded for this product yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {txHistory.map((tx) => (
                    <div key={tx.transaction_id} className="flex items-start gap-4 p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                      <div className={`mt-1 p-2 rounded-lg ${tx.type === 'IN' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                        {tx.type === 'IN' ? <Plus size={16} /> : <Minus size={16} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm font-bold text-slate-900">
                            {tx.type === 'IN' ? 'Restocked' : 'Withdrawal'} {tx.quantity.toLocaleString()} units
                          </p>
                          <span className="text-[10px] font-bold text-slate-400 uppercase">{new Date(tx.timestamp).toLocaleDateString()}</span>
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1">
                          <div className="flex items-center gap-1.5 text-xs text-slate-500">
                            <Truck size={14} />
                            <span>{tx.source}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-slate-500">
                            <User size={14} />
                            <span>User ID: {tx.user_id}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-slate-500">
                            <Calendar size={14} />
                            <span>{new Date(tx.timestamp).toLocaleTimeString()}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="p-4 bg-slate-50 border-t border-slate-100 text-center">
              <button 
                onClick={() => setIsHistoryModalOpen(false)}
                className="px-6 py-2 text-sm font-bold text-slate-600 hover:text-slate-900 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
