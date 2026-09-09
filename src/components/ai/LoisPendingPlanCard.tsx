'use client';

import { useState } from 'react';
import { CalendarClock, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import { useApplyLoisPlanMutation, useCancelLoisPlanMutation } from '@/lib/store/api/aiApi';

export function LoisPendingPlanCard({
  schoolId,
  conversationId,
  result,
}: {
  schoolId: string;
  conversationId?: string | null;
  result: {
    planId?: string;
    kind?: 'TIMETABLE' | 'SCHEME';
    mode?: string;
    message?: string;
    classLabel?: string;
    expiresAt?: string;
    warnings?: string[];
    subjectsWithoutTeachers?: Array<{ name?: string }>;
    hasExistingTimetable?: boolean;
    analysis?: { warnings?: string[]; totalPeriods?: number; freePeriods?: number };
    saved?: boolean;
    error?: string;
  };
}) {
  const [status, setStatus] = useState<'open' | 'applied' | 'cancelled'>(
    result.saved ? 'applied' : 'open',
  );
  const [applyResult, setApplyResult] = useState<string | null>(null);
  const [applyPlan, { isLoading: applying }] = useApplyLoisPlanMutation();
  const [cancelPlan, { isLoading: cancelling }] = useCancelLoisPlanMutation();

  if (result.error || !result.planId) {
    return (
      <p className="text-sm text-red-600 dark:text-red-400">
        {result.error || 'No plan was stored. Ask Lois to inspect and propose again.'}
      </p>
    );
  }

  const warnings = [
    ...(result.warnings || []),
    ...(result.analysis?.warnings || []),
  ].filter(Boolean);
  const missingTeachers = (result.subjectsWithoutTeachers || []).map((s) => s.name).filter(Boolean);
  const kindLabel = result.kind === 'SCHEME' ? 'Scheme of work' : 'Timetable';
  const busy = applying || cancelling;

  const handleApply = async () => {
    try {
      const res = await applyPlan({
        schoolId,
        planId: result.planId!,
        conversationId,
      }).unwrap();
      setStatus('applied');
      setApplyResult(res.data?.message || `${kindLabel} applied.`);
      toast.success(res.data?.message || `${kindLabel} applied.`);
    } catch (err: any) {
      const message =
        err?.data?.message ||
        err?.data?.error ||
        (typeof err?.data === 'string' ? err.data : null) ||
        'Could not apply this plan. It may have expired.';
      toast.error(message);
    }
  };

  const handleCancel = async () => {
    try {
      await cancelPlan({ schoolId, planId: result.planId! }).unwrap();
      setStatus('cancelled');
      toast.success('Plan cancelled.');
    } catch (err: any) {
      toast.error(err?.data?.message || 'Could not cancel this plan.');
    }
  };

  return (
    <div className="space-y-3 text-sm">
      <div className="flex items-start gap-2">
        <CalendarClock className="w-4 h-4 mt-0.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
        <div>
          <p className="font-semibold text-emerald-900 dark:text-emerald-200">
            {kindLabel} proposal{result.classLabel ? ` — ${result.classLabel}` : ''}
          </p>
          <p className="text-emerald-800/80 dark:text-emerald-300/80 mt-1">
            {result.message || 'Preview only. Not saved until you Apply.'}
          </p>
        </div>
      </div>

      {result.mode === 'REPLACE' && status === 'open' && (
        <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
          Applying will replace the existing timetable, not just fill empty slots.
        </p>
      )}

      {warnings.length > 0 && (
        <ul className="space-y-1 text-xs text-amber-800 dark:text-amber-300/90">
          {warnings.slice(0, 6).map((w) => (
            <li key={w}>• {w}</li>
          ))}
        </ul>
      )}

      {missingTeachers.length > 0 && (
        <p className="text-xs text-amber-700 dark:text-amber-400">
          No teachers assigned for {missingTeachers.join(', ')}. Slots can still be created unassigned.
        </p>
      )}

      {status === 'applied' && (
        <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
          {applyResult || 'Applied.'}
        </p>
      )}
      {status === 'cancelled' && (
        <p className="text-xs text-slate-500">This plan was cancelled.</p>
      )}

      {status === 'open' && (
        <div className="flex items-center gap-2 pt-1">
          <Button
            type="button"
            size="sm"
            variant="primary"
            disabled={busy}
            onClick={handleApply}
            className="h-8 px-3 text-xs"
          >
            {applying ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
            Apply
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={busy}
            onClick={handleCancel}
            className="h-8 px-3 text-xs"
          >
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
}
