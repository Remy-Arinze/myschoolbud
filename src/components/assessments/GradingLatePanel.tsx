'use client';

import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Clock, Timer, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GradingLatePanelProps {
  isLateDue: boolean;
  isLateTimer: boolean;
  isAutoSubmitted: boolean;
  applyLateDueDeduction: boolean;
  applyLateTimerDeduction: boolean;
  lateDueDeductionAmount: number;
  lateTimerDeductionAmount: number;
  suggestedLateDue: number;
  suggestedLateTimer: number;
  onApplyLateDueChange: (apply: boolean) => void;
  onApplyLateTimerChange: (apply: boolean) => void;
  onLateDueAmountChange: (amount: number) => void;
  onLateTimerAmountChange: (amount: number) => void;
  className?: string;
}

export function LateSubmissionBadges({
  isLateDue,
  isLateTimer,
  isAutoSubmitted,
  className,
}: Pick<GradingLatePanelProps, 'isLateDue' | 'isLateTimer' | 'isAutoSubmitted' | 'className'>) {
  if (!isLateDue && !isLateTimer && !isAutoSubmitted) return null;

  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {isLateDue && (
        <Badge variant="danger" className="text-[10px] uppercase font-bold tracking-wider gap-1">
          <Clock className="h-3 w-3" />
          Late Due
        </Badge>
      )}
      {isLateTimer && (
        <Badge variant="danger" className="text-[10px] uppercase font-bold tracking-wider gap-1">
          <Timer className="h-3 w-3" />
          Late Timer
        </Badge>
      )}
      {isAutoSubmitted && (
        <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider gap-1 border-amber-300 text-amber-700 dark:text-amber-300">
          <Zap className="h-3 w-3" />
          Auto-submitted
        </Badge>
      )}
    </div>
  );
}

export function GradingLatePanel({
  isLateDue,
  isLateTimer,
  isAutoSubmitted,
  applyLateDueDeduction,
  applyLateTimerDeduction,
  lateDueDeductionAmount,
  lateTimerDeductionAmount,
  suggestedLateDue,
  suggestedLateTimer,
  onApplyLateDueChange,
  onApplyLateTimerChange,
  onLateDueAmountChange,
  onLateTimerAmountChange,
  className,
}: GradingLatePanelProps) {
  if (!isLateDue && !isLateTimer && !isAutoSubmitted) return null;

  return (
    <div className={cn('space-y-3 rounded-xl border border-amber-200 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-900/10 p-4', className)}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-black uppercase tracking-widest text-amber-800 dark:text-amber-300">
          Late Submission
        </p>
        <LateSubmissionBadges isLateDue={isLateDue} isLateTimer={isLateTimer} isAutoSubmitted={isAutoSubmitted} />
      </div>

      {isLateDue && (
        <div className="space-y-2 rounded-lg border border-amber-100 dark:border-amber-900/30 bg-white/70 dark:bg-black/20 p-3">
          <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-dark-text-primary cursor-pointer">
            <input
              type="checkbox"
              checked={applyLateDueDeduction}
              onChange={(e) => onApplyLateDueChange(e.target.checked)}
              className="rounded border-slate-300"
            />
            Deduct points for late due-date submission
          </label>
          {applyLateDueDeduction && (
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={0}
                step={0.5}
                value={lateDueDeductionAmount}
                onChange={(e) => onLateDueAmountChange(Math.max(0, Number(e.target.value) || 0))}
                className="h-9 w-24 text-center font-bold"
              />
              <span className="text-xs text-slate-500">
                pts {suggestedLateDue > 0 ? `(suggested: ${suggestedLateDue})` : ''}
              </span>
            </div>
          )}
        </div>
      )}

      {isLateTimer && (
        <div className="space-y-2 rounded-lg border border-amber-100 dark:border-amber-900/30 bg-white/70 dark:bg-black/20 p-3">
          <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-dark-text-primary cursor-pointer">
            <input
              type="checkbox"
              checked={applyLateTimerDeduction}
              onChange={(e) => onApplyLateTimerChange(e.target.checked)}
              className="rounded border-slate-300"
            />
            Deduct points for late timer submission
          </label>
          {applyLateTimerDeduction && (
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={0}
                step={0.5}
                value={lateTimerDeductionAmount}
                onChange={(e) => onLateTimerAmountChange(Math.max(0, Number(e.target.value) || 0))}
                className="h-9 w-24 text-center font-bold"
              />
              <span className="text-xs text-slate-500">
                pts {suggestedLateTimer > 0 ? `(suggested: ${suggestedLateTimer})` : ''}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function GradingScoreBreakdown({
  rawScore,
  integrityDeduction,
  lateDueDeduction,
  lateTimerDeduction,
  finalScore,
  maxScore,
}: {
  rawScore: number;
  integrityDeduction: number;
  lateDueDeduction: number;
  lateTimerDeduction: number;
  finalScore: number;
  maxScore: number;
}) {
  const totalDeductions = integrityDeduction + lateDueDeduction + lateTimerDeduction;

  return (
    <div className="space-y-3">
      <div className="text-center">
        <p className="text-[10px] font-black text-slate-400 dark:text-light-text-muted uppercase tracking-widest mb-1">
          Final Score
        </p>
        <div className="flex items-baseline justify-center gap-2">
          <span className="text-6xl font-black text-slate-900 dark:text-blue-400 tracking-tighter">{finalScore}</span>
          <span className="text-xl font-bold text-slate-400 dark:text-light-text-muted">/ {maxScore}</span>
        </div>
      </div>
      <div className="space-y-1.5 text-xs font-medium text-slate-600 dark:text-dark-text-secondary border-t border-slate-100 dark:border-dark-border pt-3">
        <div className="flex justify-between">
          <span>Question total</span>
          <span className="font-bold">{rawScore}</span>
        </div>
        {integrityDeduction > 0 && (
          <div className="flex justify-between text-red-600 dark:text-red-400">
            <span>Integrity deduction</span>
            <span className="font-bold">-{integrityDeduction}</span>
          </div>
        )}
        {lateDueDeduction > 0 && (
          <div className="flex justify-between text-amber-700 dark:text-amber-400">
            <span>Late due deduction</span>
            <span className="font-bold">-{lateDueDeduction}</span>
          </div>
        )}
        {lateTimerDeduction > 0 && (
          <div className="flex justify-between text-amber-700 dark:text-amber-400">
            <span>Late timer deduction</span>
            <span className="font-bold">-{lateTimerDeduction}</span>
          </div>
        )}
        {totalDeductions > 0 && (
          <div className="flex justify-between pt-1 border-t border-dashed border-slate-200 dark:border-dark-border font-bold">
            <span>Total deductions</span>
            <span className="text-red-600 dark:text-red-400">-{totalDeductions}</span>
          </div>
        )}
      </div>
    </div>
  );
}
