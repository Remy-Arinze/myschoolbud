'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { SearchInput } from '@/components/ui/SearchInput';
import { usePreviewAutoGenerateSubjectsQuery } from '@/lib/store/api/schoolAdminApi';

interface GenerateSubjectsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (agoraSubjectIds: string[]) => Promise<void>;
  isGenerating?: boolean;
  schoolId?: string;
  schoolType?: 'PRIMARY' | 'SECONDARY' | null;
  schoolTypeLabel: string;
}

export function GenerateSubjectsModal({
  isOpen,
  onClose,
  onConfirm,
  isGenerating = false,
  schoolId,
  schoolType,
  schoolTypeLabel,
}: GenerateSubjectsModalProps) {
  const canFetch = Boolean(isOpen && schoolId && (schoolType === 'PRIMARY' || schoolType === 'SECONDARY'));
  const { data, isLoading, isError, refetch } = usePreviewAutoGenerateSubjectsQuery(
    { schoolId: schoolId || '', schoolType: (schoolType as 'PRIMARY' | 'SECONDARY') || 'PRIMARY' },
    { skip: !canFetch },
  );

  const catalog = data?.data?.subjects ?? [];
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setSelectedIds([]);
      return;
    }
    if (!data?.data?.subjects) return;
    setSelectedIds(data.data.subjects.map((s) => s.id));
  }, [isOpen, data?.data?.subjects]);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const remaining = catalog.filter((s) => selectedSet.has(s.id));
    if (!q) return remaining;
    return remaining.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.code && s.code.toLowerCase().includes(q)),
    );
  }, [catalog, selectedSet, query]);

  const removedCount = catalog.length - selectedIds.length;

  const handleConfirm = async () => {
    if (selectedIds.length === 0) return;
    await onConfirm(selectedIds);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Auto-generate subjects"
      size="md"
      contentClassName="p-6 pt-0"
      footer={
        <div className="flex items-center justify-between gap-3">
          <p className="text-light-text-muted dark:text-neutral-400" style={{ fontSize: 'var(--text-small)' }}>
            {selectedIds.length} selected
            {removedCount > 0 ? ` · ${removedCount} removed` : ''}
          </p>
          <div className="flex gap-3">
            <Button variant="ghost" onClick={onClose} disabled={isGenerating}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => void handleConfirm()}
              disabled={isGenerating || isLoading || selectedIds.length === 0}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                `Generate subjects`
              )}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4 pt-6">
        <p className="text-light-text-secondary dark:text-neutral-300" style={{ fontSize: 'var(--text-body)' }}>
          Standard {schoolTypeLabel} subjects from the library. Remove any you do not need before generating.
        </p>

        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search subjects..."
          size="sm"
        />

        {removedCount > 0 ? (
          <button
            type="button"
            className="text-[var(--agora-blue)] font-medium hover:underline"
            style={{ fontSize: 'var(--text-small)' }}
            disabled={isGenerating}
            onClick={() => setSelectedIds(catalog.map((s) => s.id))}
          >
            Restore removed subjects
          </button>
        ) : null}

        <div className="max-h-[min(50vh,22rem)] overflow-y-auto rounded-lg border border-light-border dark:border-white/15 divide-y divide-light-border dark:divide-white/10">
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-[var(--agora-blue)]" />
            </div>
          ) : isError ? (
            <div className="px-4 py-8 text-center">
              <p className="text-sm text-red-600 dark:text-red-300">Could not load the subject list.</p>
              <button
                type="button"
                className="mt-2 text-[var(--agora-blue)] text-sm font-medium hover:underline"
                onClick={() => void refetch()}
              >
                Try again
              </button>
            </div>
          ) : catalog.length === 0 ? (
            <p className="px-4 py-8 text-center text-light-text-muted dark:text-neutral-400" style={{ fontSize: 'var(--text-body)' }}>
              All standard subjects for this type are already in the school.
            </p>
          ) : visible.length === 0 ? (
            <p className="px-4 py-8 text-center text-light-text-muted dark:text-neutral-400" style={{ fontSize: 'var(--text-body)' }}>
              {selectedIds.length === 0
                ? 'You removed every subject. Restore the list or cancel.'
                : 'No matching subjects in the current selection.'}
            </p>
          ) : (
            visible.map((subject) => (
              <div key={subject.id} className="flex items-center gap-3 px-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-light-text-primary dark:text-dark-text-primary truncate">
                    {subject.name}
                  </p>
                  <p className="text-light-text-muted dark:text-neutral-400" style={{ fontSize: 'var(--text-small)' }}>
                    {[subject.code, subject.category].filter(Boolean).join(' · ')}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label={`Remove ${subject.name}`}
                  disabled={isGenerating}
                  onClick={() => setSelectedIds((prev) => prev.filter((id) => id !== subject.id))}
                  className="h-8 w-8 shrink-0 rounded-md flex items-center justify-center text-light-text-muted hover:text-red-600 dark:hover:text-red-300 hover:bg-black/5 dark:hover:bg-white/5"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </Modal>
  );
}
