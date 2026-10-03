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
          badgeClass: 'bg-emerald-50 text-emerald-700 border border-emerald-200/80',
          dotColor: 'bg-emerald-500',
        };
      case 'SENT':
      case 'DISPATCHED':
        return {
          label: 'Emailed',
          badgeClass: 'bg-blue-50 text-blue-700 border border-blue-200/80',
          dotColor: 'bg-blue-500',
        };
      case 'READY_TO_SEND':
        return {
          label: 'Ready to Send',
          badgeClass: 'bg-indigo-50 text-indigo-700 border border-indigo-200/80',
          dotColor: 'bg-indigo-500',
        };
      case 'DRAFT':
      default:
        return {
          label: 'Draft',
          badgeClass: 'bg-amber-50 text-amber-700 border border-amber-200/80',
          dotColor: 'bg-amber-400',
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
    <div className="w-full bg-[#f8fafc] p-4 sm:p-6 lg:p-8 font-sans antialiased text-slate-900 min-h-screen">
      <div className="max-w-[1400px] w-full mx-auto space-y-6">
        
        {/* Section 1: Executive Top Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-xs border border-slate-200/90">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-wider text-[#2563EB] font-bold">
                {company?.name || 'Bharat Precision Engineering Pvt. Ltd.'}
              </span>
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span className="text-xs text-slate-500 font-mono">TENANT VERIFIED</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight mt-0.5">
              Costing &amp; Quotation Cockpit
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              Welcome back, {firstName}. Authoritative deterministic costing, active RFQs, and customer dispatch.
            </p>
          </div>

          <div className="flex items-center gap-3 self-start md:self-center flex-wrap">
            {/* Period Selector */}
            <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 gap-2">
              <Calendar className="w-4 h-4 text-slate-500" />
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer"
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
              className="p-2 bg-white hover:bg-slate-50 text-slate-700 rounded-lg border border-slate-200 transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin text-[#2563EB]' : ''}`} />
            </button>

            {/* Primary Action Button */}
            <button
              onClick={() => navigate('/upload')}
              className="flex items-center gap-1.5 bg-[#2563EB] hover:bg-[#1D4ED8] active:scale-[0.99] text-white px-4 py-2 rounded-lg text-xs font-semibold shadow-xs transition-all cursor-pointer focus:outline-none"
            >
              <Plus className="w-4 h-4" />
              <span>New Purchase Order</span>
            </button>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="bg-white rounded-2xl p-12 text-center border border-slate-200/90 shadow-xs">
            <div className="flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 border-2 border-slate-200 border-t-[#2563EB] rounded-full animate-spin" />
              <span className="text-xs font-mono text-slate-500 tracking-wider uppercase">
                Loading Authoritative Dashboard Aggregations...
              </span>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-2xl text-sm flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
              <span>Failed to fetch dashboard metrics. Verify database connectivity.</span>
            </div>
            <button
              onClick={() => refetch()}
              className="px-3 py-1 bg-white text-red-800 text-xs font-semibold rounded-lg shadow-xs hover:bg-slate-50 border border-red-200"
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
              <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200/90 hover:border-slate-300 transition-all flex flex-col justify-between group">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      Pipeline Quoted Value
                    </span>
                    <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#2563EB] flex items-center justify-center shrink-0">
                      <DollarSign className="w-4.5 h-4.5" />
                    </div>
                  </div>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-slate-900 tracking-tight font-mono">
                      <TabularNumber value={Number(data.kpis.total_quotation_value || 0)} />
                    </span>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span>Operational Pipeline</span>
                  <span className="font-mono font-medium text-slate-700">{formatPeriodLabel(period)}</span>
                </div>
              </div>

              {/* Card 2: Pending PO Review */}
              <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200/90 hover:border-slate-300 transition-all flex flex-col justify-between group">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      Pending PO Review
                    </span>
                    <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                      <Clock className="w-4.5 h-4.5" />
                    </div>
                  </div>
                  <div className="mt-2 flex items-baseline gap-1.5">
                    <span className="text-2xl font-bold text-slate-900 tracking-tight font-mono">
                      {data.kpis.pending_po_review}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">Orders</span>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-500 text-[11px]">Human Verification</span>
                  <button
                    onClick={() => navigate('/review')}
                    className="text-[#2563EB] hover:underline font-semibold text-[11px] cursor-pointer"
                  >
                    Open Review →
                  </button>
                </div>
              </div>

              {/* Card 3: Draft Quotations */}
              <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200/90 hover:border-slate-300 transition-all flex flex-col justify-between group">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      Draft Quotations
                    </span>
                    <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                      <FileText className="w-4.5 h-4.5" />
                    </div>
                  </div>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-slate-900 tracking-tight font-mono">
                      {data.kpis.draft_quotations}
                    </span>
                    <span className="text-xs text-slate-500 font-medium ml-1">Under Costing</span>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-500 text-[11px]">Unfinalized</span>
                  <button
                    onClick={() => navigate('/quotations')}
                    className="text-[#2563EB] hover:underline font-semibold text-[11px] cursor-pointer"
                  >
                    View Drafts →
                  </button>
                </div>
              </div>

              {/* Card 4: Finalized Quotations */}
              <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200/90 hover:border-slate-300 transition-all flex flex-col justify-between group">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      Finalized Quotes
                    </span>
                    <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-4.5 h-4.5" />
                    </div>
                  </div>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-slate-900 tracking-tight font-mono">
                      {data.kpis.finalized_quotations}
                    </span>
                    <span className="text-xs text-slate-500 font-medium ml-1">Locked</span>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-500 text-[11px]">Locked Amount:</span>
                  <span className="text-emerald-700 font-bold font-mono text-[11px]">
                    <TabularNumber value={Number(data.kpis.finalized_quotation_value || 0)} />
                  </span>
                </div>
              </div>

              {/* Card 5: Active Customers */}
              <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200/90 hover:border-slate-300 transition-all flex flex-col justify-between group">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      Active Customers
                    </span>
                    <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                      <Building2 className="w-4.5 h-4.5" />
                    </div>
                  </div>
                  <div className="mt-2 flex items-baseline gap-1.5">
                    <span className="text-2xl font-bold text-slate-900 tracking-tight font-mono">
                      {data.customer_activity.total_active_customers}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">Accounts</span>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-500 text-[11px]">{data.customer_activity.customers_with_quotations} Quoted</span>
                  <button
                    onClick={() => navigate('/customers')}
                    className="text-[#2563EB] hover:underline font-semibold text-[11px] cursor-pointer"
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
                <div className="bg-white rounded-2xl shadow-xs border border-slate-200/90 p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-[#2563EB] shrink-0">
                        <FileSpreadsheet className="w-5 h-5" />
                      </div>
                      <div>
                        <h2 className="text-base font-semibold text-slate-900 tracking-tight">
                          Recent Quotations &amp; Orders
                        </h2>
                        <p className="text-xs text-slate-500">
                          Authoritative commercial records strictly scoped to {company?.name || 'tenant'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="relative w-48 sm:w-60">
                        <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                        <input
                          type="text"
                          value={searchFilter}
                          onChange={(e) => setSearchFilter(e.target.value)}
                          placeholder="Filter by quote or customer..."
                          className="w-full bg-slate-50 pl-8 pr-3 py-1.5 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 border border-slate-200 focus:outline-none focus:bg-white focus:ring-1 focus:ring-[#2563EB] focus:border-[#2563EB] transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Table */}
                  <div className="overflow-x-auto mt-2">
                    {filteredQuotations.length === 0 ? (
                      <div className="text-center py-12 text-slate-500 text-xs">
                        <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <p className="font-semibold text-sm text-slate-800">No Quotations Found in this Period</p>
                        <p className="mt-1 text-slate-500">Upload a customer PO to extract line items and compute deterministic costing.</p>
                        <button
                          onClick={() => navigate('/upload')}
                          className="mt-4 px-4 py-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-xs rounded-lg transition-colors cursor-pointer shadow-xs"
                        >
                          Upload Customer PO
                        </button>
                      </div>
                    ) : (
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="bg-slate-50 text-slate-600 uppercase font-semibold text-[11px] tracking-wider border-b border-slate-200">
                            <th className="py-2.5 px-3">Quotation #</th>
                            <th className="py-2.5 px-3">Customer</th>
                            <th className="py-2.5 px-3">Quoted Date</th>
                            <th className="py-2.5 px-3 text-right">Final Total (₹)</th>
                            <th className="py-2.5 px-3 text-center">Status</th>
                            <th className="py-2.5 px-3 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-800">
                          {filteredQuotations.map((q) => {
                            const meta = getStatusBadge(q.status);
                            return (
                              <tr key={q.id} className="hover:bg-slate-50/70 transition-colors">
                                <td className="py-3 px-3 font-semibold text-slate-900">
                                  <div className="flex items-center gap-1.5 font-mono">
                                    <span className={`w-2 h-2 rounded-full ${meta.dotColor}`} />
                                    <span>{q.quotation_number}</span>
                                  </div>
                                </td>
                                <td className="py-3 px-3 font-medium text-slate-800">
                                  {q.customer_name || 'Bharat Partner Client'}
                                </td>
                                <td className="py-3 px-3 text-slate-500 font-mono">
                                  {new Date(q.quotation_date || q.date).toLocaleDateString('en-GB', {
                                    day: '2-digit',
                                    month: 'short',
                                    year: 'numeric',
                                  })}
                                </td>
                                <td className="py-3 px-3 text-right font-semibold text-slate-900 font-mono">
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
                                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded text-xs font-semibold transition-all cursor-pointer"
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
                    <div className="pt-4 flex items-center justify-between text-slate-500 text-xs border-t border-slate-100 mt-2">
                      <span>Showing {filteredQuotations.length} recorded quotations</span>
                      <button
                        onClick={() => navigate('/quotations')}
                        className="text-[#2563EB] hover:underline font-semibold"
                      >
                        View Complete Quotation History →
                      </button>
                    </div>
                  )}
                </div>

                {/* Status Breakdown & Value Trend Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  {/* Status Breakdown Card */}
                  <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200/90 flex flex-col justify-between">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4 text-[#2563EB]" />
                        <span className="text-sm font-semibold text-slate-900">
                          Quotation Status Breakdown
                        </span>
                      </div>
                      <span className="text-xs font-semibold text-slate-700 font-mono">
                        {data.kpis.quotations_created} Total
                      </span>
                    </div>

                    <div className="flex flex-col gap-3 py-3">
                      {data.status_breakdown.length === 0 ? (
                        <div className="text-xs text-slate-500 py-4 text-center">No status data in current period.</div>
                      ) : (
                        data.status_breakdown.map((sb) => (
                          <div key={sb.status}>
                            <div className="flex justify-between text-xs mb-1">
                              <span className="font-medium text-slate-800">{sb.status}</span>
                              <span className="text-slate-500 font-mono">
                                {sb.count} ({sb.percentage}%) • <TabularNumber value={Number(sb.value)} />
                              </span>
                            </div>
                            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                              <div
                                className="bg-[#2563EB] h-full rounded-full transition-all"
                                style={{ width: `${Math.min(100, sb.percentage)}%` }}
                              />
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Top Customer Accounts */}
                  <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200/90 flex flex-col justify-between">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-[#2563EB]" />
                        <span className="text-sm font-semibold text-slate-900">
                          Top Customer Accounts
                        </span>
                      </div>
                      <span className="text-xs font-semibold text-slate-700 font-mono">
                        {data.customer_activity.top_customers.length} Accounts
                      </span>
                    </div>

                    <div className="flex flex-col gap-2.5 py-2">
                      {data.customer_activity.top_customers.length === 0 ? (
                        <div className="text-xs text-slate-500 py-4 text-center">No customer quotation history yet.</div>
                      ) : (
                        data.customer_activity.top_customers.slice(0, 4).map((tc) => (
                          <div
                            key={tc.id}
                            onClick={() => navigate(`/customers/${tc.id}`)}
                            className="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors flex items-center justify-between cursor-pointer border border-slate-100"
                          >
                            <div className="flex flex-col truncate">
                              <span className="text-xs font-semibold text-slate-900 truncate">{tc.name}</span>
                              <span className="text-[11px] text-slate-500">{tc.quotation_count} Quotations</span>
                            </div>
                            <span className="text-xs font-bold font-mono text-slate-900">
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
                <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200/90 relative overflow-hidden">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <UploadCloud className="w-4 h-4 text-[#2563EB]" />
                      <h3 className="text-sm font-semibold text-slate-900">
                        Upload Purchase Order
                      </h3>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-[#2563EB] uppercase font-mono border border-blue-200">
                      OCR &amp; AI
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                    AI optical extraction ingests engineering specifications and parts without inventing prices.
                  </p>

                  {/* Drop Target */}
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => navigate('/upload')}
                    className={`mt-3 rounded-xl p-5 flex flex-col items-center justify-center text-center cursor-pointer border-2 border-dashed transition-all group ${
                      isDragOver
                        ? 'bg-blue-50/50 border-[#2563EB]'
                        : 'bg-slate-50 hover:bg-blue-50/20 border-slate-200 hover:border-[#2563EB]'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-[#2563EB] group-hover:scale-105 transition-transform">
                      <UploadCloud className="w-5 h-5" />
                    </div>
                    <div className="mt-2 text-xs font-semibold text-slate-900">
                      Drop PO file here or <span className="text-[#2563EB] underline underline-offset-2">Browse</span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      PDF, TIFF, JPEG, PNG up to 25MB
                    </p>
                  </div>
                </div>

                {/* Priority Pending Actions Card */}
                <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200/90 flex flex-col gap-3">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-600" />
                      <h3 className="text-sm font-semibold text-slate-900">
                        Actionable Pipeline Items
                      </h3>
                    </div>
                    <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 text-[11px] rounded-full font-semibold font-mono">
                      {data.pending_actions.length} Pending
                    </span>
                  </div>

                  <div className="flex flex-col gap-2">
                    {data.pending_actions.length === 0 ? (
                      <div className="p-4 bg-slate-50 rounded-xl text-center text-xs text-emerald-700 flex items-center justify-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>All POs and Quotations are cleared!</span>
                      </div>
                    ) : (
                      data.pending_actions.slice(0, 4).map((act) => (
                        <div
                          key={act.id}
                          onClick={() => navigate(act.link)}
                          className="p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors flex flex-col gap-1 cursor-pointer border border-slate-200/80"
                        >
                          <div className="flex items-start justify-between">
                            <span className="text-xs font-semibold text-slate-900 font-mono">
                              {act.reference_number}
                            </span>
                            <span className="text-[10px] uppercase font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                              {act.type.replace('_', ' ')}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 leading-relaxed">
                            {act.description}
                          </p>
                          <div className="flex items-center justify-between mt-1 pt-1 border-t border-slate-200/60 text-[11px]">
                            <span className="text-slate-500">{act.customer_name || 'Customer'}</span>
                            <span className="text-[#2563EB] font-semibold flex items-center gap-0.5">
                              Resolve →
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Email Dispatch Telemetry */}
                <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200/90 flex flex-col gap-3">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-[#2563EB]" />
                      <h3 className="text-sm font-semibold text-slate-900">
                        Email Dispatch Deliverability
                      </h3>
                    </div>
                    <span className="text-xs font-semibold text-emerald-700 font-mono">
                      {data.email_summary.success_rate}% Success
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <span className="text-[10px] text-slate-500 uppercase block">Sent</span>
                      <span className="font-bold text-sm text-emerald-700 font-mono">{data.email_summary.sent}</span>
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <span className="text-[10px] text-slate-500 uppercase block">Failed</span>
                      <span className="font-bold text-sm text-red-600 font-mono">{data.email_summary.failed}</span>
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <span className="text-[10px] text-slate-500 uppercase block">Total</span>
                      <span className="font-bold text-sm text-slate-900 font-mono">{data.email_summary.total}</span>
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
