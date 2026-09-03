'use client';

import { Loader2 } from 'lucide-react';
import { Button } from './Button';
import { LoisOrb } from '@/components/ai/LoisOrb';

interface AutoGenerateButtonProps {
  onClick: () => void;
  isLoading?: boolean;
  disabled?: boolean;
  label?: string;
  loadingLabel?: string;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
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
          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
          {loadingLabel}
        </>
      ) : (
        <>
          <LoisOrb size="xs" className="mr-1" />
          {label}
        </>
      )}
    </Button>
  );
}
