import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ratesApi, MaterialDTO, ProcessDTO, MaterialCreateDTO, ProcessCreateDTO } from '../services/api/ratesApi';
import { mockMaterialRates, mockProcessRates } from '../services/mockData';
import { MaterialRate, ProcessRate } from '../types/rates';

export function dtoToMaterialRate(dto: MaterialDTO): MaterialRate {
  return {
    id: dto.id,
    gradeAndSpec: `${dto.name} (${dto.grade})`,
    subSpec: `Grade: ${dto.grade} • Density: ${dto.density || 7.85} g/cm³`,
    category: dto.name.toLowerCase().includes('alu') ? 'Non-Ferrous' : 'Ferrous',
    baseRatePerKg: Number(dto.base_rate),
    scrapCreditPerKg: Number(dto.scrap_credit_rate),
    densityGPerCm3: dto.density ? Number(dto.density) : 7.85,
    primarySupplier: 'Direct Rate Card',
    mandiHub: 'Pune MCX Depot',
    aiMatchStatus: 'VERIFIED',
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
    category: dto.name.toLowerCase().includes('mill') ? 'Milling' : dto.name.toLowerCase().includes('laser') ? 'Laser & Fabrication' : 'CNC',
    hourlyRate: Number(dto.hourly_rate),
    setupCost: Number(dto.setup_cost),
    capacityUtilizationPct: 82,
    shiftMode: '2 Shifts (16h)',
    lastCalibrated: new Date(dto.updated_at || dto.created_at).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }),
  };
}

export function useRates() {
  const queryClient = useQueryClient();

  const materialsQuery = useQuery({
    queryKey: ['rates', 'materials'],
    queryFn: async () => {
      try {
        const dtoList = await ratesApi.listMaterials();
        if (dtoList && dtoList.length > 0) {
          return dtoList.map(dtoToMaterialRate);
        }
        return mockMaterialRates;
      } catch (err) {
        console.warn('[useRates] Falling back to local materials dataset:', err);
        return mockMaterialRates;
      }
    },
  });

  const processesQuery = useQuery({
    queryKey: ['rates', 'processes'],
    queryFn: async () => {
      try {
        const dtoList = await ratesApi.listProcesses();
        if (dtoList && dtoList.length > 0) {
          return dtoList.map(dtoToProcessRate);
        }
        return mockProcessRates;
      } catch (err) {
        console.warn('[useRates] Falling back to local processes dataset:', err);
        return mockProcessRates;
      }
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

  const updateProcessMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ProcessCreateDTO> }) => {
      return await ratesApi.updateProcess(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rates', 'processes'] });
    },
  });

  return {
    materials: materialsQuery.data || mockMaterialRates,
    processes: processesQuery.data || mockProcessRates,
    isLoading: materialsQuery.isLoading || processesQuery.isLoading,
    isError: materialsQuery.isError || processesQuery.isError,
    updateMaterial: updateMaterialMutation.mutateAsync,
    updateProcess: updateProcessMutation.mutateAsync,
    refetch: () => {
      materialsQuery.refetch();
      processesQuery.refetch();
    },
  };
}
