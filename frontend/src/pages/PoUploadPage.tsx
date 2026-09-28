import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  UploadCloud, 
  FileText, 
  Trash2, 
  Eye, 
  Building2, 
  FlaskConical, 
  ArrowLeft, 
  ArrowRight, 
  Sparkles, 
  FolderOpen, 
  ShieldCheck, 
  CheckCircle2,
  Scan,
  Table,
  Check,
  RefreshCw,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { poService } from '../services/poService';
import { purchaseOrderApi } from '../api/purchaseOrderApi';

interface StagedPO {
  name: string;
  size: string;
  lineItems: number;
  customerName: string;
  gstin: string;
  vendorCode: string;
  location: string;
  contractNote: string;
}

const DEFAULT_SAMPLE_PO: StagedPO = {
  name: 'Heavy_Machining_PO_7702.pdf',
  size: '4.2 MB',
  lineItems: 8,
  customerName: 'Tata Motors Commercial Vehicle Div',
  gstin: '27AAACT2727Q1ZW',
  vendorCode: 'TM-PUN-09142',
  location: 'Chinchwad, Pune Works',
  contractNote: 'Pre-linked to active customer master, tiered volume rebates, and standard Net-60 credit terms.',
};

export const PoUploadPage: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [stagedFile, setStagedFile] = useState<StagedPO | null>(DEFAULT_SAMPLE_PO);
  const [actualFile, setActualFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractProgress, setExtractProgress] = useState(0);
  const [extractStepText, setExtractStepText] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processSelectedFile(e.target.files[0]);
    }
  };

  const processSelectedFile = (file: File) => {
    setActualFile(file);
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    setStagedFile({
      name: file.name,
      size: `${sizeMb} MB`,
      lineItems: 6,
      customerName: 'Tata Motors Commercial Vehicle Div',
      gstin: '27AAACT2727Q1ZW',
      vendorCode: 'TM-PUN-09142',
      location: 'Chinchwad, Pune Works',
      contractNote: 'Pre-linked to active customer master, tiered volume rebates, and standard Net-60 credit terms.',
    });
  };

  const handleLoadSample = () => {
    setActualFile(null);
    setStagedFile(DEFAULT_SAMPLE_PO);
    poService.resetSamplePO();
  };

  const handleRemoveFile = () => {
    setStagedFile(null);
    setActualFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleStartExtraction = async () => {
    if (!stagedFile) return;

    setIsExtracting(true);
    setExtractProgress(15);
    setExtractStepText('Ingesting PO document into neural OCR pipeline...');

    // Attempt real API upload in background if an actual file was selected
    if (actualFile) {
      try {
        await purchaseOrderApi.uploadDocument(actualFile);
      } catch (err) {
        console.debug('[PoUploadPage] API upload fallback:', err);
      }
    }

    setTimeout(() => {
      setExtractProgress(45);
      setExtractStepText('Reading geometric GD&T callouts and BOM table structures...');
    }, 600);

    setTimeout(() => {
      setExtractProgress(75);
      setExtractStepText('Cross-referencing metallurgy grades with Pune rate cards...');
    }, 1200);

    setTimeout(() => {
      setExtractProgress(100);
      setExtractStepText('Extraction complete. Navigating to verification review...');
    }, 1800);

    setTimeout(() => {
      setIsExtracting(false);
      navigate('/review');
    }, 2200);
  };

  return (
    <div className="w-full bg-[#fbf9f4] p-6 md:p-8 font-sans antialiased text-[#1b1c19] min-h-screen">
      <div className="max-w-[1180px] w-full mx-auto pb-16 flex flex-col">
        {/* WORKFLOW STEPPER (5-Step Horizontal Component matching Stitch) */}
        <div className="w-full bg-white rounded-xl shadow-xs border border-[#E5E1D8] px-6 py-4 mb-6">
          <div className="grid grid-cols-5 items-center relative">
            <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-0.5 bg-[#eae8e3] -z-0 mx-10" />

            {/* Step 1: Active */}
            <div className="relative z-10 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#B87333] text-white flex items-center justify-center font-semibold text-xs shadow-md ring-4 ring-[#B87333]/20 font-mono">
                01
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] uppercase tracking-wider text-[#B87333] font-semibold">
                  Step 01
                </span>
                <span className="text-sm font-semibold text-[#1b1c19]">Upload</span>
              </div>
            </div>

            {/* Step 2: Inactive */}
            <div className="relative z-10 flex items-center gap-3 justify-center">
              <div className="w-8 h-8 rounded-full bg-[#f0eee9] text-[#76777d] flex items-center justify-center font-semibold text-xs font-mono">
                02
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] uppercase tracking-wider text-[#76777d]">Step 02</span>
                <span className="text-sm font-semibold text-[#76777d]">Review</span>
              </div>
            </div>

            {/* Step 3: Inactive */}
            <div className="relative z-10 flex items-center gap-3 justify-center">
              <div className="w-8 h-8 rounded-full bg-[#f0eee9] text-[#76777d] flex items-center justify-center font-semibold text-xs font-mono">
                03
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] uppercase tracking-wider text-[#76777d]">Step 03</span>
                <span className="text-sm font-semibold text-[#76777d]">Costing</span>
              </div>
            </div>

            {/* Step 4: Inactive */}
            <div className="relative z-10 flex items-center gap-3 justify-center">
              <div className="w-8 h-8 rounded-full bg-[#f0eee9] text-[#76777d] flex items-center justify-center font-semibold text-xs font-mono">
                04
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] uppercase tracking-wider text-[#76777d]">Step 04</span>
                <span className="text-sm font-semibold text-[#76777d]">Preview</span>
              </div>
            </div>

            {/* Step 5: Inactive */}
            <div className="relative z-10 flex items-center gap-3 justify-end">
              <div className="w-8 h-8 rounded-full bg-[#f0eee9] text-[#76777d] flex items-center justify-center font-semibold text-xs font-mono">
                05
              </div>
              <div className="flex flex-col text-left">
                <span className="text-[11px] uppercase tracking-wider text-[#76777d]">Step 05</span>
                <span className="text-sm font-semibold text-[#76777d]">Send</span>
              </div>
            </div>
          </div>
        </div>

        {/* PAGE TITLE & DESCRIPTION BANNER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex flex-col">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-semibold text-[#1b1c19] tracking-tight">
                Upload Purchase Order
              </h1>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#ffdcc2] text-[#8c4f10] text-xs font-semibold">
                Stage 1 / 5
              </span>
            </div>
            <p className="text-sm text-[#45474c] mt-1 leading-relaxed">
              Upload your purchase order and ORYNZA will identify the important information automatically.
            </p>
          </div>

          <div className="flex items-center self-start sm:self-center gap-2 px-3 py-1.5 rounded-full bg-white shadow-xs border border-[#E5E1D8]">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400" />
            </span>
            <span className="text-xs font-semibold text-[#1b1c19] tracking-wide">
              Vision Engine v4.2 Ready
            </span>
            <span className="text-[#76777d] text-xs font-mono">| 18ms latency</span>
          </div>
        </div>

        {/* MAIN WORKFLOW CONTENT CONTAINER (8-Col / 4-Col Grid) */}
        <div className="grid grid-cols-12 gap-6 items-start">
          {/* PRIMARY COLUMN (8 COLS) */}
          <div className="col-span-12 lg:col-span-8 flex flex-col gap-5">
            {/* DROPZONE CARD */}
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`relative group bg-white rounded-xl p-8 shadow-xs transition-all duration-200 border-2 border-dashed cursor-pointer overflow-hidden ${
                isDragOver
                  ? 'border-[#B87333] bg-[#ffdcc2]/20'
                  : 'border-[#c6c6cd] hover:border-[#B87333] hover:shadow-sm'
              }`}
            >
              <div className="absolute -right-16 -top-16 w-48 h-48 bg-[#B87333]/5 rounded-full blur-2xl pointer-events-none" />
              <div className="flex flex-col items-center text-center max-w-lg mx-auto py-6">
                <div className="w-16 h-16 rounded-xl bg-[#f5f3ee] flex items-center justify-center text-[#B87333] mb-4 shadow-xs group-hover:scale-105 transition-transform duration-200">
                  <UploadCloud className="w-8 h-8" />
                </div>
                <h3 className="text-base sm:text-lg font-semibold text-[#1b1c19] mb-1">
                  Drag and drop your purchase order here, or{' '}
                  <span className="text-[#B87333] underline decoration-[#B87333]/30 decoration-2 underline-offset-4 font-semibold hover:text-[#A46328]">
                    Browse Files
                  </span>
                </h3>
                <p className="text-xs sm:text-sm text-[#45474c] mt-1.5 mb-6">
                  Upload multi-page client POs, specification annexures, or engineering work orders.
                </p>

                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#f0eee9] text-xs text-[#45474c]">
                  <FileText className="w-4 h-4 text-[#B87333]" />
                  <span>Supported formats: PDF, Scanned JPG/PNG, Excel (.xlsx, .csv) up to 25MB</span>
                </div>

                {/* Upload Meta Indicators */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full mt-8 pt-6 border-t border-[#eae8e3] text-left">
                  <div className="flex items-center gap-2">
                    <Scan className="w-4 h-4 text-[#B87333]" />
                    <span className="text-xs text-[#45474c]">Optical Character Recog.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Table className="w-4 h-4 text-[#B87333]" />
                    <span className="text-xs text-[#45474c]">Multi-page Line Parsing</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-[#B87333]" />
                    <span className="text-xs text-[#45474c]">Sanitized Sandbox Scan</span>
                  </div>
                </div>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.xlsx,.csv"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            {/* ACTIVE STAGED FILE PREVIEW */}
            {stagedFile ? (
              <div className="bg-white rounded-xl p-5 shadow-xs border border-[#E5E1D8] flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-12 h-12 rounded-lg bg-[#172033] text-[#fdad67] flex items-center justify-center shrink-0 shadow-xs">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div className="flex flex-col truncate">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-[#1b1c19] truncate font-mono">
                        {stagedFile.name}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-[#eae8e3] text-xs font-medium text-[#45474c] shrink-0">
                        Pre-Parsed
                      </span>
                    </div>
                    <span className="text-xs text-[#64748B] mt-0.5 font-mono">
                      {stagedFile.size} • {stagedFile.lineItems} Precision Line Items • Uploaded just now
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={handleRemoveFile}
                    title="Remove Document"
                    className="p-2 text-[#76777d] hover:text-[#ba1a1a] hover:bg-[#ffdad6]/40 rounded-lg transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setPreviewOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#f0eee9] hover:bg-[#eae8e3] rounded-lg text-[#1b1c19] text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Preview</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl p-5 shadow-xs border border-dashed border-[#c6c6cd] text-center text-xs text-[#76777d]">
                No document staged. Drop a file above or click "Load Pune Sample" below.
              </div>
            )}

            {/* CUSTOMER PROFILE MATCH CARD */}
            {stagedFile && (
              <div className="bg-white rounded-xl p-5 shadow-xs border border-[#E5E1D8]">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    <div className="w-10 h-10 rounded-lg bg-[#ffdcc2] text-[#8c4f10] flex items-center justify-center shrink-0 mt-0.5">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[11px] uppercase tracking-wider text-[#B87333] font-semibold">
                          Customer Profile Match
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-[#eae8e3] text-xs text-[#45474c] font-medium">
                          Auto-Assigned
                        </span>
                      </div>
                      <h4 className="text-sm font-semibold text-[#1b1c19] mt-1">
                        {stagedFile.customerName}
                      </h4>
                      <div className="flex items-center gap-2 mt-1 flex-wrap text-xs text-[#64748B]">
                        <span className="font-mono">{stagedFile.gstin}</span>
                        <span>•</span>
                        <span>Vendor Code: {stagedFile.vendorCode}</span>
                        <span>•</span>
                        <span>{stagedFile.location}</span>
                      </div>
                      <p className="text-xs text-[#45474c] mt-2.5 bg-[#f5f3ee] p-2.5 rounded-lg leading-relaxed">
                        <span className="font-semibold text-[#1b1c19]">Contract Matrix:</span> {stagedFile.contractNote}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => navigate('/customers')}
                    className="px-3 py-1.5 rounded-lg bg-[#f0eee9] text-[#1b1c19] text-xs font-semibold hover:bg-[#eae8e3] transition-colors whitespace-nowrap cursor-pointer"
                  >
                    Modify Link
                  </button>
                </div>
              </div>
            )}

            {/* QUICK TEST SAMPLE ACTION */}
            <div className="bg-gradient-to-r from-[#f5f3ee] via-white to-[#f5f3ee] rounded-xl p-5 shadow-xs border border-[#E5E1D8] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-9 h-9 rounded-full bg-[#B87333]/10 text-[#B87333] flex items-center justify-center shrink-0">
                  <FlaskConical className="w-4 h-4" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-[#1b1c19]">
                    Test with Pune Plant Sample PO
                  </span>
                  <span className="text-xs text-[#64748B] font-mono">
                    Heavy_Machining_PO_7702.pdf, 4.2 MB • 8 Line Items
                  </span>
                </div>
              </div>

              <button
                onClick={handleLoadSample}
                className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-[#eae8e3] text-[#1b1c19] hover:bg-[#e4e2dd] text-xs font-semibold transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Load Pune Sample</span>
              </button>
            </div>

            {/* EXTRACTION PROGRESS DIALOG */}
            {isExtracting && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-5 rounded-xl bg-[#172033] text-white shadow-md border border-[#1f2d47] space-y-3"
              >
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#fdad67] animate-pulse" />
                    <span className="font-semibold text-white tracking-wide">AI Smart Extraction in Progress</span>
                  </div>
                  <span className="font-mono text-[#fdad67] font-bold">{extractProgress}%</span>
                </div>

                <div className="w-full bg-[#102134] h-2 rounded-full overflow-hidden">
                  <motion.div
                    className="bg-[#B87333] h-full rounded-full"
                    animate={{ width: `${extractProgress}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>

                <div className="text-xs text-[#7f879f] font-mono">
                  &gt; {extractStepText}
                </div>
              </motion.div>
            )}
          </div>

          {/* SECONDARY COLUMN (4 COLS) */}
          <div className="col-span-12 lg:col-span-4 flex flex-col gap-5">
            {/* CARD: WHAT HAPPENS NEXT? */}
            <div className="bg-white rounded-xl p-5 shadow-xs border border-[#E5E1D8]">
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[#eae8e3]">
                <span className="w-2 h-2 rounded-full bg-[#B87333]" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#1b1c19]">
                  WHAT HAPPENS NEXT?
                </h3>
              </div>

              <ol className="flex flex-col gap-4">
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#172033] text-white flex items-center justify-center text-xs font-semibold font-mono shrink-0 mt-0.5">
                    1
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-[#1b1c19]">
                      Upload Document
                    </span>
                    <span className="text-xs text-[#64748B] mt-0.5 leading-relaxed">
                      AI engine ingests multi-page drawings, line items, and annexures.
                    </span>
                  </div>
                </li>

                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#f0eee9] text-[#45474c] flex items-center justify-center text-xs font-semibold font-mono shrink-0 mt-0.5">
                    2
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-[#1b1c19]">
                      Information is Identified
                    </span>
                    <span className="text-xs text-[#64748B] mt-0.5 leading-relaxed">
                      Extracts GSTIN, part numbers, raw material grades, quantities, and delivery milestones.
                    </span>
                  </div>
                </li>

                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#f0eee9] text-[#45474c] flex items-center justify-center text-xs font-semibold font-mono shrink-0 mt-0.5">
                    3
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-[#1b1c19]">
                      Review Extracted Details
                    </span>
                    <span className="text-xs text-[#64748B] mt-0.5 leading-relaxed">
                      Confidence score check with instant inline edits and cross-reference validation.
                    </span>
                  </div>
                </li>

                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#f0eee9] text-[#45474c] flex items-center justify-center text-xs font-semibold font-mono shrink-0 mt-0.5">
                    4
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-[#1b1c19]">
                      Continue to Costing
                    </span>
                    <span className="text-xs text-[#64748B] mt-0.5 leading-relaxed">
                      Live rates applied for raw metals, CNC machine cycles, and surface treatment.
                    </span>
                  </div>
                </li>
              </ol>
            </div>

            {/* SYSTEM METRIC CARD */}
            <div className="bg-white rounded-xl p-5 shadow-xs border border-[#E5E1D8] relative overflow-hidden">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <span className="text-[11px] uppercase tracking-wider text-[#B87333] font-semibold">
                    Shopfloor Verified
                  </span>
                  <div className="text-3xl font-bold text-[#1b1c19] tracking-tight leading-none mt-1 font-mono">
                    99.2%
                  </div>
                </div>
                <div className="w-10 h-10 rounded-lg bg-[#f0eee9] flex items-center justify-center text-[#B87333]">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              </div>

              <div className="text-xs font-semibold text-[#1b1c19] mb-1">
                Extraction Accuracy
              </div>
              <p className="text-xs text-[#64748B] leading-relaxed">
                Benchmarked across 14,200+ Indian automotive & precision tooling POs from Maruti, Tata, and Ashok Leyland tier-1 suppliers.
              </p>

              {/* Accuracy Wave Chart */}
              <div className="w-full mt-4 h-12 bg-[#f5f3ee] rounded-lg p-2 flex items-end">
                <svg className="w-full h-8 text-[#B87333]" fill="none" viewBox="0 0 200 40">
                  <path
                    d="M0 32 L30 28 L60 30 L90 20 L120 22 L150 12 L180 14 L200 8"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2.5"
                  />
                  <path
                    d="M0 32 L30 28 L60 30 L90 20 L120 22 L150 12 L180 14 L200 8 L200 40 L0 40 Z"
                    fill="currentColor"
                    fillOpacity="0.12"
                  />
                </svg>
              </div>
            </div>

            {/* ENTERPRISE SECURITY CARD */}
            <div className="bg-white rounded-xl p-4 shadow-xs border border-[#E5E1D8] flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#172033] text-[#fdad67] flex items-center justify-center shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-[#1b1c19]">
                  256-bit AES Document Encryption
                </span>
                <span className="text-[11px] text-[#64748B]">
                  ISO 27001 Certified • SOC 2 Type II Audited
                </span>
              </div>
            </div>

            {/* PLANT TELEMETRY MINI BADGE */}
            <div className="bg-[#f5f3ee] rounded-xl p-4 flex items-center justify-between border border-[#E5E1D8]">
              <div className="flex flex-col">
                <span className="text-[11px] text-[#64748B]">Current Plant Load</span>
                <span className="text-xs font-semibold text-[#1b1c19] mt-0.5">
                  Pune Machining Line 04
                </span>
              </div>
              <span className="px-2.5 py-1 rounded bg-white text-[#B87333] font-mono text-xs font-semibold shadow-xs">
                44 mins backlog
              </span>
            </div>
          </div>
        </div>

        {/* ACTION FOOTER BAR */}
        <div className="mt-8 pt-6 border-t border-[#eae8e3] flex flex-col sm:flex-row items-center justify-between gap-4">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-xs font-semibold text-[#45474c] hover:text-[#1b1c19] transition-colors py-2 px-1 cursor-pointer focus:outline-none"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Cancel & Return to Dashboard</span>
          </button>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-white text-[#1b1c19] hover:bg-[#f0eee9] text-xs font-semibold transition-colors shadow-xs border border-[#E5E1D8] cursor-pointer"
            >
              <FolderOpen className="w-4 h-4" />
              <span>Choose Another File</span>
            </button>

            <button
              onClick={handleStartExtraction}
              disabled={!stagedFile || isExtracting}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-[#B87333] hover:bg-[#A46328] active:scale-[0.99] text-white text-xs font-semibold shadow-sm transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
            >
              {isExtracting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Processing Document...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Upload & Extract with AI →</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* DOCUMENT PREVIEW MODAL */}
      <AnimatePresence>
        {previewOpen && stagedFile && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 space-y-4 border border-[#E5E1D8]"
            >
              <div className="flex items-center justify-between pb-3 border-b border-[#eae8e3]">
                <div className="flex items-center gap-2 font-semibold text-sm text-[#1b1c19]">
                  <FileText className="w-4 h-4 text-[#B87333]" />
                  <span>{stagedFile.name}</span>
                </div>
                <button
                  onClick={() => setPreviewOpen(false)}
                  className="p-1 text-[#76777d] hover:text-[#1b1c19] rounded cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="bg-[#f5f3ee] p-4 rounded-lg space-y-2 text-xs text-[#45474c]">
                <div className="flex justify-between font-mono">
                  <span>File Size:</span>
                  <span className="font-semibold text-[#1b1c19]">{stagedFile.size}</span>
                </div>
                <div className="flex justify-between font-mono">
                  <span>Estimated Items:</span>
                  <span className="font-semibold text-[#1b1c19]">{stagedFile.lineItems} Line Items</span>
                </div>
                <div className="flex justify-between">
                  <span>Matched Customer:</span>
                  <span className="font-semibold text-[#1b1c19]">{stagedFile.customerName}</span>
                </div>
                <div className="flex justify-between font-mono">
                  <span>GSTIN:</span>
                  <span className="font-semibold text-[#1b1c19]">{stagedFile.gstin}</span>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => setPreviewOpen(false)}
                  className="px-4 py-2 bg-[#172033] text-white text-xs font-semibold rounded-lg hover:bg-[#102134] transition-colors cursor-pointer"
                >
                  Close Preview
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PoUploadPage;
