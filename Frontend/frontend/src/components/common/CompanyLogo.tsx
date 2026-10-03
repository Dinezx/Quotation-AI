import React, { useState, useEffect } from 'react';
import { Building2, ImageOff, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';
import { useCompanyLogo } from '../../hooks/useCompanyLogo';
import { companyApi } from '../../api/companyApi';
import { Button } from '../ui/Button';

export interface CompanyLogoProps {
  className?: string;
  maxHeight?: string | number;
  maxWidth?: string | number;
  alt?: string;
  variant?: 'profile' | 'settings' | 'preview' | 'header' | 'thumbnail';
  showPlaceholderIfEmpty?: boolean;
  placeholderText?: string;
  position?: 'left' | 'center' | 'right';
  onManageInSettings?: () => void;
  companyName?: string;
  overrideLogoUrl?: string | null;
}

export const CompanyLogo: React.FC<CompanyLogoProps> = ({
  className = '',
  maxHeight,
  maxWidth,
  alt = 'Company Logo',
  variant = 'preview',
  showPlaceholderIfEmpty = false,
  placeholderText = 'Logo not uploaded',
  position = 'left',
  onManageInSettings,
  companyName,
  overrideLogoUrl,
}) => {
  const { logoUrl: fetchedLogoUrl, hasLogo: hookHasLogo, isLoading } = useCompanyLogo();

  // Resolve active logo URL:
  // 1. If overrideLogoUrl is explicitly null -> no logo
  // 2. If overrideLogoUrl is a valid web/blob/data URL -> use it
  // 3. If overrideLogoUrl is a relative storage path (e.g. "companies/...") -> resolve to fetchedLogoUrl || direct API URL
  // 4. Otherwise use fetchedLogoUrl || direct API URL
  let resolvedUrl: string | null = null;
  if (overrideLogoUrl === null) {
    resolvedUrl = null;
  } else if (typeof overrideLogoUrl === 'string' && overrideLogoUrl.trim() !== '') {
    const trimmed = overrideLogoUrl.trim();
    if (
      trimmed.startsWith('blob:') ||
      trimmed.startsWith('data:') ||
      trimmed.startsWith('http://') ||
      trimmed.startsWith('https://')
    ) {
      resolvedUrl = trimmed;
    } else {
      // Storage key like "companies/..."
      resolvedUrl = fetchedLogoUrl || (hookHasLogo ? companyApi.getLogoUrl() : null);
    }
  } else {
    resolvedUrl = fetchedLogoUrl || (hookHasLogo ? companyApi.getLogoUrl() : null);
  }

  const [activeUrl, setActiveUrl] = useState<string | null>(resolvedUrl);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setActiveUrl(resolvedUrl);
    setHasError(false);
  }, [resolvedUrl]);

  const handleImageError = () => {
    // If the active URL was a blob URL that failed, fallback to direct authenticated API URL
    if (activeUrl && activeUrl.startsWith('blob:')) {
      const directUrl = companyApi.getLogoUrl();
      if (directUrl && directUrl !== activeUrl) {
        setActiveUrl(directUrl);
        return;
      }
    }
    setHasError(true);
  };

  const hasLogo = Boolean(activeUrl) && !hasError;

  const alignClass =
    position === 'center'
      ? 'justify-center text-center mx-auto'
      : position === 'right'
        ? 'justify-end text-right ml-auto'
        : 'justify-start text-left mr-auto';

  // --- 1. MY PROFILE VARIANT ---
  if (variant === 'profile') {
    return (
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900">Official Company Logo</h3>
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded-full">
                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                Authoritative Asset
              </span>
            </div>
            <p className="text-xs text-slate-500">
              The single authoritative brand logo embedded in quotation headers, customizer previews, and final PDFs.
            </p>
          </div>
          {onManageInSettings && (
            <Button
              variant="outline"
              size="sm"
              onClick={onManageInSettings}
              className="text-xs"
              icon={<ArrowRight className="w-3.5 h-3.5" />}
            >
              Manage in Company Settings
            </Button>
          )}
        </div>

        {hasLogo && activeUrl ? (
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 pt-1">
            <div className="w-44 h-24 bg-slate-50 border border-slate-200/80 rounded-xl p-3 flex items-center justify-center overflow-hidden shrink-0 shadow-2xs">
              <img
                src={activeUrl}
                alt={alt}
                onError={handleImageError}
                className="max-h-full max-w-full object-contain"
                style={{
                  maxHeight: maxHeight || '84px',
                  maxWidth: maxWidth || '160px',
                }}
              />
            </div>
            <div className="space-y-1.5 text-center sm:text-left flex-1 min-w-0">
              <div className="text-xs font-semibold text-slate-900">
                {companyName || 'Corporate Brand Logo Active'}
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                This logo is dynamically retrieved from authenticated private tenant storage. Any updates in Company Settings instantly propagate across all draft quotations, previews, and PDF documents.
              </p>
              <div className="pt-1 flex items-center gap-2 text-[11px] font-mono text-slate-400">
                <span>Format: Proportional aspect-ratio preserved</span>
                <span>•</span>
                <span>Isolated Multi-Tenant Asset</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 bg-slate-50/80 border border-dashed border-slate-200 rounded-xl">
            <div className="flex items-center gap-4 text-center sm:text-left">
              <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 shrink-0">
                <ImageOff className="w-5 h-5 text-slate-400" />
              </div>
              <div className="space-y-0.5">
                <h4 className="text-xs font-bold text-slate-800">No company logo uploaded</h4>
                <p className="text-xs text-slate-500">
                  Upload your company logo in Company Settings to brand your quotations and PDF documents.
                </p>
              </div>
            </div>
            {onManageInSettings && (
              <Button
                variant="primary"
                size="sm"
                onClick={onManageInSettings}
                icon={<ArrowRight className="w-3.5 h-3.5" />}
              >
                Upload in Company Settings
              </Button>
            )}
          </div>
        )}
      </div>
    );
  }

  // --- 2. SETTINGS TAB UPLOAD BOX VARIANT ---
  if (variant === 'settings') {
    return (
      <div className="w-36 h-20 bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl flex items-center justify-center p-2 overflow-hidden shrink-0">
        {hasLogo && activeUrl ? (
          <img
            src={activeUrl}
            alt={alt}
            onError={handleImageError}
            className="max-h-full max-w-full object-contain"
            style={{
              maxHeight: maxHeight || '72px',
              maxWidth: maxWidth || '136px',
            }}
          />
        ) : (
          <div className="text-center text-slate-400">
            <Building2 className="w-6 h-6 mx-auto mb-1 opacity-50" />
            <span className="text-[10px] font-medium block">No Logo</span>
          </div>
        )}
      </div>
    );
  }

  // --- 3. THUMBNAIL MINI VARIANT ---
  if (variant === 'thumbnail') {
    if (!hasLogo || !activeUrl) {
      if (!showPlaceholderIfEmpty) return null;
      return (
        <div className={`flex items-center ${alignClass}`}>
          <div className="px-1 py-0.5 rounded border border-dashed border-slate-300 bg-slate-50 text-[3.5px] font-mono text-slate-400 flex items-center gap-0.5">
            <Building2 className="w-1.5 h-1.5 opacity-60" />
            <span>Logo</span>
          </div>
        </div>
      );
    }
    return (
      <div className={`flex items-center ${alignClass} ${className}`}>
        <img
          src={activeUrl}
          alt={alt}
          onError={handleImageError}
          className="object-contain"
          style={{
            maxHeight: maxHeight || '16px',
            maxWidth: maxWidth || '40px',
          }}
        />
      </div>
    );
  }

  // --- 4. PREVIEW / HEADER VARIANT (Live Template Preview & Quotation Preview) ---
  if (!hasLogo || !activeUrl) {
    if (!showPlaceholderIfEmpty) {
      return null;
    }
    return (
      <div className={`flex items-center ${alignClass} ${className}`}>
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-dashed border-slate-300 bg-slate-50/80 text-slate-400 text-[11px] font-medium">
          <Building2 className="w-3.5 h-3.5 opacity-60 shrink-0" />
          <span className="font-mono text-[10px] tracking-wide">{placeholderText}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-center ${alignClass} ${className}`}>
      <img
        src={activeUrl}
        alt={alt}
        onError={handleImageError}
        className="object-contain block"
        style={{
          maxHeight: maxHeight || '48px',
          maxWidth: maxWidth || '140px',
        }}
      />
    </div>
  );
};
