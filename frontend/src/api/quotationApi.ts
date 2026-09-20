import { apiClient } from './apiClient';

export interface QuotationItemDTO {
  id: string;
  quotation_id: string;
  purchase_order_item_id?: string;
  item_number: number;
  part_name: string;
  specification?: string;
  drawing_number?: string;
  material?: string;
  process?: string;
  quantity: number;
  unit: string;
  gross_material_cost: number;
  scrap_credit: number;
  net_material_cost: number;
  machining_cost: number;
  setup_cost: number;
  process_cost: number;
  subtotal: number;
  unit_cost: number;
  unit_price: number;
  total_price: number;
  created_at: string;
  updated_at: string;
}

export interface QuotationDTO {
  id: string;
  company_id: string;
  customer_id?: string;
  purchase_order_id?: string;
  quotation_number: string;
  quotation_date: string;
  valid_until?: string;
  currency: string;
  material_cost: number;
  process_cost: number;
  subtotal: number;
  overhead_percentage: number;
  overhead_amount: number;
  profit_percentage: number;
  profit_amount: number;
  taxable_amount: number;
  gst_type: string;
  cgst_rate: number;
  cgst_amount: number;
  sgst_rate: number;
  sgst_amount: number;
  igst_rate: number;
  igst_amount: number;
  gst_amount: number;
  final_total: number;
  status: string;
  pdf_url?: string;
  notes?: string;
  payment_terms?: string;
  delivery_terms?: string;
  inspection_terms?: string;
  prepared_by?: string;
  authorized_signatory?: string;

  // Presentation fields
  customer_name?: string;
  customer_address?: string;
  customer_gstin?: string;
  po_number?: string;
  po_date?: string;
  amount_in_words?: string;
  company_name?: string;
  company_legal_name?: string;
  company_address?: string;
  company_gstin?: string;
  company_phone?: string;
  company_email?: string;
  bank_details?: {
    bank_name?: string;
    bank_branch?: string;
    bank_account?: string;
    bank_ifsc?: string;
    upi_id?: string;
    [key: string]: any;
  };

  created_at: string;
  updated_at: string;
  items: QuotationItemDTO[];
}

export interface CalculateItemInputDTO {
  purchase_order_item_id?: string;
  item_number: number;
  part_name: string;
  specification?: string;
  drawing_number?: string;
  material?: string;
  process?: string;
  quantity: number;
  unit: string;
  gross_weight_kg: number;
  scrap_weight_kg: number;
  material_base_rate: number;
  scrap_credit_rate: number;
  machining_hours: number;
  machine_hourly_rate: number;
  setup_cost: number;
}

export interface CalculateQuotationRequestDTO {
  items: CalculateItemInputDTO[];
  overhead_percentage: number;
  profit_percentage: number;
  gst_type: string;
}

export interface CalculationResultDTO {
  items: any[];
  material_cost: number;
  process_cost: number;
  subtotal: number;
  overhead_percentage: number;
  overhead_amount: number;
  profit_percentage: number;
  profit_amount: number;
  taxable_amount: number;
  gst_type: string;
  cgst_rate: number;
  cgst_amount: number;
  sgst_rate: number;
  sgst_amount: number;
  igst_rate: number;
  igst_amount: number;
  gst_amount: number;
  final_total: number;
  final_total_in_words: string;
}

export const quotationApi = {
  list: async (): Promise<QuotationDTO[]> => {
    const res = await apiClient.get<QuotationDTO[]>('/quotations');
    return res.data;
  },

  get: async (id: string): Promise<QuotationDTO> => {
    const res = await apiClient.get<QuotationDTO>(`/quotations/${id}`);
    return res.data;
  },

  create: async (data: Partial<QuotationDTO>): Promise<QuotationDTO> => {
    const res = await apiClient.post<QuotationDTO>('/quotations', data);
    return res.data;
  },

  update: async (id: string, data: Partial<QuotationDTO>): Promise<QuotationDTO> => {
    const res = await apiClient.put<QuotationDTO>(`/quotations/${id}`, data);
    return res.data;
  },

  finalize: async (id: string): Promise<QuotationDTO> => {
    const res = await apiClient.post<QuotationDTO>(`/quotations/${id}/finalize`);
    return res.data;
  },

  downloadPdf: async (id: string, quotationNumber?: string): Promise<Blob> => {
    const res = await apiClient.get(`/quotations/${id}/pdf`, {
      responseType: 'blob',
    });
    const blob = new Blob([res.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${quotationNumber || id}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.parentNode?.removeChild(link);
    window.URL.revokeObjectURL(url);
    return blob;
  },

  calculateStateless: async (
    req: CalculateQuotationRequestDTO
  ): Promise<CalculationResultDTO> => {
    const res = await apiClient.post<CalculationResultDTO>('/quotations/calculate', req);
    return res.data;
  },

  calculateAndUpdate: async (
    id: string,
    req: CalculateQuotationRequestDTO
  ): Promise<QuotationDTO> => {
    const res = await apiClient.post<QuotationDTO>(`/quotations/${id}/calculate`, req);
    return res.data;
  },
};

export default quotationApi;
