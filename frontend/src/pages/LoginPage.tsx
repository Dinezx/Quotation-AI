import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Building2, 
  KeyRound, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  Handshake, 
  ShieldCheck, 
  Shield, 
  Headphones, 
  TrendingUp 
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, loginWithGoogle, user, isAuthenticated } = useAuth();

  const [email, setEmail] = useState(user?.email || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberSession, setRememberSession] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      const from = (location.state as any)?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, location]);

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    setErrorMessage(null);
    try {
      await loginWithGoogle();
    } catch (err: any) {
      setErrorMessage(err.message || 'Google authentication failed.');
      setIsGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setErrorMessage('Please enter your work email.');
      return;
    }
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const syncRes = await login(email.trim(), password || undefined);
      if (syncRes?.needsOnboarding) {
        navigate('/onboarding', { replace: true });
      } else {
        const from = (location.state as any)?.from?.pathname || '/dashboard';
        navigate(from, { replace: true });
      }
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || 'Invalid enterprise credentials or inactive tenant.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = () => {
    alert('Contact your internal plant IT system administrator or dispatch a credential reset request to support@orynza.in.');
  };

  const handleEnterpriseSales = () => {
    alert('Dispatching inquiry to Enterprise Line Lead for Industrial Onboarding.');
  };

  return (
    <div className="bg-[#fbf9f4] min-h-screen w-full flex items-center justify-center p-4 sm:p-6 lg:p-8 font-sans antialiased text-[#1b1c19]">
      <main className="w-full flex items-center justify-center">
        <div className="flex flex-col w-full max-w-6xl mx-auto my-auto py-4">
          <motion.div 
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="bg-white rounded-xl shadow-xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[640px]"
          >
            {/* Brand Showcase & Telemetry Panel (Left) */}
            <div className="lg:col-span-5 bg-[#172033] text-white p-6 sm:p-8 lg:p-10 flex flex-col justify-between relative overflow-hidden border-b lg:border-b-0 lg:border-r border-[#1f2d47]">
              {/* Structural Backdrop Elements */}
              <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-[#B87333] opacity-10 blur-3xl pointer-events-none" />
              <div className="absolute left-0 bottom-0 w-80 h-80 rounded-full bg-[#555e74] opacity-15 blur-2xl pointer-events-none" />

              {/* Top Row: Operational Identity */}
              <div className="relative z-10 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/10 text-[#d9e2fc] text-[11px] font-semibold tracking-wider font-mono">
                    <span className="w-2 h-2 rounded-full bg-[#B87333] animate-pulse" />
                    MFG OS v4.8 ACTIVE
                  </span>
                  <span className="text-[11px] text-[#7f879f] tracking-widest uppercase font-semibold font-mono">
                    NODE: IND-BLR-01
                  </span>
                </div>

                <div className="pt-2">
                  {/* Finalized Brand Logo */}
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center shrink-0 shadow-sm">
                      <svg width="22" height="22" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect x="5" y="5" width="26" height="26" rx="6" stroke="#172033" strokeWidth="2.5" />
                        <circle cx="18" cy="18" r="3.2" fill="#B87333" />
                        <path d="M18 5V11.5M18 24.5V31M5 18H11.5M24.5 18H31" stroke="#172033" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                    </div>
                    <span className="text-2xl font-black tracking-wider text-white uppercase font-sans">
                      ORYNZA
                    </span>
                  </div>

                  <div className="mt-5 text-lg font-semibold text-white tracking-tight">
                    One Platform. Smarter Manufacturing.
                  </div>
                  <p className="text-sm text-[#7f879f] mt-1.5 leading-relaxed">
                    Supervisory visibility, intelligent routing, and synchronized execution across plant clusters and supply ecosystems.
                  </p>
                </div>
              </div>

              {/* Middle Telemetry Showcase */}
              <div className="relative z-10 my-6 space-y-3">
                <div className="bg-[#102134]/90 border border-[#1f2d47] rounded-xl p-4 shadow-inner">
                  <div className="flex items-center justify-between text-[#7f879f] text-[11px] font-semibold uppercase tracking-wider">
                    <span className="flex items-center gap-1.5">
                      <TrendingUp className="w-3.5 h-3.5 text-[#fdad67]" />
                      Active Platform Throughput
                    </span>
                    <span className="text-[#d9e2fc] font-semibold font-mono">+18.4% WoW</span>
                  </div>
                  <div className="mt-2 flex items-baseline justify-between">
                    <div className="font-mono text-2xl font-bold text-white tracking-tight">
                      ₹4.82 Cr
                    </div>
                    <span className="text-xs text-[#7f879f]">Processed This Week</span>
                  </div>

                  {/* Sparkline Vector */}
                  <div className="w-full mt-2 h-10">
                    <svg className="w-full h-full text-[#B87333]" fill="none" preserveAspectRatio="none" viewBox="0 0 280 44">
                      <defs>
                        <linearGradient id="telemetryGrad" x1="0" x2="0" y1="0" y2="1">
                          <stop offset="0%" stopColor="#fdad67" stopOpacity="0.35" />
                          <stop offset="100%" stopColor="#fdad67" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>
                      <path d="M0 38 L25 32 L55 35 L85 24 L120 28 L155 16 L190 22 L225 10 L255 14 L280 4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" />
                      <path d="M0 38 L25 32 L55 35 L85 24 L120 28 L155 16 L190 22 L225 10 L255 14 L280 4 L280 44 L0 44 Z" fill="url(#telemetryGrad)" />
                    </svg>
                  </div>
                </div>

                {/* Secondary Operational Visual Metric Tiles */}
                <div className="grid grid-cols-2 gap-3 text-white">
                  <div className="bg-[#102134]/60 border border-[#1f2d47] p-3 rounded-xl">
                    <span className="block text-[11px] font-semibold text-[#7f879f] uppercase tracking-wider font-mono">PLANT UPTIME</span>
                    <span className="text-base font-semibold text-[#d9e2fc] mt-0.5 block font-mono">99.94%</span>
                  </div>
                  <div className="bg-[#102134]/60 border border-[#1f2d47] p-3 rounded-xl">
                    <span className="block text-[11px] font-semibold text-[#7f879f] uppercase tracking-wider font-mono">ACTIVE RUNS</span>
                    <span className="text-base font-semibold text-[#fdad67] mt-0.5 block font-mono">142 Cells</span>
                  </div>
                </div>
              </div>

              {/* Footer Trust Certifications & Support Line */}
              <div className="relative z-10 space-y-3 pt-2">
                <div className="flex items-center flex-wrap gap-2.5 text-[#7f879f] text-[11px] font-medium">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#d9e2fc]" />
                    <span>ISO 9001:2015</span>
                  </div>
                  <span className="text-[#7f879f]/40">•</span>
                  <div className="flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-[#d9e2fc]" />
                    <span>SOC2 Type II</span>
                  </div>
                  <span className="text-[#7f879f]/40">•</span>
                  <span>256-bit Encrypted</span>
                </div>

                <div className="flex items-center justify-between text-[#7f879f] text-[11px]">
                  <span className="flex items-center gap-1.5">
                    <Headphones className="w-3.5 h-3.5 text-[#7f879f]" />
                    India Support Desk:
                  </span>
                  <a className="text-[#d9e2fc] hover:text-white transition-colors font-medium font-mono" href="tel:+9108049208800">
                    +91 (080) 4920-8800
                  </a>
                </div>
              </div>
            </div>

            {/* Authentication Workspace Panel (Right) */}
            <div className="lg:col-span-7 bg-white p-6 sm:p-8 lg:p-10 flex flex-col justify-between">
              {/* Header Section */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs uppercase tracking-wider text-[#B87333] font-semibold">
                    Enterprise Access Gateway
                  </span>
                  <div className="inline-flex items-center gap-1.5 text-[#64748B] text-xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#B87333]" />
                    Security Audit Compliant
                  </div>
                </div>
                <h1 className="text-2xl sm:text-3xl font-semibold text-[#172033] tracking-tight">
                  Simplify Every Quotation.<br className="hidden sm:block" /> Power Whole-Plant Operations.
                </h1>
                <p className="text-sm text-[#64748B] mt-2 leading-relaxed max-w-xl">
                  Connect your manufacturing operations, customers, orders and business workflows in one place.
                </p>
              </div>

              {/* Form Interface */}
              <form onSubmit={handleSubmit} className="space-y-4 my-6">
                {errorMessage && (
                  <div className="bg-[#ffdad6] border border-[#ba1a1a]/30 text-[#93000a] px-3.5 py-2.5 rounded-lg text-xs flex items-center justify-between">
                    <span>{errorMessage}</span>
                    <button
                      type="button"
                      onClick={() => setErrorMessage(null)}
                      className="text-[#93000a] font-bold ml-2 hover:opacity-75"
                    >
                      ✕
                    </button>
                  </div>
                )}

                {/* Google Sign In Option */}
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={isSubmitting || isGoogleLoading}
                  className="w-full h-11 bg-white hover:bg-[#fbf9f4] border border-[#d5d2ca] hover:border-[#172033] text-[#172033] text-xs font-semibold rounded-lg shadow-2xs flex items-center justify-center gap-3 transition-all cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#172033] disabled:opacity-60"
                >
                  {isGoogleLoading ? (
                    <div className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-[#172033]/20 border-t-[#B87333] rounded-full animate-spin" />
                      <span>Connecting to Google Identity...</span>
                    </div>
                  ) : (
                    <>
                      <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                      </svg>
                      <span>Continue with Google</span>
                    </>
                  )}
                </button>

                <div className="relative flex items-center justify-center my-3">
                  <div className="border-t border-[#E5E1D8] w-full" />
                  <span className="bg-white px-2.5 text-[10px] uppercase font-mono font-semibold text-[#76777d]">
                    or enter work email
                  </span>
                </div>

                {/* Corporate Work Email Input */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-[#1b1c19]" htmlFor="workEmail">
                    Work Email Address
                  </label>
                  <div className="relative flex items-center rounded-lg bg-[#f5f3ee] border border-transparent focus-within:border-[#B87333] focus-within:bg-white focus-within:ring-1 focus-within:ring-[#B87333] transition-all">
                    <Building2 className="w-4 h-4 text-[#76777d] absolute left-3.5 pointer-events-none" />
                    <input 
                      id="workEmail"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="rajesh.sharma@orynza-mfg.in"
                      className="w-full h-11 pl-10 pr-3.5 bg-transparent text-[#1b1c19] text-sm rounded-lg focus:outline-none placeholder:text-[#76777d]/70 transition-colors"
                    />
                  </div>
                  <span className="block text-[11px] text-[#64748B]">
                    Use your dedicated enterprise single sign-on credential.
                  </span>
                </div>

                {/* Master Access Password Field */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-[#1b1c19]" htmlFor="accessPassword">
                      Access Password
                    </label>
                    <button 
                      type="button"
                      onClick={handleForgotPassword}
                      className="text-xs font-medium text-[#B87333] hover:text-[#A46328] transition-colors focus:outline-none cursor-pointer"
                    >
                      Forgot Password?
                    </button>
                  </div>
                  <div className="relative flex items-center rounded-lg bg-[#f5f3ee] border border-transparent focus-within:border-[#B87333] focus-within:bg-white focus-within:ring-1 focus-within:ring-[#B87333] transition-all">
                    <KeyRound className="w-4 h-4 text-[#76777d] absolute left-3.5 pointer-events-none" />
                    <input 
                      id="accessPassword"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••••••"
                      className="w-full h-11 pl-10 pr-10 bg-transparent text-[#1b1c19] text-sm rounded-lg focus:outline-none placeholder:text-[#76777d]/70 transition-colors"
                    />
                    <button
                      type="button"
                      aria-label="Toggle password visibility"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 text-[#76777d] hover:text-[#1b1c19] transition-colors focus:outline-none p-1 cursor-pointer"
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Session Persistence Control */}
                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input 
                      id="rememberSession"
                      type="checkbox"
                      checked={rememberSession}
                      onChange={(e) => setRememberSession(e.target.checked)}
                      className="w-4 h-4 rounded border-[#E5E1D8] text-[#172033] accent-[#172033] focus:ring-0 cursor-pointer"
                    />
                    <span className="text-xs text-[#1b1c19]">
                      Remember my terminal session
                    </span>
                  </label>
                  <span className="text-[11px] text-[#76777d] font-mono">TTL: 12 Hours</span>
                </div>

                {/* Primary Sign In Action */}
                <div className="pt-2 space-y-2.5">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full h-12 bg-[#2563EB] hover:bg-[#1D4ED8] active:scale-[0.99] text-white text-sm font-semibold rounded-lg shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:ring-offset-2 disabled:opacity-60"
                  >
                    {isSubmitting ? (
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <span>Sign In to Enterprise Console</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  {/* Sign Up Navigation Link */}
                  <div className="text-center pt-2">
                    <span className="text-xs text-[#64748B]">New precision machine shop? </span>
                    <button
                      type="button"
                      onClick={() => navigate('/signup')}
                      className="text-xs font-semibold text-[#2563EB] hover:text-[#1D4ED8] hover:underline cursor-pointer focus:outline-none"
                    >
                      Create Plant Account (Sign Up Free)
                    </button>
                  </div>

                  {/* Secondary Action Option */}
                  <button
                    type="button"
                    onClick={handleEnterpriseSales}
                    className="w-full h-11 bg-[#f0eee9] hover:bg-[#eae8e3] text-[#172033] text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer focus:outline-none"
                  >
                    <Handshake className="w-4 h-4 text-[#2563EB]" />
                    <span>Request Plant Access / Contact Enterprise Sales</span>
                  </button>
                </div>
              </form>

              {/* Operational Status & Environment Bar */}
              <div className="pt-4 bg-[#f5f3ee] -mx-6 -mb-6 sm:-mx-8 sm:-mb-8 lg:-mx-10 lg:-mb-10 px-6 py-3.5 sm:px-8 lg:px-10 border-t border-[#eae8e3] flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#e4e2dd] text-[#1b1c19] text-[11px] font-semibold font-mono">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#B87333]" />
                    CLUSTER: PROD-MUMBAI-AP-SOUTH
                  </div>
                  <span className="text-[11px] text-[#64748B] hidden sm:inline font-mono">
                    Latency: 14ms
                  </span>
                </div>

                <div className="flex items-center gap-3 text-[#64748B] text-[11px]">
                  <a className="hover:text-[#172033] transition-colors" href="#compliance">Privacy Shield</a>
                  <span>•</span>
                  <a className="hover:text-[#172033] transition-colors" href="#sla">Platform SLA</a>
                  <span>•</span>
                  <a className="hover:text-[#172033] transition-colors" href="#mfg-docs">System Diagnostics</a>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
};

export default LoginPage;
