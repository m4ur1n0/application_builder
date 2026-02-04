import { HTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'info' | 'success' | 'warning' | 'error';
}

export const Alert = forwardRef<HTMLDivElement, AlertProps>(
  ({ variant = 'info', className = '', children, ...props }, ref) => {
    // Signal & Static: Calm, technical alerts with thin borders
    const baseStyles = 'px-4 py-3 text-sm border-l-2';

    const variantStyles = {
      info: 'bg-cyan-50/50 border-l-cyan-600 text-cyan-900',
      success: 'bg-emerald-50/50 border-l-emerald-600 text-emerald-900',
      warning: 'bg-amber-50/50 border-l-amber-600 text-amber-900',
      error: 'bg-red-50/50 border-l-red-600 text-red-900'
    };

    return (
      <div
        ref={ref}
        className={cn(
          baseStyles,
          variantStyles[variant],
          className
        )}
        role="alert"
        {...props}
      >
        {children}
      </div>
    );
  }
);

Alert.displayName = 'Alert';
