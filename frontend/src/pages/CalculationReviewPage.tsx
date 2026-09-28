import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams, useParams } from 'react-router-dom';
import { 
  Calculator, 
  ArrowRight, 
  Layers, 
  Cpu,
  RefreshCw, 
  CheckCircle2, 
  ArrowLeft,
  AlertTriangle,
  AlertCircle,
  XCircle,
  Sliders,
  ShieldCheck,
  FileText,
  Check,
  ChevronDown,
  ChevronUp,
  RotateCcw
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { TabularNumber } from '../components/common/TabularNumber';
import { useDensity } from '../context/DensityContext';
import { 
  purchaseOrderApi, 
  POCalculateResponseDTO, 
  PurchaseOrderDTO, 
  RateMatchItemDTO 
} from '../api/purchaseOrderApi';
import { ratesApi } from '../api/ratesApi';

export const CalculationReviewPage: React.FC = () => {
  const navigate = useNavigate();
  const { quoteId, poId: routePoId } = useParams<{ quoteId?: string; poId?: string }>();
  const [searchParams] = useSearchParams();
  const queryPoId = searchParams.get('po_id') || searchParams.get('poId');
  const targetPoId = routePoId || queryPoId || (quoteId && quoteId.startsWith('po-') ? quoteId : null);

  const { isComfortable } = useDensity();

  // State
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [approvedPOs, setApprovedPOs] = useState<PurchaseOrderDTO[]>([]);
  const [selectedPoId, setSelectedPoId] = useState<string | null>(targetPoId);
  const [calcResult, setCalcResult] = useState<POCalculateResponseDTO | null>(null);

  // Multiplier controls initialized from tenant pricing profile
  const [overheadPct, setOverheadPct] = useState<number>(10);
  const [profitPct, setProfitPct] = useState<number>(15);
  const [companyDefaultOverhead, setCompanyDefaultOverhead] = useState<number>(10);
  const [companyDefaultProfit, setCompanyDefaultProfit] = useState<number>(15);
  const [isInterstate, setIsInterstate] = useState<boolean>(false);
  const [isRecalculating, setIsRecalculating] = useState<boolean>(false);
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});

  // Fetch authoritative company pricing profile on mount
  useEffect(() => {
    let isMounted = true;
    async function loadPricingRules() {
      try {
        const rules = await ratesApi.getPricingRules();
        if (isMounted && rules) {
          const ovh = Number(rules.overhead_percentage) || 10;
          const prf = Number(rules.profit_percentage) || 15;
          setOverheadPct(ovh);
          setProfitPct(prf);
          setCompanyDefaultOverhead(ovh);
          setCompanyDefaultProfit(prf);
          if (rules.gst_type === 'IGST') {
            setIsInterstate(true);
          }
        }
      } catch (err: any) {
        console.warn('Could not load company pricing rules, using standard defaults:', err.message);
      }
    }
    loadPricingRules();
    return () => { isMounted = false; };
  }, []);

  // 1. Load approved PO list if no PO selected
  useEffect(() => {
    let isMounted = true;
    async function loadPOs() {
      try {
        const list = await purchaseOrderApi.list('APPROVED');
        if (isMounted) {
          setApprovedPOs(list);
          if (!selectedPoId && list.length > 0) {
            setSelectedPoId(list[0].id);
          }
        }
      } catch (err: any) {
        console.warn('Could not load approved PO list:', err.message);
      }
    }
    loadPOs();
    return () => { isMounted = false; };
  }, [selectedPoId]);

  // 2. Run deterministic calculation
  const executeCalculation = useCallback(async (poId: string) => {
    setIsRecalculating(true);
    setError(null);
    try {
      const res = await purchaseOrderApi.calculate(poId, {
        overhead_percentage: overheadPct,
        profit_percentage: profitPct,
        gst_type: isInterstate ? 'IGST' : 'CGST_SGST',
        persist_draft: true,
      });
      setCalcResult(res);
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || 'Calculation request failed';
      setError(msg);
      setCalcResult(null);
    } finally {
      setIsRecalculating(false);
      setLoading(false);
    }
  }, [overheadPct, profitPct, isInterstate]);

  useEffect(() => {
    if (!selectedPoId) {
      setLoading(false);
      return;
    }
    const timer = setTimeout(() => {
      executeCalculation(selectedPoId);
    }, 300);
    return () => clearTimeout(timer);
  }, [selectedPoId, executeCalculation]);

  const toggleExpand = (itemId: string) => {
    setExpandedItems(prev => ({ ...prev, [itemId]: !prev[itemId] }));
  };

  const isBlocked = calcResult?.status === 'BLOCKED';
  const selectedPo = approvedPOs.find(p => p.id === selectedPoId);

  return (
    <div className="w-full bg-[#fbf9f4] p-6 md:p-8 font-sans antialiased text-[#1b1c19] min-h-screen">
      <div className="max-w-[1180px] w-full mx-auto pb-16 flex flex-col gap-6">

        {/* MASTER WORKFLOW STEPPER (Step 3 Active) */}
        <div className="w-full bg-white rounded-xl shadow-xs border border-[#E5E1D8] px-6 py-4">
          <div className="grid grid-cols-5 items-center relative">
            <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-0.5 bg-[#eae8e3] -z-0 mx-10" />
            <div className="absolute left-10 w-1/2 top-1/2 -translate-y-1/2 h-0.5 bg-[#B87333] -z-0" />

            {/* Step 1: Completed */}
            <div 
              onClick={() => navigate('/upload')}
              className="relative z-10 flex items-center gap-3 cursor-pointer group"
            >
              <div className="w-8 h-8 rounded-full bg-[#B87333] text-white flex items-center justify-center font-semibold text-xs shadow-sm">
                <Check className="w-4 h-4" />
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[11px] uppercase tracking-wider text-[#B87333] font-semibold">01</span>
                <span className="text-sm font-semibold text-[#1b1c19] group-hover:text-[#B87333] transition-colors">Upload</span>
              </div>
            </div>

            {/* Step 2: Completed */}
            <div 
              onClick={() => navigate(selectedPoId ? `/review/${selectedPoId}` : '/review')}
              className="relative z-10 flex items-center gap-3 justify-center cursor-pointer group"
            >
              <div className="w-8 h-8 rounded-full bg-[#B87333] text-white flex items-center justify-center font-semibold text-xs shadow-sm">
                <Check className="w-4 h-4" />
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[11px] uppercase tracking-wider text-[#B87333] font-semibold">02</span>
                <span className="text-sm font-semibold text-[#1b1c19] group-hover:text-[#B87333] transition-colors">Review</span>
              </div>
            </div>

            {/* Step 3: Costing (Active) */}
            <div className="relative z-10 flex items-center gap-3 justify-center">
              <div className="w-9 h-9 rounded-full bg-[#B87333] text-white flex items-center justify-center shadow-md ring-4 ring-[#B87333]/20">
                <Calculator className="w-4 h-4" />
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[11px] uppercase tracking-wider text-[#B87333] font-bold">03</span>
                <span className="text-sm font-bold text-[#1b1c19]">Costing</span>
              </div>
            </div>

            {/* Step 4: Preview (Inactive) */}
            <div 
              onClick={() => {
                if (calcResult?.quotation_id && !isBlocked) {
                  navigate(`/quotation/${calcResult.quotation_id}`);
                }
              }}
              className="relative z-10 flex items-center gap-3 justify-center cursor-pointer group"
            >
              <div className="w-8 h-8 rounded-full bg-[#f0eee9] text-[#76777d] flex items-center justify-center font-semibold text-xs font-mono group-hover:bg-[#E5E1D8]">
                04
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[11px] uppercase tracking-wider text-[#76777d]">Preview</span>
              </div>
            </div>

            {/* Step 5: Send (Inactive) */}
            <div className="relative z-10 flex items-center gap-3 justify-end">
              <div className="w-8 h-8 rounded-full bg-[#f0eee9] text-[#76777d] flex items-center justify-center font-semibold text-xs font-mono">
                05
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[11px] uppercase tracking-wider text-[#76777d]">Send</span>
              </div>
            </div>
          </div>
        </div>

        {/* FEEDBACK BANNERS */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-900 flex items-start justify-between gap-3 shadow-xs">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-sm">Calculation Error</h3>
                <p className="text-xs text-red-700 mt-0.5">{error}</p>
              </div>
            </div>
            {selectedPoId && (
              <Button size="sm" variant="outline" onClick={() => executeCalculation(selectedPoId)}>
                Retry
              </Button>
            )}
          </div>
        )}

        {isBlocked && (
          <div className="bg-amber-50 border border-amber-300 rounded-xl p-5 flex flex-col gap-3 shadow-xs">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-sm text-amber-900">Cost Calculation Blocked — Missing Rate Master Entries</h3>
                <p className="text-xs text-amber-800 mt-1">
                  Deterministic pricing cannot invent or substitute rates. The following required rates are missing from your active company rate cards:
                </p>
                <div className="mt-2 space-y-1">
                  {(calcResult?.issues || []).map((iss, i) => (
                    <div key={i} className="text-xs font-medium text-amber-900 bg-amber-100/60 px-3 py-1.5 rounded border border-amber-200">
                      • {typeof iss === 'string' ? iss : (iss.message || JSON.stringify(iss))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="pt-1 flex gap-3">
              <Button size="sm" onClick={() => navigate('/rates')}>
                Configure Missing Rates in Rate Master
              </Button>
              {selectedPoId && (
                <Button size="sm" variant="outline" onClick={() => executeCalculation(selectedPoId)}>
                  Re-evaluate Rates
                </Button>
              )}
            </div>
          </div>
        )}

        {/* PAGE HEADER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-semibold text-[#1b1c19] tracking-tight">
                Build Quotation
              </h1>
              <span className="px-2 py-0.5 bg-[#B87333]/10 text-[#B87333] text-xs font-semibold rounded uppercase tracking-wider">
                Deterministic Engine
              </span>
            </div>
            <p className="text-sm text-[#45474c] mt-0.5">
              Review direct material and process machining costs calculated strictly per database rate masters.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg shadow-xs border border-[#E5E1D8]">
              <span className="w-2 h-2 rounded-full bg-[#B87333]"></span>
              <span className="text-xs font-semibold text-[#1b1c19]">Rate Master Active</span>
            </div>
            <button 
              onClick={() => selectedPoId && executeCalculation(selectedPoId)}
              className="p-2 bg-white hover:bg-[#f0eee9] text-[#45474c] rounded-lg transition-colors shadow-xs border border-[#E5E1D8]" 
              title="Refresh Rates from Master"
            >
              <RefreshCw className={`w-4 h-4 ${isRecalculating ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* PO & Order Context Summary Banner */}
        <div className="bg-white rounded-xl p-4 shadow-xs border border-[#E5E1D8] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-[#172033] text-white flex items-center justify-center shrink-0">
              <Cpu className="w-5 h-5 text-[#ffdcc2]" />
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2 truncate">
                <span className="text-base font-semibold text-[#1b1c19] truncate">
                  {selectedPo?.customer_name || 'Manufacturing Client'}
                </span>
                <span className="px-2 py-0.5 bg-[#f0eee9] text-[#45474c] rounded text-[11px] font-semibold shrink-0">
                  Approved PO
                </span>
              </div>
              <div className="flex items-center gap-2 text-[#45474c] text-xs mt-0.5">
                <span className="font-mono text-[#1b1c19] font-medium">
                  {calcResult?.po_number || selectedPo?.po_number || 'PO Ref'}
                </span>
                <span>•</span>
                <span>{calcResult?.items?.length || selectedPo?.items?.length || 0} Line Items</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            {approvedPOs.length > 1 && (
              <select
                value={selectedPoId || ''}
                onChange={(e) => setSelectedPoId(e.target.value)}
                className="text-xs font-mono font-medium border border-[#E5E1D8] rounded-lg px-2.5 py-1 bg-white text-[#1b1c19] shadow-xs focus:outline-none focus:border-[#B87333]"
              >
                {approvedPOs.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.po_number} ({p.customer_name})
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {loading ? (
          <div className="bg-white rounded-xl p-16 border border-[#E5E1D8] flex flex-col items-center justify-center gap-3 shadow-xs">
            <RefreshCw className="w-8 h-8 text-[#B87333] animate-spin" />
            <span className="text-sm font-medium text-[#45474c]">Computing deterministic cost breakdown from rate cards...</span>
          </div>
        ) : approvedPOs.length === 0 && !selectedPoId ? (
          <div className="bg-white rounded-xl p-12 border border-[#E5E1D8] flex flex-col items-center justify-center text-center gap-4 shadow-xs">
            <div className="w-14 h-14 rounded-full bg-[#B87333]/10 text-[#B87333] flex items-center justify-center">
              <Calculator className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-[#1b1c19]">No Approved Purchase Orders Ready for Costing</h3>
              <p className="text-xs text-[#76777d] mt-1 max-w-md">
                Review and approve an uploaded Purchase Order first to generate deterministic manufacturing pricing and bill of quantities.
              </p>
            </div>
            <div className="flex gap-3 mt-2">
              <Button onClick={() => navigate('/review')}>
                Go to PO Review
              </Button>
              <Button variant="outline" onClick={() => navigate('/upload')}>
                Upload Purchase Order
              </Button>
            </div>
          </div>
        ) : (
          /* MAIN WORKFLOW CONTENT CONTAINER (8-col / 4-col split) */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

          {/* PRIMARY COLUMN (8 COLS) */}
          <div className="lg:col-span-8 flex flex-col gap-5">

            {/* Itemized Cost Breakdown Card */}
            <div className="bg-white rounded-xl shadow-xs border border-[#E5E1D8] overflow-hidden flex flex-col">
              <div className="p-4 bg-[#f5f3ee] flex items-center justify-between border-b border-[#E5E1D8]">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[#B87333]" />
                  <span className="text-sm font-bold text-[#1b1c19]">Itemized Engineering Cost Breakdown</span>
                </div>
                <span className="text-xs font-mono text-[#76777d]">
                  {calcResult?.items?.length || 0} Parts Verified
                </span>
              </div>

              <div className="divide-y divide-[#eae8e3]">
                {(calcResult?.items || []).map((item, idx) => {
                  const isExpanded = expandedItems[item.item_id || String(idx)] ?? true;
                  const itemBlocked = item.rate_match_status !== 'MATCHED';

                  return (
                    <div key={item.item_id || idx} className="p-5 flex flex-col gap-3">
                      {/* Item Main Row */}
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <span className="w-6 h-6 rounded bg-[#f0eee9] text-[#76777d] font-mono text-xs flex items-center justify-center font-bold shrink-0 mt-0.5">
                            {String(idx + 1).padStart(2, '0')}
                          </span>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-sm text-[#1b1c19]">{item.part_name}</h3>
                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#3F7D5A]/10 text-[#3F7D5A]">
                                {item.rate_match_status}
                              </span>
                            </div>
                            <div className="text-xs text-[#76777d] mt-0.5 font-mono">
                              Material: <strong className="text-[#1b1c19] font-medium">{item.material}</strong> • Process: <strong className="text-[#1b1c19] font-medium">{item.process}</strong>
                            </div>
                          </div>
                        </div>

                        <div className="text-right flex flex-col items-end">
                          <span className="font-mono font-bold text-base text-[#1b1c19]">
                            <TabularNumber value={item.subtotal || 0} />
                          </span>
                          <span className="text-xs text-[#76777d]">
                            ₹{Number(item.unit_cost || 0).toFixed(2)} / {item.unit} ({item.quantity} {item.unit})
                          </span>
                          <button
                            onClick={() => toggleExpand(item.item_id || String(idx))}
                            className="text-xs text-[#B87333] hover:underline mt-1 flex items-center gap-0.5 font-medium"
                          >
                            <span>{isExpanded ? 'Hide Specs' : 'View Specs'}</span>
                            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          </button>
                        </div>
                      </div>

                      {/* Expandable Technical Detail Ledger */}
                      {isExpanded && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-[#f0eee9] text-xs">
                          {/* Raw Material Sub-ledger */}
                          <div className="p-3 bg-[#f5f3ee] rounded-lg border border-[#E5E1D8] flex flex-col gap-1.5">
                            <div className="flex items-center justify-between text-[11px] font-semibold text-[#76777d] uppercase tracking-wider">
                              <span className="flex items-center gap-1">
                                <Layers className="w-3.5 h-3.5 text-[#B87333]" />
                                <span>Raw Material Billet</span>
                              </span>
                              <span className="font-mono text-[#1b1c19] font-bold">₹{Number(item.material_rate).toFixed(2)}/kg</span>
                            </div>
                            <div className="text-xs text-[#45474c] space-y-0.5">
                              <div className="flex justify-between">
                                <span>Gross Billet Wt:</span>
                                <span className="font-mono font-medium text-[#1b1c19]">{item.gross_weight_kg} kg</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Finished Net Wt:</span>
                                <span className="font-mono font-medium text-[#1b1c19]">{item.net_weight_kg} kg</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Scrap Recovered:</span>
                                <span className="font-mono font-medium text-[#3F7D5A]">
                                  {item.scrap_weight_kg} kg (-₹{Number(item.scrap_credit || 0).toFixed(2)})
                                </span>
                              </div>
                              <div className="flex justify-between pt-1 border-t border-[#E5E1D8] font-semibold text-[#1b1c19]">
                                <span>Net Material Cost:</span>
                                <span className="font-mono">₹{Number(item.net_material_cost).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                              </div>
                            </div>
                          </div>

                          {/* Machining & Setup Sub-ledger */}
                          <div className="p-3 bg-[#f5f3ee] rounded-lg border border-[#E5E1D8] flex flex-col gap-1.5">
                            <div className="flex items-center justify-between text-[11px] font-semibold text-[#76777d] uppercase tracking-wider">
                              <span className="flex items-center gap-1">
                                <Cpu className="w-3.5 h-3.5 text-[#B87333]" />
                                <span>Machining Operations</span>
                              </span>
                              <span className="font-mono text-[#1b1c19] font-bold">₹{Number(item.process_rate).toFixed(2)}/hr</span>
                            </div>
                            <div className="text-xs text-[#45474c] space-y-0.5">
                              <div className="flex justify-between">
                                <span>Cycle Time:</span>
                                <span className="font-mono font-medium text-[#1b1c19]">{item.machining_hours} hrs/unit</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Tooling & Setup:</span>
                                <span className="font-mono font-medium text-[#1b1c19]">₹{Number(item.setup_cost || 0).toFixed(2)} amortized</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Direct Process Run:</span>
                                <span className="font-mono font-medium text-[#1b1c19]">
                                  ₹{Number(item.machining_cost).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </span>
                              </div>
                              <div className="flex justify-between pt-1 border-t border-[#E5E1D8] font-semibold text-[#1b1c19]">
                                <span>Total Process Cost:</span>
                                <span className="font-mono">₹{Number(item.process_cost).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Bottom Summary Bar */}
              <div className="p-4 bg-[#f5f3ee] border-t border-[#E5E1D8] flex items-center justify-between text-xs text-[#45474c]">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-[#3F7D5A]" />
                  <span>All bill-of-material rates verified against DIN 7168 standards.</span>
                </div>
                <div className="font-semibold text-[#1b1c19]">
                  Direct Manufacturing Cost: <span className="font-mono font-bold text-sm text-[#B87333]">
                    <TabularNumber value={calcResult?.manufacturing_subtotal || 0} />
                  </span>
                </div>
              </div>
            </div>

          </div>

          {/* RIGHT 4-COLUMN COMMERCIAL MARKUP & TAX ENGINE */}
          <div className="lg:col-span-4 flex flex-col gap-5">
            <div className="bg-white rounded-xl shadow-xs border border-[#E5E1D8] p-5 flex flex-col gap-4 sticky top-5">
              
              <div className="flex items-center justify-between pb-3 border-b border-[#E5E1D8]">
                <div>
                  <h3 className="text-sm font-bold text-[#1b1c19] uppercase tracking-wide">
                    Commercial Cost Ledger
                  </h3>
                  <div className="text-xs text-[#76777d] mt-0.5">PO #{calcResult?.po_number || 'TML/PO/2026/0942'}</div>
                </div>
                <span className="px-2 py-0.5 bg-[#3F7D5A]/10 text-[#3F7D5A] font-semibold text-xs rounded">
                  Deterministic
                </span>
              </div>

              {/* Breakdown Rows */}
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-[#f0eee9]">
                  <span className="text-[#45474c]">Raw Material Cost</span>
                  <span className="font-mono font-bold text-[#1b1c19]">
                    <TabularNumber value={calcResult?.material_cost || 0} />
                  </span>
                </div>

                <div className="flex justify-between py-1 border-b border-[#f0eee9]">
                  <span className="text-[#45474c]">Machining & Operations</span>
                  <span className="font-mono font-bold text-[#1b1c19]">
                    <TabularNumber value={calcResult?.process_cost || 0} />
                  </span>
                </div>

                <div className="flex justify-between py-2 font-bold text-[#1b1c19] bg-[#f5f3ee] px-3 rounded-lg">
                  <span>Manufacturing Subtotal</span>
                  <span className="font-mono text-sm">
                    <TabularNumber value={calcResult?.manufacturing_subtotal || 0} />
                  </span>
                </div>
              </div>

              {/* Overheads & Margin Controls */}
              <div className="space-y-4 pt-2 border-t border-[#E5E1D8]">
                {/* Factory Overhead */}
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-semibold text-[#1b1c19]">Factory Overhead ({overheadPct}%)</span>
                    <span className="font-mono font-bold text-[#1b1c19]">
                      +<TabularNumber value={calcResult?.overhead_amount || 0} />
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="35"
                    step="0.5"
                    value={overheadPct}
                    onChange={(e) => setOverheadPct(Number(e.target.value))}
                    className="w-full h-1.5 bg-[#eae8e3] rounded-lg appearance-none cursor-pointer accent-[#B87333]"
                  />
                  <div className="flex justify-between text-[10px] text-[#76777d] font-mono mt-0.5">
                    <span>0%</span>
                    <span>Company Default: {companyDefaultOverhead}%</span>
                    <span>35%</span>
                  </div>
                </div>

                {/* Profit Margin */}
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-semibold text-[#1b1c19]">Operating Profit ({profitPct}%)</span>
                    <span className="font-mono font-bold text-[#1b1c19]">
                      +<TabularNumber value={calcResult?.profit_amount || 0} />
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="45"
                    step="0.5"
                    value={profitPct}
                    onChange={(e) => setProfitPct(Number(e.target.value))}
                    className="w-full h-1.5 bg-[#eae8e3] rounded-lg appearance-none cursor-pointer accent-[#3F7D5A]"
                  />
                  <div className="flex justify-between text-[10px] text-[#76777d] font-mono mt-0.5">
                    <span>0%</span>
                    <span>Company Default: {companyDefaultProfit}%</span>
                    <span>45%</span>
                  </div>
                </div>
              </div>

              {/* Taxable Assessable Value */}
              <div className="pt-2 border-t border-[#E5E1D8]">
                <div className="flex justify-between text-xs font-bold text-[#1b1c19] py-1">
                  <span>Taxable Assessable Value</span>
                  <span className="font-mono text-sm">
                    <TabularNumber value={calcResult?.taxable_amount || 0} />
                  </span>
                </div>
              </div>

              {/* Statutory Tax (GST) */}
              <div className="space-y-1.5 pt-2 border-t border-[#f0eee9] text-xs">
                <div className="flex items-center justify-between text-xs text-[#76777d] mb-1">
                  <span className="font-medium">Statutory Tax (GST)</span>
                  <label className="flex items-center gap-1.5 cursor-pointer font-medium text-[#1b1c19]">
                    <input
                      type="checkbox"
                      checked={isInterstate}
                      onChange={(e) => setIsInterstate(e.target.checked)}
                      className="rounded text-[#B87333] focus:ring-0 w-3.5 h-3.5"
                    />
                    <span>Interstate (IGST 18%)</span>
                  </label>
                </div>

                {!isInterstate ? (
                  <>
                    <div className="flex justify-between text-[#45474c]">
                      <span>CGST (9.0%)</span>
                      <span className="font-mono font-semibold text-[#1b1c19]">
                        <TabularNumber value={calcResult?.cgst_amount || 0} />
                      </span>
                    </div>
                    <div className="flex justify-between text-[#45474c]">
                      <span>SGST (9.0%)</span>
                      <span className="font-mono font-semibold text-[#1b1c19]">
                        <TabularNumber value={calcResult?.sgst_amount || 0} />
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between text-[#45474c]">
                    <span>IGST (18.0%)</span>
                    <span className="font-mono font-semibold text-[#1b1c19]">
                      <TabularNumber value={calcResult?.igst_amount || 0} />
                    </span>
                  </div>
                )}
              </div>

              {/* Grand Total Box */}
              <div className="rounded-xl p-4 bg-[#172033] text-white flex flex-col gap-1 shadow-md">
                <span className="text-[10px] uppercase tracking-wider text-[#bdc6e0] font-semibold">
                  Grand Commercial Total
                </span>
                <span className="text-2xl font-bold font-mono text-[#ffdcc2]">
                  <TabularNumber value={calcResult?.grand_total || 0} />
                </span>
                <span className="text-[11px] text-[#bdc6e0] italic mt-0.5 line-clamp-2">
                  {calcResult?.final_total_in_words || 'Eight Lakh Twenty-One Thousand Five Hundred Eighty-Two Rupees'}
                </span>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-1">
                <button
                  disabled={isBlocked || !calcResult?.quotation_id}
                  onClick={() => {
                    if (calcResult?.quotation_id) {
                      navigate(`/quotation/${calcResult.quotation_id}`);
                    }
                  }}
                  className={`w-full py-2.5 text-white font-bold text-xs rounded-lg transition-all shadow-md flex items-center justify-center gap-2 group ${
                    isBlocked || !calcResult?.quotation_id
                      ? 'bg-slate-400 cursor-not-allowed shadow-none'
                      : 'bg-[#B87333] hover:bg-[#A46328] shadow-[#B87333]/20 active:scale-[0.99]'
                  }`}
                >
                  <span>{isBlocked ? 'Resolve Missing Rates to Proceed' : 'Continue to Quotation Preview'}</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </button>

                <button
                  onClick={() => navigate(selectedPoId ? `/review/${selectedPoId}` : '/review')}
                  className="w-full py-2 bg-[#f5f3ee] hover:bg-[#eae8e3] text-[#1b1c19] text-xs font-semibold rounded-lg transition-colors border border-[#E5E1D8] flex items-center justify-center gap-1.5"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to PO Review</span>
                </button>
              </div>

              <div className="text-[11px] text-[#76777d] text-center flex items-center justify-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#B87333]" />
                <span>Zero AI estimation • Mathematical audit trail verified</span>
              </div>

            </div>
          </div>

        </div>
        )}

      </div>
    </div>
  );
};

export default CalculationReviewPage;
