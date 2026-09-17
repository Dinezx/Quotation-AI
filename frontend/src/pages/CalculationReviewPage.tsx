import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  Calculator, 
  ArrowRight, 
  Layers, 
  Cpu, 
  Percent, 
  ShieldCheck, 
  Sliders, 
  RefreshCw, 
  CheckCircle2, 
  FileText,
  Clock,
  ArrowLeft,
  DollarSign
} from 'lucide-react';
import { motion } from 'framer-motion';
import { WorkflowStepper } from '../components/layout/WorkflowStepper';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { TabularNumber } from '../components/common/TabularNumber';
import { calculateQuotationSummary, numberToIndianWords } from '../services/calculationService';
import { poService } from '../services/poService';
import { useDensity } from '../context/DensityContext';

export const CalculationReviewPage: React.FC = () => {
  const navigate = useNavigate();
  const { quoteId } = useParams<{ quoteId: string }>();
  const currentPO = poService.getCurrentPO();
  const { isComfortable } = useDensity();

  // Multiplier controls
  const [overheadPct, setOverheadPct] = useState<number>(12);
  const [profitPct, setProfitPct] = useState<number>(15);
  const [isInterstate, setIsInterstate] = useState<boolean>(false);

  // Calibrated demo base figures
  const baseMaterialCost = 45000;
  const baseProcessCost = 18500;
  const baseSubtotal = baseMaterialCost + baseProcessCost; // 63,500

  // Pure deterministic calculations
  const overheadAmount = Math.round(baseSubtotal * (overheadPct / 100));
  const profitAmount = Math.round((baseSubtotal + overheadAmount) * (profitPct / 100));
  const taxableValue = baseSubtotal + overheadAmount + profitAmount;

  const cgstAmount = isInterstate ? 0 : Math.round(taxableValue * 0.09);
  const sgstAmount = isInterstate ? 0 : Math.round(taxableValue * 0.09);
  const igstAmount = isInterstate ? Math.round(taxableValue * 0.18) : 0;
  const totalGst = isInterstate ? igstAmount : (cgstAmount + sgstAmount);
  const finalTotal = taxableValue + totalGst;
  const finalInWords = numberToIndianWords(finalTotal);

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
                Step 4 • Deterministic Pricing
              </span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Quotation Costing & Commercial Calculation
            </h1>
            <p className="text-sm text-slate-500 mt-1 max-w-2xl leading-relaxed">
              Deterministic item-by-item calculation based on locked plant rate master. Overheads, margins, and statutory GST verified.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Button
              variant="outline"
              size="md"
              onClick={() => navigate('/review/po-441')}
              icon={<ArrowLeft className="w-4 h-4" />}
            >
              Back to Verification
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={() => navigate('/quotation/qt-089')}
              icon={<ArrowRight className="w-4 h-4" />}
              iconPosition="right"
            >
              Generate Quotation Document
            </Button>
          </div>
        </div>

        {/* 2-Column Responsive Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-7">
          {/* Left Column: Line-Item Costing Cards (7 Cols) */}
          <div className="lg:col-span-7 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-600" />
                Line-Item Precision Costing Breakdown
              </h2>
              <span className="text-xs text-slate-500 font-mono">3 Manufactured Parts</span>
            </div>

            {/* Card 1: Pump Casing */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-sm text-slate-400 font-bold">01</span>
                    <h3 className="font-bold text-base text-slate-950">High-Pressure Pump Casing (Machined)</h3>
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    Cast Iron CI Grade 2 / FG 260 • Drg No: BPE-PC-402 Rev 03
                  </div>
                </div>
                <div className="text-right font-mono">
                  <div className="text-sm font-bold text-slate-950">
                    <TabularNumber value={26880} />
                  </div>
                  <div className="text-xs text-slate-400">₹2,688 / unit (10 Nos)</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-100 text-xs font-mono">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                  <div className="text-[11px] uppercase text-slate-500 font-sans font-semibold">Material Billet Cost</div>
                  <div className="text-slate-950 font-bold text-sm mt-1">₹18,500</div>
                  <div className="text-[11px] text-slate-500 mt-0.5 font-sans leading-relaxed">
                    Gross 45 kg × ₹95/kg - Scrap recovery 12kg @ ₹32/kg
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                  <div className="text-[11px] uppercase text-slate-500 font-sans font-semibold">Machining & Setup</div>
                  <div className="text-slate-950 font-bold text-sm mt-1">₹8,380</div>
                  <div className="text-[11px] text-slate-500 mt-0.5 font-sans leading-relaxed">
                    1.8h CNC 4-Axis @ ₹550/hr + setup & tooling
                  </div>
                </div>
              </div>
            </div>

            {/* Card 2: Shaft */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-sm text-slate-400 font-bold">02</span>
                    <h3 className="font-bold text-base text-slate-950">CNC Turned Precision Drive Shaft</h3>
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    Steel EN8 Alloy • Induction Hardened 45-50 HRC • Drg No: MA-SFT-884-D
                  </div>
                </div>
                <div className="text-right font-mono">
                  <div className="text-sm font-bold text-slate-950">
                    <TabularNumber value={17000} />
                  </div>
                  <div className="text-xs text-slate-400">₹3,400 / unit (5 Nos)</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-100 text-xs font-mono">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                  <div className="text-[11px] uppercase text-slate-500 font-sans font-semibold">Material Billet Cost</div>
                  <div className="text-slate-950 font-bold text-sm mt-1">₹11,500</div>
                  <div className="text-[11px] text-slate-500 mt-0.5 font-sans leading-relaxed">
                    Gross 18 kg × ₹110/kg - Scrap recovery 4kg @ ₹38/kg
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                  <div className="text-[11px] uppercase text-slate-500 font-sans font-semibold">Turning & Hardening</div>
                  <div className="text-slate-950 font-bold text-sm mt-1">₹5,500</div>
                  <div className="text-[11px] text-slate-500 mt-0.5 font-sans leading-relaxed">
                    1.2h Precision Turning @ ₹420/hr + heat treatment
                  </div>
                </div>
              </div>
            </div>

            {/* Card 3: Cover Plate */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-sm text-slate-400 font-bold">03</span>
                    <h3 className="font-bold text-base text-slate-950">Precision Flanged Cover Plate</h3>
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    Mild Steel (IS 2062 Grade E250) • Laser Cut • Surface Zinc Plated
                  </div>
                </div>
                <div className="text-right font-mono">
                  <div className="text-sm font-bold text-slate-950">
                    <TabularNumber value={20500} />
                  </div>
                  <div className="text-xs text-slate-400">₹1,025 / unit (20 Nos)</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-100 text-xs font-mono">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                  <div className="text-[11px] uppercase text-slate-500 font-sans font-semibold">Material Billet Cost</div>
                  <div className="text-slate-950 font-bold text-sm mt-1">₹15,000</div>
                  <div className="text-[11px] text-slate-500 mt-0.5 font-sans leading-relaxed">
                    Gross 12 kg × ₹68/kg - Scrap recovery 2kg @ ₹26/kg
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                  <div className="text-[11px] uppercase text-slate-500 font-sans font-semibold">Laser Cutting & Finishing</div>
                  <div className="text-slate-950 font-bold text-sm mt-1">₹5,500</div>
                  <div className="text-[11px] text-slate-500 mt-0.5 font-sans leading-relaxed">
                    0.6h 4kW Fiber Laser @ ₹650/hr + 15µ zinc finish
                  </div>
                </div>
              </div>
            </div>
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
                  <div className="text-xs text-slate-500 mt-0.5">Audit Token: #CALC-2026-089</div>
                </div>
                <Badge variant="success" size="md" dot>Deterministic</Badge>
              </div>

              {/* Base Costs */}
              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-600">Total Raw Material Cost</span>
                  <span className="font-mono font-bold text-slate-900 text-sm">
                    <TabularNumber value={baseMaterialCost} />
                  </span>
                </div>

                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-600">Total Machining & Process Cost</span>
                  <span className="font-mono font-bold text-slate-900 text-sm">
                    <TabularNumber value={baseProcessCost} />
                  </span>
                </div>

                <div className="flex justify-between py-2 font-bold text-slate-950 bg-slate-50 px-3 rounded-xl">
                  <span>Manufacturing Base Subtotal</span>
                  <span className="font-mono text-sm">
                    <TabularNumber value={baseSubtotal} />
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
                      +<TabularNumber value={overheadAmount} />
                    </span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="25"
                    step="1"
                    value={overheadPct}
                    onChange={(e) => setOverheadPct(Number(e.target.value))}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 font-mono mt-1">
                    <span>5%</span>
                    <span>Standard: 12%</span>
                    <span>25%</span>
                  </div>
                </div>

                {/* Profit Margin Slider */}
                <div>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="font-semibold text-slate-800">Commercial Profit Margin ({profitPct}%)</span>
                    <span className="font-mono font-bold text-slate-950">
                      +<TabularNumber value={profitAmount} />
                    </span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="30"
                    step="1"
                    value={profitPct}
                    onChange={(e) => setProfitPct(Number(e.target.value))}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 font-mono mt-1">
                    <span>5%</span>
                    <span>Standard: 15%</span>
                    <span>30%</span>
                  </div>
                </div>
              </div>

              {/* Taxable Assessable Value */}
              <div className="pt-2 border-t border-slate-200/80">
                <div className="flex justify-between text-xs font-bold text-slate-900 py-1">
                  <span>Taxable Assessable Value</span>
                  <span className="font-mono text-base">
                    <TabularNumber value={taxableValue} />
                  </span>
                </div>
              </div>

              {/* Statutory GST Breakup */}
              <div className="space-y-2 pt-2 border-t border-slate-100 text-xs">
                <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                  <span className="font-medium">Statutory Tax (Chapter 84 / 73)</span>
                  <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={isInterstate}
                      onChange={(e) => setIsInterstate(e.target.checked)}
                      className="rounded text-blue-600 focus:ring-0 w-3.5 h-3.5"
                    />
                    <span>Interstate (IGST 18%)</span>
                  </label>
                </div>

                {!isInterstate ? (
                  <>
                    <div className="flex justify-between text-slate-600">
                      <span>Central GST (CGST @ 9.0%)</span>
                      <span className="font-mono font-semibold text-slate-900">
                        <TabularNumber value={cgstAmount} />
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>State GST (SGST @ 9.0%)</span>
                      <span className="font-mono font-semibold text-slate-900">
                        <TabularNumber value={sgstAmount} />
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between text-slate-600">
                    <span>Integrated GST (IGST @ 18.0%)</span>
                    <span className="font-mono font-semibold text-slate-900">
                      <TabularNumber value={igstAmount} />
                    </span>
                  </div>
                )}
              </div>

              {/* Prominent Final Highlight Box */}
              <div className="bg-slate-950 text-white rounded-2xl p-5 space-y-2.5 shadow-md">
                <div className="flex justify-between items-baseline">
                  <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
                    Grand Quotation Total
                  </span>
                  <span className="text-3xl font-bold font-mono text-emerald-400">
                    <TabularNumber value={finalTotal} />
                  </span>
                </div>

                <div className="text-xs text-slate-300 italic pt-1.5 border-t border-slate-800 leading-relaxed">
                  {finalInWords}
                </div>
              </div>

              {/* Primary CTA */}
              <Button
                variant="primary"
                size="lg"
                className="w-full font-bold"
                onClick={() => navigate('/quotation/qt-089')}
                icon={<ArrowRight className="w-4 h-4" />}
                iconPosition="right"
              >
                Generate Quotation Document
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
