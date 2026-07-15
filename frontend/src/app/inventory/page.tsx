'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  Search, 
  Filter, 
  Plus, 
  ArrowUpDown,
  Download,
  Edit2,
  Trash2,
  Eye,
  AlertCircle,
  X,
  Package,
  TrendingUp,
  DollarSign,
  Truck,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Check,
  AlertTriangle,
  Loader2,
  SlidersHorizontal
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

function InventoryPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const canEdit = user?.role === 'manager';
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Pagination & Sorting states
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [itemsPerPage] = useState(20);
  const [sortBy, setSortBy] = useState('product_name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [selectedCategory, setSelectedCategory] = useState<number | null>(
    searchParams.get('category_id') ? parseInt(searchParams.get('category_id')!) : null
  );

  // Dropdown states
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);

  const [adjustForm, setAdjustForm] = useState({
    quantity: '',
    adjustment_type: 'physical_count',
    notes: ''
  });

  // Form state
  const [formData, setFormData] = useState({
    product_id: '',
    product_name: '',
    sku: '',
    category_id: '',
    unit_price: '',
    cost_price: '',
    supplier_id: ''
  });

  useEffect(() => {
    fetchData();
  }, [currentPage, sortBy, sortOrder, selectedCategory]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (currentPage !== 1) setCurrentPage(1);
      else fetchData();
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const skip = (currentPage - 1) * itemsPerPage;
      let url = `/products/?skip=${skip}&limit=${itemsPerPage}&sort_by=${sortBy}&sort_order=${sortOrder}`;
      
      if (searchTerm) url += `&search=${encodeURIComponent(searchTerm)}`;
      if (selectedCategory) url += `&category_id=${selectedCategory}`;

      const [prodRes, catRes, suppRes] = await Promise.all([
        apiFetch(url),
        apiFetch('/categories/'),
        apiFetch('/suppliers/')
      ]);
      
      if (prodRes.success) {
        setProducts(prodRes.data);
        setTotalCount(prodRes.total_count || 0);
      }
      if (catRes.success) setCategories(catRes.data);
      if (Array.isArray(suppRes)) setSuppliers(suppRes);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async (productId: string) => {
    try {
      const response = await apiFetch(`/products/${productId}`);
      if (response.success) {
        setSelectedProduct(response.data);
        setIsDetailsModalOpen(true);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to fetch product details');
    }
  };

  const openEditModal = (product: any) => {
    setSelectedProduct(product);
    setFormData({
      product_id: product.product_id,
      product_name: product.product_name,
      sku: product.sku,
      category_id: product.category_id?.toString() || '',
      unit_price: product.unit_price.toString(),
      cost_price: product.cost_price.toString(),
      supplier_id: product.supplier_id || ''
    });
    setIsEditModalOpen(true);
  };

  const openDeleteModal = (product: any) => {
    setSelectedProduct(product);
    setIsDeleteModalOpen(true);
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const response = await apiFetch('/products/', {
        method: 'POST',
        body: JSON.stringify({
          ...formData,
          category_id: formData.category_id ? parseInt(formData.category_id) : null,
          supplier_id: formData.supplier_id || null,
          unit_price: parseFloat(formData.unit_price),
          cost_price: parseFloat(formData.cost_price),
        })
      });
      if (response.success) {
        setIsAddModalOpen(false);
        resetForm();
        fetchData();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to create product');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const response = await apiFetch(`/products/${selectedProduct.product_id}`, {
        method: 'PUT',
        body: JSON.stringify({
          product_name: formData.product_name,
          sku: formData.sku,
          category_id: formData.category_id ? parseInt(formData.category_id) : null,
          unit_price: parseFloat(formData.unit_price),
          cost_price: parseFloat(formData.cost_price),
          supplier_id: formData.supplier_id || null
        })
      });
      if (response.success) {
        setIsEditModalOpen(false);
        resetForm();
        fetchData();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update product');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteProduct = async () => {
    setSubmitting(true);
    try {
      const response = await apiFetch(`/products/${selectedProduct.product_id}`, {
        method: 'DELETE'
      });
      if (response.success) {
        setIsDeleteModalOpen(false);
        fetchData();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to delete product');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({ product_id: '', product_name: '', sku: '', category_id: '', unit_price: '', cost_price: '', supplier_id: '' });
    setSelectedProduct(null);
  };

  const openAdjustModal = (product: any) => {
    setSelectedProduct(product);
    setAdjustForm({ quantity: '', adjustment_type: 'physical_count', notes: '' });
    setIsAdjustModalOpen(true);
  };

  const handleAdjustStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustForm.quantity || parseInt(adjustForm.quantity) === 0) {
      alert('Quantity cannot be zero.');
      return;
    }
    setSubmitting(true);
    try {
      const response = await apiFetch('/stock/adjust', {
        method: 'POST',
        body: JSON.stringify({
          product_id: selectedProduct.product_id,
          quantity: parseInt(adjustForm.quantity),
          adjustment_type: adjustForm.adjustment_type,
          notes: adjustForm.notes || undefined,
        }),
      });
      if (response.success) {
        setIsAdjustModalOpen(false);
        fetchData();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to adjust stock');
    } finally {
      setSubmitting(false);
    }
  };

  const totalPages = Math.ceil(totalCount / itemsPerPage);

  const sortOptions = [
    { label: 'Name (A-Z)', value: 'product_name', order: 'asc' },
    { label: 'Name (Z-A)', value: 'product_name', order: 'desc' },
    { label: 'Price (Low-High)', value: 'unit_price', order: 'asc' },
    { label: 'Price (High-Low)', value: 'unit_price', order: 'desc' },
    { label: 'SKU', value: 'sku', order: 'asc' },
  ];

  return (
    <div className="max-w-[1280px] mx-auto px-4 py-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">Inventory Management</h1>
            {totalCount > 0 && (
              <span className="flex items-center justify-center bg-indigo-50 text-indigo-600 text-xs font-bold px-2 py-0.5 rounded-full border border-indigo-100">
                {totalCount} Total Products
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500">
            Manage your product catalog and track real-time stock levels.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
            <Download size={18} />
            Export
          </button>
          {canEdit && (
            <button 
              onClick={() => { resetForm(); setIsAddModalOpen(true); }}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-200"
            >
              <Plus size={18} />
              Add Product
            </button>
          )}
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 mb-6 flex flex-col md:flex-row gap-4 items-center justify-between relative">
        <div className="flex flex-col md:flex-row md:items-center gap-4 flex-1">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text"
              placeholder="Search by name or SKU..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          {searchTerm && (
            <p className="text-xs text-slate-500">
              Found <span className="font-bold text-slate-900">{totalCount}</span> matching products
            </p>
          )}
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto relative">
          {/* Filter Dropdown */}
          <div className="relative">
            <button 
              onClick={() => { setIsFilterOpen(!isFilterOpen); setIsSortOpen(false); }}
              className={`flex flex-1 md:flex-none items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border transition-all ${
                selectedCategory ? 'bg-indigo-50 text-indigo-600 border-indigo-200' : 'text-slate-600 bg-white border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Filter size={18} />
              {selectedCategory ? categories.find(c => c.category_id === selectedCategory)?.name : 'Filter'}
              <ChevronDown size={14} className={`transition-transform ${isFilterOpen ? 'rotate-180' : ''}`} />
            </button>
            
            {isFilterOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-xl z-20 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="p-2 border-b border-slate-100 bg-slate-50">
                  <p className="text-[10px] font-bold text-slate-400 uppercase px-2 py-1">Filter by Category</p>
                </div>
                <div className="max-h-64 overflow-y-auto p-1">
                  <button 
                    onClick={() => { setSelectedCategory(null); setIsFilterOpen(false); }}
                    className="w-full flex items-center justify-between px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
                  >
                    All Categories
                    {!selectedCategory && <Check size={16} className="text-indigo-600" />}
                  </button>
                  {categories.map(cat => (
                    <button 
                      key={cat.category_id}
                      onClick={() => { setSelectedCategory(cat.category_id); setIsFilterOpen(false); }}
                      className="w-full flex items-center justify-between px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
                    >
                      {cat.name}
                      {selectedCategory === cat.category_id && <Check size={16} className="text-indigo-600" />}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sort Dropdown */}
          <div className="relative">
            <button 
              onClick={() => { setIsSortOpen(!isSortOpen); setIsFilterOpen(false); }}
              className="flex flex-1 md:flex-none items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-all"
            >
              <ArrowUpDown size={18} />
              Sort
              <ChevronDown size={14} className={`transition-transform ${isSortOpen ? 'rotate-180' : ''}`} />
            </button>

            {isSortOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-xl z-20 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="p-2 border-b border-slate-100 bg-slate-50">
                  <p className="text-[10px] font-bold text-slate-400 uppercase px-2 py-1">Sort by</p>
                </div>
                <div className="p-1">
                  {sortOptions.map(option => (
                    <button 
                      key={`${option.value}-${option.order}`}
                      onClick={() => { setSortBy(option.value); setSortOrder(option.order); setIsSortOpen(false); }}
                      className="w-full flex items-center justify-between px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
                    >
                      {option.label}
                      {sortBy === option.value && sortOrder === option.order && <Check size={16} className="text-indigo-600" />}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden mb-6">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center">
            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-slate-500 text-sm">Loading products...</p>
          </div>
        ) : error ? (
          <div className="py-20 flex flex-col items-center justify-center px-4">
            <div className="w-12 h-12 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-4">
              <AlertCircle size={24} />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Failed to load products</h3>
            <p className="text-slate-500 text-sm mt-1 text-center max-w-md">{error}</p>
            <button 
              onClick={fetchData}
              className="mt-6 px-4 py-2 text-sm font-semibold text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Product Details</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">SKU</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Category</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Price</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Stock Level</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.map((product) => (
                  <tr key={product.product_id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 font-bold shrink-0">
                          {product.product_name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900 truncate max-w-[200px]">
                            {product.product_name}
                          </p>
                          <p className="text-xs text-slate-400 mt-0.5">ID: {product.product_id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <code className="text-xs font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                        {product.sku}
                      </code>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-slate-600">
                        {categories.find(c => c.category_id === product.category_id)?.name || 'Uncategorized'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-900">${product.unit_price}</span>
                        <span className="text-xs text-slate-400 mt-0.5">Cost: ${product.cost_price}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-bold ${
                          product.inventory_quantity < 50 ? 'text-orange-500' : 'text-slate-900'
                        }`}>
                          {product.inventory_quantity}
                        </span>
                        <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${
                              product.inventory_quantity < 50 ? 'bg-orange-500' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${Math.min(100, (product.inventory_quantity / 500) * 100)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => handleViewDetails(product.product_id)}
                          className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        >
                          <Eye size={18} />
                        </button>
                        {canEdit && (
                          <>
                            <button 
                              onClick={() => openAdjustModal(product)}
                              className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                              title="Adjust Stock"
                            >
                              <SlidersHorizontal size={18} />
                            </button>
                            <button 
                              onClick={() => openEditModal(product)}
                              className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            >
                              <Edit2 size={18} />
                            </button>
                            <button 
                              onClick={() => openDeleteModal(product)}
                              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 size={18} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {products.length === 0 && !loading && (
              <div className="py-20 text-center">
                <p className="text-slate-500">No products found matching your search or filters.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-2">
          <p className="text-sm text-slate-500">
            Showing <span className="font-bold text-slate-900">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="font-bold text-slate-900">{Math.min(currentPage * itemsPerPage, totalCount)}</span> of <span className="font-bold text-slate-900">{totalCount}</span> products
          </p>
          <div className="flex items-center gap-1">
            <button 
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => prev - 1)}
              className="p-2 text-slate-500 hover:bg-white border border-transparent hover:border-slate-200 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={20} />
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum = i + 1;
              if (totalPages > 5 && currentPage > 3) {
                pageNum = currentPage - 3 + i + 1;
                if (pageNum > totalPages) pageNum = totalPages - (4 - i);
              }
              return (
                <button 
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`w-9 h-9 flex items-center justify-center text-sm font-bold rounded-lg transition-all ${
                    currentPage === pageNum 
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' 
                      : 'text-slate-500 hover:bg-white border border-transparent hover:border-slate-200'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
            <button 
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(prev => prev + 1)}
              className="p-2 text-slate-500 hover:bg-white border border-transparent hover:border-slate-200 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      )}

      {/* Add/Edit Product Modal */}
      {(isAddModalOpen || isEditModalOpen) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">{isEditModalOpen ? 'Edit Product' : 'Add New Product'}</h2>
              <button onClick={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); resetForm(); }} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={isEditModalOpen ? handleEditProduct : handleAddProduct} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase">Product ID</label>
                  <input 
                    required
                    disabled={isEditModalOpen}
                    placeholder="P0001"
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none disabled:opacity-50"
                    value={formData.product_id}
                    onChange={e => setFormData({...formData, product_id: e.target.value})}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase">SKU</label>
                  <input 
                    required
                    placeholder="SKU-001"
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none"
                    value={formData.sku}
                    onChange={e => setFormData({...formData, sku: e.target.value})}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase">Product Name</label>
                <input 
                  required
                  placeholder="e.g. Wireless Mouse"
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none"
                  value={formData.product_name}
                  onChange={e => setFormData({...formData, product_name: e.target.value})}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase">Category</label>
                <select 
                  required
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none appearance-none"
                  value={formData.category_id}
                  onChange={e => setFormData({...formData, category_id: e.target.value})}
                >
                  <option value="">Select Category</option>
                  {categories.map(cat => (
                    <option key={cat.category_id} value={cat.category_id}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase">Supplier</label>
                <select 
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none appearance-none"
                  value={formData.supplier_id}
                  onChange={e => setFormData({...formData, supplier_id: e.target.value})}
                >
                  <option value="">Select Supplier</option>
                  {suppliers.map(sup => (
                    <option key={sup.supplier_id} value={sup.supplier_id}>{sup.name} ({sup.supplier_id})</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase">Unit Price ($)</label>
                  <input 
                    required
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none"
                    value={formData.unit_price}
                    onChange={e => setFormData({...formData, unit_price: e.target.value})}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase">Cost Price ($)</label>
                  <input 
                    required
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none"
                    value={formData.cost_price}
                    onChange={e => setFormData({...formData, cost_price: e.target.value})}
                  />
                </div>
              </div>
              <div className="pt-4 flex gap-3">
                <button 
                  type="button"
                  onClick={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); resetForm(); }}
                  className="flex-1 px-4 py-2.5 text-sm font-semibold text-slate-600 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-100 disabled:opacity-70"
                >
                  {submitting ? (isEditModalOpen ? 'Updating...' : 'Creating...') : (isEditModalOpen ? 'Update Product' : 'Create Product')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 p-8 flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-6">
              <AlertTriangle size={32} />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">Delete Product?</h2>
            <p className="text-sm text-slate-500 mb-8 leading-relaxed">
              Are you sure you want to delete <span className="font-bold text-slate-900">"{selectedProduct.product_name}"</span>? 
              This action cannot be undone and will remove all associated data.
            </p>
            <div className="flex gap-3 w-full">
              <button 
                onClick={() => setIsDeleteModalOpen(false)}
                className="flex-1 px-4 py-3 text-sm font-semibold text-slate-600 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleDeleteProduct}
                disabled={submitting}
                className="flex-1 px-4 py-3 text-sm font-semibold text-white bg-red-500 rounded-xl hover:bg-red-600 transition-colors shadow-lg shadow-red-100 disabled:opacity-70 flex items-center justify-center gap-2"
              >
                {submitting ? <Loader2 className="animate-spin" size={18} /> : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Product Details Modal */}
      {isDetailsModalOpen && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="relative h-32 bg-gradient-to-r from-indigo-500 to-purple-600 p-6">
              <button onClick={() => setIsDetailsModalOpen(false)} className="absolute top-4 right-4 p-2 text-white/80 hover:text-white rounded-lg bg-white/10 backdrop-blur-md">
                <X size={20} />
              </button>
              <div className="absolute -bottom-10 left-8">
                <div className="w-20 h-20 rounded-2xl bg-white shadow-xl border-4 border-white flex items-center justify-center text-slate-400 font-bold text-2xl">
                  {selectedProduct.product_name.charAt(0)}
                </div>
              </div>
            </div>
            <div className="pt-14 p-8">
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">{selectedProduct.product_name}</h2>
                  <div className="flex gap-4 mt-2">
                    <span className="text-sm font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">ID: {selectedProduct.product_id}</span>
                    <span className="text-sm font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">SKU: {selectedProduct.sku}</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Current Stock</p>
                  <p className={`text-3xl font-bold ${selectedProduct.inventory_quantity < 50 ? 'text-orange-500' : 'text-emerald-500'}`}>
                    {selectedProduct.inventory_quantity}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-6 mb-8">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-2 text-slate-400 mb-2">
                    <DollarSign size={16} />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Unit Price</span>
                  </div>
                  <p className="text-lg font-bold text-slate-900">${selectedProduct.unit_price}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-2 text-slate-400 mb-2">
                    <TrendingUp size={16} />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Cost Price</span>
                  </div>
                  <p className="text-lg font-bold text-slate-900">${selectedProduct.cost_price}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-2 text-slate-400 mb-2">
                    <Truck size={16} />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Supplier ID</span>
                  </div>
                  <p className="text-lg font-bold text-slate-900">{selectedProduct.supplier_id ? (suppliers.find(s => s.supplier_id === selectedProduct.supplier_id)?.name || selectedProduct.supplier_id) : 'N/A'}</p>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100">
                {canEdit && (
                  <button 
                    onClick={() => { setIsDetailsModalOpen(false); openEditModal(selectedProduct); }}
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-100"
                  >
                    <Edit2 size={16} />
                    Edit Product
                  </button>
                )}
                <button 
                  onClick={() => router.push(`/forecasts?product_id=${selectedProduct.product_id}`)}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-white text-slate-600 border border-slate-200 rounded-xl font-bold text-sm hover:bg-slate-50 transition-colors"
                >
                  <TrendingUp size={16} />
                  View Forecasts
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isAdjustModalOpen && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-amber-100 rounded-xl flex items-center justify-center">
                  <SlidersHorizontal size={18} className="text-amber-600" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Adjust Stock</h2>
                  <p className="text-xs text-slate-400 mt-0.5 max-w-[220px] truncate">{selectedProduct.product_name}</p>
                </div>
              </div>
              <button onClick={() => setIsAdjustModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAdjustStock} className="p-6 space-y-4">
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 flex justify-between items-center">
                <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">Current Stock</span>
                <span className="text-2xl font-black text-amber-700">{selectedProduct.inventory_quantity}</span>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Quantity Change</label>
                <input
                  required
                  type="number"
                  placeholder="e.g. -50 for loss, +20 for gain"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 outline-none transition-all"
                  value={adjustForm.quantity}
                  onChange={e => setAdjustForm({ ...adjustForm, quantity: e.target.value })}
                />
                <p className="text-[10px] text-slate-400">Use negative (-) for losses, positive (+) for gains.</p>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Reason</label>
                <select
                  required
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-500/20 outline-none appearance-none"
                  value={adjustForm.adjustment_type}
                  onChange={e => setAdjustForm({ ...adjustForm, adjustment_type: e.target.value })}
                >
                  <option value="physical_count">Physical Count Correction</option>
                  <option value="shrinkage">Shrinkage</option>
                  <option value="theft_loss">Theft / Loss</option>
                  <option value="damage">Damage</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Notes (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="Additional details..."
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-500/20 outline-none transition-all resize-none"
                  value={adjustForm.notes}
                  onChange={e => setAdjustForm({ ...adjustForm, notes: e.target.value })}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAdjustModalOpen(false)}
                  className="flex-1 px-4 py-2.5 text-sm font-semibold text-slate-600 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-amber-500 rounded-xl hover:bg-amber-600 transition-colors shadow-lg shadow-amber-100 disabled:opacity-70 flex items-center justify-center gap-2"
                >
                  {submitting ? <Loader2 className="animate-spin" size={16} /> : <SlidersHorizontal size={16} />}
                  {submitting ? 'Adjusting...' : 'Apply Adjustment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function InventoryPage() {
  return (
    <Suspense fallback={<div className="h-[80vh] flex items-center justify-center"><Loader2 className="w-10 h-10 text-indigo-600 animate-spin" /></div>}>
      <InventoryPageContent />
    </Suspense>
  );
}
