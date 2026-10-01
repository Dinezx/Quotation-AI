import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthCallbackPage, resetOAuthCallbackState } from '../pages/AuthCallbackPage';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { apiClient } from '../api/apiClient';

// Mock supabase and apiClient
vi.mock('../lib/supabaseClient', () => {
  return {
    isSupabaseConfigured: true,
    supabase: {
      auth: {
        exchangeCodeForSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
        setSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
        getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
        signInWithOAuth: vi.fn().mockResolvedValue({ data: {}, error: null }),
        signInWithPassword: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
        signOut: vi.fn().mockResolvedValue({ error: null }),
        onAuthStateChange: vi.fn(() => ({
          data: { subscription: { unsubscribe: vi.fn() } },
        })),
      },
    },
  };
});

vi.mock('../api/apiClient', () => {
  const getMock = vi.fn();
  const postMock = vi.fn();
  return {
    apiClient: {
      get: getMock,
      post: postMock,
      defaults: { baseURL: 'http://localhost:8000/api/v1' },
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() },
      },
    },
  };
});

describe('Google OAuth & AuthCallbackPage Definitive Scenarios', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetOAuthCallbackState();
    localStorage.clear();
    // Default getSession to return null session
    vi.mocked(supabase.auth.getSession).mockResolvedValue({ data: { session: null }, error: null });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    localStorage.clear();
    window.history.pushState({}, '', '/');
  });

  // Case 25: New Google user → OAuth → company onboarding.
  it('Case 25: New Google user without company -> Redirects to /onboarding/company', async () => {
    window.history.pushState({}, '', '/auth/callback?code=new-user-code');

    vi.mocked(supabase.auth.exchangeCodeForSession).mockResolvedValue({
      data: {
        session: {
          access_token: 'valid-google-jwt-new-user',
          user: { email: 'new.lead@shop.in', id: 'usr-new-456' },
        },
      } as any,
      error: null,
    });

    // /auth/me returns 403 No associated tenant company
    vi.mocked(apiClient.get).mockRejectedValue({
      response: {
        status: 403,
        data: { detail: 'User has no associated tenant company' },
      },
    });

    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: {
        user: { id: 'usr-new-456', email: 'new.lead@shop.in', user_metadata: { full_name: 'Lead Engineer' } },
      } as any,
      error: null,
    });

    render(
      <MemoryRouter initialEntries={['/auth/callback?code=new-user-code']}>
        <AuthProvider>
          <Routes>
            <Route path="/auth/callback" element={<AuthCallbackPage />} />
            <Route path="/onboarding/company" element={<div data-testid="onboarding-page">Onboarding</div>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('onboarding-page')).toBeInTheDocument();
    });

    expect(localStorage.getItem('quotation_ai_auth_token')).toBe('valid-google-jwt-new-user');
  });

  // Case 26: Existing Google user → OAuth → dashboard.
  it('Case 26: Existing Google user with company -> Redirects to /dashboard', async () => {
    window.history.pushState({}, '', '/auth/callback?code=valid-auth-code');

    const mockExchange = vi.mocked(supabase.auth.exchangeCodeForSession).mockResolvedValue({
      data: {
        session: {
          access_token: 'valid-google-jwt-existing-user',
          user: { email: 'engineer@precision.in', id: 'usr-123' },
        },
      } as any,
      error: null,
    });

    vi.mocked(apiClient.get).mockResolvedValue({
      data: {
        user: { id: 'usr-123', email: 'engineer@precision.in', role: 'ADMIN', company_id: 'comp-1' },
        company: { id: 'comp-1', name: 'Precision Engineering' },
      },
    });

    render(
      <MemoryRouter initialEntries={['/auth/callback?code=valid-auth-code']}>
        <AuthProvider>
          <Routes>
            <Route path="/auth/callback" element={<AuthCallbackPage />} />
            <Route path="/dashboard" element={<div data-testid="dashboard-page">Dashboard</div>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(mockExchange).toHaveBeenCalledWith('valid-auth-code');
      expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
    });

    expect(localStorage.getItem('quotation_ai_auth_token')).toBe('valid-google-jwt-existing-user');
  });

  // Case 27: Refresh /auth/callback after successful login (no code, recovers active session).
  it('Case 27: Refresh /auth/callback recovers active session and redirects to dashboard', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: {
        session: {
          access_token: 'active-session-token',
          user: { email: 'engineer@precision.in', id: 'usr-123' },
        },
      } as any,
      error: null,
    });

    vi.mocked(apiClient.get).mockResolvedValue({
      data: {
        user: { id: 'usr-123', email: 'engineer@precision.in', role: 'ADMIN', company_id: 'comp-1' },
        company: { id: 'comp-1', name: 'Precision Engineering' },
      },
    });

    render(
      <MemoryRouter initialEntries={['/auth/callback']}>
        <AuthProvider>
          <Routes>
            <Route path="/auth/callback" element={<AuthCallbackPage />} />
            <Route path="/dashboard" element={<div data-testid="dashboard-page">Dashboard</div>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
    });
  });

  // Case 28: Open /auth/callback without a code and no session -> Shows timeout notice.
  it('Case 28: Open /auth/callback without a code and no session -> Shows timeout notice', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
      data: { session: null },
      error: null,
    });

    render(
      <MemoryRouter initialEntries={['/auth/callback']}>
        <AuthProvider>
          <Routes>
            <Route path="/auth/callback" element={<AuthCallbackPage />} />
            <Route path="/login" element={<div data-testid="login-page">Login Page</div>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Authentication Window Timed Out/i)).toBeInTheDocument();
    });

    const returnBtn = screen.getByRole('button', { name: /Back to Login/i });
    fireEvent.click(returnBtn);

    await waitFor(() => {
      expect(screen.getByTestId('login-page')).toBeInTheDocument();
    });
  });

  // Case 29: Reuse an already-consumed code -> Recovers session instead of showing "invalid flow state".
  it('Case 29: Reuse an already-consumed code -> Recovers session via getSession()', async () => {
    // When code is consumed, exchangeCodeForSession returns error "invalid flow state"
    vi.mocked(supabase.auth.exchangeCodeForSession).mockResolvedValueOnce({
      data: { session: null } as any,
      error: { message: 'invalid flow state, no valid flow state found' } as any,
    });

    // But getSession() has the active session
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: {
        session: {
          access_token: 'recovered-token-after-flow-state',
          user: { email: 'lead@shop.in', id: 'usr-456' },
        },
      } as any,
      error: null,
    });

    vi.mocked(apiClient.get).mockResolvedValue({
      data: {
        user: { id: 'usr-456', email: 'lead@shop.in', role: 'ADMIN', company_id: 'comp-2' },
        company: { id: 'comp-2', name: 'Precision CNC' },
      },
    });

    render(
      <MemoryRouter initialEntries={['/auth/callback?code=already-consumed-code']}>
        <AuthProvider>
          <Routes>
            <Route path="/auth/callback" element={<AuthCallbackPage />} />
            <Route path="/dashboard" element={<div data-testid="dashboard-page">Dashboard</div>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
    });

    expect(localStorage.getItem('quotation_ai_auth_token')).toBe('recovered-token-after-flow-state');
  });

  // Case 30: Backend unavailable -> Shows "Quotation AI services are temporarily unavailable."
  it('Case 30: Backend unavailable -> Shows friendly unavailable message', async () => {
    vi.mocked(supabase.auth.exchangeCodeForSession).mockResolvedValue({
      data: {
        session: {
          access_token: 'valid-google-jwt',
          user: { email: 'lead@shop.in', id: 'usr-456' },
        },
      } as any,
      error: null,
    });

    // Simulate network error / connection refused (no response)
    vi.mocked(apiClient.get).mockRejectedValue(new Error('Network Error: net::ERR_CONNECTION_REFUSED'));

    render(
      <MemoryRouter initialEntries={['/auth/callback?code=valid-code']}>
        <AuthProvider>
          <Routes>
            <Route path="/auth/callback" element={<AuthCallbackPage />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Quotation AI services are temporarily unavailable./i)).toBeInTheDocument();
    });
  });

  // Case 31: Expired or invalid code without recovery -> Shows clear error message.
  it('Case 31: Expired/invalid OAuth code without session -> Shows error message', async () => {
    vi.mocked(supabase.auth.exchangeCodeForSession).mockResolvedValueOnce({
      data: { session: null } as any,
      error: { message: 'The authorization code has expired' } as any,
    });

    vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
      data: { session: null },
      error: null,
    });

    render(
      <MemoryRouter initialEntries={['/auth/callback?code=expired-code-123']}>
        <AuthProvider>
          <Routes>
            <Route path="/auth/callback" element={<AuthCallbackPage />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/The authorization code has expired/i)).toBeInTheDocument();
    });
  });

  // Case: User denies consent.
  it('Case: User denies Google consent -> Renders user-friendly cancellation notice', async () => {
    render(
      <MemoryRouter initialEntries={['/auth/callback?error=access_denied']}>
        <AuthProvider>
          <Routes>
            <Route path="/auth/callback" element={<AuthCallbackPage />} />
            <Route path="/login" element={<div data-testid="login-page">Login Page</div>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    expect(screen.getByText(/Sign In Was Not Completed/i)).toBeInTheDocument();
    expect(screen.getByText(/Google Sign In was cancelled/i)).toBeInTheDocument();

    const returnBtn = screen.getByRole('button', { name: /Return to Sign In/i });
    fireEvent.click(returnBtn);

    await waitFor(() => {
      expect(screen.getByTestId('login-page')).toBeInTheDocument();
    });
  });

  // Case: 10-second hard timeout.
  it('Case: Hard timeout triggers after 10 seconds if callback hangs', async () => {
    vi.useFakeTimers();

    try {
      vi.mocked(supabase.auth.exchangeCodeForSession).mockImplementation(() => new Promise(() => {}));

      render(
        <MemoryRouter initialEntries={['/auth/callback?code=hung-code']}>
          <AuthProvider>
            <Routes>
              <Route path="/auth/callback" element={<AuthCallbackPage />} />
            </Routes>
          </AuthProvider>
        </MemoryRouter>
      );

      expect(screen.getByText(/Signing you in…/i)).toBeInTheDocument();

      await act(async () => {
        await vi.advanceTimersByTimeAsync(10500);
      });

      expect(screen.getByText(/We couldn't complete Google sign-in. Try again./i)).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  // Case 32: Logout and login again.
  it('Case 32: Logout cleans token and state, enabling login again', async () => {
    const TestComponent: React.FC = () => {
      const { logout, login, isAuthenticated } = useAuth();
      return (
        <div>
          <div data-testid="auth-status">{isAuthenticated ? 'authenticated' : 'unauthenticated'}</div>
          <button onClick={() => logout()}>Execute Logout</button>
          <button onClick={() => login('test@mfg.in', 'pw123')}>Execute Login</button>
        </div>
      );
    };

    localStorage.setItem('quotation_ai_auth_token', 'initial-token');

    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
      data: {
        session: { access_token: 'new-login-token' },
      } as any,
      error: null,
    });

    vi.mocked(apiClient.get).mockResolvedValue({
      data: {
        user: { id: 'usr-1', email: 'test@mfg.in', role: 'ADMIN', company_id: 'comp-1' },
        company: { id: 'comp-1', name: 'Test Mfg' },
      },
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Click logout
    fireEvent.click(screen.getByText('Execute Logout'));

    await waitFor(() => {
      expect(localStorage.getItem('quotation_ai_auth_token')).toBeNull();
      expect(screen.getByTestId('auth-status')).toHaveTextContent('unauthenticated');
    });

    // Login again
    fireEvent.click(screen.getByText('Execute Login'));

    await waitFor(() => {
      expect(localStorage.getItem('quotation_ai_auth_token')).toBe('new-login-token');
      expect(screen.getByTestId('auth-status')).toHaveTextContent('authenticated');
    });
  });

  // Case 33: Password login still works.
  it('Case 33: Password login works with associated company', async () => {
    const TestLoginComponent: React.FC = () => {
      const { login } = useAuth();
      const [res, setRes] = React.useState<any>(null);

      return (
        <div>
          <button
            onClick={async () => {
              const r = await login('lead@precision.in', 'securepass123');
              setRes(r);
            }}
          >
            Execute Login
          </button>
          {res && <div data-testid="login-result">{JSON.stringify(res)}</div>}
        </div>
      );
    };

    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
      data: {
        session: { access_token: 'pwd-token-789' },
      } as any,
      error: null,
    });

    vi.mocked(apiClient.get).mockResolvedValue({
      data: {
        user: { id: 'usr-pwd-1', email: 'lead@precision.in', role: 'ADMIN', company_id: 'comp-1' },
        company: { id: 'comp-1', name: 'Precision Mfg' },
      },
    });

    render(
      <AuthProvider>
        <TestLoginComponent />
      </AuthProvider>
    );

    fireEvent.click(screen.getByText('Execute Login'));

    await waitFor(() => {
      expect(screen.getByTestId('login-result')).toHaveTextContent('"success":true');
      expect(screen.getByTestId('login-result')).toHaveTextContent('"needsOnboarding":false');
    });

    expect(localStorage.getItem('quotation_ai_auth_token')).toBe('pwd-token-789');
  });
});
