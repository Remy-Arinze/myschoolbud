'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Loader2,
  Plus,
  X,
  Zap,
  FileUp,
} from 'lucide-react';
import Image from 'next/image';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import { Modal, ConfirmModal } from '@/components/ui/Modal';
import { cn } from '@/lib/utils';
import {
  useGetAgoraCatalogQuery,
  useSetupSchemesBulkMutation,
} from '@/lib/store/api/schoolAdminApi';
import { AgoraCurriculumPreviewModal } from './AgoraCurriculumPreviewModal';
import { CalendarCoverageBanner } from './CalendarCoverageBanner';
import {
  coverageFromPlanVsCalendar,
  DEFAULT_LIBRARY_TERM_WEEKS,
} from '@/lib/curriculum/calendar-coverage';

const LIVE_SCHEME_STATUSES = new Set(['DRAFT', 'APPROVED', 'PUBLISHED', 'GENERATING']);
const BLOCKED_STATUSES = new Set(['GENERATING', 'QUEUED']);

export type CatalogTemplate = {
  id: string;
  version: number;
  gradeLevel?: string;
  consolidationNotes?: string | null;
  subject?: { name?: string };
  schoolSubjectId: string;
  schoolSubjectName: string;
  schemeId?: string | null;
  status?: string;
  agoraCurriculumId?: string | null;
  onThisClass?: boolean;
  termStats?: { term: number; count: number }[];
  totalTopics?: number;
  termTopicCount?: number;
};

function isLiveSchemeStatus(status?: string | null) {
  return !!status && LIVE_SCHEME_STATUSES.has(status);
}

function compareSubjectName(a: string, b: string) {
  return (a || '').localeCompare(b || '', undefined, { sensitivity: 'base' });
}

function templateBlurb(notes?: string | null) {
  if (!notes) return 'Standard consolidated version';
  if (notes.startsWith('{')) {
    try {
      const data = JSON.parse(notes);
      return data.description || 'Standard academic framework';
    } catch {
      return 'Standard consolidated version';
    }
  }
  if (notes.includes('# Description')) {
    return notes.split('# Description')[1]?.split('#')[0]?.trim() || 'Standard academic framework';
  }
  return notes;
}

interface CurriculumCatalogModalProps {
  isOpen: boolean;
  onClose: () => void;
  schoolId: string;
  classLevelId: string;
  classLevelName: string;
  termId: string;
  classId?: string;
  canEdit?: boolean;
  initialSubjectId?: string | null;
  onImported?: () => void;
  onCustomSetup?: (subjectId: string, options?: { hideLibraryTab?: boolean }) => void;
}

export function CurriculumCatalogModal({
  isOpen,
  onClose,
  schoolId,
  classLevelId,
  classLevelName,
  termId,
  classId,
  canEdit = false,
  initialSubjectId = null,
  onImported,
  onCustomSetup,
}: CurriculumCatalogModalProps) {
  const [filterSubjectId, setFilterSubjectId] = useState<string>('ALL');
  const [selection, setSelection] = useState<Record<string, string>>({});
  const [previewTemplate, setPreviewTemplate] = useState<CatalogTemplate | null>(null);
  const [pendingItems, setPendingItems] = useState<CatalogTemplate[]>([]);
  const [showOverwriteConfirm, setShowOverwriteConfirm] = useState(false);

  const { data: catalog, isLoading, isFetching } = useGetAgoraCatalogQuery(
    { schoolId, classLevelId, termId },
    { skip: !isOpen },
  );

  const [setupBulk, { isLoading: isSubmitting }] = useSetupSchemesBulkMutation();

  const subjects = catalog?.subjects ?? [];
  const templates = catalog?.templates ?? [];
  const instructionalWeeks = catalog?.instructionalWeeks ?? 0;
  const showSpinner = isLoading && !catalog;

  useEffect(() => {
    if (!isOpen) return;
    setFilterSubjectId(initialSubjectId || 'ALL');
    setSelection({});
    setPreviewTemplate(null);
    setPendingItems([]);
    setShowOverwriteConfirm(false);
  }, [isOpen, initialSubjectId]);

  const sortedSubjects = useMemo(
    () =>
      [...subjects].sort((a: { subjectName: string }, b: { subjectName: string }) =>
        compareSubjectName(a.subjectName, b.subjectName),
      ),
    [subjects],
  );

  useEffect(() => {
    if (!isOpen || filterSubjectId === 'ALL') return;
    const el = document.getElementById(`catalog-chip-${filterSubjectId}`);
    el?.scrollIntoView({ inline: 'center', block: 'nearest' });
  }, [isOpen, filterSubjectId, sortedSubjects]);

  const filteredTemplates = useMemo(() => {
    const list =
      filterSubjectId === 'ALL'
        ? (templates as CatalogTemplate[])
        : (templates as CatalogTemplate[]).filter((t) => t.schoolSubjectId === filterSubjectId);
    return [...list].sort((a, b) => {
      const byName = compareSubjectName(a.schoolSubjectName || '', b.schoolSubjectName || '');
      if (byName !== 0) return byName;
      return (a.version || 0) - (b.version || 0);
    });
  }, [templates, filterSubjectId]);

  const filteredSubject = filterSubjectId === 'ALL'
    ? null
    : sortedSubjects.find((s: { subjectId: string }) => s.subjectId === filterSubjectId);

  const selectedTemplates = useMemo(
    () =>
      templates.filter(
        (t: CatalogTemplate) => selection[t.schoolSubjectId] === t.id,
      ),
    [templates, selection],
  );

  const toggleTemplate = (template: CatalogTemplate) => {
    if (!canEdit || template.onThisClass || BLOCKED_STATUSES.has(template.status || '')) return;
    setSelection((prev) => {
      const next = { ...prev };
      if (next[template.schoolSubjectId] === template.id) {
        delete next[template.schoolSubjectId];
      } else {
        next[template.schoolSubjectId] = template.id;
      }
      return next;
    });
  };

  const submitItems = async (items: CatalogTemplate[], forceOverwrite: boolean) => {
    if (!items.length) return;
    try {
      const result = await setupBulk({
        schoolId,
        body: {
          classLevelId,
          termId,
          classId,
          forceOverwrite,
          items: items.map((t) => ({
            subjectId: t.schoolSubjectId,
            agoraCurriculumId: t.id,
          })),
        },
      }).unwrap();

      const parts: string[] = [];
      if (result.added) parts.push(`added ${result.added}`);
      if (result.replaced) parts.push(`replaced ${result.replaced}`);
      if (result.failed.length) {
        toast.error(
          [
            parts.length ? `Imported (${parts.join(', ')})` : 'Import finished with errors',
            ...result.failed.map((f) => {
              const name =
                subjects.find((s: { subjectId: string }) => s.subjectId === f.subjectId)
                  ?.subjectName || f.subjectId;
              return `${name}: ${f.error}`;
            }),
          ].join('\n'),
        );
      } else {
        toast.success(
          parts.length ? `Curriculum ${parts.join(', ')}` : 'Curriculum imported',
        );
      }

      if (result.added + result.replaced > 0) {
        onImported?.();
        onClose();
      }
    } catch (err: any) {
      toast.error(err?.data?.message || 'Failed to import curricula');
    }
  };

  const requestAdd = (items: CatalogTemplate[]) => {
    if (!canEdit) return;
    const actionable = items.filter(
      (t) => !t.onThisClass && !BLOCKED_STATUSES.has(t.status || ''),
    );
    if (!actionable.length) {
      toast.error('Nothing to add — selected templates are already on this class');
      return;
    }
    const needsOverwrite = actionable.some(
      (t) => isLiveSchemeStatus(t.status) && !t.onThisClass,
    );
    if (needsOverwrite) {
      setPendingItems(actionable);
      setShowOverwriteConfirm(true);
      return;
    }
    void submitItems(actionable, false);
  };

  const handlePreviewImport = (curriculumId: string) => {
    if (!previewTemplate || previewTemplate.id !== curriculumId) return;
    setSelection((prev) => ({
      ...prev,
      [previewTemplate.schoolSubjectId]: previewTemplate.id,
    }));
    setPreviewTemplate(null);
    requestAdd([previewTemplate]);
  };

  const overwriteCount = pendingItems.filter(
    (t) => isLiveSchemeStatus(t.status) && !t.onThisClass,
  ).length;

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        hideHeader
        size="4xl"
        elevated
        className="p-0 border-none shadow-2xl rounded-2xl bg-light-bg dark:bg-dark-bg"
        contentClassName="p-0"
      >
        <div className="flex flex-col bg-light-bg dark:bg-dark-bg font-sans h-[85vh] overflow-hidden">
          <div className="px-6 pt-5 pb-4 border-b border-light-border dark:border-dark-border">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2 text-agora-blue mb-1 opacity-80">
                  <Image
                    src="/assets/logos/agora_main.png"
                    alt=""
                    width={14}
                    height={14}
                    className="h-3.5 w-3.5 object-contain"
                  />
                  <span className="text-[10px] font-black uppercase tracking-widest font-heading">
                    Bud library
                  </span>
                </div>
                <h2
                  className="font-black text-light-text-primary dark:text-dark-text-primary font-heading tracking-tight leading-none uppercase"
                  style={{ fontSize: 'var(--text-page-title)' }}
                >
                  Class catalog
                </h2>
                <p className="text-light-text-muted dark:text-dark-text-secondary font-bold uppercase tracking-widest" style={{ fontSize: 'var(--text-tiny)' }}>
                  {(!classLevelName || classLevelName.toLowerCase().includes('unknown'))
                    ? 'General Grade'
                    : classLevelName.replace('_', ' ')}
                  <span className="mx-2 opacity-40">•</span>
                  Select templates to add
                  {isFetching && catalog && (
                    <span className="ml-2 inline-flex items-center gap-1 normal-case tracking-widest opacity-60">
                      <Loader2 className="h-3 w-3 animate-spin" />
                    </span>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {canEdit && selectedTemplates.length > 0 && (
                  <Button
                    variant="primary"
                    size="sm"
                    className="h-8 px-3"
                    onClick={() => requestAdd(selectedTemplates)}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Plus className="h-3.5 w-3.5" />
                    )}
                    Add selected ({selectedTemplates.length})
                  </Button>
                )}
                <button
                  onClick={onClose}
                  className="h-8 w-8 rounded-lg bg-light-surface dark:bg-dark-bg flex items-center justify-center text-light-text-muted dark:text-dark-text-muted hover:text-light-text-primary dark:hover:text-dark-text-primary transition-all border border-light-border dark:border-dark-border group"
                >
                  <X className="h-4 w-4 transition-transform group-hover:rotate-90 duration-300" />
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1">
              <button
                onClick={() => setFilterSubjectId('ALL')}
                className={cn(
                  'shrink-0 px-3 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest transition-all',
                  filterSubjectId === 'ALL'
                    ? 'border-agora-blue bg-agora-blue/10 text-agora-blue'
                    : 'border-light-border dark:border-dark-border text-light-text-muted hover:border-agora-blue/40',
                )}
              >
                All
              </button>
              {sortedSubjects.map((s: { subjectId: string; subjectName: string; templateCount?: number }) => (
                <button
                  key={s.subjectId}
                  id={`catalog-chip-${s.subjectId}`}
                  onClick={() => setFilterSubjectId(s.subjectId)}
                    className={cn(
                      'shrink-0 px-3 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest transition-all',
                      filterSubjectId === s.subjectId
                        ? 'border-agora-blue bg-agora-blue/10 text-agora-blue'
                        : 'border-light-border dark:border-dark-border text-light-text-muted hover:border-agora-blue/40',
                    )}
                  >
                    {s.subjectName}
                    {typeof s.templateCount === 'number' && (
                      <span className="ml-1.5 opacity-60">{s.templateCount}</span>
                    )}
                  </button>
                ))}
              </div>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
            {instructionalWeeks > 0 && filterSubjectId !== 'ALL' && (
              <CalendarCoverageBanner
                variant="preview"
                coverage={coverageFromPlanVsCalendar(
                  instructionalWeeks,
                  filteredTemplates[0]?.termTopicCount || DEFAULT_LIBRARY_TERM_WEEKS,
                )}
              />
            )}

            {showSpinner ? (
              <div className="flex flex-col items-center justify-center py-20 space-y-4">
                <div className="relative">
                  <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
                  <div className="absolute inset-0 h-10 w-10 rounded-full border-4 border-blue-600/10" />
                </div>
                <div className="text-center">
                  <p className="font-black text-light-text-primary dark:text-dark-text-primary uppercase tracking-[0.1em] text-[10px]">
                    Consulting Bud library
                  </p>
                  <p className="text-light-text-muted dark:text-dark-text-muted font-bold text-[9px] mt-1">
                    Loading templates for this class...
                  </p>
                </div>
              </div>
            ) : filteredTemplates.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredTemplates.map((item: CatalogTemplate) => {
                  const selected = selection[item.schoolSubjectId] === item.id;
                  const blocked = BLOCKED_STATUSES.has(item.status || '');
                  const planWeeks = item.termTopicCount || DEFAULT_LIBRARY_TERM_WEEKS;
                  const coverage = instructionalWeeks > 0
                    ? coverageFromPlanVsCalendar(instructionalWeeks, planWeeks)
                    : null;
                  return (
                    <div
                      key={`${item.schoolSubjectId}:${item.id}`}
                      onClick={() => toggleTemplate(item)}
                      className={cn(
                        'group p-5 rounded-xl border-2 transition-all flex items-start gap-4 relative',
                        item.onThisClass
                          ? 'border-blue-500/40 bg-blue-500/5 cursor-default'
                          : blocked
                            ? 'border-light-border dark:border-dark-border opacity-60 cursor-not-allowed'
                            : selected
                              ? 'border-blue-500 bg-blue-500/5 shadow-lg shadow-blue-500/5 cursor-pointer'
                              : 'border-light-border dark:border-dark-border hover:border-blue-500/30 cursor-pointer',
                      )}
                    >
                      {canEdit && !item.onThisClass && (
                        <div
                          className={cn(
                            'mt-1 h-5 w-5 rounded-md border-2 flex items-center justify-center shrink-0',
                            selected
                              ? 'border-blue-500 bg-blue-500 text-white'
                              : 'border-light-border dark:border-dark-border',
                          )}
                        >
                          {selected && <CheckCircle2 className="h-3.5 w-3.5" />}
                        </div>
                      )}
                      <div
                        className={cn(
                          'h-12 w-12 rounded-lg flex items-center justify-center transition-all shrink-0',
                          selected || item.onThisClass
                            ? 'bg-blue-500 text-white'
                            : 'bg-light-surface dark:bg-dark-surface text-light-text-muted',
                        )}
                      >
                        <BookOpen className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4
                            className="font-black text-light-text-primary dark:text-dark-text-primary truncate uppercase tracking-tight"
                            style={{ fontSize: 'var(--text-small)' }}
                          >
                            v{item.version} — {item.schoolSubjectName || item.subject?.name}
                          </h4>
                          {item.onThisClass && (
                            <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 text-[8px] font-black uppercase tracking-widest">
                              On this class
                            </span>
                          )}
                          {coverage && coverage.mismatch !== 'ALIGNED' && (
                            <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-700 dark:text-amber-300 text-[8px] font-black uppercase tracking-widest">
                              {coverage.mismatch === 'SHORT' ? 'Short calendar' : 'Long calendar'}
                            </span>
                          )}
                        </div>
                        {item.termStats && (
                          <div className="flex gap-1 mt-1.5">
                            {item.termStats.map((stat) => (
                              <span
                                key={stat.term}
                                className={cn(
                                  'px-1 py-0.5 rounded text-[8px] font-black',
                                  catalog?.termNumber === stat.term
                                    ? 'bg-blue-500/15 text-blue-600'
                                    : 'bg-blue-500/10 text-blue-600',
                                )}
                              >
                                T{stat.term}:{stat.count}
                              </span>
                            ))}
                          </div>
                        )}
                        <p
                          className="text-light-text-muted dark:text-dark-text-muted font-bold truncate mt-1"
                          style={{ fontSize: 'var(--text-tiny)' }}
                        >
                          {templateBlurb(item.consolidationNotes)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewTemplate(item);
                        }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                      >
                        <span className="inline-flex items-center h-8 px-2 rounded-lg text-[10px] font-black uppercase tracking-widest text-blue-500 hover:bg-blue-500/10">
                          Preview
                          <ChevronRight className="h-3 w-3 ml-1" />
                        </span>
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 bg-light-surface dark:bg-dark-surface/30 rounded-xl border border-dashed border-light-border dark:border-dark-border">
                <div className="p-4 bg-light-card dark:bg-dark-bg rounded-xl shadow-sm">
                  <BookOpen className="h-8 w-8 text-light-text-muted opacity-20" />
                </div>
                <div>
                  <p
                    className="font-black text-light-text-primary dark:text-dark-text-primary uppercase tracking-tight"
                    style={{ fontSize: 'var(--text-small)' }}
                  >
                    {filterSubjectId === 'ALL' ? 'No templates for this class' : 'No Bud template'}
                  </p>
                  <p
                    className="text-light-text-muted dark:text-dark-text-muted font-bold max-w-[280px] mt-1"
                    style={{ fontSize: 'var(--text-tiny)' }}
                  >
                    {filterSubjectId === 'ALL'
                      ? 'None of this class’s timetable subjects have a published Bud library match.'
                      : 'No Bud template — upload a school document for this subject.'}
                  </p>
                </div>
                {canEdit && filteredSubject && onCustomSetup && (
                  <Button
                    variant="outline"
                    className="rounded-xl px-6"
                    onClick={() => onCustomSetup(filteredSubject.subjectId, { hideLibraryTab: true })}
                  >
                    <FileUp className="h-3.5 w-3.5 mr-2" />
                    Upload
                  </Button>
                )}
              </div>
            )}
          </div>

          {canEdit && filteredSubject && onCustomSetup && filteredTemplates.length > 0 && (
            <div className="px-6 py-3 border-t border-light-border dark:border-dark-border flex items-center justify-between">
              <p className="text-[10px] font-bold text-light-text-muted uppercase tracking-widest">
                Prefer a school document for {filteredSubject.subjectName}?
              </p>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-3 text-[10px] font-black uppercase tracking-widest"
                onClick={() => onCustomSetup(filteredSubject.subjectId)}
              >
                <Zap className="h-3.5 w-3.5 mr-1.5" />
                Custom / AI
              </Button>
            </div>
          )}
        </div>
      </Modal>

      <AgoraCurriculumPreviewModal
        isOpen={!!previewTemplate}
        onClose={() => setPreviewTemplate(null)}
        curriculumId={previewTemplate?.id || ''}
        schoolId={schoolId}
        onSelect={handlePreviewImport}
        isImporting={isSubmitting}
        instructionalWeeks={instructionalWeeks}
      />

      <ConfirmModal
        isOpen={showOverwriteConfirm}
        onClose={() => {
          setShowOverwriteConfirm(false);
          setPendingItems([]);
        }}
        onConfirm={async () => {
          await submitItems(pendingItems, true);
        }}
        title="Replace existing schemes?"
        message={
          overwriteCount === 1
            ? `A scheme already exists for ${pendingItems.find((t) => isLiveSchemeStatus(t.status))?.schoolSubjectName || 'this subject'} this term. Importing will permanently replace it.`
            : `${overwriteCount} selected subjects already have a scheme this term. Importing will permanently replace them.`
        }
        confirmText="Replace schemes"
        cancelText="Keep current"
        variant="warning"
        isLoading={isSubmitting}
      />
    </>
  );
}
