import React from 'react';
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
  const showContact = config.show_company_contact !== false;
  const showGstin = config.show_gstin !== false;
  const showBank = config.show_bank_details !== false;
  const showTerms = config.show_terms !== false;
  const showSignature = config.show_signature !== false;
  const logoPos = config.logo_position || 'left';

  const companyName = profile?.name || 'Bharat Precision Engineering Pvt. Ltd.';
  const gstin = profile?.gstin || '27AAACB1234F1Z8';
  const address = profile?.address || 'Plot W-42, MIDC Industrial Area, Phase II, Bhosari, Pune - 411026';
  const phone = profile?.phone || '+91 20 2712 8840';
  const email = profile?.email || 'contact@bharatprecision.co.in';

  const bankName = bank?.bank_name || 'State Bank of India';
  const accNo = bank?.account_number || '38920194821';
  const ifsc = bank?.ifsc || 'SBIN0004128';

  const payTerms = defaults?.payment_terms || '30 Days from date of invoice';
  const delTerms = defaults?.delivery_terms || 'Ex-Works, Bhosari Plant';
  const footerText = config.footer_text || 'This is a computer-generated commercial quotation. Standard tolerances apply.';

  // If thumbnail, render compact proportional scale
  if (isThumbnail) {
    return (
      <div className="w-full aspect-[1/1.414] bg-white border border-slate-200 rounded shadow-xs overflow-hidden flex flex-col p-2 text-[5px] select-none pointer-events-none">
        {/* Thumbnail Header Variant */}
        {templateId === 'premium_corporate' ? (
          <div className="bg-slate-900 text-white p-1 rounded-t flex justify-between items-center mb-1">
            <div className="font-bold truncate max-w-[70%]">{companyName}</div>
            <div className="text-[4px] text-amber-400 font-mono">QUOTATION</div>
          </div>
        ) : templateId === 'industrial_bold' ? (
          <div className="border-b-2 border-amber-500 pb-1 mb-1 flex justify-between items-center">
            <div className="font-extrabold text-slate-900 uppercase truncate max-w-[70%]">{companyName}</div>
            <div className="bg-slate-900 text-white px-1 py-0.2 text-[4px] font-bold">QT-2026</div>
          </div>
        ) : templateId === 'creative_modern' ? (
          <div className="border-l-2 pl-1 mb-1 flex justify-between items-center" style={{ borderColor: primaryColor }}>
            <div className="font-bold truncate max-w-[70%]" style={{ color: primaryColor }}>{companyName}</div>
            <div className="text-[4px] text-slate-500 font-mono">#QT-001</div>
          </div>
        ) : templateId === 'modern_two_column' ? (
          <div className="grid grid-cols-2 gap-1 border-b border-slate-200 pb-1 mb-1">
            <div className="font-bold truncate text-slate-900">{companyName}</div>
            <div className="text-right text-[4px] text-slate-500">QUOTATION • 2026</div>
          </div>
        ) : templateId === 'elegant_bordered' ? (
          <div className="border border-slate-300 p-0.5 mb-1 text-center">
            <div className="font-serif font-bold text-slate-900">{companyName}</div>
            <div className="text-[4px] text-slate-500">COMMERCIAL ESTIMATE</div>
          </div>
        ) : (
          <div className="border-b border-slate-200 pb-1 mb-1 flex justify-between items-center">
            <div className="font-bold truncate max-w-[70%]" style={{ color: primaryColor }}>{companyName}</div>
            <div className="text-[4px] font-semibold text-slate-500">QUOTATION</div>
          </div>
        )}

        {/* Mini Customer Section */}
        <div className="bg-slate-50 p-1 rounded mb-1 text-[4px] text-slate-600 flex justify-between">
          <span>Customer: ABC Mfg Pvt Ltd</span>
          <span>PO: PO-2026-00123</span>
        </div>

        {/* Mini Table */}
        <div className="flex-1 flex flex-col space-y-0.5">
          <div className="flex justify-between font-bold text-slate-700 border-b border-slate-200 pb-0.5">
            <span>Item / Desc</span>
            <span>Qty</span>
            <span>Total</span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span className="truncate max-w-[60%]">1. Precision Shaft EN8</span>
            <span>10</span>
            <span>₹15,000</span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span className="truncate max-w-[60%]">2. Heavy Housing EN19</span>
            <span>5</span>
            <span>₹17,000</span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span className="truncate max-w-[60%]">3. Cover Plate MS</span>
            <span>20</span>
            <span>₹20,500</span>
          </div>
        </div>

        {/* Mini Totals */}
        <div className="border-t border-slate-200 pt-1 mt-auto text-right text-[4.5px]">
          <div className="text-slate-500">Taxable: ₹66,413 | GST (18%): ₹11,954</div>
          <div className="font-bold text-slate-900" style={{ color: primaryColor }}>
            Grand Total: ₹78,367
          </div>
        </div>
      </div>
    );
  }

  // Full Detailed A4 Interactive Preview
  return (
    <div
      className={`w-full bg-white text-slate-800 rounded-xl shadow-md border overflow-hidden p-6 md:p-8 space-y-5 text-xs font-sans ${
        templateId === 'elegant_bordered' ? 'border-2 border-slate-400 p-7' : 'border-slate-200'
      }`}
      style={{ fontFamily: config.font_family || 'Inter, system-ui, sans-serif' }}
    >
      {/* 1. Header Variations */}
      {templateId === 'premium_corporate' ? (
        <div className="bg-slate-950 text-white p-5 -mx-6 -mt-6 md:-mx-8 md:-mt-8 mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b-2" style={{ borderColor: primaryColor }}>
          <div className="flex items-center gap-3">
            {showLogo && profile?.logo_url && (
              <img src={profile.logo_url} alt="Logo" className="h-10 w-10 object-contain rounded bg-white/10 p-1" />
            )}
            <div>
              <h2 className="text-base font-bold tracking-tight text-white uppercase">{companyName}</h2>
              {showContact && (
                <p className="text-[11px] text-slate-400">{address} • {phone}</p>
              )}
            </div>
          </div>
          <div className="text-right sm:text-right font-mono text-[11px] text-slate-300">
            <div className="text-xs font-bold uppercase tracking-wider text-amber-400">COMMERCIAL QUOTATION</div>
            <div>QT-2026-00428</div>
            {showGstin && <div>GSTIN: {gstin}</div>}
          </div>
        </div>
      ) : templateId === 'industrial_bold' ? (
        <div className="border-b-4 pb-4 mb-2 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4" style={{ borderColor: primaryColor }}>
          <div className="flex items-center gap-3">
            {showLogo && profile?.logo_url && (
              <img src={profile.logo_url} alt="Logo" className="h-10 w-10 object-contain" />
            )}
            <div>
              <h2 className="text-lg font-black tracking-tight text-slate-950 uppercase">{companyName}</h2>
              {showContact && (
                <p className="text-[11px] text-slate-600 font-medium">{address} • {phone} • {email}</p>
              )}
            </div>
          </div>
          <div className="bg-slate-900 text-white px-3 py-2 rounded font-mono text-right text-xs">
            <div className="font-bold text-amber-400">QUOTATION #QT-2026-00428</div>
            {showGstin && <div className="text-[10px] text-slate-300">GSTIN: {gstin}</div>}
          </div>
        </div>
      ) : templateId === 'modern_two_column' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4 border-b border-slate-200">
          <div className="space-y-1">
            {showLogo && profile?.logo_url && (
              <img src={profile.logo_url} alt="Logo" className="h-9 w-auto object-contain mb-1" />
            )}
            <h2 className="text-base font-bold text-slate-950">{companyName}</h2>
            {showContact && <p className="text-slate-500 text-[11px]">{address}</p>}
            {showContact && <p className="text-slate-500 text-[11px]">{phone} • {email}</p>}
            {showGstin && <p className="text-slate-700 font-mono text-[11px]">GSTIN: {gstin}</p>}
          </div>
          <div className="md:text-right space-y-1 font-mono">
            <span className="inline-block px-2.5 py-1 rounded text-xs font-bold text-white mb-1" style={{ backgroundColor: primaryColor }}>
              QUOTATION
            </span>
            <div className="text-slate-900 font-bold text-sm">QT-2026-00428</div>
            <div className="text-slate-500 text-xs">Date: 21 Sep 2026</div>
            <div className="text-slate-500 text-xs">Valid Until: 30 Days</div>
          </div>
        </div>
      ) : templateId === 'creative_modern' ? (
        <div className="border-l-4 pl-4 py-1 pb-3 mb-2 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4" style={{ borderColor: primaryColor }}>
          <div>
            <h2 className="text-base font-bold tracking-tight uppercase" style={{ color: primaryColor }}>{companyName}</h2>
            {showContact && <p className="text-[11px] text-slate-500">{address} • {phone}</p>}
          </div>
          <div className="text-right font-mono text-xs">
            <div className="font-bold text-slate-900">REF: QT-2026-00428</div>
            {showGstin && <div className="text-slate-500">GSTIN: {gstin}</div>}
          </div>
        </div>
      ) : templateId === 'elegant_bordered' ? (
        <div className="text-center pb-4 border-b-2 border-slate-300 mb-2 space-y-1">
          <h2 className="text-lg font-serif font-bold text-slate-900 uppercase tracking-widest">{companyName}</h2>
          {showContact && <p className="text-slate-500 text-[11px]">{address} • Tel: {phone} • Email: {email}</p>}
          {showGstin && <p className="font-mono text-slate-700 text-[11px]">GSTIN: {gstin}</p>}
          <div className="pt-2">
            <span className="font-serif italic text-xs font-semibold uppercase tracking-wider text-slate-700 border-y border-slate-300 py-0.5 px-4 inline-block">
              Formal Commercial Quotation — Ref: QT-2026-00428
            </span>
          </div>
        </div>
      ) : (
        /* Classic / Modern Minimal / Simple Clean Default */
        <div className={`pb-3 border-b flex justify-between items-start ${
          logoPos === 'center' ? 'flex-col items-center text-center' : ''
        }`} style={{ borderColor: secondaryColor }}>
          <div className="space-y-0.5">
            {showLogo && profile?.logo_url && (
              <img src={profile.logo_url} alt="Logo" className="h-9 w-auto object-contain mb-1" />
            )}
            <h2 className="text-base font-bold text-slate-900" style={{ color: primaryColor }}>{companyName}</h2>
            {showContact && <p className="text-[11px] text-slate-500">{address}</p>}
            {showContact && <p className="text-[11px] text-slate-500">Tel: {phone} | Email: {email}</p>}
            {showGstin && <p className="text-[11px] font-mono text-slate-600">GSTIN: {gstin}</p>}
          </div>
          <div className={`font-mono text-right ${logoPos === 'center' ? 'mt-2 text-center' : ''}`}>
            <div className="text-xs font-bold text-slate-900">QUOTATION</div>
            <div className="text-[11px] text-slate-600">No: QT-2026-00428</div>
            <div className="text-[11px] text-slate-500">Date: 21 Sep 2026</div>
          </div>
        </div>
      )}

      {/* 2. Customer & Reference Banner */}
      <div className="bg-slate-50/80 border border-slate-200 rounded-lg p-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
        <div>
          <span className="text-slate-400 uppercase font-semibold text-[10px] block">Quotation For:</span>
          <strong className="text-slate-900 text-xs">ABC Manufacturing Pvt. Ltd.</strong>
          <p className="text-slate-600">Attn: Procurement Team • Chakan Industrial Area, Pune</p>
        </div>
        <div className="sm:text-right">
          <span className="text-slate-400 uppercase font-semibold text-[10px] block">PO & Terms Reference:</span>
          <p className="font-mono text-slate-800">PO Ref: <strong>PO-2026-00123</strong> (Date: 20 Sep 2026)</p>
          <p className="text-slate-600">Validity: 30 Days • Currency: INR (₹)</p>
        </div>
      </div>

      {/* 3. Items Table */}
      <div className="overflow-x-auto border border-slate-200 rounded-lg">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr
              className="text-white text-[11px] font-semibold uppercase tracking-wider"
              style={{ backgroundColor: templateId === 'simple_clean' ? '#334155' : primaryColor }}
            >
              <th className="py-2.5 px-3 w-10 text-center">#</th>
              <th className="py-2.5 px-3">Description / Specification</th>
              <th className="py-2.5 px-3 text-center">Qty</th>
              <th className="py-2.5 px-3 text-right">Unit Rate (₹)</th>
              <th className="py-2.5 px-3 text-right">Amount (₹)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-[11px]">
            <tr className="hover:bg-slate-50/50">
              <td className="py-2 px-3 text-center font-mono text-slate-500">01</td>
              <td className="py-2 px-3">
                <div className="font-medium text-slate-900">Precision Pinion Shaft - EN8</div>
                <div className="text-[10px] text-slate-500">OD 45mm x 220mm length • Induction Hardened</div>
              </td>
              <td className="py-2 px-3 text-center font-mono font-bold">10 PCS</td>
              <td className="py-2 px-3 text-right font-mono">1,500.00</td>
              <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">15,000.00</td>
            </tr>
            <tr className="hover:bg-slate-50/50">
              <td className="py-2 px-3 text-center font-mono text-slate-500">02</td>
              <td className="py-2 px-3">
                <div className="font-medium text-slate-900">Heavy CNC Housing - EN19</div>
                <div className="text-[10px] text-slate-500">Cast steel machined block • Tolerance +/- 0.02mm</div>
              </td>
              <td className="py-2 px-3 text-center font-mono font-bold">5 PCS</td>
              <td className="py-2 px-3 text-right font-mono">3,400.00</td>
              <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">17,000.00</td>
            </tr>
            <tr className="hover:bg-slate-50/50">
              <td className="py-2 px-3 text-center font-mono text-slate-500">03</td>
              <td className="py-2 px-3">
                <div className="font-medium text-slate-900">Flanged Cover Plate - MS 2062</div>
                <div className="text-[10px] text-slate-500">Laser cut and drilled • Zinc phosphate coated</div>
              </td>
              <td className="py-2 px-3 text-center font-mono font-bold">20 PCS</td>
              <td className="py-2 px-3 text-right font-mono">1,025.00</td>
              <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">20,500.00</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* 4. Commercial Summary Block */}
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pt-2">
        {/* Bank & Payment Info */}
        <div className="w-full sm:w-1/2 space-y-2">
          {showBank && (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-[11px] space-y-1">
              <div className="font-bold text-slate-900 flex items-center justify-between">
                <span>Bank Settlement Details:</span>
                <span className="text-[10px] font-mono text-slate-500">NEFT / RTGS</span>
              </div>
              <div className="grid grid-cols-2 gap-x-2 text-slate-600">
                <span>Bank: <strong>{bankName}</strong></span>
                <span>IFSC: <strong className="font-mono">{ifsc}</strong></span>
                <span className="col-span-2">A/C No: <strong className="font-mono">{accNo}</strong></span>
              </div>
            </div>
          )}

          {showTerms && (
            <div className="text-[10px] text-slate-500 space-y-0.5">
              <div>• <strong>Payment:</strong> {payTerms}</div>
              <div>• <strong>Delivery:</strong> {delTerms}</div>
              <div>• <strong>Inspection:</strong> Pre-dispatch QA inspection with 3.1 material test certificate</div>
            </div>
          )}
        </div>

        {/* Totals Table */}
        <div className="w-full sm:w-5/12 bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs space-y-1.5 font-mono">
          <div className="flex justify-between text-slate-600">
            <span>Material & Process:</span>
            <span>₹52,500.00</span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>Overhead (10%):</span>
            <span>₹5,250.00</span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>Profit Margin (15%):</span>
            <span>₹8,663.00</span>
          </div>
          <div className="flex justify-between font-semibold text-slate-800 border-t border-slate-200 pt-1">
            <span>Taxable Amount:</span>
            <span>₹66,413.00</span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>CGST (9%) + SGST (9%):</span>
            <span>₹11,954.00</span>
          </div>
          <div
            className="flex justify-between items-center font-bold text-sm text-white p-2 rounded mt-1"
            style={{ backgroundColor: primaryColor }}
          >
            <span>Grand Total:</span>
            <span>₹78,367.00</span>
          </div>
          <div className="text-[9px] font-sans text-slate-500 text-right pt-0.5">
            Amount in words: Seventy-Eight Thousand Three Hundred Sixty-Seven Rupees Only
          </div>
        </div>
      </div>

      {/* 5. Signature & Footer Block */}
      <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-end gap-4">
        <div className="text-[10px] text-slate-400 max-w-sm">
          <p>{footerText}</p>
        </div>
        {showSignature && (
          <div className="text-right text-[11px] font-medium space-y-6">
            <div className="text-slate-600">For <strong>{companyName}</strong></div>
            <div className="border-t border-slate-300 pt-1 text-[10px] text-slate-500 font-mono">
              Authorized Signatory
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
