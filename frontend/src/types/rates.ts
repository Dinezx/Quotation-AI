export type MaterialCategory = 'Ferrous' | 'Non-Ferrous' | 'Alloys' | 'Polymers';

export interface MaterialRate {
  id: string;
  name?: string;
  grade?: string;
  gradeAndSpec: string;
  subSpec?: string;
  category: MaterialCategory;
  baseRatePerKg: number;
  scrapCreditPerKg: number;
  densityGPerCm3: number;
  primarySupplier: string;
  mandiHub: string;
  aiMatchStatus: 'VERIFIED' | 'NEEDS_REVIEW';
  lastUpdated: string;
  isPopular?: boolean;
  is_active?: boolean;
}

export interface ProcessRate {
  id: string;
  workstationName: string;
  code: string;
  category: 'CNC' | 'Turning' | 'Milling' | 'Grinding' | 'Laser & Fabrication' | 'Inspection';
  hourlyRate: number;
  setupCost: number;
  capacityUtilizationPct: number;
  shiftMode: string;
  lastCalibrated: string;
  is_active?: boolean;
}

export interface MultipliersConfig {
  factoryOverheadPct: number;
  commercialProfitMarginPct: number;
  scrapSurchargePct: number;
  defaultGstPct: number;
  mandiLinkStatus: string;
  lastMandiSync: string;
}

export interface PricingRulesConfig {
  overhead_percentage: number;
  profit_percentage: number;
  gst_type: string;
  default_gst_rate: number;
}

export interface HsnGstRule {
  chapter: string;
  hsnCode: string;
  description: string;
  cgstPct: number;
  sgstPct: number;
  igstPct: number;
  isDefault: boolean;
}
