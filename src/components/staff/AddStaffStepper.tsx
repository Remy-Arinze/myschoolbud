'use client';

import { Check } from 'lucide-react';

interface AddStaffStepperProps {
  steps: string[];
  /** 1-based. */
  current: number;
  /** Jump back to an earlier step. Forward is gated by the form. */
  onStepClick?: (step: number) => void;
}

/**
 * Where you are in adding someone.
 *
 * The form used to be one long card, so the decision that matters — what this
 * person can reach — sat below the fold behind eight identity fields, half of
 * them optional.
 */
export function AddStaffStepper({ steps, current, onStepClick }: AddStaffStepperProps) {
  if (steps.length < 2) return null;

  return (
    <ol className="mb-6 flex items-center gap-2" aria-label="Progress">
      {steps.map((label, index) => {
        const step = index + 1;
        const isDone = step < current;
        const isCurrent = step === current;
        const canGoBack = isDone && !!onStepClick;

        return (
          <li key={label} className="flex flex-1 items-center gap-2">
            <button
              type="button"
              onClick={canGoBack ? () => onStepClick(step) : undefined}
              disabled={!canGoBack}
              aria-current={isCurrent ? 'step' : undefined}
              className={`flex items-center gap-2 rounded-lg px-2 py-1 text-left transition-colors ${
                canGoBack ? 'hover:bg-light-bg dark:hover:bg-dark-bg' : 'cursor-default'
              }`}
            >
              <span
                className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                  isDone
                    ? 'bg-blue-600 text-white'
                    : isCurrent
                      ? 'bg-blue-100 text-blue-700 ring-2 ring-blue-500 dark:bg-blue-900/40 dark:text-blue-300'
                      : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                }`}
              >
                {isDone ? <Check className="h-3.5 w-3.5" /> : step}
              </span>
              <span
                className={`hidden text-sm sm:inline ${
                  isCurrent
                    ? 'font-medium text-light-text-primary dark:text-dark-text-primary'
                    : 'text-light-text-secondary dark:text-dark-text-secondary'
                }`}
              >
                {label}
              </span>
            </button>
            {step < steps.length && (
              <span
                aria-hidden
                className={`h-px flex-1 ${
                  isDone ? 'bg-blue-500' : 'bg-light-border dark:bg-dark-border'
                }`}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
