import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Search,
  Download,
  Plus,
  AlertCircle,
  Mail,
  ChevronRight,
  Eye,
  CheckCircle2,
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
  switch (status?.toUpperCase()) {
    case 'FINAL':
    case 'FINALIZED':
      return { label: 'Finalized', dotColor: '#16a34a', pillClass: 'bg-emerald-50 text-emerald-700 border border-emerald-200' };
    case 'APPROVED':
      return { label: 'Approved', dotColor: '#16a34a', pillClass: 'bg-emerald-50 text-emerald-700 border border-emerald-200' };
    case 'SENT':
      return { label: 'Sent', dotColor: '#2563EB', pillClass: 'bg-blue-50 text-blue-700 border border-blue-200' };
    case 'DRAFT':
    default:
      return { label: 'Draft', dotColor: '#d97706', pillClass: 'bg-amber-50 text-amber-700 border border-amber-200' };
  }
}

function getEmailStatusBadge(status?: string): { label: string; className: string } {
  switch (status?.toUpperCase()) {
    case 'SENT':
      return { label: 'Sent', className: 'bg-blue-50 text-blue-700 border border-blue-200' };
    case 'FAILED':
      return { label: 'Failed', className: 'bg-red-50 text-red-700 border border-red-200' };
    case 'PENDING':
      return { label: 'Pending', className: 'bg-amber-50 text-amber-700 border border-amber-200' };
    default:
      return { label: 'Not Sent', className: 'bg-slate-50 text-slate-500 border border-slate-200' };
  }
}

function getInitials(name: string): string {
  return (name || 'N/A')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0] || '')
    .join('')
    .toUpperCase();
}

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
  const [dateFilter, setDateFilter] = useState<string>('ALL');
  const [loading, setLoading] = useState<boolean>(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [sendingEmailId, setSendingEmailId] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
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

  const handleSendEmail = async (q: QuotationDTO, e: React.MouseEvent) => {
    e.stopPropagation();
    setSendingEmailId(q.id);
    setFeedbackMessage(null);
    try {
      const res = await quotationApi.sendEmail(q.id);
      setFeedbackMessage({
        text: `Quotation ${q.quotation_number} sent successfully to ${res.recipient || 'customer'}.`,
        type: 'success',
      });
      // Refresh list to update email status
      fetchQuotations();
    } catch (err: any) {
      setFeedbackMessage({
        text: `Email dispatch failed: ${err.response?.data?.detail || err.message}`,
        type: 'error',
      });
    } finally {
      setSendingEmailId(null);
    }
  };

  // Date filtering on client side for the active page
  const filteredQuotations = useMemo(() => {
    if (dateFilter === 'ALL') return quotations;

    const now = new Date();
    return quotations.filter((q) => {
      if (!q.quotation_date) return true;
      const qDate = new Date(q.quotation_date);
      const diffDays = (now.getTime() - qDate.getTime()) / (1000 * 3600 * 24);

      if (dateFilter === '30_DAYS') return diffDays <= 30;
      if (dateFilter === '90_DAYS') return diffDays <= 90;
      if (dateFilter === 'YEAR') return qDate.getFullYear() === now.getFullYear();
      return true;
    });
  }, [quotations, dateFilter]);

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const toggleRow = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const allChecked =
    filteredQuotations.length > 0 && filteredQuotations.every((q) => selectedIds.has(q.id));

  const toggleAll = () => {
    if (allChecked) setSelectedIds(new Set());
    else setSelectedIds(new Set(filteredQuotations.map((q) => q.id)));
  };

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
    <div className="w-full px-6 md:px-8 py-7 bg-[#f8fafc] min-h-screen space-y-6 pb-16">
      {/* ── PAGE HEADER ────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="flex flex-col space-y-1">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-[#2563EB] font-bold">
            <span>QUOTATIONS</span>
          </div>
          <h1 className="text-2xl md:text-[28px] leading-tight font-bold text-slate-900 tracking-tight">
            Quotation History
          </h1>
          <p className="text-sm text-slate-600 max-w-2xl">
            View, manage and download quotations created from customer purchase orders.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => navigate('/upload')}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#2563EB] text-white text-xs font-semibold rounded-lg shadow-sm hover:bg-[#1D4ED8] transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ New Purchase Order</span>
          </button>
        </div>
      </div>

      {/* ── FEEDBACK ALERT ──────────────────────────────────────────────────── */}
      {feedbackMessage && (
        <div
          className={`p-3 rounded-lg text-xs flex items-center justify-between gap-2 border ${
            feedbackMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-red-50 text-red-800 border-red-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedbackMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span>{feedbackMessage.text}</span>
          </div>
          <button
            onClick={() => setFeedbackMessage(null)}
            className="text-xs font-semibold hover:underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ── FILTER RIBBON ──────────────────────────────────────────────────── */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          {/* Search input */}
          <div className="md:col-span-6 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Search quotation #, customer, PO number..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-[#2563EB] transition-colors"
            />
          </div>

          {/* Status filter */}
          <div className="md:col-span-3 relative">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 appearance-none focus:outline-none focus:bg-white focus:border-[#2563EB] cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="FINAL">Finalized</option>
              <option value="SENT">Sent</option>
            </select>
            <ChevronRight className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none rotate-90" />
          </div>

          {/* Date range filter */}
          <div className="md:col-span-3 relative">
            <select
              value={dateFilter}
              onChange={(e) => {
                setDateFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 appearance-none focus:outline-none focus:bg-white focus:border-[#2563EB] cursor-pointer"
            >
              <option value="ALL">All Dates</option>
              <option value="30_DAYS">Last 30 Days</option>
              <option value="90_DAYS">Last 90 Days</option>
              <option value="YEAR">This Year</option>
            </select>
            <ChevronRight className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none rotate-90" />
          </div>
        </div>
      </div>

      {/* ── MAIN TABLE ─────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-14 text-center flex flex-col items-center gap-3 text-slate-500 text-xs">
              <div className="w-7 h-7 border-2 border-slate-200 border-t-[#2563EB] rounded-full animate-spin" />
              <span>Loading quotation records from server...</span>
            </div>
          ) : error ? (
            <div className="p-10 text-center space-y-3">
              <AlertCircle className="w-9 h-9 text-amber-500 mx-auto" />
              <p className="text-xs font-semibold text-amber-600">{error}</p>
              <button
                onClick={() => fetchQuotations()}
                className="px-4 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-800 hover:bg-slate-50 cursor-pointer"
              >
                Retry
              </button>
            </div>
          ) : filteredQuotations.length === 0 ? (
            <div className="p-14 text-center space-y-2">
              <FileText className="w-11 h-11 text-slate-300 mx-auto" />
              <p className="font-semibold text-slate-900 text-sm">No Quotations Found</p>
              <p className="text-xs text-slate-500">
                No records match your search or filter criteria.
              </p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 text-slate-600 text-[11px] uppercase tracking-wider font-semibold select-none border-b border-slate-200">
                  <th className="py-3 px-4 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={allChecked}
                      onChange={toggleAll}
                      className="w-3.5 h-3.5 rounded cursor-pointer accent-[#2563EB]"
                    />
                  </th>
                  <th className="py-3.5 px-4 font-semibold">Quotation No.</th>
                  <th className="py-3.5 px-4 font-semibold">Customer</th>
                  <th className="py-3.5 px-4 font-semibold">PO No.</th>
                  <th className="py-3.5 px-4 font-semibold">Quotation Date</th>
                  <th className="py-3.5 px-4 text-right font-semibold">Total Amount</th>
                  <th className="py-3.5 px-4 text-center font-semibold">Status</th>
                  <th className="py-3.5 px-4 text-center font-semibold">Email Status</th>
                  <th className="py-3.5 px-4 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-800">
                <AnimatePresence>
                  {filteredQuotations.map((q, idx) => {
                    const meta = getStatusMeta(q.status);
                    const emailBadge = getEmailStatusBadge(q.email_status);
                    const initials = getInitials(q.customer_name || '');
                    const totalVal = q.final_total ?? 0;

                    return (
                      <motion.tr
                        key={q.id}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.02 }}
                        onClick={() => navigate(`/quotation/${q.id}`)}
                        className={`hover:bg-slate-50/80 transition-colors cursor-pointer ${
                          selectedIds.has(q.id) ? 'bg-blue-50/40' : ''
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
                            className="w-3.5 h-3.5 rounded cursor-pointer accent-[#2563EB]"
                          />
                        </td>

                        {/* Quotation No */}
                        <td className="py-3.5 px-4 font-semibold text-slate-900">
                          <div className="flex items-center gap-2">
                            <span
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ backgroundColor: meta.dotColor }}
                            />
                            <span className="font-mono text-xs">{q.quotation_number}</span>
                          </div>
                        </td>

                        {/* Customer */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-600 shrink-0">
                              {initials}
                            </div>
                            <span className="font-medium text-slate-900 truncate max-w-[200px]">
                              {q.customer_name || '—'}
                            </span>
                          </div>
                        </td>

                        {/* PO No */}
                        <td className="py-3.5 px-4 font-mono text-slate-600">
                          {q.po_number || '—'}
                        </td>

                        {/* Quotation Date */}
                        <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                          {fmtDate(q.quotation_date)}
                        </td>

                        {/* Total Amount */}
                        <td className="py-3.5 px-4 text-right font-semibold text-slate-900 text-xs whitespace-nowrap tabular-nums">
                          {totalVal > 0 ? fmtCurrency(totalVal) : '—'}
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium ${meta.pillClass}`}
                          >
                            <span
                              className="w-1.5 h-1.5 rounded-full"
                              style={{ backgroundColor: meta.dotColor }}
                            />
                            {meta.label}
                          </span>
                        </td>

                        {/* Email Status */}
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${emailBadge.className}`}
                          >
                            {emailBadge.label}
                          </span>
                        </td>

                        {/* Actions */}
                        <td
                          className="py-3.5 px-4 text-right whitespace-nowrap"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-end gap-1.5">
                            {/* View */}
                            <button
                              onClick={() => navigate(`/quotation/${q.id}`)}
                              className="px-2.5 py-1 bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-medium rounded transition-colors flex items-center gap-1 cursor-pointer"
                              title="View Quotation"
                            >
                              <Eye className="w-3.5 h-3.5 text-slate-500" />
                              <span>View</span>
                            </button>

                            {/* Download PDF */}
                            <button
                              onClick={(e) => handleDownload(q, e)}
                              disabled={downloadingId === q.id}
                              className="px-2.5 py-1 bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-medium rounded transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                              title="Download PDF"
                            >
                              <Download
                                className={`w-3.5 h-3.5 text-slate-500 ${
                                  downloadingId === q.id ? 'animate-spin' : ''
                                }`}
                              />
                              <span>PDF</span>
                            </button>

                            {/* Send Email */}
                            {(q.status === 'FINAL' || q.status === 'SENT') && (
                              <button
                                onClick={(e) => handleSendEmail(q, e)}
                                disabled={sendingEmailId === q.id}
                                className="px-2.5 py-1 bg-[#2563EB] text-white hover:bg-[#1D4ED8] text-xs font-medium rounded transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                                title="Send Email to Customer"
                              >
                                <Mail
                                  className={`w-3.5 h-3.5 ${
                                    sendingEmailId === q.id ? 'animate-spin' : ''
                                  }`}
                                />
                                <span>Send</span>
                              </button>
                            )}
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
        {!loading && filteredQuotations.length > 0 && (
          <div className="px-4 py-3 bg-slate-50/80 border-t border-slate-200 flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-4">
              <span className="text-xs text-slate-600">
                Showing{' '}
                <span className="font-semibold text-slate-900">
                  {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, totalCount)}
                </span>{' '}
                of{' '}
                <span className="font-semibold text-slate-900">{totalCount}</span> quotations
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || loading}
                className="px-2.5 py-1 rounded bg-white text-slate-600 hover:text-slate-900 disabled:opacity-40 text-xs font-medium border border-slate-200 cursor-pointer"
              >
                &lt; Prev
              </button>
              {getPageNumbers().map((pg, i) =>
                pg === '...' ? (
                  <span key={`ellipsis-${i}`} className="px-1 text-slate-400 text-xs">
                    ...
                  </span>
                ) : (
                  <button
                    key={pg}
                    onClick={() => setPage(pg as number)}
                    className={`w-7 h-7 rounded text-xs font-medium flex items-center justify-center transition-colors cursor-pointer ${
                      pg === page
                        ? 'bg-[#2563EB] text-white shadow-xs font-semibold'
                        : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    {pg}
                  </button>
                )
              )}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || loading}
                className="px-2.5 py-1 rounded bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 text-xs font-medium border border-slate-200 cursor-pointer"
              >
                Next &gt;
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuotationHistoryPage;
