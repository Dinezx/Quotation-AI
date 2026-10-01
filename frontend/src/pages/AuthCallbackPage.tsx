import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AlertTriangle, Clock, ArrowRight, RotateCcw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';

export const AuthCallbackPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { refreshSession, loginWithGoogle } = useAuth();

  const [statusState, setStatusState] = useState<'loading' | 'error' | 'expired'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const isProcessingRef = useRef(false);

  useEffect(() => {
    // Only run if on the /auth/callback path
    if (location.pathname !== '/auth/callback') {
      return;
    }
    if (isProcessingRef.current) {
      return;
    }
    isProcessingRef.current = true;
    let isCancelled = false;

    // 10-second hard timeout
    const timeoutTimer = setTimeout(() => {
      if (!isCancelled) {
        console.warn('[Auth] Callback hard timeout of 10 seconds exceeded');
        setStatusState('expired');
        setErrorMessage("We couldn't complete Google sign-in. Try again.");
      }
    }, 10000);

    async function handleAuthRedirect() {
      if (isCancelled) return;

      try {
        const queryParams = new URLSearchParams(location.search);
        const hashParams = new URLSearchParams(location.hash.replace(/^#/, ''));

        // 1. Check for explicit OAuth cancellation or failure params from provider
        const error = queryParams.get('error') || hashParams.get('error');
        const errorDescription = queryParams.get('error_description') || hashParams.get('error_description');

        if (error) {
          if (isCancelled) return;
          console.warn('[Auth] OAuth callback error detected:', error, errorDescription);
          setStatusState('error');
          if (error === 'access_denied') {
            setErrorMessage('Google Sign In was cancelled. You may try again or sign in with your corporate work email.');
          } else if (
            error === 'redirect_uri_mismatch' ||
            errorDescription?.toLowerCase().includes('redirect_uri_mismatch')
          ) {
            setErrorMessage(
              'Redirect URI Mismatch (Error 400): In Google Cloud Console, ensure Authorized Redirect URIs contains your Supabase Auth callback URL (https://<project-ref>.supabase.co/auth/v1/callback), and in Supabase Dashboard ensure Redirect URLs contains your application callback URL.'
            );
          } else {
            setErrorMessage(errorDescription || `Google OAuth failed (${error}). Please check provider configuration or retry.`);
          }
          return;
        }

        // 2. Check for Playwright / simulated environment tokens
        const mockOAuth = queryParams.get('mock_oauth');
        if (mockOAuth) {
          console.debug('[Auth] Mock OAuth callback detected:', mockOAuth);
          const mockToken = queryParams.get('token') || `mock-google-${mockOAuth}-token`;
          localStorage.setItem('quotation_ai_auth_token', mockToken);
          const res = await refreshSession();
          if (!isCancelled) {
            if (res.needsOnboarding) {
              console.debug('[Auth] Redirect decision: /onboarding');
              navigate('/onboarding', { replace: true });
            } else {
              console.debug('[Auth] Redirect decision: /dashboard');
              navigate('/dashboard', { replace: true });
            }
          }
          return;
        }

        // 3. Handle real Supabase OAuth PKCE code exchange
        let tokenToVerify: string | null = null;

        if (isSupabaseConfigured) {
          const code = queryParams.get('code');
          if (code) {
            console.debug('[Auth] OAuth callback detected: authorization code present');
            try {
              const { data: exchangeData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
              if (exchangeError) {
                console.warn('[Auth] exchangeCodeForSession failed:', exchangeError.message);
                if (!isCancelled) {
                  setStatusState('expired');
                  setErrorMessage(exchangeError.message || 'The authorization code has expired. Please initiate sign in again.');
                }
                return;
              }
              if (exchangeData?.session?.access_token) {
                tokenToVerify = exchangeData.session.access_token;
                console.debug(`[Auth] Session detected: user ${exchangeData.session.user?.email || 'authenticated'}`);
                console.debug('[Auth] Access token available: true');
              }
            } catch (exchangeErr: any) {
              console.warn('[Auth] exchangeCodeForSession error:', exchangeErr);
              if (!isCancelled) {
                setStatusState('expired');
                setErrorMessage('Failed to exchange authorization code for session.');
              }
              return;
            }
          }

          // Fallback: check if implicit flow (hash fragment) returned tokens
          const hashAccessToken = hashParams.get('access_token');
          const hashRefreshToken = hashParams.get('refresh_token');
          if (!tokenToVerify && hashAccessToken && hashRefreshToken) {
            console.debug('[Auth] OAuth callback detected: hash fragment tokens present');
            try {
              const { data: sessionData, error: sessionErr } = await supabase.auth.setSession({
                access_token: hashAccessToken,
                refresh_token: hashRefreshToken,
              });
              if (!sessionErr && sessionData.session?.access_token) {
                tokenToVerify = sessionData.session.access_token;
                console.debug(`[Auth] Session detected: user ${sessionData.session.user?.email || 'authenticated'}`);
                console.debug('[Auth] Access token available: true');
              }
            } catch (hashErr) {
              console.warn('[Auth] setSession from hash error:', hashErr);
            }
          }

          // Fallback: check if active session already exists in client
          if (!tokenToVerify) {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.access_token) {
              tokenToVerify = session.access_token;
              console.debug(`[Auth] Session detected: user ${session.user?.email || 'authenticated'}`);
              console.debug('[Auth] Access token available: true');
            }
          }
        }

        if (!tokenToVerify) {
          console.warn('[Auth] Missing authorization code or active session');
          if (!isCancelled) {
            setStatusState('expired');
            setErrorMessage('No active authentication token or authorization code was detected. Your sign-in session may have timed out.');
          }
          return;
        }

        // 4. Save authentic token to localStorage and synchronize with backend /api/v1/auth/me
        localStorage.setItem('quotation_ai_auth_token', tokenToVerify);
        console.debug('[Auth] /auth/me started');
        const syncResult = await refreshSession();
        console.debug('[Auth] /auth/me result:', { success: syncResult.success, needsOnboarding: syncResult.needsOnboarding });

        if (isCancelled) return;

        // 5. Route based on tenant company association and status
        if (syncResult.success && !syncResult.needsOnboarding) {
          console.debug('[Auth] Redirect decision: /dashboard');
          navigate('/dashboard', { replace: true });
        } else if (syncResult.success && syncResult.needsOnboarding) {
          console.debug('[Auth] Redirect decision: /onboarding/company');
          navigate('/onboarding/company', { replace: true });
        } else if (syncResult.errorStatus === 401) {
          console.debug('[Auth] Redirect decision: /login (401 Unauthorized)');
          navigate('/login', { replace: true });
        } else {
          console.warn('[Auth] Session was rejected by Quotation AI tenant security service');
          setStatusState('error');
          setErrorMessage(syncResult.errorDetail || 'Session was rejected by Quotation AI tenant security service.');
        }
      } catch (err: any) {
        if (isCancelled) return;
        console.error('[Auth] Unexpected error during OAuth callback handling:', err);
        setStatusState('error');
        setErrorMessage(err.message || 'An unexpected error occurred while completing authentication.');
      } finally {
        clearTimeout(timeoutTimer);
      }
    }

    handleAuthRedirect();

    return () => {
      isCancelled = true;
      clearTimeout(timeoutTimer);
      isProcessingRef.current = false;
    };
  }, [location, navigate, refreshSession]);

  // Loading State - Simple, clean, no cosmetic delay
  if (statusState === 'loading') {
    return (
      <div className="min-h-screen bg-[#fbf9f4] flex items-center justify-center p-4 antialiased font-sans">
        <div className="max-w-sm w-full bg-white rounded-2xl shadow-xl border border-slate-200/80 p-8 text-center space-y-4">
          <div className="flex items-center justify-center">
            <div className="w-12 h-12 border-3 border-slate-200 border-t-[#B87333] rounded-full animate-spin" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Signing you in…
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Establishing authenticated session...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Session Expired / Timeout State
  if (statusState === 'expired') {
    return (
      <div className="min-h-screen bg-[#fbf9f4] flex items-center justify-center p-4 antialiased font-sans">
        <div className="max-w-md w-full bg-white rounded-xl shadow-xl border border-amber-200 p-8 text-center space-y-5">
          <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-700 mx-auto flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-mono uppercase tracking-wider text-amber-800 font-semibold block">
              Session Expired
            </span>
            <h2 className="text-xl font-bold text-[#172033] mt-1">
              Authentication Window Timed Out
            </h2>
            <p className="text-xs text-[#64748B] mt-2 leading-relaxed">
              {errorMessage || "We couldn't complete Google sign-in. Try again."}
            </p>
          </div>
          <div className="pt-2 flex flex-col gap-2.5">
            <button
              onClick={() => navigate('/login')}
              className="w-full h-11 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold rounded-lg transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Back to Login</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // OAuth Failure or Cancellation State
  return (
    <div className="min-h-screen bg-[#fbf9f4] flex items-center justify-center p-4 antialiased font-sans">
      <div className="max-w-md w-full bg-white rounded-xl shadow-xl border border-[#ba1a1a]/30 p-8 text-center space-y-5">
        <div className="w-12 h-12 rounded-full bg-red-100 text-red-700 mx-auto flex items-center justify-center">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <div>
          <span className="text-[11px] font-mono uppercase tracking-wider text-red-700 font-semibold block">
            OAuth Authorization Notice
          </span>
          <h2 className="text-xl font-bold text-[#172033] mt-1">
            Sign In Was Not Completed
          </h2>
          <p className="text-xs text-[#64748B] mt-2 leading-relaxed">
            {errorMessage}
          </p>
        </div>
        <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
          <button
            onClick={() => loginWithGoogle()}
            className="flex-1 h-11 bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Try Google Again</span>
          </button>
          <button
            onClick={() => navigate('/login')}
            className="flex-1 h-11 bg-[#172033] hover:bg-[#202c45] text-white text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Return to Sign In</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthCallbackPage;
