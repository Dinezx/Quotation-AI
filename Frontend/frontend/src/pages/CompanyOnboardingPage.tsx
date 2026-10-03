import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Building2, 
  MapPin, 
  Phone, 
  Mail, 
  FileText, 
  ShieldCheck, 
  ArrowRight, 
  Factory, 
  CheckCircle2, 
  User, 
  HelpCircle 
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

export const CompanyOnboardingPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, company, completeOnboarding, token, isLoading } = useAuth();

  const [companyName, setCompanyName] = useState('');
  const [legalName, setLegalName] = useState('');
  const [gstin, setGstin] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [fullName, setFullName] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // If already associated with a company, send directly to Dashboard
  useEffect(() => {
    if (!isLoading) {
      if (company && company.id) {
        navigate('/dashboard', { replace: true });
      } else if (!token && !localStorage.getItem('quotation_ai_auth_token')) {
        navigate('/login', { replace: true });
      }
    }
  }, [company, token, isLoading, navigate]);

  // Pre-fill user details from Google / Supabase session
  useEffect(() => {
    if (user) {
      if (!contactEmail && user.email) {
        setContactEmail(user.email);
      }
      if (!fullName && user.fullName) {
        setFullName(user.fullName);
      }
    }
  }, [user, contactEmail, fullName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!companyName.trim()) {
      setErrorMessage('Plant or machine shop name is required.');
      return;
    }
    if (!address.trim()) {
      setErrorMessage('Physical facility address is required for GST statutory compliance.');
      return;
    }
    if (!phone.trim()) {
      setErrorMessage('Plant contact phone number is required.');
      return;
    }

    const cleanGstin = gstin.trim().toUpperCase();
    if (cleanGstin && cleanGstin.length !== 15) {
      setErrorMessage('Invalid GSTIN: Indian GST Identification Number must be exactly 15 characters.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await completeOnboarding({
        companyName: companyName.trim(),
        legalName: (legalName.trim() || companyName.trim()),
        gstin: cleanGstin || undefined,
        address: address.trim(),
        phone: phone.trim(),
        contactEmail: contactEmail.trim() || user?.email,
        fullName: fullName.trim() || user?.fullName,
      });

      // Successful onboarding routes straight to the operational manufacturing dashboard
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || 'Failed to complete company setup. Please verify inputs or contact plant IT support.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-[#f8fafc] min-h-screen w-full flex items-center justify-center p-4 sm:p-6 lg:p-8 font-sans antialiased text-slate-900">
      <main className="w-full flex items-center justify-center">
        <div className="flex flex-col w-full max-w-5xl mx-auto my-auto py-6">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="bg-white rounded-2xl shadow-xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[640px] border border-slate-200/90"
          >
            {/* Left Telemetry & Welcome Panel */}
            <div className="lg:col-span-4 bg-[#0B1328] text-white p-6 sm:p-8 flex flex-col justify-between relative overflow-hidden border-b lg:border-b-0 lg:border-r border-[#151f38]">
              {/* Subtle ambient lighting */}
              <div className="absolute -right-16 -top-16 w-60 h-60 rounded-full bg-[#2563EB] opacity-15 blur-3xl pointer-events-none" />
              <div className="absolute left-0 bottom-0 w-60 h-60 rounded-full bg-[#3b82f6] opacity-10 blur-2xl pointer-events-none" />

              <div className="relative z-10 space-y-4">
                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-white/10 text-slate-200 text-[11px] font-mono font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB] animate-pulse" />
                  <span>STEP 1 OF 1 • TENANT INITIALIZATION</span>
                </div>

                <div className="pt-2">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center shrink-0 shadow-sm">
                      <svg width="22" height="22" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect x="5" y="5" width="26" height="26" rx="6" stroke="#0B1328" strokeWidth="2.5" />
                        <circle cx="18" cy="18" r="3.2" fill="#2563EB" />
                        <path d="M18 5V11.5M18 24.5V31M5 18H11.5M24.5 18H31" stroke="#0B1328" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                    </div>
                    <span className="text-xl font-black tracking-wider text-white uppercase font-sans">
                      QUOTATION AI
                    </span>
                  </div>

                  <h2 className="mt-5 text-xl font-bold text-white tracking-tight leading-snug">
                    Register Your Manufacturing Facility.
                  </h2>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                    Set up your precision plant's statutory identity to unlock automated purchase order extractions, deterministic rate-card matching, and DIN A4 quotation generation.
                  </p>
                </div>

                <div className="pt-4 space-y-3">
                  <div className="flex items-start gap-2.5 text-xs text-slate-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>Instant benchmark rate cards (EN8, SS 304, AL 6061, CNC 4-Axis)</span>
                  </div>
                  <div className="flex items-start gap-2.5 text-xs text-slate-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>Indian GST statutory invoice and remittance layout</span>
                  </div>
                  <div className="flex items-start gap-2.5 text-xs text-slate-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>Cryptographically isolated tenant database storage</span>
                  </div>
                </div>
              </div>

              <div className="relative z-10 pt-6 border-t border-[#151f38] text-[11px] text-slate-400 font-mono">
                AUTHENTICATED VIA: <span className="text-white font-semibold">{user?.email || 'Google Account'}</span>
              </div>
            </div>

            {/* Right Onboarding Form Panel */}
            <div className="lg:col-span-8 bg-white p-6 sm:p-8 lg:p-10 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs uppercase tracking-wider text-[#2563EB] font-bold">
                    First-Time Facility Registration
                  </span>
                  <span className="text-[11px] text-slate-500 font-mono">
                    Node: IND-MUM-01
                  </span>
                </div>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                  Company &amp; Works Profile
                </h1>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Provide your plant's commercial details. These will appear on all finalized quotation commercial dossiers sent to customer purchasing teams.
                </p>

                {errorMessage && (
                  <div className="mt-4 bg-red-50 border border-red-200 text-red-800 px-3.5 py-2.5 rounded-xl text-xs flex items-center justify-between">
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

                <form onSubmit={handleSubmit} className="mt-5 space-y-4">
                  {/* Row 1: Company / Trade Name & Legal Name */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-slate-800" htmlFor="companyName">
                        Plant / Trade Name <span className="text-red-600">*</span>
                      </label>
                      <div className="relative flex items-center rounded-xl bg-slate-50 border border-slate-200 focus-within:border-[#2563EB] focus-within:bg-white focus-within:ring-1 focus-within:ring-[#2563EB] transition-all">
                        <Building2 className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
                        <input
                          id="companyName"
                          name="companyName"
                          type="text"
                          required
                          value={companyName}
                          onChange={(e) => {
                            setCompanyName(e.target.value);
                            if (!legalName) setLegalName(e.target.value);
                          }}
                          placeholder="Bharat Precision Engineering"
                          className="w-full h-10 pl-9 pr-3 bg-transparent text-slate-900 text-xs rounded-xl focus:outline-none placeholder:text-slate-400"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-slate-800" htmlFor="legalName">
                        Statutory Legal Name
                      </label>
                      <div className="relative flex items-center rounded-xl bg-slate-50 border border-slate-200 focus-within:border-[#2563EB] focus-within:bg-white focus-within:ring-1 focus-within:ring-[#2563EB] transition-all">
                        <FileText className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
                        <input
                          id="legalName"
                          name="legalName"
                          type="text"
                          value={legalName}
                          onChange={(e) => setLegalName(e.target.value)}
                          placeholder="Bharat Precision Engineering Pvt Ltd"
                          className="w-full h-10 pl-9 pr-3 bg-transparent text-slate-900 text-xs rounded-xl focus:outline-none placeholder:text-slate-400"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Row 2: GSTIN & Lead Full Name */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-semibold text-slate-800" htmlFor="gstin">
                          GST Identification Number (GSTIN)
                        </label>
                        <span className="text-[10px] text-slate-500">15-digit alphanumeric</span>
                      </div>
                      <div className="relative flex items-center rounded-xl bg-slate-50 border border-slate-200 focus-within:border-[#2563EB] focus-within:bg-white focus-within:ring-1 focus-within:ring-[#2563EB] transition-all">
                        <input
                          id="gstin"
                          name="gstin"
                          type="text"
                          maxLength={15}
                          value={gstin}
                          onChange={(e) => setGstin(e.target.value.toUpperCase())}
                          placeholder="27AAACB1234F1Z8"
                          className="w-full h-10 px-3 bg-transparent text-slate-900 text-xs font-mono uppercase rounded-xl focus:outline-none placeholder:text-slate-400"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-slate-800" htmlFor="fullName">
                        Plant Lead / Costing Head Name
                      </label>
                      <div className="relative flex items-center rounded-xl bg-slate-50 border border-slate-200 focus-within:border-[#2563EB] focus-within:bg-white focus-within:ring-1 focus-within:ring-[#2563EB] transition-all">
                        <User className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
                        <input
                          id="fullName"
                          name="fullName"
                          type="text"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="Rajesh Deshmukh"
                          className="w-full h-10 pl-9 pr-3 bg-transparent text-slate-900 text-xs rounded-xl focus:outline-none placeholder:text-slate-400"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Row 3: Plant Address */}
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-800" htmlFor="address">
                      Physical Factory / Works Address <span className="text-red-600">*</span>
                    </label>
                    <div className="relative flex items-start rounded-xl bg-slate-50 border border-slate-200 focus-within:border-[#2563EB] focus-within:bg-white focus-within:ring-1 focus-within:ring-[#2563EB] transition-all pt-2.5">
                      <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                      <textarea
                        id="address"
                        name="address"
                        rows={2}
                        required
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="Gat No. 248, Alandi-Markal Road, MIDC Chakan Phase 2, Pune, Maharashtra 410501"
                        className="w-full pl-9 pr-3 pb-2 bg-transparent text-slate-900 text-xs rounded-xl focus:outline-none placeholder:text-slate-400 resize-none"
                      />
                    </div>
                  </div>

                  {/* Row 4: Phone & Contact Email */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-slate-800" htmlFor="phone">
                        Plant Phone / WhatsApp <span className="text-red-600">*</span>
                      </label>
                      <div className="relative flex items-center rounded-xl bg-slate-50 border border-slate-200 focus-within:border-[#2563EB] focus-within:bg-white focus-within:ring-1 focus-within:ring-[#2563EB] transition-all">
                        <Phone className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
                        <input
                          id="phone"
                          name="phone"
                          type="tel"
                          required
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="+91 98220 12345"
                          className="w-full h-10 pl-9 pr-3 bg-transparent text-slate-900 text-xs rounded-xl focus:outline-none placeholder:text-slate-400"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-slate-800" htmlFor="contactEmail">
                        Commercial Quotation Email <span className="text-red-600">*</span>
                      </label>
                      <div className="relative flex items-center rounded-xl bg-slate-50 border border-slate-200 focus-within:border-[#2563EB] focus-within:bg-white focus-within:ring-1 focus-within:ring-[#2563EB] transition-all">
                        <Mail className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
                        <input
                          id="contactEmail"
                          name="contactEmail"
                          type="email"
                          required
                          value={contactEmail}
                          onChange={(e) => setContactEmail(e.target.value)}
                          placeholder="rfq@bharatprecision.co.in"
                          className="w-full h-10 pl-9 pr-3 bg-transparent text-slate-900 text-xs rounded-xl focus:outline-none placeholder:text-slate-400"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Submission Action */}
                  <div className="pt-3">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full h-12 bg-[#2563EB] hover:bg-[#1D4ED8] active:scale-[0.99] text-white text-xs font-bold rounded-xl shadow-xs flex items-center justify-center gap-2.5 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#2563EB] disabled:opacity-60"
                    >
                      {isSubmitting ? (
                        <div className="flex items-center gap-2">
                          <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Provisioning Plant Tenant &amp; Rate Cards...</span>
                        </div>
                      ) : (
                        <>
                          <span>Complete Onboarding &amp; Enter Dashboard</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                    <p className="text-[11px] text-center text-slate-500 mt-2">
                      Zero AI Pricing Hallucination • Authoritative Machine Rate Cards Pre-Seeded
                    </p>
                  </div>
                </form>
              </div>

              {/* Status Footer */}
              <div className="pt-4 border-t border-slate-200 mt-6 flex flex-wrap items-center justify-between text-[11px] text-slate-500">
                <div className="flex items-center gap-1.5 font-mono">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>TENANT ISOLATION GUARANTEED</span>
                </div>
                <span>Indian Statutory Compliant</span>
              </div>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
};

export default CompanyOnboardingPage;
