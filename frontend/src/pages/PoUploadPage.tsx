import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FileUp, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Terminal, 
  Clock, 
  ArrowRight, 
  Sparkles,
  RefreshCw,
  FolderOpen,
  FileCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { WorkflowStepper } from '../components/layout/WorkflowStepper';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { poService } from '../services/poService';

interface TelemetryEntry {
  id: string;
  time: string;
  type: 'info' | 'success' | 'warn';
  message: string;
  confidence?: number;
}

export const PoUploadPage: React.FC = () => {
  const navigate = useNavigate();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stageText, setStageText] = useState('Idle');
  const [telemetry, setTelemetry] = useState<TelemetryEntry[]>([]);
  const [isComplete, setIsComplete] = useState(false);

  const startExtractionSimulation = (fileName: string = 'Mahindra_Agro_PO_441.pdf') => {
    setIsProcessing(true);
    setProgress(10);
    setStageText('Uploading PO document...');
    setTelemetry([
      { id: '1', time: '00:00:050', type: 'info', message: `Received document: ${fileName} (248 KB)` }
    ]);
    poService.resetSamplePO();

    // Stage 1: Read doc
    setTimeout(() => {
      setProgress(30);
      setStageText('Reading document layout & layers...');
      setTelemetry(prev => [
        ...prev,
        { id: '2', time: '00:00:240', type: 'info', message: 'Detecting tabular structures, 2 pages discovered' },
        { id: '3', time: '00:00:390', type: 'success', message: 'OCR Engine initialized with manufacturing domain model v4.2' }
      ]);
    }, 600);

    // Stage 2: Extract metadata
    setTimeout(() => {
      setProgress(60);
      setStageText('Extracting customer & PO header information...');
      setTelemetry(prev => [
        ...prev,
        { id: '4', time: '00:00:620', type: 'success', message: 'Identified Customer: Mahindra Precision Agro Pvt Ltd', confidence: 99.2 },
        { id: '5', time: '00:00:780', type: 'success', message: 'Customer GSTIN: 27AAAPM8891C1Z4 (Validated: Maharashtra)', confidence: 99.8 },
        { id: '6', time: '00:00:910', type: 'info', message: 'PO Number: PO-2026-441 | Due Date: 30 Sep 2026' }
      ]);
    }, 1300);

    // Stage 3: Extract BOQ
    setTimeout(() => {
      setProgress(85);
      setStageText('Identifying line items & material requirements...');
      setTelemetry(prev => [
        ...prev,
        { id: '7', time: '00:01:120', type: 'success', message: 'Line 01: Pump Casing (CI Grade 2, 10 Nos) matched to Cast Iron rate card', confidence: 97.4 },
        { id: '8', time: '00:01:290', type: 'success', message: 'Line 02: Shaft (EN8 Steel Alloy, 5 Nos) matched to Turning workstation', confidence: 98.1 },
        { id: '9', time: '00:01:450', type: 'warn', message: 'Line 03: Cover Plate (MS IS 2062, 20 Nos) — Ambiguous tensile grade detected' }
      ]);
    }, 2000);

    // Stage 4: Ready
    setTimeout(() => {
      setProgress(100);
      setStageText('Ready for manufacturer verification!');
      setTelemetry(prev => [
        ...prev,
        { id: '10', time: '00:01:680', type: 'success', message: 'Deterministic rate matching ready. 1 item flagged for operator sign-off.' }
      ]);
      setIsProcessing(false);
      setIsComplete(true);
    }, 2700);
  };

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setSelectedFile(file);
      startExtractionSimulation(file.name);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      startExtractionSimulation(file.name);
    }
  };

  return (
    <div className="min-h-full flex flex-col bg-[#f8fafc]">
      {/* 6-Step Workflow Stepper: Step 1 & 2 Active */}
      <WorkflowStepper currentStep={isComplete ? 2 : 1} />

      <div className="p-4 md:p-8 max-w-6xl mx-auto w-full space-y-6 flex-1">
        {/* Title Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                Stage 1 & 2 • Document Ingestion
              </span>
            </div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
              Customer Purchase Order Upload & AI Extraction
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Upload customer POs (PDF, scanned image, or DOCX). AI extracts structured line items for deterministic pricing.
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => startExtractionSimulation('Mahindra_Agro_PO_441.pdf')}
            icon={<Sparkles className="w-3.5 h-3.5 text-blue-600" />}
          >
            Quick Load Sample PO (Mahindra Agro)
          </Button>
        </div>

        {/* 2-Column Upload Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: DropZone & Progress (7 Cols) */}
          <div className="lg:col-span-7 space-y-4">
            {/* Interactive DropZone */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleFileDrop}
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-all bg-white relative overflow-hidden ${
                isProcessing 
                  ? 'border-blue-400 bg-blue-50/20' 
                  : isComplete 
                  ? 'border-emerald-400 bg-emerald-50/20'
                  : 'border-slate-300 hover:border-blue-500 hover:bg-slate-50/50'
              }`}
            >
              <input
                type="file"
                id="po-file-input"
                accept=".pdf,.jpg,.jpeg,.png,.docx"
                onChange={handleFileSelect}
                className="hidden"
              />

              <div className="max-w-md mx-auto space-y-3">
                <div className="w-14 h-14 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center mx-auto text-slate-600">
                  {isComplete ? (
                    <FileCheck className="w-7 h-7 text-emerald-600" />
                  ) : isProcessing ? (
                    <RefreshCw className="w-7 h-7 text-blue-600 animate-spin" />
                  ) : (
                    <FileUp className="w-7 h-7 text-slate-500" />
                  )}
                </div>

                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {isComplete
                      ? 'Extraction Complete & Verified'
                      : isProcessing
                      ? stageText
                      : 'Drag and drop customer PO here'}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Supports Engineering RFQs, Scanned POs, PDF, JPG, PNG & DOCX (up to 25 MB)
                  </p>
                </div>

                {!isProcessing && !isComplete && (
                  <div className="pt-2 flex items-center justify-center gap-3">
                    <label
                      htmlFor="po-file-input"
                      className="bg-black hover:bg-slate-900 text-white text-xs font-medium px-4 py-2 rounded cursor-pointer transition-colors shadow-sm"
                    >
                      Browse Local Files
                    </label>
                    <button
                      onClick={() => startExtractionSimulation('Mahindra_Agro_PO_441.pdf')}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-medium px-4 py-2 rounded transition-colors border border-slate-300 cursor-pointer"
                    >
                      Use Demo PO-2026-441
                    </button>
                  </div>
                )}

                {/* Progress Bar during extraction */}
                {isProcessing && (
                  <div className="pt-4 space-y-2">
                    <div className="flex justify-between text-xs font-mono text-slate-600">
                      <span>{stageText}</span>
                      <span className="font-bold text-blue-600">{progress}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-blue-600"
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                  </div>
                )}

                {/* Complete Action Banner */}
                {isComplete && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="pt-4 flex items-center justify-center gap-3"
                  >
                    <Button
                      variant="primary"
                      size="md"
                      onClick={() => navigate('/review/po-441')}
                      icon={<ArrowRight className="w-4 h-4" />}
                      iconPosition="right"
                    >
                      Proceed to Verification (Screen 3)
                    </Button>
                    <Button
                      variant="outline"
                      size="md"
                      onClick={() => {
                        setIsComplete(false);
                        setIsProcessing(false);
                        setTelemetry([]);
                      }}
                    >
                      Re-upload
                    </Button>
                  </motion.div>
                )}
              </div>
            </div>

            {/* Live Terminal Telemetry Console */}
            <div className="bg-slate-950 text-slate-300 rounded-xl p-4 font-mono text-xs shadow-md border border-slate-800">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-[11px] text-slate-400">
                <div className="flex items-center gap-2">
                  <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-slate-200 font-semibold">OCR EXTRACTION TELEMETRY STREAM</span>
                </div>
                <span>Engine: Manufacturing-v4.2</span>
              </div>

              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {telemetry.length === 0 ? (
                  <div className="text-slate-600 py-6 text-center italic">
                    Waiting for PO file to initialize extraction stream...
                  </div>
                ) : (
                  telemetry.map(log => (
                    <motion.div
                      key={log.id}
                      initial={{ opacity: 0, x: -4 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-start gap-2 text-[11px] leading-relaxed"
                    >
                      <span className="text-slate-500 shrink-0">[{log.time}]</span>
                      <span className={
                        log.type === 'success' ? 'text-emerald-400 font-semibold' :
                        log.type === 'warn' ? 'text-amber-400 font-semibold' : 'text-blue-400'
                      }>
                        {log.type.toUpperCase()}
                      </span>
                      <span className="text-slate-300 flex-1">{log.message}</span>
                      {log.confidence && (
                        <span className="text-[10px] text-emerald-400 bg-emerald-950/60 px-1 rounded border border-emerald-800">
                          {log.confidence}%
                        </span>
                      )}
                    </motion.div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Right: Recent Ingestion Feed & Rate Schedule (5 Cols) */}
          <div className="lg:col-span-5 space-y-4">
            {/* Active Rate Schedule Anchor */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Target Rate Schedule
                </span>
                <Badge variant="success" size="sm" dot>FY 2025-Q1 Active</Badge>
              </div>
              <div className="text-xs text-slate-600 space-y-1.5">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span>Cast Iron (CI FG 260)</span>
                  <span className="font-mono font-semibold text-slate-900">₹95.00 /kg</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span>Mild Steel (IS 2062 Grade)</span>
                  <span className="font-mono font-semibold text-slate-900">₹68.00 /kg</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span>Steel EN8 Alloy Hardened</span>
                  <span className="font-mono font-semibold text-slate-900">₹110.00 /kg</span>
                </div>
                <div className="flex justify-between py-1">
                  <span>Standard Factory Overhead</span>
                  <span className="font-mono font-semibold text-blue-700">12.0%</span>
                </div>
              </div>
            </div>

            {/* Recent Uploaded Customer POs */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Recent Ingested Orders
                </h3>
                <span className="text-[10px] text-slate-400 font-mono">Today</span>
              </div>

              <div className="space-y-2.5">
                <div 
                  onClick={() => navigate('/review/po-441')}
                  className="p-2.5 rounded-lg border border-amber-200 bg-amber-50/40 hover:bg-amber-50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-900">PO-2026-441</span>
                    <Badge variant="warning" size="sm" dot>Needs Review</Badge>
                  </div>
                  <div className="text-[11px] text-slate-600 mt-0.5">Mahindra Precision Agro Pvt Ltd</div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1 font-mono">
                    <span>3 Line Items</span>
                    <span className="text-amber-700 font-semibold">Review Grade →</span>
                  </div>
                </div>

                <div 
                  onClick={() => navigate('/calculation/qt-088')}
                  className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-900">PD-2026-8902</span>
                    <Badge variant="info" size="sm">Ready to Cost</Badge>
                  </div>
                  <div className="text-[11px] text-slate-600 mt-0.5">Tata Motors Commercial</div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1 font-mono">
                    <span>5 Line Items</span>
                    <span>₹4,18,500</span>
                  </div>
                </div>

                <div 
                  onClick={() => navigate('/quotation/qt-087')}
                  className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-900">LT-PO-9912</span>
                    <Badge variant="slate" size="sm">Dispatched</Badge>
                  </div>
                  <div className="text-[11px] text-slate-600 mt-0.5">Larsen & Toubro Heavy</div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1 font-mono">
                    <span>12 Line Items</span>
                    <span>₹18,40,000</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
