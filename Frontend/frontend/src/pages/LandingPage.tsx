import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion, useMotionValueEvent, useScroll, useSpring, useTransform } from 'framer-motion';
import {
  ArrowDown,
  ArrowRight,
  BarChart3,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Cpu,
  Database,
  FileCheck2,
  FileText,
  Factory,
  Layers3,
  Mail,
  Menu,
  Network,
  Play,
  ScanLine,
  ShieldCheck,
  Sparkles,
  X,
  Zap,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const copper = '#B87333';
const navy = '#172033';
const ivory = '#FBF9F4';

const journey = [
  {
    id: 'po',
    eyebrow: '01 / INGEST',
    title: 'Purchase Order',
    description: 'Drop a customer PO into ORYNZA and start with the document you already have.',
    icon: FileText,
  },
  {
    id: 'extract',
    eyebrow: '02 / UNDERSTAND',
    title: 'AI Extraction',
    description: 'Manufacturing fields are identified, structured and prepared for review.',
    icon: ScanLine,
  },
  {
    id: 'cost',
    eyebrow: '03 / CALCULATE',
    title: 'Intelligent Costing',
    description: 'Structured line items flow into your authoritative material and process rates.',
    icon: BarChart3,
  },
  {
    id: 'quote',
    eyebrow: '04 / GENERATE',
    title: 'Quotation',
    description: 'A polished commercial quotation is assembled from reviewed, traceable inputs.',
    icon: FileCheck2,
  },
  {
    id: 'dispatch',
    eyebrow: '05 / DISPATCH',
    title: 'Ready to Send',
    description: 'Finalize the commercial output and move it to the customer workflow.',
    icon: Mail,
  },
];

const faqs = [
  ['Does ORYNZA calculate prices with AI?', 'No. AI is used to understand and structure purchase-order information. Pricing remains tied to configured material, process and commercial rate data.'],
  ['Can our team review extracted PO data?', 'Yes. The workflow is designed around review and approval before costing and quotation generation.'],
  ['Can ORYNZA work with our existing rates?', 'Yes. The platform includes rate-management surfaces so your team can maintain the commercial inputs used by the costing workflow.'],
  ['How are statutory GST and bank remittance details formatted on the PDF?', 'Quotation output can include HSN/SAC code, CGST/SGST/IGST and configured bank-remittance details according to the company settings and quotation template.'],
];

function MiniLogo() {
  return (
    <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/15 bg-white shadow-lg shadow-black/10">
      <svg width="22" height="22" viewBox="0 0 36 36" fill="none" aria-hidden="true">
        <rect x="5" y="5" width="26" height="26" rx="6" stroke={navy} strokeWidth="2.5" />
        <circle cx="18" cy="18" r="3.2" fill={copper} />
        <path d="M18 5V11.5M18 24.5V31M5 18H11.5M24.5 18H31" stroke={navy} strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    </div>
  );
}

function FlowVisual({ stage }: { stage: number }) {
  const item = journey[stage];
  const Icon = item.icon;
  const progress = stage / (journey.length - 1);
  const lineScale = useSpring(useTransform(() => progress), { stiffness: 120, damping: 22 });

  const stageDetails = useMemo(() => {
    switch (stage) {
      case 0:
        return <POVisual />;
      case 1:
        return <ExtractionVisual />;
      case 2:
        return <CostingVisual />;
      case 3:
        return <QuotationVisual />;
      default:
        return <DispatchVisual />;
    }
  }, [stage]);

  return (
    <div className="relative mx-auto w-full max-w-[760px]">
      <div className="absolute -inset-8 rounded-[3rem] bg-[radial-gradient(circle_at_50%_40%,rgba(184,115,51,0.18),transparent_52%)] blur-2xl" />
      <div className="relative overflow-hidden rounded-[2rem] border border-white/12 bg-[#0E1522] shadow-[0_40px_100px_rgba(0,0,0,0.35)]">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4 text-[10px] uppercase tracking-[0.22em] text-slate-500">
          <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[#B87333] shadow-[0_0_12px_rgba(184,115,51,.8)]" /> ORYNZA / INTELLIGENCE CORE</div>
          <span>LIVE WORKFLOW</span>
        </div>
        <div className="relative min-h-[430px] p-5 sm:p-8">
          <div className="absolute left-8 right-8 top-8 h-px bg-white/8" />
          <motion.div className="absolute left-8 top-8 h-px origin-left bg-[#B87333]" style={{ scaleX: lineScale }} />
          <div className="relative z-10 mb-7 flex items-end justify-between gap-4 pt-2">
            <div>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#D59A62]">{item.eyebrow}</p>
              <AnimatePresence mode="wait">
                <motion.h3 key={item.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: .35 }} className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">{item.title}</motion.h3>
              </AnimatePresence>
            </div>
            <div className="hidden rounded-xl border border-white/10 bg-white/5 p-3 sm:block"><Icon className="h-5 w-5 text-[#D59A62]" /></div>
          </div>
          <div className="relative min-h-[285px]">
            <AnimatePresence mode="wait">
              <motion.div key={item.id} initial={{ opacity: 0, scale: .985, y: 14 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 1.015, y: -12 }} transition={{ duration: .55, ease: [0.22, 1, 0.36, 1] }} className="h-full">{stageDetails}</motion.div>
            </AnimatePresence>
          </div>
        </div>
        <div className="border-t border-white/10 px-5 py-4 sm:px-8">
          <div className="flex gap-2">
            {journey.map((step, i) => <div key={step.id} className="flex-1"><div className={`h-1 rounded-full transition-all duration-500 ${i <= stage ? 'bg-[#B87333]' : 'bg-white/10'}`} /></div>)}
          </div>
          <p className="mt-3 max-w-xl text-xs leading-5 text-slate-400">{item.description}</p>
        </div>
      </div>
    </div>
  );
}

function POVisual() {
  return <div className="grid h-full grid-cols-1 gap-4 sm:grid-cols-[1.05fr_.95fr]">
    <div className="rounded-2xl border border-slate-200 bg-[#F8F7F2] p-5 text-[#172033] shadow-xl shadow-black/10">
      <div className="flex items-start justify-between border-b border-slate-200 pb-4"><div><div className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Customer purchase order</div><div className="mt-1 text-sm font-bold">PO-88421 / REV 02</div></div><FileText className="h-5 w-5 text-[#B87333]" /></div>
      <div className="mt-5 space-y-3 font-mono text-[10px]"><div className="h-2 w-24 rounded bg-slate-200" /><div className="grid grid-cols-3 gap-2"><span className="rounded bg-white p-2">PART-AX42</span><span className="rounded bg-white p-2">QTY 240</span><span className="rounded bg-white p-2">SS304</span></div><div className="h-16 rounded-xl border border-dashed border-slate-300 bg-white/70" /><div className="grid grid-cols-2 gap-2"><span className="rounded bg-white p-2">DELIVERY 21D</span><span className="rounded bg-white p-2">DRAWING A-17</span></div></div>
    </div>
    <div className="flex flex-col justify-between rounded-2xl border border-white/10 bg-white/[.035] p-5"><div><div className="text-[9px] uppercase tracking-widest text-slate-500">Input signal</div><div className="mt-2 text-sm font-medium text-white">One document. Structured manufacturing intent.</div></div><div className="mt-6 space-y-2">{['Customer', 'Part details', 'Quantity', 'Material', 'Delivery'].map((x, i) => <motion.div key={x} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * .06 }} className="flex items-center justify-between rounded-lg border border-white/8 bg-black/15 px-3 py-2 text-[10px]"><span className="text-slate-400">{x}</span><span className="text-[#D59A62]">detected</span></motion.div>)}</div></div>
  </div>;
}

function ExtractionVisual() {
  return <div className="grid h-full gap-4 sm:grid-cols-[.9fr_1.1fr]">
    <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-[#F8F7F2] p-5 text-[#172033]"><div className="absolute left-0 right-0 top-1/2 h-px bg-[#B87333]/70 shadow-[0_0_20px_rgba(184,115,51,.8)]" /><div className="mb-5 text-[9px] font-bold uppercase tracking-widest text-slate-400">AI document understanding</div><div className="space-y-3 font-mono text-[10px]"><div className="h-3 w-32 rounded bg-slate-200" /><div className="grid grid-cols-2 gap-2"><span className="rounded bg-[#fff] p-3 ring-1 ring-[#B87333]/20">PART-AX42</span><span className="rounded bg-[#fff] p-3 ring-1 ring-[#B87333]/20">240 PCS</span></div><div className="h-20 rounded-xl bg-white ring-1 ring-[#B87333]/20" /><div className="grid grid-cols-2 gap-2"><span className="rounded bg-[#fff] p-3 ring-1 ring-[#B87333]/20">SS304</span><span className="rounded bg-[#fff] p-3 ring-1 ring-[#B87333]/20">21 DAYS</span></div></div></div>
    <div className="rounded-2xl border border-white/10 bg-white/[.035] p-5"><div className="mb-4 flex items-center justify-between"><span className="text-[9px] uppercase tracking-widest text-slate-500">Structured output</span><span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2 py-1 text-[9px] text-emerald-300">REVIEW READY</span></div><div className="space-y-2">{[['part_number','PART-AX42'],['material','SS304'],['quantity','240'],['delivery','21 days'],['drawing_ref','A-17']].map(([a,b]) => <div key={a} className="flex items-center justify-between rounded-lg bg-black/15 px-3 py-2.5 font-mono text-[10px]"><span className="text-slate-500">{a}</span><span className="text-white">{b}</span></div>)}</div></div>
  </div>;
}

function CostingVisual() {
  return <div className="rounded-2xl border border-white/10 bg-white/[.035] p-5 sm:p-6"><div className="grid gap-4 sm:grid-cols-[1fr_.85fr]"><div className="space-y-2">{[['Material','₹ 2,84,000'],['Process','₹ 1,32,600'],['Labour','₹ 74,880'],['Overhead','₹ 42,000']].map(([a,b], i) => <motion.div key={a} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i*.07 }} className="flex items-center justify-between rounded-xl border border-white/8 bg-black/15 px-4 py-3"><span className="text-xs text-slate-400">{a}</span><span className="font-mono text-xs text-white">{b}</span></motion.div>)}</div><div className="rounded-2xl bg-[#F8F7F2] p-5 text-[#172033]"><div className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Rule-matched costing</div><div className="mt-5 flex items-end justify-between"><span className="text-xs text-slate-500">Commercial estimate</span><span className="text-2xl font-semibold">₹6.24L</span></div><div className="mt-4 h-2 rounded-full bg-slate-200"><motion.div initial={{ width: 0 }} animate={{ width: '78%' }} transition={{ duration: .8 }} className="h-full rounded-full bg-[#B87333]" /></div><div className="mt-4 flex items-center gap-2 text-[10px] text-emerald-600"><CheckCircle2 className="h-3.5 w-3.5" /> Derived from configured rates</div></div></div></div>;
}

function QuotationVisual() {
  return <div className="mx-auto max-w-[650px] rounded-2xl bg-[#F8F7F2] p-5 text-[#172033] shadow-2xl shadow-black/20 sm:p-7"><div className="flex items-start justify-between border-b border-slate-200 pb-5"><div><div className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Commercial quotation</div><div className="mt-1 text-base font-bold">ORYNZA / QT-2026-0099</div></div><div className="rounded-lg bg-[#172033] px-3 py-2 text-[9px] font-bold text-white">FINAL</div></div><div className="mt-5 grid grid-cols-3 gap-3 text-[10px]"><div className="rounded-lg bg-white p-3"><span className="text-slate-400">Customer</span><strong className="mt-1 block">Bharat Precision</strong></div><div className="rounded-lg bg-white p-3"><span className="text-slate-400">Items</span><strong className="mt-1 block">12 line items</strong></div><div className="rounded-lg bg-white p-3"><span className="text-slate-400">Validity</span><strong className="mt-1 block">30 days</strong></div></div><div className="mt-4 rounded-xl border border-slate-200 bg-white p-4"><div className="flex justify-between border-b border-slate-100 pb-2 font-mono text-[9px] text-slate-400"><span>PART</span><span>QTY</span><span>UNIT</span><span>TOTAL</span></div>{['PART-AX42','PART-BX18','PART-CX09'].map((x,i)=><div key={x} className="flex justify-between py-2 font-mono text-[9px]"><span>{x}</span><span>{[240,80,120][i]}</span><span>₹{[2600,4180,1850][i].toLocaleString()}</span><span>₹{[624000,334400,222000][i].toLocaleString()}</span></div>)}</div></div>;
}

function DispatchVisual() {
  return <div className="grid gap-4 sm:grid-cols-2"><div className="rounded-2xl border border-white/10 bg-white/[.035] p-6"><div className="flex items-center gap-3"><div className="rounded-xl bg-emerald-400/10 p-3"><Check className="h-5 w-5 text-emerald-300" /></div><div><div className="text-sm font-semibold text-white">Quotation finalized</div><div className="text-[10px] text-slate-500">QT-2026-0099.pdf</div></div></div><div className="mt-8 space-y-2 text-[10px]"><div className="flex justify-between rounded-lg bg-black/15 p-3"><span className="text-slate-500">Status</span><span className="text-emerald-300">READY TO SEND</span></div><div className="flex justify-between rounded-lg bg-black/15 p-3"><span className="text-slate-500">Customer</span><span className="text-white">Bharat Precision</span></div></div></div><div className="rounded-2xl border border-[#B87333]/20 bg-[#B87333]/[.06] p-6"><div className="text-[9px] uppercase tracking-widest text-[#D59A62]">Next action</div><div className="mt-2 text-xl font-semibold text-white">Send with confidence.</div><p className="mt-2 text-xs leading-5 text-slate-400">The commercial output is ready for your customer workflow.</p><button className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[#B87333] px-4 py-2.5 text-xs font-bold text-white">Dispatch quotation <ArrowRight className="h-3.5 w-3.5" /></button></div></div>;
}

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [stage, setStage] = useState(0);
  const [faq, setFaq] = useState<number | null>(0);
  const [pilotOpen, setPilotOpen] = useState(false);
  const [pilotSubmitted, setPilotSubmitted] = useState(false);
  const [pilot, setPilot] = useState({ name: '', email: '', company: '', phone: '' });
  const { scrollYProgress } = useScroll();
  const heroScale = useSpring(useTransform(scrollYProgress, [0, .12], [1, .94]), { stiffness: 100, damping: 22 });
  const heroY = useSpring(useTransform(scrollYProgress, [0, .12], [0, -35]), { stiffness: 100, damping: 22 });

  useMotionValueEvent(scrollYProgress, 'change', (v) => {
    // The workflow scene occupies the middle portion of the page. Mapping scroll progress here
    // keeps the product visual synchronized with the user's scroll instead of using timer-based animation.
    const local = Math.max(0, Math.min(1, (v - .16) / .54));
    setStage(Math.min(journey.length - 1, Math.floor(local * journey.length)));
  });

  const scrollToSection = (id: string) => {
    setMobileOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => { window.scrollTo(0, 0); }, []);

  const submitPilot = (e: React.FormEvent) => {
    e.preventDefault();
    setPilotSubmitted(true);
    window.setTimeout(() => { setPilotOpen(false); setPilotSubmitted(false); navigate('/login'); }, 1400);
  };

  return <main className="min-h-screen overflow-x-hidden bg-[#FBF9F4] font-sans text-[#172033] selection:bg-[#B87333]/20">
    <nav className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-[#0D1420]/80 text-white backdrop-blur-xl">
      <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-5 lg:px-8">
        <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="flex items-center gap-3 text-left"><MiniLogo /><div><div className="text-sm font-extrabold tracking-[.22em]">ORYNZA</div><div className="hidden text-[9px] uppercase tracking-[.18em] text-slate-500 sm:block">One Platform. Smarter Manufacturing.</div></div></button>
        <div className="hidden items-center gap-7 text-xs font-medium text-slate-300 md:flex"><button onClick={() => scrollToSection('how-it-works')}>How It Works</button><button onClick={() => scrollToSection('platform')}>Platform</button><button onClick={() => scrollToSection('why-orynza')}>Why ORYNZA</button><button onClick={() => scrollToSection('pricing')}>Pricing</button><button onClick={() => scrollToSection('faq')}>FAQ</button></div>
        <div className="hidden items-center gap-2 sm:flex">{isAuthenticated ? <button onClick={() => navigate('/dashboard')} className="rounded-full bg-white px-4 py-2 text-xs font-bold text-[#172033]">Open Platform <ArrowRight className="ml-1 inline h-3.5 w-3.5" /></button> : <><button onClick={() => navigate('/login')} className="rounded-full px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-white/5">Sign In</button><button onClick={() => navigate('/signup')} className="rounded-full bg-[#B87333] px-4 py-2 text-xs font-bold text-white shadow-lg shadow-[#B87333]/20">Sign Up Free <ArrowRight className="ml-1 inline h-3.5 w-3.5" /></button></>}</div>
        <button className="rounded-lg p-2 md:hidden" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Toggle navigation">{mobileOpen ? <X /> : <Menu />}</button>
      </div>
      <AnimatePresence>{mobileOpen && <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden border-t border-white/10 bg-[#0D1420] md:hidden"><div className="space-y-1 px-5 py-4 text-sm text-slate-300">{[['how-it-works','How It Works'],['platform','Platform'],['why-orynza','Why ORYNZA'],['pricing','Pricing'],['faq','FAQ']].map(([id,label]) => <button key={id} onClick={() => scrollToSection(id)} className="block w-full py-2 text-left">{label}</button>)}</div></motion.div>}</AnimatePresence>
    </nav>

    <section className="relative min-h-[760px] overflow-hidden bg-[#0D1420] pt-28 text-white sm:min-h-[860px]">
      <div className="absolute inset-0 opacity-30 [background-image:radial-gradient(circle_at_15%_20%,rgba(184,115,51,.22),transparent_28%),radial-gradient(circle_at_80%_30%,rgba(70,94,125,.2),transparent_32%)]" />
      <div className="absolute inset-0 opacity-[.08] [background-image:linear-gradient(rgba(255,255,255,.5)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.5)_1px,transparent_1px)] [background-size:48px_48px]" />
      <motion.div style={{ scale: heroScale, y: heroY }} className="relative mx-auto max-w-7xl px-5 pb-20 pt-20 lg:px-8 lg:pt-28">
        <div className="max-w-4xl"><div className="mb-6 flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[.24em] text-[#D59A62]"><span className="h-px w-10 bg-[#B87333]" /> Manufacturing intelligence, reimagined</div><h1 className="max-w-5xl text-5xl font-medium leading-[.96] tracking-[-.045em] sm:text-7xl lg:text-[88px]">Turn customer POs into <span className="text-[#D59A62]">production-ready quotations.</span></h1><p className="mt-7 max-w-2xl text-base leading-7 text-slate-400 sm:text-lg">ORYNZA connects purchase-order understanding, deterministic costing and quotation automation into one intelligent manufacturing workflow.</p><div className="mt-9 flex flex-col gap-3 sm:flex-row"><button onClick={() => setPilotOpen(true)} className="rounded-full bg-[#B87333] px-6 py-3.5 text-sm font-bold text-white shadow-xl shadow-[#B87333]/20">Book a Demo <ArrowRight className="ml-2 inline h-4 w-4" /></button><button onClick={() => scrollToSection('how-it-works')} className="rounded-full border border-white/15 px-6 py-3.5 text-sm font-semibold text-slate-200">See the workflow <ArrowDown className="ml-2 inline h-4 w-4" /></button></div></div>
        <div className="mt-20 grid gap-3 sm:grid-cols-3"><div className="rounded-2xl border border-white/10 bg-white/[.035] p-5"><ScanLine className="h-5 w-5 text-[#D59A62]" /><div className="mt-6 text-sm font-semibold">Purchase order intelligence</div><div className="mt-1 text-xs leading-5 text-slate-500">Understand manufacturing documents before costing.</div></div><div className="rounded-2xl border border-white/10 bg-white/[.035] p-5"><Database className="h-5 w-5 text-[#D59A62]" /><div className="mt-6 text-sm font-semibold">Authoritative database rates</div><div className="mt-1 text-xs leading-5 text-slate-500">Keep commercial inputs traceable and reviewable.</div></div><div className="rounded-2xl border border-white/10 bg-white/[.035] p-5"><ShieldCheck className="h-5 w-5 text-[#D59A62]" /><div className="mt-6 text-sm font-semibold">Zero AI price invention</div><div className="mt-1 text-xs leading-5 text-slate-500">AI understands the PO; configured business rules control costing.</div></div></div>
      </motion.div>
    </section>

    <section id="how-it-works" className="relative bg-[#FBF9F4] py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-5 lg:px-8"><div className="grid gap-12 lg:grid-cols-[.72fr_1.28fr] lg:gap-20"><div className="lg:sticky lg:top-32 lg:h-fit"><div className="text-[10px] font-bold uppercase tracking-[.22em] text-[#B87333]">The workflow</div><h2 className="mt-4 max-w-lg text-4xl font-medium leading-tight tracking-[-.035em] sm:text-6xl">One system. Five states. One continuous story.</h2><p className="mt-6 max-w-md text-sm leading-6 text-slate-500">Scroll through the ORYNZA intelligence core. Instead of disconnected feature cards, the same product state transforms from a customer document into a commercial output.</p><div className="mt-8 hidden space-y-3 lg:block">{journey.map((x,i) => <div key={x.id} className={`flex items-center gap-3 text-xs transition-colors ${i === stage ? 'text-[#172033]' : 'text-slate-400'}`}><span className={`h-1.5 w-1.5 rounded-full ${i === stage ? 'bg-[#B87333]' : 'bg-slate-300'}`} />{x.title}</div>)}</div></div><div className="min-h-[620px] pt-4 lg:min-h-[760px]"><div className="lg:sticky lg:top-28"><FlowVisual stage={stage} /></div></div></div></div>
    </section>

    <section id="platform" className="bg-[#111927] py-24 text-white sm:py-32"><div className="mx-auto max-w-7xl px-5 lg:px-8"><div className="max-w-3xl"><div className="text-[10px] font-bold uppercase tracking-[.22em] text-[#D59A62]">Platform architecture</div><h2 className="mt-4 text-4xl font-medium tracking-[-.035em] sm:text-6xl">Built around the work your commercial team actually does.</h2></div><div className="mt-16 grid gap-px overflow-hidden rounded-3xl border border-white/10 bg-white/10 md:grid-cols-2 lg:grid-cols-4"><Feature icon={ScanLine} title="PO Intelligence" text="Extract and structure manufacturing information from customer documents." /><Feature icon={BarChart3} title="Deterministic Costing" text="Map reviewed inputs to material, process and commercial rate data." /><Feature icon={FileCheck2} title="Quotation Studio" text="Turn approved costing into polished customer-ready quotations." /><Feature icon={Network} title="Connected Workflow" text="Carry the same information from upload through dispatch and history." /></div></div></section>

    <section id="why-orynza" className="py-24 sm:py-32"><div className="mx-auto max-w-7xl px-5 lg:px-8"><div className="grid gap-16 lg:grid-cols-[.8fr_1.2fr] lg:items-end"><div><div className="text-[10px] font-bold uppercase tracking-[.22em] text-[#B87333]">Why ORYNZA</div><h2 className="mt-4 text-4xl font-medium tracking-[-.035em] sm:text-6xl">Precision before automation.</h2></div><p className="max-w-xl text-sm leading-7 text-slate-500">The goal is not to make manufacturing teams trust a black box. The goal is to give them a faster workflow with visible inputs, reviewable extraction and controlled commercial logic.</p></div><div className="mt-16 grid gap-5 md:grid-cols-3"><Principle icon={Cpu} title="AI where it helps" text="Use AI for document understanding and structured extraction, not as an excuse to invent commercial values." /><Principle icon={Database} title="Rules where it matters" text="Keep costing tied to configured rates and business rules so the result can be reviewed." /><Principle icon={Layers3} title="One connected flow" text="Reduce handoffs between PO review, costing, quotation generation and dispatch." /></div></div></section>

    <section id="pricing" className="bg-[#F1EEE7] py-24 sm:py-32"><div className="mx-auto max-w-7xl px-5 lg:px-8"><div className="mx-auto max-w-2xl text-center"><div className="text-[10px] font-bold uppercase tracking-[.22em] text-[#B87333]">Pricing</div><h2 className="mt-4 text-4xl font-medium tracking-[-.035em] sm:text-6xl">Start with the workflow. Scale with the plant.</h2><p className="mt-5 text-sm leading-6 text-slate-500">Transparent tiers for teams moving from manual quotation work toward a connected manufacturing workflow.</p></div><div className="mt-14 grid gap-5 lg:grid-cols-3"><Price title="Job Shop Edition" price="₹14,999" desc="For a focused quotation team." features={['PO intelligence','Quotation workflow','Rate management','Quotation history']} /><Price title="Production Facility" price="₹34,999" desc="For higher-volume commercial teams." featured features={['Everything in Job Shop','Multiple users','Advanced costing workflow','Priority support']} /><Price title="Multi-Plant Enterprise" price="Custom" desc="For complex manufacturing organizations." features={['Multi-plant workflow','Custom integrations','Enterprise controls','Dedicated onboarding']} /></div><div className="mt-10 text-center"><button onClick={() => setPilotOpen(true)} className="rounded-full border border-[#172033]/15 px-6 py-3 text-xs font-bold text-[#172033]">Contact Enterprise Sales <ArrowRight className="ml-1 inline h-3.5 w-3.5" /></button></div></div></section>

    <section id="faq" className="py-24 sm:py-32"><div className="mx-auto max-w-4xl px-5 lg:px-8"><div className="text-center"><div className="text-[10px] font-bold uppercase tracking-[.22em] text-[#B87333]">FAQ</div><h2 className="mt-4 text-4xl font-medium tracking-[-.035em] sm:text-5xl">Questions, answered.</h2></div><div className="mt-12 divide-y divide-slate-200 border-y border-slate-200">{faqs.map(([q,a],i)=><div key={q}><button onClick={() => setFaq(faq === i ? null : i)} className="flex w-full items-center justify-between gap-6 py-6 text-left text-sm font-semibold"><span>{q}</span><ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${faq === i ? 'rotate-180' : ''}`} /></button><AnimatePresence initial={false}>{faq === i && <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden"><p className="max-w-3xl pb-6 text-sm leading-6 text-slate-500">{a}</p></motion.div>}</AnimatePresence></div>)}</div></div></section>

    <section className="relative overflow-hidden bg-[#0D1420] py-24 text-white sm:py-32"><div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(184,115,51,.18),transparent_40%)]" /><div className="relative mx-auto max-w-4xl px-5 text-center lg:px-8"><Sparkles className="mx-auto h-6 w-6 text-[#D59A62]" /><h2 className="mt-6 text-4xl font-medium tracking-[-.04em] sm:text-6xl">Turn every purchase order into manufacturing intelligence.</h2><p className="mx-auto mt-6 max-w-2xl text-sm leading-6 text-slate-400">See how ORYNZA can fit your quotation workflow without replacing the commercial controls your team depends on.</p><button onClick={() => setPilotOpen(true)} className="mt-9 rounded-full bg-[#B87333] px-7 py-3.5 text-sm font-bold shadow-xl shadow-[#B87333]/20">Book a Demo <ArrowRight className="ml-2 inline h-4 w-4" /></button></div></section>

    <footer className="bg-[#0D1420] px-5 pb-10 text-slate-500 lg:px-8"><div className="mx-auto flex max-w-7xl flex-col gap-5 border-t border-white/10 pt-7 text-[10px] uppercase tracking-wider sm:flex-row sm:items-center sm:justify-between"><span>© {new Date().getFullYear()} ORYNZA / Manufacturing Intelligence</span><span>One Platform. Smarter Manufacturing.</span></div></footer>

    <AnimatePresence>{pilotOpen && <div className="fixed inset-0 z-[70] flex items-center justify-center p-4"><motion.button aria-label="Close modal" onClick={() => setPilotOpen(false)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/70 backdrop-blur-sm" /><motion.div role="dialog" aria-modal="true" initial={{ opacity: 0, y: 16, scale: .98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 16, scale: .98 }} className="relative w-full max-w-lg rounded-3xl bg-[#FBF9F4] p-6 text-[#172033] shadow-2xl sm:p-8"><div className="flex items-start justify-between"><div><h3 className="text-xl font-semibold">Request 14-Day Plant Pilot</h3><p className="mt-1 text-xs text-slate-500">Evaluate ORYNZA on your quotation workflow.</p></div><button aria-label="Close modal" onClick={() => setPilotOpen(false)} className="rounded-full p-2 text-slate-400 hover:bg-slate-200"><X className="h-4 w-4" /></button></div>{pilotSubmitted ? <div className="py-12 text-center"><CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" /><h4 className="mt-4 font-semibold">Plant Pilot Registered</h4><p className="mt-2 text-xs text-slate-500">Connecting your facility profile. Redirecting to platform login...</p></div> : <form onSubmit={submitPilot} className="mt-7 space-y-4"><Field label="Name" value={pilot.name} onChange={v => setPilot({...pilot,name:v})} required /><div className="grid gap-4 sm:grid-cols-2"><Field label="Company" value={pilot.company} onChange={v => setPilot({...pilot,company:v})} required /><Field label="Work email" type="email" value={pilot.email} onChange={v => setPilot({...pilot,email:v})} required /></div><Field label="Phone" value={pilot.phone} onChange={v => setPilot({...pilot,phone:v})} required /><button type="submit" className="w-full rounded-xl bg-[#172033] py-3.5 text-xs font-bold text-white">Provision Plant Pilot Workspace</button></form>}</motion.div></div>}</AnimatePresence>
  </main>;
};

function Feature({ icon: Icon, title, text }: { icon: React.ElementType; title: string; text: string }) { return <div className="bg-[#111927] p-7 sm:p-8"><Icon className="h-5 w-5 text-[#D59A62]" /><h3 className="mt-8 text-sm font-semibold">{title}</h3><p className="mt-2 text-xs leading-5 text-slate-500">{text}</p></div>; }
function Principle({ icon: Icon, title, text }: { icon: React.ElementType; title: string; text: string }) { return <div className="rounded-2xl border border-slate-200 bg-white p-7"><Icon className="h-5 w-5 text-[#B87333]" /><h3 className="mt-8 text-base font-semibold">{title}</h3><p className="mt-3 text-sm leading-6 text-slate-500">{text}</p></div>; }
function Price({ title, price, desc, features, featured=false }: { title:string; price:string; desc:string; features:string[]; featured?:boolean }) { return <div className={`rounded-3xl border p-7 ${featured ? 'border-[#B87333] bg-[#172033] text-white shadow-xl shadow-[#172033]/15' : 'border-slate-200 bg-[#FBF9F4]'}`}><div className="flex items-center justify-between"><h3 className="text-sm font-semibold">{title}</h3>{featured && <span className="rounded-full bg-[#B87333] px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider">Popular</span>}</div><div className="mt-8 text-3xl font-semibold">{price}<span className={`text-xs font-normal ${featured ? 'text-slate-400' : 'text-slate-500'}`}>{price === 'Custom' ? '' : ' / month'}</span></div><p className={`mt-2 text-xs ${featured ? 'text-slate-400' : 'text-slate-500'}`}>{desc}</p><div className="mt-7 space-y-3">{features.map(f=><div key={f} className="flex items-center gap-2 text-xs"><Check className={`h-3.5 w-3.5 ${featured ? 'text-[#D59A62]' : 'text-[#B87333]'}`} />{f}</div>)}</div></div>; }
function Field({ label, value, onChange, type='text', required=false }: { label:string; value:string; onChange:(v:string)=>void; type?:string; required?:boolean }) { return <label className="block text-xs font-semibold text-slate-700">{label}<input type={type} required={required} value={value} onChange={e=>onChange(e.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 font-normal outline-none transition focus:border-[#B87333]" /></label>; }

export default LandingPage;
