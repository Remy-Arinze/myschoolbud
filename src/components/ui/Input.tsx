'use client';

import { InputHTMLAttributes, forwardRef, ReactNode, useId } from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  /** Input type: 'text' | 'email' | 'tel' | 'number' | 'date' | 'password' etc. Defaults to 'text'. */
  type?: InputHTMLAttributes<HTMLInputElement>['type'];
  /** Additional class name for the wrapper div */
  wrapperClassName?: string;
  /** If true, the wrapper div will not have w-full */
  inline?: boolean;
  /** Custom label class name */
  labelClassName?: string;
  /** Show required asterisk after label */
  required?: boolean;
  /** Left addon (icon or text) */
  leftAddon?: ReactNode;
  /** Right addon (icon or text) */
  rightAddon?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  function Input(
    {
      className,
      label,
      error,
      helperText,
      id,
      type = 'text',
      wrapperClassName,
      inline = false,
      labelClassName,
      required,
      leftAddon,
      rightAddon,
      ...props
    },
    ref,
  ) {
    const autoId = useId();
    const inputId = id || autoId;

    return (
      <div className={cn(inline ? '' : 'w-full', wrapperClassName)}>
        {label && (
          <label
            htmlFor={inputId}
            className={cn(
              'block text-sm font-medium text-[var(--light-text-secondary)] dark:text-[var(--dark-text-secondary)] mb-1',
              labelClassName,
            )}
          >
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        <div className={cn('relative', leftAddon || rightAddon ? 'flex' : '')}>
          {leftAddon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[var(--light-text-muted)] dark:text-[var(--dark-text-muted)]">
              {leftAddon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            type={type}
            className={cn(
              'w-full px-4 py-2 border rounded-lg',
              'bg-[var(--light-input)] dark:bg-[var(--dark-input)]',
              'text-[var(--light-text-primary)] dark:text-[var(--dark-text-primary)]',
              'placeholder-[var(--light-text-muted)] dark:placeholder-[var(--dark-text-muted)]',
              'focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent',
              'transition-colors',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'read-only:cursor-default read-only:opacity-90',
              error
                ? 'border-red-500 dark:border-red-500 focus:ring-red-500'
                : 'border-[var(--light-border)] dark:border-[var(--dark-border)]',
              leftAddon ? 'pl-10' : '',
              rightAddon ? 'pr-10' : '',
              className,
            )}
            {...props}
          />
          {rightAddon && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center text-[var(--light-text-muted)] dark:text-[var(--dark-text-muted)]">
              <div className="pointer-events-auto">{rightAddon}</div>
            </div>
          )}
        </div>
        {error && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>}
        {helperText && !error && (
          <p className="mt-1 text-sm text-[var(--light-text-muted)] dark:text-[var(--dark-text-muted)]">
            {helperText}
          </p>
        )}
      </div>
    );
  },
);

Input.displayName = 'Input';
