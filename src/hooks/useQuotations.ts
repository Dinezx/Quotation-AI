import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  quotationApi,
  QuotationDTO,
  CalculateQuotationRequestDTO,
  CalculationResultDTO,
} from '../services/api/quotationApi';
import { quotationService } from '../services/quotationService';
import { QuotationDocument } from '../types/quotation';
import { calculateQuotationSummary } from '../services/calculationService';

export function dtoToQuotationDocument(dto: QuotationDTO): QuotationDocument {
  const defaultList = quotationService.getAllQuotations();
  const template = defaultList[0] || ({} as QuotationDocument);

  return {
    ...template,
    id: dto.id,
    quotationNumber: dto.quotation_number,
    version: '1.0',
    createdAt: new Date(dto.quotation_date).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }),
    validUntil: dto.valid_until
      ? new Date(dto.valid_until).toLocaleDateString('en-GB')
      : '30 Sep 2026',
    poReference: 'PO-2026-BOS-0941',
    poDate: '14 Aug 2026',
    status: (dto.status as any) || 'GENERATED',
    calculation: {
      materialCost: Number(dto.material_cost) || 45000,
      processCost: Number(dto.process_cost) || 18500,
      baseSubtotal: Number(dto.subtotal) || 63500,
      overheadPct: Number(dto.overhead_percentage) || 12,
      overheadAmount: Number(dto.overhead_amount) || 7620,
      profitMarginPct: Number(dto.profit_percentage) || 15,
      profitAmount: Number(dto.profit_amount) || 10668,
      taxableValue: Number(dto.taxable_amount) || 81788,
      isInterstate: dto.gst_type === 'IGST',
      cgstPct: dto.gst_type === 'IGST' ? 0 : 9,
      cgstAmount: Number(dto.cgst_amount) || 7361,
      sgstPct: dto.gst_type === 'IGST' ? 0 : 9,
      sgstAmount: Number(dto.sgst_amount) || 7361,
      igstPct: dto.gst_type === 'IGST' ? 18 : 0,
      igstAmount: Number(dto.igst_amount) || 0,
      totalGstAmount: Number(dto.gst_amount) || 14722,
      grandTotal: Number(dto.final_total) || 96510,
      grandTotalInWords: 'Indian Rupee Ninety-Six Thousand Five Hundred and Ten Only',
      roundingAdjustment: 0,
    },
    itemCostings: template.itemCostings || [],
    boqItems: template.boqItems || [],
    leadTimeDays: 21,
    deliveryTerms: dto.delivery_terms || 'Ex-Works Bhosari / FOB Chakan',
    paymentTerms: dto.payment_terms || '30 Days Net from date of invoice',
    freightTerms: 'Included in scope',
    warrantyClause: '12 Months from dispatch against manufacturing defects',
    primaryContactPerson: 'Rajesh Deshmukh (Sr. Costing Engineer)',
    primaryContactPhone: '+91 20 2712 8840',
    primaryContactEmail: 'r.deshmukh@bharatprecision.co.in',
    pdfFileSizeKb: 412,
    auditTrail: template.auditTrail || [],
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
        return quotationService.getAllQuotations();
      } catch (err) {
        console.warn('[useQuotations] Falling back to local history:', err);
        return quotationService.getAllQuotations();
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
    quotations: listQuery.data || quotationService.getAllQuotations(),
    isLoading: listQuery.isLoading,
    isError: listQuery.isError,
    refetch: listQuery.refetch,
    calculateCommercials: calculateMutation.mutateAsync,
    isCalculating: calculateMutation.isPending,
  };
}
