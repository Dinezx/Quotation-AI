import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  Calendar, 
  MapPin, 
  Plus, 
  ArrowRight, 
  RotateCcw, 
  Code, 
  Save, 
  ExternalLink,
  ShieldCheck,
  TrendingUp,
  Clock,
  Edit2
} from 'lucide-react';
import { WorkflowStepper } from '../../components/layout/WorkflowStepper';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Drawer } from '../../components/ui/Drawer';
import { Modal } from '../../components/ui/Modal';
import { poService } from '../../services/poService';
import { useDensity } from '../../context/DensityContext';

export const PoReviewPage: React.FC = () => {
  const navigate = useNavigate();
  const { poId } = useParams<{ poId: string }>();
  const [po, setPo] = useState(poService.getCurrentPO());
  const [originalPoDrawerOpen, setOriginalPoDrawerOpen] = useState(false);
  const [addCustomModalOpen, setAddCustomModalOpen] = useState(false);
  const { isComfortable } = useDensity();
  
  // Custom item form state
  const [customDescription, setCustomDescription] = useState('');
  const [customHsn, setCustomHsn] = useState('84139190');
  const [customSpec, setCustomSpec] = useState('');
  const [customQty, setCustomQty] = useState(1);
  const [customUnit, setCustomUnit] = useState('Nos');

  // Resolution of Item #3 grade
  const handleGradeChange = (itemId: string, grade: string) => {
    const updated = poService.resolveItemGrade(itemId, grade);
    setPo({ ...updated });
  };

  const handleAddCustomItemSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customDescription) return;
    const updated = poService.addCustomItem({
      itemDescription: customDescription,
      hsnCode: customHsn,
      extractedSpecification: customSpec || 'Custom Machined Part',
      rateCardMatch: 'Standard CNC Machining @ ₹450/hr',
      rateCardMatchStatus: 'VERIFIED',
      quantity: customQty,
      unit: customUnit,
      grossWeightKg: 10,
      scrapWeightKg: 2,
      machiningHours: 1.0
    });
    setPo({ ...updated });
    setAddCustomModalOpen(false);
    setCustomDescription('');
    setCustomSpec('');
  };

  const ambiguousItem = po.items.find(i => i.rateCardMatchStatus === 'AMBIGUOUS');

  return (
    <div className="min-h-full flex flex-col bg-[#f8fafc]">
      {/* 6-Step Workflow Stepper: Step 3 Active */}
      <WorkflowStepper currentStep={3} />

      <div className={`max-w-7xl mx-auto w-full flex-1 pb-28 ${isComfortable ? 'p-6 md:p-8 space-y-7' : 'p-4 md:p-6 space-y-5'}`}>
        {/* Header Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1.5">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                Review Extracted PO Details
              </h1>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                AI Extraction: 96% Confidence (High Precision)
              </span>
            </div>
            <p className="text-sm text-slate-500 leading-relaxed max-w-2xl">
              Confirm OCR mapped fields, check material specification tags against MSME rate cards, and resolve raw grade flags before generation.
            </p>
          </div>

          {/* Right: Original Document Tile */}
          <div className="flex items-center gap-3 bg-white border border-slate-200/80 rounded-xl p-3 shadow-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center font-bold text-xs shrink-0">
                PDF
              </div>
              <div className="text-left">
                <div className="text-xs font-bold text-slate-900 font-mono">
                  {po.originalFileName}
                </div>
                <div className="text-[11px] text-slate-400">Page 1 of {po.totalPages} (248 KB)</div>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setOriginalPoDrawerOpen(true)}
              icon={<ExternalLink className="w-3.5 h-3.5" />}
            >
              View Original PO
            </Button>
          </div>
        </div>

        {/* Ambiguity Alert Banner */}
        {ambiguousItem && (
          <div 
            id="ambiguity-banner"
            className="bg-amber-50 border border-amber-300 rounded-xl p-4 md:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-sm shadow-xs"
          >
            <div className="flex items-start sm:items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-amber-700" />
              </div>
              <div>
                <span className="font-bold text-amber-950 block">
                  1 item requires material grade verification before costing calculation
                </span>
                <span className="text-amber-800 text-xs mt-0.5 block">
                  Item #03 'Cover Plate' has ambiguous tensile grade in customer PO specification.
                </span>
              </div>
            </div>

            <button
              onClick={() => {
                const el = document.getElementById('item-row-03');
                el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }}
              className="px-4 py-2 bg-amber-200 hover:bg-amber-300 text-amber-950 font-bold rounded-lg text-xs transition-colors cursor-pointer shrink-0 shadow-2xs"
            >
              Jump to Item #3
            </button>
          </div>
        )}

        {/* Section 1: Customer & Purchase Order Metadata */}
        <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs">
          <div className="px-6 py-4 border-b border-slate-200/80 bg-slate-50/60 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-md bg-blue-100 text-blue-700 flex items-center justify-center">
                <FileText className="w-3.5 h-3.5" />
              </div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Customer & Purchase Order Metadata
              </h2>
            </div>
            <span className="text-xs font-mono font-semibold text-slate-500 bg-white px-2.5 py-1 rounded-md border border-slate-200">
              EXTRACTED WITH 99.2% ACCURACY
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
                  value={po.metadata.name}
                  onChange={(e) => {
                    const updated = poService.updateMetadata({ name: e.target.value });
                    setPo({ ...updated });
                  }}
                  className="w-full pl-3.5 pr-9 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl font-semibold text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all"
                />
                <Edit2 className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Customer GSTIN */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 block mb-1.5">
                Customer GSTIN
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={po.metadata.gstin}
                  onChange={(e) => {
                    const updated = poService.updateMetadata({ gstin: e.target.value });
                    setPo({ ...updated });
                  }}
                  className="w-full pl-3.5 pr-9 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl font-mono font-semibold text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all"
                />
                <Edit2 className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
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
                  value={po.metadata.poNumber}
                  onChange={(e) => {
                    const updated = poService.updateMetadata({ poNumber: e.target.value });
                    setPo({ ...updated });
                  }}
                  className="w-full pl-3.5 pr-9 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl font-mono font-semibold text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all"
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
                  value={po.metadata.poDate}
                  onChange={(e) => {
                    const updated = poService.updateMetadata({ poDate: e.target.value });
                    setPo({ ...updated });
                  }}
                  className="w-full pl-3.5 pr-9 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all"
                />
                <Calendar className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Delivery Due Date */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 block mb-1.5">
                Delivery Due Date
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={po.metadata.deliveryDueDate}
                  onChange={(e) => {
                    const updated = poService.updateMetadata({ deliveryDueDate: e.target.value });
                    setPo({ ...updated });
                  }}
                  className="w-full pl-3.5 pr-9 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all"
                />
                <Calendar className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Billing Address */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 block mb-1.5">
                Billing Address
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={po.metadata.billingAddress}
                  onChange={(e) => {
                    const updated = poService.updateMetadata({ billingAddress: e.target.value });
                    setPo({ ...updated });
                  }}
                  className="w-full pl-3.5 pr-9 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-sm text-slate-900 truncate focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all"
                />
                <MapPin className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Extracted Bill of Quantities (BOQ Items) */}
        <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs">
          <div className="px-6 py-4 border-b border-slate-200/80 bg-slate-50/60 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Extracted Bill of Quantities (BOQ Items)
              </h2>
              <span className="text-xs font-mono font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                {po.items.length} Items Found
              </span>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setAddCustomModalOpen(true)}
              icon={<Plus className="w-4 h-4" />}
            >
              Add Custom Item
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[11px] tracking-wider">
                  <th className="py-3 px-5 w-14">S.No</th>
                  <th className="py-3 px-5">Item Description</th>
                  <th className="py-3 px-5">Extracted Specification</th>
                  <th className="py-3 px-5">Rate Card Match</th>
                  <th className="py-3 px-5 text-center">Quantity</th>
                  <th className="py-3 px-5 text-center">Unit</th>
                  <th className="py-3 px-5 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {po.items.map((item) => {
                  const isAmbiguous = item.rateCardMatchStatus === 'AMBIGUOUS';

                  return (
                    <tr 
                      key={item.id} 
                      id={`item-row-${item.sNo}`}
                      className={`transition-colors ${
                        isAmbiguous ? 'bg-amber-50/50' : 'hover:bg-slate-50/70'
                      }`}
                    >
                      <td className="py-4 px-5 font-mono text-slate-400 font-semibold text-sm">
                        {item.sNo}
                      </td>

                      {/* Item Description */}
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-2 font-bold text-slate-950 text-sm">
                          {item.itemDescription}
                          {isAmbiguous && <AlertTriangle className="w-4 h-4 text-amber-600" />}
                        </div>
                        <div className="font-mono text-xs text-slate-400 mt-0.5">
                          HSN: {item.hsnCode} • Drg: {item.drawingCode || 'BPE-STD'}
                        </div>
                      </td>

                      {/* Extracted Specification */}
                      <td className="py-4 px-5">
                        <div className={`px-3 py-1.5 rounded-lg text-xs font-mono inline-block ${
                          isAmbiguous
                            ? 'bg-amber-100 text-amber-950 border border-amber-300 font-bold'
                            : 'bg-slate-100 text-slate-800 border border-slate-200 font-medium'
                        }`}>
                          {item.extractedSpecification}
                        </div>
                      </td>

                      {/* Rate Card Match */}
                      <td className="py-4 px-5">
                        {isAmbiguous ? (
                          <div className="space-y-1.5">
                            <select
                              value={item.selectedGrade || ''}
                              onChange={(e) => handleGradeChange(item.id, e.target.value)}
                              className="w-full px-3 py-2 bg-white border-2 border-amber-400 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 shadow-xs"
                            >
                              <option value="">Select Tensile Grade...</option>
                              <option value="Mild Steel (IS 2062 Grade E250)">
                                IS 2062 Grade E250 (Laser Quality) — ₹68/kg
                              </option>
                              <option value="Mild Steel (IS 2062 Grade E350)">
                                IS 2062 Grade E350 (High Tensile) — ₹74/kg
                              </option>
                              <option value="Mild Steel (IS 2062 Grade E410)">
                                IS 2062 Grade E410 (Boiler Quality) — ₹82/kg
                              </option>
                            </select>
                            <span className="text-[11px] text-amber-800 italic block">
                              Select plate grade to resolve rate card link
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 font-mono text-emerald-700 font-semibold text-xs">
                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                            <span>{item.rateCardMatch}</span>
                          </div>
                        )}
                      </td>

                      {/* Quantity */}
                      <td className="py-4 px-5 text-center font-mono font-bold text-slate-950 text-sm">
                        {item.quantity}
                      </td>

                      {/* Unit */}
                      <td className="py-4 px-5 text-center font-mono text-slate-600 text-xs">
                        {item.unit}
                      </td>

                      {/* Attention */}
                      <td className="py-4 px-5 text-right">
                        {isAmbiguous ? (
                          <Badge variant="warning" size="md" dot>
                            Spec Ambiguity
                          </Badge>
                        ) : (
                          <Badge variant="success" size="md" dot>
                            Verified
                          </Badge>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Table Footer Telemetry */}
          <div className="p-4 bg-slate-50 border-t border-slate-200/80 text-xs text-slate-500 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-5">
              <span>Total Lines: <strong className="font-mono text-slate-900">{po.items.length}</strong></span>
              <span>Total Pieces: <strong className="font-mono text-slate-900">35 Nos</strong></span>
              <span className="hidden md:inline">Extraction Engine: <strong className="font-mono text-slate-900">OCR-Manufacturing v4.2</strong></span>
            </div>

            <button
              onClick={() => alert("Re-running OCR extraction for page 1...")}
              className="text-blue-600 hover:text-blue-800 font-semibold text-xs cursor-pointer"
            >
              Re-run OCR for Page 1
            </button>
          </div>
        </div>

        {/* Bottom 3 Contextual Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Tax Compliance
              </span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-sm font-bold text-slate-900">
              Inter-state / IGST Check
            </div>
            <div className="text-xs text-slate-500 leading-relaxed">
              Maharashtra (27) to Maharashtra (27) — Intrastate CGST 9% + SGST 9% auto-configured.
            </div>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Raw Material Index
              </span>
              <TrendingUp className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-sm font-bold text-slate-900">
              Active Spot Metal Rates
            </div>
            <div className="text-xs text-slate-500 leading-relaxed">
              Pune steel & cast iron prices synchronized today from Mandi hub.
            </div>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Standard Lead Time
              </span>
              <Clock className="w-4 h-4 text-slate-400" />
            </div>
            <div className="text-sm font-bold text-slate-900">
              15 Days (Due: 30 Sep 2026)
            </div>
            <div className="text-xs text-slate-500 leading-relaxed">
              Capacity verified in CNC Machining Bay 3 for 35 total parts.
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Bottom Action Bar */}
      <div className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-slate-200/80 py-3.5 px-4 md:px-8 flex items-center justify-between z-30 shadow-lg">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="md"
            onClick={() => navigate('/upload')}
            icon={<RotateCcw className="w-4 h-4 text-rose-600" />}
            className="text-rose-600 hover:bg-rose-50 font-medium"
          >
            Discard & Re-upload
          </Button>

          <Button
            variant="outline"
            size="md"
            onClick={() => alert("Raw OCR JSON view toggle")}
            icon={<Code className="w-4 h-4 text-slate-500" />}
          >
            Edit Raw PO Data
          </Button>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="md"
            onClick={() => alert("PO draft state saved.")}
            icon={<Save className="w-4 h-4 text-slate-500" />}
          >
            Save Draft
          </Button>

          <Button
            variant="primary"
            size="md"
            onClick={() => navigate('/calculation/qt-089')}
            icon={<ArrowRight className="w-4 h-4" />}
            iconPosition="right"
          >
            Confirm & Calculate Quotation
          </Button>
        </div>
      </div>

      {/* Slide-over Original PO Document Drawer */}
      <Drawer
        isOpen={originalPoDrawerOpen}
        onClose={() => setOriginalPoDrawerOpen(false)}
        title="Original Scanned Purchase Order Document"
        subtitle="Mahindra Precision Agro Pvt Ltd • File: Mahindra_Agro_PO_441.pdf"
        width="2xl"
      >
        <div className="bg-slate-100 p-6 rounded-xl border border-slate-300 font-sans text-xs space-y-4 shadow-inner">
          <div className="bg-white p-6 rounded-xl shadow-md border border-slate-300 space-y-4">
            <div className="border-b-2 border-slate-900 pb-3 flex justify-between items-start">
              <div>
                <div className="text-base font-bold text-slate-900 uppercase">MAHINDRA PRECISION AGRO PVT LTD</div>
                <div className="text-xs text-slate-500">MIDC Butibori, Nagpur 441108 • GSTIN: 27AAAPM8891C1Z4</div>
              </div>
              <div className="text-right">
                <div className="text-xs font-bold text-slate-900 font-mono">PURCHASE ORDER</div>
                <div className="text-xs font-mono text-slate-700">NO: PO-2026-441</div>
                <div className="text-xs text-slate-500">Date: 15-09-2026</div>
              </div>
            </div>

            <div>
              <div className="text-xs font-bold text-slate-400 uppercase">Vendor:</div>
              <div className="font-semibold text-slate-900 text-sm">Bharat Precision Engineering Pvt Ltd</div>
              <div className="text-xs text-slate-600">Plot 42, MIDC Bhosari Industrial Area, Pune 411026</div>
            </div>

            <table className="w-full text-xs border border-slate-300">
              <thead className="bg-slate-100 border-b border-slate-300 font-semibold">
                <tr>
                  <th className="p-2 border-r border-slate-300">Item</th>
                  <th className="p-2 border-r border-slate-300">Description & Specification</th>
                  <th className="p-2 border-r border-slate-300 text-center">Qty</th>
                  <th className="p-2 text-center">UOM</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-slate-200">
                  <td className="p-2 border-r border-slate-300 font-mono">01</td>
                  <td className="p-2 border-r border-slate-300">Pump Casing (CI Grade 2 Cast Iron) Drg BPE-PC-402</td>
                  <td className="p-2 border-r border-slate-300 text-center font-mono font-bold">10</td>
                  <td className="p-2 text-center">Nos</td>
                </tr>
                <tr className="border-b border-slate-200">
                  <td className="p-2 border-r border-slate-300 font-mono">02</td>
                  <td className="p-2 border-r border-slate-300">Drive Shaft (EN8 Steel Alloy Induction Hardened)</td>
                  <td className="p-2 border-r border-slate-300 text-center font-mono font-bold">5</td>
                  <td className="p-2 text-center">Nos</td>
                </tr>
                <tr>
                  <td className="p-2 border-r border-slate-300 font-mono">03</td>
                  <td className="p-2 border-r border-slate-300 bg-amber-50">
                    Cover Plate (Mild Steel IS 2062 Grade) Surface Zinc Plated
                  </td>
                  <td className="p-2 border-r border-slate-300 text-center font-mono font-bold">20</td>
                  <td className="p-2 text-center">Nos</td>
                </tr>
              </tbody>
            </table>

            <div className="pt-2 text-xs text-slate-500 space-y-1">
              <div>Delivery: Within 15 days from PO acceptance.</div>
              <div>Payment Terms: 30 Days after receipt of materials at Nagpur plant.</div>
            </div>
          </div>
        </div>
      </Drawer>

      {/* Add Custom BOQ Item Modal */}
      <Modal
        isOpen={addCustomModalOpen}
        onClose={() => setAddCustomModalOpen(false)}
        title="Add Custom Bill of Quantity Item"
        description="Manually append an additional manufactured part or tooling fee to this quotation"
        maxWidth="lg"
      >
        <form onSubmit={handleAddCustomItemSubmit} className="space-y-5 text-xs">
          <div>
            <label className="text-xs font-semibold uppercase text-slate-600 block mb-1.5">
              Part / Item Description *
            </label>
            <input
              type="text"
              required
              value={customDescription}
              onChange={(e) => setCustomDescription(e.target.value)}
              placeholder="e.g. Adapter Flange Ring (Machined)"
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl font-medium text-sm focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold uppercase text-slate-600 block mb-1.5">
                HSN / SAC Code
              </label>
              <input
                type="text"
                value={customHsn}
                onChange={(e) => setCustomHsn(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl font-mono text-sm focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase text-slate-600 block mb-1.5">
                Specification / Material
              </label>
              <input
                type="text"
                value={customSpec}
                onChange={(e) => setCustomSpec(e.target.value)}
                placeholder="e.g. SS 304 Austenitic"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold uppercase text-slate-600 block mb-1.5">
                Quantity
              </label>
              <input
                type="number"
                min="1"
                value={customQty}
                onChange={(e) => setCustomQty(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl font-mono text-sm font-bold focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase text-slate-600 block mb-1.5">
                Unit of Measure
              </label>
              <select
                value={customUnit}
                onChange={(e) => setCustomUnit(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl bg-white text-sm focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 focus:outline-none"
              >
                <option value="Nos">Nos</option>
                <option value="Kg">Kg</option>
                <option value="Sets">Sets</option>
                <option value="Meters">Meters</option>
              </select>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
            <Button
              variant="outline"
              size="md"
              type="button"
              onClick={() => setAddCustomModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="md"
              type="submit"
            >
              Append to BOQ
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
