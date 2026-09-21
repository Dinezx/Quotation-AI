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
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { MetricCard } from '../components/ui/MetricCard';
import { Modal } from '../components/ui/Modal';
import { useRates } from '../hooks/useRates';
import { MaterialRate, ProcessRate } from '../types/rates';
import { MaterialCreateDTO, ProcessCreateDTO, PricingRulesDTO } from '../api/ratesApi';

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
  const [activeTab, setActiveTab] = useState<'materials' | 'processes' | 'pricing-rules'>('materials');
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

  // Process Form State
  const [procName, setProcName] = useState('');
  const [procUnit, setProcUnit] = useState('hour');
  const [procHourlyRate, setProcHourlyRate] = useState('');
  const [procSetupCost, setProcSetupCost] = useState('0.00');
  const [isSubmittingProc, setIsSubmittingProc] = useState(false);

  // Pricing Rules Form State
  const [overheadPct, setOverheadPct] = useState<number>(10.0);
  const [profitPct, setProfitPct] = useState<number>(15.0);
  const [gstType, setGstType] = useState<string>('CGST_SGST');
  const [defaultGstRate, setDefaultGstRate] = useState<number>(18.0);
  const [isSavingRules, setIsSavingRules] = useState(false);

  // Sync pricing rules when loaded
  useEffect(() => {
    if (pricingRules) {
      setOverheadPct(Number(pricingRules.overhead_percentage) || 10.0);
      setProfitPct(Number(pricingRules.profit_percentage) || 15.0);
      setGstType(pricingRules.gst_type || 'CGST_SGST');
      setDefaultGstRate(Number(pricingRules.default_gst_rate) || 18.0);
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
    if (!matGrade.trim() || !matName.trim() || !matBaseRate) {
      showToast('Please fill in Grade, Name, and Base Rate.', 'error');
      return;
    }
    const baseRateNum = parseFloat(matBaseRate);
    const scrapCreditNum = parseFloat(matScrapCredit || '0');
    const densityNum = parseFloat(matDensity || '7.85');

    if (isNaN(baseRateNum) || baseRateNum < 0) {
      showToast('Base Rate must be a non-negative number.', 'error');
      return;
    }
    if (isNaN(scrapCreditNum) || scrapCreditNum < 0) {
      showToast('Scrap Credit must be a non-negative number.', 'error');
      return;
    }

    setIsSubmittingMat(true);
    try {
      const payload: MaterialCreateDTO = {
        grade: matGrade.trim(),
        name: matName.trim(),
        base_rate: baseRateNum,
        scrap_credit_rate: scrapCreditNum,
        density: densityNum > 0 ? densityNum : undefined,
        unit: matUnit || 'kg',
        is_active: true,
      };
      await createMaterial(payload);
      setAddMaterialOpen(false);
      showToast(`Material grade '${matGrade.trim()}' added to master.`);
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
        showToast(`Deactivated process '${deactivateTarget.name}'.`);
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

    const baseRateNum = Number(editMaterialModal.baseRatePerKg);
    const scrapCreditNum = Number(editMaterialModal.scrapCreditPerKg);

    if (isNaN(baseRateNum) || baseRateNum < 0) {
      showToast('Base Rate must be a non-negative number.', 'error');
      return;
    }
    if (isNaN(scrapCreditNum) || scrapCreditNum < 0) {
      showToast('Scrap Credit must be a non-negative number.', 'error');
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
          density: editMaterialModal.densityGPerCm3,
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

  // ---------------- Handlers: Process ----------------
  const handleOpenAddProcess = () => {
    setProcName('');
    setProcUnit('hour');
    setProcHourlyRate('');
    setProcSetupCost('0.00');
    setAddProcessOpen(true);
  };

  const handleCreateProcess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!procName.trim() || !procHourlyRate) {
      showToast('Please enter Process Name and Hourly Rate.', 'error');
      return;
    }
    const hourlyNum = parseFloat(procHourlyRate);
    const setupNum = parseFloat(procSetupCost || '0');

    if (isNaN(hourlyNum) || hourlyNum < 0) {
      showToast('Hourly Rate must be a non-negative number.', 'error');
      return;
    }
    if (isNaN(setupNum) || setupNum < 0) {
      showToast('Setup Cost must be a non-negative number.', 'error');
      return;
    }

    setIsSubmittingProc(true);
    try {
      const payload: ProcessCreateDTO = {
        name: procName.trim(),
        unit: procUnit || 'hour',
        hourly_rate: hourlyNum,
        setup_cost: setupNum,
        is_active: true,
      };
      await createProcess(payload);
      setAddProcessOpen(false);
      showToast(`Process '${procName.trim()}' added to master.`);
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || 'Failed to add process';
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
      showToast('Process Name cannot be empty.', 'error');
      return;
    }
    const hourlyNum = Number(editProcessModal.hourlyRate);
    const setupNum = Number(editProcessModal.setupCost);

    if (isNaN(hourlyNum) || hourlyNum < 0) {
      showToast('Hourly Rate must be a non-negative number.', 'error');
      return;
    }
    if (isNaN(setupNum) || setupNum < 0) {
      showToast('Setup Cost must be a non-negative number.', 'error');
      return;
    }

    setIsSubmittingProc(true);
    try {
      await updateProcess({
        id: editProcessModal.id,
        data: {
          name: nameClean,
          hourly_rate: hourlyNum,
          setup_cost: setupNum,
          is_active: editProcessModal.is_active,
        },
      });
      setEditProcessModal(null);
      showToast(`Updated process '${nameClean}'.`);
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || 'Failed to update process';
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
        showToast(`Reactivated process '${p.workstationName}'.`);
      } catch (err: any) {
        const msg = err.response?.data?.detail || err.message || 'Action failed';
        showToast(msg, 'error');
      }
    }
  };

  // ---------------- Handlers: Pricing Rules ----------------
  const handleSavePricingRules = async (e: React.FormEvent) => {
    e.preventDefault();
    if (overheadPct < 0 || overheadPct > 100) {
      showToast('Overhead percentage must be between 0% and 100%.', 'error');
      return;
    }
    if (profitPct < 0 || profitPct > 100) {
      showToast('Profit percentage must be between 0% and 100%.', 'error');
      return;
    }
    if (defaultGstRate < 0 || defaultGstRate > 100) {
      showToast('GST rate must be between 0% and 100%.', 'error');
      return;
    }

    setIsSavingRules(true);
    try {
      const payload: PricingRulesDTO = {
        overhead_percentage: overheadPct,
        profit_percentage: profitPct,
        gst_type: gstType,
        default_gst_rate: defaultGstRate,
      };
      await updatePricingRules(payload);
      showToast('Company pricing rules updated successfully!');
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || 'Failed to update pricing rules';
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
    const matchesSearch = (p.workstationName || '').toLowerCase().includes(processSearch.toLowerCase());
    if (!matchesSearch) return false;
    if (processStatusFilter === 'ACTIVE') return p.is_active === true;
    if (processStatusFilter === 'INACTIVE') return p.is_active === false;
    return true;
  });

  // Simulator Calculation (Cascading commercial math)
  const simSubtotal = 100000;
  const simOverhead = simSubtotal * (overheadPct / 100);
  const simAssessable = simSubtotal + simOverhead;
  const simProfit = simAssessable * (profitPct / 100);
  const simTaxable = simAssessable + simProfit;
  const simGstRate = gstType === 'EXEMPT' ? 0 : defaultGstRate;
  const simGst = simTaxable * (simGstRate / 100);
  const simGrandTotal = simTaxable + simGst;

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
            Maintain raw material base rates, scrap credits, machine hourly cost centers, factory overheads, and statutory tax parameters.
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
          title="Raw Materials Master"
          value={`${materials.filter(m => m.is_active).length} Active`}
          subtitle={`${materials.length} Total Registered Grades`}
          badge={<Badge variant="success" size="sm">Catalog Bound</Badge>}
          icon={<Layers className="w-4 h-4 text-emerald-600" />}
          footer={<span className="text-[11px] text-slate-500">Base & Scrap Rates</span>}
        />

        <MetricCard
          title="Machine & Process Centers"
          value={`${processes.filter(p => p.is_active).length} Active`}
          subtitle={`${processes.length} Total Cost Centers`}
          icon={<Cpu className="w-4 h-4 text-blue-600" />}
          footer={<span className="text-[11px] text-slate-500">Hourly Rate & Setup Cost</span>}
        />

        <MetricCard
          title="Factory Overhead Rule"
          value={`${overheadPct.toFixed(2)}%`}
          subtitle="Applied on manufacturing subtotal"
          icon={<Sliders className="w-4 h-4 text-amber-600" />}
          footer={<span className="text-[11px] text-slate-500">Electricity, Tooling, Indirect</span>}
        />

        <MetricCard
          title="Profit Margin & GST"
          value={`${profitPct.toFixed(2)}% Margin`}
          subtitle={`Default GST: ${defaultGstRate}% (${gstType})`}
          badge={<Badge variant="info" size="sm">Statutory</Badge>}
          icon={<Percent className="w-4 h-4 text-purple-600" />}
          footer={<span className="text-[11px] text-slate-500">Cascades to Grand Total</span>}
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
              onClick={() => setActiveTab('processes')}
              className={`py-3.5 px-4 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'processes'
                  ? 'border-blue-600 text-blue-700 bg-white shadow-2xs'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>Processes</span>
              <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                activeTab === 'processes' ? 'bg-blue-100 text-blue-800' : 'bg-slate-200 text-slate-600'
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
              <span>Pricing Rules</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800">
                Active
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
                Add Material
              </Button>
            )}
            {activeTab === 'processes' && (
              <Button
                variant="primary"
                size="sm"
                icon={<Plus className="w-3.5 h-3.5" />}
                onClick={handleOpenAddProcess}
              >
                Add Process
              </Button>
            )}
          </div>
        </div>

        {/* TAB 1: MATERIALS */}
        {activeTab === 'materials' && (
          <div>
            {/* Filter & Search Toolbar */}
            <div className="px-5 py-3 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs bg-white">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search materials by grade or name..."
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
                    <th className="py-2.5 px-4">Material</th>
                    <th className="py-2.5 px-4">Grade</th>
                    <th className="py-2.5 px-4">Rate/kg</th>
                    <th className="py-2.5 px-4">Scrap</th>
                    <th className="py-2.5 px-4">Net Billet Cost</th>
                    <th className="py-2.5 px-4">Density</th>
                    <th className="py-2.5 px-4">Status</th>
                    <th className="py-2.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredMaterials.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400">
                        No materials found matching search criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredMaterials.map((m) => {
                      const netCost = m.baseRatePerKg - m.scrapCreditPerKg;
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
                          <td className="py-3 px-4 font-mono font-bold text-slate-900">
                            ₹{m.baseRatePerKg.toFixed(2)} <span className="text-[10px] text-slate-400 font-normal">/kg</span>
                          </td>
                          <td className="py-3 px-4 font-mono font-medium text-emerald-600">
                            -₹{m.scrapCreditPerKg.toFixed(2)}
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-blue-700">
                            ₹{Math.max(0, netCost).toFixed(2)}/kg
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-600">
                            {m.densityGPerCm3 ? `${m.densityGPerCm3.toFixed(2)} g/cm³` : '-'}
                          </td>
                          <td className="py-3 px-4">
                            <Badge variant={m.is_active ? 'success' : 'slate'} size="sm" dot>
                              {m.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => setEditMaterialModal({ ...m })}
                                className="p-1 rounded hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                                title="Edit Rates"
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
                Showing {filteredMaterials.length} of {materials.length} registered material grades
              </span>
              <Button
                variant="primary"
                size="sm"
                icon={<Plus className="w-3.5 h-3.5" />}
                onClick={handleOpenAddMaterial}
              >
                Add Material
              </Button>
            </div>
          </div>
        )}

        {/* TAB 2: PROCESSES */}
        {activeTab === 'processes' && (
          <div>
            {/* Filter & Search Toolbar */}
            <div className="px-5 py-3 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs bg-white">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search processes..."
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
                    <option value="ALL">All Processes ({processes.length})</option>
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
                    <th className="py-2.5 px-4">Process</th>
                    <th className="py-2.5 px-4">Hourly Rate</th>
                    <th className="py-2.5 px-4">Setup Cost</th>
                    <th className="py-2.5 px-4">Unit</th>
                    <th className="py-2.5 px-4">Status</th>
                    <th className="py-2.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredProcesses.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        No manufacturing processes found matching search criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredProcesses.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">{p.workstationName}</div>
                          <div className="text-[10px] font-mono text-slate-400">{p.code}</div>
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">
                          ₹{p.hourlyRate.toFixed(2)} <span className="text-[10px] text-slate-400 font-normal">/hr</span>
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-700">
                          ₹{p.setupCost.toFixed(2)}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-600">
                          hour
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant={p.is_active ? 'success' : 'slate'} size="sm" dot>
                            {p.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setEditProcessModal({ ...p })}
                              className="p-1 rounded hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                              title="Edit Process"
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
                              title={p.is_active ? 'Deactivate Process' : 'Reactivate Process'}
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
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Processes Table Footer with Prominent Add Button */}
            <div className="px-5 py-3 bg-slate-50/80 border-t border-slate-200 flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">
                Showing {filteredProcesses.length} of {processes.length} manufacturing process centers
              </span>
              <Button
                variant="primary"
                size="sm"
                icon={<Plus className="w-3.5 h-3.5" />}
                onClick={handleOpenAddProcess}
              >
                Add Process
              </Button>
            </div>
          </div>
        )}

        {/* TAB 3: PRICING RULES */}
        {activeTab === 'pricing-rules' && (
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Form Controls (Left / 7 cols) */}
              <form onSubmit={handleSavePricingRules} className="lg:col-span-7 space-y-5">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Commercial Pricing Rules</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Configure standard factory overhead, commercial profit margin, and statutory tax classification applied to calculated quotations.
                  </p>
                </div>

                <div className="p-4 border border-slate-200 rounded-xl bg-slate-50/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800">
                      Standard Factory Overhead (%)
                    </label>
                    <span className="text-[11px] font-mono text-slate-400">0% – 100%</span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Applied onto manufacturing subtotal (material net + process cost) to account for electricity, machine maintenance, coolant, and indirect labor.
                  </p>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={overheadPct}
                      onChange={(e) => setOverheadPct(parseFloat(e.target.value) || 0)}
                      className="w-32 px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono font-bold text-slate-900 bg-white focus:outline-blue-500"
                    />
                    <span className="text-xs font-mono font-semibold text-slate-500">%</span>
                  </div>
                </div>

                <div className="p-4 border border-slate-200 rounded-xl bg-slate-50/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800">
                      Commercial Profit Margin (%)
                    </label>
                    <span className="text-[11px] font-mono text-slate-400">0% – 100%</span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Target commercial net margin calculated on total assessable cost (subtotal + overhead) before tax.
                  </p>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={profitPct}
                      onChange={(e) => setProfitPct(parseFloat(e.target.value) || 0)}
                      className="w-32 px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono font-bold text-slate-900 bg-white focus:outline-blue-500"
                    />
                    <span className="text-xs font-mono font-semibold text-slate-500">%</span>
                  </div>
                </div>

                <div className="p-4 border border-slate-200 rounded-xl bg-slate-50/50 space-y-3">
                  <label className="text-xs font-bold text-slate-800 block">
                    Statutory GST Configuration
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
                      <div className="text-xs mt-1">CGST (9%) + SGST (9%)</div>
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
                      <div className="text-xs mt-1">IGST (18%)</div>
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
                      onChange={(e) => setDefaultGstRate(parseFloat(e.target.value) || 0)}
                      className="w-24 px-2.5 py-1.5 border border-slate-300 rounded font-mono font-bold text-slate-900 bg-white focus:outline-blue-500 disabled:opacity-50"
                    />
                    <span className="text-slate-500 font-mono">%</span>
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
                    Based on an illustrative ₹100,000 baseline manufacturing cost, your pricing rules cascade through:
                  </p>

                  <div className="space-y-2.5 text-xs font-mono">
                    <div className="flex justify-between text-slate-300">
                      <span>1. Manufacturing Subtotal:</span>
                      <span>₹{simSubtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>

                    <div className="flex justify-between text-amber-400">
                      <span>2. Overhead ({overheadPct.toFixed(1)}%):</span>
                      <span>+₹{simOverhead.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>

                    <div className="flex justify-between font-bold text-slate-200 pt-1 border-t border-slate-800">
                      <span>Assessable Base:</span>
                      <span>₹{simAssessable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>

                    <div className="flex justify-between text-purple-400">
                      <span>3. Profit Margin ({profitPct.toFixed(1)}%):</span>
                      <span>+₹{simProfit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>

                    <div className="flex justify-between font-bold text-slate-200 pt-1 border-t border-slate-800">
                      <span>Taxable Commercial Base:</span>
                      <span>₹{simTaxable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>

                    <div className="flex justify-between text-blue-400">
                      <span>4. GST ({simGstRate.toFixed(1)}% - {gstType}):</span>
                      <span>+₹{simGst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>

                    <div className="flex justify-between font-bold text-emerald-400 text-sm pt-2 border-t-2 border-slate-700">
                      <span>Grand Total:</span>
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

      {/* ---------------- MODAL: ADD MATERIAL ---------------- */}
      <Modal
        isOpen={addMaterialOpen}
        onClose={() => setAddMaterialOpen(false)}
        title="Add Material to Price Master"
        description="Add a new raw material grade and assign tenant purchasing and scrap recovery rates."
        maxWidth="md"
      >
        <form onSubmit={handleCreateMaterial} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Material Grade <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. EN8, SS304, AL6061"
              value={matGrade}
              onChange={(e) => setMatGrade(e.target.value)}
              required
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-bold uppercase focus:outline-blue-500"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Material Description / Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Medium Carbon Alloy Steel EN8"
              value={matName}
              onChange={(e) => setMatName(e.target.value)}
              required
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Base Rate (₹/kg) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="85.00"
                value={matBaseRate}
                onChange={(e) => setMatBaseRate(e.target.value)}
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-bold focus:outline-blue-500"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Scrap Credit (₹/kg)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="20.00"
                value={matScrapCredit}
                onChange={(e) => setMatScrapCredit(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-bold focus:outline-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Density (g/cm³)
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

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Pricing Unit
              </label>
              <input
                type="text"
                value={matUnit}
                onChange={(e) => setMatUnit(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono bg-slate-50 focus:outline-blue-500"
              />
            </div>
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
        title={`Edit Material: ${editMaterialModal?.gradeAndSpec || ''}`}
        description="Update raw material pricing and scrap rates in the tenant catalog."
        maxWidth="md"
      >
        {editMaterialModal && (
          <form onSubmit={handleUpdateMaterial} className="space-y-4 text-xs">
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
                  Base Rate (₹/kg) <span className="text-rose-500">*</span>
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
                  Scrap Credit (₹/kg)
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

      {/* ---------------- MODAL: ADD PROCESS ---------------- */}
      <Modal
        isOpen={addProcessOpen}
        onClose={() => setAddProcessOpen(false)}
        title="Add Manufacturing Process"
        description="Configure a new workstation or machining process hourly cost center."
        maxWidth="md"
      >
        <form onSubmit={handleCreateProcess} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Process Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. CNC 4-Axis Milling (VMC-850)"
              value={procName}
              onChange={(e) => setProcName(e.target.value)}
              required
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-bold focus:outline-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Hourly Rate (₹/hr) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="1200.00"
                value={procHourlyRate}
                onChange={(e) => setProcHourlyRate(e.target.value)}
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-bold focus:outline-blue-500"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Fixed Setup Cost (₹)
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

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Rate Unit
            </label>
            <input
              type="text"
              value={procUnit}
              onChange={(e) => setProcUnit(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono bg-slate-50 focus:outline-blue-500"
            />
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
              Save Process
            </Button>
          </div>
        </form>
      </Modal>

      {/* ---------------- MODAL: EDIT PROCESS ---------------- */}
      <Modal
        isOpen={editProcessModal !== null}
        onClose={() => setEditProcessModal(null)}
        title={`Edit Process: ${editProcessModal?.workstationName || ''}`}
        description="Update hourly machining rates and setup charges."
        maxWidth="md"
      >
        {editProcessModal && (
          <form onSubmit={handleUpdateProcess} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Process Name
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
                  Hourly Rate (₹/hr)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={editProcessModal.hourlyRate}
                  onChange={(e) =>
                    setEditProcessModal({
                      ...editProcessModal,
                      hourlyRate: parseFloat(e.target.value) || 0,
                    })
                  }
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
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-bold focus:outline-blue-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <div>
                <span className="font-bold text-slate-800 block text-xs">Active Status</span>
                <span className="text-[11px] text-slate-500">Active processes are eligible for rate matching in new quotations.</span>
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
                Update Process
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
        description={`Deactivating this ${deactivateTarget?.type || 'rate'} will block it from future quotation calculations.`}
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
              Deactivate Rate
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default RateManagementPage;
