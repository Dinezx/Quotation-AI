import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
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
  ArrowRight,
  BarChart3,
  Layers,
  Send,
  DollarSign,
  AlertCircle,
  FileSpreadsheet,
  RefreshCw,
  Mail,
  ShieldCheck,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useDensity } from '../context/DensityContext';
import { dashboardApi, DashboardSummaryResponseDTO } from '../api/dashboardApi';
import { TabularNumber } from '../components/common/TabularNumber';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, company } = useAuth();
  const { isComfortable } = useDensity();

  const [period, setPeriod] = useState<string>('this_month');
  const [searchFilter, setSearchFilter] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);

  // Fetch real dashboard telemetry from backend
  const { data, isLoading, error, refetch, isFetching } = useQuery<DashboardSummaryResponseDTO>({
    queryKey: ['dashboard', period],
    queryFn: () => dashboardApi.getSummary({ period }),
    staleTime: 30000,
  });

  const firstName = user?.fullName?.split(' ')[0] || user?.email?.split('@')[0] || 'User';

  const formatPeriodLabel = (p: string) => {
    switch (p) {
      case 'today': return 'Today';
      case 'this_week': return 'This Week';
      case 'this_month': return 'This Month';
      case 'last_month': return 'Last Month';
      case 'this_quarter': return 'This Quarter';
      case 'this_year': return 'This Fiscal Year';
      default: return 'Current Period';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status.toUpperCase()) {
      case 'FINAL':
      case 'FINALIZED':
      case 'APPROVED':
        return {
          label: 'Finalized',
          badgeClass: 'bg-[#3F7D5A]/15 text-[#3F7D5A]',
          dotColor: 'bg-[#3F7D5A]',
        };
      case 'SENT':
      case 'DISPATCHED':
        return {
          label: 'Emailed',
          badgeClass: 'bg-[#172033]/10 text-[#172033]',
          dotColor: 'bg-[#172033]',
        };
      case 'READY_TO_SEND':
        return {
          label: 'Ready to Send',
          badgeClass: 'bg-[#B87333]/15 text-[#B87333]',
          dotColor: 'bg-[#B87333]',
        };
      case 'DRAFT':
      default:
        return {
          label: 'Draft',
          badgeClass: 'bg-[#ffdcc2] text-[#8c4f10]',
          dotColor: 'bg-[#fdad67]',
        };
    }
  };

  const recentQuotations = data?.recent_quotations || [];
  const filteredQuotations = recentQuotations.filter((q) => {
    if (!searchFilter.trim()) return true;
    const term = searchFilter.toLowerCase();
    return (
      q.quotation_number.toLowerCase().includes(term) ||
      (q.customer_name && q.customer_name.toLowerCase().includes(term))
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
    <div className="w-full bg-[#fbf9f4] p-4 sm:p-6 lg:p-8 font-sans antialiased text-[#1b1c19] min-h-screen">
      <div className="max-w-[1400px] w-full mx-auto space-y-6">
        
        {/* Section 1: Executive Top Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-xl shadow-xs border border-[#E5E1D8]">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-wider text-[#B87333] font-bold">
                {company?.name || 'Bharat Precision Engineering Pvt. Ltd.'}
              </span>
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#3F7D5A]" />
              <span className="text-xs text-[#64748B] font-mono">TENANT VERIFIED</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#172033] tracking-tight mt-0.5">
              Costing &amp; Quotation Cockpit
            </h1>
            <p className="text-xs sm:text-sm text-[#64748B] mt-1">
              Welcome back, {firstName}. Authoritative deterministic costing, active RFQs, and customer dispatch.
            </p>
          </div>

          <div className="flex items-center gap-3 self-start md:self-center flex-wrap">
            {/* Period Selector */}
            <div className="flex items-center bg-[#f5f3ee] border border-[#E5E1D8] rounded-lg px-2.5 py-1.5 gap-2">
              <Calendar className="w-4 h-4 text-[#76777d]" />
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="bg-transparent text-xs font-semibold text-[#1b1c19] focus:outline-none cursor-pointer"
              >
                <option value="today">Today</option>
                <option value="this_week">This Week</option>
                <option value="this_month">This Month</option>
                <option value="last_month">Last Month</option>
                <option value="this_quarter">This Quarter</option>
                <option value="this_year">This Fiscal Year</option>
              </select>
            </div>

            {/* Refresh Button */}
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              title="Refresh Telemetry"
              className="p-2 bg-white hover:bg-[#f5f3ee] text-[#172033] rounded-lg border border-[#E5E1D8] transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin text-[#B87333]' : ''}`} />
            </button>

            {/* Primary Action Button */}
            <button
              onClick={() => navigate('/upload')}
              className="flex items-center gap-1.5 bg-[#2563EB] hover:bg-[#1D4ED8] active:scale-[0.99] text-white px-4 py-2 rounded-lg text-xs font-semibold shadow-sm transition-all cursor-pointer focus:outline-none"
            >
              <Plus className="w-4 h-4" />
              <span>New Purchase Order</span>
            </button>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="bg-white rounded-xl p-12 text-center border border-[#E5E1D8]">
            <div className="flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 border-2 border-[#172033]/20 border-t-[#B87333] rounded-full animate-spin" />
              <span className="text-xs font-mono text-[#64748B] tracking-wider uppercase">
                Loading Authoritative Dashboard Aggregations...
              </span>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-[#ffdad6] border border-[#ba1a1a]/30 text-[#93000a] p-4 rounded-xl text-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-[#ba1a1a] shrink-0" />
              <span>Failed to fetch dashboard metrics. Verify database connectivity.</span>
            </div>
            <button
              onClick={() => refetch()}
              className="px-3 py-1 bg-white text-[#93000a] text-xs font-semibold rounded shadow-xs hover:bg-[#f5f3ee]"
            >
              Retry
            </button>
          </div>
        )}

        {/* Metrics & Content when loaded */}
        {data && (
          <>
            {/* Section 2: 5 Executive KPI Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Card 1: Total Pipeline Value */}
              <div className="bg-white p-4 rounded-xl shadow-xs border border-[#E5E1D8] flex flex-col justify-between relative overflow-hidden group">
                <div className="absolute -right-6 -bottom-6 w-20 h-20 rounded-full bg-[#B87333]/10 pointer-events-none transition-transform group-hover:scale-125" />
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                      Pipeline Quoted Value
                    </span>
                    <DollarSign className="w-4 h-4 text-[#B87333]" />
                  </div>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-[#1b1c19] tracking-tight font-mono">
                      <TabularNumber value={Number(data.kpis.total_quotation_value || 0)} />
                    </span>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs text-[#64748B]">
                  <span>Operational Pipeline</span>
                  <span className="font-mono font-medium text-[#1b1c19]">{formatPeriodLabel(period)}</span>
                </div>
              </div>

              {/* Card 2: Pending PO Review */}
              <div className="bg-white p-4 rounded-xl shadow-xs border border-[#E5E1D8] flex flex-col justify-between relative overflow-hidden group">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                      Pending PO Review
                    </span>
                    <Clock className="w-4 h-4 text-[#B87333]" />
                  </div>
                  <div className="mt-2 flex items-baseline gap-1.5">
                    <span className="text-2xl font-bold text-[#1b1c19] tracking-tight font-mono">
                      {data.kpis.pending_po_review}
                    </span>
                    <span className="text-xs text-[#64748B] font-medium">Orders</span>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs">
                  <span className="text-[#64748B] text-[11px]">Human Verification</span>
                  <button
                    onClick={() => navigate('/review')}
                    className="text-[#B87333] hover:underline font-semibold text-[11px] cursor-pointer"
                  >
                    Open Review →
                  </button>
                </div>
              </div>

              {/* Card 3: Draft Quotations */}
              <div className="bg-white p-4 rounded-xl shadow-xs border border-[#E5E1D8] flex flex-col justify-between relative overflow-hidden group">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                      Draft Quotations
                    </span>
                    <FileText className="w-4 h-4 text-[#B87333]" />
                  </div>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-[#1b1c19] tracking-tight font-mono">
                      {data.kpis.draft_quotations}
                    </span>
                    <span className="text-xs text-[#64748B] font-medium ml-1">Under Costing</span>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs">
                  <span className="text-[#64748B] text-[11px]">Unfinalized</span>
                  <button
                    onClick={() => navigate('/quotations')}
                    className="text-[#B87333] hover:underline font-semibold text-[11px] cursor-pointer"
                  >
                    View Drafts →
                  </button>
                </div>
              </div>

              {/* Card 4: Finalized Quotations */}
              <div className="bg-white p-4 rounded-xl shadow-xs border border-[#E5E1D8] flex flex-col justify-between relative overflow-hidden group">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                      Finalized Quotes
                    </span>
                    <CheckCircle2 className="w-4 h-4 text-[#3F7D5A]" />
                  </div>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-[#1b1c19] tracking-tight font-mono">
                      {data.kpis.finalized_quotations}
                    </span>
                    <span className="text-xs text-[#64748B] font-medium ml-1">Locked</span>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs">
                  <span className="text-[#64748B] text-[11px]">Locked Amount:</span>
                  <span className="text-[#3F7D5A] font-bold font-mono text-[11px]">
                    <TabularNumber value={Number(data.kpis.finalized_quotation_value || 0)} />
                  </span>
                </div>
              </div>

              {/* Card 5: Active Customers */}
              <div className="bg-white p-4 rounded-xl shadow-xs border border-[#E5E1D8] flex flex-col justify-between relative overflow-hidden group">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                      Active Customers
                    </span>
                    <Building2 className="w-4 h-4 text-[#B87333]" />
                  </div>
                  <div className="mt-2 flex items-baseline gap-1.5">
                    <span className="text-2xl font-bold text-[#1b1c19] tracking-tight font-mono">
                      {data.customer_activity.total_active_customers}
                    </span>
                    <span className="text-xs text-[#64748B] font-medium">Customer Accounts</span>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs">
                  <span className="text-[#64748B] text-[11px]">{data.customer_activity.customers_with_quotations} Quoted</span>
                  <button
                    onClick={() => navigate('/customers')}
                    className="text-[#B87333] hover:underline font-semibold text-[11px] cursor-pointer"
                  >
                    Directory →
                  </button>
                </div>
              </div>
            </div>

            {/* Section 3: Split Section (8-cols / 4-cols) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* Left Column (8 cols): Recent Quotations & Status Breakdown */}
              <div className="lg:col-span-8 flex flex-col gap-6">
                
                {/* Recent Quotations Table Card */}
                <div className="bg-white rounded-xl shadow-xs border border-[#E5E1D8] p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#eae8e3]">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-[#ffdcc2]/40 flex items-center justify-center shrink-0">
                        <FileSpreadsheet className="w-5 h-5 text-[#B87333]" />
                      </div>
                      <div>
                        <h2 className="text-base font-semibold text-[#1b1c19] tracking-tight">
                          Recent Quotations &amp; Orders
                        </h2>
                        <p className="text-xs text-[#64748B]">
                          Authoritative commercial records strictly scoped to {company?.name || 'tenant'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="relative w-48 sm:w-60">
                        <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-[#76777d]" />
                        <input
                          type="text"
                          value={searchFilter}
                          onChange={(e) => setSearchFilter(e.target.value)}
                          placeholder="Filter by quote or customer..."
                          className="w-full bg-[#f5f3ee] pl-8 pr-3 py-1.5 rounded-lg text-xs text-[#1b1c19] placeholder:text-[#76777d] focus:outline-none focus:bg-white focus:ring-1 focus:ring-[#B87333] transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Table */}
                  <div className="overflow-x-auto mt-2">
                    {filteredQuotations.length === 0 ? (
                      <div className="text-center py-12 text-[#64748B] text-xs">
                        <FileText className="w-8 h-8 text-[#76777d] mx-auto mb-2 opacity-50" />
                        <p className="font-semibold text-sm text-[#1b1c19]">No Quotations Found in this Period</p>
                        <p className="mt-1">Upload a customer PO to extract line items and compute deterministic costing.</p>
                        <button
                          onClick={() => navigate('/upload')}
                          className="mt-4 px-4 py-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-xs rounded-lg transition-colors cursor-pointer"
                        >
                          Upload Customer PO
                        </button>
                      </div>
                    ) : (
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="bg-[#f5f3ee] text-[#45474c] uppercase font-semibold text-[11px] tracking-wider border-b border-[#eae8e3]">
                            <th className="py-2.5 px-3">Quotation #</th>
                            <th className="py-2.5 px-3">Customer</th>
                            <th className="py-2.5 px-3">Quoted Date</th>
                            <th className="py-2.5 px-3 text-right">Final Total (₹)</th>
                            <th className="py-2.5 px-3 text-center">Status</th>
                            <th className="py-2.5 px-3 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#eae8e3] text-[#1b1c19]">
                          {filteredQuotations.map((q) => {
                            const meta = getStatusBadge(q.status);
                            return (
                              <tr key={q.id} className="hover:bg-[#f5f3ee]/60 transition-colors">
                                <td className="py-3 px-3 font-semibold text-[#172033]">
                                  <div className="flex items-center gap-1.5 font-mono">
                                    <span className={`w-2 h-2 rounded-full ${meta.dotColor}`} />
                                    <span>{q.quotation_number}</span>
                                  </div>
                                </td>
                                <td className="py-3 px-3 font-medium text-[#1b1c19]">
                                  {q.customer_name || 'Bharat Partner Client'}
                                </td>
                                <td className="py-3 px-3 text-[#64748B] font-mono">
                                  {new Date(q.quotation_date || q.date).toLocaleDateString('en-GB', {
                                    day: '2-digit',
                                    month: 'short',
                                    year: 'numeric',
                                  })}
                                </td>
                                <td className="py-3 px-3 text-right font-semibold text-[#1b1c19] font-mono">
                                  <TabularNumber value={Number(q.final_total || q.amount || 0)} />
                                </td>
                                <td className="py-3 px-3 text-center">
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${meta.badgeClass}`}>
                                    {meta.label}
                                  </span>
                                </td>
                                <td className="py-3 px-3 text-right">
                                  <button
                                    onClick={() => navigate(`/quotation/${q.id}`)}
                                    className="px-2.5 py-1 bg-[#f0eee9] hover:bg-[#eae8e3] text-[#172033] rounded text-xs font-semibold transition-all cursor-pointer"
                                  >
                                    Inspect →
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>

                  {filteredQuotations.length > 0 && (
                    <div className="pt-4 flex items-center justify-between text-[#64748B] text-xs border-t border-[#eae8e3] mt-2">
                      <span>Showing {filteredQuotations.length} recorded quotations</span>
                      <button
                        onClick={() => navigate('/quotations')}
                        className="text-[#B87333] hover:underline font-semibold"
                      >
                        View Complete Quotation History →
                      </button>
                    </div>
                  )}
                </div>

                {/* Status Breakdown & Value Trend Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  {/* Status Breakdown Card */}
                  <div className="bg-white p-4 rounded-xl shadow-xs border border-[#E5E1D8] flex flex-col justify-between">
                    <div className="flex items-center justify-between pb-2 border-b border-[#eae8e3]">
                      <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4 text-[#B87333]" />
                        <span className="text-sm font-semibold text-[#1b1c19]">
                          Quotation Status Breakdown
                        </span>
                      </div>
                      <span className="text-xs font-semibold text-[#1b1c19] font-mono">
                        {data.kpis.quotations_created} Total
                      </span>
                    </div>

                    <div className="flex flex-col gap-3 py-3">
                      {data.status_breakdown.length === 0 ? (
                        <div className="text-xs text-[#64748B] py-4 text-center">No status data in current period.</div>
                      ) : (
                        data.status_breakdown.map((sb) => (
                          <div key={sb.status}>
                            <div className="flex justify-between text-xs mb-1">
                              <span className="font-medium text-[#1b1c19]">{sb.status}</span>
                              <span className="text-[#64748B] font-mono">
                                {sb.count} ({sb.percentage}%) • <TabularNumber value={Number(sb.value)} />
                              </span>
                            </div>
                            <div className="w-full bg-[#eae8e3] h-2 rounded-full overflow-hidden">
                              <div
                                className="bg-[#B87333] h-full rounded-full transition-all"
                                style={{ width: `${Math.min(100, sb.percentage)}%` }}
                              />
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Top Customer Accounts */}
                  <div className="bg-white p-4 rounded-xl shadow-xs border border-[#E5E1D8] flex flex-col justify-between">
                    <div className="flex items-center justify-between pb-2 border-b border-[#eae8e3]">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-[#B87333]" />
                        <span className="text-sm font-semibold text-[#1b1c19]">
                          Top Customer Accounts
                        </span>
                      </div>
                      <span className="text-xs font-semibold text-[#1b1c19] font-mono">
                        {data.customer_activity.top_customers.length} Accounts
                      </span>
                    </div>

                    <div className="flex flex-col gap-2.5 py-2">
                      {data.customer_activity.top_customers.length === 0 ? (
                        <div className="text-xs text-[#64748B] py-4 text-center">No customer quotation history yet.</div>
                      ) : (
                        data.customer_activity.top_customers.slice(0, 4).map((tc) => (
                          <div
                            key={tc.id}
                            onClick={() => navigate(`/customers/${tc.id}`)}
                            className="p-2.5 rounded-lg bg-[#f5f3ee] hover:bg-[#eae8e3] transition-colors flex items-center justify-between cursor-pointer"
                          >
                            <div className="flex flex-col truncate">
                              <span className="text-xs font-semibold text-[#1b1c19] truncate">{tc.name}</span>
                              <span className="text-[11px] text-[#64748B]">{tc.quotation_count} Quotations</span>
                            </div>
                            <span className="text-xs font-bold font-mono text-[#172033]">
                              <TabularNumber value={Number(tc.total_value)} />
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

              </div>

              {/* Right Column (4 cols): PO Upload, Priority Actions, Email Telemetry */}
              <div className="lg:col-span-4 flex flex-col gap-4">
                
                {/* AI Document Upload Widget */}
                <div className="bg-white p-4 rounded-xl shadow-xs border border-[#E5E1D8] relative overflow-hidden">
                  <div className="flex items-center justify-between pb-2 border-b border-[#eae8e3]">
                    <div className="flex items-center gap-2">
                      <UploadCloud className="w-4 h-4 text-[#B87333]" />
                      <h3 className="text-sm font-semibold text-[#1b1c19]">
                        Upload Purchase Order
                      </h3>
                    </div>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#ffdcc2] text-[#8c4f10] uppercase font-mono">
                      Azure &amp; Gemini
                    </span>
                  </div>
                  <p className="text-xs text-[#64748B] mt-2 leading-relaxed">
                    AI optical extraction ingests engineering specifications and parts without inventing prices.
                  </p>

                  {/* Drop Target */}
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
                      PDF, TIFF, JPEG, PNG up to 25MB
                    </p>
                  </div>
                </div>

                {/* Priority Pending Actions Card */}
                <div className="bg-white p-4 rounded-xl shadow-xs border border-[#E5E1D8] flex flex-col gap-3">
                  <div className="flex items-center justify-between pb-2 border-b border-[#eae8e3]">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-[#B87333]" />
                      <h3 className="text-sm font-semibold text-[#1b1c19]">
                        Actionable Pipeline Items
                      </h3>
                    </div>
                    <span className="px-1.5 py-0.5 bg-[#ffdcc2] text-[#8c4f10] text-[11px] rounded font-semibold font-mono">
                      {data.pending_actions.length} Pending
                    </span>
                  </div>

                  <div className="flex flex-col gap-2">
                    {data.pending_actions.length === 0 ? (
                      <div className="p-4 bg-[#f5f3ee] rounded-lg text-center text-xs text-[#3F7D5A] flex items-center justify-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-[#3F7D5A]" />
                        <span>All POs and Quotations are cleared!</span>
                      </div>
                    ) : (
                      data.pending_actions.slice(0, 4).map((act) => (
                        <div
                          key={act.id}
                          onClick={() => navigate(act.link)}
                          className="p-3 rounded-lg bg-[#f5f3ee] hover:bg-[#eae8e3] transition-colors flex flex-col gap-1 cursor-pointer border border-[#E5E1D8]/60"
                        >
                          <div className="flex items-start justify-between">
                            <span className="text-xs font-semibold text-[#1b1c19] font-mono">
                              {act.reference_number}
                            </span>
                            <span className="text-[10px] uppercase font-bold text-[#8c4f10] bg-[#ffdcc2] px-1.5 py-0.5 rounded">
                              {act.type.replace('_', ' ')}
                            </span>
                          </div>
                          <p className="text-xs text-[#64748B] leading-relaxed">
                            {act.description}
                          </p>
                          <div className="flex items-center justify-between mt-1 pt-1 border-t border-[#eae8e3] text-[11px]">
                            <span className="text-[#64748B]">{act.customer_name || 'Customer'}</span>
                            <span className="text-[#B87333] font-semibold flex items-center gap-0.5">
                              Resolve →
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Email Dispatch Telemetry */}
                <div className="bg-white p-4 rounded-xl shadow-xs border border-[#E5E1D8] flex flex-col gap-3">
                  <div className="flex items-center justify-between pb-2 border-b border-[#eae8e3]">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-[#B87333]" />
                      <h3 className="text-sm font-semibold text-[#1b1c19]">
                        Email Dispatch Deliverability
                      </h3>
                    </div>
                    <span className="text-xs font-semibold text-[#3F7D5A] font-mono">
                      {data.email_summary.success_rate}% Success
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="bg-[#f5f3ee] p-2 rounded-lg">
                      <span className="text-[10px] text-[#76777d] uppercase block">Sent</span>
                      <span className="font-bold text-sm text-[#3F7D5A] font-mono">{data.email_summary.sent}</span>
                    </div>
                    <div className="bg-[#f5f3ee] p-2 rounded-lg">
                      <span className="text-[10px] text-[#76777d] uppercase block">Failed</span>
                      <span className="font-bold text-sm text-[#ba1a1a] font-mono">{data.email_summary.failed}</span>
                    </div>
                    <div className="bg-[#f5f3ee] p-2 rounded-lg">
                      <span className="text-[10px] text-[#76777d] uppercase block">Total</span>
                      <span className="font-bold text-sm text-[#1b1c19] font-mono">{data.email_summary.total}</span>
                    </div>
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

export default DashboardPage;
