'use client';

import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import { useApplyLoisPlanMutation } from '@/lib/store/api/aiApi';

type OpenPlan = {
  planId: string;
  classLabel?: string;
  kind?: 'TIMETABLE' | 'SCHEME';
};

type LoisPlanApplyContextValue = {
  markApplied: (key: { planId?: string; classLabel?: string; message?: string }) => void;
  isApplied: (key: { planId?: string; classLabel?: string }) => boolean;
  appliedMessage: (key: { planId?: string; classLabel?: string }) => string | null;
};

const LoisPlanApplyContext = createContext<LoisPlanApplyContextValue | null>(null);

function labelKey(label?: string): string | null {
  if (!label?.trim()) return null;
  return `label:${label.toLowerCase().replace(/[^a-z0-9]+/g, '')}`;
}

export function LoisPlanApplySession({
  conversationId,
  children,
}: {
  conversationId?: string | null;
  children: React.ReactNode;
}) {
  const [applied, setApplied] = useState<Record<string, string>>({});

  const markApplied = useCallback(
    (key: { planId?: string; classLabel?: string; message?: string }) => {
      const message = key.message || 'Applied.';
      setApplied((prev) => {
        const next = { ...prev };
        if (key.planId) next[`id:${key.planId}`] = message;
        const lk = labelKey(key.classLabel);
        if (lk) next[lk] = message;
        return next;
      });
    },
    [],
  );

  const isApplied = useCallback(
    (key: { planId?: string; classLabel?: string }) => {
      if (key.planId && applied[`id:${key.planId}`]) return true;
      const lk = labelKey(key.classLabel);
      return !!(lk && applied[lk]);
    },
    [applied],
  );

  const appliedMessage = useCallback(
    (key: { planId?: string; classLabel?: string }) => {
      if (key.planId && applied[`id:${key.planId}`]) return applied[`id:${key.planId}`];
      const lk = labelKey(key.classLabel);
      return lk ? applied[lk] || null : null;
    },
    [applied],
  );

  const value = useMemo(
    () => ({ markApplied, isApplied, appliedMessage }),
    [markApplied, isApplied, appliedMessage],
  );

  return (
    <LoisPlanApplyContext.Provider key={conversationId || 'new'} value={value}>
      {children}
    </LoisPlanApplyContext.Provider>
  );
}

export function useLoisPlanApply() {
  return useContext(LoisPlanApplyContext);
}

export function LoisApplyAllBar({
  schoolId,
  conversationId,
  plans,
}: {
  schoolId: string;
  conversationId?: string | null;
  plans: OpenPlan[];
}) {
  const session = useLoisPlanApply();
  const [applyPlan, { isLoading }] = useApplyLoisPlanMutation();
  const remaining = plans.filter((p) => !session?.isApplied({ planId: p.planId, classLabel: p.classLabel }));

  if (remaining.length < 2) return null;

  const handleApplyAll = async () => {
    let ok = 0;
    const labels: string[] = [];
    for (const plan of remaining) {
      try {
        const res = await applyPlan({
          schoolId,
          planId: plan.planId,
          conversationId,
        }).unwrap();
        const message = res.data?.message || 'Applied.';
        session?.markApplied({
          planId: plan.planId,
          classLabel: plan.classLabel,
          message,
        });
        ok += 1;
        if (plan.classLabel) labels.push(plan.classLabel);
      } catch (err: any) {
        const message =
          err?.data?.message ||
          err?.data?.error ||
          (typeof err?.data === 'string' ? err.data : null) ||
          `Could not apply ${plan.classLabel || 'this class'}.`;
        toast.error(message);
      }
    }
    if (ok > 0) {
      toast.success(labels.length ? `Saved ${labels.join(', ')}.` : `Saved ${ok} timetable${ok === 1 ? '' : 's'}.`);
    }
  };

  return (
    <div className="flex items-center justify-between gap-2 rounded-xl border border-emerald-200/70 dark:border-emerald-500/20 bg-emerald-50/70 dark:bg-emerald-500/[0.06] px-3 py-2">
      <p className="text-xs text-emerald-800 dark:text-emerald-200">
        {remaining.length} previews ready
      </p>
      <Button
        type="button"
        size="sm"
        variant="primary"
        disabled={isLoading}
        onClick={handleApplyAll}
        className="h-8 px-3 text-xs"
      >
        {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
        Apply all
      </Button>
    </div>
  );
}
