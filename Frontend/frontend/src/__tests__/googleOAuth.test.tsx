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

  // Case 34: Backend 500 error shows unavailable state, and Retry Connection recovers when backend is back
  it('Case 34: Backend 500 -> Shows unavailable, Retry Connection succeeds after service recovers', async () => {
    window.history.pushState({}, '', '/auth/callback?code=retry-recovery-code');

    vi.mocked(supabase.auth.exchangeCodeForSession).mockResolvedValue({
      data: {
        session: {
          access_token: 'recovered-google-jwt',
          user: { email: 'plant.admin@mfg.in', id: 'usr-admin-1' },
        },
      } as any,
      error: null,
    });

    // First call to /auth/me returns 500 Internal Server Error
    vi.mocked(apiClient.get).mockRejectedValueOnce({
      response: {
        status: 500,
        data: { detail: 'Internal Database Connection Error' },
      },
    });

    render(
      <MemoryRouter initialEntries={['/auth/callback?code=retry-recovery-code']}>
        <AuthProvider>
          <Routes>
            <Route path="/auth/callback" element={<AuthCallbackPage />} />
            <Route path="/dashboard" element={<div data-testid="dashboard-page">Dashboard</div>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    // Should display unavailable message without clearing token
    await waitFor(() => {
      expect(screen.getByText(/We couldn't connect to Quotation AI right now./i)).toBeInTheDocument();
      expect(screen.getByText(/Quotation AI services are temporarily unavailable./i)).toBeInTheDocument();
    });

    // Token must STILL be in storage (Phase 4 requirement: Supabase session NOT destroyed)
    expect(localStorage.getItem('quotation_ai_auth_token')).toBe('recovered-google-jwt');

    // Backend recovers: subsequent call to /auth/me returns 200
    vi.mocked(apiClient.get).mockResolvedValueOnce({
      data: {
        user: { id: 'usr-admin-1', email: 'plant.admin@mfg.in', role: 'ADMIN', company_id: 'comp-admin' },
        company: { id: 'comp-admin', name: 'Precision Plant 1' },
      },
    });

    // User clicks "Retry Connection"
    const retryBtn = screen.getByRole('button', { name: /Retry Connection/i });
    fireEvent.click(retryBtn);

    // Successfully navigates to dashboard
    await waitFor(() => {
      expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
    });
  });

  // Case 35: Backend 401 Unauthorized -> Clears invalid session and redirects to /login
  it('Case 35: Backend 401 Unauthorized -> Redirects to /login and clears session', async () => {
    window.history.pushState({}, '', '/auth/callback?code=unauthorized-code');

    vi.mocked(supabase.auth.exchangeCodeForSession).mockResolvedValue({
      data: {
        session: {
          access_token: 'revoked-token',
          user: { email: 'revoked@shop.in', id: 'usr-revoked' },
        },
      } as any,
      error: null,
    });

    vi.mocked(apiClient.get).mockRejectedValueOnce({
      response: {
        status: 401,
        data: { detail: 'Token has been revoked or expired' },
      },
    });

    render(
      <MemoryRouter initialEntries={['/auth/callback?code=unauthorized-code']}>
        <AuthProvider>
          <Routes>
            <Route path="/auth/callback" element={<AuthCallbackPage />} />
            <Route path="/login" element={<div data-testid="login-page">Login Page</div>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('login-page')).toBeInTheDocument();
    });

    expect(localStorage.getItem('quotation_ai_auth_token')).toBeNull();
  });

  // Case 36: Duplicate callback execution / React StrictMode rerender -> Only exchanges code once
  it('Case 36: Duplicate callback execution only exchanges code once', async () => {
    window.history.pushState({}, '', '/auth/callback?code=strict-mode-code');

    const exchangeMock = vi.mocked(supabase.auth.exchangeCodeForSession).mockResolvedValue({
      data: {
        session: {
          access_token: 'strict-mode-jwt',
          user: { email: 'lead@shop.in', id: 'usr-sm' },
        },
      } as any,
      error: null,
    });

    vi.mocked(apiClient.get).mockResolvedValue({
      data: {
        user: { id: 'usr-sm', email: 'lead@shop.in', role: 'ADMIN', company_id: 'comp-sm' },
        company: { id: 'comp-sm', name: 'Strict Mode Mfg' },
      },
    });

    const { unmount } = render(
      <MemoryRouter initialEntries={['/auth/callback?code=strict-mode-code']}>
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

    // Unmount and remount (simulating StrictMode or rapid navigation)
    unmount();

    render(
      <MemoryRouter initialEntries={['/auth/callback?code=strict-mode-code']}>
        <AuthProvider>
          <Routes>
            <Route path="/auth/callback" element={<AuthCallbackPage />} />
            <Route path="/dashboard" element={<div data-testid="dashboard-page">Dashboard</div>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    // exchangeCodeForSession should only be called ONCE for the same code
    expect(exchangeMock).toHaveBeenCalledTimes(1);
  });

  // Scenario: First Google login initiation requests standard scopes without consent prompt or offline access
  it('Scenario: First Google login calls signInWithOAuth with openid, email, profile and no prompt/offline params', async () => {
    const TestComponent: React.FC = () => {
      const { loginWithGoogle } = useAuth();
      return (
        <div>
          <button onClick={() => loginWithGoogle()}>Sign in with Google</button>
        </div>
      );
    };

    const signInMock = vi.mocked(supabase.auth.signInWithOAuth).mockResolvedValue({
      data: { provider: 'google', url: 'https://accounts.google.com/o/oauth2/v2/auth?...' },
      error: null,
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: /Sign in with Google/i }));

    await waitFor(() => {
      expect(signInMock).toHaveBeenCalledTimes(1);
    });

    const callArgs = signInMock.mock.calls[0][0];
    expect(callArgs.provider).toBe('google');
    expect(callArgs.options?.scopes).toBe('openid email profile');
    expect(callArgs.options?.redirectTo).toContain('/auth/callback');

    // Ensure prompt: 'consent' and access_type: 'offline' were removed
    const queryParams = (callArgs.options as any)?.queryParams;
    expect(queryParams?.prompt).toBeUndefined();
    expect(queryParams?.access_type).toBeUndefined();
  });

  // Scenario: Existing Supabase session is reused on subsequent login without calling signInWithOAuth
  it('Scenario: Existing Supabase session is reused directly without triggering new Google OAuth redirect', async () => {
    const TestComponent: React.FC = () => {
      const { loginWithGoogle, isAuthenticated, user, company } = useAuth();
      return (
        <div>
          <div data-testid="auth-state">{isAuthenticated ? 'logged-in' : 'logged-out'}</div>
          <div data-testid="user-email">{user?.email || 'no-user'}</div>
          <div data-testid="company-name">{company?.name || 'no-company'}</div>
          <button onClick={() => loginWithGoogle()}>Sign in with Google</button>
        </div>
      );
    };

    // Active session already present in Supabase
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: {
        session: {
          access_token: 'existing-active-sb-jwt',
          user: { email: 'workshop.lead@precision.in', id: 'usr-reuse-1' },
        },
      } as any,
      error: null,
    });

    vi.mocked(apiClient.get).mockResolvedValue({
      data: {
        user: { id: 'usr-reuse-1', email: 'workshop.lead@precision.in', role: 'ADMIN', company_id: 'comp-reuse-1' },
        company: { id: 'comp-reuse-1', name: 'Precision CNC Works' },
      },
    });

    const signInMock = vi.mocked(supabase.auth.signInWithOAuth);

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: /Sign in with Google/i }));

    await waitFor(() => {
      expect(screen.getByTestId('auth-state')).toHaveTextContent('logged-in');
      expect(screen.getByTestId('user-email')).toHaveTextContent('workshop.lead@precision.in');
      expect(screen.getByTestId('company-name')).toHaveTextContent('Precision CNC Works');
    });

    // signInWithOAuth must NOT have been called because session was reused
    expect(signInMock).not.toHaveBeenCalled();
    expect(localStorage.getItem('quotation_ai_auth_token')).toBe('existing-active-sb-jwt');
  });

  // Scenario: Concurrent/duplicate loginWithGoogle calls do not trigger duplicate OAuth redirects
  it('Scenario: Duplicate loginWithGoogle calls are deduplicated and do not produce multiple redirects', async () => {
    const TestComponent: React.FC = () => {
      const { loginWithGoogle } = useAuth();
      return (
        <div>
          <button onClick={() => {
            loginWithGoogle();
            loginWithGoogle();
          }}>Double Click Google</button>
        </div>
      );
    };

    let resolveSignIn: any;
    const signInPromise = new Promise<{ data: any; error: any }>((resolve) => {
      resolveSignIn = resolve;
    });

    const signInMock = vi.mocked(supabase.auth.signInWithOAuth).mockReturnValue(signInPromise as any);

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: /Double Click Google/i }));

    // Only one signInWithOAuth call should be dispatched
    await waitFor(() => {
      expect(signInMock).toHaveBeenCalledTimes(1);
    });

    await act(async () => {
      resolveSignIn({ data: {}, error: null });
    });
  });
});
