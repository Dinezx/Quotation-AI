import { CustomerMetadata, BoqItem } from './po';
import { QuotationCalculationSummary, LineItemCosting } from './calculation';

export type QuotationStatus = 
  | 'DRAFT' 
  | 'PROCESSING' 
  | 'NEEDS_REVIEW' 
  | 'READY' 
  | 'GENERATED' 
  | 'SENT' 
  | 'ACCEPTED' 
  | 'REJECTED' 
  | 'REVISION_ISSUED' 
  | 'EXPIRED';

export interface AuditEvent {
  id: string;
  timestamp: string;
  title: string;
  actor: string;
  status: 'COMPLETED' | 'PENDING' | 'ALERT';
  description: string;
}

export interface QuotationDocument {
  id: string;
  quotationNumber: string;
  version: string;
  createdAt: string;
  validUntil: string;
  poReference: string;
  poDate: string;
  customer: CustomerMetadata;
  status: QuotationStatus;
  
  // Financials
  calculation: QuotationCalculationSummary;
  itemCostings: LineItemCosting[];
  boqItems: BoqItem[];
  
  // Logistics & Terms
  leadTimeDays: number;
  deliveryTerms: string;
  paymentTerms: string;
  freightTerms: string;
  warrantyClause: string;
  
  // Recipient contact
  primaryContactPerson: string;
  primaryContactPhone: string;
  primaryContactEmail: string;

  // Audit
  auditTrail: AuditEvent[];
  pdfFileSizeKb: number;
}
