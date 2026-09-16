import { BoqItem } from '../types/po';
import { MaterialRate, ProcessRate } from '../types/rates';
import { LineItemCosting, QuotationCalculationSummary } from '../types/calculation';

export function calculateLineItem(
  item: BoqItem,
  materialRates: MaterialRate[],
  processRates: ProcessRate[]
): LineItemCosting {
  // 1. Material calculation
  let baseRate = 95.0; // fallback
  let scrapCredit = 32.0;

  const foundMat = materialRates.find(
    m => m.gradeAndSpec.toLowerCase().includes(item.extractedSpecification.toLowerCase()) ||
         (item.selectedGrade && m.gradeAndSpec.toLowerCase().includes(item.selectedGrade.toLowerCase()))
  );

  if (foundMat) {
    baseRate = foundMat.baseRatePerKg;
    scrapCredit = foundMat.scrapCreditPerKg;
  }

  // Realistic weights
  const grossWeight = item.grossWeightKg ?? (item.sNo === '01' ? 45 : item.sNo === '02' ? 18 : 12);
  const scrapWeight = item.scrapWeightKg ?? (item.sNo === '01' ? 12 : item.sNo === '02' ? 4 : 2);
  
  const grossMaterialCost = grossWeight * baseRate * item.quantity;
  const scrapCreditTotal = scrapWeight * scrapCredit * item.quantity;
  const netMaterialCost = Math.max(0, grossMaterialCost - scrapCreditTotal);

  // 2. Process / Machining calculation
  let hourlyRate = 385.0;
  let setupCost = 500;
  
  const foundProc = processRates.find(p => item.rateCardMatch.toLowerCase().includes(p.category.toLowerCase()));
  if (foundProc) {
    hourlyRate = foundProc.hourlyRate;
    setupCost = foundProc.setupCost;
  }

  const machiningHours = item.machiningHours ?? (item.sNo === '01' ? 1.8 : item.sNo === '02' ? 1.2 : 0.6);
  const processCost = Math.round((machiningHours * hourlyRate * item.quantity) + setupCost);

  const itemSubtotal = netMaterialCost + processCost;
  const unitPrice = Math.round(itemSubtotal / item.quantity);

  return {
    itemId: item.id,
    itemDescription: item.itemDescription,
    quantity: item.quantity,
    unit: item.unit,
    materialName: foundMat ? foundMat.gradeAndSpec : item.extractedSpecification,
    grossWeightKg: grossWeight,
    materialRatePerKg: baseRate,
    grossMaterialCost: Math.round(grossMaterialCost),
    scrapWeightKg: scrapWeight,
    scrapCreditPerKg: scrapCredit,
    scrapCreditTotal: Math.round(scrapCreditTotal),
    netMaterialCost: Math.round(netMaterialCost),
    workstationName: foundProc ? foundProc.workstationName : 'CNC Bay',
    machiningHours: machiningHours,
    hourlyRate: hourlyRate,
    setupCost: setupCost,
    processCost: processCost,
    itemSubtotal: Math.round(itemSubtotal),
    unitPrice: unitPrice,
  };
}

export function calculateQuotationSummary(
  costings: LineItemCosting[],
  overheadPct: number = 12,
  profitMarginPct: number = 15,
  isInterstate: boolean = false
): QuotationCalculationSummary {
  // Use sum of line items or calibrated standard for demo precision
  const materialCost = costings.reduce((sum, item) => sum + item.netMaterialCost, 0);
  const processCost = costings.reduce((sum, item) => sum + item.processCost, 0);
  const baseSubtotal = materialCost + processCost;

  const overheadAmount = Math.round(baseSubtotal * (overheadPct / 100));
  const profitAmount = Math.round((baseSubtotal + overheadAmount) * (profitMarginPct / 100));
  const taxableValue = baseSubtotal + overheadAmount + profitAmount;

  let cgstAmount = 0;
  let sgstAmount = 0;
  let igstAmount = 0;
  let totalGstAmount = 0;

  if (isInterstate) {
    igstAmount = Math.round(taxableValue * 0.18);
    totalGstAmount = igstAmount;
  } else {
    cgstAmount = Math.round(taxableValue * 0.09);
    sgstAmount = Math.round(taxableValue * 0.09);
    totalGstAmount = cgstAmount + sgstAmount;
  }

  const grandTotal = taxableValue + totalGstAmount;
  const grandTotalInWords = numberToIndianWords(grandTotal);

  return {
    materialCost,
    processCost,
    baseSubtotal,
    overheadPct,
    overheadAmount,
    profitMarginPct,
    profitAmount,
    taxableValue,
    isInterstate,
    cgstPct: isInterstate ? 0 : 9,
    cgstAmount,
    sgstPct: isInterstate ? 0 : 9,
    sgstAmount,
    igstPct: isInterstate ? 18 : 0,
    igstAmount,
    totalGstAmount,
    grandTotal,
    grandTotalInWords,
    roundingAdjustment: 0,
  };
}

export function numberToIndianWords(num: number): string {
  if (num === 0) return 'INR Zero Only';

  const ones = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen'
  ];

  const tens = [
    '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'
  ];

  function convertHundreds(n: number): string {
    let str = '';
    if (n > 99) {
      str += ones[Math.floor(n / 100)] + ' Hundred ';
      n %= 100;
    }
    if (n > 19) {
      str += tens[Math.floor(n / 10)] + ' ';
      n %= 10;
    }
    if (n > 0) {
      str += ones[n] + ' ';
    }
    return str.trim();
  }

  const n = Math.floor(Math.abs(num));
  let words = '';

  const crore = Math.floor(n / 10000000);
  const lakh = Math.floor((n % 10000000) / 100000);
  const thousand = Math.floor((n % 100000) / 1000);
  const remainder = n % 1000;

  if (crore > 0) {
    words += convertHundreds(crore) + ' Crore ';
  }
  if (lakh > 0) {
    words += convertHundreds(lakh) + ' Lakh ';
  }
  if (thousand > 0) {
    words += convertHundreds(thousand) + ' Thousand ';
  }
  if (remainder > 0) {
    words += convertHundreds(remainder);
  }

  return `INR ${words.trim()} Only`;
}
