import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Download,
  ArrowLeft,
  Edit3,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  FileText,
  Building2,
  Calendar,
  CreditCard,
  Truck,
  Printer,
  Mail,
  Check,
  Send,
  ExternalLink,
  Shield,
  FileCheck,
  RefreshCw,
  Lock,
  Palette,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { TabularNumber } from '../components/common/TabularNumber';
import { quotationApi, QuotationDTO } from '../api/quotationApi';
import { useAuth } from '../context/AuthContext';
import { CompanyLogo } from '../components/common/CompanyLogo';
import { useCompanySettings } from '../hooks/useCompanySettings';

export const QuotationPreviewPage: React.FC = () => {
  const navigate = useNavigate();
  const { quoteId } = useParams<{ quoteId?: string }>();
  const { company } = useAuth();
  const { settings } = useCompanySettings();

  const [quote, setQuote] = useState<QuotationDTO | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState<boolean>(false);
  const [isFinalizing, setIsFinalizing] = useState<boolean>(false);

  // Email Dispatch Modal state
  const [isEmailModalOpen, setIsEmailModalOpen] = useState<boolean>(false);
  const [isSendingEmail, setIsSendingEmail] = useState<boolean>(false);

  // Edit Metadata Modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [isSavingTerms, setIsSavingTerms] = useState<boolean>(false);

  const [editForm, setEditForm] = useState({
    valid_until: '',
    payment_terms: '',
    delivery_terms: '',
    inspection_terms: '',
    notes: '',
    prepared_by: '',
    authorized_signatory: '',
  });

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
  };

  const loadQuotation = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);

    try {
      const data = await quotationApi.get(id);

      setQuote(data);

      setEditForm({
        valid_until: data.valid_until ? data.valid_until.split('T')[0] : '',
        payment_terms: data.payment_terms || '',
        delivery_terms: data.delivery_terms || '',
        inspection_terms: data.inspection_terms || '',
        notes: data.notes || '',
        prepared_by: data.prepared_by || 'Operations Engineer',
        authorized_signatory:
          data.authorized_signatory || 'Commercial Director',
      });
    } catch (err: any) {
      setError(
        err.response?.data?.detail ||
          err.message ||
          'Failed to load quotation.'
      );
      setQuote(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (quoteId) {
      loadQuotation(quoteId);
    } else {
      setLoading(true);

      quotationApi
        .listPaginated({ page: 1, page_size: 1 })
        .then((data) => {
          if (data && data.items && data.items.length > 0) {
            loadQuotation(data.items[0].id);
          } else {
            setLoading(false);
            setQuote(null);
          }
        })
        .catch((err) => {
          setError(
            err.response?.data?.detail ||
              err.message ||
              'Failed to fetch quotations.'
          );
          setLoading(false);
          setQuote(null);
        });
    }
  }, [quoteId, loadQuotation]);

  const handleDownloadPdf = async () => {
    if (!quote) return;

    setIsDownloadingPdf(true);

    try {
      await quotationApi.downloadPdf(
        quote.id,
        quote.quotation_number
      );

      showToast(
        `Quotation PDF downloaded: ${quote.quotation_number}.pdf`
      );
    } catch (err: any) {
      showToast(
        `PDF download failed: ${
          err.response?.data?.detail || err.message
        }`
      );
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const handleFinalize = async () => {
    if (!quote) return;

    setIsFinalizing(true);

    try {
      const finalized = await quotationApi.finalize(quote.id);

      setQuote(finalized);

      showToast(
        `Quotation ${finalized.quotation_number} finalized successfully! PDF is now immutable.`
      );
    } catch (err: any) {
      showToast(
        `Finalization failed: ${
          err.response?.data?.detail || err.message
        }`
      );
    } finally {
      setIsFinalizing(false);
    }
  };

  const handleSendEmail = async () => {
    if (!quote) return;

    if (quote.status === 'DRAFT') {
      showToast(
        'Quotation must be finalized before official customer dispatch.'
      );
      return;
    }

    setIsSendingEmail(true);

    try {
      const res = await quotationApi.sendEmail(quote.id);

      setIsEmailModalOpen(false);

      showToast(
        `Quotation official PDF successfully emailed to: ${
          res.recipient ||
          quote.customer_email ||
          'customer'
        }`
      );

      loadQuotation(quote.id);
    } catch (err: any) {
      showToast(
        `Email transmission failed: ${
          err.response?.data?.detail || err.message
        }`
      );
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleSaveTerms = async () => {
    if (!quote) return;

    if (quote.status === 'FINAL') {
      showToast(
        'Finalized quotations are immutable and terms cannot be modified.'
      );
      setIsEditModalOpen(false);
      return;
    }

    setIsSavingTerms(true);

    try {
      const updated = await quotationApi.update(quote.id, {
        payment_terms: editForm.payment_terms,
        delivery_terms: editForm.delivery_terms,
        inspection_terms: editForm.inspection_terms,
        notes: editForm.notes,
        prepared_by: editForm.prepared_by,
        authorized_signatory: editForm.authorized_signatory,
      });

      setQuote(updated);
      setIsEditModalOpen(false);

      showToast('Quotation commercial terms updated.');
    } catch (err: any) {
      showToast(
        `Failed to update terms: ${
          err.response?.data?.detail || err.message
        }`
      );
    } finally {
      setIsSavingTerms(false);
    }
  };

  return (
    <div className="w-full bg-[#f8fafc] p-6 md:p-8 font-sans antialiased text-slate-900 min-h-screen">

      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-16 right-8 z-50 bg-slate-900 text-white text-xs font-medium py-2.5 px-4 rounded-lg shadow-xl border border-white/20 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      <div className="max-w-[1180px] w-full mx-auto pb-16 flex flex-col gap-6">

        {/* MASTER WORKFLOW STEPPER */}
        <div className="w-full bg-white rounded-2xl shadow-xs border border-slate-200/90 px-6 py-4">
          <div className="grid grid-cols-5 items-center relative">

            <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-0.5 bg-slate-100 -z-0 mx-10" />

            <div className="absolute left-10 w-3/4 top-1/2 -translate-y-1/2 h-0.5 bg-[#2563EB] -z-0" />

            {/* Step 1 */}
            <div
              onClick={() => navigate('/upload')}
              className="relative z-10 flex items-center gap-3 cursor-pointer group"
            >
              <div className="w-8 h-8 rounded-full bg-[#2563EB] text-white flex items-center justify-center font-semibold text-xs shadow-xs">
                <Check className="w-4 h-4" />
              </div>

              <div className="flex items-center gap-1">
                <span className="text-[11px] uppercase tracking-wider text-[#2563EB] font-semibold">
                  01
                </span>
                <span className="text-sm font-semibold text-slate-800 group-hover:text-[#2563EB] transition-colors">
                  Upload
                </span>
              </div>
            </div>

            {/* Step 2 */}
            <div
              onClick={() => navigate('/review')}
              className="relative z-10 flex items-center gap-3 justify-center cursor-pointer group"
            >
              <div className="w-8 h-8 rounded-full bg-[#2563EB] text-white flex items-center justify-center font-semibold text-xs shadow-xs">
                <Check className="w-4 h-4" />
              </div>

              <div className="flex items-center gap-1">
                <span className="text-[11px] uppercase tracking-wider text-[#2563EB] font-semibold">
                  02
                </span>
                <span className="text-sm font-semibold text-slate-800 group-hover:text-[#2563EB] transition-colors">
                  Review
                </span>
              </div>
            </div>

            {/* Step 3 */}
            <div
              onClick={() => navigate('/calculation')}
              className="relative z-10 flex items-center gap-3 justify-center cursor-pointer group"
            >
              <div className="w-8 h-8 rounded-full bg-[#2563EB] text-white flex items-center justify-center font-semibold text-xs shadow-xs">
                <Check className="w-4 h-4" />
              </div>

              <div className="flex items-center gap-1">
                <span className="text-[11px] uppercase tracking-wider text-[#2563EB] font-semibold">
                  03
                </span>
                <span className="text-sm font-semibold text-slate-800 group-hover:text-[#2563EB] transition-colors">
                  Costing
                </span>
              </div>
            </div>

            {/* Step 4 */}
            <div className="relative z-10 flex items-center gap-3 justify-center">
              <div className="w-9 h-9 rounded-full bg-[#2563EB] text-white flex items-center justify-center shadow-xs ring-4 ring-[#2563EB]/20">
                <FileCheck className="w-4 h-4" />
              </div>

              <div className="flex items-center gap-1">
                <span className="text-[11px] uppercase tracking-wider text-[#2563EB] font-bold">
                  04
                </span>
                <span className="text-sm font-bold text-slate-900">
                  Quotation
                </span>
              </div>
            </div>

            {/* Step 5 */}
            <div
              onClick={() => navigate('/quotations')}
              className="relative z-10 flex items-center gap-3 justify-end cursor-pointer group"
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-xs font-mono ${
                  quote?.email_status === 'SENT'
                    ? 'bg-[#3F7D5A] text-white'
                    : 'bg-[#f0eee9] text-[#76777d]'
                }`}
              >
                05
              </div>

              <div className="flex items-center gap-1">
                <span className="text-[11px] uppercase tracking-wider text-[#76777d] group-hover:text-[#1b1c19]">
                  History
                </span>
              </div>
            </div>

          </div>
        </div>

        {/* FEEDBACK BANNER */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-900 flex items-start justify-between gap-3 shadow-xs">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />

              <div>
                <h3 className="font-semibold text-sm">
                  Error Loading Quotation
                </h3>

                <p className="text-xs text-red-700 mt-0.5">
                  {error}
                </p>
              </div>
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={() => quoteId && loadQuotation(quoteId)}
            >
              Retry
            </Button>
          </div>
        )}

        {/* PAGE HEADER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">

          <div className="flex flex-col">

            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-semibold text-[#1b1c19] tracking-tight">
                Quotation Preview &amp; Output
              </h1>

              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                  quote?.status === 'FINAL'
                    ? 'bg-[#3F7D5A]/15 text-[#3F7D5A]'
                    : quote?.status === 'SENT'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-[#B7791F]/15 text-[#B7791F]'
                }`}
              >
                {quote?.status === 'FINAL'
                  ? 'FINALIZED (IMMUTABLE)'
                  : quote?.status === 'SENT'
                  ? 'DISPATCHED'
                  : 'DRAFT QUOTATION'}
              </span>
            </div>

            <p className="text-sm text-[#45474c] mt-0.5">
              Commercial quotation prepared from the approved costing and customer requirements.
            </p>
          </div>

          {quote && (
            <div className="flex items-center gap-3">

              <button
                onClick={() => navigate(`/templates/${quote.id}`)}
                className="px-3.5 py-2 bg-white text-[#1b1c19] rounded-lg text-xs font-medium border border-[#E5E1D8] hover:bg-[#f0eee9] transition-colors flex items-center gap-1.5 shadow-xs"
                title="Customize quotation template & styling"
              >
                <Palette className="w-3.5 h-3.5 text-[#B87333]" />
                <span>Customize Template</span>
              </button>

              {quote.status !== 'FINAL' && (
                <button
                  onClick={() => setIsEditModalOpen(true)}
                  className="px-3.5 py-2 bg-white text-slate-800 rounded-xl text-xs font-medium border border-slate-200 hover:bg-slate-50 transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                  <span>Edit Terms</span>
                </button>
              )}

              <button
                onClick={handleDownloadPdf}
                disabled={isDownloadingPdf}
                className="px-3.5 py-2 bg-white text-slate-800 rounded-xl text-xs font-medium border border-slate-200 hover:bg-slate-50 transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>
                  {isDownloadingPdf
                    ? 'Generating PDF...'
                    : 'Download PDF'}
                </span>
              </button>

            </div>
          )}
        </div>

        {/* CONTENT */}
        {loading ? (
          <div className="bg-white rounded-2xl p-16 border border-slate-200/90 flex flex-col items-center justify-center gap-3 shadow-xs">
            <RefreshCw className="w-8 h-8 text-[#2563EB] animate-spin" />
            <span className="text-sm font-medium text-slate-600">
              Loading official quotation dossier...
            </span>
          </div>
        ) : !quote ? (
          <div className="bg-white rounded-2xl p-12 border border-slate-200/90 flex flex-col items-center justify-center text-center gap-4 shadow-xs">

            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-[#2563EB] flex items-center justify-center">
              <FileText className="w-7 h-7" />
            </div>

            <div>
              <h3 className="text-lg font-semibold text-slate-900">
                No Quotation Available
              </h3>

              <p className="text-xs text-slate-500 mt-1 max-w-md">
                Select an existing quotation from history, or calculate a quotation from an approved customer Purchase Order.
              </p>
            </div>

            <div className="flex gap-3 mt-2">
              <Button onClick={() => navigate('/quotations')}>
                View Quotation History
              </Button>

              <Button
                variant="outline"
                onClick={() => navigate('/upload')}
              >
                Upload Purchase Order
              </Button>
            </div>

          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

            {/* PRIMARY QUOTATION */}
            <div className="lg:col-span-8 flex flex-col gap-5">

              <div className="bg-white rounded-2xl shadow-xs border border-slate-200/90 p-6 sm:p-8 flex flex-col gap-6">

                {/* CORPORATE HEADER */}
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-6 border-b border-slate-200">

                  <div className="flex items-center gap-4">

                    {settings?.template?.show_logo !== false && (
                      <CompanyLogo
                        variant="preview"
                        position={
                          settings?.template?.logo_position || 'left'
                        }
                        showPlaceholderIfEmpty={false}
                        maxHeight="52px"
                        maxWidth="140px"
                      />
                    )}

                    <div className="flex flex-col">

                      <div className="flex items-center gap-2">
                        <span className="font-serif font-black text-2xl tracking-wider text-slate-900">
                          {quote.company_name ||
                            company?.name ||
                            'Company Name'}
                        </span>

                        <span className="text-[10px] uppercase font-bold tracking-widest bg-slate-900 text-white px-2 py-0.5 rounded">
                          Manufacturing
                        </span>
                      </div>

                      <span className="text-xs text-slate-600 font-medium mt-1">
                        {quote.company_legal_name ||
                          quote.company_name ||
                          company?.legalName ||
                          company?.name ||
                          ''}
                      </span>

                      <span className="text-xs text-slate-500">
                        {quote.company_address ||
                          company?.address ||
                          ''}
                      </span>

                      {(quote.company_gstin ||
                        company?.gstin) && (
                        <span className="text-[11px] text-slate-500 mt-1 font-mono">
                          GSTIN:{' '}
                          {quote.company_gstin ||
                            company?.gstin}
                        </span>
                      )}

                    </div>
                  </div>

                  <div className="flex flex-col sm:items-end text-left sm:text-right">

                    <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                      Commercial Quotation
                    </span>

                    <span className="text-xl font-bold font-mono text-slate-900">
                      {quote.quotation_number}
                    </span>

                    <div className="flex items-center gap-1 text-xs text-slate-600 mt-0.5">
                      <span>
                        Date:{' '}
                        <strong>
                          {new Date(
                            quote.quotation_date
                          ).toLocaleDateString(
                            'en-IN',
                            {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            }
                          )}
                        </strong>
                      </span>
                    </div>

                    <span className="text-xs text-slate-500 mt-0.5">
                      Validity:{' '}
                      {quote.valid_until
                        ? new Date(
                            quote.valid_until
                          ).toLocaleDateString(
                            'en-IN',
                            {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            }
                          )
                        : '30 Calendar Days'}
                    </span>

                  </div>
                </div>

                {/* METADATA */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200/80">

                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-semibold">
                      PO Reference
                    </span>

                    <div className="text-xs font-semibold text-slate-900 mt-0.5 font-mono">
                      {quote.po_number || '—'}
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-semibold">
                      Customer
                    </span>

                    <div className="text-xs font-semibold text-slate-900 mt-0.5 truncate">
                      {quote.customer_name || '—'}
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-semibold">
                      Delivery Protocol
                    </span>

                    <div className="text-xs font-semibold text-slate-900 mt-0.5">
                      {quote.delivery_terms || '—'}
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-semibold">
                      Payment Terms
                    </span>

                    <div className="text-xs font-semibold text-emerald-700 mt-0.5">
                      {quote.payment_terms || '—'}
                    </div>
                  </div>

                </div>

                {/* ADDRESSES */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                  <div className="p-4 rounded-xl bg-slate-50 flex flex-col gap-1 border border-slate-200/80">

                    <div className="flex items-center gap-1.5 text-slate-500 text-[11px] font-semibold uppercase">
                      <Building2 className="w-3.5 h-3.5 text-[#2563EB]" />
                      <span>Quotation Addressed To</span>
                    </div>

                    <span className="font-semibold text-sm text-slate-900">
                      {quote.customer_name || 'Customer'}
                    </span>

                    <p className="text-xs text-slate-600 leading-relaxed">
                      {quote.customer_address || '—'}
                    </p>

                    <span className="text-[11px] font-mono text-slate-500 mt-1">
                      {quote.customer_gstin
                        ? `GSTIN: ${quote.customer_gstin}`
                        : '—'}
                    </span>

                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 flex flex-col gap-1 border border-slate-200/80">

                    <div className="flex items-center gap-1.5 text-slate-500 text-[11px] font-semibold uppercase">
                      <Truck className="w-3.5 h-3.5 text-[#2563EB]" />
                      <span>Manufacturing &amp; Quality Requirements</span>
                    </div>

                    <span className="font-semibold text-sm text-slate-900">
                      Quality &amp; Inspection
                    </span>

                    <p className="text-xs text-slate-600 leading-relaxed">
                      {quote.inspection_terms ||
                        'Quality and inspection requirements as specified in the quotation.'}
                    </p>

                  </div>

                </div>

                {/* BILL OF QUANTITIES */}
                <div className="overflow-x-auto rounded-xl border border-slate-200">

                  <table className="w-full text-left text-xs border-collapse">

                    <thead className="bg-[#0B1328] text-white">
                      <tr>
                        <th className="py-2.5 px-3 font-semibold w-12 text-center">
                          Sr.
                        </th>

                        <th className="py-2.5 px-3 font-semibold">
                          Part Description &amp; Technical Spec
                        </th>

                        <th className="py-2.5 px-3 font-semibold text-center">
                          HSN
                        </th>

                        <th className="py-2.5 px-3 font-semibold text-right">
                          Qty
                        </th>

                        <th className="py-2.5 px-3 font-semibold text-right">
                          Unit Rate (₹)
                        </th>

                        <th className="py-2.5 px-3 font-semibold text-right">
                          Subtotal (₹)
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-200 bg-white">

                      {(quote.items || []).map((it, idx) => (
                        <tr
                          key={it.id || idx}
                          className="hover:bg-slate-50/80 transition-colors"
                        >
                          <td className="py-3 px-3 text-center font-mono font-bold text-slate-500">
                            {String(
                              it.item_number || idx + 1
                            ).padStart(2, '0')}
                          </td>

                          <td className="py-3 px-3">
                            <span className="font-semibold text-[#1b1c19] block">
                              {it.part_name}
                            </span>

                            <span className="text-[11px] text-[#76777d] mt-0.5 block">
                              {it.specification ||
                                it.material ||
                                'Engineered Component'}
                            </span>
                          </td>

                          <td className="py-3 px-3 text-center font-mono text-[#76777d]">
                            {it.hsn_code || '—'}
                          </td>

                          <td className="py-3 px-3 text-right font-mono font-medium text-[#1b1c19]">
                            {it.quantity} {it.unit || 'Nos'}
                          </td>

                          <td className="py-3 px-3 text-right font-mono text-[#1b1c19]">
                            <TabularNumber
                              value={
                                it.unit_price ||
                                it.unit_cost ||
                                0
                              }
                            />
                          </td>

                          <td className="py-3 px-3 text-right font-mono font-bold text-[#1b1c19]">
                            <TabularNumber
                              value={
                                it.total_price ||
                                it.subtotal ||
                                0
                              }
                            />
                          </td>
                        </tr>
                      ))}

                    </tbody>
                  </table>
                </div>

                {/* TOTALS */}
                <div className="flex flex-col sm:flex-row justify-between items-start gap-6 pt-2">

                  <div className="flex-1 flex flex-col gap-2">

                    <span className="text-[10px] uppercase font-bold text-[#76777d]">
                      Commercial Total In Words
                    </span>

                    <p className="text-xs italic font-medium text-slate-900 bg-slate-50 p-3 rounded-xl border border-slate-200">
                      "
                      {quote.final_total_in_words ||
                        quote.amount_in_words ||
                        'Verified Commercial Total'}
                      "
                    </p>

                    <div className="flex flex-col gap-1 text-[#45474c] text-xs pt-1">

                      <span className="font-semibold text-slate-900 uppercase text-[10px]">
                        Commercial Notes:
                      </span>

                      <p>
                        •{' '}
                        {quote.notes ||
                          'Components manufactured according to approved customer requirements and quotation terms.'}
                      </p>

                    </div>

                    {settings?.template?.show_bank_details !== false &&
                      (quote.bank_details?.bank_name ||
                        settings?.bank?.bank_name) && (
                        <div className="mt-2 flex items-center gap-2 text-xs text-[#45474c] bg-[#f5f3ee] p-2.5 rounded-lg border border-[#E5E1D8]">

                          <CreditCard className="w-3.5 h-3.5 text-[#B87333] shrink-0" />

                          <span>
                            <strong>Remittance:</strong>{' '}
                            {quote.bank_details?.bank_name ||
                              settings?.bank?.bank_name}

                            {(quote.bank_details?.bank_account ||
                              settings?.bank?.account_number) &&
                              ` • A/C: ${
                                quote.bank_details?.bank_account ||
                                settings?.bank?.account_number
                              }`}

                            {(quote.bank_details?.bank_ifsc ||
                              settings?.bank?.ifsc) &&
                              ` • IFSC: ${
                                quote.bank_details?.bank_ifsc ||
                                settings?.bank?.ifsc
                              }`}
                          </span>

                        </div>
                      )}

                  </div>

                  {/* TAX */}
                  <div className="w-full sm:w-80 bg-slate-50 p-4 rounded-xl flex flex-col gap-2 text-xs border border-slate-200">

                    <div className="flex justify-between items-center text-[#45474c]">

                      <span>Taxable Value (Ex-Works)</span>

                      <span className="font-mono text-[#1b1c19] font-bold">
                        <TabularNumber
                          value={
                            quote.taxable_amount ||
                            quote.subtotal ||
                            0
                          }
                        />
                      </span>

                    </div>

                    {quote.gst_type === 'IGST' ? (
                      <div className="flex justify-between items-center text-[#45474c]">

                        <div className="flex items-center gap-1">
                          <span>IGST</span>

                          <span className="text-[10px] text-[#76777d]">
                            (
                            {Number(
                              quote.igst_rate || 18
                            ).toFixed(1)}
                            %)
                          </span>
                        </div>

                        <span className="font-mono text-[#1b1c19]">
                          <TabularNumber
                            value={quote.igst_amount || 0}
                          />
                        </span>

                      </div>
                    ) : (
                      <>
                        <div className="flex justify-between items-center text-[#45474c]">

                          <div className="flex items-center gap-1">
                            <span>CGST</span>

                            <span className="text-[10px] text-[#76777d]">
                              (
                              {Number(
                                quote.cgst_rate || 9
                              ).toFixed(1)}
                              %)
                            </span>
                          </div>

                          <span className="font-mono text-[#1b1c19]">
                            <TabularNumber
                              value={
                                quote.cgst_amount || 0
                              }
                            />
                          </span>

                        </div>

                        <div className="flex justify-between items-center text-[#45474c]">

                          <div className="flex items-center gap-1">
                            <span>SGST</span>

                            <span className="text-[10px] text-[#76777d]">
                              (
                              {Number(
                                quote.sgst_rate || 9
                              ).toFixed(1)}
                              %)
                            </span>
                          </div>

                          <span className="font-mono text-[#1b1c19]">
                            <TabularNumber
                              value={
                                quote.sgst_amount || 0
                              }
                            />
                          </span>

                        </div>
                      </>
                    )}

                    <div className="pt-2 bg-white p-3 rounded-xl flex justify-between items-baseline border border-slate-200 shadow-xs">

                      <div className="flex flex-col">

                        <span
                          className="text-[10px] uppercase font-bold"
                          style={{
                            color:
                              settings?.template
                                ?.primary_color ||
                              '#2563EB',
                          }}
                        >
                          GRAND TOTAL (INR)
                        </span>

                        <span className="text-[10px] text-[#76777d]">
                          Inclusive of GST
                        </span>

                      </div>

                      <span className="text-lg font-bold text-slate-900 font-mono">
                        <TabularNumber
                          value={
                            quote.final_total ||
                            quote.grand_total ||
                            0
                          }
                        />
                      </span>

                    </div>

                  </div>
                </div>

                {/* SIGNATORY */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 bg-slate-50 p-4 rounded-xl border border-slate-200/80">

                  <div className="flex items-center gap-3">

                    <div className="w-12 h-12 rounded-xl bg-white p-1 flex items-center justify-center shadow-xs border border-slate-200">
                      <Shield className="w-6 h-6 text-[#2563EB]" />
                    </div>

                    <div className="flex flex-col">

                      <div className="flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />

                        <span className="text-[10px] font-bold uppercase text-slate-900">
                          {quote.status === 'FINAL'
                            ? 'Verified Legal Immutability'
                            : 'Deterministic Calculation Verified'}
                        </span>
                      </div>

                      <span className="font-mono text-xs text-slate-500 truncate max-w-[240px]">
                        {quote.pdf_sha256
                          ? `SHA256: ${quote.pdf_sha256.slice(
                              0,
                              16
                            )}...`
                          : 'Pending final authorization'}
                      </span>

                      <span className="text-[11px] text-slate-600">
                        {quote.finalized_at
                          ? `Finalized: ${new Date(
                              quote.finalized_at
                            ).toLocaleString('en-IN')}`
                          : 'Draft Document — Subject to final human authorization'}
                      </span>

                    </div>
                  </div>

                  <div className="flex flex-col sm:items-end text-center sm:text-right">

                    <span className="text-xs font-bold text-slate-900">
                      {quote.authorized_signatory ||
                        quote.prepared_by ||
                        'Authorised Signatory'}
                    </span>

                    <span className="text-[11px] text-[#45474c]">
                      Commercial Authority
                    </span>

                    <span className="text-[10px] text-[#76777d]">
                      {quote.company_name ||
                        company?.name ||
                        'Company'}
                    </span>

                  </div>

                </div>

                {/* FOOTER */}
                <div className="pt-3 border-t border-[#E5E1D8] flex flex-col sm:flex-row justify-between items-center text-[10px] text-[#76777d] gap-2">

                  <span>
                    {settings?.template?.footer_text ||
                      'This is an authenticated computer-generated commercial document.'}
                  </span>

                  <span className="font-mono">
                    Page 1 of 1 • System Authenticated
                  </span>

                </div>

              </div>
            </div>

            {/* SECONDARY PANEL */}
            <div className="lg:col-span-4 flex flex-col gap-5">

              {/* TAX COMPLIANCE */}
              <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200/90 flex items-start gap-3">

                <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />

                <div>
                  <span className="text-xs font-bold text-slate-900 block">
                    {quote.gst_type === 'IGST'
                      ? 'Inter-State GST'
                      : 'Intra-State GST'}
                  </span>

                  <p className="text-xs text-slate-600 mt-0.5">
                    Tax treatment is displayed from the quotation's configured GST type and rates.
                  </p>
                </div>

              </div>

              {/* CUSTOMER TRANSMISSION */}
              <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200/90 flex flex-col gap-3">

                <div className="flex items-center justify-between pb-2 border-b border-slate-200">

                  <div className="flex items-center gap-1.5">
                    <Mail className="w-4 h-4 text-[#2563EB]" />

                    <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                      Customer Transmission
                    </h2>
                  </div>

                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-medium font-mono">
                    Email Service
                  </span>

                </div>

                <div className="flex flex-col gap-2.5 text-xs">

                  <div>
                    <label className="text-[10px] font-semibold uppercase text-slate-500 block mb-1">
                      Customer Recipient Email
                    </label>

                    <div className="bg-slate-50 px-3 py-2 rounded-xl flex items-center justify-between border border-slate-200">

                      <div className="flex flex-col truncate">

                        <span className="font-semibold text-slate-900 truncate">
                          {quote.customer_email ||
                            quote.resolved_email_recipient ||
                            '—'}
                        </span>

                        <span className="text-[10px] text-slate-500">
                          {quote.customer_name ||
                            'Customer'}
                        </span>

                      </div>

                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />

                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-semibold uppercase text-slate-500 block mb-1">
                      Transmission Subject
                    </label>

                    <input
                      readOnly
                      type="text"
                      value={`Official Quotation ${
                        quote.quotation_number
                      } - ${quote.customer_name || 'Client'}`}
                      className="w-full bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-900 font-mono"
                    />
                  </div>

                  <div>

                    <label className="text-[10px] font-semibold uppercase text-slate-500 block mb-1">
                      Generated Official Document
                    </label>

                    <div
                      onClick={handleDownloadPdf}
                      className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer border border-slate-200"
                    >

                      <div className="flex items-center gap-2 truncate">

                        <div className="w-7 h-7 rounded bg-red-100 text-red-700 flex items-center justify-center shrink-0">
                          <FileText className="w-4 h-4" />
                        </div>

                        <div className="flex flex-col truncate">

                          <span className="font-semibold text-slate-900 truncate">
                            {quote.quotation_number}.pdf
                          </span>

                          <span className="text-[10px] text-slate-500">
                            Official Quotation PDF
                          </span>

                        </div>
                      </div>

                      <Download className="w-4 h-4 text-slate-500" />

                    </div>
                  </div>

                </div>
              </div>

              {/* AUDIT */}
              <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200/90 flex flex-col gap-3">

                <div className="flex items-center gap-1.5 pb-2 border-b border-slate-200">

                  <ShieldCheck className="w-4 h-4 text-emerald-600" />

                  <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                    Audit &amp; Dispatch Telemetry
                  </h2>

                </div>

                <div className="flex flex-col gap-2 text-xs">

                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex justify-between items-center">
                    <span className="text-slate-500">
                      Document Status:
                    </span>

                    <span className="font-bold text-slate-900">
                      {quote.status}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex justify-between items-center">

                    <span className="text-slate-500">
                      Storage Location:
                    </span>

                    <span className="font-mono text-[11px] text-slate-900 truncate max-w-[180px]">
                      {quote.pdf_storage_path
                        ? 'Supabase Storage'
                        : 'Database Ready'}
                    </span>

                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex justify-between items-center">

                    <span className="text-slate-500">
                      Email Status:
                    </span>

                    <span
                      className={`font-semibold ${
                        quote.email_status === 'SENT'
                          ? 'text-emerald-700'
                          : 'text-slate-500'
                      }`}
                    >
                      {quote.email_status ||
                        'NOT_DISPATCHED'}
                    </span>

                  </div>

                  {quote.email_sent_at && (
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex justify-between items-center">

                      <span className="text-slate-500">
                        Dispatched At:
                      </span>

                      <span className="font-mono text-[11px] text-slate-900">
                        {new Date(
                          quote.email_sent_at
                        ).toLocaleString('en-IN')}
                      </span>

                    </div>
                  )}

                  {quote.pdf_sha256 && (
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col gap-0.5">

                      <span className="text-slate-500 text-[10px] uppercase font-bold">
                        SHA-256 Integrity Hash:
                      </span>

                      <span className="font-mono text-[10px] text-slate-900 break-all">
                        {quote.pdf_sha256}
                      </span>

                    </div>
                  )}

                </div>
              </div>

            </div>
          </div>
        )}

        {/* ACTION FOOTER */}
        {quote && (
          <div className="sticky bottom-0 bg-white p-4 rounded-2xl shadow-lg border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 mt-2 z-30">

            <div className="flex items-center gap-2.5 w-full sm:w-auto">

              <button
                onClick={handleDownloadPdf}
                disabled={isDownloadingPdf}
                className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-800 text-xs font-semibold transition-colors border border-slate-200 cursor-pointer"
              >
                <Download className="w-4 h-4 text-slate-500" />

                <span>
                  {isDownloadingPdf
                    ? 'Generating PDF...'
                    : 'Download Official PDF'}
                </span>
              </button>

            </div>

            <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto">

              <div className="flex flex-col text-left sm:text-right">

                <span className="text-[10px] uppercase font-semibold text-slate-500">
                  Total Quotation Value
                </span>

                <span className="text-xl font-bold font-mono text-slate-900">
                  <TabularNumber
                    value={
                      quote.final_total ||
                      quote.grand_total ||
                      0
                    }
                  />
                </span>

              </div>

              {quote.status === 'DRAFT' ? (
                <button
                  onClick={handleFinalize}
                  disabled={isFinalizing}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl text-white text-xs font-bold transition-all shadow-md bg-[#2563EB] hover:bg-[#1D4ED8] shadow-[#2563EB]/20 active:scale-[0.99] cursor-pointer"
                >
                  <Lock className="w-4 h-4" />

                  <span>
                    {isFinalizing
                      ? 'Finalizing...'
                      : 'Finalize Quotation (Freeze & Store PDF)'}
                  </span>
                </button>
              ) : (
                <button
                  onClick={() =>
                    setIsEmailModalOpen(true)
                  }
                  disabled={isSendingEmail}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl text-white text-xs font-bold transition-all shadow-md bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20 active:scale-[0.99] cursor-pointer"
                >
                  <Send className="w-4 h-4" />

                  <span>
                    {quote.email_status === 'SENT'
                      ? 'Re-send Quotation Email'
                      : 'Email Quotation to Customer'}
                  </span>
                </button>
              )}

            </div>
          </div>
        )}
      </div>

      {/* EDIT TERMS MODAL */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Commercial Terms"
        size="md"
      >
        <div className="space-y-4">

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Payment Terms
            </label>

            <input
              type="text"
              value={editForm.payment_terms}
              onChange={(e) =>
                setEditForm((prev) => ({
                  ...prev,
                  payment_terms: e.target.value,
                }))
              }
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Delivery Terms
            </label>

            <input
              type="text"
              value={editForm.delivery_terms}
              onChange={(e) =>
                setEditForm((prev) => ({
                  ...prev,
                  delivery_terms: e.target.value,
                }))
              }
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Quality &amp; Inspection Clause
            </label>

            <input
              type="text"
              value={editForm.inspection_terms}
              onChange={(e) =>
                setEditForm((prev) => ({
                  ...prev,
                  inspection_terms: e.target.value,
                }))
              }
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Standard Manufacturing Notes
            </label>

            <textarea
              rows={3}
              value={editForm.notes}
              onChange={(e) =>
                setEditForm((prev) => ({
                  ...prev,
                  notes: e.target.value,
                }))
              }
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">

            <Button
              variant="outline"
              onClick={() => setIsEditModalOpen(false)}
            >
              Cancel
            </Button>

            <Button
              onClick={handleSaveTerms}
              loading={isSavingTerms}
            >
              Save Terms
            </Button>

          </div>
        </div>
      </Modal>

      {/* EMAIL DISPATCH MODAL */}
      <Modal
        isOpen={isEmailModalOpen}
        onClose={() => setIsEmailModalOpen(false)}
        title="Dispatch Official Quotation via Email"
        size="md"
      >
        <div className="space-y-4">

          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 leading-relaxed">
            This operation retrieves the verified final PDF from secure storage and delivers it to the customer through the configured email service.
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Recipient Email
            </label>

            <input
              readOnly
              type="text"
              value={
                quote?.customer_email ||
                quote?.resolved_email_recipient ||
                '—'
              }
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 font-mono cursor-not-allowed"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Quotation Document Attached
            </label>

            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs font-mono text-slate-900">
              {quote?.quotation_number}.pdf
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">

            <Button
              variant="outline"
              onClick={() => setIsEmailModalOpen(false)}
            >
              Cancel
            </Button>

            <Button
              onClick={handleSendEmail}
              loading={isSendingEmail}
              icon={<Send className="w-3.5 h-3.5" />}
            >
              Confirm &amp; Send Email
            </Button>

          </div>

        </div>
      </Modal>

    </div>
  );
};

export default QuotationPreviewPage;