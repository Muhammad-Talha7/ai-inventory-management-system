'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Truck, 
  Search, 
  Plus, 
  Edit2, 
  Trash2, 
  AlertCircle, 
  X, 
  Loader2,
  RefreshCw,
  PhoneCall,
  UserCheck
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

export default function SuppliersPage() {
  const router = useRouter();
  const { user } = useAuth();
  const canEdit = user?.role === 'manager';

  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    supplier_id: '',
    name: '',
    contact_info: ''
  });

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiFetch('/suppliers/');
      setSuppliers(response);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch suppliers');
    } finally {
      setLoading(false);
    }
  };

  const handleAddSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const response = await apiFetch('/suppliers/', {
        method: 'POST',
        body: JSON.stringify(formData)
      });
      if (response.supplier_id) {
        setIsAddModalOpen(false);
        resetForm();
        fetchSuppliers();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to create supplier');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const response = await apiFetch(`/suppliers/${selectedSupplier.supplier_id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: formData.name,
          contact_info: formData.contact_info
        })
      });
      if (response.supplier_id) {
        setIsEditModalOpen(false);
        resetForm();
        fetchSuppliers();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update supplier');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSupplier = async () => {
    setSubmitting(true);
    try {
      const response = await apiFetch(`/suppliers/${selectedSupplier.supplier_id}`, {
        method: 'DELETE'
      });
      if (response.success) {
        setIsDeleteModalOpen(false);
        setSelectedSupplier(null);
        fetchSuppliers();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to delete supplier');
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (supplier: any) => {
    setSelectedSupplier(supplier);
    setFormData({
      supplier_id: supplier.supplier_id,
      name: supplier.name,
      contact_info: supplier.contact_info || ''
    });
    setIsEditModalOpen(true);
  };

  const openDeleteModal = (supplier: any) => {
    setSelectedSupplier(supplier);
    setIsDeleteModalOpen(true);
  };

  const resetForm = () => {
    setFormData({ supplier_id: '', name: '', contact_info: '' });
    setSelectedSupplier(null);
  };

  const filteredSuppliers = suppliers.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.supplier_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.contact_info && s.contact_info.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="max-w-[1280px] mx-auto px-4 py-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">Supplier Management</h1>
            {suppliers.length > 0 && (
              <span className="flex items-center justify-center bg-indigo-50 text-indigo-600 text-xs font-bold px-2 py-0.5 rounded-full border border-indigo-100">
                {suppliers.length} Active Partners
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500">
            Manage product suppliers, directory contact info, and active vendor relationships.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={fetchSuppliers}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
          {canEdit && (
            <button 
              onClick={() => { resetForm(); setIsAddModalOpen(true); }}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-200"
            >
              <Plus size={18} />
              Add Supplier
            </button>
          )}
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text"
            placeholder="Search by supplier ID, name, or contact details..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Main Grid/Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden mb-6">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-4" />
            <p className="text-slate-500 text-sm">Loading suppliers...</p>
          </div>
        ) : error ? (
          <div className="py-20 flex flex-col items-center justify-center px-4">
            <div className="w-12 h-12 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-4">
              <AlertCircle size={24} />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Failed to load suppliers</h3>
            <p className="text-slate-500 text-sm mt-1 text-center max-w-md">{error}</p>
          </div>
        ) : filteredSuppliers.length === 0 ? (
          <div className="py-20 text-center">
            <Truck className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">No suppliers found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Supplier ID</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Supplier Name</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Contact Info</th>
                  {canEdit && <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSuppliers.map((supplier) => (
                  <tr key={supplier.supplier_id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <code className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-1 rounded">
                        {supplier.supplier_id}
                      </code>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-indigo-600">
                          {supplier.name.charAt(0)}
                        </div>
                        <span className="text-sm font-semibold text-slate-900">{supplier.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {supplier.contact_info || <span className="text-slate-400 italic">No contact details registered</span>}
                    </td>
                    {canEdit && (
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => openEditModal(supplier)}
                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button 
                            onClick={() => openDeleteModal(supplier)}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Supplier Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">Add New Supplier</h2>
              <button onClick={() => { setIsAddModalOpen(false); resetForm(); }} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAddSupplier} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase">Supplier ID</label>
                <input 
                  required
                  placeholder="e.g. SUP002"
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none"
                  value={formData.supplier_id}
                  onChange={e => setFormData({...formData, supplier_id: e.target.value})}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase">Supplier Name</label>
                <input 
                  required
                  placeholder="e.g. Acme Logistics Corp"
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase">Contact Information</label>
                <textarea 
                  placeholder="Email, phone number, address..."
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none min-h-[80px]"
                  value={formData.contact_info}
                  onChange={e => setFormData({...formData, contact_info: e.target.value})}
                />
              </div>
              <div className="pt-4 flex gap-3">
                <button 
                  type="button"
                  onClick={() => { setIsAddModalOpen(false); resetForm(); }}
                  className="flex-1 px-4 py-2.5 text-sm font-semibold text-slate-600 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-100 disabled:opacity-70"
                >
                  {submitting ? 'Creating...' : 'Create Supplier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Supplier Modal */}
      {isEditModalOpen && selectedSupplier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">Edit Supplier</h2>
              <button onClick={() => { setIsEditModalOpen(false); resetForm(); }} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleEditSupplier} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase">Supplier ID</label>
                <input 
                  disabled
                  className="w-full px-4 py-2 bg-slate-100 border border-slate-200 rounded-lg text-sm outline-none opacity-60 cursor-not-allowed"
                  value={formData.supplier_id}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase">Supplier Name</label>
                <input 
                  required
                  placeholder="e.g. Acme Logistics Corp"
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase">Contact Information</label>
                <textarea 
                  placeholder="Email, phone number, address..."
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none min-h-[80px]"
                  value={formData.contact_info}
                  onChange={e => setFormData({...formData, contact_info: e.target.value})}
                />
              </div>
              <div className="pt-4 flex gap-3">
                <button 
                  type="button"
                  onClick={() => { setIsEditModalOpen(false); resetForm(); }}
                  className="flex-1 px-4 py-2.5 text-sm font-semibold text-slate-600 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-100 disabled:opacity-70"
                >
                  {submitting ? 'Updating...' : 'Update Supplier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && selectedSupplier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden p-8 flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-6">
              <Trash2 size={32} />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">Delete Supplier?</h2>
            <p className="text-sm text-slate-500 mb-8 leading-relaxed">
              Are you sure you want to delete supplier <span className="font-bold text-slate-900">"{selectedSupplier.name}"</span>? 
              This action cannot be undone and will fail if the supplier is linked to products.
            </p>
            <div className="flex gap-3 w-full">
              <button 
                onClick={() => setIsDeleteModalOpen(false)}
                className="flex-1 px-4 py-3 text-sm font-semibold text-slate-600 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleDeleteSupplier}
                disabled={submitting}
                className="flex-1 px-4 py-3 text-sm font-semibold text-white bg-red-500 rounded-xl hover:bg-red-600 transition-colors shadow-lg shadow-red-100 disabled:opacity-70 flex items-center justify-center"
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
