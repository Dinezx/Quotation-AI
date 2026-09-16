import React, { useState } from 'react';
import { 
  Layers, 
  Plus, 
  History, 
  UploadCloud, 
  Save, 
  RefreshCw, 
  TrendingUp, 
  Cpu, 
  Sliders, 
  CheckCircle2, 
  Edit3, 
  Bell, 
  Download, 
  Send,
  Building,
  DollarSign
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { MetricCard } from '../../components/ui/MetricCard';
import { Modal } from '../../components/ui/Modal';
import { TabularNumber } from '../../components/common/TabularNumber';
import { rateService } from '../../services/rateService';
import { MaterialRate, MaterialCategory } from '../../types/rates';

export const RateManagementPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'material' | 'process' | 'multipliers' | 'hsn'>('material');
  const [materials, setMaterials] = useState<MaterialRate[]>(rateService.getMaterialRates());
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  
  // Modals
  const [addMaterialModalOpen, setAddMaterialModalOpen] = useState(false);
  const [editMaterial, setEditMaterial] = useState<MaterialRate | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // New material form
  const [newGrade, setNewGrade] = useState('');
  const [newSubSpec, setNewSubSpec] = useState('');
  const [newCategory, setNewCategory] = useState<MaterialCategory>('Ferrous');
  const [newBaseRate, setNewBaseRate] = useState<number>(100);
  const [newScrapCredit, setNewScrapCredit] = useState<number>(30);
  const [newDensity, setNewDensity] = useState<number>(7.85);
  const [newSupplier, setNewSupplier] = useState('Pune Mandi Exchange');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleAddMaterialSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGrade) return;
    const added = rateService.addMaterialRate({
      gradeAndSpec: newGrade,
      subSpec: newSubSpec || 'Precision Industrial Stock',
      category: newCategory,
      baseRatePerKg: Number(newBaseRate),
      scrapCreditPerKg: Number(newScrapCredit),
      densityGPerCm3: Number(newDensity),
      primarySupplier: newSupplier,
      mandiHub: 'Pune MCX Depot',
      aiMatchStatus: 'VERIFIED'
    });
    setMaterials(rateService.getMaterialRates());
    setAddMaterialModalOpen(false);
    showToast(`Added ${added.gradeAndSpec} to price master.`);
  };

  const handleEditRateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editMaterial) return;
    rateService.updateMaterialRate(editMaterial.id, {
      baseRatePerKg: Number(editMaterial.baseRatePerKg),
      scrapCreditPerKg: Number(editMaterial.scrapCreditPerKg),
    });
    setMaterials(rateService.getMaterialRates());
    setEditMaterial(null);
    showToast(`Updated rate for ${editMaterial.gradeAndSpec}`);
  };

  const filteredMaterials = materials.filter(m => {
    if (categoryFilter === 'ALL') return true;
    return m.category === categoryFilter;
  });

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Toast notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-16 right-8 z-50 bg-slate-950 text-white text-xs font-medium py-2 px-4 rounded-lg shadow-xl border border-slate-700 flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Bar (Matches Image 3) */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
              Rate Management & Costing Master
            </h1>
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-blue-50 text-blue-800 border border-blue-200">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
              <span>Active Rate Card: FY 2025-Q1</span>
              <span className="bg-emerald-600 text-white text-[9px] px-1 rounded font-bold">
                LIVE IN PRODUCTION
              </span>
            </div>
          </div>
          <p className="text-xs text-slate-500">
            Configure base raw material rates, shopfloor machining hourly costs, standard overheads, and statutory tax parameters used by the AI quotation engine.
          </p>
        </div>

        {/* Top Right Action Buttons */}
        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            icon={<History className="w-3.5 h-3.5" />}
            onClick={() => alert("Rate card history audit log: FY23 to FY25 revisions.")}
          >
            History & Logs
          </Button>
          <Button
            variant="outline"
            size="sm"
            icon={<UploadCloud className="w-3.5 h-3.5" />}
            onClick={() => alert("Import ERP rate sheet (CSV/Excel template).")}
          >
            Import from ERP / Excel
          </Button>
          <Button
            variant="secondary"
            size="sm"
            icon={<Save className="w-3.5 h-3.5" />}
            onClick={() => showToast("Rate master changes published to production calculation engine.")}
          >
            Save & Publish Changes
          </Button>
        </div>
      </div>

      {/* Status Bar */}
      <div className="bg-white border border-slate-200 rounded-lg px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-2xs">
        <div className="flex items-center gap-2 text-slate-600">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Auto-saved 14 mins ago by <strong>R. Deshmukh</strong>. All changes reflect instantly in new RFQ extractions.</span>
        </div>

        <div className="flex items-center gap-3 text-slate-500 text-[11px] shrink-0">
          <span>Mandi Link: <strong>MCX / NCDEX Daily Sync OK (06:30 AM IST)</strong></span>
          <button
            onClick={() => showToast("Triggered real-time Mandi price feed synchronization.")}
            className="flex items-center gap-1 text-blue-600 hover:text-blue-800 font-medium cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Force Refresh Feeds</span>
          </button>
        </div>
      </div>

      {/* 4 Bento KPI Metric Cards (Matches Image 3) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Raw Material Index"
          value="18 Active Grades"
          subtitle="CI: ₹95/kg • MS: ₹110/kg • SS 304: ₹218/kg"
          badge={<Badge variant="success" size="sm">+2.4% this month</Badge>}
          icon={<TrendingUp className="w-4 h-4 text-emerald-600" />}
          footer={<span className="text-[11px] text-slate-500">LME / Mandi live trend</span>}
        />

        <MetricCard
          title="Machine Centers Active"
          value="8 Workstations"
          subtitle="Average Blended Rate: ₹385.00/hr"
          icon={<Cpu className="w-4 h-4 text-blue-600" />}
          footer={
            <div className="flex justify-between w-full text-slate-500 text-[11px]">
              <span>Shop Capacity: <strong className="text-slate-800">78%</strong></span>
              <span>2 Shifts / Day</span>
            </div>
          }
        />

        <MetricCard
          title="Standard Multipliers"
          value="12% / 15%"
          subtitle="Overhead: 12% • Profit Margin: 15%"
          badge={<span className="text-[10px] font-mono bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-200">HSN Matched</span>}
          icon={<Sliders className="w-4 h-4 text-slate-500" />}
          footer={<span className="text-[11px] text-slate-500">Default GST: <strong className="text-slate-800">18%</strong></span>}
        />

        <MetricCard
          title="AI Costing Accuracy"
          value="99.1%"
          subtitle="Auto-match rate in last 48 POs"
          badge={<Badge variant="success" size="sm" dot>Verified</Badge>}
          icon={<CheckCircle2 className="w-4 h-4 text-emerald-600" />}
          footer={
            <div className="flex justify-between w-full text-slate-500 text-[11px]">
              <span>0 Manual Overrides</span>
              <span className="text-blue-600 hover:underline cursor-pointer">View Drift Log →</span>
            </div>
          }
        />
      </div>

      {/* Tabs & Table Header */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        {/* Tab Strip */}
        <div className="border-b border-slate-200 px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/60">
          <div className="flex items-center gap-1 overflow-x-auto">
            {[
              { id: 'material', label: 'Material Rates (kg/MT)', badge: '18' },
              { id: 'process', label: 'Process & Machine Rates (hr)', badge: '8' },
              { id: 'multipliers', label: 'Overhead & Margin Rules' },
              { id: 'hsn', label: 'HSN & GST Matrix' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-3 px-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-700 bg-white shadow-2xs'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                    activeTab === tab.id ? 'bg-blue-100 text-blue-800' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 py-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => showToast("Bulk scrap recovery surcharges recalculated.")}
            >
              Bulk Update Scrap Surcharge
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={<Plus className="w-3.5 h-3.5" />}
              onClick={() => setAddMaterialModalOpen(true)}
            >
              Add Material Grade
            </Button>
          </div>
        </div>

        {/* Tab 1: Material Rates Content */}
        {activeTab === 'material' && (
          <div>
            {/* Filter Bar */}
            <div className="px-5 py-3 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs bg-white">
              <div>
                <h3 className="font-bold text-slate-900">Precision Raw Material Price Master</h3>
                <p className="text-slate-500 text-[11px]">Direct feed used to compute gross piece weight, scrap allowance, and raw billet costing.</p>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                  <span>Filter:</span>
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="px-2 py-1 bg-slate-50 border border-slate-200 rounded font-medium text-slate-800 focus:outline-none"
                  >
                    <option value="ALL">All Categories (Ferrous, Non-Ferrous, Alloys)</option>
                    <option value="Ferrous">Ferrous Only</option>
                    <option value="Non-Ferrous">Non-Ferrous Only</option>
                    <option value="Alloys">Alloys Only</option>
                  </select>
                </div>

                <div className="text-[11px] font-mono text-slate-500">
                  Base Currency: <strong className="text-slate-800">INR (₹)</strong>
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold text-[10px] tracking-wider">
                    <th className="py-2.5 px-4">Grade & Specification</th>
                    <th className="py-2.5 px-4">Category</th>
                    <th className="py-2.5 px-4">Base Rate (₹/kg)</th>
                    <th className="py-2.5 px-4">Scrap Credit (₹/kg)</th>
                    <th className="py-2.5 px-4">Density (g/cm³)</th>
                    <th className="py-2.5 px-4">Primary Supplier & Mandi Hub</th>
                    <th className="py-2.5 px-4">AI Match Status</th>
                    <th className="py-2.5 px-4">Last Updated</th>
                    <th className="py-2.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredMaterials.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{m.gradeAndSpec}</div>
                        {m.subSpec && (
                          <div className="text-[10px] text-slate-500 font-mono mt-0.5">{m.subSpec}</div>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <Badge
                          variant={
                            m.category === 'Ferrous' ? 'slate' :
                            m.category === 'Non-Ferrous' ? 'purple' : 'info'
                          }
                          size="sm"
                        >
                          {m.category}
                        </Badge>
                      </td>

                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        ₹{m.baseRatePerKg.toFixed(2)} <span className="text-[10px] text-slate-400 font-normal">/kg</span>
                      </td>

                      <td className="py-3 px-4 font-mono font-medium text-emerald-600">
                        -₹{m.scrapCreditPerKg.toFixed(2)}
                      </td>

                      <td className="py-3 px-4 font-mono text-slate-600">
                        {m.densityGPerCm3.toFixed(2)}
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-800">{m.primarySupplier}</div>
                        <div className="text-[10px] text-slate-400">{m.mandiHub}</div>
                      </td>

                      <td className="py-3 px-4">
                        <Badge variant="success" size="sm" dot>
                          VERIFIED
                        </Badge>
                      </td>

                      <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                        {m.lastUpdated}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setEditMaterial({ ...m })}
                            className="p-1 rounded hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                            title="Edit Rate"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => showToast(`Subscribed to Mandi price alerts for ${m.gradeAndSpec}`)}
                            className="p-1 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                            title="Alerts"
                          >
                            <Bell className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Table Footer Action Bar (Matches Image 3 bottom bar) */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-4 text-slate-500">
                <span className="flex items-center gap-1.5 text-emerald-700 font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  All 18 active raw material feeds synchronized
                </span>
                <span className="hidden md:inline">|</span>
                <span className="hidden md:inline">
                  Next Scheduled Price Review: <strong>15 Sep 2026 (Monthly LME Mandi Revision)</strong>
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  icon={<Download className="w-3.5 h-3.5" />}
                  onClick={() => showToast("Exported Raw Material Price Master (PDF & Excel CSV)")}
                >
                  Export Master PDF / CSV
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  icon={<Send className="w-3.5 h-3.5 text-emerald-400" />}
                  onClick={() => showToast("Pushed active rate matrix live to Quotation Engine.")}
                >
                  Push Live to Quotation Engine
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Process & Machine Rates */}
        {activeTab === 'process' && (
          <div className="p-5 space-y-4">
            <h3 className="font-bold text-sm text-slate-900">Workstations & Machine Hourly Cost Centers</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {rateService.getProcessRates().map(proc => (
                <div key={proc.id} className="p-4 border border-slate-200 rounded-lg bg-slate-50/50 space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-bold text-slate-900">{proc.workstationName}</div>
                      <div className="text-[10px] font-mono text-slate-400">Code: {proc.code} • {proc.shiftMode}</div>
                    </div>
                    <Badge variant="info" size="sm">{proc.category}</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200 text-xs font-mono">
                    <div>Hourly Rate: <strong className="text-slate-900">₹{proc.hourlyRate}/hr</strong></div>
                    <div>Setup Charge: <strong className="text-slate-900">₹{proc.setupCost}</strong></div>
                    <div>Shop Capacity: <strong className="text-emerald-700">{proc.capacityUtilizationPct}%</strong></div>
                    <div>Calibrated: <span className="text-slate-500">{proc.lastCalibrated}</span></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 3: Multipliers */}
        {activeTab === 'multipliers' && (
          <div className="p-6 max-w-2xl space-y-4">
            <h3 className="font-bold text-sm text-slate-900">Commercial Multipliers & Overhead Rules</h3>
            <div className="space-y-4 text-xs">
              <div className="p-4 border border-slate-200 rounded-lg bg-slate-50">
                <label className="font-bold text-slate-800 block mb-1">Standard Factory Overhead (%)</label>
                <p className="text-slate-500 text-[11px] mb-2">Applied to base (material + machining) subtotal to cover indirect shopfloor electricity, oil, and tooling wear.</p>
                <input
                  type="number"
                  defaultValue={12}
                  className="px-3 py-1.5 border border-slate-300 rounded font-mono font-bold text-slate-900 bg-white"
                />
              </div>

              <div className="p-4 border border-slate-200 rounded-lg bg-slate-50">
                <label className="font-bold text-slate-800 block mb-1">Commercial Profit Margin (%)</label>
                <p className="text-slate-500 text-[11px] mb-2">Default target commercial net margin across precision machined components.</p>
                <input
                  type="number"
                  defaultValue={15}
                  className="px-3 py-1.5 border border-slate-300 rounded font-mono font-bold text-slate-900 bg-white"
                />
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: HSN & GST Matrix */}
        {activeTab === 'hsn' && (
          <div className="p-5 space-y-3">
            <h3 className="font-bold text-sm text-slate-900">HSN Codes & GST Chapter Classifications</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border border-slate-200">
                <thead className="bg-slate-50 font-semibold text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="p-2.5">Chapter</th>
                    <th className="p-2.5">HSN Code</th>
                    <th className="p-2.5">Description</th>
                    <th className="p-2.5">CGST</th>
                    <th className="p-2.5">SGST</th>
                    <th className="p-2.5">IGST</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  <tr>
                    <td className="p-2.5 font-mono">84</td>
                    <td className="p-2.5 font-mono font-bold text-slate-900">84139190</td>
                    <td className="p-2.5">Parts of Pumps for Liquids (Cast Iron pump casings)</td>
                    <td className="p-2.5 font-mono">9.0%</td>
                    <td className="p-2.5 font-mono">9.0%</td>
                    <td className="p-2.5 font-mono font-semibold text-blue-700">18.0%</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-mono">84</td>
                    <td className="p-2.5 font-mono font-bold text-slate-900">84831099</td>
                    <td className="p-2.5">Transmission Shafts & Cranks (Steel EN8 alloy)</td>
                    <td className="p-2.5 font-mono">9.0%</td>
                    <td className="p-2.5 font-mono">9.0%</td>
                    <td className="p-2.5 font-mono font-semibold text-blue-700">18.0%</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-mono">73</td>
                    <td className="p-2.5 font-mono font-bold text-slate-900">73269099</td>
                    <td className="p-2.5">Other Articles of Iron or Steel (Cover plates & flanges)</td>
                    <td className="p-2.5 font-mono">9.0%</td>
                    <td className="p-2.5 font-mono">9.0%</td>
                    <td className="p-2.5 font-mono font-semibold text-blue-700">18.0%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Edit Material Rate Modal */}
      <Modal
        isOpen={!!editMaterial}
        onClose={() => setEditMaterial(null)}
        title={`Edit Material Rate: ${editMaterial?.gradeAndSpec}`}
        description="Update standard base rate or scrap credit per kg in the master catalog"
        maxWidth="md"
      >
        {editMaterial && (
          <form onSubmit={handleEditRateSubmit} className="space-y-4 text-xs">
            <div>
              <label className="text-[10px] font-semibold uppercase text-slate-500 block mb-1">
                Base Rate (₹/kg)
              </label>
              <input
                type="number"
                step="0.01"
                value={editMaterial.baseRatePerKg}
                onChange={(e) => setEditMaterial({ ...editMaterial, baseRatePerKg: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-200 rounded font-mono font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600"
              />
            </div>

            <div>
              <label className="text-[10px] font-semibold uppercase text-slate-500 block mb-1">
                Scrap Credit (₹/kg)
              </label>
              <input
                type="number"
                step="0.01"
                value={editMaterial.scrapCreditPerKg}
                onChange={(e) => setEditMaterial({ ...editMaterial, scrapCreditPerKg: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-200 rounded font-mono font-bold text-emerald-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
              />
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <Button variant="outline" size="sm" type="button" onClick={() => setEditMaterial(null)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" type="submit">
                Save Rate
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Add New Material Grade Modal */}
      <Modal
        isOpen={addMaterialModalOpen}
        onClose={() => setAddMaterialModalOpen(false)}
        title="Add Material Grade to Price Master"
        description="Register a new ferrous/non-ferrous alloy in the plant calculation catalog"
        maxWidth="lg"
      >
        <form onSubmit={handleAddMaterialSubmit} className="space-y-4 text-xs">
          <div>
            <label className="text-[10px] font-semibold uppercase text-slate-500 block mb-1">
              Grade & Standard Specification *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Copper Cu-ETP (Electrolytic Tough Pitch)"
              value={newGrade}
              onChange={(e) => setNewGrade(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded font-medium focus:ring-1 focus:ring-blue-600 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-semibold uppercase text-slate-500 block mb-1">
                Category
              </label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value as MaterialCategory)}
                className="w-full px-3 py-2 border border-slate-200 rounded bg-white focus:ring-1 focus:ring-blue-600 focus:outline-none"
              >
                <option value="Ferrous">Ferrous</option>
                <option value="Non-Ferrous">Non-Ferrous</option>
                <option value="Alloys">Alloys</option>
                <option value="Polymers">Polymers</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-semibold uppercase text-slate-500 block mb-1">
                Density (g/cm³)
              </label>
              <input
                type="number"
                step="0.01"
                value={newDensity}
                onChange={(e) => setNewDensity(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-200 rounded font-mono focus:ring-1 focus:ring-blue-600 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-semibold uppercase text-slate-500 block mb-1">
                Base Rate (₹/kg) *
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={newBaseRate}
                onChange={(e) => setNewBaseRate(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-200 rounded font-mono font-bold focus:ring-1 focus:ring-blue-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold uppercase text-slate-500 block mb-1">
                Scrap Recovery Credit (₹/kg)
              </label>
              <input
                type="number"
                step="0.01"
                value={newScrapCredit}
                onChange={(e) => setNewScrapCredit(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-200 rounded font-mono text-emerald-600 focus:ring-1 focus:ring-blue-600 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-semibold uppercase text-slate-500 block mb-1">
              Primary Supplier / Mandi Hub
            </label>
            <input
              type="text"
              value={newSupplier}
              onChange={(e) => setNewSupplier(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded focus:ring-1 focus:ring-blue-600 focus:outline-none"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <Button variant="outline" size="sm" type="button" onClick={() => setAddMaterialModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit">
              Add to Catalog
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
