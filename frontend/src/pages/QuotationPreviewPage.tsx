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
  ClipboardCheck, 
  Save, 
  Lock,
  Printer
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { WorkflowStepper } from '../components/layout/WorkflowStepper';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { TabularNumber } from '../components/common/TabularNumber';
import { quotationApi, QuotationDTO } from '../api/quotationApi';

export const QuotationPreviewPage: React.FC = () => {
  const navigate = useNavigate();
  const { quoteId } = useParams<{ quoteId?: string }>();

  const [quote, setQuote] = useState<QuotationDTO | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState<boolean>(false);
  const [isFinalizing, setIsFinalizing] = useState<boolean>(false);

  // Edit Metadata Modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [isSavingMetadata, setIsSavingMetadata] = useState<boolean>(false);
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
    setTimeout(() => setToastMsg(null), 3500);
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
        prepared_by: data.prepared_by || 'Rajesh Deshmukh',
        authorized_signatory: data.authorized_signatory || '',
      });
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || 'Failed to load quotation details.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (quoteId) {
      loadQuotation(quoteId);
    } else {
      // If no quoteId in path, list latest quotation
      quotationApi.list().then((list) => {
        if (list && list.length > 0) {
          loadQuotation(list[0].id);
        } else {
          setError('No quotation found. Please calculate an approved Purchase Order first.');
          setLoading(false);
        }
      }).catch((err) => {
        setError(err.message || 'Failed to load quotations.');
        setLoading(false);
      });
    }
  }, [quoteId, loadQuotation]);

  const handleDownloadPdf = async () => {
    if (!quote) return;
    setIsDownloadingPdf(true);
    try {
      await quotationApi.downloadPdf(quote.id, quote.quotation_number);
      showToast(`Quotation PDF downloaded: ${quote.quotation_number}.pdf`);
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || 'Failed to download PDF.';
      showToast(`Error: ${msg}`);
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const handleFinalize = async () => {
    if (!quote) return;
    setIsFinalizing(true);
    try {
      const updated = await quotationApi.finalize(quote.id);
      setQuote(updated);
      showToast(`Quotation ${updated.quotation_number} finalized successfully.`);
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || 'Failed to finalize quotation.';
      showToast(`Error: ${msg}`);
    } finally {
      setIsFinalizing(false);
    }
  };

  const handleSaveMetadata = async () => {
    if (!quote) return;
    setIsSavingMetadata(true);
    try {
      const payload: Partial<QuotationDTO> = {
        valid_until: editForm.valid_until ? new Date(editForm.valid_until).toISOString() : undefined,
        payment_terms: editForm.payment_terms,
        delivery_terms: editForm.delivery_terms,
        inspection_terms: editForm.inspection_terms,
        notes: editForm.notes,
        prepared_by: editForm.prepared_by,
        authorized_signatory: editForm.authorized_signatory,
      };
      const updated = await quotationApi.update(quote.id, payload);
      setQuote(updated);
      setIsEditModalOpen(false);
      showToast('Quotation commercial terms updated successfully.');
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || 'Failed to update quotation terms.';
      showToast(`Error: ${msg}`);
    } finally {
      setIsSavingMetadata(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-full flex flex-col items-center justify-center p-12 bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-semibold text-slate-700">Loading authoritative quotation document...</p>
        </div>
      </div>
    );
  }

  if (error || !quote) {
    return (
      <div className="min-h-full flex flex-col items-center justify-center p-12 bg-slate-50">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-xl p-6 text-center space-y-4 shadow-sm">
          <AlertCircle className="w-10 h-10 text-amber-500 mx-auto" />
          <h2 className="text-lg font-bold text-slate-900">Quotation Unavailable</h2>
          <p className="text-xs text-slate-600 leading-relaxed">{error || 'Quotation could not be loaded.'}</p>
          <div className="pt-2 flex justify-center gap-3">
            <Button variant="outline" size="sm" onClick={() => navigate('/calculation')}>
              Back to Calculation
            </Button>
            <Button variant="primary" size="sm" onClick={() => navigate('/upload')}>
              Upload New PO
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const isFinal = quote.status === 'FINAL';
  const bank = quote.bank_details || {};

  return (
    <div className="min-h-full flex flex-col bg-[#f8fafc]">
      {/* Workflow Stepper: Step 5 Active */}
      <WorkflowStepper currentStep={5} />

      {/* Toast Notification */}
      <AnimatePresence>
        {toastMsg && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-16 right-8 z-50 bg-slate-950 text-white text-xs font-medium py-2.5 px-4 rounded-lg shadow-xl border border-slate-700 flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{toastMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="p-4 md:p-8 max-w-7xl mx-auto w-full space-y-6 flex-1 pb-24">
        {/* Document Action Control Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/calculation')}
              icon={<ArrowLeft className="w-4 h-4" />}
            >
              Back to Calculation
            </Button>
            <div className="h-4 w-px bg-slate-200" />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-900 font-mono">
                  {quote.quotation_number}
                </span>
                <Badge variant={isFinal ? 'success' : 'slate'} size="sm">
                  {quote.status}
                </Badge>

              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                Authoritative Commercial Quotation Document
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditModalOpen(true)}
              icon={<Edit3 className="w-3.5 h-3.5" />}
            >
              Edit Metadata
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              icon={<Printer className="w-3.5 h-3.5" />}
              className="hidden sm:inline-flex"
            >
              Print
            </Button>

            {!isFinal && (
              <Button
                variant="outline"
                size="sm"
                className="text-emerald-700 border-emerald-300 hover:bg-emerald-50 font-bold"
                onClick={handleFinalize}
                disabled={isFinalizing}
                icon={<CheckCircle2 className="w-3.5 h-3.5" />}
              >
                {isFinalizing ? 'Finalizing...' : 'Finalize'}
              </Button>
            )}

            <Button
              variant="primary"
              size="sm"
              className="font-bold bg-blue-600 hover:bg-blue-700"
              onClick={handleDownloadPdf}
              disabled={isDownloadingPdf}
              icon={<Download className="w-4 h-4" />}
            >
              {isDownloadingPdf ? 'Generating PDF...' : 'Download PDF'}
            </Button>
          </div>
        </div>

        {/* Anti-Price Tampering Notification Notice */}
        <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3 flex items-center justify-between text-xs text-blue-900">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-blue-600 shrink-0" />
            <span>
              <strong>Deterministic Price Protection:</strong> Financial figures and statutory taxes are authoritative from the calculation engine and cannot be manually overridden.
            </span>
          </div>
          <button
            onClick={() => navigate('/calculation')}
            className="text-blue-700 font-bold hover:underline shrink-0 text-xs ml-3"
          >
            Recalculate
          </button>
        </div>

        {/* Physical Industrial Precision Quotation Document Sheet */}
        <div className="bg-white border border-slate-300 rounded-2xl shadow-md p-6 sm:p-10 max-w-[850px] mx-auto text-slate-900 font-sans space-y-6">
          
          {/* Section 1: Header */}
          <div className="border-b border-slate-200 pb-6 flex flex-col sm:flex-row justify-between items-start gap-4">
            <div className="space-y-1.5 max-w-md">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-600" />
                <h1 className="text-xl font-black tracking-tight text-slate-950 uppercase">
                  {quote.company_name || 'Bharat Precision Engineering Works'}
                </h1>
              </div>
              {quote.company_legal_name && quote.company_legal_name !== quote.company_name && (
                <p className="text-xs text-slate-500 font-medium">({quote.company_legal_name})</p>
              )}
              <p className="text-xs text-slate-600 leading-relaxed">
                {quote.company_address || 'Plot W-182, MIDC Bhosari Industrial Area, Pune 411026, Maharashtra, India'}
              </p>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 pt-1">
                {quote.company_phone && <span>Tel: {quote.company_phone}</span>}
                {quote.company_email && <span>Email: {quote.company_email}</span>}
              </div>
              {quote.company_gstin && (
                <div className="text-xs font-mono font-bold text-slate-900 pt-1">
                  GSTIN: <span className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">{quote.company_gstin}</span>
                </div>
              )}
            </div>

            <div className="text-left sm:text-right space-y-1">
              <div className="flex sm:justify-end items-center gap-2">
                <span className="text-2xl font-black tracking-tight text-slate-950">QUOTATION</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  isFinal 
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300' 
                    : 'bg-blue-50 text-blue-700 border-blue-300'
                }`}>
                  {quote.status}
                </span>
              </div>
              <div className="text-xs text-slate-600 space-y-0.5">
                <div>Quote No: <span className="font-mono font-bold text-slate-900">{quote.quotation_number}</span></div>
                <div>Date: <span className="font-mono">{new Date(quote.quotation_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span></div>
                <div>
                  Valid Until:{' '}
                  <span className="font-mono font-semibold text-slate-800">
                    {quote.valid_until 
                      ? new Date(quote.valid_until).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                      : '30 Days from date of issue'}
                  </span>
                </div>
                <div>Currency: <span className="font-mono font-semibold">{quote.currency || 'INR (₹)'}</span></div>
              </div>
            </div>
          </div>

          {/* Section 2: Customer Information & PO Reference */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Quotation To (Customer)</span>
              <div className="text-sm font-bold text-slate-950">{quote.customer_name || 'Valued Manufacturing Client'}</div>
              <p className="text-slate-600 leading-relaxed">{quote.customer_address || 'Customer Industrial Address'}</p>
              {quote.customer_gstin && (
                <div className="pt-1 text-slate-700 font-mono text-[11px]">
                  Customer GSTIN: <span className="font-bold">{quote.customer_gstin}</span>
                </div>
              )}
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Order Reference</span>
              <div className="flex justify-between">
                <span className="text-slate-600">PO Number:</span>
                <span className="font-mono font-bold text-slate-900">{quote.po_number || 'Direct RFQ'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">PO Date:</span>
                <span className="font-mono text-slate-800">
                  {quote.po_date ? new Date(quote.po_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Prepared By:</span>
                <span className="font-semibold text-slate-900">{quote.prepared_by || 'Rajesh Deshmukh'}</span>
              </div>
            </div>
          </div>

          {/* Section 3: Item Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white font-semibold text-[11px]">
                  <th className="py-2.5 px-3 w-10 text-center">#</th>
                  <th className="py-2.5 px-3">Part Name & Specification</th>
                  <th className="py-2.5 px-3">Material</th>
                  <th className="py-2.5 px-3">Process</th>
                  <th className="py-2.5 px-3 text-right">Qty</th>
                  <th className="py-2.5 px-3 text-center">Unit</th>
                  <th className="py-2.5 px-3 text-right">Unit Price (₹)</th>
                  <th className="py-2.5 px-3 text-right">Total (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {quote.items && quote.items.length > 0 ? (
                  quote.items.map((it, idx) => (
                    <tr key={it.id || idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                      <td className="py-2.5 px-3 text-center font-mono text-slate-500">{it.item_number || idx + 1}</td>
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-slate-900">{it.part_name}</div>
                        {it.specification && (
                          <div className="text-[10px] text-slate-500 font-mono">{it.specification}</div>
                        )}
                        {it.drawing_number && (
                          <div className="text-[10px] text-blue-600 font-mono">Drw: {it.drawing_number}</div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-slate-700">{it.material || '-'}</td>
                      <td className="py-2.5 px-3 font-medium text-slate-700">{it.process || '-'}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-900">
                        {it.quantity}
                      </td>
                      <td className="py-2.5 px-3 text-center text-slate-600">{it.unit || 'PCS'}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-900 font-semibold">
                        <TabularNumber value={it.unit_price} />
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-950">
                        <TabularNumber value={it.total_price} />
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="py-6 text-center text-slate-500">
                      No line items configured on this quotation.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Section 4 & 5: Cost Breakdown, Tax, and Amount in Words */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            {/* Left Column: Bank Details & Amount in Words */}
            <div className="space-y-4">
              {/* Amount in Words */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Amount in Words (INR)</span>
                <p className="text-xs font-semibold text-slate-900 italic leading-relaxed">
                  {quote.amount_in_words || 'Indian Rupee Amount Calculated'}
                </p>
              </div>

              {/* Bank Details */}
              {bank.bank_name && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-1.5 text-xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Bank Remittance Details</span>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Bank Name:</span>
                    <span className="font-semibold text-slate-900">{bank.bank_name}</span>
                  </div>
                  {bank.bank_branch && (
                    <div className="flex justify-between">
                      <span className="text-slate-600">Branch:</span>
                      <span className="text-slate-800">{bank.bank_branch}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-slate-600">Account No:</span>
                    <span className="font-mono font-bold text-slate-900">{bank.bank_account}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">IFSC Code:</span>
                    <span className="font-mono font-bold text-slate-900">{bank.bank_ifsc}</span>
                  </div>
                  {bank.upi_id && (
                    <div className="flex justify-between">
                      <span className="text-slate-600">UPI ID:</span>
                      <span className="font-mono text-slate-800">{bank.upi_id}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right Column: Financial Breakdown Table */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Material Cost</span>
                <span className="font-mono font-semibold text-slate-900">
                  <TabularNumber value={quote.material_cost} />
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Process Cost</span>
                <span className="font-mono font-semibold text-slate-900">
                  <TabularNumber value={quote.process_cost} />
                </span>
              </div>
              <div className="flex justify-between font-bold text-slate-900 pt-1 border-t border-slate-200">
                <span>Manufacturing Subtotal</span>
                <span className="font-mono">
                  <TabularNumber value={quote.subtotal} />
                </span>
              </div>

              <div className="flex justify-between text-slate-600">
                <span>Overhead ({quote.overhead_percentage}%)</span>
                <span className="font-mono font-semibold text-slate-900">
                  <TabularNumber value={quote.overhead_amount} />
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Assessable Value</span>
                <span className="font-mono font-semibold text-slate-900">
                  <TabularNumber value={Number(quote.subtotal) + Number(quote.overhead_amount)} />
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Profit Margin ({quote.profit_percentage}%)</span>
                <span className="font-mono font-semibold text-slate-900">
                  <TabularNumber value={quote.profit_amount} />
                </span>
              </div>
              <div className="flex justify-between font-bold text-slate-900 pt-1 border-t border-slate-200">
                <span>Taxable Value</span>
                <span className="font-mono">
                  <TabularNumber value={quote.taxable_amount} />
                </span>
              </div>

              {/* Statutory Tax Rows */}
              {quote.gst_type === 'IGST' ? (
                <div className="flex justify-between text-slate-600">
                  <span>Integrated GST (IGST @ {quote.igst_rate}%)</span>
                  <span className="font-mono font-semibold text-slate-900">
                    <TabularNumber value={quote.igst_amount} />
                  </span>
                </div>
              ) : (
                <>
                  <div className="flex justify-between text-slate-600">
                    <span>Central GST (CGST @ {quote.cgst_rate}%)</span>
                    <span className="font-mono font-semibold text-slate-900">
                      <TabularNumber value={quote.cgst_amount} />
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>State GST (SGST @ {quote.sgst_rate}%)</span>
                    <span className="font-mono font-semibold text-slate-900">
                      <TabularNumber value={quote.sgst_amount} />
                    </span>
                  </div>
                </>
              )}

              {/* Grand Total Bar */}
              <div className="bg-slate-950 text-white rounded-lg p-3 mt-3 flex justify-between items-baseline">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Grand Total (INR)</span>
                <span className="text-xl font-mono font-black text-emerald-400">
                  <TabularNumber value={quote.final_total} />
                </span>
              </div>
            </div>
          </div>

          {/* Section 6: Commercial Terms */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Commercial Terms & Conditions</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 pt-1 text-slate-700">
              <div>
                <span className="font-semibold text-slate-900">Delivery Terms: </span>
                {quote.delivery_terms || 'Ex-Works Factory Bhosari, Pune.'}
              </div>
              <div>
                <span className="font-semibold text-slate-900">Payment Terms: </span>
                {quote.payment_terms || '30 Days from date of invoice.'}
              </div>
              <div>
                <span className="font-semibold text-slate-900">Inspection: </span>
                {quote.inspection_terms || 'Pre-dispatch inspection at manufacturer premises.'}
              </div>
              <div>
                <span className="font-semibold text-slate-900">General Notes: </span>
                {quote.notes || 'Standard industrial machining tolerances apply.'}
              </div>
            </div>
          </div>

          {/* Section 7: Authorization & Signatures */}
          <div className="pt-6 border-t border-slate-200 grid grid-cols-2 gap-6 text-xs">
            <div className="space-y-1">
              <span className="text-slate-500">Prepared By:</span>
              <div className="font-bold text-slate-950">{quote.prepared_by || 'Rajesh Deshmukh'}</div>
              <div className="text-[11px] text-slate-500">Costing Engineering Department</div>
            </div>
            <div className="text-right space-y-1">
              <span className="text-slate-500">For {quote.company_name || 'Bharat Precision Engineering Works'}:</span>
              <div className="h-10 flex items-end justify-end">
                <div className="border-b border-slate-400 w-44 text-center font-bold text-slate-950 pb-0.5">
                  {quote.authorized_signatory || (isFinal ? 'Authorized Signatory' : 'Draft Document')}
                </div>
              </div>
              <div className="text-[11px] text-slate-500">Authorized Signatory</div>
            </div>
          </div>

        </div>

      </div>

      {/* Edit Metadata Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Quotation Metadata"
        description="Modify commercial terms, validity, and delivery specifications. Pricing fields remain calculated and locked."
        maxWidth="lg"
      >
        <div className="space-y-4 pt-2 text-xs">
          <div>
            <label className="block text-slate-700 font-semibold mb-1">Validity Date</label>
            <input
              type="date"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono focus:ring-2 focus:ring-blue-500 outline-hidden"
              value={editForm.valid_until}
              onChange={(e) => setEditForm({ ...editForm, valid_until: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Payment Terms</label>
            <input
              type="text"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 outline-hidden"
              placeholder="e.g. 30 Days from date of invoice"
              value={editForm.payment_terms}
              onChange={(e) => setEditForm({ ...editForm, payment_terms: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Delivery Terms</label>
            <input
              type="text"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 outline-hidden"
              placeholder="e.g. Ex-Works Factory, Pune"
              value={editForm.delivery_terms}
              onChange={(e) => setEditForm({ ...editForm, delivery_terms: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Inspection Terms</label>
            <input
              type="text"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 outline-hidden"
              placeholder="e.g. Pre-dispatch inspection at manufacturer premises"
              value={editForm.inspection_terms}
              onChange={(e) => setEditForm({ ...editForm, inspection_terms: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Prepared By</label>
            <input
              type="text"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 outline-hidden"
              value={editForm.prepared_by}
              onChange={(e) => setEditForm({ ...editForm, prepared_by: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">General Notes</label>
            <textarea
              rows={3}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 outline-hidden"
              placeholder="Add manufacturing tolerances or specifications..."
              value={editForm.notes}
              onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              className="font-bold bg-blue-600 hover:bg-blue-700"
              onClick={handleSaveMetadata}
              disabled={isSavingMetadata}
              icon={<Save className="w-3.5 h-3.5" />}
            >
              {isSavingMetadata ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default QuotationPreviewPage;
