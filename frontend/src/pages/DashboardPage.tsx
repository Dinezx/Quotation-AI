import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Building2,
  Calendar,
  Plus,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Search,
  ChevronDown,
  UploadCloud,
  Settings,
  Sparkles,
  ArrowRight,
  BarChart3,
  Layers,
  Send,
  Sliders,
  DollarSign,
  Activity,
  AlertCircle,
  HelpCircle,
  FileSpreadsheet
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useDensity } from '../context/DensityContext';
import { useQuotations } from '../hooks/useQuotations';
import { mockQuotationsList } from '../services/mockData';
import { TabularNumber } from '../components/common/TabularNumber';

interface DashboardTransaction {
  id: string;
  identifier: string;
  client: string;
  division: string;
  component: string;
  spec: string;
  qty: number;
  value: number;
  status: 'NEEDS_REVIEW' | 'UNDER_COSTING' | 'APPROVED' | 'READY_DISPATCH' | 'DISPATCHED';
  statusLabel: string;
  actionLabel: string;
  actionRoute: string;
  dotColor: string;
  badgeClass: string;
  btnVariant: 'copper' | 'navy' | 'neutral';
}

const DEFAULT_TRANSACTIONS: DashboardTransaction[] = [
  {
    id: 'tx-1',
    identifier: 'PO-2026-8891',
    client: 'L&T Heavy Eng Ltd',
    division: 'Defense & Aero Unit',
    component: 'Turbine Shrouds',
    spec: 'SS 316L • 5-Axis Milling',
    qty: 240,
    value: 1840000,
    status: 'NEEDS_REVIEW',
    statusLabel: 'Needs Review',
    actionLabel: 'Verify',
    actionRoute: '/review',
    dotColor: 'bg-[#fdad67]',
    badgeClass: 'bg-[#ffdcc2] text-[#8c4f10]',
    btnVariant: 'copper',
  },
  {
    id: 'tx-2',
    identifier: 'QT-2026-4420',
    client: 'Kirloskar Oil Engines',
    division: 'Power Gen Division',
    component: 'Crankshaft Pins',
    spec: 'EN8D • Heat Treated',
    qty: 1200,
    value: 633194,
    status: 'UNDER_COSTING',
    statusLabel: 'Under Costing',
    actionLabel: 'Recalculate',
    actionRoute: '/calculation',
    dotColor: 'bg-[#76777d]',
    badgeClass: 'bg-[#f0eee9] text-[#45474c]',
    btnVariant: 'neutral',
  },
  {
    id: 'tx-3',
    identifier: 'PO-2026-8840',
    client: 'Tata Motors Ltd',
    division: 'EV Commercial Line',
    component: 'Battery Module Mounting Plates',
    spec: 'AL 6061-T6 • Anodized',
    qty: 4500,
    value: 2415500,
    status: 'APPROVED',
    statusLabel: 'Approved',
    actionLabel: 'Job Card',
    actionRoute: '/quotations',
    dotColor: 'bg-[#bdc6e0]',
    badgeClass: 'bg-[#d9e2fc] text-[#121b2e]',
    btnVariant: 'navy',
  },
  {
    id: 'tx-4',
    identifier: 'DISP-2026-1092',
    client: 'Bajaj Auto Ltd',
    division: 'Chakan Assembly #2',
    component: 'Transmission Housings',
    spec: 'Cast Aluminum • CNC Turned',
    qty: 320,
    value: 1192400,
    status: 'READY_DISPATCH',
    statusLabel: 'Ready Dispatch',
    actionLabel: 'e-Way Bill',
    actionRoute: '/quotation/qt-089',
    dotColor: 'bg-[#B87333]',
    badgeClass: 'bg-[#ffdcc2] text-[#8c4f10]',
    btnVariant: 'copper',
  },
  {
    id: 'tx-5',
    identifier: 'PO-2026-8799',
    client: 'Bharat Forge Limited',
    division: 'Mundhwa Machining Unit',
    component: 'High-Tensile Flange Hubs',
    spec: 'Forged 42CrMo4 • Hardened',
    qty: 850,
    value: 1520000,
    status: 'DISPATCHED',
    statusLabel: 'Dispatched',
    actionLabel: 'Track PoD',
    actionRoute: '/quotations',
    dotColor: 'bg-[#c6c6cd]',
    badgeClass: 'bg-[#eae8e3] text-[#45474c]',
    btnVariant: 'neutral',
  },
];

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isComfortable } = useDensity();
  const { quotations } = useQuotations();

  const [searchFilter, setSearchFilter] = useState('');
  const [tier1Only, setTier1Only] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  // Dynamic user greeting
  const firstName = user?.fullName?.split(' ')[0] || 'Rajesh';

  // Filter transactions
  const filteredTransactions = DEFAULT_TRANSACTIONS.filter((tx) => {
    if (tier1Only && !['Tata Motors Ltd', 'Bajaj Auto Ltd', 'L&T Heavy Eng Ltd'].includes(tx.client)) {
      return false;
    }
    if (!searchFilter.trim()) return true;
    const term = searchFilter.toLowerCase();
    return (
      tx.identifier.toLowerCase().includes(term) ||
      tx.client.toLowerCase().includes(term) ||
      tx.component.toLowerCase().includes(term)
    );
  });

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    navigate('/upload');
  };

  return (
    <div className={`w-full bg-[#fbf9f4] ${isComfortable ? 'p-6 md:p-8 space-y-7' : 'p-4 md:p-6 space-y-5'} font-sans antialiased text-[#1b1c19]`}>
      <div className="flex flex-col w-full gap-6 pb-12">
        {/* Section 1: Header / Operational Context Bar */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 text-[#45474c] text-xs uppercase tracking-wider font-semibold">
              <span>Operations Intelligence</span>
              <span className="text-[#c6c6cd]">•</span>
              <span className="text-[#B87333]">Live Plant Telemetry</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-semibold text-[#1b1c19] tracking-tight">
              Good morning, {firstName}.
            </h1>
            <p className="text-sm text-[#45474c] leading-relaxed">
              Here's what's happening across your manufacturing operations in Pune Plant #1.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Plant Selector */}
            <div className="flex items-center gap-2 bg-white px-3.5 py-2 rounded-lg shadow-xs border border-[#E5E1D8]">
              <span className="w-2 h-2 rounded-full bg-[#B87333]" />
              <span className="text-xs font-semibold text-[#1b1c19]">
                Pune Plant #1 - Precision Machining
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-[#76777d]" />
            </div>

            {/* Fiscal Period Indicator */}
            <div className="flex items-center gap-2 bg-white px-3.5 py-2 rounded-lg shadow-xs border border-[#E5E1D8]">
              <Calendar className="w-4 h-4 text-[#76777d]" />
              <span className="text-xs font-medium text-[#45474c]">
                Q4 FY25-26 (Mar '26)
              </span>
            </div>

            {/* Primary Action Button */}
            <button
              onClick={() => navigate('/upload')}
              className="flex items-center gap-1.5 bg-[#B87333] hover:bg-[#A46328] active:scale-[0.99] text-white px-4 py-2 rounded-lg text-xs font-semibold shadow-sm transition-all cursor-pointer focus:outline-none"
            >
              <Plus className="w-4 h-4" />
              <span>New Purchase Order</span>
            </button>
          </div>
        </div>

        {/* Section 2: 5 Executive KPI Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Card 1: Total Quotation Value */}
          <div className="bg-white p-4 rounded-xl shadow-xs border border-[#E5E1D8] flex flex-col justify-between relative overflow-hidden group">
            <div className="absolute -right-6 -bottom-6 w-20 h-20 rounded-full bg-[#B87333]/10 pointer-events-none transition-transform group-hover:scale-125" />
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                  Total Quotation Value
                </span>
                <DollarSign className="w-4 h-4 text-[#B87333]" />
              </div>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-2xl font-semibold text-[#1b1c19] tracking-tight font-mono">
                  ₹24,85,000
                </span>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-1.5 text-xs">
              <span className="flex items-center text-[#121b2e] bg-[#d9e2fc] px-1.5 py-0.5 rounded text-[11px] font-semibold font-mono">
                <TrendingUp className="w-3 h-3 mr-0.5" />
                +12.4%
              </span>
              <span className="text-[#64748B] text-[11px]">vs last month</span>
            </div>
          </div>

          {/* Card 2: Pending Actions */}
          <div className="bg-white p-4 rounded-xl shadow-xs border border-[#E5E1D8] flex flex-col justify-between relative overflow-hidden group">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                  Pending Actions
                </span>
                <Clock className="w-4 h-4 text-[#B87333]" />
              </div>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-2xl font-semibold text-[#1b1c19] tracking-tight font-mono">
                  12
                </span>
                <span className="text-xs text-[#64748B] font-medium">Lots</span>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between text-xs">
              <span className="text-[#64748B] text-[11px]">Awaiting eng. clearance</span>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-[#fdad67]/30 text-[#8c4f10] text-[11px] font-semibold">
                3 Critical
              </span>
            </div>
          </div>

          {/* Card 3: Approved Value */}
          <div className="bg-white p-4 rounded-xl shadow-xs border border-[#E5E1D8] flex flex-col justify-between relative overflow-hidden group">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                  Approved Value
                </span>
                <CheckCircle2 className="w-4 h-4 text-[#B87333]" />
              </div>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-2xl font-semibold text-[#1b1c19] tracking-tight font-mono">
                  ₹18,40,000
                </span>
              </div>
            </div>
            <div className="mt-4 flex flex-col gap-1">
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-[#64748B]">Schedule Target: 85%</span>
                <span className="text-[#1b1c19] font-semibold font-mono">91.2%</span>
              </div>
              <div className="w-full bg-[#eae8e3] h-1.5 rounded-full overflow-hidden">
                <div className="bg-[#B87333] h-full rounded-full transition-all" style={{ width: '91.2%' }} />
              </div>
            </div>
          </div>

          {/* Card 4: Active Customers */}
          <div className="bg-white p-4 rounded-xl shadow-xs border border-[#E5E1D8] flex flex-col justify-between relative overflow-hidden group">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                  Active Customers
                </span>
                <Building2 className="w-4 h-4 text-[#B87333]" />
              </div>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-2xl font-semibold text-[#1b1c19] tracking-tight font-mono">
                  48
                </span>
                <span className="text-xs text-[#64748B] font-medium">Tier-1 OEMs</span>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-1.5 text-xs">
              <span className="w-2 h-2 rounded-full bg-[#B87333]" />
              <span className="text-[#64748B] text-[11px]">6 contracts renewal due</span>
            </div>
          </div>

          {/* Card 5: This Month Pipeline */}
          <div className="bg-white p-4 rounded-xl shadow-xs border border-[#E5E1D8] flex flex-col justify-between relative overflow-hidden group">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                  This Month Pipeline
                </span>
                <TrendingUp className="w-4 h-4 text-[#B87333]" />
              </div>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-2xl font-semibold text-[#1b1c19] tracking-tight font-mono">
                  ₹32,75,000
                </span>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between text-xs">
              <span className="text-[#64748B] text-[11px]">Win Probability</span>
              <span className="text-[#1b1c19] font-semibold font-mono">68.2%</span>
            </div>
          </div>
        </div>

        {/* Section 3: Main Split Section (lg:grid-cols-12) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column (8 cols): Recent Quotations & PO Activity + Yield & Machine Load */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            {/* Table Card */}
            <div className="bg-white rounded-xl shadow-xs border border-[#E5E1D8] p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#eae8e3]">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-[#ffdcc2]/40 flex items-center justify-center shrink-0">
                    <FileSpreadsheet className="w-5 h-5 text-[#B87333]" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-[#1b1c19] tracking-tight">
                      Recent Quotations & PO Activity
                    </h2>
                    <p className="text-xs text-[#64748B]">
                      Operational orders synchronized with ERP and shop-floor scheduling
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative w-44 sm:w-56">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-[#76777d]" />
                    <input
                      type="text"
                      value={searchFilter}
                      onChange={(e) => setSearchFilter(e.target.value)}
                      placeholder="Filter OEM or ID..."
                      className="w-full bg-[#f5f3ee] pl-8 pr-3 py-1.5 rounded-lg text-xs text-[#1b1c19] placeholder:text-[#76777d] focus:outline-none focus:bg-white focus:ring-1 focus:ring-[#B87333] transition-all"
                    />
                  </div>

                  <button
                    onClick={() => setTier1Only(!tier1Only)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer ${
                      tier1Only
                        ? 'bg-[#172033] text-white'
                        : 'bg-[#f5f3ee] hover:bg-[#eae8e3] text-[#1b1c19]'
                    }`}
                  >
                    <span>Tier-1 Only</span>
                    <ChevronDown className="w-3 h-3 text-[#76777d]" />
                  </button>
                </div>
              </div>

              {/* Transactions Table */}
              <div className="overflow-x-auto mt-2">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-[#f5f3ee] text-[#45474c] uppercase font-semibold text-[11px] tracking-wider border-b border-[#eae8e3]">
                      <th className="py-2.5 px-3">Identifier</th>
                      <th className="py-2.5 px-3">Client / Enterprise</th>
                      <th className="py-2.5 px-3">Component & Spec</th>
                      <th className="py-2.5 px-3 text-right">Qty</th>
                      <th className="py-2.5 px-3 text-right">Order Value</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                      <th className="py-2.5 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#eae8e3] text-[#1b1c19]">
                    {filteredTransactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-[#f5f3ee]/60 transition-colors">
                        <td className="py-3 px-3 font-semibold text-[#172033]">
                          <div className="flex items-center gap-1.5 font-mono">
                            <span className={`w-2 h-2 rounded-full ${tx.dotColor}`} />
                            {tx.identifier}
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-medium text-[#1b1c19]">{tx.client}</div>
                          <div className="text-[11px] text-[#64748B]">{tx.division}</div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="text-[#1b1c19]">{tx.component}</div>
                          <div className="text-[11px] text-[#64748B]">{tx.spec}</div>
                        </td>
                        <td className="py-3 px-3 text-right font-medium font-mono">
                          {tx.qty.toLocaleString()}
                        </td>
                        <td className="py-3 px-3 text-right font-semibold text-[#1b1c19] font-mono">
                          <TabularNumber value={tx.value} />
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${tx.badgeClass}`}>
                            {tx.statusLabel}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            onClick={() => navigate(tx.actionRoute)}
                            className={`px-2.5 py-1 rounded text-xs font-semibold transition-all cursor-pointer ${
                              tx.btnVariant === 'copper'
                                ? 'bg-[#B87333] hover:bg-[#A46328] text-white shadow-xs'
                                : tx.btnVariant === 'navy'
                                ? 'bg-[#172033] hover:bg-[#102134] text-white shadow-xs'
                                : 'bg-[#f0eee9] hover:bg-[#eae8e3] text-[#1b1c19]'
                            }`}
                          >
                            {tx.actionLabel}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Table Footer */}
              <div className="pt-4 flex items-center justify-between text-[#64748B] text-xs">
                <span>Showing {filteredTransactions.length} of 34 recorded transactions</span>
                <div className="flex items-center gap-1.5 font-mono">
                  <button className="px-2.5 py-1 bg-[#f5f3ee] hover:bg-[#eae8e3] rounded text-[#1b1c19] text-xs font-medium cursor-pointer">
                    Previous
                  </button>
                  <span className="px-2 text-[#1b1c19] font-semibold">1 / 7</span>
                  <button className="px-2.5 py-1 bg-[#f5f3ee] hover:bg-[#eae8e3] rounded text-[#1b1c19] text-xs font-medium cursor-pointer">
                    Next
                  </button>
                </div>
              </div>
            </div>

            {/* Two Sub-Cards Row: Yield & Machine Station Load */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Sub-Card 1: Batch Scrap & Tolerance Yield */}
              <div className="bg-white p-4 rounded-xl shadow-xs border border-[#E5E1D8] flex flex-col justify-between">
                <div className="flex items-center justify-between pb-2 border-b border-[#eae8e3]">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-[#B87333]" />
                    <span className="text-sm font-semibold text-[#1b1c19]">
                      Batch Scrap & Tolerance Yield
                    </span>
                  </div>
                  <span className="text-xs font-semibold text-[#1b1c19] font-mono">99.14%</span>
                </div>

                <div className="h-24 w-full flex items-end gap-2 pt-3">
                  {[
                    { day: 'Mon', height: '60%', isToday: false },
                    { day: 'Tue', height: '75%', isToday: false },
                    { day: 'Wed', height: '82%', isToday: false },
                    { day: 'Thu', height: '90%', isToday: false },
                    { day: 'Today', height: '98%', isToday: true },
                    { day: 'Sat', height: '70%', isToday: false },
                  ].map((bar) => (
                    <div key={bar.day} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                      <div
                        className={`w-full rounded-t transition-all ${
                          bar.isToday
                            ? 'bg-[#B87333]'
                            : 'bg-[#eae8e3] hover:bg-[#B87333]/80'
                        }`}
                        style={{ height: bar.height }}
                      />
                      <span className={`text-[10px] ${bar.isToday ? 'font-semibold text-[#1b1c19]' : 'text-[#76777d]'}`}>
                        {bar.day}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="pt-2 flex justify-between items-center text-[11px] text-[#64748B] border-t border-[#eae8e3] mt-2">
                  <span>CNC Defect rate: 0.12%</span>
                  <span className="text-[#B87333] font-semibold">Within Six Sigma specs</span>
                </div>
              </div>

              {/* Sub-Card 2: Plant Floor Station Load */}
              <div className="bg-white p-4 rounded-xl shadow-xs border border-[#E5E1D8] flex flex-col justify-between">
                <div className="flex items-center justify-between pb-2 border-b border-[#eae8e3]">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-[#B87333]" />
                    <span className="text-sm font-semibold text-[#1b1c19]">
                      Plant Floor Station Load
                    </span>
                  </div>
                  <span className="text-xs text-[#64748B] font-medium font-mono">18 / 20 Bays Online</span>
                </div>

                <div className="flex flex-col gap-2.5 pt-2">
                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-[#1b1c19]">5-Axis Milling Cells (Lines 1-4)</span>
                      <span className="font-semibold text-[#1b1c19] font-mono">92%</span>
                    </div>
                    <div className="w-full bg-[#eae8e3] h-1.5 rounded-full overflow-hidden">
                      <div className="bg-[#172033] h-full rounded-full" style={{ width: '92%' }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-[#1b1c19]">CNC Swiss Lathes (Lines 5-8)</span>
                      <span className="font-semibold text-[#1b1c19] font-mono">84%</span>
                    </div>
                    <div className="w-full bg-[#eae8e3] h-1.5 rounded-full overflow-hidden">
                      <div className="bg-[#B87333] h-full rounded-full" style={{ width: '84%' }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-[#1b1c19]">Surface Treatment & Passivation</span>
                      <span className="font-semibold text-[#1b1c19] font-mono">65%</span>
                    </div>
                    <div className="w-full bg-[#eae8e3] h-1.5 rounded-full overflow-hidden">
                      <div className="bg-[#76777d] h-full rounded-full" style={{ width: '65%' }} />
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex justify-between items-center text-[11px] text-[#64748B] border-t border-[#eae8e3] mt-2">
                  <span>Next tooling shift: 14:00 IST</span>
                  <span
                    onClick={() => navigate('/upload')}
                    className="text-[#172033] font-semibold hover:underline cursor-pointer"
                  >
                    Live Gantt →
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column (4 cols): AI PO Parser, Priority Actions, Bay Telemetry, Machine Card */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            {/* Widget 1: AI Smart PO Parser */}
            <div className="bg-white p-4 rounded-xl shadow-xs border border-[#E5E1D8] relative overflow-hidden">
              <div className="flex items-center justify-between pb-2 border-b border-[#eae8e3]">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#B87333]" />
                  <h3 className="text-sm font-semibold text-[#1b1c19]">
                    AI Smart PO Parser
                  </h3>
                </div>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#ffdcc2] text-[#8c4f10] uppercase font-mono">
                  v3.4 Neural
                </span>
              </div>
              <p className="text-xs text-[#64748B] mt-2 leading-relaxed">
                Auto-extract BOM line items, geometric GD&T callouts, and metallurgy specs directly into active RFQ matrix.
              </p>

              {/* Drop Area */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => navigate('/upload')}
                className={`mt-3 rounded-lg p-5 flex flex-col items-center justify-center text-center cursor-pointer border border-dashed transition-all group ${
                  isDragOver
                    ? 'bg-[#ffdcc2]/30 border-[#B87333]'
                    : 'bg-[#f5f3ee] hover:bg-[#eae8e3] border-[#c6c6cd]'
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-[#ffdcc2]/50 flex items-center justify-center text-[#B87333] group-hover:scale-110 transition-transform">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <div className="mt-2 text-xs font-semibold text-[#1b1c19]">
                  Drop PO file here or <span className="text-[#B87333] underline">Browse</span>
                </div>
                <p className="mt-0.5 text-[11px] text-[#64748B]">
                  PDF, DXF, STP, CAD, Excel up to 50MB
                </p>
                <div className="mt-3 flex flex-wrap gap-1 justify-center">
                  <span className="px-1.5 py-0.5 rounded bg-white border border-[#E5E1D8] text-[10px] text-[#64748B] font-medium">
                    Auto-Tolerancing
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-white border border-[#E5E1D8] text-[10px] text-[#64748B] font-medium">
                    BOM Mapping
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-white border border-[#E5E1D8] text-[10px] text-[#64748B] font-medium">
                    Tariff Codes
                  </span>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between text-[#64748B] text-xs pt-1 border-t border-[#eae8e3]">
                <span className="flex items-center gap-1.5 text-[11px]">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00bcd4] opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00bcd4]" />
                  </span>
                  Vision Model Online
                </span>
                <span className="text-[11px] font-mono">Avg Parsing: 1.4s</span>
              </div>
            </div>

            {/* Widget 2: Priority Plant Actions */}
            <div className="bg-white p-4 rounded-xl shadow-xs border border-[#E5E1D8] flex flex-col gap-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#eae8e3]">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-[#ba1a1a]" />
                  <h3 className="text-sm font-semibold text-[#1b1c19]">
                    Priority Plant Actions
                  </h3>
                </div>
                <span className="px-1.5 py-0.5 bg-[#ffdad6] text-[#ba1a1a] text-[11px] rounded font-semibold">
                  2 Urgent
                </span>
              </div>

              <div className="flex flex-col gap-2">
                {/* Action 1 */}
                <div className="p-3 rounded-lg bg-[#f5f3ee] hover:bg-[#eae8e3] transition-colors flex flex-col gap-1">
                  <div className="flex items-start justify-between">
                    <span className="text-xs font-semibold text-[#1b1c19]">
                      Material Rate Variance Alert
                    </span>
                    <span className="text-[10px] uppercase font-bold text-[#ba1a1a] bg-[#ffdad6] px-1 rounded">
                      Action Required
                    </span>
                  </div>
                  <p className="text-xs text-[#64748B] leading-relaxed">
                    SS 316L billet procurement quote jumped +8.2% from Jindal Steel. Re-index active quotes.
                  </p>
                  <div className="flex items-center justify-between mt-1 pt-1 border-t border-[#eae8e3]">
                    <span className="text-[11px] text-[#64748B] font-mono">Impact: PO-2026-8891</span>
                    <button
                      onClick={() => navigate('/rates')}
                      className="text-[#B87333] text-xs font-semibold hover:underline cursor-pointer"
                    >
                      Update Cost Matrix →
                    </button>
                  </div>
                </div>

                {/* Action 2 */}
                <div className="p-3 rounded-lg bg-[#f5f3ee] hover:bg-[#eae8e3] transition-colors flex flex-col gap-1">
                  <div className="flex items-start justify-between">
                    <span className="text-xs font-semibold text-[#1b1c19]">
                      CMM QA Gate Clearance
                    </span>
                    <span className="text-[10px] uppercase font-bold text-[#8c4f10] bg-[#ffdcc2] px-1 rounded">
                      Pending Approval
                    </span>
                  </div>
                  <p className="text-xs text-[#64748B] leading-relaxed">
                    Lot #4092 Zeiss Prismo report has 2 marginal runout flags on transmission housings.
                  </p>
                  <div className="flex items-center justify-between mt-1 pt-1 border-t border-[#eae8e3]">
                    <span className="text-[11px] text-[#64748B]">Quality Eng: S. Deshmukh</span>
                    <button
                      onClick={() => navigate('/review')}
                      className="text-[#B87333] text-xs font-semibold hover:underline cursor-pointer"
                    >
                      Inspect Deviation →
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Widget 3: Bay Utilization & Telemetry */}
            <div className="bg-white p-4 rounded-xl shadow-xs border border-[#E5E1D8] flex flex-col gap-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#eae8e3]">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[#B87333]" />
                  <h3 className="text-sm font-semibold text-[#1b1c19]">
                    Bay Utilization & Telemetry
                  </h3>
                </div>
                <span className="text-xs font-semibold text-[#1b1c19] font-mono">Bay-A CNC</span>
              </div>

              <div className="flex items-center justify-between pt-1">
                <div>
                  <div className="text-2xl font-bold text-[#1b1c19] tracking-tight font-mono">
                    94.2%
                  </div>
                  <div className="text-xs text-[#64748B]">Spindle Health & Up-time</div>
                </div>

                <div className="w-24 h-10">
                  <svg className="w-full h-full text-[#B87333]" fill="none" viewBox="0 0 100 40">
                    <path
                      d="M0 32 L15 28 L30 35 L45 18 L60 22 L75 8 L90 14 L100 6"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                    />
                    <path
                      d="M0 32 L15 28 L30 35 L45 18 L60 22 L75 8 L90 14 L100 6 V40 H0 Z"
                      fill="currentColor"
                      fillOpacity="0.1"
                    />
                  </svg>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs text-[#64748B]">
                <div className="bg-[#f5f3ee] p-2 rounded-lg">
                  <div className="text-[11px] text-[#76777d]">Thermal Delta</div>
                  <div className="text-[#1b1c19] font-semibold mt-0.5 font-mono">38.4°C (Normal)</div>
                </div>
                <div className="bg-[#f5f3ee] p-2 rounded-lg">
                  <div className="text-[11px] text-[#76777d]">RPM Peak Shift</div>
                  <div className="text-[#1b1c19] font-semibold mt-0.5 font-mono">14,200 RPM</div>
                </div>
              </div>
            </div>

            {/* Widget 4: Active Machine Telemetry Card */}
            <div className="bg-white p-4 rounded-xl shadow-xs border border-[#E5E1D8] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-lg bg-[#172033] flex items-center justify-center text-white shrink-0 shadow-xs">
                  <Building2 className="w-5 h-5 text-[#fdad67]" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-[#1b1c19]">
                    Mazak Integrex i-400
                  </div>
                  <div className="text-[11px] text-[#64748B]">
                    Scheduled Maint: In 48 operating hrs
                  </div>
                </div>
              </div>

              <button
                onClick={() => navigate('/settings')}
                title="Machine Settings"
                className="bg-[#f5f3ee] hover:bg-[#eae8e3] p-2 rounded-lg text-[#1b1c19] transition-colors cursor-pointer"
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
