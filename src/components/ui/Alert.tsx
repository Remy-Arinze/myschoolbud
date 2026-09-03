'use client';

import { HTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'success' | 'error' | 'warning' | 'info';
}

export const Alert = forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant = 'info', children, ...props }, ref) => {
    const variants = {
      success: 'bg-green-50 dark:bg-emerald-500/15 border-green-200 dark:border-emerald-400/35 text-green-800 dark:text-emerald-100',
      error: 'bg-red-50 dark:bg-red-500/15 border-red-200 dark:border-red-400/40 text-red-800 dark:text-red-100',
      warning: 'bg-amber-50 dark:bg-amber-500/15 border-amber-200 dark:border-amber-400/40 text-amber-900 dark:text-amber-100',
      info: 'bg-blue-50 dark:bg-sky-500/15 border-blue-200 dark:border-sky-400/35 text-blue-800 dark:text-sky-100',
    };

    return (
      <div
        ref={ref}
        className={cn(
          'border rounded-lg px-4 py-3',
          variants[variant],
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Alert.displayName = 'Alert';

export const AlertDescription = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => {
    return (
      <p
        ref={ref}
        className={cn('text-sm', className)}
        {...props}
      />
    );
  }
);

AlertDescription.displayName = 'AlertDescription';

