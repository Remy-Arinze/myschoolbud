'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { LoisOrb } from '@/components/ai/LoisOrb';

export const LOIS_AUTOFILL_PRO_MESSAGE =
  'Lois Auto-Fill is included with Pro. Upgrade to Pro to let Lois place subjects and teachers without overloading staff. You can still build this timetable by dragging subjects onto the grid.';

export function LoisAutoFillUpgradeModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Lois Auto-Fill is a Pro feature" size="sm">
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <LoisOrb size="sm" />
          <p className="text-light-text-secondary dark:text-dark-text-secondary" style={{ fontSize: 'var(--text-body)' }}>
            {LOIS_AUTOFILL_PRO_MESSAGE}
          </p>
        </div>
        <div className="flex gap-2 justify-end">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Keep editing
          </Button>
          <Link href="/dashboard/school/subscription">
            <Button variant="primary" size="sm">
              View plans
            </Button>
          </Link>
        </div>
      </div>
    </Modal>
  );
}

export function curateErrorMessage(error: unknown): string {
  const err = error as { data?: { message?: string | string[] }; message?: string; status?: number };
  const raw = err?.data?.message ?? err?.message;
  const text = Array.isArray(raw) ? raw.join(' ') : raw;
  if (text) return text;
  if (err?.status === 403) return LOIS_AUTOFILL_PRO_MESSAGE;
  return 'Could not auto-fill this timetable. Please try again.';
}
