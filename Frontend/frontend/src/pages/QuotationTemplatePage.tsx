import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  FileText,
  CheckCircle2,
  Download,
  RotateCcw,
  Check,
  Building2,
  CreditCard,
  Truck,
  Shield,
  ShieldCheck,
  Layers,
  ZoomIn,
  ZoomOut,
  ArrowRight,
  Upload,
  AlertCircle,
  FileCheck
} from 'lucide-react';
import { TabularNumber } from '../components/common/TabularNumber';
import { CompanyLogo } from '../components/common/CompanyLogo';
import { Button } from '../components/ui/Button';
import { quotationApi, QuotationDTO, QuotationItemDTO } from '../api/quotationApi';
import { companyApi } from '../api/companyApi';
import { useCompanySettings } from '../hooks/useCompanySettings';
import { useAuth } from '../context/AuthContext';
import { LogoPosition } from '../types/company';

// Professional Preset Styles
export interface TemplatePreset {
  id: string;
  name: string;
  category: string;
  description: string;
  accent: string;
  secondary: string;
}

const TEMPLATE_PRESETS: TemplatePreset[] = [
  {
    id: 'classic_professional',
    name: 'ORYNZA Classic DIN A4',
    category: 'Professional',
    description: 'Crisp industrial header, alternating ledger rows, structured compliance bento boxes.',
    accent: '#B87333',
    secondary: '#172033',
  },
  {
    id: 'industrial_bold',
    name: 'Industrial Precision Heavy',
    category: 'Industrial',
    description: 'High-density technical grid, dark accent banner, monospaced figures and metrics.',
    accent: '#172033',
    secondary: '#B87333',
  },
  {
    id: 'modern_minimal',
    name: 'Minimal Corporate OEM',
    category: 'Minimal',
    description: 'Clean borderless layout, hairline dividers, generous white space.',
    accent: '#2563EB',
    secondary: '#0F172A',
  },
  {
    id: 'premium_corporate',
    name: 'Executive Commercial Dossier',
    category: 'Corporate',
    description: 'Emerald accents, boxed financial telemetry, and formalized signatory stamps.',
    accent: '#059669',
    secondary: '#111827',
  }
];

const ACCENT_COLORS = [
  { label: 'Refined Copper', value: '#B87333' },
  { label: 'Midnight Navy', value: '#172033' },
  { label: 'Industrial Cobalt', value: '#2563EB' },
  { label: 'Precision Amber', value: '#D97706' },
  { label: 'Emerald Steel', value: '#059669' },
  { label: 'Carbon Graphite', value: '#334155' }
];

export const QuotationTemplatePage: React.FC = () => {
  const navigate = useNavigate();
  const { quoteId } = useParams<{ quoteId?: string }>();
  const { company } = useAuth();
  const { settings, refetchSettings } = useCompanySettings();

  // Quotation Data State
  const [quote, setQuote] = useState<QuotationDTO | null>(null);
  const [quotationsList, setQuotationsList] = useState<QuotationDTO[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState<boolean>(false);
  const [zoomLevel, setZoomLevel] = useState<number>(100);

  // Active Control Section Tab
  const [activeTab, setActiveTab] = useState<'branding' | 'quotation' | 'table' | 'terms' | 'signatory'>('branding');

  // Reusable Company-Level Template Configuration
  const [templateId, setTemplateId] = useState<string>('classic_professional');
  const [accentColor, setAccentColor] = useState<string>('#B87333');
  const [secondaryColor, setSecondaryColor] = useState<string>('#172033');
  const [headerStyle, setHeaderStyle] = useState<'split' | 'centered' | 'compact'>('split');
  const [tableStyle, setTableStyle] = useState<'classic' | 'industrial' | 'minimal'>('classic');
  const [fontFamily, setFontFamily] = useState<string>('Inter');
  const [marginSpacing, setMarginSpacing] = useState<'compact' | 'standard' | 'relaxed'>('compact');

  // Document Title & Numbering
  const [docTitle, setDocTitle] = useState<string>('Commercial Estimate & Formal Quotation');
  const [showQuoteNumber, setShowQuoteNumber] = useState<boolean>(true);
  const [showQuoteDate, setShowQuoteDate] = useState<boolean>(true);
  const [showValidUntil, setShowValidUntil] = useState<boolean>(true);
  const [showBuyerRef, setShowBuyerRef] = useState<boolean>(true);

  // Compliance & Toggles
  const [showLogo, setShowLogo] = useState<boolean>(true);
  const [logoPosition, setLogoPosition] = useState<LogoPosition>('left');
  const [showCompanyContact, setShowCompanyContact] = useState<boolean>(true);
  const [showGstin, setShowGstin] = useState<boolean>(true);
  const [showHsn, setShowHsn] = useState<boolean>(true);
  const [showUnitRate, setShowUnitRate] = useState<boolean>(true);
  const [showBankDetails, setShowBankDetails] = useState<boolean>(true);
  const [showTerms, setShowTerms] = useState<boolean>(true);
  const [showSignature, setShowSignature] = useState<boolean>(true);
  const [showWatermark, setShowWatermark] = useState<boolean>(false);
  const [watermarkText, setWatermarkText] = useState<string>('CONFIDENTIAL');
  const [showFooter, setShowFooter] = useState<boolean>(true);
  const [footerText, setFooterText] = useState<string>(
    'This is an authenticated computer-generated commercial document.'
  );

  // Commercial Terms & Declarations (Derived from Quotation or Company Defaults)
  const [deliveryTerms, setDeliveryTerms] = useState<string>('');
  const [paymentTerms, setPaymentTerms] = useState<string>('');
  const [inspectionTerms, setInspectionTerms] = useState<string>('');
  const [commercialNotes, setCommercialNotes] = useState<string>('');

  // Signatory State
  const [signatoryName, setSignatoryName] = useState<string>('');
  const [signatoryDesignation, setSignatoryDesignation] = useState<string>('Authorised Commercial Signatory');

  // Company Details (Editable in Customizer & Synced with Company Profile)
  const [companyName, setCompanyName] = useState<string>('');
  const [companyAddress, setCompanyAddress] = useState<string>('');
  const [companyGstin, setCompanyGstin] = useState<string>('');
  const [companyPhone, setCompanyPhone] = useState<string>('');
  const [companyEmail, setCompanyEmail] = useState<string>('');
  const [companyWebsite, setCompanyWebsite] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
  };

  // Sync Initial State from Company Settings
  useEffect(() => {
    if (settings) {
      if (settings.template) {
        if (settings.template.template_id) setTemplateId(settings.template.template_id);
        if (settings.template.primary_color) setAccentColor(settings.template.primary_color);
        if (settings.template.secondary_color) setSecondaryColor(settings.template.secondary_color);
        if (settings.template.font_family) setFontFamily(settings.template.font_family);
        if (settings.template.logo_position) setLogoPosition(settings.template.logo_position);
        if (typeof settings.template.show_logo === 'boolean') setShowLogo(settings.template.show_logo);
        if (typeof settings.template.show_company_contact === 'boolean')
          setShowCompanyContact(settings.template.show_company_contact);
        if (typeof settings.template.show_gstin === 'boolean') setShowGstin(settings.template.show_gstin);
        if (typeof settings.template.show_bank_details === 'boolean')
          setShowBankDetails(settings.template.show_bank_details);
        if (typeof settings.template.show_terms === 'boolean') setShowTerms(settings.template.show_terms);
        if (typeof settings.template.show_signature === 'boolean')
          setShowSignature(settings.template.show_signature);
        if (settings.template.footer_text) setFooterText(settings.template.footer_text);
      }
      if (settings.profile) {
        if (settings.profile.name) setCompanyName(settings.profile.name);
        if (settings.profile.address) setCompanyAddress(settings.profile.address);
        if (settings.profile.phone) setCompanyPhone(settings.profile.phone);
        if (settings.profile.email) setCompanyEmail(settings.profile.email);
        if (settings.profile.website) setCompanyWebsite(settings.profile.website);
        if (settings.profile.gstin) setCompanyGstin(settings.profile.gstin);
        if (settings.profile.authorized_signatory) setSignatoryName(settings.profile.authorized_signatory);
      }
      if (settings.tax && settings.tax.gstin) {
        setCompanyGstin(settings.tax.gstin);
      }
      if (settings.defaults) {
        if (settings.defaults.delivery_terms && !deliveryTerms) setDeliveryTerms(settings.defaults.delivery_terms);
        if (settings.defaults.payment_terms && !paymentTerms) setPaymentTerms(settings.defaults.payment_terms);
        if (settings.defaults.inspection_terms && !inspectionTerms) setInspectionTerms(settings.defaults.inspection_terms);
        if (settings.defaults.general_terms && !commercialNotes) setCommercialNotes(settings.defaults.general_terms);
        if (settings.defaults.authorized_signatory && !signatoryName) setSignatoryName(settings.defaults.authorized_signatory);
      }
    }
  }, [settings]);

  // Load Real Quotation Data
  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    const fetchQuotations = async () => {
      try {
        const paginatedData = await quotationApi.listPaginated({ page: 1, page_size: 20 });
        if (!isMounted) return;

        const items = paginatedData?.items || [];
        setQuotationsList(items);

        if (quoteId) {
          const specific = items.find((q) => q.id === quoteId);
          if (specific) {
            setQuote(specific);
            applyQuotationTerms(specific);
          } else {
            const fetched = await quotationApi.get(quoteId);
            if (isMounted) {
              setQuote(fetched);
              applyQuotationTerms(fetched);
            }
          }
        } else if (items.length > 0) {
          setQuote(items[0]);
          applyQuotationTerms(items[0]);
        }
      } catch (err: any) {
        if (!isMounted) return;
        setError(err.response?.data?.detail || err.message || 'Failed to load quotation.');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchQuotations();

    return () => {
      isMounted = false;
    };
  }, [quoteId]);

  const applyQuotationTerms = (q: QuotationDTO) => {
    if (q.delivery_terms) setDeliveryTerms(q.delivery_terms);
    if (q.payment_terms) setPaymentTerms(q.payment_terms);
    if (q.inspection_terms) setInspectionTerms(q.inspection_terms);
    if (q.notes) setCommercialNotes(q.notes);
    if (q.authorized_signatory) setSignatoryName(q.authorized_signatory);
    if (q.company_name) setCompanyName(q.company_name);
    if (q.company_address) setCompanyAddress(q.company_address);
    if (q.company_gstin) setCompanyGstin(q.company_gstin);
    if (q.company_phone) setCompanyPhone(q.company_phone);
    if (q.company_email) setCompanyEmail(q.company_email);
  };

  const handleSelectQuotation = async (selectedId: string) => {
    setLoading(true);
    try {
      const selected = await quotationApi.get(selectedId);
      setQuote(selected);
      applyQuotationTerms(selected);
      navigate(`/templates/${selectedId}`, { replace: true });
    } catch (err: any) {
      showToast('Could not load selected quotation.');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyPreset = (preset: TemplatePreset) => {
    setTemplateId(preset.id);
    setAccentColor(preset.accent);
    setSecondaryColor(preset.secondary);

    if (preset.id === 'industrial_bold') {
      setHeaderStyle('compact');
      setTableStyle('industrial');
      setMarginSpacing('compact');
    } else if (preset.id === 'modern_minimal') {
      setHeaderStyle('centered');
      setTableStyle('minimal');
      setMarginSpacing('standard');
    } else {
      setHeaderStyle('split');
      setTableStyle('classic');
      setMarginSpacing('compact');
    }

    showToast(`Template preset applied: ${preset.name}`);
  };

  const handleResetDefaults = () => {
    const defaultPreset = TEMPLATE_PRESETS[0];
    setTemplateId(defaultPreset.id);
    setAccentColor(defaultPreset.accent);
    setSecondaryColor(defaultPreset.secondary);
    setHeaderStyle('split');
    setTableStyle('classic');
    setFontFamily('Inter');
    setMarginSpacing('compact');
    setDocTitle('Commercial Estimate & Formal Quotation');
    setShowLogo(true);
    setLogoPosition('left');
    setShowCompanyContact(true);
    setShowGstin(true);
    setShowHsn(true);
    setShowUnitRate(true);
    setShowBankDetails(true);
    setShowTerms(true);
    setShowSignature(true);
    setShowWatermark(false);
    setShowFooter(true);
    setFooterText('This is an authenticated computer-generated commercial document.');
    showToast('Reset template configuration to defaults.');
  };

  const handleSaveTemplate = async () => {
    setIsSaving(true);
    try {
      // 1. Persist Reusable Company-Level Template Configuration
      await companyApi.updateTemplateConfig({
        template_id: templateId,
        primary_color: accentColor,
        secondary_color: secondaryColor,
        font_family: fontFamily,
        logo_position: logoPosition,
        show_logo: showLogo,
        show_company_contact: showCompanyContact,
        show_gstin: showGstin,
        show_bank_details: showBankDetails,
        show_terms: showTerms,
        show_signature: showSignature,
        footer_text: footerText
      });

      // 2. If quote is active, persist commercial terms to this quotation record
      if (quote) {
        await quotationApi.update(quote.id, {
          delivery_terms: deliveryTerms,
          payment_terms: paymentTerms,
          inspection_terms: inspectionTerms,
          notes: commercialNotes,
          authorized_signatory: signatoryName
        });
      }

      await refetchSettings();
      showToast('Template configuration saved successfully.');
    } catch (err: any) {
      showToast(err.response?.data?.detail || err.message || 'Failed to save template changes.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!quote) {
      showToast('No active quotation available to download.');
      return;
    }
    setIsDownloadingPdf(true);
    try {
      await quotationApi.downloadPdf(quote.id, quote.quotation_number);
      showToast(`Quotation PDF downloaded: ${quote.quotation_number}.pdf`);
    } catch (err: any) {
      showToast('Failed to download PDF. Please try again.');
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      await companyApi.uploadLogo(file);
      await refetchSettings();
      showToast('Company logo uploaded successfully.');
    } catch (err: any) {
      showToast(err.response?.data?.detail || 'Failed to upload logo.');
    }
  };

  // Real Line Items from Backend Quotation (Zero Mock Data)
  const displayItems: QuotationItemDTO[] = useMemo(() => {
    return quote?.items || [];
  }, [quote]);

  // Real Financial Totals Derived Strictly from Backend Data (Zero Client Recalculation)
  const financialTotals = useMemo(() => {
    if (!quote) return null;
    return {
      subtotal: quote.taxable_amount ?? quote.subtotal ?? 0,
      materialCost: quote.material_cost,
      processCost: quote.process_cost,
      isIgst: quote.gst_type === 'IGST',
      cgstRate: quote.cgst_rate ?? 9.0,
      cgstAmount: quote.cgst_amount ?? 0,
      sgstRate: quote.sgst_rate ?? 9.0,
      sgstAmount: quote.sgst_amount ?? 0,
      igstRate: quote.igst_rate ?? 18.0,
      igstAmount: quote.igst_amount ?? 0,
      gstTotal: quote.gst_amount ?? 0,
      grandTotal: quote.final_total ?? quote.grand_total ?? 0,
      amountInWords: quote.final_total_in_words || quote.amount_in_words || ''
    };
  }, [quote]);

  // Real Bank Remittance Details (from quotation or company settings)
  const bankDetails = useMemo(() => {
    if (quote?.bank_details && quote.bank_details.bank_name) {
      return {
        name: quote.bank_details.bank_name,
        branch: quote.bank_details.bank_branch || '',
        account: quote.bank_details.bank_account || '',
        ifsc: quote.bank_details.bank_ifsc || '',
        upi: quote.bank_details.upi_id || ''
      };
    }
    if (settings?.bank && settings.bank.bank_name) {
      return {
        name: settings.bank.bank_name,
        branch: settings.bank.branch || '',
        account: settings.bank.account_number || '',
        ifsc: settings.bank.ifsc || '',
        upi: settings.bank.upi_id || ''
      };
    }
    return null;
  }, [quote, settings]);

  return (
    <div className="flex flex-col w-full min-h-screen bg-[#FBF9F4] text-[#1b1c19]">
      {/* Toast Feedback */}
      {toastMsg && (
        <div className="fixed top-20 right-6 z-50 bg-[#172033] text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 border border-[#24314d] text-xs font-medium">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Hidden File Input for Logo Upload */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleLogoUpload}
        accept="image/png,image/jpeg,image/svg+xml"
        className="hidden"
      />

      {/* TOP COMMAND HEADER */}
      <div className="w-full bg-white border-b border-[#E5E1D8] px-6 py-4 shrink-0 shadow-[0_1px_4px_rgba(23,32,51,0.03)]">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex flex-col gap-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#B87333]">
                MASTERS &amp; CONFIGURATION
              </span>
              <span className="text-[#c6c6cd] text-xs">/</span>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#76777d]">
                QUOTATION TEMPLATES
              </span>
              <span className="inline-flex items-center gap-1.5 ml-2 px-2.5 py-0.5 rounded-full bg-[#f0eee9] text-[#1b1c19] text-[11px] font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Active Schema
              </span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-baseline gap-2.5">
              <h1 className="text-2xl font-bold text-[#1b1c19] tracking-tight">
                Quotation Template Customizer
              </h1>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#B87333]/10 text-[#B87333] font-semibold">
                Active: {TEMPLATE_PRESETS.find((t) => t.id === templateId)?.name || 'DIN A4 Classic'}
              </span>
            </div>

            <p className="text-xs text-[#45474c] max-w-3xl">
              Customize the appearance and commercial information of your customer-facing quotations.
            </p>
          </div>

          {/* Quotation Switcher & Top Actions */}
          <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-center">
            {/* Real Quotation Switcher Dropdown */}
            {quotationsList.length > 0 && (
              <div className="flex items-center gap-1.5 bg-[#f5f3ee] px-2.5 py-1.5 rounded-lg border border-[#E5E1D8]">
                <span className="text-[11px] font-bold text-[#76777d] uppercase">Dossier:</span>
                <select
                  value={quote?.id || ''}
                  onChange={(e) => handleSelectQuotation(e.target.value)}
                  className="bg-transparent text-xs font-semibold text-[#1b1c19] focus:outline-none cursor-pointer max-w-[200px] truncate"
                >
                  {quotationsList.map((q) => (
                    <option key={q.id} value={q.id}>
                      {q.quotation_number} • {q.customer_name || 'Client'}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button
              onClick={handleResetDefaults}
              className="px-3 py-2 rounded-lg bg-[#f5f3ee] hover:bg-[#eae8e3] text-[#1b1c19] text-xs font-semibold transition-colors flex items-center gap-1.5 border border-[#E5E1D8] shadow-xs"
              title="Reset all settings to default preset"
            >
              <RotateCcw className="w-3.5 h-3.5 text-[#76777d]" />
              <span className="hidden sm:inline">Reset Defaults</span>
            </button>

            <button
              onClick={handleDownloadPdf}
              disabled={isDownloadingPdf || !quote}
              className="px-3.5 py-2 rounded-lg bg-white hover:bg-[#f5f3ee] text-[#1b1c19] text-xs font-semibold transition-colors flex items-center gap-1.5 border border-[#E5E1D8] shadow-xs disabled:opacity-50"
              title="Download rendered PDF quotation"
            >
              <Download className="w-3.5 h-3.5 text-[#B87333]" />
              <span>{isDownloadingPdf ? 'Generating...' : 'Preview PDF'}</span>
            </button>

            <button
              onClick={handleSaveTemplate}
              disabled={isSaving}
              className="px-4 py-2 rounded-lg bg-[#B87333] hover:bg-[#9c612b] text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shadow-[#B87333]/20 active:scale-[0.99]"
            >
              <Check className="w-4 h-4" />
              <span>{isSaving ? 'Saving...' : 'Save Template'}</span>
            </button>

            {quote && (
              <button
                onClick={() => navigate(`/quotation/${quote.id}`)}
                className="px-3.5 py-2 rounded-lg bg-[#172033] hover:bg-[#202c45] text-white text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs"
              >
                <span>Quotation Dossier</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Template Preset Pills */}
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[#E5E1D8] overflow-x-auto pb-1">
          <span className="text-[11px] font-bold text-[#76777d] uppercase tracking-wider shrink-0 mr-1">
            Styles:
          </span>
          {TEMPLATE_PRESETS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => handleApplyPreset(preset)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 shrink-0 ${
                templateId === preset.id
                  ? 'bg-[#B87333] text-white shadow-sm'
                  : 'bg-[#f5f3ee] hover:bg-[#eae8e3] text-[#1b1c19] border border-[#E5E1D8]'
              }`}
            >
              <span
                className="w-2.5 h-2.5 rounded-full border border-white/40"
                style={{ backgroundColor: preset.accent }}
              />
              <span>{preset.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* MAIN WORKSPACE GRID: 5-COL CONTROLS / 7-COL LIVE CANVAS */}
      <div className="w-full p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ============================================================== */}
        {/* LEFT COLUMN: TEMPLATE CUSTOMIZATION CONTROLS (5 COLS)           */}
        {/* ============================================================== */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          {/* Navigation Control Tabs */}
          <div className="bg-white rounded-xl border border-[#E5E1D8] p-1.5 flex flex-wrap gap-1 shadow-xs">
            <button
              onClick={() => setActiveTab('branding')}
              className={`flex-1 min-w-[90px] py-1.5 px-2 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 ${
                activeTab === 'branding'
                  ? 'bg-[#172033] text-white shadow-xs'
                  : 'text-[#45474c] hover:bg-[#f5f3ee]'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Company</span>
            </button>
            <button
              onClick={() => setActiveTab('quotation')}
              className={`flex-1 min-w-[90px] py-1.5 px-2 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 ${
                activeTab === 'quotation'
                  ? 'bg-[#172033] text-white shadow-xs'
                  : 'text-[#45474c] hover:bg-[#f5f3ee]'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Dossier</span>
            </button>
            <button
              onClick={() => setActiveTab('table')}
              className={`flex-1 min-w-[90px] py-1.5 px-2 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 ${
                activeTab === 'table'
                  ? 'bg-[#172033] text-white shadow-xs'
                  : 'text-[#45474c] hover:bg-[#f5f3ee]'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Table</span>
            </button>
            <button
              onClick={() => setActiveTab('terms')}
              className={`flex-1 min-w-[90px] py-1.5 px-2 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 ${
                activeTab === 'terms'
                  ? 'bg-[#172033] text-white shadow-xs'
                  : 'text-[#45474c] hover:bg-[#f5f3ee]'
              }`}
            >
              <Truck className="w-3.5 h-3.5" />
              <span>Terms</span>
            </button>
            <button
              onClick={() => setActiveTab('signatory')}
              className={`flex-1 min-w-[90px] py-1.5 px-2 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 ${
                activeTab === 'signatory'
                  ? 'bg-[#172033] text-white shadow-xs'
                  : 'text-[#45474c] hover:bg-[#f5f3ee]'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Signatory</span>
            </button>
          </div>

          {/* ACTIVE TAB CONTENT CARD */}
          <div className="bg-white rounded-xl border border-[#E5E1D8] p-5 shadow-xs flex flex-col gap-4">
            {/* TAB 1: COMPANY HEADER & BRANDING */}
            {activeTab === 'branding' && (
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#E5E1D8]">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#1b1c19]">
                      Company Header &amp; Visual Identity
                    </span>
                    <span className="text-[11px] text-[#76777d]">
                      Reusable company branding settings applied to all customer quotations.
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#B87333]/10 text-[#B87333]">
                    Reusable
                  </span>
                </div>

                {/* Company Logo Section */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-[#1b1c19]">Official Company Logo</label>
                    <label className="flex items-center gap-1.5 cursor-pointer text-xs text-[#45474c]">
                      <input
                        type="checkbox"
                        checked={showLogo}
                        onChange={(e) => setShowLogo(e.target.checked)}
                        className="rounded border-[#c6c6cd] text-[#B87333] focus:ring-[#B87333]"
                      />
                      <span>Show Logo</span>
                    </label>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-[#f5f3ee] rounded-lg border border-[#E5E1D8]">
                    <div className="w-20 h-10 bg-white rounded flex items-center justify-center p-1 border border-[#E5E1D8] overflow-hidden">
                      <CompanyLogo variant="preview" maxHeight="36px" maxWidth="72px" />
                    </div>
                    <div className="flex-1 flex items-center gap-2">
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3 py-1.5 rounded bg-white hover:bg-[#eae8e3] text-[#1b1c19] text-xs font-semibold border border-[#E5E1D8] transition-colors flex items-center gap-1.5 shadow-xs"
                      >
                        <Upload className="w-3.5 h-3.5 text-[#B87333]" />
                        <span>Upload Logo</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Header Style Options */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-[#1b1c19]">Header Layout Style</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => setHeaderStyle('split')}
                      className={`p-2.5 rounded-lg border text-left flex flex-col gap-1 transition-all ${
                        headerStyle === 'split'
                          ? 'border-[#B87333] bg-[#B87333]/5 text-[#1b1c19]'
                          : 'border-[#E5E1D8] hover:bg-[#f5f3ee] text-[#45474c]'
                      }`}
                    >
                      <span className="text-xs font-bold">Split Header</span>
                      <span className="text-[10px] leading-tight text-[#76777d]">Logo left, details right</span>
                    </button>

                    <button
                      onClick={() => setHeaderStyle('centered')}
                      className={`p-2.5 rounded-lg border text-left flex flex-col gap-1 transition-all ${
                        headerStyle === 'centered'
                          ? 'border-[#B87333] bg-[#B87333]/5 text-[#1b1c19]'
                          : 'border-[#E5E1D8] hover:bg-[#f5f3ee] text-[#45474c]'
                      }`}
                    >
                      <span className="text-xs font-bold">Centered</span>
                      <span className="text-[10px] leading-tight text-[#76777d]">Balanced alignment</span>
                    </button>

                    <button
                      onClick={() => setHeaderStyle('compact')}
                      className={`p-2.5 rounded-lg border text-left flex flex-col gap-1 transition-all ${
                        headerStyle === 'compact'
                          ? 'border-[#B87333] bg-[#B87333]/5 text-[#1b1c19]'
                          : 'border-[#E5E1D8] hover:bg-[#f5f3ee] text-[#45474c]'
                      }`}
                    >
                      <span className="text-xs font-bold">Compact Spec</span>
                      <span className="text-[10px] leading-tight text-[#76777d]">High density ribbon</span>
                    </button>
                  </div>
                </div>

                {/* Accent Color Palette */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-[#1b1c19]">Primary Accent Color</label>
                  <div className="flex items-center gap-2 flex-wrap">
                    {ACCENT_COLORS.map((col) => (
                      <button
                        key={col.value}
                        onClick={() => setAccentColor(col.value)}
                        className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                          accentColor === col.value
                            ? 'ring-2 ring-[#172033] ring-offset-2 scale-110 shadow-sm'
                            : 'hover:scale-105 opacity-80 hover:opacity-100'
                        }`}
                        style={{ backgroundColor: col.value }}
                        title={col.label}
                      >
                        {accentColor === col.value && <Check className="w-3.5 h-3.5 text-white" />}
                      </button>
                    ))}
                    <div className="flex items-center gap-1.5 ml-2 bg-[#f5f3ee] px-2 py-1 rounded border border-[#E5E1D8]">
                      <span className="text-[10px] font-mono text-[#76777d]">HEX:</span>
                      <input
                        type="text"
                        value={accentColor}
                        onChange={(e) => setAccentColor(e.target.value)}
                        className="w-16 bg-transparent font-mono text-xs font-semibold text-[#1b1c19] focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Company Legal Information */}
                <div className="flex flex-col gap-3 pt-2 border-t border-[#E5E1D8]">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-[#1b1c19]">Company Name</label>
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="px-3 py-2 rounded-lg border border-[#E5E1D8] bg-[#f5f3ee] text-xs text-[#1b1c19] focus:outline-none focus:border-[#B87333]"
                      placeholder="Company Legal Entity Name"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-[#1b1c19]">Registered Address</label>
                    <textarea
                      rows={2}
                      value={companyAddress}
                      onChange={(e) => setCompanyAddress(e.target.value)}
                      className="px-3 py-2 rounded-lg border border-[#E5E1D8] bg-[#f5f3ee] text-xs text-[#1b1c19] focus:outline-none focus:border-[#B87333] resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-bold text-[#1b1c19]">GSTIN / Tax ID</label>
                      <input
                        type="text"
                        value={companyGstin}
                        onChange={(e) => setCompanyGstin(e.target.value.toUpperCase())}
                        className="px-3 py-2 rounded-lg border border-[#E5E1D8] bg-[#f5f3ee] text-xs font-mono font-semibold text-[#1b1c19] focus:outline-none focus:border-[#B87333] uppercase"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-bold text-[#1b1c19]">Phone Hotline</label>
                      <input
                        type="text"
                        value={companyPhone}
                        onChange={(e) => setCompanyPhone(e.target.value)}
                        className="px-3 py-2 rounded-lg border border-[#E5E1D8] bg-[#f5f3ee] text-xs text-[#1b1c19] focus:outline-none focus:border-[#B87333]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-bold text-[#1b1c19]">Commercial Email</label>
                      <input
                        type="text"
                        value={companyEmail}
                        onChange={(e) => setCompanyEmail(e.target.value)}
                        className="px-3 py-2 rounded-lg border border-[#E5E1D8] bg-[#f5f3ee] text-xs text-[#1b1c19] focus:outline-none focus:border-[#B87333]"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-bold text-[#1b1c19]">Website</label>
                      <input
                        type="text"
                        value={companyWebsite}
                        onChange={(e) => setCompanyWebsite(e.target.value)}
                        className="px-3 py-2 rounded-lg border border-[#E5E1D8] bg-[#f5f3ee] text-xs text-[#1b1c19] focus:outline-none focus:border-[#B87333]"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: QUOTATION DOSSIER & METADATA */}
            {activeTab === 'quotation' && (
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#E5E1D8]">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#1b1c19]">
                      Document Title &amp; Numbering Rules
                    </span>
                    <span className="text-[11px] text-[#76777d]">
                      Set formal quotation nomenclature and customer ref visibility.
                    </span>
                  </div>
                  <FileText className="w-4 h-4 text-[#B87333]" />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-[#1b1c19]">Document Title Banner</label>
                  <input
                    type="text"
                    value={docTitle}
                    onChange={(e) => setDocTitle(e.target.value)}
                    className="px-3 py-2 rounded-lg border border-[#E5E1D8] bg-[#f5f3ee] text-xs font-semibold text-[#1b1c19] focus:outline-none focus:border-[#B87333]"
                    placeholder="e.g. Commercial Estimate & Formal Quotation"
                  />
                </div>

                <div className="flex flex-col gap-2 pt-2 border-t border-[#E5E1D8]">
                  <span className="text-xs font-bold text-[#1b1c19]">Dossier Field Visibility</span>

                  <label className="flex items-center justify-between py-1 px-2.5 rounded bg-[#f5f3ee] cursor-pointer text-xs">
                    <span className="text-[#1b1c19]">Quotation Reference Number</span>
                    <input
                      type="checkbox"
                      checked={showQuoteNumber}
                      onChange={(e) => setShowQuoteNumber(e.target.checked)}
                      className="rounded border-[#c6c6cd] text-[#B87333] focus:ring-[#B87333]"
                    />
                  </label>

                  <label className="flex items-center justify-between py-1 px-2.5 rounded bg-[#f5f3ee] cursor-pointer text-xs">
                    <span className="text-[#1b1c19]">Quotation Issue Date</span>
                    <input
                      type="checkbox"
                      checked={showQuoteDate}
                      onChange={(e) => setShowQuoteDate(e.target.checked)}
                      className="rounded border-[#c6c6cd] text-[#B87333] focus:ring-[#B87333]"
                    />
                  </label>

                  <label className="flex items-center justify-between py-1 px-2.5 rounded bg-[#f5f3ee] cursor-pointer text-xs">
                    <span className="text-[#1b1c19]">Commercial Validity Period</span>
                    <input
                      type="checkbox"
                      checked={showValidUntil}
                      onChange={(e) => setShowValidUntil(e.target.checked)}
                      className="rounded border-[#c6c6cd] text-[#B87333] focus:ring-[#B87333]"
                    />
                  </label>

                  <label className="flex items-center justify-between py-1 px-2.5 rounded bg-[#f5f3ee] cursor-pointer text-xs">
                    <span className="text-[#1b1c19]">Buyer Reference / PO Number</span>
                    <input
                      type="checkbox"
                      checked={showBuyerRef}
                      onChange={(e) => setShowBuyerRef(e.target.checked)}
                      className="rounded border-[#c6c6cd] text-[#B87333] focus:ring-[#B87333]"
                    />
                  </label>

                  <label className="flex items-center justify-between py-1 px-2.5 rounded bg-[#f5f3ee] cursor-pointer text-xs">
                    <span className="text-[#1b1c19]">Background Confidentiality Watermark</span>
                    <input
                      type="checkbox"
                      checked={showWatermark}
                      onChange={(e) => setShowWatermark(e.target.checked)}
                      className="rounded border-[#c6c6cd] text-[#B87333] focus:ring-[#B87333]"
                    />
                  </label>

                  {showWatermark && (
                    <div className="flex items-center gap-2 mt-1 px-2.5 py-1.5 bg-[#f0eee9] rounded">
                      <span className="text-[11px] font-bold text-[#76777d]">Watermark:</span>
                      <input
                        type="text"
                        value={watermarkText}
                        onChange={(e) => setWatermarkText(e.target.value.toUpperCase())}
                        className="flex-1 bg-transparent text-xs font-bold uppercase tracking-wider text-[#1b1c19] focus:outline-none"
                      />
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-1.5 pt-2 border-t border-[#E5E1D8]">
                  <label className="text-xs font-bold text-[#1b1c19]">Document Sheet Spacing</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => setMarginSpacing('compact')}
                      className={`py-1.5 px-2 rounded text-xs font-semibold border transition-all ${
                        marginSpacing === 'compact'
                          ? 'border-[#B87333] bg-[#B87333]/10 text-[#1b1c19]'
                          : 'border-[#E5E1D8] text-[#76777d]'
                      }`}
                    >
                      Compact (12mm)
                    </button>
                    <button
                      onClick={() => setMarginSpacing('standard')}
                      className={`py-1.5 px-2 rounded text-xs font-semibold border transition-all ${
                        marginSpacing === 'standard'
                          ? 'border-[#B87333] bg-[#B87333]/10 text-[#1b1c19]'
                          : 'border-[#E5E1D8] text-[#76777d]'
                      }`}
                    >
                      Standard (18mm)
                    </button>
                    <button
                      onClick={() => setMarginSpacing('relaxed')}
                      className={`py-1.5 px-2 rounded text-xs font-semibold border transition-all ${
                        marginSpacing === 'relaxed'
                          ? 'border-[#B87333] bg-[#B87333]/10 text-[#1b1c19]'
                          : 'border-[#E5E1D8] text-[#76777d]'
                      }`}
                    >
                      Relaxed (24mm)
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: PRODUCT & LINE ITEM TABLE */}
            {activeTab === 'table' && (
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#E5E1D8]">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#1b1c19]">
                      Line Item Table Styling
                    </span>
                    <span className="text-[11px] text-[#76777d]">
                      Format Bill of Quantities presentation and column visibility.
                    </span>
                  </div>
                  <Layers className="w-4 h-4 text-[#B87333]" />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-[#1b1c19]">Table Aesthetic Style</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => setTableStyle('classic')}
                      className={`p-2.5 rounded-lg border text-left flex flex-col gap-1 transition-all ${
                        tableStyle === 'classic'
                          ? 'border-[#B87333] bg-[#B87333]/5 text-[#1b1c19]'
                          : 'border-[#E5E1D8] hover:bg-[#f5f3ee] text-[#45474c]'
                      }`}
                    >
                      <span className="text-xs font-bold">Classic Ledger</span>
                      <span className="text-[10px] text-[#76777d]">Subtle stripes &amp; clear rows</span>
                    </button>

                    <button
                      onClick={() => setTableStyle('industrial')}
                      className={`p-2.5 rounded-lg border text-left flex flex-col gap-1 transition-all ${
                        tableStyle === 'industrial'
                          ? 'border-[#B87333] bg-[#B87333]/5 text-[#1b1c19]'
                          : 'border-[#E5E1D8] hover:bg-[#f5f3ee] text-[#45474c]'
                      }`}
                    >
                      <span className="text-xs font-bold">Precision Grid</span>
                      <span className="text-[10px] text-[#76777d]">Full borders &amp; dense metrics</span>
                    </button>

                    <button
                      onClick={() => setTableStyle('minimal')}
                      className={`p-2.5 rounded-lg border text-left flex flex-col gap-1 transition-all ${
                        tableStyle === 'minimal'
                          ? 'border-[#B87333] bg-[#B87333]/5 text-[#1b1c19]'
                          : 'border-[#E5E1D8] hover:bg-[#f5f3ee] text-[#45474c]'
                      }`}
                    >
                      <span className="text-xs font-bold">Minimal Clean</span>
                      <span className="text-[10px] text-[#76777d]">Hairline dividers only</span>
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-2 pt-2 border-t border-[#E5E1D8]">
                  <span className="text-xs font-bold text-[#1b1c19]">Column Visibility Controls</span>

                  <label className="flex items-center justify-between py-1 px-2.5 rounded bg-[#f5f3ee] cursor-pointer text-xs">
                    <div className="flex flex-col">
                      <span className="font-semibold text-[#1b1c19]">HSN / SAC Code Column</span>
                      <span className="text-[10px] text-[#76777d]">GST compliance classification code</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={showHsn}
                      onChange={(e) => setShowHsn(e.target.checked)}
                      className="rounded border-[#c6c6cd] text-[#B87333] focus:ring-[#B87333]"
                    />
                  </label>

                  <label className="flex items-center justify-between py-1 px-2.5 rounded bg-[#f5f3ee] cursor-pointer text-xs">
                    <div className="flex flex-col">
                      <span className="font-semibold text-[#1b1c19]">Unit Rate Column</span>
                      <span className="text-[10px] text-[#76777d]">Display calculated unit rate</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={showUnitRate}
                      onChange={(e) => setShowUnitRate(e.target.checked)}
                      className="rounded border-[#c6c6cd] text-[#B87333] focus:ring-[#B87333]"
                    />
                  </label>
                </div>
              </div>
            )}

            {/* TAB 4: COMMERCIAL TERMS & CONDITIONS */}
            {activeTab === 'terms' && (
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#E5E1D8]">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#1b1c19]">
                      Standard Commercial Conditions
                    </span>
                    <span className="text-[11px] text-[#76777d]">
                      Incoterms, payment terms, and quality inspection protocols.
                    </span>
                  </div>
                  <label className="flex items-center gap-1.5 cursor-pointer text-xs text-[#45474c]">
                    <input
                      type="checkbox"
                      checked={showTerms}
                      onChange={(e) => setShowTerms(e.target.checked)}
                      className="rounded border-[#c6c6cd] text-[#B87333] focus:ring-[#B87333]"
                    />
                    <span>Show Terms</span>
                  </label>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-[#1b1c19]">Delivery Lead Time &amp; Terms</label>
                  <input
                    type="text"
                    value={deliveryTerms}
                    onChange={(e) => setDeliveryTerms(e.target.value)}
                    placeholder="e.g. Ex-Works Plant within 4-6 weeks"
                    className="px-3 py-2 rounded-lg border border-[#E5E1D8] bg-[#f5f3ee] text-xs text-[#1b1c19] focus:outline-none focus:border-[#B87333]"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-[#1b1c19]">Payment Terms Schedule</label>
                  <input
                    type="text"
                    value={paymentTerms}
                    onChange={(e) => setPaymentTerms(e.target.value)}
                    placeholder="e.g. 30 Days Net from date of dispatch"
                    className="px-3 py-2 rounded-lg border border-[#E5E1D8] bg-[#f5f3ee] text-xs text-[#1b1c19] focus:outline-none focus:border-[#B87333]"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-[#1b1c19]">Inspection &amp; Quality Standard</label>
                  <textarea
                    rows={2}
                    value={inspectionTerms}
                    onChange={(e) => setInspectionTerms(e.target.value)}
                    placeholder="e.g. Pre-dispatch inspection at manufacturer works"
                    className="px-3 py-2 rounded-lg border border-[#E5E1D8] bg-[#f5f3ee] text-xs text-[#1b1c19] focus:outline-none focus:border-[#B87333] resize-none"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-[#1b1c19]">Commercial Notes / Disclaimers</label>
                  <textarea
                    rows={2}
                    value={commercialNotes}
                    onChange={(e) => setCommercialNotes(e.target.value)}
                    placeholder="General commercial conditions"
                    className="px-3 py-2 rounded-lg border border-[#E5E1D8] bg-[#f5f3ee] text-xs text-[#1b1c19] focus:outline-none focus:border-[#B87333] resize-none"
                  />
                </div>
              </div>
            )}

            {/* TAB 5: SIGNATORY, BANK & REMITTANCE */}
            {activeTab === 'signatory' && (
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#E5E1D8]">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#1b1c19]">
                      Authorisation &amp; Remittance Details
                    </span>
                    <span className="text-[11px] text-[#76777d]">
                      Signatory seals, bank remittance info, and document footer.
                    </span>
                  </div>
                  <ShieldCheck className="w-4 h-4 text-[#B87333]" />
                </div>

                {/* Signatory Details */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-[#1b1c19]">Authorised Signatory Authority</label>
                    <label className="flex items-center gap-1.5 cursor-pointer text-xs text-[#45474c]">
                      <input
                        type="checkbox"
                        checked={showSignature}
                        onChange={(e) => setShowSignature(e.target.checked)}
                        className="rounded border-[#c6c6cd] text-[#B87333] focus:ring-[#B87333]"
                      />
                      <span>Show Seal Block</span>
                    </label>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-semibold text-[#76777d]">Signatory Name</label>
                      <input
                        type="text"
                        value={signatoryName}
                        onChange={(e) => setSignatoryName(e.target.value)}
                        placeholder="Authorised Signatory"
                        className="px-3 py-2 rounded-lg border border-[#E5E1D8] bg-[#f5f3ee] text-xs font-semibold text-[#1b1c19] focus:outline-none focus:border-[#B87333]"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-semibold text-[#76777d]">Designation / Title</label>
                      <input
                        type="text"
                        value={signatoryDesignation}
                        onChange={(e) => setSignatoryDesignation(e.target.value)}
                        className="px-3 py-2 rounded-lg border border-[#E5E1D8] bg-[#f5f3ee] text-xs text-[#1b1c19] focus:outline-none focus:border-[#B87333]"
                      />
                    </div>
                  </div>
                </div>

                {/* Bank Remittance Info Toggle */}
                <div className="flex flex-col gap-2 pt-2 border-t border-[#E5E1D8]">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#1b1c19]">Bank Remittance Details</span>
                    <label className="flex items-center gap-1.5 cursor-pointer text-xs text-[#45474c]">
                      <input
                        type="checkbox"
                        checked={showBankDetails}
                        onChange={(e) => setShowBankDetails(e.target.checked)}
                        className="rounded border-[#c6c6cd] text-[#B87333] focus:ring-[#B87333]"
                      />
                      <span>Show Bank Info</span>
                    </label>
                  </div>

                  {showBankDetails && (
                    <div className="p-3 bg-[#f5f3ee] rounded-lg border border-[#E5E1D8] text-xs text-[#1b1c19] space-y-1 font-mono">
                      {bankDetails ? (
                        <>
                          <div>
                            <span className="text-[#76777d]">Bank:</span> {bankDetails.name}
                          </div>
                          {bankDetails.account && (
                            <div>
                              <span className="text-[#76777d]">A/C No:</span> {bankDetails.account}
                            </div>
                          )}
                          {bankDetails.ifsc && (
                            <div>
                              <span className="text-[#76777d]">IFSC:</span> {bankDetails.ifsc}
                            </div>
                          )}
                          {bankDetails.branch && (
                            <div>
                              <span className="text-[#76777d]">Branch:</span> {bankDetails.branch}
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="text-[#76777d] italic">
                          Bank remittance details not yet configured in company settings.
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Footer Telemetry */}
                <div className="flex flex-col gap-2 pt-2 border-t border-[#E5E1D8]">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#1b1c19]">Footer Legal Notice</span>
                    <label className="flex items-center gap-1.5 cursor-pointer text-xs text-[#45474c]">
                      <input
                        type="checkbox"
                        checked={showFooter}
                        onChange={(e) => setShowFooter(e.target.checked)}
                        className="rounded border-[#c6c6cd] text-[#B87333] focus:ring-[#B87333]"
                      />
                      <span>Show Footer</span>
                    </label>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-semibold text-[#76777d]">Footer Disclaimer</label>
                    <textarea
                      rows={2}
                      value={footerText}
                      onChange={(e) => setFooterText(e.target.value)}
                      className="px-3 py-2 rounded-lg border border-[#E5E1D8] bg-[#f5f3ee] text-xs text-[#1b1c19] focus:outline-none focus:border-[#B87333] resize-none"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ============================================================== */}
        {/* RIGHT COLUMN: REALISTIC DIN A4 DOCUMENT CANVAS SHEET (7 COLS)   */}
        {/* ============================================================== */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          {/* Canvas Controls Top Bar */}
          <div className="flex items-center justify-between px-4 py-2.5 bg-white rounded-xl border border-[#E5E1D8] shadow-xs">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#76777d]">
                Live Sheet Render
              </span>
              <span className="px-2 py-0.5 rounded bg-[#f0eee9] text-[#1b1c19] font-mono text-xs font-semibold">
                DIN A4 (Portrait)
              </span>
              <span className="text-xs text-[#76777d] hidden sm:inline">| {zoomLevel}% Scale</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setZoomLevel((z) => Math.max(z - 10, 70))}
                className="p-1.5 rounded hover:bg-[#f5f3ee] text-[#76777d] transition-colors"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                onClick={() => setZoomLevel(100)}
                className="px-2 py-1 rounded text-[11px] font-semibold hover:bg-[#f5f3ee] text-[#1b1c19] transition-colors"
                title="Reset Zoom"
              >
                100%
              </button>
              <button
                onClick={() => setZoomLevel((z) => Math.min(z + 10, 130))}
                className="p-1.5 rounded hover:bg-[#f5f3ee] text-[#76777d] transition-colors"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <div className="w-[1px] h-4 bg-[#E5E1D8] mx-1" />
              <button
                onClick={handleDownloadPdf}
                disabled={isDownloadingPdf || !quote}
                className="px-3 py-1.5 rounded bg-[#f5f3ee] hover:bg-[#eae8e3] text-[#1b1c19] text-xs font-semibold transition-colors flex items-center gap-1.5 border border-[#E5E1D8] disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5 text-[#B87333]" />
                <span className="hidden sm:inline">Export PDF</span>
              </button>
            </div>
          </div>

          {/* REALISTIC DIN A4 DOCUMENT SHEET CONTAINER */}
          {loading ? (
            <div className="w-full bg-white rounded-xl shadow-xl border border-[#E5E1D8] p-16 flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 border-2 border-[#172033] border-t-[#B87333] rounded-full animate-spin" />
              <span className="text-xs font-mono text-[#76777d] uppercase tracking-wider">
                Loading Quotation Dossier...
              </span>
            </div>
          ) : !quote ? (
            /* Clean Empty State when No Quotations Exist */
            <div className="w-full bg-white rounded-xl shadow-xl border border-[#E5E1D8] p-12 flex flex-col items-center justify-center text-center gap-4">
              <div className="w-14 h-14 rounded-full bg-[#B87333]/10 text-[#B87333] flex items-center justify-center">
                <FileText className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#1b1c19]">No Quotation Selected</h3>
                <p className="text-xs text-[#76777d] mt-1 max-w-md">
                  Select an existing quotation from the dossier selector above, or create a new quotation by
                  uploading a customer Purchase Order.
                </p>
              </div>
              <div className="flex gap-3 mt-2">
                <Button onClick={() => navigate('/upload')}>Upload Purchase Order</Button>
                <Button variant="outline" onClick={() => navigate('/quotations')}>
                  View Quotation History
                </Button>
              </div>
            </div>
          ) : (
            <div
              className="w-full bg-white rounded-xl shadow-xl border border-[#E5E1D8] transition-all duration-300 relative overflow-hidden"
              style={{
                padding: marginSpacing === 'compact' ? '28px' : marginSpacing === 'relaxed' ? '48px' : '36px',
                fontFamily: fontFamily === 'Roboto Mono' ? 'monospace' : 'Inter, sans-serif'
              }}
            >
              {/* Top Accent Strip */}
              <div
                className="absolute top-0 left-0 right-0 h-2 transition-all duration-300"
                style={{
                  background: `linear-gradient(90deg, ${secondaryColor} 0%, ${accentColor} 50%, ${accentColor}cc 100%)`
                }}
              />

              {/* Optional Diagonal Watermark */}
              {showWatermark && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-10 overflow-hidden">
                  <span className="text-7xl sm:text-8xl font-black text-[#172033]/[0.04] uppercase -rotate-45 tracking-widest whitespace-nowrap">
                    {watermarkText}
                  </span>
                </div>
              )}

              {/* 1. DOCUMENT HEADER SECTION */}
              <header
                className={`pb-5 mb-5 border-b border-[#E5E1D8] ${
                  headerStyle === 'centered'
                    ? 'flex flex-col items-center text-center gap-3'
                    : headerStyle === 'compact'
                    ? 'flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#f5f3ee]/60 p-3.5 rounded-lg'
                    : 'flex flex-col sm:flex-row sm:items-start justify-between gap-4'
                }`}
              >
                {/* Left / Center Company Branding */}
                <div
                  className={`flex ${
                    headerStyle === 'centered'
                      ? 'flex-col items-center text-center'
                      : 'flex-col sm:flex-row items-start'
                  } gap-3.5`}
                >
                  {showLogo && (
                    <div className="shrink-0 flex items-center">
                      <CompanyLogo
                        variant="preview"
                        position={logoPosition}
                        maxHeight="44px"
                        maxWidth="140px"
                        showPlaceholderIfEmpty={false}
                      />
                    </div>
                  )}

                  <div className={`flex flex-col ${headerStyle === 'centered' ? 'items-center text-center' : ''}`}>
                    <span className="font-bold text-lg text-[#172033] leading-tight tracking-tight">
                      {companyName || quote.company_name || company?.name || 'Company Name'}
                    </span>
                    <span className="text-xs text-[#45474c] mt-0.5 leading-snug max-w-md">
                      {companyAddress || quote.company_address || company?.address || ''}
                    </span>

                    {showCompanyContact && (
                      <div
                        className={`flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-[#76777d] mt-1 ${
                          headerStyle === 'centered' ? 'justify-center' : ''
                        }`}
                      >
                        {showGstin && (companyGstin || quote.company_gstin || company?.gstin) && (
                          <span className="font-mono font-semibold text-[#1b1c19]">
                            GSTIN: {companyGstin || quote.company_gstin || company?.gstin}
                          </span>
                        )}
                        {(companyPhone || quote.company_phone) && (
                          <span>Tel: {companyPhone || quote.company_phone}</span>
                        )}
                        {(companyEmail || quote.company_email) && (
                          <span>Email: {companyEmail || quote.company_email}</span>
                        )}
                        {companyWebsite && <span>Web: {companyWebsite}</span>}
                      </div>
                    )}
                  </div>
                </div>

                {/* Document Reference Box */}
                <div
                  className={`flex flex-col ${
                    headerStyle === 'centered'
                      ? 'items-center text-center pt-2'
                      : 'sm:items-end text-left sm:text-right'
                  }`}
                >
                  <span
                    className="text-[11px] uppercase tracking-wider font-bold px-2.5 py-0.5 rounded inline-block"
                    style={{
                      backgroundColor: `${accentColor}18`,
                      color: accentColor
                    }}
                  >
                    {docTitle}
                  </span>

                  <div className="mt-1.5 flex flex-col">
                    {showQuoteNumber && (
                      <span className="text-lg font-bold font-mono text-[#1b1c19] tracking-tight">
                        {quote.quotation_number}
                      </span>
                    )}
                    {showQuoteDate && (
                      <span className="text-xs text-[#45474c]">
                        Date:{' '}
                        <strong className="text-[#1b1c19]">
                          {new Date(quote.quotation_date).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </strong>
                      </span>
                    )}
                    {showValidUntil && (
                      <span className="text-xs text-[#76777d]">
                        Valid Until:{' '}
                        <strong>
                          {quote.valid_until
                            ? new Date(quote.valid_until).toLocaleDateString('en-IN', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric'
                              })
                            : '30 Days Net'}
                        </strong>
                      </span>
                    )}
                  </div>
                </div>
              </header>

              {/* 2. CUSTOMER INFORMATION & LOGISTICAL BENTO */}
              <section className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
                {/* Consignee Card */}
                <div className="p-4 rounded-lg bg-[#f5f3ee] flex flex-col gap-1 border border-[#E5E1D8]">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#76777d]">
                    <Building2 className="w-3.5 h-3.5 text-[#B87333]" />
                    <span>Billed &amp; Shipped To</span>
                  </div>
                  <span className="font-bold text-sm text-[#1b1c19]">
                    {quote.customer_name || 'Customer'}
                  </span>
                  <p className="text-xs text-[#45474c] leading-snug mt-0.5">
                    {quote.customer_address || 'Address provided on Purchase Order'}
                  </p>
                  <div className="mt-2 pt-2 border-t border-[#E5E1D8] flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#45474c]">
                    {quote.customer_gstin && (
                      <span>
                        GSTIN: <strong className="text-[#1b1c19] font-mono">{quote.customer_gstin}</strong>
                      </span>
                    )}
                    {showBuyerRef && quote.po_number && (
                      <span>
                        Buyer PO: <strong className="text-[#1b1c19] font-mono">{quote.po_number}</strong>
                      </span>
                    )}
                  </div>
                </div>

                {/* Fulfillment & Commercial Terms */}
                <div className="p-4 rounded-lg bg-[#f5f3ee] flex flex-col gap-1 border border-[#E5E1D8]">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#76777d]">
                    <Truck className="w-3.5 h-3.5 text-[#B87333]" />
                    <span>Fulfillment &amp; Commercial Terms</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-1 text-xs">
                    <div>
                      <span className="text-[10px] text-[#76777d] block font-semibold">Lead Time:</span>
                      <span className="font-semibold text-[#1b1c19]">
                        {deliveryTerms || 'Standard Dispatch Schedule'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#76777d] block font-semibold">Payment Terms:</span>
                      <span className="font-semibold text-[#3F7D5A]">{paymentTerms || 'As Specified'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#76777d] block font-semibold">Currency:</span>
                      <span className="font-semibold text-[#1b1c19]">{quote.currency || 'INR (₹)'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#76777d] block font-semibold">Inspection:</span>
                      <span className="font-semibold text-[#1b1c19] truncate block">
                        {inspectionTerms || 'Standard Works Inspection'}
                      </span>
                    </div>
                  </div>
                </div>
              </section>

              {/* 3. PRODUCT / LINE ITEM TABLE */}
              <section className="overflow-x-auto mb-5">
                <table
                  className={`w-full text-left text-xs border-collapse ${
                    tableStyle === 'industrial' ? 'border border-[#E5E1D8]' : ''
                  }`}
                >
                  <thead>
                    <tr
                      className="text-white uppercase font-bold text-[11px] tracking-wider"
                      style={{ backgroundColor: secondaryColor }}
                    >
                      <th className="py-2.5 px-3 w-10 text-center">#</th>
                      <th className="py-2.5 px-3">Part Description &amp; Specification</th>
                      {showHsn && <th className="py-2.5 px-3 text-center">HSN</th>}
                      <th className="py-2.5 px-3 text-right">Qty</th>
                      {showUnitRate && <th className="py-2.5 px-3 text-right">Unit Rate</th>}
                      <th className="py-2.5 px-3 text-right">Net Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E1D8] text-[#1b1c19]">
                    {displayItems.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-xs text-[#76777d]">
                          No line items found in this quotation.
                        </td>
                      </tr>
                    ) : (
                      displayItems.map((it, idx) => (
                        <tr
                          key={it.id || idx}
                          className={`transition-colors ${
                            tableStyle === 'classic' && idx % 2 === 1
                              ? 'bg-[#f5f3ee]/50'
                              : tableStyle === 'industrial'
                              ? 'hover:bg-[#f5f3ee]'
                              : 'hover:bg-[#fbf9f4]'
                          }`}
                        >
                          <td className="py-2.5 px-3 text-center font-mono font-bold text-[#76777d]">
                            {String(it.item_number || idx + 1).padStart(2, '0')}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="font-bold text-[#1b1c19] block">{it.part_name}</span>
                            <span className="text-[11px] text-[#76777d] mt-0.5 block">
                              {it.specification ||
                                (it.material
                                  ? `Material: ${it.material} | Process: ${it.process || 'Machined'}`
                                  : 'Engineered Component')}
                            </span>
                          </td>
                          {showHsn && (
                            <td className="py-2.5 px-3 text-center font-mono text-[#76777d]">
                              {it.hsn_code || '—'}
                            </td>
                          )}
                          <td className="py-2.5 px-3 text-right font-mono font-semibold text-[#1b1c19]">
                            {it.quantity} {it.unit || 'Nos'}
                          </td>
                          {showUnitRate && (
                            <td className="py-2.5 px-3 text-right font-mono text-[#45474c]">
                              <TabularNumber value={it.unit_price ?? it.unit_cost ?? 0} decimals={2} />
                            </td>
                          )}
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-[#1b1c19]">
                            <TabularNumber value={it.total_price ?? it.subtotal ?? 0} decimals={2} />
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </section>

              {/* 4. CALCULATION & FINANCIAL SUMMARY BENTO */}
              {financialTotals && (
                <section className="flex flex-col sm:flex-row justify-between items-start gap-5 p-4 rounded-lg bg-[#f5f3ee] border border-[#E5E1D8] mb-5">
                  <div className="flex-1 flex flex-col gap-2">
                    {financialTotals.amountInWords && (
                      <>
                        <span className="text-[10px] uppercase font-bold text-[#76777d] tracking-wider">
                          Amount Chargeable in Words
                        </span>
                        <p className="text-xs font-semibold text-[#1b1c19] italic leading-snug bg-white p-3 rounded-md border border-[#E5E1D8]">
                          "{financialTotals.amountInWords}"
                        </p>
                      </>
                    )}

                    {showBankDetails && bankDetails && (
                      <div className="mt-1 flex items-center gap-2 text-xs text-[#45474c] bg-white/70 px-3 py-1.5 rounded border border-[#E5E1D8]">
                        <CreditCard className="w-3.5 h-3.5 text-[#B87333] shrink-0" />
                        <span className="truncate">
                          <strong>Remittance:</strong> {bankDetails.name}
                          {bankDetails.account ? ` • A/C: ${bankDetails.account}` : ''}
                          {bankDetails.ifsc ? ` • IFSC: ${bankDetails.ifsc}` : ''}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Total Calculation Matrix (Matches Backend Calculation Source of Truth Exactly) */}
                  <div className="w-full sm:w-72 flex flex-col gap-1.5 text-xs">
                    <div className="flex justify-between text-[#45474c]">
                      <span>Taxable Subtotal:</span>
                      <span className="font-mono font-semibold text-[#1b1c19]">
                        <TabularNumber value={financialTotals.subtotal} decimals={2} />
                      </span>
                    </div>

                    {financialTotals.isIgst ? (
                      <div className="flex justify-between text-[#45474c]">
                        <span>IGST ({financialTotals.igstRate}%):</span>
                        <span className="font-mono">
                          <TabularNumber value={financialTotals.igstAmount} decimals={2} />
                        </span>
                      </div>
                    ) : (
                      <>
                        <div className="flex justify-between text-[#45474c]">
                          <span>CGST ({financialTotals.cgstRate}%):</span>
                          <span className="font-mono">
                            <TabularNumber value={financialTotals.cgstAmount} decimals={2} />
                          </span>
                        </div>
                        <div className="flex justify-between text-[#45474c]">
                          <span>SGST ({financialTotals.sgstRate}%):</span>
                          <span className="font-mono">
                            <TabularNumber value={financialTotals.sgstAmount} decimals={2} />
                          </span>
                        </div>
                      </>
                    )}

                    <div className="flex justify-between text-[#76777d] pt-1 border-t border-[#E5E1D8]">
                      <span>Total GST:</span>
                      <span className="font-mono font-semibold text-[#45474c]">
                        <TabularNumber value={financialTotals.gstTotal} decimals={2} />
                      </span>
                    </div>

                    <div
                      className="p-3 rounded-lg flex justify-between items-baseline mt-1 shadow-xs"
                      style={{
                        backgroundColor: `${accentColor}12`,
                        border: `1px solid ${accentColor}30`
                      }}
                    >
                      <span className="font-bold text-xs uppercase" style={{ color: accentColor }}>
                        Grand Total:
                      </span>
                      <span className="text-lg font-bold font-mono" style={{ color: accentColor }}>
                        <TabularNumber value={financialTotals.grandTotal} decimals={2} />
                      </span>
                    </div>
                  </div>
                </section>
              )}

              {/* 5. COMMERCIAL CONDITIONS & SIGNATURE BLOCK */}
              <section className="grid grid-cols-1 md:grid-cols-12 gap-5 pt-2 mb-5">
                {/* Terms & Warranty */}
                <div className="md:col-span-8 flex flex-col gap-2">
                  {showTerms && (
                    <>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[#1b1c19]">
                        Standard Commercial Conditions
                      </span>
                      <ul className="flex flex-col gap-1.5 text-xs text-[#45474c]">
                        {deliveryTerms && (
                          <li className="flex items-start gap-1.5">
                            <Check className="w-3.5 h-3.5 text-[#B87333] shrink-0 mt-0.5" />
                            <span>
                              <strong>Delivery:</strong> {deliveryTerms}
                            </span>
                          </li>
                        )}
                        {paymentTerms && (
                          <li className="flex items-start gap-1.5">
                            <Check className="w-3.5 h-3.5 text-[#B87333] shrink-0 mt-0.5" />
                            <span>
                              <strong>Payment Terms:</strong> {paymentTerms}
                            </span>
                          </li>
                        )}
                        {inspectionTerms && (
                          <li className="flex items-start gap-1.5">
                            <Check className="w-3.5 h-3.5 text-[#B87333] shrink-0 mt-0.5" />
                            <span>
                              <strong>Inspection &amp; Quality:</strong> {inspectionTerms}
                            </span>
                          </li>
                        )}
                        {commercialNotes && (
                          <li className="flex items-start gap-1.5">
                            <Check className="w-3.5 h-3.5 text-[#B87333] shrink-0 mt-0.5" />
                            <span>
                              <strong>Notes:</strong> {commercialNotes}
                            </span>
                          </li>
                        )}
                      </ul>
                    </>
                  )}
                </div>

                {/* Digital Seal / Cryptographic Integrity Stamp */}
                <div className="md:col-span-4 flex flex-col justify-end items-end text-right">
                  {showSignature && (
                    <div className="flex flex-col items-end gap-1.5 w-full">
                      {/* SHA Stamp */}
                      <div className="p-2 rounded bg-[#f5f3ee] flex items-center justify-end gap-2 w-full border border-[#E5E1D8]">
                        <div className="flex flex-col text-right">
                          <span className="text-[10px] font-bold text-[#1b1c19] flex items-center justify-end gap-1">
                            <ShieldCheck className="w-3 h-3 text-[#3F7D5A]" />
                            SHA-256 Verifiable
                          </span>
                          <span className="text-[10px] font-mono text-[#76777d] truncate max-w-[140px]">
                            {quote.pdf_sha256
                              ? `${quote.pdf_sha256.slice(0, 14)}...`
                              : 'Generated on Finalization'}
                          </span>
                        </div>
                        <div className="w-7 h-7 bg-white rounded border border-[#E5E1D8] flex items-center justify-center p-0.5 shrink-0">
                          <Shield className="w-4 h-4 text-[#B87333]" />
                        </div>
                      </div>

                      <div className="flex flex-col items-end pt-1">
                        <span className="font-bold text-xs text-[#1b1c19]">
                          {signatoryName || quote.authorized_signatory || 'Authorised Signatory'}
                        </span>
                        <span className="text-[10px] text-[#76777d]">{signatoryDesignation}</span>
                        <span className="text-[10px] font-semibold text-[#172033]">
                          For {companyName || quote.company_name || 'ORYNZA'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </section>

              {/* 6. DOCUMENT FOOTER */}
              {showFooter && (
                <footer className="pt-3 border-t border-[#E5E1D8] flex flex-col sm:flex-row justify-between items-center text-[10px] text-[#76777d] gap-2">
                  <span>{footerText}</span>
                  <span className="font-mono">Page 1 of 1 • System Authenticated</span>
                </footer>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuotationTemplatePage;
