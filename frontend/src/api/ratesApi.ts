import { apiClient } from './apiClient';

export interface MaterialDTO {
  id: string;
  company_id: string;
  name: string;
  grade: string;
  density?: number;
  unit: string;
  base_rate: number;
  scrap_credit_rate: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MaterialCreateDTO {
  name: string;
  grade: string;
  density?: number;
  unit?: string;
  base_rate: number;
  scrap_credit_rate?: number;
  is_active?: boolean;
}

export interface ProcessDTO {
  id: string;
  company_id: string;
  name: string;
  unit: string;
  hourly_rate: number;
  setup_cost: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProcessCreateDTO {
  name: string;
  unit?: string;
  hourly_rate: number;
  setup_cost?: number;
  is_active?: boolean;
}

export const ratesApi = {
  // Materials
  listMaterials: async (): Promise<MaterialDTO[]> => {
    const res = await apiClient.get<MaterialDTO[]>('/rates/materials');
    return res.data;
  },

  createMaterial: async (data: MaterialCreateDTO): Promise<MaterialDTO> => {
    const res = await apiClient.post<MaterialDTO>('/rates/materials', data);
    return res.data;
  },

  updateMaterial: async (id: string, data: Partial<MaterialCreateDTO>): Promise<MaterialDTO> => {
    const res = await apiClient.put<MaterialDTO>(`/rates/materials/${id}`, data);
    return res.data;
  },

  deleteMaterial: async (id: string): Promise<void> => {
    await apiClient.delete(`/rates/materials/${id}`);
  },

  // Processes
  listProcesses: async (): Promise<ProcessDTO[]> => {
    const res = await apiClient.get<ProcessDTO[]>('/rates/processes');
    return res.data;
  },

  createProcess: async (data: ProcessCreateDTO): Promise<ProcessDTO> => {
    const res = await apiClient.post<ProcessDTO>('/rates/processes', data);
    return res.data;
  },

  updateProcess: async (id: string, data: Partial<ProcessCreateDTO>): Promise<ProcessDTO> => {
    const res = await apiClient.put<ProcessDTO>(`/rates/processes/${id}`, data);
    return res.data;
  },

  deleteProcess: async (id: string): Promise<void> => {
    await apiClient.delete(`/rates/processes/${id}`);
  },
};

export default ratesApi;
