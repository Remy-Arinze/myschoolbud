'use client';

import React, { useState, useRef, useMemo, useEffect } from 'react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { SearchInput } from '@/components/ui/SearchInput';
import { FadeInUp } from '@/components/ui/FadeInUp';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { ImageUpload } from '@/components/ui/ImageUpload';
import { Input } from '@/components/ui/Input';
import { BookOpen, Plus, FileText, CheckCircle2, Layers, AlertCircle, Clock, Upload as UploadIcon, Trash2, Trash2 as Trash, HardDrive, Check, ChevronRight, Info, ExternalLink, FileJson, Terminal, Loader2, Library, XCircle, Edit2, Sparkles, Target, Users, ClipboardCheck, RotateCcw } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { cn } from '@/lib/utils';
import {
  useGetAgoraCurriculumSourcesQuery,
  useGetAgoraCurriculaQuery,
  useGetAgoraSubjectRegistryQuery,
  useGetSourceStatusQuery,
  useConsolidateAgoraCurriculumMutation,
  usePublishAgoraCurriculumMutation,
  useDeleteAgoraCurriculumSourceMutation,
  useCancelAgoraCurriculumProcessingMutation,
  useRetryAgoraCurriculumParsingMutation,
  useGetAgoraCurriculumQuery,
  useDeleteAgoraCurriculumMutation,
  useUpdateAgoraCurriculumTopicMutation,
  useAddAgoraCurriculumTopicMutation,
  useDeleteAgoraCurriculumTopicMutation,
  AgoraSubjectDto,
  AgoraCurriculumSource,
  AgoraCurriculum
} from '@/lib/store/api/agoraCurriculumApi';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyStateIcon } from '@/components/ui/EmptyStateIcon';
import { Select } from '@/components/ui/Select';
import { UploadCurriculumSourceModal } from '@/components/curriculum/UploadCurriculumSourceModal';

const COMMON_GRADES = [
  { label: 'JSS 1', value: 'JSS_1' },
  { label: 'JSS 2', value: 'JSS_2' },
  { label: 'JSS 3', value: 'JSS_3' },
  { label: 'SS 1', value: 'SS_1' },
  { label: 'SS 2', value: 'SS_2' },
  { label: 'SS 3', value: 'SS_3' },
  { label: 'Pry 1', value: 'PRIMARY_1' },
  { label: 'Pry 2', value: 'PRIMARY_2' },
  { label: 'Pry 3', value: 'PRIMARY_3' },
  { label: 'Pry 4', value: 'PRIMARY_4' },
  { label: 'Pry 5', value: 'PRIMARY_5' },
  { label: 'Pry 6', value: 'PRIMARY_6' },
] as const;

const SUBJECT_MARKS = [
  'bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300',
  'bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300',
  'bg-teal-50 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300',
  'bg-amber-50 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300',
  'bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
  'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300',
];

function gradeLabel(value?: string) {
  if (!value) return 'Unknown';
  return COMMON_GRADES.find((grade) => grade.value === value)?.label || value.replace(/_/g, ' ');
}

function gradeBand(value?: string) {
  const grade = value || '';
  if (grade.startsWith('JSS')) return 'border-l-blue-500';
  if (grade.startsWith('SS')) return 'border-l-violet-500';
  if (grade.startsWith('PRIMARY')) return 'border-l-teal-500';
  return 'border-l-slate-400';
}

function subjectInitials(name?: string) {
  if (!name) return '?';
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function subjectMarkClass(name?: string) {
  const seed = [...(name || '?')].reduce((hash, char) => char.charCodeAt(0) + ((hash << 5) - hash), 0);
  return SUBJECT_MARKS[Math.abs(seed) % SUBJECT_MARKS.length];
}

const FULL_YEAR_TERMS = 3;
const FULL_YEAR_WEEKS = 39;
const CONSOLIDATING_WINDOW_MS = 10 * 60 * 1000;

function activeTopics<T extends { deprecatedAt?: string | null }>(
  curriculum?: { topics?: T[] | null },
): T[] {
  return (curriculum?.topics || []).filter((topic) => !topic.deprecatedAt);
}

function weekCount(curriculum?: { topics?: Array<{ deprecatedAt?: string | null }> | null }) {
  return activeTopics(curriculum).length;
}

function isFullYearCurriculum(curriculum?: { topics?: Array<{ deprecatedAt?: string | null }> | null }) {
  return weekCount(curriculum) >= FULL_YEAR_WEEKS;
}

function weekProgressLabel(curriculum?: { topics?: Array<{ deprecatedAt?: string | null }> | null }) {
  const count = weekCount(curriculum);
  if (count === 0) return '—';
  return count >= FULL_YEAR_WEEKS ? `${FULL_YEAR_WEEKS}` : `${count}/${FULL_YEAR_WEEKS}`;
}

function durationLabel(curriculum?: { topics?: Array<{ term?: number; deprecatedAt?: string | null }> | null }) {
  const topics = activeTopics(curriculum);
  if (topics.length === 0) return 'Not ready';
  const terms = new Set(topics.map((topic) => topic.term).filter(Boolean)).size || 1;
  if (topics.length >= FULL_YEAR_WEEKS && terms >= FULL_YEAR_TERMS) {
    return '3 terms · 39 weeks';
  }
  return `${terms} term${terms === 1 ? '' : 's'} · ${topics.length}/${FULL_YEAR_WEEKS} weeks`;
}

function isRecentlyUpdated(iso?: string, windowMs = CONSOLIDATING_WINDOW_MS) {
  if (!iso) return false;
  return Date.now() - new Date(iso).getTime() < windowMs;
}

function isConsolidationFailed(curriculum?: { consolidationNotes?: string | null }) {
  return !!curriculum?.consolidationNotes?.startsWith('CONSOLIDATION_FAILED:');
}

function isCurriculumWorking(curriculum?: { status?: string; updatedAt?: string; consolidationNotes?: string | null; topics?: Array<{ deprecatedAt?: string | null }> | null }) {
  return curriculum?.status === 'DRAFT' && weekCount(curriculum) === 0 && isRecentlyUpdated(curriculum.updatedAt) && !isConsolidationFailed(curriculum);
}

function isLibraryCurriculum(curriculum?: AgoraCurriculum | null) {
  if (!curriculum || isCurriculumWorking(curriculum) || isConsolidationFailed(curriculum)) return false;
  return isFullYearCurriculum(curriculum) || (curriculum.status === 'PUBLISHED' && weekCount(curriculum) > 0);
}

function parsedSourceWeekCount(source?: { parsedData?: { topics?: unknown[]; terms?: Array<{ weeks?: unknown[] }> } }) {
  const structured = source?.parsedData?.terms?.reduce((sum, term) => sum + (term.weeks?.length || 0), 0) || 0;
  return structured || source?.parsedData?.topics?.length || 0;
}

function groupItemsByGrade<T extends { gradeLevel?: string; subject?: { name?: string } | null }>(items: T[]) {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const key = item.gradeLevel || 'UNKNOWN';
    const list = groups.get(key) || [];
    list.push(item);
    groups.set(key, list);
  }

  return [...groups.entries()]
    .sort((a, b) => {
      const aIdx = COMMON_GRADES.findIndex((grade) => grade.value === a[0]);
      const bIdx = COMMON_GRADES.findIndex((grade) => grade.value === b[0]);
      return (aIdx === -1 ? 999 : aIdx) - (bIdx === -1 ? 999 : bIdx);
    })
    .map(([grade, rows]) => ({
      grade,
      rows: [...rows].sort((a, b) => (a.subject?.name || '').localeCompare(b.subject?.name || '')),
    }));
}

export default function SuperAdminCurriculumPage() {
  const [showSources, setShowSources] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedSourceIds, setSelectedSourceIds] = useState<string[]>([]);
  const [selectedCurriculumIds, setSelectedCurriculumIds] = useState<string[]>([]);
  const [viewingSourceId, setViewingSourceId] = useState<string | null>(null);
  const [previewCurriculumId, setPreviewCurriculumId] = useState<string | null>(null);

  const [reconsolidateTarget, setReconsolidateTarget] = useState<AgoraCurriculum | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<{ type: 'source' | 'curriculum', ids: string[] } | null>(null);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [isBulkPublishing, setIsBulkPublishing] = useState(false);

  // Filters
  const [filterSubjectId, setFilterSubjectId] = useState('all');
  const [filterGradeLevel, setFilterGradeLevel] = useState('all');

  const commonGrades = COMMON_GRADES;

  // Fetch data
  const [isAnyProcessing, setIsAnyProcessing] = useState(false);

  const { data: sources, isLoading: isSourcesLoading } = useGetAgoraCurriculumSourcesQuery(undefined, {
    pollingInterval: isAnyProcessing ? 5000 : 0
  });
  const { data: curricula, isLoading: isCurriculaLoading } = useGetAgoraCurriculaQuery(undefined, {
    pollingInterval: isAnyProcessing ? 5000 : 0
  });

  useEffect(() => {
    const hasActiveSources = sources?.some(s => s.status === 'PENDING_PARSE' || s.status === 'PARSING');
    const hasConsolidatingCurricula = curricula?.some((c) => isCurriculumWorking(c));
    setIsAnyProcessing(!!(hasActiveSources || hasConsolidatingCurricula));
  }, [sources, curricula]);

  const { data: subjectsData } = useGetAgoraSubjectRegistryQuery();
  const subjects = Array.isArray(subjectsData) ? subjectsData : [];

  const [consolidateSources, { isLoading: isConsolidating }] = useConsolidateAgoraCurriculumMutation();
  const [publishCurriculum, { isLoading: isPublishing }] = usePublishAgoraCurriculumMutation();
  const [deleteSource] = useDeleteAgoraCurriculumSourceMutation();
  const [deleteCurriculum] = useDeleteAgoraCurriculumMutation();

  // Filters
  const filteredSources = Array.isArray(sources) ? sources.filter(s => {
    const matchesSearch = s.subject?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.gradeLevel?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSubject = filterSubjectId === 'all' || s.subjectId === filterSubjectId || s.subject?.id === filterSubjectId;
    const matchesGrade = filterGradeLevel === 'all' || s.gradeLevel === filterGradeLevel;

    return matchesSearch && matchesSubject && matchesGrade;
  }) : [];

  const filteredCurricula = Array.isArray(curricula) ? curricula.filter(c => {
    const matchesSearch = c.subject?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.gradeLevel?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSubject = filterSubjectId === 'all' || c.subjectId === filterSubjectId || c.subject?.id === filterSubjectId;
    const matchesGrade = filterGradeLevel === 'all' || c.gradeLevel === filterGradeLevel;

    return matchesSearch && matchesSubject && matchesGrade && isLibraryCurriculum(c);
  }) : [];

  const groupedCurricula = useMemo(() => groupItemsByGrade(filteredCurricula), [filteredCurricula]);
  const groupedSources = useMemo(() => groupItemsByGrade(filteredSources), [filteredSources]);
  const selectedCurricula = useMemo(
    () => filteredCurricula.filter((item) => selectedCurriculumIds.includes(item.id)),
    [filteredCurricula, selectedCurriculumIds]
  );
  const canPublishSelected = selectedCurricula.some((item) => item.status === 'DRAFT' && isFullYearCurriculum(item));
  const canUnpublishSelected = selectedCurricula.some((item) => item.status === 'PUBLISHED');
  const sourceAttentionCount = Array.isArray(sources)
    ? sources.filter((source) => {
        if (['PENDING_PARSE', 'PARSING', 'FAILED'].includes(source.status)) return true;
        if (source.status !== 'PARSED') return false;
        const latest = (curricula || []).filter((item) =>
          item.subjectId === source.subjectId && item.gradeLevel === source.gradeLevel
        ).sort((a, b) => (b.version || 0) - (a.version || 0))[0];
        return !!latest && (isConsolidationFailed(latest) || (weekCount(latest) === 0 && !isCurriculumWorking(latest)));
      }).length
    : 0;

  const handleSelectSource = (id: string) => {
    setSelectedSourceIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleSelectCurriculum = (id: string) => {
    setSelectedCurriculumIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const executeBulkDelete = async () => {
    if (!deleteTarget) return;
    setIsBulkDeleting(true);
    let successCount = 0;
    try {
      if (deleteTarget.type === 'source') {
        const promises = deleteTarget.ids.map(id => deleteSource(id).unwrap().catch(() => { }));
        await Promise.all(promises);
        successCount = deleteTarget.ids.length;
        setSelectedSourceIds([]);
        if (deleteTarget.ids.length === 1 && viewingSourceId === deleteTarget.ids[0]) setViewingSourceId(null);
      } else {
        const promises = deleteTarget.ids.map(id => deleteCurriculum(id).unwrap().catch(() => { }));
        await Promise.all(promises);
        successCount = deleteTarget.ids.length;
        setSelectedCurriculumIds([]);
        if (deleteTarget.ids.length === 1 && previewCurriculumId === deleteTarget.ids[0]) setPreviewCurriculumId(null);
      }
      toast.success(`Deleted ${successCount} ${deleteTarget.type}(s)`);
      setDeleteTarget(null);
    } catch (err: any) {
      toast.error('Some deletions failed.');
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleConsolidate = async (ids?: string[]) => {
    const targetIds = ids || selectedSourceIds;
    if (targetIds.length === 0) return;

    // Group selected sources to make sure they are of same subject and grade
    const selected = sources?.filter(s => targetIds.includes(s.id));
    if (!selected || selected.length === 0) return;

    const firstSubjectId = selected[0].subjectId || selected[0].subject?.id;
    const firstGradeLevel = selected[0].gradeLevel;

    if (!firstSubjectId) {
      toast.error('Selected sources are missing a subject. Please try again.');
      return;
    }

    const isMismatched = selected.some(s => {
      const sSubId = s.subjectId || s.subject?.id;
      return sSubId !== firstSubjectId || s.gradeLevel !== firstGradeLevel;
    });

    if (isMismatched) {
      toast.error('You can only consolidate sources for the same subject and grade level.');
      return;
    }

    try {
      await consolidateSources({
        subjectId: firstSubjectId,
        gradeLevel: firstGradeLevel,
        sourceIds: targetIds
      }).unwrap();
      toast.success('Consolidation started. It will appear in the library when it succeeds.');
      if (!ids) setSelectedSourceIds([]);
    } catch (err: any) {
      toast.error(err?.data?.message || 'Failed to start consolidation');
    }
  };

  const handleBulkPublish = async (nextStatus: 'PUBLISHED' | 'DRAFT') => {
    const selected = (curricula || []).filter((item) => selectedCurriculumIds.includes(item.id));
    const targets = selected.filter((item) => {
      if (item.status === nextStatus) return false;
      if (nextStatus === 'PUBLISHED' && !isFullYearCurriculum(item)) return false;
      return true;
    });

    if (targets.length === 0) {
      toast.error(nextStatus === 'PUBLISHED'
        ? 'None of the selected curricula are ready to publish.'
        : 'None of the selected curricula are published.');
      return;
    }

    setIsBulkPublishing(true);
    try {
      await Promise.all(targets.map((item) => publishCurriculum({ id: item.id, data: { status: nextStatus } }).unwrap()));
      toast.success(
        nextStatus === 'PUBLISHED'
          ? `Published ${targets.length} curriculum${targets.length === 1 ? '' : 'a'}`
          : `Reverted ${targets.length} to draft`
      );
      setSelectedCurriculumIds([]);
    } catch {
      toast.error('Some updates failed.');
    } finally {
      setIsBulkPublishing(false);
    }
  };

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'PARSED': return <Badge variant="success" className="bg-green-100 text-green-800"><CheckCircle2 className="w-3 h-3 mr-1" /> Parsed</Badge>;
      case 'PARSING': return <Badge className="bg-amber-100 text-amber-800 animate-pulse"><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Parsing...</Badge>;
      case 'PENDING_PARSE': return <Badge className="bg-blue-100 text-blue-800"><Clock className="w-3 h-3 mr-1" /> Queued</Badge>;
      case 'FAILED': return <Badge variant="danger"><AlertCircle className="w-3 h-3 mr-1" /> Failed</Badge>;
      case 'PUBLISHED': return <Badge variant="success" className="bg-green-100 text-green-800"><CheckCircle2 className="w-3 h-3 mr-1" /> Published</Badge>;
      case 'DRAFT': return <Badge className="bg-gray-100 text-gray-800 border-gray-300">Draft</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  return (
    <ProtectedRoute roles={['SUPER_ADMIN']}>
      <div className="w-full space-y-6">
        {/* Header */}
        <FadeInUp from={{ opacity: 0, y: -20 }} to={{ opacity: 1, y: 0 }} duration={0.5} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="font-bold text-light-text-primary dark:text-dark-text-primary mb-2 font-heading" style={{ fontSize: 'var(--text-page-title)' }}>
              Curriculum Management
            </h1>
            <p className="text-light-text-secondary dark:text-dark-text-secondary" style={{ fontSize: 'var(--text-page-subtitle)' }}>
              {showSources
                ? 'Upload queue and parse status. Finished sources consolidate on their own.'
                : 'Master curricula. Upload a source and Lois consolidates it automatically.'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowSources((open) => !open)}
              title="Sources"
              aria-label="Sources"
              aria-pressed={showSources}
              className={cn(
                'relative inline-flex items-center justify-center h-10 w-10 rounded-xl border transition-colors',
                showSources
                  ? 'bg-blue-600 border-blue-600 text-white'
                  : 'bg-light-surface dark:bg-white/5 border-light-border dark:border-white/10 text-light-text-secondary dark:text-dark-text-secondary hover:border-blue-400 hover:text-blue-600'
              )}
            >
              <FileText className="w-4 h-4" />
              {sourceAttentionCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center">
                  {sourceAttentionCount}
                </span>
              )}
            </button>
            <Button variant="primary" onClick={() => setIsUploadModalOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Upload Source
            </Button>
          </div>
        </FadeInUp>

        <div className="flex flex-col lg:flex-row lg:items-center gap-3 mb-5">
          <div className="w-full lg:max-w-sm">
            <SearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search subject or class..."
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
            <div className="w-full sm:w-48">
              <Select
                value={filterSubjectId}
                onChange={(e) => setFilterSubjectId(e.target.value)}
                placeholder="All Subjects"
                className="py-1.5 text-xs"
              >
                <option value="all">All Subjects</option>
                {subjects.map(sub => (
                  <option key={sub.id} value={sub.id}>{sub.name}</option>
                ))}
              </Select>
            </div>
            <div className="w-full sm:w-36">
              <Select
                value={filterGradeLevel}
                onChange={(e) => setFilterGradeLevel(e.target.value)}
                placeholder="All Grades"
                className="py-1.5 text-xs"
              >
                <option value="all">All Grades</option>
                {commonGrades.map(grade => (
                  <option key={grade.value} value={grade.value}>{grade.label}</option>
                ))}
              </Select>
            </div>
          </div>
          <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary lg:ml-auto">
            {showSources
              ? `${filteredSources.length} sources · ${new Set(filteredSources.map((item) => item.gradeLevel)).size} classes`
              : `${filteredCurricula.length} curricula · ${new Set(filteredCurricula.map((item) => item.gradeLevel)).size} classes`}
          </p>
        </div>

        {/* Content */}
        <FadeInUp from={{ opacity: 0, y: 10 }} to={{ opacity: 1, y: 0 }} duration={0.2}>
          {!showSources && (
            <div className="space-y-3">
              {isCurriculaLoading ? (
                <div className="flex justify-center p-12"><LoadingSpinner size="lg" /></div>
              ) : filteredCurricula.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center p-12 text-center">
                    <EmptyStateIcon type="statistics" />
                    <h3 className="text-lg font-semibold mt-4 text-light-text-primary dark:text-dark-text-primary">No curricula yet</h3>
                    <p className="text-light-text-secondary dark:text-dark-text-secondary mt-2 max-w-sm">
                      Upload a source. Lois parses it, then consolidates that subject and class automatically.
                    </p>
                    <Button variant="primary" className="mt-6" onClick={() => setIsUploadModalOpen(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Upload Source
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {selectedCurriculumIds.length > 0 && (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 rounded-xl border border-blue-200 dark:border-blue-900/40 bg-blue-50/70 dark:bg-blue-500/10">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-blue-800 dark:text-blue-300">
                          {selectedCurriculumIds.length} selected
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const ids = filteredCurricula.map((item) => item.id);
                            setSelectedCurriculumIds(selectedCurriculumIds.length === ids.length ? [] : ids);
                          }}
                        >
                          {selectedCurriculumIds.length === filteredCurricula.length ? 'Deselect all' : 'Select all'}
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button variant="ghost" size="sm" onClick={() => setSelectedCurriculumIds([])}>Clear</Button>
                        {canUnpublishSelected && (
                          <Button
                            variant="outline"
                            size="sm"
                            isLoading={isBulkPublishing}
                            onClick={() => handleBulkPublish('DRAFT')}
                          >
                            Unpublish
                          </Button>
                        )}
                        {canPublishSelected && (
                          <Button
                            variant="primary"
                            size="sm"
                            isLoading={isBulkPublishing}
                            onClick={() => handleBulkPublish('PUBLISHED')}
                          >
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                            Publish
                          </Button>
                        )}
                        <Button variant="danger" size="sm" onClick={() => setDeleteTarget({ type: 'curriculum', ids: selectedCurriculumIds })}>
                          <Trash className="w-4 h-4 mr-2" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  )}

                  {groupedCurricula.map((group) => (
                    <section key={group.grade} className={cn('rounded-2xl border border-light-border dark:border-white/10 overflow-hidden border-l-4', gradeBand(group.grade))}>
                      <div className="flex items-center justify-between px-4 py-2.5 bg-light-surface/80 dark:bg-white/[0.03]">
                        <h3 className="text-sm font-semibold text-light-text-primary dark:text-dark-text-primary">
                          {gradeLabel(group.grade)}
                        </h3>
                        <span className="text-[11px] text-light-text-secondary dark:text-dark-text-secondary">
                          {group.rows.length} {group.rows.length === 1 ? 'subject' : 'subjects'}
                        </span>
                      </div>
                      <ul className="divide-y divide-light-border dark:divide-white/10">
                        {group.rows.map((curr: AgoraCurriculum) => {
                          const selected = selectedCurriculumIds.includes(curr.id);
                          return (
                            <li
                              key={curr.id}
                              className={cn(
                                'group grid grid-cols-[auto_1fr_auto] md:grid-cols-[auto_minmax(0,1.4fr)_110px_84px_70px_90px_auto_auto] items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors',
                                selected
                                  ? 'bg-blue-50/80 dark:bg-blue-500/10'
                                  : 'hover:bg-light-surface dark:hover:bg-white/[0.03]'
                              )}
                              onClick={() => setPreviewCurriculumId(curr.id)}
                            >
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSelectCurriculum(curr.id);
                                }}
                                className={cn(
                                  'w-[18px] h-[18px] rounded border-2 flex items-center justify-center',
                                  selected ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-300 dark:border-gray-600 hover:border-blue-400'
                                )}
                              >
                                {selected && <Check className="w-3 h-3" />}
                              </button>

                              <div className="flex items-center gap-3 min-w-0">
                                <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-bold shrink-0', subjectMarkClass(curr.subject?.name))}>
                                  {subjectInitials(curr.subject?.name)}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-medium truncate text-light-text-primary dark:text-dark-text-primary">
                                    {curr.subject?.name || 'Unknown Subject'}
                                  </p>
                                  <p className="md:hidden text-[11px] text-light-text-secondary dark:text-dark-text-secondary">
                                    {curr.status} · v{curr.version || 1}
                                  </p>
                                </div>
                              </div>

                              <div className="hidden md:block">
                                <span className={cn(
                                  'text-[11px] font-semibold',
                                  curr.status === 'PUBLISHED' ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
                                )}>
                                  {curr.status}
                                </span>
                              </div>
                              <span className="hidden md:block text-xs text-light-text-secondary dark:text-dark-text-secondary">
                                {weekProgressLabel(curr)} wks
                              </span>
                              <span className="hidden md:block text-xs text-light-text-secondary dark:text-dark-text-secondary">
                                v{curr.version || 1}
                              </span>
                              <span className="hidden md:block text-[11px] text-light-text-secondary dark:text-dark-text-secondary">
                                {curr.updatedAt ? new Date(curr.updatedAt).toLocaleDateString() : '—'}
                              </span>
                              <Button
                                size="xs"
                                variant="outline"
                                className="hidden md:inline-flex h-7 text-[10px] px-2 opacity-0 group-hover:opacity-100"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setReconsolidateTarget(curr);
                                }}
                              >
                                <Layers className="w-3 h-3 mr-1" />
                                New version
                              </Button>
                              <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-blue-500 justify-self-end" />
                            </li>
                          );
                        })}
                      </ul>
                    </section>
                  ))}
                </div>
              )}
            </div>
          )}

          {showSources && (
            <div className="space-y-3">
              {isSourcesLoading ? (
                <div className="flex justify-center p-12"><LoadingSpinner size="lg" /></div>
              ) : filteredSources.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center p-12 text-center">
                    <EmptyStateIcon type="document" />
                    <h3 className="text-lg font-semibold mt-4 text-light-text-primary dark:text-dark-text-primary">No sources found</h3>
                    <p className="text-light-text-secondary dark:text-dark-text-secondary mt-2 max-w-sm">
                      Queue documents here. Each one is parsed, then consolidated for its subject and class.
                    </p>
                    <Button variant="primary" className="mt-6" onClick={() => setIsUploadModalOpen(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Upload Source
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {selectedSourceIds.length > 0 && (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 rounded-xl border border-blue-200 dark:border-blue-900/40 bg-blue-50/70 dark:bg-blue-500/10">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-blue-800 dark:text-blue-300">
                          {selectedSourceIds.length} selected
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const allIds = filteredSources.map((s) => s.id);
                            setSelectedSourceIds(selectedSourceIds.length === allIds.length ? [] : allIds);
                          }}
                        >
                          {selectedSourceIds.length === filteredSources.length ? 'Deselect all' : 'Select all'}
                        </Button>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="danger" size="sm" onClick={() => setDeleteTarget({ type: 'source', ids: selectedSourceIds })}>
                          <Trash className="w-4 h-4 mr-2" />
                          Delete
                        </Button>
                        <Button variant="primary" size="sm" onClick={() => handleConsolidate()} isLoading={isConsolidating}>
                          <Layers className="w-4 h-4 mr-2" />
                          Consolidate
                        </Button>
                      </div>
                    </div>
                  )}

                  {groupedSources.map((group) => (
                    <section key={group.grade} className={cn('rounded-2xl border border-light-border dark:border-white/10 overflow-hidden border-l-4', gradeBand(group.grade))}>
                      <div className="flex items-center justify-between px-4 py-2.5 bg-light-surface/80 dark:bg-white/[0.03]">
                        <h3 className="text-sm font-semibold text-light-text-primary dark:text-dark-text-primary">
                          {gradeLabel(group.grade)}
                        </h3>
                        <span className="text-[11px] text-light-text-secondary dark:text-dark-text-secondary">
                          {group.rows.length} {group.rows.length === 1 ? 'source' : 'sources'}
                        </span>
                      </div>
                      <ul className="divide-y divide-light-border dark:divide-white/10">
                        {group.rows.map((source: AgoraCurriculumSource) => {
                          const selected = selectedSourceIds.includes(source.id);
                          const latest = (curricula || [])
                            .filter((item) => item.subjectId === source.subjectId && item.gradeLevel === source.gradeLevel)
                            .sort((a, b) => (b.version || 0) - (a.version || 0))[0];
                          const inLibrary = (curricula || []).some((item) => isLibraryCurriculum(item) && item.sourceIds?.includes(source.id));
                          const consolidating = isCurriculumWorking(latest);
                          const failed = !!latest && !inLibrary && (isConsolidationFailed(latest) || (weekCount(latest) === 0 && !consolidating));
                          return (
                            <li
                              key={source.id}
                              className={cn(
                                'group grid grid-cols-[auto_1fr_auto] md:grid-cols-[auto_minmax(0,1.3fr)_110px_minmax(0,1fr)_auto_auto] items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors',
                                selected
                                  ? 'bg-blue-50/80 dark:bg-blue-500/10'
                                  : 'hover:bg-light-surface dark:hover:bg-white/[0.03]'
                              )}
                              onClick={() => setViewingSourceId(source.id)}
                            >
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSelectSource(source.id);
                                }}
                                className={cn(
                                  'w-[18px] h-[18px] rounded border-2 flex items-center justify-center',
                                  selected ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-300 dark:border-gray-600 hover:border-blue-400'
                                )}
                              >
                                {selected && <Check className="w-3 h-3" />}
                              </button>

                              <div className="flex items-center gap-3 min-w-0">
                                <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-bold shrink-0', subjectMarkClass(source.subject?.name))}>
                                  {subjectInitials(source.subject?.name)}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-medium truncate text-light-text-primary dark:text-dark-text-primary">
                                    {source.subject?.name || 'Unknown Subject'}
                                  </p>
                                  <p className="md:hidden text-[11px] text-light-text-secondary dark:text-dark-text-secondary truncate">
                                    {source.status.replace(/_/g, ' ')}{source.fileName ? ` · ${source.fileName}` : ''}
                                  </p>
                                </div>
                              </div>

                              <div className="hidden md:block">
                                {renderStatusBadge(source.status)}
                              </div>
                              <p className="hidden md:block text-xs text-light-text-secondary dark:text-dark-text-secondary truncate" title={source.fileName}>
                                {source.fileName || source.sourceType}
                              </p>
                              <div className="hidden md:flex items-center justify-end gap-2">
                                {consolidating && (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-blue-600">
                                    <Loader2 className="w-3 h-3 animate-spin" /> Working
                                  </span>
                                )}
                                {failed && !consolidating && (
                                  <span className="text-[10px] font-semibold uppercase tracking-wide text-red-600 dark:text-red-400">
                                    Failed
                                  </span>
                                )}
                                {inLibrary && !consolidating && (
                                  <span className="text-[10px] font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
                                    In library
                                  </span>
                                )}
                                {source.status === 'PARSED' && !inLibrary && !consolidating && (
                                  <Button
                                    size="xs"
                                    className="h-7 text-[10px] px-2 opacity-0 group-hover:opacity-100"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleConsolidate([source.id]);
                                    }}
                                  >
                                    <Layers className="w-3 h-3 mr-1" />
                                    {failed ? 'Retry' : 'Consolidate'}
                                  </Button>
                                )}
                              </div>
                              <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-blue-500" />
                            </li>
                          );
                        })}
                      </ul>
                    </section>
                  ))}
                </div>
              )}
            </div>
          )}
        </FadeInUp>

        {/* Upload Modal */}
        <UploadCurriculumSourceModal
          isOpen={isUploadModalOpen}
          onClose={() => setIsUploadModalOpen(false)}
          subjects={subjects || []}
        />

        {/* Source Detail Modal */}
        {viewingSourceId && (
          <SourceDetailModal
            sourceId={viewingSourceId}
            isOpen={!!viewingSourceId}
            onClose={() => setViewingSourceId(null)}
            onSelect={(id) => {
              handleSelectSource(id);
              setViewingSourceId(null);
            }}
            onDelete={(id) => setDeleteTarget({ type: 'source', ids: [id] })}
            isSelected={selectedSourceIds.includes(viewingSourceId)}
            canRetryConsolidate={(() => {
              const source = sources?.find((item) => item.id === viewingSourceId);
              if (!source || source.status !== 'PARSED') return false;
              const latest = (curricula || [])
                .filter((item) => item.subjectId === source.subjectId && item.gradeLevel === source.gradeLevel)
                .sort((a, b) => (b.version || 0) - (a.version || 0))[0];
              const inLibrary = (curricula || []).some((item) => isLibraryCurriculum(item) && item.sourceIds?.includes(source.id));
              return !inLibrary && !isCurriculumWorking(latest);
            })()}
            onRetryConsolidate={() => handleConsolidate([viewingSourceId])}
          />
        )}

        {/* Curriculum Preview Modal */}
        {previewCurriculumId && (
          <CurriculumPreviewModal
            curriculumId={previewCurriculumId}
            isOpen={!!previewCurriculumId}
            onClose={() => setPreviewCurriculumId(null)}
            onDelete={(id) => setDeleteTarget({ type: 'curriculum', ids: [id] })}
            onReconsolidate={(curriculum) => setReconsolidateTarget(curriculum)}
          />
        )}

        <ConfirmationModal
          isOpen={!!reconsolidateTarget}
          onClose={() => setReconsolidateTarget(null)}
          onConfirm={async () => {
            if (!reconsolidateTarget) return;
            const subjectId = reconsolidateTarget.subjectId || reconsolidateTarget.subject?.id;
            if (!subjectId || !reconsolidateTarget.sourceIds?.length) {
              toast.error('This curriculum has no sources to reconsolidate.');
              return;
            }
            try {
              await consolidateSources({
                subjectId,
                gradeLevel: reconsolidateTarget.gradeLevel,
                sourceIds: reconsolidateTarget.sourceIds,
                forceNewVersion: true,
              }).unwrap();
              toast.success(`Version ${(reconsolidateTarget.version || 1) + 1} queued. It will appear in the library when it succeeds.`);
              setReconsolidateTarget(null);
            } catch (err: any) {
              toast.error(err?.data?.message || 'Failed to start reconsolidation');
            }
          }}
          isLoading={isConsolidating}
          variant="warning"
          confirmText="Create new version"
          title="Create a new version?"
          message={`This will reconsolidate ${reconsolidateTarget?.subject?.name || 'this curriculum'} (${gradeLabel(reconsolidateTarget?.gradeLevel)}) as version ${(reconsolidateTarget?.version || 1) + 1}. The current version stays in the library until the new one succeeds.`}
        />

        {/* Deletion Confirmation Modal */}
        <ConfirmationModal
          isOpen={!!deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={executeBulkDelete}
          isLoading={isBulkDeleting}
          title="Confirm Deletion"
          message={`Are you sure you want to delete ${deleteTarget?.ids.length || 0} ${deleteTarget?.type}(s)? This action cannot be undone.`}
        />
      </div>
    </ProtectedRoute>
  );
}

function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  isLoading,
  variant = 'danger',
  confirmText = 'Confirm',
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message: string;
  isLoading?: boolean;
  variant?: 'danger' | 'warning';
  confirmText?: string;
}) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <div className="space-y-6">
        <div className="flex flex-col items-center text-center">
          <div className={cn(
            "w-16 h-16 rounded-full flex items-center justify-center mb-4",
            variant === 'danger' ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600"
          )}>
            {variant === 'danger' ? <Trash2 className="w-8 h-8" /> : <AlertCircle className="w-8 h-8" />}
          </div>
          <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary leading-relaxed">
            {message}
          </p>
        </div>

        <div className="flex gap-3 pt-2">
          <Button variant="ghost" onClick={onClose} className="flex-1" disabled={isLoading}>
            Cancel
          </Button>
          <Button
            variant={variant === 'danger' ? 'danger' : 'primary'}
            onClick={onConfirm}
            className="flex-1"
            isLoading={isLoading}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function SourceDetailModal({
  sourceId,
  isOpen,
  onClose,
  onSelect,
  onDelete,
  isSelected,
  canRetryConsolidate,
  onRetryConsolidate,
}: {
  sourceId: string;
  isOpen: boolean;
  onClose: () => void;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  isSelected: boolean;
  canRetryConsolidate?: boolean;
  onRetryConsolidate?: () => void;
}) {
  const { data: source, isLoading, refetch } = useGetSourceStatusQuery(sourceId, {
    pollingInterval: 5000,
    skip: !isOpen
  });

  const [cancelProcessing, { isLoading: isCancelling }] = useCancelAgoraCurriculumProcessingMutation();
  const [retryParsing, { isLoading: isRetrying }] = useRetryAgoraCurriculumParsingMutation();

  const handleDelete = () => {
    onDelete(sourceId);
  };

  const handleCancel = async () => {
    try {
      await cancelProcessing(sourceId).unwrap();
      toast.success("Job cancellation requested");
      refetch();
    } catch (error) {
      toast.error("Failed to cancel job");
    }
  };

  const handleRetry = async () => {
    try {
      await retryParsing(sourceId).unwrap();
      toast.success("Parse job queued again");
      refetch();
    } catch (error: any) {
      toast.error(error?.data?.message || "Failed to retry parsing");
    }
  };

  if (isLoading && !source) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Source Details">
        <div className="flex justify-center p-12"><LoadingSpinner size="lg" /></div>
      </Modal>
    );
  }

  const stages = [
    { name: 'Upload', status: 'completed', icon: <UploadIcon /> },
    {
      name: 'Parsing',
      status: source?.status === 'PARSED' ? 'completed' : source?.status === 'FAILED' ? 'failed' : source?.status === 'PARSING' ? 'processing' : 'pending',
      icon: <Terminal />
    },
    {
      name: 'Structuring',
      status: source?.status === 'PARSED' ? 'completed' : source?.status === 'FAILED' ? 'failed' : 'pending',
      icon: <FileJson />
    }
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Curriculum Source Status" size="xl">
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-800">
          <div>
            <h3 className="font-bold text-lg text-light-text-primary dark:text-dark-text-primary">
              {source?.subject?.name || 'Curriculum Document'}
            </h3>
            <p className="text-sm text-gray-500">Source ID: {sourceId.substring(0, 8)}... • Grade: {source?.gradeLevel}</p>
          </div>
          <div className="flex items-center gap-3">
            {source?.status === 'PARSED' && (
              <Button
                variant={isSelected ? "outline" : "primary"}
                size="sm"
                onClick={() => onSelect(sourceId)}
                className="rounded-xl"
              >
                {isSelected ? 'Deselect' : 'Select for Consolidation'}
              </Button>
            )}
          </div>
        </div>

        <div className="relative flex justify-between px-4 pb-8">
          {stages.map((stage, idx) => (
            <div key={stage.name} className="flex flex-col items-center relative z-10 basis-1/3">
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center mb-2 border-2 transition-all duration-500",
                stage.status === 'completed' ? "bg-green-500 border-green-500 text-white" :
                  stage.status === 'processing' ? "bg-blue-600 border-blue-600 text-white animate-pulse" :
                    stage.status === 'failed' ? "bg-red-500 border-red-500 text-white" :
                      "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-gray-400"
              )}>
                {stage.status === 'completed' ? <Check className="w-5 h-5" /> : React.cloneElement(stage.icon as React.ReactElement, { className: "w-5 h-5" })}
              </div>
              <span className={cn(
                "text-xs font-bold uppercase tracking-wider",
                stage.status === 'completed' ? "text-green-600" :
                  stage.status === 'processing' ? "text-blue-600" :
                    stage.status === 'failed' ? "text-red-600" :
                      "text-gray-400"
              )}>{stage.name}</span>

              {idx < stages.length - 1 && (
                <div className="absolute top-5 left-1/2 w-full h-[2px] bg-gray-100 dark:bg-gray-800 -z-10">
                  <div className={cn(
                    "h-full bg-green-500 transition-all duration-1000",
                    stage.status === 'completed' ? "w-full" : "w-0"
                  )} />
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h4 className="font-bold text-sm uppercase text-gray-400 flex items-center gap-2">
              <Info className="w-4 h-4" /> Metadata
            </h4>
            <Card className="bg-transparent border-gray-100 dark:border-gray-800">
              <CardContent className="p-4 space-y-3">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">File Name</span>
                  <span className="font-medium truncate max-w-[150px]">{source?.fileName || 'Manual Entry'}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Type</span>
                  <span className="font-medium">{source?.sourceType}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Created At</span>
                  <span className="font-medium">{source?.createdAt ? new Date(source.createdAt).toLocaleString() : 'N/A'}</span>
                </div>
                {source?.fileUrl && (
                  <div className="pt-2">
                    <a
                      href={source.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline text-xs flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" /> View Original File
                    </a>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <h4 className="font-bold text-sm uppercase text-gray-400 flex items-center gap-2">
              <Terminal className="w-4 h-4" /> Lois Output Logs
            </h4>
            <div className="max-h-[300px] overflow-y-auto scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              {source?.status === 'FAILED' ? (
                <div className="p-4 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30 rounded-xl">
                  <p className="text-xs text-red-800 dark:text-red-400 font-mono whitespace-pre-wrap">
                    {source?.parseErrors || 'An unknown error occurred during parsing.'}
                  </p>
                </div>
              ) : source?.status === 'PARSED' ? (
                <div className="p-4 bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-900/30 rounded-xl">
                  <p className="text-xs text-green-800 dark:text-green-400 font-medium">
                    Success! Lois has extracted {parsedSourceWeekCount(source)} topics/weeks from this source.
                  </p>
                  <div className="mt-2 text-[10px] text-green-700/60 font-mono">
                    {JSON.stringify(source?.parsedData || {}, null, 2)}
                  </div>
                </div>
              ) : (
                <div className="p-12 text-center text-gray-400">
                  <Loader2 className="w-8 h-8 mx-auto mb-2 animate-spin opacity-20" />
                  <p className="text-xs italic">
                    {source?.status === 'PENDING_PARSE'
                      ? (source?.queuePosition ? `Queued at position #${source.queuePosition}` : 'Waiting for available worker...')
                      : (source?.jobProgress?.step || 'Waiting for Lois processing results...')}
                  </p>
                  {(source?.jobProgress?.step || source?.status === 'PENDING_PARSE') && (
                    <p className="text-[10px] mt-2 text-blue-500/60 font-medium">This typically takes 30-60 seconds</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-6 border-t border-gray-100 dark:border-gray-800">
          <div className="flex gap-2">
            {(source?.status === 'PENDING_PARSE' || source?.status === 'FAILED') && (
              <Button
                variant="outline"
                className="text-blue-600 border-blue-200 hover:bg-blue-50"
                onClick={handleRetry}
                disabled={isRetrying}
              >
                {isRetrying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RotateCcw className="mr-2 h-4 w-4" />}
                Retry Parse
              </Button>
            )}
            {canRetryConsolidate && source?.status === 'PARSED' && (
              <Button
                variant="outline"
                className="text-blue-600 border-blue-200 hover:bg-blue-50"
                onClick={() => {
                  onRetryConsolidate?.();
                  onClose();
                }}
              >
                <Layers className="mr-2 h-4 w-4" />
                Retry consolidate
              </Button>
            )}
            {(source?.status === 'PENDING_PARSE' || source?.status === 'PARSING') && (
              <Button
                variant="outline"
                className="text-amber-600 border-amber-200 hover:bg-amber-50"
                onClick={handleCancel}
                disabled={isCancelling}
              >
                {isCancelling ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <XCircle className="mr-2 h-4 w-4" />}
                Cancel AI Job
              </Button>
            )}
            <Button
              variant="ghost"
              className="text-red-500 hover:text-red-600 hover:bg-red-50"
              onClick={handleDelete}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Source
            </Button>
          </div>
          <Button variant="outline" onClick={onClose} className="min-w-[100px]">
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function CurriculumPreviewModal({
  curriculumId,
  isOpen,
  onClose,
  onDelete,
  onReconsolidate,
}: {
  curriculumId: string;
  isOpen: boolean;
  onClose: () => void;
  onDelete: (id: string) => void;
  onReconsolidate?: (curriculum: AgoraCurriculum) => void;
}) {
  const [isPolling, setIsPolling] = useState(false);
  const { data: curriculum, isLoading } = useGetAgoraCurriculumQuery(curriculumId, {
    skip: !isOpen,
    pollingInterval: isPolling ? 3000 : 0
  });

  useEffect(() => {
    setIsPolling(isOpen && isCurriculumWorking(curriculum));
  }, [isOpen, curriculum]);

  const [updateTopic] = useUpdateAgoraCurriculumTopicMutation();
  const [addTopic] = useAddAgoraCurriculumTopicMutation();
  const [deleteTopic] = useDeleteAgoraCurriculumTopicMutation();
  const [publishCurriculum, { isLoading: isPublishing }] = usePublishAgoraCurriculumMutation();

  const [editingTopicId, setEditingTopicId] = useState<string | null>(null);
  const [editData, setEditData] = useState({
    title: '',
    subTopics: '',
    learningOutcomes: '',
    term: 1
  });

  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'scheme'>('overview');
  const [activeTerm, setActiveTerm] = useState<number>(1);

  const renderOverviewContent = (notes: string) => {
    if (!notes) {
      return <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">No consolidation notes yet.</p>;
    }

    try {
      const isJson = notes.startsWith('{');
      const data = isJson ? JSON.parse(notes) : null;
      const description = isJson ? data.description : notes.split('# Description')[1]?.split('# Themes')[0]?.trim();
      const themes = isJson ? data.themes : notes.split('# Themes')[1]?.split('# Progression Notes')[0]?.trim();
      const progression = isJson ? data.progressionNotes : notes.split('# Progression Notes')[1]?.trim();
      const themesList = Array.isArray(themes) ? themes : themes?.split('\n').map((t: string) => t.replace(/^- /, '').trim()).filter(Boolean);
      const level = curriculum?.gradeLevel?.startsWith('PRIMARY')
        ? 'Primary'
        : curriculum?.gradeLevel?.startsWith('JSS')
          ? 'Junior Secondary'
          : 'Senior Secondary';

      return (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              ['Subject', curriculum?.subject?.name || '—'],
              ['Class', gradeLabel(curriculum?.gradeLevel)],
              ['Level', level],
              ['Duration', durationLabel(curriculum)],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl border border-light-border dark:border-white/10 px-3 py-2.5 bg-light-surface/60 dark:bg-white/[0.03]">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-light-text-secondary dark:text-dark-text-secondary">{label}</p>
                <p className="text-sm font-medium text-light-text-primary dark:text-dark-text-primary mt-0.5 truncate">{value}</p>
              </div>
            ))}
          </div>

          <section className="space-y-2">
            <h4 className="text-xs font-semibold text-light-text-secondary dark:text-dark-text-secondary">Description</h4>
            <p className="text-sm leading-relaxed text-light-text-primary dark:text-dark-text-primary">
              {description || 'Detailed curriculum overview not generated yet.'}
            </p>
          </section>

          <section className="space-y-2">
            <h4 className="text-xs font-semibold text-light-text-secondary dark:text-dark-text-secondary">Themes</h4>
            <div className="flex flex-wrap gap-2">
              {themesList?.length ? themesList.map((theme: string, i: number) => (
                <span key={i} className="text-xs px-2.5 py-1 rounded-lg border border-light-border dark:border-white/10 bg-light-surface dark:bg-white/5 text-light-text-primary dark:text-dark-text-primary">
                  {theme}
                </span>
              )) : <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">No themes listed.</p>}
            </div>
          </section>

          <section className="space-y-2">
            <h4 className="text-xs font-semibold text-light-text-secondary dark:text-dark-text-secondary">Progression</h4>
            <p className="text-sm leading-relaxed text-light-text-primary dark:text-dark-text-primary rounded-xl border border-light-border dark:border-white/10 bg-light-surface/60 dark:bg-white/[0.03] px-4 py-3">
              {progression || 'No progression notes yet.'}
            </p>
          </section>
        </div>
      );
    } catch {
      return <p className="text-sm leading-relaxed whitespace-pre-wrap">{notes}</p>;
    }
  };

  const handleDelete = () => {
    onDelete(curriculumId);
  };
  const topicsEndRef = useRef<HTMLDivElement>(null);
  const [topicToDelete, setTopicToDelete] = useState<string | null>(null);
  const [isDeletingTopic, setIsDeletingTopic] = useState(false);

  const scrollToBottom = () => {
    setTimeout(() => {
      topicsEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, 100);
  };
  const handlePublishToggle = async () => {
    if (!curriculum) return;
    const nextStatus = curriculum.status === 'DRAFT' ? 'PUBLISHED' : 'DRAFT';
    try {
      await publishCurriculum({ id: curriculumId, data: { status: nextStatus } }).unwrap();
      toast.success(`Curriculum ${nextStatus.toLowerCase()} successfully`);
    } catch (err: any) {
      toast.error(err?.data?.message || 'Failed to update publication status');
    }
  };

  const handleStartEdit = (topic: any) => {
    setEditingTopicId(topic.id);
    setEditData({
      title: topic.title,
      subTopics: (topic.subTopics || []).join(', '),
      learningOutcomes: (topic.learningOutcomes || []).join('\n'),
      term: topic.term || 1
    });
  };

  const handleSaveTopic = async (topicId: string) => {
    if (!editData.title) {
      toast.error("Title is required");
      return;
    }
    try {
      await updateTopic({
        topicId,
        data: {
          title: editData.title,
          subTopics: editData.subTopics.split(',').map(s => s.trim()).filter(Boolean),
          learningOutcomes: editData.learningOutcomes.split('\n').map(s => s.trim()).filter(Boolean),
          term: editData.term
        }
      }).unwrap();
      toast.success("Topic updated");
      setEditingTopicId(null);
    } catch {
      toast.error("Failed to update topic");
    }
  };

  const handleAddNewWeek = async () => {
    if (!curriculum) return;
    try {
      const nextWeekNum = (curriculum.topics?.filter((t: any) => t.term === activeTerm).length || 0) + 1;
      const newTopic = await addTopic({
        curriculumId,
        data: {
          title: `Week ${nextWeekNum}: [New Subject]`,
          weekNumber: nextWeekNum,
          subTopics: [],
          learningOutcomes: [],
          term: activeTerm
        }
      }).unwrap();

      toast.success("New week added");
      handleStartEdit(newTopic);
      scrollToBottom();
    } catch {
      toast.error("Failed to add new week");
    }
  };

  const executeDeleteTopic = async () => {
    if (!topicToDelete) return;
    setIsDeletingTopic(true);
    try {
      await deleteTopic(topicToDelete).unwrap();
      toast.success("Week removed");
      setTopicToDelete(null);
    } catch {
      toast.error("Failed to remove week");
    } finally {
      setIsDeletingTopic(false);
    }
  };

  const topics = activeTopics(curriculum);
  const termTopics = topics
    .filter((topic: any) => topic.term === activeTerm)
    .sort((a: any, b: any) => a.weekNumber - b.weekNumber);
  const consolidating = isCurriculumWorking(curriculum);
  const completeYear = isFullYearCurriculum(curriculum);

  if (isLoading) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Curriculum" size="2xl">
        <div className="flex justify-center p-12"><LoadingSpinner size="lg" /></div>
      </Modal>
    );
  }

  if (!curriculum) return null;

  const canTogglePublish = curriculum.status === 'PUBLISHED' || (completeYear && !consolidating);
  const statusLabel = consolidating
    ? 'Consolidating'
    : curriculum.status === 'DRAFT' && !completeYear
      ? (weekCount(curriculum) === 0 ? 'Failed' : 'Incomplete')
      : curriculum.status;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="2xl"
      title={
        <div className="flex items-center gap-3 pr-6">
          <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center text-[11px] font-bold shrink-0', subjectMarkClass(curriculum.subject?.name))}>
            {subjectInitials(curriculum.subject?.name)}
          </div>
          <div>
            <div>{curriculum.subject?.name || 'Curriculum'}</div>
            <p className="mt-0.5 text-sm font-normal font-sans text-light-text-secondary dark:text-dark-text-secondary">
              {gradeLabel(curriculum.gradeLevel)} · v{curriculum.version} · {statusLabel} · {weekProgressLabel(curriculum)} wks
            </p>
          </div>
        </div>
      }
      footer={
        <div className="flex items-center justify-between gap-3">
          <Button variant="ghost" className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20" onClick={handleDelete}>
            <Trash className="w-4 h-4 mr-2" />
            Delete
          </Button>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>Close</Button>
            {onReconsolidate && (
              <Button variant="outline" onClick={() => onReconsolidate(curriculum)}>
                <Layers className="w-4 h-4 mr-2" />
                New version
              </Button>
            )}
            <Button variant="primary" onClick={handlePublishToggle} isLoading={isPublishing} disabled={!canTogglePublish}>
              {curriculum.status === 'DRAFT' ? <CheckCircle2 className="w-4 h-4 mr-2" /> : <XCircle className="w-4 h-4 mr-2" />}
              {curriculum.status === 'DRAFT' ? 'Publish' : 'Unpublish'}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        <div className="inline-flex p-1 rounded-2xl bg-light-surface dark:bg-white/5 border border-light-border dark:border-white/10">
          <button
            type="button"
            onClick={() => setActiveSubTab('overview')}
            className={cn(
              'px-4 py-2 rounded-xl text-sm font-semibold transition-all',
              activeSubTab === 'overview'
                ? 'bg-white dark:bg-[#1a1f2e] text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-light-text-secondary dark:text-dark-text-secondary'
            )}
          >
            Curriculum
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('scheme')}
            className={cn(
              'px-4 py-2 rounded-xl text-sm font-semibold transition-all',
              activeSubTab === 'scheme'
                ? 'bg-white dark:bg-[#1a1f2e] text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-light-text-secondary dark:text-dark-text-secondary'
            )}
          >
            Scheme of work
          </button>
        </div>

        {activeSubTab === 'overview' ? (
          consolidating ? (
            <div className="rounded-2xl border border-dashed border-light-border dark:border-white/10 py-16 text-center">
              <Loader2 className="w-6 h-6 mx-auto mb-3 animate-spin text-blue-500" />
              <p className="text-sm font-medium text-light-text-primary dark:text-dark-text-primary">Lois is consolidating this curriculum</p>
              <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary mt-1">The overview will appear when topics are ready.</p>
            </div>
          ) : (
            renderOverviewContent(curriculum.consolidationNotes || '')
          )
        ) : (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="inline-flex p-1 rounded-xl bg-light-surface dark:bg-white/5 border border-light-border dark:border-white/10">
                {[1, 2, 3].map((term) => (
                  <button
                    key={term}
                    type="button"
                    onClick={() => setActiveTerm(term)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                      activeTerm === term
                        ? 'bg-white dark:bg-[#1a1f2e] text-blue-600 dark:text-blue-400 shadow-sm'
                        : 'text-light-text-secondary dark:text-dark-text-secondary'
                    )}
                  >
                    Term {term}
                  </button>
                ))}
              </div>
              <Button variant="outline" size="sm" onClick={handleAddNewWeek}>
                <Plus className="w-4 h-4 mr-2" />
                Add week
              </Button>
            </div>

            <div className="rounded-2xl border border-light-border dark:border-white/10 overflow-hidden">
              {termTopics.length === 0 ? (
                <div className="py-14 text-center">
                  <p className="text-sm font-medium text-light-text-primary dark:text-dark-text-primary">No weeks in Term {activeTerm}</p>
                  <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary mt-1">Add a week or wait for consolidation to finish.</p>
                </div>
              ) : (
                <ul className="divide-y divide-light-border dark:divide-white/10 max-h-[52vh] overflow-y-auto">
                  {termTopics.map((topic: any) => (
                    <li key={topic.id} className="px-4 py-3.5 group hover:bg-light-surface/70 dark:hover:bg-white/[0.03]">
                      {editingTopicId === topic.id ? (
                        <div className="space-y-3">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <Input
                              value={editData.title}
                              onChange={(e) => setEditData((prev) => ({ ...prev, title: e.target.value }))}
                              placeholder="Week title"
                            />
                            <Select
                              value={editData.term}
                              onChange={(e) => setEditData((prev) => ({ ...prev, term: parseInt(e.target.value) }))}
                            >
                              <option value={1}>Term 1</option>
                              <option value={2}>Term 2</option>
                              <option value={3}>Term 3</option>
                            </Select>
                          </div>
                          <Input
                            value={editData.subTopics}
                            onChange={(e) => setEditData((prev) => ({ ...prev, subTopics: e.target.value }))}
                            placeholder="Subtopics, comma separated"
                          />
                          <textarea
                            rows={3}
                            value={editData.learningOutcomes}
                            onChange={(e) => setEditData((prev) => ({ ...prev, learningOutcomes: e.target.value }))}
                            className="w-full px-3 py-2 text-sm border border-light-border dark:border-dark-border rounded-xl bg-light-surface dark:bg-[#1a1f2e] focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="Learning outcomes, one per line"
                          />
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => handleSaveTopic(topic.id)}>Save</Button>
                            <Button size="sm" variant="ghost" onClick={() => setEditingTopicId(null)}>Cancel</Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start gap-3">
                          <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 shrink-0 mt-0.5 w-14">
                            Week {topic.weekNumber}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-3">
                              <p className="text-sm font-medium text-light-text-primary dark:text-dark-text-primary">{topic.title}</p>
                              <div className="flex shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button type="button" onClick={() => handleStartEdit(topic)} className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-500/10 text-blue-500">
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button type="button" onClick={() => setTopicToDelete(topic.id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                            {topic.subTopics?.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 mt-2">
                                {topic.subTopics.map((st: string, i: number) => (
                                  <span key={i} className="text-[11px] px-2 py-0.5 rounded-md border border-light-border dark:border-white/10 text-light-text-secondary dark:text-dark-text-secondary">
                                    {st}
                                  </span>
                                ))}
                              </div>
                            )}
                            {topic.learningOutcomes?.length > 0 && (
                              <ul className="mt-2 space-y-1">
                                {topic.learningOutcomes.map((lo: string, i: number) => (
                                  <li key={i} className="text-xs text-light-text-secondary dark:text-dark-text-secondary leading-relaxed">
                                    {lo}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              <div ref={topicsEndRef} />
            </div>
          </div>
        )}

        <ConfirmationModal
          isOpen={!!topicToDelete}
          onClose={() => setTopicToDelete(null)}
          onConfirm={executeDeleteTopic}
          isLoading={isDeletingTopic}
          title="Remove Week"
          message="Are you sure you want to delete this week? All subtopics and outcomes for this week will be permanently removed."
        />
      </div>
    </Modal>
  );
}
