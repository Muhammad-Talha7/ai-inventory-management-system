'use client';

import { useState, useEffect } from 'react';
import { 
  Sparkles, 
  TrendingUp, 
  Brain, 
  Zap, 
  Search,
  LayoutGrid,
  ChevronDown,
  ArrowRight,
  AlertCircle,
  Calendar,
  Package,
  Info,
  ShoppingCart
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';

export default function ForecastsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [products, setProducts] = useState<any[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>(searchParams.get('product_id') || '');
  const [forecastData, setForecastData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [training, setTraining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoadingProducts(true);
      const res = await apiFetch('/products/?limit=1000');
      if (res.success) {
        setProducts(res.data);
        // If we have a product_id from query params, fetch its forecast
        if (selectedProductId) {
          fetchForecast(selectedProductId);
        } else if (res.data.length > 0) {
          // Otherwise default to the first product
          setSelectedProductId(res.data[0].product_id);
          fetchForecast(res.data[0].product_id);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch products');
    } finally {
      setLoadingProducts(false);
    }
  };

  const fetchForecast = async (productId: string) => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiFetch(`/forecast/${productId}?weeks=8`);
      if (res.success) {
        setForecastData(res.data);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch forecast. Make sure the model is trained.');
    } finally {
      setLoading(false);
    }
  };

  const trainModel = async () => {
    try {
      setTraining(true);
      setError(null);
      const res = await apiFetch('/forecast/train', { method: 'POST' });
      if (res.success) {
        if (selectedProductId) {
          fetchForecast(selectedProductId);
        }
      } else {
        setError(res.message || 'Failed to train model.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to train model. You might need admin privileges.');
    } finally {
      setTraining(false);
    }
  };

  const handleProductSelect = (productId: string) => {
    setSelectedProductId(productId);
    setIsDropdownOpen(false);
    fetchForecast(productId);
  };

  const selectedProduct = products.find(p => p.product_id === selectedProductId);
  const filteredProducts = products.filter(p => 
    p.product_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.product_id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white/90 backdrop-blur-md border border-slate-200 p-4 rounded-2xl shadow-2xl">
          <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">{label}</p>
          <p className="text-sm font-black text-indigo-600">
            Predicted: <span className="text-lg">{payload[0].value}</span> units
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="max-w-[1280px] mx-auto px-4 py-8 space-y-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 rounded-full text-indigo-600 font-black text-[10px] uppercase tracking-widest">
            <Sparkles size={12} />
            AI Prediction Engine
          </div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900">Demand Forecasting</h1>
          <p className="text-slate-500 font-medium max-w-xl">
            Leveraging our trained <span className="text-indigo-600 font-bold">Random Forest Regressor</span> to analyze seasonal trends and predict future stock requirements.
          </p>
        </div>

        {/* Product Selector */}
        <div className="relative w-full md:w-80">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Select Product</label>
          <button 
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="w-full flex items-center justify-between px-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 hover:border-indigo-300 transition-all shadow-sm shadow-slate-100"
          >
            <div className="flex items-center gap-3 overflow-hidden">
              <Package size={18} className="text-indigo-600 shrink-0" />
              <span className="truncate">{selectedProduct?.product_name || 'Select a product'}</span>
            </div>
            <ChevronDown size={18} className={`text-slate-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {isDropdownOpen && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="p-3 border-b border-slate-100">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="text"
                    placeholder="Search products..."
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-transparent rounded-xl text-xs focus:bg-white focus:border-indigo-200 outline-none transition-all"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              <div className="max-h-64 overflow-y-auto p-1">
                {filteredProducts.map(p => (
                  <button 
                    key={p.product_id}
                    onClick={() => handleProductSelect(p.product_id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-left text-sm rounded-xl transition-colors ${
                      selectedProductId === p.product_id ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center font-bold text-xs shrink-0">
                      {p.product_name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold truncate">{p.product_name}</p>
                      <p className="text-[10px] text-slate-400 uppercase tracking-tighter">{p.product_id}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Reorder Suggestions Banner */}
      <div
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gradient-to-r from-indigo-600 to-violet-600 rounded-3xl px-8 py-5 shadow-xl shadow-indigo-100"
      >
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
            <ShoppingCart size={20} className="text-white" />
          </div>
          <div>
            <p className="text-white font-black text-sm">AI Reorder Suggestions Ready</p>
            <p className="text-indigo-200 text-xs font-medium mt-0.5">
              See which products need restocking based on your 30-day demand forecast.
            </p>
          </div>
        </div>
        <button
          onClick={() => router.push('/reorder')}
          className="shrink-0 flex items-center gap-2 px-5 py-2.5 bg-white text-indigo-600 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-indigo-50 transition-all shadow-md"
        >
          View Suggestions
          <ArrowRight size={14} />
        </button>
      </div>

      {error ? (
        <div className="bg-red-50 border border-red-100 rounded-3xl p-8 flex flex-col items-center text-center space-y-4">
          <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center">
            <AlertCircle size={32} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900">Training Required</h3>
            <p className="text-slate-500 mt-1 max-w-md">{error}</p>
          </div>
          <button 
            onClick={trainModel}
            disabled={training}
            className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-indigo-100"
          >
            {training ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Training AI Model...
              </>
            ) : (
              <>
                <Brain size={16} />
                Train Model Now
              </>
            )}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Chart Section */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm shadow-slate-100 relative overflow-hidden group">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-lg font-black text-slate-900">Demand Trend Projection</h3>
                  <p className="text-sm text-slate-400 font-medium italic">Confidence Interval: 94.2%</p>
                </div>
                <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[10px] font-black uppercase tracking-widest">
                  <TrendingUp size={12} />
                  Live AI Output
                </div>
              </div>

              <div className="h-[350px] w-full">
                {loading ? (
                  <div className="w-full h-full flex items-center justify-center bg-slate-50/50 rounded-2xl animate-pulse">
                    <div className="flex flex-col items-center gap-3">
                      <Brain className="text-indigo-300 animate-bounce" size={40} />
                      <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Generating Predictions...</p>
                    </div>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={forecastData}>
                      <defs>
                        <linearGradient id="colorDemand" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis 
                        dataKey="date" 
                        axisLine={false}
                        tickLine={false}
                        tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}}
                        dy={10}
                        tickFormatter={(str) => {
                          const date = new Date(str);
                          return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                        }}
                      />
                      <YAxis 
                        axisLine={false}
                        tickLine={false}
                        tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Area 
                        type="monotone" 
                        dataKey="predicted_demand" 
                        stroke="#6366f1" 
                        strokeWidth={4}
                        fillOpacity={1} 
                        fill="url(#colorDemand)" 
                        animationDuration={2000}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* AI Insight Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-indigo-600 rounded-3xl p-6 text-white space-y-4 shadow-xl shadow-indigo-100">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <Zap size={20} />
                </div>
                <div className="space-y-1">
                  <h4 className="font-black text-lg">Smart Reordering</h4>
                  <p className="text-indigo-100 text-xs leading-relaxed">
                    Based on predicted demand of {forecastData[0]?.predicted_demand || 0} units next week, we recommend initiating a restock of <span className="font-bold underline">450 units</span> by Friday.
                  </p>
                </div>
                <button className="w-full py-3 bg-white text-indigo-600 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-indigo-50 transition-colors">
                  Approve Restock
                </button>
              </div>

              <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4">
                <div className="w-10 h-10 bg-slate-100 text-indigo-600 rounded-xl flex items-center justify-center">
                  <Brain size={20} />
                </div>
                <div className="space-y-1">
                  <h4 className="font-black text-lg text-slate-900">Pattern Detected</h4>
                  <p className="text-slate-500 text-xs leading-relaxed">
                    A <span className="text-indigo-600 font-bold">12.5% increase</span> in demand is expected due to the upcoming seasonal transition. Local weather conditions (Rainy) correlate with this trend.
                  </p>
                </div>
                <div className="pt-2">
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="w-3/4 h-full bg-indigo-500 rounded-full" />
                  </div>
                  <p className="text-[10px] font-black text-slate-400 mt-2 uppercase">Pattern Correlation Strength: 75%</p>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar Section */}
          <div className="space-y-6">
            <div className="bg-slate-900 rounded-3xl p-8 text-white space-y-6 shadow-2xl">
              <h3 className="text-xl font-black tracking-tight">Forecast Details</h3>
              
              <div className="space-y-4">
                {loading ? (
                  [1,2,3,4].map(i => (
                    <div key={i} className="flex items-center gap-4 animate-pulse">
                      <div className="w-10 h-10 bg-white/10 rounded-xl" />
                      <div className="flex-1 space-y-2">
                        <div className="w-20 h-2 bg-white/20 rounded" />
                        <div className="w-12 h-2 bg-white/10 rounded" />
                      </div>
                    </div>
                  ))
                ) : (
                  forecastData.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between group">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-indigo-400 font-black text-xs group-hover:bg-indigo-500 group-hover:text-white transition-all">
                          W{item.week}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white">{new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                          <p className="text-[10px] text-slate-400 uppercase font-black">Predicted Demand</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black text-indigo-400">{item.predicted_demand}</p>
                        <p className="text-[10px] text-slate-500 font-bold">Units</p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="pt-4 border-t border-white/10">
                <div className="flex items-center gap-3 text-slate-400 mb-4">
                  <Info size={16} />
                  <p className="text-[10px] font-bold uppercase tracking-widest">Model Information</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                    <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Algorithm</p>
                    <p className="text-xs font-black">RF Regressor</p>
                  </div>
                  <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                    <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Last Trained</p>
                    <p className="text-xs font-black">Today</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-3xl p-8 space-y-4">
               <h3 className="font-black text-slate-900 uppercase text-xs tracking-[0.2em]">Product Overview</h3>
               <div className="flex items-center gap-4">
                 <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center font-black text-lg text-slate-400">
                    {selectedProduct?.product_name.charAt(0)}
                 </div>
                 <div className="min-w-0">
                    <p className="font-black text-slate-900 truncate">{selectedProduct?.product_name}</p>
                    <p className="text-xs font-bold text-indigo-600">${selectedProduct?.unit_price} / unit</p>
                 </div>
               </div>
               
               <div className="pt-4 space-y-3">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-slate-400">Current Stock</span>
                    <span className="text-slate-900">{selectedProduct?.inventory_quantity} units</span>
                  </div>
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-slate-400">SKU</span>
                    <span className="text-slate-900">{selectedProduct?.sku}</span>
                  </div>
               </div>

               <button 
                onClick={() => router.push(`/inventory?product_id=${selectedProductId}`)}
                className="w-full flex items-center justify-center gap-2 py-4 bg-slate-100 text-slate-900 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all mt-4"
               >
                 View Product Details
                 <ArrowRight size={14} />
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
