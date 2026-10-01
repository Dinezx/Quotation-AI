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

export interface SyncResult {
  success: boolean;
  needsOnboarding: boolean;
  errorStatus?: number;
  errorDetail?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  company: AuthCompany | null;
  isAuthenticated: boolean;
  needsOnboarding: boolean;
  isLoading: boolean;
  backendAvailable: boolean;
  token: string | null;
  login: (emailOrToken: string, password?: string) => Promise<SyncResult>;
  signUp: (data: {
    email: string;
    password?: string;
    fullName: string;
    companyName: string;
    phone?: string;
  }) => Promise<void>;
  completeOnboarding: (data: {
    companyName: string;
    legalName?: string;
    gstin?: string;
    address?: string;
    phone?: string;
    contactEmail?: string;
    fullName?: string;
  }) => Promise<any>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<SyncResult>;
}

export const getAppRedirectUrl = (): string => {
  const customBase =
    (import.meta as any).env?.VITE_APP_URL ||
    (import.meta as any).env?.VITE_PUBLIC_URL ||
    '';
  const origin = customBase ? customBase.replace(/\/+$/, '') : window.location.origin;
  return `${origin}/auth/callback`;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [company, setCompany] = useState<AuthCompany | null>(null);
  const [needsOnboarding, setNeedsOnboarding] = useState<boolean>(false);
  const [token, setToken] = useState<string | null>(
    () => localStorage.getItem('quotation_ai_auth_token')
  );
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [backendAvailable, setBackendAvailable] = useState<boolean>(true);

  // Synchronize authenticated session profile with backend
  const verifyAndSyncBackend = useCallback(async (authToken: string | null): Promise<SyncResult> => {
    if (!authToken) {
      setUser(null);
      setCompany(null);
      setNeedsOnboarding(false);
      setIsLoading(false);
      return { success: false, needsOnboarding: false };
    }

    try {
      console.debug('[Auth] /auth/me started');
      const res = await apiClient.get('/auth/me', {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      // If user logged out while request was in-flight, discard response
      if (localStorage.getItem('quotation_ai_auth_token') !== authToken) {
        return { success: false, needsOnboarding: false };
      }

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
        setNeedsOnboarding(false);
        setBackendAvailable(true);
        console.debug('[Auth] /auth/me result: User associated with company', res.data.company.name);
        return { success: true, needsOnboarding: false };
      }
      throw new Error('Invalid authentication response structure');
    } catch (err: any) {
      const errStatus = err.response?.status;
      const detail = (err.response?.data?.detail || '').toLowerCase();
      console.debug('[Auth] /auth/me result: error', { status: errStatus, detail });

      // If 403 (User has no associated tenant company) -> user needs first-time onboarding
      if (errStatus === 403) {
        if (detail.includes('no associated tenant company') || detail.includes('no valid company association')) {
          let sbUser: any = null;
          if (isSupabaseConfigured) {
            try {
              const { data } = await supabase.auth.getUser(authToken);
              sbUser = data.user;
            } catch (uErr) {
              console.debug('[Auth] getUser error:', uErr);
            }
          }
          const email = sbUser?.email || '';
          const name = sbUser?.user_metadata?.full_name || sbUser?.user_metadata?.name || (email ? email.split('@')[0] : 'Costing Lead');
          setUser({
            id: sbUser?.id || 'pending-user',
            email: email,
            fullName: name,
            role: 'ADMIN',
            companyId: '',
          });
          setCompany(null);
          setNeedsOnboarding(true);
          setBackendAvailable(true);
          return { success: true, needsOnboarding: true };
        }
      }

      // Detect network / connection failures (e.g. backend server is down or ERR_CONNECTION_REFUSED)
      const isNetworkError =
        !err.response ||
        err.code === 'ERR_NETWORK' ||
        err.code === 'ECONNREFUSED' ||
        (typeof err.message === 'string' && (
          err.message.includes('Network Error') ||
          err.message.includes('ERR_CONNECTION_REFUSED') ||
          err.message.includes('Failed to fetch')
        ));

      const isServerError = typeof errStatus === 'number' && errStatus >= 500;

      const friendlyError = (isNetworkError || isServerError)
        ? 'Quotation AI services are temporarily unavailable.'
        : (err.response?.data?.detail || err.message || 'Authentication verification failed.');

      console.warn('[Auth] Backend token verification failed:', friendlyError);

      if (isNetworkError || isServerError) {
        setBackendAvailable(false);
        // PHASE 4 RULE: Never destroy the valid Supabase session just because backend is down!
        // The user remains authenticated with Supabase.
        return { 
          success: false, 
          needsOnboarding: false, 
          errorStatus: isNetworkError ? 0 : errStatus, 
          errorDetail: friendlyError
        };
      }

      // Only on explicit 401 Unauthorized (token invalid / expired / revoked): wipe session
      if (errStatus === 401) {
        localStorage.removeItem('quotation_ai_auth_token');
        setToken(null);
        setUser(null);
        setCompany(null);
        setNeedsOnboarding(false);
      }

      return { 
        success: false, 
        needsOnboarding: false, 
        errorStatus: errStatus, 
        errorDetail: friendlyError
      };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial session hydration
  useEffect(() => {
    let isMounted = true;

    // When on /auth/callback, DO NOT run background initSession or compete with AuthCallbackPage!
    if (window.location.pathname.startsWith('/auth/callback')) {
      setIsLoading(false);
      return;
    }

    async function initSession() {
      // 1. If Supabase configured, check active Supabase session
      if (isSupabaseConfigured) {
        try {
          const res = await supabase.auth.getSession();
          const session = res?.data?.session;
          if (session?.access_token) {
            if (isMounted) {
              localStorage.setItem('quotation_ai_auth_token', session.access_token);
              setToken(session.access_token);
              await verifyAndSyncBackend(session.access_token);
              return;
            }
          }
        } catch (supabaseErr) {
          console.debug('[Auth] Supabase session retrieval error:', supabaseErr);
        }
      }

      // 2. Check local storage token (strictly verified with backend /api/v1/auth/me)
      const savedToken = localStorage.getItem('quotation_ai_auth_token');
      if (savedToken && isMounted) {
        await verifyAndSyncBackend(savedToken);
      } else if (isMounted) {
        setIsLoading(false);
      }
    }

    initSession();

    // 3. Listen to Supabase Auth State changes
    let authSubscription: { unsubscribe: () => void } | null = null;
    if (isSupabaseConfigured) {
      const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
        // Skip background sync on /auth/callback because AuthCallbackPage drives it explicitly
        if (window.location.pathname.startsWith('/auth/callback')) {
          return;
        }
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
          setNeedsOnboarding(false);
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

  const login = async (emailOrToken: string, password?: string): Promise<SyncResult> => {
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
        const syncResult = await verifyAndSyncBackend(accessToken);
        if (!syncResult.success) {
          throw new Error('Authentication verified with Supabase, but failed to connect to Quotation AI backend.');
        }
        return syncResult;
      }

      // Case B: Direct token login or JWT token passed directly
      const rawToken = emailOrToken;
      localStorage.setItem('quotation_ai_auth_token', rawToken);
      setToken(rawToken);
      const syncResult = await verifyAndSyncBackend(rawToken);
      if (!syncResult.success) {
        throw new Error('Session token rejected by Quotation AI backend authentication service.');
      }
      return syncResult;
    } catch (err) {
      setIsLoading(false);
      throw err;
    }
  };

  const signUp = async (data: {
    email: string;
    password?: string;
    fullName: string;
    companyName: string;
    phone?: string;
  }) => {
    setIsLoading(true);
    try {
      let sub: string | undefined = undefined;
      let accessToken: string | null = null;

      // 1. If Supabase configured and password provided, create in Supabase Auth
      if (isSupabaseConfigured && data.password) {
        const { data: sbData, error: sbError } = await supabase.auth.signUp({
          email: data.email,
          password: data.password,
          options: {
            data: {
              full_name: data.fullName,
              company_name: data.companyName,
            },
          },
        });

        if (sbError) {
          throw new Error(sbError.message);
        }

        sub = sbData.user?.id;
        accessToken = sbData.session?.access_token || null;
      }

      // 2. Call backend signup API to register tenant company and rate cards
      const res = await apiClient.post('/auth/signup', {
        email: data.email,
        full_name: data.fullName,
        company_name: data.companyName,
        phone: data.phone,
        sub: sub,
      });

      // 3. If token obtained from Supabase
      if (accessToken) {
        localStorage.setItem('quotation_ai_auth_token', accessToken);
        setToken(accessToken);
        await verifyAndSyncBackend(accessToken);
      } else if (!isSupabaseConfigured) {
        // Fallback for local testing or dev without external Supabase
        const newUsr = res.data.user;
        const newComp = res.data.company;
        setUser({
          id: newUsr.id,
          email: newUsr.email,
          fullName: newUsr.full_name,
          role: newUsr.role,
          companyId: newUsr.company_id,
        });
        setCompany({
          id: newComp.id,
          name: newComp.name,
          legalName: newComp.legal_name,
          gstin: newComp.gstin,
          settings: newComp.settings || {},
        });
        setNeedsOnboarding(false);
        const fallbackJwt = `mock-token-${newUsr.id}`;
        localStorage.setItem('quotation_ai_auth_token', fallbackJwt);
        setToken(fallbackJwt);
      } else if (data.password) {
        try {
          await login(data.email, data.password);
        } catch (loginErr) {
          console.debug('[AuthContext] Post-signup login attempt:', loginErr);
        }
      }
    } catch (err) {
      setIsLoading(false);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const completeOnboarding = async (data: {
    companyName: string;
    legalName?: string;
    gstin?: string;
    address?: string;
    phone?: string;
    contactEmail?: string;
    fullName?: string;
  }) => {
    setIsLoading(true);
    try {
      const activeToken = token || localStorage.getItem('quotation_ai_auth_token');
      if (!activeToken) {
        throw new Error('No active session token found. Please sign in again.');
      }

      const res = await apiClient.post('/auth/onboarding', {
        company_name: data.companyName,
        legal_name: data.legalName,
        gstin: data.gstin,
        address: data.address,
        phone: data.phone,
        contact_email: data.contactEmail,
        full_name: data.fullName,
      }, {
        headers: {
          Authorization: `Bearer ${activeToken}`,
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

        setNeedsOnboarding(false);
        return res.data;
      }
      throw new Error('Onboarding response missing user or company entity.');
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithGoogle = useCallback(async () => {
    setIsLoading(true);
    try {
      if (!isSupabaseConfigured) {
        throw new Error(
          'Supabase is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment.'
        );
      }
      const callbackUrl = getAppRedirectUrl();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: callbackUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });
      if (error) {
        throw new Error(error.message);
      }
    } catch (err) {
      setIsLoading(false);
      throw err;
    }
  }, []);

  const logout = useCallback(async () => {
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
      setNeedsOnboarding(false);
      setIsLoading(false);
    }
  }, []);

  const refreshSession = useCallback(async (): Promise<SyncResult> => {
    const currentToken = localStorage.getItem('quotation_ai_auth_token');
    return await verifyAndSyncBackend(currentToken);
  }, [verifyAndSyncBackend]);

  return (
    <AuthContext.Provider
      value={{
        user,
        company,
        isAuthenticated: Boolean(user && company),
        needsOnboarding,
        isLoading,
        backendAvailable,
        token,
        login,
        signUp,
        completeOnboarding,
        loginWithGoogle,
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
