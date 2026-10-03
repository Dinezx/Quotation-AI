import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Building2, 
  KeyRound, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  ShieldCheck, 
  Shield, 
  Headphones, 
  TrendingUp,
  User,
  Phone,
  Factory,
  CheckCircle2
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

export const SignUpPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signUp, loginWithGoogle, isAuthenticated } = useAuth();

  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      const from = (location.state as any)?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, location]);

  const handleGoogleSignUp = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await loginWithGoogle();
    } catch (err: any) {
      setErrorMessage(err.message || 'Google sign-up failed.');
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !companyName.trim() || !email.trim()) {
      setErrorMessage('Please fill in your name, company name, and work email.');
      return;
    }
    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters.');
      return;
    }
    if (!acceptTerms) {
      setErrorMessage('Please accept the industrial terms of service.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await signUp({
        fullName: fullName.trim(),
        companyName: companyName.trim(),
        email: email.trim(),
        password: password,
        phone: phone.trim() || undefined,
      });
      const from = (location.state as any)?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || 'Registration failed. Please check credentials or contact support.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-[#f8fafc] min-h-screen w-full flex items-center justify-center p-4 sm:p-6 lg:p-8 font-sans antialiased text-slate-900">
      <main className="w-full flex items-center justify-center">
        <div className="flex flex-col w-full max-w-6xl mx-auto my-auto py-4">
          <motion.div 
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="bg-white rounded-2xl shadow-xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[680px] border border-slate-200/90"
          >
            {/* Brand Showcase & Telemetry Panel (Left) */}
            <div className="lg:col-span-5 bg-[#0B1328] text-white p-6 sm:p-8 lg:p-10 flex flex-col justify-between relative overflow-hidden border-b lg:border-b-0 lg:border-r border-[#151f38]">
              {/* Structural Backdrop Elements */}
              <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-[#2563EB] opacity-15 blur-3xl pointer-events-none" />
              <div className="absolute left-0 bottom-0 w-80 h-80 rounded-full bg-[#3b82f6] opacity-10 blur-2xl pointer-events-none" />

              {/* Top Row: Operational Identity */}
              <div className="relative z-10 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/10 text-slate-200 text-[11px] font-semibold tracking-wider font-mono">
                    <span className="w-2 h-2 rounded-full bg-[#2563EB] animate-pulse" />
                    NEW PLANT ONBOARDING
                  </span>
                  <span className="text-[11px] text-slate-400 tracking-widest uppercase font-semibold font-mono">
                    NODE: IND-PUN-01
                  </span>
                </div>

                <div className="pt-2">
                  {/* Brand Logo */}
                  <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
                    <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center shrink-0 shadow-sm">
                      <svg width="22" height="22" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect x="5" y="5" width="26" height="26" rx="6" stroke="#0B1328" strokeWidth="2.5" />
                        <circle cx="18" cy="18" r="3.2" fill="#2563EB" />
                        <path d="M18 5V11.5M18 24.5V31M5 18H11.5M24.5 18H31" stroke="#0B1328" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                    </div>
                    <span className="text-2xl font-black tracking-wider text-white uppercase font-sans">
                      QUOTATION AI
                    </span>
                  </div>

                  <div className="mt-5 text-lg font-semibold text-white tracking-tight">
                    Start Your 14-Day Free Plant Pilot
                  </div>
                  <p className="text-sm text-slate-400 mt-1.5 leading-relaxed">
                    Set up your machine shop or fabrication facility in minutes. Extract multi-page customer POs and calculate deterministic quotations with your rate cards.
                  </p>
                </div>
              </div>

              {/* Middle Guarantees List */}
              <div className="relative z-10 my-6 space-y-3">
                <div className="bg-[#102134]/90 border border-[#1f2d47] rounded-xl p-4 shadow-inner space-y-2.5 text-xs text-slate-300">
                  <div className="flex items-center gap-2 text-white font-semibold font-mono text-[11px] uppercase tracking-wider text-blue-400">
                    <Factory className="w-3.5 h-3.5" />
                    <span>Included in Every Trial Plant Node</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>Pre-seeded standard Indian steel & alloy grade rate cards</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>Automated Azure Document Intelligence & Gemini PO extraction</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>Deterministic scrap recovery credit and cycle-time math</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>SHA-256 sealed vector DIN A4 quotation dossier output</span>
                  </div>
                </div>

                {/* Secondary Operational Visual Metric Tiles */}
                <div className="grid grid-cols-2 gap-3 text-white">
                  <div className="bg-[#102134]/60 border border-[#1f2d47] p-3 rounded-xl">
                    <span className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider font-mono">PILOT PERIOD</span>
                    <span className="text-base font-semibold text-slate-200 mt-0.5 block font-mono">14 Days Free</span>
                  </div>
                  <div className="bg-[#102134]/60 border border-[#1f2d47] p-3 rounded-xl">
                    <span className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider font-mono">CREDIT CARD</span>
                    <span className="text-base font-semibold text-blue-400 mt-0.5 block font-mono">Not Required</span>
                  </div>
                </div>
              </div>

              {/* Footer Trust Certifications & Support Line */}
              <div className="relative z-10 space-y-3 pt-2">
                <div className="flex items-center flex-wrap gap-2.5 text-slate-400 text-[11px] font-medium">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-slate-300" />
                    <span>ISO 9001:2015</span>
                  </div>
                  <span className="text-slate-600">•</span>
                  <div className="flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-slate-300" />
                    <span>Multi-Tenant Isolated</span>
                  </div>
                  <span className="text-slate-600">•</span>
                  <span>256-bit Encrypted</span>
                </div>

                <div className="flex items-center justify-between text-slate-400 text-[11px]">
                  <span className="flex items-center gap-1.5">
                    <Headphones className="w-3.5 h-3.5 text-slate-400" />
                    Plant Onboarding Desk:
                  </span>
                  <a className="text-slate-200 hover:text-white transition-colors font-medium font-mono" href="tel:+9108049208800">
                    +91 (080) 4920-8800
                  </a>
                </div>
              </div>
            </div>

            {/* Registration Workspace Panel (Right) */}
            <div className="lg:col-span-7 bg-white p-6 sm:p-8 lg:p-10 flex flex-col justify-between">
              {/* Header Section */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs uppercase tracking-wider text-[#2563EB] font-bold">
                    New Machine Shop Setup
                  </span>
                  <div className="inline-flex items-center gap-1.5 text-slate-500 text-xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB]" />
                    Instant Access
                  </div>
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                  Register Your Precision Plant.
                </h1>
                <p className="text-sm text-slate-600 mt-1.5 leading-relaxed max-w-xl">
                  Create your company workspace and start turning customer POs into production quotations.
                </p>
              </div>

              {/* Form Interface */}
              <form onSubmit={handleSubmit} className="space-y-3.5 my-5">
                {errorMessage && (
                  <div className="bg-red-50 border border-red-200 text-red-800 px-3.5 py-2.5 rounded-xl text-xs flex items-center justify-between">
                    <span>{errorMessage}</span>
                    <button
                      type="button"
                      onClick={() => setErrorMessage(null)}
                      className="text-red-800 font-bold ml-2 hover:opacity-75"
                    >
                      ✕
                    </button>
                  </div>
                )}

                {/* Google Sign Up Button */}
                <button
                  type="button"
                  onClick={handleGoogleSignUp}
                  disabled={isSubmitting}
                  className="w-full h-11 bg-white hover:bg-slate-50 border border-slate-300 hover:border-slate-400 text-slate-800 text-xs font-semibold rounded-xl shadow-xs flex items-center justify-center gap-3 transition-all cursor-pointer focus:outline-none focus:ring-1 focus:ring-slate-900"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  <span>Sign Up with Google</span>
                </button>

                <div className="relative flex items-center justify-center my-3">
                  <div className="border-t border-slate-200 w-full" />
                  <span className="bg-white px-2.5 text-[10px] uppercase font-mono font-semibold text-slate-500">
                    or register with work email
                  </span>
                </div>

                {/* Grid: Full Name & Company Name */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-800" htmlFor="fullName">
                      Costing Lead / Full Name
                    </label>
                    <div className="relative flex items-center rounded-xl bg-slate-50 border border-slate-200 focus-within:border-[#2563EB] focus-within:bg-white focus-within:ring-1 focus-within:ring-[#2563EB] transition-all">
                      <User className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
                      <input 
                        id="fullName"
                        name="fullName"
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Rajesh Deshmukh"
                        className="w-full h-10 pl-10 pr-3 bg-transparent text-slate-900 text-xs rounded-xl focus:outline-none placeholder:text-slate-400 transition-colors"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-800" htmlFor="companyName">
                      Plant / Machine Shop Name
                    </label>
                    <div className="relative flex items-center rounded-xl bg-slate-50 border border-slate-200 focus-within:border-[#2563EB] focus-within:bg-white focus-within:ring-1 focus-within:ring-[#2563EB] transition-all">
                      <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
                      <input 
                        id="companyName"
                        name="companyName"
                        type="text"
                        required
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        placeholder="Bharat Precision Engineering"
                        className="w-full h-10 pl-10 pr-3 bg-transparent text-slate-900 text-xs rounded-xl focus:outline-none placeholder:text-slate-400 transition-colors"
                      />
                    </div>
                  </div>
                </div>

                {/* Work Email & Phone */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-800" htmlFor="signupEmail">
                      Corporate Work Email
                    </label>
                    <div className="relative flex items-center rounded-xl bg-slate-50 border border-slate-200 focus-within:border-[#2563EB] focus-within:bg-white focus-within:ring-1 focus-within:ring-[#2563EB] transition-all">
                      <input 
                        id="signupEmail"
                        name="email"
                        type="email"
                        autoComplete="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="rajesh@bharatprecision.co.in"
                        className="w-full h-10 px-3 bg-transparent text-slate-900 text-xs rounded-xl focus:outline-none placeholder:text-slate-400 transition-colors"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-800" htmlFor="phone">
                      Plant Phone / WhatsApp (Optional)
                    </label>
                    <div className="relative flex items-center rounded-xl bg-slate-50 border border-slate-200 focus-within:border-[#2563EB] focus-within:bg-white focus-within:ring-1 focus-within:ring-[#2563EB] transition-all">
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
                      <input 
                        id="phone"
                        name="phone"
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+91 20 2712 8840"
                        className="w-full h-10 pl-10 pr-3 bg-transparent text-slate-900 text-xs rounded-xl focus:outline-none placeholder:text-slate-400 transition-colors"
                      />
                    </div>
                  </div>
                </div>

                {/* Password Field */}
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-800" htmlFor="signupPassword">
                    Create Master Password (min. 6 characters)
                  </label>
                  <div className="relative flex items-center rounded-xl bg-slate-50 border border-slate-200 focus-within:border-[#2563EB] focus-within:bg-white focus-within:ring-1 focus-within:ring-[#2563EB] transition-all">
                    <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
                    <input 
                      id="signupPassword"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full h-10 pl-10 pr-10 bg-transparent text-slate-900 text-xs rounded-xl focus:outline-none placeholder:text-slate-400 transition-colors"
                    />
                    <button
                      type="button"
                      aria-label="Toggle password visibility"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 text-slate-400 hover:text-slate-700 transition-colors focus:outline-none p-1 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Terms Agreement */}
                <div className="flex items-center gap-2 pt-1">
                  <input 
                    id="acceptTerms"
                    type="checkbox"
                    checked={acceptTerms}
                    onChange={(e) => setAcceptTerms(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-[#2563EB] accent-[#2563EB] focus:ring-0 cursor-pointer"
                  />
                  <label htmlFor="acceptTerms" className="text-xs text-slate-500 cursor-pointer select-none">
                    I agree to the industrial platform terms and data confidentiality policy.
                  </label>
                </div>

                {/* Primary Action Button */}
                <div className="pt-2 space-y-2.5">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full h-12 bg-[#2563EB] hover:bg-[#1D4ED8] active:scale-[0.99] text-white text-sm font-semibold rounded-xl shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:ring-offset-2 disabled:opacity-60"
                  >
                    {isSubmitting ? (
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <span>Create Plant Account &amp; Start Trial</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  {/* Sign In Switch */}
                  <div className="text-center pt-2">
                    <span className="text-xs text-slate-500">Already registered your facility? </span>
                    <button
                      type="button"
                      onClick={() => navigate('/login')}
                      className="text-xs font-semibold text-[#2563EB] hover:text-[#1D4ED8] hover:underline cursor-pointer focus:outline-none"
                    >
                      Sign In to Console
                    </button>
                  </div>
                </div>
              </form>

              {/* Status footer bar */}
              <div className="pt-4 bg-slate-50 -mx-6 -mb-6 sm:-mx-8 sm:-mb-8 lg:-mx-10 lg:-mb-10 px-6 py-3.5 sm:px-8 lg:px-10 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-200/80 text-slate-800 text-[11px] font-semibold font-mono">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB]" />
                    CLUSTER: PROD-MUMBAI-AP-SOUTH
                  </div>
                  <span className="text-[11px] text-slate-500 hidden sm:inline font-mono">
                    Zero AI Pricing Hallucination
                  </span>
                </div>

                <div className="flex items-center gap-3 text-slate-500 text-[11px]">
                  <a className="hover:text-slate-900 transition-colors" href="/#differentiators">Architecture</a>
                  <span>•</span>
                  <a className="hover:text-slate-900 transition-colors" href="/#pricing">Pricing Tiers</a>
                  <span>•</span>
                  <a className="hover:text-slate-900 transition-colors" href="/#faq">FAQ</a>
                </div>
              </div>

            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
};

export default SignUpPage;
