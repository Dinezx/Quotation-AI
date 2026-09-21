import React, { useState } from 'react';
import {
  Check,
  Eye,
  Sparkles,
  Sliders,
  Palette,
  Type,
  Layout,
  Download,
  FileCheck,
  RefreshCw,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { TemplatePreviewDoc } from './TemplatePreviewDoc';
import {
  TemplateGalleryItem,
  QuotationTemplateConfig,
  CompanyProfile,
  CompanyBankSettings,
  CompanyQuotationDefaults,
  TemplateCategory,
} from '../../types/company';
import { companyApi } from '../../api/companyApi';

interface TemplateGallerySectionProps {
  templates: TemplateGalleryItem[];
  currentConfig: QuotationTemplateConfig;
  profile?: Partial<CompanyProfile>;
  bank?: Partial<CompanyBankSettings>;
  defaults?: Partial<CompanyQuotationDefaults>;
  onSelectTemplate: (templateId: string) => Promise<void>;
  onSaveCustomization: (newConfig: Partial<QuotationTemplateConfig>) => Promise<void>;
  isSaving: boolean;
  onToast: (msg: string) => void;
}

export const TemplateGallerySection: React.FC<TemplateGallerySectionProps> = ({
  templates,
  currentConfig,
  profile,
  bank,
  defaults,
  onSelectTemplate,
  onSaveCustomization,
  isSaving,
  onToast,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [previewTemplateId, setPreviewTemplateId] = useState<string | null>(null);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState<boolean>(false);

  // Customizer Local State (for live preview before save)
  const [editConfig, setEditConfig] = useState<QuotationTemplateConfig>({ ...currentConfig });
  const [activeSubTab, setActiveSubTab] = useState<'gallery' | 'customize'>('gallery');

  // Sync editConfig when currentConfig changes
  React.useEffect(() => {
    setEditConfig({ ...currentConfig });
  }, [currentConfig]);

  const categories: ('All' | TemplateCategory)[] = [
    'All',
    'Professional',
    'Modern',
    'Industrial',
    'Minimal',
  ];

  const filteredTemplates = templates.filter((t) =>
    selectedCategory === 'All' ? true : t.category === selectedCategory
  );

  const handleApplyPresetColors = (t: TemplateGalleryItem) => {
    setEditConfig((prev) => ({
      ...prev,
      template_id: t.id,
      primary_color: t.default_primary_color,
      secondary_color: t.default_secondary_color,
    }));
  };

  const handleSelect = async (t: TemplateGalleryItem) => {
    try {
      await onSelectTemplate(t.id);
      handleApplyPresetColors(t);
      onToast(`"${t.name}" set as active quotation template.`);
    } catch (err: any) {
      onToast(err.response?.data?.detail || 'Failed to select template.');
    }
  };

  const handleSaveCustomizationSubmit = async () => {
    try {
      await onSaveCustomization(editConfig);
      onToast('Template styling and presentation options updated successfully.');
    } catch (err: any) {
      onToast(err.response?.data?.detail || 'Failed to save template customizations.');
    }
  };

  const handleDownloadSamplePdf = async (templateId: string) => {
    setIsDownloadingPdf(true);
    try {
      const blob = await companyApi.previewTemplatePdf(templateId, editConfig);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Quotation_Sample_${templateId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      onToast('Sample PDF downloaded successfully.');
    } catch (err) {
      onToast('Could not generate sample PDF. Please check server connection.');
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const previewTemplate = templates.find((t) => t.id === previewTemplateId);

  return (
    <div className="space-y-6">
      {/* Top Gallery Header & Subtab Switcher */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-900">Quotation Template Gallery</h3>
            <Badge variant="info" size="sm">8 Standard Designs</Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Select the professional quotation design that best represents your manufacturing company.
            Pricing and calculation formulas remain 100% deterministic and identical across all templates.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveSubTab('gallery')}
            className={`py-2 px-3.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              activeSubTab === 'gallery'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layout className="w-3.5 h-3.5" />
            <span>Browse Gallery</span>
          </button>
          <button
            onClick={() => setActiveSubTab('customize')}
            className={`py-2 px-3.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              activeSubTab === 'customize'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sliders className="w-3.5 h-3.5 text-blue-600" />
            <span>Customize Active Template</span>
          </button>
        </div>
      </div>

      {/* VIEW 1: GALLERY */}
      {activeSubTab === 'gallery' && (
        <div className="space-y-6">
          {/* Filter Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`py-1.5 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {cat}
              </button>
            ))}
            <span className="text-xs text-slate-400 ml-auto font-medium">
              Showing {filteredTemplates.length} of {templates.length} templates
            </span>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {filteredTemplates.map((template) => {
              const isCurrent = currentConfig.template_id === template.id;

              return (
                <div
                  key={template.id}
                  className={`bg-white rounded-2xl border transition-all duration-200 flex flex-col overflow-hidden shadow-xs hover:shadow-md ${
                    isCurrent ? 'border-blue-600 ring-2 ring-blue-600/20' : 'border-slate-200/90'
                  }`}
                >
                  {/* Card Thumbnail Area */}
                  <div
                    className="p-4 bg-slate-50/70 border-b border-slate-100 flex items-center justify-center cursor-pointer group relative"
                    onClick={() => setPreviewTemplateId(template.id)}
                  >
                    <div className="w-48 transition-transform duration-200 group-hover:scale-[1.02]">
                      <TemplatePreviewDoc
                        templateId={template.id}
                        config={{
                          ...currentConfig,
                          template_id: template.id,
                          primary_color: template.default_primary_color,
                          secondary_color: template.default_secondary_color,
                        }}
                        profile={profile}
                        bank={bank}
                        defaults={defaults}
                        isThumbnail={true}
                      />
                    </div>
                    {/* Hover Overlay */}
                    <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <span className="bg-white text-slate-900 text-[11px] font-bold py-1.5 px-3 rounded-lg shadow flex items-center gap-1.5">
                        <Eye className="w-3.5 h-3.5" /> Full A4 Preview
                      </span>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <h4 className="text-sm font-bold text-slate-900 leading-snug">{template.name}</h4>
                        <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                          {template.category}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                        {template.description}
                      </p>
                      <div className="text-[10px] text-slate-400 mt-2">
                        Best for: <span className="font-medium text-slate-600">{template.recommended_for}</span>
                      </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="pt-2 border-t border-slate-100 space-y-2">
                      {isCurrent ? (
                        <div className="w-full py-2 px-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-center gap-1.5">
                          <Check className="w-4 h-4 text-emerald-600" />
                          <span>CURRENT TEMPLATE</span>
                        </div>
                      ) : (
                        <Button
                          variant="primary"
                          size="sm"
                          className="w-full"
                          onClick={() => handleSelect(template)}
                          disabled={isSaving}
                        >
                          Select as Default
                        </Button>
                      )}

                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => setPreviewTemplateId(template.id)}
                        icon={<Eye className="w-3.5 h-3.5 text-slate-400" />}
                      >
                        Preview A4
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW 2: CUSTOMIZE ACTIVE TEMPLATE */}
      {activeSubTab === 'customize' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Controls (5 Cols) */}
          <div className="lg:col-span-5 bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-5">
            <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-900">Customization Controls</h4>
                <p className="text-xs text-slate-500">Fine-tune styling for {editConfig.template_id.replace('_', ' ')}</p>
              </div>
              <Badge variant="slate" size="sm">Print-Safe</Badge>
            </div>

            {/* Color Controls */}
            <div className="space-y-3">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-2">
                <Palette className="w-3.5 h-3.5 text-blue-600" />
                <span>Primary Accent Color</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={editConfig.primary_color || '#1e3a8a'}
                  onChange={(e) => setEditConfig({ ...editConfig, primary_color: e.target.value })}
                  className="w-9 h-9 rounded-lg border border-slate-200 p-0.5 cursor-pointer"
                />
                <input
                  type="text"
                  value={editConfig.primary_color || '#1e3a8a'}
                  onChange={(e) => setEditConfig({ ...editConfig, primary_color: e.target.value })}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-lg py-1.5 px-3 text-xs font-mono"
                />
              </div>

              {/* Color Presets */}
              <div className="flex items-center gap-2">
                {['#1e3a8a', '#0f766e', '#b45309', '#334155', '#4338ca', '#be123c'].map((color) => (
                  <button
                    key={color}
                    onClick={() => setEditConfig({ ...editConfig, primary_color: color })}
                    style={{ backgroundColor: color }}
                    className="w-6 h-6 rounded-full border border-white shadow-xs cursor-pointer hover:scale-110 transition-transform"
                    title={color}
                  />
                ))}
              </div>
            </div>

            {/* Typography */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-2">
                <Type className="w-3.5 h-3.5 text-slate-600" />
                <span>Font Family</span>
              </label>
              <select
                value={editConfig.font_family || 'Helvetica'}
                onChange={(e) => setEditConfig({ ...editConfig, font_family: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-xs font-medium text-slate-800"
              >
                <option value="Helvetica">Helvetica (Standard Clean)</option>
                <option value="Times-Roman">Times-Roman (Formal Classic)</option>
                <option value="Courier">Courier (Technical Industrial)</option>
              </select>
            </div>

            {/* Logo Position */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700 block">Logo Alignment</label>
              <div className="grid grid-cols-3 gap-2">
                {(['left', 'center', 'right'] as const).map((pos) => (
                  <button
                    key={pos}
                    type="button"
                    onClick={() => setEditConfig({ ...editConfig, logo_position: pos })}
                    className={`py-1.5 px-2 rounded-lg border text-xs font-medium capitalize cursor-pointer ${
                      editConfig.logo_position === pos
                        ? 'border-blue-600 bg-blue-50 text-blue-900 font-bold'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {pos}
                  </button>
                ))}
              </div>
            </div>

            {/* Visibility Toggles */}
            <div className="pt-3 border-t border-slate-100 space-y-2.5">
              <label className="text-xs font-semibold text-slate-700 block">Section Visibility</label>
              {[
                { key: 'show_logo', label: 'Company Logo in Header' },
                { key: 'show_company_contact', label: 'Company Phone, Email & Address' },
                { key: 'show_gstin', label: 'Statutory GSTIN & Tax Identifiers' },
                { key: 'show_bank_details', label: 'Bank Account & IFSC Settlement' },
                { key: 'show_terms', label: 'Commercial Terms & Validity' },
                { key: 'show_signature', label: 'Authorized Signatory Section' },
              ].map((item) => (
                <label key={item.key} className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={(editConfig as any)[item.key] !== false}
                    onChange={(e) =>
                      setEditConfig({ ...editConfig, [item.key]: e.target.checked })
                    }
                    className="rounded text-blue-600 w-4 h-4"
                  />
                  <span>{item.label}</span>
                </label>
              ))}
            </div>

            {/* Footer Text */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 block">Footer Text</label>
              <textarea
                rows={2}
                value={editConfig.footer_text || ''}
                onChange={(e) => setEditConfig({ ...editConfig, footer_text: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-800"
                placeholder="Computer generated commercial quotation..."
              />
            </div>

            {/* Save Button */}
            <div className="pt-2">
              <Button
                variant="primary"
                size="md"
                className="w-full"
                onClick={handleSaveCustomizationSubmit}
                disabled={isSaving}
                icon={<FileCheck className="w-4 h-4 text-emerald-400" />}
              >
                {isSaving ? 'Saving...' : 'Save & Update Quotation Template'}
              </Button>
            </div>
          </div>

          {/* Right Live Preview (7 Cols) */}
          <div className="lg:col-span-7 bg-slate-100 p-5 rounded-2xl border border-slate-300 flex flex-col">
            <div className="flex justify-between items-center text-xs pb-2 mb-3 text-slate-600 font-mono">
              <span className="font-bold">LIVE REAL-TIME PREVIEW</span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownloadSamplePdf(editConfig.template_id)}
                  disabled={isDownloadingPdf}
                  icon={<Download className="w-3.5 h-3.5" />}
                >
                  {isDownloadingPdf ? 'Generating PDF...' : 'Download Sample PDF'}
                </Button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              <TemplatePreviewDoc
                templateId={editConfig.template_id}
                config={editConfig}
                profile={profile}
                bank={bank}
                defaults={defaults}
                isThumbnail={false}
              />
            </div>
          </div>
        </div>
      )}

      {/* FULL A4 PREVIEW MODAL */}
      {previewTemplateId && (
        <Modal
          isOpen={true}
          onClose={() => setPreviewTemplateId(null)}
          title={`Quotation Preview — ${previewTemplate?.name || 'Template'}`}
          description="High-fidelity visual representation of how your quotation will render."
          maxWidth="4xl"
        >
          <div className="space-y-4">
            <div className="max-h-[70vh] overflow-y-auto p-2 bg-slate-100 rounded-xl">
              <TemplatePreviewDoc
                templateId={previewTemplateId}
                config={{
                  ...currentConfig,
                  template_id: previewTemplateId,
                  primary_color: previewTemplate?.default_primary_color || currentConfig.primary_color,
                  secondary_color: previewTemplate?.default_secondary_color || currentConfig.secondary_color,
                }}
                profile={profile}
                bank={bank}
                defaults={defaults}
                isThumbnail={false}
              />
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-slate-200">
              <Button
                variant="outline"
                size="md"
                onClick={() => handleDownloadSamplePdf(previewTemplateId)}
                disabled={isDownloadingPdf}
                icon={<Download className="w-4 h-4" />}
              >
                {isDownloadingPdf ? 'Generating Sample PDF...' : 'Download Sample PDF'}
              </Button>

              <div className="flex items-center gap-2">
                <Button variant="ghost" size="md" onClick={() => setPreviewTemplateId(null)}>
                  Close
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  onClick={async () => {
                    if (previewTemplate) {
                      await handleSelect(previewTemplate);
                      setPreviewTemplateId(null);
                    }
                  }}
                >
                  Use This Template
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
