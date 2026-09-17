import React from 'react';

interface TabularNumberProps {
  value: number;
  currency?: boolean;
  decimals?: number;
  className?: string;
  prefix?: string;
  suffix?: string;
}

export const TabularNumber: React.FC<TabularNumberProps> = ({
  value,
  currency = true,
  decimals = 0,
  className = '',
  prefix = '',
  suffix = ''
}) => {
  const formatted = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);

  return (
    <span className={`font-mono tabular-nums ${className}`}>
      {currency ? '₹' : ''}
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
};
