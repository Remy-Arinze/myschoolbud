'use client';

import React from 'react';
import { 
  Sparkles, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  Loader2,
  ChevronRight,
  PlusCircle,
  MoreVertical,
  XCircle,
  RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SubjectCurriculumCardProps {
  subject: any;
  onSetup: () => void;
  onView: (id: string) => void;
  onEdit: (id: string) => void;
  onCancel?: () => void; // New prop
  canEdit?: boolean;
}

export function SubjectCurriculumCard({
  subject,
  onSetup,
  onView,
  onEdit,
  onCancel,
  canEdit = false,
}: SubjectCurriculumCardProps) {
  const status = (subject.status as string) || 'NOT_SET_UP';
  const hasScheme = !!subject.schemeId && 
                    status !== 'NOT_SET_UP' && 
                    status !== 'CANCELLED' && 
                    status !== 'FAILED' && 
                    status !== 'REJECTED';

  const handleClick = () => {
    if (status === 'GENERATING') return;
    
    if (hasScheme) {
      onView(subject.schemeId);
    } else {
      onSetup();
    }
  };

  const getStatusDisplay = () => {
    switch (status) {
      case 'GENERATING':
        return (
          <div className="flex flex-col items-center justify-center py-4 space-y-3">
            <div className="relative">
              <Loader2 className="h-8 w-8 text-agora-blue animate-spin" />
              <Sparkles className="absolute -top-1 -right-1 h-3.5 w-3.5 text-agora-accent animate-pulse" />
            </div>
            <div className="text-center space-y-2">
              <p className="text-[9px] font-black text-agora-blue dark:text-blue-400 animate-pulse tracking-widest uppercase font-heading">
                Generating outline...
              </p>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onCancel?.();
                }}
                className="text-[8px] font-black text-red-500 hover:text-red-600 uppercase tracking-widest border border-red-500/20 rounded-lg px-3 py-1 hover:bg-red-500/5 transition-all"
              >
                Stop & Refund
              </button>
            </div>
          </div>
        );
      case 'CANCELLED':
        return (
          <div className="flex flex-col items-center justify-center py-6 space-y-2 text-center">
            <XCircle className="h-6 w-6 text-orange-500/80" />
            <p className="text-[9px] font-black text-orange-600 dark:text-orange-400 uppercase tracking-tight">
              Generation Cancelled
            </p>
            <span className="text-[8px] text-light-text-muted dark:text-dark-text-muted font-heading uppercase font-bold tracking-widest bg-orange-50 dark:bg-orange-950/20 px-2 py-0.5 rounded-full">Click to set up again</span>
          </div>
        );
      case 'FAILED':
        return (
          <div className="flex flex-col items-center justify-center py-6 space-y-2 text-center">
            <XCircle className="h-6 w-6 text-red-500/80" />
            <p className="text-[9px] font-black text-red-600 dark:text-red-400 uppercase tracking-tight">
              Generation Failed
            </p>
            <span className="text-[8px] text-light-text-muted dark:text-dark-text-muted font-heading uppercase font-bold tracking-widest bg-red-50 dark:bg-red-950/20 px-2 py-0.5 rounded-full">Click to try again</span>
          </div>
        );
      case 'PUBLISHED':
        const isImported = !!subject.agoraCurriculumTemplateId || !!subject.isAgoraBased;
        return (
          <div className="flex flex-col space-y-3">
            <div className="mt-2 flex flex-col space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-[9px]">
                <span className={cn(
                  "font-black uppercase tracking-widest font-heading",
                  isImported ? "text-blue-600 dark:text-blue-400" : "text-agora-success"
                )}>
                  {isImported ? 'Bud library curriculum' : 'School curriculum'}
                </span>
                <span className={cn(
                  "font-black font-heading tracking-tight",
                  isImported ? "text-blue-600/70 dark:text-blue-400/70" : "text-agora-success"
                )}>
                  {isImported ? 'Imported' : 'Published'}
                </span>
              </div>
              {(() => {
                const total = Number(subject.weeksTotal || subject.totalWeeks || 0);
                const done = Number(subject.weeksCompleted || subject.completedWeeks || 0);
                const pct = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;
                return (
                  <>
                    <div className="flex items-center justify-between text-[8px] font-bold uppercase tracking-widest text-light-text-muted dark:text-dark-text-muted">
                      <span>Progress</span>
                      <span>{done}/{total || '—'} weeks</span>
                    </div>
                    <div className={cn(
                      "h-1.5 w-full rounded-full overflow-hidden",
                      isImported ? "bg-blue-600/10 dark:bg-blue-600/5" : "bg-agora-success/10 dark:bg-agora-success/5"
                    )}>
                      <div 
                        className={cn(
                          "h-full rounded-full transition-all duration-1000",
                          isImported ? "bg-blue-600 dark:bg-blue-400" : "bg-agora-success"
                        )}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </>
                );
              })()}
            </div>
            {canEdit && (
              <div className="flex gap-2">
                <button 
                  onClick={(e) => { e.stopPropagation(); onSetup(); }}
                  className="flex-1 text-[8px] font-extrabold text-light-text-muted hover:text-agora-blue uppercase tracking-widest border border-light-border dark:border-dark-border rounded-lg px-2 py-2 hover:bg-agora-blue/5 transition-all flex items-center justify-center gap-1.5"
                >
                  <RefreshCw className="h-3 w-3" />
                  Change
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); onView(subject.schemeId); }}
                  className="flex-1 text-[8px] font-extrabold uppercase tracking-widest rounded-lg px-2 py-2 transition-all flex items-center justify-center gap-1.5 text-white bg-emerald-600 hover:bg-emerald-500 border border-emerald-700/20 shadow-sm shadow-emerald-600/20"
                >
                   <ChevronRight className="h-3 w-3" />
                   Review
                </button>
              </div>
            )}
          </div>
        );
      case 'APPROVED':
        return (
          <div className="flex flex-col space-y-3">
            <div className="mt-2 flex flex-col space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-[9px]">
                <span className="font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest font-heading">Approved</span>
                <span className="font-black text-blue-600 dark:text-blue-400 font-heading tracking-tight italic">Ready</span>
              </div>
              <div className="h-1.5 w-full bg-blue-600/10 dark:bg-blue-600/5 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-600 rounded-full transition-all duration-1000" 
                  style={{ width: '100%' }}
                />
              </div>
            </div>
            {canEdit && (
              <div className="flex gap-2">
                <button 
                  onClick={(e) => { e.stopPropagation(); onSetup(); }}
                  className="flex-1 text-[8px] font-extrabold text-light-text-muted hover:text-agora-blue uppercase tracking-widest border border-light-border dark:border-dark-border rounded-lg px-2 py-2 hover:bg-agora-blue/5 transition-all flex items-center justify-center gap-1.5"
                >
                  <RefreshCw className="h-3 w-3" />
                  Change
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); onView(subject.schemeId); }}
                  className="flex-1 text-[8px] font-extrabold text-white bg-blue-600 hover:bg-blue-500 uppercase tracking-widest rounded-lg px-2 py-2 shadow-sm transition-all flex items-center justify-center gap-1.5"
                >
                  <ChevronRight className="h-3 w-3" />
                  Details
                </button>
              </div>
            )}
          </div>
        );
      case 'DRAFT':
        return (
          <div className="flex flex-col space-y-3">
            <div className="mt-2 flex items-center justify-center gap-2 py-4 bg-light-surface dark:bg-dark-surface/30 border border-light-border dark:border-dark-border rounded-xl">
              <Clock className="h-3 w-3 text-amber-600" />
              <span className="text-[9px] font-black text-amber-700 dark:text-amber-300 uppercase tracking-[0.15em] font-heading">Draft in review</span>
            </div>
            {canEdit && (
              <div className="flex gap-2">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    onSetup();
                  }}
                  className="flex-1 text-[8px] font-extrabold text-light-text-muted hover:text-agora-blue uppercase tracking-widest border border-light-border dark:border-dark-border rounded-lg px-2 py-2 hover:bg-agora-blue/5 transition-all flex items-center justify-center gap-1.5"
                >
                  <RefreshCw className="h-3 w-3" />
                  Change
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    onView(subject.schemeId);
                  }}
                   className="flex-1 text-[8px] font-extrabold text-white bg-agora-blue hover:bg-blue-600 uppercase tracking-widest rounded-lg px-2 py-2 shadow-sm transition-all flex items-center justify-center gap-1.5"
                >
                  <ChevronRight className="h-3 w-3" />
                  Details
                </button>
              </div>
            )}
          </div>
        );
      default:
        return (
          <div className="flex flex-col items-center justify-center py-6 space-y-2 border-2 border-dashed border-light-border dark:border-dark-border rounded-2xl group-hover:border-agora-blue/10 group-hover:bg-agora-blue/[0.01] transition-all">
            <div className="h-7 w-7 rounded-full bg-light-surface dark:bg-dark-surface/50 flex items-center justify-center text-light-text-muted dark:text-dark-text-muted group-hover:text-agora-blue transition-colors">
              <PlusCircle className="h-3.5 w-3.5" />
            </div>
            <p className="text-[9px] font-black text-light-text-muted dark:text-dark-text-muted uppercase tracking-widest font-heading">Set up curriculum</p>
          </div>
        );
    }
  };

  return (
    <div 
      onClick={handleClick}
      className={cn(
        "group relative bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border rounded-[24px] p-6 transition-all duration-500",
        status === 'GENERATING' ? "cursor-wait opacity-80" : "cursor-pointer hover:border-agora-blue/20 hover:shadow-2xl hover:shadow-agora-blue/5 hover:-translate-y-0.5 active:scale-[0.98]"
      )}
    >
      {/* Top Section */}
      <div className="flex items-start justify-between mb-4">
        <div className="space-y-1">
          <h3 className="font-heading font-black text-xl text-light-text-primary dark:text-dark-text-primary leading-tight lowercase first-letter:uppercase">
            {subject.subjectName}
          </h3>
          <div className="flex items-center gap-1.5 pt-1">
            {status === 'PUBLISHED' ? (
              <span className={cn(
                "text-[8px] font-black uppercase tracking-widest flex items-center gap-1 font-heading",
                (!!subject.agoraCurriculumTemplateId || !!subject.isAgoraBased) ? "text-blue-600 dark:text-blue-400" : "text-agora-success"
              )}>
                <div className={cn(
                  "h-1 w-1 rounded-full animate-pulse",
                  (!!subject.agoraCurriculumTemplateId || !!subject.isAgoraBased) ? "bg-blue-600" : "bg-agora-success"
                )} />
                {(!!subject.agoraCurriculumTemplateId || !!subject.isAgoraBased) ? 'Imported from Bud library' : 'Published'}
              </span>
            ) : status === 'APPROVED' ? (
              <span className="text-[8px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest flex items-center gap-1 font-heading">
                <CheckCircle className="h-2 w-2" />
                Approved
              </span>
            ) : status === 'GENERATING' ? (
              <span className="text-[8px] font-black text-agora-blue uppercase tracking-widest flex items-center gap-1 font-heading">
                <Loader2 className="h-2 w-2 animate-spin" />
                Generating...
              </span>
            ) : (
              <span className="text-[8px] font-black text-light-text-muted dark:text-dark-text-muted uppercase tracking-widest flex items-center gap-1 font-heading opacity-60">
                <AlertCircle className="h-2 w-2" />
                Not set up
              </span>
            )}
          </div>
        </div>
        
        <button className="h-8 w-8 rounded-xl flex items-center justify-center text-light-text-muted dark:text-dark-text-muted hover:bg-light-surface dark:hover:bg-dark-surface/50 transition-all opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0">
          {hasScheme ? <ChevronRight className="h-4 w-4" /> : <MoreVertical className="h-4 w-4" />}
        </button>
      </div>

      {/* Status Specific Content */}
      <div className="mb-2 h-[80px] flex flex-col justify-center">
        {getStatusDisplay()}
      </div>

      {/* Hover Background Accent */}
      <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-5 transition-opacity">
        <Sparkles className="h-14 w-14 text-agora-blue" />
      </div>

      {/* Border Highlight Effect on Hover */}
      <div className={cn(
        "absolute inset-0 rounded-[24px] pointer-events-none border-2 border-transparent transition-all duration-500",
        hasScheme ? "group-hover:border-agora-success/5" : "group-hover:border-agora-blue/5"
      )} />
    </div>
  );
}
