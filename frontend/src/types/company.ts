export type GstType = 'CGST_SGST' | 'IGST' | 'EXEMPT';
export type LogoPosition = 'left' | 'center' | 'right';
export type TemplateCategory = 'Professional' | 'Modern' | 'Industrial' | 'Minimal';

export interface CompanyProfile {
  name: string;
  legal_name?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  country?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  gstin?: string | null;
  pan?: string | null;
  authorized_signatory?: string | null;
  logo_url?: string | null;
}

export interface CompanyTaxSettings {
  gstin?: string | null;
  gst_type: GstType;
  default_gst_rate: number | string;
  pan?: string | null;
}

export interface CompanyBankSettings {
  bank_name?: string | null;
  account_name?: string | null;
  account_number?: string | null;
  ifsc?: string | null;
  branch?: string | null;
  upi_id?: string | null;
}

export interface CompanyQuotationDefaults {
  quotation_validity_days: number;
  payment_terms?: string | null;
  delivery_terms?: string | null;
  inspection_terms?: string | null;
  general_terms?: string | null;
  prepared_by?: string | null;
  authorized_signatory?: string | null;
}

export interface QuotationTemplateConfig {
  template_id: string;
  primary_color?: string | null;
  secondary_color?: string | null;
  font_family?: string | null;
  logo_position?: LogoPosition;
  show_logo: boolean;
  show_company_contact: boolean;
  show_gstin: boolean;
  show_bank_details: boolean;
  show_terms: boolean;
  show_signature: boolean;
  footer_text?: string | null;
}

export interface TemplateGalleryItem {
  id: string;
  name: string;
  category: TemplateCategory;
  description: string;
  recommended_for: string;
  default_primary_color: string;
  default_secondary_color: string;
}

export interface CompanyFullSettings {
  profile: CompanyProfile;
  tax: CompanyTaxSettings;
  bank: CompanyBankSettings;
  defaults: CompanyQuotationDefaults;
  template: QuotationTemplateConfig;
}
