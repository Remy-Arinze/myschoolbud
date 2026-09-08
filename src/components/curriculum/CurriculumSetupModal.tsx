'use client';

import React, { useEffect, useState } from 'react';
import {
  Sparkles,
  BookOpen,
  CheckCircle2,
  Loader2,
  X,
  Plus,
  Search,
  FileUp,
  Info,
  Layers,
  ChevronRight,
  Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal, ConfirmModal } from '@/components/ui/Modal';
import { LoisOrb } from '@/components/ai/LoisOrb';
import { cn } from '@/lib/utils';
import {
  useSetupSchemeOfWorkMutation,
  useGetAgoraLibraryQuery,
  useGetSchoolCurriculumDocsQuery,
  useUploadSchoolCurriculumDocMutation,
  useDeleteSchoolCurriculumDocMutation
} from '@/lib/store/api/schoolAdminApi';
import { toast } from 'react-hot-toast';
import { Input } from '@/components/ui/Input';
import { AgoraCurriculumPreviewModal } from './AgoraCurriculumPreviewModal';
import { CalendarCoverageBanner } from './CalendarCoverageBanner';
import {
  coverageFromPlanVsCalendar,
  DEFAULT_LIBRARY_TERM_WEEKS,
} from '@/lib/curriculum/calendar-coverage';

interface CurriculumSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  subject: any;
  schoolId: string;
  classLevelId: string;
  classLevelName: string;
  termId: string;
  creditsRemaining: number;
  hasEnoughCredits?: boolean;
  instructionalWeeks?: number;
  initialTab?: 'AGORA' | 'CUSTOM' | 'MERGE';
  hideLibraryTab?: boolean;
}

const LIVE_SCHEME_STATUSES = new Set(['DRAFT', 'APPROVED', 'PUBLISHED', 'GENERATING']);

function isLiveSchemeStatus(status?: string | null) {
  return !!status && LIVE_SCHEME_STATUSES.has(status);
}

export function CurriculumSetupModal({
  isOpen,
  onClose,
  subject,
  schoolId,
  classLevelId,
  classLevelName,
  termId,
  creditsRemaining,
  hasEnoughCredits: hasEnoughCreditsProp,
  instructionalWeeks = 0,
  initialTab = 'AGORA',
  hideLibraryTab = false,
}: CurriculumSetupModalProps) {
  const hasEnoughCredits =
    hasEnoughCreditsProp ?? (creditsRemaining === -1 || creditsRemaining >= 50);
  const walletLabel =
    creditsRemaining === -1 ? 'Unlimited' : String(creditsRemaining);

  const [activeTab, setActiveTab] = useState<'AGORA' | 'CUSTOM' | 'MERGE'>(
    hideLibraryTab ? 'CUSTOM' : initialTab,
  );
  const [mergeWeightAgora, setMergeWeightAgora] = useState(70);
  const [selectedAgoraId, setSelectedAgoraId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Custom AI State
  const [file, setFile] = useState<File | null>(null);
  const [selectedSourceIds, setSelectedSourceIds] = useState<string[]>([]);
  const [selectedGrades, setSelectedGrades] = useState<string[]>([classLevelName]); // Default to current grade
  const [isUploading, setIsUploading] = useState(false);

  // Preview State
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [showOverwriteConfirm, setShowOverwriteConfirm] = useState(false);
  const [pendingOverwriteId, setPendingOverwriteId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) setActiveTab(hideLibraryTab ? 'CUSTOM' : initialTab);
  }, [isOpen, initialTab, hideLibraryTab]);

  // Queries & Mutations
  const { data: agoraLibrary = [], isLoading: isLoadingLibrary } = useGetAgoraLibraryQuery(
    {
      schoolId,
      subjectId: subject.subjectId,
      gradeLevel: classLevelName // Match the enum e.g. "JSS_1"
    },
    { skip: !isOpen || hideLibraryTab || (activeTab !== 'AGORA' && activeTab !== 'MERGE') }
  );

  const { data: schoolDocsResponse, isLoading: isLoadingDocs } = useGetSchoolCurriculumDocsQuery(
    { schoolId, subjectId: subject.subjectId },
    { skip: !isOpen || (activeTab !== 'CUSTOM' && activeTab !== 'MERGE') }
  );
  const schoolDocs = schoolDocsResponse?.data || [];

  const [setupScheme, { isLoading: isSubmitting }] = useSetupSchemeOfWorkMutation();
  const [uploadDoc, { isLoading: isUploadingDoc }] = useUploadSchoolCurriculumDocMutation();
  const [deleteDoc, { isLoading: isDeletingDoc }] = useDeleteSchoolCurriculumDocMutation();

  const handleDeleteDoc = async (e: React.MouseEvent, docId: string) => {
    e.stopPropagation();
    setShowDeleteConfirm(docId);
  };

  const confirmDeleteDoc = async () => {
    if (!showDeleteConfirm) return;
    try {
      await deleteDoc({ schoolId, docId: showDeleteConfirm }).unwrap();
      toast.success('Document removed');
      setShowDeleteConfirm(null);
    } catch {
      toast.error('Failed to delete document');
    }
  };

  const buildSetupBody = (agoraId: string | null, forceOverwrite: boolean) => ({
    classLevelId,
    subjectId: subject.subjectId,
    termId: activeTab === 'CUSTOM' ? undefined : termId,
    mode: activeTab === 'AGORA' ? 'AGORA_ONLY' : activeTab === 'MERGE' ? 'MERGED' : 'SCHOOL_ONLY',
    agoraCurriculumId: activeTab !== 'CUSTOM' ? agoraId : undefined,
    schoolCurriculumDocIds: activeTab !== 'AGORA' ? selectedSourceIds : undefined,
    mergeWeightAgora: activeTab === 'MERGE' ? mergeWeightAgora : undefined,
    mergeWeightSchool: activeTab === 'MERGE' ? 100 - mergeWeightAgora : undefined,
    forceOverwrite,
  });

  const submitSetup = async (agoraId: string | null, forceOverwrite: boolean) => {
    try {
      if (activeTab === 'CUSTOM' && file) {
        setIsUploading(true);
        toast.loading('Lois is uploading and scanning your document...', { id: 'upload-toast' });

        await uploadDoc({
          schoolId,
          subjectId: subject.subjectId,
          gradeLevel: classLevelName,
          file
        }).unwrap();

        toast.success('Master document uploaded! Lois is now splitting and parsing the content.', { id: 'upload-toast' });
        setIsUploading(false);
        setFile(null);
        return true;
      }

      await setupScheme({
        schoolId,
        body: buildSetupBody(agoraId, forceOverwrite),
      }).unwrap();

      toast.success(
        activeTab === 'AGORA'
          ? forceOverwrite
            ? 'Curriculum replaced successfully'
            : 'Curriculum imported successfully'
          : 'Lois AI has started drafting your scheme of work'
      );
      setShowOverwriteConfirm(false);
      onClose();
      return true;
    } catch (err: any) {
      if (err?.status === 409) {
        if (agoraId) setPendingOverwriteId(agoraId);
        setShowOverwriteConfirm(true);
        return false;
      }
      toast.error(err?.data?.message || 'Failed to setup curriculum', { id: 'upload-toast' });
      setIsUploading(false);
      return false;
    }
  };

  const handleSetup = async (agoraId?: string) => {
    const resolvedAgoraId = agoraId ?? selectedAgoraId;

    if (activeTab === 'AGORA' && !resolvedAgoraId) {
      toast.error('Please select a curriculum template');
      return;
    }

    if (activeTab === 'CUSTOM' && selectedSourceIds.length === 0 && !file) {
      toast.error('Please select an existing document or upload a new one');
      return;
    }

    if (activeTab === 'MERGE' && (!resolvedAgoraId || selectedSourceIds.length === 0)) {
      toast.error('Pick a Bud library version and at least one parsed school document');
      return;
    }

    if (isLiveSchemeStatus(subject?.status) && !showOverwriteConfirm) {
      if (resolvedAgoraId) {
        setSelectedAgoraId(resolvedAgoraId);
        setPendingOverwriteId(resolvedAgoraId);
      }
      setShowOverwriteConfirm(true);
      return;
    }

    await submitSetup(resolvedAgoraId, isLiveSchemeStatus(subject?.status));
  };

  const filteredLibrary = agoraLibrary.filter(item =>
    item.subject?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.consolidationNotes?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const openPreview = (id: string) => {
    setPreviewId(id);
    setIsPreviewOpen(true);
  };

  const handleSelectCurriculum = (id: string) => {
    setSelectedAgoraId(id);
    setIsPreviewOpen(false);
    void handleSetup(id);
  };

  return (
    <>
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      hideHeader={true}
      size="2xl"
      closeOnBackdrop={false}
      className="p-0 border-none shadow-2xl rounded-2xl bg-light-bg dark:bg-dark-bg"
      contentClassName="p-0"
    >
      <div className="flex flex-col bg-light-bg dark:bg-dark-bg font-sans min-h-[600px] overflow-hidden">
        {/* Header Section */}
        <div className="px-6 pt-5 pb-3 border-b border-light-border dark:border-dark-border">
          <div className="flex items-start justify-between mb-4">
            <div className="space-y-4">

              <div className="space-y-1">
                <h2 className="font-black text-light-text-primary dark:text-dark-text-primary font-heading tracking-tight leading-none uppercase" style={{ fontSize: 'var(--text-page-title)' }}>
                  {subject.subjectName}
                </h2>
                <div className="flex items-center gap-2 text-light-text-muted dark:text-dark-text-secondary font-bold uppercase tracking-widest" style={{ fontSize: 'var(--text-tiny)' }}>
                  <span>{(!classLevelName || classLevelName.toLowerCase().includes('unknown')) ? 'General Grade' : classLevelName.replace('_', ' ')}</span>
                  <div className="h-1 w-1 rounded-full bg-light-border dark:bg-dark-border" />
                  <span>Term Outlining</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {((activeTab === 'AGORA' && selectedAgoraId) || activeTab === 'CUSTOM' || activeTab === 'MERGE') && (
                <Button
                  variant="primary"
                  size="sm"
                  className="h-8 px-3 gap-1.5"
                  onClick={() => handleSetup()}
                  disabled={
                    isSubmitting ||
                    isUploadingDoc ||
                    (activeTab === 'CUSTOM' &&
                      ((!file && selectedSourceIds.length === 0) || !hasEnoughCredits)) ||
                    (activeTab === 'AGORA' && !selectedAgoraId) ||
                    (activeTab === 'MERGE' &&
                      (!selectedAgoraId || selectedSourceIds.length === 0 || !hasEnoughCredits))
                  }
                >
                  {isSubmitting || isUploadingDoc ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : activeTab === 'AGORA' ? (
                    <Plus className="h-3.5 w-3.5" />
                  ) : (
                    <LoisOrb size="xs" />
                  )}
                  {activeTab === 'AGORA' ? 'Use Template' : activeTab === 'MERGE' ? 'Confirm merge' : file ? 'Scan & Split' : 'Compile year'}
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

          {/* Simple Tab Styling - matching Class Detail Page */}
          {!hideLibraryTab && (
          <div className="flex space-x-1 overflow-x-auto scrollbar-hide">
            {(['AGORA', 'CUSTOM', 'MERGE'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 font-black transition-all whitespace-nowrap uppercase tracking-[0.15em]",
                  activeTab === tab
                    ? "border-b-2 border-agora-blue text-agora-blue"
                    : "text-light-text-muted dark:text-dark-text-muted hover:text-light-text-primary dark:hover:text-dark-text-primary"
                )}
                style={{ fontSize: 'var(--text-tiny)' }}
              >
                {tab === 'AGORA' && <BookOpen className="h-3.5 w-3.5" />}
                {tab === 'AGORA' ? 'Bud library' : tab === 'MERGE' ? 'Merge' : 'Custom'}
              </button>
            ))}
          </div>
          )}
        </div>

        {/* Content Section */}
        <div className="flex-1 bg-light-bg dark:bg-dark-bg px-6 pb-6 overflow-y-auto max-h-[500px]">
          <div className="pt-6">
            {activeTab === 'AGORA' ? (
              <div className="space-y-6">
                {instructionalWeeks > 0 && (
                  <CalendarCoverageBanner
                    variant="preview"
                    coverage={coverageFromPlanVsCalendar(
                      instructionalWeeks,
                      DEFAULT_LIBRARY_TERM_WEEKS,
                    )}
                  />
                )}
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-black text-light-text-primary dark:text-dark-text-primary uppercase tracking-tight font-heading" style={{ fontSize: 'var(--text-section-title)' }}>
                      Select Master Curriculum
                    </h3>
                    <p className="text-light-text-muted dark:text-dark-text-muted font-bold font-heading" style={{ fontSize: 'var(--text-small)' }}>
                      Pick a pre-verified template from the Bud library.
                    </p>
                  </div>
                  <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-light-text-muted" />
                    <Input
                      placeholder="Search templates..."
                      className="pl-10 h-10 rounded-xl bg-light-surface dark:bg-dark-surface/50 border-transparent focus:border-blue-500/50 transition-all"
                      style={{ fontSize: 'var(--text-small)' }}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>

                {isLoadingLibrary ? (
                  <div className="flex flex-col items-center justify-center py-20 space-y-4">
                    <div className="relative">
                      <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
                      <div className="absolute inset-0 h-10 w-10 rounded-full border-4 border-blue-600/10" />
                    </div>
                    <div className="text-center">
                      <p className="font-black text-light-text-primary dark:text-dark-text-primary uppercase tracking-[0.1em] text-[10px]">Consulting Bud library</p>
                      <p className="text-light-text-muted dark:text-dark-text-muted font-bold text-[9px] mt-1">Lois is retrieving pre-verified templates...</p>
                    </div>
                  </div>
                ) : filteredLibrary.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredLibrary.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => openPreview(item.id)}
                        className={cn(
                          "group p-5 rounded-xl border-2 transition-all cursor-pointer flex items-center gap-4 relative",
                          selectedAgoraId === item.id
                            ? "border-blue-500 bg-blue-500/5 shadow-lg shadow-blue-500/5"
                            : "border-light-border dark:border-dark-border hover:border-blue-500/30"
                        )}
                      >
                        <div className={cn(
                          "h-12 w-12 rounded-lg flex items-center justify-center transition-all",
                          selectedAgoraId === item.id ? "bg-blue-500 text-white" : "bg-light-surface dark:bg-dark-surface text-light-text-muted"
                        )}>
                          <BookOpen className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                             <h4 className="font-black text-light-text-primary dark:text-dark-text-primary truncate uppercase tracking-tight" style={{ fontSize: 'var(--text-small)' }}>
                               v{item.version} - {item.subject?.name}
                             </h4>
                             {item.terms && (
                               <div className="flex gap-1 shrink-0">
                                 {Object.entries(item.terms).map(([term, count]: any) => (
                                   <span key={term} className="px-1 py-0.5 rounded bg-blue-500/10 text-blue-600 text-[8px] font-black">
                                     T{term}:{count}
                                   </span>
                                 ))}
                               </div>
                             )}
                          </div>
                          <p className="text-light-text-muted dark:text-dark-text-muted font-bold truncate" style={{ fontSize: 'var(--text-tiny)' }}>
                            {(() => {
                              if (!item.consolidationNotes) return 'Standard consolidated version';
                              if (item.consolidationNotes.startsWith('{')) {
                                try {
                                  const data = JSON.parse(item.consolidationNotes);
                                  return data.description || 'Standard academic framework';
                                } catch {
                                  return 'Standard consolidated version';
                                }
                              }
                              if (item.consolidationNotes.includes('# Description')) {
                                return item.consolidationNotes.split('# Description')[1]?.split('#')[0]?.trim() || 'Standard academic framework';
                              }
                              return item.consolidationNotes;
                            })()}
                          </p>
                        </div>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                           <Button variant="ghost" className="h-8 px-2 rounded-lg text-[10px] font-black uppercase tracking-widest text-blue-500">
                             Preview
                             <ChevronRight className="h-3 w-3 ml-1" />
                           </Button>
                        </div>
                        {selectedAgoraId === item.id && (
                          <div className="absolute top-2 right-2">
                             <CheckCircle2 className="h-4 w-4 text-blue-500 animate-in zoom-in" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 bg-light-surface dark:bg-dark-surface/30 rounded-xl border border-dashed border-light-border dark:border-dark-border">
                    <div className="p-4 bg-light-card dark:bg-dark-bg rounded-xl shadow-sm">
                      <BookOpen className="h-8 w-8 text-light-text-muted opacity-20" />
                    </div>
                    <div>
                      <p className="font-black text-light-text-primary dark:text-dark-text-primary uppercase tracking-tight" style={{ fontSize: 'var(--text-small)' }}>No Templates Available</p>
                      <p className="text-light-text-muted dark:text-dark-text-muted font-bold max-w-[240px] mt-1" style={{ fontSize: 'var(--text-tiny)' }}>
                        We couldn't find a template for this specific subject and grade level.
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      className="rounded-xl px-6"
                      onClick={() => setActiveTab('CUSTOM')}
                    >
                      Use Custom AI Upload
                    </Button>
                  </div>
                )}
              </div>
             ) : (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {activeTab === 'MERGE' && (
                  <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-5 space-y-4">
                    <div>
                      <h3 className="font-black uppercase tracking-tight" style={{ fontSize: 'var(--text-small)' }}>
                        Confirm merge coverage
                      </h3>
                      <p className="text-light-text-muted font-bold" style={{ fontSize: 'var(--text-tiny)' }}>
                        Library topics keep their stable keys. Weights decide how much school-local content overlays the Bud library. You confirm this mix before Lois drafts the scheme.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                        <span>Bud library {mergeWeightAgora}%</span>
                        <span>School {100 - mergeWeightAgora}%</span>
                      </div>
                      <input
                        type="range"
                        min={40}
                        max={90}
                        value={mergeWeightAgora}
                        onChange={(e) => setMergeWeightAgora(Number(e.target.value))}
                        className="w-full"
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {(agoraLibrary as any[]).slice(0, 4).map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setSelectedAgoraId(item.id)}
                          className={cn(
                            'text-left p-3 rounded-xl border-2',
                            selectedAgoraId === item.id
                              ? 'border-blue-500 bg-blue-500/10'
                              : 'border-light-border dark:border-dark-border'
                          )}
                        >
                          <p className="font-black text-xs uppercase">v{item.version} · {item.subject?.name}</p>
                          <p className="text-[10px] text-light-text-muted">Select the library version to keep keys from</p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="md:col-span-2 space-y-8">
                    
                    {/* Private Library Section */}
                    {isLoadingDocs ? (
                      <div className="flex flex-col items-center justify-center py-12 space-y-4">
                        <Loader2 className="h-8 w-8 animate-spin text-agora-blue" />
                        <p className="font-black text-light-text-primary dark:text-dark-text-primary uppercase tracking-widest text-[9px]">Scanning Private Vault...</p>
                      </div>
                    ) : schoolDocs.length > 0 && (
                      <div className="space-y-4">
                         <div className="flex items-center justify-between">
                            <h4 className="font-black text-light-text-primary dark:text-dark-text-primary uppercase tracking-tight font-heading" style={{ fontSize: 'var(--text-small)' }}>
                              Private Document Vault
                            </h4>
                            <span className="text-light-text-muted dark:text-dark-text-muted font-bold" style={{ fontSize: 'var(--text-tiny)' }}>
                              {schoolDocs.length} Documents Found
                            </span>
                         </div>
                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                           {schoolDocs.map((doc: any) => (
                             <div
                               key={doc.id}
                               onClick={() => {
                                 if (doc.status !== 'PARSED' && doc.status !== 'COMPLETED') return;
                                 setSelectedSourceIds(prev =>
                                   prev.includes(doc.id) ? prev.filter(id => id !== doc.id) : [...prev, doc.id]
                                 );
                               }}
                               className={cn(
                                 "relative p-4 rounded-xl border-2 transition-all group",
                                 doc.status !== 'PARSED' && doc.status !== 'COMPLETED' ? "opacity-60 cursor-not-allowed grayscale" : "cursor-pointer",
                                 selectedSourceIds.includes(doc.id)
                                   ? "border-agora-blue bg-agora-blue/5 shadow-md shadow-agora-blue/5"
                                   : "border-light-border dark:border-dark-border hover:border-agora-blue/30"
                               )}
                             >
                                <div className="flex items-center gap-3">
                                  <div className={cn(
                                    "h-10 w-10 rounded-lg flex items-center justify-center transition-colors",
                                    selectedSourceIds.includes(doc.id) ? "bg-agora-blue text-white" : "bg-light-surface dark:bg-dark-surface text-light-text-muted"
                                  )}>
                                    {doc.status === 'PARSING' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Layers className="h-4 w-4" />}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="font-black text-light-text-primary dark:text-dark-text-primary truncate uppercase tracking-tight" style={{ fontSize: 'var(--text-tiny)' }}>
                                      {doc.fileName || 'Document Source'}
                                    </p>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                      <span className={cn(
                                        "px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-widest",
                                        doc.status === 'PARSED' || doc.status === 'COMPLETED' ? "bg-agora-success/10 text-agora-success" :
                                        doc.status === 'FAILED' ? "bg-red-500/10 text-red-500" : "bg-amber-500/10 text-amber-500"
                                      )}>
                                        {doc.status}
                                      </span>
                                      {doc.gradeLevel && (
                                        <>
                                          <div className="h-1 w-1 rounded-full bg-light-border dark:bg-dark-border" />
                                          <span className="text-[10px] font-black text-light-text-muted uppercase tracking-widest">{doc.gradeLevel.replace('_', ' ')}</span>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                {selectedSourceIds.includes(doc.id) && (
                                  <CheckCircle2 className="absolute top-2 right-[36px] h-4 w-4 text-agora-blue animate-in zoom-in" />
                                )}
                                <button
                                  onClick={(e) => handleDeleteDoc(e, doc.id)}
                                  className="absolute top-2 right-2 text-light-text-muted hover:text-red-500 transition-colors p-1"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                             </div>
                           ))}
                         </div>
                      </div>
                    )}

                    {/* Smart Upload Section */}
                    <div className="space-y-6">
                      <div>
                        <h3 className="font-black text-light-text-primary dark:text-dark-text-primary uppercase tracking-tight font-heading" style={{ fontSize: 'var(--text-section-title)' }}>
                          Smart Curriculum Scanner
                        </h3>
                        <p className="text-light-text-muted dark:text-dark-text-muted font-bold font-heading" style={{ fontSize: 'var(--text-small)' }}>
                          Lois can automatically split one file into sources for multiple grades.
                        </p>
                      </div>

                      <div className="rounded-lg border border-light-border dark:border-dark-border px-3.5 py-3">
                        <p className="text-light-text-muted dark:text-dark-text-muted uppercase tracking-wide mb-1.5" style={{ fontSize: 'var(--text-tiny)' }}>
                          File structure
                        </p>
                        <ul className="text-light-text-secondary dark:text-dark-text-secondary space-y-1 list-disc list-inside leading-relaxed" style={{ fontSize: 'var(--text-small)' }}>
                          <li>One subject per file, with selectable text (not a scan)</li>
                          <li>Grade headings exactly: JSS 1, SS 2, Primary 3</li>
                          <li>Each week: title, Subtopics, Learning outcomes, Student-friendly line</li>
                          <li>Put Revision or Examination in those week titles</li>
                        </ul>
                      </div>

                      <div
                        className={cn(
                          "group relative border-2 border-dashed rounded-xl p-10 transition-all flex flex-col items-center justify-center space-y-4 cursor-pointer overflow-hidden",
                          file
                            ? "border-agora-blue bg-agora-blue/5"
                            : "border-light-border dark:border-dark-border hover:border-agora-blue/30 hover:bg-agora-blue/[0.02]"
                        )}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.preventDefault();
                          const droppedFile = e.dataTransfer.files[0];
                          if (droppedFile) setFile(droppedFile);
                        }}
                        onClick={() => document.getElementById('file-upload')?.click()}
                      >
                        <input
                          id="file-upload"
                          type="file"
                          className="hidden"
                          accept=".pdf,.doc,.docx"
                          onChange={(e) => {
                            const selectedFile = e.target.files?.[0];
                            if (selectedFile) setFile(selectedFile);
                          }}
                        />

                        <div className={cn(
                          "h-16 w-16 rounded-xl flex items-center justify-center transition-all duration-500",
                          file ? "bg-agora-blue text-white scale-110 shadow-lg shadow-agora-blue/20" : "bg-light-surface dark:bg-dark-surface text-light-text-muted group-hover:scale-110 group-hover:text-agora-blue"
                        )}>
                          {file ? <Sparkles className="h-8 w-8 animate-pulse" /> : <FileUp className="h-8 w-8" />}
                        </div>

                        <div className="text-center">
                          <p className="font-black text-light-text-primary dark:text-dark-text-primary uppercase tracking-tight" style={{ fontSize: 'var(--text-small)' }}>
                            {file ? file.name : "Upload Master Document"}
                          </p>
                          <p className="text-light-text-muted dark:text-dark-text-muted font-bold mt-1" style={{ fontSize: 'var(--text-tiny)' }}>
                            {file ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : "Lois scans PDF, Word, and Excel formats"}
                          </p>
                        </div>

                        {file && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setFile(null);
                            }}
                            className="absolute top-4 right-4 h-8 w-8 rounded-full bg-light-card dark:bg-dark-bg shadow-sm border border-light-border dark:border-dark-border flex items-center justify-center text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>

                      {/* Intelligent Split Selector */}
                      {file && (
                        <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
                          <div className="flex items-center justify-between">
                            <h4 className="font-black text-light-text-primary dark:text-dark-text-primary uppercase tracking-widest" style={{ fontSize: 'var(--text-tiny)' }}>
                              Multi-Grade Intelligent Split
                            </h4>
                            <span className="text-agora-blue font-bold" style={{ fontSize: 'var(--text-tiny)' }}>Auto-Scan Active</span>
                          </div>
                          
                          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                            {['JSS_1', 'JSS_2', 'JSS_3', 'SS_1', 'SS_2', 'SS_3'].map((grade) => (
                              <button
                                key={grade}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedGrades(prev => 
                                    prev.includes(grade) ? prev.filter(g => g !== grade) : [...prev, grade]
                                  );
                                }}
                                className={cn(
                                  "px-2 py-2 rounded-lg font-black uppercase tracking-tight transition-all text-center",
                                  selectedGrades.includes(grade)
                                    ? "bg-agora-blue text-white shadow-md shadow-agora-blue/20 scale-105"
                                    : "bg-light-surface dark:bg-dark-surface text-light-text-muted hover:bg-light-border dark:hover:bg-dark-border"
                                )}
                                style={{ fontSize: 'var(--text-tiny)' }}
                              >
                                {grade.replace('_', ' ')}
                              </button>
                            ))}
                          </div>
                          <p className="text-light-text-muted dark:text-dark-text-muted font-bold leading-tight" style={{ fontSize: 'var(--text-tiny)' }}>
                            Lois will scan for these grade levels and create separate private source documents in your vault automatically.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="bg-light-surface dark:bg-dark-surface/50 rounded-2xl p-6 border border-light-border dark:border-dark-border sticky top-0">
                      <div className="flex items-center gap-3 mb-6">
                        <LoisOrb size="lg" />
                        <div>
                          <h4 className="font-black text-light-text-primary dark:text-dark-text-primary uppercase tracking-tight" style={{ fontSize: 'var(--text-small)' }}>
                            Lois AI Curation
                          </h4>
                          <p className="text-light-text-muted dark:text-dark-text-muted font-bold" style={{ fontSize: 'var(--text-tiny)' }}>
                            Smart Verification
                          </p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-light-text-muted dark:text-dark-text-muted uppercase tracking-tight" style={{ fontSize: 'var(--text-tiny)' }}>Base Cost</span>
                          <span className="font-black text-light-text-primary dark:text-dark-text-primary" style={{ fontSize: 'var(--text-small)' }}>50 Credits</span>
                        </div>
                        {selectedGrades.length > 1 && (
                          <div className="flex items-center justify-between animate-in zoom-in duration-300">
                             <span className="font-bold text-agora-success uppercase tracking-tight" style={{ fontSize: 'var(--text-tiny)' }}>Split Multiplier</span>
                             <span className="font-black text-agora-success" style={{ fontSize: 'var(--text-small)' }}>FREE</span>
                          </div>
                        )}
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-light-text-muted dark:text-dark-text-muted uppercase tracking-tight" style={{ fontSize: 'var(--text-tiny)' }}>Wallet</span>
                          <span className="font-black text-light-text-primary dark:text-dark-text-primary" style={{ fontSize: 'var(--text-small)' }}>{walletLabel}</span>
                        </div>

                        <div className="h-px bg-light-border dark:bg-dark-border my-2" />

                        <div className="flex items-center justify-between">
                          <span className="font-black text-light-text-primary dark:text-dark-text-primary uppercase tracking-tight" style={{ fontSize: 'var(--text-tiny)' }}>Total Credits</span>
                          <span className="font-black text-agora-blue text-lg">50</span>
                        </div>
                      </div>

                      <div className="mt-8 space-y-3">
                         <div className="flex items-start gap-2 p-3 bg-agora-blue/5 rounded-xl border border-agora-blue/10">
                            <Info className="h-4 w-4 text-agora-blue mt-0.5" />
                            <p className="text-light-text-muted dark:text-dark-text-muted font-bold leading-tight" style={{ fontSize: 'var(--text-tiny)' }}>
                              Files are scanned for viruses and binary signatures before processing.
                            </p>
                         </div>
                      </div>

                      {!hasEnoughCredits && (
                        <div className="mt-6 p-4 bg-red-500/5 border border-red-500/10 rounded-xl space-y-3">
                          <p className="font-bold text-red-600 leading-tight" style={{ fontSize: 'var(--text-tiny)' }}>
                            Insufficient credits to start AI generation.
                          </p>
                          <Button
                            className="w-full h-10 rounded-xl bg-red-600 hover:bg-red-500 font-black tracking-widest uppercase transition-all"
                            style={{ fontSize: 'var(--text-tiny)' }}
                          >
                            Top Up Wallet
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
    <AgoraCurriculumPreviewModal
      isOpen={isPreviewOpen}
      onClose={() => setIsPreviewOpen(false)}
      curriculumId={previewId || ''}
      schoolId={schoolId}
      onSelect={handleSelectCurriculum}
      isImporting={isSubmitting}
      instructionalWeeks={instructionalWeeks}
    />
    <ConfirmModal
      isOpen={showOverwriteConfirm}
      onClose={() => setShowOverwriteConfirm(false)}
      onConfirm={async () => {
        await submitSetup(pendingOverwriteId ?? selectedAgoraId, true);
      }}
      title="Replace existing scheme?"
      message={`A scheme of work already exists for ${subject.subjectName} this term. Importing this template will permanently replace it.`}
      confirmText="Replace scheme"
      cancelText="Keep current"
      variant="warning"
      isLoading={isSubmitting}
    />
    <ConfirmModal
      isOpen={!!showDeleteConfirm}
      onClose={() => setShowDeleteConfirm(null)}
      onConfirm={confirmDeleteDoc}
      title="Remove document?"
      message="This will permanently delete this document from your private vault."
      confirmText="Delete"
      variant="danger"
      isLoading={isDeletingDoc}
    />
    </>
  );
}
