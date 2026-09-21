'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from './Button';
import { cn } from '@/lib/utils';

interface BackButtonProps {
  /** Optional label, if provided shows text next to arrow */
  label?: string;
  /** Fallback URL if no history exists */
  fallbackUrl?: string;
  /** Additional CSS classes */
  className?: string;
  /**
   * Return true when the click was handled (for example a wizard step)
   * so the button does not leave the page.
   */
  onClick?: () => boolean | void;
}

/**
 * Reusable back navigation button
 * Uses router.back() to navigate to the previous page
 */
export function BackButton({
  label,
  fallbackUrl,
  className,
  onClick,
}: BackButtonProps) {
  const router = useRouter();

  const handleBack = () => {
    if (onClick?.() === true) return;

    // If there is history (length > 1), go back. Otherwise use fallback.
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else if (fallbackUrl) {
      router.push(fallbackUrl);
    } else {
      router.back(); // Final effort
    }
  };

  return (
    <button
      onClick={handleBack}
      className={cn(
        'inline-flex items-center text-light-text-secondary dark:text-dark-text-secondary hover:text-[#2490FD] transition-colors focus:outline-none',
        className
      )}
      title={label || "Go Back"}
    >
      <ArrowLeft className="h-5 w-5" />
      {label && <span className="ml-2 font-medium">{label}</span>}
    </button>
  );
}

export default BackButton;

