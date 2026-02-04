import { HTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'bordered' | 'elevated';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ variant = 'default', padding = 'md', className = '', children, ...props }, ref) => {
    // Signal & Static: Prefer thin borders over heavy shadows
    const baseStyles = 'bg-white transition-all duration-150';

    const variantStyles = {
      // Default: subtle border only
      default: 'border border-stone-200',

      // Bordered: stronger border for emphasis
      bordered: 'border border-stone-300',

      // Elevated: subtle shadow with border (minimal use)
      elevated: 'border border-stone-200 shadow-sm'
    };

    const paddingStyles = {
      none: '',
      sm: 'p-4',
      md: 'p-5',
      lg: 'p-6'
    };

    return (
      <div
        ref={ref}
        className={cn(
          baseStyles,
          variantStyles[variant],
          paddingStyles[padding],
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';
