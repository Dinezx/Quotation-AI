import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  const { login, user } = useAuth();

  const [email, setEmail] = useState(user?.email || 'rajesh.sharma@orynza-mfg.in');
  const [password, setPassword] = useState('••••••••••••••••');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberSession, setRememberSession] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (login) {
        await login('demo-enterprise-session-token');
      }
      navigate('/');
    } catch (err) {
      console.error('[LoginPage] Sign in error:', err);
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
                    className="w-full h-12 bg-[#B87333] hover:bg-[#A46328] active:scale-[0.99] text-white text-sm font-semibold rounded-lg shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#172033] focus:ring-offset-2 disabled:opacity-60"
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

                  {/* Secondary Action Option */}
                  <button
                    type="button"
                    onClick={handleEnterpriseSales}
                    className="w-full h-11 bg-[#f0eee9] hover:bg-[#eae8e3] text-[#172033] text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer focus:outline-none"
                  >
                    <Handshake className="w-4 h-4 text-[#B87333]" />
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
