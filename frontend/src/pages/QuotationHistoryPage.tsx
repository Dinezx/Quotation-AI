import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Search,
  Download,
  Plus,
  CheckCircle2,
  AlertCircle,
  Clock,
  RefreshCw,
  ChevronRight,
  TrendingUp,
  Wallet,
  BarChart3,
  Factory,
  ShieldCheck,
  Edit3,
  MoreVertical,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { quotationApi, QuotationDTO } from '../api/quotationApi';

// ─── Status helpers ──────────────────────────────────────────────────────────

interface StatusMeta {
  label: string;
  dotColor: string;
  pillClass: string;
  pulse?: boolean;
}

function getStatusMeta(status: string): StatusMeta {
  switch (status) {
    case 'FINAL':
      return { label: 'Finalized', dotColor: '#3F7D5A', pillClass: 'bg-[#3F7D5A]/15 text-[#3F7D5A]' };
    case 'APPROVED':
      return { label: 'Approved', dotColor: '#3F7D5A', pillClass: 'bg-[#3F7D5A]/15 text-[#3F7D5A]' };
    case 'READY_TO_SEND':
      return { label: 'Ready to Send', dotColor: '#2dd4bf', pillClass: 'bg-[#B87333]/15 text-[#B87333]', pulse: true };
    case 'SENT':
      return { label: 'Sent', dotColor: '#76777d', pillClass: 'bg-[#eae8e3] text-[#45474c]' };
    case 'DISPATCHED':
      return { label: 'Dispatched', dotColor: '#3F7D5A', pillClass: 'bg-[#3F7D5A]/15 text-[#3F7D5A]' };
    case 'DRAFT':
    default:
      return { label: status || 'Draft', dotColor: '#B7791F', pillClass: 'bg-[#B7791F]/15 text-[#B7791F]' };
  }
}

function getInitials(name: string): string {
  return (name || 'N/A')
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0] || '')
    .join('')
    .toUpperCase();
}

const Sparkline: React.FC<{ color?: string }> = ({ color = '#B87333' }) => (
  <svg className="w-16 h-5" fill="none" viewBox="0 0 64 20">
    <path
      d="M2 16 L14 12 L26 14 L38 8 L50 9 L62 3"
      stroke={color}
      strokeLinecap="round"
      strokeWidth="2"
    />
  </svg>
);

function fmtDate(iso: string | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function fmtCurrency(val: number | undefined): string {
  if (val == null) return '—';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(val);
}

// ─── Page Component ──────────────────────────────────────────────────────────

export const QuotationHistoryPage: React.FC = () => {
  const navigate = useNavigate();

  const [quotations, setQuotations] = useState<QuotationDTO[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [pageSize] = useState<number>(15);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [quickFilter, setQuickFilter] = useState<string>('ALL');
  const [loading, setLoading] = useState<boolean>(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const fetchQuotations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await quotationApi.listPaginated({
        page,
        page_size: pageSize,
        search: debouncedSearch.trim() || undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
      });
      setQuotations(data.items || []);
      setTotalCount(data.total || 0);
    } catch (err: any) {
      setError(
        err.response?.data?.detail || err.message || 'Failed to load quotation history.'
      );
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, debouncedSearch, statusFilter]);

  useEffect(() => {
    fetchQuotations();
  }, [fetchQuotations]);

  const handleDownload = async (q: QuotationDTO, e: React.MouseEvent) => {
    e.stopPropagation();
    setDownloadingId(q.id);
    try {
      await quotationApi.downloadPdf(q.id, q.quotation_number);
    } catch (err: any) {
      alert(`Download failed: ${err.response?.data?.detail || err.message}`);
    } finally {
      setDownloadingId(null);
    }
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const finalCount = quotations.filter((q) => q.status === 'FINAL').length;
  const draftCount = quotations.filter((q) => q.status === 'DRAFT').length;
  const pipelineValue = quotations.reduce((acc, q) => acc + (q.final_total || 0), 0);

  const toggleRow = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const allChecked =
    quotations.length > 0 && quotations.every((q) => selectedIds.has(q.id));

  const toggleAll = () => {
    if (allChecked) setSelectedIds(new Set());
    else setSelectedIds(new Set(quotations.map((q) => q.id)));
  };

  const quickFilterOptions = [
    { id: 'ALL', label: 'All Quotations', count: totalCount },
    {
      id: 'HIGH_VALUE',
      label: 'High-Value (> ₹20L)',
      count: quotations.filter((q) => q.final_total > 2000000).length,
    },
    { id: 'DRAFT', label: 'Follow-ups Due', count: draftCount },
    { id: 'FINAL', label: 'Ready for Conversion', count: finalCount },
  ];

  const visibleRows =
    quickFilter === 'ALL'
      ? quotations
      : quickFilter === 'HIGH_VALUE'
      ? quotations.filter((q) => q.final_total > 2000000)
      : quotations.filter((q) => q.status === quickFilter);

  const getPageNumbers = (): (number | '...')[] => {
    const pages: (number | '...')[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (page > 3) pages.push('...');
      for (
        let i = Math.max(2, page - 1);
        i <= Math.min(totalPages - 1, page + 1);
        i++
      )
        pages.push(i);
      if (page < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className="w-full px-8 py-7 bg-surface min-h-screen space-y-6 pb-12">
      {/* ── PAGE HEADER ────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="flex flex-col space-y-1">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-[#76777d] font-semibold">
            <span>Sales &amp; Commercials</span>
            <span className="text-[#c6c6cd]">/</span>
            <span className="text-[#B87333] font-semibold">Ledger Registry</span>
          </div>
          <h1 className="text-[28px] leading-9 font-semibold text-[#1b1c19] tracking-tight">
            Quotation History
          </h1>
          <p className="text-[14px] text-[#45474c] max-w-2xl">
            Track, audit, and analyze all issued and pending commercial manufacturing
            quotations across production units with real-time tax and margin telemetry.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => fetchQuotations()}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white text-[#1b1c19] text-[12px] font-medium rounded-lg shadow-sm hover:bg-[#eae8e3] transition-colors border border-[#e4e2dd]"
          >
            <RefreshCw className={`w-4 h-4 text-[#76777d] ${loading ? 'animate-spin' : ''}`} />
            <span>Audit Trail</span>
          </button>
          <button
            onClick={() => navigate('/upload')}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#B87333] text-white text-[12px] font-medium rounded-lg shadow-sm hover:bg-[#A46328] transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>+ Create New Quotation</span>
          </button>
        </div>
      </div>

      {/* ── KPI CARDS ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Card 1: Active Pipeline */}
        <div className="bg-white p-4 rounded-lg shadow-sm flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] uppercase tracking-wider text-[#76777d] font-semibold">
                Active Pipeline
              </span>
              <div className="text-[36px] leading-[44px] font-bold text-[#1b1c19] mt-1 tracking-tight tabular-nums">
                {loading ? '—' : fmtCurrency(pipelineValue)}
              </div>
            </div>
            <div className="p-2 rounded-lg bg-[#f5f3ee] text-[#B87333] flex items-center justify-center">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-3 flex items-center justify-between text-[12px]">
            <div className="flex items-center gap-1 text-[#3F7D5A] font-semibold">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>+18.2%</span>
              <span className="text-[#76777d] font-normal">vs last quarter</span>
            </div>
            <Sparkline color="#B87333" />
          </div>
        </div>

        {/* Card 2: Conversion Rate */}
        <div className="bg-white p-4 rounded-lg shadow-sm flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] uppercase tracking-wider text-[#76777d] font-semibold">
                Conversion Rate
              </span>
              <div className="text-[36px] leading-[44px] font-bold text-[#1b1c19] mt-1 tracking-tight">
                {loading
                  ? '—'
                  : quotations.length > 0
                  ? Math.round((finalCount / quotations.length) * 100)
                  : 64}
                <span className="text-[18px] font-medium text-[#45474c]">%</span>
              </div>
            </div>
            <div className="p-2 rounded-lg bg-[#f5f3ee] text-[#1b1c19] flex items-center justify-center">
              <BarChart3 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-3 flex items-center justify-between text-[12px]">
            <div className="flex items-center gap-1 text-[#3F7D5A] font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>+4.1%</span>
              <span className="text-[#76777d] font-normal">target met</span>
            </div>
            <div className="w-16 bg-[#eae8e3] h-1.5 rounded-full overflow-hidden">
              <div className="bg-[#B87333] h-full rounded-full" style={{ width: '64.8%' }} />
            </div>
          </div>
        </div>

        {/* Card 3: Awaiting OEMs */}
        <div className="bg-white p-4 rounded-lg shadow-sm flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] uppercase tracking-wider text-[#76777d] font-semibold">
                Awaiting OEMs
              </span>
              <div className="text-[36px] leading-[44px] font-bold text-[#1b1c19] mt-1 tracking-tight">
                {loading ? '—' : draftCount}
                <span className="text-[18px] font-medium text-[#45474c] ml-1">pending</span>
              </div>
            </div>
            <div className="p-2 rounded-lg bg-[#f5f3ee] text-[#B87333] flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-3 flex items-center justify-between text-[12px]">
            <div className="flex items-center gap-1 text-[#45474c] font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-[#B87333] inline-block" />
              <span>{draftCount} proposals</span>
              <span className="text-[#76777d]">in review</span>
            </div>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#eae8e3] text-[#1b1c19] font-medium">
              {Math.max(1, Math.ceil(draftCount / 3))} High Priority
            </span>
          </div>
        </div>

        {/* Card 4: Avg Turnaround */}
        <div className="bg-white p-4 rounded-lg shadow-sm flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] uppercase tracking-wider text-[#76777d] font-semibold">
                Avg Turnaround
              </span>
              <div className="text-[36px] leading-[44px] font-bold text-[#1b1c19] mt-1 tracking-tight">
                18.4
                <span className="text-[18px] font-medium text-[#45474c] ml-1">hrs</span>
              </div>
            </div>
            <div className="p-2 rounded-lg bg-[#f5f3ee] text-[#1b1c19] flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-3 flex items-center justify-between text-[12px]">
            <div className="flex items-center gap-1 text-[#3F7D5A] font-semibold">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>-2.5 hrs</span>
              <span className="text-[#76777d] font-normal">costing cycle</span>
            </div>
            <span className="text-[11px] text-[#76777d]">Benchmark: 24h</span>
          </div>
        </div>
      </div>

      {/* ── FILTER RIBBON ──────────────────────────────────────────────────── */}
      <div className="flex flex-col space-y-3 bg-white p-4 rounded-lg shadow-sm">
        {/* Quick view tabs + export */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {quickFilterOptions.map((opt) => (
              <button
                key={opt.id}
                onClick={() => setQuickFilter(opt.id)}
                className={`px-3.5 py-1.5 rounded-md text-[12px] font-medium flex items-center gap-1.5 whitespace-nowrap transition-colors ${
                  quickFilter === opt.id
                    ? 'bg-[#172033] text-white shadow-sm'
                    : 'text-[#45474c] hover:bg-[#f5f3ee]'
                }`}
              >
                <span>{opt.label}</span>
                <span
                  className={`px-1.5 rounded text-[10px] font-bold ${
                    quickFilter === opt.id ? 'bg-white/20' : 'bg-[#eae8e3]'
                  }`}
                >
                  {opt.count}
                </span>
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-1.5 px-3 py-1.5 bg-[#f5f3ee] text-[#1b1c19] text-[12px] font-medium rounded-md hover:bg-[#eae8e3] transition-colors">
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
            <button className="flex items-center gap-1.5 px-3 py-1.5 bg-[#f5f3ee] text-[#1b1c19] text-[12px] font-medium rounded-md hover:bg-[#eae8e3] transition-colors">
              <FileText className="w-3.5 h-3.5" />
              <span>Print Ledger</span>
            </button>
          </div>
        </div>

        {/* Search + filter dropdowns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-center">
          <div className="lg:col-span-4 relative">
            <Search className="w-4 h-4 text-[#76777d] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Search by quotation #, customer, PO number..."
              className="w-full pl-9 pr-4 py-2 bg-[#f5f3ee] rounded-lg text-[12px] text-[#1b1c19] placeholder:text-[#76777d] focus:outline-none focus:bg-white shadow-sm transition-colors"
            />
          </div>
          <div className="lg:col-span-2 relative">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 bg-[#f5f3ee] rounded-lg text-[12px] text-[#1b1c19] appearance-none focus:outline-none cursor-pointer"
            >
              <option value="ALL">Status: All Records</option>
              <option value="FINAL">Finalized</option>
              <option value="DRAFT">Draft</option>
              <option value="SENT">Sent</option>
            </select>
            <ChevronRight className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-[#76777d] pointer-events-none rotate-90" />
          </div>
          <div className="lg:col-span-2 relative">
            <select className="w-full px-3 py-2 bg-[#f5f3ee] rounded-lg text-[12px] text-[#1b1c19] appearance-none focus:outline-none cursor-pointer">
              <option>Date: Last 90 Days</option>
              <option>Current Fiscal Q1</option>
              <option>Last 30 Days</option>
              <option>Custom Date Span</option>
            </select>
            <ChevronRight className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-[#76777d] pointer-events-none rotate-90" />
          </div>
          <div className="lg:col-span-2 relative">
            <select className="w-full px-3 py-2 bg-[#f5f3ee] rounded-lg text-[12px] text-[#1b1c19] appearance-none focus:outline-none cursor-pointer">
              <option>Customer: All OEMs</option>
              <option>Tata Motors Ltd</option>
              <option>Bharat Forge Ltd</option>
              <option>L&amp;T Heavy Engineering</option>
              <option>Kirloskar Oil Engines</option>
            </select>
            <ChevronRight className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-[#76777d] pointer-events-none rotate-90" />
          </div>
          <div className="lg:col-span-2 relative">
            <select className="w-full px-3 py-2 bg-[#f5f3ee] rounded-lg text-[12px] text-[#1b1c19] appearance-none focus:outline-none cursor-pointer">
              <option>Plant: Unit 1 – Pune</option>
              <option>Unit 2 – Chakan</option>
              <option>Unit 3 – Chennai</option>
              <option>All Plant Hubs</option>
            </select>
            <Factory className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-[#76777d] pointer-events-none" />
          </div>
        </div>
      </div>

      {/* ── MAIN TABLE ─────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-14 text-center flex flex-col items-center gap-3 text-[#45474c] text-[12px]">
              <div className="w-7 h-7 border-2 border-[#172033] border-t-[#B87333] rounded-full animate-spin" />
              <span>Loading quotation records from server...</span>
            </div>
          ) : error ? (
            <div className="p-10 text-center space-y-3">
              <AlertCircle className="w-9 h-9 text-amber-500 mx-auto" />
              <p className="text-[12px] font-semibold text-amber-600">{error}</p>
              <button
                onClick={() => fetchQuotations()}
                className="px-4 py-1.5 border border-[#e4e2dd] rounded-lg text-[12px] text-[#1b1c19] hover:bg-[#f5f3ee]"
              >
                Retry
              </button>
            </div>
          ) : visibleRows.length === 0 ? (
            <div className="p-14 text-center space-y-2">
              <FileText className="w-11 h-11 text-[#dbdad5] mx-auto" />
              <p className="font-semibold text-[#1b1c19] text-[14px]">No Quotations Found</p>
              <p className="text-[12px] text-[#45474c]">
                No records match your search or filter criteria.
              </p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#f0eee9] text-[#45474c] text-[11px] uppercase tracking-wider font-semibold select-none">
                  <th className="py-3 px-4 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={allChecked}
                      onChange={toggleAll}
                      className="w-3.5 h-3.5 rounded cursor-pointer"
                    />
                  </th>
                  <th className="py-3.5 px-4">Quotation No.</th>
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4">Customer (OEM)</th>
                  <th className="py-3.5 px-4 min-w-[200px]">Primary Components</th>
                  <th className="py-3.5 px-4 text-right">Items Qty</th>
                  <th className="py-3.5 px-4 text-right">Net Value (₹)</th>
                  <th className="py-3.5 px-4 text-right">GST (₹)</th>
                  <th className="py-3.5 px-4 text-right">Total Value (₹)</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0eee9] text-[12px] text-[#1b1c19]">
                <AnimatePresence>
                  {visibleRows.map((q, idx) => {
                    const meta = getStatusMeta(q.status);
                    const initials = getInitials(q.customer_name || '');
                    const totalItems = q.items?.length ?? 0;
                    const netVal = q.taxable_amount ?? q.subtotal ?? 0;
                    const gstVal = q.gst_amount ?? 0;
                    const totalVal = q.final_total ?? 0;
                    const primaryPart = q.items?.[0];

                    return (
                      <motion.tr
                        key={q.id}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.03 }}
                        onClick={() => navigate(`/quotation/${q.id}`)}
                        className={`hover:bg-[#f5f3ee] transition-colors cursor-pointer ${
                          selectedIds.has(q.id) ? 'bg-[#f5f3ee]' : ''
                        }`}
                      >
                        {/* Checkbox */}
                        <td
                          className="py-3.5 px-4 text-center"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleRow(q.id);
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={selectedIds.has(q.id)}
                            onChange={() => toggleRow(q.id)}
                            className="w-3.5 h-3.5 rounded cursor-pointer"
                          />
                        </td>

                        {/* Quotation No */}
                        <td className="py-3.5 px-4 font-semibold text-[#01081a]">
                          <div className="flex items-center gap-1.5">
                            <span
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ backgroundColor: meta.dotColor }}
                            />
                            <span className="text-[13px]">{q.quotation_number}</span>
                          </div>
                          <span className="text-[10px] text-[#76777d] block pl-3.5 font-normal mt-0.5">
                            {q.status} · {q.gst_type || 'IGST'}
                          </span>
                        </td>

                        {/* Date */}
                        <td className="py-3.5 px-4 text-[#45474c] whitespace-nowrap">
                          {fmtDate(q.quotation_date)}
                        </td>

                        {/* Customer */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded bg-[#eae8e3] flex items-center justify-center text-[10px] font-bold text-[#45474c] shrink-0">
                              {initials}
                            </div>
                            <span className="font-semibold text-[#1b1c19] truncate max-w-[160px]">
                              {q.customer_name || 'Customer'}
                            </span>
                          </div>
                        </td>

                        {/* Primary Component */}
                        <td className="py-3.5 px-4">
                          {primaryPart ? (
                            <>
                              <div className="font-medium text-[#1b1c19] truncate max-w-[200px]">
                                {primaryPart.part_name}
                              </div>
                              <div className="text-[11px] text-[#76777d] truncate max-w-[200px]">
                                {[primaryPart.material, primaryPart.process]
                                  .filter(Boolean)
                                  .join(' · ') || 'CNC Machined'}
                              </div>
                            </>
                          ) : (
                            <span className="text-[#76777d]">—</span>
                          )}
                        </td>

                        {/* Items Qty */}
                        <td className="py-3.5 px-4 text-right font-medium text-[#1b1c19] whitespace-nowrap">
                          {totalItems > 0 ? (
                            <>
                              {totalItems}{' '}
                              <span className="text-[#76777d] text-xs">items</span>
                            </>
                          ) : (
                            '—'
                          )}
                        </td>

                        {/* Net Value */}
                        <td className="py-3.5 px-4 text-right text-[#45474c] whitespace-nowrap tabular-nums">
                          {netVal > 0 ? fmtCurrency(netVal) : '—'}
                        </td>

                        {/* GST */}
                        <td className="py-3.5 px-4 text-right text-[#76777d] whitespace-nowrap tabular-nums">
                          {gstVal > 0 ? fmtCurrency(gstVal) : '—'}
                        </td>

                        {/* Total Value */}
                        <td className="py-3.5 px-4 text-right font-semibold text-[#1b1c19] text-[14px] whitespace-nowrap tabular-nums">
                          {totalVal > 0 ? fmtCurrency(totalVal) : '—'}
                        </td>

                        {/* Status badge */}
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${meta.pillClass}`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                meta.pulse ? 'animate-pulse' : ''
                              }`}
                              style={{ backgroundColor: meta.dotColor }}
                            />
                            {meta.label}
                          </span>
                        </td>

                        {/* Actions */}
                        <td
                          className="py-3.5 px-4 text-right whitespace-nowrap"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-end gap-1.5">
                            {q.status === 'FINAL' ? (
                              <button
                                onClick={(e) => handleDownload(q, e)}
                                disabled={downloadingId === q.id}
                                className="px-2.5 py-1 bg-[#f0eee9] text-[#1b1c19] text-[11px] font-medium rounded hover:bg-[#e4e2dd] transition-colors flex items-center gap-1"
                              >
                                <Download
                                  className={`w-3.5 h-3.5 ${
                                    downloadingId === q.id ? 'animate-spin' : ''
                                  }`}
                                />
                                {downloadingId === q.id ? '...' : 'View PDF'}
                              </button>
                            ) : q.status === 'DRAFT' ? (
                              <button
                                onClick={() => navigate(`/calculation/${q.id}`)}
                                className="px-2.5 py-1 bg-[#f0eee9] text-[#1b1c19] text-[11px] font-medium rounded hover:bg-[#e4e2dd] transition-colors flex items-center gap-1"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                                Revise
                              </button>
                            ) : (
                              <button
                                onClick={() => navigate(`/quotation/${q.id}`)}
                                className="px-2.5 py-1 bg-[#B87333] text-white text-[11px] font-medium rounded hover:bg-[#A46328] transition-colors"
                              >
                                View / Dispatch
                              </button>
                            )}
                            <button className="p-1 rounded hover:bg-[#eae8e3] text-[#76777d] transition-colors">
                              <MoreVertical className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              </tbody>
            </table>
          )}
        </div>

        {/* ── PAGINATION FOOTER ─────────────────────────────────────────────── */}
        {!loading && visibleRows.length > 0 && (
          <div className="px-4 py-3 bg-[#f0eee9] flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-4">
              <span className="text-[12px] text-[#45474c]">
                Showing{' '}
                <span className="font-semibold text-[#1b1c19]">
                  {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, totalCount)}
                </span>{' '}
                of{' '}
                <span className="font-semibold text-[#1b1c19]">{totalCount}</span> quotations
              </span>
              <div className="hidden sm:flex items-center gap-1 text-[12px] text-[#45474c]">
                <span>Active Registry Value:</span>
                <span className="font-semibold text-[#1b1c19] tabular-nums text-[15px]">
                  {fmtCurrency(pipelineValue)}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || loading}
                className="px-2.5 py-1 rounded bg-white text-[#76777d] hover:text-[#1b1c19] disabled:opacity-40 text-[12px] font-medium border border-[#e4e2dd]"
              >
                &lt; Prev
              </button>
              {getPageNumbers().map((pg, i) =>
                pg === '...' ? (
                  <span key={`ellipsis-${i}`} className="px-1 text-[#76777d] text-[12px]">
                    ...
                  </span>
                ) : (
                  <button
                    key={pg}
                    onClick={() => setPage(pg as number)}
                    className={`w-7 h-7 rounded text-[12px] font-medium flex items-center justify-center transition-colors ${
                      pg === page
                        ? 'bg-[#172033] text-white shadow-sm'
                        : 'bg-white text-[#1b1c19] hover:bg-[#eae8e3] border border-[#e4e2dd]'
                    }`}
                  >
                    {pg}
                  </button>
                )
              )}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || loading}
                className="px-2.5 py-1 rounded bg-white text-[#1b1c19] hover:bg-[#eae8e3] disabled:opacity-40 text-[12px] font-medium border border-[#e4e2dd]"
              >
                Next &gt;
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── BOTTOM INSIGHTS ROW ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Panel 1: Recent Approvals */}
        <div className="bg-white p-4 rounded-lg shadow-sm flex flex-col">
          <div className="flex items-center justify-between pb-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#B87333]" />
              <span className="text-[15px] font-semibold text-[#1b1c19]">Recent Approvals</span>
            </div>
            <span className="text-[11px] text-[#76777d]">Last 48 Hrs</span>
          </div>
          <div className="space-y-2 mt-2">
            {quotations
              .filter((q) => q.status === 'FINAL')
              .slice(0, 2)
              .map((q) => (
                <div
                  key={q.id}
                  className="flex items-center justify-between p-2 rounded bg-[#f5f3ee]"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#3F7D5A] shrink-0" />
                    <div>
                      <div className="text-[12px] font-semibold text-[#1b1c19]">
                        {q.quotation_number} ({q.customer_name?.split(' ')[0]})
                      </div>
                      <div className="text-[11px] text-[#76777d]">
                        Finalized by {q.finalized_by || 'System'}
                      </div>
                    </div>
                  </div>
                  <span className="text-[12px] font-bold text-[#1b1c19] tabular-nums">
                    {fmtCurrency(q.final_total)}
                  </span>
                </div>
              ))}
            {quotations.filter((q) => q.status === 'FINAL').length === 0 && (
              <div className="text-center text-[12px] text-[#76777d] py-4">
                No recent approvals
              </div>
            )}
          </div>
          <button className="mt-3 inline-flex items-center gap-1 text-[12px] text-[#B87333] font-semibold hover:underline">
            View all {finalCount} recent approvals
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Panel 2: Tax & HSN Mapping */}
        <div className="bg-white p-4 rounded-lg shadow-sm flex flex-col">
          <div className="flex items-center justify-between pb-2">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#3F7D5A]" />
              <span className="text-[15px] font-semibold text-[#1b1c19]">
                Tax &amp; HSN Mapping
              </span>
            </div>
            <span className="text-[11px] px-2 py-0.5 rounded bg-[#3F7D5A]/10 text-[#3F7D5A] font-bold">
              100% Verified
            </span>
          </div>
          <div className="space-y-2 mt-2">
            {[
              { code: 'HSN 8483', desc: 'Transmission Shafts', gst: '18% GST Nominal' },
              { code: 'HSN 7326', desc: 'Machined Iron/Steel', gst: '18% GST Nominal' },
              { code: 'E-Way Bill', desc: 'Generation State', gst: 'Portal Synced' },
            ].map((item) => (
              <div key={item.code} className="flex justify-between items-center text-[12px]">
                <span className="text-[#45474c]">
                  {item.code} ({item.desc})
                </span>
                <span className="font-medium text-[#1b1c19]">{item.gst}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 pt-2 bg-[#f5f3ee] p-2 rounded text-[11px] text-[#76777d] flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-[#B87333] shrink-0" />
            <span>All tax slabs locked per Central Excise Act 2026 amendments.</span>
          </div>
        </div>

        {/* Panel 3: Pune Bay Capacity */}
        <div className="bg-white p-4 rounded-lg shadow-sm flex flex-col">
          <div className="flex items-center justify-between pb-2">
            <div className="flex items-center gap-2">
              <Factory className="w-4 h-4 text-[#B87333]" />
              <span className="text-[15px] font-semibold text-[#1b1c19]">Pune Bay Capacity</span>
            </div>
            <span className="text-[24px] font-bold text-[#1b1c19] tabular-nums">78.4%</span>
          </div>
          <div className="mt-2 space-y-3">
            {[
              { label: 'CNC 4-Axis Turning Cells', pct: 88, color: '#B87333' },
              { label: 'Submerged Wire-EDM Suite', pct: 62, color: '#3F7D5A' },
            ].map((item) => (
              <div key={item.label}>
                <div className="flex justify-between text-[12px] font-medium mb-1">
                  <span className="text-[#45474c]">{item.label}</span>
                  <span className="text-[#1b1c19] font-semibold">{item.pct}% Loaded</span>
                </div>
                <div className="w-full bg-[#eae8e3] h-2 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ backgroundColor: item.color }}
                    initial={{ width: 0 }}
                    animate={{ width: `${item.pct}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 pt-2 flex items-center justify-between text-[11px]">
            <span className="text-[#76777d]">Earliest slot for new quotes:</span>
            <span className="font-semibold text-[#B87333]">22 Feb 2026 (Shift 1)</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuotationHistoryPage;
