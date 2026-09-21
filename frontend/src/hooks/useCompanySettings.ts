import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { companyApi } from '../api/companyApi';
import {
  CompanyProfile,
  CompanyTaxSettings,
  CompanyBankSettings,
  CompanyQuotationDefaults,
  QuotationTemplateConfig,
} from '../types/company';

export const COMPANY_SETTINGS_QUERY_KEY = ['company-settings'];
export const TEMPLATES_GALLERY_QUERY_KEY = ['templates-gallery'];

export function useCompanySettings() {
  const queryClient = useQueryClient();

  const settingsQuery = useQuery({
    queryKey: COMPANY_SETTINGS_QUERY_KEY,
    queryFn: () => companyApi.getSettings(),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const templatesQuery = useQuery({
    queryKey: TEMPLATES_GALLERY_QUERY_KEY,
    queryFn: () => companyApi.getTemplates(),
    staleTime: 10 * 60 * 1000,
  });

  const updateProfileMutation = useMutation({
    mutationFn: (data: Partial<CompanyProfile>) => companyApi.updateProfile(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: COMPANY_SETTINGS_QUERY_KEY });
    },
  });

  const updateTaxMutation = useMutation({
    mutationFn: (data: Partial<CompanyTaxSettings>) => companyApi.updateTax(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: COMPANY_SETTINGS_QUERY_KEY });
    },
  });

  const updateBankMutation = useMutation({
    mutationFn: (data: Partial<CompanyBankSettings>) => companyApi.updateBank(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: COMPANY_SETTINGS_QUERY_KEY });
    },
  });

  const updateDefaultsMutation = useMutation({
    mutationFn: (data: Partial<CompanyQuotationDefaults>) => companyApi.updateDefaults(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: COMPANY_SETTINGS_QUERY_KEY });
    },
  });

  const updateTemplateMutation = useMutation({
    mutationFn: (data: Partial<QuotationTemplateConfig>) => companyApi.updateTemplateConfig(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: COMPANY_SETTINGS_QUERY_KEY });
    },
  });

  const uploadLogoMutation = useMutation({
    mutationFn: (file: File) => companyApi.uploadLogo(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: COMPANY_SETTINGS_QUERY_KEY });
    },
  });

  const deleteLogoMutation = useMutation({
    mutationFn: () => companyApi.deleteLogo(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: COMPANY_SETTINGS_QUERY_KEY });
    },
  });

  return {
    settings: settingsQuery.data,
    isLoading: settingsQuery.isLoading,
    isError: settingsQuery.isError,
    error: settingsQuery.error,
    refetchSettings: settingsQuery.refetch,

    templates: templatesQuery.data || [],
    isLoadingTemplates: templatesQuery.isLoading,

    updateProfile: updateProfileMutation.mutateAsync,
    isUpdatingProfile: updateProfileMutation.isPending,

    updateTax: updateTaxMutation.mutateAsync,
    isUpdatingTax: updateTaxMutation.isPending,

    updateBank: updateBankMutation.mutateAsync,
    isUpdatingBank: updateBankMutation.isPending,

    updateDefaults: updateDefaultsMutation.mutateAsync,
    isUpdatingDefaults: updateDefaultsMutation.isPending,

    updateTemplate: updateTemplateMutation.mutateAsync,
    isUpdatingTemplate: updateTemplateMutation.isPending,

    uploadLogo: uploadLogoMutation.mutateAsync,
    isUploadingLogo: uploadLogoMutation.isPending,

    deleteLogo: deleteLogoMutation.mutateAsync,
    isDeletingLogo: deleteLogoMutation.isPending,
  };
}
