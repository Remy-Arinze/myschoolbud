'use client';

import { useState, useMemo, useEffect, useRef, useLayoutEffect, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import { TimeInput } from '@/components/ui/TimeInput';
import { X, Save, Loader2, Plus, ChevronDown, Trash2 } from 'lucide-react';
import { FadeInUp } from '@/components/ui/FadeInUp';
import { LoisOrb } from '@/components/ai/LoisOrb';
import {
  type TimetablePeriod,
  type DayOfWeek,
} from '@/lib/store/api/schoolAdminApi';
import { DEFAULT_WORKING_DAYS } from '@/lib/calendar/instructionalDays';
import { useAutoGenerateTimetable } from '@/hooks/useAutoGenerateTimetable';
import { BodyPortal } from '@/components/ui/BodyPortal';

const FALLBACK_DAYS: DayOfWeek[] = [...DEFAULT_WORKING_DAYS];
const DAY_LABELS: Record<DayOfWeek, string> = {
  MONDAY: 'Mon',
  TUESDAY: 'Tue',
  WEDNESDAY: 'Wed',
  THURSDAY: 'Thu',
  FRIDAY: 'Fri',
  SATURDAY: 'Sat',
  SUNDAY: 'Sun',
};

type ActionType = 'BREAK' | 'LUNCH' | 'ASSEMBLY';
type PeriodType = 'LESSON' | ActionType;

interface EditablePeriod {
  id?: string;
  slotId: string;
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  subjectId?: string;
  courseId?: string;
  teacherId?: string;
  type: PeriodType;
}

interface SlotRow {
  slotId: string;
  startTime: string;
  endTime: string;
  type: PeriodType;
}

interface EditableTimetableTableProps {
  timetable: TimetablePeriod[];
  subjects: Array<{ id: string; name: string; code?: string }>;
  courses: Array<{ id: string; name: string; code?: string }>;
  schoolType: 'PRIMARY' | 'SECONDARY' | 'TERTIARY' | null;
  workingDays?: DayOfWeek[];
  onSave: (periods: Omit<EditablePeriod, 'slotId'>[]) => Promise<void>;
  onClose: () => void;
  isLoading?: boolean;
}

let slotSeq = 0;
function nextSlotId() {
  slotSeq += 1;
  return `slot-${slotSeq}`;
}

function toMinutes(t: string) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function fromMinutes(total: number) {
  const clamped = Math.max(0, Math.min(23 * 60 + 59, total));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function addMinutes(time: string, delta: number): string | null {
  const next = toMinutes(time) + delta;
  if (next < 0 || next > 23 * 60 + 59) return null;
  return fromMinutes(next);
}

function durationOf(start: string, end: string) {
  return toMinutes(end) - toMinutes(start);
}

function formatRange(start: string, end: string) {
  return `${start}–${end}`;
}

function slotKind(type?: string): PeriodType {
  return type === 'BREAK' || type === 'LUNCH' || type === 'ASSEMBLY' ? type : 'LESSON';
}

function defaultDuration(type: PeriodType, schoolType: EditableTimetableTableProps['schoolType']) {
  if (schoolType === 'PRIMARY') {
    if (type === 'ASSEMBLY') return 15;
    if (type === 'BREAK') return 40;
    if (type === 'LUNCH') return 30;
    return 40;
  }
  if (schoolType === 'TERTIARY') {
    if (type === 'ASSEMBLY') return 15;
    if (type === 'BREAK') return 30;
    if (type === 'LUNCH') return 60;
    return 60;
  }
  if (type === 'ASSEMBLY') return 15;
  if (type === 'BREAK') return 30;
  if (type === 'LUNCH') return 45;
  return 45;
}

function typeLabel(type: PeriodType) {
  if (type === 'BREAK') return 'Break';
  if (type === 'LUNCH') return 'Lunch';
  if (type === 'ASSEMBLY') return 'Assembly';
  return 'Lesson';
}

type HydratePeriod = {
  id?: string;
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  type?: string;
  subjectId?: string;
  courseId?: string;
  teacherId?: string;
};

function hydratePeriods(timetable: HydratePeriod[]): EditablePeriod[] {
  const groups = new Map<string, HydratePeriod[]>();
  for (const period of timetable) {
    const kind = slotKind(period.type);
    const key = `${period.startTime}|${period.endTime}|${kind}`;
    const list = groups.get(key) ?? [];
    list.push(period);
    groups.set(key, list);
  }

  const result: EditablePeriod[] = [];
  for (const [, group] of groups) {
    const slotId = nextSlotId();
    for (const period of group) {
      result.push({
        id: period.id,
        slotId,
        dayOfWeek: period.dayOfWeek,
        startTime: period.startTime,
        endTime: period.endTime,
        subjectId: period.subjectId || undefined,
        courseId: period.courseId || undefined,
        teacherId: period.teacherId || undefined,
        type: slotKind(period.type),
      });
    }
  }
  return result;
}

function buildRows(periods: EditablePeriod[]): SlotRow[] {
  const seen = new Map<string, SlotRow>();
  for (const period of periods) {
    if (!seen.has(period.slotId)) {
      seen.set(period.slotId, {
        slotId: period.slotId,
        startTime: period.startTime,
        endTime: period.endTime,
        type: period.type,
      });
    }
  }
  return Array.from(seen.values()).sort((a, b) => {
    const start = a.startTime.localeCompare(b.startTime);
    if (start !== 0) return start;
    return a.endTime.localeCompare(b.endTime);
  });
}

function shiftSlots(periods: EditablePeriod[], slotIds: Set<string>, delta: number): EditablePeriod[] | null {
  if (delta === 0 || slotIds.size === 0) return periods;
  const next: EditablePeriod[] = [];
  for (const period of periods) {
    if (!slotIds.has(period.slotId)) {
      next.push(period);
      continue;
    }
    const start = addMinutes(period.startTime, delta);
    const end = addMinutes(period.endTime, delta);
    if (!start || !end) return null;
    next.push({ ...period, startTime: start, endTime: end });
  }
  return next;
}

function collectErrors(rows: SlotRow[]) {
  const errors: string[] = [];
  const seen = new Set<string>();
  const push = (msg: string) => {
    if (seen.has(msg)) return;
    seen.add(msg);
    errors.push(msg);
  };

  for (const row of rows) {
    const label = formatRange(row.startTime, row.endTime);
    if (row.startTime >= row.endTime) {
      push(`${label}: start must be before end`);
      continue;
    }
    const mins = durationOf(row.startTime, row.endTime);
    if (row.type === 'LESSON' && mins < 20) {
      push(`${label}: lesson periods must be at least 20 minutes`);
    } else if (row.type !== 'LESSON' && mins < 5) {
      push(`${label}: ${typeLabel(row.type).toLowerCase()} must be at least 5 minutes`);
    }
  }

  const valid = rows.filter((row) => row.startTime < row.endTime);
  for (let i = 0; i < valid.length; i++) {
    for (let j = i + 1; j < valid.length; j++) {
      const a = valid[i];
      const b = valid[j];
      const same = a.startTime === b.startTime && a.endTime === b.endTime;
      const overlaps =
        toMinutes(a.endTime) > toMinutes(b.startTime) && toMinutes(b.endTime) > toMinutes(a.startTime);
      if (same) {
        push(`Duplicate slot at ${formatRange(a.startTime, a.endTime)}`);
      } else if (overlaps) {
        push(`${formatRange(a.startTime, a.endTime)} overlaps ${formatRange(b.startTime, b.endTime)}`);
      }
    }
  }

  return errors;
}

export function EditableTimetableTable({
  timetable,
  subjects,
  courses,
  schoolType,
  workingDays,
  onSave,
  onClose,
  isLoading = false,
}: EditableTimetableTableProps) {
  const DAYS = workingDays?.length ? workingDays : FALLBACK_DAYS;

  const [editablePeriods, setEditablePeriods] = useState<EditablePeriod[]>(() => hydratePeriods(timetable));
  const initialPeriodsRef = useRef(hydratePeriods(timetable));

  const [showAutoGenerateModal, setShowAutoGenerateModal] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const { generateTimetable, canGenerate } = useAutoGenerateTimetable({
    schoolType,
    subjects,
    courses,
    existingPeriods: editablePeriods,
    workingDays: DAYS,
  });

  const rows = useMemo(() => buildRows(editablePeriods), [editablePeriods]);
  const validationErrors = useMemo(() => collectErrors(rows), [rows]);

  const isDirty = useMemo(() => {
    const initial = initialPeriodsRef.current;
    if (editablePeriods.length !== initial.length) return true;
    const key = (p: EditablePeriod) =>
      `${p.dayOfWeek}|${p.startTime}|${p.endTime}|${p.subjectId ?? ''}|${p.courseId ?? ''}|${p.teacherId ?? ''}|${p.type}`;
    const sortedCurrent = [...editablePeriods].map(key).sort();
    const sortedInitial = [...initial].map(key).sort();
    return sortedCurrent.some((k, i) => k !== sortedInitial[i]);
  }, [editablePeriods]);

  useEffect(() => {
    if (!actionNotice) return;
    const timer = window.setTimeout(() => setActionNotice(null), 4000);
    return () => window.clearTimeout(timer);
  }, [actionNotice]);

  const handleAutoGenerate = () => {
    const generatedPeriods = generateTimetable();
    setEditablePeriods(hydratePeriods(generatedPeriods));
    setShowAutoGenerateModal(false);
  };

  const getPeriodForSlot = (day: DayOfWeek, slotId: string) =>
    editablePeriods.find((p) => p.slotId === slotId && p.dayOfWeek === day);

  const updatePeriodInSlot = (day: DayOfWeek, slotId: string, updates: Partial<EditablePeriod>) => {
    setEditablePeriods((prev) =>
      prev.map((period) =>
        period.slotId === slotId && period.dayOfWeek === day ? { ...period, ...updates } : period
      )
    );
  };

  const addPeriodToSlot = (day: DayOfWeek, row: SlotRow, updates: Partial<EditablePeriod>) => {
    setEditablePeriods((prev) => [
      ...prev,
      {
        slotId: row.slotId,
        dayOfWeek: day,
        startTime: row.startTime,
        endTime: row.endTime,
        type: 'LESSON',
        ...updates,
      },
    ]);
  };

  const changeSlotType = (slotId: string, type: ActionType) => {
    setEditablePeriods((prev) =>
      prev.map((period) =>
        period.slotId === slotId
          ? { ...period, type, subjectId: undefined, courseId: undefined }
          : period
      )
    );
  };

  const updateRowStart = (row: SlotRow, newStart: string) => {
    if (!newStart || newStart === row.startTime) return;
    setEditablePeriods((prev) => {
      const currentRows = buildRows(prev);
      const index = currentRows.findIndex((r) => r.slotId === row.slotId);
      if (index === -1) return prev;

      let next = prev.map((period) =>
        period.slotId === row.slotId ? { ...period, startTime: newStart } : period
      );

      if (newStart < row.endTime && index > 0) {
        const previous = currentRows[index - 1];
        if (toMinutes(previous.startTime) < toMinutes(newStart)) {
          next = next.map((period) =>
            period.slotId === previous.slotId ? { ...period, endTime: newStart } : period
          );
        }
      }

      return next;
    });
  };

  const updateRowEnd = (row: SlotRow, newEnd: string) => {
    if (!newEnd || newEnd === row.endTime) return;

    const index = rows.findIndex((r) => r.slotId === row.slotId);
    if (index === -1) return;

    const delta = toMinutes(newEnd) - toMinutes(row.endTime);
    let next = editablePeriods.map((period) =>
      period.slotId === row.slotId ? { ...period, endTime: newEnd } : period
    );

    if (row.startTime < newEnd && delta !== 0) {
      const laterIds = new Set(rows.slice(index + 1).map((r) => r.slotId));
      const shifted = shiftSlots(next, laterIds, delta);
      if (!shifted) {
        setActionNotice('Later periods would run past 23:59. Shorten an earlier slot first.');
        return;
      }
      next = shifted;
    }

    setEditablePeriods(next);
  };

  const insertAction = (type: ActionType, afterSlotId: string | null) => {
    const duration = defaultDuration(type, schoolType);
    const currentRows = rows;

    let insertStart: string;
    let insertEnd: string | null;
    let laterIds = new Set<string>();

    if (afterSlotId === null) {
      const first = currentRows[0];
      if (!first) {
        insertStart = schoolType === 'PRIMARY' ? '07:30' : '08:00';
        insertEnd = addMinutes(insertStart, duration);
      } else {
        insertEnd = first.startTime;
        const before = addMinutes(insertEnd, -duration);
        if (before) {
          insertStart = before;
        } else {
          insertStart = '00:00';
          insertEnd = addMinutes(insertStart, duration);
          laterIds = new Set(currentRows.map((r) => r.slotId));
        }
      }
    } else {
      const index = currentRows.findIndex((r) => r.slotId === afterSlotId);
      const current = index >= 0 ? currentRows[index] : currentRows[currentRows.length - 1];
      if (!current) {
        insertStart = schoolType === 'PRIMARY' ? '07:30' : '08:00';
        insertEnd = addMinutes(insertStart, duration);
      } else {
        insertStart = current.endTime;
        insertEnd = addMinutes(insertStart, duration);
        const later = currentRows.slice(index + 1);
        const nextRow = later[0];
        const fitsInGap = Boolean(insertEnd && nextRow && toMinutes(nextRow.startTime) >= toMinutes(insertEnd));
        if (!fitsInGap) {
          laterIds = new Set(later.map((r) => r.slotId));
        }
      }
    }

    if (!insertEnd) {
      setActionNotice('That period would run past 23:59. Shorten an earlier slot first.');
      return;
    }

    if (currentRows.some((r) => r.startTime === insertStart && r.endTime === insertEnd && r.type === type)) {
      setActionNotice(`${typeLabel(type)} at ${formatRange(insertStart, insertEnd)} is already on the timetable.`);
      return;
    }

    let next = editablePeriods;
    if (laterIds.size > 0) {
      const shifted = shiftSlots(next, laterIds, duration);
      if (!shifted) {
        setActionNotice('Later periods would run past 23:59. Shorten an earlier slot first.');
        return;
      }
      next = shifted;
    }

    const slotId = nextSlotId();
    const newPeriods: EditablePeriod[] = DAYS.map((day) => ({
      slotId,
      dayOfWeek: day,
      startTime: insertStart,
      endTime: insertEnd,
      type,
    }));

    setEditablePeriods([...next, ...newPeriods]);
  };

  const removeRow = (row: SlotRow) => {
    setEditablePeriods((prev) => {
      const currentRows = buildRows(prev);
      const index = currentRows.findIndex((r) => r.slotId === row.slotId);
      const laterIds = new Set(currentRows.slice(index + 1).map((r) => r.slotId));
      const remaining = prev.filter((period) => period.slotId !== row.slotId);
      const mins = durationOf(row.startTime, row.endTime);
      if (mins > 0 && laterIds.size > 0) {
        return shiftSlots(remaining, laterIds, -mins) ?? remaining;
      }
      return remaining;
    });
  };

  const addLessonRow = () => {
    const duration = defaultDuration('LESSON', schoolType);
    const last = rows[rows.length - 1];
    const start = last?.endTime ?? (schoolType === 'PRIMARY' ? '07:45' : '08:00');
    const end = addMinutes(start, duration);
    if (!end) {
      setActionNotice('A new period would run past 23:59. Shorten an earlier slot first.');
      return;
    }

    const slotId = nextSlotId();
    const newPeriods: EditablePeriod[] = DAYS.map((day) => ({
      slotId,
      dayOfWeek: day,
      startTime: start,
      endTime: end,
      type: 'LESSON',
    }));
    setEditablePeriods((prev) => [...prev, ...newPeriods]);
  };

  const handleSave = async () => {
    if (validationErrors.length > 0) return;
    await onSave(
      editablePeriods.map(({ slotId: _slotId, ...period }) => period)
    );
  };

  const handleClose = () => {
    if (isDirty) {
      setShowDiscardConfirm(true);
    } else {
      onClose();
    }
  };

  const isTertiary = schoolType === 'TERTIARY';
  const options = isTertiary ? courses : subjects;

  return (
    <BodyPortal>
    <div className="fixed inset-0 bg-black/50 z-[10050] flex items-center justify-center p-4">
      <div className="bg-[var(--light-card)] dark:bg-[var(--dark-card)] rounded-lg shadow-xl w-full max-w-[95vw] max-h-[90vh] flex flex-col dark:[color-scheme:dark]">
        <div className="flex items-center justify-between p-6 border-b border-light-border dark:border-dark-border">
          <div className="min-w-0">
            <div className="flex items-center gap-4">
              <h2 className="font-semibold text-light-text-primary dark:text-dark-text-primary" style={{ fontSize: 'var(--text-section-title)' }}>
                Edit Timetable
              </h2>
              {canGenerate && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowAutoGenerateModal(true)}
                  disabled={isLoading}
                >
                  <LoisOrb size="xs" className="mr-2" />
                  Auto-Fill
                </Button>
              )}
            </div>
            <p className="mt-2 text-light-text-secondary dark:text-dark-text-secondary max-w-3xl" style={{ fontSize: 'var(--text-small)' }}>
              Insert assembly, break, or lunch after a period — later slots shift so the day stays contiguous. Lengthen a slot by changing its end time. Trash removes a row and pulls the afternoon forward.
            </p>
          </div>
          <button
            onClick={handleClose}
            className="text-light-text-muted dark:text-dark-text-muted hover:text-light-text-primary dark:hover:text-dark-text-primary"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-6">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <InsertButton
              label="Insert at start of day"
              schoolType={schoolType}
              onInsert={(type) => insertAction(type, null)}
            />
            {actionNotice && (
              <p className="text-xs text-amber-700 dark:text-amber-300">{actionNotice}</p>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="sticky left-0 z-20 bg-[var(--light-card)] dark:bg-[var(--dark-card)] border border-light-border dark:border-dark-border px-3 py-3 text-left font-semibold text-light-text-primary dark:text-dark-text-primary min-w-[140px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]" style={{ fontSize: 'var(--text-small)' }}>
                    Time
                  </th>
                  {DAYS.map((day) => (
                    <th
                      key={day}
                      className="border border-light-border dark:border-dark-border px-4 py-3 text-center font-semibold text-light-text-primary dark:text-dark-text-primary min-w-[120px]"
                      style={{ fontSize: 'var(--text-small)' }}
                    >
                      {DAY_LABELS[day]}
                    </th>
                  ))}
                  <th className="sticky right-0 z-20 bg-[var(--light-card)] dark:bg-[var(--dark-card)] border border-light-border dark:border-dark-border px-4 py-3 text-center font-semibold text-light-text-primary dark:text-dark-text-primary min-w-[120px] shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.1)]" style={{ fontSize: 'var(--text-small)' }}>
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, rowIndex) => {
                  const mins = durationOf(row.startTime, row.endTime);
                  const next = rows[rowIndex + 1];
                  const gap = next ? toMinutes(next.startTime) - toMinutes(row.endTime) : 0;
                  const isActionRow = row.type !== 'LESSON';

                  return (
                    <tr key={row.slotId}>
                      <td className="sticky left-0 z-10 bg-[var(--light-card)] dark:bg-[var(--dark-card)] border border-light-border dark:border-dark-border px-3 py-3 min-w-[140px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                        <div className="flex flex-col gap-1.5">
                          <TimeInput
                            label="Start time"
                            value={row.startTime}
                            commitOnBlur
                            onChange={(newStartTime) => updateRowStart(row, newStartTime)}
                          />
                          <div className="text-center text-xs text-light-text-muted dark:text-dark-text-muted">to</div>
                          <TimeInput
                            label="End time"
                            value={row.endTime}
                            commitOnBlur
                            onChange={(newEndTime) => updateRowEnd(row, newEndTime)}
                          />
                          <div className="text-center text-[10px] text-light-text-muted dark:text-dark-text-muted">
                            {mins > 0 ? `${mins} min` : 'Invalid'}
                            {gap > 0 && ` · ${gap} min gap`}
                            {gap < 0 && ' · overlaps next'}
                          </div>
                        </div>
                      </td>
                      {isActionRow ? (
                        <td
                          colSpan={DAYS.length}
                          className="border border-[color-mix(in_srgb,var(--agora-blue)_28%,var(--light-border))] dark:border-[color-mix(in_srgb,var(--agora-blue)_35%,var(--dark-border))] px-4 py-3 text-center bg-[color-mix(in_srgb,var(--agora-blue)_16%,white)] dark:bg-[color-mix(in_srgb,var(--agora-blue)_22%,var(--dark-card))] text-[var(--agora-blue)]"
                        >
                          <div className="flex items-center justify-center gap-3">
                            <select
                              value={row.type}
                              onChange={(e) => changeSlotType(row.slotId, e.target.value as ActionType)}
                              className="px-2 py-1.5 rounded border border-[color-mix(in_srgb,var(--agora-blue)_35%,var(--light-border))] dark:border-[color-mix(in_srgb,var(--agora-blue)_40%,var(--dark-border))] bg-transparent font-medium text-[var(--agora-blue)]"
                              style={{ fontSize: 'var(--text-body)' }}
                              aria-label="Period type"
                            >
                              <option value="ASSEMBLY">Assembly</option>
                              <option value="BREAK">Break</option>
                              <option value="LUNCH">Lunch</option>
                            </select>
                          </div>
                        </td>
                      ) : (
                        DAYS.map((day) => {
                          const period = getPeriodForSlot(day, row.slotId);
                          return (
                            <td
                              key={day}
                              className="border border-light-border dark:border-dark-border px-3 py-2"
                            >
                              <select
                                value={
                                  period
                                    ? isTertiary
                                      ? period.courseId || 'FREE_PERIOD'
                                      : period.subjectId || 'FREE_PERIOD'
                                    : 'FREE_PERIOD'
                                }
                                onChange={(e) => {
                                  const value = e.target.value;
                                  const assignment =
                                    value === 'FREE_PERIOD'
                                      ? { subjectId: undefined, courseId: undefined }
                                      : {
                                          subjectId: isTertiary ? undefined : value,
                                          courseId: isTertiary ? value : undefined,
                                        };
                                  if (period) {
                                    updatePeriodInSlot(day, row.slotId, assignment);
                                  } else {
                                    addPeriodToSlot(day, row, assignment);
                                  }
                                }}
                                className="w-full px-2 py-1.5 rounded border border-[var(--light-border)] dark:border-[var(--dark-border)] bg-[var(--light-input)] dark:bg-[var(--dark-input)] text-light-text-primary dark:text-dark-text-primary"
                              >
                                <option value="FREE_PERIOD">Free Period</option>
                                {options.map((option) => (
                                  <option key={option.id} value={option.id}>
                                    {option.name} {option.code ? `(${option.code})` : ''}
                                  </option>
                                ))}
                              </select>
                            </td>
                          );
                        })
                      )}
                      <td className="sticky right-0 z-10 bg-[var(--light-card)] dark:bg-[var(--dark-card)] border border-light-border dark:border-dark-border px-4 py-3 shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                        <div className="flex flex-col gap-2 items-center">
                          <button
                            type="button"
                            onClick={() => removeRow(row)}
                            className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 p-1.5 rounded transition-colors flex items-center justify-center"
                            title={`Delete ${typeLabel(row.type).toLowerCase()} row`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                          <InsertButton
                            schoolType={schoolType}
                            onInsert={(type) => insertAction(type, row.slotId)}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="mt-3 flex justify-start">
              <button
                type="button"
                onClick={addLessonRow}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Period Row
              </button>
            </div>
          </div>
        </div>

        {validationErrors.length > 0 && (
          <div className="px-6 pb-2">
            <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-800 p-4">
              <p className="text-sm font-semibold text-red-700 dark:text-red-400 mb-2">
                Please fix the following issues before saving:
              </p>
              <ul className="space-y-1">
                {validationErrors.map((err) => (
                  <li key={err} className="text-sm text-red-600 dark:text-red-400 flex items-start gap-2">
                    <span className="mt-0.5 shrink-0">•</span>
                    <span>{err}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        <div className="flex items-center justify-end gap-3 p-6 border-t border-light-border dark:border-dark-border">
          <Button variant="ghost" onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave} disabled={isLoading || validationErrors.length > 0}>
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>

        {showAutoGenerateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[10060]">
            <FadeInUp from={{ opacity: 0, scale: 0.95 }} to={{ opacity: 1, scale: 1 }} duration={0.25} className="bg-[var(--light-card)] dark:bg-[var(--dark-card)] rounded-lg p-6 max-w-md w-full mx-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                  <LoisOrb size="sm" />
                </div>
                <h3 className="text-lg font-semibold text-light-text-primary dark:text-dark-text-primary">
                  Auto-Fill Timetable
                </h3>
              </div>

              <div className="space-y-3 mb-6">
                <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                  This will fill empty lesson slots with:
                </p>
                <ul className="text-sm text-light-text-secondary dark:text-dark-text-secondary space-y-1 ml-4">
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                    Random {schoolType === 'TERTIARY' ? 'courses' : 'subjects'} (core subjects appear more often)
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full"></span>
                    1–2 free periods per day
                  </li>
                </ul>
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 mt-3">
                  <p className="text-sm text-amber-800 dark:text-amber-300">
                    <strong>Note:</strong> Existing subjects, teachers, and any assembly/break/lunch rows you have already added are kept. Only empty lesson slots are filled.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="primary"
                  onClick={handleAutoGenerate}
                  className="flex-1"
                >
                  <LoisOrb size="xs" className="mr-2" />
                  Generate
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setShowAutoGenerateModal(false)}
                >
                  Cancel
                </Button>
              </div>
            </FadeInUp>
          </div>
        )}

        {showDiscardConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[10060]">
            <div className="bg-[var(--light-card)] dark:bg-[var(--dark-card)] rounded-lg p-6 max-w-sm w-full mx-4 shadow-xl">
              <h3 className="text-base font-semibold text-light-text-primary dark:text-dark-text-primary mb-2">
                Discard changes?
              </h3>
              <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mb-6">
                You have unsaved changes. Closing now will discard them permanently.
              </p>
              <div className="flex gap-3 justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDiscardConfirm(false)}
                >
                  Keep editing
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => { setShowDiscardConfirm(false); onClose(); }}
                >
                  Discard changes
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
    </BodyPortal>
  );
}

interface InsertButtonProps {
  onInsert: (type: ActionType) => void;
  label?: string;
  schoolType: EditableTimetableTableProps['schoolType'];
}

function InsertButton({ onInsert, label = 'Insert', schoolType }: InsertButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top?: number; bottom?: number; right: number } | null>(null);
  const anchorRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const updatePosition = useCallback(() => {
    const el = anchorRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const estimatedHeight = 140;
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUp = spaceBelow < estimatedHeight && rect.top > estimatedHeight;
    setMenuPos({
      top: openUp ? undefined : rect.bottom + 4,
      bottom: openUp ? window.innerHeight - rect.top + 4 : undefined,
      right: Math.max(8, window.innerWidth - rect.right),
    });
  }, []);

  useLayoutEffect(() => {
    if (!isOpen) {
      setMenuPos(null);
      return;
    }
    updatePosition();
    const handler = () => updatePosition();
    window.addEventListener('resize', handler);
    document.addEventListener('scroll', handler, true);
    return () => {
      window.removeEventListener('resize', handler);
      document.removeEventListener('scroll', handler, true);
    };
  }, [isOpen, updatePosition]);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (anchorRef.current?.contains(target)) return;
      if (popoverRef.current?.contains(target)) return;
      setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <>
      <div ref={anchorRef}>
        <button
          type="button"
          onClick={() => setIsOpen((open) => !open)}
          className="inline-flex items-center gap-1 px-2 py-1.5 rounded-md border border-[var(--light-border)] dark:border-[var(--dark-border)] bg-[var(--light-input)] dark:bg-[var(--dark-input)] text-light-text-primary dark:text-dark-text-primary hover:bg-[var(--light-hover)] dark:hover:bg-[var(--dark-hover)] transition-colors"
          title="Insert assembly, break, or lunch"
          aria-label={label}
          aria-expanded={isOpen}
        >
          <Plus className="h-3.5 w-3.5" />
          <span className="font-medium" style={{ fontSize: 'var(--text-tiny)' }}>{label}</span>
          <ChevronDown className={`h-3.5 w-3.5 text-light-text-secondary dark:text-dark-text-secondary transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>
      {isOpen && menuPos && (
        <BodyPortal>
          <div
            ref={popoverRef}
            style={{
              position: 'fixed',
              top: menuPos.top,
              bottom: menuPos.bottom,
              right: menuPos.right,
              zIndex: 10100,
            }}
            className="min-w-[168px] rounded-md border border-[var(--light-border)] dark:border-[var(--dark-border)] bg-[var(--light-card)] dark:bg-[var(--dark-card)] shadow-xl"
          >
            <div className="px-3 pt-2 pb-1 text-[10px] uppercase tracking-wide text-light-text-muted dark:text-dark-text-muted">
              {label === 'Insert' ? 'After this period' : 'Before first period'}
            </div>
            <div className="py-1">
              {(['ASSEMBLY', 'BREAK', 'LUNCH'] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => {
                    onInsert(type);
                    setIsOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 text-[var(--agora-blue)] hover:bg-[color-mix(in_srgb,var(--agora-blue)_16%,white)] dark:hover:bg-[color-mix(in_srgb,var(--agora-blue)_18%,var(--dark-card))] transition-colors"
                  style={{ fontSize: 'var(--text-body)' }}
                >
                  {typeLabel(type)}
                  <span className="ml-2 text-[10px] text-light-text-muted dark:text-dark-text-muted">
                    {defaultDuration(type, schoolType)} min
                  </span>
                </button>
              ))}
            </div>
          </div>
        </BodyPortal>
      )}
    </>
  );
}
