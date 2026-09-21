import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ratesApi, MaterialDTO, ProcessDTO, MaterialCreateDTO, ProcessCreateDTO, PricingRulesDTO } from '../api/ratesApi';
import { MaterialRate, ProcessRate } from '../types/rates';

export function dtoToMaterialRate(dto: MaterialDTO): MaterialRate {
  return {
    id: dto.id,
    name: dto.name,
    grade: dto.grade,
    gradeAndSpec: dto.grade,
    subSpec: dto.name && dto.name !== dto.grade ? dto.name : undefined,
    category: dto.name.toLowerCase().includes('alu') ? 'Non-Ferrous' : 'Ferrous',
    baseRatePerKg: Number(dto.base_rate),
    scrapCreditPerKg: Number(dto.scrap_credit_rate),
    densityGPerCm3: dto.density ? Number(dto.density) : 7.85,
    primarySupplier: 'Direct Rate Master',
    mandiHub: 'Pune MCX Depot',
    aiMatchStatus: 'VERIFIED',
    is_active: dto.is_active,
    lastUpdated: new Date(dto.updated_at || dto.created_at).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }),
    isPopular: true,
  };
}

export function dtoToProcessRate(dto: ProcessDTO): ProcessRate {
  return {
    id: dto.id,
    workstationName: dto.name,
    code: `MC-${dto.id.slice(0, 4).toUpperCase()}`,
    category: dto.name.toLowerCase().includes('mill')
      ? 'Milling'
      : dto.name.toLowerCase().includes('laser')
      ? 'Laser & Fabrication'
      : dto.name.toLowerCase().includes('turn')
      ? 'Turning'
      : 'CNC',
    hourlyRate: Number(dto.hourly_rate),
    setupCost: Number(dto.setup_cost),
    capacityUtilizationPct: 82,
    shiftMode: '2 Shifts (16h)',
    is_active: dto.is_active,
    lastCalibrated: new Date(dto.updated_at || dto.created_at).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }),
  };
}

export function useRates(includeInactive: boolean = true) {
  const queryClient = useQueryClient();

  const materialsQuery = useQuery({
    queryKey: ['rates', 'materials', includeInactive],
    queryFn: async () => {
      const dtoList = await ratesApi.listMaterials(includeInactive);
      return (dtoList || []).map(dtoToMaterialRate);
    },
  });

  const processesQuery = useQuery({
    queryKey: ['rates', 'processes', includeInactive],
    queryFn: async () => {
      const dtoList = await ratesApi.listProcesses(includeInactive);
      return (dtoList || []).map(dtoToProcessRate);
    },
  });

  const pricingRulesQuery = useQuery({
    queryKey: ['rates', 'pricing-rules'],
    queryFn: async () => {
      return await ratesApi.getPricingRules();
    },
  });

  // Material Mutations
  const createMaterialMutation = useMutation({
    mutationFn: async (data: MaterialCreateDTO) => {
      return await ratesApi.createMaterial(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rates', 'materials'] });
    },
  });

  const updateMaterialMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<MaterialCreateDTO> }) => {
      return await ratesApi.updateMaterial(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rates', 'materials'] });
    },
  });

  const deleteMaterialMutation = useMutation({
    mutationFn: async (id: string) => {
      return await ratesApi.deleteMaterial(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rates', 'materials'] });
    },
  });

  const reactivateMaterialMutation = useMutation({
    mutationFn: async (id: string) => {
      return await ratesApi.reactivateMaterial(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rates', 'materials'] });
    },
  });

  // Process Mutations
  const createProcessMutation = useMutation({
    mutationFn: async (data: ProcessCreateDTO) => {
      return await ratesApi.createProcess(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rates', 'processes'] });
    },
  });

  const updateProcessMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ProcessCreateDTO> }) => {
      return await ratesApi.updateProcess(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rates', 'processes'] });
    },
  });

  const deleteProcessMutation = useMutation({
    mutationFn: async (id: string) => {
      return await ratesApi.deleteProcess(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rates', 'processes'] });
    },
  });

  const reactivateProcessMutation = useMutation({
    mutationFn: async (id: string) => {
      return await ratesApi.reactivateProcess(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rates', 'processes'] });
    },
  });

  // Pricing Rules Mutation
  const updatePricingRulesMutation = useMutation({
    mutationFn: async (data: PricingRulesDTO) => {
      return await ratesApi.updatePricingRules(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rates', 'pricing-rules'] });
    },
  });

  return {
    materials: materialsQuery.data || [],
    processes: processesQuery.data || [],
    pricingRules: pricingRulesQuery.data || {
      overhead_percentage: 10.0,
      profit_percentage: 15.0,
      gst_type: 'CGST_SGST',
      default_gst_rate: 18.0,
    },
    isLoading: materialsQuery.isLoading || processesQuery.isLoading || pricingRulesQuery.isLoading,
    isError: materialsQuery.isError || processesQuery.isError,
    createMaterial: createMaterialMutation.mutateAsync,
    updateMaterial: updateMaterialMutation.mutateAsync,
    deleteMaterial: deleteMaterialMutation.mutateAsync,
    reactivateMaterial: reactivateMaterialMutation.mutateAsync,
    createProcess: createProcessMutation.mutateAsync,
    updateProcess: updateProcessMutation.mutateAsync,
    deleteProcess: deleteProcessMutation.mutateAsync,
    reactivateProcess: reactivateProcessMutation.mutateAsync,
    updatePricingRules: updatePricingRulesMutation.mutateAsync,
    refetch: () => {
      materialsQuery.refetch();
      processesQuery.refetch();
      pricingRulesQuery.refetch();
    },
  };
}
