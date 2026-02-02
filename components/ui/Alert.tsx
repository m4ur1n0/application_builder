import { HTMLAttributes, forwardRef } from 'react';

export interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'info' | 'success' | 'warning' | 'error';
}

export const Alert = forwardRef<HTMLDivElement, AlertProps>(
  ({ variant = 'info', className = '', children, ...props }, ref) => {
    const baseStyles = 'px-4 py-3 rounded-lg text-sm border';

    const variantStyles = {
      info: 'bg-blue-50 border-blue-200 text-blue-800',
      success: 'bg-emerald-50 border-emerald-200 text-emerald-800',
      warning: 'bg-amber-50 border-amber-200 text-amber-800',
      error: 'bg-red-50 border-red-200 text-red-800'
    };

    return (
      <div
        ref={ref}
        className={`${baseStyles} ${variantStyles[variant]} ${className}`}
        role="alert"
        {...props}
      >
        {children}
      </div>
    );
  }
);

Alert.displayName = 'Alert';
