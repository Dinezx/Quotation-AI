import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  Calendar, 
  MapPin, 
  Save, 
  ShieldCheck, 
  ArrowRight, 
  Clock, 
  Edit2, 
  XCircle,
  Building2,
  Truck,
  FileCheck,
  Info,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { WorkflowStepper } from '../components/layout/WorkflowStepper';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { useDensity } from '../context/DensityContext';
import { purchaseOrderApi, PurchaseOrderDTO, PurchaseOrderItemDTO } from '../api/purchaseOrderApi';

export const PoReviewPage: React.FC = () => {
  const navigate = useNavigate();
  const { poId } = useParams<{ poId: string }>();
  const { isComfortable } = useDensity();

  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [approving, setApproving] = useState<boolean>(false);
  const [rejecting, setRejecting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Approval confirmation modal
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [approvalNotes, setApprovalNotes] = useState('');

  // Rejection modal
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  // PO State
  const [po, setPo] = useState<PurchaseOrderDTO>({
    id: poId || 'demo-po',
    company_id: 'comp-bpe-pune',
    po_number: 'PO-2026-0098',
    po_date: '2026-09-19T00:00:00',
    customer_name: 'ABC Engineering Components Pvt. Ltd.',
    supplier_name: 'Bharat Precision Engineering Pvt. Ltd.',
    delivery_terms: 'Ex-works Bhosari Pune',
    payment_terms: '30 days net',
    inspection_clauses: 'Visual and dimensional inspection before dispatch',
    general_notes: 'Standard manufacturing tolerances per ISO 2768-m',
    status: 'NEEDS_REVIEW',
    review_status: 'NEEDS_REVIEW',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    items: [
      {
        id: 'item-1',
        purchase_order_id: poId || 'demo-po',
        item_number: 1,
        part_name: 'Bearing Housing',
        specification: 'EN8',
        drawing_number: 'DWG-BH-001',
        description: 'Cast/Machined bearing housing',
        quantity: 100,
        unit: 'Nos',
        material_grade: 'EN8',
        process_name: undefined,
        gross_weight_kg: 0,
        net_weight_kg: 0,
        scrap_weight_kg: 0,
        machining_hours: 0,
        setup_hours: 0,
        confidence: 0.98,
        review_flags: ['AMBIGUOUS_PROCESS'],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'item-2',
        purchase_order_id: poId || 'demo-po',
        item_number: 2,
        part_name: 'Pinion Shaft',
        specification: 'EN19',
        drawing_number: 'DWG-PS-002',
        description: 'Precision turned pinion shaft',
        quantity: 50,
        unit: 'Nos',
        material_grade: 'EN19',
        process_name: undefined,
        gross_weight_kg: 0,
        net_weight_kg: 0,
        scrap_weight_kg: 0,
        machining_hours: 0,
        setup_hours: 0,
        confidence: 0.95,
        review_flags: ['AMBIGUOUS_PROCESS'],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'item-3',
        purchase_order_id: poId || 'demo-po',
        item_number: 3,
        part_name: 'Mounting Bracket',
        specification: 'IS 2062',
        drawing_number: 'DWG-MB-003',
        description: 'Laser cut & welded bracket',
        quantity: 75,
        unit: 'Nos',
        material_grade: 'IS 2062',
        process_name: undefined,
        gross_weight_kg: 0,
        net_weight_kg: 0,
        scrap_weight_kg: 0,
        machining_hours: 0,
        setup_hours: 0,
        confidence: 0.96,
        review_flags: ['AMBIGUOUS_PROCESS'],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'item-4',
        purchase_order_id: poId || 'demo-po',
        item_number: 4,
        part_name: 'Spacer Ring',
        specification: 'EN1A',
        drawing_number: 'DWG-SR-004',
        description: 'Precision spacer ring',
        quantity: 200,
        unit: 'Nos',
        material_grade: 'EN1A',
        process_name: undefined,
        gross_weight_kg: 0,
        net_weight_kg: 0,
        scrap_weight_kg: 0,
        machining_hours: 0,
        setup_hours: 0,
        confidence: 0.99,
        review_flags: ['AMBIGUOUS_PROCESS'],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
    ]
  });

  // Fetch real PO if poId is available
  useEffect(() => {
    if (poId && poId !== 'demo-po') {
      setLoading(true);
      purchaseOrderApi.get(poId)
        .then(data => {
          setPo(data);
          setLoading(false);
        })
        .catch(err => {
          console.warn('Could not fetch PO from API, using default/cached review state:', err);
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, [poId]);

  const handleHeaderChange = (field: keyof PurchaseOrderDTO, value: string) => {
    setPo(prev => ({ ...prev, [field]: value }));
  };

  const handleItemChange = (index: number, field: keyof PurchaseOrderItemDTO, value: any) => {
    setPo(prev => {
      const items = [...prev.items];
      items[index] = { ...items[index], [field]: value };
      return { ...prev, items };
    });
  };

  const handleSaveChanges = async () => {
    setSaving(true);
    setErrorMessage(null);
    try {
      if (po.id && po.id !== 'demo-po') {
        const updated = await purchaseOrderApi.update(po.id, po);
        setPo(updated);
      }
      setSuccessMessage('PO review changes saved successfully.');
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.detail || 'Failed to save changes.');
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmApproval = async () => {
    setApproving(true);
    setErrorMessage(null);
    try {
      if (po.id && po.id !== 'demo-po') {
        const approved = await purchaseOrderApi.approve(po.id, approvalNotes);
        setPo(approved);
      } else {
        // Fallback for standalone demo mode
        setPo(prev => ({
          ...prev,
          status: 'APPROVED',
          review_status: 'APPROVED',
          approved_by: 'usr-bpe-001 (Rajesh Deshmukh)',
          approved_at: new Date().toISOString()
        }));
      }
      setApproveModalOpen(false);
      setSuccessMessage('Purchase Order successfully approved! Ready for rate matching and costing.');
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.detail || 'Approval failed. Verify all required fields.');
    } finally {
      setApproving(false);
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectReason.trim()) {
      setErrorMessage('Please provide a reason for rejection.');
      return;
    }
    setRejecting(true);
    setErrorMessage(null);
    try {
      if (po.id && po.id !== 'demo-po') {
        const rejected = await purchaseOrderApi.reject(po.id, rejectReason);
        setPo(rejected);
      } else {
        setPo(prev => ({ ...prev, status: 'REJECTED', rejection_reason: rejectReason }));
      }
      setRejectModalOpen(false);
      setSuccessMessage('Purchase Order has been rejected.');
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.detail || 'Rejection failed.');
    } finally {
      setRejecting(false);
    }
  };

  const isApproved = po.status === 'APPROVED';
  const isRejected = po.status === 'REJECTED';
  const hasAmbiguousProcess = po.items.some(it => !it.process_name || it.review_flags?.includes('AMBIGUOUS_PROCESS'));

  return (
    <div className="min-h-full flex flex-col bg-[#f8fafc]">
      <WorkflowStepper currentStep={3} />

      <div className={`max-w-7xl mx-auto w-full flex-1 pb-28 ${isComfortable ? 'p-6 md:p-8 space-y-7' : 'p-4 md:p-6 space-y-5'}`}>
        
        {/* Header Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1.5 flex-wrap">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                PO Review & Human Approval
              </h1>
              {isApproved ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  APPROVED (Ready for Costing)
                </span>
              ) : isRejected ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-300">
                  <XCircle className="w-4 h-4 text-rose-600" />
                  REJECTED
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-300">
                  <Clock className="w-4 h-4 text-amber-600" />
                  NEEDS HUMAN REVIEW
                </span>
              )}
            </div>
            <p className="text-sm text-slate-500 leading-relaxed max-w-2xl">
              Inspect normalized customer details, verify specifications and line items, and authorize the purchase order as trusted business data before rate calculation.
            </p>
          </div>

          {/* Action Header Card */}
          <div className="flex items-center gap-3 bg-white border border-slate-200/80 rounded-xl p-3 shadow-xs">
            <div className="text-left">
              <div className="text-xs font-bold text-slate-900 font-mono">
                {po.po_number || 'PO-2026-0098'}
              </div>
              <div className="text-[11px] text-slate-400">
                {po.customer_name || 'ABC Engineering Components Pvt. Ltd.'}
              </div>
            </div>
            {isApproved && (
              <div className="text-right border-l border-slate-200 pl-3">
                <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Approved At</div>
                <div className="text-xs font-mono font-medium text-emerald-700">
                  {po.approved_at ? new Date(po.approved_at).toLocaleDateString() : 'Today'}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Feedback Banners */}
        {errorMessage && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-xl text-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button onClick={() => setErrorMessage(null)} className="text-rose-500 hover:text-rose-700 font-bold ml-4">✕</button>
          </div>
        )}

        {successMessage && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl text-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
            <button onClick={() => setSuccessMessage(null)} className="text-emerald-500 hover:text-emerald-700 font-bold ml-4">✕</button>
          </div>
        )}

        {/* Process Ambiguity Notice */}
        {hasAmbiguousProcess && !isApproved && (
          <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 md:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-sm shadow-xs">
            <div className="flex items-start sm:items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-amber-700" />
              </div>
              <div>
                <span className="font-bold text-amber-950 block">
                  Manufacturing processes not stated in customer PO (Unresolved)
                </span>
                <span className="text-amber-800 text-xs mt-0.5 block">
                  Items have no explicit machining operations listed. The AI has preserved processes as NULL without hallucinating. You may approve this PO; operations will be mapped in rate matching.
                </span>
              </div>
            </div>
            <span className="px-3 py-1.5 bg-amber-200/80 text-amber-950 font-bold rounded-lg text-xs shrink-0 self-start sm:self-center">
              Flag: AMBIGUOUS_PROCESS
            </span>
          </div>
        )}

        {/* Section 1: Customer & PO Metadata */}
        <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs">
          <div className="px-6 py-4 border-b border-slate-200/80 bg-slate-50/60 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-md bg-blue-100 text-blue-700 flex items-center justify-center">
                <FileText className="w-3.5 h-3.5" />
              </div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Customer & Purchase Order Header
              </h2>
            </div>
            <span className="text-xs font-mono font-semibold text-slate-500 bg-white px-2.5 py-1 rounded-md border border-slate-200">
              STATUS: {po.status}
            </span>
          </div>

          <div className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 text-xs">
            {/* Customer Name */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 block mb-1.5">
                Customer Name
              </label>
              <div className="relative">
                <input
                  type="text"
                  disabled={isApproved}
                  value={po.customer_name || ''}
                  onChange={(e) => handleHeaderChange('customer_name', e.target.value)}
                  className="w-full pl-3.5 pr-9 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl font-semibold text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all disabled:opacity-75"
                />
                <Edit2 className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Supplier Name */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 block mb-1.5">
                Supplier (Vendor)
              </label>
              <div className="relative">
                <input
                  type="text"
                  disabled={isApproved}
                  value={po.supplier_name || ''}
                  onChange={(e) => handleHeaderChange('supplier_name', e.target.value)}
                  className="w-full pl-3.5 pr-9 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl font-semibold text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all disabled:opacity-75"
                />
                <Building2 className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* PO Number */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 block mb-1.5">
                PO Number
              </label>
              <div className="relative">
                <input
                  type="text"
                  disabled={isApproved}
                  value={po.po_number || ''}
                  onChange={(e) => handleHeaderChange('po_number', e.target.value)}
                  className="w-full pl-3.5 pr-9 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl font-mono font-semibold text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all disabled:opacity-75"
                />
                <Edit2 className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* PO Date */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 block mb-1.5">
                PO Date
              </label>
              <div className="relative">
                <input
                  type="text"
                  disabled={isApproved}
                  value={po.po_date ? po.po_date.slice(0, 10) : ''}
                  onChange={(e) => handleHeaderChange('po_date', e.target.value)}
                  className="w-full pl-3.5 pr-9 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all disabled:opacity-75"
                />
                <Calendar className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Delivery Terms */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 block mb-1.5">
                Delivery Terms
              </label>
              <div className="relative">
                <input
                  type="text"
                  disabled={isApproved}
                  value={po.delivery_terms || ''}
                  onChange={(e) => handleHeaderChange('delivery_terms', e.target.value)}
                  className="w-full pl-3.5 pr-9 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all disabled:opacity-75"
                />
                <Truck className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Payment Terms */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 block mb-1.5">
                Payment Terms
              </label>
              <div className="relative">
                <input
                  type="text"
                  disabled={isApproved}
                  value={po.payment_terms || ''}
                  onChange={(e) => handleHeaderChange('payment_terms', e.target.value)}
                  className="w-full pl-3.5 pr-9 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all disabled:opacity-75"
                />
                <FileCheck className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Line Items Table */}
        <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs">
          <div className="px-6 py-4 border-b border-slate-200/80 bg-slate-50/60 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-md bg-amber-100 text-amber-700 flex items-center justify-center">
                <ShieldCheck className="w-3.5 h-3.5" />
              </div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Line Items for Manufacturing Verification ({po.items.length} Items)
              </h2>
            </div>
            <span className="text-xs text-slate-500 font-medium">
              Zero Pricing Fields (Commercial Invariant)
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4 w-12 text-center">#</th>
                  <th className="py-3.5 px-4 min-w-[160px]">Part Name</th>
                  <th className="py-3.5 px-4 min-w-[120px]">Drawing No.</th>
                  <th className="py-3.5 px-4 min-w-[140px]">Specification</th>
                  <th className="py-3.5 px-4 min-w-[100px]">Material</th>
                  <th className="py-3.5 px-4 min-w-[90px] text-right">Qty</th>
                  <th className="py-3.5 px-4 w-20 text-center">Unit</th>
                  <th className="py-3.5 px-4 min-w-[180px]">Process / Operations</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {po.items.map((item, idx) => {
                  const itemHasAmbiguity = !item.process_name || item.review_flags?.includes('AMBIGUOUS_PROCESS');
                  return (
                    <tr key={item.id || idx} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 px-4 text-center font-mono text-slate-400">
                        {item.item_number || idx + 1}
                      </td>
                      <td className="py-3 px-4">
                        <input
                          type="text"
                          disabled={isApproved}
                          value={item.part_name}
                          onChange={(e) => handleItemChange(idx, 'part_name', e.target.value)}
                          className="w-full bg-transparent border-0 border-b border-transparent focus:border-blue-500 focus:ring-0 font-semibold text-slate-900 text-xs py-1"
                        />
                        {item.description && (
                          <div className="text-[10px] text-slate-400 font-normal mt-0.5">{item.description}</div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <input
                          type="text"
                          disabled={isApproved}
                          value={item.drawing_number || ''}
                          placeholder="—"
                          onChange={(e) => handleItemChange(idx, 'drawing_number', e.target.value)}
                          className="w-full bg-transparent border-0 border-b border-transparent focus:border-blue-500 focus:ring-0 font-mono text-xs py-1 text-slate-600"
                        />
                      </td>
                      <td className="py-3 px-4">
                        <input
                          type="text"
                          disabled={isApproved}
                          value={item.specification || ''}
                          onChange={(e) => handleItemChange(idx, 'specification', e.target.value)}
                          className="w-full bg-transparent border-0 border-b border-transparent focus:border-blue-500 focus:ring-0 text-xs py-1 text-slate-800 font-mono"
                        />
                      </td>
                      <td className="py-3 px-4">
                        <input
                          type="text"
                          disabled={isApproved}
                          value={item.material_grade || ''}
                          onChange={(e) => handleItemChange(idx, 'material_grade', e.target.value)}
                          className="w-full bg-transparent border-0 border-b border-transparent focus:border-blue-500 focus:ring-0 text-xs py-1 text-slate-800 font-semibold"
                        />
                      </td>
                      <td className="py-3 px-4 text-right">
                        <input
                          type="number"
                          disabled={isApproved}
                          value={item.quantity}
                          onChange={(e) => handleItemChange(idx, 'quantity', parseFloat(e.target.value) || 0)}
                          className="w-20 text-right bg-transparent border-0 border-b border-transparent focus:border-blue-500 focus:ring-0 font-mono font-bold text-slate-900 text-xs py-1"
                        />
                      </td>
                      <td className="py-3 px-4 text-center">
                        <input
                          type="text"
                          disabled={isApproved}
                          value={item.unit}
                          onChange={(e) => handleItemChange(idx, 'unit', e.target.value)}
                          className="w-14 text-center bg-transparent border-0 border-b border-transparent focus:border-blue-500 focus:ring-0 font-mono text-xs py-1 text-slate-600"
                        />
                      </td>
                      <td className="py-3 px-4">
                        {item.process_name ? (
                          <span className="text-slate-800 font-semibold">{item.process_name}</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                            <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
                            [ — Not specified in PO — ]
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 3: Notes & Clauses */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-2">
              Inspection Clauses
            </label>
            <textarea
              rows={3}
              disabled={isApproved}
              value={po.inspection_clauses || ''}
              onChange={(e) => handleHeaderChange('inspection_clauses', e.target.value)}
              className="w-full p-3 bg-slate-50/50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all disabled:opacity-75"
              placeholder="e.g. Visual and dimensional inspection before dispatch"
            />
          </div>

          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-2">
              General Notes & Terms
            </label>
            <textarea
              rows={3}
              disabled={isApproved}
              value={po.general_notes || ''}
              onChange={(e) => handleHeaderChange('general_notes', e.target.value)}
              className="w-full p-3 bg-slate-50/50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all disabled:opacity-75"
              placeholder="e.g. Standard manufacturing tolerances per ISO 2768-m"
            />
          </div>
        </div>

        {/* Action Bar Footer */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {isApproved ? (
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>Approved by {po.approved_by || 'Costing Engineer'}</span>
              </div>
            ) : isRejected ? (
              <div className="flex items-center gap-2 text-xs font-semibold text-rose-700">
                <XCircle className="w-5 h-5 text-rose-600" />
                <span>PO Rejected: {po.rejection_reason || 'Rejected during review'}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Info className="w-4 h-4 text-blue-500 shrink-0" />
                <span>Ready for human review and authorization</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {!isApproved && !isRejected && (
              <>
                <Button
                  variant="outline"
                  onClick={() => setRejectModalOpen(true)}
                  className="text-rose-600 border-rose-200 hover:bg-rose-50"
                >
                  Reject PO
                </Button>

                <Button
                  variant="outline"
                  onClick={handleSaveChanges}
                  disabled={saving}
                  icon={<Save className="w-4 h-4" />}
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>

                <Button
                  variant="primary"
                  onClick={() => setApproveModalOpen(true)}
                  icon={<ShieldCheck className="w-4 h-4 text-white" />}
                >
                  Approve PO
                </Button>
              </>
            )}

            {isApproved && (
              <Button
                variant="primary"
                onClick={() => navigate(`/calculation?po_id=${po.id}`)}
                icon={<ArrowRight className="w-4 h-4" />}
              >
                Proceed to Rate Matching & Costing
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Approval Confirmation Modal */}
      <Modal
        isOpen={approveModalOpen}
        onClose={() => setApproveModalOpen(false)}
        title="Approve Purchase Order?"
      >
        <div className="space-y-4 text-sm text-slate-600">
          <p>
            You are about to authorize <strong className="text-slate-900">{po.po_number}</strong> from <strong className="text-slate-900">{po.customer_name}</strong> as verified business data.
          </p>
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs space-y-1.5">
            <div className="flex justify-between">
              <span className="text-slate-500">Total Items:</span>
              <span className="font-semibold text-slate-900">{po.items.length} items</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Unresolved Operations:</span>
              <span className="font-semibold text-amber-700">
                {hasAmbiguousProcess ? '4 items have process NULL (Allowed)' : '0'}
              </span>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Approval Notes (Optional):
            </label>
            <input
              type="text"
              value={approvalNotes}
              onChange={(e) => setApprovalNotes(e.target.value)}
              placeholder="e.g. Reviewed drawings, approved for fabrication"
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20"
            />
          </div>
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <Button variant="outline" onClick={() => setApproveModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleConfirmApproval}
              disabled={approving}
              icon={<CheckCircle2 className="w-4 h-4" />}
            >
              {approving ? 'Authorizing...' : 'Authorize & Approve'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Rejection Modal */}
      <Modal
        isOpen={rejectModalOpen}
        onClose={() => setRejectModalOpen(false)}
        title="Reject Purchase Order"
      >
        <div className="space-y-4 text-sm text-slate-600">
          <p>
            Please provide a reason for rejecting this purchase order. Rejected POs cannot be approved or processed for quotation calculation.
          </p>
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Rejection Reason (Required):
            </label>
            <textarea
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Incomplete specifications, customer cancelled order"
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-600/20"
            />
          </div>
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <Button variant="outline" onClick={() => setRejectModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="outline"
              className="bg-rose-600 text-white hover:bg-rose-700 border-transparent"
              onClick={handleConfirmReject}
              disabled={rejecting}
            >
              {rejecting ? 'Rejecting...' : 'Confirm Rejection'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default PoReviewPage;
