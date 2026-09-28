import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  UploadCloud,
  CheckCircle2,
  ShieldCheck,
  Calculator,
  ArrowRight,
  TrendingUp,
  Cpu,
  Layers,
  ChevronDown,
  Building2,
  Lock,
  Download,
  Mail,
  Sliders,
  Clock,
  Sparkles,
  Shield,
  FileCheck2,
  Database,
  Coins,
  Check,
  Menu,
  X,
  Factory,
  AlertTriangle,
  ExternalLink,
  ChevronRight,
  HelpCircle,
  BarChart3
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user, company } = useAuth();

  // Mobile menu state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Hero interactive workspace tab
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState<'po' | 'extraction' | 'costing' | 'quotation'>('po');

  // FAQ accordion state
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  // Product showcase tab
  const [activeShowcaseTab, setActiveShowcaseTab] = useState<'dashboard' | 'review' | 'rates' | 'costing' | 'dossier'>('review');

  // Interactive pilot modal state
  const [isPilotModalOpen, setIsPilotModalOpen] = useState(false);
  const [pilotFormData, setPilotFormData] = useState({
    name: '',
    email: '',
    company: '',
    facilityType: 'Precision CNC/VMC Machine Shop',
    monthlyVolume: '20–50 POs / Month',
    phone: '',
  });
  const [pilotSubmitted, setPilotSubmitted] = useState(false);

  const handlePilotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPilotSubmitted(true);
    setTimeout(() => {
      setIsPilotModalOpen(false);
      setPilotSubmitted(false);
      navigate('/login');
    }, 1800);
  };

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-[#fcfbf9] text-[#111827] font-sans antialiased selection:bg-[#B87333]/20 selection:text-[#B87333]">

      {/* ========================================================================= */}
      {/* 1. STICKY INDUSTRIAL TOP NAVIGATION                                      */}
      {/* ========================================================================= */}
      <nav className="sticky top-0 z-50 bg-[#10141d]/90 backdrop-blur-md border-b border-[#1f2d47] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          
          {/* Logo & Operational Badge */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center shrink-0 shadow-xs border border-white/20">
              <svg width="22" height="22" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="5" y="5" width="26" height="26" rx="6" stroke="#172033" strokeWidth="2.5" />
                <circle cx="18" cy="18" r="3.2" fill="#B87333" />
                <path d="M18 5V11.5M18 24.5V31M5 18H11.5M24.5 18H31" stroke="#172033" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg tracking-wider uppercase text-white font-sans">
                  QUOTATION AI
                </span>
                <span className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-[#B87333]/20 text-[#fdad67] border border-[#B87333]/40">
                  MFG OS v4.8
                </span>
              </div>
              <span className="text-[10px] text-[#7f879f] font-mono tracking-wider uppercase">
                Precision Manufacturing Platform
              </span>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center gap-7 text-xs font-semibold tracking-wide text-[#cbd5e1]">
            <button onClick={() => scrollToSection('how-it-works')} className="hover:text-white transition-colors cursor-pointer">
              How It Works
            </button>
            <button onClick={() => scrollToSection('product-showcase')} className="hover:text-white transition-colors cursor-pointer">
              Platform Features
            </button>
            <button onClick={() => scrollToSection('differentiators')} className="hover:text-white transition-colors cursor-pointer">
              Why Us
            </button>
            <button onClick={() => scrollToSection('pricing')} className="hover:text-white transition-colors cursor-pointer">
              Pricing
            </button>
            <button onClick={() => scrollToSection('faq')} className="hover:text-white transition-colors cursor-pointer">
              FAQ
            </button>
          </div>

          {/* Right Action Buttons */}
          <div className="hidden sm:flex items-center gap-3">
            {isAuthenticated ? (
              <button
                onClick={() => navigate('/dashboard')}
                className="px-4 py-2 bg-[#B87333] hover:bg-[#A46328] text-white text-xs font-bold rounded-lg transition-all shadow-md shadow-[#B87333]/20 flex items-center gap-2 cursor-pointer"
              >
                <span>Go to Dashboard</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <>
                <button
                  onClick={() => navigate('/login')}
                  className="px-3.5 py-2 text-xs font-semibold text-[#cbd5e1] hover:text-white hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
                >
                  Sign In
                </button>
                <button
                  onClick={() => setIsPilotModalOpen(true)}
                  className="px-4 py-2 bg-[#B87333] hover:bg-[#A46328] text-white text-xs font-bold rounded-lg transition-all shadow-md shadow-[#B87333]/20 flex items-center gap-2 cursor-pointer"
                >
                  <span>Request Plant Pilot</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>

          {/* Mobile Menu Hamburger */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-slate-300 hover:text-white focus:outline-none"
              aria-label="Toggle navigation"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

        </div>

        {/* Mobile Dropdown Menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="md:hidden bg-[#10141d] border-b border-[#1f2d47] px-6 py-5 flex flex-col gap-4 text-sm font-medium text-slate-300"
            >
              <button onClick={() => scrollToSection('how-it-works')} className="text-left py-1 hover:text-white">
                How It Works
              </button>
              <button onClick={() => scrollToSection('product-showcase')} className="text-left py-1 hover:text-white">
                Platform Features
              </button>
              <button onClick={() => scrollToSection('differentiators')} className="text-left py-1 hover:text-white">
                Why Us
              </button>
              <button onClick={() => scrollToSection('pricing')} className="text-left py-1 hover:text-white">
                Pricing
              </button>
              <button onClick={() => scrollToSection('faq')} className="text-left py-1 hover:text-white">
                FAQ
              </button>
              <div className="pt-3 border-t border-[#1f2d47] flex flex-col gap-2">
                <button
                  onClick={() => navigate('/login')}
                  className="w-full py-2.5 text-center text-xs font-semibold text-white bg-white/10 hover:bg-white/15 rounded-lg"
                >
                  Sign In
                </button>
                <button
                  onClick={() => { setMobileMenuOpen(false); setIsPilotModalOpen(true); }}
                  className="w-full py-2.5 text-center text-xs font-bold text-white bg-[#B87333] hover:bg-[#A46328] rounded-lg shadow-sm"
                >
                  Request Plant Pilot
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* ========================================================================= */}
      {/* 2. HERO SECTION — DIRECT MANUFACTURING VALUE                              */}
      {/* ========================================================================= */}
      <section className="relative overflow-hidden bg-[#10141d] text-white pt-16 pb-20 lg:pt-24 lg:pb-32 border-b border-[#1f2d47]">
        {/* Subtle geometric grid backdrop */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:24px_24px]" />
        <div className="absolute -right-32 -top-32 w-96 h-96 rounded-full bg-[#B87333] opacity-10 blur-3xl pointer-events-none" />
        <div className="absolute -left-32 bottom-0 w-96 h-96 rounded-full bg-[#3b82f6] opacity-10 blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          
          {/* Eyebrow Pill */}
          <div className="flex items-center justify-center">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#172033] border border-[#2b3a58] shadow-inner text-xs font-medium text-[#d9e2fc]">
              <span className="w-2 h-2 rounded-full bg-[#B87333] animate-pulse" />
              <span className="font-mono text-[#fdad67] font-semibold">PURCHASE ORDER INTELLIGENCE</span>
              <span className="text-white/30">•</span>
              <span className="text-slate-300">Deterministic Machining Cost Engine</span>
            </div>
          </div>

          {/* Primary Headline */}
          <div className="text-center mt-6 max-w-4xl mx-auto">
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.12]">
              Turn Customer POs Into <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-[#fdad67]">
                Production-Ready Quotations.
              </span>
            </h1>
            <p className="mt-6 text-base sm:text-lg lg:text-xl text-[#94a3b8] leading-relaxed max-w-3xl mx-auto font-normal">
              Extract complex multi-page customer purchase orders with Document AI. Apply your plant’s authoritative rate cards without pricing hallucination. Generate DIN A4 sealed quotations in minutes.
            </p>
          </div>

          {/* Primary Call to Action Buttons */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 max-w-md mx-auto">
            <button
              onClick={() => setIsPilotModalOpen(true)}
              className="w-full sm:w-auto px-7 py-3.5 bg-[#B87333] hover:bg-[#A46328] text-white text-sm font-bold rounded-lg transition-all shadow-lg shadow-[#B87333]/25 flex items-center justify-center gap-2.5 cursor-pointer active:scale-[0.99]"
            >
              <span>Request 14-Day Plant Pilot</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => navigate('/login')}
              className="w-full sm:w-auto px-6 py-3.5 bg-[#172033] hover:bg-[#202c45] text-slate-200 hover:text-white text-sm font-semibold rounded-lg transition-all border border-[#2b3a58] flex items-center justify-center gap-2 cursor-pointer"
            >
              <Cpu className="w-4 h-4 text-[#fdad67]" />
              <span>Explore Live Platform</span>
            </button>
          </div>

          {/* Trust Guarantees Bar Under Hero CTA */}
          <div className="mt-8 pt-6 border-t border-white/10 flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-xs font-mono text-slate-400">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#B87333]" />
              <span>Zero AI Price Invention</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#B87333]" />
              <span>Authoritative Database Rates</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#B87333]" />
              <span>Mandatory Human Approval Gate</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#B87333]" />
              <span>SHA-256 Sealed Immutability</span>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 3. HERO VISUAL — REALISTIC QUOTATION WORKSPACE INTERACTION                */}
          {/* ========================================================================= */}
          <div className="mt-12 lg:mt-16 bg-[#172033] rounded-2xl border border-[#2b3a58] shadow-2xl overflow-hidden max-w-5xl mx-auto">
            
            {/* Top Workspace Header Bar */}
            <div className="bg-[#10141d] px-4 sm:px-6 py-3.5 border-b border-[#2b3a58] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex h-2.5 w-2.5 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                </span>
                <span className="text-xs font-mono font-semibold text-slate-300 uppercase tracking-wider">
                  Live Workflow Simulation: Tata Motors CVBU PO #2026-4421
                </span>
              </div>

              {/* 4 Interactive Process Step Tabs */}
              <div className="flex items-center gap-1 bg-[#172033] p-1 rounded-lg border border-[#2b3a58]">
                <button
                  onClick={() => setActiveWorkspaceTab('po')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                    activeWorkspaceTab === 'po' ? 'bg-[#B87333] text-white shadow-xs' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  1. PO Ingestion
                </button>
                <button
                  onClick={() => setActiveWorkspaceTab('extraction')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                    activeWorkspaceTab === 'extraction' ? 'bg-[#B87333] text-white shadow-xs' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  2. Extraction Review
                </button>
                <button
                  onClick={() => setActiveWorkspaceTab('costing')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                    activeWorkspaceTab === 'costing' ? 'bg-[#B87333] text-white shadow-xs' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  3. Deterministic Costing
                </button>
                <button
                  onClick={() => setActiveWorkspaceTab('quotation')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                    activeWorkspaceTab === 'quotation' ? 'bg-[#B87333] text-white shadow-xs' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  4. Sealed DIN A4
                </button>
              </div>
            </div>

            {/* Workspace Interactive Body Content */}
            <div className="p-5 sm:p-7 min-h-[380px] flex flex-col justify-center">
              
              {/* TAB 1: CUSTOMER PO INGESTION PREVIEW */}
              {activeWorkspaceTab === 'po' && (
                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-[#2b3a58]">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-red-950/60 text-red-400 flex items-center justify-center font-mono font-bold text-xs border border-red-800/40">
                        PDF
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-white font-mono">TATA_MOTORS_PO_2026_4421.pdf</h4>
                        <p className="text-xs text-slate-400">4.2 MB • Multi-page Drawing &amp; Specification Annexures</p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-emerald-950/60 text-emerald-400 border border-emerald-800/40 text-xs font-mono font-medium">
                      ✓ Optical Parsing Complete (18ms)
                    </span>
                  </div>

                  {/* Mock Raw PO Scan Content */}
                  <div className="bg-[#10141d] rounded-xl p-4 border border-[#2b3a58] font-mono text-xs space-y-2 text-slate-300">
                    <div className="text-slate-400 flex justify-between border-b border-[#1f2d47] pb-2">
                      <span>CUSTOMER: Tata Motors Commercial Vehicle Div, Pune</span>
                      <span>GSTIN: 27AAACT2727Q1ZW</span>
                    </div>
                    <div className="grid grid-cols-12 gap-2 text-slate-400 font-semibold py-1">
                      <span className="col-span-2">LINE #</span>
                      <span className="col-span-5">TECHNICAL DESCRIPTION (RAW PO)</span>
                      <span className="col-span-2">DRAWING REF</span>
                      <span className="col-span-3 text-right">QUANTITY</span>
                    </div>
                    <div className="grid grid-cols-12 gap-2 py-1.5 border-t border-[#1f2d47] text-white">
                      <span className="col-span-2 text-[#fdad67]">0010</span>
                      <span className="col-span-5 truncate">Flange Bearing Housing (Forged EN8 / Mild Alloy)</span>
                      <span className="col-span-2 text-slate-400">DWG-FBH-441-A</span>
                      <span className="col-span-3 text-right font-bold text-[#fdad67]">250 PCS</span>
                    </div>
                    <div className="grid grid-cols-12 gap-2 py-1.5 border-t border-[#1f2d47] text-white">
                      <span className="col-span-2 text-[#fdad67]">0020</span>
                      <span className="col-span-5 truncate">Hardened Pinion Shaft (AISI 4140 / EN24 Normalized)</span>
                      <span className="col-span-2 text-slate-400">DWG-HPS-098-C</span>
                      <span className="col-span-3 text-right font-bold text-[#fdad67]">100 PCS</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-xs text-slate-400 pt-2">
                    <span>Identified 2 precision line items with GD&amp;T callouts and tolerance annexures.</span>
                    <button onClick={() => setActiveWorkspaceTab('extraction')} className="text-[#fdad67] hover:underline font-semibold flex items-center gap-1 cursor-pointer">
                      <span>Inspect Extracted Items</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </motion.div>
              )}

              {/* TAB 2: EXTRACTION REVIEW & HUMAN GATE PREVIEW */}
              {activeWorkspaceTab === 'extraction' && (
                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                  <div className="bg-amber-950/40 border border-amber-800/60 rounded-xl p-3.5 flex items-start gap-3 text-xs">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div className="text-amber-200">
                      <span className="font-bold">Human Verification Invariant Enforced:</span> Raw customer PO description <code className="bg-black/30 px-1 py-0.5 rounded text-white">'Forged EN8 / Mild Alloy'</code> requires costing engineer confirmation to bind against active plant catalog <code className="bg-black/30 px-1 py-0.5 rounded text-emerald-300">'Alloy Steel EN8'</code>.
                    </div>
                  </div>

                  {/* Verification Grid */}
                  <div className="bg-[#10141d] rounded-xl p-4 border border-[#2b3a58] text-xs space-y-3 font-mono">
                    <div className="flex items-center justify-between pb-2 border-b border-[#1f2d47]">
                      <span className="text-white font-bold">Item 01: Bearing Housing Assembly</span>
                      <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 text-[11px]">
                        AI Confidence 99.4%
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-slate-300">
                      <div className="bg-[#172033] p-2.5 rounded-lg border border-[#2b3a58]">
                        <span className="block text-[10px] text-slate-400 uppercase">Bound Metallurgy Grade</span>
                        <span className="font-bold text-white mt-0.5 block text-sm">EN8 (7.85 g/cm³)</span>
                      </div>
                      <div className="bg-[#172033] p-2.5 rounded-lg border border-[#2b3a58]">
                        <span className="block text-[10px] text-slate-400 uppercase">Assigned Routing Process</span>
                        <span className="font-bold text-white mt-0.5 block text-sm">CNC Turning &amp; 4-Axis VMC</span>
                      </div>
                      <div className="bg-[#172033] p-2.5 rounded-lg border border-[#2b3a58]">
                        <span className="block text-[10px] text-slate-400 uppercase">Gross Weight / Scrap Est.</span>
                        <span className="font-bold text-[#fdad67] mt-0.5 block text-sm">8.50 kg / 2.30 kg Swarf</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-xs text-slate-400 pt-2">
                    <span>Approved by Costing Engineer R. Deshmukh (MIDC Bhosari Works)</span>
                    <button onClick={() => setActiveWorkspaceTab('costing')} className="text-[#fdad67] hover:underline font-semibold flex items-center gap-1 cursor-pointer">
                      <span>Compute Costing Breakdown</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </motion.div>
              )}

              {/* TAB 3: DETERMINISTIC COSTING ENGINE PREVIEW */}
              {activeWorkspaceTab === 'costing' && (
                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-[#2b3a58] text-xs font-mono">
                    <span className="text-white font-bold uppercase tracking-wider">
                      Authoritative Rate Card Calculations (No AI Price Generation)
                    </span>
                    <span className="text-emerald-400 font-semibold">Python Decimal Arithmetic Quantized</span>
                  </div>

                  {/* Math Breakdown Table */}
                  <div className="bg-[#10141d] rounded-xl p-4 border border-[#2b3a58] text-xs font-mono space-y-2.5">
                    <div className="flex justify-between items-center text-slate-300">
                      <span>Raw Material Cost (8.5 kg @ ₹88.00/kg × 250 pcs):</span>
                      <span className="text-white font-bold">₹1,87,000.00</span>
                    </div>
                    <div className="flex justify-between items-center text-emerald-400">
                      <span>Scrap Salvage Recovery (2.3 kg swarf @ ₹22.00/kg × 250 pcs):</span>
                      <span className="font-bold">- ₹12,650.00</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-300">
                      <span>CNC &amp; VMC Machining (1.5 hrs @ ₹650/hr × 250 pcs + Setup ₹500):</span>
                      <span className="text-white font-bold">₹2,44,250.00</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-400 pt-1 border-t border-[#1f2d47]">
                      <span>Shop Overhead Multiplier (10.00%):</span>
                      <span>₹41,860.00</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-400">
                      <span>Manufacturing Margin (15.00%):</span>
                      <span>₹69,069.00</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-300 pt-1.5 border-t border-[#2b3a58]">
                      <span>Central GST (9%) + State GST (9%):</span>
                      <span>₹95,297.22</span>
                    </div>
                    <div className="flex justify-between items-center text-sm font-bold text-white pt-2 border-t-2 border-[#B87333]">
                      <span className="text-[#fdad67]">FINAL COMMERCIAL QUOTATION TOTAL:</span>
                      <span className="text-xl text-[#fdad67]">₹6,24,826.22</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-xs text-slate-400 pt-1">
                    <span>Prices strictly derived from Material &amp; Process database rate cards.</span>
                    <button onClick={() => setActiveWorkspaceTab('quotation')} className="text-[#fdad67] hover:underline font-semibold flex items-center gap-1 cursor-pointer">
                      <span>Inspect Finalized PDF Dossier</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </motion.div>
              )}

              {/* TAB 4: SEALED DIN A4 QUOTATION DOSSIER */}
              {activeWorkspaceTab === 'quotation' && (
                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                  <div className="bg-white text-[#172033] rounded-xl p-5 sm:p-6 shadow-xl border border-slate-300 space-y-4">
                    {/* Quotation Header Mock */}
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-4 border-b border-slate-200">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-black text-lg tracking-wide uppercase font-sans">
                            BHARAT PRECISION ENGINEERING PVT. LTD.
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 mt-0.5">Plot W-42, MIDC Industrial Area, Phase II, Bhosari, Pune, MH - 411026</p>
                        <span className="text-[11px] font-mono text-slate-700">PLANT GSTIN: 27AAACB1234F1Z8</span>
                      </div>
                      <div className="sm:text-right">
                        <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">Official Commercial Quotation</span>
                        <span className="text-base font-bold font-mono text-[#B87333]">QT-2026-0099</span>
                        <span className="text-[11px] text-slate-600 block">Validity: 30 Calendar Days</span>
                      </div>
                    </div>

                    {/* Commercial Terms & Amount in Words */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
                      <div className="bg-slate-50 p-3 rounded border border-slate-200 space-y-1">
                        <span className="text-[10px] text-slate-500 uppercase font-bold block">AMOUNT IN WORDS (INR):</span>
                        <p className="font-bold text-slate-900 leading-snug">
                          Indian Rupee Six Lakh Twenty-Four Thousand Eight Hundred and Twenty-Six and Twenty-Two Paise Only
                        </p>
                      </div>
                      <div className="bg-slate-50 p-3 rounded border border-slate-200 space-y-1">
                        <span className="text-[10px] text-slate-500 uppercase font-bold block">BANK REMITTANCE (RTGS/NEFT):</span>
                        <p className="text-slate-800">State Bank of India • MIDC Bhosari Branch</p>
                        <p className="text-slate-800 font-bold">A/C: 38920194821 • IFSC: SBIN0004128</p>
                      </div>
                    </div>

                    {/* Cryptographic Seal Strip */}
                    <div className="bg-[#172033] text-white p-3 rounded-lg flex items-center justify-between text-xs font-mono">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-emerald-400" />
                        <span className="font-bold text-emerald-300">CRYPTOGRAPHIC INTEGRITY SEAL:</span>
                      </div>
                      <span className="text-[11px] text-slate-300 truncate max-w-xs">
                        SHA256: 0dafc7b05d15f1fbe7bb2155fb4407b4...
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-xs text-slate-400 pt-1">
                    <span>Document immutable. Mutation or recalculation returns HTTP 409 Conflict.</span>
                    <button onClick={() => setIsPilotModalOpen(true)} className="text-[#fdad67] hover:underline font-semibold flex items-center gap-1 cursor-pointer">
                      <span>Deploy this workflow at your plant</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </motion.div>
              )}

            </div>
          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. TRUST & OPERATIONAL VALUE STRIP                                       */}
      {/* ========================================================================= */}
      <section className="bg-white py-12 border-b border-[#E5E1D8]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 divide-y md:divide-y-0 md:divide-x divide-[#E5E1D8]">
            
            <div className="flex items-start gap-3.5 pt-4 md:pt-0 md:px-4">
              <div className="w-10 h-10 rounded-lg bg-[#f5f3ee] text-[#B87333] flex items-center justify-center shrink-0 border border-[#E5E1D8]">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-[#111827]">Rapid RFQ Turnaround</h3>
                <p className="text-xs text-[#64748B] mt-1 leading-relaxed">
                  Respond to OEM inquiries in minutes instead of days, securing preferred tier ranking.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5 pt-4 md:pt-0 md:px-4">
              <div className="w-10 h-10 rounded-lg bg-[#f5f3ee] text-[#B87333] flex items-center justify-center shrink-0 border border-[#E5E1D8]">
                <Calculator className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-[#111827]">100% Deterministic Rates</h3>
                <p className="text-xs text-[#64748B] mt-1 leading-relaxed">
                  Prices originate purely from your plant’s rate cards. AI never guesses or discounts.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5 pt-4 md:pt-0 md:px-4">
              <div className="w-10 h-10 rounded-lg bg-[#f5f3ee] text-[#B87333] flex items-center justify-center shrink-0 border border-[#E5E1D8]">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-[#111827]">Mandatory Human Approval</h3>
                <p className="text-xs text-[#64748B] mt-1 leading-relaxed">
                  Unmapped materials or processes block quotation generation until confirmed by an engineer.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5 pt-4 md:pt-0 md:px-4">
              <div className="w-10 h-10 rounded-lg bg-[#f5f3ee] text-[#B87333] flex items-center justify-center shrink-0 border border-[#E5E1D8]">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-[#111827]">Sealed DIN A4 Immutability</h3>
                <p className="text-xs text-[#64748B] mt-1 leading-relaxed">
                  Finalized quotations produce cryptographically sealed PDFs that cannot be tampered with.
                </p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 5. THE PROBLEM SECTION — WHY SPREADSHEETS FAIL MACHINE SHOPS              */}
      {/* ========================================================================= */}
      <section className="py-20 lg:py-28 bg-[#fbf9f4] border-b border-[#E5E1D8]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#B87333]">
              The Precision Machine Shop Bottleneck
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-[#111827] tracking-tight mt-2">
              Why Traditional Manual Estimation Breaks Down Under Production Volume
            </h2>
            <p className="text-sm sm:text-base text-[#64748B] mt-3">
              Precision machining requires strict mathematical rigor. Relying on disconnected spreadsheets and manual document re-entry directly erodes shop profitability.
            </p>
          </div>

          <div className="mt-14 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            <div className="bg-white p-6 rounded-xl border border-[#E5E1D8] shadow-xs flex flex-col justify-between">
              <div>
                <div className="w-9 h-9 rounded-lg bg-red-50 text-red-600 flex items-center justify-center font-mono font-bold text-xs mb-4">
                  01
                </div>
                <h3 className="font-bold text-base text-[#111827]">Unstructured 10-Page POs</h3>
                <p className="text-xs text-[#64748B] mt-2 leading-relaxed">
                  Estimators spend hours manually transcribing part numbers, tolerances, and drawing revisions from complex customer PDFs into internal estimation sheets.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-[#f0eee9] text-[11px] font-mono text-red-700">
                Risk: Misread drawing callouts &amp; missed line items
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-[#E5E1D8] shadow-xs flex flex-col justify-between">
              <div>
                <div className="w-9 h-9 rounded-lg bg-red-50 text-red-600 flex items-center justify-center font-mono font-bold text-xs mb-4">
                  02
                </div>
                <h3 className="font-bold text-base text-[#111827]">Excel Formula Drift</h3>
                <p className="text-xs text-[#64748B] mt-2 leading-relaxed">
                  Formulas in shared plant spreadsheets get overwritten. Scrap recovery credits are skipped, or outdated steel rates from last quarter are mistakenly applied.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-[#f0eee9] text-[11px] font-mono text-red-700">
                Risk: Costly under-quoting &amp; margin compression
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-[#E5E1D8] shadow-xs flex flex-col justify-between">
              <div>
                <div className="w-9 h-9 rounded-lg bg-red-50 text-red-600 flex items-center justify-center font-mono font-bold text-xs mb-4">
                  03
                </div>
                <h3 className="font-bold text-base text-[#111827]">AI Hallucination Hazards</h3>
                <p className="text-xs text-[#64748B] mt-2 leading-relaxed">
                  Generic AI chatbots fabricate numbers, miscalculate steel density ratios, or invent imaginary hourly machine rates, creating commercial liabilities.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-[#f0eee9] text-[11px] font-mono text-red-700">
                Risk: Binding offers issued at unworkable rates
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-[#E5E1D8] shadow-xs flex flex-col justify-between">
              <div>
                <div className="w-9 h-9 rounded-lg bg-red-50 text-red-600 flex items-center justify-center font-mono font-bold text-xs mb-4">
                  04
                </div>
                <h3 className="font-bold text-base text-[#111827]">Zero Version Integrity</h3>
                <p className="text-xs text-[#64748B] mt-2 leading-relaxed">
                  Final quotations circulate as editable Word files or unstructured emails. When customers contest price terms, no cryptographic audit trail exists.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-[#f0eee9] text-[11px] font-mono text-red-700">
                Risk: Commercial disputes &amp; unauthorized discounts
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 6. HOW IT WORKS — ELEGANT 4-STEP TIMELINE                                 */}
      {/* ========================================================================= */}
      <section id="how-it-works" className="py-20 lg:py-28 bg-white border-b border-[#E5E1D8]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#B87333]">
              Deterministic Process Workflow
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-[#111827] tracking-tight mt-2">
              From Customer PO to Final Sealed Quotation in 4 Controlled Steps
            </h2>
            <p className="text-sm sm:text-base text-[#64748B] mt-3">
              Quotation AI strictly separates optical document parsing from financial calculation, preserving complete human control at every stage.
            </p>
          </div>

          <div className="mt-16 grid grid-cols-1 md:grid-cols-4 gap-8 relative">
            
            {/* Step 1 */}
            <div className="bg-[#fcfbf9] rounded-xl p-6 border border-[#E5E1D8] shadow-xs flex flex-col justify-between relative group hover:border-[#B87333] transition-all">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-full bg-[#172033] text-white flex items-center justify-center font-mono font-bold text-xs">
                    01
                  </div>
                  <span className="text-[11px] font-mono uppercase text-[#B87333] font-bold">Ingest</span>
                </div>
                <h3 className="font-bold text-base text-[#111827]">Upload Customer PO</h3>
                <p className="text-xs text-[#64748B] leading-relaxed">
                  Drag and drop customer purchase orders in multi-page PDF, scanned drawing image, or Excel spreadsheet format up to 25MB.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-[#eae8e3] text-[11px] font-mono text-slate-500">
                Azure Doc Intel OCR Pipeline
              </div>
            </div>

            {/* Step 2 */}
            <div className="bg-[#fcfbf9] rounded-xl p-6 border border-[#E5E1D8] shadow-xs flex flex-col justify-between relative group hover:border-[#B87333] transition-all">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-full bg-[#172033] text-white flex items-center justify-center font-mono font-bold text-xs">
                    02
                  </div>
                  <span className="text-[11px] font-mono uppercase text-[#B87333] font-bold">Review</span>
                </div>
                <h3 className="font-bold text-base text-[#111827]">Review &amp; Rate Binding</h3>
                <p className="text-xs text-[#64748B] leading-relaxed">
                  Inspect extracted BOM tables side-by-side with original drawings. Costing engineers confirm or remap metallurgy and routing processes.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-[#eae8e3] text-[11px] font-mono text-slate-500">
                Mandatory Safety Validation Gate
              </div>
            </div>

            {/* Step 3 */}
            <div className="bg-[#fcfbf9] rounded-xl p-6 border border-[#E5E1D8] shadow-xs flex flex-col justify-between relative group hover:border-[#B87333] transition-all">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-full bg-[#172033] text-white flex items-center justify-center font-mono font-bold text-xs">
                    03
                  </div>
                  <span className="text-[11px] font-mono uppercase text-[#B87333] font-bold">Calculate</span>
                </div>
                <h3 className="font-bold text-base text-[#111827]">Deterministic Costing</h3>
                <p className="text-xs text-[#64748B] leading-relaxed">
                  Backend Python Decimal engine computes gross stock weight, scrap recovery credit, machining cycle times, setup, overhead, and GST.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-[#eae8e3] text-[11px] font-mono text-slate-500">
                Zero AI Price Hallucination
              </div>
            </div>

            {/* Step 4 */}
            <div className="bg-[#fcfbf9] rounded-xl p-6 border border-[#E5E1D8] shadow-xs flex flex-col justify-between relative group hover:border-[#B87333] transition-all">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-full bg-[#B87333] text-white flex items-center justify-center font-mono font-bold text-xs shadow-md">
                    04
                  </div>
                  <span className="text-[11px] font-mono uppercase text-[#B87333] font-bold">Seal &amp; Send</span>
                </div>
                <h3 className="font-bold text-base text-[#111827]">Finalize &amp; Dispatch</h3>
                <p className="text-xs text-[#64748B] leading-relaxed">
                  Generate a canonical DIN A4 PDF sealed with a SHA-256 integrity hash. Dispatch directly to buyer procurement email with full audit telemetry.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-[#eae8e3] text-[11px] font-mono text-slate-500">
                Immutable Vector ReportLab PDF
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 7. PRODUCT SHOWCASE — INTERACTIVE FEATURE DEEP DIVE                      */}
      {/* ========================================================================= */}
      <section id="product-showcase" className="py-20 lg:py-28 bg-[#10141d] text-white border-b border-[#1f2d47]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#fdad67]">
              Industrial OS Capabilities
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight mt-2">
              Every Module Purpose-Built for Component Manufacturing
            </h2>
            <p className="text-sm sm:text-base text-slate-400 mt-3">
              Explore the dedicated toolset that powers precision quoting across machine shops, fabrication units, and aerospace suppliers.
            </p>
          </div>

          {/* Module Switcher Buttons */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-2">
            {[
              { id: 'dashboard', label: 'Plant Dashboard', icon: BarChart3 },
              { id: 'review', label: 'Side-by-Side Review', icon: Layers },
              { id: 'rates', label: 'Rate Card Master', icon: Coins },
              { id: 'costing', label: 'Deterministic Engine', icon: Calculator },
              { id: 'dossier', label: 'DIN A4 Quotation Dossier', icon: FileCheck2 },
            ].map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveShowcaseTab(tab.id as any)}
                  className={`px-4 py-2.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                    activeShowcaseTab === tab.id
                      ? 'bg-[#B87333] text-white shadow-md shadow-[#B87333]/20'
                      : 'bg-[#172033] text-slate-300 hover:text-white hover:bg-[#202c45] border border-[#2b3a58]'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Dynamic Module Preview Box */}
          <div className="mt-8 bg-[#172033] rounded-2xl border border-[#2b3a58] p-6 sm:p-10 shadow-2xl">
            {activeShowcaseTab === 'dashboard' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                <div className="lg:col-span-5 space-y-4">
                  <span className="text-xs font-mono font-bold uppercase text-[#fdad67]">Supervisory Plant Telemetry</span>
                  <h3 className="text-xl sm:text-2xl font-bold text-white">Live Quotation Pipeline &amp; Conversion Analytics</h3>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                    Track total quotations processed, active customer win rates, turnaround velocity, and pending approvals across your entire estimating team.
                  </p>
                  <ul className="space-y-2 text-xs text-slate-300 font-mono">
                    <li className="flex items-center gap-2">✓ Real-time SQL aggregations with sub-50ms query turnaround</li>
                    <li className="flex items-center gap-2">✓ Dynamic period slicing (7 Days, 30 Days, 90 Days, Custom)</li>
                    <li className="flex items-center gap-2">✓ High-concurrency verified: 50 simultaneous plant queries</li>
                  </ul>
                </div>
                <div className="lg:col-span-7 bg-[#10141d] rounded-xl p-5 border border-[#2b3a58] font-mono text-xs">
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="bg-[#172033] p-3 rounded border border-[#2b3a58]">
                      <span className="text-[10px] text-slate-400">PIPELINE VALUE</span>
                      <span className="text-lg font-bold text-white block mt-1">₹4.82 Cr</span>
                    </div>
                    <div className="bg-[#172033] p-3 rounded border border-[#2b3a58]">
                      <span className="text-[10px] text-slate-400">WIN RATE</span>
                      <span className="text-lg font-bold text-emerald-400 block mt-1">42.8%</span>
                    </div>
                    <div className="bg-[#172033] p-3 rounded border border-[#2b3a58]">
                      <span className="text-[10px] text-slate-400">TURNAROUND</span>
                      <span className="text-lg font-bold text-[#fdad67] block mt-1">2.4 Mins</span>
                    </div>
                  </div>
                  <div className="bg-[#172033] p-3 rounded border border-[#2b3a58] text-slate-300 space-y-1.5">
                    <span className="text-[11px] font-bold text-white block">Recent Enterprise Quotations</span>
                    <div className="flex justify-between text-slate-400 border-b border-[#2b3a58] pb-1">
                      <span>Tata Motors Ltd (PO #4421)</span>
                      <span className="text-white font-bold">₹6,24,826.00</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Mahindra &amp; Mahindra (PO #8912)</span>
                      <span className="text-white font-bold">₹3,85,400.00</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeShowcaseTab === 'review' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                <div className="lg:col-span-5 space-y-4">
                  <span className="text-xs font-mono font-bold uppercase text-[#fdad67]">Human-In-The-Loop Verification</span>
                  <h3 className="text-xl sm:text-2xl font-bold text-white">Side-by-Side Drawing &amp; Specification Review</h3>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                    Compare the customer’s scanned PO against parsed data. The interface highlights unmapped alloy designations or complex machining notes so engineers can correct them with one click.
                  </p>
                  <ul className="space-y-2 text-xs text-slate-300 font-mono">
                    <li className="flex items-center gap-2">✓ Automatic detection of ASTM, AISI, DIN, and IS metallurgy standards</li>
                    <li className="flex items-center gap-2">✓ Visual confidence tagging per line item</li>
                    <li className="flex items-center gap-2">✓ Strict gate prevents unapproved POs from reaching quotation stage</li>
                  </ul>
                </div>
                <div className="lg:col-span-7 bg-[#10141d] rounded-xl p-5 border border-[#2b3a58] font-mono text-xs space-y-3">
                  <div className="flex justify-between items-center text-slate-400 border-b border-[#2b3a58] pb-2">
                    <span className="text-white font-bold">Extracted Line Items (Approval Status: PENDING REVIEW)</span>
                    <span className="text-[#fdad67]">2 Items Detected</span>
                  </div>
                  <div className="p-3 bg-[#172033] rounded-lg border border-[#2b3a58] space-y-2">
                    <div className="flex justify-between text-white font-bold">
                      <span>1. Bearing Adapter Flange (Drawing: DWG-441-A)</span>
                      <span className="text-emerald-400 font-semibold">Matched: Alloy Steel EN8</span>
                    </div>
                    <div className="text-slate-400 text-[11px] grid grid-cols-3 gap-2">
                      <span>Qty: 250 Pcs</span>
                      <span>Weight: 8.5 kg</span>
                      <span>Routing: CNC Turning</span>
                    </div>
                  </div>
                  <div className="p-3 bg-[#172033] rounded-lg border border-amber-800/60 bg-amber-950/20 space-y-1">
                    <div className="flex justify-between text-amber-300 font-bold">
                      <span>2. Hardened Spline Shaft</span>
                      <span>Requires Rate Card Binding</span>
                    </div>
                    <p className="text-slate-400 text-[11px]">Customer spec specifies 'AISI 4140 Quenched'. Bind to active 'EN24' catalog rate card.</p>
                  </div>
                </div>
              </div>
            )}

            {activeShowcaseTab === 'rates' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                <div className="lg:col-span-5 space-y-4">
                  <span className="text-xs font-mono font-bold uppercase text-[#fdad67]">Plant Truth Master</span>
                  <h3 className="text-xl sm:text-2xl font-bold text-white">Centralized Material Densities &amp; Machine Hour Rates</h3>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                    Configure raw material buying rates, scrap credit deductions, densities, and spindle hour rates for every CNC, VMC, Lathe, and Grinder on your shop floor.
                  </p>
                  <ul className="space-y-2 text-xs text-slate-300 font-mono">
                    <li className="flex items-center gap-2">✓ True scrap credit deduction based on turning/milling swarf mass</li>
                    <li className="flex items-center gap-2">✓ Multi-tenant isolated rate cards visible only to your plant</li>
                    <li className="flex items-center gap-2">✓ Instant global recalculation when material market prices change</li>
                  </ul>
                </div>
                <div className="lg:col-span-7 bg-[#10141d] rounded-xl p-5 border border-[#2b3a58] font-mono text-xs space-y-3">
                  <div className="flex justify-between text-slate-400 border-b border-[#2b3a58] pb-1 font-bold">
                    <span>MATERIAL MASTER</span>
                    <span>BASE BUYING</span>
                    <span>SCRAP CREDIT</span>
                  </div>
                  <div className="flex justify-between text-white py-1 border-b border-[#1f2d47]">
                    <span>Alloy Steel EN8 (7.85 g/cm³)</span>
                    <span className="text-[#fdad67]">₹88.00 / kg</span>
                    <span className="text-emerald-400">₹22.00 / kg</span>
                  </div>
                  <div className="flex justify-between text-white py-1 border-b border-[#1f2d47]">
                    <span>Alloy Steel EN24 (7.85 g/cm³)</span>
                    <span className="text-[#fdad67]">₹165.00 / kg</span>
                    <span className="text-emerald-400">₹45.00 / kg</span>
                  </div>
                  <div className="flex justify-between text-white py-1 border-b border-[#1f2d47]">
                    <span>Stainless Steel 304 (8.00 g/cm³)</span>
                    <span className="text-[#fdad67]">₹395.00 / kg</span>
                    <span className="text-emerald-400">₹150.00 / kg</span>
                  </div>
                  <div className="pt-2 text-slate-400 flex justify-between font-bold">
                    <span>MACHINE OPERATIONS MASTER</span>
                    <span>SPINDLE RATE</span>
                  </div>
                  <div className="flex justify-between text-white">
                    <span>VMC 4-Axis Machining Center</span>
                    <span className="text-[#fdad67]">₹1,250.00 / hr</span>
                  </div>
                </div>
              </div>
            )}

            {activeShowcaseTab === 'costing' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                <div className="lg:col-span-5 space-y-4">
                  <span className="text-xs font-mono font-bold uppercase text-[#fdad67]">Deterministic Precision</span>
                  <h3 className="text-xl sm:text-2xl font-bold text-white">Transparent Formula Breakdown with Zero Black-Box Math</h3>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                    Inspect every rupee with complete mathematical transparency. Raw stock mass, scrap deduction, cycle time machining, setup amortization, overhead, and margin are clearly presented.
                  </p>
                  <ul className="space-y-2 text-xs text-slate-300 font-mono">
                    <li className="flex items-center gap-2">✓ Formula: Net Material = (Gross Stock × Rate) - (Swarf × Scrap Rate)</li>
                    <li className="flex items-center gap-2">✓ Process Cost = (Spindle Hours × Hourly Rate) + Setup Amortization</li>
                    <li className="flex items-center gap-2">✓ Statutory CGST/SGST (18%) and Interstate IGST compliance</li>
                  </ul>
                </div>
                <div className="lg:col-span-7 bg-[#10141d] rounded-xl p-5 border border-[#2b3a58] font-mono text-xs space-y-2.5">
                  <div className="bg-[#172033] p-3 rounded border border-[#2b3a58] text-slate-300">
                    <span className="text-[10px] text-slate-400 block font-bold">FORMULA TRANSPARENCY (LINE ITEM 1)</span>
                    <p className="text-white mt-1">Raw Stock: 250 pcs × 8.5 kg @ ₹88.00 = ₹1,87,000.00</p>
                    <p className="text-emerald-400">Scrap Recovery: 250 pcs × 2.3 kg swarf @ ₹22.00 = -₹12,650.00</p>
                    <p className="text-[#fdad67]">Machining: 250 pcs × 1.5 hrs @ ₹650/hr + ₹500 setup = ₹2,44,250.00</p>
                  </div>
                  <div className="p-3 bg-[#172033] rounded border border-[#2b3a58] flex justify-between items-center text-slate-300">
                    <span>Taxable Assessable Value:</span>
                    <span className="font-bold text-white">₹5,29,529.00</span>
                  </div>
                  <div className="p-3 bg-[#172033] rounded border border-[#2b3a58] flex justify-between items-center text-[#fdad67] font-bold">
                    <span>Final Quote Value (Inclusive of 18% GST):</span>
                    <span className="text-base">₹6,24,826.22</span>
                  </div>
                </div>
              </div>
            )}

            {activeShowcaseTab === 'dossier' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                <div className="lg:col-span-5 space-y-4">
                  <span className="text-xs font-mono font-bold uppercase text-[#fdad67]">Output Engineering</span>
                  <h3 className="text-xl sm:text-2xl font-bold text-white">DIN A4 Dossiers That Impress Tier-1 OEM Procurement</h3>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                    Select from 8 professional industrial templates. Include company letterhead, statutory GSTIN, MSME Udyam credentials, bank remittance codes, and Indian Rupee words automatically.
                  </p>
                  <ul className="space-y-2 text-xs text-slate-300 font-mono">
                    <li className="flex items-center gap-2">✓ 8 Industrial Styles: Industrial Bold, Classic, Executive Slate, Modern</li>
                    <li className="flex items-center gap-2">✓ SHA-256 seal proves document authenticity to OEM auditors</li>
                    <li className="flex items-center gap-2">✓ Direct email dispatch tracks buyer reception and open timestamps</li>
                  </ul>
                </div>
                <div className="lg:col-span-7 bg-[#10141d] rounded-xl p-5 border border-[#2b3a58] font-mono text-xs space-y-3">
                  <div className="bg-white text-slate-900 p-4 rounded-lg shadow-sm space-y-2">
                    <div className="flex justify-between border-b border-slate-200 pb-2">
                      <span className="font-black text-sm uppercase">BHARAT PRECISION ENGINEERING</span>
                      <span className="text-[#B87333] font-bold">QT-2026-0099.pdf</span>
                    </div>
                    <div className="text-[11px] text-slate-600">
                      Amount in Words: Indian Rupee Six Lakh Twenty-Four Thousand Eight Hundred and Twenty-Six Only
                    </div>
                    <div className="text-[11px] text-slate-700 bg-slate-100 p-2 rounded">
                      Remit to: State Bank of India • A/C 38920194821 • IFSC SBIN0004128
                    </div>
                    <div className="text-[10px] text-slate-500 flex justify-between pt-1">
                      <span>Certified: ISO 9001:2015</span>
                      <span>SHA256: 0dafc7b05d15...</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 8. KEY DIFFERENTIATORS — REAL MANUFACTURING ARCHITECTURE                 */}
      {/* ========================================================================= */}
      <section id="differentiators" className="py-20 lg:py-28 bg-[#fcfbf9] border-b border-[#E5E1D8]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#B87333]">
              Engineering Architecture
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-[#111827] tracking-tight mt-2">
              Why Component Manufacturers Trust Quotation AI Over Generic Software
            </h2>
            <p className="text-sm sm:text-base text-[#64748B] mt-3">
              We engineered Quotation AI specifically around machine shop operational realities, not generic office workflows.
            </p>
          </div>

          <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-8">
            
            <div className="bg-white p-7 rounded-xl border border-[#E5E1D8] shadow-xs space-y-4">
              <div className="w-11 h-11 rounded-lg bg-[#f5f3ee] text-[#B87333] flex items-center justify-center border border-[#E5E1D8]">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-lg text-[#111827]">Zero AI Price Hallucination</h3>
              <p className="text-xs sm:text-sm text-[#64748B] leading-relaxed">
                Large language models are strictly prohibited from generating monetary figures. OCR extracts technical text only. All pricing is determined deterministically by your database rates.
              </p>
            </div>

            <div className="bg-white p-7 rounded-xl border border-[#E5E1D8] shadow-xs space-y-4">
              <div className="w-11 h-11 rounded-lg bg-[#f5f3ee] text-[#B87333] flex items-center justify-center border border-[#E5E1D8]">
                <Coins className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-lg text-[#111827]">True Scrap Credit Recovery</h3>
              <p className="text-xs sm:text-sm text-[#64748B] leading-relaxed">
                Unlike simplistic billing apps, Quotation AI computes true raw stock volume minus finish part weight to give accurate swarf recovery credits for steel, aluminum, and brass.
              </p>
            </div>

            <div className="bg-white p-7 rounded-xl border border-[#E5E1D8] shadow-xs space-y-4">
              <div className="w-11 h-11 rounded-lg bg-[#f5f3ee] text-[#B87333] flex items-center justify-center border border-[#E5E1D8]">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-lg text-[#111827]">SHA-256 Legal Immutability</h3>
              <p className="text-xs sm:text-sm text-[#64748B] leading-relaxed">
                When a quotation is finalized, its database record is locked to <code className="bg-slate-100 text-[#B87333] px-1 py-0.5 rounded text-xs">FINAL</code> and sealed with a SHA-256 hash. Any attempt to modify rates triggers an HTTP 409 Conflict.
              </p>
            </div>

            <div className="bg-white p-7 rounded-xl border border-[#E5E1D8] shadow-xs space-y-4">
              <div className="w-11 h-11 rounded-lg bg-[#f5f3ee] text-[#B87333] flex items-center justify-center border border-[#E5E1D8]">
                <Sliders className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-lg text-[#111827]">Machine Setup Amortization</h3>
              <p className="text-xs sm:text-sm text-[#64748B] leading-relaxed">
                Amortize tooling setup and CNC program validation costs dynamically across batch sizes. A 50-piece prototype run correctly factors setup differently than a 10,000-piece production run.
              </p>
            </div>

            <div className="bg-white p-7 rounded-xl border border-[#E5E1D8] shadow-xs space-y-4">
              <div className="w-11 h-11 rounded-lg bg-[#f5f3ee] text-[#B87333] flex items-center justify-center border border-[#E5E1D8]">
                <Building2 className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-lg text-[#111827]">Strict Multi-Tenant Isolation</h3>
              <p className="text-xs sm:text-sm text-[#64748B] leading-relaxed">
                Your company rate cards, client catalog prices, profit margins, and PO documents are cryptographically isolated by tenant company ID. No other facility can ever view your costing.
              </p>
            </div>

            <div className="bg-white p-7 rounded-xl border border-[#E5E1D8] shadow-xs space-y-4">
              <div className="w-11 h-11 rounded-lg bg-[#f5f3ee] text-[#B87333] flex items-center justify-center border border-[#E5E1D8]">
                <Mail className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-lg text-[#111827]">Direct Buyer Dispatch</h3>
              <p className="text-xs sm:text-sm text-[#64748B] leading-relaxed">
                Dispatch quotations with PDF attachments directly through transactional email. Customer recipient emails are resolved securely from verified customer records to prevent misdirected quotes.
              </p>
            </div>

          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 9. TRANSPARENT PRICING PLANS                                              */}
      {/* ========================================================================= */}
      <section id="pricing" className="py-20 lg:py-28 bg-white border-b border-[#E5E1D8]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#B87333]">
              Simple Plant Deployment Tiers
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-[#111827] tracking-tight mt-2">
              Predictable Monthly Pricing for Manufacturing Operations
            </h2>
            <p className="text-sm sm:text-base text-[#64748B] mt-3">
              No hidden fees, no per-quote micro-charges. Scale your estimation volume with dedicated plant seats.
            </p>
          </div>

          <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
            
            {/* Tier 1 */}
            <div className="bg-[#fcfbf9] rounded-2xl p-7 border border-[#E5E1D8] shadow-xs flex flex-col justify-between">
              <div className="space-y-4">
                <div>
                  <h3 className="font-bold text-lg text-[#111827]">Job Shop Edition</h3>
                  <p className="text-xs text-[#64748B] mt-1">For single precision machining and tool room facilities.</p>
                </div>
                <div className="flex items-baseline gap-1 py-2">
                  <span className="text-3xl font-black text-[#111827]">₹14,999</span>
                  <span className="text-xs text-[#64748B]">/ Month</span>
                </div>
                <ul className="space-y-2.5 text-xs text-[#45474c] pt-2 border-t border-[#eae8e3]">
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-[#B87333]" /> Up to 50 Customer POs / Month</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-[#B87333]" /> 2 Estimator Seat Accounts</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-[#B87333]" /> Material &amp; Machine Rate Card Master</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-[#B87333]" /> 8 Industrial DIN A4 Quotation Templates</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-[#B87333]" /> Standard Email &amp; Phone Support</li>
                </ul>
              </div>
              <button
                onClick={() => setIsPilotModalOpen(true)}
                className="mt-8 w-full py-3 bg-white hover:bg-[#f0eee9] text-[#111827] text-xs font-bold rounded-lg transition-colors border border-[#E5E1D8] cursor-pointer"
              >
                Select Job Shop Edition
              </button>
            </div>

            {/* Tier 2 (Highlighted) */}
            <div className="bg-[#172033] text-white rounded-2xl p-7 border-2 border-[#B87333] shadow-xl flex flex-col justify-between relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#B87333] text-white px-3 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-wider uppercase">
                Most Popular for Machine Shops
              </div>
              <div className="space-y-4">
                <div>
                  <h3 className="font-bold text-lg text-white">Production Facility</h3>
                  <p className="text-xs text-slate-300 mt-1">For high-volume precision CNC/VMC manufacturing plants.</p>
                </div>
                <div className="flex items-baseline gap-1 py-2">
                  <span className="text-3xl font-black text-white">₹34,999</span>
                  <span className="text-xs text-slate-400">/ Month</span>
                </div>
                <ul className="space-y-2.5 text-xs text-slate-200 pt-2 border-t border-slate-700">
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-[#fdad67]" /> Unlimited PO Ingestions &amp; Quotations</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-[#fdad67]" /> 8 Estimator &amp; Management Seats</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-[#fdad67]" /> Advanced Scrap &amp; Swarf Deduction Engine</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-[#fdad67]" /> SHA-256 Cryptographic Sealed Dossiers</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-[#fdad67]" /> Direct OEM Customer Email Dispatch</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-[#fdad67]" /> Complete Audit Register &amp; Analytics</li>
                </ul>
              </div>
              <button
                onClick={() => setIsPilotModalOpen(true)}
                className="mt-8 w-full py-3 bg-[#B87333] hover:bg-[#A46328] text-white text-xs font-bold rounded-lg transition-all shadow-md shadow-[#B87333]/25 cursor-pointer"
              >
                Launch Production Pilot
              </button>
            </div>

            {/* Tier 3 */}
            <div className="bg-[#fcfbf9] rounded-2xl p-7 border border-[#E5E1D8] shadow-xs flex flex-col justify-between">
              <div className="space-y-4">
                <div>
                  <h3 className="font-bold text-lg text-[#111827]">Multi-Plant Enterprise</h3>
                  <p className="text-xs text-[#64748B] mt-1">For multi-facility manufacturing groups and Tier-1 suppliers.</p>
                </div>
                <div className="flex items-baseline gap-1 py-2">
                  <span className="text-3xl font-black text-[#111827]">Custom</span>
                  <span className="text-xs text-[#64748B]">/ Facility Cluster</span>
                </div>
                <ul className="space-y-2.5 text-xs text-[#45474c] pt-2 border-t border-[#eae8e3]">
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-[#B87333]" /> Multi-Plant Synchronized Rate Masters</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-[#B87333]" /> Custom ERP, SAP &amp; Tally Prime Connectors</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-[#B87333]" /> Custom DIN A4 Branded Template Design</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-[#B87333]" /> Dedicated On-Site Plant Engineering Onboarding</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-[#B87333]" /> 99.95% Availability SLA &amp; Support Hotline</li>
                </ul>
              </div>
              <button
                onClick={() => setIsPilotModalOpen(true)}
                className="mt-8 w-full py-3 bg-white hover:bg-[#f0eee9] text-[#111827] text-xs font-bold rounded-lg transition-colors border border-[#E5E1D8] cursor-pointer"
              >
                Contact Enterprise Sales
              </button>
            </div>

          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 10. FREQUENTLY ASKED QUESTIONS (FAQ)                                      */}
      {/* ========================================================================= */}
      <section id="faq" className="py-20 lg:py-28 bg-[#fbf9f4] border-b border-[#E5E1D8]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#B87333]">
              Technical &amp; Operational FAQ
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-[#111827] tracking-tight mt-2">
              Frequently Asked Questions from Machine Shop Leaders
            </h2>
          </div>

          <div className="mt-12 space-y-3">
            {[
              {
                q: "What document formats does Quotation AI accept for purchase orders?",
                a: "Quotation AI accepts multi-page vector PDFs, scanned PDF files, clear JPG/PNG images of engineering work orders, and tabular Excel sheets (.xlsx and .csv) up to 25MB per file."
              },
              {
                q: "Does the AI ever invent or guess what price we should charge?",
                a: "No. Under no circumstances does the AI determine prices. AI is strictly constrained to optical character recognition (OCR) and text normalization. Every rate, cycle cost, setup fee, and margin comes directly from your plant database rate cards."
              },
              {
                q: "What happens if a customer PO requests a material or process that is not in our rate cards?",
                a: "The calculation engine strictly enters a BLOCKED state. It produces an explicit diagnostic notification highlighting the missing item. You cannot generate or finalize a quotation until an engineer configures the verified rate in Rate Master."
              },
              {
                q: "How does Quotation AI compute raw material weight and scrap recovery?",
                a: "The system calculates raw billet mass using geometric formula: (pi/4) * Diameter^2 * Length * Density (e.g. 7.85 g/cm³ for EN8). The difference between gross stock mass and finished part mass represents swarf, which is credited back using your scrap rate."
              },
              {
                q: "Can a finalized quotation be edited after sending it to an OEM customer?",
                a: "Finalized quotations are cryptographically sealed with SHA-256 integrity hashes and cannot be mutated or recalculated. To change commercial terms, Quotation AI allows you to create a revised quotation version, preserving the full audit trail."
              },
              {
                q: "How are statutory GST and bank remittance details formatted on the PDF?",
                a: "The engine supports CGST (9%) + SGST (9%) or Interstate IGST (18%) with statutory HSN/SAC codes (8483/7326). The generated DIN A4 PDF automatically formats bank name, branch, account number, IFSC code for RTGS/NEFT, and writes out the final total in official Indian Rupee words."
              },
              {
                q: "Is our proprietary plant rate card data safe from competitors?",
                a: "Yes. Quotation AI enforces row-level multi-tenant database isolation. Every rate, user, PO, customer, and generated PDF is strictly partitioned by your company ID. No other manufacturer or user can access your data."
              }
            ].map((faq, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <div key={idx} className="bg-white rounded-xl border border-[#E5E1D8] overflow-hidden shadow-xs">
                  <button
                    onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                    className="w-full px-5 py-4 text-left flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-50 transition-colors"
                  >
                    <span className="font-bold text-sm text-[#111827]">{faq.q}</span>
                    <ChevronDown className={`w-4 h-4 text-[#64748B] shrink-0 transition-transform ${isOpen ? 'rotate-180 text-[#B87333]' : ''}`} />
                  </button>
                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="px-5 pb-5 text-xs sm:text-sm text-[#45474c] leading-relaxed border-t border-[#f0eee9] pt-3"
                      >
                        {faq.a}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 11. FINAL HIGH-IMPACT CALL TO ACTION                                      */}
      {/* ========================================================================= */}
      <section className="py-20 bg-[#10141d] text-white relative overflow-hidden border-b border-[#1f2d47]">
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:20px_20px]" />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#fdad67]">
            Empower Your Machine Shop
          </span>
          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight mt-3">
            Stop Losing Days on Manual Spreadsheets. <br />
            <span className="text-[#fdad67]">Start Turning POs Into Production Quotations.</span>
          </h2>
          <p className="mt-4 text-sm sm:text-base text-slate-300 max-w-2xl mx-auto">
            Join forward-thinking precision manufacturing facilities across India. Accelerate quote velocity, protect profit margins, and deliver professional DIN A4 commercial dossiers.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => setIsPilotModalOpen(true)}
              className="w-full sm:w-auto px-8 py-4 bg-[#B87333] hover:bg-[#A46328] text-white text-sm font-bold rounded-lg transition-all shadow-xl shadow-[#B87333]/30 flex items-center justify-center gap-2.5 cursor-pointer active:scale-[0.99]"
            >
              <span>Launch Your 14-Day Free Pilot</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => navigate('/login')}
              className="w-full sm:w-auto px-7 py-4 bg-[#172033] hover:bg-[#202c45] text-slate-200 hover:text-white text-sm font-semibold rounded-lg transition-all border border-[#2b3a58] flex items-center justify-center gap-2 cursor-pointer"
            >
              <Cpu className="w-4 h-4 text-[#fdad67]" />
              <span>Log In to Enterprise Portal</span>
            </button>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-xs font-mono text-slate-400">
            <span>✓ No credit card required</span>
            <span>✓ Deploy in under 15 minutes</span>
            <span>✓ Dedicated machine shop onboarding</span>
          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 12. ENTERPRISE FOOTER                                                     */}
      {/* ========================================================================= */}
      <footer className="bg-[#0b0e14] text-slate-400 py-14 border-t border-[#1f2d47] text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-5 gap-8">
          
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center gap-2.5 text-white font-extrabold text-base tracking-wider uppercase font-sans">
              <div className="w-7 h-7 rounded bg-white flex items-center justify-center shrink-0">
                <svg width="18" height="18" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="5" y="5" width="26" height="26" rx="6" stroke="#172033" strokeWidth="2.5" />
                  <circle cx="18" cy="18" r="3.2" fill="#B87333" />
                </svg>
              </div>
              <span>QUOTATION AI</span>
            </div>
            <p className="text-slate-400 text-xs leading-relaxed max-w-sm">
              The precision manufacturing quotation platform. Optical purchase order intelligence with deterministic backend rate costing for modern machine shops and component suppliers.
            </p>
            <div className="text-[11px] font-mono text-slate-500 pt-2">
              Industrial Node: IND-PUN-01 • Version 4.8-PROD
            </div>
          </div>

          <div>
            <span className="font-bold text-white uppercase text-[11px] tracking-wider block mb-3">Product Platform</span>
            <ul className="space-y-2">
              <li><button onClick={() => scrollToSection('how-it-works')} className="hover:text-white transition-colors">PO Ingestion Engine</button></li>
              <li><button onClick={() => scrollToSection('product-showcase')} className="hover:text-white transition-colors">Rate Card Master</button></li>
              <li><button onClick={() => scrollToSection('product-showcase')} className="hover:text-white transition-colors">Deterministic Costing</button></li>
              <li><button onClick={() => scrollToSection('product-showcase')} className="hover:text-white transition-colors">DIN A4 Quotation Studio</button></li>
              <li><button onClick={() => scrollToSection('product-showcase')} className="hover:text-white transition-colors">Quotation History Register</button></li>
            </ul>
          </div>

          <div>
            <span className="font-bold text-white uppercase text-[11px] tracking-wider block mb-3">Security &amp; Standards</span>
            <ul className="space-y-2">
              <li className="flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Multi-Tenant Isolation</li>
              <li className="flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> SHA-256 Hash Sealing</li>
              <li className="flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> ISO 9001:2015 Compliant</li>
              <li className="flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Indian GST Statutory Engine</li>
              <li className="flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> 256-Bit TLS Encryption</li>
            </ul>
          </div>

          <div>
            <span className="font-bold text-white uppercase text-[11px] tracking-wider block mb-3">Plant Support Desk</span>
            <div className="space-y-2 text-xs">
              <p className="text-slate-300 font-mono">+91 (080) 4920-8800</p>
              <p className="text-slate-400">support@orynza.in</p>
              <p className="text-slate-500 text-[11px] leading-relaxed pt-1">
                MIDC Industrial Area, Phase II, Bhosari, Pune, Maharashtra 411026
              </p>
            </div>
          </div>

        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 pt-6 border-t border-[#1f2d47] flex flex-col sm:flex-row justify-between items-center gap-3 text-[11px] text-slate-500">
          <span>&copy; {new Date().getFullYear()} Quotation AI / Orynza Manufacturing OS. All rights reserved.</span>
          <div className="flex items-center gap-4">
            <span className="hover:text-slate-400 cursor-pointer">Privacy Policy</span>
            <span>•</span>
            <span className="hover:text-slate-400 cursor-pointer">Terms of Service</span>
            <span>•</span>
            <span className="hover:text-slate-400 cursor-pointer">Security Architecture</span>
          </div>
        </div>
      </footer>

      {/* ========================================================================= */}
      {/* 13. INTERACTIVE PLANT PILOT APPLICATION MODAL                             */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {isPilotModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsPilotModalOpen(false)}
              className="fixed inset-0 bg-black/70 backdrop-blur-xs"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              role="dialog"
              aria-modal="true"
              aria-labelledby="pilot-modal-title"
              className="relative bg-white rounded-2xl p-6 sm:p-8 max-w-lg w-full shadow-2xl z-10 border border-[#E5E1D8] text-[#111827]"
            >
              <div className="flex items-center justify-between pb-4 border-b border-[#E5E1D8]">
                <div>
                  <h3 id="pilot-modal-title" className="font-bold text-lg text-[#111827]">Request 14-Day Plant Pilot</h3>
                  <p className="text-xs text-[#64748B] mt-0.5">Evaluate Quotation AI on your real customer purchase orders.</p>
                </div>
                <button
                  type="button"
                  aria-label="Close modal"
                  onClick={() => setIsPilotModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {pilotSubmitted ? (
                <div className="py-10 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                  <h4 className="font-bold text-base text-slate-900">Plant Pilot Registered</h4>
                  <p className="text-xs text-slate-600 max-w-sm mx-auto">
                    Connecting your facility profile to our industrial onboarding sandbox. Redirecting to platform login...
                  </p>
                </div>
              ) : (
                <form onSubmit={handlePilotSubmit} className="space-y-3.5 mt-4 text-xs">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Costing Engineer / Director Name</label>
                    <input
                      type="text"
                      required
                      placeholder="Rajesh Deshmukh"
                      value={pilotFormData.name}
                      onChange={e => setPilotFormData({ ...pilotFormData, name: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-[#E5E1D8] bg-[#fcfbf9] text-slate-900 focus:outline-none focus:border-[#B87333]"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">Company / Plant Name</label>
                      <input
                        type="text"
                        required
                        placeholder="Bharat Precision Engineering"
                        value={pilotFormData.company}
                        onChange={e => setPilotFormData({ ...pilotFormData, company: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-lg border border-[#E5E1D8] bg-[#fcfbf9] text-slate-900 focus:outline-none focus:border-[#B87333]"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">Work Email</label>
                      <input
                        type="email"
                        required
                        placeholder="r.deshmukh@bharatprecision.co.in"
                        value={pilotFormData.email}
                        onChange={e => setPilotFormData({ ...pilotFormData, email: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-lg border border-[#E5E1D8] bg-[#fcfbf9] text-slate-900 focus:outline-none focus:border-[#B87333]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">Facility Classification</label>
                      <select
                        value={pilotFormData.facilityType}
                        onChange={e => setPilotFormData({ ...pilotFormData, facilityType: e.target.value })}
                        className="w-full px-3 py-2.5 rounded-lg border border-[#E5E1D8] bg-[#fcfbf9] text-slate-900 focus:outline-none focus:border-[#B87333]"
                      >
                        <option>Precision CNC/VMC Machine Shop</option>
                        <option>Sheet Metal &amp; Fabrication Unit</option>
                        <option>Forging &amp; Casting Machine Facility</option>
                        <option>Aerospace / Defense Component Supplier</option>
                      </select>
                    </div>
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">Monthly PO Volume</label>
                      <select
                        value={pilotFormData.monthlyVolume}
                        onChange={e => setPilotFormData({ ...pilotFormData, monthlyVolume: e.target.value })}
                        className="w-full px-3 py-2.5 rounded-lg border border-[#E5E1D8] bg-[#fcfbf9] text-slate-900 focus:outline-none focus:border-[#B87333]"
                      >
                        <option>10–25 POs / Month</option>
                        <option>20–50 POs / Month</option>
                        <option>50–150 POs / Month</option>
                        <option>150+ POs / Month</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Phone Number (For Plant Setup Coordination)</label>
                    <input
                      type="tel"
                      required
                      placeholder="+91 98220 12345"
                      value={pilotFormData.phone}
                      onChange={e => setPilotFormData({ ...pilotFormData, phone: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-[#E5E1D8] bg-[#fcfbf9] text-slate-900 focus:outline-none focus:border-[#B87333]"
                    />
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      className="w-full py-3 bg-[#B87333] hover:bg-[#A46328] text-white font-bold rounded-lg transition-all shadow-md shadow-[#B87333]/25 cursor-pointer text-xs"
                    >
                      Provision Plant Pilot Workspace
                    </button>
                    <p className="text-[10px] text-slate-500 text-center mt-2">
                      Instant evaluation credentials will be assigned with pre-loaded industrial sample data.
                    </p>
                  </div>
                </form>
              )}

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default LandingPage;
