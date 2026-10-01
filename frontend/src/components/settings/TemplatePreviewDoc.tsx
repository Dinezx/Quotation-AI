import React from 'react';
import { CompanyLogo } from '../common/CompanyLogo';
import {
  CompanyProfile,
  CompanyBankSettings,
  CompanyQuotationDefaults,
  QuotationTemplateConfig,
} from '../../types/company';

interface TemplatePreviewDocProps {
  templateId: string;
  config: Partial<QuotationTemplateConfig>;
  profile?: Partial<CompanyProfile>;
  bank?: Partial<CompanyBankSettings>;
  defaults?: Partial<CompanyQuotationDefaults>;
  isThumbnail?: boolean;
}

export const TemplatePreviewDoc: React.FC<TemplatePreviewDocProps> = ({
  templateId,
  config,
  profile,
  bank,
  defaults,
  isThumbnail = false,
}) => {
  const primaryColor = config.primary_color || '#1e3a8a';
  const secondaryColor = config.secondary_color || '#475569';
  const showLogo = config.show_logo !== false;
  const logoPosition = (config.logo_position || 'left') as 'left' | 'center' | 'right';
  const showContact = config.show_company_contact !== false;
  const showGstin = config.show_gstin !== false;
  const showBank = config.show_bank_details !== false;
  const showTerms = config.show_terms !== false;
  const showSignature = config.show_signature !== false;

  const companyName = profile?.name || 'Bharat Precision Engineering';
  const gstin = profile?.gstin || '27AAACB2345P1Z2';
  const address = profile?.address || 'Plot 42, MIDC Industrial Area, Pune 411019';
  const phone = profile?.phone || '+91 20 2712 8844';
  const email = profile?.email || 'sales@bharatprecision.co.in';

  const bankName = bank?.bank_name || 'HDFC Bank Ltd';
  const accNo = bank?.account_number || '50200034829103';
  const ifsc = bank?.ifsc || 'HDFC0001043';

  const payTerms = defaults?.payment_terms || '30 Days Net from date of dispatch';
  const delTerms = defaults?.delivery_terms || 'Ex-Works Facility, Chakan Pune';
  const footerText = config.footer_text || 'This is an authoritative computer-generated commercial quotation. Standard tolerances apply.';

  // Standard sample quotation lines & financials
  const sampleItems = [
    {
      sr: '01',
      name: 'Precision Pinion Shaft',
      spec: 'OD 45mm x 220mm length • Induction Hardened',
      grade: 'EN8',
      process: 'CNC Turning & Grinding',
      drawing: 'DWG-2026-P01',
      qty: '10 PCS',
      rate: '1,500.00',
      total: '15,000.00',
    },
    {
      sr: '02',
      name: 'Heavy Bearing Housing',
      spec: 'Machined Block • Tolerance +/- 0.02mm',
      grade: 'EN19',
      process: '4-Axis VMC Milling',
      drawing: 'DWG-2026-H04',
      qty: '5 PCS',
      rate: '3,400.00',
      total: '17,000.00',
    },
    {
      sr: '03',
      name: 'Flanged Base Cover Plate',
      spec: 'Laser cut & drilled • Zinc Phosphate',
      grade: 'IS 2062',
      process: 'Laser Cut & Drilling',
      drawing: 'DWG-2026-C12',
      qty: '20 PCS',
      rate: '1,025.00',
      total: '20,500.00',
    },
  ];

  const subtotal = '₹52,500.00';
  const overhead = '₹5,250.00';
  const profit = '₹8,663.00';
  const taxable = '₹66,413.00';
  const gst = '₹11,954.00';
  const grandTotal = '₹78,367.00';

  // Normalize ID for canonical matching
  const tid = templateId.toLowerCase();

  // =========================================================================
  // MINI THUMBNAIL RENDERING (Proportional A4 aspect ratio 1 / 1.414)
  // Must render distinct visual structure per template
  // =========================================================================
  if (isThumbnail) {
    // 1. CLASSIC PROFESSIONAL THUMBNAIL
    if (tid === 'classic_professional') {
      return (
        <div className="w-full aspect-[1/1.414] bg-white border border-slate-300 rounded shadow-xs overflow-hidden flex flex-col p-2 text-[5px] select-none pointer-events-none">
          {/* Classic Navy Header Band */}
          <div className="bg-[#1e3a8a] text-white p-1 rounded-t flex justify-between items-center mb-1">
            <div className="flex items-center gap-1 max-w-[70%]">
              {showLogo && (
                <div className="bg-white rounded px-0.5 py-0.2 shrink-0">
                  <CompanyLogo
                    variant="thumbnail"
                    position={logoPosition}
                    showPlaceholderIfEmpty={true}
                    overrideLogoUrl={profile?.logo_url ?? undefined}
                    maxHeight="10px"
                    maxWidth="24px"
                  />
                </div>
              )}
              <div className="font-bold truncate">{companyName}</div>
            </div>
            <div className="text-[4px] uppercase tracking-wider font-semibold">QUOTATION</div>
          </div>
          {/* 2-box reference header */}
          <div className="grid grid-cols-2 gap-1 mb-1 text-[4px] border border-slate-200 p-0.5 rounded">
            <div>Customer: ABC Mfg Pvt Ltd</div>
            <div className="text-right">No: QT-2026-00428</div>
          </div>
          {/* Traditional Bordered Table */}
          <div className="flex-1 flex flex-col border border-slate-200">
            <div className="flex justify-between bg-slate-100 font-bold p-0.5 border-b border-slate-200">
              <span>Item Description</span>
              <span>Qty</span>
              <span>Rate</span>
              <span>Amount</span>
            </div>
            {sampleItems.map((it) => (
              <div key={it.sr} className="flex justify-between p-0.5 border-b border-slate-100 text-slate-600">
                <span className="truncate max-w-[45%]">{it.name}</span>
                <span>{it.qty}</span>
                <span>₹{it.rate}</span>
                <span className="font-bold">₹{it.total}</span>
              </div>
            ))}
          </div>
          {/* Classic Boxed Totals */}
          <div className="mt-1 border border-slate-300 p-1 bg-slate-50 text-[4px] text-right space-y-0.2">
            <div>Taxable Amount: {taxable}</div>
            <div>GST (18%): {gst}</div>
            <div className="font-bold text-[#1e3a8a] border-t border-slate-300 pt-0.5">Grand Total: {grandTotal}</div>
          </div>
          <div className="mt-auto pt-0.5 text-right text-[3.5px] text-slate-400">Authorized Signatory</div>
        </div>
      );
    }

    // 2. MODERN MINIMAL THUMBNAIL
    if (tid === 'modern_minimal') {
      return (
        <div className="w-full aspect-[1/1.414] bg-white border border-slate-100 rounded shadow-xs overflow-hidden flex flex-col p-2.5 text-[5px] select-none pointer-events-none">
          {/* Large Whitespace & Clean Typography */}
          <div className="flex justify-between items-start mb-2">
            <div>
              {showLogo && (
                <div className="mb-0.5">
                  <CompanyLogo
                    variant="thumbnail"
                    position={logoPosition}
                    showPlaceholderIfEmpty={true}
                    overrideLogoUrl={profile?.logo_url ?? undefined}
                    maxHeight="12px"
                    maxWidth="30px"
                  />
                </div>
              )}
              <div className="font-bold text-slate-900 text-[6px] tracking-tight">{companyName}</div>
              <div className="text-[3.5px] text-slate-400">Precision Engineering</div>
            </div>
            <div className="text-right">
              <div className="text-[7px] font-light text-slate-800 tracking-wider">QUOTE</div>
              <div className="text-[3.5px] text-slate-400">#QT-2026-00428</div>
            </div>
          </div>
          {/* Hairline Separator */}
          <div className="w-full h-px bg-slate-200 mb-1.5" />
          {/* Borderless Table */}
          <div className="flex-1 flex flex-col space-y-1">
            <div className="flex justify-between text-[4px] font-medium text-slate-400 border-b border-slate-100 pb-0.5">
              <span>PART / SPEC</span>
              <span>QTY</span>
              <span>AMOUNT</span>
            </div>
            {sampleItems.map((it) => (
              <div key={it.sr} className="flex justify-between text-slate-600 border-b border-slate-50 pb-0.5">
                <span className="truncate max-w-[55%]">{it.name}</span>
                <span>{it.qty}</span>
                <span className="font-semibold text-slate-900">₹{it.total}</span>
              </div>
            ))}
          </div>
          {/* Pure Typographic Totals (No Box) */}
          <div className="mt-auto pt-1 text-right text-[4px] text-slate-500 space-y-0.5">
            <div>Subtotal: {subtotal} • GST: {gst}</div>
            <div className="text-[6.5px] font-light text-slate-900">Total: {grandTotal}</div>
          </div>
        </div>
      );
    }

    // 3. PREMIUM CORPORATE THUMBNAIL
    if (tid === 'premium_corporate') {
      return (
        <div className="w-full aspect-[1/1.414] bg-white border border-slate-300 rounded shadow-xs overflow-hidden flex flex-col p-0 text-[5px] select-none pointer-events-none">
          {/* Full-Width Dark Banner */}
          <div className="bg-[#0f172a] text-white p-1.5 flex justify-between items-center">
            <div className="flex items-center gap-1">
              {showLogo && (
                <div className="bg-white/95 rounded px-0.5 py-0.2 shrink-0">
                  <CompanyLogo
                    variant="thumbnail"
                    position={logoPosition}
                    showPlaceholderIfEmpty={true}
                    overrideLogoUrl={profile?.logo_url ?? undefined}
                    maxHeight="10px"
                    maxWidth="24px"
                  />
                </div>
              )}
              <div>
                <div className="font-bold text-[5.5px] tracking-wide">{companyName}</div>
                <div className="text-[3.5px] text-amber-400">ESTABLISHED PRECISION WORKS</div>
              </div>
            </div>
            <div className="bg-amber-400/20 text-amber-300 px-1 py-0.2 rounded text-[4px] font-mono font-bold">
              QT-2026-00428
            </div>
          </div>
          <div className="p-2 flex-1 flex flex-col">
            {/* Executive Customer Card */}
            <div className="bg-slate-50 border border-slate-200 rounded p-1 mb-1.5 flex justify-between text-[4px]">
              <div>
                <span className="text-slate-400 uppercase text-[3.5px]">CLIENT:</span> ABC Mfg Pvt Ltd
              </div>
              <div>
                <span className="text-slate-400 uppercase text-[3.5px]">DATE:</span> 21 Sep 2026
              </div>
            </div>
            {/* Table */}
            <div className="flex-1 flex flex-col space-y-0.5">
              <div className="flex justify-between font-bold text-slate-700 bg-slate-100 p-0.5 rounded">
                <span>Description</span>
                <span>Qty</span>
                <span>Total</span>
              </div>
              {sampleItems.map((it) => (
                <div key={it.sr} className="flex justify-between p-0.5 text-slate-600 border-b border-slate-50">
                  <span className="truncate max-w-[60%]">{it.name}</span>
                  <span>{it.qty}</span>
                  <span className="font-bold">₹{it.total}</span>
                </div>
              ))}
            </div>
            {/* Elevated Grand Total Card */}
            <div className="bg-[#0f172a] text-white p-1 rounded mt-auto flex justify-between items-center text-[4.5px]">
              <span className="text-slate-300">TOTAL DUE (INC. GST)</span>
              <span className="font-bold text-amber-400">{grandTotal}</span>
            </div>
          </div>
        </div>
      );
    }

    // 4. ELEGANT BORDERED THUMBNAIL
    if (tid === 'elegant_bordered') {
      return (
        <div className="w-full aspect-[1/1.414] bg-white border-2 border-slate-700 rounded shadow-xs overflow-hidden flex flex-col p-1.5 text-[5px] select-none pointer-events-none font-serif">
          {/* Framed Centered Letterhead */}
          <div className="border border-slate-400 p-1 mb-1 text-center bg-slate-50/50">
            {showLogo && (
              <div className="mb-0.5 flex justify-center">
                <CompanyLogo
                  variant="thumbnail"
                  position="center"
                  showPlaceholderIfEmpty={true}
                  overrideLogoUrl={profile?.logo_url ?? undefined}
                  maxHeight="12px"
                  maxWidth="32px"
                />
              </div>
            )}
            <div className="font-bold text-slate-900 text-[6px] uppercase tracking-widest">{companyName}</div>
            <div className="text-[3.5px] italic text-slate-500">Formal Commercial Quotation — No. QT-2026-00428</div>
          </div>
          {/* Framed Customer Box */}
          <div className="border border-slate-300 p-0.5 mb-1 text-[3.8px] grid grid-cols-2">
            <div>To: ABC Mfg Pvt Ltd</div>
            <div className="text-right">Ref PO: PO-2026-00123</div>
          </div>
          {/* Framed Table */}
          <div className="flex-1 border border-slate-300 flex flex-col font-sans">
            <div className="flex justify-between bg-slate-200 font-bold p-0.5 text-[4px]">
              <span>Specification</span>
              <span>Qty</span>
              <span>Total</span>
            </div>
            {sampleItems.map((it) => (
              <div key={it.sr} className="flex justify-between p-0.5 border-b border-slate-200 text-slate-700 text-[4px]">
                <span className="truncate max-w-[60%]">{it.name}</span>
                <span>{it.qty}</span>
                <span>₹{it.total}</span>
              </div>
            ))}
          </div>
          {/* Double-Line Framed Boxed Totals */}
          <div className="border border-slate-400 p-1 mt-1 text-right text-[4px] space-y-0.2 bg-slate-50">
            <div>Taxable: {taxable} • Tax: {gst}</div>
            <div className="font-bold text-slate-900 border-t border-double border-slate-500 pt-0.5">
              Net Payable: {grandTotal}
            </div>
          </div>
        </div>
      );
    }

    // 5. INDUSTRIAL THUMBNAIL
    if (tid === 'industrial_bold' || tid === 'industrial') {
      return (
        <div className="w-full aspect-[1/1.414] bg-white border border-slate-300 rounded shadow-xs overflow-hidden flex flex-col p-2 text-[5px] select-none pointer-events-none">
          {/* Bold Amber Stripe & Dark Steel Header */}
          <div className="border-b-2 border-orange-500 pb-1 mb-1 flex justify-between items-center">
            <div className="flex items-center gap-1">
              {showLogo && (
                <div className="bg-white border border-slate-700 rounded px-0.5 py-0.2 shrink-0">
                  <CompanyLogo
                    variant="thumbnail"
                    position={logoPosition}
                    showPlaceholderIfEmpty={true}
                    overrideLogoUrl={profile?.logo_url ?? undefined}
                    maxHeight="10px"
                    maxWidth="24px"
                  />
                </div>
              )}
              <div>
                <div className="font-black text-slate-950 uppercase text-[5.5px] tracking-tight">{companyName}</div>
                <div className="text-[3.5px] font-mono text-slate-500">PLANT CODE: MH-BPE-01 • ROUTE SHEET</div>
              </div>
            </div>
            <div className="bg-slate-900 text-orange-400 px-1 py-0.5 rounded text-[4px] font-mono font-bold">
              [QT-2026-00428]
            </div>
          </div>
          {/* Industrial Specs Banner */}
          <div className="bg-slate-100 border-l-2 border-slate-800 p-0.5 mb-1 text-[3.8px] font-mono grid grid-cols-2">
            <div>CUSTOMER: ABC MFG PVT LTD</div>
            <div className="text-right">TOLERANCE: ISO 2768-m</div>
          </div>
          {/* Technical Grid Table */}
          <div className="flex-1 flex flex-col border border-slate-800 font-mono">
            <div className="flex justify-between bg-slate-800 text-white font-bold p-0.5 text-[3.8px]">
              <span>PART / SPEC</span>
              <span>MAT/ROUTE</span>
              <span>QTY</span>
              <span>TOTAL</span>
            </div>
            {sampleItems.map((it) => (
              <div key={it.sr} className="flex justify-between p-0.5 border-b border-slate-200 text-slate-800 text-[3.8px]">
                <span className="truncate max-w-[40%] font-bold">{it.name}</span>
                <span className="text-slate-500">{it.grade}</span>
                <span>{it.qty}</span>
                <span className="font-bold">₹{it.total}</span>
              </div>
            ))}
          </div>
          {/* Industrial Totals Badge */}
          <div className="mt-1 bg-orange-50 border border-orange-400 p-1 text-right font-mono text-[4px]">
            <div className="text-slate-600">SUBTOTAL: {subtotal} | GST: {gst}</div>
            <div className="font-bold text-orange-700 text-[5px]">GRAND TOTAL: {grandTotal}</div>
          </div>
        </div>
      );
    }

    // 6. EXECUTIVE THUMBNAIL
    if (tid === 'modern_two_column' || tid === 'executive') {
      return (
        <div className="w-full aspect-[1/1.414] bg-white border border-slate-200 rounded shadow-xs overflow-hidden flex flex-col p-2 text-[5px] select-none pointer-events-none">
          {/* Large Visual Hierarchy Title */}
          <div className="flex justify-between items-start mb-1.5 border-b border-slate-200 pb-1">
            <div>
              {showLogo && (
                <div className="mb-0.5">
                  <CompanyLogo
                    variant="thumbnail"
                    position={logoPosition}
                    showPlaceholderIfEmpty={true}
                    overrideLogoUrl={profile?.logo_url ?? undefined}
                    maxHeight="12px"
                    maxWidth="30px"
                  />
                </div>
              )}
              <div className="text-[4px] uppercase text-blue-600 font-bold tracking-wider">COMMERCIAL PROPOSAL</div>
              <div className="font-black text-slate-900 text-[7px] leading-tight">{companyName}</div>
            </div>
            <div className="text-right">
              <span className="bg-blue-600 text-white px-1 py-0.2 rounded text-[4px] font-bold">QT-2026-00428</span>
              <div className="text-[3.5px] text-slate-400 mt-0.5">21 Sep 2026</div>
            </div>
          </div>
          {/* 2-Column Executive Summary Blocks */}
          <div className="grid grid-cols-2 gap-1 mb-1 text-[3.8px]">
            <div className="bg-slate-50 p-1 rounded border border-slate-200">
              <span className="font-bold text-slate-700 block">EXECUTIVE SUMMARY:</span>
              <span>Prepared for ABC Mfg Pvt Ltd</span>
            </div>
            <div className="bg-blue-50/50 p-1 rounded border border-blue-200 text-right">
              <span className="font-bold text-blue-900 block">OFFER VALUE:</span>
              <span className="font-bold text-[5px] text-blue-700">{grandTotal}</span>
            </div>
          </div>
          {/* Minimal Clutter Table */}
          <div className="flex-1 flex flex-col space-y-0.5">
            <div className="flex justify-between font-bold text-slate-600 border-b border-slate-200 pb-0.5">
              <span>Scope of Supply</span>
              <span>Quantity</span>
              <span>Amount</span>
            </div>
            {sampleItems.map((it) => (
              <div key={it.sr} className="flex justify-between text-slate-700 py-0.5 border-b border-slate-100">
                <span className="truncate max-w-[60%] font-medium">{it.name}</span>
                <span>{it.qty}</span>
                <span className="font-bold">₹{it.total}</span>
              </div>
            ))}
          </div>
          <div className="mt-auto border-t border-slate-200 pt-1 text-right text-[4px] text-slate-500">
            Validity: 30 Days • C-Suite Management Briefing
          </div>
        </div>
      );
    }

    // 7. COMPACT THUMBNAIL
    if (tid === 'creative_modern' || tid === 'compact') {
      return (
        <div className="w-full aspect-[1/1.414] bg-white border border-slate-300 rounded shadow-xs overflow-hidden flex flex-col p-1.5 text-[4.5px] select-none pointer-events-none">
          {/* Dense Compact Header */}
          <div className="flex justify-between items-center border-b border-teal-600 pb-0.5 mb-1">
            <div className="flex items-center gap-1 max-w-[70%]">
              {showLogo && (
                <div className="bg-white rounded px-0.5 py-0.2 shrink-0">
                  <CompanyLogo
                    variant="thumbnail"
                    position={logoPosition}
                    showPlaceholderIfEmpty={true}
                    overrideLogoUrl={profile?.logo_url ?? undefined}
                    maxHeight="9px"
                    maxWidth="22px"
                  />
                </div>
              )}
              <div className="font-bold text-teal-800 text-[5.5px] truncate">{companyName}</div>
            </div>
            <div className="bg-teal-700 text-white px-1 rounded text-[3.8px] font-mono">BOM QUOTE</div>
          </div>
          {/* Dense Metadata */}
          <div className="text-[3.5px] text-slate-500 flex justify-between mb-0.5">
            <span>Customer: ABC Mfg Pvt Ltd</span>
            <span>PO Ref: PO-2026-00123</span>
          </div>
          {/* Ultra Dense Table (High Item Count Design) */}
          <div className="flex-1 flex flex-col space-y-0.2 border border-slate-200 text-[3.8px]">
            <div className="flex justify-between bg-teal-50 font-bold p-0.5 border-b border-slate-200 text-teal-900">
              <span># Item</span>
              <span>Mat</span>
              <span>Qty</span>
              <span>Rate</span>
              <span>Total</span>
            </div>
            {sampleItems.map((it) => (
              <div key={it.sr} className="flex justify-between p-0.3 border-b border-slate-100 text-slate-700">
                <span className="truncate max-w-[35%]">{it.sr}. {it.name}</span>
                <span>{it.grade}</span>
                <span>{it.qty}</span>
                <span>₹{it.rate}</span>
                <span className="font-bold">₹{it.total}</span>
              </div>
            ))}
          </div>
          {/* Compressed Totals & Terms Side-by-Side */}
          <div className="mt-1 pt-0.5 border-t border-slate-200 flex justify-between items-center text-[3.8px]">
            <div className="text-slate-400">Payment: 30D • Ex-Works</div>
            <div className="text-right font-bold text-teal-800">
              Tax: {gst} | TOTAL: {grandTotal}
            </div>
          </div>
        </div>
      );
    }

    // 8. MODERN DOCUMENT THUMBNAIL
    return (
      <div className="w-full aspect-[1/1.414] bg-white border border-slate-200 rounded shadow-xs overflow-hidden flex flex-col p-2 text-[5px] select-none pointer-events-none">
        {/* Asymmetric Modern SaaS Header */}
        <div className="flex justify-between items-start mb-1.5">
          <div>
            <div className="flex items-center gap-1">
              <span className="bg-slate-100 text-slate-700 px-1 py-0.2 rounded-full text-[3.5px] font-semibold">
                COMMERCIAL PROPOSAL
              </span>
              {showLogo && (
                <CompanyLogo
                  variant="thumbnail"
                  position={logoPosition}
                  showPlaceholderIfEmpty={true}
                  overrideLogoUrl={profile?.logo_url ?? undefined}
                  maxHeight="10px"
                  maxWidth="24px"
                />
              )}
            </div>
            <div className="font-bold text-slate-900 text-[6px] mt-0.5">{companyName}</div>
          </div>
          <div className="text-right">
            <div className="font-mono text-[5px] font-bold text-blue-600">QT-2026-00428</div>
            <div className="text-[3.5px] text-slate-400">21 Sep 2026</div>
          </div>
        </div>
        {/* Modern Pill Badge Group */}
        <div className="flex gap-1 mb-1">
          <span className="bg-blue-50 text-blue-700 px-1 py-0.2 rounded text-[3.5px]">ABC Mfg Pvt Ltd</span>
          <span className="bg-emerald-50 text-emerald-700 px-1 py-0.2 rounded text-[3.5px]">GSTIN Verified</span>
        </div>
        {/* Modern Card Table */}
        <div className="flex-1 flex flex-col space-y-0.5">
          <div className="flex justify-between font-bold text-slate-400 text-[4px] border-b border-slate-100 pb-0.5">
            <span>DESCRIPTION</span>
            <span>QTY</span>
            <span>AMOUNT</span>
          </div>
          {sampleItems.map((it) => (
            <div key={it.sr} className="flex justify-between bg-slate-50/80 p-0.5 rounded text-slate-700 text-[4px]">
              <span className="truncate max-w-[55%]">{it.name}</span>
              <span>{it.qty}</span>
              <span className="font-bold text-slate-900">₹{it.total}</span>
            </div>
          ))}
        </div>
        {/* Modern Total Summary Card */}
        <div className="bg-slate-900 text-white p-1 rounded-lg mt-auto flex justify-between items-center text-[4.5px]">
          <span className="text-slate-400 text-[4px]">GRAND TOTAL</span>
          <span className="font-bold text-white text-[5.5px]">{grandTotal}</span>
        </div>
      </div>
    );
  }

  // =========================================================================
  // FULL A4 INTERACTIVE PREVIEW RENDERING
  // Fully distinct 8 templates
  // =========================================================================

  // 1. CLASSIC PROFESSIONAL
  if (tid === 'classic_professional') {
    return (
      <div className="w-full bg-white text-slate-800 rounded-xl shadow-md border border-slate-300 overflow-hidden text-xs font-sans">
        {/* Structured Navy Header Banner */}
        <div className={`bg-[#1e3a8a] text-white px-8 py-6 ${
          logoPosition === 'center'
            ? 'flex flex-col items-center text-center gap-4'
            : 'flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4'
        }`}>
          <div className={`flex ${
            logoPosition === 'center'
              ? 'flex-col items-center text-center'
              : 'flex-row items-center gap-5'
          }`}>
            {showLogo && (
              <div className="bg-white rounded-xl p-2.5 shadow-sm border border-blue-200/40 shrink-0">
                <CompanyLogo
                  variant="preview"
                  position={logoPosition}
                  showPlaceholderIfEmpty={true}
                  overrideLogoUrl={profile?.logo_url ?? undefined}
                  maxHeight="44px"
                  maxWidth="140px"
                />
              </div>
            )}
            <div className="space-y-1">
              <h2 className="text-lg font-bold tracking-tight text-white uppercase">{companyName}</h2>
              {showContact && <p className="text-[11px] text-blue-100">{address} • Tel: {phone}</p>}
              {showGstin && <p className="text-[11px] font-mono text-blue-200">GSTIN: {gstin}</p>}
            </div>
          </div>
          <div className={`font-mono text-xs space-y-0.5 ${logoPosition === 'center' ? 'text-center' : 'text-right sm:text-right'}`}>
            <div className="text-sm font-bold uppercase tracking-wider text-amber-300">COMMERCIAL QUOTATION</div>
            <div className="text-blue-100 font-bold">QT-2026-00428</div>
            <div className="text-[11px] text-blue-200">Date: 21 Sep 2026</div>
          </div>
        </div>

        <div className="p-8 space-y-6">
          {/* Standard Rectangular 2-Column Info Section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="border border-slate-300 rounded-lg p-3 bg-slate-50/50 space-y-1">
              <span className="text-slate-500 uppercase font-semibold text-[10px] block">Customer / Consignee:</span>
              <strong className="text-slate-900 text-xs">ABC Manufacturing Pvt Ltd</strong>
              <p className="text-slate-600 text-[11px]">Plant 2, Chakan Industrial Area, Pune</p>
              <p className="text-slate-500 text-[10px] font-mono">GSTIN: 27AABCA1234F1Z1</p>
            </div>
            <div className="border border-slate-300 rounded-lg p-3 bg-slate-50/50 space-y-1 sm:text-right">
              <span className="text-slate-500 uppercase font-semibold text-[10px] block">Commercial References:</span>
              <p className="font-mono text-slate-800 text-[11px]">PO Ref: <strong>PO-2026-00123</strong></p>
              <p className="text-slate-600 text-[11px]">Validity: 30 Days from date of issue</p>
              <p className="text-slate-600 text-[11px]">Currency: Indian Rupee (INR ₹)</p>
            </div>
          </div>

          {/* Conventional Item Table with Clear Borders */}
          <div className="overflow-x-auto border border-slate-300 rounded-lg">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#1e3a8a] text-white text-[11px] font-semibold uppercase tracking-wider">
                  <th className="py-2.5 px-3 w-10 text-center border-r border-blue-900">#</th>
                  <th className="py-2.5 px-3 border-r border-blue-900">Item Description & Specification</th>
                  <th className="py-2.5 px-3 border-r border-blue-900 text-center">Grade</th>
                  <th className="py-2.5 px-3 border-r border-blue-900 text-center">Qty</th>
                  <th className="py-2.5 px-3 border-r border-blue-900 text-right">Unit Rate (₹)</th>
                  <th className="py-2.5 px-3 text-right">Amount (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-[11px]">
                {sampleItems.map((it) => (
                  <tr key={it.sr} className="hover:bg-slate-50/60">
                    <td className="py-2.5 px-3 text-center font-mono text-slate-500 border-r border-slate-200">{it.sr}</td>
                    <td className="py-2.5 px-3 border-r border-slate-200">
                      <div className="font-bold text-slate-900">{it.name}</div>
                      <div className="text-[10px] text-slate-500">{it.spec}</div>
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono border-r border-slate-200">{it.grade}</td>
                    <td className="py-2.5 px-3 text-center font-mono font-bold border-r border-slate-200">{it.qty}</td>
                    <td className="py-2.5 px-3 text-right font-mono border-r border-slate-200">{it.rate}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">{it.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Bottom Grid: Banking & Classic Right-Aligned Financial Totals */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 pt-2">
            <div className="sm:col-span-7 space-y-3">
              {showBank && (
                <div className="border border-slate-300 rounded-lg p-3 text-[11px] bg-slate-50/60 space-y-1">
                  <div className="font-bold text-slate-900 flex justify-between">
                    <span>Direct Bank Remittance:</span>
                    <span className="text-[10px] font-mono text-slate-500">RTGS / NEFT</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-slate-600">
                    <span>Bank: <strong>{bankName}</strong></span>
                    <span>IFSC: <strong className="font-mono">{ifsc}</strong></span>
                    <span className="col-span-2">A/C Number: <strong className="font-mono">{accNo}</strong></span>
                  </div>
                </div>
              )}
              {showTerms && (
                <div className="text-[10px] text-slate-500 space-y-1">
                  <div>• <strong>Payment Terms:</strong> {payTerms}</div>
                  <div>• <strong>Delivery:</strong> {delTerms}</div>
                  <div>• <strong>Tolerances:</strong> Standard manufacturing machining limits apply.</div>
                </div>
              )}
            </div>

            <div className="sm:col-span-5 border border-slate-300 rounded-lg p-3 bg-slate-50 text-xs font-mono space-y-1.5">
              <div className="flex justify-between text-slate-600">
                <span>Material & Process:</span>
                <span>{subtotal}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Factory Overhead (10%):</span>
                <span>{overhead}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Profit Margin (15%):</span>
                <span>{profit}</span>
              </div>
              <div className="flex justify-between font-semibold text-slate-800 border-t border-slate-300 pt-1">
                <span>Taxable Amount:</span>
                <span>{taxable}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>CGST (9%) + SGST (9%):</span>
                <span>{gst}</span>
              </div>
              <div className="flex justify-between items-center font-bold text-sm bg-[#1e3a8a] text-white p-2 rounded mt-1">
                <span>Grand Total:</span>
                <span>{grandTotal}</span>
              </div>
              <div className="text-[9px] font-sans text-slate-500 text-right pt-0.5">
                Seventy-Eight Thousand Three Hundred Sixty-Seven Rupees Only
              </div>
            </div>
          </div>

          {/* Formal Bottom Signature Area */}
          <div className="pt-6 border-t border-slate-300 flex justify-between items-end">
            <div className="text-[10px] text-slate-400 max-w-sm">{footerText}</div>
            {showSignature && (
              <div className="text-right text-[11px] space-y-8">
                <div className="text-slate-700">For <strong>{companyName}</strong></div>
                <div className="border-t border-slate-400 pt-1 font-mono text-[10px] text-slate-500">
                  Authorized Signatory
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 2. MODERN MINIMAL
  if (tid === 'modern_minimal') {
    return (
      <div className="w-full bg-white text-slate-800 rounded-xl shadow-xs border border-slate-200 overflow-hidden p-8 sm:p-12 space-y-8 text-xs font-sans">
        {/* Generous Whitespace, Minimal Borders, Thin Separators */}
        {showLogo && logoPosition === 'center' && (
          <div className="flex justify-center pb-2">
            <CompanyLogo
              variant="preview"
              position="center"
              showPlaceholderIfEmpty={true}
              overrideLogoUrl={profile?.logo_url ?? undefined}
              maxHeight="48px"
              maxWidth="160px"
            />
          </div>
        )}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
          <div className="space-y-1">
            {showLogo && logoPosition === 'left' && (
              <div className="mb-2">
                <CompanyLogo
                  variant="preview"
                  position="left"
                  showPlaceholderIfEmpty={true}
                  overrideLogoUrl={profile?.logo_url ?? undefined}
                  maxHeight="48px"
                  maxWidth="150px"
                />
              </div>
            )}
            <h2 className="text-xl font-bold tracking-tight text-slate-900">{companyName}</h2>
            {showContact && <p className="text-xs text-slate-400 font-light">{address} • {phone}</p>}
            {showGstin && <p className="text-xs text-slate-500 font-mono">GSTIN: {gstin}</p>}
          </div>
          <div className="sm:text-right space-y-0.5">
            {showLogo && logoPosition === 'right' && (
              <div className="flex justify-end mb-2">
                <CompanyLogo
                  variant="preview"
                  position="right"
                  showPlaceholderIfEmpty={true}
                  overrideLogoUrl={profile?.logo_url ?? undefined}
                  maxHeight="48px"
                  maxWidth="150px"
                />
              </div>
            )}
            <div className="text-2xl font-light tracking-widest text-slate-900">QUOTATION</div>
            <div className="text-xs font-mono text-slate-500">#QT-2026-00428</div>
            <div className="text-xs text-slate-400">Date: 21 September 2026</div>
          </div>
        </div>

        <div className="w-full h-px bg-slate-200" />

        {/* Minimal Customer Block */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4 text-xs font-light">
          <div>
            <span className="text-slate-400 text-[10px] uppercase tracking-wider block font-medium">Billed To</span>
            <div className="text-slate-900 font-medium text-sm mt-0.5">ABC Manufacturing Pvt Ltd</div>
            <div className="text-slate-500 text-xs">Procurement Division • Chakan, Pune</div>
          </div>
          <div className="sm:text-right">
            <span className="text-slate-400 text-[10px] uppercase tracking-wider block font-medium">Order Terms</span>
            <div className="text-slate-800 font-mono mt-0.5">PO Ref: PO-2026-00123</div>
            <div className="text-slate-500 text-xs">Payment: {payTerms}</div>
          </div>
        </div>

        {/* Item Table: No Vertical Borders, Only Clean Hairline Rows */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-300 text-slate-400 text-[10px] uppercase tracking-wider font-medium">
                <th className="py-2 px-1 w-8">#</th>
                <th className="py-2 px-3">Description</th>
                <th className="py-2 px-3 text-center">Grade</th>
                <th className="py-2 px-3 text-center">Qty</th>
                <th className="py-2 px-3 text-right">Unit Rate</th>
                <th className="py-2 px-1 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {sampleItems.map((it) => (
                <tr key={it.sr} className="hover:bg-slate-50/50">
                  <td className="py-3 px-1 text-slate-400 font-mono">{it.sr}</td>
                  <td className="py-3 px-3">
                    <div className="font-semibold text-slate-900">{it.name}</div>
                    <div className="text-[10px] text-slate-400">{it.spec}</div>
                  </td>
                  <td className="py-3 px-3 text-center font-mono text-slate-600">{it.grade}</td>
                  <td className="py-3 px-3 text-center font-mono font-medium">{it.qty}</td>
                  <td className="py-3 px-3 text-right font-mono text-slate-600">₹{it.rate}</td>
                  <td className="py-3 px-1 text-right font-mono font-semibold text-slate-900">₹{it.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals Presented With Strong Typographic Hierarchy (No Heavy Badge) */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-8 pt-4">
          <div className="sm:max-w-xs space-y-2 text-xs text-slate-400 font-light">
            {showBank && (
              <p>Bank: {bankName} • A/C {accNo} • IFSC {ifsc}</p>
            )}
            <p>{footerText}</p>
          </div>

          <div className="w-full sm:w-64 space-y-1.5 text-xs text-right font-mono">
            <div className="flex justify-between text-slate-500">
              <span>Subtotal</span>
              <span>{subtotal}</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>Overhead (10%)</span>
              <span>{overhead}</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>Profit Margin (15%)</span>
              <span>{profit}</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>Taxable Value</span>
              <span>{taxable}</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>GST (18%)</span>
              <span>{gst}</span>
            </div>
            <div className="w-full h-px bg-slate-300 my-2" />
            <div className="flex justify-between text-base font-bold text-slate-900 pt-1">
              <span>Total</span>
              <span>{grandTotal}</span>
            </div>
          </div>
        </div>

        {showSignature && (
          <div className="pt-8 text-right">
            <div className="text-xs text-slate-400">Authorized by {companyName}</div>
          </div>
        )}
      </div>
    );
  }

  // 3. PREMIUM CORPORATE
  if (tid === 'premium_corporate') {
    return (
      <div className="w-full bg-white text-slate-800 rounded-xl shadow-lg border border-slate-300 overflow-hidden text-xs font-sans">
        {/* Full-Width Dark Slate Header Band with Logo & Amber/Gold Highlights */}
        <div className={`bg-[#0f172a] text-white px-8 py-7 border-b-4 border-amber-400 ${
          logoPosition === 'center'
            ? 'flex flex-col items-center text-center gap-4'
            : 'flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4'
        }`}>
          <div className={`flex ${
            logoPosition === 'center'
              ? 'flex-col items-center text-center'
              : 'flex-row items-center gap-5'
          }`}>
            {showLogo && (
              <div className="bg-white/95 rounded-xl p-2.5 shadow-sm border border-amber-400/30 shrink-0">
                <CompanyLogo
                  variant="preview"
                  position={logoPosition}
                  showPlaceholderIfEmpty={true}
                  overrideLogoUrl={profile?.logo_url ?? undefined}
                  maxHeight="46px"
                  maxWidth="140px"
                />
              </div>
            )}
            <div className="space-y-1">
              <div className={`flex items-center gap-2 ${logoPosition === 'center' ? 'justify-center' : ''}`}>
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400 inline-block" />
                <h2 className="text-lg font-black tracking-wide text-white uppercase">{companyName}</h2>
              </div>
              {showContact && <p className="text-[11px] text-slate-400">{address} • {phone} • {email}</p>}
              {showGstin && <p className="text-[11px] font-mono text-amber-300">GSTIN: {gstin}</p>}
            </div>
          </div>
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-3 text-right font-mono min-w-[200px]">
            <div className="text-xs font-bold text-amber-400 uppercase tracking-wider">OFFICIAL QUOTATION</div>
            <div className="text-sm font-bold text-white mt-0.5">#QT-2026-00428</div>
            <div className="text-[10px] text-slate-400">Date of Issue: 21 Sep 2026</div>
          </div>
        </div>

        <div className="p-8 space-y-6">
          {/* Executive Customer Information Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 shadow-2xs flex flex-col sm:flex-row justify-between gap-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                PREPARED FOR EXECUTIVE REVIEW:
              </span>
              <h4 className="text-sm font-bold text-slate-900">ABC Manufacturing Private Limited</h4>
              <p className="text-xs text-slate-600 mt-0.5">Automotive Transmission Division • Pune Facility</p>
              <p className="text-[11px] font-mono text-slate-500 mt-0.5">Client GSTIN: 27AABCA1234F1Z1</p>
            </div>
            <div className="sm:text-right font-mono text-xs space-y-1">
              <div>PO Ref: <strong className="text-slate-900">PO-2026-00123</strong></div>
              <div>Validity: <strong className="text-slate-900">30 Calendar Days</strong></div>
              <div className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 inline-block font-sans text-[11px] font-semibold">
                Tier-1 Corporate Approved
              </div>
            </div>
          </div>

          {/* Premium Corporate Table */}
          <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-2xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white text-[11px] font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">Line</th>
                  <th className="py-3 px-4">Specification & Tooling Details</th>
                  <th className="py-3 px-4 text-center">Material</th>
                  <th className="py-3 px-4 text-center">Batch Qty</th>
                  <th className="py-3 px-4 text-right">Unit Rate (₹)</th>
                  <th className="py-3 px-4 text-right">Line Total (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {sampleItems.map((it) => (
                  <tr key={it.sr} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4 font-mono font-bold text-slate-400">{it.sr}</td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{it.name}</div>
                      <div className="text-[11px] text-slate-500">{it.spec}</div>
                    </td>
                    <td className="py-3 px-4 text-center font-mono text-slate-700 font-semibold">{it.grade}</td>
                    <td className="py-3 px-4 text-center font-mono font-bold text-slate-900">{it.qty}</td>
                    <td className="py-3 px-4 text-right font-mono text-slate-700">{it.rate}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-950">{it.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Elevated Summary Section with Distinct Grand Total Presentation */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 pt-2">
            <div className="sm:col-span-6 space-y-3">
              {showBank && (
                <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/70 space-y-1.5 text-xs">
                  <div className="font-bold text-slate-900">Corporate Banking Remittance</div>
                  <div className="text-slate-600">Bank: <strong>{bankName}</strong></div>
                  <div className="text-slate-600 font-mono">Account: <strong>{accNo}</strong></div>
                  <div className="text-slate-600 font-mono">IFSC Code: <strong>{ifsc}</strong></div>
                </div>
              )}
              {showTerms && (
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Terms: {payTerms} • Delivery: {delTerms} • Inspection with 3.1 EN 10204 inspection certificate.
                </p>
              )}
            </div>

            <div className="sm:col-span-6 bg-slate-900 text-white rounded-xl p-5 shadow-md space-y-2 font-mono text-xs">
              <div className="flex justify-between text-slate-300">
                <span>Material & Process Subtotal:</span>
                <span>{subtotal}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Factory Overhead (10%):</span>
                <span>{overhead}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Commercial Profit Margin (15%):</span>
                <span>{profit}</span>
              </div>
              <div className="flex justify-between text-amber-300 font-semibold border-t border-slate-800 pt-1">
                <span>Taxable Assessable Amount:</span>
                <span>{taxable}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>CGST (9%) + SGST (9%):</span>
                <span>{gst}</span>
              </div>
              <div className="flex justify-between items-center bg-amber-400 text-slate-950 font-black text-sm p-3 rounded-lg mt-2">
                <span>TOTAL PAYABLE AMOUNT:</span>
                <span>{grandTotal}</span>
              </div>
            </div>
          </div>

          {/* Footer & Signature */}
          <div className="pt-6 border-t border-slate-200 flex justify-between items-end">
            <div className="text-[10px] text-slate-400 max-w-sm">{footerText}</div>
            {showSignature && (
              <div className="text-right text-xs space-y-8">
                <div className="text-slate-800 font-bold">For {companyName}</div>
                <div className="border-t border-slate-400 pt-1 font-mono text-[10px] text-slate-500">
                  Managing Director / Authorized Signatory
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 4. ELEGANT BORDERED
  if (tid === 'elegant_bordered') {
    return (
      <div className="w-full bg-white text-slate-900 rounded-xl shadow-md border-4 border-double border-slate-700 p-8 sm:p-10 space-y-6 text-xs font-serif">
        {/* Strong Framed Centered Document Header */}
        <div className="text-center pb-4 border-b-2 border-slate-300 space-y-2">
          {showLogo && (
            <div className={`flex mb-2 ${
              logoPosition === 'left' ? 'justify-start' : logoPosition === 'right' ? 'justify-end' : 'justify-center'
            }`}>
              <div className="border border-slate-400/80 rounded-lg p-2 bg-slate-50/50">
                <CompanyLogo
                  variant="preview"
                  position={logoPosition}
                  showPlaceholderIfEmpty={true}
                  overrideLogoUrl={profile?.logo_url ?? undefined}
                  maxHeight="46px"
                  maxWidth="140px"
                />
              </div>
            </div>
          )}
          <h2 className="text-xl font-bold tracking-widest text-slate-950 uppercase">{companyName}</h2>
          {showContact && <p className="text-xs text-slate-600 font-sans">{address} • Tel: {phone}</p>}
          {showGstin && <p className="text-xs font-mono text-slate-700">GSTIN: {gstin}</p>}
          <div className="pt-2">
            <span className="italic text-xs font-semibold uppercase tracking-wider text-slate-800 border-y border-slate-400 py-1 px-6 inline-block">
              Formal Commercial Quotation — Ref: QT-2026-00428
            </span>
          </div>
        </div>

        {/* Framed Customer & Reference Box */}
        <div className="border border-slate-400 rounded p-4 grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50/30">
          <div className="space-y-1">
            <span className="font-sans font-bold uppercase text-[10px] text-slate-500 block">Client Particulars:</span>
            <div className="font-bold text-sm text-slate-900">ABC Manufacturing Pvt Ltd</div>
            <p className="text-xs text-slate-600 font-sans">Works Division, Chakan MIDC, Pune</p>
          </div>
          <div className="sm:text-right space-y-1 font-sans text-xs">
            <div>Purchase Order Ref: <strong>PO-2026-00123</strong></div>
            <div>Quotation Date: <strong>21 September 2026</strong></div>
            <div>Validity: <strong>30 Days from issue</strong></div>
          </div>
        </div>

        {/* Framed Item Table */}
        <div className="border border-slate-400 rounded overflow-hidden">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-400 text-slate-900 font-bold uppercase text-[10px] tracking-wider font-sans">
                <th className="py-2.5 px-3 border-r border-slate-300 text-center w-10">Sr.</th>
                <th className="py-2.5 px-3 border-r border-slate-300">Description of Manufactured Goods</th>
                <th className="py-2.5 px-3 border-r border-slate-300 text-center">Grade</th>
                <th className="py-2.5 px-3 border-r border-slate-300 text-center">Quantity</th>
                <th className="py-2.5 px-3 border-r border-slate-300 text-right">Unit Rate</th>
                <th className="py-2.5 px-3 text-right">Total Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-300 text-xs">
              {sampleItems.map((it) => (
                <tr key={it.sr}>
                  <td className="py-2.5 px-3 text-center border-r border-slate-300 font-sans text-slate-500">{it.sr}</td>
                  <td className="py-2.5 px-3 border-r border-slate-300">
                    <div className="font-bold text-slate-900">{it.name}</div>
                    <div className="text-[10px] text-slate-500 font-sans">{it.spec}</div>
                  </td>
                  <td className="py-2.5 px-3 text-center font-mono border-r border-slate-300">{it.grade}</td>
                  <td className="py-2.5 px-3 text-center font-bold border-r border-slate-300 font-mono">{it.qty}</td>
                  <td className="py-2.5 px-3 text-right font-mono border-r border-slate-300">₹{it.rate}</td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">₹{it.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Boxed Totals & Banking */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
          {showBank && (
            <div className="border border-slate-400 rounded p-3 text-xs space-y-1 bg-slate-50/50 font-sans">
              <div className="font-bold font-serif text-slate-900">Commercial Bank Settlement:</div>
              <div>Bank: {bankName}</div>
              <div className="font-mono">Account No: {accNo}</div>
              <div className="font-mono">IFSC Code: {ifsc}</div>
            </div>
          )}

          <div className="border border-slate-400 rounded p-4 text-xs font-sans space-y-1.5 text-right">
            <div className="flex justify-between text-slate-600">
              <span>Manufacturing Subtotal:</span>
              <span className="font-mono">{subtotal}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Overhead & Margin:</span>
              <span className="font-mono">₹13,913.00</span>
            </div>
            <div className="flex justify-between text-slate-700 font-semibold border-t border-slate-300 pt-1">
              <span>Taxable Value:</span>
              <span className="font-mono">{taxable}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>GST Statutory Tax (18%):</span>
              <span className="font-mono">{gst}</span>
            </div>
            <div className="border-t-2 border-double border-slate-600 pt-2 flex justify-between items-center text-sm font-bold text-slate-950 font-serif">
              <span>Total Commercial Price:</span>
              <span className="font-mono font-black">{grandTotal}</span>
            </div>
          </div>
        </div>

        {/* Signature Area */}
        <div className="pt-6 border-t border-slate-400 flex justify-between items-end font-sans">
          <div className="text-[10px] text-slate-400">{footerText}</div>
          {showSignature && (
            <div className="text-right text-xs space-y-8">
              <div className="font-serif font-bold">For {companyName}</div>
              <div className="border-t border-slate-400 pt-1 text-[10px] text-slate-500 font-mono">
                Authorized Signatory
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // 5. INDUSTRIAL
  if (tid === 'industrial_bold' || tid === 'industrial') {
    return (
      <div className="w-full bg-white text-slate-900 rounded-xl shadow-md border-2 border-slate-800 overflow-hidden text-xs font-mono">
        {/* Manufacturing-Oriented Header Bar with Amber/Steel Accent */}
        <div className={`bg-slate-900 text-white px-8 py-6 border-b-4 border-orange-500 ${
          logoPosition === 'center'
            ? 'flex flex-col items-center text-center gap-4'
            : 'flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4'
        }`}>
          <div className={`flex ${
            logoPosition === 'center'
              ? 'flex-col items-center text-center'
              : 'flex-row items-center gap-4'
          }`}>
            {showLogo && (
              <div className="bg-white border-2 border-slate-700 rounded-lg p-2 shrink-0">
                <CompanyLogo
                  variant="preview"
                  position={logoPosition}
                  showPlaceholderIfEmpty={true}
                  overrideLogoUrl={profile?.logo_url ?? undefined}
                  maxHeight="44px"
                  maxWidth="130px"
                />
              </div>
            )}
            <div>
              <div className={`flex items-center gap-2 ${logoPosition === 'center' ? 'justify-center' : ''}`}>
                <span className="bg-orange-500 text-slate-950 font-black px-1.5 py-0.5 rounded text-[10px]">MFG-DOC</span>
                <h2 className="text-lg font-black tracking-tight text-white uppercase">{companyName}</h2>
              </div>
              {showContact && <p className="text-[11px] text-slate-400 mt-1">{address} • PH: {phone}</p>}
              {showGstin && <p className="text-[11px] text-orange-400 font-bold">GSTIN: {gstin}</p>}
            </div>
          </div>
          <div className="bg-slate-800 border border-slate-700 px-4 py-2.5 rounded text-right space-y-0.5">
            <div className="text-orange-400 text-xs font-black uppercase">PRICE ESTIMATE</div>
            <div className="text-sm font-bold text-white">REF: QT-2026-00428</div>
            <div className="text-[10px] text-slate-400">ISSUED: 21-SEP-2026</div>
          </div>
        </div>

        <div className="p-8 space-y-6">
          {/* Structured Engineering Metadata Blocks */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-100 p-3 rounded border border-slate-300 text-[11px]">
            <div>
              <span className="text-slate-500 text-[9px] uppercase font-bold block">CUSTOMER ACCOUNT:</span>
              <strong className="text-slate-900">ABC MANUFACTURING PVT LTD</strong>
            </div>
            <div>
              <span className="text-slate-500 text-[9px] uppercase font-bold block">DRAWING / PO REFERENCE:</span>
              <strong>PO-2026-00123 • REV-C</strong>
            </div>
            <div>
              <span className="text-slate-500 text-[9px] uppercase font-bold block">DISPATCH STANDARD:</span>
              <strong>EX-WORKS CHAKAN (FREIGHT EXTRA)</strong>
            </div>
          </div>

          {/* Technical Engineering Item Table */}
          <div className="overflow-x-auto border-2 border-slate-800 rounded">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-800 text-white text-[10px] font-black uppercase tracking-wider">
                  <th className="py-2.5 px-3 w-8 border-r border-slate-700">#</th>
                  <th className="py-2.5 px-3 border-r border-slate-700">PART NAME & DRAWING SPECIFICATION</th>
                  <th className="py-2.5 px-3 border-r border-slate-700">MATERIAL</th>
                  <th className="py-2.5 px-3 border-r border-slate-700">PROCESS ROUTE</th>
                  <th className="py-2.5 px-3 border-r border-slate-700 text-center">QTY</th>
                  <th className="py-2.5 px-3 border-r border-slate-700 text-right">UNIT RATE</th>
                  <th className="py-2.5 px-3 text-right">TOTAL</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-300 text-[11px]">
                {sampleItems.map((it) => (
                  <tr key={it.sr} className="hover:bg-orange-50/30">
                    <td className="py-2.5 px-3 border-r border-slate-300 font-bold text-slate-500">{it.sr}</td>
                    <td className="py-2.5 px-3 border-r border-slate-300">
                      <div className="font-bold text-slate-900">{it.name}</div>
                      <div className="text-[10px] text-slate-500">{it.drawing} • {it.spec}</div>
                    </td>
                    <td className="py-2.5 px-3 border-r border-slate-300 font-bold text-slate-800">{it.grade}</td>
                    <td className="py-2.5 px-3 border-r border-slate-300 text-slate-600">{it.process}</td>
                    <td className="py-2.5 px-3 border-r border-slate-300 text-center font-bold text-slate-900">{it.qty}</td>
                    <td className="py-2.5 px-3 border-r border-slate-300 text-right">₹{it.rate}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-slate-950">₹{it.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Machine Shop Totals & Banking */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 pt-2">
            <div className="sm:col-span-6 space-y-3">
              {showBank && (
                <div className="border border-slate-300 rounded p-3 bg-slate-50 text-[11px] space-y-1">
                  <div className="font-bold text-slate-900">BANK SETTLEMENT CODES:</div>
                  <div>BANK: {bankName}</div>
                  <div>A/C NO: {accNo}</div>
                  <div>IFSC: {ifsc}</div>
                </div>
              )}
              {showTerms && (
                <div className="text-[10px] text-slate-500 space-y-0.5">
                  <div>[+] PAYMENT: {payTerms}</div>
                  <div>[+] DELIVERY: {delTerms}</div>
                  <div>[+] INSPECTION: QA Level II with Heat Lot Cert</div>
                </div>
              )}
            </div>

            <div className="sm:col-span-6 bg-orange-50 border-2 border-orange-500 rounded p-4 text-xs space-y-1.5 text-right">
              <div className="flex justify-between text-slate-700">
                <span>1. RAW MAT & PROCESS SUB:</span>
                <span>{subtotal}</span>
              </div>
              <div className="flex justify-between text-slate-700">
                <span>2. OVERHEAD BURDEN (10%):</span>
                <span>{overhead}</span>
              </div>
              <div className="flex justify-between text-slate-700">
                <span>3. PROFIT MARGIN (15%):</span>
                <span>{profit}</span>
              </div>
              <div className="flex justify-between font-bold text-slate-900 border-t border-orange-300 pt-1">
                <span>ASSESSABLE VALUE:</span>
                <span>{taxable}</span>
              </div>
              <div className="flex justify-between text-slate-700">
                <span>STATUTORY GST (18%):</span>
                <span>{gst}</span>
              </div>
              <div className="bg-slate-950 text-orange-400 p-2.5 rounded font-black text-sm flex justify-between items-center mt-2">
                <span>TOTAL COMMERCIAL BID:</span>
                <span>{grandTotal}</span>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-300 flex justify-between items-end text-[10px]">
            <div className="text-slate-400 max-w-sm">{footerText}</div>
            {showSignature && (
              <div className="text-right space-y-8">
                <div className="font-bold">FOR {companyName.toUpperCase()}</div>
                <div className="border-t border-slate-400 pt-1 text-[9px] text-slate-500">
                  WORKS MANAGER / COSTING ENGINEER
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 6. EXECUTIVE
  if (tid === 'modern_two_column' || tid === 'executive') {
    return (
      <div className="w-full bg-white text-slate-800 rounded-xl shadow-md border border-slate-200 overflow-hidden p-8 sm:p-10 space-y-6 text-xs font-sans">
        {/* Large Visual Hierarchy: Executive Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-4 border-b-2 border-slate-900">
          <div className="space-y-2">
            {showLogo && (
              <div className="mb-2">
                <CompanyLogo
                  variant="preview"
                  position={logoPosition}
                  showPlaceholderIfEmpty={true}
                  overrideLogoUrl={profile?.logo_url ?? undefined}
                  maxHeight="46px"
                  maxWidth="140px"
                />
              </div>
            )}
            <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 block">
              MANAGEMENT BRIEFING & COMMERCIAL PROPOSAL
            </span>
            <h2 className="text-2xl font-black text-slate-950 tracking-tight">{companyName}</h2>
            {showContact && <p className="text-xs text-slate-500 mt-1">{address} • {phone}</p>}
          </div>
          <div className="sm:text-right font-mono">
            <span className="bg-slate-900 text-white font-bold text-xs px-3 py-1 rounded-full">
              QT-2026-00428
            </span>
            <div className="text-xs text-slate-500 mt-1.5">Date: 21 Sep 2026</div>
            {showGstin && <div className="text-xs text-slate-500">GSTIN: {gstin}</div>}
          </div>
        </div>

        {/* Executive Summary 2-Column Split */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-1">
            <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block">Target Procurement</span>
            <h4 className="text-sm font-bold text-slate-900">ABC Manufacturing Pvt Ltd</h4>
            <p className="text-xs text-slate-600">Attention: VP Procurement & Supply Chain</p>
            <p className="text-xs text-slate-500">PO Ref: PO-2026-00123</p>
          </div>
          <div className="bg-blue-50/60 rounded-xl p-4 border border-blue-200 flex flex-col justify-center sm:text-right space-y-1">
            <span className="text-[10px] font-bold uppercase text-blue-600 tracking-wider block">Grand Total Offer</span>
            <div className="text-2xl font-black text-blue-900">{grandTotal}</div>
            <div className="text-xs text-blue-700 font-medium">Inclusive of 18% GST • 30-Day Firm Validity</div>
          </div>
        </div>

        {/* Minimal Clutter Item Table */}
        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-700 text-[11px] font-bold uppercase tracking-wider">
                <th className="py-3 px-4">Line Item</th>
                <th className="py-3 px-4">Scope & Specification</th>
                <th className="py-3 px-4 text-center">Batch Quantity</th>
                <th className="py-3 px-4 text-right">Unit Rate (₹)</th>
                <th className="py-3 px-4 text-right">Extended Value (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {sampleItems.map((it) => (
                <tr key={it.sr} className="hover:bg-slate-50/60">
                  <td className="py-3 px-4 font-bold text-slate-900">{it.name}</td>
                  <td className="py-3 px-4 text-slate-500 text-[11px]">{it.spec}</td>
                  <td className="py-3 px-4 text-center font-mono font-bold text-slate-900">{it.qty}</td>
                  <td className="py-3 px-4 text-right font-mono text-slate-700">{it.rate}</td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-slate-950">{it.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Financial Summary & Settlement */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
          <div className="space-y-3">
            {showBank && (
              <div className="border border-slate-200 rounded-xl p-3 bg-slate-50 text-xs space-y-1">
                <div className="font-bold text-slate-800">Settlement Account:</div>
                <div className="text-slate-600">Bank: {bankName} • IFSC: {ifsc}</div>
                <div className="text-slate-600 font-mono">Account No: {accNo}</div>
              </div>
            )}
            {showTerms && (
              <p className="text-[11px] text-slate-500">
                Payment: {payTerms} • Delivery: {delTerms}
              </p>
            )}
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2 text-xs font-mono text-right">
            <div className="flex justify-between text-slate-600">
              <span>Manufacturing Cost Base:</span>
              <span>{subtotal}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Overhead & Profit:</span>
              <span>₹13,913.00</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>GST 18%:</span>
              <span>{gst}</span>
            </div>
            <div className="border-t border-slate-300 pt-2 flex justify-between items-center text-sm font-black text-slate-900">
              <span>Firm Purchase Price:</span>
              <span>{grandTotal}</span>
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-slate-200 flex justify-between items-end">
          <div className="text-[10px] text-slate-400">{footerText}</div>
          {showSignature && (
            <div className="text-right space-y-8 text-xs">
              <div className="font-bold text-slate-800">Authorized by {companyName}</div>
              <div className="border-t border-slate-300 pt-1 font-mono text-[10px] text-slate-500">
                Senior Management Executive
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // 7. COMPACT
  if (tid === 'creative_modern' || tid === 'compact') {
    return (
      <div className="w-full bg-white text-slate-900 rounded-xl shadow-sm border border-slate-300 p-6 space-y-4 text-[11px] font-sans">
        {/* Dense Header Maximizing A4 Space */}
        <div className="flex justify-between items-center border-b-2 border-teal-700 pb-2">
          <div className="flex items-center gap-3">
            {showLogo && (
              <div className="bg-slate-50 border border-teal-200 rounded p-1.5 shrink-0">
                <CompanyLogo
                  variant="preview"
                  position={logoPosition}
                  showPlaceholderIfEmpty={true}
                  overrideLogoUrl={profile?.logo_url ?? undefined}
                  maxHeight="38px"
                  maxWidth="120px"
                />
              </div>
            )}
            <div>
              <h2 className="text-base font-bold text-teal-900 uppercase">{companyName}</h2>
              {showContact && <p className="text-[10px] text-slate-500">{address} • {phone} • {email}</p>}
            </div>
          </div>
          <div className="text-right font-mono">
            <span className="bg-teal-700 text-white px-2 py-0.5 rounded text-[10px] font-bold">
              QT-2026-00428
            </span>
            <div className="text-[10px] text-slate-500 mt-0.5">Date: 21-Sep-2026 • Valid: 30D</div>
          </div>
        </div>

        {/* Compact Metadata Row */}
        <div className="bg-teal-50/60 border border-teal-200 rounded p-2 flex justify-between text-[10px]">
          <div>
            <strong>Client:</strong> ABC Mfg Pvt Ltd (PO Ref: PO-2026-00123)
          </div>
          <div>
            <strong>Statutory:</strong> GSTIN {gstin} • Ex-Works Chakan
          </div>
        </div>

        {/* High Density Table for Many Line Items */}
        <div className="border border-slate-300 rounded overflow-hidden">
          <table className="w-full text-left text-[11px] border-collapse">
            <thead>
              <tr className="bg-teal-900 text-white text-[10px] font-bold uppercase">
                <th className="py-1.5 px-2.5 w-6 text-center">#</th>
                <th className="py-1.5 px-2.5">Item Description & Dimensions</th>
                <th className="py-1.5 px-2.5 text-center">Material</th>
                <th className="py-1.5 px-2.5 text-center">Process</th>
                <th className="py-1.5 px-2.5 text-center">Qty</th>
                <th className="py-1.5 px-2.5 text-right">Unit Rate</th>
                <th className="py-1.5 px-2.5 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {sampleItems.map((it) => (
                <tr key={it.sr} className="hover:bg-slate-50">
                  <td className="py-1.5 px-2.5 text-center font-mono text-slate-400">{it.sr}</td>
                  <td className="py-1.5 px-2.5">
                    <span className="font-bold text-slate-900">{it.name}</span>
                    <span className="text-[10px] text-slate-500 ml-1.5">({it.spec})</span>
                  </td>
                  <td className="py-1.5 px-2.5 text-center font-mono text-slate-700">{it.grade}</td>
                  <td className="py-1.5 px-2.5 text-center text-[10px] text-slate-600">{it.process}</td>
                  <td className="py-1.5 px-2.5 text-center font-mono font-bold text-slate-900">{it.qty}</td>
                  <td className="py-1.5 px-2.5 text-right font-mono">₹{it.rate}</td>
                  <td className="py-1.5 px-2.5 text-right font-mono font-bold text-slate-900">₹{it.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Compressed Terms & Totals Side-by-Side */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 text-[10px]">
          <div className="sm:col-span-7 space-y-1.5">
            {showBank && (
              <div className="border border-slate-200 rounded p-2 bg-slate-50/70">
                <strong>Remittance:</strong> {bankName} • A/C: {accNo} • IFSC: {ifsc}
              </div>
            )}
            <p className="text-slate-500">
              Payment: {payTerms} • Delivery: {delTerms} • {footerText}
            </p>
          </div>

          <div className="sm:col-span-5 bg-teal-50 border border-teal-300 rounded p-3 font-mono space-y-1 text-right">
            <div className="flex justify-between text-slate-600">
              <span>Manufacturing Subtotal:</span>
              <span>{subtotal}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Overhead (10%) + Profit (15%):</span>
              <span>₹13,913.00</span>
            </div>
            <div className="flex justify-between text-slate-700 font-semibold border-t border-teal-200 pt-1">
              <span>Taxable Value:</span>
              <span>{taxable}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>GST (18%):</span>
              <span>{gst}</span>
            </div>
            <div className="bg-teal-900 text-white p-1.5 rounded font-bold text-xs flex justify-between items-center mt-1">
              <span>GRAND TOTAL:</span>
              <span>{grandTotal}</span>
            </div>
          </div>
        </div>

        {showSignature && (
          <div className="pt-2 text-right text-[10px]">
            <span className="border-t border-slate-300 pt-0.5 inline-block text-slate-500 font-mono">
              For {companyName} • Authorized Signatory
            </span>
          </div>
        )}
      </div>
    );
  }

  // 8. MODERN DOCUMENT (DEFAULT / SIMPLE CLEAN)
  return (
    <div className="w-full bg-white text-slate-800 rounded-2xl shadow-md border border-slate-200 overflow-hidden p-8 sm:p-10 space-y-6 text-xs font-sans">
      {/* Contemporary SaaS-Inspired Asymmetric Layout */}
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-6 border-b border-slate-200">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <span className="bg-slate-100 text-slate-700 font-semibold text-[10px] px-2.5 py-1 rounded-full uppercase tracking-wider">
              Commercial Proposal
            </span>
            {showLogo && (
              <CompanyLogo
                variant="preview"
                position={logoPosition}
                showPlaceholderIfEmpty={true}
                overrideLogoUrl={profile?.logo_url ?? undefined}
                maxHeight="42px"
                maxWidth="130px"
              />
            )}
          </div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">{companyName}</h2>
          {showContact && <p className="text-xs text-slate-500">{address} • {phone}</p>}
          {showGstin && <p className="text-xs font-mono text-slate-600">GSTIN: {gstin}</p>}
        </div>
        <div className="sm:text-right font-mono space-y-1">
          <div className="text-sm font-bold text-blue-600">QT-2026-00428</div>
          <div className="text-xs text-slate-500">Issued: 21 Sep 2026</div>
          <div className="text-xs text-slate-400">Validity: 30 Days</div>
        </div>
      </div>

      {/* Pill Badge Group & Metadata */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-1">
          <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block">Customer</span>
          <div className="text-sm font-bold text-slate-900">ABC Manufacturing Pvt Ltd</div>
          <p className="text-xs text-slate-500">PO Ref: PO-2026-00123</p>
        </div>
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-1 sm:text-right">
          <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block">Pricing Policy</span>
          <div className="text-xs font-bold text-slate-800">INR Ex-Works Delivery</div>
          <p className="text-xs text-slate-500">GST Standard Statutory CGST/SGST (18%)</p>
        </div>
      </div>

      {/* Modern Card Table */}
      <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-900 text-white text-[11px] font-bold uppercase tracking-wider">
              <th className="py-3 px-4">#</th>
              <th className="py-3 px-4">Item & Technical Spec</th>
              <th className="py-3 px-4 text-center">Grade</th>
              <th className="py-3 px-4 text-center">Qty</th>
              <th className="py-3 px-4 text-right">Unit Rate (₹)</th>
              <th className="py-3 px-4 text-right">Amount (₹)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {sampleItems.map((it) => (
              <tr key={it.sr} className="hover:bg-slate-50/80">
                <td className="py-3 px-4 font-mono text-slate-400">{it.sr}</td>
                <td className="py-3 px-4">
                  <div className="font-bold text-slate-900">{it.name}</div>
                  <div className="text-[11px] text-slate-500">{it.spec}</div>
                </td>
                <td className="py-3 px-4 text-center font-mono text-slate-700">{it.grade}</td>
                <td className="py-3 px-4 text-center font-mono font-bold text-slate-900">{it.qty}</td>
                <td className="py-3 px-4 text-right font-mono text-slate-700">{it.rate}</td>
                <td className="py-3 px-4 text-right font-mono font-bold text-slate-950">{it.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modern Summary Treatment */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 pt-2">
        <div className="sm:col-span-7 space-y-3">
          {showBank && (
            <div className="border border-slate-200 rounded-xl p-3.5 bg-slate-50 text-xs space-y-1">
              <div className="font-bold text-slate-800">Electronic Bank Transfer:</div>
              <div className="text-slate-600">Bank: {bankName} • IFSC: {ifsc}</div>
              <div className="text-slate-600 font-mono">Account No: {accNo}</div>
            </div>
          )}
          {showTerms && (
            <div className="text-[11px] text-slate-500 space-y-0.5">
              <div>• Payment: {payTerms}</div>
              <div>• Delivery: {delTerms}</div>
            </div>
          )}
        </div>

        <div className="sm:col-span-5 bg-slate-900 text-white rounded-xl p-4 font-mono text-xs space-y-1.5 shadow-md">
          <div className="flex justify-between text-slate-300">
            <span>Subtotal:</span>
            <span>{subtotal}</span>
          </div>
          <div className="flex justify-between text-slate-300">
            <span>Overhead (10%):</span>
            <span>{overhead}</span>
          </div>
          <div className="flex justify-between text-slate-300">
            <span>Profit Margin (15%):</span>
            <span>{profit}</span>
          </div>
          <div className="flex justify-between text-slate-300 border-t border-slate-800 pt-1">
            <span>Taxable Amount:</span>
            <span>{taxable}</span>
          </div>
          <div className="flex justify-between text-slate-300">
            <span>GST (18%):</span>
            <span>{gst}</span>
          </div>
          <div className="bg-blue-600 text-white p-2.5 rounded-lg font-bold text-sm flex justify-between items-center mt-2">
            <span>GRAND TOTAL:</span>
            <span>{grandTotal}</span>
          </div>
        </div>
      </div>

      {/* Clean Modern Footer */}
      <div className="pt-6 border-t border-slate-200 flex justify-between items-end">
        <div className="text-[10px] text-slate-400 max-w-sm">{footerText}</div>
        {showSignature && (
          <div className="text-right space-y-8 text-xs">
            <div className="font-bold text-slate-800">For {companyName}</div>
            <div className="border-t border-slate-300 pt-1 font-mono text-[10px] text-slate-500">
              Authorized Signatory
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
