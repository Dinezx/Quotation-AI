export interface CustomerMetadata {
  name: string;
  gstin: string;
  poNumber: string;
  poDate: string;
  deliveryDueDate: string;
  billingAddress: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
}

export type RateMatchStatus = 'VERIFIED' | 'AMBIGUOUS' | 'UNMATCHED';

export interface BoqItem {
  id: string;
  sNo: string;
  itemDescription: string;
  hsnCode: string;
  drawingCode?: string;
  extractedSpecification: string;
  rateCardMatch: string;
  rateCardMatchStatus: RateMatchStatus;
  ambiguityReason?: string;
  selectedGrade?: string;
  quantity: number;
  unit: string;
  
  // Dimensions & Machining requirements
  grossWeightKg?: number;
  netWeightKg?: number;
  scrapWeightKg?: number;
  machiningHours?: number;
  surfaceTreatment?: string;
  targetTolerance?: string;
}

export interface PurchaseOrder {
  id: string;
  originalFileName: string;
  fileSizeBytes: number;
  totalPages: number;
  uploadTimestamp: string;
  confidenceScore: number;
  status: 'PENDING_EXTRACTION' | 'NEEDS_REVIEW' | 'VERIFIED' | 'COSTED' | 'DISPATCHED';
  metadata: CustomerMetadata;
  items: BoqItem[];
  rawOcrText?: string;
  leadTimeDays: number;
  taxComplianceNote: string;
  rawMaterialIndexNote: string;
}

export interface TelemetryLog {
  id: string;
  timestamp: string;
  level: 'INFO' | 'SUCCESS' | 'WARN';
  stage: string;
  message: string;
  confidence?: number;
}
