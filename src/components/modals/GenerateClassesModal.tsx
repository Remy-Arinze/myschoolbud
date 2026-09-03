'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2, Minus, Plus } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { cn } from '@/lib/utils';
import {
  MAX_CLASS_ARMS,
  buildDefaultArmNames,
  resizeArmNames,
} from '@/lib/academic/classArmNames';

type NamingMode = 'default' | 'custom';

interface GenerateClassesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (armNames: string[]) => Promise<void>;
  isGenerating?: boolean;
  schoolType?: 'PRIMARY' | 'SECONDARY' | 'TERTIARY' | null;
  preferredArmNames?: string[];
}

function levelsLabel(schoolType?: GenerateClassesModalProps['schoolType']) {
  if (schoolType === 'PRIMARY') return 'Primary 1–6';
  if (schoolType === 'SECONDARY') return 'JSS 1–3 and SS 1–3';
  if (schoolType === 'TERTIARY') return 'Year 1–4';
  return 'each class level';
}

export function GenerateClassesModal({
  isOpen,
  onClose,
  onConfirm,
  isGenerating = false,
  schoolType,
  preferredArmNames,
}: GenerateClassesModalProps) {
  const fallbackDefaults = useMemo(
    () => buildDefaultArmNames(3, preferredArmNames),
    [preferredArmNames],
  );

  const [armCount, setArmCount] = useState(fallbackDefaults.length || 3);
  const [naming, setNaming] = useState<NamingMode>('default');
  const [customNames, setCustomNames] = useState<string[]>(fallbackDefaults);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const initial = buildDefaultArmNames(preferredArmNames?.length || 3, preferredArmNames);
    setArmCount(initial.length);
    setNaming('default');
    setCustomNames(initial);
    setError(null);
    // Snapshot settings at open so a late fetch doesn't wipe in-progress choices.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const defaultNames = useMemo(
    () => buildDefaultArmNames(armCount, preferredArmNames),
    [armCount, preferredArmNames],
  );
  const resolvedNames = naming === 'default' ? defaultNames : customNames;

  const setCount = (next: number) => {
    const count = Math.min(MAX_CLASS_ARMS, Math.max(1, next));
    setArmCount(count);
    setCustomNames((prev) => resizeArmNames(prev, count, preferredArmNames));
    setError(null);
  };

  const handleConfirm = async () => {
    const names = resolvedNames.map((n) => n.trim()).filter(Boolean);
    if (names.length !== armCount) {
      setError('Give every arm a name, or switch back to default naming.');
      return;
    }
    const unique = new Set(names.map((n) => n.toLowerCase()));
    if (unique.size !== names.length) {
      setError('Arm names must be unique.');
      return;
    }
    setError(null);
    await onConfirm(names);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Auto-generate classes"
      size="md"
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose} disabled={isGenerating}>
            Cancel
          </Button>
          <Button variant="primary" onClick={() => void handleConfirm()} disabled={isGenerating}>
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              'Generate'
            )}
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        <p className="text-light-text-secondary dark:text-neutral-300" style={{ fontSize: 'var(--text-body)' }}>
          This creates {levelsLabel(schoolType)}, each with the same set of class arms.
        </p>

        <div>
          <p className="text-sm font-medium text-light-text-primary dark:text-dark-text-primary mb-2">
            Arms per class
          </p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setCount(armCount - 1)}
              disabled={isGenerating || armCount <= 1}
              className="h-9 w-9 rounded-lg border border-light-border dark:border-white/15 flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-40"
              aria-label="Fewer arms"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="min-w-[2ch] text-center text-lg font-semibold tabular-nums text-light-text-primary dark:text-dark-text-primary">
              {armCount}
            </span>
            <button
              type="button"
              onClick={() => setCount(armCount + 1)}
              disabled={isGenerating || armCount >= MAX_CLASS_ARMS}
              className="h-9 w-9 rounded-lg border border-light-border dark:border-white/15 flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-40"
              aria-label="More arms"
            >
              <Plus className="h-4 w-4" />
            </button>
            <span className="text-light-text-muted dark:text-neutral-400" style={{ fontSize: 'var(--text-small)' }}>
              {armCount === 1 ? '1 arm' : `${armCount} arms`} on every level
            </span>
          </div>
        </div>

        <div>
          <p className="text-sm font-medium text-light-text-primary dark:text-dark-text-primary mb-2">
            Arm names
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setNaming('default');
                setError(null);
              }}
              disabled={isGenerating}
              className={cn(
                'rounded-lg border px-3 py-2.5 text-left transition-colors',
                naming === 'default'
                  ? 'border-[var(--agora-blue)] bg-[var(--agora-blue)]/10'
                  : 'border-light-border dark:border-white/15 hover:bg-black/5 dark:hover:bg-white/5',
              )}
            >
              <span className="block font-medium text-light-text-primary dark:text-dark-text-primary">
                Default
              </span>
              <span className="block mt-0.5 text-light-text-muted dark:text-neutral-400" style={{ fontSize: 'var(--text-small)' }}>
                {defaultNames.join(', ')}
              </span>
            </button>
            <button
              type="button"
              onClick={() => {
                setNaming('custom');
                setCustomNames((prev) => (prev.length === armCount ? prev : resizeArmNames(prev, armCount, preferredArmNames)));
                setError(null);
              }}
              disabled={isGenerating}
              className={cn(
                'rounded-lg border px-3 py-2.5 text-left transition-colors',
                naming === 'custom'
                  ? 'border-[var(--agora-blue)] bg-[var(--agora-blue)]/10'
                  : 'border-light-border dark:border-white/15 hover:bg-black/5 dark:hover:bg-white/5',
              )}
            >
              <span className="block font-medium text-light-text-primary dark:text-dark-text-primary">
                Custom
              </span>
              <span className="block mt-0.5 text-light-text-muted dark:text-neutral-400" style={{ fontSize: 'var(--text-small)' }}>
                Type each arm name
              </span>
            </button>
          </div>
        </div>

        {naming === 'custom' ? (
          <div className="grid grid-cols-2 gap-3">
            {customNames.map((name, index) => (
              <Input
                key={index}
                label={`Arm ${index + 1}`}
                value={name}
                maxLength={40}
                placeholder={defaultNames[index] || `Arm ${index + 1}`}
                disabled={isGenerating}
                onChange={(e) => {
                  const next = [...customNames];
                  next[index] = e.target.value;
                  setCustomNames(next);
                  setError(null);
                }}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {defaultNames.map((name) => (
              <span
                key={name}
                className="px-2.5 py-1 rounded-md bg-black/5 dark:bg-white/10 text-light-text-primary dark:text-dark-text-primary"
                style={{ fontSize: 'var(--text-small)' }}
              >
                {name}
              </span>
            ))}
          </div>
        )}

        {error ? (
          <p className="text-sm text-red-600 dark:text-red-300">{error}</p>
        ) : null}
      </div>
    </Modal>
  );
}
