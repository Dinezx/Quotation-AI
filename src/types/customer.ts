export interface Customer {
  id: string;
  name: string;
  code: string;
  tradeName?: string;
  gstin: string;
  pan: string;
  contactPerson: string;
  designation: string;
  phone: string;
  email: string;
  billingAddress: string;
  shippingAddress: string;
  state: string;
  stateCode: string;
  activeQuotationsCount: number;
  totalQuotationsCount: number;
  lifetimeValueInr: number;
  creditDays: number;
  rating: string;
  lastQuotedDate: string;
}
