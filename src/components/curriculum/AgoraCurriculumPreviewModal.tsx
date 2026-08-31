'use client';

import React, { useState } from 'react';
import {
  X,
  BookOpen,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Loader2,
  Info,
  Layers,
  ArrowLeft
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useGetAgoraCurriculumPreviewQuery } from '@/lib/store/api/schoolAdminApi';
import Image from 'next/image';

interface AgoraCurriculumPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  curriculumId: string;
  schoolId: string;
  onSelect: (curriculumId: string) => void;
}

export function AgoraCurriculumPreviewModal({
  isOpen,
  onClose,
  curriculumId,
  schoolId,
  onSelect,
}: AgoraCurriculumPreviewModalProps) {
  const { data: preview, isLoading } = useGetAgoraCurriculumPreviewQuery(
    { schoolId, curriculumId },
    { skip: !isOpen || !curriculumId }
  );

  const [activeTab, setActiveTab] = useState<'CURRICULUM' | 'SCHEME'>('CURRICULUM');
  const [activeTerm, setActiveTerm] = useState<number>(1);
  const [expandedWeek, setExpandedWeek] = useState<number | null>(null);

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      hideHeader={true}
      size="4xl"
      className="p-0 border-none shadow-2xl rounded-2xl"
      contentClassName="p-0"
    >
      <div className="flex flex-col bg-white dark:bg-dark-bg font-sans h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-light-border dark:border-dark-border bg-light-card dark:bg-dark-bg">
          <div className="flex items-center justify-between mb-4">
            <button 
              onClick={onClose}
              className="flex items-center gap-2 text-light-text-muted dark:text-dark-text-muted hover:text-light-text-primary dark:hover:text-dark-text-primary transition-colors group"
            >
              <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
              <span className="font-black uppercase tracking-widest text-[10px]">Back to Library</span>
            </button>
            <div className="flex items-center gap-2">
               <div className="px-2 py-1 rounded bg-blue-500/10 text-blue-600 text-[10px] font-black uppercase tracking-widest border border-blue-500/20">
                 Pre-Verified Template
               </div>
            </div>
          </div>

          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <h2 className="font-black text-light-text-primary dark:text-dark-text-primary font-heading tracking-tight leading-none uppercase text-2xl">
                {isLoading ? (
                  <div className="h-8 w-64 bg-light-surface dark:bg-dark-surface rounded animate-pulse" />
                ) : (
                  preview?.subjectName
                )}
              </h2>
              <div className="flex items-center gap-2 text-light-text-muted dark:text-dark-text-secondary font-bold uppercase tracking-widest text-[10px]">
                <span>{preview?.gradeLevel?.replace('_', ' ')}</span>
                <div className="h-1 w-1 rounded-full bg-light-border dark:bg-dark-border" />
                <span>v{preview?.version || '1.0'}</span>
                <div className="h-1 w-1 rounded-full bg-light-border dark:bg-dark-border" />
                <span>3 Terms Consolidated</span>
              </div>
            </div>

            {isLoading ? (
              <div className="h-12 w-32 bg-light-surface dark:bg-dark-surface rounded-xl animate-pulse" />
            ) : (
              <Button 
                className="bg-blue-600 hover:bg-blue-500 px-8 h-12 rounded-xl font-black uppercase tracking-[0.15em] shadow-lg shadow-blue-500/10 transition-all hover:scale-[1.02] active:scale-[0.98] text-xs"
                onClick={() => onSelect(curriculumId)}
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Import
              </Button>
            )}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar - Overview & Stats */}
          <div className="w-80 border-r border-light-border dark:border-dark-border bg-light-surface/30 dark:bg-dark-surface/10 p-6 overflow-y-auto space-y-8">
            <div className="space-y-4">
              <h3 className="font-black text-light-text-primary dark:text-dark-text-primary text-xs uppercase tracking-widest flex items-center gap-2">
                <Info className="h-3.5 w-3.5 text-blue-500" />
                Quick Summary
              </h3>
              <div className="bg-white dark:bg-dark-surface/50 p-4 rounded-xl border border-light-border dark:border-dark-border/50 shadow-sm">
                {isLoading ? (
                  <div className="space-y-2">
                    <div className="h-3 w-full bg-light-surface dark:bg-dark-surface rounded animate-pulse" />
                    <div className="h-3 w-4/5 bg-light-surface dark:bg-dark-surface rounded animate-pulse" />
                    <div className="h-3 w-4/5 bg-light-surface dark:bg-dark-surface rounded animate-pulse" />
                  </div>
                ) : (
                  <p className="text-[11px] font-bold text-light-text-muted dark:text-dark-text-muted leading-relaxed">
                    This {preview?.subjectName} curriculum for {preview?.gradeLevel?.replace('_', ' ')} is a comprehensive {preview?.totalTopics}-topic framework designed for {preview?.duration || '39'} weeks of instruction.
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-black text-light-text-primary dark:text-dark-text-primary text-xs uppercase tracking-widest flex items-center gap-2">
                <Layers className="h-3.5 w-3.5 text-purple-500" />
                Framework Stats
              </h3>
              <div className="space-y-3">
                {[
                  { label: 'Total Topics', value: preview?.totalTopics || 0 },
                  { label: 'Terms', value: '3' },
                  { label: 'Duration', value: '39 Weeks' },
                  { label: 'Status', value: 'PUBLISHED' },
                ].map((stat, i) => (
                  <div key={i} className="flex items-center justify-between py-1.5">
                    <span className="text-[10px] font-bold text-light-text-muted dark:text-dark-text-secondary uppercase">{stat.label}</span>
                    <span className="text-[10px] font-black text-light-text-primary dark:text-dark-text-primary">{stat.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 bg-blue-500/5 border border-blue-500/10 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-blue-600">
                <Image src="/assets/logos/agora_main.png" alt="Bud library" width={14} height={14} className="h-3.5 w-3.5 object-contain" />
                <span className="text-[10px] font-black uppercase tracking-widest">Master Library</span>
              </div>
              <p className="text-[10px] font-bold text-amber-600/80 leading-tight">
                This is a Bud library template. Using this ensures maximum alignment with NERDC guidelines.
              </p>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Top Navigation - Tabs */}
            <div className="bg-white dark:bg-dark-surface border-b border-light-border dark:border-dark-border flex items-center justify-between px-8">
              <div className="flex gap-8">
                {[
                  { id: 'CURRICULUM', label: 'Curriculum' },
                  { id: 'SCHEME', label: 'Scheme of Work' }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={cn(
                      "py-5 text-[11px] font-black uppercase tracking-[0.2em] transition-all relative",
                      activeTab === tab.id
                        ? "text-blue-600"
                        : "text-light-text-muted dark:text-dark-text-muted hover:text-light-text-primary dark:hover:text-dark-text-primary"
                    )}
                  >
                    {tab.label}
                    {activeTab === tab.id && (
                      <motion.div 
                        layoutId="activeTab"
                        className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 rounded-t-full"
                      />
                    )}
                  </button>
                ))}
              </div>

              {activeTab === 'SCHEME' && (
                <div className="flex gap-6">
                  {[1, 2, 3].map((num) => (
                    <button
                      key={num}
                      onClick={() => setActiveTerm(num)}
                      className={cn(
                        "pb-2 text-[10px] font-black uppercase tracking-widest transition-all relative",
                        activeTerm === num
                          ? "text-blue-600"
                          : "text-light-text-muted dark:text-dark-text-secondary hover:text-light-text-primary dark:hover:text-dark-text-primary"
                      )}
                    >
                      Term {num}
                      {activeTerm === num && (
                        <motion.div
                          layoutId="activeTerm"
                          className="absolute -bottom-[2px] left-0 right-0 h-0.5 bg-blue-600 rounded-full"
                        />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Content Display */}
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-light-card dark:bg-dark-bg">
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
                  className="max-w-3xl mx-auto space-y-12 pb-20"
                >
                  {/* Document Content */}
                  <div className="space-y-6">
                    <h3 className="text-xl font-black text-light-text-primary dark:text-dark-text-primary uppercase tracking-tight">Academic Overview</h3>
                    <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary leading-relaxed font-medium">
                      {preview?.overview?.description || 'No detailed description available.'}
                    </p>
                  </div>

                  {preview?.overview?.themes && (
                    <div className="space-y-6">
                      <h3 className="text-xs font-black text-blue-600 uppercase tracking-[0.2em]">Learning Themes</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {Array.isArray(preview.overview.themes) ? preview.overview.themes.map((theme: string, i: number) => (
                          <div key={i} className="flex items-center gap-3 p-4 bg-transparent rounded-xl transition-all">
                            <div className="h-2 w-2 rounded-full bg-blue-500" />
                            <span className="text-[11px] font-bold text-light-text-primary dark:text-dark-text-primary uppercase tracking-wide">{theme}</span>
                          </div>
                        )) : (
                          <p className="text-sm italic text-light-text-muted">{preview.overview.themes}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {preview?.overview?.progressionNotes && (
                    <div className="p-8 bg-blue-500/5 rounded-3xl border border-blue-500/10 space-y-4">
                      <h3 className="text-xs font-black text-blue-600 uppercase tracking-[0.2em] flex items-center gap-2">
                        <Info className="h-4 w-4" />
                        Progression Notes
                      </h3>
                      <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary leading-relaxed font-medium whitespace-pre-wrap">
                        {preview.overview.progressionNotes}
                      </p>
                    </div>
                  )}
                </motion.div>
              ) : (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4 pb-20"
                >
                  {preview?.termSchemes?.find((t: any) => t.term === activeTerm)?.topics?.map((topic: any, idx: number) => {
                    const isExpanded = expandedWeek === topic.weekNumber;
                    return (
                      <div 
                        key={idx}
                        className="rounded-2xl bg-transparent hover:bg-light-surface/20 dark:hover:bg-dark-surface/10 transition-all group overflow-hidden border border-transparent hover:border-light-border dark:hover:border-dark-border/30"
                      >
                        <button 
                          onClick={() => setExpandedWeek(isExpanded ? null : topic.weekNumber)}
                          className="w-full text-left p-6 flex items-start gap-6"
                        >
                          <div className="h-12 w-12 shrink-0 rounded-xl bg-light-surface dark:bg-dark-surface flex items-center justify-center text-[10px] font-black text-light-text-muted dark:text-dark-text-secondary border border-light-border dark:border-dark-border group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-500 transition-all font-heading uppercase tracking-widest">
                            Week {topic.weekNumber}
                          </div>
                          <div className="flex-1 space-y-3">
                            <div className="flex items-center justify-between">
                               <h4 className="font-black text-light-text-primary dark:text-dark-text-primary uppercase tracking-tight text-sm">
                                 {topic.topic}
                               </h4>
                               <div className="flex items-center gap-3">
                                 <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest px-2">
                                   {topic.subTopics?.length || 0} Modules
                                 </Badge>
                                 <ChevronRight className={cn(
                                   "h-4 w-4 text-light-text-muted transition-transform",
                                   isExpanded && "rotate-90 text-blue-500"
                                 )} />
                               </div>
                            </div>
                            {topic.subTopics && topic.subTopics.length > 0 && !isExpanded && (
                              <div className="flex flex-wrap gap-2">
                                {topic.subTopics.slice(0, 3).map((st: string, sidx: number) => (
                                  <span key={sidx} className="px-2.5 py-1 rounded-lg bg-light-surface dark:bg-dark-surface text-[9px] font-black text-light-text-muted dark:text-dark-text-secondary border border-light-border dark:border-dark-border uppercase tracking-wide">
                                    {st}
                                  </span>
                                ))}
                                {topic.subTopics.length > 3 && (
                                  <span className="text-[9px] font-black text-light-text-muted px-2 py-1 italic">+{topic.subTopics.length - 3} more</span>
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
                              className="px-6 pb-8 pt-2"
                            >
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 ml-[72px]">
                                {/* Outcomes */}
                                <div className="space-y-8">
                                  <div className="space-y-4">
                                     <h5 className="text-[9px] font-black uppercase tracking-[0.2em] text-blue-600">Learning Objectives</h5>
                                     <div className="space-y-4">
                                       {(topic.learningOutcomes || topic.learningGoals || []).map((goal: string, gidx: number) => (
                                         <div key={gidx} className="space-y-2">
                                           <div className="flex gap-2 p-3 rounded-xl bg-blue-500/[0.03] border border-blue-500/5 hover:border-blue-500/20 transition-colors">
                                             <div className="h-1.5 w-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                                             <p className="text-[12px] font-bold text-light-text-primary dark:text-dark-text-primary leading-relaxed">{goal}</p>
                                           </div>
                                           {topic.studentFriendlyOutcomes?.[gidx] && (
                                             <p className="ml-6 text-[11px] font-bold text-light-text-muted dark:text-dark-text-muted italic opacity-70">
                                               " {topic.studentFriendlyOutcomes[gidx]} "
                                             </p>
                                           )}
                                         </div>
                                       ))}
                                     </div>
                                  </div>

                                  {(topic.subTopics?.length > 0) && (
                                    <div className="space-y-4">
                                       <h5 className="text-[9px] font-black uppercase tracking-[0.2em] text-purple-600">Core Content Modules</h5>
                                       <div className="flex flex-wrap gap-2">
                                         {topic.subTopics.map((st: string, sidx: number) => (
                                           <span key={sidx} className="px-3 py-1.5 rounded-xl bg-purple-500/[0.05] text-[10px] font-black text-purple-700 dark:text-purple-400 border border-purple-500/10 uppercase tracking-widest">
                                             {st}
                                           </span>
                                         ))}
                                       </div>
                                    </div>
                                  )}
                                </div>

                                {/* Practical guidance */}
                                <div className="space-y-6">
                                   <div className="space-y-4">
                                     <h5 className="text-[9px] font-black uppercase tracking-[0.2em] text-agora-success">Suggested Activities</h5>
                                     <div className="space-y-2">
                                       {(topic.suggestedActivities || []).map((activity: string, aidx: number) => (
                                         <div key={aidx} className="flex gap-2 p-2.5 rounded-lg bg-green-500/[0.03] border border-green-500/5">
                                           <div className="h-1 w-1 rounded-full bg-green-500 mt-1.5 shrink-0" />
                                           <p className="text-[11px] font-bold text-light-text-primary dark:text-dark-text-primary leading-relaxed opacity-80 italic">{activity}</p>
                                         </div>
                                       ))}
                                     </div>
                                   </div>

                                   <div className="space-y-4">
                                     <h5 className="text-[9px] font-black uppercase tracking-[0.2em] text-amber-600">Instuctional Resources</h5>
                                     <div className="flex flex-wrap gap-2">
                                       {(topic.resources || []).map((res: string, ridx: number) => (
                                         <div key={ridx} className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/[0.05] border border-amber-500/10">
                                            <div className="h-1 w-1 rounded-full bg-amber-500" />
                                            <span className="text-[10px] font-black text-amber-700 dark:text-amber-400 capitalize">{res}</span>
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
                      <div className="p-4 bg-light-surface dark:bg-dark-surface rounded-xl">
                        <Calendar className="h-8 w-8 text-light-text-muted opacity-20" />
                      </div>
                      <p className="font-black text-light-text-primary dark:text-dark-text-primary uppercase tracking-tight text-sm">No topics configured for Term {activeTerm}</p>
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
