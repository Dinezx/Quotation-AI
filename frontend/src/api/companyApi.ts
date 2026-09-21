import apiClient from './apiClient';
import {
  CompanyFullSettings,
  CompanyProfile,
  CompanyTaxSettings,
  CompanyBankSettings,
  CompanyQuotationDefaults,
  QuotationTemplateConfig,
  TemplateGalleryItem,
} from '../types/company';

export const companyApi = {
  getSettings: async (): Promise<CompanyFullSettings> => {
    const response = await apiClient.get<CompanyFullSettings>('/company/settings');
    return response.data;
  },

  updateProfile: async (data: Partial<CompanyProfile>): Promise<CompanyProfile> => {
    const response = await apiClient.put<CompanyProfile>('/company/profile', data);
    return response.data;
  },

  updateTax: async (data: Partial<CompanyTaxSettings>): Promise<CompanyTaxSettings> => {
    const response = await apiClient.put<CompanyTaxSettings>('/company/tax', data);
    return response.data;
  },

  updateBank: async (data: Partial<CompanyBankSettings>): Promise<CompanyBankSettings> => {
    const response = await apiClient.put<CompanyBankSettings>('/company/bank', data);
    return response.data;
  },

  updateDefaults: async (
    data: Partial<CompanyQuotationDefaults>
  ): Promise<CompanyQuotationDefaults> => {
    const response = await apiClient.put<CompanyQuotationDefaults>('/company/defaults', data);
    return response.data;
  },

  getTemplates: async (): Promise<TemplateGalleryItem[]> => {
    const response = await apiClient.get<TemplateGalleryItem[]>('/company/templates');
    return response.data;
  },

  getTemplateConfig: async (): Promise<QuotationTemplateConfig> => {
    const response = await apiClient.get<QuotationTemplateConfig>('/company/template');
    return response.data;
  },

  updateTemplateConfig: async (
    data: Partial<QuotationTemplateConfig>
  ): Promise<QuotationTemplateConfig> => {
    const response = await apiClient.put<QuotationTemplateConfig>('/company/template', data);
    return response.data;
  },

  uploadLogo: async (file: File): Promise<{ logo_url: string; message: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post<{ logo_url: string; message: string }>(
      '/company/logo',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  },

  deleteLogo: async (): Promise<{ message: string }> => {
    const response = await apiClient.delete<{ message: string }>('/company/logo');
    return response.data;
  },

  previewTemplatePdf: async (
    templateId: string,
    config?: Partial<QuotationTemplateConfig>
  ): Promise<Blob> => {
    const response = await apiClient.post(
      '/company/template/preview-pdf',
      {
        template_id: templateId,
        config: config || {},
      },
      {
        responseType: 'blob',
      }
    );
    return response.data;
  },
};
