'use client';

import React, { useState } from 'react';
import {
  AlertCircle,
  BookOpen,
  Loader2,
} from 'lucide-react';
import { SubjectCurriculumCard } from './SubjectCurriculumCard';
import { CurriculumSetupModal } from './CurriculumSetupModal';
import { CurriculumCatalogModal } from './CurriculumCatalogModal';
import { CurriculumDetailModal } from './CurriculumDetailModal';
import { CurriculumUploadIntroModal, isCurriculumUploadIntroHidden } from './CurriculumUploadIntroModal';
import { NoTimetableMessage } from './NoTimetableMessage';
import { Button } from '@/components/ui/Button';
import { 
  useGetSchemesSummaryQuery, 
  useGetAgoraCatalogQuery,
  useCancelSchemeOfWorkMutation,
  useDeleteSchemeOfWorkMutation,
} from '@/lib/store/api/schoolAdminApi';
import { useSubscription } from '@/hooks/useSubscription';
import toast from 'react-hot-toast';

interface SubjectCurriculumListProps {
  schoolId: string;
  classLevelId: string;
  classLevelName?: string; // New prop for AI matching
  classId?: string;
  termId: string;
  schoolType: string;
  canEdit?: boolean;
}

export function SubjectCurriculumList({
  schoolId,
  classLevelId,
  classLevelName = 'Unknown Level',
  classId,
  termId,
  schoolType,
  canEdit = false,
}: SubjectCurriculumListProps) {
  const [setupSubject, setSetupSubject] = useState<any | null>(null);
  const [setupInitialTab, setSetupInitialTab] = useState<'AGORA' | 'CUSTOM' | 'MERGE'>('CUSTOM');
  const [setupHideLibrary, setSetupHideLibrary] = useState(false);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [catalogSubjectId, setCatalogSubjectId] = useState<string | null>(null);
  const [viewCurriculumId, setViewCurriculumId] = useState<string | null>(null);
  const [showUploadIntro, setShowUploadIntro] = useState(false);
  const [pendingCustomSetup, setPendingCustomSetup] = useState<{
    subject: any;
    hideLibraryTab: boolean;
  } | null>(null);

  // Fetch schemes summary (status-driven)
  const { 
    data: subjects = [], 
    isLoading,
    isError,
    refetch: refetchSchemes 
  } = useGetSchemesSummaryQuery({
    schoolId,
    classLevelId,
    termId,
  }, {
    refetchOnMountOrArgChange: 30, // Don't refetch on every tab switch if cache is < 30s old
    refetchOnFocus: false,         // Minimize extra traffic on window focus
  });

  const isGenerating = subjects.some(
    (s: any) => s.status === 'GENERATING' || s.status === 'QUEUED',
  );

  useGetSchemesSummaryQuery(
    { schoolId, classLevelId, termId },
    {
      skip: !isGenerating,
      pollingInterval: 10000,
      refetchOnMountOrArgChange: false,
      refetchOnFocus: false,
    },
  );

  // Warm the class catalog cache after cards are in, so Browse library opens instantly.
  useGetAgoraCatalogQuery(
    { schoolId, classLevelId, termId },
    {
      skip: isLoading || isError || subjects.length === 0,
      refetchOnMountOrArgChange: 60,
      refetchOnFocus: false,
    },
  );

  const { summary, isLoading: isLoadingSubscription } = useSubscription();
  const creditsRemaining =
    summary && summary.aiPeriodActive === false ? 0 : summary?.aiCreditsRemaining ?? 0;
  const hasEnoughCredits =
    isLoadingSubscription ||
    summary?.tier === 'CUSTOM' ||
    creditsRemaining === -1 ||
    creditsRemaining >= 50;

  const [cancelGeneration] = useCancelSchemeOfWorkMutation();
  const [deleteScheme] = useDeleteSchemeOfWorkMutation();

  const openCatalog = (subjectId: string | null = null) => {
    setCatalogSubjectId(subjectId);
    setCatalogOpen(true);
  };

  const openCustomSetup = (subjectId: string, options?: { hideLibraryTab?: boolean }) => {
    const subject = subjects.find((s: any) => s.subjectId === subjectId);
    if (!subject) return;
    setCatalogOpen(false);
    const hideLibraryTab = Boolean(options?.hideLibraryTab);
    if (!isCurriculumUploadIntroHidden()) {
      setPendingCustomSetup({ subject, hideLibraryTab });
      setShowUploadIntro(true);
      return;
    }
    setSetupHideLibrary(hideLibraryTab);
    setSetupInitialTab('CUSTOM');
    setSetupSubject(subject);
  };

  const finishUploadIntro = () => {
    setShowUploadIntro(false);
    if (!pendingCustomSetup) return;
    setSetupHideLibrary(pendingCustomSetup.hideLibraryTab);
    setSetupInitialTab('CUSTOM');
    setSetupSubject(pendingCustomSetup.subject);
    setPendingCustomSetup(null);
  };

  const handleCancelGeneration = async (schemeId: string) => {
    try {
      await cancelGeneration({ schoolId, schemeId, classLevelId }).unwrap();
      toast.success('Generation job cancelled. Credits refunded.');
      refetchSchemes();
    } catch (err: any) {
      toast.error(err?.data?.message || 'Failed to cancel generation');
    }
  };

  const handleDeleteScheme = async (schemeId: string) => {
    try {
      await deleteScheme({ schoolId, schemeId, classLevelId }).unwrap();
      toast.success('Curriculum removed successfully.');
      refetchSchemes();
      setViewCurriculumId(null);
    } catch (err: any) {
      toast.error(err?.data?.message || 'Failed to remove curriculum');
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 mt-10 space-y-4 animate-in fade-in zoom-in duration-500">
        <div className="relative">
          <Loader2 className="h-10 w-10 animate-spin text-agora-blue" />
        </div>
        <p className="text-[10px] font-black text-light-text-secondary dark:text-dark-text-secondary animate-pulse uppercase tracking-[0.2em] font-heading">Timetable discovery...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center py-12 px-6">
        <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4">
          <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
        </div>
        <h3 className="text-lg font-semibold text-light-text-primary dark:text-dark-text-primary mb-2" style={{ fontSize: 'var(--text-section-title)' }}>
          Couldn't load curriculum
        </h3>
        <p className="text-light-text-secondary dark:text-dark-text-secondary mb-6 max-w-md mx-auto" style={{ fontSize: 'var(--text-body)' }}>
          Something went wrong while loading subjects for this class. Please try again.
        </p>
        <Button variant="primary" onClick={() => refetchSchemes()}>
          Try again
        </Button>
      </div>
    );
  }

  if (subjects.length === 0) {
    return <NoTimetableMessage classLevelId={classLevelId} />;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-700 font-sans">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-light-border dark:border-dark-border">
        <div>
          <div className="flex items-center gap-2 text-agora-blue mb-2 opacity-60">
            <BookOpen className="h-4 w-4" />
            <span className="text-[10px] font-black uppercase tracking-widest font-heading">Academic Term Outlines</span>
          </div>
          {/* Using a smaller font size variable as requested */}
          <h2 className="text-2xl font-black text-light-text-primary dark:text-dark-text-primary font-heading tracking-tight leading-tight">
            Class Curriculum
          </h2>
          <p className="mt-2 text-xs font-medium text-light-text-secondary dark:text-dark-text-secondary max-w-lg leading-relaxed">
            Manage subject-specific week-by-week strategy for students and teachers.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {canEdit && (
            <Button
              variant="outline"
              className="rounded-xl h-11 px-6 font-black text-[11px] uppercase tracking-widest active:scale-95 transition-all"
              onClick={() => openCatalog(null)}
            >
              <BookOpen className="h-4 w-4 mr-2" />
              Browse library
            </Button>
          )}
        </div>
      </div>

      {/* Stats Summary Panel */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Subjects', value: subjects.length },
          { label: 'Published', value: subjects.filter((s: any) => s.status === 'PUBLISHED').length },
          { label: 'Draft', value: subjects.filter((s: any) => s.status === 'DRAFT').length },
          { label: 'Unset', value: subjects.filter((s: any) => s.status === 'NOT_SET_UP').length },
        ].map((stat, i) => (
          <div key={i} className="p-4 rounded-2xl bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border shadow-sm transition-all hover:bg-light-surface dark:hover:bg-dark-surface/50 translate-z-0">
            <p className="text-[9px] uppercase font-black text-light-text-muted dark:text-dark-text-muted tracking-widest mb-1 font-heading">{stat.label}</p>
            <p className="text-2xl font-black font-heading text-agora-blue">
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
        {subjects.map((subj: any) => (
          <SubjectCurriculumCard
            key={subj.subjectId}
            subject={subj}
            onSetup={() => openCatalog(subj.subjectId)}
            onView={(id) => setViewCurriculumId(id)}
            onEdit={(id) => setViewCurriculumId(id)}
            onCancel={() => subj.schemeId && handleCancelGeneration(subj.schemeId)}
            canEdit={canEdit}
          />
        ))}
      </div>

      <CurriculumCatalogModal
        isOpen={catalogOpen}
        onClose={() => setCatalogOpen(false)}
        schoolId={schoolId}
        classLevelId={classLevelId}
        classLevelName={classLevelName}
        termId={termId}
        classId={classId}
        canEdit={canEdit}
        initialSubjectId={catalogSubjectId}
        onImported={() => refetchSchemes()}
        onCustomSetup={openCustomSetup}
      />

      <CurriculumUploadIntroModal
        isOpen={showUploadIntro}
        onClose={finishUploadIntro}
      />

      {setupSubject && (
        <CurriculumSetupModal
          isOpen={!!setupSubject}
          onClose={() => {
            setSetupSubject(null);
            setSetupHideLibrary(false);
            refetchSchemes();
          }}
          subject={setupSubject}
          schoolId={schoolId}
          classLevelId={classLevelId}
          classLevelName={classLevelName}
          termId={termId}
          creditsRemaining={creditsRemaining}
          hasEnoughCredits={hasEnoughCredits}
          instructionalWeeks={subjects[0]?.instructionalWeeks || 0}
          initialTab={setupInitialTab}
          hideLibraryTab={setupHideLibrary}
        />
      )}

      {viewCurriculumId && (
        <CurriculumDetailModal
          isOpen={!!viewCurriculumId}
          onClose={() => setViewCurriculumId(null)}
          schoolId={schoolId}
          curriculumId={viewCurriculumId}
          classId={classId}
          canEdit={canEdit}
          isScheme={true}
          schoolType={schoolType}
          onDelete={handleDeleteScheme}
          onUpdate={() => refetchSchemes()}
        />
      )}
    </div>
  );
}
