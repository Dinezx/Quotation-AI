import apiClient from './apiClient';

export interface DashboardKPIsDTO {
  quotations_created: number;
  pending_po_review: number;
  draft_quotations: number;
  finalized_quotations: number;
  total_quotation_value: number;
  quotation_value: number;
  finalized_quotation_value: number;
}

export interface ActivityTrendPointDTO {
  date: string;
  count: number;
  quotation_value: number;
  finalized_value: number;
}

export interface StatusBreakdownItemDTO {
  status: string;
  count: number;
  value: number;
  percentage: number;
}

export interface ValueTrendPointDTO {
  date: string;
  quotation_value: number;
  finalized_value: number;
}

export interface PendingActionItemDTO {
  id: string;
  type: 'po_review' | 'draft_quotation' | 'email_failed' | string;
  reference_number: string;
  customer_name?: string;
  description: string;
  created_at: string;
  link: string;
}

export interface RecentQuotationItemDTO {
  id: string;
  quotation_number: string;
  customer?: string;
  customer_name?: string;
  date: string;
  quotation_date: string;
  amount: number;
  final_total: number;
  status: string;
  email_status: string;
}

export interface RecentActivityEventDTO {
  id: string;
  type: string;
  title: string;
  description: string;
  timestamp: string;
  reference_id: string;
  link?: string;
}

export interface CustomerActivitySummaryDTO {
  total_active_customers: number;
  customers_with_quotations: number;
  top_customers: Array<{
    id: string;
    name: string;
    quotation_count: number;
    total_value: number;
  }>;
  recent_customers: Array<{
    id: string;
    name: string;
    created_at: string;
  }>;
}

export interface EmailSummaryDTO {
  sent: number;
  failed: number;
  pending: number;
  not_sent: number;
  total: number;
  success_rate: number;
}

export interface DashboardSummaryResponseDTO {
  period: string;
  start_date: string;
  end_date: string;
  kpis: DashboardKPIsDTO;
  quotation_activity: ActivityTrendPointDTO[];
  status_breakdown: StatusBreakdownItemDTO[];
  value_trend: ValueTrendPointDTO[];
  pending_actions: PendingActionItemDTO[];
  recent_quotations: RecentQuotationItemDTO[];
  recent_activity: RecentActivityEventDTO[];
  customer_activity: CustomerActivitySummaryDTO;
  email_summary: EmailSummaryDTO;
}

export interface DashboardSummaryParams {
  period?: 'today' | 'this_week' | 'this_month' | 'last_month' | 'this_quarter' | 'this_year' | 'custom' | string;
  start_date?: string;
  end_date?: string;
}

export const dashboardApi = {
  getSummary: async (params?: DashboardSummaryParams): Promise<DashboardSummaryResponseDTO> => {
    const res = await apiClient.get<DashboardSummaryResponseDTO>('/dashboard/summary', {
      params,
    });
    return res.data;
  },
};

export default dashboardApi;
