import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'success';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({
    variant = 'primary',
    size = 'md',
    fullWidth = false,
    className = '',
    children,
    disabled,
    ...props
  }, ref) => {
    // Signal & Static: Crisp, technical buttons with clear states
    const baseStyles = 'inline-flex items-center justify-center font-medium transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-40 disabled:cursor-not-allowed';

    const variantStyles = {
      // Primary: Cyan accent - the signal color
      primary: 'bg-cyan-600 text-white border border-cyan-700 hover:bg-cyan-700 hover:border-cyan-800 focus:ring-cyan-500',

      // Secondary: Neutral with thin border - technical feel
      secondary: 'bg-white text-stone-700 border border-stone-300 hover:bg-stone-50 hover:border-stone-400 focus:ring-stone-400',

      // Danger: Red for destructive actions
      danger: 'bg-red-600 text-white border border-red-700 hover:bg-red-700 hover:border-red-800 focus:ring-red-500',

      // Ghost: Minimal, for tertiary actions
      ghost: 'text-stone-600 hover:bg-stone-100 hover:text-stone-900 focus:ring-stone-300',

      // Success: Emerald for positive actions
      success: 'bg-emerald-600 text-white border border-emerald-700 hover:bg-emerald-700 hover:border-emerald-800 focus:ring-emerald-500'
    };

    const sizeStyles = {
      sm: 'px-3 py-1.5 text-xs tracking-wide',
      md: 'px-4 py-2 text-sm',
      lg: 'px-5 py-2.5 text-base'
    };

    const widthStyles = fullWidth ? 'w-full' : '';

    return (
      <button
        ref={ref}
        className={cn(
          baseStyles,
          variantStyles[variant],
          sizeStyles[size],
          widthStyles,
          className
        )}
        disabled={disabled}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
