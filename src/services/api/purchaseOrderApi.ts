import { apiClient } from '../../lib/apiClient';

export interface PurchaseOrderItemDTO {
  id: string;
  purchase_order_id: string;
  item_number: number;
  part_number?: string;
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
  created_at: string;
  updated_at: string;
}

export interface PurchaseOrderDTO {
  id: string;
  company_id: string;
  customer_id?: string;
  customer_name?: string;
  po_number: string;
  po_date?: string;
  delivery_date?: string;
  source_file_url?: string;
  source_file_name?: string;
  status: string;
  extracted_data?: Record<string, any>;
  raw_text?: string;
  created_at: string;
  updated_at: string;
  items: PurchaseOrderItemDTO[];
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

  uploadDocument: async (file: File): Promise<{
    source_file_url: string;
    source_file_name: string;
    file_size: number;
    content_type: string;
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
