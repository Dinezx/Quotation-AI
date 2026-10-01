import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AlertTriangle, Clock, ArrowRight, RotateCcw, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';

export const AuthCallbackPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { refreshSession, loginWithGoogle, login } = useAuth();

  const [statusState, setStatusState] = useState<'loading' | 'error' | 'expired'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    let isMounted = true;

    async function handleAuthRedirect() {
      try {
        const queryParams = new URLSearchParams(location.search);
        const hashParams = new URLSearchParams(location.hash.replace(/^#/, ''));

        // 1. Check for explicit OAuth cancellation or failure params from provider
        const error = queryParams.get('error') || hashParams.get('error');
        const errorDescription = queryParams.get('error_description') || hashParams.get('error_description');

        if (error) {
          if (!isMounted) return;
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
          if (mockOAuth === 'new_user') {
            const mockToken = queryParams.get('token') || 'mock-google-new-user-token';
            localStorage.setItem('quotation_ai_auth_token', mockToken);
            const res = await refreshSession();
            if (isMounted) {
              if (res.needsOnboarding) {
                navigate('/onboarding', { replace: true });
              } else {
                navigate('/dashboard', { replace: true });
              }
            }
            return;
          }
          if (mockOAuth === 'existing_user') {
            const mockToken = queryParams.get('token') || 'mock-google-existing-user-token';
            localStorage.setItem('quotation_ai_auth_token', mockToken);
            await refreshSession();
            if (isMounted) {
              navigate('/dashboard', { replace: true });
            }
            return;
          }
        }

        // 3. Handle real Supabase OAuth redirect & PKCE code exchange
        let tokenToVerify: string | null = null;

        if (isSupabaseConfigured) {
          const code = queryParams.get('code');
          if (code) {
            try {
              const { data: exchangeData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
              if (exchangeError) {
                console.warn('[AuthCallback] exchangeCodeForSession failed:', exchangeError.message);
                if (exchangeError.message.toLowerCase().includes('expired') || exchangeError.message.toLowerCase().includes('invalid')) {
                  if (isMounted) {
                    setStatusState('expired');
                    setErrorMessage('The authorization code has expired. Please initiate sign in again.');
                  }
                  return;
                }
              } else if (exchangeData?.session?.access_token) {
                tokenToVerify = exchangeData.session.access_token;
              }
            } catch (exchangeErr: any) {
              console.warn('[AuthCallback] exchange error:', exchangeErr);
            }
          }

          // Check if implicit flow (hash fragment) returned tokens
          const hashAccessToken = hashParams.get('access_token');
          const hashRefreshToken = hashParams.get('refresh_token');
          if (!tokenToVerify && hashAccessToken && hashRefreshToken) {
            try {
              const { data: sessionData, error: sessionErr } = await supabase.auth.setSession({
                access_token: hashAccessToken,
                refresh_token: hashRefreshToken,
              });
              if (!sessionErr && sessionData.session) {
                tokenToVerify = sessionData.session.access_token;
              }
            } catch (hashErr) {
              console.warn('[AuthCallback] setSession from hash error:', hashErr);
            }
          }

          // Check if session already active or auto-detected in URL
          if (!tokenToVerify) {
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();
            if (sessionError) {
              if (isMounted) {
                setStatusState('error');
                setErrorMessage(sessionError.message || 'Unable to retrieve session from Supabase.');
              }
              return;
            }
            if (session?.access_token) {
              tokenToVerify = session.access_token;
            }
          }
        }

        // Fallback: check hash access_token if implicit flow was used
        if (!tokenToVerify) {
          tokenToVerify = hashParams.get('access_token') || localStorage.getItem('quotation_ai_auth_token');
        }

        if (!tokenToVerify) {
          if (isMounted) {
            setStatusState('expired');
            setErrorMessage('No active authentication token or authorization code was detected. Your sign-in session may have timed out.');
          }
          return;
        }

        // 4. Save authentic token to localStorage and synchronize with backend /api/v1/auth/me
        localStorage.setItem('quotation_ai_auth_token', tokenToVerify);
        const syncResult = await refreshSession();

        if (!isMounted) return;

        // 5. Route based on company association
        if (syncResult.needsOnboarding) {
          // Authenticated Google user has NO associated company -> First-time onboarding!
          navigate('/onboarding', { replace: true });
        } else if (syncResult.success) {
          // Existing user with associated company -> Straight to Dashboard!
          navigate('/dashboard', { replace: true });
        } else {
          setStatusState('error');
          setErrorMessage('Session was rejected by Quotation AI tenant security service.');
        }
      } catch (err: any) {
        if (!isMounted) return;
        setStatusState('error');
        setErrorMessage(err.message || 'An unexpected error occurred while completing authentication.');
      }
    }

    handleAuthRedirect();

    return () => {
      isMounted = false;
    };
  }, [location, navigate, refreshSession]);

  // Loading State
  if (statusState === 'loading') {
    return (
      <div className="min-h-screen bg-[#fbf9f4] flex items-center justify-center p-4 antialiased font-sans">
        <div className="max-w-md w-full bg-white rounded-xl shadow-xl border border-[#E5E1D8] p-8 text-center space-y-5">
          <div className="relative flex items-center justify-center">
            <div className="w-16 h-16 border-4 border-[#172033]/15 border-t-[#B87333] rounded-full animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6 text-[#B87333]" />
            </div>
          </div>
          <div>
            <span className="text-[11px] font-mono uppercase tracking-widest text-[#B87333] font-semibold block">
              Cryptographic Session Handshake
            </span>
            <h2 className="text-xl font-bold text-[#172033] mt-1">
              Verifying Google Authentication
            </h2>
            <p className="text-xs text-[#64748B] mt-2 leading-relaxed">
              Validating asymmetric identity claims, verifying tenant profile, and establishing isolated manufacturing session...
            </p>
          </div>
          <div className="pt-2 flex items-center justify-center gap-2 text-[11px] font-mono text-[#76777d]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>AUTHORITATIVE TENANT ROUTER</span>
          </div>
        </div>
      </div>
    );
  }

  // Session Expired State
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
              {errorMessage || 'The authorization session has expired or is no longer valid. Please start the sign-in process again.'}
            </p>
          </div>
          <div className="pt-2 flex flex-col gap-2.5">
            <button
              onClick={() => navigate('/login')}
              className="w-full h-11 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold rounded-lg transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Return to Sign In</span>
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
