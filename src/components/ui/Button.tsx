'use client';

import {
  ButtonHTMLAttributes,
  Children,
  cloneElement,
  forwardRef,
  isValidElement,
  ReactElement,
} from 'react';
import { cn } from '@/lib/utils';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'accent' | 'white';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
  fullWidth?: boolean;
  bgColor?: string; // Optional custom background color (hex or tailwind class)
  textColor?: string; // Optional custom text color
  isFlat?: boolean; // If true, removes the 3D effect (shadows, translate on active, border-t)
  asChild?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'sm',
      isLoading = false,
      fullWidth = false,
      disabled,
      children,
      bgColor,
      textColor,
      isFlat = true,
      style,
      asChild = false,
      type = 'button',
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-0 disabled:opacity-60 disabled:pointer-events-none disabled:cursor-not-allowed relative overflow-hidden';

    const variants = {
      primary: cn(
        'text-white focus:ring-agora-blue disabled:grayscale disabled:opacity-70',
        isFlat
          ? 'bg-[#2490FD] hover:bg-[#1a7ae6]'
          : '!bg-gradient-to-b from-[#2490FD] to-[#1a7ae6] !opacity-100 hover:from-[#2a9fff] hover:to-[#2490FD] shadow-[0_4px_0_#0f4a8a] hover:shadow-[0_6px_0_#0f4a8a] active:shadow-[0_2px_0_#0f4a8a] active:translate-y-[2px] border-t border-[#3ba0ff]/50 disabled:from-gray-400 disabled:to-gray-500 disabled:shadow-none disabled:border-t-gray-400/30'
      ),
      accent: cn(
        'text-white focus:ring-agora-accent disabled:grayscale disabled:opacity-70',
        isFlat
          ? 'bg-[#FF532A] hover:bg-[#e6451f]'
          : '!bg-gradient-to-b from-[#FF532A] to-[#e6451f] !opacity-100 hover:from-[#ff6340] hover:to-[#FF532A] shadow-[0_4px_0_#cc4219] hover:shadow-[0_6px_0_#cc4219] active:shadow-[0_2px_0_#cc4219] active:translate-y-[2px] border-t border-[#ff6b4d]/50 disabled:from-gray-400 disabled:to-gray-500 disabled:shadow-none disabled:border-t-gray-400/30'
      ),
      white: cn(
        'text-agora-text focus:ring-white disabled:grayscale disabled:opacity-70 disabled:text-gray-500',
        isFlat
          ? 'bg-white hover:bg-gray-50 border border-gray-200'
          : '!bg-gradient-to-b from-white to-gray-100 !opacity-100 hover:from-gray-50 hover:to-white shadow-[0_4px_0_#d1d5db] hover:shadow-[0_6px_0_#d1d5db] active:shadow-[0_2px_0_#d1d5db] active:translate-y-[2px] border-t border-white/80 disabled:from-gray-200 disabled:to-gray-300 disabled:shadow-none disabled:border-t-gray-300/50'
      ),
      secondary: cn(
        'text-gray-900 dark:text-white focus:ring-gray-500 disabled:opacity-70 disabled:text-gray-500 dark:disabled:text-gray-400',
        isFlat
          ? 'bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600'
          : 'bg-gradient-to-b from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 hover:from-gray-300 hover:to-gray-400 dark:hover:from-gray-600 dark:hover:to-gray-700 shadow-[0_2px_0_#9ca3af] dark:shadow-[0_2px_0_#374151] hover:shadow-[0_3px_0_#9ca3af] dark:hover:shadow-[0_3px_0_#374151] active:shadow-[0_1px_0_#9ca3af] dark:active:shadow-[0_1px_0_#374151] active:translate-y-[1px] disabled:from-gray-300 disabled:to-gray-400 disabled:dark:from-gray-800 disabled:dark:to-gray-900 disabled:shadow-none'
      ),
      outline: cn(
        'bg-transparent focus:ring-gray-500 disabled:opacity-70 disabled:cursor-not-allowed',
        isFlat
          ? 'border border-[#02173D] dark:border-white text-[#02173D] dark:text-white hover:bg-black/5 dark:hover:bg-white/5'
          : 'border-2 border-gray-300 dark:border-dark-border text-gray-700 dark:text-dark-text-primary hover:bg-gray-50 dark:hover:bg-dark-surface shadow-[0_2px_0_#9ca3af] hover:shadow-[0_3px_0_#374151] active:shadow-[0_1px_0_#9ca3af] active:translate-y-[1px] disabled:border-gray-400 dark:disabled:border-gray-600 disabled:shadow-none'
      ),
      ghost: 'bg-transparent text-gray-700 dark:text-dark-text-primary hover:bg-gray-100 dark:hover:bg-dark-surface focus:ring-gray-500 disabled:opacity-50 disabled:text-gray-400 dark:disabled:text-gray-600 disabled:cursor-not-allowed',
      danger: cn(
        'text-white focus:ring-red-500 disabled:grayscale disabled:opacity-70',
        isFlat
          ? 'bg-red-600 hover:bg-red-700'
          : 'bg-gradient-to-b from-red-600 to-red-700 dark:from-red-500 dark:to-red-600 hover:from-red-700 hover:to-red-800 dark:hover:from-red-600 dark:hover:to-red-700 shadow-[0_4px_0_#b91c1c] hover:shadow-[0_6px_0_#b91c1c] active:shadow-[0_2px_0_#b91c1c] active:translate-y-[2px] border-t border-red-400/50 disabled:from-gray-400 disabled:to-gray-500 disabled:shadow-none disabled:border-t-gray-400/30'
      ),
    };

    const sizes = {
      sm: 'px-3 py-2 text-[13px] leading-tight',
      md: 'px-4 py-2.5 text-base leading-tight',
      lg: 'px-6 py-3 text-lg leading-tight',
      icon: 'h-10 w-10 p-2',
    };

    // Custom styles for bgColor/textColor if provided
    const customStyles = {
      ...(bgColor && (bgColor.startsWith('#') || bgColor.startsWith('rgb')) ? { backgroundColor: bgColor } : {}),
      ...(textColor && (textColor.startsWith('#') || textColor.startsWith('rgb')) ? { color: textColor } : {}),
      ...style,
    };

    // If bgColor/textColor are Tailwind classes, we add them to className
    const tailwindBg = bgColor && !bgColor.startsWith('#') && !bgColor.startsWith('rgb') ? bgColor : '';
    const tailwindText = textColor && !textColor.startsWith('#') && !textColor.startsWith('rgb') ? textColor : '';

    const buttonClassName = cn(
      baseStyles,
      !bgColor && variants[variant],
      sizes[size],
      fullWidth && 'w-full',
      tailwindBg,
      tailwindText,
      (variant === 'primary' || variant === 'accent' || variant === 'white' || variant === 'danger') &&
        !bgColor &&
        !isFlat &&
        'before:absolute before:inset-0 before:bg-gradient-to-b before:from-white/20 before:to-transparent before:rounded-lg before:pointer-events-none disabled:before:hidden',
      className
    );

    const isDisabled = disabled || isLoading;

    if (asChild) {
      const child = Children.only(children);
      if (!isValidElement(child)) {
        throw new Error('Button with asChild expects a single valid React element child.');
      }

      const childElement = child as ReactElement<{
        className?: string;
        style?: React.CSSProperties;
        onClick?: (event: React.MouseEvent) => void;
        tabIndex?: number;
      }>;

      return cloneElement(childElement, {
        ...props,
        ref,
        className: cn(
          buttonClassName,
          childElement.props.className,
          isDisabled && 'pointer-events-none opacity-60'
        ),
        style: { ...customStyles, ...childElement.props.style },
        'aria-disabled': isDisabled || undefined,
        tabIndex: isDisabled ? -1 : childElement.props.tabIndex,
        onClick: (event: React.MouseEvent) => {
          if (isDisabled) {
            event.preventDefault();
            return;
          }
          props.onClick?.(event as React.MouseEvent<HTMLButtonElement>);
          childElement.props.onClick?.(event);
        },
      });
    }

    return (
      <button
        ref={ref}
        type={type}
        className={buttonClassName}
        style={customStyles}
        disabled={isDisabled}
        {...props}
      >
        <span className="relative z-10 flex items-center justify-center gap-2 whitespace-nowrap">
          {isLoading ? (
            <>
              <svg
                className="animate-spin h-4 w-4 flex-shrink-0"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <span>Loading...</span>
            </>
          ) : (
            children
          )}
        </span>
      </button>
    );
  }
);

Button.displayName = 'Button';

