import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FileUp, 
  ArrowRight, 
  Clock, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  FileText, 
  Sparkles,
  Layers,
  Send,
  Sliders,
  DollarSign
} from 'lucide-react';
import { motion } from 'framer-motion';
import { MetricCard } from '../components/ui/MetricCard';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { TabularNumber } from '../components/common/TabularNumber';
import { mockQuotationsList } from '../services/mockData';
import { useDensity } from '../context/DensityContext';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { isComfortable } = useDensity();
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  // Quick estimator state
  const [estWeight, setEstWeight] = useState<number>(35);
  const [estHours, setEstHours] = useState<number>(2.5);
  const [estRate, setEstRate] = useState<number>(95);

  const quickEstimatedTotal = Math.round((estWeight * estRate + estHours * 450) * 1.32);

  const filteredQuotes = mockQuotationsList.filter(q => {
    if (filterStatus === 'ALL') return true;
    if (filterStatus === 'NEEDS_REVIEW') return q.status === 'DRAFT' || q.status === 'NEEDS_REVIEW';
    if (filterStatus === 'READY') return q.status === 'READY';
    if (filterStatus === 'SENT') return q.status === 'SENT';
    if (filterStatus === 'ACCEPTED') return q.status === 'ACCEPTED';
    return true;
  });

  return (
    <div className={`mx-auto max-w-7xl ${isComfortable ? 'p-6 md:p-8 space-y-7' : 'p-4 md:p-6 space-y-5'}`}>
      {/* Hero Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Operations Center • Bhosari Plant I
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Quotation Automation & Telemetry
          </h1>
          <p className="text-sm text-slate-500 mt-1 max-w-2xl leading-relaxed">
            Automated customer PO intake, deterministic material & machine costing, and statutory GST compliance dispatch.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Button
            variant="outline"
            size="md"
            icon={<Layers className="w-4 h-4 text-slate-500" />}
            onClick={() => navigate('/rates')}
          >
            Rate Card Master
          </Button>
          <Button
            variant="primary"
            size="md"
            icon={<FileUp className="w-4 h-4 text-emerald-400" />}
            onClick={() => navigate('/upload')}
          >
            Upload Customer PO
          </Button>
        </div>
      </div>

      {/* AI Operations Savings Banner */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-blue-950 text-white rounded-2xl p-6 shadow-sm border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-600/25 border border-blue-500/30 flex items-center justify-center shrink-0">
            <Sparkles className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <div className="text-xs font-semibold text-blue-300 uppercase tracking-wider">
              Plant Productivity Telemetry
            </div>
            <div className="text-base font-medium text-slate-200 mt-0.5">
              AI Document Engine has saved <span className="text-white font-bold font-mono">142 Hours</span> this month across 342 customer POs.
            </div>
          </div>
        </div>

        <div className="flex items-center gap-8 text-xs font-mono shrink-0">
          <div>
            <div className="text-slate-400 text-[11px] uppercase tracking-wider">Turnaround Time</div>
            <div className="text-emerald-400 font-bold text-base mt-0.5">88% Faster (14m)</div>
          </div>
          <div className="h-8 w-px bg-slate-800" />
          <div>
            <div className="text-slate-400 text-[11px] uppercase tracking-wider">Extraction Accuracy</div>
            <div className="text-blue-400 font-bold text-base mt-0.5">99.4% Precision</div>
          </div>
        </div>
      </div>

      {/* 4 Bento KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <MetricCard
          title="Total Quotations (FY 24-25)"
          value="342"
          subtitle="Across 18 enterprise customer accounts"
          badge={<Badge variant="success" size="sm">+18.4% YoY</Badge>}
          icon={<FileText className="w-4 h-4 text-slate-400" />}
          footer={
            <>
              <span className="text-slate-500">Target: 400 Quotes</span>
              <span className="font-mono font-semibold text-slate-800">85.5% Met</span>
            </>
          }
        />

        <MetricCard
          title="Pending Review & Costing"
          value="7"
          subtitle="Awaiting material grade confirmation"
          badge={<Badge variant="warning" size="sm" dot>Action Req.</Badge>}
          icon={<AlertTriangle className="w-4 h-4 text-amber-500" />}
          footer={
            <span className="text-amber-700 font-medium cursor-pointer hover:underline" onClick={() => navigate('/review/po-441')}>
              Item #3 Cover Plate unresolved →
            </span>
          }
        />

        <MetricCard
          title="Accepted & Won"
          value="218"
          subtitle="₹2.45 Cr realized order pipeline"
          badge={<Badge variant="success" size="sm">64% Win Rate</Badge>}
          icon={<CheckCircle2 className="w-4 h-4 text-emerald-500" />}
          footer={
            <>
              <span className="text-slate-500">Top Buyer</span>
              <span className="font-medium text-slate-800">Mahindra Precision Agro</span>
            </>
          }
        />

        <MetricCard
          title="Total Quoted Value"
          value={<TabularNumber value={4892450} currency={true} />}
          subtitle="Average quotation value: ₹81,540"
          badge={<Badge variant="slate" size="sm">Live</Badge>}
          icon={<DollarSign className="w-4 h-4 text-blue-500" />}
          footer={
            <>
              <span className="text-slate-500">Taxable Value</span>
              <span className="font-mono font-semibold text-slate-800">₹41.45 L</span>
            </>
          }
        />
      </div>

      {/* High-Density Recent POs & Quotations Table */}
      <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs">
        <div className="p-5 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50">
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">Recent Purchase Orders & In-Flight Quotations</h2>
            <p className="text-xs text-slate-500 mt-0.5">Synchronized with customer procurement portals and uploaded engineering drawings</p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {[
              { label: 'All (342)', value: 'ALL' },
              { label: 'Needs Review (7)', value: 'NEEDS_REVIEW' },
              { label: 'Ready (12)', value: 'READY' },
              { label: 'Sent (142)', value: 'SENT' },
              { label: 'Accepted (218)', value: 'ACCEPTED' },
            ].map(tab => (
              <button
                key={tab.value}
                onClick={() => setFilterStatus(tab.value)}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  filterStatus === tab.value
                    ? 'bg-slate-950 text-white font-semibold'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-500 uppercase font-semibold text-[11px] tracking-wider">
                <th className="py-3 px-5">Quotation / PO Ref</th>
                <th className="py-3 px-5">Customer & Plant</th>
                <th className="py-3 px-5">Date</th>
                <th className="py-3 px-5">Value (Incl. GST)</th>
                <th className="py-3 px-5">Status</th>
                <th className="py-3 px-5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredQuotes.map((q) => (
                <tr key={q.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-4 px-5 font-mono font-medium text-slate-900">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-slate-400" />
                      <span className="font-bold text-slate-950 text-sm">{q.quotationNumber}</span>
                      <span className="text-xs text-slate-400">{q.version}</span>
                    </div>
                    <div className="text-xs text-slate-500 font-sans mt-0.5">
                      Ref: <span className="font-mono text-slate-700">{q.poReference}</span>
                    </div>
                  </td>
                  <td className="py-4 px-5">
                    <div className="font-bold text-slate-900 text-sm">{q.customer.name}</div>
                    <div className="text-xs font-mono text-slate-400 mt-0.5">{q.customer.gstin}</div>
                  </td>
                  <td className="py-4 px-5 text-slate-600 font-mono text-xs">
                    {q.createdAt}
                  </td>
                  <td className="py-4 px-5 font-mono font-bold text-slate-900 text-sm">
                    <TabularNumber value={q.calculation.grandTotal} />
                  </td>
                  <td className="py-4 px-5">
                    <Badge
                      variant={
                        q.status === 'SENT' ? 'info' :
                        q.status === 'ACCEPTED' ? 'success' :
                        q.status === 'READY' ? 'purple' :
                        q.status === 'REVISION_ISSUED' ? 'warning' : 'slate'
                      }
                      size="md"
                      dot
                    >
                      {q.status.replace('_', ' ')}
                    </Badge>
                  </td>
                  <td className="py-4 px-5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {q.id === 'qt-089' ? (
                        <Button
                          variant="secondary"
                          size="sm"
                          icon={<Send className="w-3.5 h-3.5" />}
                          onClick={() => navigate('/quotation/qt-089')}
                        >
                          Dispatch
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate('/quotations')}
                        >
                          Inspect
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bottom 3-Column Utility Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: Statutory Tax & HSN Rules */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Tax & HSN Hub
            </h3>
            <Badge variant="success" size="sm">LIVE</Badge>
          </div>
          <div className="space-y-2.5 text-xs text-slate-600">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
              <div className="font-bold text-slate-900">Maharashtra Intrastate (27 → 27)</div>
              <div className="text-slate-500 mt-1 leading-relaxed">
                Automatically split into CGST 9% + SGST 9% on all manufacturing BOQs.
              </div>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
              <div className="font-bold text-slate-900">Interstate Supply (Buyer Outside MH)</div>
              <div className="text-slate-500 mt-1 leading-relaxed">
                Integrated IGST 18% applied via GSTIN state code verification.
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Shopfloor Machine Capacity */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600" />
              Machine Floor Load
            </h3>
            <span className="text-xs font-mono text-slate-500 font-medium">2 Shifts / Day</span>
          </div>
          <div className="space-y-3.5 pt-1">
            <div>
              <div className="flex justify-between text-xs font-medium text-slate-700 mb-1.5">
                <span>CNC 4-Axis Machining Bay</span>
                <span className="font-mono text-slate-900 font-bold">82%</span>
              </div>
              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-blue-600 rounded-full" style={{ width: '82%' }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-medium text-slate-700 mb-1.5">
                <span>CNC Turning Centers</span>
                <span className="font-mono text-slate-900 font-bold">76%</span>
              </div>
              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-600 rounded-full" style={{ width: '76%' }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-medium text-slate-700 mb-1.5">
                <span>Fiber Laser Cutting (4kW)</span>
                <span className="font-mono text-slate-900 font-bold">88%</span>
              </div>
              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-amber-500 rounded-full" style={{ width: '88%' }} />
              </div>
            </div>
          </div>
        </div>

        {/* Card 3: Quick Quotation Estimator Widget */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Sliders className="w-4 h-4 text-slate-600" />
              Quick Spot Estimator
            </h3>
            <span className="text-[11px] text-slate-400 font-mono">W×R + H×M</span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-slate-500 uppercase font-semibold block mb-1">Weight (kg)</label>
                <input
                  type="number"
                  value={estWeight}
                  onChange={(e) => setEstWeight(Number(e.target.value))}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-mono text-sm text-slate-900"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-500 uppercase font-semibold block mb-1">Hours (CNC)</label>
                <input
                  type="number"
                  step="0.5"
                  value={estHours}
                  onChange={(e) => setEstHours(Number(e.target.value))}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-mono text-sm text-slate-900"
                />
              </div>
            </div>

            <div className="p-3.5 bg-slate-950 text-white rounded-xl flex items-center justify-between shadow-xs">
              <div>
                <div className="text-[11px] text-slate-400">Estimated Price (Taxed)</div>
                <div className="text-lg font-bold font-mono text-emerald-400">
                  <TabularNumber value={quickEstimatedTotal} />
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs"
                onClick={() => navigate('/upload')}
              >
                Full RFQ →
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
