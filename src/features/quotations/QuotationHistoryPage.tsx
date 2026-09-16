import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FileText, 
  Search, 
  Filter, 
  Download, 
  Plus, 
  Calendar, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  ExternalLink, 
  Copy, 
  Check, 
  MessageSquare, 
  Mail, 
  ShieldCheck,
  ChevronRight,
  Maximize2,
  Pin
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { MetricCard } from '../../components/ui/MetricCard';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { TabularNumber } from '../../components/common/TabularNumber';
import { mockQuotationsList } from '../../services/mockData';
import { QuotationDocument, QuotationStatus } from '../../types/quotation';

export const QuotationHistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [customerFilter, setCustomerFilter] = useState<string>('ALL');
  const [selectedQuote, setSelectedQuote] = useState<QuotationDocument>(mockQuotationsList[0]);
  const [selectedRows, setSelectedRows] = useState<string[]>([mockQuotationsList[0].id]);

  const filteredQuotes = mockQuotationsList.filter(q => {
    const matchesSearch = 
      q.quotationNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.poReference.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchesSearch) return false;

    if (selectedStatus === 'SENT' && q.status !== 'SENT') return false;
    if (selectedStatus === 'ACCEPTED' && q.status !== 'ACCEPTED') return false;
    if (selectedStatus === 'DRAFT' && q.status !== 'DRAFT' && q.status !== 'NEEDS_REVIEW') return false;
    if (selectedStatus === 'REVISION' && q.status !== 'REVISION_ISSUED') return false;

    if (customerFilter !== 'ALL' && !q.customer.name.includes(customerFilter)) return false;

    return true;
  });

  const toggleRowSelect = (id: string, q: QuotationDocument) => {
    setSelectedQuote(q);
    if (selectedRows.includes(id)) {
      setSelectedRows(selectedRows.filter(r => r !== id));
    } else {
      setSelectedRows([...selectedRows, id]);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header Bar (Matches Image 2) */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
              Quotation History & Commercial Archive
            </h1>
            <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
              FY 24-25 Q2
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Search, audit, and track lifecycle status of all generated customer quotations, PO references, revision versions, and dispatch receipts.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => alert("Bulk dispatch / approval modal")}
          >
            Bulk Actions
          </Button>
          <Button
            variant="outline"
            size="sm"
            icon={<Download className="w-3.5 h-3.5" />}
            onClick={() => alert("Exporting full quotation archive to Excel & Tally CSV")}
          >
            Export Archive (Excel / Tally CSV)
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

      {/* 4 Bento KPI Metric Cards (Matches Image 2) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Quoted (FY 24-25)"
          value="₹3.84 Cr"
          subtitle="Across 342 quotations"
          badge={<Badge variant="success" size="sm">+18.4%</Badge>}
          footer={
            <div className="flex justify-between w-full text-slate-500 text-[11px]">
              <span>Baseline: ₹3.24 Cr</span>
              <span>Annual Cap: <strong>₹5.0 Cr</strong></span>
            </div>
          }
        />

        <MetricCard
          title="Pending / In-Review"
          value="7 Quotes"
          subtitle="₹24.8 Lakhs pipeline awaiting sign-off"
          badge={<Badge variant="warning" size="sm" dot>Action Req.</Badge>}
          footer={<span className="text-[11px] text-slate-500">4 Customer PO • 3 Margin Approval</span>}
        />

        <MetricCard
          title="Accepted & Won"
          value="218 Quotes"
          subtitle="₹2.45 Cr realized order value"
          badge={<Badge variant="success" size="sm">64% Win Rate</Badge>}
          footer={
            <div className="flex justify-between w-full text-slate-500 text-[11px]">
              <span>Top: Mahindra Agro</span>
              <span className="font-semibold text-emerald-700">92% Dispatch Sync</span>
            </div>
          }
        />

        <MetricCard
          title="Average TAT"
          value="14 mins"
          subtitle="PO upload to final WhatsApp dispatch"
          badge={<Badge variant="info" size="sm">95% Faster</Badge>}
          footer={<span className="text-[11px] text-slate-500">Legacy manual time: 4.5 hrs</span>}
        />
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Quotation No, Customer, PO Reference..."
            className="w-full pl-9 pr-12 py-2 bg-slate-50 border border-slate-200 rounded text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono text-slate-400 bg-white border border-slate-200 px-1.5 py-0.5 rounded">
            ⌘ + K
          </span>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Status Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <span className="text-[11px] uppercase font-bold text-slate-400 mr-1">Status:</span>
            {[
              { id: 'ALL', label: 'All (342)' },
              { id: 'SENT', label: 'Sent / WhatsApp (142)' },
              { id: 'ACCEPTED', label: 'Accepted / Won (218)' },
              { id: 'DRAFT', label: 'Draft / Review (18)' },
              { id: 'REVISION', label: 'Revision Issued (24)' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setSelectedStatus(tab.id)}
                className={`px-2.5 py-1 rounded font-medium transition-colors cursor-pointer whitespace-nowrap text-xs ${
                  selectedStatus === tab.id
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Secondary Filters */}
          <div className="flex items-center gap-2">
            <select
              value={customerFilter}
              onChange={(e) => setCustomerFilter(e.target.value)}
              className="px-2.5 py-1 border border-slate-200 rounded bg-slate-50 text-xs font-medium text-slate-700"
            >
              <option value="ALL">All Customers (Mahindra, Tata, L&T...)</option>
              <option value="Mahindra">Mahindra Precision Agro</option>
              <option value="Tata">Tata Motors Commercial</option>
              <option value="Larsen">Larsen & Toubro Heavy</option>
              <option value="Godrej">Godrej Aerospace</option>
            </select>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchQuery('');
                setSelectedStatus('ALL');
                setCustomerFilter('ALL');
              }}
            >
              Clear Filters
            </Button>
          </div>
        </div>
      </div>

      {/* Main Split Layout: Table (7 Cols) + Inspection Drawer (5 Cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Table */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
          <div className="p-3 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between text-xs">
            <span className="font-bold text-slate-900">Active Archive View</span>
            <span className="text-[11px] font-mono text-slate-500">
              Showing {filteredQuotes.length} matched quotations
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold text-[10px] tracking-wider">
                  <th className="py-2.5 px-3 w-8">
                    <input type="checkbox" className="rounded text-blue-600 focus:ring-0" />
                  </th>
                  <th className="py-2.5 px-3">Quotation ID & Ver</th>
                  <th className="py-2.5 px-3">Customer & GSTIN</th>
                  <th className="py-2.5 px-3">PO Ref & Date</th>
                  <th className="py-2.5 px-3">Components</th>
                  <th className="py-2.5 px-3">Value (Incl. GST)</th>
                  <th className="py-2.5 px-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredQuotes.map((q) => {
                  const isSelected = selectedQuote.id === q.id;

                  return (
                    <tr
                      key={q.id}
                      onClick={() => setSelectedQuote(q)}
                      className={`cursor-pointer transition-colors ${
                        isSelected ? 'bg-blue-50/60 font-medium' : 'hover:bg-slate-50/70'
                      }`}
                    >
                      <td className="py-3 px-3">
                        <input
                          type="checkbox"
                          checked={selectedRows.includes(q.id)}
                          onChange={() => toggleRowSelect(q.id, q)}
                          onClick={(e) => e.stopPropagation()}
                          className="rounded text-blue-600 focus:ring-0"
                        />
                      </td>

                      <td className="py-3 px-3 font-mono">
                        <div className="flex items-center gap-1.5 font-bold text-blue-700">
                          <span>{q.quotationNumber}</span>
                          <span className="text-[10px] font-normal text-slate-500">{q.version}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">PDF {q.pdfFileSizeKb} KB</div>
                      </td>

                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900 truncate max-w-[140px]">{q.customer.name}</div>
                        <div className="text-[10px] font-mono text-slate-400">{q.customer.gstin}</div>
                      </td>

                      <td className="py-3 px-3 font-mono">
                        <div className="font-bold text-slate-800">{q.poReference}</div>
                        <div className="text-[10px] text-slate-400">{q.poDate}</div>
                      </td>

                      <td className="py-3 px-3 text-[11px] text-slate-600">
                        {q.itemCostings.length || 3} Items
                      </td>

                      <td className="py-3 px-3 font-mono font-bold text-slate-900">
                        <TabularNumber value={q.calculation.grandTotal} />
                        <div className="text-[10px] text-slate-400 font-normal">
                          Ex: <TabularNumber value={q.calculation.taxableValue} />
                        </div>
                      </td>

                      <td className="py-3 px-3 text-right">
                        <Badge
                          variant={
                            q.status === 'SENT' ? 'info' :
                            q.status === 'ACCEPTED' ? 'success' :
                            q.status === 'READY' ? 'purple' :
                            q.status === 'REVISION_ISSUED' ? 'warning' : 'slate'
                          }
                          size="sm"
                          dot
                        >
                          {q.status.replace('_', ' ')}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="p-3 bg-slate-50 border-t border-slate-200 text-xs flex items-center justify-between text-slate-500">
            <span>Showing 1 - {filteredQuotes.length} of 342 quotations</span>
            <span className="font-mono text-[11px] text-emerald-700 font-medium">
              Tally Prime & SAP ECC sync live
            </span>
          </div>
        </div>

        {/* Right: Inspection Preview Drawer (Matches Image 2 right column) */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4 sticky top-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-slate-900">Inspection Preview</span>
                <Badge variant="success" size="sm">WON</Badge>
              </div>
              <div className="text-xs font-mono text-slate-500 mt-0.5">
                Quotation Reference: <strong className="text-slate-800">{selectedQuote.quotationNumber} {selectedQuote.version}</strong>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button className="p-1 rounded text-slate-400 hover:text-slate-700">
                <Pin className="w-3.5 h-3.5" />
              </button>
              <button 
                onClick={() => navigate(`/quotation/${selectedQuote.id}`)}
                className="p-1 rounded text-slate-400 hover:text-slate-700"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Recipient & Delivery Channel */}
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-1">
            <div className="text-[10px] uppercase font-bold text-slate-400">Recipient & Delivery Channel</div>
            <div className="font-bold text-slate-900">{selectedQuote.customer.name}</div>
            <div className="text-slate-600 flex items-center gap-1.5">
              <MessageSquare className="w-3 h-3 text-emerald-600" />
              <span>WhatsApp to <strong>{selectedQuote.primaryContactPerson}</strong> ({selectedQuote.primaryContactPhone})</span>
            </div>
            <div className="text-slate-500 font-mono text-[11px] flex items-center gap-1.5">
              <Mail className="w-3 h-3 text-blue-600" />
              <span>{selectedQuote.primaryContactEmail}</span>
            </div>
          </div>

          {/* Bill of Materials Summary */}
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between font-bold text-slate-900 text-[11px] uppercase tracking-wider">
              <span>Bill of Materials (3 Items)</span>
              <span className="font-mono text-slate-400">HSN: 841391</span>
            </div>

            <div className="p-2.5 rounded bg-slate-50 border border-slate-200 font-mono text-[11px] space-y-1">
              <div className="flex justify-between">
                <span>1. Cast Iron Pump Casing (CI-25)</span>
                <strong className="text-slate-900">₹41,000</strong>
              </div>
              <div className="text-[10px] text-slate-400">Qty: 50 Nos @ ₹820/unit</div>

              <div className="flex justify-between pt-1 border-t border-slate-200">
                <span>2. CNC Turned Shaft (EN8 Grade)</span>
                <strong className="text-slate-900">₹28,000</strong>
              </div>
              <div className="text-[10px] text-slate-400">Qty: 50 Nos @ ₹560/unit</div>

              <div className="flex justify-between pt-1 border-t border-slate-200">
                <span>3. Precision Cover Plate (MS-4mm)</span>
                <strong className="text-slate-900">₹12,788</strong>
              </div>
              <div className="text-[10px] text-slate-400">Qty: 50 Nos @ ₹255.76/unit</div>
            </div>
          </div>

          {/* Commercial Ledger Breakdown */}
          <div className="space-y-1 text-xs font-mono">
            <div className="flex justify-between text-slate-600 py-0.5">
              <span>Raw Material Cost:</span>
              <span>₹45,000</span>
            </div>
            <div className="flex justify-between text-slate-600 py-0.5">
              <span>Machining & Process:</span>
              <span>₹18,500</span>
            </div>
            <div className="flex justify-between text-slate-600 py-0.5">
              <span>Factory Overhead (12%):</span>
              <span>₹7,620</span>
            </div>
            <div className="flex justify-between text-slate-600 py-0.5">
              <span>Commercial Margin (15%):</span>
              <span>₹10,668</span>
            </div>
            <div className="flex justify-between font-bold text-slate-900 py-0.5 border-t border-slate-200">
              <span>Taxable Amount:</span>
              <span>₹81,788</span>
            </div>
            <div className="flex justify-between text-slate-600 py-0.5">
              <span>CGST (9%) + SGST (9%):</span>
              <span>₹14,722</span>
            </div>

            <div className="flex justify-between font-bold text-sm bg-slate-900 text-white p-2.5 rounded mt-1">
              <span>Total Quoted Value:</span>
              <span className="text-emerald-400">₹96,510</span>
            </div>
          </div>

          {/* Digital Audit Lifecycle */}
          <div className="space-y-2 pt-2 border-t border-slate-200 text-xs">
            <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase">
              <span>Digital Audit Lifecycle</span>
              <span className="text-emerald-700">ALL CHECKS PASSED</span>
            </div>

            <div className="space-y-2 text-[11px]">
              <div className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 mt-1 shrink-0" />
                <div>
                  <div className="font-bold text-slate-900">PO Uploaded & OCR Parsed</div>
                  <div className="text-[10px] text-slate-500">18 Aug, 10:14 AM by R. Deshmukh (Production)</div>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 mt-1 shrink-0" />
                <div>
                  <div className="font-bold text-slate-900">Automated Costing & HSN Verification</div>
                  <div className="text-[10px] text-slate-500">18 Aug, 10:19 AM • AI Model v4.2 verified 100%</div>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 mt-1 shrink-0" />
                <div>
                  <div className="font-bold text-slate-900">Margin Approved by Plant Manager</div>
                  <div className="text-[10px] text-slate-500">18 Aug, 10:24 AM • Signed digitally (Token #910)</div>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500 mt-1 shrink-0" />
                <div>
                  <div className="font-bold text-slate-900">Dispatched via WhatsApp & Email</div>
                  <div className="text-[10px] text-slate-500">18 Aug, 10:28 AM • Delivered & Read</div>
                </div>
              </div>
            </div>
          </div>

          {/* Drawer Actions */}
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate(`/quotation/${selectedQuote.id}`)}
              icon={<FileText className="w-3.5 h-3.5" />}
            >
              Open PDF
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/calculation/qt-089')}
              icon={<Copy className="w-3.5 h-3.5" />}
            >
              Clone / Revise
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
