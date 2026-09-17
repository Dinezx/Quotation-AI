import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiClient } from '../lib/apiClient';

export interface AuthUser {
  id: string;
  email: string;
  fullName?: string;
  role: 'ADMIN' | 'COSTING_ENGINEER' | 'VIEWER';
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
}

interface AuthContextType {
  user: AuthUser;
  company: AuthCompany;
  isAuthenticated: boolean;
  isLoading: boolean;
  token: string | null;
  login: (token: string) => Promise<void>;
  logout: () => void;
}

const DEFAULT_DEMO_USER: AuthUser = {
  id: 'usr-bpe-001',
  email: 'r.deshmukh@bharatprecision.co.in',
  fullName: 'Rajesh Deshmukh',
  role: 'COSTING_ENGINEER',
  companyId: 'comp-bpe-pune',
};

const DEFAULT_DEMO_COMPANY: AuthCompany = {
  id: 'comp-bpe-pune',
  name: 'Bharat Precision Engineering Pvt. Ltd.',
  legalName: 'Bharat Precision Engineering Private Limited',
  gstin: '27AAACB1234F1Z8',
  address: 'Plot W-42, MIDC Industrial Area, Phase II, Bhosari, Pune, MH - 411026',
  phone: '+91 20 2712 8840',
  email: 'contact@bharatprecision.co.in',
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser>(DEFAULT_DEMO_USER);
  const [company, setCompany] = useState<AuthCompany>(DEFAULT_DEMO_COMPANY);
  const [token, setToken] = useState<string | null>(localStorage.getItem('quotation_ai_auth_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function syncAuth() {
      try {
        const res = await apiClient.get('/auth/me');
        if (res.data?.user) {
          setUser({
            id: res.data.user.id,
            email: res.data.user.email,
            fullName: res.data.user.full_name,
            role: res.data.user.role,
            companyId: res.data.user.company_id,
          });
        }
        if (res.data?.company) {
          setCompany({
            id: res.data.company.id,
            name: res.data.company.name,
            legalName: res.data.company.legal_name,
            gstin: res.data.company.gstin,
            address: res.data.company.address,
            phone: res.data.company.phone,
            email: res.data.company.email,
          });
        }
      } catch (err) {
        // Fallback gracefully to default tenant credentials
        console.debug('[AuthContext] Backend offline or using demo state:', err);
      } finally {
        setIsLoading(false);
      }
    }
    syncAuth();
  }, [token]);

  const login = async (newToken: string) => {
    localStorage.setItem('quotation_ai_auth_token', newToken);
    setToken(newToken);
  };

  const logout = () => {
    localStorage.removeItem('quotation_ai_auth_token');
    setToken(null);
    setUser(DEFAULT_DEMO_USER);
    setCompany(DEFAULT_DEMO_COMPANY);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        company,
        isAuthenticated: true,
        isLoading,
        token,
        login,
        logout,
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
