export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  SIGNUP: '/signup',
  CALLBACK: '/auth/callback',
  ONBOARDING: '/onboarding',
  DASHBOARD: '/dashboard',
  UPLOAD: '/upload',
  REVIEW: '/review',
  RATES: '/rates',
  CALCULATION: '/calculation',
  QUOTATION: '/quotation',
  QUOTATIONS: '/quotations',
  CUSTOMERS: '/customers',
  SETTINGS: '/settings',
} as const;

export const DEFAULT_PAGE_SIZE = 25;
export const API_TIMEOUT_MS = 15000;
