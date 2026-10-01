import { useState, useEffect } from 'react';
import { useCompanySettings } from './useCompanySettings';
import { companyApi } from '../api/companyApi';

export function useCompanyLogo() {
  const { settings, isLoading: isSettingsLoading } = useCompanySettings();
  const [logoBlobUrl, setLogoBlobUrl] = useState<string | null>(null);
  const [isLoadingLogo, setIsLoadingLogo] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<boolean>(false);

  const hasLogo = Boolean(settings?.profile?.logo_url);
  const logoKey = settings?.profile?.logo_url || '';

  useEffect(() => {
    let active = true;

    if (!hasLogo) {
      if (logoBlobUrl) {
        URL.revokeObjectURL(logoBlobUrl);
      }
      setLogoBlobUrl(null);
      setLoadError(false);
      return;
    }

    setIsLoadingLogo(true);
    setLoadError(false);

    companyApi
      .getLogoBlob()
      .then((blob) => {
        if (!active) return;
        if (blob) {
          const url = URL.createObjectURL(blob);
          setLogoBlobUrl((prev) => {
            if (prev) URL.revokeObjectURL(prev);
            return url;
          });
          setLoadError(false);
        } else {
          setLogoBlobUrl(null);
        }
      })
      .catch((err) => {
        if (!active) return;
        console.warn('Failed to load company logo blob:', err);
        setLoadError(true);
      })
      .finally(() => {
        if (active) setIsLoadingLogo(false);
      });

    return () => {
      active = false;
    };
  }, [hasLogo, logoKey]);

  // Direct authenticated endpoint URL with token for SSR/HTML tags or fallback
  const directLogoUrl = hasLogo ? companyApi.getLogoUrl() : null;

  return {
    hasLogo: hasLogo && !loadError,
    logoUrl: logoBlobUrl || directLogoUrl,
    isLoading: isSettingsLoading || isLoadingLogo,
    loadError,
  };
}
