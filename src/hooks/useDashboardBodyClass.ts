'use client';

import { useEffect } from 'react';

/**
 * Applies a dashboard theme body class on mount and removes it on unmount.
 * Used by role-specific dashboard layouts to scope CSS theme overrides.
 */
export function useDashboardBodyClass(bodyClass: string) {
  useEffect(() => {
    document.body.classList.add(bodyClass);
    return () => {
      document.body.classList.remove(bodyClass);
    };
  }, [bodyClass]);
}
