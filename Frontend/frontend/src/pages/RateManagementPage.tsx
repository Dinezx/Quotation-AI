import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  RefreshCw, 
  CheckCircle2, 
  Edit3, 
  Sliders, 
  Layers, 
  Cpu, 
  AlertCircle, 
  Search, 
  ShieldCheck, 
  RotateCcw, 
  Trash2,
  TrendingUp,
  Percent,
  Check,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { MetricCard } from '../components/ui/MetricCard';
import { Modal } from '../components/ui/Modal';
import { useRates } from '../hooks/useRates';
import { MaterialRate, ProcessRate } from '../types/rates';
import { MaterialCreateDTO, ProcessCreateDTO, PricingRulesDTO } from '../api/ratesApi';

const RATE_BASIS_OPTIONS = [
  'Per Hour',
  'Per Minute',
  'Per Piece',
  'Per KG',
  'Per Meter',
  'Per Litre',
  'Per Batch',
  'Per Operation',
  'Fixed',
  'Percentage',
] as const;

const COMMON_COST_COMPONENTS = [
  { name: 'Machining', defaultBasis: 'Per Hour', defaultUnit: 'hour' },
  { name: 'Labour', defaultBasis: 'Per Hour', defaultUnit: 'hour' },
  { name: 'Assembly', defaultBasis: 'Per Piece', defaultUnit: 'piece' },
  { name: 'Cutting', defaultBasis: 'Per Meter', defaultUnit: 'meter' },
  { name: 'Welding', defaultBasis: 'Per Hour', defaultUnit: 'hour' },
  { name: 'Stitching', defaultBasis: 'Per Piece', defaultUnit: 'piece' },
  { name: 'Finishing', defaultBasis: 'Per Piece', defaultUnit: 'piece' },
  { name: 'Packaging', defaultBasis: 'Per Piece', defaultUnit: 'piece' },
  { name: 'Inspection', defaultBasis: 'Per Piece', defaultUnit: 'piece' },
  { name: 'Testing', defaultBasis: 'Per Batch', defaultUnit: 'batch' },
  { name: 'Tooling', defaultBasis: 'Fixed', defaultUnit: 'lot' },
  { name: 'Utilities', defaultBasis: 'Per Hour', defaultUnit: 'hour' },
  { name: 'Transport', defaultBasis: 'Fixed', defaultUnit: 'trip' },
  { name: 'Other', defaultBasis: 'Per Piece', defaultUnit: 'unit' },
] as const;

const getSuggestedUnitForBasis = (basis: string): string => {
  switch (basis.toLowerCase()) {
    case 'per hour':
      return 'hour';
    case 'per minute':
      return 'minute';
    case 'per piece':
      return 'piece';
    case 'per kg':
      return 'kg';
    case 'per meter':
      return 'meter';
    case 'per litre':
      return 'litre';
    case 'per batch':
      return 'batch';
    case 'per operation':
      return 'op';
    case 'percentage':
      return '%';
    case 'fixed':
      return 'job';
    default:
      return 'unit';
  }
};

export const RateManagementPage: React.FC = () => {
  const {
    materials,
    processes,
    pricingRules,
    isLoading,
    createMaterial,
    updateMaterial,
    deleteMaterial,
    reactivateMaterial,
    createProcess,
    updateProcess,
    deleteProcess,
    reactivateProcess,
    updatePricingRules,
    refetch,
  } = useRates(true);

  // Tab State
  const [activeTab, setActiveTab] = useState<'materials' | 'cost-components' | 'pricing-rules'>('materials');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  // Search & Filter State
  const [materialSearch, setMaterialSearch] = useState('');
  const [materialStatusFilter, setMaterialStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [processSearch, setProcessSearch] = useState('');
  const [processStatusFilter, setProcessStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  // Modals State
  const [addMaterialOpen, setAddMaterialOpen] = useState(false);
  const [editMaterialModal, setEditMaterialModal] = useState<MaterialRate | null>(null);
  const [addProcessOpen, setAddProcessOpen] = useState(false);
  const [editProcessModal, setEditProcessModal] = useState<ProcessRate | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<{
    type: 'material' | 'process';
    id: string;
    name: string;
  } | null>(null);
  const [isDeactivating, setIsDeactivating] = useState(false);

  // Material Form State
  const [matGrade, setMatGrade] = useState('');
  const [matName, setMatName] = useState('');
  const [matDensity, setMatDensity] = useState('7.85');
  const [matBaseRate, setMatBaseRate] = useState('');
  const [matScrapCredit, setMatScrapCredit] = useState('0.00');
  const [matUnit, setMatUnit] = useState('kg');
  const [isSubmittingMat, setIsSubmittingMat] = useState(false);

  // Cost Component Form State
  const [procName, setProcName] = useState('');
  const [procRateBasis, setProcRateBasis] = useState<string>('Per Hour');
  const [procUnit, setProcUnit] = useState('hour');
  const [procRate, setProcRate] = useState('');
  const [procSetupCost, setProcSetupCost] = useState('0.00');
  const [isSubmittingProc, setIsSubmittingProc] = useState(false);

  // Pricing Rules Form State
  const isRulesConfigured = Boolean(
    pricingRules?.is_configured &&
    pricingRules.overhead_percentage !== null &&
    pricingRules.profit_percentage !== null
  );

  const [overheadPct, setOverheadPct] = useState<string>('');
  const [profitPct, setProfitPct] = useState<string>('');
  const [gstType, setGstType] = useState<string>('CGST_SGST');
  const [defaultGstRate, setDefaultGstRate] = useState<string>('18.0');
  const [roundingMethod, setRoundingMethod] = useState<string>('ROUND_HALF_UP');
  const [isSavingRules, setIsSavingRules] = useState(false);
  const [isEditingRules, setIsEditingRules] = useState(false);

  // Sync pricing rules when loaded from authoritative company settings
  useEffect(() => {
    if (pricingRules && pricingRules.is_configured) {
      if (pricingRules.overhead_percentage !== null && pricingRules.overhead_percentage !== undefined) {
        setOverheadPct(String(pricingRules.overhead_percentage));
      }
      if (pricingRules.profit_percentage !== null && pricingRules.profit_percentage !== undefined) {
        setProfitPct(String(pricingRules.profit_percentage));
      }
      if (pricingRules.gst_type) {
        setGstType(pricingRules.gst_type);
      }
      if (pricingRules.default_gst_rate !== null && pricingRules.default_gst_rate !== undefined) {
        setDefaultGstRate(String(pricingRules.default_gst_rate));
      }
      if (pricingRules.rounding_method) {
        setRoundingMethod(pricingRules.rounding_method);
      }
    }
  }, [pricingRules]);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToastMessage(msg);
    setToastType(type);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // ---------------- Handlers: Material ----------------
  const handleOpenAddMaterial = () => {
    setMatGrade('');
    setMatName('');
    setMatDensity('7.85');
    setMatBaseRate('');
    setMatScrapCredit('0.00');
    setMatUnit('kg');
    setAddMaterialOpen(true);
  };

  const handleCreateMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanGrade = matGrade.trim();
    const cleanName = matName.trim();
    if (!cleanGrade || !cleanName || !matBaseRate) {
      showToast('Please fill in Grade, Material Name, and Base Rate.', 'error');
      return;
    }

    const gradeExists = materials.some(
      (m) => (m.grade || m.gradeAndSpec || '').trim().toLowerCase() === cleanGrade.toLowerCase()
    );
    if (gradeExists) {
      showToast(`Material grade '${cleanGrade}' already exists in your master.`, 'error');
      return;
    }

    const baseRateNum = parseFloat(matBaseRate);
    const scrapCreditNum = parseFloat(matScrapCredit || '0');
    const densityNum = matDensity ? parseFloat(matDensity) : 7.85;

    if (isNaN(baseRateNum) || baseRateNum < 0) {
      showToast('Base Rate cannot be negative and must be a valid number.', 'error');
      return;
    }
    if (isNaN(scrapCreditNum) || scrapCreditNum < 0) {
      showToast('Scrap Credit cannot be negative and must be a valid number.', 'error');
      return;
    }
    if (isNaN(densityNum) || densityNum <= 0) {
      showToast('Density must be a valid positive number.', 'error');
      return;
    }

    setIsSubmittingMat(true);
    try {
      const payload: MaterialCreateDTO = {
        grade: cleanGrade,
        name: cleanName,
        base_rate: baseRateNum,
        scrap_credit_rate: scrapCreditNum,
        density: densityNum,
        unit: matUnit.trim() || 'kg',
        is_active: true,
      };
      await createMaterial(payload);
      setAddMaterialOpen(false);
      showToast(`Material grade '${cleanGrade}' added to master.`);
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || 'Failed to add material';
      showToast(msg, 'error');
    } finally {
      setIsSubmittingMat(false);
    }
  };

  const promptDeactivate = (type: 'material' | 'process', id: string, name: string) => {
    setDeactivateTarget({ type, id, name });
  };

  const confirmDeactivation = async () => {
    if (!deactivateTarget) return;
    setIsDeactivating(true);
    try {
      if (deactivateTarget.type === 'material') {
        await deleteMaterial(deactivateTarget.id);
        showToast(`Deactivated material '${deactivateTarget.name}'.`);
      } else {
        await deleteProcess(deactivateTarget.id);
        showToast(`Deactivated cost component '${deactivateTarget.name}'.`);
      }
      setDeactivateTarget(null);
      if (editMaterialModal && editMaterialModal.id === deactivateTarget.id) {
        setEditMaterialModal(null);
      }
      if (editProcessModal && editProcessModal.id === deactivateTarget.id) {
        setEditProcessModal(null);
      }
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || 'Deactivation failed';
      showToast(msg, 'error');
    } finally {
      setIsDeactivating(false);
    }
  };

  const handleUpdateMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editMaterialModal) return;
    const gradeClean = (editMaterialModal.grade || editMaterialModal.gradeAndSpec || '').trim();
    const nameClean = (editMaterialModal.name || editMaterialModal.gradeAndSpec || '').trim();
    if (!gradeClean || !nameClean) {
      showToast('Grade and Material Name cannot be empty.', 'error');
      return;
    }

    const gradeCollision = materials.some(
      (m) => m.id !== editMaterialModal.id && (m.grade || m.gradeAndSpec || '').trim().toLowerCase() === gradeClean.toLowerCase()
    );
    if (gradeCollision) {
      showToast(`Another material with grade '${gradeClean}' already exists.`, 'error');
      return;
    }

    const baseRateNum = Number(editMaterialModal.baseRatePerKg);
    const scrapCreditNum = Number(editMaterialModal.scrapCreditPerKg);
    const densityNum = editMaterialModal.densityGPerCm3 !== undefined ? Number(editMaterialModal.densityGPerCm3) : 7.85;

    if (isNaN(baseRateNum) || baseRateNum < 0) {
      showToast('Base Rate cannot be negative and must be a valid number.', 'error');
      return;
    }
    if (isNaN(scrapCreditNum) || scrapCreditNum < 0) {
      showToast('Scrap Credit cannot be negative and must be a valid number.', 'error');
      return;
    }
    if (isNaN(densityNum) || densityNum <= 0) {
      showToast('Density must be a valid positive number.', 'error');
      return;
    }

    setIsSubmittingMat(true);
    try {
      await updateMaterial({
        id: editMaterialModal.id,
        data: {
          name: nameClean,
          grade: gradeClean,
          base_rate: baseRateNum,
          scrap_credit_rate: scrapCreditNum,
          density: densityNum,
          unit: editMaterialModal.unit || 'kg',
          is_active: editMaterialModal.is_active,
        },
      });
      setEditMaterialModal(null);
      showToast(`Updated material '${gradeClean}'.`);
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || 'Failed to update material';
      showToast(msg, 'error');
    } finally {
      setIsSubmittingMat(false);
    }
  };

  const handleToggleMaterialStatus = async (m: MaterialRate) => {
    if (m.is_active) {
      promptDeactivate('material', m.id, m.name || m.gradeAndSpec);
    } else {
      try {
        await reactivateMaterial(m.id);
        showToast(`Reactivated material '${m.gradeAndSpec}'.`);
      } catch (err: any) {
        const msg = err.response?.data?.detail || err.message || 'Action failed';
        showToast(msg, 'error');
      }
    }
  };

  // ---------------- Handlers: Cost Component ----------------
  const handleOpenAddProcess = () => {
    setProcName('');
    setProcRateBasis('Per Hour');
    setProcUnit('hour');
    setProcRate('');
    setProcSetupCost('0.00');
    setAddProcessOpen(true);
  };

  const handleSelectSuggestedComponent = (c: typeof COMMON_COST_COMPONENTS[number]) => {
    setProcName(c.name);
    setProcRateBasis(c.defaultBasis);
    setProcUnit(c.defaultUnit);
  };

  const handleRateBasisChange = (newBasis: string) => {
    setProcRateBasis(newBasis);
    setProcUnit(getSuggestedUnitForBasis(newBasis));
  };

  const handleCreateProcess = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanProcName = procName.trim();
    if (!cleanProcName || !procRate) {
      showToast('Please enter Component Name and Rate.', 'error');
      return;
    }

    const procExists = processes.some(
      (p) => p.workstationName.trim().toLowerCase() === cleanProcName.toLowerCase()
    );
    if (procExists) {
      showToast(`Cost component '${cleanProcName}' already exists in your master.`, 'error');
      return;
    }

    const rateNum = parseFloat(procRate);
    const setupNum = parseFloat(procSetupCost || '0');

    if (isNaN(rateNum) || rateNum < 0) {
      showToast('Rate cannot be negative and must be a valid number.', 'error');
      return;
    }
    if (isNaN(setupNum) || setupNum < 0) {
      showToast('Setup Cost cannot be negative and must be a valid number.', 'error');
      return;
    }

    setIsSubmittingProc(true);
    try {
      const payload: ProcessCreateDTO = {
        name: cleanProcName,
        rate_basis: procRateBasis,
        rate: rateNum,
        hourly_rate: rateNum,
        unit: procUnit.trim() || getSuggestedUnitForBasis(procRateBasis),
        setup_cost: setupNum,
        is_active: true,
      };
      await createProcess(payload);
      setAddProcessOpen(false);
      showToast(`Cost component '${cleanProcName}' added to master.`);
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || 'Failed to add cost component';
      showToast(msg, 'error');
    } finally {
      setIsSubmittingProc(false);
    }
  };

  const handleUpdateProcess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editProcessModal) return;
    const nameClean = (editProcessModal.workstationName || '').trim();
    if (!nameClean) {
      showToast('Component Name cannot be empty.', 'error');
      return;
    }

    const nameCollision = processes.some(
      (p) => p.id !== editProcessModal.id && p.workstationName.trim().toLowerCase() === nameClean.toLowerCase()
    );
    if (nameCollision) {
      showToast(`Another component with name '${nameClean}' already exists.`, 'error');
      return;
    }

    const rateNum = Number(editProcessModal.rate ?? editProcessModal.hourlyRate);
    const setupNum = Number(editProcessModal.setupCost || 0);

    if (isNaN(rateNum) || rateNum < 0) {
      showToast('Rate cannot be negative and must be a valid number.', 'error');
      return;
    }
    if (isNaN(setupNum) || setupNum < 0) {
      showToast('Setup Cost cannot be negative and must be a valid number.', 'error');
      return;
    }

    setIsSubmittingProc(true);
    try {
      await updateProcess({
        id: editProcessModal.id,
        data: {
          name: nameClean,
          rate_basis: editProcessModal.rate_basis || 'Per Hour',
          rate: rateNum,
          hourly_rate: rateNum,
          unit: editProcessModal.unit || getSuggestedUnitForBasis(editProcessModal.rate_basis || 'Per Hour'),
          setup_cost: setupNum,
          is_active: editProcessModal.is_active,
        },
      });
      setEditProcessModal(null);
      showToast(`Updated cost component '${nameClean}'.`);
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || 'Failed to update cost component';
      showToast(msg, 'error');
    } finally {
      setIsSubmittingProc(false);
    }
  };

  const handleToggleProcessStatus = async (p: ProcessRate) => {
    if (p.is_active) {
      promptDeactivate('process', p.id, p.workstationName);
    } else {
      try {
        await reactivateProcess(p.id);
        showToast(`Reactivated cost component '${p.workstationName}'.`);
      } catch (err: any) {
        const msg = err.response?.data?.detail || err.message || 'Action failed';
        showToast(msg, 'error');
      }
    }
  };

  // ---------------- Handlers: Pricing Rules ----------------
  const handleSavePricingRules = async (e: React.FormEvent) => {
    e.preventDefault();
    const ovNum = parseFloat(overheadPct);
    const prNum = parseFloat(profitPct);
    const gstNum = parseFloat(defaultGstRate);

    if (isNaN(ovNum) || ovNum < 0 || ovNum > 100) {
      showToast('Overhead percentage must be between 0% and 100%.', 'error');
      return;
    }
    if (isNaN(prNum) || prNum < 0 || prNum > 100) {
      showToast('Profit percentage must be between 0% and 100%.', 'error');
      return;
    }
    if (isNaN(gstNum) || gstNum < 0 || gstNum > 100) {
      showToast('GST rate must be between 0% and 100%.', 'error');
      return;
    }

    setIsSavingRules(true);
    try {
      const payload: PricingRulesDTO = {
        overhead_percentage: ovNum,
        profit_percentage: prNum,
        gst_type: gstType,
        default_gst_rate: gstNum,
        rounding_method: roundingMethod,
      };
      await updatePricingRules(payload);
      setIsEditingRules(false);
      showToast('Company pricing rules configured successfully!');
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || 'Failed to save pricing rules';
      showToast(msg, 'error');
    } finally {
      setIsSavingRules(false);
    }
  };

  // ---------------- Filtering ----------------
  const filteredMaterials = materials.filter(m => {
    const matchesSearch = 
      (m.gradeAndSpec || '').toLowerCase().includes(materialSearch.toLowerCase()) ||
      (m.name || '').toLowerCase().includes(materialSearch.toLowerCase()) ||
      (m.grade || '').toLowerCase().includes(materialSearch.toLowerCase());
    
    if (!matchesSearch) return false;
    if (materialStatusFilter === 'ACTIVE') return m.is_active === true;
    if (materialStatusFilter === 'INACTIVE') return m.is_active === false;
    return true;
  });

  const filteredProcesses = processes.filter(p => {
    const matchesSearch = 
      (p.workstationName || '').toLowerCase().includes(processSearch.toLowerCase()) ||
      (p.rate_basis || '').toLowerCase().includes(processSearch.toLowerCase());
    if (!matchesSearch) return false;
    if (processStatusFilter === 'ACTIVE') return p.is_active === true;
    if (processStatusFilter === 'INACTIVE') return p.is_active === false;
    return true;
  });

  // Simulator Calculation (Cascading commercial math)
  const currentOvPct = parseFloat(overheadPct) || 0;
  const currentPrPct = parseFloat(profitPct) || 0;
  const currentGstPct = gstType === 'EXEMPT' ? 0 : (parseFloat(defaultGstRate) || 0);

  const simSubtotal = 100000;
  const simOverhead = simSubtotal * (currentOvPct / 100);
  const simAssessable = simSubtotal + simOverhead;
  const simProfit = simAssessable * (currentPrPct / 100);
  const simTaxable = simAssessable + simProfit;
  const simGst = simTaxable * (currentGstPct / 100);
  const simRawTotal = simTaxable + simGst;
  const simGrandTotal = roundingMethod === 'ROUND_HALF_UP' ? Math.round(simRawTotal) : simRawTotal;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Toast Alert */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-16 right-8 z-50 text-white text-xs font-medium py-2.5 px-4 rounded-lg shadow-xl border flex items-center gap-2 ${
              toastType === 'error'
                ? 'bg-rose-950 border-rose-700'
                : 'bg-slate-950 border-slate-700'
            }`}
          >
            {toastType === 'error' ? (
              <AlertCircle className="w-4 h-4 text-rose-400" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            )}
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
              Rates & Pricing Master
            </h1>
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-blue-50 text-blue-800 border border-blue-200">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
              <span>Deterministic Pricing Master</span>
              <span className="bg-emerald-600 text-white text-[9px] px-1 rounded font-bold">
                NO AI PRICING
              </span>
            </div>
          </div>
          <p className="text-xs text-slate-500">
            Define raw materials, cost components, overheads, and statutory tax parameters for deterministic quotation calculations.
          </p>
        </div>

        {/* Top Actions */}
        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            icon={<RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />}
            onClick={() => {
              refetch();
              showToast('Refreshed rate cards and pricing rules from server.');
            }}
          >
            Refresh Rates
          </Button>
        </div>
      </div>

      {/* Metric Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Materials Master"
          value={materials.length > 0 ? `${materials.filter(m => m.is_active).length} Active` : '0 Active'}
          subtitle={materials.length > 0 ? `${materials.length} Total Materials` : 'No materials configured'}
          badge={materials.length > 0 ? <Badge variant="success" size="sm">Catalog Bound</Badge> : undefined}
          icon={<Layers className="w-4 h-4 text-emerald-600" />}
          footer={<span className="text-[11px] text-slate-500">Base & Scrap Rates</span>}
        />

        <MetricCard
          title="Cost Components"
          value={processes.length > 0 ? `${processes.filter(p => p.is_active).length} Active` : '0 Active'}
          subtitle={processes.length > 0 ? `${processes.length} Total Components` : 'No components configured'}
          icon={<Cpu className="w-4 h-4 text-blue-600" />}
          footer={<span className="text-[11px] text-slate-500">Multi-basis Cost Centers</span>}
        />

        <MetricCard
          title="Overhead & Pricing Rules"
          value={isRulesConfigured ? `${parseFloat(overheadPct).toFixed(1)}% Overhead` : 'Unconfigured'}
          subtitle={isRulesConfigured ? `${parseFloat(profitPct).toFixed(1)}% Profit Margin` : 'Not set for company'}
          badge={!isRulesConfigured ? <Badge variant="warning" size="sm">Action Required</Badge> : <Badge variant="success" size="sm">Configured</Badge>}
          icon={<Sliders className="w-4 h-4 text-amber-600" />}
          footer={
            <span className={`text-[11px] ${isRulesConfigured ? 'text-slate-500' : 'text-amber-600 font-medium'}`}>
              {isRulesConfigured ? 'Applied onto subtotal' : 'Configure in Pricing Rules'}
            </span>
          }
        />

        <MetricCard
          title="GST & Rounding"
          value={isRulesConfigured ? `${parseFloat(defaultGstRate).toFixed(1)}% (${gstType})` : 'Unconfigured'}
          subtitle={isRulesConfigured ? (roundingMethod === 'ROUND_HALF_UP' ? 'Round to Nearest ₹' : 'Exact 2 Decimals') : 'Statutory tax not configured'}
          badge={isRulesConfigured ? <Badge variant="info" size="sm">Statutory</Badge> : <Badge variant="warning" size="sm">Action Required</Badge>}
          icon={<Percent className="w-4 h-4 text-purple-600" />}
          footer={
            <span className={`text-[11px] ${isRulesConfigured ? 'text-slate-500' : 'text-amber-600 font-medium'}`}>
              {isRulesConfigured ? 'Cascades to Grand Total' : 'Configure in Pricing Rules'}
            </span>
          }
        />
      </div>

      {/* Main Container with 3 Tabs */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        {/* Navigation Tabs Strip */}
        <div className="border-b border-slate-200 px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/70">
          <div className="flex items-center gap-1 overflow-x-auto">
            <button
              onClick={() => setActiveTab('materials')}
              className={`py-3.5 px-4 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'materials'
                  ? 'border-blue-600 text-blue-700 bg-white shadow-2xs'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Materials</span>
              <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                activeTab === 'materials' ? 'bg-blue-100 text-blue-800' : 'bg-slate-200 text-slate-600'
              }`}>
                {materials.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('cost-components')}
              className={`py-3.5 px-4 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'cost-components'
                  ? 'border-blue-600 text-blue-700 bg-white shadow-2xs'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>Cost Components</span>
              <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                activeTab === 'cost-components' ? 'bg-blue-100 text-blue-800' : 'bg-slate-200 text-slate-600'
              }`}>
                {processes.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('pricing-rules')}
              className={`py-3.5 px-4 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'pricing-rules'
                  ? 'border-blue-600 text-blue-700 bg-white shadow-2xs'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Overhead & Pricing Rules</span>
              <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                isRulesConfigured
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-amber-100 text-amber-800 font-bold'
              }`}>
                {isRulesConfigured ? 'Active' : 'Unconfigured'}
              </span>
            </button>
          </div>

          <div className="flex items-center gap-2 py-2">
            {activeTab === 'materials' && (
              <Button
                variant="primary"
                size="sm"
                icon={<Plus className="w-3.5 h-3.5" />}
                onClick={handleOpenAddMaterial}
              >
                + Add Material
              </Button>
            )}
            {activeTab === 'cost-components' && (
              <Button
                variant="primary"
                size="sm"
                icon={<Plus className="w-3.5 h-3.5" />}
                onClick={handleOpenAddProcess}
              >
                + Add Cost Component
              </Button>
            )}
          </div>
        </div>

        {/* TAB 1: MATERIALS */}
        {activeTab === 'materials' && (
          <div>
            {materials.length === 0 ? (
              <div className="text-center py-16 px-4">
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
                  <Layers className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 mb-1">No material rates added yet</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mb-5">
                  Add raw materials and base rates to enable deterministic quotation calculations for your company.
                </p>
                <Button
                  variant="primary"
                  size="sm"
                  icon={<Plus className="w-3.5 h-3.5" />}
                  onClick={handleOpenAddMaterial}
                >
                  + Add Material
                </Button>
              </div>
            ) : (
              <>
                {/* Filter & Search Toolbar */}
                <div className="px-5 py-3 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs bg-white">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Search materials by name or grade..."
                      value={materialSearch}
                      onChange={(e) => setMaterialSearch(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-blue-500 bg-slate-50"
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 text-slate-500">
                      <span>Status:</span>
                      <select
                        value={materialStatusFilter}
                        onChange={(e) => setMaterialStatusFilter(e.target.value as any)}
                        className="px-2 py-1 bg-slate-50 border border-slate-200 rounded text-slate-800 font-medium focus:outline-none"
                      >
                        <option value="ALL">All Materials ({materials.length})</option>
                        <option value="ACTIVE">Active Only ({materials.filter(m => m.is_active).length})</option>
                        <option value="INACTIVE">Inactive Only ({materials.filter(m => !m.is_active).length})</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Materials Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold text-[10px] tracking-wider">
                        <th className="py-2.5 px-4">Material Name</th>
                        <th className="py-2.5 px-4">Grade</th>
                        <th className="py-2.5 px-4">Unit</th>
                        <th className="py-2.5 px-4">Base Rate</th>
                        <th className="py-2.5 px-4">Scrap Credit</th>
                        <th className="py-2.5 px-4">Net Material Rate</th>
                        <th className="py-2.5 px-4">Density</th>
                        <th className="py-2.5 px-4">Status</th>
                        <th className="py-2.5 px-4">Last Updated</th>
                        <th className="py-2.5 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {filteredMaterials.length === 0 ? (
                        <tr>
                          <td colSpan={10} className="py-8 text-center text-slate-400">
                            No materials found matching search criteria.
                          </td>
                        </tr>
                      ) : (
                        filteredMaterials.map((m) => {
                          const netCost = m.baseRatePerKg - m.scrapCreditPerKg;
                          const unitLabel = m.unit || 'kg';
                          return (
                            <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-3 px-4">
                                <div className="font-bold text-slate-900">{m.name || m.gradeAndSpec}</div>
                                {m.subSpec && m.subSpec !== m.name && (
                                  <div className="text-[10px] text-slate-500 font-mono mt-0.5">{m.subSpec}</div>
                                )}
                              </td>
                              <td className="py-3 px-4">
                                <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                                  {m.grade || m.gradeAndSpec}
                                </span>
                              </td>
                              <td className="py-3 px-4 font-mono font-medium text-slate-700">
                                {unitLabel}
                              </td>
                              <td className="py-3 px-4 font-mono font-bold text-slate-900">
                                ₹{m.baseRatePerKg.toFixed(2)}/{unitLabel}
                              </td>
                              <td className="py-3 px-4 font-mono font-medium">
                                <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 inline-block font-semibold">
                                  ₹{m.scrapCreditPerKg.toFixed(2)}/{unitLabel}
                                </span>
                              </td>
                              <td className="py-3 px-4 font-mono font-bold text-blue-700">
                                ₹{Math.max(0, netCost).toFixed(2)}/{unitLabel}
                              </td>
                              <td className="py-3 px-4 font-mono text-slate-600">
                                {m.densityGPerCm3 ? `${m.densityGPerCm3.toFixed(2)} g/cm³` : '-'}
                              </td>
                              <td className="py-3 px-4">
                                <Badge variant={m.is_active ? 'success' : 'slate'} size="sm" dot>
                                  {m.is_active ? 'Active' : 'Inactive'}
                                </Badge>
                              </td>
                              <td className="py-3 px-4 text-slate-500 text-[11px] font-mono whitespace-nowrap">
                                {m.lastUpdated || '-'}
                              </td>
                              <td className="py-3 px-4 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    onClick={() => setEditMaterialModal({ ...m })}
                                    className="p-1 rounded hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                                    title="Edit Material"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleToggleMaterialStatus(m)}
                                    className={`p-1 rounded transition-colors cursor-pointer ${
                                      m.is_active
                                        ? 'hover:bg-rose-100 text-slate-400 hover:text-rose-600'
                                        : 'hover:bg-emerald-100 text-slate-400 hover:text-emerald-600'
                                    }`}
                                    title={m.is_active ? 'Deactivate Material' : 'Reactivate Material'}
                                  >
                                    {m.is_active ? (
                                      <Trash2 className="w-3.5 h-3.5" />
                                    ) : (
                                      <RotateCcw className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Materials Table Footer with Prominent Add Button */}
                <div className="px-5 py-3 bg-slate-50/80 border-t border-slate-200 flex items-center justify-between">
                  <span className="text-xs text-slate-500 font-medium">
                    Showing {filteredMaterials.length} of {materials.length} registered materials
                  </span>
                  <Button
                    variant="primary"
                    size="sm"
                    icon={<Plus className="w-3.5 h-3.5" />}
                    onClick={handleOpenAddMaterial}
                  >
                    + Add Material
                  </Button>
                </div>
              </>
            )}
          </div>
        )}

        {/* TAB 2: COST COMPONENTS */}
        {activeTab === 'cost-components' && (
          <div>
            {processes.length === 0 ? (
              <div className="text-center py-16 px-4">
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
                  <Cpu className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 mb-1">No process rates added yet</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mb-5">
                  Configure operations, labor, machining, packaging or custom cost components with flexible rate bases.
                </p>
                <Button
                  variant="primary"
                  size="sm"
                  icon={<Plus className="w-3.5 h-3.5" />}
                  onClick={handleOpenAddProcess}
                >
                  + Add Cost Component
                </Button>
              </div>
            ) : (
              <>
                {/* Filter & Search Toolbar */}
                <div className="px-5 py-3 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs bg-white">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Search cost components..."
                      value={processSearch}
                      onChange={(e) => setProcessSearch(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-blue-500 bg-slate-50"
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 text-slate-500">
                      <span>Status:</span>
                      <select
                        value={processStatusFilter}
                        onChange={(e) => setProcessStatusFilter(e.target.value as any)}
                        className="px-2 py-1 bg-slate-50 border border-slate-200 rounded text-slate-800 font-medium focus:outline-none"
                      >
                        <option value="ALL">All Components ({processes.length})</option>
                        <option value="ACTIVE">Active Only ({processes.filter(p => p.is_active).length})</option>
                        <option value="INACTIVE">Inactive Only ({processes.filter(p => !p.is_active).length})</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Processes Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold text-[10px] tracking-wider">
                        <th className="py-2.5 px-4">Component Name</th>
                        <th className="py-2.5 px-4">Rate Basis</th>
                        <th className="py-2.5 px-4">Rate</th>
                        <th className="py-2.5 px-4">Setup Cost</th>
                        <th className="py-2.5 px-4">Unit</th>
                        <th className="py-2.5 px-4">Status</th>
                        <th className="py-2.5 px-4">Last Updated</th>
                        <th className="py-2.5 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {filteredProcesses.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-8 text-center text-slate-400">
                            No cost components found matching search criteria.
                          </td>
                        </tr>
                      ) : (
                        filteredProcesses.map((p) => {
                          const displayRate = p.rate !== undefined && p.rate !== null ? p.rate : p.hourlyRate;
                          const basisLabel = p.rate_basis || 'Per Hour';
                          return (
                            <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-3 px-4">
                                <div className="font-bold text-slate-900">{p.workstationName}</div>
                                <div className="text-[10px] font-mono text-slate-400">{p.code}</div>
                              </td>
                              <td className="py-3 px-4">
                                <span className="font-medium text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 inline-block">
                                  {basisLabel}
                                </span>
                              </td>
                              <td className="py-3 px-4 font-mono font-bold text-slate-900">
                                ₹{displayRate.toFixed(2)} <span className="text-[10px] text-slate-400 font-normal">/{p.unit || 'unit'}</span>
                              </td>
                              <td className="py-3 px-4 font-mono text-slate-700">
                                {p.setupCost > 0 ? `₹${p.setupCost.toFixed(2)}` : '-'}
                              </td>
                              <td className="py-3 px-4 font-mono text-slate-600">
                                {p.unit || 'unit'}
                              </td>
                              <td className="py-3 px-4">
                                <Badge variant={p.is_active ? 'success' : 'slate'} size="sm" dot>
                                  {p.is_active ? 'Active' : 'Inactive'}
                                </Badge>
                              </td>
                              <td className="py-3 px-4 text-slate-500 text-[11px] font-mono whitespace-nowrap">
                                {p.lastUpdated || '-'}
                              </td>
                              <td className="py-3 px-4 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    onClick={() => setEditProcessModal({ ...p })}
                                    className="p-1 rounded hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                                    title="Edit Cost Component"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleToggleProcessStatus(p)}
                                    className={`p-1 rounded transition-colors cursor-pointer ${
                                      p.is_active
                                        ? 'hover:bg-rose-100 text-slate-400 hover:text-rose-600'
                                        : 'hover:bg-emerald-100 text-slate-400 hover:text-emerald-600'
                                    }`}
                                    title={p.is_active ? 'Deactivate Cost Component' : 'Reactivate Cost Component'}
                                  >
                                    {p.is_active ? (
                                      <Trash2 className="w-3.5 h-3.5" />
                                    ) : (
                                      <RotateCcw className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Processes Table Footer with Prominent Add Button */}
                <div className="px-5 py-3 bg-slate-50/80 border-t border-slate-200 flex items-center justify-between">
                  <span className="text-xs text-slate-500 font-medium">
                    Showing {filteredProcesses.length} of {processes.length} cost components
                  </span>
                  <Button
                    variant="primary"
                    size="sm"
                    icon={<Plus className="w-3.5 h-3.5" />}
                    onClick={handleOpenAddProcess}
                  >
                    + Add Cost Component
                  </Button>
                </div>
              </>
            )}
          </div>
        )}

        {/* TAB 3: PRICING RULES */}
        {activeTab === 'pricing-rules' && (
          <div className="p-6">
            {!isRulesConfigured && !isEditingRules ? (
              <div className="text-center py-16 px-4 border border-dashed border-slate-300 rounded-xl bg-slate-50/50 my-2">
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
                  <Sliders className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 mb-1">No pricing rules configured yet</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto mb-5">
                  Configure your company's overhead %, profit margin %, statutory GST classification, and rounding settings to enable quote calculation.
                </p>
                <Button
                  variant="primary"
                  size="sm"
                  icon={<Sliders className="w-3.5 h-3.5" />}
                  onClick={() => setIsEditingRules(true)}
                >
                  Configure Pricing Rules
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  {/* Form Controls (Left / 7 cols) */}
                  <form onSubmit={handleSavePricingRules} className="lg:col-span-7 space-y-5">
                    <div>
                      <h3 className="text-base font-bold text-slate-900">Overhead & Pricing Rules</h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Configure overhead %, profit %, GST rules, and rounding logic. These rules deterministically determine quote prices.
                      </p>
                    </div>

                    <div className="p-4 border border-slate-200 rounded-xl bg-slate-50/50 space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-800">
                          Factory Overhead (%) <span className="text-rose-500">*</span>
                        </label>
                        <span className="text-[11px] font-mono text-slate-400">0% – 100%</span>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Applied onto manufacturing subtotal (materials + cost components) to cover factory utilities, maintenance, and indirect expenses.
                      </p>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          placeholder="e.g. 10.0"
                          value={overheadPct}
                          onChange={(e) => setOverheadPct(e.target.value)}
                          required
                          className="w-32 px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono font-bold text-slate-900 bg-white focus:outline-blue-500"
                        />
                        <span className="text-xs font-mono font-semibold text-slate-500">%</span>
                      </div>
                    </div>

                    <div className="p-4 border border-slate-200 rounded-xl bg-slate-50/50 space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-800">
                          Commercial Profit Margin (%) <span className="text-rose-500">*</span>
                        </label>
                        <span className="text-[11px] font-mono text-slate-400">0% – 100%</span>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Commercial markup calculated on assessable cost (subtotal + overhead) before taxes.
                      </p>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          placeholder="e.g. 15.0"
                          value={profitPct}
                          onChange={(e) => setProfitPct(e.target.value)}
                          required
                          className="w-32 px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono font-bold text-slate-900 bg-white focus:outline-blue-500"
                        />
                        <span className="text-xs font-mono font-semibold text-slate-500">%</span>
                      </div>
                    </div>

                    <div className="p-4 border border-slate-200 rounded-xl bg-slate-50/50 space-y-3">
                      <label className="text-xs font-bold text-slate-800 block">
                        Statutory GST Configuration <span className="text-rose-500">*</span>
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                        <button
                          type="button"
                          onClick={() => setGstType('CGST_SGST')}
                          className={`p-3 rounded-lg border text-left cursor-pointer transition-all ${
                            gstType === 'CGST_SGST'
                              ? 'border-blue-600 bg-blue-50/70 text-blue-900 font-bold'
                              : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                          }`}
                        >
                          <div className="text-[11px] uppercase tracking-wider font-semibold">Intrastate</div>
                          <div className="text-xs mt-1">CGST + SGST (e.g. 9% + 9%)</div>
                        </button>

                        <button
                          type="button"
                          onClick={() => setGstType('IGST')}
                          className={`p-3 rounded-lg border text-left cursor-pointer transition-all ${
                            gstType === 'IGST'
                              ? 'border-blue-600 bg-blue-50/70 text-blue-900 font-bold'
                              : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                          }`}
                        >
                          <div className="text-[11px] uppercase tracking-wider font-semibold">Interstate</div>
                          <div className="text-xs mt-1">IGST (e.g. 18%)</div>
                        </button>

                        <button
                          type="button"
                          onClick={() => setGstType('EXEMPT')}
                          className={`p-3 rounded-lg border text-left cursor-pointer transition-all ${
                            gstType === 'EXEMPT'
                              ? 'border-blue-600 bg-blue-50/70 text-blue-900 font-bold'
                              : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                          }`}
                        >
                          <div className="text-[11px] uppercase tracking-wider font-semibold">Exempt / Export</div>
                          <div className="text-xs mt-1">GST (0%)</div>
                        </button>
                      </div>

                      <div className="pt-2 flex items-center gap-3 text-xs">
                        <span className="text-slate-600 font-medium">Default GST Rate:</span>
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          max="100"
                          value={defaultGstRate}
                          disabled={gstType === 'EXEMPT'}
                          onChange={(e) => setDefaultGstRate(e.target.value)}
                          className="w-24 px-2.5 py-1.5 border border-slate-300 rounded font-mono font-bold text-slate-900 bg-white focus:outline-blue-500 disabled:opacity-50"
                        />
                        <span className="text-slate-500 font-mono">%</span>
                      </div>
                    </div>

                    <div className="p-4 border border-slate-200 rounded-xl bg-slate-50/50 space-y-3">
                      <label className="text-xs font-bold text-slate-800 block">
                        Final Total Rounding Method
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <button
                          type="button"
                          onClick={() => setRoundingMethod('ROUND_HALF_UP')}
                          className={`p-3 rounded-lg border text-left cursor-pointer transition-all ${
                            roundingMethod === 'ROUND_HALF_UP'
                              ? 'border-blue-600 bg-blue-50/70 text-blue-900 font-bold'
                              : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                          }`}
                        >
                          <div className="font-semibold text-slate-900">Round to Nearest Rupee</div>
                          <div className="text-[11px] text-slate-500 mt-0.5">₹1,245.60 → ₹1,246.00 (ROUND_HALF_UP)</div>
                        </button>

                        <button
                          type="button"
                          onClick={() => setRoundingMethod('EXACT_2_DECIMALS')}
                          className={`p-3 rounded-lg border text-left cursor-pointer transition-all ${
                            roundingMethod === 'EXACT_2_DECIMALS'
                              ? 'border-blue-600 bg-blue-50/70 text-blue-900 font-bold'
                              : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                          }`}
                        >
                          <div className="font-semibold text-slate-900">Exact 2 Decimal Places</div>
                          <div className="text-[11px] text-slate-500 mt-0.5">Exact paise precision (e.g. ₹1,245.60)</div>
                        </button>
                      </div>
                    </div>

                    <div className="pt-2">
                      <Button
                        type="submit"
                        variant="primary"
                        size="md"
                        loading={isSavingRules}
                        icon={<Check className="w-4 h-4" />}
                      >
                        Save Pricing Rules
                      </Button>
                    </div>
                  </form>

                  {/* Simulation Card (Right / 5 cols) */}
                  <div className="lg:col-span-5 space-y-4">
                    <div className="border border-slate-200 rounded-xl bg-slate-900 text-white p-5 space-y-4 shadow-lg">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-emerald-400" />
                          <h4 className="text-xs font-bold tracking-tight uppercase text-slate-300">
                            Live Cascading Math Preview
                          </h4>
                        </div>
                        <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
                          Deterministic Engine
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-400">
                        Based on an illustrative ₹100,000 baseline manufacturing subtotal, your pricing rules cascade through:
                      </p>

                      <div className="space-y-2.5 text-xs font-mono">
                        <div className="flex justify-between text-slate-300">
                          <span>1. Manufacturing Subtotal:</span>
                          <span>₹{simSubtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                        </div>

                        <div className="flex justify-between text-amber-400">
                          <span>2. Overhead ({currentOvPct.toFixed(1)}%):</span>
                          <span>+₹{simOverhead.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                        </div>

                        <div className="flex justify-between font-bold text-slate-200 pt-1 border-t border-slate-800">
                          <span>Assessable Base:</span>
                          <span>₹{simAssessable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                        </div>

                        <div className="flex justify-between text-purple-400">
                          <span>3. Profit Margin ({currentPrPct.toFixed(1)}%):</span>
                          <span>+₹{simProfit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                        </div>

                        <div className="flex justify-between font-bold text-slate-200 pt-1 border-t border-slate-800">
                          <span>Taxable Commercial Base:</span>
                          <span>₹{simTaxable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                        </div>

                        <div className="flex justify-between text-blue-400">
                          <span>4. GST ({currentGstPct.toFixed(1)}% - {gstType}):</span>
                          <span>+₹{simGst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                        </div>

                        <div className="flex justify-between font-bold text-emerald-400 text-sm pt-2 border-t-2 border-slate-700">
                          <span>Grand Total ({roundingMethod === 'ROUND_HALF_UP' ? 'Rounded' : 'Exact'}):</span>
                          <span>₹{simGrandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                        </div>
                      </div>

                      <div className="pt-2 text-[10px] text-slate-400 border-t border-slate-800 flex items-center justify-between">
                        <span>Formula: Python Decimal Arithmetic</span>
                        <span>Zero AI Intervention</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ---------------- MODAL: ADD MATERIAL ---------------- */}
      <Modal
        isOpen={addMaterialOpen}
        onClose={() => setAddMaterialOpen(false)}
        title="Add Material to Price Master"
        description="Add a raw material and assign base and scrap recovery rates."
        maxWidth="md"
      >
        <form onSubmit={handleCreateMaterial} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Material Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Mild Steel Round Bar, Cotton Fabric 180 GSM, Cast Iron Casing"
              value={matName}
              onChange={(e) => setMatName(e.target.value)}
              required
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Material Grade <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. EN8, SS304, Grade-A"
                value={matGrade}
                onChange={(e) => setMatGrade(e.target.value)}
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-bold uppercase focus:outline-blue-500"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Unit of Measurement <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. kg, meter, piece, litre"
                value={matUnit}
                onChange={(e) => setMatUnit(e.target.value)}
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:outline-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Base Rate (₹/{matUnit || 'unit'}) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="320.00"
                value={matBaseRate}
                onChange={(e) => setMatBaseRate(e.target.value)}
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-bold focus:outline-blue-500"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Scrap Credit (₹/{matUnit || 'unit'})
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="110.00"
                value={matScrapCredit}
                onChange={(e) => setMatScrapCredit(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-bold focus:outline-blue-500"
              />
              <span className="text-[10px] text-slate-500 mt-0.5 block">
                Positive credit deducted from base rate for net cost
              </span>
            </div>
          </div>

          {/* Positive Scrap Credit Display */}
          <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-lg text-xs space-y-1">
            <div className="flex justify-between font-mono">
              <span className="text-slate-600">Base Rate:</span>
              <span className="font-bold text-slate-800">
                ₹{parseFloat(matBaseRate || '0').toFixed(2)}/{matUnit || 'unit'}
              </span>
            </div>
            <div className="flex justify-between font-mono">
              <span className="text-emerald-700">Scrap Credit:</span>
              <span className="font-semibold text-emerald-700">
                ₹{parseFloat(matScrapCredit || '0').toFixed(2)}/{matUnit || 'unit'}
              </span>
            </div>
            <div className="flex justify-between font-mono pt-1 border-t border-blue-200">
              <span className="font-bold text-blue-900">Net Material:</span>
              <span className="font-bold text-blue-900">
                ₹{Math.max(0, (parseFloat(matBaseRate || '0') - parseFloat(matScrapCredit || '0'))).toFixed(2)}/{matUnit || 'unit'}
              </span>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Density (g/cm³ - optional)
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              placeholder="7.85"
              value={matDensity}
              onChange={(e) => setMatDensity(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:outline-blue-500"
            />
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-slate-200">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setAddMaterialOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              loading={isSubmittingMat}
            >
              Save Material
            </Button>
          </div>
        </form>
      </Modal>

      {/* ---------------- MODAL: EDIT MATERIAL ---------------- */}
      <Modal
        isOpen={editMaterialModal !== null}
        onClose={() => setEditMaterialModal(null)}
        title={`Edit Material: ${editMaterialModal?.name || editMaterialModal?.gradeAndSpec || ''}`}
        description="Update raw material pricing and scrap rates in company catalog."
        maxWidth="md"
      >
        {editMaterialModal && (
          <form onSubmit={handleUpdateMaterial} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Material Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={editMaterialModal.name || editMaterialModal.gradeAndSpec}
                onChange={(e) =>
                  setEditMaterialModal({ ...editMaterialModal, name: e.target.value })
                }
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Material Grade <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={editMaterialModal.grade || editMaterialModal.gradeAndSpec}
                  onChange={(e) =>
                    setEditMaterialModal({
                      ...editMaterialModal,
                      grade: e.target.value,
                      gradeAndSpec: e.target.value,
                    })
                  }
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-bold uppercase focus:outline-blue-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Unit of Measurement
                </label>
                <input
                  type="text"
                  value={editMaterialModal.unit || 'kg'}
                  onChange={(e) =>
                    setEditMaterialModal({
                      ...editMaterialModal,
                      unit: e.target.value,
                    })
                  }
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:outline-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Base Rate (₹/{editMaterialModal.unit || 'unit'}) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={editMaterialModal.baseRatePerKg}
                  onChange={(e) =>
                    setEditMaterialModal({
                      ...editMaterialModal,
                      baseRatePerKg: parseFloat(e.target.value) || 0,
                    })
                  }
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-bold focus:outline-blue-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Scrap Credit (₹/{editMaterialModal.unit || 'unit'})
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={editMaterialModal.scrapCreditPerKg}
                  onChange={(e) =>
                    setEditMaterialModal({
                      ...editMaterialModal,
                      scrapCreditPerKg: parseFloat(e.target.value) || 0,
                    })
                  }
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-bold focus:outline-blue-500"
                />
              </div>
            </div>

            {/* Positive Scrap Credit Display */}
            <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-lg text-xs space-y-1">
              <div className="flex justify-between font-mono">
                <span className="text-slate-600">Base Rate:</span>
                <span className="font-bold text-slate-800">
                  ₹{Number(editMaterialModal.baseRatePerKg || 0).toFixed(2)}/{editMaterialModal.unit || 'unit'}
                </span>
              </div>
              <div className="flex justify-between font-mono">
                <span className="text-emerald-700">Scrap Credit:</span>
                <span className="font-semibold text-emerald-700">
                  ₹{Number(editMaterialModal.scrapCreditPerKg || 0).toFixed(2)}/{editMaterialModal.unit || 'unit'}
                </span>
              </div>
              <div className="flex justify-between font-mono pt-1 border-t border-blue-200">
                <span className="font-bold text-blue-900">Net Material:</span>
                <span className="font-bold text-blue-900">
                  ₹{Math.max(0, ((editMaterialModal.baseRatePerKg || 0) - (editMaterialModal.scrapCreditPerKg || 0))).toFixed(2)}/{editMaterialModal.unit || 'unit'}
                </span>
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Density (g/cm³)
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={editMaterialModal.densityGPerCm3 || 7.85}
                onChange={(e) =>
                  setEditMaterialModal({
                    ...editMaterialModal,
                    densityGPerCm3: parseFloat(e.target.value) || 7.85,
                  })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:outline-blue-500"
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <div>
                <span className="font-bold text-slate-800 block text-xs">Active Status</span>
                <span className="text-[11px] text-slate-500">Active materials are eligible for rate matching in new quotations.</span>
              </div>
              <input
                type="checkbox"
                checked={editMaterialModal.is_active !== false}
                onChange={(e) =>
                  setEditMaterialModal({
                    ...editMaterialModal,
                    is_active: e.target.checked,
                  })
                }
                className="w-4 h-4 text-blue-600 rounded cursor-pointer"
              />
            </div>

            <div className="pt-3 flex justify-end gap-2 border-t border-slate-200">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEditMaterialModal(null)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                loading={isSubmittingMat}
              >
                Update Material
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* ---------------- MODAL: ADD COST COMPONENT ---------------- */}
      <Modal
        isOpen={addProcessOpen}
        onClose={() => setAddProcessOpen(false)}
        title="Add Cost Component"
        description="Configure an operation, labor, machine or overhead cost component with a flexible rate basis."
        maxWidth="md"
      >
        <form onSubmit={handleCreateProcess} className="space-y-4 text-xs">
          {/* Quick Component Suggestions */}
          <div>
            <label className="block font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              <span>Suggested Components (click to select)</span>
            </label>
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1 bg-slate-50 rounded-lg border border-slate-200">
              {COMMON_COST_COMPONENTS.map((c) => (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => handleSelectSuggestedComponent(c)}
                  className={`px-2 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer border ${
                    procName.toLowerCase() === c.name.toLowerCase()
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Component Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. CNC Milling, Stitching, Heat Treatment, Final Inspection"
              value={procName}
              onChange={(e) => setProcName(e.target.value)}
              required
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-bold focus:outline-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Rate Basis <span className="text-rose-500">*</span>
              </label>
              <select
                value={procRateBasis}
                onChange={(e) => handleRateBasisChange(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold bg-white focus:outline-blue-500"
              >
                {RATE_BASIS_OPTIONS.map((basis) => (
                  <option key={basis} value={basis}>
                    {basis}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Rate Unit <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="hour, piece, meter, batch, etc."
                value={procUnit}
                onChange={(e) => setProcUnit(e.target.value)}
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:outline-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Rate (₹ / {procUnit || 'unit'}) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="120.00"
                value={procRate}
                onChange={(e) => setProcRate(e.target.value)}
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-bold focus:outline-blue-500"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Setup Cost (₹ - optional)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={procSetupCost}
                onChange={(e) => setProcSetupCost(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-bold focus:outline-blue-500"
              />
            </div>
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-slate-200">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setAddProcessOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              loading={isSubmittingProc}
            >
              Save Cost Component
            </Button>
          </div>
        </form>
      </Modal>

      {/* ---------------- MODAL: EDIT COST COMPONENT ---------------- */}
      <Modal
        isOpen={editProcessModal !== null}
        onClose={() => setEditProcessModal(null)}
        title={`Edit Cost Component: ${editProcessModal?.workstationName || ''}`}
        description="Update rate basis, pricing and setup charges."
        maxWidth="md"
      >
        {editProcessModal && (
          <form onSubmit={handleUpdateProcess} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Component Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={editProcessModal.workstationName}
                onChange={(e) =>
                  setEditProcessModal({
                    ...editProcessModal,
                    workstationName: e.target.value,
                  })
                }
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-bold focus:outline-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Rate Basis <span className="text-rose-500">*</span>
                </label>
                <select
                  value={editProcessModal.rate_basis || 'Per Hour'}
                  onChange={(e) => {
                    const newBasis = e.target.value;
                    setEditProcessModal({
                      ...editProcessModal,
                      rate_basis: newBasis,
                      unit: getSuggestedUnitForBasis(newBasis),
                    });
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold bg-white focus:outline-blue-500"
                >
                  {RATE_BASIS_OPTIONS.map((basis) => (
                    <option key={basis} value={basis}>
                      {basis}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Rate Unit <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={editProcessModal.unit || 'unit'}
                  onChange={(e) =>
                    setEditProcessModal({
                      ...editProcessModal,
                      unit: e.target.value,
                    })
                  }
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:outline-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Rate (₹ / {editProcessModal.unit || 'unit'}) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={editProcessModal.rate ?? editProcessModal.hourlyRate}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0;
                    setEditProcessModal({
                      ...editProcessModal,
                      rate: val,
                      hourlyRate: val,
                    });
                  }}
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-bold focus:outline-blue-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Setup Cost (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={editProcessModal.setupCost}
                  onChange={(e) =>
                    setEditProcessModal({
                      ...editProcessModal,
                      setupCost: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-bold focus:outline-blue-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <div>
                <span className="font-bold text-slate-800 block text-xs">Active Status</span>
                <span className="text-[11px] text-slate-500">Active components are eligible for quotation cost calculation.</span>
              </div>
              <input
                type="checkbox"
                checked={editProcessModal.is_active !== false}
                onChange={(e) =>
                  setEditProcessModal({
                    ...editProcessModal,
                    is_active: e.target.checked,
                  })
                }
                className="w-4 h-4 text-blue-600 rounded cursor-pointer"
              />
            </div>

            <div className="pt-3 flex justify-end gap-2 border-t border-slate-200">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEditProcessModal(null)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                loading={isSubmittingProc}
              >
                Update Component
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* ---------------- MODAL: CONFIRM DEACTIVATION ---------------- */}
      <Modal
        isOpen={deactivateTarget !== null}
        onClose={() => !isDeactivating && setDeactivateTarget(null)}
        title="Confirm Rate Deactivation"
        description={`Deactivating this ${deactivateTarget?.type === 'material' ? 'material' : 'cost component'} will block it from future quotation calculations.`}
        maxWidth="sm"
      >
        <div className="space-y-4 text-xs">
          <p className="text-slate-700 leading-relaxed">
            Are you sure you want to deactivate <strong className="text-slate-900 font-bold">{deactivateTarget?.name}</strong>?
          </p>

          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-[11px] leading-relaxed">
            <strong>Historical Immutability:</strong> All finalized quotations and stored PDFs using this rate remain completely preserved and unchanged. However, future calculations requiring this rate will be blocked until reactivated.
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-slate-200">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDeactivateTarget(null)}
              disabled={isDeactivating}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              size="sm"
              loading={isDeactivating}
              onClick={confirmDeactivation}
            >
              Deactivate
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default RateManagementPage;
