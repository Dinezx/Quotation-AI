export interface GstHub {
  id: string;
  stateCode: string;
  stateName: string;
  gstin: string;
  hubName: string;
  isPrimary: boolean;
  status: 'LIVE_AND_VALID' | 'PENDING_VERIFICATION';
}

export interface PlantSettings {
  // Legal Entity
  registeredName: string;
  tradeName: string;
  plantAddress: string;
  isCorporateOfficeSame: boolean;
  panNumber: string;
  cinNumber: string;
  udyamNumber: string;
  dispatchEmail: string;
  commercialPhone: string;
  accreditations: string[];

  // GST Hubs & Rules
  gstHubs: GstHub[];
  eInvoicingAutoSync: boolean;
  reverseChargeMechanismDefault: boolean;

  // Numbering
  prefixCode: string;
  fiscalYearSchema: string;
  sequentialPaddingDigits: number;
  currentSequenceNumber: number;
  autoResetYearly: boolean;

  // Branding & Letterhead
  logoFileName: string;
  signatoryName: string;
  signatoryTitle: string;
  signatoryStampFileName: string;
  autoStampFinalized: boolean;
  letterheadAccentStyle: 'Slate Solid' | 'Industrial Blue' | 'Deep Teal';

  // Bank Settlement
  bankName: string;
  branchName: string;
  accountNumber: string;
  ifscCode: string;
  upiId: string;

  // Standard Clauses
  deliveryTimeline: string;
  paymentTerms: string;
  freightTerms: string;
  quotationValidity: string;
  qualityClause: string;

  // Template Customizer
  activeTemplatePreset: 'Classic Industrial' | 'Modern Minimalist' | 'Export Compliance';
  headerAlignment: string;
  documentTitleBanner: string;
  pricingDisplayMode: 'Blended Unit Rate Only' | 'Detailed Cost Split';
  tableRowDensity: 'Compact (12px)' | 'Standard (16px)' | 'Spacious (20px)';
  showHsnCode: boolean;
  showRawMaterialGrade: boolean;
  showProcessSplit: boolean;
  showDigitalSeal: boolean;
  showBankQrCode: boolean;
}
