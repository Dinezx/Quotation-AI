import React from 'react';
import { motion } from 'framer-motion';

interface MetricCardProps {
  title: string;
  value: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  badge,
  footer,
  className = ''
}) => {
  return (
    <motion.div
      whileHover={{ y: -2, transition: { duration: 0.2 } }}
      className={`bg-white border border-slate-200 rounded-lg p-4 shadow-sm relative overflow-hidden ${className}`}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          {title}
        </span>
        {icon && <span className="text-slate-400">{icon}</span>}
      </div>

      <div className="flex items-baseline gap-2 mb-1">
        <div className="text-2xl font-bold text-slate-900 font-mono tracking-tight">
          {value}
        </div>
        {badge}
      </div>

      {subtitle && (
        <div className="text-xs text-slate-500 leading-relaxed">
          {subtitle}
        </div>
      )}

      {footer && (
        <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-600 flex items-center justify-between">
          {footer}
        </div>
      )}
    </motion.div>
  );
};
