'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  Clock,
  Loader2,
  Play,
  Pencil,
  Send,
  X,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Trash2,
} from 'lucide-react';
import Image from 'next/image';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { CurriculumStatusBadge } from './CurriculumStatusBadge';
import { CurriculumProgressBar } from './CurriculumProgressBar';
import { CalendarCoverageBanner } from './CalendarCoverageBanner';
import { SchemeWeekEditor, isPersistedWeekId } from './SchemeWeekEditor';
import { coverageFromPlanVsCalendar } from '@/lib/curriculum/calendar-coverage';
import {
  useGetCurriculumByIdQuery,
  useGetSchemeOfWorkByIdQuery,
  useGetActiveSessionQuery,
  useReplaceSchemeWeeksMutation,
  type WeekStatus,
  type CurriculumItem,
} from '@/lib/store/api/schoolAdminApi';
import { useCurriculum } from '@/hooks/useCurriculum';
import { cn } from '@/lib/utils';
import { toast } from 'react-hot-toast';

interface CurriculumDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  schoolId: string;
  curriculumId: string;
  classId?: string;
  canEdit?: boolean;
  isScheme?: boolean;
  schoolType?: string;
  onUpdate?: () => void;
  onDelete?: (curriculumId: string) => void;
}

export function CurriculumDetailModal({
  isOpen,
  onClose,
  schoolId,
  curriculumId,
  classId,
  canEdit = false,
  isScheme = false,
  schoolType,
  onUpdate,
  onDelete,
}: CurriculumDetailModalProps) {
  const [expandedWeek, setExpandedWeek] = useState<number | null>(null);
  const [markingWeek, setMarkingWeek] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const [editing, setEditing] = useState(false);
  const [draftItems, setDraftItems] = useState<CurriculumItem[] | null>(null);
  const currentWeekRef = useRef<HTMLDivElement | null>(null);
  const didScrollToCurrent = useRef(false);

  const {
    handleMarkWeekComplete,
    handleMarkWeekInProgress,
    handleSubmit,
    isMutating,
  } = useCurriculum({ schoolId });

  const { data: curriculumData, isLoading: isLoadingCurriculum, refetch: refetchCurriculum } =
    useGetCurriculumByIdQuery(
      { schoolId, curriculumId },
      { skip: !curriculumId || isScheme || !isOpen },
    );

  const { data: schemeData, isLoading: isLoadingScheme, refetch: refetchScheme } =
    useGetSchemeOfWorkByIdQuery(
      { schoolId, schemeId: curriculumId },
      { skip: !curriculumId || !isScheme || !isOpen },
    );

  const [replaceSchemeWeeks, { isLoading: isSavingWeeks }] = useReplaceSchemeWeeksMutation();

  const { data: activeSessionResponse } = useGetActiveSessionQuery(
    { schoolId, schoolType: schoolType || undefined },
    { skip: !schoolId || !isOpen },
  );

  const isLoading = isScheme ? isLoadingScheme : isLoadingCurriculum;
  const curriculum = isScheme ? schemeData : curriculumData?.data;
  const refetch = isScheme ? refetchScheme : refetchCurriculum;

  const sortedItems = useMemo(() => {
    if (!curriculum?.items) return [];
    return [...curriculum.items].sort(
      (a, b) => (a.weekNumber || a.week || 0) - (b.weekNumber || b.week || 0),
    );
  }, [curriculum?.items]);

  const contentItems = useMemo(
    () => sortedItems.filter((item) => !item.isCatchUp),
    [sortedItems],
  );

  const canStructureEdit = Boolean(
    canEdit && isScheme && (curriculum?.structureEditable ?? false),
  );

  const instructionalWeeks =
    curriculum?.calendarCoverage?.instructionalWeeks ??
    sortedItems.filter((item) => item.calendarStartDate).length;

  const editingContent = draftItems ?? contentItems;
  const liveCoverage =
    editing && isScheme
      ? coverageFromPlanVsCalendar(instructionalWeeks, editingContent.length)
      : curriculum?.calendarCoverage;

  const startEditing = () => {
    setDraftItems(contentItems.map((item) => ({ ...item })));
    setEditing(true);
  };

  const discardEditing = () => {
    setDraftItems(null);
    setEditing(false);
  };

  const handleSaveWeeks = async () => {
    if (!draftItems) return;
    const missingTopic = draftItems.find((item) => !item.topic.trim());
    if (missingTopic) {
      toast.error('Every week needs a topic title.');
      return;
    }
    try {
      await replaceSchemeWeeks({
        schoolId,
        schemeId: curriculumId,
        weeks: draftItems.map((item) => ({
          id: isPersistedWeekId(item.id) ? item.id : undefined,
          topic: item.topic.trim(),
          subTopics: item.subTopics || [],
          objectives: item.objectives || [],
          activities: item.activities || [],
          resources: item.resources || [],
          assessment: item.assessment,
        })),
      }).unwrap();
      toast.success('Scheme weeks saved');
      setDraftItems(null);
      setEditing(false);
      refetch();
      onUpdate?.();
    } catch (err: unknown) {
      const data = (err as { data?: { message?: string | string[] } })?.data;
      const raw = data?.message;
      const message = Array.isArray(raw) ? raw.join(' ') : raw;
      toast.error(message || 'Could not save scheme weeks');
    }
  };

  const currentSchoolWeek = useMemo(() => {
    const raw = activeSessionResponse?.data?.term?.currentWeek;
    if (typeof raw !== 'number' || raw < 1) return null;
    const scheduled = sortedItems.filter((i) => !i.outsideCalendar);
    const maxWeek = scheduled.length
      ? Math.max(...scheduled.map((i) => i.weekNumber || i.week || 0))
      : curriculum?.totalWeeks || 12;
    return Math.min(raw, maxWeek || raw);
  }, [activeSessionResponse?.data?.term?.currentWeek, sortedItems, curriculum?.totalWeeks]);

  // Expand + scroll to the active school week when preview opens
  useEffect(() => {
    if (!isOpen || !currentSchoolWeek || !sortedItems.length) return;
    const hasWeek = sortedItems.some(
      (item) => (item.weekNumber || item.week || 0) === currentSchoolWeek,
    );
    if (!hasWeek) return;

    setExpandedWeek(currentSchoolWeek);
    didScrollToCurrent.current = false;
    const t = window.setTimeout(() => {
      if (!didScrollToCurrent.current && currentWeekRef.current) {
        currentWeekRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        didScrollToCurrent.current = true;
      }
    }, 150);
    return () => window.clearTimeout(t);
  }, [isOpen, currentSchoolWeek, curriculumId, sortedItems]);

  useEffect(() => {
    if (!isOpen) {
      setEditing(false);
      setDraftItems(null);
    }
  }, [isOpen, curriculumId]);

  const handleMarkComplete = async (weekNumber: number) => {
    setMarkingWeek(weekNumber);
    await handleMarkWeekComplete(curriculumId, weekNumber, notes || undefined, classId);
    setMarkingWeek(null);
    setNotes('');
    refetch();
    onUpdate?.();
  };

  const handleStartWeek = async (weekNumber: number) => {
    setMarkingWeek(weekNumber);
    await handleMarkWeekInProgress(curriculumId, weekNumber, classId);
    setMarkingWeek(null);
    refetch();
    onUpdate?.();
  };

  const handleSubmitForApproval = async () => {
    await handleSubmit(curriculumId);
    refetch();
    onUpdate?.();
  };

  const getWeekStatusIcon = (status: WeekStatus) => {
    switch (status) {
      case 'COMPLETED':
        return <Check className="h-4 w-4 text-green-500" />;
      case 'IN_PROGRESS':
        return <Play className="h-4 w-4 text-blue-500" />;
      case 'SKIPPED':
        return <X className="h-4 w-4 text-yellow-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getWeekStatusColor = (status: WeekStatus, isCurrentWeek: boolean) => {
    if (isCurrentWeek) {
      return 'border-agora-blue bg-blue-50 dark:bg-blue-950/40 ring-1 ring-agora-blue/30';
    }
    switch (status) {
      case 'COMPLETED':
        return 'border-green-500 bg-green-50 dark:bg-green-900/20';
      case 'IN_PROGRESS':
        return 'border-blue-500 bg-blue-50 dark:bg-blue-900/20';
      case 'SKIPPED':
        return 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20';
      default:
        return 'border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg';
    }
  };

  if (isLoading) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Loading..." size="xl">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </Modal>
    );
  }

  if (!curriculum) {
    return null;
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-3">
          <Image
            src="/assets/logos/agora_main.png"
            alt=""
            width={20}
            height={20}
            className="h-5 w-5 object-contain"
          />
          <span>{curriculum.subject}</span>
          <CurriculumStatusBadge status={curriculum.status} />
        </div>
      }
      size="xl"
      className="bg-light-bg dark:bg-dark-bg"
      contentClassName="bg-light-bg dark:bg-dark-bg"
    >
      <div className="space-y-6">
        {/* Header Info */}
        <div className="flex flex-wrap items-center gap-6 pb-4 border-b border-light-border dark:border-dark-border">
          <div>
            <span className="text-xs text-light-text-muted dark:text-dark-text-muted">Teacher</span>
            <p className="font-medium text-light-text-primary dark:text-dark-text-primary">
              {curriculum.teacherName || 'Unassigned'}
            </p>
          </div>
          <div>
            <span className="text-xs text-light-text-muted dark:text-dark-text-muted">Term</span>
            <p className="font-medium text-light-text-primary dark:text-dark-text-primary">
              {curriculum.termName || curriculum.academicYear || '—'}
            </p>
          </div>
          {typeof currentSchoolWeek === 'number' && currentSchoolWeek > 0 && (
            <div>
              <span className="text-xs text-light-text-muted dark:text-dark-text-muted">School week</span>
              <p className="font-medium text-agora-blue">Week {currentSchoolWeek}</p>
            </div>
          )}
          {curriculum.isAgoraBased && (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wide text-agora-blue bg-agora-blue/10 border border-agora-blue/20">
              <Image
                src="/assets/logos/agora_main.png"
                alt=""
                width={12}
                height={12}
                className="h-3 w-3 object-contain"
              />
              Bud library
            </span>
          )}
          <div className="ml-auto">
            <CurriculumProgressBar
              completed={curriculum.completedWeeks || 0}
              total={curriculum.totalWeeks || 0}
              size="md"
            />
          </div>
        </div>

        <CalendarCoverageBanner coverage={liveCoverage} variant="imported" />
        {canEdit && isScheme && !canStructureEdit && curriculum.structureLockReason && (
          <p className="text-xs text-light-text-muted dark:text-dark-text-muted -mt-3">
            {curriculum.structureLockReason}
          </p>
        )}

        {/* Week list */}
        {editing && isScheme ? (
          <div className="max-h-[400px] overflow-y-auto pr-2">
            <SchemeWeekEditor
              curriculumId={curriculumId}
              contentWeeks={editingContent}
              instructionalWeeks={instructionalWeeks}
              onChange={setDraftItems}
            />
          </div>
        ) : (
          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
          {sortedItems.map((item) => {
            const weekNumber = item.weekNumber || item.week || 0;
            const isExpanded = expandedWeek === weekNumber;
            const isMarking = markingWeek === weekNumber;
            const isCatchUp = Boolean(item.isCatchUp);
            const isCurrentWeek =
              typeof currentSchoolWeek === 'number' &&
              currentSchoolWeek > 0 &&
              weekNumber === currentSchoolWeek &&
              !item.outsideCalendar &&
              !isCatchUp;

            return (
              <div
                key={item.id}
                ref={isCurrentWeek ? currentWeekRef : undefined}
                className={cn(
                  'border-l-4 rounded-lg overflow-hidden transition-all',
                  isCatchUp
                    ? 'border-slate-300 dark:border-slate-600 bg-slate-100/80 dark:bg-slate-900/40 opacity-60'
                    : getWeekStatusColor(item.status, isCurrentWeek),
                )}
              >
                <button
                  onClick={() => setExpandedWeek(isExpanded ? null : weekNumber)}
                  className={cn(
                    'w-full flex items-center gap-4 p-4 text-left transition-colors',
                    isCatchUp
                      ? 'hover:bg-slate-200/50 dark:hover:bg-slate-800/40'
                      : 'hover:bg-light-surface/80 dark:hover:bg-dark-surface/40',
                  )}
                >
                  <div
                    className={cn(
                      'flex-shrink-0 w-12 h-12 rounded-lg border flex items-center justify-center shadow-sm',
                      isCatchUp
                        ? 'bg-slate-200 dark:bg-slate-800 border-slate-300 dark:border-slate-600'
                        : isCurrentWeek
                          ? 'bg-agora-blue text-white border-agora-blue'
                          : 'bg-[var(--light-card)] dark:bg-[var(--dark-surface)] border-light-border dark:border-dark-border',
                    )}
                  >
                    <span
                      className={cn(
                        'text-sm font-bold',
                        isCatchUp
                          ? 'text-slate-500 dark:text-slate-400'
                          : isCurrentWeek
                            ? 'text-white'
                            : 'text-light-text-primary dark:text-dark-text-primary',
                      )}
                    >
                      W{weekNumber}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4
                        className={cn(
                          'font-medium truncate',
                          isCatchUp
                            ? 'text-slate-500 dark:text-slate-400'
                            : 'text-light-text-primary dark:text-dark-text-primary',
                        )}
                      >
                        {item.topic}
                      </h4>
                      {isCurrentWeek && (
                        <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-agora-blue text-white">
                          This week
                        </span>
                      )}
                      {isCatchUp && (
                        <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-300 dark:border-slate-600">
                          Catch-up
                        </span>
                      )}
                      {item.outsideCalendar && (
                        <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-light-surface dark:bg-dark-surface text-light-text-muted border border-light-border dark:border-dark-border">
                          Outside this term calendar
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-light-text-muted dark:text-dark-text-muted">
                      {item.objectives?.length || 0} objectives • {item.activities?.length || 0}{' '}
                      activities
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {getWeekStatusIcon(item.status)}
                    {isExpanded ? (
                      <ChevronUp className="h-5 w-5 text-light-text-muted" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-light-text-muted" />
                    )}
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 pt-2 space-y-4 bg-light-bg dark:bg-dark-bg">
                    {item.subTopics && item.subTopics.length > 0 && (
                      <div>
                        <h5 className="text-xs font-semibold text-light-text-muted dark:text-dark-text-muted uppercase tracking-wider mb-2">
                          Sub-topics
                        </h5>
                        <div className="flex flex-wrap gap-2">
                          {item.subTopics.map((topic, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-1 bg-light-surface dark:bg-dark-surface rounded text-xs text-light-text-secondary dark:text-dark-text-secondary border border-light-border dark:border-dark-border"
                            >
                              {topic}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {item.objectives && item.objectives.length > 0 && (
                      <div>
                        <h5 className="text-xs font-semibold text-light-text-muted dark:text-dark-text-muted uppercase tracking-wider mb-2">
                          Objectives
                        </h5>
                        <ul className="space-y-1">
                          {item.objectives.map((obj, idx) => (
                            <li
                              key={idx}
                              className="flex items-start gap-2 text-sm text-light-text-secondary dark:text-dark-text-secondary"
                            >
                              <span className="text-green-500 mt-1">•</span>
                              {obj}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {item.activities && item.activities.length > 0 && (
                      <div>
                        <h5 className="text-xs font-semibold text-light-text-muted dark:text-dark-text-muted uppercase tracking-wider mb-2">
                          Activities
                        </h5>
                        <ul className="space-y-1">
                          {item.activities.map((activity, idx) => (
                            <li
                              key={idx}
                              className="flex items-start gap-2 text-sm text-light-text-secondary dark:text-dark-text-secondary"
                            >
                              <span className="text-blue-500 mt-1">→</span>
                              {activity}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {item.resources && item.resources.length > 0 && (
                      <div>
                        <h5 className="text-xs font-semibold text-light-text-muted dark:text-dark-text-muted uppercase tracking-wider mb-2">
                          Resources
                        </h5>
                        <div className="flex flex-wrap gap-2">
                          {item.resources.map((resource, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-1 bg-agora-blue/10 dark:bg-agora-blue/15 rounded text-xs text-agora-blue border border-agora-blue/20"
                            >
                              {resource}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {item.teacherNotes && (
                      <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                        <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 mb-1">
                          <MessageSquare className="h-4 w-4" />
                          <span className="text-xs font-semibold">Teacher Notes</span>
                        </div>
                        <p className="text-sm text-amber-800 dark:text-amber-300">{item.teacherNotes}</p>
                      </div>
                    )}

                    {canEdit && item.status !== 'COMPLETED' && item.status !== 'SKIPPED' && (
                      <div className="flex items-center gap-3 pt-2 border-t border-light-border dark:border-dark-border">
                        {item.status === 'PENDING' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleStartWeek(weekNumber)}
                            disabled={isMarking}
                          >
                            <Play className="h-4 w-4 mr-1.5" />
                            Start Teaching
                          </Button>
                        )}
                        {item.status === 'IN_PROGRESS' && (
                          <div className="flex-1 flex items-center gap-2">
                            <input
                              type="text"
                              placeholder="Add notes (optional)"
                              value={notes}
                              onChange={(e) => setNotes(e.target.value)}
                              className="flex-1 px-3 py-1.5 text-sm border border-light-border dark:border-dark-border rounded-lg bg-[var(--light-input)] dark:bg-[var(--dark-input)]"
                            />
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => handleMarkComplete(weekNumber)}
                              disabled={isMarking}
                            >
                              {isMarking ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <Check className="h-4 w-4 mr-1.5" />
                                  Mark Complete
                                </>
                              )}
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          </div>
        )}

        <div className="flex items-center justify-between pt-4 border-t border-light-border dark:border-dark-border">
          <div className="flex items-center gap-3">
            {editing ? (
              <>
                <Button
                  variant="primary"
                  size="sm"
                  className="h-8 px-3"
                  onClick={handleSaveWeeks}
                  disabled={isSavingWeeks || !editingContent.length}
                >
                  {isSavingWeeks ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                  Save weeks
                </Button>
                <Button variant="outline" size="sm" className="h-8 px-3" onClick={discardEditing} disabled={isSavingWeeks}>
                  Discard
                </Button>
              </>
            ) : (
              <>
            {canStructureEdit && (
              <Button variant="outline" size="sm" className="h-8 px-3" onClick={startEditing}>
                <Pencil className="h-3.5 w-3.5" />
                Edit scheme
              </Button>
            )}
            {curriculum.status === 'DRAFT' && canEdit && (
              <Button variant="primary" size="sm" className="h-8 px-3" onClick={handleSubmitForApproval} disabled={isMutating}>
                <Send className="h-3.5 w-3.5" />
                Submit for Approval
              </Button>
            )}
            {curriculum.status === 'REJECTED' && curriculum.rejectionReason && (
              <div className="text-sm text-red-600 dark:text-red-400">
                <strong>Rejected:</strong> {curriculum.rejectionReason}
              </div>
            )}
            {canEdit && onDelete && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onClose();
                  onDelete(curriculumId);
                }}
                className="h-8 px-3 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </Button>
            )}
              </>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-3"
            onClick={editing ? discardEditing : onClose}
          >
            {editing ? 'Cancel' : 'Close'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
