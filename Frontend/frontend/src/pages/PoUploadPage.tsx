import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  UploadCloud, 
  FileText, 
  Trash2, 
  Eye, 
  ArrowLeft, 
  Sparkles, 
  FolderOpen, 
  ShieldCheck, 
  Scan, 
  Table, 
  RefreshCw, 
  X 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { purchaseOrderApi } from '../api/purchaseOrderApi';

interface StagedPO {
  name: string;
  size: string;
}

export const PoUploadPage: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [stagedFile, setStagedFile] = useState<StagedPO | null>(null);
  const [actualFile, setActualFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractProgress, setExtractProgress] = useState(0);
  const [extractStepText, setExtractStepText] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

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
    setUploadError(null);
    setActualFile(file);
    const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
    setStagedFile({
      name: file.name,
      size: `${sizeMb} MB`,
    });
  };

  const handleRemoveFile = () => {
    setStagedFile(null);
    setActualFile(null);
    setUploadError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleStartExtraction = async () => {
    if (!stagedFile || !actualFile) {
      setUploadError('Please select or drop a valid Purchase Order file (PDF or image).');
      return;
    }

    setIsExtracting(true);
    setUploadError(null);
    setExtractProgress(15);
    setExtractStepText('Ingesting PO document into neural OCR pipeline...');

    const timer1 = setTimeout(() => {
      setExtractProgress(45);
      setExtractStepText('Reading GD&T callouts and BOM table structures...');
    }, 500);

    const timer2 = setTimeout(() => {
      setExtractProgress(75);
      setExtractStepText('Extracting customer, line items, and delivery terms...');
    }, 1100);

    try {
      const res = await purchaseOrderApi.uploadDocument(actualFile);
      clearTimeout(timer1);
      clearTimeout(timer2);
      setExtractProgress(100);
      setExtractStepText('Extraction complete. Navigating to verification review...');

      setTimeout(() => {
        setIsExtracting(false);
        const poId = res.purchase_order_id || res.purchase_order?.id;
        if (poId) {
          navigate(`/review/${poId}`);
        } else {
          navigate('/review');
        }
      }, 600);
    } catch (err: any) {
      clearTimeout(timer1);
      clearTimeout(timer2);
      setIsExtracting(false);
      const msg = err.response?.data?.detail || err.message || 'PO extraction failed. Check document format or API connectivity.';
      setUploadError(msg);
    }
  };

  return (
    <div className="w-full bg-[#f8fafc] p-6 md:p-8 font-sans antialiased text-slate-900 min-h-screen">
      <div className="max-w-[1180px] w-full mx-auto pb-16 flex flex-col">
        {/* WORKFLOW STEPPER */}
        <div className="w-full bg-white rounded-xl shadow-xs border border-slate-200 px-6 py-4 mb-6">
          <div className="grid grid-cols-5 items-center relative">
            <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-0.5 bg-slate-100 -z-0 mx-10" />

            {/* Step 1: Active */}
            <div className="relative z-10 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#2563EB] text-white flex items-center justify-center font-semibold text-xs shadow-xs font-mono">
                01
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] uppercase tracking-wider text-[#2563EB] font-bold">
                  Step 01
                </span>
                <span className="text-sm font-semibold text-slate-900">Upload</span>
              </div>
            </div>

            {/* Step 2: Inactive */}
            <div className="relative z-10 flex items-center gap-3 justify-center">
              <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center font-semibold text-xs font-mono">
                02
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Step 02</span>
                <span className="text-sm font-medium text-slate-400">Review</span>
              </div>
            </div>

            {/* Step 3: Inactive */}
            <div className="relative z-10 flex items-center gap-3 justify-center">
              <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center font-semibold text-xs font-mono">
                03
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Step 03</span>
                <span className="text-sm font-medium text-slate-400">Costing</span>
              </div>
            </div>

            {/* Step 4: Inactive */}
            <div className="relative z-10 flex items-center gap-3 justify-center">
              <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center font-semibold text-xs font-mono">
                04
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Step 04</span>
                <span className="text-sm font-medium text-slate-400">Draft</span>
              </div>
            </div>

            {/* Step 5: Inactive */}
            <div className="relative z-10 flex items-center gap-3 justify-end">
              <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center font-semibold text-xs font-mono">
                05
              </div>
              <div className="flex flex-col text-left">
                <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Step 05</span>
                <span className="text-sm font-medium text-slate-400">Finalize</span>
              </div>
            </div>
          </div>
        </div>

        {/* PAGE TITLE & DESCRIPTION BANNER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex flex-col">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                Upload Purchase Order
              </h1>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 text-[#2563EB] text-xs font-semibold border border-blue-200">
                Step 1 of 5
              </span>
            </div>
            <p className="text-sm text-slate-600 mt-1 leading-relaxed">
              Upload customer purchase order documents (PDF or image). Quotation AI will extract parts, quantities, and commercial terms.
            </p>
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
                  ? 'border-[#2563EB] bg-blue-50/30'
                  : 'border-slate-300 hover:border-[#2563EB] hover:shadow-sm'
              }`}
            >
              <div className="flex flex-col items-center text-center max-w-lg mx-auto py-6">
                <div className="w-16 h-16 rounded-xl bg-blue-50 flex items-center justify-center text-[#2563EB] mb-4 shadow-xs group-hover:scale-105 transition-transform duration-200">
                  <UploadCloud className="w-8 h-8" />
                </div>
                <h3 className="text-base sm:text-lg font-semibold text-slate-900 mb-1">
                  Drag and drop your purchase order here, or{' '}
                  <span className="text-[#2563EB] underline decoration-[#2563EB]/30 decoration-2 underline-offset-4 font-semibold hover:text-[#1D4ED8]">
                    Browse Files
                  </span>
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 mt-1.5 mb-6">
                  Upload customer PO documents, drawing annexures, or engineering work orders.
                </p>

                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 text-xs text-slate-600">
                  <FileText className="w-4 h-4 text-[#2563EB]" />
                  <span>Supported formats: PDF, PNG, JPG, JPEG up to 25MB</span>
                </div>

                {/* Upload Meta Indicators */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full mt-8 pt-6 border-t border-slate-100 text-left">
                  <div className="flex items-center gap-2">
                    <Scan className="w-4 h-4 text-[#2563EB]" />
                    <span className="text-xs text-slate-600">Document OCR &amp; Vision Extraction</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Table className="w-4 h-4 text-[#2563EB]" />
                    <span className="text-xs text-slate-600">Multi-page Line Item Parsing</span>
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
              <div className="bg-white rounded-xl p-5 shadow-xs border border-slate-200 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-12 h-12 rounded-lg bg-[#0f172a] text-[#2563EB] flex items-center justify-center shrink-0 shadow-xs">
                    <FileText className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex flex-col truncate">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-900 truncate font-mono">
                        {stagedFile.name}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-blue-50 text-xs font-semibold text-[#2563EB] shrink-0 border border-blue-200">
                        Ready for Extraction
                      </span>
                    </div>
                    <span className="text-xs text-slate-500 mt-0.5 font-mono">
                      {stagedFile.size} • Selected file
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={handleRemoveFile}
                    title="Remove Document"
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setPreviewOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-800 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Details</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl p-5 shadow-xs border border-dashed border-slate-300 text-center text-xs text-slate-500">
                No document staged. Drag and drop a Purchase Order file (PDF, PNG, JPG) above or click Browse to select.
              </div>
            )}

            {/* ERROR DISPLAY */}
            {uploadError && (
              <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 flex items-center justify-between">
                <span>{uploadError}</span>
                <button
                  onClick={() => setUploadError(null)}
                  className="font-semibold text-red-600 hover:underline cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* EXTRACTION PROGRESS DIALOG */}
            {isExtracting && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-5 rounded-xl bg-[#0f172a] text-white shadow-md border border-slate-800 space-y-3"
              >
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-blue-400 animate-pulse" />
                    <span className="font-semibold text-white tracking-wide">AI Extraction in Progress</span>
                  </div>
                  <span className="font-mono text-blue-400 font-bold">{extractProgress}%</span>
                </div>

                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <motion.div
                    className="bg-[#2563EB] h-full rounded-full"
                    animate={{ width: `${extractProgress}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>

                <div className="text-xs text-slate-400 font-mono">
                  &gt; {extractStepText}
                </div>
              </motion.div>
            )}
          </div>

          {/* SECONDARY COLUMN (4 COLS) */}
          <div className="col-span-12 lg:col-span-4 flex flex-col gap-5">
            {/* CARD: WHAT HAPPENS NEXT? */}
            <div className="bg-white rounded-xl p-5 shadow-xs border border-slate-200">
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
                <span className="w-2 h-2 rounded-full bg-[#2563EB]" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  WHAT HAPPENS NEXT?
                </h3>
              </div>

              <ol className="flex flex-col gap-4">
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#0f172a] text-white flex items-center justify-center text-xs font-semibold font-mono shrink-0 mt-0.5">
                    1
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-slate-900">
                      Upload Document
                    </span>
                    <span className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                      AI engine ingests drawings, specifications, and purchase order files.
                    </span>
                  </div>
                </li>

                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-xs font-semibold font-mono shrink-0 mt-0.5">
                    2
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-slate-900">
                      AI Extraction
                    </span>
                    <span className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                      Identifies customer, PO number, line items, materials, processes, and quantities.
                    </span>
                  </div>
                </li>

                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-xs font-semibold font-mono shrink-0 mt-0.5">
                    3
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-slate-900">
                      Review &amp; Confirm
                    </span>
                    <span className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                      Verify extracted customer details and line items before costing.
                    </span>
                  </div>
                </li>

                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-xs font-semibold font-mono shrink-0 mt-0.5">
                    4
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-slate-900">
                      Rate Binding &amp; Calculation
                    </span>
                    <span className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                      Rates applied for raw materials, machining, setup, overhead, and GST.
                    </span>
                  </div>
                </li>

                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-xs font-semibold font-mono shrink-0 mt-0.5">
                    5
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-slate-900">
                      Quotation Draft &amp; Finalize
                    </span>
                    <span className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                      Generate PDF dossier, lock final version, and dispatch to customer.
                    </span>
                  </div>
                </li>
              </ol>
            </div>

            {/* ENTERPRISE SECURITY CARD */}
            <div className="bg-white rounded-xl p-4 shadow-xs border border-slate-200 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#0f172a] text-blue-400 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-slate-900">
                  256-bit AES Document Encryption
                </span>
                <span className="text-[11px] text-slate-500">
                  Tenant-isolated secure storage
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ACTION FOOTER BAR */}
        <div className="mt-8 pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors py-2 px-1 cursor-pointer focus:outline-none"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Cancel &amp; Return to Dashboard</span>
          </button>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-white text-slate-800 hover:bg-slate-50 text-xs font-semibold transition-colors shadow-xs border border-slate-200 cursor-pointer"
            >
              <FolderOpen className="w-4 h-4" />
              <span>Choose Another File</span>
            </button>

            <button
              onClick={handleStartExtraction}
              disabled={!stagedFile || isExtracting}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] active:scale-[0.99] text-white text-xs font-semibold shadow-sm transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
            >
              {isExtracting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Processing Document...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Begin AI Extraction →</span>
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
              className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4 border border-slate-200"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2 font-semibold text-sm text-slate-900">
                  <FileText className="w-4 h-4 text-[#2563EB]" />
                  <span className="truncate">{stagedFile.name}</span>
                </div>
                <button
                  onClick={() => setPreviewOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="bg-slate-50 p-4 rounded-lg space-y-2 text-xs text-slate-600">
                <div className="flex justify-between font-mono">
                  <span>File Name:</span>
                  <span className="font-semibold text-slate-900 truncate max-w-[220px]">{stagedFile.name}</span>
                </div>
                <div className="flex justify-between font-mono">
                  <span>File Size:</span>
                  <span className="font-semibold text-slate-900">{stagedFile.size}</span>
                </div>
                <div className="flex justify-between">
                  <span>Status:</span>
                  <span className="font-semibold text-[#2563EB]">Ready for AI Extraction</span>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => setPreviewOpen(false)}
                  className="px-4 py-2 bg-[#0f172a] text-white text-xs font-semibold rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Close
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
