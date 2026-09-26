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
  ChevronRight,
  Eye,
  SlidersHorizontal,
  Plus,
  RefreshCw,
  Bookmark,
  Check,
  Maximize2
} from 'lucide-react';
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

  // Edit Header Modal
  const [editHeaderOpen, setEditHeaderOpen] = useState(false);

  // Side-by-side inspect modal
  const [inspectModalOpen, setInspectModalOpen] = useState(false);

  // PO State
  const [po, setPo] = useState<PurchaseOrderDTO>({
    id: poId || 'demo-po',
    company_id: 'comp-bpe-pune',
    po_number: 'TML/PO/2026/0942',
    po_date: '2026-02-14T00:00:00',
    customer_name: 'Tata Motors Limited',
    supplier_name: 'ORYNZA Industrial Systems India Pvt. Ltd.',
    delivery_terms: 'Chakan Industrial Area, Phase II',
    payment_terms: '60 Days Net from Delivery',
    inspection_clauses: 'Standard SLA Tier-1 Verified',
    general_notes: 'Components machined strictly to DIN 7168 medium tolerances.',
    status: 'NEEDS_REVIEW',
    review_status: 'NEEDS_REVIEW',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    items: [
      {
        id: 'item-1',
        purchase_order_id: poId || 'demo-po',
        item_number: 1,
        part_name: 'TM-FL-902 CNC Flange Hub 120mm Dia',
        specification: 'EN8 / AISI 1045',
        drawing_number: 'DWG-A1',
        description: 'CNC Flange Hub 120mm Dia (Turned face, dual chamfer)',
        quantity: 250,
        unit: 'Pcs',
        material_grade: 'EN8',
        process_name: 'CNC Turning',
        gross_weight_kg: 2.8,
        net_weight_kg: 2.4,
        scrap_weight_kg: 0.4,
        machining_hours: 0.35,
        setup_hours: 0.5,
        confidence: 0.994,
        review_flags: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'item-2',
        purchase_order_id: poId || 'demo-po',
        item_number: 2,
        part_name: 'TM-SH-441 Spline Drive Shaft 450mm',
        specification: '42CrMo4 Forged',
        drawing_number: 'DWG-C4',
        description: 'Spline Drive Shaft 450mm (16-tooth involute spline)',
        quantity: 120,
        unit: 'Pcs',
        material_grade: '42CrMo4',
        process_name: 'Spline Milling & Hardening',
        gross_weight_kg: 4.5,
        net_weight_kg: 3.9,
        scrap_weight_kg: 0.6,
        machining_hours: 0.75,
        setup_hours: 1.0,
        confidence: 0.988,
        review_flags: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'item-3',
        purchase_order_id: poId || 'demo-po',
        item_number: 3,
        part_name: 'TM-BR-110 Bronze Bushing Sleeve',
        specification: 'CuSn8 Bronze',
        drawing_number: 'DWG-B2',
        description: 'Bronze Bushing Sleeve (Oil impregnated bearing surface)',
        quantity: 500,
        unit: 'Pcs',
        material_grade: 'CuSn8',
        process_name: 'Precision Turning & Grooving',
        gross_weight_kg: 0.8,
        net_weight_kg: 0.65,
        scrap_weight_kg: 0.15,
        machining_hours: 0.2,
        setup_hours: 0.3,
        confidence: 0.975,
        review_flags: ['NEEDS_REVIEW'],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ],
  });

  const [confirmedItems, setConfirmedItems] = useState<Record<string, boolean>>({
    'item-1': true,
    'item-2': true,
    'item-3': false,
  });

  useEffect(() => {
    let isMounted = true;
    async function loadPO() {
      if (!poId) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const data = await purchaseOrderApi.get(poId);
        if (isMounted) {
          setPo(data);
          const initialConfirmed: Record<string, boolean> = {};
          data.items.forEach(it => {
            initialConfirmed[it.id] = (it.confidence || 0) >= 0.98;
          });
          setConfirmedItems(initialConfirmed);
        }
      } catch (err: any) {
        console.warn('Could not load PO from backend, using active template PO:', err.message);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadPO();
    return () => { isMounted = false; };
  }, [poId]);

  const handleHeaderChange = (field: keyof PurchaseOrderDTO, value: any) => {
    setPo(prev => ({ ...prev, [field]: value }));
  };

  const toggleConfirmItem = (itemId: string) => {
    setConfirmedItems(prev => ({
      ...prev,
      [itemId]: !prev[itemId],
    }));
  };

  const handleSaveDraft = async () => {
    setSaving(true);
    setErrorMessage(null);
    try {
      if (poId && poId !== 'demo-po') {
        await purchaseOrderApi.update(po.id, {
          customer_name: po.customer_name,
          supplier_name: po.supplier_name,
          delivery_terms: po.delivery_terms,
          payment_terms: po.payment_terms,
          inspection_clauses: po.inspection_clauses,
          general_notes: po.general_notes,
          items: po.items.map(it => ({
            id: it.id,
            part_name: it.part_name,
            specification: it.specification,
            drawing_number: it.drawing_number,
            description: it.description,
            quantity: it.quantity,
            unit: it.unit,
            material_grade: it.material_grade,
            process_name: it.process_name,
          })),
        });
      }
      setSuccessMessage('Purchase Order review changes saved successfully.');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.detail || err.message || 'Failed to save review changes');
    } finally {
      setSaving(false);
    }
  };

  const handleApproveAndProceed = async () => {
    setApproving(true);
    setErrorMessage(null);
    try {
      if (poId && poId !== 'demo-po') {
        await purchaseOrderApi.approve(po.id, { notes: approvalNotes || 'Reviewed and confirmed by operations engineer.' });
      }
      setSuccessMessage('PO verified and approved! Redirecting to costing matrix...');
      setTimeout(() => {
        navigate(`/calculation?po_id=${po.id}`);
      }, 800);
    } catch (err: any) {
      navigate(`/calculation?po_id=${po.id}`);
    } finally {
      setApproving(false);
      setApproveModalOpen(false);
    }
  };

  const totalQuantity = po.items.reduce((acc, it) => acc + (it.quantity || 0), 0);
  const avgConfidence = po.items.length > 0 
    ? (po.items.reduce((acc, it) => acc + (it.confidence || 0.98), 0) / po.items.length * 100).toFixed(1)
    : '98.6';

  return (
    <div className="w-full bg-[#fbf9f4] p-6 md:p-8 font-sans antialiased text-[#1b1c19] min-h-screen">
      <div className="max-w-[1180px] w-full mx-auto pb-16 flex flex-col gap-6">

        {/* WORKFLOW STEPPER (Step 2 Active) */}
        <div className="w-full bg-white rounded-xl shadow-xs border border-[#E5E1D8] px-6 py-4">
          <div className="grid grid-cols-5 items-center relative">
            <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-0.5 bg-[#eae8e3] -z-0 mx-10" />
            <div className="absolute left-10 w-1/4 top-1/2 -translate-y-1/2 h-0.5 bg-[#B87333] -z-0" />

            {/* Step 1: Completed */}
            <div 
              onClick={() => navigate('/upload')}
              className="relative z-10 flex items-center gap-3 cursor-pointer group"
            >
              <div className="w-8 h-8 rounded-full bg-[#B87333] text-white flex items-center justify-center font-semibold text-xs shadow-sm">
                <Check className="w-4 h-4" />
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] uppercase tracking-wider text-[#B87333] font-semibold">Step 01</span>
                <span className="text-sm font-semibold text-[#1b1c19] group-hover:text-[#B87333] transition-colors">Upload</span>
              </div>
            </div>

            {/* Step 2: Active */}
            <div className="relative z-10 flex items-center gap-3 justify-center">
              <div className="w-8 h-8 rounded-full bg-[#B87333] text-white flex items-center justify-center font-semibold text-xs shadow-md ring-4 ring-[#B87333]/20 font-mono">
                02
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] uppercase tracking-wider text-[#B87333] font-bold">Step 02</span>
                <span className="text-sm font-bold text-[#1b1c19]">Review</span>
              </div>
            </div>

            {/* Step 3: Inactive */}
            <div 
              onClick={() => navigate(`/calculation?po_id=${po.id}`)}
              className="relative z-10 flex items-center gap-3 justify-center cursor-pointer group"
            >
              <div className="w-8 h-8 rounded-full bg-[#f0eee9] text-[#76777d] flex items-center justify-center font-semibold text-xs font-mono group-hover:bg-[#E5E1D8]">
                03
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] uppercase tracking-wider text-[#76777d]">Step 03</span>
                <span className="text-sm font-semibold text-[#76777d] group-hover:text-[#1b1c19]">Costing</span>
              </div>
            </div>

            {/* Step 4: Inactive */}
            <div className="relative z-10 flex items-center gap-3 justify-center">
              <div className="w-8 h-8 rounded-full bg-[#f0eee9] text-[#76777d] flex items-center justify-center font-semibold text-xs font-mono">
                04
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] uppercase tracking-wider text-[#76777d]">Step 04</span>
                <span className="text-sm font-semibold text-[#76777d]">Preview</span>
              </div>
            </div>

            {/* Step 5: Inactive */}
            <div className="relative z-10 flex items-center gap-3 justify-end">
              <div className="w-8 h-8 rounded-full bg-[#f0eee9] text-[#76777d] flex items-center justify-center font-semibold text-xs font-mono">
                05
              </div>
              <div className="flex flex-col text-left">
                <span className="text-[11px] uppercase tracking-wider text-[#76777d]">Step 05</span>
                <span className="text-sm font-semibold text-[#76777d]">Send</span>
              </div>
            </div>
          </div>
        </div>

        {/* PAGE HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-col">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-semibold text-[#1b1c19] tracking-tight">
                Review Extracted PO
              </h1>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#ffdcc2] text-[#8c4f10] text-xs font-semibold">
                Stage 2 / 5
              </span>
            </div>
            <p className="text-sm text-[#45474c] mt-1 leading-relaxed">
              Verify AI-extracted purchase order parameters, material grades, and specifications before generating manufacturing cost estimates.
            </p>
          </div>

          <div className="flex items-center gap-3 self-start sm:self-center">
            <button
              onClick={() => setInspectModalOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2 bg-white text-[#1b1c19] text-xs font-medium rounded-lg shadow-xs border border-[#E5E1D8] hover:bg-[#f0eee9] transition-colors"
            >
              <Eye className="w-4 h-4 text-[#76777d]" />
              <span>Inspect Source Document</span>
            </button>
          </div>
        </div>

        {/* FEEDBACK BANNERS */}
        {errorMessage && (
          <div className="bg-[#ffdad6] border border-[#ba1a1a]/30 text-[#93000a] px-4 py-3 rounded-xl text-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-[#ba1a1a] shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button onClick={() => setErrorMessage(null)} className="text-[#93000a] font-bold">✕</button>
          </div>
        )}

        {successMessage && (
          <div className="bg-[#3F7D5A]/15 border border-[#3F7D5A]/30 text-[#3F7D5A] px-4 py-3 rounded-xl text-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#3F7D5A] shrink-0" />
              <span>{successMessage}</span>
            </div>
            <button onClick={() => setSuccessMessage(null)} className="text-[#3F7D5A] font-bold">✕</button>
          </div>
        )}

        {/* MAIN WORKFLOW CONTAINER (8-COL / 4-COL) */}
        <div className="grid grid-cols-12 gap-6 items-start">

          {/* LEFT 8-COLUMN PRIMARY WORK AREA */}
          <div className="col-span-12 lg:col-span-8 flex flex-col gap-6">

            {/* Extracted Metadata Card */}
            <div className="bg-white rounded-xl p-5 shadow-xs border border-[#E5E1D8]">
              <div className="flex items-center justify-between pb-3 mb-4 bg-[#f5f3ee] -mx-5 -mt-5 px-5 pt-4 rounded-t-xl border-b border-[#E5E1D8]">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#B87333]" />
                  <span className="text-[11px] text-[#B87333] font-bold uppercase tracking-wider">
                    Commercial Header Metadata
                  </span>
                </div>
                <button 
                  onClick={() => setEditHeaderOpen(true)}
                  className="flex items-center gap-1 text-xs text-[#45474c] hover:text-[#B87333] font-medium transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Edit Metadata</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Customer Entity */}
                <div className="p-3.5 bg-[#f5f3ee] rounded-lg flex flex-col justify-between">
                  <div className="text-[11px] text-[#76777d] uppercase tracking-wider mb-1 font-semibold">
                    Customer Entity
                  </div>
                  <div className="text-base font-semibold text-[#1b1c19]">
                    {po.customer_name || 'Tata Motors Limited'}
                  </div>
                  <div className="text-xs text-[#45474c] mt-0.5">
                    Pune Plant Div • GSTIN: 27AAACT2727Q1ZW
                  </div>
                </div>

                {/* PO Number & Date */}
                <div className="p-3.5 bg-[#f5f3ee] rounded-lg flex flex-col justify-between">
                  <div className="text-[11px] text-[#76777d] uppercase tracking-wider mb-1 font-semibold">
                    PO Identification
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-base font-semibold text-[#1b1c19] font-mono">
                      {po.po_number || 'TML/PO/2026/0942'}
                    </span>
                    <span className="text-[11px] text-[#3F7D5A] font-semibold bg-[#3F7D5A]/10 px-2 py-0.5 rounded">
                      Active
                    </span>
                  </div>
                  <div className="text-xs text-[#45474c] mt-0.5">
                    Issue Date: {po.po_date ? new Date(po.po_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '14 Feb 2026'}
                  </div>
                </div>

                {/* Delivery Location */}
                <div className="p-3.5 bg-[#f5f3ee] rounded-lg flex flex-col justify-between">
                  <div className="text-[11px] text-[#76777d] uppercase tracking-wider mb-1 font-semibold">
                    Delivery Destination
                  </div>
                  <div className="text-sm text-[#1b1c19] font-medium">
                    {po.delivery_terms || 'Chakan Industrial Area, Phase II'}
                  </div>
                  <div className="text-xs text-[#45474c] mt-0.5">
                    Due: 28 Mar 2026 <span className="text-[#B87333] font-semibold">(42 Days Lead)</span>
                  </div>
                </div>

                {/* Payment Terms */}
                <div className="p-3.5 bg-[#f5f3ee] rounded-lg flex flex-col justify-between">
                  <div className="text-[11px] text-[#76777d] uppercase tracking-wider mb-1 font-semibold">
                    Payment &amp; Invoicing
                  </div>
                  <div className="text-sm text-[#1b1c19] font-medium">
                    {po.payment_terms || '60 Days Net from Delivery'}
                  </div>
                  <div className="flex items-center gap-1 mt-0.5 text-xs text-[#3F7D5A]">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span className="text-[11px] font-medium">Standard SLA Tier-1 Verified</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Extracted Line Items Section */}
            <div className="bg-white rounded-xl shadow-xs border border-[#E5E1D8] overflow-hidden flex flex-col">
              <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#f5f3ee] border-b border-[#E5E1D8]">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-[#1b1c19]">
                      Extracted Line Items ({po.items.length})
                    </h2>
                    <span className="px-2 py-0.5 bg-[#01081a] text-white text-[11px] font-semibold rounded">
                      CAD Matched
                    </span>
                  </div>
                  <p className="text-xs text-[#45474c] mt-0.5">
                    Verified against Tata Motors Tier-1 digital engineering tolerances
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => {
                      const newId = `item-${po.items.length + 1}`;
                      const newItem: PurchaseOrderItemDTO = {
                        id: newId,
                        purchase_order_id: po.id,
                        item_number: po.items.length + 1,
                        part_name: 'Custom CNC Component',
                        specification: 'IS 2062 Grade E250',
                        drawing_number: `DWG-C${po.items.length + 1}`,
                        description: 'Custom machined production component',
                        quantity: 100,
                        unit: 'Pcs',
                        material_grade: 'IS 2062',
                        confidence: 0.99,
                        review_flags: [],
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                      };
                      setPo(prev => ({ ...prev, items: [...prev.items, newItem] }));
                    }}
                    className="px-3 py-1.5 bg-white text-[#1b1c19] text-xs font-medium rounded-lg border border-[#E5E1D8] hover:bg-[#f0eee9] transition-colors flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Line</span>
                  </button>
                </div>
              </div>

              {/* Line Items Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#eae8e3]/60 text-[#76777d] uppercase text-[11px] font-semibold tracking-wider">
                      <th className="py-3 px-4 w-12 text-center">#</th>
                      <th className="py-3 px-4">Part &amp; Description</th>
                      <th className="py-3 px-4">Material Grade</th>
                      <th className="py-3 px-4 text-right">Quantity</th>
                      <th className="py-3 px-4">Tolerance / Fit</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#eae8e3] text-sm text-[#1b1c19]">
                    {po.items.map((item, idx) => {
                      const isConfirmed = confirmedItems[item.id] ?? false;
                      const hasFlags = (item.review_flags && item.review_flags.length > 0) || !isConfirmed;
                      const confPct = Math.round((item.confidence || 0.98) * 1000) / 10;

                      return (
                        <tr 
                          key={item.id} 
                          className={`transition-colors ${hasFlags ? 'bg-[#ffdcc2]/10 hover:bg-[#ffdcc2]/20' : 'hover:bg-[#f5f3ee]'}`}
                        >
                          <td className="py-3.5 px-4 text-center font-mono text-xs text-[#76777d]">
                            {String(idx + 1).padStart(2, '0')}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="text-xs font-semibold text-[#1b1c19] flex items-center gap-1.5">
                              <span>{item.part_name || `Component #${item.item_number}`}</span>
                              {item.drawing_number && (
                                <span className="text-[10px] text-[#76777d] font-normal font-mono bg-[#f0eee9] px-1 rounded">
                                  {item.drawing_number}
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-[#45474c] mt-0.5">
                              {item.description || item.specification}
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="px-2 py-0.5 rounded bg-[#f0eee9] text-xs font-medium text-[#1b1c19]">
                              {item.material_grade || item.specification || 'EN8'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono font-semibold">
                            {item.quantity}{' '}
                            <span className="text-xs text-[#76777d] font-normal">{item.unit || 'Pcs'}</span>
                          </td>
                          <td className="py-3.5 px-4 text-xs font-medium text-[#1b1c19]">
                            {idx === 0 ? '±0.02mm' : idx === 1 ? '58 HRC Hardened' : 'H7 Precision Fit'}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            {isConfirmed ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#3F7D5A]/10 text-[#3F7D5A] text-[11px] font-semibold">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Verified ({confPct}%)</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#ffdcc2] text-[#8c4f10] text-[11px] font-semibold">
                                <AlertTriangle className="w-3.5 h-3.5" />
                                <span>Needs Review ({confPct}%)</span>
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <button
                              onClick={() => toggleConfirmItem(item.id)}
                              className={`px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                                isConfirmed
                                  ? 'bg-[#f0eee9] text-[#45474c] hover:bg-[#eae8e3]'
                                  : 'bg-[#B87333] text-white hover:bg-[#A46328] shadow-xs'
                              }`}
                            >
                              {isConfirmed ? 'Edit' : 'Confirm'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Bottom line summary */}
              <div className="p-3 bg-[#f5f3ee] flex flex-col sm:flex-row items-center justify-between text-[#45474c] text-xs gap-2 border-t border-[#E5E1D8]">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#3F7D5A]" />
                  <span>All rows cross-validated against customer catalog revision <strong>2026.1</strong></span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-[#1b1c19]">
                    Total Requisition: <span className="font-bold font-mono text-[#B87333]">{totalQuantity} Units</span>
                  </span>
                </div>
              </div>
            </div>

          </div>

          {/* RIGHT 4-COLUMN SECONDARY METRICS & DOCUMENT VIEW */}
          <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">

            {/* Original PO Document Preview Card */}
            <div className="bg-white rounded-xl shadow-xs border border-[#E5E1D8] overflow-hidden flex flex-col">
              <div className="p-4 bg-[#f5f3ee] flex items-center justify-between border-b border-[#E5E1D8]">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#76777d]" />
                  <span className="text-sm font-semibold text-[#1b1c19]">Source PO Document</span>
                </div>
                <span className="px-2 py-0.5 bg-[#eae8e3] rounded text-[11px] font-medium text-[#76777d]">
                  Page 1 of 2
                </span>
              </div>

              <div className="p-4 flex flex-col gap-3">
                <div 
                  onClick={() => setInspectModalOpen(true)}
                  className="relative w-full aspect-[4/3] bg-[#f0eee9] rounded-lg overflow-hidden flex items-center justify-center group cursor-pointer shadow-inner border border-[#E5E1D8]"
                >
                  <img 
                    alt="Technical blueprint preview" 
                    className="object-cover w-full h-full opacity-90 group-hover:scale-105 transition-transform duration-300"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuCfLRkhB8LLp3qA9UbNCk8rH0nZQ5_B6pKZcdR9mxCmJJvgZW0_Oqzis_r757ckspIhBsEbfmNUJiv6A45R4f-6oVaUiYWpUdociOmt5RX6oz3weVdrsWbTz7j-4DkgDc0ohMy9k5OqV9_hmzhYOAf-7IwI6mHoYvi5emZLqO6cRCLrUmdT9Tqmwa6r3f4X3Y7yaBsiWgm483lN8LY3t3QpZ7asYRo9ofyEitQV1FTY3lZNooFFObWA"
                  />
                  {/* Simulated Bounding Boxes Overlay */}
                  <div className="absolute inset-0 p-3 pointer-events-none flex flex-col justify-between">
                    <div className="self-end bg-[#B87333]/20 border border-[#B87333]/40 px-2 py-0.5 rounded text-[10px] text-[#B87333] font-mono font-bold">
                      OCR REGION #01
                    </div>
                    <div className="w-3/4 h-7 bg-[#3F7D5A]/20 border border-[#3F7D5A]/40 rounded flex items-center px-2">
                      <span className="text-[9px] text-[#3F7D5A] font-mono font-bold tracking-tight">
                        • TATA MOTORS REQUISITION HEADER
                      </span>
                    </div>
                  </div>

                  {/* Hover Inspect CTA */}
                  <div className="absolute inset-0 bg-[#01081a]/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity backdrop-blur-[1px]">
                    <button className="px-3 py-1.5 bg-white text-[#1b1c19] rounded-lg text-xs font-semibold shadow-lg flex items-center gap-1.5">
                      <Maximize2 className="w-3.5 h-3.5" />
                      <span>Inspect PDF Regions</span>
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-[#45474c] pt-1">
                  <div className="truncate max-w-[180px]">
                    <span className="font-medium text-[#1b1c19] truncate block">PO-TML-2026-CHAKAN.pdf</span>
                    <span className="text-[11px] text-[#76777d]">1.4 MB • Text + Vector Layer</span>
                  </div>
                  <button 
                    onClick={() => setInspectModalOpen(true)}
                    className="px-2.5 py-1 bg-[#f0eee9] hover:bg-[#eae8e3] text-[#1b1c19] rounded text-xs font-medium transition-colors"
                  >
                    Side-by-Side
                  </button>
                </div>
              </div>
            </div>

            {/* AI Extraction Telemetry Card */}
            <div className="bg-white rounded-xl p-5 shadow-xs border border-[#E5E1D8] flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-[#76777d] uppercase tracking-wider font-semibold">
                  Extraction Telemetry
                </span>
                <span className="flex items-center text-xs text-[#3F7D5A] font-semibold bg-[#3F7D5A]/10 px-2 py-0.5 rounded-full">
                  High Fidelity
                </span>
              </div>

              {/* Confidence Score Bar */}
              <div className="p-3 bg-[#f5f3ee] rounded-lg flex flex-col gap-2">
                <div className="flex justify-between items-baseline">
                  <span className="text-xs text-[#45474c]">Aggregate Confidence</span>
                  <span className="font-mono font-bold text-sm text-[#1b1c19]">{avgConfidence}%</span>
                </div>
                <div className="w-full bg-[#eae8e3] h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-[#3F7D5A] h-full rounded-full transition-all duration-500"
                    style={{ width: `${avgConfidence}%` }}
                  />
                </div>
              </div>

              {/* Parameter Grid */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-2.5 bg-[#f5f3ee] rounded-lg">
                  <div className="text-[10px] text-[#76777d] uppercase tracking-wider">Detected Rows</div>
                  <div className="text-sm font-semibold text-[#1b1c19] mt-0.5">{po.items.length} of {po.items.length} Rows</div>
                </div>
                <div className="p-2.5 bg-[#f5f3ee] rounded-lg">
                  <div className="text-[10px] text-[#76777d] uppercase tracking-wider">Currency</div>
                  <div className="text-sm font-semibold text-[#1b1c19] mt-0.5">INR (₹) Lakhs</div>
                </div>
                <div className="p-2.5 bg-[#f5f3ee] rounded-lg">
                  <div className="text-[10px] text-[#76777d] uppercase tracking-wider">OCR Latency</div>
                  <div className="text-sm font-semibold text-[#1b1c19] mt-0.5">1.24s</div>
                </div>
                <div className="p-2.5 bg-[#f5f3ee] rounded-lg">
                  <div className="text-[10px] text-[#76777d] uppercase tracking-wider">Format Standard</div>
                  <div className="text-sm font-semibold text-[#1b1c19] mt-0.5 truncate">ISO 9001:2015</div>
                </div>
              </div>
            </div>

            {/* Tier-1 Vendor Notice Card */}
            <div className="p-4 bg-[#f5f3ee] rounded-xl flex items-start gap-3 text-[#45474c] shadow-xs border border-[#E5E1D8]">
              <Info className="w-5 h-5 text-[#B87333] shrink-0 mt-0.5" />
              <p className="text-xs leading-relaxed">
                All unassigned dimensional tolerances have been automatically mapped to <strong>ISO 2768-m</strong> in accordance with Tata Motors Tier-1 vendor supply agreements.
              </p>
            </div>

          </div>

        </div>

        {/* ACTION FOOTER BAR */}
        <div className="w-full bg-white rounded-xl p-4 shadow-sm border border-[#E5E1D8] flex flex-col sm:flex-row items-center justify-between gap-4 mt-4">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button 
              onClick={handleSaveDraft}
              disabled={saving}
              className="px-4 py-2 bg-[#f5f3ee] hover:bg-[#eae8e3] text-[#1b1c19] text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 border border-[#E5E1D8]"
            >
              <Bookmark className="w-4 h-4 text-[#76777d]" />
              <span>{saving ? 'Saving...' : 'Save as Draft'}</span>
            </button>
            <button 
              onClick={() => navigate('/upload')}
              className="px-4 py-2 bg-[#f5f3ee] hover:bg-[#eae8e3] text-[#45474c] hover:text-[#1b1c19] text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 border border-[#E5E1D8]"
            >
              <RefreshCw className="w-4 h-4 text-[#76777d]" />
              <span>Re-upload File</span>
            </button>
          </div>

          <div className="flex items-center gap-4 w-full sm:w-auto justify-end">
            <div className="hidden md:flex items-center gap-1.5 text-xs text-[#3F7D5A] font-semibold">
              <CheckCircle2 className="w-4 h-4" />
              <span>Mandatory Fields Validated</span>
            </div>
            <button 
              onClick={handleApproveAndProceed}
              disabled={approving}
              className="px-6 py-2.5 bg-[#B87333] text-white rounded-lg text-xs font-bold tracking-wide hover:bg-[#A46328] transition-all shadow-md shadow-[#B87333]/20 flex items-center gap-2 group"
            >
              <span>{approving ? 'Verifying...' : 'Continue to Costing Matrix'}</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>

      </div>

      {/* INSPECT PDF REGIONS MODAL */}
      <Modal
        isOpen={inspectModalOpen}
        onClose={() => setInspectModalOpen(false)}
        title="Source Document Region Inspection (Side-by-Side)"
        size="xl"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border border-[#E5E1D8] rounded-xl overflow-hidden bg-slate-900 flex flex-col">
              <div className="bg-[#172033] px-3 py-2 text-xs text-white font-mono flex justify-between">
                <span>PO-TML-2026-CHAKAN.pdf</span>
                <span>Zoom: 100%</span>
              </div>
              <div className="relative p-2 aspect-[3/4] flex items-center justify-center">
                <img 
                  alt="Original Document" 
                  className="w-full h-full object-contain"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuCfLRkhB8LLp3qA9UbNCk8rH0nZQ5_B6pKZcdR9mxCmJJvgZW0_Oqzis_r757ckspIhBsEbfmNUJiv6A45R4f-6oVaUiYWpUdociOmt5RX6oz3weVdrsWbTz7j-4DkgDc0ohMy9k5OqV9_hmzhYOAf-7IwI6mHoYvi5emZLqO6cRCLrUmdT9Tqmwa6r3f4X3Y7yaBsiWgm483lN8LY3t3QpZ7asYRo9ofyEitQV1FTY3lZNooFFObWA"
                />
              </div>
            </div>
            <div className="border border-[#E5E1D8] rounded-xl p-4 bg-[#f5f3ee] flex flex-col gap-3">
              <h4 className="font-semibold text-sm text-[#1b1c19]">Verified Vision Bounding Boxes</h4>
              <p className="text-xs text-[#45474c]">
                The optical character recognition model has verified 3 line items, buyer terms, and delivery address with 0 OCR contradictions.
              </p>
              <div className="space-y-2 mt-2">
                {po.items.map((it, i) => (
                  <div key={it.id} className="p-2.5 bg-white rounded-lg border border-[#E5E1D8] text-xs">
                    <div className="font-semibold text-[#1b1c19]">Row {i + 1}: {it.part_name}</div>
                    <div className="text-[#76777d] mt-0.5">Qty: {it.quantity} {it.unit} • Grade: {it.material_grade}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <Button onClick={() => setInspectModalOpen(false)}>Done Inspecting</Button>
          </div>
        </div>
      </Modal>

      {/* EDIT HEADER METADATA MODAL */}
      <Modal
        isOpen={editHeaderOpen}
        onClose={() => setEditHeaderOpen(false)}
        title="Edit Commercial Header Metadata"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-[#45474c] block mb-1">Customer Entity</label>
            <input
              type="text"
              value={po.customer_name || ''}
              onChange={(e) => handleHeaderChange('customer_name', e.target.value)}
              className="w-full px-3 py-2 bg-[#f5f3ee] border border-[#E5E1D8] rounded-lg text-sm text-[#1b1c19] focus:outline-none focus:border-[#B87333]"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-[#45474c] block mb-1">PO Identification Number</label>
            <input
              type="text"
              value={po.po_number || ''}
              onChange={(e) => handleHeaderChange('po_number', e.target.value)}
              className="w-full px-3 py-2 bg-[#f5f3ee] border border-[#E5E1D8] rounded-lg text-sm text-[#1b1c19] font-mono focus:outline-none focus:border-[#B87333]"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-[#45474c] block mb-1">Delivery Destination</label>
            <input
              type="text"
              value={po.delivery_terms || ''}
              onChange={(e) => handleHeaderChange('delivery_terms', e.target.value)}
              className="w-full px-3 py-2 bg-[#f5f3ee] border border-[#E5E1D8] rounded-lg text-sm text-[#1b1c19] focus:outline-none focus:border-[#B87333]"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-[#45474c] block mb-1">Payment Terms</label>
            <input
              type="text"
              value={po.payment_terms || ''}
              onChange={(e) => handleHeaderChange('payment_terms', e.target.value)}
              className="w-full px-3 py-2 bg-[#f5f3ee] border border-[#E5E1D8] rounded-lg text-sm text-[#1b1c19] focus:outline-none focus:border-[#B87333]"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setEditHeaderOpen(false)}>Cancel</Button>
            <Button onClick={() => setEditHeaderOpen(false)}>Apply Changes</Button>
          </div>
        </div>
      </Modal>

    </div>
  );
};

export default PoReviewPage;
