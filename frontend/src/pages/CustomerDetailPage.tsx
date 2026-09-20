import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Building2,
  Mail,
  Phone,
  MapPin,
  FileText,
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Edit2,
  Trash2,
  RefreshCw,
  ExternalLink,
  Save,
  Check,
} from 'lucide-react';
import { customerApi, CustomerDTO, CustomerCreateDTO } from '../api/customerApi';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { TabularNumber } from '../components/common/TabularNumber';

export const CustomerDetailPage: React.FC = () => {
  const { customerId } = useParams<{ customerId: string }>();
  const navigate = useNavigate();

  const [customer, setCustomer] = useState<CustomerDTO | null>(null);
  const [quotations, setQuotations] = useState<any[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Tabs
  const [activeTab, setActiveTab] = useState<'quotations' | 'pos'>('quotations');

  // Inline quotation email editing
  const [quotationEmailInput, setQuotationEmailInput] = useState('');
  const [savingEmail, setSavingEmail] = useState(false);
  const [emailSavedSuccess, setEmailSavedSuccess] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

  // Edit Customer Modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState<CustomerCreateDTO>({
    name: '',
    contact_person: '',
    email: '',
    quotation_email: '',
    phone: '',
    billing_address: '',
    shipping_address: '',
    gstin: '',
  });
  const [savingCustomer, setSavingCustomer] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchData = async () => {
    if (!customerId) return;
    setLoading(true);
    setError(null);
    try {
      const [custData, quotesData, posData] = await Promise.all([
        customerApi.get(customerId),
        customerApi.getQuotations(customerId).catch(() => []),
        customerApi.getPurchaseOrders(customerId).catch(() => []),
      ]);
      setCustomer(custData);
      setQuotationEmailInput(custData.quotation_email || '');
      setQuotations(quotesData);
      setPurchaseOrders(posData);
      setEditForm({
        name: custData.name,
        contact_person: custData.contact_person || '',
        email: custData.email || '',
        quotation_email: custData.quotation_email || '',
        phone: custData.phone || '',
        billing_address: custData.billing_address || '',
        shipping_address: custData.shipping_address || '',
        gstin: custData.gstin || '',
      });
    } catch (err: any) {
      setError(err?.response?.data?.detail || err.message || 'Failed to load customer details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [customerId]);

  const handleSaveQuotationEmail = async () => {
    if (!customer) return;
    setSavingEmail(true);
    setEmailError(null);
    setEmailSavedSuccess(false);
    try {
      const updated = await customerApi.updateCommunicationSettings(customer.id, {
        quotation_email: quotationEmailInput.trim() || null,
      });
      setCustomer(updated);
      setQuotationEmailInput(updated.quotation_email || '');
      setEmailSavedSuccess(true);
      setTimeout(() => setEmailSavedSuccess(false), 3000);
    } catch (err: any) {
      setEmailError(err?.response?.data?.detail || err.message || 'Failed to update quotation email');
    } finally {
      setSavingEmail(false);
    }
  };

  const handleSaveCustomerModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer) return;
    setSavingCustomer(true);
    setFormError(null);
    try {
      const payload: Partial<CustomerCreateDTO> = {
        name: editForm.name.trim(),
        contact_person: editForm.contact_person?.trim() || undefined,
        email: editForm.email?.trim() || undefined,
        quotation_email: editForm.quotation_email?.trim() || undefined,
        phone: editForm.phone?.trim() || undefined,
        billing_address: editForm.billing_address?.trim() || undefined,
        shipping_address: editForm.shipping_address?.trim() || undefined,
        gstin: editForm.gstin?.trim().toUpperCase() || undefined,
      };
      const updated = await customerApi.update(customer.id, payload);
      setCustomer(updated);
      setQuotationEmailInput(updated.quotation_email || '');
      setIsEditModalOpen(false);
    } catch (err: any) {
      setFormError(err?.response?.data?.detail || err.message || 'Failed to save customer');
    } finally {
      setSavingCustomer(false);
    }
  };

  const handleToggleActiveStatus = async () => {
    if (!customer) return;
    try {
      if (customer.is_active) {
        if (confirm(`Are you sure you want to deactivate ${customer.name}? They will not be selectable for new POs or Quotations.`)) {
          await customerApi.delete(customer.id);
          fetchData();
        }
      } else {
        await customerApi.reactivate(customer.id);
        fetchData();
      }
    } catch (err: any) {
      alert(err?.response?.data?.detail || err.message || 'Action failed');
    }
  };

  if (loading) {
    return (
      <div className="p-8 max-w-7xl mx-auto flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
          <span className="text-xs font-medium">Loading customer master record...</span>
        </div>
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="p-8 max-w-7xl mx-auto space-y-4">
        <Button variant="outline" size="sm" onClick={() => navigate('/customers')} icon={<ArrowLeft className="w-3.5 h-3.5" />}>
          Back to Customers
        </Button>
        <div className="p-6 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs">
          <div className="font-bold mb-1">Customer Not Found or Access Denied</div>
          <div>{error || 'Unable to retrieve the requested customer record.'}</div>
        </div>
      </div>
    );
  }

  const effectiveRecipient = customer.quotation_email || customer.login_email || customer.email || null;
  const isQuotationOverride = Boolean(customer.quotation_email && customer.quotation_email.trim());

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Navigation & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/customers')}
            icon={<ArrowLeft className="w-3.5 h-3.5" />}
          >
            Customers
          </Button>
          <div className="h-4 w-px bg-slate-200" />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
                {customer.name}
              </h1>
              <Badge variant={customer.is_active ? 'success' : 'slate'} size="sm">
                {customer.is_active ? 'Active Account' : 'Deactivated'}
              </Badge>
            </div>
            <div className="text-xs text-slate-500 font-mono mt-0.5">
              Ref: <strong className="text-slate-700">{customer.code || `CUST-${customer.id.slice(0, 6).toUpperCase()}`}</strong> • ID: {customer.id}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            icon={<Edit2 className="w-3.5 h-3.5" />}
            onClick={() => setIsEditModalOpen(true)}
          >
            Edit Profile
          </Button>
          <Button
            variant={customer.is_active ? 'outline' : 'primary'}
            size="sm"
            onClick={handleToggleActiveStatus}
            className={customer.is_active ? 'text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200' : ''}
          >
            {customer.is_active ? 'Deactivate Customer' : 'Reactivate Account'}
          </Button>
        </div>
      </div>

      {/* Overview Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: Identification & Commercial Details */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3.5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-blue-600" />
              Identification & Tax
            </h3>
            <span className="text-[10px] font-mono text-slate-400">Master Record</span>
          </div>

          <div className="space-y-2 text-xs">
            <div>
              <span className="text-slate-500 block text-[11px]">Customer Code:</span>
              <span className="font-mono font-bold text-slate-900">{customer.code || `CUST-${customer.id.slice(0, 6).toUpperCase()}`}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">GSTIN:</span>
              <span className="font-mono font-bold text-slate-900">{customer.gstin || <span className="text-slate-400 italic">Not Provided</span>}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">Primary Contact Person:</span>
              <span className="font-medium text-slate-800">{customer.contact_person || <span className="text-slate-400 italic">Not Specified</span>}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">Contact Phone:</span>
              <span className="font-mono text-slate-800">{customer.phone || <span className="text-slate-400 italic">Not Specified</span>}</span>
            </div>
          </div>
        </div>

        {/* Card 2: Communication & Quotation Delivery Settings */}
        <div className="bg-white border border-blue-200/70 rounded-xl p-5 shadow-xs space-y-3.5 md:col-span-2 relative overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-blue-600" />
              Communication & Delivery Preference
            </h3>
            <Badge variant="info" size="sm">2-Tier Resolution</Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            {/* Account Login Email */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-600">Account Login Email</span>
                <span className="text-[10px] text-slate-400 font-mono">Tier 2 Fallback</span>
              </div>
              <div className="font-mono font-bold text-slate-900 truncate">
                {customer.email || <span className="text-amber-600 italic">No login email on file</span>}
              </div>
              <div className="text-[10px] text-slate-400 leading-tight">
                Used for primary customer authentication and default quotation delivery.
              </div>
            </div>

            {/* Quotation Email Preference */}
            <div className="p-3 bg-blue-50/50 border border-blue-200 rounded-lg space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-blue-950">Quotation Email</span>
                <span className="text-[10px] text-blue-700 font-bold font-mono">Tier 1 Override</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="email"
                  value={quotationEmailInput}
                  onChange={(e) => setQuotationEmailInput(e.target.value)}
                  placeholder="e.g. quotes@customer.com"
                  className="w-full px-2.5 py-1 text-xs bg-white border border-slate-300 rounded font-mono text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600"
                />
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleSaveQuotationEmail}
                  disabled={savingEmail}
                  className="shrink-0"
                >
                  {savingEmail ? 'Saving...' : <Save className="w-3 h-3" />}
                </Button>
              </div>
              {emailSavedSuccess && (
                <div className="text-[11px] text-emerald-700 flex items-center gap-1 font-medium">
                  <Check className="w-3 h-3" /> Communication preference saved.
                </div>
              )}
              {emailError && (
                <div className="text-[11px] text-rose-600 flex items-center gap-1 font-medium">
                  <AlertCircle className="w-3 h-3" /> {emailError}
                </div>
              )}
            </div>
          </div>

          {/* Notice & Effective Recipient Preview */}
          <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <p className="text-[11px] text-slate-500">
              Quotation emails are sent to the <strong>Quotation Email</strong> when configured. Otherwise they are sent to the <strong>Account Login Email</strong>.
            </p>
            <div className="flex items-center gap-2 shrink-0 bg-slate-100 px-2.5 py-1 rounded font-mono text-[11px]">
              <span className="text-slate-500">Current Recipient:</span>
              <strong className={effectiveRecipient ? 'text-blue-700' : 'text-amber-600 italic'}>
                {effectiveRecipient || 'None'}
              </strong>
              {isQuotationOverride && <span className="text-[9px] bg-blue-200 text-blue-900 px-1 rounded font-sans font-bold">PREFERENCE</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Addresses Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        <div className="space-y-0.5">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
            <MapPin className="w-3 h-3 text-slate-400" /> Billing Address
          </span>
          <p className="text-slate-700 leading-snug">{customer.billing_address || <span className="text-slate-400 italic">No billing address specified</span>}</p>
        </div>
        <div className="space-y-0.5">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
            <MapPin className="w-3 h-3 text-slate-400" /> Shipping / Delivery Hub
          </span>
          <p className="text-slate-700 leading-snug">{customer.shipping_address || customer.billing_address || <span className="text-slate-400 italic">Same as billing address</span>}</p>
        </div>
      </div>

      {/* Tabs: Quotations vs Purchase Orders */}
      <div className="space-y-4">
        <div className="flex items-center gap-4 border-b border-slate-200">
          <button
            onClick={() => setActiveTab('quotations')}
            className={`pb-2.5 text-xs font-bold transition-colors relative cursor-pointer ${
              activeTab === 'quotations' ? 'text-blue-700' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Quotation History ({quotations.length})
            {activeTab === 'quotations' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-700 rounded-full" />}
          </button>
          <button
            onClick={() => setActiveTab('pos')}
            className={`pb-2.5 text-xs font-bold transition-colors relative cursor-pointer ${
              activeTab === 'pos' ? 'text-blue-700' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Purchase Orders ({purchaseOrders.length})
            {activeTab === 'pos' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-700 rounded-full" />}
          </button>
        </div>

        {/* Tab 1: Quotations History Table */}
        {activeTab === 'quotations' && (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            {quotations.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 space-y-2">
                <FileText className="w-6 h-6 text-slate-300 mx-auto" />
                <div>No quotations have been generated for this customer account yet.</div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <tr>
                      <th className="p-3">Quotation Number</th>
                      <th className="p-3">Date</th>
                      <th className="p-3">PO Number</th>
                      <th className="p-3 text-right">Final Amount</th>
                      <th className="p-3 text-center">Status</th>
                      <th className="p-3 text-center">Email Status</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {quotations.map((q) => (
                      <tr key={q.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-3 font-mono font-bold text-blue-700">
                          <Link to={`/quotation/${q.id}`} className="hover:underline">
                            {q.quotation_number}
                          </Link>
                        </td>
                        <td className="p-3 text-slate-600">
                          {new Date(q.quotation_date || q.created_at).toLocaleDateString('en-GB', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>
                        <td className="p-3 font-mono text-slate-700">
                          {q.po_number || q.purchase_order?.po_number || '—'}
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-slate-900">
                          <TabularNumber value={Number(q.final_total || 0)} />
                        </td>
                        <td className="p-3 text-center">
                          <Badge
                            variant={q.status === 'FINAL' ? 'success' : 'slate'}
                            size="sm"
                          >
                            {q.status}
                          </Badge>
                        </td>
                        <td className="p-3 text-center">
                          <Badge
                            variant={q.email_status === 'SENT' ? 'success' : q.email_status === 'FAILED' ? 'danger' : 'slate'}
                            size="sm"
                          >
                            {q.email_status || 'NOT_SENT'}
                          </Badge>
                        </td>
                        <td className="p-3 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/quotation/${q.id}`)}
                            icon={<ExternalLink className="w-3 h-3" />}
                          >
                            View
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Purchase Orders Table */}
        {activeTab === 'pos' && (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            {purchaseOrders.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 space-y-2">
                <FileText className="w-6 h-6 text-slate-300 mx-auto" />
                <div>No purchase orders found for this customer.</div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <tr>
                      <th className="p-3">PO Number</th>
                      <th className="p-3">PO Date</th>
                      <th className="p-3">Items Count</th>
                      <th className="p-3 text-center">Status</th>
                      <th className="p-3">Created</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {purchaseOrders.map((po) => (
                      <tr key={po.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-3 font-mono font-bold text-slate-900">
                          <Link to={`/review/${po.id}`} className="hover:underline text-blue-700">
                            {po.po_number}
                          </Link>
                        </td>
                        <td className="p-3 text-slate-600">
                          {po.po_date ? new Date(po.po_date).toLocaleDateString('en-GB') : '—'}
                        </td>
                        <td className="p-3 font-mono text-slate-700">
                          {po.items ? po.items.length : 0} items
                        </td>
                        <td className="p-3 text-center">
                          <Badge
                            variant={po.status === 'APPROVED' ? 'success' : po.status === 'REJECTED' ? 'danger' : 'warning'}
                            size="sm"
                          >
                            {po.status}
                          </Badge>
                        </td>
                        <td className="p-3 text-slate-500">
                          {new Date(po.created_at).toLocaleDateString('en-GB')}
                        </td>
                        <td className="p-3 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/review/${po.id}`)}
                            icon={<ExternalLink className="w-3 h-3" />}
                          >
                            Review PO
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Edit Customer Profile Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Customer Profile"
        description="Update legal identity, tax registrations, and primary addresses."
        maxWidth="2xl"
      >
        <form onSubmit={handleSaveCustomerModal} className="space-y-4 text-xs">
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
                <label className="font-semibold text-slate-700 block mb-1">Customer Legal Name *</label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded text-slate-900 focus:ring-1 focus:ring-blue-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Account Login Email</label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono text-slate-900 focus:ring-1 focus:ring-blue-600 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Contact & Business */}
          <div className="space-y-3 pt-2">
            <h4 className="font-bold text-slate-800 border-b border-slate-100 pb-1 uppercase tracking-wider text-[11px]">
              Commercial & Statutory
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">GSTIN (15 chars)</label>
                <input
                  type="text"
                  maxLength={15}
                  value={editForm.gstin}
                  onChange={(e) => setEditForm({ ...editForm, gstin: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono text-slate-900 focus:ring-1 focus:ring-blue-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Contact Person</label>
                <input
                  type="text"
                  value={editForm.contact_person}
                  onChange={(e) => setEditForm({ ...editForm, contact_person: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded text-slate-900 focus:ring-1 focus:ring-blue-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Contact Phone</label>
                <input
                  type="text"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
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
                  value={editForm.billing_address}
                  onChange={(e) => setEditForm({ ...editForm, billing_address: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded text-slate-900 focus:ring-1 focus:ring-blue-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Shipping Address</label>
                <textarea
                  rows={2}
                  value={editForm.shipping_address}
                  onChange={(e) => setEditForm({ ...editForm, shipping_address: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded text-slate-900 focus:ring-1 focus:ring-blue-600 focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
            <Button variant="outline" size="sm" type="button" onClick={() => setIsEditModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" disabled={savingCustomer}>
              {savingCustomer ? 'Saving Changes...' : 'Save Profile'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default CustomerDetailPage;
