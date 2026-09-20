import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  ShieldCheck, 
  FileText, 
  Palette, 
  CreditCard, 
  Sliders, 
  CheckCircle2, 
  Save, 
  Eye, 
  Download, 
  MessageSquare, 
  Plus,
  Edit2,
  Check,
  Building,
  Sparkles,
  Mail
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { mockPlantSettings } from '../services/mockData';
import { PlantSettings } from '../types/settings';
import { useDensity } from '../context/DensityContext';
import { useCustomers } from '../hooks/useCustomers';
import { customerApi } from '../api/customerApi';

export const SettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<PlantSettings>(mockPlantSettings);
  const [activeTab, setActiveTab] = useState<'entity' | 'gst' | 'communication' | 'numbering' | 'branding' | 'terms' | 'customizer'>('entity');
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const { isComfortable } = useDensity();
  const { customers, refetch: refetchCustomers } = useCustomers();

  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [quotationEmailInput, setQuotationEmailInput] = useState<string>('');

  useEffect(() => {
    if (customers && customers.length > 0 && !selectedCustomerId) {
      setSelectedCustomerId(customers[0].id);
      setQuotationEmailInput(customers[0].quotationEmail || '');
    }
  }, [customers, selectedCustomerId]);

  const selectedCustomer = customers.find(c => c.id === selectedCustomerId) || customers[0];

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleSave = () => {
    showToast("Plant credentials, tax configuration, and template styles saved.");
  };

  const handleSaveQuotationEmail = async () => {
    if (!selectedCustomer) return;
    const trimmed = quotationEmailInput.trim();
    if (trimmed) {
      const emailRegex = /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/;
      if (!emailRegex.test(trimmed)) {
        showToast("Please enter a valid email address.");
        return;
      }
    }

    try {
      await customerApi.updateCommunicationSettings(selectedCustomer.id, {
        quotation_email: trimmed || null,
      });
      await refetchCustomers();
      showToast(trimmed ? "Quotation email preference saved." : "Quotation email cleared. System will use Login Email.");
    } catch (err: any) {
      showToast(err.response?.data?.detail || "Failed to update communication settings.");
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
      showToast("Quotation email cleared. System will use Account Login Email.");
    } catch (err: any) {
      showToast(err.response?.data?.detail || "Failed to clear quotation email.");
    }
  };

  return (
    <div className={`mx-auto ${isComfortable ? 'p-6 md:p-10 max-w-5xl space-y-8' : 'p-4 md:p-6 max-w-6xl space-y-5'}`}>
      {/* Toast Alert */}
      <AnimatePresence>
        {toastMsg && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-18 right-8 z-50 bg-slate-950 text-white text-sm font-medium py-3 px-5 rounded-xl shadow-2xl border border-slate-700 flex items-center gap-3"
          >
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <span>{toastMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Company Settings & Tax Profile
            </h1>
            <Badge variant="success" size="sm" dot>Enterprise Active</Badge>
          </div>
          <p className="text-sm text-slate-500 leading-relaxed max-w-2xl">
            Configure your plant legal identity, multi-state GST routing hubs, quotation numbering rules, and customer-facing A4 document templates.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Button
            variant="outline"
            size="md"
            onClick={() => setActiveTab('customizer')}
            icon={<Eye className="w-4 h-4 text-slate-500" />}
          >
            Live PDF Preview
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={handleSave}
            icon={<Save className="w-4 h-4 text-emerald-400" />}
          >
            Save Changes
          </Button>
        </div>
      </div>

      {/* Modern Navigation Tabs Strip */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-1.5 shadow-xs">
        <div className="flex items-center gap-1 overflow-x-auto">
          {[
            { id: 'entity', label: 'Company & Legal Entity', icon: Building2 },
            { id: 'gst', label: 'GSTIN & Tax Hubs', icon: ShieldCheck },
            { id: 'communication', label: 'Customer Communication', icon: Mail },
            { id: 'numbering', label: 'Numbering & Series', icon: FileText },
            { id: 'branding', label: 'Letterhead & Brand', icon: Palette },
            { id: 'terms', label: 'Bank & Commercial Terms', icon: CreditCard },
            { id: 'customizer', label: 'Template Customizer', icon: Sliders },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-2.5 px-3.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
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

      {/* TAB 1: Company & Legal Entity */}
      {activeTab === 'entity' && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Card 1: Legal Identification */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 md:p-8 shadow-xs space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">Legal Entity Credentials</h3>
                <p className="text-xs text-slate-500 mt-0.5">Statutory plant identifiers printed on official engineering quotation letterheads.</p>
              </div>
              <Badge variant="success" size="md">Verified Entity</Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 block mb-2">
                  Registered Business Name (ROC)
                </label>
                <input
                  type="text"
                  value={settings.registeredName}
                  onChange={(e) => setSettings({ ...settings, registeredName: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all"
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 block mb-2">
                  Trade Name / Operational Division
                </label>
                <input
                  type="text"
                  value={settings.tradeName}
                  onChange={(e) => setSettings({ ...settings, tradeName: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 block mb-2">
                Plant / Works Dispatch Address
              </label>
              <textarea
                rows={2}
                value={settings.plantAddress}
                onChange={(e) => setSettings({ ...settings, plantAddress: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all leading-relaxed"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 block mb-1.5">
                  Company PAN
                </label>
                <input
                  type="text"
                  value={settings.panNumber}
                  onChange={(e) => setSettings({ ...settings, panNumber: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl font-mono font-bold text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 block mb-1.5">
                  CIN Number
                </label>
                <input
                  type="text"
                  value={settings.cinNumber}
                  onChange={(e) => setSettings({ ...settings, cinNumber: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl font-mono text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 block mb-1.5">
                  Udyam / MSME Reg.
                </label>
                <input
                  type="text"
                  value={settings.udyamNumber}
                  onChange={(e) => setSettings({ ...settings, udyamNumber: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl font-mono text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 block mb-1.5">
                  Official Quotation Dispatch Email
                </label>
                <input
                  type="email"
                  value={settings.dispatchEmail}
                  onChange={(e) => setSettings({ ...settings, dispatchEmail: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl font-mono text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 block mb-1.5">
                  Commercial Desk Phone
                </label>
                <input
                  type="text"
                  value={settings.commercialPhone}
                  onChange={(e) => setSettings({ ...settings, commercialPhone: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl font-mono text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                />
              </div>
            </div>
          </div>

          {/* Card 2: Quality Certifications & Office Flag */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 md:p-8 shadow-xs space-y-5">
            <div>
              <h3 className="text-base font-bold text-slate-900 mb-1">Quality Accreditations</h3>
              <p className="text-xs text-slate-500">Accreditations displayed in the customer quotation banner to establish MSME credibility.</p>
            </div>

            <div className="flex flex-wrap gap-2.5">
              <span className="px-3.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                ISO 9001:2015 Certified
              </span>
              <span className="px-3.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                IATF 16949:2016 Compliant
              </span>
            </div>

            <div className="pt-3 border-t border-slate-100">
              <label className="flex items-center gap-3 text-xs text-slate-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={settings.isCorporateOfficeSame}
                  onChange={(e) => setSettings({ ...settings, isCorporateOfficeSame: e.target.checked })}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-0 border-slate-300"
                />
                <span className="font-medium">Registered Corporate Office address is identical to manufacturing plant works address</span>
              </label>
            </div>
          </div>
        </motion.div>
      )}

      {/* TAB 2: GSTIN & Tax Compliance */}
      {activeTab === 'gst' && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 md:p-8 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">GSTIN State Hubs</h3>
                <p className="text-xs text-slate-500 mt-0.5">Automated tax routing engine for Intrastate (CGST+SGST) and Interstate (IGST) RFQs.</p>
              </div>
              <Badge variant="success" size="md" dot>Portal Synced</Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {settings.gstHubs.map(hub => (
                <div key={hub.id} className="p-5 border border-slate-200 rounded-xl bg-slate-50/60 space-y-3">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-slate-900 text-white font-mono font-bold flex items-center justify-center text-sm shadow-xs">
                        {hub.stateCode}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 font-mono text-sm">{hub.gstin}</div>
                        <div className="text-xs text-slate-500">{hub.hubName}</div>
                      </div>
                    </div>
                    {hub.isPrimary && <Badge variant="info" size="sm">PRIMARY HUB</Badge>}
                  </div>
                  <div className="pt-2.5 border-t border-slate-200/80 text-xs flex justify-between text-slate-600">
                    <span>State: <strong>{hub.stateName}</strong> (Code {hub.stateCode})</span>
                    <span className="text-emerald-700 font-semibold font-mono">Live & Valid</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Auto Rules */}
            <div className="p-5 rounded-xl bg-blue-50/50 border border-blue-100 space-y-3">
              <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">Automated Tax Calculation Rules</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-4 bg-white rounded-lg border border-slate-200 space-y-1">
                  <div className="font-bold text-slate-900">Intrastate Supply (Buyer in MH - 27)</div>
                  <div className="text-slate-600 leading-relaxed">
                    Automatically splits statutory tax into <strong>CGST (9%) + SGST (9%)</strong> on precision machining and fabrication BOQs.
                  </div>
                </div>
                <div className="p-4 bg-white rounded-lg border border-slate-200 space-y-1">
                  <div className="font-bold text-slate-900">Interstate Supply (Buyer Outside MH)</div>
                  <div className="text-slate-600 leading-relaxed">
                    Automatically aggregates tax into <strong>IGST (18%)</strong> verified against customer's GSTIN state code prefix.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* TAB 3: Numbering & Series */}
      {activeTab === 'numbering' && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6 max-w-3xl"
        >
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 md:p-8 shadow-xs space-y-6">
            <div>
              <h3 className="text-base font-bold text-slate-900">Quotation Numbering Schema</h3>
              <p className="text-xs text-slate-500 mt-0.5">Sequential token format applied to all generated commercial engineering quotations.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-semibold uppercase text-slate-600 block mb-1.5">Prefix Code</label>
                <input
                  type="text"
                  value={settings.prefixCode}
                  onChange={(e) => setSettings({ ...settings, prefixCode: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl font-mono font-bold text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-slate-600 block mb-1.5">Fiscal Year Schema</label>
                <input
                  type="text"
                  value={settings.fiscalYearSchema}
                  onChange={(e) => setSettings({ ...settings, fiscalYearSchema: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl font-mono text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-slate-600 block mb-1.5">Sequential Padding</label>
                <select
                  value={settings.sequentialPaddingDigits}
                  onChange={(e) => setSettings({ ...settings, sequentialPaddingDigits: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl bg-white text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                >
                  <option value={3}>3 Digits (001, 002...)</option>
                  <option value={4}>4 Digits (0001, 0002...)</option>
                </select>
              </div>
            </div>

            {/* Live Generated Preview Box */}
            <div className="p-5 bg-gradient-to-r from-blue-50 to-indigo-50/40 border border-blue-200/80 rounded-2xl space-y-2">
              <div className="text-xs uppercase font-bold text-blue-800 tracking-wider">Live Generated Preview</div>
              <div className="text-2xl font-bold font-mono text-slate-950">
                {settings.prefixCode}2024-25/090
              </div>
              <div className="text-xs text-blue-700">
                Next quotation estimate will be generated with this exact reference code. Revisions suffix: <strong>.v1 / .v2</strong>
              </div>
            </div>

            <div className="pt-2">
              <label className="flex items-center gap-3 text-xs text-slate-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={settings.autoResetYearly}
                  onChange={(e) => setSettings({ ...settings, autoResetYearly: e.target.checked })}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-0 border-slate-300"
                />
                <span className="font-medium">Automatically reset sequential counter to 001 at start of each Indian Financial Year (1st April)</span>
              </label>
            </div>
          </div>
        </motion.div>
      )}

      {/* TAB 4: Letterhead & Brand */}
      {activeTab === 'branding' && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6 max-w-4xl"
        >
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 md:p-8 shadow-xs space-y-6">
            <div>
              <h3 className="text-base font-bold text-slate-900">PDF Letterhead & Visual Identity</h3>
              <p className="text-xs text-slate-500 mt-0.5">Customize corporate branding printed on exported A4 customer quotations.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="p-5 border border-slate-200 rounded-xl bg-slate-50/60 space-y-3">
                <div className="font-bold text-sm text-slate-900">Official Header Logo</div>
                <div className="flex items-center gap-3">
                  <div className="px-4 py-2 bg-slate-950 text-white font-bold font-mono text-xs rounded-lg">
                    BHARAT PRECISION
                  </div>
                  <div className="text-xs text-slate-500">
                    bpe_vector_logo.svg<br />
                    <span className="text-[11px] text-slate-400">428 × 118 px (Transparent PNG/SVG)</span>
                  </div>
                </div>
              </div>

              <div className="p-5 border border-slate-200 rounded-xl bg-slate-50/60 space-y-3">
                <div className="font-bold text-sm text-slate-900">Authorized Digital Signatory Stamp</div>
                <div className="text-xs text-slate-800 font-medium">Rajesh Sharma (Plant Head & Director Seal)</div>
                <div className="text-[11px] text-slate-400 font-mono">Rajesh_Sharma_Seal.png</div>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 block">
                Letterhead Accent Color Palette
              </label>
              <div className="grid grid-cols-3 gap-3 max-w-md">
                {['Slate Solid', 'Industrial Blue', 'Deep Teal'].map(style => (
                  <button
                    key={style}
                    onClick={() => setSettings({ ...settings, letterheadAccentStyle: style as any })}
                    className={`p-3.5 rounded-xl border text-center transition-all cursor-pointer ${
                      settings.letterheadAccentStyle === style
                        ? 'border-blue-600 bg-blue-50 text-blue-950 font-bold shadow-xs'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full mx-auto mb-2 ${
                      style === 'Slate Solid' ? 'bg-slate-950' :
                      style === 'Industrial Blue' ? 'bg-blue-600' : 'bg-teal-700'
                    }`} />
                    <span className="text-xs font-semibold">{style}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* TAB 5: Bank & Commercial Terms */}
      {activeTab === 'terms' && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6 max-w-4xl"
        >
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 md:p-8 shadow-xs space-y-6">
            <div>
              <h3 className="text-base font-bold text-slate-900">Bank Settlement Details</h3>
              <p className="text-xs text-slate-500 mt-0.5">Printed at the bottom of the quotation for direct RTGS/NEFT payment remittance.</p>
            </div>

            <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono text-slate-800">
              <div>Beneficiary Bank: <strong className="text-slate-900">{settings.bankName}</strong></div>
              <div>Branch: {settings.branchName}</div>
              <div>Current Account Number: <strong>{settings.accountNumber}</strong></div>
              <div>IFSC Code: <strong>{settings.ifscCode}</strong></div>
              <div className="md:col-span-2">Corporate UPI / QR: <strong className="text-blue-700">{settings.upiId}</strong></div>
            </div>

            <div className="space-y-4 pt-2">
              <h4 className="text-sm font-bold text-slate-900">Standard Commercial Terms</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1.5">Delivery Timeline</label>
                  <input
                    type="text"
                    value={settings.deliveryTimeline}
                    onChange={(e) => setSettings({ ...settings, deliveryTimeline: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs text-slate-800"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1.5">Standard Payment Terms</label>
                  <input
                    type="text"
                    value={settings.paymentTerms}
                    onChange={(e) => setSettings({ ...settings, paymentTerms: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs text-slate-800"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1.5">Freight & Packaging</label>
                  <input
                    type="text"
                    value={settings.freightTerms}
                    onChange={(e) => setSettings({ ...settings, freightTerms: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs text-slate-800"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1.5">Quotation Validity</label>
                  <input
                    type="text"
                    value={settings.quotationValidity}
                    onChange={(e) => setSettings({ ...settings, quotationValidity: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs text-slate-800"
                  />
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* TAB 6: Template Customizer & WYSIWYG A4 Preview */}
      {activeTab === 'customizer' && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 lg:grid-cols-12 gap-6"
        >
          {/* Left Controls (5 Cols) */}
          <div className="lg:col-span-5 bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-5">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">Layout Presets</h3>
              <Badge variant="success" size="sm">GST Rule 46</Badge>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-2">Preset Layout Style</label>
              <div className="grid grid-cols-3 gap-2">
                {['Classic Industrial', 'Modern Minimalist', 'Export Compliance'].map(preset => (
                  <button
                    key={preset}
                    onClick={() => setSettings({ ...settings, activeTemplatePreset: preset as any })}
                    className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                      settings.activeTemplatePreset === preset
                        ? 'border-blue-600 bg-blue-50 text-blue-950 font-bold shadow-xs'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <div className="w-7 h-7 mx-auto mb-1.5 border border-slate-300 rounded-lg bg-slate-100 flex items-center justify-center text-xs">
                      📄
                    </div>
                    <span className="text-[11px] leading-tight block font-semibold">{preset}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-2">BOQ Row Density</label>
              <div className="grid grid-cols-3 gap-2">
                {['Compact (12px)', 'Standard (16px)', 'Spacious (20px)'].map(density => (
                  <button
                    key={density}
                    onClick={() => setSettings({ ...settings, tableRowDensity: density as any })}
                    className={`py-2 px-2.5 rounded-lg border text-xs font-medium text-center transition-colors cursor-pointer ${
                      settings.tableRowDensity === density
                        ? 'border-slate-950 bg-slate-950 text-white font-bold'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {density}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2.5 pt-2 border-t border-slate-100">
              <label className="text-xs font-semibold text-slate-600 block">Column Visibility</label>
              <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.showHsnCode}
                  onChange={(e) => setSettings({ ...settings, showHsnCode: e.target.checked })}
                  className="rounded text-blue-600 w-4 h-4"
                />
                <span>HSN / SAC Code (GST Rule 46)</span>
              </label>
              <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.showRawMaterialGrade}
                  onChange={(e) => setSettings({ ...settings, showRawMaterialGrade: e.target.checked })}
                  className="rounded text-blue-600 w-4 h-4"
                />
                <span>Raw Material Grade (EN8/MS/CI)</span>
              </label>
              <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.showProcessSplit}
                  onChange={(e) => setSettings({ ...settings, showProcessSplit: e.target.checked })}
                  className="rounded text-blue-600 w-4 h-4"
                />
                <span>Material vs Machining Split</span>
              </label>
            </div>

            <Button
              variant="primary"
              size="md"
              className="w-full mt-2"
              onClick={handleSave}
            >
              Save & Set as Active Template
            </Button>
          </div>

          {/* Right Preview (7 Cols) */}
          <div className="lg:col-span-7 bg-slate-100/90 p-5 rounded-2xl border border-slate-300/80">
            <div className="flex justify-between items-center text-xs pb-2 mb-3 text-slate-500 font-mono">
              <span className="font-semibold text-slate-700">LIVE A4 PREVIEW (Wysiwyg)</span>
              <span>100% Zoom</span>
            </div>

            <div className="bg-white p-7 rounded-xl shadow-lg border border-slate-300 space-y-4 text-xs font-sans">
              <div className="border-b-2 border-slate-900 pb-3 flex justify-between items-start">
                <div>
                  <div className="font-bold text-base uppercase text-slate-950">BHARAT PRECISION ENGINEERING PVT LTD</div>
                  <div className="text-[11px] text-slate-500">Heavy Fabrication & CNC Machining • Bhosari, Pune</div>
                </div>
                <div className="text-right text-[10px] font-mono text-slate-500">
                  <div>GSTIN: 27AABCB2018Q1Z2</div>
                  <div className="text-emerald-700 font-semibold">ISO 9001:2015 Certified</div>
                </div>
              </div>

              <div className="bg-slate-950 text-white p-1.5 rounded-md font-bold text-center text-xs tracking-wider">
                FORMAL COMMERCIAL QUOTATION — BPE/QT/2024-25/090
              </div>

              <div className="text-xs space-y-0.5">
                <div>To: <strong className="text-slate-900">M/s. Mahindra Precision Agro Pvt Ltd</strong></div>
                <div className="text-slate-500">Attn: Mr. Vikram Patil • Ref: PO-2026-441</div>
              </div>

              <table className="w-full text-xs border border-slate-200">
                <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600">
                  <tr>
                    <th className="p-2 text-left">Item</th>
                    <th className="p-2 text-left">Description</th>
                    {settings.showHsnCode && <th className="p-2 text-center">HSN</th>}
                    <th className="p-2 text-center">Qty</th>
                    <th className="p-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="p-2 font-mono">01</td>
                    <td className="p-2 font-medium">High-Pressure Pump Casing (CI Gr.2)</td>
                    {settings.showHsnCode && <td className="p-2 text-center font-mono text-slate-500">84139190</td>}
                    <td className="p-2 text-center font-mono font-bold">10</td>
                    <td className="p-2 text-right font-mono font-bold">₹26,880</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-mono">02</td>
                    <td className="p-2 font-medium">CNC Turned Drive Shaft (EN8D)</td>
                    {settings.showHsnCode && <td className="p-2 text-center font-mono text-slate-500">84831099</td>}
                    <td className="p-2 text-center font-mono font-bold">5</td>
                    <td className="p-2 text-right font-mono font-bold">₹17,000</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-mono">03</td>
                    <td className="p-2 font-medium">Flanged Cover Plate (MS 2062)</td>
                    {settings.showHsnCode && <td className="p-2 text-center font-mono text-slate-500">73269099</td>}
                    <td className="p-2 text-center font-mono font-bold">20</td>
                    <td className="p-2 text-right font-mono font-bold">₹20,500</td>
                  </tr>
                </tbody>
              </table>

              <div className="flex justify-end pt-2 border-t border-slate-200">
                <div className="w-56 text-xs space-y-1 font-mono">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal:</span>
                    <span>₹63,500</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Overhead & Profit:</span>
                    <span>₹18,288</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>GST (18%):</span>
                    <span>₹14,722</span>
                  </div>
                  <div className="flex justify-between font-bold text-slate-950 border-t border-slate-300 pt-1 text-sm">
                    <span>Total Quoted:</span>
                    <span className="text-emerald-600">₹96,510</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* TAB: Customer Communication Settings */}
      {activeTab === 'communication' && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 md:p-8 shadow-xs space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">Customer Communication Settings</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Configure quotation delivery addresses. Quotations default to the account login email unless a quotation email is configured.
                </p>
              </div>
              <Badge variant="slate" size="md">Communication Preference</Badge>
            </div>

            {/* Customer Selector */}
            <div className="space-y-1.5 max-w-md">
              <label className="text-xs font-semibold text-slate-700">Select Customer Account</label>
              <select
                value={selectedCustomerId}
                onChange={(e) => {
                  const newId = e.target.value;
                  setSelectedCustomerId(newId);
                  const cust = customers.find(c => c.id === newId);
                  setQuotationEmailInput(cust?.quotationEmail || '');
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2.5 px-3 text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-950"
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.loginEmail || c.email})
                  </option>
                ))}
              </select>
            </div>

            <div className="border-t border-slate-100 pt-5 space-y-5 max-w-xl">
              {/* Account Login Email (Read only) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700">Account Login Email</label>
                  <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">Read only</span>
                </div>
                <input
                  type="email"
                  readOnly
                  value={selectedCustomer?.loginEmail || selectedCustomer?.email || ''}
                  className="w-full bg-slate-100/80 border border-slate-200 rounded-lg py-2.5 px-3 text-xs font-mono text-slate-600 cursor-not-allowed"
                />
                <p className="text-[11px] text-slate-500">
                  This email is used for customer account login. It cannot be changed from quotation settings.
                </p>
              </div>

              {/* Quotation Email (Editable) */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Quotation Email</label>
                <input
                  type="email"
                  placeholder="e.g. quotes@abcengineering.com"
                  value={quotationEmailInput}
                  onChange={(e) => setQuotationEmailInput(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg py-2.5 px-3 text-xs font-mono text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-950"
                />
                <p className="text-[11px] text-slate-500">
                  Optional. If empty, quotations will be sent to the Account Login Email.
                </p>
              </div>

              {/* Resolved Delivery Status Banner */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="text-xs font-medium text-slate-500">Active Quotation Recipient:</div>
                  <div className="text-sm font-mono font-bold text-slate-900">
                    {quotationEmailInput.trim() ? quotationEmailInput.trim() : (selectedCustomer?.loginEmail || selectedCustomer?.email || 'No email on file')}
                  </div>
                </div>
                <Badge variant={quotationEmailInput.trim() ? 'info' : 'slate'} size="sm">
                  {quotationEmailInput.trim() ? 'Quotation Preference' : 'Using Login Email'}
                </Badge>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 pt-2">
                <Button
                  variant="primary"
                  size="md"
                  onClick={handleSaveQuotationEmail}
                  icon={<Save className="w-4 h-4 text-emerald-400" />}
                >
                  Save Changes
                </Button>
                {quotationEmailInput && (
                  <Button
                    variant="outline"
                    size="md"
                    onClick={handleClearQuotationEmail}
                  >
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
