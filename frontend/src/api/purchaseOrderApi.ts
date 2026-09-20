import { apiClient } from './apiClient';

export interface PurchaseOrderItemDTO {
  id: string;
  purchase_order_id: string;
  item_number: number;
  part_number?: string;
  drawing_number?: string;
  part_name: string;
  description?: string;
  specification?: string;
  quantity: number;
  unit: string;
  material_id?: string;
  material_grade?: string;
  gross_weight_kg: number;
  net_weight_kg: number;
  scrap_weight_kg: number;
  process_id?: string;
  process_name?: string;
  machining_hours: number;
  setup_hours: number;
  confidence: number;
  review_flags?: string[];
  created_at: string;
  updated_at: string;
}

export interface PurchaseOrderDTO {
  id: string;
  company_id: string;
  customer_id?: string;
  customer_name?: string;
  supplier_name?: string;
  po_number: string;
  po_date?: string;
  delivery_date?: string;
  delivery_terms?: string;
  payment_terms?: string;
  inspection_clauses?: string;
  general_notes?: string;
  source_file_url?: string;
  source_file_name?: string;
  status: string;
  review_status?: string;
  approved_by?: string;
  approved_at?: string;
  rejection_reason?: string;
  extracted_data?: Record<string, any>;
  raw_text?: string;
  created_at: string;
  updated_at: string;
  items: PurchaseOrderItemDTO[];
}

export interface CalculationIssueDTO {
  item_id?: string;
  item_number?: number;
  part_name?: string;
  code: string;
  message: string;
}

export interface RateMatchItemDTO {
  item_id?: string;
  item_number: number;
  part_name: string;
  material?: string;
  material_rate?: number;
  scrap_credit_rate?: number;
  process?: string;
  process_rate?: number;
  setup_cost?: number;
  quantity: number;
  unit: string;
  gross_weight_kg: number;
  scrap_weight_kg: number;
  machining_hours: number;
  setup_hours: number;
  rate_match_status: string;
  rate_match_messages: string[];
  gross_material_cost?: number;
  scrap_credit?: number;
  net_material_cost?: number;
  machining_cost?: number;
  process_cost?: number;
  subtotal?: number;
  unit_cost?: number;
}

export interface POCalculateRequestDTO {
  overhead_percentage?: number;
  profit_percentage?: number;
  gst_type?: string;
  persist_draft?: boolean;
}

export interface POCalculateResponseDTO {
  status: 'SUCCESS' | 'BLOCKED';
  purchase_order_id: string;
  po_number: string;
  customer_name?: string;
  currency: string;
  issues: CalculationIssueDTO[];
  items: RateMatchItemDTO[];
  manufacturing_subtotal?: number;
  material_cost?: number;
  process_cost?: number;
  overhead_percentage?: number;
  overhead_amount?: number;
  assessable_amount?: number;
  profit_percentage?: number;
  profit_amount?: number;
  taxable_amount?: number;
  gst_type?: string;
  cgst_rate?: number;
  cgst_amount?: number;
  sgst_rate?: number;
  sgst_amount?: number;
  igst_rate?: number;
  igst_amount?: number;
  gst_amount?: number;
  grand_total?: number;
  final_total_in_words?: string;
  quotation_id?: string;
  quotation_number?: string;
}


export const purchaseOrderApi = {
  list: async (status?: string): Promise<PurchaseOrderDTO[]> => {
    const res = await apiClient.get<PurchaseOrderDTO[]>('/purchase-orders', {
      params: status ? { status_filter: status } : undefined,
    });
    return res.data;
  },

  get: async (id: string): Promise<PurchaseOrderDTO> => {
    const res = await apiClient.get<PurchaseOrderDTO>(`/purchase-orders/${id}`);
    return res.data;
  },

  create: async (data: Partial<PurchaseOrderDTO>): Promise<PurchaseOrderDTO> => {
    const res = await apiClient.post<PurchaseOrderDTO>('/purchase-orders', data);
    return res.data;
  },

  update: async (id: string, data: Partial<PurchaseOrderDTO>): Promise<PurchaseOrderDTO> => {
    const res = await apiClient.put<PurchaseOrderDTO>(`/purchase-orders/${id}`, data);
    return res.data;
  },

  updateItem: async (
    poId: string,
    itemId: string,
    data: Partial<PurchaseOrderItemDTO>
  ): Promise<PurchaseOrderItemDTO> => {
    const res = await apiClient.put<PurchaseOrderItemDTO>(
      `/purchase-orders/${poId}/items/${itemId}`,
      data
    );
    return res.data;
  },

  approve: async (id: string, notes?: string): Promise<PurchaseOrderDTO> => {
    const res = await apiClient.post<PurchaseOrderDTO>(`/purchase-orders/${id}/approve`, {
      approval_notes: notes || undefined,
    });
    return res.data;
  },

  reject: async (id: string, reason: string): Promise<PurchaseOrderDTO> => {
    const res = await apiClient.post<PurchaseOrderDTO>(`/purchase-orders/${id}/reject`, {
      reason,
    });
    return res.data;
  },

  calculate: async (
    id: string,
    params?: POCalculateRequestDTO
  ): Promise<POCalculateResponseDTO> => {
    const res = await apiClient.post<POCalculateResponseDTO>(
      `/purchase-orders/${id}/calculate`,
      params || {}
    );
    return res.data;
  },

  uploadDocument: async (file: File): Promise<{
    source_file_url: string;
    source_file_name: string;
    file_size: number;
    content_type: string;
    purchase_order_id?: string;
    purchase_order?: PurchaseOrderDTO;
    extraction?: Record<string, any>;
  }> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await apiClient.post('/purchase-orders/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data;
  },
};

export default purchaseOrderApi;
