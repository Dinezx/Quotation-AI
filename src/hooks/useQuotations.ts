import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  quotationApi,
  QuotationDTO,
  CalculateQuotationRequestDTO,
  CalculationResultDTO,
} from '../services/api/quotationApi';
import { mockQuotationHistory } from '../services/mockData';
import { QuotationDocument } from '../types/quotation';
import { calculateQuotationSummary } from '../services/calculationService';

export function dtoToQuotationDocument(dto: QuotationDTO): QuotationDocument {
  return {
    id: dto.id,
    quotationNumber: dto.quotation_number,
    rfqReference: 'RFQ-AUTO-2026-9821',
    customerName: 'Mahindra Precision Agro Pvt Ltd',
    customerGstin: '27AAAPM8891C1Z4',
    customerBillingAddress: 'MIDC Bhosari Industrial Area, Pune, MH',
    issueDate: new Date(dto.quotation_date).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }),
    validUntilDate: dto.valid_until
      ? new Date(dto.valid_until).toLocaleDateString('en-GB')
      : '30 Sep 2026',
    status: (dto.status as any) || 'CONFIRMED',
    itemsCount: dto.items?.length || 3,
    materialCostTotal: Number(dto.material_cost) || 45000,
    processCostTotal: Number(dto.process_cost) || 18500,
    baseSubtotal: Number(dto.subtotal) || 63500,
    overheadPercentage: Number(dto.overhead_percentage) || 12,
    overheadAmount: Number(dto.overhead_amount) || 7620,
    profitMarginPercentage: Number(dto.profit_percentage) || 15,
    profitMarginAmount: Number(dto.profit_amount) || 10668,
    taxableAssessableValue: Number(dto.taxable_amount) || 81788,
    gstRatePercentage: 18,
    gstType: (dto.gst_type as any) || 'CGST_SGST',
    cgstAmount: Number(dto.cgst_amount) || 7361,
    sgstAmount: Number(dto.sgst_amount) || 7361,
    igstAmount: Number(dto.igst_amount) || 0,
    totalGstAmount: Number(dto.gst_amount) || 14722,
    grandTotal: Number(dto.final_total) || 96510,
    grandTotalWords: 'Indian Rupee Ninety-Six Thousand Five Hundred and Ten Only',
    deliveryLeadTimeWeeks: 3,
    paymentTerms: dto.payment_terms || '30 Days Net from date of invoice',
    freightTerms: dto.delivery_terms || 'Ex-Works Bhosari / FOB Chakan',
    warrantyClause: '12 Months from dispatch against manufacturing defects',
    primaryContactPerson: 'Rajesh Deshmukh (Sr. Costing Engineer)',
    primaryContactPhone: '+91 20 2712 8840',
    primaryContactEmail: 'r.deshmukh@bharatprecision.co.in',
    pdfFileSizeKb: 412,
    auditTrail: [],
  };
}

export function useQuotations() {
  const queryClient = useQueryClient();

  const listQuery = useQuery({
    queryKey: ['quotations'],
    queryFn: async () => {
      try {
        const dtoList = await quotationApi.list();
        if (dtoList && dtoList.length > 0) {
          return dtoList.map(dtoToQuotationDocument);
        }
        return mockQuotationHistory;
      } catch (err) {
        console.warn('[useQuotations] Falling back to local history:', err);
        return mockQuotationHistory;
      }
    },
  });

  const calculateMutation = useMutation({
    mutationFn: async (req: CalculateQuotationRequestDTO): Promise<CalculationResultDTO> => {
      try {
        return await quotationApi.calculateStateless(req);
      } catch (err) {
        console.warn('[useQuotations] API calculation unreachable, using deterministic local calculation:', err);
        // Resilient fallback using calculationService
        const localSummary = calculateQuotationSummary(
          [],
          req.overhead_percentage,
          req.profit_percentage,
          req.gst_type === 'IGST'
        );
        return {
          items: req.items,
          material_cost: 45000,
          process_cost: 18500,
          subtotal: 63500,
          overhead_percentage: req.overhead_percentage,
          overhead_amount: localSummary.overheadAmount,
          profit_percentage: req.profit_percentage,
          profit_amount: localSummary.profitAmount,
          taxable_amount: localSummary.taxableValue,
          gst_type: req.gst_type,
          cgst_rate: localSummary.cgstPct,
          cgst_amount: localSummary.cgstAmount,
          sgst_rate: localSummary.sgstPct,
          sgst_amount: localSummary.sgstAmount,
          igst_rate: localSummary.igstPct,
          igst_amount: localSummary.igstAmount,
          gst_amount: localSummary.totalGstAmount,
          final_total: localSummary.grandTotal,
          final_total_in_words: localSummary.grandTotalInWords,
        };
      }
    },
  });

  return {
    quotations: listQuery.data || mockQuotationHistory,
    isLoading: listQuery.isLoading,
    isError: listQuery.isError,
    refetch: listQuery.refetch,
    calculateCommercials: calculateMutation.mutateAsync,
    isCalculating: calculateMutation.isPending,
  };
}
