'use client';

import React, { useState } from 'react';
import {
  Calendar,
  CheckCircle2,
  ChevronRight,
  Info,
  Layers,
  ArrowLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useGetAgoraCurriculumPreviewQuery } from '@/lib/store/api/schoolAdminApi';
import Image from 'next/image';
import { CalendarCoverageBanner } from './CalendarCoverageBanner';
import {
  coverageFromPlanVsCalendar,
  DEFAULT_LIBRARY_TERM_WEEKS,
} from '@/lib/curriculum/calendar-coverage';

interface AgoraCurriculumPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  curriculumId: string;
  schoolId: string;
  onSelect: (curriculumId: string) => void;
  isImporting?: boolean;
  instructionalWeeks?: number;
}

export function AgoraCurriculumPreviewModal({
  isOpen,
  onClose,
  curriculumId,
  schoolId,
  onSelect,
  isImporting = false,
  instructionalWeeks = 0,
}: AgoraCurriculumPreviewModalProps) {
  const { data: preview, isLoading } = useGetAgoraCurriculumPreviewQuery(
    { schoolId, curriculumId },
    { skip: !isOpen || !curriculumId }
  );

  const [activeTab, setActiveTab] = useState<'CURRICULUM' | 'SCHEME'>('CURRICULUM');
  const [activeTerm, setActiveTerm] = useState<number>(1);
  const [expandedWeek, setExpandedWeek] = useState<number | null>(null);

  const previewPlanWeeks =
    preview?.termSchemes?.find((t: { term: number; topicCount?: number }) => t.term === activeTerm)
      ?.topicCount ||
    preview?.termSchemes?.find((t: { term: number; topics?: unknown[] }) => t.term === activeTerm)
      ?.topics?.length ||
    DEFAULT_LIBRARY_TERM_WEEKS;

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      hideHeader={true}
      size="4xl"
      elevated
      className="p-0 border-none shadow-2xl rounded-2xl bg-light-bg dark:bg-dark-bg"
      contentClassName="p-0"
    >
      <div className="flex flex-col bg-light-bg dark:bg-dark-bg font-sans h-[85vh] overflow-hidden">
        <div className="px-6 py-4 border-b border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg">
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={onClose}
              className="flex items-center gap-1.5 text-light-text-muted dark:text-dark-text-muted hover:text-light-text-primary dark:hover:text-dark-text-primary transition-colors group"
            >
              <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-1" />
              <span className="font-bold uppercase tracking-widest text-[10px]">Back to Library</span>
            </button>
            <div className="px-2 py-0.5 rounded-md bg-agora-blue/10 text-agora-blue text-[10px] font-bold uppercase tracking-widest border border-agora-blue/20">
              Pre-Verified Template
            </div>
          </div>

          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1 min-w-0">
              <h2 className="font-black text-light-text-primary dark:text-dark-text-primary font-heading tracking-tight leading-none uppercase truncate" style={{ fontSize: 'var(--text-page-title)' }}>
                {isLoading ? (
                  <div className="h-6 w-56 bg-light-surface dark:bg-dark-surface rounded animate-pulse" />
                ) : (
                  preview?.subjectName
                )}
              </h2>
              <div className="flex items-center gap-2 text-light-text-muted dark:text-dark-text-secondary font-bold uppercase tracking-widest" style={{ fontSize: 'var(--text-tiny)' }}>
                <span>{preview?.gradeLevel?.replace('_', ' ')}</span>
                <div className="h-1 w-1 rounded-full bg-light-border dark:bg-dark-border" />
                <span>v{preview?.version || '1.0'}</span>
                <div className="h-1 w-1 rounded-full bg-light-border dark:bg-dark-border" />
                <span>3 Terms Consolidated</span>
              </div>
            </div>

            {isLoading ? (
              <div className="h-8 w-24 bg-light-surface dark:bg-dark-surface rounded-lg animate-pulse" />
            ) : (
              <Button
                variant="primary"
                size="sm"
                className="h-8 px-3"
                isLoading={isImporting}
                onClick={() => onSelect(curriculumId)}
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Import
              </Button>
            )}
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          <div className="w-72 border-r border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg p-5 overflow-y-auto space-y-6">
            {instructionalWeeks > 0 && (
              <CalendarCoverageBanner
                variant="preview"
                coverage={coverageFromPlanVsCalendar(instructionalWeeks, previewPlanWeeks)}
              />
            )}
            <div className="space-y-3">
              <h3 className="font-black text-light-text-primary dark:text-dark-text-primary uppercase tracking-widest flex items-center gap-2" style={{ fontSize: 'var(--text-tiny)' }}>
                <Info className="h-3.5 w-3.5 text-agora-blue" />
                Quick Summary
              </h3>
              <div className="bg-light-surface dark:bg-dark-surface p-3.5 rounded-xl border border-light-border dark:border-dark-border">
                {isLoading ? (
                  <div className="space-y-2">
                    <div className="h-3 w-full bg-light-card dark:bg-dark-bg rounded animate-pulse" />
                    <div className="h-3 w-4/5 bg-light-card dark:bg-dark-bg rounded animate-pulse" />
                    <div className="h-3 w-4/5 bg-light-card dark:bg-dark-bg rounded animate-pulse" />
                  </div>
                ) : (
                  <p className="font-medium text-light-text-muted dark:text-dark-text-muted leading-relaxed" style={{ fontSize: 'var(--text-tiny)' }}>
                    This {preview?.subjectName} curriculum for {preview?.gradeLevel?.replace('_', ' ')} is a comprehensive {preview?.totalTopics}-topic framework designed for {preview?.duration || '39'} weeks of instruction.
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="font-black text-light-text-primary dark:text-dark-text-primary uppercase tracking-widest flex items-center gap-2" style={{ fontSize: 'var(--text-tiny)' }}>
                <Layers className="h-3.5 w-3.5 text-agora-blue" />
                Framework Stats
              </h3>
              <div className="rounded-xl border border-light-border dark:border-dark-border bg-light-surface dark:bg-dark-surface px-3.5 divide-y divide-light-border dark:divide-dark-border">
                {[
                  { label: 'Total Topics', value: preview?.totalTopics || 0 },
                  { label: 'Terms', value: '3' },
                  { label: 'Duration', value: '39 Weeks' },
                  { label: 'Status', value: 'PUBLISHED' },
                ].map((stat, i) => (
                  <div key={i} className="flex items-center justify-between py-2">
                    <span className="font-bold text-light-text-muted dark:text-dark-text-secondary uppercase" style={{ fontSize: 'var(--text-tiny)' }}>{stat.label}</span>
                    <span className="font-black text-light-text-primary dark:text-dark-text-primary" style={{ fontSize: 'var(--text-tiny)' }}>{stat.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-3.5 bg-agora-blue/5 border border-agora-blue/15 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-agora-blue">
                <Image src="/assets/logos/agora_main.png" alt="Bud library" width={14} height={14} className="h-3.5 w-3.5 object-contain" />
                <span className="font-black uppercase tracking-widest" style={{ fontSize: 'var(--text-tiny)' }}>Master Library</span>
              </div>
              <p className="font-medium text-light-text-muted dark:text-dark-text-muted leading-relaxed" style={{ fontSize: 'var(--text-tiny)' }}>
                This is a Bud library template. Using this ensures maximum alignment with NERDC guidelines.
              </p>
            </div>
          </div>

          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="bg-light-bg dark:bg-dark-bg border-b border-light-border dark:border-dark-border flex items-center justify-between px-6">
              <div className="flex gap-6">
                {[
                  { id: 'CURRICULUM', label: 'Curriculum' },
                  { id: 'SCHEME', label: 'Scheme of Work' }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as 'CURRICULUM' | 'SCHEME')}
                    className={cn(
                      "py-3.5 font-black uppercase tracking-[0.15em] transition-all relative",
                      activeTab === tab.id
                        ? "text-agora-blue"
                        : "text-light-text-muted dark:text-dark-text-muted hover:text-light-text-primary dark:hover:text-dark-text-primary"
                    )}
                    style={{ fontSize: 'var(--text-tiny)' }}
                  >
                    {tab.label}
                    {activeTab === tab.id && (
                      <motion.div
                        layoutId="activeTab"
                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-agora-blue rounded-t-full"
                      />
                    )}
                  </button>
                ))}
              </div>

              {activeTab === 'SCHEME' && (
                <div className="flex gap-4">
                  {[1, 2, 3].map((num) => (
                    <button
                      key={num}
                      onClick={() => setActiveTerm(num)}
                      className={cn(
                        "pb-2 font-black uppercase tracking-widest transition-all relative",
                        activeTerm === num
                          ? "text-agora-blue"
                          : "text-light-text-muted dark:text-dark-text-secondary hover:text-light-text-primary dark:hover:text-dark-text-primary"
                      )}
                      style={{ fontSize: 'var(--text-tiny)' }}
                    >
                      Term {num}
                      {activeTerm === num && (
                        <motion.div
                          layoutId="activeTerm"
                          className="absolute -bottom-[2px] left-0 right-0 h-0.5 bg-agora-blue rounded-full"
                        />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-light-bg dark:bg-dark-bg">
              {isLoading ? (
                <div className="space-y-8">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="space-y-4">
                      <div className="h-6 w-48 bg-light-surface dark:bg-dark-surface/50 rounded-lg animate-pulse" />
                      <div className="h-32 bg-light-surface dark:bg-dark-surface/30 rounded-2xl animate-pulse" />
                    </div>
                  ))}
                </div>
              ) : activeTab === 'CURRICULUM' ? (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="max-w-3xl mx-auto space-y-10 pb-16"
                >
                  <div className="space-y-4">
                    <h3 className="font-black text-light-text-primary dark:text-dark-text-primary uppercase tracking-tight" style={{ fontSize: 'var(--text-section-title)' }}>Academic Overview</h3>
                    <p className="text-light-text-secondary dark:text-dark-text-secondary leading-relaxed" style={{ fontSize: 'var(--text-body)' }}>
                      {preview?.overview?.description || 'No detailed description available.'}
                    </p>
                  </div>

                  {preview?.overview?.themes && (
                    <div className="space-y-4">
                      <h3 className="font-black text-agora-blue uppercase tracking-[0.2em]" style={{ fontSize: 'var(--text-tiny)' }}>Learning Themes</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {Array.isArray(preview.overview.themes) ? preview.overview.themes.map((theme: string, i: number) => (
                          <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-light-surface dark:bg-dark-surface border border-light-border dark:border-dark-border">
                            <div className="h-1.5 w-1.5 rounded-full bg-agora-blue" />
                            <span className="font-bold text-light-text-primary dark:text-dark-text-primary uppercase tracking-wide" style={{ fontSize: 'var(--text-tiny)' }}>{theme}</span>
                          </div>
                        )) : (
                          <p className="italic text-light-text-muted" style={{ fontSize: 'var(--text-small)' }}>{preview.overview.themes}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {preview?.overview?.progressionNotes && (
                    <div className="p-5 bg-agora-blue/5 rounded-2xl border border-agora-blue/15 space-y-3">
                      <h3 className="font-black text-agora-blue uppercase tracking-[0.2em] flex items-center gap-2" style={{ fontSize: 'var(--text-tiny)' }}>
                        <Info className="h-3.5 w-3.5" />
                        Progression Notes
                      </h3>
                      <p className="text-light-text-secondary dark:text-dark-text-secondary leading-relaxed whitespace-pre-wrap" style={{ fontSize: 'var(--text-body)' }}>
                        {preview.overview.progressionNotes}
                      </p>
                    </div>
                  )}
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-3 pb-16"
                >
                  {preview?.termSchemes?.find((t: { term: number }) => t.term === activeTerm)?.topics?.map((topic: {
                    weekNumber: number;
                    topic: string;
                    subTopics?: string[];
                    learningOutcomes?: string[];
                    learningGoals?: string[];
                    studentFriendlyOutcomes?: string[];
                    suggestedActivities?: string[];
                    resources?: string[];
                  }, idx: number) => {
                    const isExpanded = expandedWeek === topic.weekNumber;
                    return (
                      <div
                        key={idx}
                        className="rounded-xl bg-light-surface dark:bg-dark-surface hover:border-agora-blue/20 transition-all group overflow-hidden border border-light-border dark:border-dark-border"
                      >
                        <button
                          onClick={() => setExpandedWeek(isExpanded ? null : topic.weekNumber)}
                          className="w-full text-left p-4 flex items-start gap-4"
                        >
                          <div className="h-9 w-12 shrink-0 rounded-lg bg-light-card dark:bg-dark-bg flex items-center justify-center text-[9px] font-black text-light-text-muted dark:text-dark-text-secondary border border-light-border dark:border-dark-border group-hover:bg-agora-blue group-hover:text-white group-hover:border-agora-blue transition-all font-heading uppercase tracking-widest">
                            Wk {topic.weekNumber}
                          </div>
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center justify-between gap-3">
                               <h4 className="font-black text-light-text-primary dark:text-dark-text-primary uppercase tracking-tight" style={{ fontSize: 'var(--text-small)' }}>
                                 {topic.topic}
                               </h4>
                               <div className="flex items-center gap-2">
                                 <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest px-2">
                                   {topic.subTopics?.length || 0} Modules
                                 </Badge>
                                 <ChevronRight className={cn(
                                   "h-4 w-4 text-light-text-muted transition-transform",
                                   isExpanded && "rotate-90 text-agora-blue"
                                 )} />
                               </div>
                            </div>
                            {topic.subTopics && topic.subTopics.length > 0 && !isExpanded && (
                              <div className="flex flex-wrap gap-1.5">
                                {topic.subTopics.slice(0, 3).map((st: string, sidx: number) => (
                                  <span key={sidx} className="px-2 py-0.5 rounded-md bg-light-card dark:bg-dark-bg text-[9px] font-bold text-light-text-muted dark:text-dark-text-secondary border border-light-border dark:border-dark-border uppercase tracking-wide">
                                    {st}
                                  </span>
                                ))}
                                {topic.subTopics.length > 3 && (
                                  <span className="text-[9px] font-bold text-light-text-muted px-2 py-0.5 italic">+{topic.subTopics.length - 3} more</span>
                                )}
                              </div>
                            )}
                          </div>
                        </button>

                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="px-4 pb-6 pt-1"
                            >
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 ml-0 md:ml-[60px]">
                                <div className="space-y-6">
                                  <div className="space-y-3">
                                     <h5 className="font-black uppercase tracking-[0.2em] text-agora-blue" style={{ fontSize: 'var(--text-tiny)' }}>Learning Objectives</h5>
                                     <div className="space-y-3">
                                       {(topic.learningOutcomes || topic.learningGoals || []).map((goal: string, gidx: number) => (
                                         <div key={gidx} className="space-y-1.5">
                                           <div className="flex gap-2 p-2.5 rounded-lg bg-light-card dark:bg-dark-bg border border-light-border dark:border-dark-border">
                                             <div className="h-1.5 w-1.5 rounded-full bg-agora-blue mt-1.5 shrink-0" />
                                             <p className="font-medium text-light-text-primary dark:text-dark-text-primary leading-relaxed" style={{ fontSize: 'var(--text-small)' }}>{goal}</p>
                                           </div>
                                           {topic.studentFriendlyOutcomes?.[gidx] && (
                                             <p className="ml-5 font-medium text-light-text-muted dark:text-dark-text-muted italic" style={{ fontSize: 'var(--text-tiny)' }}>
                                               &ldquo; {topic.studentFriendlyOutcomes[gidx]} &rdquo;
                                             </p>
                                           )}
                                         </div>
                                       ))}
                                     </div>
                                  </div>

                                  {(topic.subTopics && topic.subTopics.length > 0) && (
                                    <div className="space-y-3">
                                       <h5 className="font-black uppercase tracking-[0.2em] text-purple-600" style={{ fontSize: 'var(--text-tiny)' }}>Core Content Modules</h5>
                                       <div className="flex flex-wrap gap-1.5">
                                         {topic.subTopics.map((st: string, sidx: number) => (
                                           <span key={sidx} className="px-2.5 py-1 rounded-lg bg-purple-500/10 text-[10px] font-bold text-purple-700 dark:text-purple-400 border border-purple-500/15 uppercase tracking-wide">
                                             {st}
                                           </span>
                                         ))}
                                       </div>
                                    </div>
                                  )}
                                </div>

                                <div className="space-y-5">
                                   <div className="space-y-3">
                                     <h5 className="font-black uppercase tracking-[0.2em] text-agora-success" style={{ fontSize: 'var(--text-tiny)' }}>Suggested Activities</h5>
                                     <div className="space-y-1.5">
                                       {(topic.suggestedActivities || []).map((activity: string, aidx: number) => (
                                         <div key={aidx} className="flex gap-2 p-2 rounded-lg bg-light-card dark:bg-dark-bg border border-light-border dark:border-dark-border">
                                           <div className="h-1 w-1 rounded-full bg-green-500 mt-1.5 shrink-0" />
                                           <p className="font-medium text-light-text-primary dark:text-dark-text-primary leading-relaxed italic" style={{ fontSize: 'var(--text-tiny)' }}>{activity}</p>
                                         </div>
                                       ))}
                                     </div>
                                   </div>

                                   <div className="space-y-3">
                                     <h5 className="font-black uppercase tracking-[0.2em] text-amber-600" style={{ fontSize: 'var(--text-tiny)' }}>Instructional Resources</h5>
                                     <div className="flex flex-wrap gap-1.5">
                                       {(topic.resources || []).map((res: string, ridx: number) => (
                                         <div key={ridx} className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/15">
                                            <div className="h-1 w-1 rounded-full bg-amber-500" />
                                            <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 capitalize">{res}</span>
                                         </div>
                                       ))}
                                     </div>
                                   </div>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  }) || (
                    <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                      <div className="p-4 bg-light-surface dark:bg-dark-surface rounded-xl border border-light-border dark:border-dark-border">
                        <Calendar className="h-8 w-8 text-light-text-muted opacity-20" />
                      </div>
                      <p className="font-black text-light-text-primary dark:text-dark-text-primary uppercase tracking-tight" style={{ fontSize: 'var(--text-small)' }}>No topics configured for Term {activeTerm}</p>
                    </div>
                  )}
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
