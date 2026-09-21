import React, { useState, useEffect } from 'react';
import {
  Building2,
  ShieldCheck,
  CreditCard,
  Sliders,
  CheckCircle2,
  Save,
  Eye,
  Mail,
  Upload,
  Trash2,
  FileText,
  AlertCircle,
  Building,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { useDensity } from '../context/DensityContext';
import { useCustomers } from '../hooks/useCustomers';
import { customerApi } from '../api/customerApi';
import { useCompanySettings } from '../hooks/useCompanySettings';
import { TemplateGallerySection } from '../components/settings/TemplateGallerySection';
import {
  CompanyProfile,
  CompanyTaxSettings,
  CompanyBankSettings,
  CompanyQuotationDefaults,
  GstType,
} from '../types/company';

export const SettingsPage: React.FC = () => {
  const { isComfortable } = useDensity();
  const { customers, refetch: refetchCustomers } = useCustomers();
  const {
    settings,
    isLoading,
    templates,
    updateProfile,
    isUpdatingProfile,
    updateTax,
    isUpdatingTax,
    updateBank,
    isUpdatingBank,
    updateDefaults,
    isUpdatingDefaults,
    updateTemplate,
    isUpdatingTemplate,
    uploadLogo,
    isUploadingLogo,
    deleteLogo,
    isDeletingLogo,
  } = useCompanySettings();

  const [activeTab, setActiveTab] = useState<
    'profile' | 'tax' | 'bank' | 'defaults' | 'templates' | 'communication'
  >('profile');

  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Local Form States
  const [profileForm, setProfileForm] = useState<CompanyProfile>({
    name: '',
    legal_name: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    country: 'India',
    phone: '',
    email: '',
    website: '',
    gstin: '',
    pan: '',
    authorized_signatory: '',
    logo_url: null,
  });

  const [taxForm, setTaxForm] = useState<CompanyTaxSettings>({
    gstin: '',
    gst_type: 'CGST_SGST',
    default_gst_rate: '18.00',
    pan: '',
  });

  const [bankForm, setBankForm] = useState<CompanyBankSettings>({
    bank_name: '',
    account_name: '',
    account_number: '',
    ifsc: '',
    branch: '',
    upi_id: '',
  });

  const [defaultsForm, setDefaultsForm] = useState<CompanyQuotationDefaults>({
    quotation_validity_days: 30,
    payment_terms: '',
    delivery_terms: '',
    inspection_terms: '',
    general_terms: '',
    prepared_by: '',
    authorized_signatory: '',
  });

  // Customer communication states
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [quotationEmailInput, setQuotationEmailInput] = useState<string>('');

  // Sync state from authoritative settings query
  useEffect(() => {
    if (settings) {
      setProfileForm({
        name: settings.profile.name || '',
        legal_name: settings.profile.legal_name || '',
        address: settings.profile.address || '',
        city: settings.profile.city || '',
        state: settings.profile.state || '',
        pincode: settings.profile.pincode || '',
        country: settings.profile.country || 'India',
        phone: settings.profile.phone || '',
        email: settings.profile.email || '',
        website: settings.profile.website || '',
        gstin: settings.profile.gstin || '',
        pan: settings.profile.pan || '',
        authorized_signatory: settings.profile.authorized_signatory || '',
        logo_url: settings.profile.logo_url || null,
      });

      setTaxForm({
        gstin: settings.tax.gstin || '',
        gst_type: settings.tax.gst_type || 'CGST_SGST',
        default_gst_rate: settings.tax.default_gst_rate || '18.00',
        pan: settings.tax.pan || '',
      });

      setBankForm({
        bank_name: settings.bank.bank_name || '',
        account_name: settings.bank.account_name || '',
        account_number: settings.bank.account_number || '',
        ifsc: settings.bank.ifsc || '',
        branch: settings.bank.branch || '',
        upi_id: settings.bank.upi_id || '',
      });

      setDefaultsForm({
        quotation_validity_days: settings.defaults.quotation_validity_days || 30,
        payment_terms: settings.defaults.payment_terms || '',
        delivery_terms: settings.defaults.delivery_terms || '',
        inspection_terms: settings.defaults.inspection_terms || '',
        general_terms: settings.defaults.general_terms || '',
        prepared_by: settings.defaults.prepared_by || '',
        authorized_signatory: settings.defaults.authorized_signatory || '',
      });
    }
  }, [settings]);

  useEffect(() => {
    if (customers && customers.length > 0 && !selectedCustomerId) {
      setSelectedCustomerId(customers[0].id);
      setQuotationEmailInput(customers[0].quotationEmail || '');
    }
  }, [customers, selectedCustomerId]);

  const selectedCustomer =
    customers.find((c) => c.id === selectedCustomerId) || customers[0];

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const handleSaveProfile = async () => {
    try {
      await updateProfile(profileForm);
      showToast('Authoritative company profile updated successfully.');
    } catch (err: any) {
      showToast(err.response?.data?.detail || 'Failed to update company profile.');
    }
  };

  const handleSaveTax = async () => {
    try {
      await updateTax(taxForm);
      showToast('GST and tax configuration saved.');
    } catch (err: any) {
      showToast(err.response?.data?.detail || 'Failed to update tax configuration.');
    }
  };

  const handleSaveBank = async () => {
    try {
      await updateBank(bankForm);
      showToast('Company bank details saved successfully.');
    } catch (err: any) {
      showToast(err.response?.data?.detail || 'Failed to update bank details.');
    }
  };

  const handleSaveDefaults = async () => {
    try {
      await updateDefaults(defaultsForm);
      showToast('Quotation default terms and validity rules saved.');
    } catch (err: any) {
      showToast(err.response?.data?.detail || 'Failed to update quotation defaults.');
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/png', 'image/jpeg', 'image/jpg', 'image/webp'].includes(file.type)) {
      showToast('Invalid image format. Supported formats: PNG, JPEG, WEBP.');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      showToast('Logo file size exceeds 2 MB limit.');
      return;
    }

    try {
      const res = await uploadLogo(file);
      showToast(res.message || 'Company logo uploaded successfully.');
    } catch (err: any) {
      showToast(err.response?.data?.detail || 'Failed to upload company logo.');
    }
  };

  const handleDeleteLogo = async () => {
    try {
      await deleteLogo();
      showToast('Company logo removed.');
    } catch (err: any) {
      showToast(err.response?.data?.detail || 'Failed to remove company logo.');
    }
  };

  const handleSaveQuotationEmail = async () => {
    if (!selectedCustomer) return;
    const trimmed = quotationEmailInput.trim();
    if (trimmed) {
      const emailRegex = /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/;
      if (!emailRegex.test(trimmed)) {
        showToast('Please enter a valid email address.');
        return;
      }
    }

    try {
      await customerApi.updateCommunicationSettings(selectedCustomer.id, {
        quotation_email: trimmed || null,
      });
      await refetchCustomers();
      showToast(
        trimmed
          ? 'Quotation email preference saved.'
          : 'Quotation email cleared. System will use Account Login Email.'
      );
    } catch (err: any) {
      showToast(err.response?.data?.detail || 'Failed to update communication settings.');
    }
  };

  const handleClearQuotationEmail = async () => {
    if (!selectedCustomer) return;
    try {
      await customerApi.updateCommunicationSettings(selectedCustomer.id, {
        quotation_email: null,
      });
      setQuotationEmailInput('');
      await refetchCustomers();
      showToast('Quotation email cleared. System will use Account Login Email.');
    } catch (err: any) {
      showToast(err.response?.data?.detail || 'Failed to clear quotation email.');
    }
  };

  if (isLoading) {
    return (
      <div className="p-10 flex items-center justify-center text-slate-500">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
          <span>Loading authoritative company configuration...</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`mx-auto ${
        isComfortable ? 'p-6 md:p-10 max-w-6xl space-y-8' : 'p-4 md:p-6 max-w-6xl space-y-5'
      }`}
    >
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMsg && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 right-8 z-50 bg-slate-950 text-white text-sm font-medium py-3 px-5 rounded-xl shadow-2xl border border-slate-700 flex items-center gap-3"
          >
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>{toastMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Company Settings & Quotation Gallery
            </h1>
            <Badge variant="success" size="sm" dot>
              Authoritative Profile
            </Badge>
          </div>
          <p className="text-xs text-slate-500 max-w-2xl leading-relaxed">
            Manage your authoritative company profile, statutory GSTIN rules, company bank details,
            quotation defaults, and professional quotation templates.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="slate" size="md">
            Active: {settings?.template?.template_id?.replace('_', ' ') || 'Classic Professional'}
          </Badge>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-1.5 shadow-xs">
        <div className="flex items-center gap-1 overflow-x-auto">
          {[
            { id: 'profile', label: 'Company Profile', icon: Building2 },
            { id: 'tax', label: 'GST & Tax Profile', icon: ShieldCheck },
            { id: 'bank', label: 'Bank Details', icon: CreditCard },
            { id: 'defaults', label: 'Quotation Defaults', icon: FileText },
            { id: 'templates', label: 'Quotation Templates', icon: Sliders },
            { id: 'communication', label: 'Customer Communication', icon: Mail },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-2 px-3.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-slate-950 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-blue-400' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* TAB 1: Company Profile */}
      {activeTab === 'profile' && (
        <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          {/* Logo Section */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Company Logo & Branding</h3>
                <p className="text-xs text-slate-500">
                  Authoritative logo displayed on all quotation headers and generated PDFs.
                </p>
              </div>
              <Badge variant="slate" size="sm">Private Storage</Badge>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="w-32 h-20 bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl flex items-center justify-center p-2 overflow-hidden shrink-0">
                {profileForm.logo_url ? (
                  <img
                    src={profileForm.logo_url}
                    alt="Company Logo"
                    className="max-h-full max-w-full object-contain"
                  />
                ) : (
                  <div className="text-center text-slate-400">
                    <Building className="w-6 h-6 mx-auto mb-1 opacity-50" />
                    <span className="text-[10px]">No Logo</span>
                  </div>
                )}
              </div>

              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-3">
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={handleLogoUpload}
                      className="hidden"
                      disabled={isUploadingLogo}
                    />
                    <span className="inline-flex items-center gap-1.5 py-2 px-3.5 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-colors shadow-xs">
                      <Upload className="w-3.5 h-3.5" />
                      {isUploadingLogo ? 'Uploading...' : profileForm.logo_url ? 'Replace Logo' : 'Upload Logo'}
                    </span>
                  </label>

                  {profileForm.logo_url && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDeleteLogo}
                      disabled={isDeletingLogo}
                      icon={<Trash2 className="w-3.5 h-3.5 text-rose-500" />}
                    >
                      {isDeletingLogo ? 'Removing...' : 'Remove'}
                    </Button>
                  )}
                </div>
                <p className="text-[11px] text-slate-500">
                  Recommended: High-resolution PNG or WEBP with transparent background. Max size: 2 MB.
                </p>
              </div>
            </div>
          </div>

          {/* Profile Details Form */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-5">
            <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Legal Entity Credentials</h3>
                <p className="text-xs text-slate-500">Official company information printed on quotations.</p>
              </div>
              <Badge variant="success" size="sm">Authoritative Store</Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Company Trading Name *</label>
                <input
                  type="text"
                  value={profileForm.name}
                  onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 text-xs font-medium text-slate-900 focus:ring-1 focus:ring-slate-950"
                  placeholder="e.g. Bharat Precision Engineering Pvt. Ltd."
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Full Legal Name (ROC)</label>
                <input
                  type="text"
                  value={profileForm.legal_name || ''}
                  onChange={(e) => setProfileForm({ ...profileForm, legal_name: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 text-xs font-medium text-slate-900 focus:ring-1 focus:ring-slate-950"
                  placeholder="e.g. Bharat Precision Engineering Private Limited"
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-xs font-semibold text-slate-700 block mb-1">Factory / Plant Address</label>
                <textarea
                  rows={2}
                  value={profileForm.address || ''}
                  onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs text-slate-900 focus:ring-1 focus:ring-slate-950"
                  placeholder="Plot W-42, MIDC Industrial Area, Phase II, Bhosari, Pune..."
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">City</label>
                <input
                  type="text"
                  value={profileForm.city || ''}
                  onChange={(e) => setProfileForm({ ...profileForm, city: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 text-xs text-slate-900"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">State</label>
                <input
                  type="text"
                  value={profileForm.state || ''}
                  onChange={(e) => setProfileForm({ ...profileForm, state: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 text-xs text-slate-900"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">PIN Code</label>
                <input
                  type="text"
                  value={profileForm.pincode || ''}
                  onChange={(e) => setProfileForm({ ...profileForm, pincode: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 text-xs font-mono text-slate-900"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Country</label>
                <input
                  type="text"
                  value={profileForm.country || 'India'}
                  onChange={(e) => setProfileForm({ ...profileForm, country: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 text-xs text-slate-900"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Commercial Phone</label>
                <input
                  type="text"
                  value={profileForm.phone || ''}
                  onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 text-xs font-mono text-slate-900"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Official Email</label>
                <input
                  type="email"
                  value={profileForm.email || ''}
                  onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 text-xs font-mono text-slate-900"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Website URL</label>
                <input
                  type="text"
                  value={profileForm.website || ''}
                  onChange={(e) => setProfileForm({ ...profileForm, website: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 text-xs text-slate-900"
                  placeholder="https://www.bharatprecision.co.in"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">PAN Number</label>
                <input
                  type="text"
                  value={profileForm.pan || ''}
                  onChange={(e) => setProfileForm({ ...profileForm, pan: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 text-xs font-mono uppercase text-slate-900"
                  placeholder="AAACB1234F"
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-xs font-semibold text-slate-700 block mb-1">Authorized Signatory Name & Title</label>
                <input
                  type="text"
                  value={profileForm.authorized_signatory || ''}
                  onChange={(e) => setProfileForm({ ...profileForm, authorized_signatory: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 text-xs text-slate-900"
                  placeholder="Rajesh Deshmukh (Managing Director)"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <Button
                variant="primary"
                size="md"
                onClick={handleSaveProfile}
                disabled={isUpdatingProfile}
                icon={<Save className="w-4 h-4 text-emerald-400" />}
              >
                {isUpdatingProfile ? 'Saving...' : 'Save Profile Changes'}
              </Button>
            </div>
          </div>
        </motion.div>
      )}

      {/* TAB 2: GST & Tax Profile */}
      {activeTab === 'tax' && (
        <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-5">
            <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">GSTIN & Statutory Tax Configuration</h3>
                <p className="text-xs text-slate-500">
                  Authoritative GST taxation rules. Template customization never modifies tax calculation formulas.
                </p>
              </div>
              <Badge variant="success" size="sm">Rule 46 Compliant</Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Statutory GSTIN *</label>
                <input
                  type="text"
                  value={taxForm.gstin || ''}
                  onChange={(e) => setTaxForm({ ...taxForm, gstin: e.target.value.toUpperCase() })}
                  className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 text-xs font-mono font-bold text-slate-900"
                  placeholder="27AAACB1234F1Z8"
                />
                <p className="text-[10px] text-slate-400 mt-1">15-digit alphanumeric GST identifier</p>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Default GST Rate (%)</label>
                <input
                  type="text"
                  value={taxForm.default_gst_rate}
                  onChange={(e) => setTaxForm({ ...taxForm, default_gst_rate: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 text-xs font-mono text-slate-900"
                  placeholder="18.00"
                />
              </div>

              <div className="md:col-span-2 space-y-2">
                <label className="text-xs font-semibold text-slate-700 block">Default GST Mode</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    {
                      id: 'CGST_SGST' as GstType,
                      title: 'CGST + SGST (Intra-State)',
                      desc: 'Equal 9% Central & 9% State GST for intra-state supply',
                    },
                    {
                      id: 'IGST' as GstType,
                      title: 'IGST (Inter-State)',
                      desc: 'Full 18% Integrated GST for inter-state supply',
                    },
                    {
                      id: 'EXEMPT' as GstType,
                      title: 'EXEMPT / Zero-Rated',
                      desc: '0% tax for SEZ supply and direct export orders',
                    },
                  ].map((mode) => (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => setTaxForm({ ...taxForm, gst_type: mode.id })}
                      className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                        taxForm.gst_type === mode.id
                          ? 'border-blue-600 bg-blue-50/70 shadow-xs'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div className="font-bold text-xs text-slate-900 mb-1">{mode.title}</div>
                      <div className="text-[11px] text-slate-500 leading-snug">{mode.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-start gap-3 text-xs text-slate-600">
              <AlertCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <strong>Calculation Invariance Guarantee:</strong> Changing the quotation design or template
                will never modify taxable values, GST rates, or grand totals.
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <Button
                variant="primary"
                size="md"
                onClick={handleSaveTax}
                disabled={isUpdatingTax}
                icon={<Save className="w-4 h-4 text-emerald-400" />}
              >
                {isUpdatingTax ? 'Saving...' : 'Save Tax Profile'}
              </Button>
            </div>
          </div>
        </motion.div>
      )}

      {/* TAB 3: Bank Details */}
      {activeTab === 'bank' && (
        <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-5">
            <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Company Bank Details</h3>
                <p className="text-xs text-slate-500">
                  Bank accounts printed on quotations for NEFT, RTGS, and IMPS customer settlements.
                </p>
              </div>
              <Badge variant="slate" size="sm">Company Level</Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Bank Name</label>
                <input
                  type="text"
                  value={bankForm.bank_name || ''}
                  onChange={(e) => setBankForm({ ...bankForm, bank_name: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 text-xs font-medium text-slate-900"
                  placeholder="State Bank of India"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Beneficiary Account Name</label>
                <input
                  type="text"
                  value={bankForm.account_name || ''}
                  onChange={(e) => setBankForm({ ...bankForm, account_name: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 text-xs text-slate-900"
                  placeholder="Bharat Precision Engineering Pvt Ltd"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Account Number</label>
                <input
                  type="text"
                  value={bankForm.account_number || ''}
                  onChange={(e) => setBankForm({ ...bankForm, account_number: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 text-xs font-mono text-slate-900"
                  placeholder="38920194821"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">IFSC Code</label>
                <input
                  type="text"
                  value={bankForm.ifsc || ''}
                  onChange={(e) => setBankForm({ ...bankForm, ifsc: e.target.value.toUpperCase() })}
                  className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 text-xs font-mono uppercase text-slate-900"
                  placeholder="SBIN0004128"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Branch Name</label>
                <input
                  type="text"
                  value={bankForm.branch || ''}
                  onChange={(e) => setBankForm({ ...bankForm, branch: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 text-xs text-slate-900"
                  placeholder="MIDC Bhosari Branch, Pune"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">UPI ID (Optional)</label>
                <input
                  type="text"
                  value={bankForm.upi_id || ''}
                  onChange={(e) => setBankForm({ ...bankForm, upi_id: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 text-xs font-mono text-slate-900"
                  placeholder="bpe.pune@sbi"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <Button
                variant="primary"
                size="md"
                onClick={handleSaveBank}
                disabled={isUpdatingBank}
                icon={<Save className="w-4 h-4 text-emerald-400" />}
              >
                {isUpdatingBank ? 'Saving...' : 'Save Bank Details'}
              </Button>
            </div>
          </div>
        </motion.div>
      )}

      {/* TAB 4: Quotation Defaults */}
      {activeTab === 'defaults' && (
        <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-5">
            <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Quotation Default Terms</h3>
                <p className="text-xs text-slate-500">
                  Standard terms applied automatically when creating new quotations.
                </p>
              </div>
              <Badge variant="slate" size="sm">Pre-fill Defaults</Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Quotation Validity (Days)
                </label>
                <input
                  type="number"
                  value={defaultsForm.quotation_validity_days}
                  onChange={(e) =>
                    setDefaultsForm({
                      ...defaultsForm,
                      quotation_validity_days: parseInt(e.target.value, 10) || 30,
                    })
                  }
                  className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 text-xs font-mono text-slate-900"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Default Payment Terms</label>
                <input
                  type="text"
                  value={defaultsForm.payment_terms || ''}
                  onChange={(e) => setDefaultsForm({ ...defaultsForm, payment_terms: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 text-xs text-slate-900"
                  placeholder="30 Days from date of invoice"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Default Delivery Terms</label>
                <input
                  type="text"
                  value={defaultsForm.delivery_terms || ''}
                  onChange={(e) => setDefaultsForm({ ...defaultsForm, delivery_terms: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 text-xs text-slate-900"
                  placeholder="Ex-Works, Pune Plant"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Default Inspection Terms</label>
                <input
                  type="text"
                  value={defaultsForm.inspection_terms || ''}
                  onChange={(e) => setDefaultsForm({ ...defaultsForm, inspection_terms: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 text-xs text-slate-900"
                  placeholder="Pre-dispatch QA inspection with 3.1 cert"
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-xs font-semibold text-slate-700 block mb-1">General Terms & Conditions</label>
                <textarea
                  rows={3}
                  value={defaultsForm.general_terms || ''}
                  onChange={(e) => setDefaultsForm({ ...defaultsForm, general_terms: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs text-slate-900"
                  placeholder="Standard precision engineering tolerances apply..."
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Default Prepared By</label>
                <input
                  type="text"
                  value={defaultsForm.prepared_by || ''}
                  onChange={(e) => setDefaultsForm({ ...defaultsForm, prepared_by: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 text-xs text-slate-900"
                  placeholder="Costing Engineer"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Default Authorized Signatory</label>
                <input
                  type="text"
                  value={defaultsForm.authorized_signatory || ''}
                  onChange={(e) => setDefaultsForm({ ...defaultsForm, authorized_signatory: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 text-xs text-slate-900"
                  placeholder="Commercial Director"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <Button
                variant="primary"
                size="md"
                onClick={handleSaveDefaults}
                disabled={isUpdatingDefaults}
                icon={<Save className="w-4 h-4 text-emerald-400" />}
              >
                {isUpdatingDefaults ? 'Saving...' : 'Save Default Terms'}
              </Button>
            </div>
          </div>
        </motion.div>
      )}

      {/* TAB 5: Quotation Templates Gallery & Customizer */}
      {activeTab === 'templates' && settings && (
        <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}>
          <TemplateGallerySection
            templates={templates}
            currentConfig={settings.template}
            profile={settings.profile}
            bank={settings.bank}
            defaults={settings.defaults}
            onSelectTemplate={async (templateId) => {
              await updateTemplate({ template_id: templateId });
            }}
            onSaveCustomization={async (newConfig) => {
              await updateTemplate(newConfig);
            }}
            isSaving={isUpdatingTemplate}
            onToast={showToast}
          />
        </motion.div>
      )}

      {/* TAB 6: Customer Communication */}
      {activeTab === 'communication' && (
        <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-5">
            <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Customer Quotation Email Routing</h3>
                <p className="text-xs text-slate-500">
                  Configure custom quotation recipient addresses per customer account.
                </p>
              </div>
              <Badge variant="slate" size="sm">Communication Preference</Badge>
            </div>

            <div className="space-y-1.5 max-w-md">
              <label className="text-xs font-semibold text-slate-700">Select Customer Account</label>
              <select
                value={selectedCustomerId}
                onChange={(e) => {
                  const newId = e.target.value;
                  setSelectedCustomerId(newId);
                  const cust = customers.find((c) => c.id === newId);
                  setQuotationEmailInput(cust?.quotationEmail || '');
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2.5 px-3 text-xs font-medium text-slate-800"
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.loginEmail || c.email})
                  </option>
                ))}
              </select>
            </div>

            <div className="border-t border-slate-100 pt-4 space-y-4 max-w-xl">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700">Account Login Email</label>
                  <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                    Read only
                  </span>
                </div>
                <input
                  type="email"
                  readOnly
                  value={selectedCustomer?.loginEmail || selectedCustomer?.email || ''}
                  className="w-full bg-slate-100/80 border border-slate-200 rounded-lg py-2 px-3 text-xs font-mono text-slate-600 cursor-not-allowed"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Quotation Email</label>
                <input
                  type="email"
                  placeholder="e.g. procurement@customer.com"
                  value={quotationEmailInput}
                  onChange={(e) => setQuotationEmailInput(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 text-xs font-mono text-slate-900"
                />
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="text-xs font-medium text-slate-500">Active Quotation Recipient:</div>
                  <div className="text-sm font-mono font-bold text-slate-900">
                    {quotationEmailInput.trim()
                      ? quotationEmailInput.trim()
                      : selectedCustomer?.loginEmail || selectedCustomer?.email || 'No email on file'}
                  </div>
                </div>
                <Badge variant={quotationEmailInput.trim() ? 'info' : 'slate'} size="sm">
                  {quotationEmailInput.trim() ? 'Quotation Preference' : 'Using Login Email'}
                </Badge>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <Button
                  variant="primary"
                  size="md"
                  onClick={handleSaveQuotationEmail}
                  icon={<Save className="w-4 h-4 text-emerald-400" />}
                >
                  Save Email Preference
                </Button>
                {quotationEmailInput && (
                  <Button variant="outline" size="md" onClick={handleClearQuotationEmail}>
                    Clear (Use Login Email)
                  </Button>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};
