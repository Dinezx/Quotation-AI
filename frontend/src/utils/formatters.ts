export function formatCurrencyINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(amount);
}

export const formatCurrency = formatCurrencyINR;

export function formatNumber(val: number, decimals: number = 2): string {
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(val);
}

export function formatWeight(val?: number): string {
  if (val === undefined || val === null || isNaN(val)) return '0.00 kg';
  return `${val.toFixed(2)} kg`;
}

export function formatHours(val?: number): string {
  if (val === undefined || val === null || isNaN(val)) return '0.00 hrs';
  return `${val.toFixed(2)} hrs`;
}

export function formatPercent(val?: number): string {
  if (val === undefined || val === null || isNaN(val)) return '0.0%';
  return `${val.toFixed(1)}%`;
}

export function formatDate(dateString?: string): string {
  if (!dateString) return '—';
  try {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
}
