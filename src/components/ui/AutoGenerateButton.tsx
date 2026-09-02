'use client';

import Image from 'next/image';
import { Sparkles, Loader2 } from 'lucide-react';
import { Button } from './Button';

interface AutoGenerateButtonProps {
  onClick: () => void;
  isLoading?: boolean;
  disabled?: boolean;
  label?: string;
  loadingLabel?: string;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  logoSrc?: string;
}

export function AutoGenerateButton({
  onClick,
  isLoading = false,
  disabled = false,
  label = 'Auto-Generate',
  loadingLabel = 'Generating...',
  variant = 'secondary',
  size = 'sm',
  className = '',
  logoSrc,
}: AutoGenerateButtonProps) {
  return (
    <Button
      variant={variant}
      size={size}
      onClick={onClick}
      disabled={disabled || isLoading}
      className={className}
    >
      {isLoading ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          {loadingLabel}
        </>
      ) : (
        <>
          {logoSrc ? (
            <Image
              src={logoSrc}
              alt="Myschoolbud"
              width={16}
              height={16}
              className="mr-2 object-contain"
            />
          ) : (
            <Sparkles className="h-4 w-4 mr-2" />
          )}
          {label}
        </>
      )}
    </Button>
  );
}

