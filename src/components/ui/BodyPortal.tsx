'use client';

import { ReactNode } from 'react';
import { createPortal } from 'react-dom';

/** Renders children on document.body so they stack above portaled modals. */
export function BodyPortal({ children }: { children: ReactNode }) {
  if (typeof document === 'undefined') return null;
  return createPortal(children, document.body);
}
