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
  Eye, 
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  FileCheck
} from 'lucide-react';
import { MetricCard } from '../components/ui/MetricCard';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { TabularNumber } from '../components/common/TabularNumber';
import { quotationApi, QuotationDTO } from '../api/quotationApi';

export const QuotationHistoryPage: React.FC = () => {
  const navigate = useNavigate();

  // State
  const [quotations, setQuotations] = useState<QuotationDTO[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [pageSize] = useState<number>(15);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [loading, setLoading] = useState<boolean>(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch paginated quotations from backend
  const fetchQuotations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await quotationApi.listPaginated({
        page,
        page_size: pageSize,
        search: searchQuery.trim() || undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
      });
      setQuotations(data.items || []);
      setTotalCount(data.total || 0);
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || 'Failed to load quotation history.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, searchQuery, statusFilter]);

  useEffect(() => {
    fetchQuotations();
  }, [fetchQuotations]);

  // Handle PDF Download
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

  // Compute metrics from current page
  const finalCount = quotations.filter(q => q.status === 'FINAL').length;
  const draftCount = quotations.filter(q => q.status === 'DRAFT').length;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
              Quotation History & Commercial Archive
            </h1>
            <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
              Live Database
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Authoritative corporate records of all generated quotations, official PDFs, and audit trail of finalization.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchQuotations()}
            icon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />}
          >
            Refresh
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={<Plus className="w-3.5 h-3.5 text-emerald-400" />}
            onClick={() => navigate('/upload')}
          >
            Upload PO
          </Button>
        </div>
      </div>

      {/* KPI Bento Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Quotations"
          value={`${totalCount}`}
          subtitle="All generated documents in database"
          badge={<Badge variant="info" size="sm">Indexed</Badge>}
          footer={<span className="text-[11px] text-slate-500">Server-side paginated</span>}
        />

        <MetricCard
          title="Finalized & Stored"
          value={`${finalCount}`}
          subtitle="Official immutable commercial documents"
          badge={<Badge variant="success" size="sm" dot>Immutable</Badge>}
          footer={<span className="text-[11px] text-slate-500">Persisted in Supabase Storage</span>}
        />

        <MetricCard
          title="Draft / Review"
          value={`${draftCount}`}
          subtitle="Editable commercial terms pending approval"
          badge={<Badge variant="warning" size="sm" dot>In Progress</Badge>}
          footer={<span className="text-[11px] text-slate-500">Awaiting user finalization</span>}
        />

        <MetricCard
          title="Storage Security"
          value="Private"
          subtitle="Tenant isolated storage paths"
          badge={<Badge variant="purple" size="sm">Encrypted</Badge>}
          footer={<span className="text-[11px] text-slate-500">SHA-256 integrity verified</span>}
        />
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Search by Quotation No, Customer Name, PO Number..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600"
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Status Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <span className="text-[11px] uppercase font-bold text-slate-400 mr-1">Status:</span>
            {[
              { id: 'ALL', label: 'All' },
              { id: 'FINAL', label: 'Final (Immutable)' },
              { id: 'DRAFT', label: 'Draft' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => {
                  setStatusFilter(tab.id);
                  setPage(1);
                }}
                className={`px-3 py-1 rounded font-medium transition-colors cursor-pointer whitespace-nowrap text-xs ${
                  statusFilter === tab.id
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="text-slate-500 text-xs font-mono">
            Showing {quotations.length} of {totalCount} records
          </div>
        </div>
      </div>

      {/* Main Quotation History Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-12 text-center text-slate-500 text-xs flex flex-col items-center gap-2">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span>Loading quotation records from server...</span>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-amber-600 text-xs space-y-2">
            <AlertCircle className="w-8 h-8 text-amber-500 mx-auto" />
            <p className="font-semibold">{error}</p>
            <Button variant="outline" size="sm" onClick={() => fetchQuotations()}>
              Retry
            </Button>
          </div>
        ) : quotations.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs space-y-2">
            <FileText className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="font-semibold text-slate-700">No Quotations Found</p>
            <p className="text-slate-500">No quotation records match your search or filter criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold text-[10px] tracking-wider">
                  <th className="py-3 px-4">Quotation No</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">PO No</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Total</th>
                  <th className="py-3 px-4">Finalized At</th>
                  <th className="py-3 px-4">Finalized By</th>
                  <th className="py-3 px-4 text-center">Email</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {quotations.map((q) => {
                  const isFinal = q.status === 'FINAL';
                  return (
                    <tr
                      key={q.id}
                      onClick={() => navigate(`/quotation/${q.id}`)}
                      className="cursor-pointer transition-colors hover:bg-slate-50/80"
                    >
                      {/* Quotation No */}
                      <td className="py-3.5 px-4 font-mono font-bold text-blue-700">
                        <div className="flex items-center gap-1.5">
                          <FileCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <span>{q.quotation_number}</span>
                        </div>
                      </td>

                      {/* Date */}
                      <td className="py-3.5 px-4 text-slate-600 font-mono">
                        {new Date(q.quotation_date).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>

                      {/* Customer */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 truncate max-w-[180px]">
                          {q.customer_name || 'Customer'}
                        </div>
                        {q.customer_gstin && (
                          <div className="text-[10px] font-mono text-slate-400">{q.customer_gstin}</div>
                        )}
                      </td>

                      {/* PO No */}
                      <td className="py-3.5 px-4 font-mono text-slate-800">
                        <div className="font-semibold">{q.po_number || '—'}</div>
                        {q.po_date && (
                          <div className="text-[10px] text-slate-400">
                            {new Date(q.po_date).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <Badge
                          variant={isFinal ? 'success' : 'slate'}
                          size="sm"
                          dot
                        >
                          {q.status}
                        </Badge>
                      </td>

                      {/* Total */}
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900 text-right">
                        <TabularNumber value={q.final_total} />
                      </td>

                      {/* Finalized At */}
                      <td className="py-3.5 px-4 text-[11px] text-slate-600 font-mono">
                        {q.finalized_at
                          ? new Date(q.finalized_at).toLocaleString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : '—'}
                      </td>

                      {/* Finalized By */}
                      <td className="py-3.5 px-4 text-[11px] text-slate-600 truncate max-w-[140px]">
                        {q.finalized_by || '—'}
                      </td>

                      {/* Email Status */}
                      <td className="py-3.5 px-4 text-center">
                        {q.email_status === 'SENT' ? (
                          <span className="inline-flex items-center gap-1 font-mono text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                            Sent
                          </span>
                        ) : q.email_status === 'FAILED' ? (
                          <span className="inline-flex items-center gap-1 font-mono text-[10px] font-semibold px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200">
                            <AlertCircle className="w-3 h-3 text-rose-500" />
                            Failed
                          </span>
                        ) : q.email_status === 'SENDING' ? (
                          <span className="inline-flex items-center gap-1 font-mono text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                            <Clock className="w-3 h-3 text-blue-500 animate-spin" />
                            Sending
                          </span>
                        ) : (
                          <span className="text-slate-400 font-mono text-[10px]">Not Sent</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-slate-700 hover:bg-slate-100 px-2 py-1 h-7 text-xs"
                            onClick={() => navigate(`/quotation/${q.id}`)}
                            icon={<Eye className="w-3.5 h-3.5" />}
                          >
                            View
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-blue-700 border-blue-200 hover:bg-blue-50 px-2 py-1 h-7 text-xs font-semibold"
                            onClick={(e) => handleDownload(q, e)}
                            disabled={downloadingId === q.id}
                            icon={<Download className={`w-3.5 h-3.5 ${downloadingId === q.id ? 'animate-spin' : ''}`} />}
                          >
                            {downloadingId === q.id ? '...' : 'Download'}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Server Pagination Footer */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-200 text-xs flex flex-col sm:flex-row items-center justify-between gap-3 text-slate-600">
          <span className="font-mono text-[11px]">
            Page <strong>{page}</strong> of <strong>{totalPages}</strong> (Total {totalCount} quotations)
          </span>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
              icon={<ChevronLeft className="w-3.5 h-3.5" />}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || loading}
              icon={<ChevronRight className="w-3.5 h-3.5" />}
              iconPosition="right"
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuotationHistoryPage;
