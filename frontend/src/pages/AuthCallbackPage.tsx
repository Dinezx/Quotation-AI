import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AlertTriangle, Clock, ArrowRight, RotateCcw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';

// Module-level deduplication to guarantee exchangeCodeForSession is called ONCE per authorization code,
// surviving React StrictMode unmount/remount cycles, re-renders, and component instantiations.
const inFlightExchanges = new Map<string, Promise<{ session: any; error: any }>>();
const exchangedCodes = new Set<string>();

export const resetOAuthCallbackState = () => {
  inFlightExchanges.clear();
  exchangedCodes.clear();
};

export const AuthCallbackPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { refreshSession, loginWithGoogle } = useAuth();

  const [statusState, setStatusState] = useState<'loading' | 'error' | 'expired'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const isExecutingRef = useRef(false);

  const refreshSessionRef = useRef(refreshSession);
  refreshSessionRef.current = refreshSession;
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;

  useEffect(() => {
    // Only run if on the /auth/callback path
    if (location.pathname !== '/auth/callback') {
      return;
    }
    if (isExecutingRef.current) {
      return;
    }
    isExecutingRef.current = true;
    let isCancelled = false;

    // 10-second hard timeout so auth can never hang indefinitely
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
              'Redirect URI Mismatch (Error 400): In Google Cloud Console, ensure Authorized Redirect URIs contains your Supabase Auth callback URL, and in Supabase Dashboard ensure Redirect URLs contains your application callback URL.'
            );
          } else {
            setErrorMessage(errorDescription || 'Google sign-in could not be completed. Please try again.');
          }
          return;
        }

        // 2. Check for Playwright / simulated environment tokens
        const mockOAuth = queryParams.get('mock_oauth');
        if (mockOAuth) {
          console.debug('[Auth] Mock OAuth callback detected:', mockOAuth);
          const mockToken = queryParams.get('token') || `mock-google-${mockOAuth}-token`;
          localStorage.setItem('quotation_ai_auth_token', mockToken);
          const res = await refreshSessionRef.current();
          if (!isCancelled) {
            if (res.needsOnboarding) {
              console.debug('[Auth] Redirect decision: /onboarding/company');
              navigateRef.current('/onboarding/company', { replace: true });
            } else {
              console.debug('[Auth] Redirect decision: /dashboard');
              navigateRef.current('/dashboard', { replace: true });
            }
          }
          return;
        }

        // 3. Handle real Supabase OAuth PKCE code exchange
        let tokenToVerify: string | null = null;
        let authenticatedUserEmail: string | undefined = undefined;

        if (isSupabaseConfigured) {
          const code = queryParams.get('code');
          if (code) {
            console.debug('[Auth] OAuth callback detected: authorization code present');

            let exchangeResult: { session: any; error: any } = { session: null, error: null };

            if (exchangedCodes.has(code)) {
              // Code was already exchanged by this browser session; fetch active session directly
              console.debug('[Auth] Code was already consumed in this session; recovering session');
              const { data: { session } } = await supabase.auth.getSession();
              exchangeResult = { session, error: null };
            } else if (inFlightExchanges.has(code)) {
              // Code exchange is currently in-flight; await the active promise
              console.debug('[Auth] Awaiting in-flight code exchange');
              exchangeResult = await inFlightExchanges.get(code)!;
            } else {
              // Initiate single, exclusive code exchange
              const exchangePromise = (async () => {
                try {
                  console.debug('[Auth] Code exchange started');
                  const result = await supabase.auth.exchangeCodeForSession(code);
                  if (!result.error) {
                    exchangedCodes.add(code);
                    console.debug('[Auth] Code exchange succeeded');
                  } else {
                    console.debug('[Auth] Code exchange failed:', result.error.message);
                  }
                  return { session: result.data?.session || null, error: result.error };
                } catch (err: any) {
                  console.debug('[Auth] Code exchange failed:', err?.message || err);
                  return { session: null, error: err };
                } finally {
                  inFlightExchanges.delete(code);
                }
              })();

              inFlightExchanges.set(code, exchangePromise);
              exchangeResult = await exchangePromise;
            }

            if (exchangeResult.error) {
              // If "invalid flow state" or code expired/consumed, attempt to recover existing session
              const errMsg = (exchangeResult.error.message || '').toLowerCase();
              if (errMsg.includes('invalid flow state') || errMsg.includes('flow state') || errMsg.includes('already been used')) {
                const { data: { session: recoveredSession } } = await supabase.auth.getSession();
                if (recoveredSession?.access_token) {
                  tokenToVerify = recoveredSession.access_token;
                  authenticatedUserEmail = recoveredSession.user?.email;
                  console.debug(`[Auth] Session detected: user ${authenticatedUserEmail || 'authenticated'}`);
                }
              }

              if (!tokenToVerify) {
                console.warn('[Auth] Code exchange failed and session unrecoverable:', exchangeResult.error.message);
                if (!isCancelled) {
                  setStatusState('expired');
                  setErrorMessage(exchangeResult.error.message || 'Google sign-in could not be completed. Please try again.');
                }
                return;
              }
            } else if (exchangeResult.session?.access_token) {
              tokenToVerify = exchangeResult.session.access_token;
              authenticatedUserEmail = exchangeResult.session.user?.email;
              console.debug(`[Auth] Session detected: user ${authenticatedUserEmail || 'authenticated'}`);
            }

            // Immediately strip the consumed callback URL state so refreshing /auth/callback does not re-exchange
            if (window.history && window.history.replaceState) {
              window.history.replaceState({}, document.title, window.location.pathname);
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
                authenticatedUserEmail = sessionData.session.user?.email;
                console.debug(`[Auth] Session detected: user ${authenticatedUserEmail || 'authenticated'}`);
              }
            } catch (hashErr) {
              console.warn('[Auth] setSession from hash error:', hashErr);
            }

            if (window.history && window.history.replaceState) {
              window.history.replaceState({}, document.title, window.location.pathname);
            }
          }

          // Fallback: check if active session already exists in client (e.g. refreshed after URL stripped)
          if (!tokenToVerify) {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.access_token) {
              tokenToVerify = session.access_token;
              authenticatedUserEmail = session.user?.email;
              console.debug(`[Auth] Session detected: user ${authenticatedUserEmail || 'authenticated'}`);
            }
          }
        }

        // If no token exists, fail safely and prompt login
        if (!tokenToVerify) {
          console.warn('[Auth] Missing authorization code or active session');
          if (!isCancelled) {
            setStatusState('expired');
            setErrorMessage('No active authentication token or authorization code was detected. Your sign-in session may have timed out.');
          }
          return;
        }

        // 4. Synchronize authentic token with backend /api/v1/auth/me
        localStorage.setItem('quotation_ai_auth_token', tokenToVerify);
        console.debug('[Auth] /auth/me started');
        const syncResult = await refreshSessionRef.current();
        console.debug('[Auth] /auth/me result:', syncResult.success ? 'success' : 'failed');

        if (isCancelled) return;

        // 5. Route based on backend response and company association
        if (syncResult.success && !syncResult.needsOnboarding) {
          console.debug('[Auth] Redirect decision: /dashboard');
          navigateRef.current('/dashboard', { replace: true });
        } else if (syncResult.success && syncResult.needsOnboarding) {
          console.debug('[Auth] Redirect decision: /onboarding/company');
          navigateRef.current('/onboarding/company', { replace: true });
        } else if (syncResult.errorStatus === 0) {
          console.warn('[Auth] Backend service unreachable');
          setStatusState('error');
          setErrorMessage('Quotation AI services are temporarily unavailable.');
        } else if (syncResult.errorStatus === 401) {
          console.debug('[Auth] Redirect decision: /login (401 Unauthorized)');
          navigateRef.current('/login', { replace: true });
        } else {
          console.warn('[Auth] Session was rejected by Quotation AI tenant security service');
          setStatusState('error');
          setErrorMessage(syncResult.errorDetail || 'Google sign-in could not be completed. Please try again.');
        }
      } catch (err: any) {
        if (isCancelled) return;
        console.error('[Auth] Unexpected error during OAuth callback handling:', err);
        setStatusState('error');
        setErrorMessage('Google sign-in could not be completed. Please try again.');
      } finally {
        clearTimeout(timeoutTimer);
      }
    }

    handleAuthRedirect();

    return () => {
      isCancelled = true;
      clearTimeout(timeoutTimer);
      isExecutingRef.current = false;
    };
  }, [location.pathname, location.search, location.hash]);

  // Loading State - Clean, modern spinner
  if (statusState === 'loading') {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-4 antialiased font-sans">
        <div className="max-w-sm w-full bg-white rounded-2xl shadow-xl border border-slate-200/80 p-8 text-center space-y-4">
          <div className="flex items-center justify-center">
            <div className="w-12 h-12 border-3 border-slate-200 border-t-[#2563EB] rounded-full animate-spin" />
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
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-4 antialiased font-sans">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-amber-200 p-8 text-center space-y-5">
          <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-700 mx-auto flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-mono uppercase tracking-wider text-amber-800 font-semibold block">
              Session Notice
            </span>
            <h2 className="text-xl font-bold text-slate-900 mt-1">
              Authentication Window Timed Out
            </h2>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              {errorMessage || 'Google sign-in could not be completed. Please try again.'}
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
              aria-label="Return to Sign In / Back to Login"
              className="flex-1 h-11 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold rounded-lg transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Return to Sign In</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // OAuth Failure or Network Error State
  return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-4 antialiased font-sans">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-[#ba1a1a]/30 p-8 text-center space-y-5">
        <div className="w-12 h-12 rounded-full bg-red-100 text-red-700 mx-auto flex items-center justify-center">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <div>
          <span className="text-[11px] font-mono uppercase tracking-wider text-red-700 font-semibold block">
            Authentication Notice
          </span>
          <h2 className="text-xl font-bold text-slate-900 mt-1">
            Sign In Was Not Completed
          </h2>
          <p className="text-xs text-slate-500 mt-2 leading-relaxed">
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
            className="flex-1 h-11 bg-[#0B1328] hover:bg-[#151f38] text-white text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
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
