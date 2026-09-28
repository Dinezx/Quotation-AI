import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiClient } from '../lib/apiClient';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';

export interface AuthUser {
  id: string;
  email: string;
  fullName?: string;
  role: 'ADMIN' | 'COSTING_ENGINEER' | 'VIEWER' | string;
  companyId: string;
}

export interface AuthCompany {
  id: string;
  name: string;
  legalName?: string;
  gstin?: string;
  address?: string;
  phone?: string;
  email?: string;
  settings?: Record<string, any>;
}

interface AuthContextType {
  user: AuthUser | null;
  company: AuthCompany | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  token: string | null;
  login: (emailOrToken: string, password?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [company, setCompany] = useState<AuthCompany | null>(null);
  const [token, setToken] = useState<string | null>(
    () => localStorage.getItem('quotation_ai_auth_token')
  );
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Synchronize authenticated session profile with backend
  const verifyAndSyncBackend = useCallback(async (authToken: string | null) => {
    if (!authToken) {
      setUser(null);
      setCompany(null);
      setIsLoading(false);
      return false;
    }

    try {
      const res = await apiClient.get('/auth/me', {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (res.data?.user && res.data?.company) {
        setUser({
          id: res.data.user.id,
          email: res.data.user.email,
          fullName: res.data.user.full_name || undefined,
          role: res.data.user.role,
          companyId: res.data.user.company_id,
        });

        setCompany({
          id: res.data.company.id,
          name: res.data.company.name,
          legalName: res.data.company.legal_name || undefined,
          gstin: res.data.company.gstin || undefined,
          address: res.data.company.address || undefined,
          phone: res.data.company.phone || undefined,
          email: res.data.company.email || undefined,
          settings: res.data.company.settings || {},
        });
        return true;
      }
      throw new Error('Invalid authentication response structure');
    } catch (err: any) {
      console.warn('[AuthContext] Backend token verification failed:', err.response?.data?.detail || err.message);
      localStorage.removeItem('quotation_ai_auth_token');
      setToken(null);
      setUser(null);
      setCompany(null);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial session hydration
  useEffect(() => {
    let isMounted = true;

    async function initSession() {
      // 1. If Supabase configured, check active Supabase session
      if (isSupabaseConfigured) {
        try {
          const { data: { session }, error } = await supabase.auth.getSession();
          if (!error && session?.access_token) {
            if (isMounted) {
              localStorage.setItem('quotation_ai_auth_token', session.access_token);
              setToken(session.access_token);
              await verifyAndSyncBackend(session.access_token);
              return;
            }
          }
        } catch (supabaseErr) {
          console.debug('[AuthContext] Supabase session retrieval error:', supabaseErr);
        }
      }

      // 2. Check local storage token
      const savedToken = localStorage.getItem('quotation_ai_auth_token');
      if (isMounted) {
        await verifyAndSyncBackend(savedToken);
      }
    }

    initSession();

    // 3. Listen to Supabase Auth State changes
    let authSubscription: { unsubscribe: () => void } | null = null;
    if (isSupabaseConfigured) {
      const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          if (session?.access_token) {
            localStorage.setItem('quotation_ai_auth_token', session.access_token);
            setToken(session.access_token);
            await verifyAndSyncBackend(session.access_token);
          }
        } else if (event === 'SIGNED_OUT') {
          localStorage.removeItem('quotation_ai_auth_token');
          setToken(null);
          setUser(null);
          setCompany(null);
          setIsLoading(false);
        }
      });
      authSubscription = data.subscription;
    }

    return () => {
      isMounted = false;
      if (authSubscription) {
        authSubscription.unsubscribe();
      }
    };
  }, [verifyAndSyncBackend]);

  const login = async (emailOrToken: string, password?: string) => {
    setIsLoading(true);

    try {
      // Case A: Supabase Auth Email/Password login
      if (password !== undefined && isSupabaseConfigured) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: emailOrToken,
          password,
        });

        if (error) {
          throw new Error(error.message);
        }

        const accessToken = data.session?.access_token;
        if (!accessToken) {
          throw new Error('Supabase did not return an access token');
        }

        localStorage.setItem('quotation_ai_auth_token', accessToken);
        setToken(accessToken);
        const verified = await verifyAndSyncBackend(accessToken);
        if (!verified) {
          throw new Error('Authentication verified with Supabase, but no active tenant is linked in the Quotation AI database.');
        }
        return;
      }

      // Case B: Direct token login or JWT token passed directly
      const rawToken = emailOrToken;
      localStorage.setItem('quotation_ai_auth_token', rawToken);
      setToken(rawToken);
      const verified = await verifyAndSyncBackend(rawToken);
      if (!verified) {
        throw new Error('Session token rejected by Quotation AI backend authentication service.');
      }
    } catch (err) {
      setIsLoading(false);
      throw err;
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      if (isSupabaseConfigured) {
        await supabase.auth.signOut();
      }
    } catch (err) {
      console.debug('[AuthContext] Sign out error:', err);
    } finally {
      localStorage.removeItem('quotation_ai_auth_token');
      setToken(null);
      setUser(null);
      setCompany(null);
      setIsLoading(false);
    }
  };

  const refreshSession = async () => {
    const currentToken = localStorage.getItem('quotation_ai_auth_token');
    await verifyAndSyncBackend(currentToken);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        company,
        isAuthenticated: Boolean(user && company),
        isLoading,
        token,
        login,
        logout,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
