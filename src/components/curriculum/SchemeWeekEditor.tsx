'use client';

import { useMemo, useState } from 'react';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronUp,
  GripVertical,
  Plus,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ConfirmModal } from '@/components/ui/Modal';
import { cn } from '@/lib/utils';
import type { CurriculumItem } from '@/lib/store/api/schoolAdminApi';
import { coverageFromPlanVsCalendar } from '@/lib/curriculum/calendar-coverage';

export const DRAFT_WEEK_PREFIX = 'draft:';

function newDraftId() {
  return `${DRAFT_WEEK_PREFIX}${crypto.randomUUID()}`;
}

export function isPersistedWeekId(id: string) {
  return Boolean(id) && !id.startsWith(DRAFT_WEEK_PREFIX);
}

export function blankContentWeek(curriculumId: string): CurriculumItem {
  return {
    id: newDraftId(),
    curriculumId,
    weekNumber: 0,
    topic: '',
    subTopics: [],
    objectives: [],
    activities: [],
    resources: [],
    assessment: null,
    order: 0,
    isCustomized: true,
    originalTopic: null,
    status: 'PENDING',
    taughtAt: null,
    teacherNotes: null,
    completedBy: null,
    createdAt: '',
    updatedAt: '',
    isCatchUp: false,
    outsideCalendar: false,
  };
}

function linesToList(value: string) {
  return value
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
}

function SortableContentWeek({
  item,
  weekNumber,
  outsideCalendar,
  isExpanded,
  canDelete,
  onToggle,
  onChange,
  onInsertAbove,
  onInsertBelow,
  onDelete,
  onMoveUp,
  onMoveDown,
}: {
  item: CurriculumItem;
  weekNumber: number;
  outsideCalendar: boolean;
  isExpanded: boolean;
  canDelete: boolean;
  onToggle: () => void;
  onChange: (patch: Partial<CurriculumItem>) => void;
  onInsertAbove: () => void;
  onInsertBelow: () => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'border-l-4 rounded-lg overflow-hidden border-agora-blue/40 bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border',
        isDragging && 'opacity-70 shadow-lg z-10',
      )}
    >
      <div className="flex items-center gap-2 p-3">
        <button
          type="button"
          className="shrink-0 p-1 text-light-text-muted hover:text-agora-blue cursor-grab active:cursor-grabbing"
          aria-label={`Drag week ${weekNumber}`}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onToggle}
          className="flex-1 flex items-center gap-3 text-left min-w-0"
        >
          <div className="flex-shrink-0 w-10 h-10 rounded-lg border border-light-border dark:border-dark-border bg-[var(--light-card)] dark:bg-[var(--dark-surface)] flex items-center justify-center">
            <span className="text-xs font-bold text-light-text-primary dark:text-dark-text-primary">
              W{weekNumber}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-light-text-primary dark:text-dark-text-primary truncate">
              {item.topic || 'Untitled topic'}
            </p>
            {outsideCalendar && (
              <span className="mt-1 inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-light-surface dark:bg-dark-surface text-light-text-muted border border-light-border dark:border-dark-border">
                Outside this term calendar
              </span>
            )}
          </div>
          {isExpanded ? (
            <ChevronUp className="h-4 w-5 text-light-text-muted" />
          ) : (
            <ChevronDown className="h-4 w-5 text-light-text-muted" />
          )}
        </button>
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            type="button"
            onClick={onMoveUp}
            className="p-1.5 rounded-md text-light-text-muted hover:text-agora-blue hover:bg-agora-blue/10"
            aria-label="Move week up"
          >
            <ArrowUp className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            className="p-1.5 rounded-md text-light-text-muted hover:text-agora-blue hover:bg-agora-blue/10"
            aria-label="Move week down"
          >
            <ArrowDown className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-light-border dark:border-dark-border">
          <label className="block pt-3">
            <span className="text-[10px] font-bold uppercase tracking-widest text-light-text-muted">
              Topic
            </span>
            <input
              value={item.topic}
              onChange={(e) => onChange({ topic: e.target.value })}
              className="mt-1 w-full px-3 py-1.5 text-sm border border-light-border dark:border-dark-border rounded-lg bg-[var(--light-input)] dark:bg-[var(--dark-input)]"
              placeholder="Week topic"
            />
          </label>
          <label className="block">
            <span className="text-[10px] font-bold uppercase tracking-widest text-light-text-muted">
              Sub-topics (one per line)
            </span>
            <textarea
              value={(item.subTopics || []).join('\n')}
              onChange={(e) => onChange({ subTopics: linesToList(e.target.value) })}
              rows={2}
              className="mt-1 w-full px-3 py-1.5 text-sm border border-light-border dark:border-dark-border rounded-lg bg-[var(--light-input)] dark:bg-[var(--dark-input)]"
            />
          </label>
          <label className="block">
            <span className="text-[10px] font-bold uppercase tracking-widest text-light-text-muted">
              Objectives (one per line)
            </span>
            <textarea
              value={(item.objectives || []).join('\n')}
              onChange={(e) => onChange({ objectives: linesToList(e.target.value) })}
              rows={3}
              className="mt-1 w-full px-3 py-1.5 text-sm border border-light-border dark:border-dark-border rounded-lg bg-[var(--light-input)] dark:bg-[var(--dark-input)]"
            />
          </label>
          <label className="block">
            <span className="text-[10px] font-bold uppercase tracking-widest text-light-text-muted">
              Activities (one per line)
            </span>
            <textarea
              value={(item.activities || []).join('\n')}
              onChange={(e) => onChange({ activities: linesToList(e.target.value) })}
              rows={2}
              className="mt-1 w-full px-3 py-1.5 text-sm border border-light-border dark:border-dark-border rounded-lg bg-[var(--light-input)] dark:bg-[var(--dark-input)]"
            />
          </label>
          <label className="block">
            <span className="text-[10px] font-bold uppercase tracking-widest text-light-text-muted">
              Resources (one per line)
            </span>
            <textarea
              value={(item.resources || []).join('\n')}
              onChange={(e) => onChange({ resources: linesToList(e.target.value) })}
              rows={2}
              className="mt-1 w-full px-3 py-1.5 text-sm border border-light-border dark:border-dark-border rounded-lg bg-[var(--light-input)] dark:bg-[var(--dark-input)]"
            />
          </label>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Button variant="outline" size="xs" onClick={onInsertAbove}>
              <Plus className="h-3 w-3" />
              Insert above
            </Button>
            <Button variant="outline" size="xs" onClick={onInsertBelow}>
              <Plus className="h-3 w-3" />
              Insert below
            </Button>
            <Button
              variant="outline"
              size="xs"
              onClick={onDelete}
              disabled={!canDelete}
              className="text-red-600 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-800"
            >
              <Trash2 className="h-3 w-3" />
              Delete week
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export function SchemeWeekEditor({
  curriculumId,
  contentWeeks,
  instructionalWeeks,
  onChange,
}: {
  curriculumId: string;
  contentWeeks: CurriculumItem[];
  instructionalWeeks: number;
  onChange: (next: CurriculumItem[]) => void;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const coverage = coverageFromPlanVsCalendar(instructionalWeeks, contentWeeks.length);
  const catchUpCount = coverage.bufferWeeks;

  const insertAt = (index: number) => {
    const next = [...contentWeeks];
    const blank = blankContentWeek(curriculumId);
    next.splice(index, 0, blank);
    onChange(next);
    setExpandedId(blank.id);
  };

  const fillThrough = (weekNumber: number) => {
    const next = [...contentWeeks];
    let lastId = expandedId;
    while (next.length < weekNumber) {
      const blank = blankContentWeek(curriculumId);
      next.push(blank);
      lastId = blank.id;
    }
    onChange(next);
    setExpandedId(lastId);
  };

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = contentWeeks.findIndex((w) => w.id === active.id);
    const to = contentWeeks.findIndex((w) => w.id === over.id);
    if (from < 0 || to < 0) return;
    onChange(arrayMove(contentWeeks, from, to));
  };

  const ids = useMemo(() => contentWeeks.map((w) => w.id), [contentWeeks]);

  return (
    <div className="space-y-3">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          {contentWeeks.map((item, index) => {
            const weekNumber = index + 1;
            return (
              <SortableContentWeek
                key={item.id}
                item={item}
                weekNumber={weekNumber}
                outsideCalendar={instructionalWeeks > 0 && weekNumber > instructionalWeeks}
                isExpanded={expandedId === item.id}
                canDelete={contentWeeks.length > 1}
                onToggle={() => setExpandedId(expandedId === item.id ? null : item.id)}
                onChange={(patch) => {
                  const next = [...contentWeeks];
                  next[index] = { ...item, ...patch };
                  onChange(next);
                }}
                onInsertAbove={() => insertAt(index)}
                onInsertBelow={() => insertAt(index + 1)}
                onDelete={() => setDeleteIndex(index)}
                onMoveUp={() => {
                  if (index === 0) return;
                  onChange(arrayMove(contentWeeks, index, index - 1));
                }}
                onMoveDown={() => {
                  if (index >= contentWeeks.length - 1) return;
                  onChange(arrayMove(contentWeeks, index, index + 1));
                }}
              />
            );
          })}
        </SortableContext>
      </DndContext>

      {Array.from({ length: catchUpCount }, (_, i) => {
        const weekNumber = contentWeeks.length + i + 1;
        return (
          <div
            key={`catch-up-${weekNumber}`}
            className="rounded-lg border border-dashed border-slate-300 dark:border-slate-600 bg-slate-100/80 dark:bg-slate-900/40 px-4 py-3 flex items-center gap-3 opacity-70"
          >
            <div className="flex-shrink-0 w-10 h-10 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-200 dark:bg-slate-800 flex items-center justify-center">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">W{weekNumber}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-slate-500 dark:text-slate-400">
                Catch-up / revision
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500">Leftover calendar time — not a curriculum topic</p>
            </div>
            <Button variant="outline" size="xs" onClick={() => fillThrough(weekNumber)}>
              <Plus className="h-3 w-3" />
              Add topic here
            </Button>
          </div>
        );
      })}

      <Button variant="outline" size="sm" className="h-8" onClick={() => insertAt(contentWeeks.length)}>
        <Plus className="h-3.5 w-3.5" />
        Add week
      </Button>

      <ConfirmModal
        isOpen={deleteIndex !== null}
        onClose={() => setDeleteIndex(null)}
        title="Delete this week?"
        message="Later weeks will shift up. Leftover calendar slots become catch-up again."
        confirmText="Delete week"
        variant="danger"
        onConfirm={() => {
          if (deleteIndex === null) return;
          onChange(contentWeeks.filter((_, i) => i !== deleteIndex));
          setDeleteIndex(null);
        }}
      />
    </div>
  );
}
