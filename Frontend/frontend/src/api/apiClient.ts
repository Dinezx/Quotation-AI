import axios from 'axios';

export const API_BASE_URL =
  (import.meta as any).env?.VITE_API_BASE_URL ||
  (import.meta as any).env?.VITE_API_URL ||
  'http://localhost:8000/api/v1';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';

// Request interceptor for Supabase / JWT auth token
apiClient.interceptors.request.use(
  async (config) => {
    let token: string | null = null;
    if (isSupabaseConfigured) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          token = session.access_token;
          localStorage.setItem('quotation_ai_auth_token', token);
        }
      } catch (err) {
        // Fall back to localStorage
      }
    }
    if (!token) {
      token = localStorage.getItem('quotation_ai_auth_token');
    }
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for unified error formatting
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.warn('[Quotation AI API] 401 Unauthorized encountered');
    }
    return Promise.reject(error);
  }
);

export default apiClient;
