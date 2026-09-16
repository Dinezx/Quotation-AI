import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  Printer, 
  Download, 
  Send, 
  CheckCircle2, 
  Share2, 
  Mail, 
  MessageSquare, 
  ShieldCheck, 
  FileText, 
  ArrowLeft,
  Building2,
  Phone,
  Clock,
  ExternalLink,
  Copy,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { WorkflowStepper } from '../../components/layout/WorkflowStepper';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { TabularNumber } from '../../components/common/TabularNumber';
import { quotationService } from '../../services/quotationService';

export const QuotationDispatchPage: React.FC = () => {
  const navigate = useNavigate();
  const { quoteId } = useParams<{ quoteId: string }>();
  const [quote, setQuote] = useState(quotationService.getQuotationById(quoteId || 'qt-089') || quotationService.getAllQuotations()[0]);

  // Dispatch state
  const [whatsAppRecipient, setWhatsAppRecipient] = useState('+91 98224 81902');
  const [recipientName, setRecipientName] = useState('Vikram Patil (Mahindra Agro)');
  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState(false);
  const [whatsAppSent, setWhatsAppSent] = useState(false);

  const [emailTo, setEmailTo] = useState('procurement.agro@mahindra.com');
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleSendWhatsApp = () => {
    setIsSendingWhatsApp(true);
    setTimeout(() => {
      setIsSendingWhatsApp(false);
      setWhatsAppSent(true);
      quotationService.recordDispatch(quote.id, 'WhatsApp', whatsAppRecipient);
      setQuote({ ...quotationService.getQuotationById(quote.id)! });
      showToast(`Engineering quotation dispatched to WhatsApp: ${whatsAppRecipient}`);
    }, 1200);
  };

  const handleSendEmail = () => {
    setIsSendingEmail(true);
    setTimeout(() => {
      setIsSendingEmail(false);
      setEmailSent(true);
      quotationService.recordDispatch(quote.id, 'Email', emailTo);
      setQuote({ ...quotationService.getQuotationById(quote.id)! });
      showToast(`Official PDF package emailed to: ${emailTo}`);
    }, 1000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-full flex flex-col bg-[#f8fafc]">
      {/* 6-Step Workflow Stepper: Step 5 & 6 Active */}
      <WorkflowStepper currentStep={6} />

      {/* Toast Notification */}
      <AnimatePresence>
        {toastMsg && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-16 right-8 z-50 bg-slate-950 text-white text-xs font-medium py-2.5 px-4 rounded-lg shadow-xl border border-slate-700 flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{toastMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="p-4 md:p-8 max-w-7xl mx-auto w-full space-y-6 flex-1 pb-24">
        {/* Document Control Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/calculation/qt-089')}
              icon={<ArrowLeft className="w-3.5 h-3.5" />}
            >
              Back to Calculation
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-sm text-slate-900">{quote.quotationNumber}</span>
                <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200">
                  {quote.version}
                </span>
                <Badge variant={quote.status === 'SENT' ? 'info' : 'success'} size="sm" dot>
                  {quote.status}
                </Badge>
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Customer Ref: <strong className="font-mono text-slate-700">{quote.poReference}</strong> • Valid until {quote.validUntil}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              icon={<Printer className="w-3.5 h-3.5" />}
            >
              Print / Save PDF
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleSendWhatsApp}
              loading={isSendingWhatsApp}
              icon={<MessageSquare className="w-3.5 h-3.5 text-emerald-300" />}
            >
              1-Click WhatsApp Send
            </Button>
          </div>
        </div>

        {/* 2-Column Layout: Left = Realistic A4 Document, Right = Dispatch Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left: Rendered A4 Engineering Quotation Sheet (7 Cols) */}
          <div className="lg:col-span-7 overflow-hidden">
            <div 
              id="printable-quotation"
              className="bg-white border border-slate-300 rounded-lg p-6 md:p-8 shadow-xl space-y-6 text-slate-900 text-xs font-sans print:border-none print:shadow-none print:p-0"
            >
              {/* Formal Letterhead */}
              <div className="border-b-2 border-slate-900 pb-4">
                <div className="flex justify-between items-start gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded bg-slate-950 text-white font-bold flex items-center justify-center font-mono text-sm shrink-0">
                      BP
                    </div>
                    <div>
                      <h2 className="text-base font-bold tracking-tight uppercase text-slate-950">
                        Bharat Precision Engineering Pvt Ltd
                      </h2>
                      <div className="text-[10px] text-slate-500 font-medium">
                        Heavy Fabrication, CNC Machining & Automotive Tooling
                      </div>
                      <div className="text-[10px] text-slate-600 mt-1 leading-relaxed">
                        Plot No. 42/A, MIDC Industrial Area, Phase-II, Bhosari, Pune 411026, Maharashtra, India<br />
                        Email: sales@bharatprecision.co.in | Phone: +91 20 2712 9040
                      </div>
                    </div>
                  </div>

                  <div className="text-right text-[10px] font-mono shrink-0 space-y-0.5">
                    <div className="font-bold text-slate-900">GSTIN: 27AABCB2018Q1Z2</div>
                    <div className="text-slate-500">PAN: AABCB2018Q</div>
                    <div className="text-slate-500">CIN: U29299PN2018PTC154210</div>
                    <div className="text-emerald-700 font-semibold">ISO 9001:2015 & IATF 16949 Certified</div>
                  </div>
                </div>
              </div>

              {/* Document Title Banner */}
              <div className="bg-slate-950 text-white py-1.5 px-3 rounded flex justify-between items-center text-xs">
                <span className="font-bold tracking-wider uppercase">FORMAL COMMERCIAL QUOTATION</span>
                <span className="font-mono text-[11px] text-slate-300">GST RULE 46 COMPLIANT</span>
              </div>

              {/* Reference Metadata Grid */}
              <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-3 rounded border border-slate-200">
                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">Quotation Addressed To:</div>
                  <div className="font-bold text-slate-900">M/s. Mahindra Precision Agro Pvt Ltd</div>
                  <div className="text-slate-600 text-[11px] mt-0.5">
                    Plant 4, MIDC Butibori Industrial Zone, Nagpur - 441108, Maharashtra<br />
                    Attn: Mr. Vikram Patil (Head of Sourcing & Procurement)<br />
                    <span className="font-mono font-semibold">Buyer GSTIN: 27AAACM1234F1Z5</span>
                  </div>
                </div>

                <div className="text-right space-y-1 font-mono text-[11px]">
                  <div>Quote Ref: <strong className="text-slate-900">BPE/QT/2024-25/090</strong></div>
                  <div>Date of Issue: <strong className="text-slate-900">16 Sep 2026</strong></div>
                  <div>Valid Until: <strong className="text-slate-900">15 Oct 2026</strong></div>
                  <div>Customer RFQ Ref: <strong className="text-slate-900">RFQ-MA-2024-8849</strong></div>
                  <div>PO Reference: <strong className="text-slate-900">PO-2026-441</strong></div>
                </div>
              </div>

              {/* Commercial BOQ Table */}
              <div>
                <table className="w-full text-left text-xs border border-slate-300">
                  <thead className="bg-slate-100 border-b border-slate-300 text-slate-700 font-semibold uppercase text-[10px]">
                    <tr>
                      <th className="p-2 border-r border-slate-300 w-8">Sr.</th>
                      <th className="p-2 border-r border-slate-300">Item Description & Specification</th>
                      <th className="p-2 border-r border-slate-300 text-center">HSN Code</th>
                      <th className="p-2 border-r border-slate-300 text-center">Material</th>
                      <th className="p-2 border-r border-slate-300 text-center">Qty / UOM</th>
                      <th className="p-2 border-r border-slate-300 text-right">Unit Rate (₹)</th>
                      <th className="p-2 text-right">Total Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    <tr>
                      <td className="p-2 border-r border-slate-300 font-mono text-center">01</td>
                      <td className="p-2 border-r border-slate-300">
                        <div className="font-bold text-slate-900">High-Pressure Pump Casing (Machined)</div>
                        <div className="text-[10px] text-slate-500 font-mono">Drg No: BPE-PC-402 Rev 03 • Hydro tested 25 Bar</div>
                      </td>
                      <td className="p-2 border-r border-slate-300 font-mono text-center text-slate-600">84139190</td>
                      <td className="p-2 border-r border-slate-300 font-mono text-center">CI Gr.2</td>
                      <td className="p-2 border-r border-slate-300 font-mono text-center font-bold">10 Nos</td>
                      <td className="p-2 border-r border-slate-300 font-mono text-right">₹2,688.00</td>
                      <td className="p-2 font-mono text-right font-bold">₹26,880.00</td>
                    </tr>
                    <tr>
                      <td className="p-2 border-r border-slate-300 font-mono text-center">02</td>
                      <td className="p-2 border-r border-slate-300">
                        <div className="font-bold text-slate-900">CNC Turned Precision Drive Shaft</div>
                        <div className="text-[10px] text-slate-500 font-mono">Drg No: MA-SFT-884-D • Induction Hardened 45-50 HRC</div>
                      </td>
                      <td className="p-2 border-r border-slate-300 font-mono text-center text-slate-600">84831099</td>
                      <td className="p-2 border-r border-slate-300 font-mono text-center">EN8D</td>
                      <td className="p-2 border-r border-slate-300 font-mono text-center font-bold">5 Nos</td>
                      <td className="p-2 border-r border-slate-300 font-mono text-right">₹3,400.00</td>
                      <td className="p-2 font-mono text-right font-bold">₹17,000.00</td>
                    </tr>
                    <tr>
                      <td className="p-2 border-r border-slate-300 font-mono text-center">03</td>
                      <td className="p-2 border-r border-slate-300">
                        <div className="font-bold text-slate-900">Precision Flanged Cover Plate (Laser Cut)</div>
                        <div className="text-[10px] text-slate-500 font-mono">Drg No: BPE-CP-101 • Surface Zinc Plated (8 Microns)</div>
                      </td>
                      <td className="p-2 border-r border-slate-300 font-mono text-center text-slate-600">73269099</td>
                      <td className="p-2 border-r border-slate-300 font-mono text-center">MS 2062</td>
                      <td className="p-2 border-r border-slate-300 font-mono text-center font-bold">20 Nos</td>
                      <td className="p-2 border-r border-slate-300 font-mono text-right">₹1,025.00</td>
                      <td className="p-2 font-mono text-right font-bold">₹20,500.00</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Financial Breakdown & Commercial Clauses */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                {/* Bank Details & Commercial Terms */}
                <div className="space-y-2 text-[11px] text-slate-600">
                  <div className="p-3 bg-slate-50 rounded border border-slate-200">
                    <div className="font-bold text-slate-900 uppercase text-[10px] mb-1">Bank RTGS / NEFT Settlement:</div>
                    <div className="font-mono text-[11px] space-y-0.5">
                      <div>Bank: State Bank of India • MIDC Bhosari Branch</div>
                      <div>A/C No: <strong>38920194821</strong> (Current Account)</div>
                      <div>IFSC: <strong>SBIN0004128</strong> | UPI: bpe.pune@sbi</div>
                    </div>
                  </div>

                  <div className="text-[10px] space-y-1 text-slate-500">
                    <div>1. Delivery: 14 to 21 Working Days from PO clearance.</div>
                    <div>2. Payment: 30 Days net from date of invoice / Dispatch.</div>
                    <div>3. Freight: Ex-Works Bhosari / FOB Chakan.</div>
                    <div>4. Warranty: 12 Months from dispatch against casting defects.</div>
                  </div>
                </div>

                {/* Accounting Totals Ledger */}
                <div className="space-y-1.5 text-xs font-mono">
                  <div className="flex justify-between py-0.5 border-b border-slate-200">
                    <span className="text-slate-600 font-sans">Base Material & Machining:</span>
                    <span className="font-semibold text-slate-900">₹63,500.00</span>
                  </div>
                  <div className="flex justify-between py-0.5 border-b border-slate-200">
                    <span className="text-slate-600 font-sans">Shopfloor Overhead (12%):</span>
                    <span className="font-semibold text-slate-900">₹7,620.00</span>
                  </div>
                  <div className="flex justify-between py-0.5 border-b border-slate-200">
                    <span className="text-slate-600 font-sans">Tooling & Engineering (15%):</span>
                    <span className="font-semibold text-slate-900">₹10,668.00</span>
                  </div>
                  <div className="flex justify-between py-0.5 font-bold text-slate-900 border-b border-slate-300">
                    <span className="font-sans">Taxable Assessable Amount:</span>
                    <span>₹81,788.00</span>
                  </div>
                  <div className="flex justify-between py-0.5 text-slate-600">
                    <span className="font-sans">CGST @ 9.0%:</span>
                    <span>₹7,361.00</span>
                  </div>
                  <div className="flex justify-between py-0.5 text-slate-600 border-b border-slate-200">
                    <span className="font-sans">SGST @ 9.0%:</span>
                    <span>₹7,361.00</span>
                  </div>

                  <div className="flex justify-between py-2 font-bold text-sm bg-slate-900 text-white px-3 rounded">
                    <span className="font-sans">GRAND TOTAL:</span>
                    <span className="text-emerald-400">₹96,510.00</span>
                  </div>

                  <div className="text-[10px] text-slate-500 font-sans italic pt-1">
                    Amount Chargeable in Words: <strong>Indian Rupee Ninety-Six Thousand Five Hundred and Ten Only</strong>
                  </div>
                </div>
              </div>

              {/* Digital Signatory Stamp Block */}
              <div className="pt-4 border-t border-slate-200 flex justify-between items-end">
                <div className="text-[10px] text-slate-400">
                  Digitally generated & authenticated via Quotation AI v4.8<br />
                  Cryptographic Token: #BPE-AUTH-9820-910
                </div>

                <div className="text-right">
                  <div className="text-emerald-700 font-mono text-[10px] font-semibold flex items-center justify-end gap-1 mb-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    DIGITALLY SIGNED & VERIFIED
                  </div>
                  <div className="font-bold text-xs text-slate-900">Rajesh Sharma</div>
                  <div className="text-[10px] text-slate-500">Plant Head & Director of Engineering</div>
                  <div className="text-[10px] text-slate-400">Bharat Precision Engineering Pvt Ltd</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Multi-Channel Dispatch Actions & Audit (5 Cols) */}
          <div className="lg:col-span-5 space-y-4">
            {/* Card 1: WhatsApp Instant Dispatch Card */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-xs text-slate-900">WhatsApp Instant Dispatch</h3>
                    <div className="text-[10px] text-slate-400">Directly ping buyer procurement team</div>
                  </div>
                </div>
                {whatsAppSent && (
                  <span className="text-[10px] font-mono text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                    <Check className="w-3 h-3" /> SENT
                  </span>
                )}
              </div>

              <div className="space-y-2 text-xs">
                <div>
                  <label className="text-[10px] font-semibold uppercase text-slate-500 block mb-1">Recipient</label>
                  <input
                    type="text"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-semibold uppercase text-slate-500 block mb-1">Phone Number (with Country Code)</label>
                  <input
                    type="text"
                    value={whatsAppRecipient}
                    onChange={(e) => setWhatsAppRecipient(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded font-mono text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-600"
                  />
                </div>

                {/* WhatsApp Message Preview Bubble */}
                <div className="p-3 bg-[#e5ddd5] rounded-lg text-[11px] font-sans text-slate-900 space-y-2 border border-[#d1c7bc]">
                  <div className="bg-white p-2.5 rounded shadow-2xs space-y-1.5">
                    <div className="font-bold text-emerald-800">
                      *Bharat Precision Engineering Pvt Ltd*
                    </div>
                    <div>
                      Dear Vikram ji, please find the commercial engineering quotation for your Purchase Order *PO-2026-441* (Pump Casing, Shaft & Cover Plates).
                    </div>
                    <div className="font-mono text-[10px] bg-slate-50 p-1.5 rounded border border-slate-200">
                      <div>Quotation Ref: *QT-2026-089 v1.0*</div>
                      <div>Total Value: *₹96,510 (Incl. 18% GST)*</div>
                      <div>Lead Time: *14 Business Days*</div>
                    </div>
                    {/* Attachment Card */}
                    <div className="flex items-center gap-2 p-1.5 bg-slate-100 rounded border border-slate-200">
                      <div className="w-6 h-6 rounded bg-rose-600 text-white flex items-center justify-center font-bold text-[9px]">
                        PDF
                      </div>
                      <div className="flex-1 truncate">
                        <div className="font-semibold text-[10px] truncate">BPE_QT_2024-25_090.pdf</div>
                        <div className="text-[9px] text-slate-400">248 KB</div>
                      </div>
                    </div>
                    <div className="text-right text-[9px] text-slate-400">
                      10:28 AM
                    </div>
                  </div>
                </div>

                <Button
                  variant="secondary"
                  size="md"
                  className="w-full bg-emerald-600 hover:bg-emerald-700 border-emerald-600 text-white"
                  onClick={handleSendWhatsApp}
                  loading={isSendingWhatsApp}
                  icon={<Send className="w-3.5 h-3.5" />}
                >
                  Send Quotation via WhatsApp
                </Button>
              </div>
            </div>

            {/* Card 2: Official Email & File Export */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-xs text-slate-900">Official Email Package</h3>
                  <div className="text-[10px] text-slate-400">Send ISO / GST compliant email package</div>
                </div>
              </div>

              <div className="space-y-2 text-xs">
                <div>
                  <label className="text-[10px] font-semibold uppercase text-slate-500 block mb-1">To Email Address</label>
                  <input
                    type="email"
                    value={emailTo}
                    onChange={(e) => setEmailTo(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded font-mono text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-600"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => showToast("Exported Tally Prime / Excel CSV sheet.")}
                    icon={<FileText className="w-3.5 h-3.5" />}
                  >
                    Export CSV
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleSendEmail}
                    loading={isSendingEmail}
                    icon={<Mail className="w-3.5 h-3.5" />}
                  >
                    Send Email
                  </Button>
                </div>
              </div>
            </div>

            {/* Card 3: Digital Audit Trail */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <h3 className="font-bold text-xs text-slate-900">Digital Audit Trail</h3>
                </div>
                <Badge variant="success" size="sm">ALL PASSED</Badge>
              </div>

              <div className="space-y-2.5 text-xs">
                {quote.auditTrail.map((ev, i) => (
                  <div key={ev.id || i} className="flex items-start gap-2.5 text-[11px]">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 mt-1 shrink-0" />
                    <div className="flex-1">
                      <div className="font-bold text-slate-900">{ev.title}</div>
                      <div className="text-slate-500 text-[10px]">{ev.timestamp} • {ev.actor}</div>
                      <div className="text-slate-600 text-[10px] mt-0.5">{ev.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
