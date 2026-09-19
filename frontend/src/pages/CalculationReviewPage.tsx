import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams, useParams } from 'react-router-dom';
import { 
  Calculator, 
  ArrowRight, 
  Layers, 
  RefreshCw, 
  CheckCircle2, 
  ArrowLeft,
  AlertTriangle,
  AlertCircle,
  XCircle,
  Sliders,
  ShieldCheck,
  FileText
} from 'lucide-react';
import { WorkflowStepper } from '../components/layout/WorkflowStepper';
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

  // Multiplier controls
  const [overheadPct, setOverheadPct] = useState<number>(10);
  const [profitPct, setProfitPct] = useState<number>(15);
  const [isInterstate, setIsInterstate] = useState<boolean>(false);
  const [isRecalculating, setIsRecalculating] = useState<boolean>(false);

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
    if (selectedPoId) {
      executeCalculation(selectedPoId);
    } else {
      setLoading(false);
    }
  }, [selectedPoId, executeCalculation]);

  const isBlocked = calcResult?.status === 'BLOCKED';
  const isSuccess = calcResult?.status === 'SUCCESS';

  return (
    <div className="min-h-full flex flex-col bg-[#f8fafc]">
      {/* 6-Step Workflow Stepper: Step 4 Active */}
      <WorkflowStepper currentStep={4} />

      <div className={`max-w-7xl mx-auto w-full flex-1 pb-28 ${isComfortable ? 'p-6 md:p-8 space-y-7' : 'p-4 md:p-6 space-y-5'}`}>
        
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                Step 4 • Deterministic Pricing & Rate Matching
              </span>
              {calcResult && (
                <Badge variant={isBlocked ? 'danger' : 'success'} size="sm" dot>
                  {isBlocked ? 'CALCULATION BLOCKED' : 'RATES MATCHED'}
                </Badge>
              )}
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
              Quotation Costing & Commercial Review
              {selectedPoId && approvedPOs.length > 1 && (
                <select
                  value={selectedPoId}
                  onChange={(e) => setSelectedPoId(e.target.value)}
                  className="text-xs font-mono font-medium border border-slate-300 rounded-lg px-2.5 py-1 bg-white text-slate-700 shadow-xs focus:ring-2 focus:ring-blue-500"
                >
                  {approvedPOs.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.po_number} ({p.customer_name || 'Customer'})
                    </option>
                  ))}
                </select>
              )}
            </h1>
            <p className="text-sm text-slate-500 mt-1 max-w-2xl leading-relaxed">
              Deterministic calculation engine using company rate cards and Python Decimal precision. Zero AI estimation or guessing.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Button
              variant="outline"
              size="md"
              onClick={() => navigate(selectedPoId ? `/review/${selectedPoId}` : '/review')}
              icon={<ArrowLeft className="w-4 h-4" />}
            >
              Back to PO Review
            </Button>
            <Button
              variant="primary"
              size="md"
              disabled={isBlocked || loading || isRecalculating}
              onClick={() => navigate(`/quotation/${calcResult?.quotation_id || 'qt-089'}`)}
              icon={<ArrowRight className="w-4 h-4" />}
              iconPosition="right"
            >
              {isBlocked ? 'Resolve Blockers to Proceed' : 'Proceed to Quotation Dispatch'}
            </Button>
          </div>
        </div>

        {/* Loading Spinner */}
        {loading && (
          <div className="flex flex-col items-center justify-center p-16 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
            <div className="text-sm font-semibold text-slate-700">Running Deterministic Rate Matching & Costing...</div>
            <div className="text-xs text-slate-400 font-mono">Querying tenant material & process rate catalogs</div>
          </div>
        )}

        {/* Global Error Banner */}
        {error && !loading && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 flex items-start gap-3">
            <XCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-sm">Pricing Execution Error</div>
              <div className="text-xs text-red-700 mt-0.5 leading-relaxed">{error}</div>
            </div>
          </div>
        )}

        {/* Empty State: No Approved PO Selected */}
        {!selectedPoId && !loading && (
          <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <AlertCircle className="w-10 h-10 text-amber-500 mx-auto" />
            <h3 className="font-bold text-slate-900 text-lg">No Approved Purchase Order Selected</h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto">
              Calculation can only be performed on APPROVED purchase orders. Please approve a purchase order in Step 3 first.
            </p>
            <Button variant="primary" size="md" onClick={() => navigate('/review')}>
              Go to PO Review
            </Button>
          </div>
        )}

        {/* Main Content Area */}
        {calcResult && !loading && (
          <>
            {/* Blocked Status Banner (Step 15 requirement) */}
            {isBlocked && (
              <div className="p-5 rounded-2xl bg-amber-50 border-2 border-amber-300 shadow-xs space-y-3">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h2 className="text-base font-bold text-amber-950 flex items-center gap-2">
                      Pricing Blocked — Rate or Process Prerequisite Missing
                    </h2>
                    <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                      Quotation AI enforces strict anti-hallucination standards. Zero rates or processes are guessed or assumed.
                      All required operations, materials, and weights must exist in the company rate cards before commercial costing can finalize.
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-amber-200/80 space-y-1.5">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-amber-900">
                    Active Calculation Issues ({calcResult.issues.length}):
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {calcResult.issues.map((iss, i) => (
                      <div key={i} className="flex items-center gap-2 p-2.5 rounded-lg bg-white/80 border border-amber-200 text-xs">
                        <span className="font-mono font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded text-[11px]">
                          {iss.code}
                        </span>
                        <span className="text-slate-800 truncate">
                          {iss.part_name ? `Item #${iss.item_number} (${iss.part_name}): ` : ''}{iss.message}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Success Status Banner */}
            {isSuccess && (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center justify-between">
                <div className="flex items-center gap-2.5 text-xs font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Deterministic Calculation Verified: All {calcResult.items.length} line items matched to active tenant rate catalog.</span>
                </div>
                <span className="font-mono text-[11px] text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded">
                  PO #{calcResult.po_number}
                </span>
              </div>
            )}

            {/* 2-Column Responsive Workspace */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-7">
              
              {/* Left Column: Line-Item Costing Cards (7 Cols) */}
              <div className="lg:col-span-7 space-y-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <Layers className="w-4 h-4 text-blue-600" />
                    Line-Item Precision Rate Matching & Costing
                  </h2>
                  <span className="text-xs text-slate-500 font-mono">
                    {calcResult.items.length} Manufactured {calcResult.items.length === 1 ? 'Part' : 'Parts'}
                  </span>
                </div>

                {/* Render Item Cards */}
                {calcResult.items.map((item: RateMatchItemDTO) => {
                  const itemBlocked = item.rate_match_status !== 'MATCHED';

                  return (
                    <div 
                      key={item.item_id || item.item_number}
                      className={`bg-white border rounded-2xl p-6 shadow-xs space-y-4 transition-all ${
                        itemBlocked ? 'border-amber-300 ring-2 ring-amber-100' : 'border-slate-200/80'
                      }`}
                    >
                      {/* Card Header */}
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2.5">
                            <span className="font-mono text-sm text-slate-400 font-bold">
                              {String(item.item_number).padStart(2, '0')}
                            </span>
                            <h3 className="font-bold text-base text-slate-950">
                              {item.part_name}
                            </h3>
                            <Badge 
                              variant={itemBlocked ? 'danger' : 'success'} 
                              size="sm"
                            >
                              {item.rate_match_status}
                            </Badge>
                          </div>
                          <div className="text-xs text-slate-500 mt-1 font-mono">
                            Material: <span className="font-semibold text-slate-700">{item.material || 'NOT SPECIFIED'}</span>
                            {' • '}
                            Process: <span className="font-semibold text-slate-700">{item.process || 'NOT SPECIFIED'}</span>
                          </div>
                        </div>

                        <div className="text-right font-mono">
                          {item.subtotal !== undefined && item.subtotal !== null ? (
                            <>
                              <div className="text-base font-bold text-slate-950">
                                <TabularNumber value={item.subtotal} />
                              </div>
                              <div className="text-xs text-slate-400">
                                ₹{item.unit_cost?.toLocaleString()} / {item.unit} ({item.quantity} {item.unit})
                              </div>
                            </>
                          ) : (
                            <div className="text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-1 rounded border border-amber-200">
                              Pricing Blocked
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Warnings / Messages for this item */}
                      {item.rate_match_messages && item.rate_match_messages.length > 0 && (
                        <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200 text-xs text-amber-900 space-y-1">
                          {item.rate_match_messages.map((m, mi) => (
                            <div key={mi} className="flex items-center gap-1.5">
                              <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                              <span>{m}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Cost Breakdown Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-100 text-xs font-mono">
                        
                        {/* Material Block */}
                        <div className={`p-3.5 rounded-xl border ${
                          item.material_rate ? 'bg-slate-50 border-slate-200/80' : 'bg-red-50/50 border-red-200'
                        }`}>
                          <div className="flex items-center justify-between text-[11px] uppercase text-slate-500 font-sans font-semibold">
                            <span>Material Billet Cost</span>
                            {item.material_rate ? (
                              <span className="text-emerald-700 font-mono font-bold">₹{item.material_rate}/kg</span>
                            ) : (
                              <span className="text-red-600 font-sans font-bold">RATE MISSING</span>
                            )}
                          </div>
                          
                          {item.net_material_cost !== undefined && item.net_material_cost !== null ? (
                            <>
                              <div className="text-slate-950 font-bold text-sm mt-1">
                                ₹{item.net_material_cost.toLocaleString()}
                              </div>
                              <div className="text-[11px] text-slate-500 mt-0.5 font-sans leading-relaxed">
                                Gross {item.gross_weight_kg}kg × ₹{item.material_rate}/kg × {item.quantity} = ₹{item.gross_material_cost}
                                {item.scrap_weight_kg > 0 && item.scrap_credit ? (
                                  <> • Scrap -₹{item.scrap_credit}</>
                                ) : null}
                              </div>
                            </>
                          ) : (
                            <div className="text-xs text-slate-400 mt-2 italic font-sans">
                              {item.gross_weight_kg === 0 ? 'Gross weight missing' : 'Requires rate card match'}
                            </div>
                          )}
                        </div>

                        {/* Process Block */}
                        <div className={`p-3.5 rounded-xl border ${
                          item.process_rate ? 'bg-slate-50 border-slate-200/80' : 'bg-red-50/50 border-red-200'
                        }`}>
                          <div className="flex items-center justify-between text-[11px] uppercase text-slate-500 font-sans font-semibold">
                            <span>Machining & Setup</span>
                            {item.process_rate ? (
                              <span className="text-blue-700 font-mono font-bold">₹{item.process_rate}/hr</span>
                            ) : (
                              <span className="text-red-600 font-sans font-bold">
                                {item.process ? 'RATE MISSING' : 'PROCESS MISSING'}
                              </span>
                            )}
                          </div>

                          {item.process_cost !== undefined && item.process_cost !== null ? (
                            <>
                              <div className="text-slate-950 font-bold text-sm mt-1">
                                ₹{item.process_cost.toLocaleString()}
                              </div>
                              <div className="text-[11px] text-slate-500 mt-0.5 font-sans leading-relaxed">
                                {item.machining_hours}h × ₹{item.process_rate}/hr × {item.quantity} = ₹{item.machining_cost}
                                {item.setup_cost ? ` + Setup ₹${item.setup_cost}` : ''}
                              </div>
                            </>
                          ) : (
                            <div className="text-xs text-slate-400 mt-2 italic font-sans">
                              {item.process ? 'Process rate card unlisted' : 'Operation must be assigned'}
                            </div>
                          )}
                        </div>

                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Right Column: Sticky Commercial Costing Ledger (5 Cols) */}
              <div className="lg:col-span-5 space-y-5">
                <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-5 sticky top-5">
                  
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200/80">
                    <div>
                      <h3 className="font-bold text-sm text-slate-900 uppercase tracking-tight flex items-center gap-2">
                        <Calculator className="w-4 h-4 text-slate-700" />
                        Commercial Costing Ledger
                      </h3>
                      <div className="text-xs text-slate-500 mt-0.5">PO #{calcResult.po_number} • Currency: {calcResult.currency}</div>
                    </div>
                    <Badge variant={isBlocked ? 'danger' : 'success'} size="md" dot>
                      {isBlocked ? 'Blocked' : 'Deterministic'}
                    </Badge>
                  </div>

                  {/* Base Cost Summary */}
                  <div className="space-y-2.5 text-xs">
                    <div className="flex justify-between py-1.5 border-b border-slate-100">
                      <span className="text-slate-600">Total Raw Material Cost</span>
                      <span className="font-mono font-bold text-slate-900 text-sm">
                        {calcResult.material_cost !== undefined && calcResult.material_cost !== null ? (
                          <TabularNumber value={calcResult.material_cost} />
                        ) : (
                          <span className="text-slate-400">--</span>
                        )}
                      </span>
                    </div>

                    <div className="flex justify-between py-1.5 border-b border-slate-100">
                      <span className="text-slate-600">Total Machining & Process Cost</span>
                      <span className="font-mono font-bold text-slate-900 text-sm">
                        {calcResult.process_cost !== undefined && calcResult.process_cost !== null ? (
                          <TabularNumber value={calcResult.process_cost} />
                        ) : (
                          <span className="text-slate-400">--</span>
                        )}
                      </span>
                    </div>

                    <div className="flex justify-between py-2 font-bold text-slate-950 bg-slate-50 px-3 rounded-xl">
                      <span>Manufacturing Base Subtotal</span>
                      <span className="font-mono text-sm">
                        {calcResult.manufacturing_subtotal !== undefined && calcResult.manufacturing_subtotal !== null ? (
                          <TabularNumber value={calcResult.manufacturing_subtotal} />
                        ) : (
                          <span className="text-slate-400">--</span>
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Interactive Overheads & Margin Sliders */}
                  <div className="space-y-4 pt-2 border-t border-slate-200/80">
                    
                    {/* Overhead Slider */}
                    <div>
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="font-semibold text-slate-800">Factory Overhead ({overheadPct}%)</span>
                        <span className="font-mono font-bold text-slate-950">
                          {calcResult.overhead_amount !== undefined && calcResult.overhead_amount !== null ? (
                            <>+<TabularNumber value={calcResult.overhead_amount} /></>
                          ) : (
                            <span className="text-slate-400">--</span>
                          )}
                        </span>
                      </div>
                      <input
                        type="range"
                        min="5"
                        max="25"
                        step="1"
                        value={overheadPct}
                        onChange={(e) => setOverheadPct(Number(e.target.value))}
                        disabled={isBlocked}
                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600 disabled:opacity-50"
                      />
                      <div className="flex justify-between text-[10px] text-slate-400 font-mono mt-1">
                        <span>5%</span>
                        <span>Default: 10%</span>
                        <span>25%</span>
                      </div>
                    </div>

                    {/* Profit Margin Slider */}
                    <div>
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="font-semibold text-slate-800">Commercial Profit Margin ({profitPct}%)</span>
                        <span className="font-mono font-bold text-slate-950">
                          {calcResult.profit_amount !== undefined && calcResult.profit_amount !== null ? (
                            <>+<TabularNumber value={calcResult.profit_amount} /></>
                          ) : (
                            <span className="text-slate-400">--</span>
                          )}
                        </span>
                      </div>
                      <input
                        type="range"
                        min="5"
                        max="30"
                        step="1"
                        value={profitPct}
                        onChange={(e) => setProfitPct(Number(e.target.value))}
                        disabled={isBlocked}
                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600 disabled:opacity-50"
                      />
                      <div className="flex justify-between text-[10px] text-slate-400 font-mono mt-1">
                        <span>5%</span>
                        <span>Default: 15%</span>
                        <span>30%</span>
                      </div>
                    </div>
                  </div>

                  {/* Taxable Assessable Value */}
                  <div className="pt-2 border-t border-slate-200/80">
                    <div className="flex justify-between text-xs font-bold text-slate-900 py-1">
                      <span>Taxable Assessable Value</span>
                      <span className="font-mono text-base">
                        {calcResult.taxable_amount !== undefined && calcResult.taxable_amount !== null ? (
                          <TabularNumber value={calcResult.taxable_amount} />
                        ) : (
                          <span className="text-slate-400">--</span>
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Statutory GST Breakup */}
                  <div className="space-y-2 pt-2 border-t border-slate-100 text-xs">
                    <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                      <span className="font-medium">Statutory Tax (GST)</span>
                      <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                        <input
                          type="checkbox"
                          checked={isInterstate}
                          onChange={(e) => setIsInterstate(e.target.checked)}
                          disabled={isBlocked}
                          className="rounded text-blue-600 focus:ring-0 w-3.5 h-3.5 disabled:opacity-50"
                        />
                        <span>Interstate (IGST 18%)</span>
                      </label>
                    </div>

                    {!isInterstate ? (
                      <>
                        <div className="flex justify-between text-slate-600">
                          <span>Central GST (CGST @ 9.0%)</span>
                          <span className="font-mono font-semibold text-slate-900">
                            {calcResult.cgst_amount !== undefined && calcResult.cgst_amount !== null ? (
                              <TabularNumber value={calcResult.cgst_amount} />
                            ) : (
                              '--'
                            )}
                          </span>
                        </div>
                        <div className="flex justify-between text-slate-600">
                          <span>State GST (SGST @ 9.0%)</span>
                          <span className="font-mono font-semibold text-slate-900">
                            {calcResult.sgst_amount !== undefined && calcResult.sgst_amount !== null ? (
                              <TabularNumber value={calcResult.sgst_amount} />
                            ) : (
                              '--'
                            )}
                          </span>
                        </div>
                      </>
                    ) : (
                      <div className="flex justify-between text-slate-600">
                        <span>Integrated GST (IGST @ 18.0%)</span>
                        <span className="font-mono font-semibold text-slate-900">
                          {calcResult.igst_amount !== undefined && calcResult.igst_amount !== null ? (
                            <TabularNumber value={calcResult.igst_amount} />
                          ) : (
                            '--'
                          )}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Prominent Final Highlight Box */}
                  <div className={`rounded-2xl p-5 space-y-2.5 shadow-md ${
                    isBlocked ? 'bg-slate-900 text-slate-300' : 'bg-slate-950 text-white'
                  }`}>
                    <div className="flex justify-between items-baseline">
                      <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
                        Grand Quotation Total
                      </span>
                      <span className={`text-3xl font-bold font-mono ${
                        isBlocked ? 'text-amber-400' : 'text-emerald-400'
                      }`}>
                        {calcResult.grand_total !== undefined && calcResult.grand_total !== null ? (
                          <TabularNumber value={calcResult.grand_total} />
                        ) : (
                          '₹ --'
                        )}
                      </span>
                    </div>

                    <div className="text-xs text-slate-300 italic pt-1.5 border-t border-slate-800 leading-relaxed">
                      {calcResult.final_total_in_words || (
                        isBlocked 
                          ? 'Calculation stopped: Resolve prerequisites before final total can be generated.'
                          : 'Deterministic costing verified.'
                      )}
                    </div>
                  </div>

                  {/* Primary CTA */}
                  <Button
                    variant="primary"
                    size="lg"
                    className="w-full font-bold"
                    disabled={isBlocked || loading || isRecalculating}
                    onClick={() => navigate(`/quotation/${calcResult?.quotation_id || 'qt-089'}`)}
                    icon={<ArrowRight className="w-4 h-4" />}
                    iconPosition="right"
                  >
                    {isBlocked ? 'Pricing Blocked' : 'Proceed to Quotation Dispatch'}
                  </Button>

                  {/* Human Review Note */}
                  <div className="text-[11px] text-slate-400 text-center flex items-center justify-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                    <span>Human Review Gate: Commercial terms reviewed before document generation</span>
                  </div>

                </div>
              </div>

            </div>
          </>
        )}

      </div>
    </div>
  );
};

export default CalculationReviewPage;
