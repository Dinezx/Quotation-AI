import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Search,
  Plus,
  Building2,
  Phone,
  Mail,
  MapPin,
  FileText,
  ArrowRight,
  ShieldCheck,
  CreditCard,
  RefreshCw,
  ExternalLink,
  Edit2,
  Trash2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { customerApi, CustomerDTO, CustomerCreateDTO } from '../api/customerApi';

export const CustomersPage: React.FC = () => {
  const navigate = useNavigate();

  // Query & Pagination State
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'active' | 'inactive' | 'all'>('active');
  const [page, setPage] = useState(1);
  const pageSize = 15;

  const [customers, setCustomers] = useState<CustomerDTO[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerDTO | null>(null);

  const [form, setForm] = useState<CustomerCreateDTO>({
    name: '',
    contact_person: '',
    email: '',
    quotation_email: '',
    phone: '',
    billing_address: '',
    shipping_address: '',
    gstin: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  // Fetch paginated customers
  const fetchCustomers = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await customerApi.listPaginated({
        page,
        page_size: pageSize,
        search: debouncedSearch.trim() || undefined,
        status: statusFilter,
      });
      setCustomers(data.items);
      setTotalCount(data.total);
    } catch (err: any) {
      setError(err?.response?.data?.detail || err.message || 'Failed to load customers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [page, debouncedSearch, statusFilter]);

  const handleOpenCreateModal = () => {
    setForm({
      name: '',
      contact_person: '',
      email: '',
      quotation_email: '',
      phone: '',
      billing_address: '',
      shipping_address: '',
      gstin: '',
    });
    setFormError(null);
    setIsCreateModalOpen(true);
  };

  const handleOpenEditModal = (cust: CustomerDTO) => {
    setSelectedCustomer(cust);
    setForm({
      name: cust.name,
      contact_person: cust.contact_person || '',
      email: cust.email || '',
      quotation_email: cust.quotation_email || '',
      phone: cust.phone || '',
      billing_address: cust.billing_address || '',
      shipping_address: cust.shipping_address || '',
      gstin: cust.gstin || '',
    });
    setFormError(null);
    setIsEditModalOpen(true);
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    try {
      await customerApi.create({
        name: form.name.trim(),
        contact_person: form.contact_person?.trim() || undefined,
        email: form.email?.trim() || undefined,
        quotation_email: form.quotation_email?.trim() || undefined,
        phone: form.phone?.trim() || undefined,
        billing_address: form.billing_address?.trim() || undefined,
        shipping_address: form.shipping_address?.trim() || undefined,
        gstin: form.gstin?.trim().toUpperCase() || undefined,
      });
      setIsCreateModalOpen(false);
      fetchCustomers();
    } catch (err: any) {
      setFormError(err?.response?.data?.detail || err.message || 'Failed to create customer');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;
    setSubmitting(true);
    setFormError(null);
    try {
      await customerApi.update(selectedCustomer.id, {
        name: form.name.trim(),
        contact_person: form.contact_person?.trim() || undefined,
        email: form.email?.trim() || undefined,
        quotation_email: form.quotation_email?.trim() || undefined,
        phone: form.phone?.trim() || undefined,
        billing_address: form.billing_address?.trim() || undefined,
        shipping_address: form.shipping_address?.trim() || undefined,
        gstin: form.gstin?.trim().toUpperCase() || undefined,
      });
      setIsEditModalOpen(false);
      fetchCustomers();
    } catch (err: any) {
      setFormError(err?.response?.data?.detail || err.message || 'Failed to update customer');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleDeactivate = async (cust: CustomerDTO) => {
    try {
      if (cust.is_active) {
        if (confirm(`Deactivate customer ${cust.name}? They will not be selectable for new POs or quotations.`)) {
          await customerApi.delete(cust.id);
          fetchCustomers();
        }
      } else {
        await customerApi.reactivate(cust.id);
        fetchCustomers();
      }
    } catch (err: any) {
      alert(err?.response?.data?.detail || err.message || 'Action failed');
    }
  };

  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
            Customer Directory & Commercial Accounts
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Maintain verified customer GSTINs, communication preferences, and commercial history.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="primary"
            size="sm"
            icon={<Plus className="w-3.5 h-3.5" />}
            onClick={handleOpenCreateModal}
          >
            Add Customer Account
          </Button>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by customer name, email, GSTIN..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600"
            />
          </div>

          <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
            <button
              onClick={() => { setStatusFilter('active'); setPage(1); }}
              className={`px-2.5 py-1 rounded font-medium transition-colors cursor-pointer ${
                statusFilter === 'active' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Active
            </button>
            <button
              onClick={() => { setStatusFilter('inactive'); setPage(1); }}
              className={`px-2.5 py-1 rounded font-medium transition-colors cursor-pointer ${
                statusFilter === 'inactive' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Deactivated
            </button>
            <button
              onClick={() => { setStatusFilter('all'); setPage(1); }}
              className={`px-2.5 py-1 rounded font-medium transition-colors cursor-pointer ${
                statusFilter === 'all' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              All
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500 self-end md:self-auto">
          <button
            onClick={fetchCustomers}
            className="p-1.5 rounded hover:bg-slate-100 text-slate-600 transition-colors"
            title="Refresh list"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <span>
            Total: <strong className="text-slate-900 font-mono">{totalCount}</strong> accounts
          </span>
        </div>
      </div>

      {/* Dense Business Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        {loading && customers.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
            Loading customer accounts...
          </div>
        ) : error ? (
          <div className="p-6 text-center text-xs text-rose-600">
            {error}
          </div>
        ) : customers.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500 space-y-2">
            <Users className="w-6 h-6 text-slate-300 mx-auto" />
            <div>No customer accounts match the filter criteria.</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <tr>
                  <th className="p-3">Customer Account</th>
                  <th className="p-3">Account Login Email</th>
                  <th className="p-3">Quotation Email</th>
                  <th className="p-3">GSTIN</th>
                  <th className="p-3">Contact Person & Phone</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {customers.map((cust) => {
                  const custCode = cust.code || `CUST-${cust.id.slice(0, 6).toUpperCase()}`;
                  return (
                    <tr key={cust.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Customer Name & Code */}
                      <td className="p-3">
                        <div
                          onClick={() => navigate(`/customers/${cust.id}`)}
                          className="font-bold text-slate-900 hover:text-blue-700 cursor-pointer"
                        >
                          {cust.name}
                        </div>
                        <div className="font-mono text-[10px] text-slate-400">
                          {custCode}
                        </div>
                      </td>

                      {/* Login Email */}
                      <td className="p-3 font-mono text-slate-700">
                        {cust.email || <span className="text-slate-400 italic">No email</span>}
                      </td>

                      {/* Quotation Email */}
                      <td className="p-3 font-mono">
                        {cust.quotation_email ? (
                          <div className="flex items-center gap-1 text-blue-700 font-medium">
                            <span>{cust.quotation_email}</span>
                            <span className="text-[9px] bg-blue-100 text-blue-800 px-1 rounded font-sans font-bold">PREF</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic font-sans text-[11px]">
                            Defaults to Login Email
                          </span>
                        )}
                      </td>

                      {/* GSTIN */}
                      <td className="p-3 font-mono text-slate-800 font-bold">
                        {cust.gstin || <span className="text-slate-400 italic font-normal font-sans">—</span>}
                      </td>

                      {/* Contact & Phone */}
                      <td className="p-3 text-slate-600">
                        {cust.contact_person && <div className="font-medium text-slate-900">{cust.contact_person}</div>}
                        {cust.phone && <div className="font-mono text-[11px] text-slate-500">{cust.phone}</div>}
                        {!cust.contact_person && !cust.phone && <span className="text-slate-400 italic">—</span>}
                      </td>

                      {/* Status */}
                      <td className="p-3 text-center">
                        <Badge variant={cust.is_active ? 'success' : 'slate'} size="sm">
                          {cust.is_active ? 'Active' : 'Deactivated'}
                        </Badge>
                      </td>

                      {/* Actions */}
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/customers/${cust.id}`)}
                            icon={<ExternalLink className="w-3 h-3" />}
                            title="View Customer Details & History"
                          >
                            Details
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenEditModal(cust)}
                            icon={<Edit2 className="w-3 h-3" />}
                            title="Quick Edit"
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleDeactivate(cust)}
                            className={cust.is_active ? 'text-slate-400 hover:text-rose-600' : 'text-emerald-600 hover:text-emerald-700'}
                            title={cust.is_active ? 'Deactivate' : 'Reactivate'}
                          >
                            {cust.is_active ? <Trash2 className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div>
            Showing <strong className="text-slate-800">{customers.length}</strong> of{' '}
            <strong className="text-slate-800">{totalCount}</strong> customers
          </div>
          <div className="flex items-center gap-2">
            <span>
              Page <strong className="text-slate-800">{page}</strong> of{' '}
              <strong className="text-slate-800">{totalPages}</strong>
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                icon={<ChevronLeft className="w-3 h-3" />}
              />
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                icon={<ChevronRight className="w-3 h-3" />}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Create Customer Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Add Customer Account"
        description="Onboard a new verified customer master record."
        maxWidth="2xl"
      >
        <form onSubmit={handleCreateCustomer} className="space-y-4 text-xs">
          {formError && (
            <div className="p-3 rounded bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* Account Details */}
          <div className="space-y-3">
            <h4 className="font-bold text-slate-800 border-b border-slate-100 pb-1 uppercase tracking-wider text-[11px]">
              Account Identity
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Customer Name *</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Ashok Leyland Ltd"
                  className="w-full px-3 py-1.5 border border-slate-300 rounded text-slate-900 focus:ring-1 focus:ring-blue-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Account Login Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="purchase@customer.com"
                  className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono text-slate-900 focus:ring-1 focus:ring-blue-600 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Communication Settings */}
          <div className="space-y-3 pt-2">
            <h4 className="font-bold text-slate-800 border-b border-slate-100 pb-1 uppercase tracking-wider text-[11px]">
              Quotation Communication
            </h4>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Quotation Delivery Email (Optional)</label>
              <input
                type="email"
                value={form.quotation_email}
                onChange={(e) => setForm({ ...form, quotation_email: e.target.value })}
                placeholder="quotes@customer.com"
                className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono text-slate-900 focus:ring-1 focus:ring-blue-600 focus:outline-none"
              />
              <span className="text-[10px] text-slate-400 block mt-1">
                Optional. If empty, quotations are sent to the customer's login email.
              </span>
            </div>
          </div>

          {/* Contact & Business */}
          <div className="space-y-3 pt-2">
            <h4 className="font-bold text-slate-800 border-b border-slate-100 pb-1 uppercase tracking-wider text-[11px]">
              Commercial & Contact
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">GSTIN (15 chars)</label>
                <input
                  type="text"
                  maxLength={15}
                  value={form.gstin}
                  onChange={(e) => setForm({ ...form, gstin: e.target.value.toUpperCase() })}
                  placeholder="27AAACB1234F1Z8"
                  className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono text-slate-900 focus:ring-1 focus:ring-blue-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Contact Person</label>
                <input
                  type="text"
                  value={form.contact_person}
                  onChange={(e) => setForm({ ...form, contact_person: e.target.value })}
                  placeholder="e.g. Sunil Varma"
                  className="w-full px-3 py-1.5 border border-slate-300 rounded text-slate-900 focus:ring-1 focus:ring-blue-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Phone Number</label>
                <input
                  type="text"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="+91 98224 00000"
                  className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono text-slate-900 focus:ring-1 focus:ring-blue-600 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Addresses */}
          <div className="space-y-3 pt-2">
            <h4 className="font-bold text-slate-800 border-b border-slate-100 pb-1 uppercase tracking-wider text-[11px]">
              Addresses
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Billing Address</label>
                <textarea
                  rows={2}
                  value={form.billing_address}
                  onChange={(e) => setForm({ ...form, billing_address: e.target.value })}
                  placeholder="Registered billing address..."
                  className="w-full px-3 py-1.5 border border-slate-300 rounded text-slate-900 focus:ring-1 focus:ring-blue-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Shipping Address</label>
                <textarea
                  rows={2}
                  value={form.shipping_address}
                  onChange={(e) => setForm({ ...form, shipping_address: e.target.value })}
                  placeholder="Delivery hub / factory address..."
                  className="w-full px-3 py-1.5 border border-slate-300 rounded text-slate-900 focus:ring-1 focus:ring-blue-600 focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
            <Button variant="outline" size="sm" type="button" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" disabled={submitting}>
              {submitting ? 'Creating...' : 'Create Customer'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Quick Edit Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Customer"
        description="Modify legal customer master attributes."
        maxWidth="2xl"
      >
        <form onSubmit={handleUpdateCustomer} className="space-y-4 text-xs">
          {formError && (
            <div className="p-3 rounded bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Customer Legal Name *</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded text-slate-900 focus:ring-1 focus:ring-blue-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Account Login Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono text-slate-900 focus:ring-1 focus:ring-blue-600 focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Quotation Delivery Email (Optional)</label>
              <input
                type="email"
                value={form.quotation_email}
                onChange={(e) => setForm({ ...form, quotation_email: e.target.value })}
                placeholder="quotes@customer.com"
                className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono text-slate-900 focus:ring-1 focus:ring-blue-600 focus:outline-none"
              />
              <span className="text-[10px] text-slate-400 block mt-1">
                Optional. If empty, quotations are sent to the customer's login email.
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">GSTIN</label>
              <input
                type="text"
                maxLength={15}
                value={form.gstin}
                onChange={(e) => setForm({ ...form, gstin: e.target.value.toUpperCase() })}
                className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono text-slate-900 focus:ring-1 focus:ring-blue-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Contact Person</label>
              <input
                type="text"
                value={form.contact_person}
                onChange={(e) => setForm({ ...form, contact_person: e.target.value })}
                className="w-full px-3 py-1.5 border border-slate-300 rounded text-slate-900 focus:ring-1 focus:ring-blue-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Phone Number</label>
              <input
                type="text"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono text-slate-900 focus:ring-1 focus:ring-blue-600 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
            <Button variant="outline" size="sm" type="button" onClick={() => setIsEditModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" disabled={submitting}>
              {submitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default CustomersPage;
