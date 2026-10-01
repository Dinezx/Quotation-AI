import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthCallbackPage } from '../pages/AuthCallbackPage';
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

  it('Scenario A: Existing Google user with company -> Redirects to /dashboard', async () => {
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

    expect(screen.getByText(/Signing you in…/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(mockExchange).toHaveBeenCalledWith('valid-auth-code');
      expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
    });

    expect(localStorage.getItem('quotation_ai_auth_token')).toBe('valid-google-jwt-existing-user');
  });

  it('Scenario B: New Google user without company -> Redirects to /onboarding/company', async () => {
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

  it('Scenario C: User denies Google consent -> Renders user-friendly cancellation notice and allows return to login', async () => {
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
    expect(returnBtn).toBeVisible();
    fireEvent.click(returnBtn);

    await waitFor(() => {
      expect(screen.getByTestId('login-page')).toBeInTheDocument();
    });
  });

  it('Scenario D: OAuth callback error -> Renders error state with retry and return options', async () => {
    render(
      <MemoryRouter initialEntries={['/auth/callback?error=server_error&error_description=Internal+provider+failure']}>
        <AuthProvider>
          <Routes>
            <Route path="/auth/callback" element={<AuthCallbackPage />} />
            <Route path="/login" element={<div data-testid="login-page">Login Page</div>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    expect(screen.getByText(/Sign In Was Not Completed/i)).toBeInTheDocument();
    expect(screen.getByText(/Internal provider failure/i)).toBeInTheDocument();

    const returnBtn = screen.getByRole('button', { name: /Return to Sign In/i });
    fireEvent.click(returnBtn);

    await waitFor(() => {
      expect(screen.getByTestId('login-page')).toBeInTheDocument();
    });
  });

  it('Scenario E: Missing authorization code/session -> Shows expired/missing notice and directs to login', async () => {
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

  it('Scenario F: Expired or invalid code -> Handled gracefully with retry guidance', async () => {
    vi.mocked(supabase.auth.exchangeCodeForSession).mockResolvedValueOnce({
      data: { session: null } as any,
      error: { message: 'The authorization code has expired' } as any,
    });

    render(
      <MemoryRouter initialEntries={['/auth/callback?code=expired-code-123']}>
        <AuthProvider>
          <Routes>
            <Route path="/auth/callback" element={<AuthCallbackPage />} />
            <Route path="/login" element={<div data-testid="login-page">Login Page</div>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/The authorization code has expired/i)).toBeInTheDocument();
    });
  });

  it('Scenario G: Hard timeout triggers after 10 seconds if callback hangs', async () => {
    vi.useFakeTimers();

    try {
      // exchangeCodeForSession never resolves (simulating hung network connection)
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

      // Advance timer by 10.5 seconds
      await act(async () => {
        await vi.advanceTimersByTimeAsync(10500);
      });

      expect(screen.getByText(/We couldn't complete Google sign-in. Try again./i)).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('Scenario H & I: Password login works with associated company', async () => {
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
