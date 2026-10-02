import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  quotationApi,
  QuotationDTO,
  CalculateQuotationRequestDTO,
  CalculationResultDTO,
} from '../api/quotationApi';
import { QuotationDocument } from '../types/quotation';

export function dtoToQuotationDocument(dto: QuotationDTO): QuotationDocument {
  return {
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
      : '30 Days',
    poReference: dto.po_number || 'N/A',
    poDate: dto.po_date ? new Date(dto.po_date).toLocaleDateString('en-GB') : '',
    customer: {
      name: dto.customer_name || 'Customer Master',
      gstin: dto.customer_gstin || '27AAACM0012P1ZX',
      poNumber: dto.po_number || 'N/A',
      poDate: dto.po_date ? new Date(dto.po_date).toLocaleDateString('en-GB') : '',
      deliveryDueDate: '',
      billingAddress: dto.customer_address || 'Factory Receiving Hub',
      contactPerson: 'Procurement Authority',
      email: dto.customer_email || 'procurement@customer.com',
      phone: '',
    },
    status: (dto.status as any) || 'DRAFT',
    calculation: {
      materialCost: Number(dto.material_cost) || 0,
      processCost: Number(dto.process_cost) || 0,
      baseSubtotal: Number(dto.subtotal) || 0,
      overheadPct: Number(dto.overhead_percentage) || 0,
      overheadAmount: Number(dto.overhead_amount) || 0,
      profitMarginPct: Number(dto.profit_percentage) || 0,
      profitAmount: Number(dto.profit_amount) || 0,
      taxableValue: Number(dto.taxable_amount) || 0,
      isInterstate: dto.gst_type === 'IGST',
      cgstPct: dto.gst_type === 'IGST' ? 0 : Number(dto.cgst_rate) || 9,
      cgstAmount: Number(dto.cgst_amount) || 0,
      sgstPct: dto.gst_type === 'IGST' ? 0 : Number(dto.sgst_rate) || 9,
      sgstAmount: Number(dto.sgst_amount) || 0,
      igstPct: dto.gst_type === 'IGST' ? Number(dto.igst_rate) || 18 : 0,
      igstAmount: Number(dto.igst_amount) || 0,
      totalGstAmount: Number(dto.gst_amount) || 0,
      grandTotal: Number(dto.final_total) || 0,
      grandTotalInWords: dto.final_total_in_words || '',
      roundingAdjustment: 0,
    },
    itemCostings: [],
    boqItems: [],
    leadTimeDays: 21,
    deliveryTerms: dto.delivery_terms || 'Ex-Works Bhosari / FOB Chakan',
    paymentTerms: dto.payment_terms || '30 Days Net from date of invoice',
    freightTerms: 'Included in scope',
    warrantyClause: '12 Months from dispatch against manufacturing defects',
    primaryContactPerson: dto.prepared_by || 'Sr. Costing Engineer',
    primaryContactPhone: '',
    primaryContactEmail: '',
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
        return (dtoList || []).map(dtoToQuotationDocument);
      } catch (err) {
        console.error('[useQuotations] Error loading quotations:', err);
        return [];
      }
    },
  });

  const calculateMutation = useMutation({
    mutationFn: async (req: CalculateQuotationRequestDTO): Promise<CalculationResultDTO> => {
      return await quotationApi.calculateStateless(req);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
    },
  });

  return {
    quotations: listQuery.data || [],
    isLoading: listQuery.isLoading,
    isError: listQuery.isError,
    refetch: listQuery.refetch,
    calculateCommercials: calculateMutation.mutateAsync,
    isCalculating: calculateMutation.isPending,
  };
}
