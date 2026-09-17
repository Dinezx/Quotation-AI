export interface LineItemCosting {
  itemId: string;
  itemDescription: string;
  quantity: number;
  unit: string;
  
  // Material costing
  materialName: string;
  grossWeightKg: number;
  materialRatePerKg: number;
  grossMaterialCost: number;
  scrapWeightKg: number;
  scrapCreditPerKg: number;
  scrapCreditTotal: number;
  netMaterialCost: number;

  // Process costing
  workstationName: string;
  machiningHours: number;
  hourlyRate: number;
  setupCost: number;
  processCost: number;

  // Totals
  itemSubtotal: number;
  unitPrice: number;
}

export interface QuotationCalculationSummary {
  materialCost: number;
  processCost: number;
  baseSubtotal: number;
  
  // Multipliers
  overheadPct: number;
  overheadAmount: number;
  profitMarginPct: number;
  profitAmount: number;
  
  // Taxes
  taxableValue: number;
  isInterstate: boolean;
  cgstPct: number;
  cgstAmount: number;
  sgstPct: number;
  sgstAmount: number;
  igstPct: number;
  igstAmount: number;
  totalGstAmount: number;
  
  // Final
  grandTotal: number;
  grandTotalInWords: string;
  roundingAdjustment: number;
}
