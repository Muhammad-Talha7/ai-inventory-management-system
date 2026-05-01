'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  LayoutGrid, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  X, 
  Check, 
  AlertCircle,
  Loader2,
  Package,
  ArrowRight,
  AlertTriangle
} from 'lucide-react';
import { apiFetch } from '@/lib/api';

export default function CategoriesPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal & Form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<any>(null);
  const [categoryName, setCategoryName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const response = await apiFetch('/categories/');
      if (response.success) {
        setCategories(response.data);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch categories');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (category?: any) => {
    if (category) {
      setSelectedCategory(category);
      setCategoryName(category.name);
    } else {
      setSelectedCategory(null);
      setCategoryName('');
    }
    setIsModalOpen(true);
  };

  const handleOpenDeleteModal = (category: any) => {
    setSelectedCategory(category);
    setIsDeleteModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const method = selectedCategory ? 'PUT' : 'POST';
      const url = selectedCategory ? `/categories/${selectedCategory.category_id}` : '/categories/';
      
      const response = await apiFetch(url, {
        method,
        body: JSON.stringify({ name: categoryName })
      });

      if (response.success) {
        setIsModalOpen(false);
        fetchCategories();
      }
    } catch (err: any) {
      alert(err.message || 'Action failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setSubmitting(true);
    try {
      const response = await apiFetch(`/categories/${selectedCategory.category_id}`, {
        method: 'DELETE'
      });
      if (response.success) {
        setIsDeleteModalOpen(false);
        fetchCategories();
      }
    } catch (err: any) {
      alert(err.message || 'Delete failed');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredCategories = categories.filter(cat => 
    cat.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-[1280px] mx-auto px-4 py-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Categories</h1>
          <p className="text-sm text-slate-500 mt-1">
            Organize your product catalog with custom categories.
          </p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-200"
        >
          <Plus size={18} />
          New Category
        </button>
      </div>

      {/* Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 mb-6">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text"
            placeholder="Search categories..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Category Grid */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-4" />
          <p className="text-slate-500 text-sm">Loading categories...</p>
        </div>
      ) : error ? (
        <div className="py-20 flex flex-col items-center justify-center">
          <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
          <h3 className="text-lg font-bold text-slate-900">Error loading categories</h3>
          <p className="text-slate-500 text-sm">{error}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCategories.map((cat) => (
            <div key={cat.category_id} className="bg-white p-6 rounded-2xl border border-slate-200 hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-50/50 transition-all group">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <LayoutGrid size={24} />
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => handleOpenModal(cat)}
                    className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button 
                    onClick={() => handleOpenDeleteModal(cat)}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-1">{cat.name}</h3>
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-50">
                <div className="flex items-center gap-2 text-slate-400 text-xs font-medium">
                  <Package size={14} />
                  <span>Managed Products</span>
                </div>
                <button 
                  onClick={() => router.push(`/inventory?category_id=${cat.category_id}`)}
                  className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:underline"
                >
                  View All
                  <ArrowRight size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">
                {selectedCategory ? 'Edit Category' : 'Create New Category'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6">
              <div className="space-y-1.5 mb-6">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Category Name</label>
                <input 
                  required
                  autoFocus
                  placeholder="e.g. Electronics, Furniture, etc."
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                />
              </div>
              <div className="flex gap-3">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2.5 text-sm font-semibold text-slate-600 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={submitting}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-100 disabled:opacity-70"
                >
                  {submitting ? <Loader2 size={18} className="animate-spin" /> : (selectedCategory ? 'Update Category' : 'Create Category')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && selectedCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 p-8 flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-6">
              <AlertTriangle size={32} />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">Delete Category?</h2>
            <p className="text-sm text-slate-500 mb-8 leading-relaxed">
              Are you sure you want to delete <span className="font-bold text-slate-900">"{selectedCategory.name}"</span>? 
              This will only work if there are no products assigned to it.
            </p>
            <div className="flex gap-3 w-full">
              <button 
                onClick={() => setIsDeleteModalOpen(false)}
                className="flex-1 px-4 py-3 text-sm font-semibold text-slate-600 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleDelete}
                disabled={submitting}
                className="flex-1 px-4 py-3 text-sm font-semibold text-white bg-red-500 rounded-xl hover:bg-red-600 transition-colors shadow-lg shadow-red-100 disabled:opacity-70 flex items-center justify-center gap-2"
              >
                {submitting ? <Loader2 className="animate-spin" size={18} /> : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
