import { apiClient } from './apiClient';

export interface CustomerDTO {
  id: string;
  company_id: string;
  name: string;
  contact_person?: string;
  email?: string;
  login_email?: string;
  quotation_email?: string;
  phone?: string;
  billing_address?: string;
  shipping_address?: string;
  gstin?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CustomerCreateDTO {
  name: string;
  contact_person?: string;
  email?: string;
  quotation_email?: string;
  phone?: string;
  billing_address?: string;
  shipping_address?: string;
  gstin?: string;
  is_active?: boolean;
}

export interface CustomerCommunicationSettingsDTO {
  quotation_email?: string | null;
}

export const customerApi = {
  list: async (): Promise<CustomerDTO[]> => {
    const res = await apiClient.get<CustomerDTO[]>('/customers');
    return res.data;
  },

  get: async (id: string): Promise<CustomerDTO> => {
    const res = await apiClient.get<CustomerDTO>(`/customers/${id}`);
    return res.data;
  },

  create: async (data: CustomerCreateDTO): Promise<CustomerDTO> => {
    const res = await apiClient.post<CustomerDTO>('/customers', data);
    return res.data;
  },

  update: async (id: string, data: Partial<CustomerCreateDTO>): Promise<CustomerDTO> => {
    const res = await apiClient.put<CustomerDTO>(`/customers/${id}`, data);
    return res.data;
  },

  updateCommunicationSettings: async (id: string, data: CustomerCommunicationSettingsDTO): Promise<CustomerDTO> => {
    const res = await apiClient.put<CustomerDTO>(`/customers/${id}/communication-settings`, data);
    return res.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/customers/${id}`);
  },
};

export default customerApi;
