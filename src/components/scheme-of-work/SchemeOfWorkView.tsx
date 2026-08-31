'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  CheckCircle2, 
  BookOpen, 
  Sparkles, 
  Star, 
  Clock, 
  ChevronRight,
  ChevronDown,
  Edit3, 
  FileCheck, 
  Loader2,
  Lock,
  ArrowRight,
  Upload,
  FileText,
  X,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Progress } from '@/components/ui/Progress';
import { Modal } from '@/components/ui/Modal';
import { Textarea } from '@/components/ui/Textarea';
import { 
  useGetSchemeOfWorkForClassQuery, 
  useUpdateSchemeOfWorkWeekMutation,
  useUploadSchemeOfWorkLessonNoteMutation,
  useGetActiveSessionQuery,
  type SchemeOfWorkWeek,
  type SchemeDeliveryCatchUpReason,
} from '@/lib/store/api/schoolAdminApi';
import { SchemeOfWorkStatusBadge } from './SchemeOfWorkStatusBadge';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import { useSchoolType } from '@/hooks/useSchoolType';

const CATCH_UP_OPTIONS: { value: SchemeDeliveryCatchUpReason; label: string; hint: string }[] = [
  { value: 'MISSED', label: 'Missed earlier', hint: 'Catching up on a skipped week' },
  { value: 'CATCH_UP', label: 'Catch-up lesson', hint: 'Dedicated catch-up session' },
  { value: 'COMBINED', label: 'Combined week', hint: 'Covered with another week' },
];

interface SchemeOfWorkViewProps {
  schoolId: string;
  classId: string;
  role: 'TEACHER' | 'STUDENT' | 'SCHOOL_ADMIN';
  terminology?: any;
  isReadOnly?: boolean;
  /** Prefer class school type when available (teachers on a specific class). */
  schoolType?: 'PRIMARY' | 'SECONDARY' | 'TERTIARY' | null;
}

function confidenceLabel(score: number) {
  if (score >= 70) return 'Evidenced';
  if (score >= 45) return 'Noted';
  if (score >= 25) return 'Self-attested';
  return 'None';
}

function confidenceTone(score: number) {
  if (score >= 70) return 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800';
  if (score >= 45) return 'bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-900/30 dark:text-sky-300 dark:border-sky-800';
  if (score >= 25) return 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800';
  return 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-dark-surface dark:text-dark-text-muted';
}

export function SchemeOfWorkView({
  schoolId,
  classId,
  role,
  terminology,
  isReadOnly,
  schoolType,
}: SchemeOfWorkViewProps) {
  const [expandedWeek, setExpandedWeek] = useState<number | null>(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | undefined>(undefined);
  const [deliveryTarget, setDeliveryTarget] = useState<SchemeOfWorkWeek | null>(null);
  const [deliveryNote, setDeliveryNote] = useState('');
  const [catchUpReason, setCatchUpReason] = useState<SchemeDeliveryCatchUpReason | ''>('');
  const [lessonFile, setLessonFile] = useState<File | null>(null);
  const [showPastWeeks, setShowPastWeeks] = useState(false);
  const lessonFileInputRef = useRef<HTMLInputElement | null>(null);
  const weeksListRef = useRef<HTMLDivElement | null>(null);
  const { currentType } = useSchoolType();
  const effectiveSchoolType = schoolType || currentType || undefined;

  const { data: response, isLoading, isError, refetch } = useGetSchemeOfWorkForClassQuery(
    { schoolId, classId, subjectId: selectedSubjectId },
    { skip: !schoolId || !classId, pollingInterval: 10000 }
  );

  const { data: activeSessionResponse } = useGetActiveSessionQuery(
    { schoolId, schoolType: effectiveSchoolType },
    { skip: !schoolId },
  );
  const term = activeSessionResponse?.data?.term;
  const rawCurrentWeek = term?.currentTeachingWeek ?? term?.currentWeek ?? null;

  const [updateWeek, { isLoading: isUpdating }] = useUpdateSchemeOfWorkWeekMutation();
  const [uploadLessonNote, { isLoading: isUploading }] = useUploadSchemeOfWorkLessonNoteMutation();

  const scheme = response?.data;
  const weeks = scheme?.weeks || [];
  const availableSubjects = scheme?.availableSubjects || [];

  const maxWeekNumber = useMemo(
    () => (weeks.length ? Math.max(...weeks.map((w) => w.weekNumber)) : 0),
    [weeks],
  );

  /** Clamp session week onto the scheme’s week range so “this week” always resolves. */
  const currentSchoolWeek = useMemo(() => {
    if (typeof rawCurrentWeek !== 'number' || rawCurrentWeek < 1 || !weeks.length) {
      return null;
    }
    return Math.min(rawCurrentWeek, maxWeekNumber);
  }, [rawCurrentWeek, weeks.length, maxWeekNumber]);

  const pastWeeks = useMemo(() => {
    if (typeof currentSchoolWeek !== 'number') return [];
    return weeks.filter((w) => w.weekNumber < currentSchoolWeek);
  }, [weeks, currentSchoolWeek]);

  const activeWeeks = useMemo(() => {
    if (typeof currentSchoolWeek !== 'number') return weeks;
    return weeks.filter((w) => w.weekNumber >= currentSchoolWeek);
  }, [weeks, currentSchoolWeek]);

  useEffect(() => {
    if (!selectedSubjectId && scheme?.subjectId) {
      setSelectedSubjectId(scheme.subjectId);
    }
  }, [scheme?.subjectId, selectedSubjectId]);

  // Expand the current week whenever the scheme / school week changes
  useEffect(() => {
    if (!currentSchoolWeek || !weeks.length) return;
    const idx = weeks.findIndex((w) => w.weekNumber === currentSchoolWeek);
    if (idx >= 0) setExpandedWeek(idx);
    setShowPastWeeks(false);
    // Reset scroll to top of active list (current week is first item)
    const t = window.setTimeout(() => {
      weeksListRef.current?.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' as ScrollBehavior : 'auto' });
    }, 50);
    return () => window.clearTimeout(t);
  }, [currentSchoolWeek, scheme?.id, weeks.length]);
 
  const progress = useMemo(() => {
    if (weeks.length === 0) return 0;
    const deliveredCount = weeks.filter(w => w.isDelivered).length;
    return Math.round((deliveredCount / weeks.length) * 100);
  }, [weeks]);

  const avgConfidence = useMemo(() => {
    const delivered = weeks.filter((w) => w.isDelivered);
    if (!delivered.length) return 0;
    const sum = delivered.reduce((acc, w) => acc + (w.deliveryConfidence || 0), 0);
    return Math.round(sum / delivered.length);
  }, [weeks]);

  const openDeliveryPanel = (week: SchemeOfWorkWeek) => {
    if (role === 'STUDENT' || isReadOnly) return;
    if (typeof currentSchoolWeek === 'number' && week.weekNumber > currentSchoolWeek) {
      toast.error(
        `Week ${week.weekNumber} isn’t due yet (school is on week ${currentSchoolWeek}). You can still open it to plan ahead.`,
      );
      return;
    }
    setDeliveryTarget(week);
    setDeliveryNote(week.deliveryNote || '');
    setCatchUpReason(week.catchUpReason || '');
    setLessonFile(null);
  };

  const closeDeliveryPanel = () => {
    if (isUpdating || isUploading) return;
    setDeliveryTarget(null);
    setDeliveryNote('');
    setCatchUpReason('');
    setLessonFile(null);
  };

  const isPastDeliveryTarget =
    !!deliveryTarget &&
    typeof currentSchoolWeek === 'number' &&
    deliveryTarget.weekNumber < currentSchoolWeek;

  const estimatedConfidence = Math.min(
    100,
    25 +
      (deliveryNote.trim() ? 20 : 0) +
      (isPastDeliveryTarget && catchUpReason ? 5 : 0) +
      (lessonFile ? 40 : 0),
  );

  const handleUnmark = async (week: SchemeOfWorkWeek) => {
    try {
      await updateWeek({
        schoolId,
        weekId: week.id,
        data: { isDelivered: false },
      }).unwrap();
      toast.success('Delivery cleared for this week');
    } catch (err: any) {
      toast.error(err?.data?.message || 'Failed to clear delivery');
    }
  };

  const handleConfirmDelivery = async () => {
    if (!deliveryTarget) return;
    const isPast =
      typeof currentSchoolWeek === 'number' && deliveryTarget.weekNumber < currentSchoolWeek;
    if (isPast && !catchUpReason) {
      toast.error('Pick a catch-up reason for past weeks');
      return;
    }

    try {
      await updateWeek({
        schoolId,
        weekId: deliveryTarget.id,
        data: {
          isDelivered: true,
          deliveryNote: deliveryNote.trim() || undefined,
          catchUpReason: isPast ? (catchUpReason as SchemeDeliveryCatchUpReason) : undefined,
        },
      }).unwrap();

      if (lessonFile) {
        await uploadLessonNote({
          schoolId,
          weekId: deliveryTarget.id,
          file: lessonFile,
        }).unwrap();
      }

      toast.success('Week delivery recorded');
      setDeliveryTarget(null);
      setDeliveryNote('');
      setCatchUpReason('');
      setLessonFile(null);
    } catch (err: any) {
      toast.error(err?.data?.message || 'Failed to mark delivered');
    }
  };

  const handleUploadOnly = async (week: SchemeOfWorkWeek, file: File) => {
    try {
      await uploadLessonNote({ schoolId, weekId: week.id, file }).unwrap();
      toast.success('Lesson note uploaded — confidence updated');
    } catch (err: any) {
      toast.error(err?.data?.message || 'Upload failed');
    }
  };

  const renderWeekCard = (week: SchemeOfWorkWeek, index: number) => {
    const isExpanded = expandedWeek === index;
    const isDelivered = week.isDelivered;
    const isCurrentWeek =
      typeof currentSchoolWeek === 'number' &&
      currentSchoolWeek > 0 &&
      week.weekNumber === currentSchoolWeek;
    const isFuture =
      typeof currentSchoolWeek === 'number' && week.weekNumber > currentSchoolWeek;
    const isPast =
      typeof currentSchoolWeek === 'number' && week.weekNumber < currentSchoolWeek;

    return (
      <div
        key={week.id}
        className={cn(
          'group transition-all duration-300 rounded-2xl border bg-white dark:bg-dark-surface overflow-hidden shrink-0',
          isCurrentWeek && !isDelivered
            ? 'border-agora-blue ring-2 ring-agora-blue/20 bg-blue-50/40 dark:bg-blue-950/20'
            : isDelivered
              ? 'border-green-200 dark:border-green-900/30 ring-1 ring-green-100 dark:ring-green-900/10'
              : isPast
                ? 'border-light-border dark:border-dark-border opacity-60'
                : 'border-light-border dark:border-dark-border shadow-soft hover:shadow-lg hover:-translate-y-0.5',
          isExpanded && !isCurrentWeek && 'border-blue-500 dark:border-blue-400 ring-2 ring-blue-500/10',
        )}
      >
        <div
          className="p-5 sm:p-6 flex items-center justify-between cursor-pointer select-none"
          onClick={() => setExpandedWeek(isExpanded ? null : index)}
        >
          <div className="flex items-center gap-5 flex-1 min-w-0">
            <div
              className={cn(
                'flex-shrink-0 w-14 h-14 rounded-xl flex flex-col items-center justify-center transition-colors border',
                isCurrentWeek && !isDelivered
                  ? 'bg-agora-blue border-agora-blue text-white'
                  : isDelivered
                    ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-400'
                    : isFuture
                      ? 'bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                      : 'bg-blue-50 dark:bg-blue-900/30 border-blue-100 dark:border-blue-800 text-blue-600 dark:text-blue-400',
              )}
            >
              <span className="text-[10px] font-black uppercase tracking-tighter opacity-80 leading-none">Week</span>
              <span className="text-xl font-black leading-tight">{week.weekNumber}</span>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                {isCurrentWeek && (
                  <Badge className="h-5 px-1.5 py-0 text-[10px] font-black uppercase bg-agora-blue text-white border-none">
                    This week
                  </Badge>
                )}
                {isFuture && (
                  <Badge className="h-5 px-1.5 py-0 text-[10px] font-black uppercase bg-sky-100 text-sky-800 border-sky-200 border dark:bg-sky-900/30 dark:text-sky-300 dark:border-sky-800">
                    Upcoming
                  </Badge>
                )}
                {isDelivered && (
                  <Badge
                    className={cn(
                      'h-5 px-1.5 py-0 text-[10px] font-black uppercase border',
                      confidenceTone(week.deliveryConfidence || 0),
                    )}
                  >
                    {confidenceLabel(week.deliveryConfidence || 0)} · {week.deliveryConfidence || 0}%
                  </Badge>
                )}
                {isDelivered && (
                  <Badge variant="success" className="h-5 px-1.5 py-0 text-[10px] font-black uppercase bg-green-500 text-white border-none">
                    Completed
                  </Badge>
                )}
                <span className="text-[10px] font-bold text-light-text-muted dark:text-dark-text-muted uppercase tracking-widest leading-none">
                  {week.assessmentType || 'LECTURE'}
                </span>
              </div>
              <h4
                className="font-bold text-light-text-primary dark:text-dark-text-primary truncate sm:text-lg"
                style={{ fontSize: 'var(--text-card-title)' }}
              >
                {week.topic}
              </h4>
            </div>
          </div>

          <div className="flex items-center gap-4 ml-4">
            {role !== 'STUDENT' && !isReadOnly && (
              isFuture ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setExpandedWeek(isExpanded ? null : index);
                  }}
                  className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold transition-all border uppercase tracking-wider bg-white dark:bg-dark-surface text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800 hover:border-sky-400"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  {isExpanded ? 'Hide plan' : 'Plan ahead'}
                </button>
              ) : (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isDelivered) {
                      handleUnmark(week);
                    } else {
                      openDeliveryPanel(week);
                    }
                  }}
                  disabled={isUpdating}
                  className={cn(
                    'hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold transition-all border uppercase tracking-wider',
                    isDelivered
                      ? 'bg-green-600 text-white border-green-600 shadow-lg shadow-green-600/20'
                      : 'bg-white dark:bg-dark-surface text-light-text-primary dark:text-white border-light-border dark:border-dark-border hover:border-blue-500',
                  )}
                >
                  {isDelivered ? (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  ) : (
                    <div className="w-3.5 h-3.5 rounded-full border border-current" />
                  )}
                  {isDelivered ? 'Clear' : isPast ? 'Catch up' : 'Mark delivered'}
                </button>
              )
            )}

            <div
              className={cn(
                'p-2 rounded-full transition-transform duration-300',
                isExpanded ? 'rotate-90 bg-light-bg dark:bg-dark-surface' : 'text-light-text-muted',
              )}
            >
              <ChevronRight className="w-5 h-5" />
            </div>
          </div>
        </div>

        {isExpanded && (
          <div className="border-t border-light-border dark:border-dark-border bg-light-bg/30 dark:bg-dark-surface/30">
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/40">
                    <Star className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h5 className="font-bold text-sm uppercase tracking-wider text-light-text-primary dark:text-dark-text-primary">
                    {role === 'STUDENT' ? "What you'll learn" : 'Learning Outcomes'}
                  </h5>
                </div>

                <ul className="space-y-3">
                  {(role === 'STUDENT' ? week.studentFriendlyOutcomes : week.learningOutcomes).map(
                    (outcome, idx) => (
                      <li
                        key={idx}
                        className="flex gap-3 text-sm text-light-text-secondary dark:text-dark-text-secondary leading-relaxed"
                      >
                        <span className="flex-shrink-0 mt-1 h-3.5 w-3.5 rounded-full bg-blue-100 dark:bg-blue-900/60 border border-blue-200 dark:border-blue-700 flex items-center justify-center text-[8px] font-bold text-blue-600 dark:text-blue-400">
                          {idx + 1}
                        </span>
                        {outcome}
                      </li>
                    ),
                  )}
                </ul>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/40">
                    <BookOpen className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <h5 className="font-bold text-sm uppercase tracking-wider text-light-text-primary dark:text-dark-text-primary">
                    Activities & Resources
                  </h5>
                </div>
                {week.suggestedActivities?.length > 0 && (
                  <ul className="space-y-2">
                    {week.suggestedActivities.map((activity, idx) => (
                      <li
                        key={idx}
                        className="text-sm text-light-text-secondary dark:text-dark-text-secondary flex gap-2"
                      >
                        <ArrowRight className="w-3.5 h-3.5 mt-1 shrink-0 text-indigo-500" />
                        {activity}
                      </li>
                    ))}
                  </ul>
                )}
                {week.resources?.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {week.resources.map((resource, idx) => (
                      <Badge key={idx} variant="outline" className="text-[10px] font-semibold">
                        {resource}
                      </Badge>
                    ))}
                  </div>
                )}
                {week.subTopics?.length > 0 && (
                  <ul className="space-y-1.5 pt-1">
                    {week.subTopics.map((sub, idx) => (
                      <li
                        key={idx}
                        className="text-xs text-light-text-secondary dark:text-dark-text-secondary flex items-center gap-2"
                      >
                        <div className="w-1 h-1 rounded-full bg-light-text-muted" />
                        {sub}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {role !== 'STUDENT' && (
              <div className="px-6 pb-6 space-y-3">
                {week.deliveryNote && (
                  <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary italic">
                    “{week.deliveryNote}”
                  </p>
                )}
                {week.lessonNoteUrl ? (
                  <a
                    href={week.lessonNoteUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 text-xs font-semibold text-blue-600 hover:underline"
                  >
                    <FileCheck className="w-3.5 h-3.5" />
                    {week.lessonNoteFileName || 'Lesson note'}
                  </a>
                ) : (
                  !isReadOnly && (
                    <label className="inline-flex items-center gap-2 text-xs font-semibold text-light-text-secondary cursor-pointer hover:text-blue-600">
                      <Upload className="w-3.5 h-3.5" />
                      {isUploading
                        ? 'Uploading…'
                        : isFuture
                          ? 'Upload lesson note (prep)'
                          : 'Upload lesson note (optional)'}
                      <input
                        type="file"
                        className="hidden"
                        accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleUploadOnly(week, file);
                        }}
                      />
                    </label>
                  )
                )}
                {isFuture ? (
                  <p className="text-[10px] text-sky-700 dark:text-sky-300">
                    Plan ahead: review outcomes and attach prep notes now. Delivery can be marked when this week starts.
                  </p>
                ) : (
                  <p className="text-[10px] text-light-text-muted">
                    Confidence rises with attestation (+25), a short note (+20), catch-up reason (+5), and a lesson file (+40).
                  </p>
                )}
              </div>
            )}

            {role !== 'STUDENT' && (week.teacherNotes || week.privateTeacherNotes) && (
              <div className="mx-6 mb-6 p-4 rounded-xl bg-amber-50/50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/20 flex gap-4">
                <Edit3 className="w-5 h-5 text-amber-600 flex-shrink-0" />
                <div className="space-y-1">
                  <h6 className="text-[10px] font-black uppercase tracking-wider text-amber-800 dark:text-amber-400">
                    Teacher&apos;s Strategic Notes
                  </h6>
                  <p className="text-xs text-amber-900 dark:text-amber-200/80 leading-relaxed italic">
                    &quot;{week.teacherNotes || week.privateTeacherNotes}&quot;
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white/50 dark:bg-dark-surface/50 rounded-2xl border border-dashed border-light-border dark:border-dark-border">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600 mb-4" />
        <p className="text-light-text-secondary dark:text-dark-text-secondary font-medium animate-pulse">
          Lois is retrieving your tailored Scheme of Work...
        </p>
      </div>
    );
  }

  if (isError || !scheme) {
    return (
      <div className="text-center py-16 bg-white dark:bg-dark-surface rounded-2xl border border-light-border dark:border-dark-border shadow-sm">
        <div className="max-w-md mx-auto space-y-4 px-6">
          <BookOpen className="h-12 w-12 text-light-text-muted dark:text-dark-text-muted mx-auto opacity-30" />
          <div>
            <h3 className="text-lg font-bold text-light-text-primary dark:text-dark-text-primary">No Active Scheme of Work</h3>
            <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mt-2">
              Your School Admin hasn't generated or published a Scheme of Work for this class yet. 
              {role === 'TEACHER' && " You can request one if the subject curriculum is ready."}
            </p>
          </div>
          {role !== 'STUDENT' && (
            <Button variant="primary" size="sm" onClick={() => refetch()} className="mt-4">
              Refresh Status
            </Button>
          )}
        </div>
      </div>
    );
  }

  if (scheme.status === 'GENERATING') {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-blue-50/30 dark:bg-blue-900/10 rounded-2xl border border-blue-100 dark:border-blue-900/30">
        <div className="relative mb-6">
          <Sparkles className="h-12 w-12 text-blue-600 animate-pulse" />
          <div className="absolute -top-1 -right-1">
            <span className="flex h-4 w-4 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-blue-500"></span>
            </span>
          </div>
        </div>
        <h3 className="text-xl font-bold text-blue-900 dark:text-blue-100 mb-2">Tailoring your Academic Plan</h3>
        <p className="text-sm text-blue-700 dark:text-blue-300 max-w-sm text-center px-6">
          Our AI is mapping the curriculum topics to your 12-week term structure. 
          This usually takes less than 60 seconds.
        </p>
        <div className="mt-8 w-64">
           <Progress value={45} className="h-1.5" />
           <p className="text-[10px] uppercase tracking-wider font-bold text-blue-500 mt-2 text-center">Optimizing Outcomes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10">
      {availableSubjects.length > 1 && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <label className="text-sm font-semibold text-light-text-secondary dark:text-dark-text-secondary">
            Subject
          </label>
          <select
            value={selectedSubjectId || scheme.subjectId}
            onChange={(e) => setSelectedSubjectId(e.target.value)}
            className="max-w-md rounded-xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-surface px-3 py-2 text-sm font-medium text-light-text-primary dark:text-dark-text-primary"
          >
            {availableSubjects.map((s) => (
              <option key={s.subjectId} value={s.subjectId}>
                {s.subjectName}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Overview Card */}
      <Card className="overflow-hidden border-none shadow-premium bg-gradient-to-br from-indigo-600 to-blue-700 dark:from-indigo-900 dark:to-blue-900">
        <CardContent className="p-8 text-white relative">
          {/* Decorative Sparks */}
          <div className="absolute top-0 right-0 p-4 opacity-20 transform rotate-12">
            <Sparkles className="w-32 h-32" />
          </div>
          
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-4 flex-1">
              <div className="flex flex-wrap items-center gap-3">
                <Badge className="bg-white/20 hover:bg-white/30 text-white border-none backdrop-blur-md px-3 font-bold">
                  {scheme.subjectName || 'SUBJECT'} · 12-WEEK PLAN
                </Badge>
                <SchemeOfWorkStatusBadge status={scheme.status} />
              </div>
              
              <div>
                <h2 className="text-3xl font-extrabold tracking-tight">Scheme of Work</h2>
                <p className="text-blue-100 mt-1 font-medium opacity-90 max-w-2xl">
                  {role === 'STUDENT' 
                    ? "Welcome to your learning journey! Here's what we'll be covering this term, explained simply."
                    : `Comprehensive weekly delivery plan optimized by Lois AI. Combined version ${scheme.version}.`}
                </p>
              </div>

              <div className="flex items-center gap-6 pt-2">
                <div className="space-y-2 flex-1 max-w-xs">
                  <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-blue-100">
                    <span>Term Completion</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-white transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(255,255,255,0.5)]" 
                      style={{ width: `${progress}%` }} 
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch gap-3">
              <div className="flex flex-col items-center gap-2 px-6 py-4 bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20">
               <span className="text-4xl font-black">{weeks.filter(w => w.isDelivered).length}</span>
               <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">Weeks Completed</span>
              </div>
              <div className="flex flex-col items-center gap-2 px-6 py-4 bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20">
               <span className="text-4xl font-black">{avgConfidence}</span>
               <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">Avg Confidence</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Weekly Plan List — current week first; past weeks collapsed */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3 ml-1">
          <h3 className="flex items-center gap-2 text-lg font-bold text-light-text-primary dark:text-dark-text-primary">
            <Clock className="w-5 h-5 text-blue-500" />
            Weekly Roadmap
          </h3>
          {typeof currentSchoolWeek === 'number' && (
            <p className="text-xs font-medium text-light-text-secondary dark:text-dark-text-secondary">
              Week {currentSchoolWeek} of {maxWeekNumber}
            </p>
          )}
        </div>

        {pastWeeks.length > 0 && (
          <button
            type="button"
            onClick={() => setShowPastWeeks((v) => !v)}
            className="w-full flex items-center justify-between gap-3 rounded-xl border border-light-border dark:border-dark-border bg-white/70 dark:bg-dark-surface/70 px-4 py-3 text-left hover:bg-white dark:hover:bg-dark-surface transition-colors"
          >
            <span className="text-sm font-semibold text-light-text-secondary dark:text-dark-text-secondary">
              {showPastWeeks ? 'Hide' : 'Show'} past weeks
              <span className="ml-2 text-light-text-muted font-medium">
                ({pastWeeks.length})
              </span>
            </span>
            <ChevronDown
              className={cn(
                'h-4 w-4 text-light-text-muted transition-transform',
                showPastWeeks && 'rotate-180',
              )}
            />
          </button>
        )}

        <div
          ref={weeksListRef}
          className="flex flex-col gap-4 max-h-[min(65vh,640px)] overflow-y-auto overscroll-contain pr-1 [scrollbar-gutter:stable]"
        >
          {showPastWeeks &&
            pastWeeks.map((week) => {
              const index = weeks.findIndex((w) => w.id === week.id);
              return renderWeekCard(week, index);
            })}

          {activeWeeks.map((week) => {
            const index = weeks.findIndex((w) => w.id === week.id);
            return renderWeekCard(week, index);
          })}
        </div>
      </div>
      
      {/* Footer Info */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-2 py-4 border-t border-light-border dark:border-dark-border opacity-60">
        <div className="flex items-center gap-2 text-xs text-light-text-muted dark:text-dark-text-muted">
           <Sparkles className="w-3.5 h-3.5" />
           <span>Dynamically generated academic delivery strategy</span>
        </div>
        <div className="flex items-center gap-4 text-xs font-medium text-light-text-muted">
           <span className="flex items-center gap-1.5"><FileCheck className="w-3.5 h-3.5" /> Published {new Date(scheme.updatedAt).toLocaleDateString()}</span>
           <span className="flex items-center gap-1.5"><Lock className="w-3.5 h-3.5" /> Version {scheme.version}.0</span>
        </div>
      </div>

      <Modal
        isOpen={!!deliveryTarget}
        onClose={closeDeliveryPanel}
        title={deliveryTarget ? `Mark week ${deliveryTarget.weekNumber} delivered` : 'Mark delivered'}
        size="md"
        contentClassName="space-y-5"
      >
        {deliveryTarget && (
          <>
            <p className="-mt-1 text-sm text-light-text-secondary dark:text-dark-text-secondary leading-relaxed">
              {deliveryTarget.topic}
            </p>

            <div className="flex items-center justify-between gap-3 rounded-2xl border border-light-border dark:border-dark-border bg-light-surface/60 dark:bg-dark-bg/60 px-4 py-3">
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-wider text-light-text-muted dark:text-dark-text-muted">
                  Estimated confidence
                </p>
                <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary mt-0.5">
                  Attestation +25
                  {deliveryNote.trim() ? ' · note +20' : ''}
                  {isPastDeliveryTarget && catchUpReason ? ' · catch-up +5' : ''}
                  {lessonFile ? ' · file +40' : ''}
                </p>
              </div>
              <span className={cn('shrink-0 text-xs font-bold px-2.5 py-1 rounded-full border', confidenceTone(estimatedConfidence))}>
                {confidenceLabel(estimatedConfidence)} · {estimatedConfidence}%
              </span>
            </div>

            {isPastDeliveryTarget && (
              <div className="space-y-2.5">
                <div className="flex items-baseline justify-between gap-2">
                  <label className="text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary">
                    Catch-up reason
                  </label>
                  <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-400">Required · +5</span>
                </div>
                <div className="grid gap-2">
                  {CATCH_UP_OPTIONS.map((option) => {
                    const selected = catchUpReason === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setCatchUpReason(option.value)}
                        className={cn(
                          'w-full text-left rounded-2xl border px-4 py-3 transition-colors',
                          selected
                            ? 'border-blue-500 bg-blue-50/80 dark:bg-blue-900/20 dark:border-blue-400'
                            : 'border-light-border dark:border-dark-border hover:bg-light-surface dark:hover:bg-dark-bg',
                        )}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-light-text-primary dark:text-dark-text-primary">
                              {option.label}
                            </p>
                            <p className="text-xs text-light-text-muted dark:text-dark-text-muted mt-0.5">
                              {option.hint}
                            </p>
                          </div>
                          <span
                            className={cn(
                              'h-4 w-4 rounded-full border-2 shrink-0',
                              selected
                                ? 'border-blue-600 bg-blue-600 shadow-[inset_0_0_0_3px_white]'
                                : 'border-light-border dark:border-dark-border',
                            )}
                          />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="space-y-2.5">
              <div className="flex items-baseline justify-between gap-2">
                <label className="text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary">
                  Delivery note
                </label>
                <span className="text-[11px] font-semibold text-light-text-muted dark:text-dark-text-muted">
                  Optional · +20
                </span>
              </div>
              <Textarea
                value={deliveryNote}
                onChange={(e) => setDeliveryNote(e.target.value)}
                rows={3}
                placeholder="What did you cover? Any gaps?"
                className="rounded-2xl min-h-[88px]"
              />
            </div>

            <div className="space-y-2.5">
              <div className="flex items-baseline justify-between gap-2">
                <label className="text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary">
                  Lesson note file
                </label>
                <span className="text-[11px] font-semibold text-light-text-muted dark:text-dark-text-muted">
                  Optional · +40
                </span>
              </div>

              <input
                ref={lessonFileInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                className="hidden"
                onChange={(e) => setLessonFile(e.target.files?.[0] || null)}
              />

              {lessonFile ? (
                <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-900/20 px-4 py-3">
                  <div className="h-10 w-10 rounded-xl bg-white dark:bg-dark-surface border border-emerald-100 dark:border-emerald-900 flex items-center justify-center shrink-0">
                    <FileText className="h-5 w-5 text-emerald-700 dark:text-emerald-300" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-light-text-primary dark:text-dark-text-primary truncate">
                      {lessonFile.name}
                    </p>
                    <p className="text-xs text-light-text-muted dark:text-dark-text-muted">
                      {(lessonFile.size / 1024).toFixed(0)} KB
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setLessonFile(null);
                      if (lessonFileInputRef.current) lessonFileInputRef.current.value = '';
                    }}
                    className="p-2 rounded-xl text-light-text-muted hover:bg-white/80 dark:hover:bg-dark-surface transition-colors"
                    aria-label="Remove file"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => lessonFileInputRef.current?.click()}
                  className="w-full rounded-2xl border-2 border-dashed border-light-border dark:border-dark-border px-4 py-6 text-center hover:border-blue-400 hover:bg-blue-50/40 dark:hover:bg-blue-900/10 transition-colors"
                >
                  <div className="mx-auto mb-2 flex h-11 w-11 items-center justify-center rounded-2xl bg-light-surface dark:bg-dark-bg">
                    <Upload className="h-5 w-5 text-light-text-muted dark:text-dark-text-muted" />
                  </div>
                  <p className="text-sm font-semibold text-light-text-primary dark:text-dark-text-primary">
                    Upload lesson note
                  </p>
                  <p className="text-xs text-light-text-muted dark:text-dark-text-muted mt-1">
                    PDF, Word, or image
                  </p>
                </button>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-light-border dark:border-dark-border">
              <Button
                variant="ghost"
                onClick={closeDeliveryPanel}
                disabled={isUpdating || isUploading}
                className="rounded-xl"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleConfirmDelivery}
                disabled={isUpdating || isUploading || (isPastDeliveryTarget && !catchUpReason)}
                isLoading={isUpdating || isUploading}
                className="rounded-xl px-6"
              >
                Confirm delivery
              </Button>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
