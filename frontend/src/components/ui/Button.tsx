import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'size'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  iconPosition = 'left',
  loading = false,
  className = '',
  disabled,
  ...props
}) => {
  const variantStyles = {
    primary: 'bg-[#B87333] hover:bg-[#A46328] text-white font-medium border border-[#B87333] shadow-xs focus:outline-none focus:ring-2 focus:ring-[#172033] focus:ring-offset-2',
    secondary: 'bg-white hover:bg-[#f5f3ee] text-[#172033] font-medium border border-[#E5E1D8] hover:border-[#64748B] shadow-2xs',
    outline: 'bg-white hover:bg-[#f5f3ee] text-[#172033] font-medium border border-[#E5E1D8] shadow-2xs',
    ghost: 'bg-transparent hover:bg-[#f5f3ee] text-[#64748B] hover:text-[#172033] border border-transparent',
    danger: 'bg-[#A84A4A] hover:bg-[#933b3b] text-white font-medium border border-transparent shadow-xs',
  };

  const sizeStyles = {
    sm: 'text-xs px-2.5 py-1.5 rounded gap-1.5',
    md: 'text-xs px-3.5 py-2 rounded gap-2 font-medium',
    lg: 'text-sm px-4 py-2.5 rounded gap-2 font-medium',
  };

  return (
    <motion.button
      whileTap={{ scale: disabled || loading ? 1 : 0.98 }}
      transition={{ duration: 0.1 }}
      className={`inline-flex items-center justify-center transition-colors cursor-pointer select-none disabled:opacity-50 disabled:cursor-not-allowed ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        <>
          {icon && iconPosition === 'left' && <span className="shrink-0">{icon}</span>}
          {children}
          {icon && iconPosition === 'right' && <span className="shrink-0">{icon}</span>}
        </>
      )}
    </motion.button>
  );
};
