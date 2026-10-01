export type MaterialCategory = 'Ferrous' | 'Non-Ferrous' | 'Alloys' | 'Polymers';

export interface MaterialRate {
  id: string;
  name?: string;
  grade?: string;
  gradeAndSpec: string;
  subSpec?: string;
  unit?: string;
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
  category: string;
  rate_basis?: string;
  rate?: number;
  hourlyRate: number;
  setupCost: number;
  unit?: string;
  capacityUtilizationPct?: number;
  shiftMode?: string;
  lastCalibrated: string;
  lastUpdated?: string;
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
  is_configured?: boolean;
  overhead_percentage: number | null;
  profit_percentage: number | null;
  gst_type: string | null;
  default_gst_rate: number | null;
  rounding_method?: string | null;
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
