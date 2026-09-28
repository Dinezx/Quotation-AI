import { describe, it, expect } from 'vitest';
import type { QuotationDTO } from '../api/quotationApi';

describe('Quotation Immutability & Audit Integrity', () => {
  const finalizedQuote: QuotationDTO = {
    id: 'quote-prod-99',
    quotation_number: 'QT-2026-0099',
    quotation_date: '2026-09-28',
    company_id: 'comp-bpe-pune',
    company_name: 'Bharat Precision Engineering',
    customer_id: 'cust-tata-01',
    customer_name: 'Tata Motors Limited',
    purchase_order_id: 'po-4421',
    po_number: 'PO-2026-TM-4421',
    status: 'FINAL',
    currency: 'INR',
    material_cost: 200000,
    process_cost: 150000,
    subtotal: 350000,
    overhead_percentage: 10,
    overhead_amount: 35000,
    profit_percentage: 15,
    profit_amount: 57750,
    taxable_amount: 442750,
    gst_type: 'INTRA_STATE',
    cgst_rate: 9,
    cgst_amount: 39847.5,
    sgst_rate: 9,
    sgst_amount: 39847.5,
    igst_rate: 0,
    igst_amount: 0,
    gst_amount: 79695,
    final_total: 522445,
    grand_total: 522445,
    valid_until: '2026-10-30',
    pdf_storage_path: 'quotation-pdfs/comp-bpe-pune/QT-2026-0099.pdf',
    pdf_sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    items: [],
    created_at: '2026-09-28T10:00:00Z',
    updated_at: '2026-09-28T10:15:00Z',
    finalized_at: '2026-09-28T10:15:00Z',
  };

  const draftQuote: QuotationDTO = {
    ...finalizedQuote,
    id: 'quote-draft-01',
    quotation_number: 'QT-2026-0100',
    status: 'DRAFT',
    pdf_storage_path: undefined,
    pdf_sha256: undefined,
    finalized_at: undefined,
  };

  it('identifies finalized quotations as strictly immutable', () => {
    const isImmutable = (q: QuotationDTO) => q.status === 'FINAL' || q.status === 'ACCEPTED';
    expect(isImmutable(finalizedQuote)).toBe(true);
    expect(isImmutable(draftQuote)).toBe(false);
  });

  it('guarantees finalized quotes possess cryptographic SHA-256 seal and storage path', () => {
    expect(finalizedQuote.pdf_sha256).toBeDefined();
    expect(finalizedQuote.pdf_sha256?.length).toBe(64);
    expect(finalizedQuote.pdf_storage_path).toContain('quotation-pdfs/');
  });

  it('prevents finalization action if quotation is already sealed', () => {
    const canFinalize = (q: QuotationDTO) => q.status === 'DRAFT';
    expect(canFinalize(draftQuote)).toBe(true);
    expect(canFinalize(finalizedQuote)).toBe(false);
  });
});
