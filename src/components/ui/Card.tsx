'use client';

import { HTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'outlined' | 'elevated' | 'glass';
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', children, ...props }, ref) => {
    const variants = {
      default: 'bg-[var(--light-card)] dark:bg-[var(--dark-surface)]',
      outlined: 'bg-transparent border border-[var(--light-border)] dark:border-[var(--dark-border)]',
      elevated: 'bg-[var(--light-card)] dark:bg-[var(--dark-surface)] shadow-lg',
      glass: 'bg-white/60 dark:bg-[var(--dark-surface)]/60 backdrop-blur-xl border border-white/40 dark:border-white/10 shadow-xl shadow-black/5 dark:shadow-black/20',
    };

    return (
      <div
        ref={ref}
        className={cn(
          'rounded-lg p-6',
          'border border-[var(--light-border)] dark:border-[var(--dark-border)]',
          'overflow-hidden',
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

Card.displayName = 'Card';

export const CardHeader = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('mb-4', className)}
    {...props}
  />
));
CardHeader.displayName = 'CardHeader';

export const CardTitle = forwardRef<
  HTMLHeadingElement,
  HTMLAttributes<HTMLHeadingElement>
>(({ className, style, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn('font-semibold text-light-text-primary dark:text-dark-text-primary', className)}
    style={{ fontSize: 'var(--text-card-title)', ...style }}
    {...props}
  />
));
CardTitle.displayName = 'CardTitle';

export const CardContent = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('text-light-text-secondary dark:text-dark-text-secondary', className)}
    {...props}
  />
));
CardContent.displayName = 'CardContent';

