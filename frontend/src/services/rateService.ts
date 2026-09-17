import { MaterialRate, ProcessRate, MultipliersConfig } from '../types/rates';
import { mockMaterialRates, mockProcessRates, mockMultipliersConfig } from './mockData';

let materialRates: MaterialRate[] = [...mockMaterialRates];
let processRates: ProcessRate[] = [...mockProcessRates];
let multipliers: MultipliersConfig = { ...mockMultipliersConfig };

export const rateService = {
  getMaterialRates: (): MaterialRate[] => [...materialRates],
  
  updateMaterialRate: (id: string, updates: Partial<MaterialRate>): MaterialRate[] => {
    materialRates = materialRates.map(m => m.id === id ? { ...m, ...updates, lastUpdated: 'Just now' } : m);
    return [...materialRates];
  },

  addMaterialRate: (newRate: Omit<MaterialRate, 'id' | 'lastUpdated'>): MaterialRate => {
    const rate: MaterialRate = {
      ...newRate,
      id: `mat-${Date.now()}`,
      lastUpdated: 'Just now'
    };
    materialRates.unshift(rate);
    return rate;
  },

  getProcessRates: (): ProcessRate[] => [...processRates],
  
  updateProcessRate: (id: string, updates: Partial<ProcessRate>): ProcessRate[] => {
    processRates = processRates.map(p => p.id === id ? { ...p, ...updates } : p);
    return [...processRates];
  },

  getMultipliers: (): MultipliersConfig => ({ ...multipliers }),
  
  updateMultipliers: (updates: Partial<MultipliersConfig>): MultipliersConfig => {
    multipliers = { ...multipliers, ...updates };
    return { ...multipliers };
  }
};
