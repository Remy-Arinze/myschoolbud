'use client';

import { useState, useMemo, useEffect, useRef, useLayoutEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { TimeInput, parseTimeInput } from '@/components/ui/TimeInput';
import { X, Save, Loader2, Plus, ChevronDown, Trash2 } from 'lucide-react';
import { FadeInUp } from '@/components/ui/FadeInUp';
import { LoisOrb } from '@/components/ai/LoisOrb';
import {
  type TimetablePeriod,
  type DayOfWeek,
} from '@/lib/store/api/schoolAdminApi';
import { useAutoGenerateTimetable } from '@/hooks/useAutoGenerateTimetable';
import { BodyPortal } from '@/components/ui/BodyPortal';

const DAYS: DayOfWeek[] = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'];
const DAY_LABELS: Record<DayOfWeek, string> = {
  MONDAY: 'Mon',
  TUESDAY: 'Tue',
  WEDNESDAY: 'Wed',
  THURSDAY: 'Thu',
  FRIDAY: 'Fri',
  SATURDAY: 'Sat',
  SUNDAY: 'Sun',
};

interface EditablePeriod {
  id?: string;
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  subjectId?: string;
  courseId?: string;
  teacherId?: string;
  type: 'LESSON' | 'BREAK' | 'LUNCH' | 'ASSEMBLY';
}

interface EditableTimetableTableProps {
  timetable: TimetablePeriod[];
  subjects: Array<{ id: string; name: string; code?: string }>;
  courses: Array<{ id: string; name: string; code?: string }>;
  schoolType: 'PRIMARY' | 'SECONDARY' | 'TERTIARY' | null;
  onSave: (periods: EditablePeriod[]) => Promise<void>;
  onClose: () => void;
  isLoading?: boolean;
}

export function EditableTimetableTable({
  timetable,
  subjects,
  courses,
  schoolType,
  onSave,
  onClose,
  isLoading = false,
}: EditableTimetableTableProps) {
  // Convert timetable to editable format, organized by time slots
  const [editablePeriods, setEditablePeriods] = useState<EditablePeriod[]>(() => {
    return timetable.map((period) => ({
      id: period.id,
      dayOfWeek: period.dayOfWeek,
      startTime: period.startTime,
      endTime: period.endTime,
      subjectId: period.subjectId || undefined,
      courseId: period.courseId || undefined,
      teacherId: period.teacherId || undefined,
      type: period.type || 'LESSON',
    }));
  });

  // Fix 4: Snapshot for dirty-check
  const initialPeriodsRef = useRef<EditablePeriod[]>(
    timetable.map((period) => ({
      id: period.id,
      dayOfWeek: period.dayOfWeek,
      startTime: period.startTime,
      endTime: period.endTime,
      subjectId: period.subjectId || undefined,
      courseId: period.courseId || undefined,
      teacherId: period.teacherId || undefined,
      type: period.type || 'LESSON',
    }))
  );

  const [showAutoGenerateModal, setShowAutoGenerateModal] = useState(false);
  // Fix 2: validation errors state
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  // Fix 4: discard confirmation state
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  // Auto-generate hook
  const { generateTimetable, canGenerate } = useAutoGenerateTimetable({
    schoolType,
    subjects,
    courses,
    existingPeriods: timetable,
  });

  // Fix 4: isDirty — compare current periods to initial snapshot
  const isDirty = useMemo(() => {
    const initial = initialPeriodsRef.current;
    if (editablePeriods.length !== initial.length) return true;
    const key = (p: EditablePeriod) =>
      `${p.dayOfWeek}|${p.startTime}|${p.endTime}|${p.subjectId ?? ''}|${p.courseId ?? ''}|${p.type}`;
    const sortedCurrent = [...editablePeriods].map(key).sort();
    const sortedInitial = [...initial].map(key).sort();
    return sortedCurrent.some((k, i) => k !== sortedInitial[i]);
  }, [editablePeriods]);

  // Fix 2: Clear validation errors whenever editablePeriods change (user is fixing issues)
  useEffect(() => {
    setValidationErrors([]);
  }, [editablePeriods]);

  const handleAutoGenerate = () => {
    const generatedPeriods = generateTimetable();
    
    // Convert generated periods to editable format
    const newPeriods: EditablePeriod[] = generatedPeriods.map((p) => ({
      dayOfWeek: p.dayOfWeek,
      startTime: p.startTime,
      endTime: p.endTime,
      type: p.type,
      subjectId: p.subjectId,
      courseId: p.courseId,
    }));

    setEditablePeriods(newPeriods);
    setShowAutoGenerateModal(false);
  };

  // Get all unique time periods
  const timePeriods = useMemo(() => {
    const timeSet = new Set<string>();
    editablePeriods.forEach((period) => {
      timeSet.add(`${period.startTime}|${period.endTime}`);
    });
    return Array.from(timeSet)
      .map((timeStr) => {
        const [startTime, endTime] = timeStr.split('|');
        return { startTime, endTime };
      })
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [editablePeriods]);

  // Get periods for a specific day and time
  const getPeriodForDayAndTime = (day: DayOfWeek, startTime: string, endTime: string): EditablePeriod | undefined => {
    return editablePeriods.find(
      (p) => p.dayOfWeek === day && p.startTime === startTime && p.endTime === endTime
    );
  };

  // Update period
  const updatePeriod = (day: DayOfWeek, startTime: string, endTime: string, updates: Partial<EditablePeriod>) => {
    setEditablePeriods((prev) =>
      prev.map((period) => {
        if (period.dayOfWeek === day && period.startTime === startTime && period.endTime === endTime) {
          return { ...period, ...updates };
        }
        return period;
      })
    );
  };

  // Update time for all periods with the same time (for break/lunch/assembly)
  const updateTimeForAllDays = (oldStartTime: string, oldEndTime: string, newStartTime: string, newEndTime: string) => {
    setEditablePeriods((prev) =>
      prev.map((period) => {
        if (period.startTime === oldStartTime && period.endTime === oldEndTime) {
          return { ...period, startTime: newStartTime, endTime: newEndTime };
        }
        return period;
      })
    );
  };

  // Add new period for a day and time
  const addPeriod = (day: DayOfWeek, startTime: string, endTime: string) => {
    const newPeriod: EditablePeriod = {
      dayOfWeek: day,
      startTime,
      endTime,
      type: 'LESSON',
    };
    setEditablePeriods((prev) => [...prev, newPeriod]);
  };

  // Remove period
  const removePeriod = (day: DayOfWeek, startTime: string, endTime: string) => {
    setEditablePeriods((prev) =>
      prev.filter(
        (period) => !(period.dayOfWeek === day && period.startTime === startTime && period.endTime === endTime)
      )
    );
  };

  // Remove all periods at a specific time slot (entire row — all days)
  const removeEntireRow = (startTime: string, endTime: string) => {
    setEditablePeriods((prev) =>
      prev.filter(
        (period) => !(period.startTime === startTime && period.endTime === endTime)
      )
    );
  };

  // Remove all periods of a specific type and time (for break/lunch/assembly)
  const removeBreakPeriod = (startTime: string, endTime: string) => {
    setEditablePeriods((prev) =>
      prev.filter(
        (period) => !(period.startTime === startTime && period.endTime === endTime && period.type !== 'LESSON')
      )
    );
  };

  // Insert a break/lunch/assembly period at a specific position
  // This adds the period for all days at the specified time slot
  const insertBreakPeriod = (insertAfterTime: string | null, type: 'BREAK' | 'LUNCH' | 'ASSEMBLY', startTime: string, endTime: string) => {
    setEditablePeriods((prev) => {
      // Create periods for all days
      const newPeriods: EditablePeriod[] = DAYS.map((day) => ({
        dayOfWeek: day,
        startTime,
        endTime,
        type,
      }));

      // If insertAfterTime is null, insert at the beginning
      if (insertAfterTime === null) {
        return [...newPeriods, ...prev];
      }

      // Find all periods that come after this time (sorted by startTime)
      // We need to insert after all periods with startTime <= insertAfterTime
      const sortedPeriods = [...prev].sort((a, b) => {
        const timeA = a.startTime.localeCompare(b.startTime);
        if (timeA !== 0) return timeA;
        return a.dayOfWeek.localeCompare(b.dayOfWeek);
      });

      // Find the index where we should insert (after all periods with startTime <= insertAfterTime)
      let insertIndex = sortedPeriods.length;
      for (let i = 0; i < sortedPeriods.length; i++) {
        if (sortedPeriods[i].startTime > insertAfterTime) {
          insertIndex = i;
          break;
        }
      }

      // Insert the new periods
      sortedPeriods.splice(insertIndex, 0, ...newPeriods);
      return sortedPeriods;
    });
  };

  const addLessonRow = () => {
    // Find the latest end time in the existing periods to suggest next slot
    const lastEndTime = timePeriods.length > 0
      ? timePeriods[timePeriods.length - 1].endTime
      : '08:00';

    // Add 5 minutes buffer then round to nearest 5
    const [h, m] = lastEndTime.split(':').map(Number);
    const totalMins = h * 60 + m + 5;
    const snappedMins = Math.ceil(totalMins / 5) * 5;
    const newStartH = Math.floor(snappedMins / 60) % 24;
    const newStartM = snappedMins % 60;
    const newStart = `${String(newStartH).padStart(2, '0')}:${String(newStartM).padStart(2, '0')}`;
    const newEnd = `${String((newStartH + 1) % 24).padStart(2, '0')}:${String(newStartM).padStart(2, '0')}`;

    // Add one blank lesson period per day at this new time
    const newPeriods: EditablePeriod[] = DAYS.map((day) => ({
      dayOfWeek: day,
      startTime: newStart,
      endTime: newEnd,
      type: 'LESSON' as const,
    }));
    setEditablePeriods((prev) => [...prev, ...newPeriods]);
  };

  const handleSave = async () => {
    // Fix 2: validate before saving
    const toMinutes = (t: string) => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };

    const errors: string[] = [];

    for (const period of editablePeriods) {
      const label = period.startTime;
      if (period.startTime >= period.endTime) {
        errors.push(`Row ${label}: start time must be before end time`);
        continue;
      }
      const duration = toMinutes(period.endTime) - toMinutes(period.startTime);
      if (period.type === 'LESSON') {
        if (duration < 20) {
          errors.push(`Row ${label}: lesson periods must be at least 20 minutes`);
        }
      } else {
        if (duration < 5) {
          errors.push(`Row ${label}: break/assembly periods must be at least 5 minutes`);
        }
      }
    }

    // Same-day overlap check per class (all periods share the same class context here)
    const byDay: Record<string, EditablePeriod[]> = {};
    for (const day of DAYS) {
      byDay[day] = editablePeriods.filter((p) => p.dayOfWeek === day);
    }
    for (const day of DAYS) {
      const sorted = [...byDay[day]].sort((a, b) => a.startTime.localeCompare(b.startTime));
      for (let i = 0; i < sorted.length - 1; i++) {
        if (toMinutes(sorted[i].endTime) > toMinutes(sorted[i + 1].startTime)) {
          const dayLabel = day.charAt(0) + day.slice(1).toLowerCase();
          errors.push(
            `${dayLabel}: period at ${sorted[i].startTime} overlaps with ${sorted[i + 1].startTime}`
          );
        }
      }
    }

    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }

    await onSave(editablePeriods);
  };

  // Fix 4: guard Cancel/X against unsaved changes
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
        {/* Header */}
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
            <p className="mt-2 text-light-text-secondary dark:text-dark-text-secondary max-w-2xl" style={{ fontSize: 'var(--text-small)' }}>
              Use the <span className="font-medium text-light-text-primary dark:text-dark-text-primary">+ Insert</span> button in the Action column to add an Assembly, Break, or Lunch row after that time slot. The trash icon removes a row.
            </p>
          </div>
          <button
            onClick={handleClose}
            className="text-light-text-muted dark:text-dark-text-muted hover:text-light-text-primary dark:hover:text-dark-text-primary"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto p-6">
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
                {timePeriods.map((timePeriod, timeIndex) => {
                  const periodsAtThisTime = editablePeriods.filter(
                    (p) => p.startTime === timePeriod.startTime && p.endTime === timePeriod.endTime
                  );
                  const isBreakType = periodsAtThisTime.some((p) => p.type !== 'LESSON');
                  const breakType = isBreakType ? periodsAtThisTime[0]?.type : null;

                  // If it's a break/lunch/assembly, show as a single row
                  if (isBreakType && breakType) {
                    return (
                      <tr key={`${timePeriod.startTime}-${breakType}`}>
                        <td className="sticky left-0 z-10 bg-[var(--light-card)] dark:bg-[var(--dark-card)] border border-light-border dark:border-dark-border px-3 py-3 min-w-[140px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                          <div className="flex flex-col gap-1.5">
                            <TimeInput
                              label="Start time"
                              value={timePeriod.startTime}
                              onChange={(newStartTime) => {
                                if (newStartTime) {
                                  updateTimeForAllDays(timePeriod.startTime, timePeriod.endTime, newStartTime, timePeriod.endTime);
                                }
                              }}
                            />
                            <div className="text-center text-xs text-light-text-muted dark:text-dark-text-muted">to</div>
                            <TimeInput
                              label="End time"
                              value={timePeriod.endTime}
                              onChange={(newEndTime) => {
                                if (newEndTime) {
                                  updateTimeForAllDays(timePeriod.startTime, timePeriod.endTime, timePeriod.startTime, newEndTime);
                                }
                              }}
                            />
                          </div>
                        </td>
                        <td
                          colSpan={DAYS.length}
                          className="border border-[color-mix(in_srgb,var(--agora-blue)_28%,var(--light-border))] dark:border-[color-mix(in_srgb,var(--agora-blue)_35%,var(--dark-border))] px-4 py-3 text-center bg-[color-mix(in_srgb,var(--agora-blue)_16%,white)] dark:bg-[color-mix(in_srgb,var(--agora-blue)_22%,var(--dark-card))] text-[var(--agora-blue)]"
                        >
                          <div className="flex items-center justify-center gap-3">
                            <span className="font-medium" style={{ fontSize: 'var(--text-body)' }}>
                              {breakType === 'BREAK' ? 'Break' : breakType === 'LUNCH' ? 'Lunch' : breakType === 'ASSEMBLY' ? 'Assembly' : ''}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeBreakPeriod(timePeriod.startTime, timePeriod.endTime);
                              }}
                              className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 p-1.5 rounded transition-colors flex items-center justify-center"
                              title={`Delete ${breakType === 'BREAK' ? 'Break' : breakType === 'LUNCH' ? 'Lunch' : 'Assembly'} period`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                        <td className="sticky right-0 z-10 bg-[var(--light-card)] dark:bg-[var(--dark-card)] border border-light-border dark:border-dark-border px-4 py-3 shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                          <InsertButton
                            onInsert={(type, startTime, endTime) => {
                              insertBreakPeriod(timePeriod.startTime, type, startTime, endTime);
                            }}
                            previousTime={timeIndex > 0 ? timePeriods[timeIndex - 1].startTime : null}
                          />
                        </td>
                      </tr>
                    );
                  }

                  // Lesson periods
                  return (
                    <tr key={timePeriod.startTime}>
                      <td className="sticky left-0 z-10 bg-[var(--light-card)] dark:bg-[var(--dark-card)] border border-light-border dark:border-dark-border px-3 py-3 min-w-[140px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                        <div className="flex flex-col gap-1.5">
                          <TimeInput
                            label="Start time"
                            value={timePeriod.startTime}
                            onChange={(newStartTime) => {
                              if (newStartTime) {
                                editablePeriods
                                  .filter((p) => p.startTime === timePeriod.startTime && p.endTime === timePeriod.endTime)
                                  .forEach((period) => {
                                    updatePeriod(period.dayOfWeek, timePeriod.startTime, timePeriod.endTime, {
                                      startTime: newStartTime,
                                    });
                                  });
                              }
                            }}
                          />
                          <div className="text-center text-xs text-light-text-muted dark:text-dark-text-muted">to</div>
                          <TimeInput
                            label="End time"
                            value={timePeriod.endTime}
                            onChange={(newEndTime) => {
                              if (newEndTime) {
                                editablePeriods
                                  .filter((p) => p.startTime === timePeriod.startTime && p.endTime === timePeriod.endTime)
                                  .forEach((period) => {
                                    updatePeriod(period.dayOfWeek, timePeriod.startTime, timePeriod.endTime, {
                                      endTime: newEndTime,
                                    });
                                  });
                              }
                            }}
                          />
                        </div>
                      </td>
                      {DAYS.map((day) => {
                        const period = getPeriodForDayAndTime(day, timePeriod.startTime, timePeriod.endTime);
                        return (
                          <td
                            key={day}
                            className="border border-light-border dark:border-dark-border px-3 py-2"
                          >
                            {period ? (
                              <select
                                value={isTertiary ? period.courseId || 'FREE_PERIOD' : period.subjectId || 'FREE_PERIOD'}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  if (value === 'FREE_PERIOD') {
                                    updatePeriod(day, timePeriod.startTime, timePeriod.endTime, {
                                      subjectId: undefined,
                                      courseId: undefined,
                                    });
                                  } else if (value) {
                                    updatePeriod(day, timePeriod.startTime, timePeriod.endTime, {
                                      subjectId: isTertiary ? undefined : value,
                                      courseId: isTertiary ? value : undefined,
                                    });
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
                            ) : (
                              <select
                                value=""
                                onChange={(e) => {
                                  const value = e.target.value;
                                  if (value) {
                                    addPeriod(day, timePeriod.startTime, timePeriod.endTime);
                                    if (value !== 'FREE_PERIOD') {
                                      updatePeriod(day, timePeriod.startTime, timePeriod.endTime, {
                                        subjectId: isTertiary ? undefined : value,
                                        courseId: isTertiary ? value : undefined,
                                      });
                                    }
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
                            )}
                          </td>
                        );
                      })}
                      <td className="sticky right-0 z-10 bg-[var(--light-card)] dark:bg-[var(--dark-card)] border border-light-border dark:border-dark-border px-4 py-3 shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                        <div className="flex flex-col gap-2 items-center">
                          <button
                            type="button"
                            onClick={() => removeEntireRow(timePeriod.startTime, timePeriod.endTime)}
                            className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 p-1.5 rounded transition-colors flex items-center justify-center"
                            title="Delete this time slot row"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                          <InsertButton
                            onInsert={(type, startTime, endTime) => {
                              insertBreakPeriod(timePeriod.startTime, type, startTime, endTime);
                            }}
                            previousTime={timeIndex > 0 ? timePeriods[timeIndex - 1].startTime : null}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {/* Add Lesson Row */}
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

        {/* Validation errors — Fix 2 */}
        {validationErrors.length > 0 && (
          <div className="px-6 pb-2">
            <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-800 p-4">
              <p className="text-sm font-semibold text-red-700 dark:text-red-400 mb-2">
                Please fix the following issues before saving:
              </p>
              <ul className="space-y-1">
                {validationErrors.map((err, i) => (
                  <li key={i} className="text-sm text-red-600 dark:text-red-400 flex items-start gap-2">
                    <span className="mt-0.5 shrink-0">•</span>
                    <span>{err}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-light-border dark:border-dark-border">
          <Button variant="ghost" onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave} disabled={isLoading}>
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

        {/* Auto-Generate Confirmation Modal */}
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
                  This will automatically fill empty slots with:
                </p>
                <ul className="text-sm text-light-text-secondary dark:text-dark-text-secondary space-y-1 ml-4">
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                    Random {schoolType === 'TERTIARY' ? 'courses' : 'subjects'} (core subjects appear more often)
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                    Assembly, Break & Lunch periods
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full"></span>
                    1-2 Free periods per day
                  </li>
                </ul>
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 mt-3">
                  <p className="text-sm text-amber-800 dark:text-amber-300">
                    <strong>Note:</strong> Existing assignments won&apos;t be changed. Only empty slots will be filled.
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

        {/* Discard Changes Confirmation — Fix 4 */}
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

// Insert Button Component with dropdown
interface InsertButtonProps {
  onInsert: (type: 'BREAK' | 'LUNCH' | 'ASSEMBLY', startTime: string, endTime: string) => void;
  previousTime: string | null;
}

function InsertButton({ onInsert, previousTime }: InsertButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [insertType, setInsertType] = useState<'BREAK' | 'LUNCH' | 'ASSEMBLY' | null>(null);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [menuPos, setMenuPos] = useState<{ top?: number; bottom?: number; right: number } | null>(null);
  const anchorRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const startInputRef = useRef<HTMLInputElement>(null);
  const endInputRef = useRef<HTMLInputElement>(null);

  const getDefaultTimes = () => {
    if (previousTime) {
      const [prevHours, prevMinutes] = previousTime.split(':').map(Number);
      const nextHours = prevHours + 1;
      const defaultStart = `${String(nextHours).padStart(2, '0')}:${String(prevMinutes).padStart(2, '0')}`;
      const defaultEnd = `${String(nextHours + 1).padStart(2, '0')}:${String(prevMinutes).padStart(2, '0')}`;
      return { defaultStart, defaultEnd };
    }
    return { defaultStart: '08:00', defaultEnd: '09:00' };
  };

  const updatePosition = () => {
    const el = anchorRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const estimatedHeight = insertType ? 200 : 140;
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUp = spaceBelow < estimatedHeight && rect.top > estimatedHeight;
    setMenuPos({
      top: openUp ? undefined : rect.bottom + 4,
      bottom: openUp ? window.innerHeight - rect.top + 4 : undefined,
      right: Math.max(8, window.innerWidth - rect.right),
    });
  };

  useLayoutEffect(() => {
    if (!isOpen && !insertType) {
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
  }, [isOpen, insertType]);

  useEffect(() => {
    if (!isOpen && !insertType) return;
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (anchorRef.current?.contains(target)) return;
      if (popoverRef.current?.contains(target)) return;
      setIsOpen(false);
      setInsertType(null);
      setStartTime('');
      setEndTime('');
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, insertType]);

  const handleInsertClick = (type: 'BREAK' | 'LUNCH' | 'ASSEMBLY') => {
    setInsertType(type);
    const { defaultStart, defaultEnd } = getDefaultTimes();
    setStartTime(defaultStart);
    setEndTime(defaultEnd);
    setIsOpen(false);
  };

  const handleConfirm = () => {
    const parsedStart = parseTimeInput(startInputRef.current?.value ?? '') ?? startTime;
    const parsedEnd = parseTimeInput(endInputRef.current?.value ?? '') ?? endTime;
    if (insertType && parsedStart && parsedEnd && parsedStart < parsedEnd) {
      onInsert(insertType, parsedStart, parsedEnd);
      setIsOpen(false);
      setInsertType(null);
      setStartTime('');
      setEndTime('');
    }
  };

  const handleCancel = () => {
    setIsOpen(false);
    setInsertType(null);
    setStartTime('');
    setEndTime('');
  };

  const typeLabel =
    insertType === 'BREAK' ? 'Break' : insertType === 'LUNCH' ? 'Lunch' : insertType === 'ASSEMBLY' ? 'Assembly' : '';

  return (
    <>
      <div ref={anchorRef}>
        <button
          type="button"
          onClick={() => {
            if (insertType) {
              handleCancel();
              return;
            }
            setIsOpen((open) => !open);
          }}
          className="inline-flex items-center gap-1 px-2 py-1.5 rounded-md border border-[var(--light-border)] dark:border-[var(--dark-border)] bg-[var(--light-input)] dark:bg-[var(--dark-input)] text-light-text-primary dark:text-dark-text-primary hover:bg-[var(--light-hover)] dark:hover:bg-[var(--dark-hover)] transition-colors"
          title="Insert assembly, break, or lunch"
          aria-label="Insert assembly, break, or lunch"
          aria-expanded={isOpen || Boolean(insertType)}
        >
          <Plus className="h-3.5 w-3.5" />
          <span className="font-medium" style={{ fontSize: 'var(--text-tiny)' }}>Insert</span>
          <ChevronDown className={`h-3.5 w-3.5 text-light-text-secondary dark:text-dark-text-secondary transition-transform ${isOpen || insertType ? 'rotate-180' : ''}`} />
        </button>
      </div>
      {(isOpen || insertType) && menuPos && (
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
            {insertType ? (
              <div className="p-3 flex flex-col gap-2 w-[220px]">
                <div className="font-medium text-[var(--agora-blue)]" style={{ fontSize: 'var(--text-small)' }}>
                  Insert {typeLabel}
                </div>
                <div className="flex items-center gap-1.5">
                  <TimeInput
                    ref={startInputRef}
                    label="Start time"
                    value={startTime}
                    onChange={setStartTime}
                    className="flex-1"
                  />
                  <span className="text-xs text-light-text-muted dark:text-dark-text-muted">to</span>
                  <TimeInput
                    ref={endInputRef}
                    label="End time"
                    value={endTime}
                    onChange={setEndTime}
                    className="flex-1"
                  />
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleConfirm}
                    disabled={!startTime || !endTime || startTime >= endTime}
                    className="flex-1 text-xs py-1"
                  >
                    Insert
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCancel}
                    className="text-xs py-1"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="py-1">
                {(['ASSEMBLY', 'BREAK', 'LUNCH'] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => handleInsertClick(type)}
                    className="w-full text-left px-3 py-2 text-[var(--agora-blue)] hover:bg-[color-mix(in_srgb,var(--agora-blue)_16%,white)] dark:hover:bg-[color-mix(in_srgb,var(--agora-blue)_18%,var(--dark-card))] transition-colors"
                    style={{ fontSize: 'var(--text-body)' }}
                  >
                    {type === 'ASSEMBLY' ? 'Assembly' : type === 'BREAK' ? 'Break' : 'Lunch'}
                  </button>
                ))}
              </div>
            )}
          </div>
        </BodyPortal>
      )}
    </>
  );
}

