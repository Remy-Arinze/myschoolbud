'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  User,
  Copy,
  History,
  FileText,
  FileQuestion,
  BookOpen,
  ClipboardList,
  Layers,
  Zap,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  StopCircle,
  Plus,
  ArrowUp,
  Clock,
  BarChart3,
  Mail,
  AlertTriangle,
  Building2,
  ClipboardCheck,
  Calendar,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { FadeInUp } from '@/components/ui/FadeInUp';
import { cn } from '@/lib/utils';
import {
  useGetChatHistoryQuery,
  useGetChatMessagesQuery,
  useLazyGetChatMessagesQuery,
  useDeleteConversationMutation,
  streamAiChat,
  SSEToolStartEvent,
  SSEToolResultEvent,
} from '@/lib/store/api/aiApi';
import { useGetMyTeacherProfileQuery } from '@/lib/store/api/schoolAdminApi';
import toast from 'react-hot-toast';

import { useSelector } from 'react-redux';
import { RootState } from '@/lib/store/store';
import { SaveAssessmentEditor } from './SaveAssessmentEditor';
import { inlineAssistantErrorNote, toastTextFromStreamError } from '@/lib/ai-chat-errors';
import { useLoisWorkspaceOptional, type LoisPageContext, type LoisSource } from './LoisWorkspace';
import { LoisChatHistory } from './LoisChatHistory';
import { LoisPendingPlanCard } from './LoisPendingPlanCard';
import { LoisApplyAllBar, LoisPlanApplySession, useLoisPlanApply } from './LoisPlanApplySession';
import {
  GENERATE_TOOLS,
  LABELED_LOOKUP_TOOLS,
  PLAN_TOOLS,
  QUIET_TOOLS,
  quietChipFacts,
  quietChipTitle,
  toolCardTitle,
} from './lois-tool-card-utils';
import { LoisOrb } from './LoisOrb';
import { LoisBriefingPanel } from './LoisBriefingPanel';
import Link from 'next/link';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  isStreaming?: boolean;
  toolEvents?: ToolEvent[];
  sources?: LoisSource[];
}

interface ToolEvent {
  type: 'thinking' | 'tool_start' | 'tool_result' | 'sources';
  toolCallId?: string;
  toolName?: string;
  toolDisplayName?: string;
  entityLabel?: string;
  args?: Record<string, any>;
  result?: any;
  message?: string;
  sources?: LoisSource[];
}

function applyToolResultToEvents(events: ToolEvent[], data: SSEToolResultEvent): ToolEvent[] {
  const withoutThinking = events.filter((e) => e.type !== 'thinking');
  const mergeStart = (start?: ToolEvent): ToolEvent => ({
    type: 'tool_result',
    toolCallId: data.toolCallId || start?.toolCallId,
    toolName: data.toolName,
    toolDisplayName: data.toolDisplayName,
    entityLabel: data.entityLabel || start?.entityLabel,
    args: data.args || start?.args,
    result: data.result,
  });

  if (data.toolCallId) {
    const idx = withoutThinking.findIndex((e) => e.toolCallId === data.toolCallId);
    if (idx >= 0) {
      const next = [...withoutThinking];
      next[idx] = mergeStart(withoutThinking[idx]);
      return next;
    }
  }

  const fallbackIdx = withoutThinking.findIndex(
    (e) => e.type === 'tool_start' && e.toolName === data.toolName,
  );
  if (fallbackIdx >= 0) {
    const next = [...withoutThinking];
    next[fallbackIdx] = mergeStart(withoutThinking[fallbackIdx]);
    return next;
  }

  return [...withoutThinking, mergeStart()];
}

/** Drop in-progress starts once a result for that call exists (live race + older persisted rows). */
function visibleToolEvents(events: ToolEvent[]): ToolEvent[] {
  const completedIds = new Set(
    events
      .filter((e) => e.type === 'tool_result' && e.toolCallId)
      .map((e) => e.toolCallId as string),
  );
  return events.filter((e) => {
    if (e.type === 'sources') return false;
    if (e.type === 'tool_start' && e.toolCallId && completedIds.has(e.toolCallId)) return false;
    return true;
  });
}

function toolEventKey(event: ToolEvent, eventIdx: number): string {
  return [event.type, event.toolCallId || event.toolName || 'evt', String(eventIdx)].join('-');
}

// ─── Tool Result Renderers ────────────────────────────────────────────────────

const ToolIcon = ({ toolName }: { toolName: string }) => {
  const icons: Record<string, React.ReactNode> = {
    generate_lesson_plan: <FileText className="w-4 h-4" />,
    generate_quiz: <FileQuestion className="w-4 h-4" />,
    generate_flashcards: <Layers className="w-4 h-4" />,
    generate_summary: <BookOpen className="w-4 h-4" />,
    generate_assessment: <ClipboardList className="w-4 h-4" />,
  };
  return <>{icons[toolName] || <Zap className="w-4 h-4" />}</>;
};

const ThreeDotTyping = () => (
  <div className="flex gap-1 items-center px-1">
    {[0, 1, 2].map((i) => (
      <motion.div
        key={i}
        animate={{ opacity: [0.35, 1, 0.35] }}
        transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }}
        className="w-1.5 h-1.5 rounded-full bg-[var(--agora-blue)]"
      />
    ))}
  </div>
);

type PromptCard = {
  title: string;
  description: string;
  prompt: string;
  icon: React.ReactNode;
};

function loisPromptCards(params: {
  isSchoolAdmin: boolean;
  structuredFocus: LoisPageContext | null;
  pathHint: string;
}): PromptCard[] {
  const { isSchoolAdmin, structuredFocus, pathHint } = params;
  const isStudentsContext = structuredFocus?.type === 'student' || pathHint.includes('/students');
  const isClassesContext =
    structuredFocus?.type === 'class' ||
    pathHint.includes('/classes') ||
    pathHint.includes('/levels');
  const isTimetableContext =
    structuredFocus?.type === 'timetable' || pathHint.includes('/timetables');
  const isCurriculumContext =
    structuredFocus?.type === 'scheme' ||
    pathHint.includes('/curriculum') ||
    pathHint.includes('/subjects');
  const studentName = structuredFocus?.type === 'student' ? structuredFocus.label : 'this student';
  const className =
    structuredFocus?.type === 'class' || structuredFocus?.type === 'timetable'
      ? structuredFocus.label
      : 'this class';

  if (isStudentsContext && structuredFocus?.type === 'student') {
    return [
      {
        title: 'Published grades',
        description: `Recent results for ${studentName}`,
        icon: <BarChart3 className="h-3.5 w-3.5" />,
        prompt: `Show me the recent performance and grades for ${studentName}`,
      },
      {
        title: 'Attendance',
        description: 'Presence over the last two weeks',
        icon: <ClipboardCheck className="h-3.5 w-3.5" />,
        prompt: `Summarise attendance for ${studentName}`,
      },
      {
        title: 'Draft a parent note',
        description: 'Preview only — nothing is sent',
        icon: <Mail className="h-3.5 w-3.5" />,
        prompt: `Draft a supportive parent update about ${studentName}'s progress. Do not send it.`,
      },
    ];
  }

  if (isStudentsContext) {
    return [
      {
        title: 'At-risk students',
        description: 'Below the performance threshold',
        icon: <AlertTriangle className="h-3.5 w-3.5" />,
        prompt: 'Who is below the academic risk threshold right now?',
      },
      {
        title: 'Find a student',
        description: 'Look up by name or class',
        icon: <User className="h-3.5 w-3.5" />,
        prompt: 'Help me find a student by name.',
      },
      {
        title: 'Draft a parent note',
        description: 'Preview only — nothing is sent',
        icon: <Mail className="h-3.5 w-3.5" />,
        prompt: "Draft an email to a student's parents regarding their performance. Do not send it.",
      },
    ];
  }

  if (isTimetableContext) {
    return [
      {
        title: 'Inspect this class',
        description: 'Subjects, teachers, and empty slots',
        icon: <Clock className="h-3.5 w-3.5" />,
        prompt: `Inspect the scheduling context for ${className === 'Timetable' ? 'this class' : className}. Do not save anything yet.`,
      },
      {
        title: 'Propose Auto-Fill',
        description: 'Preview only — Apply on the card',
        icon: <Calendar className="h-3.5 w-3.5" />,
        prompt: 'Propose a fill-empty timetable for this class. Do not claim it is saved.',
      },
      {
        title: 'Curriculum gaps',
        description: 'Which grid subjects still need a scheme',
        icon: <BookOpen className="h-3.5 w-3.5" />,
        prompt: 'Inspect curriculum options for this class. Tell me if a timetable exists and which subjects have no scheme.',
      },
    ];
  }

  if (isCurriculumContext) {
    return [
      {
        title: 'Library vs calendar',
        description: 'Bud weeks vs this term’s teachable weeks',
        icon: <BookOpen className="h-3.5 w-3.5" />,
        prompt: 'Inspect curriculum options for this class. Compare Bud library weeks with teachable weeks. Do not generate yet.',
      },
      {
        title: 'Propose a scheme',
        description: 'Plan only — Apply on the card',
        icon: <FileText className="h-3.5 w-3.5" />,
        prompt: 'If a timetable exists, propose a library scheme for a subject that still needs one. Do not apply it.',
      },
      {
        title: 'Need a timetable first?',
        description: 'Schemes work better with periods on the grid',
        icon: <Clock className="h-3.5 w-3.5" />,
        prompt: 'Does this class have a timetable? If not, inspect scheduling and explain before proposing a scheme.',
      },
    ];
  }

  if (isClassesContext) {
    return [
      {
        title: 'Class timetable',
        description: `What ${className} is doing now`,
        icon: <Clock className="h-3.5 w-3.5" />,
        prompt: `What is going on in ${className} right now?`,
      },
      {
        title: 'Class performance',
        description: 'Published grade averages this term',
        icon: <BarChart3 className="h-3.5 w-3.5" />,
        prompt: `How is ${className} performing this term?`,
      },
      {
        title: 'Scheme of work',
        description: 'Planned vs delivered weeks',
        icon: <BookOpen className="h-3.5 w-3.5" />,
        prompt: `What does the scheme of work look like for ${className}?`,
      },
    ];
  }

  if (isSchoolAdmin) {
    return [
      {
        title: 'What I noticed',
        description: 'Background issues already flagged',
        icon: <AlertTriangle className="h-3.5 w-3.5" />,
        prompt: 'What issues have you already noticed for this school?',
      },
      {
        title: 'At-risk students',
        description: 'Below 45% this term',
        icon: <BarChart3 className="h-3.5 w-3.5" />,
        prompt: 'Who is below the academic risk threshold this term?',
      },
      {
        title: 'School snapshot',
        description: 'Enrolments, teachers, and classes',
        icon: <Building2 className="h-3.5 w-3.5" />,
        prompt: 'Give me the current school statistics.',
      },
    ];
  }

  return [
    {
      title: 'Quick quiz',
      description: '10 questions for your class',
      icon: <FileQuestion className="h-3.5 w-3.5" />,
      prompt: 'Generate a 10-question quiz for my class right now.',
    },
    {
      title: 'Next period',
      description: 'What you are teaching next',
      icon: <Clock className="h-3.5 w-3.5" />,
      prompt: 'What is my next subject and in which class/room?',
    },
    {
      title: 'Grade an essay',
      description: 'Feedback you can review first',
      icon: <FileText className="h-3.5 w-3.5" />,
      prompt: "Help me grade this student's essay and give me feedback.",
    },
  ];
}

function LoisPromptSuggestions({
  cards,
  isMinimal,
  typeScale,
  onSelect,
}: {
  cards: PromptCard[];
  isMinimal: boolean;
  typeScale: { body: string; tiny: string };
  onSelect: (prompt: string) => void;
}) {
  return (
    <div
      className={cn(
        isMinimal
          ? 'flex flex-wrap gap-1.5'
          : 'grid grid-cols-1 sm:grid-cols-3 gap-2 w-full',
      )}
    >
      {cards.map((card, i) => (
        <motion.button
          key={card.title}
          type="button"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, delay: 0.05 * i, ease: 'easeOut' }}
          onClick={() => onSelect(card.prompt)}
          title={card.description}
          className={cn(
            'lois-prompt-chip group text-left',
            isMinimal
              ? 'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 max-w-full'
              : 'flex flex-col items-start gap-2.5 rounded-2xl p-3.5 h-full',
          )}
        >
          <span
            className={cn(
              'inline-flex items-center justify-center shrink-0 text-[var(--agora-blue)] bg-[var(--agora-blue)]/10',
              isMinimal ? 'h-5 w-5 rounded-full' : 'h-8 w-8 rounded-xl',
            )}
          >
            {React.cloneElement(card.icon as React.ReactElement<{ className?: string }>, {
              className: isMinimal ? 'h-3 w-3' : 'h-4 w-4',
            })}
          </span>
          <span className="min-w-0">
            <span
              className="block font-semibold text-light-text-primary dark:text-dark-text-primary leading-tight transition-colors group-hover:text-[var(--agora-blue)]"
              style={{ fontSize: typeScale.body }}
            >
              {card.title}
            </span>
            {!isMinimal && (
              <span
                className="block mt-1 text-light-text-secondary dark:text-dark-text-secondary leading-snug"
                style={{ fontSize: typeScale.tiny }}
              >
                {card.description}
              </span>
            )}
          </span>
        </motion.button>
      ))}
    </div>
  );
}

function ApplyPendingPlansSync({ result }: { result: any }) {
  const session = useLoisPlanApply();
  const markApplied = session?.markApplied;
  useEffect(() => {
    const rows = Array.isArray(result?.applied) ? result.applied : [];
    for (const row of rows) {
      if (row?.classLabel) {
        markApplied?.({ classLabel: row.classLabel, message: row.message });
      }
    }
  }, [result, markApplied]);
  return null;
}

function openPlansFromEvents(events: ToolEvent[]) {
  return events
    .filter(
      (event) =>
        event.type === 'tool_result' &&
        event.toolName &&
        PLAN_TOOLS.has(event.toolName) &&
        event.result?.planId &&
        !event.result?.error &&
        !event.result?.saved,
    )
    .map((event) => ({
      planId: event.result.planId as string,
      classLabel: event.result.classLabel as string | undefined,
      kind: event.result.kind as 'TIMETABLE' | 'SCHEME' | undefined,
    }));
}

const ToolCard = ({ event, schoolId, conversationId, variant = 'default' }: { event: ToolEvent; schoolId: string; conversationId?: string | null; variant?: 'default' | 'minimal' }) => {
  const toolName = event.toolName || '';
  const isQuiet = QUIET_TOOLS.has(toolName);
  const isPlan = PLAN_TOOLS.has(toolName);
  const isGenerate = GENERATE_TOOLS.has(toolName);
  const [expanded, setExpanded] = useState(isGenerate);

  const title = toolCardTitle({
    toolName,
    toolDisplayName: event.toolDisplayName,
    entityLabel: event.entityLabel,
    args: event.args,
    result: event.result,
  });

  if (event.type === 'thinking') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-[var(--light-card)] dark:bg-[var(--dark-surface)] border border-[var(--light-border)] dark:border-[var(--dark-border)]"
      >
        <div className="w-1.5 h-1.5 rounded-full bg-[var(--agora-blue)]" />
          <span className="text-light-text-secondary dark:text-dark-text-secondary font-medium" style={{ fontSize: 'var(--lois-small, var(--text-small))' }}>
          {event.message}
        </span>
      </motion.div>
    );
  }

  if (event.type === 'tool_start') {
    const workingOn =
      event.entityLabel ||
      event.args?.classQuery ||
      event.args?.topic ||
      event.args?.subject ||
      event.args?.query ||
      'Processing...';
    if (isQuiet) {
      const quietStart =
        toolName === 'apply_pending_plans'
          ? 'Saving the previews…'
          : `Checking ${workingOn === 'Processing...' ? '…' : workingOn}`;
      return (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-50/80 dark:bg-white/[0.04] border border-slate-200/70 dark:border-white/10"
        >
          <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300 truncate">
            {quietStart}
          </span>
          <ThreeDotTyping />
        </motion.div>
      );
    }
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-amber-50/60 dark:bg-amber-500/[0.08] border border-amber-200/60 dark:border-amber-500/20"
      >
        <div className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400">
          <ToolIcon toolName={toolName} />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-xs font-semibold text-amber-800 dark:text-amber-300">
            {title}
          </span>
          <p className="text-[11px] text-amber-600/70 dark:text-amber-400/60 font-medium truncate">
            {event.toolName === 'execute_sql'
              ? 'Analyzing school database...'
              : `Working on: ${workingOn}`}
          </p>
        </div>
        <ThreeDotTyping />
      </motion.div>
    );
  }

  if (event.type === 'tool_result' && event.result) {
    if (isPlan) {
      return (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl overflow-hidden border border-emerald-200/60 dark:border-emerald-500/20 bg-gradient-to-br from-emerald-50/80 to-white dark:from-emerald-500/[0.06] dark:to-transparent px-4 py-3"
        >
          <LoisPendingPlanCard
            schoolId={schoolId}
            conversationId={conversationId}
            result={event.result}
          />
        </motion.div>
      );
    }

    if (isQuiet) {
      const chip = quietChipTitle({
        toolName,
        entityLabel: event.entityLabel,
        args: event.args,
        result: event.result,
      });
      const facts = quietChipFacts(toolName, event.result);
      return (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-lg border border-slate-200/80 dark:border-white/10 bg-slate-50/70 dark:bg-white/[0.03] overflow-hidden"
        >
          {toolName === 'apply_pending_plans' ? <ApplyPendingPlansSync result={event.result} /> : null}
          <button
            type="button"
            onClick={() => facts.length > 0 && setExpanded(!expanded)}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 text-left"
          >
            <CheckCircle2 className="w-3 h-3 text-slate-400 shrink-0" />
            <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300 flex-1 truncate">
              {chip}
            </span>
            {facts.length > 0 ? (
              expanded ? (
                <ChevronDown className="w-3 h-3 text-slate-400" />
              ) : (
                <ChevronRight className="w-3 h-3 text-slate-400" />
              )
            ) : null}
          </button>
          <AnimatePresence>
            {expanded && facts.length > 0 && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="overflow-hidden"
              >
                <ul className="px-2.5 pb-2 space-y-0.5">
                  {facts.map((fact) => (
                    <li key={fact} className="text-[11px] text-slate-500 dark:text-slate-400">
                      {fact}
                    </li>
                  ))}
                </ul>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      );
    }

    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl overflow-hidden border border-emerald-200/60 dark:border-emerald-500/20 bg-gradient-to-br from-emerald-50/80 to-white dark:from-emerald-500/[0.06] dark:to-transparent"
      >
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-emerald-50/50 dark:hover:bg-emerald-500/[0.04] transition-colors"
        >
          <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 flex-1 text-left">
            {title}
          </span>
          {expanded ? (
            <ChevronDown className="w-4 h-4 text-emerald-500" />
          ) : (
            <ChevronRight className="w-4 h-4 text-emerald-500" />
          )}
        </button>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className={`px-4 pb-4 overflow-y-auto scrollbar-thin ${
                isGenerate ? 'max-h-[420px]' : 'max-h-[320px]'
              }`}>
                <ToolResultContent toolName={toolName} result={event.result} schoolId={schoolId} variant={variant} conversationId={conversationId} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  }

  return null;
};

const ToolResultContent = ({
  toolName,
  result,
  schoolId,
  conversationId,
  variant = 'default'
}: {
  toolName: string;
  result: any;
  schoolId: string;
  conversationId?: string | null;
  variant?: 'default' | 'minimal'
}) => {
  if (toolName === 'generate_lesson_plan') {
    return (
      <div className="space-y-3 text-sm">
        <div className="flex items-start justify-between gap-4">
          {result.title && (
            <h4 className="font-bold text-emerald-900 dark:text-emerald-300 text-base flex-1">{result.title}</h4>
          )}
          <button
            onClick={() => {
              const text = `Lesson Plan: ${result.title || 'Untitled'}\n\nObjectives:\n${(result.objectives || []).join('\n')}\n\nIntroduction:\n${result.introduction}\n\nActivities:\n${(result.mainContent || []).map((a: any) => `${a.duration}: ${a.activity} - ${a.description}`).join('\n')}`;
              navigator.clipboard.writeText(text);
              toast.success('Lesson plan copied to clipboard');
            }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold uppercase tracking-wider transition-colors shrink-0"
          >
            <Copy className="w-3 h-3" /> Copy Plan
          </button>
        </div>
        {result.objectives && (
          <div>
            <p className="text-[10px] uppercase tracking-widest font-black text-emerald-700 dark:text-emerald-400/60 mb-1">Objectives</p>
            <ul className="space-y-1">
              {result.objectives.map((obj: string, i: number) => (
                <li key={i} className="flex gap-2 text-emerald-900 dark:text-emerald-300/80">
                  <span className="text-emerald-500">•</span> {obj}
                </li>
              ))}
            </ul>
          </div>
        )}
        {result.introduction && (
          <div>
            <p className="text-[10px] uppercase tracking-widest font-black text-emerald-700 dark:text-emerald-400/60 mb-1">Introduction</p>
            <p className="text-emerald-900 dark:text-emerald-300/80 italic leading-relaxed">"{result.introduction}"</p>
          </div>
        )}
        {result.mainContent && (
          <div>
            <p className="text-[10px] uppercase tracking-widest font-black text-emerald-700 dark:text-emerald-400/60 mb-1">Activities</p>
            <div className="space-y-2">
              {result.mainContent.map((item: any, i: number) => (
                <div key={i} className="p-2 rounded-xl bg-white/60 dark:bg-black/20 border border-emerald-100 dark:border-emerald-500/10">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-emerald-900 dark:text-emerald-300 text-xs">{item.activity}</span>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-500 font-bold">{item.duration}</span>
                  </div>
                  <p className="text-xs text-emerald-800 dark:text-emerald-400/60">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }



  if (toolName === 'grade_essay') {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
          <div>
            <p className="text-[10px] uppercase font-black text-emerald-600/70 dark:text-emerald-400/60 mb-1">Score</p>
            <p className="text-2xl font-bold text-emerald-900 dark:text-emerald-200">{result.score} <span className="text-sm font-medium opacity-50">/ {result.maxScore}</span></p>
          </div>
          <div className="w-12 h-12 rounded-full border-2 border-emerald-500/20 flex items-center justify-center font-bold text-emerald-600">
            {Math.round((result.score / result.maxScore) * 100)}%
          </div>
        </div>

        <div>
          <p className="text-[10px] uppercase font-black text-emerald-700 dark:text-emerald-400/60 mb-1">Feedback</p>
          <p className="text-sm text-emerald-900 dark:text-emerald-300/80 leading-relaxed italic">"{result.feedback}"</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="p-3 rounded-xl bg-white/60 dark:bg-black/20 border border-emerald-100 dark:border-emerald-500/10">
            <p className="text-[9px] uppercase font-black text-emerald-700 mb-1">Key Strengths</p>
            <ul className="space-y-1">
              {result.strengths?.map((s: string, i: number) => (
                <li key={i} className="text-[11px] text-emerald-900 dark:text-emerald-400/80 flex gap-1.5 items-start">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0 mt-0.5" /> {s}
                </li>
              ))}
            </ul>
          </div>
          <div className="p-3 rounded-xl bg-white/60 dark:bg-black/20 border border-emerald-100 dark:border-emerald-500/10">
            <p className="text-[9px] uppercase font-black text-amber-600 mb-1">Areas to Improve</p>
            <ul className="space-y-1">
              {result.areasForImprovement?.map((a: string, i: number) => (
                <li key={i} className="text-[11px] text-amber-700/80 dark:text-amber-400/80 flex gap-1.5 items-start">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 mt-1.5" /> {a}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    );
  }

  if (toolName === 'generate_flashcards') {
    const cards = Array.isArray(result) ? result : result?.flashcards || [];
    return (
      <div className="space-y-2">
        {cards.slice(0, 5).map((card: any, i: number) => (
          <div key={i} className="p-3 rounded-xl bg-white/60 dark:bg-black/20 border border-emerald-100 dark:border-emerald-500/10 text-sm">
            <p className="font-semibold text-emerald-900 dark:text-emerald-300 text-xs mb-1">Q: {card.front}</p>
            <p className="text-xs text-emerald-700/70 dark:text-emerald-400/60">A: {card.back}</p>
            {card.hint && <p className="text-[10px] italic text-emerald-500 mt-1">💡 {card.hint}</p>}
          </div>
        ))}
        {cards.length > 5 && (
          <p className="text-xs text-emerald-500 font-semibold text-center">+{cards.length - 5} more cards</p>
        )}
      </div>
    );
  }

  if (toolName === 'propose_timetable' || toolName === 'propose_scheme') {
    return (
      <LoisPendingPlanCard
        schoolId={schoolId}
        conversationId={conversationId}
        result={result}
      />
    );
  }

  if (toolName === 'generate_quiz' || toolName === 'generate_assessment') {
    return <SaveAssessmentEditor toolName={toolName} initialData={result} schoolId={schoolId} variant={variant} conversationId={conversationId} />;
  }

  if (LABELED_LOOKUP_TOOLS.has(toolName)) {
    return <LookupToolSummary toolName={toolName} result={result} />;
  }

  if (typeof result === 'string') {
    return <p className="text-sm text-emerald-800/80 dark:text-emerald-300/80 whitespace-pre-wrap">{result}</p>;
  }

  if (result?.message || result?.error) {
    return (
      <p className="text-xs text-slate-500 italic">
        {String(result.error || result.message)}
      </p>
    );
  }

  return (
    <p className="text-xs text-slate-500 italic">
      Used to answer below.
    </p>
  );
};

function LookupToolSummary({ toolName, result }: { toolName: string; result: any }) {
  if (!result || typeof result !== 'object') {
    return <p className="text-sm text-emerald-800/80 dark:text-emerald-300/80">{String(result ?? '')}</p>;
  }
  if (result.error) {
    return <p className="text-xs text-red-600 dark:text-red-400">{result.error}</p>;
  }

  const rows: Array<{ label: string; detail?: string }> = [];

  if (toolName === 'get_timetable') {
    const periods = Array.isArray(result.periods) ? result.periods : [];
    if (periods.length === 0) {
      return <p className="text-xs text-slate-500 italic">{result.message || 'No periods on this day.'}</p>;
    }
    periods.slice(0, 12).forEach((p: any) => {
      rows.push({
        label: [p.startTime, p.subject || p.type].filter(Boolean).join(' · '),
        detail: [p.teacher, p.room].filter(Boolean).join(' · ') || undefined,
      });
    });
  } else if (toolName === 'who_teaches') {
    if (result.formTeacher) {
      const ft = result.formTeacher;
      const name = typeof ft === 'string' ? ft : ft?.name;
      if (name) rows.push({ label: 'Form teacher', detail: name });
    }
    const teachers = Array.isArray(result.teachers) ? result.teachers : [];
    teachers.slice(0, 10).forEach((t: any) => {
      rows.push({ label: t.name || 'Teacher', detail: t.subject || undefined });
    });
    const specialists = Array.isArray(result.schoolSubjectStaff) ? result.schoolSubjectStaff : [];
    specialists.slice(0, 8).forEach((t: any) => {
      rows.push({
        label: t.name || 'Specialist',
        detail: Array.isArray(t.subjects) ? t.subjects.slice(0, 3).join(', ') : 'school staff',
      });
    });
    if (rows.length === 0) {
      return <p className="text-xs text-slate-500 italic">{result.message || 'No teacher assignment matched.'}</p>;
    }
  } else if (toolName === 'get_now_in_class') {
    if (result.formTeacher && result.note) {
      return (
        <p className="text-xs text-emerald-800/80 dark:text-emerald-300/80">
          Class teacher: {result.formTeacher}. {result.note}
        </p>
      );
    }
    if (result.status === 'free_period' || (!result.subject && result.message)) {
      return (
        <p className="text-xs text-emerald-800/80 dark:text-emerald-300/80">
          {result.message || result.note || 'No current period.'}
        </p>
      );
    }
    rows.push({
      label: result.subject || result.type || 'Current period',
      detail: [result.teacher, result.startTime && result.endTime ? `${result.startTime}–${result.endTime}` : null]
        .filter(Boolean)
        .join(' · ') || undefined,
    });
  } else if (toolName === 'get_scheme_of_work') {
    const schemes = Array.isArray(result.schemes) ? result.schemes : [];
    if (schemes.length === 0) {
      return <p className="text-xs text-slate-500 italic">{result.message || 'No published scheme matched.'}</p>;
    }
    schemes.slice(0, 8).forEach((s: any) => {
      const weeks = Array.isArray(s.weeks) ? s.weeks.length : 0;
      rows.push({
        label: [s.subject, s.classLevel].filter(Boolean).join(' · ') || 'Scheme',
        detail: weeks ? `${weeks} week${weeks === 1 ? '' : 's'}` : undefined,
      });
    });
  } else if (toolName === 'get_student_overview') {
    rows.push({ label: result.name || 'Student', detail: result.className || undefined });
    const grades = Array.isArray(result.recentPublishedGrades) ? result.recentPublishedGrades : [];
    if (grades.length) {
      rows.push({
        label: `${grades.length} recent published grade${grades.length === 1 ? '' : 's'}`,
        detail: grades[0]?.subject ? `latest: ${grades[0].subject}` : undefined,
      });
    }
    const att = result.attendanceLast14Days;
    if (att) {
      rows.push({
        label: 'Attendance (14 days)',
        detail: `${att.present ?? 0} present · ${att.absent ?? 0} absent`,
      });
    }
  } else if (toolName === 'get_class_performance') {
    rows.push({
      label: `${result.studentCount ?? 0} students`,
      detail:
        result.belowThreshold != null
          ? `${result.belowThreshold} below ${result.thresholdPercent ?? 45}%`
          : undefined,
    });
    const risk = Array.isArray(result.atRiskPreview) ? result.atRiskPreview : [];
    risk.slice(0, 5).forEach((s: any) => {
      rows.push({ label: s.name, detail: s.avgPercent != null ? `${s.avgPercent}%` : undefined });
    });
  } else if (toolName === 'list_students') {
    const students = Array.isArray(result.students) ? result.students : [];
    if (students.length === 0) {
      return <p className="text-xs text-slate-500 italic">{result.message || 'No students found.'}</p>;
    }
    students.slice(0, 10).forEach((s: any) => {
      rows.push({ label: s.name, detail: s.className || undefined });
    });
    if (students.length > 10) {
      rows.push({ label: `+${students.length - 10} more` });
    }
    const staff = Array.isArray(result.staffMatches) ? result.staffMatches : [];
    staff.slice(0, 6).forEach((s: any) => {
      rows.push({
        label: s.name || 'Staff',
        detail: s.kind === 'admin' ? s.role || 'admin' : (Array.isArray(s.subjects) ? s.subjects.slice(0, 3).join(', ') : 'teacher'),
      });
    });
  } else if (toolName === 'get_guardians') {
    if (result.studentName) {
      rows.push({ label: result.studentName, detail: result.className || undefined });
    }
    const guardians = Array.isArray(result.guardians) ? result.guardians : [];
    if (guardians.length === 0) {
      return <p className="text-xs text-slate-500 italic">{result.message || 'No guardians linked.'}</p>;
    }
    guardians.slice(0, 8).forEach((g: any) => {
      rows.push({
        label: g.name || 'Guardian',
        detail: [g.relationship, g.phone].filter(Boolean).join(' · ') || undefined,
      });
    });
  } else if (toolName === 'get_calendar') {
    rows.push({
      label: result.range === 'this_week' ? 'This week' : [result.from, result.to].filter(Boolean).join(' – ') || 'Calendar',
      detail: `${result.count ?? 0} event${result.count === 1 ? '' : 's'}`,
    });
    const events = Array.isArray(result.events) ? result.events : [];
    events.slice(0, 6).forEach((e: any) => {
      rows.push({ label: e.title || 'Event', detail: e.type || undefined });
    });
    const named = Array.isArray(result.namedDates) ? result.namedDates : [];
    named.forEach((n: any) => {
      rows.push({
        label: n.label || n.date,
        detail: n.inThisWeek ? 'this week' : n.date,
      });
    });
  } else if (toolName === 'list_staff') {
    const teachers = Array.isArray(result.teachers) ? result.teachers : [];
    const admins = Array.isArray(result.admins) ? result.admins : [];
    teachers.slice(0, 8).forEach((t: any) => {
      rows.push({
        label: t.name || 'Teacher',
        detail: Array.isArray(t.subjects) ? t.subjects.slice(0, 3).join(', ') : undefined,
      });
    });
    admins.slice(0, 4).forEach((a: any) => {
      rows.push({ label: a.name || 'Admin', detail: a.role || undefined });
    });
  } else if (toolName === 'list_fee_debtors') {
    const debtors = Array.isArray(result.debtors) ? result.debtors : Array.isArray(result.students) ? result.students : [];
    if (debtors.length === 0) {
      return <p className="text-xs text-slate-500 italic">{result.message || result.note || 'No outstanding fees listed.'}</p>;
    }
    debtors.slice(0, 8).forEach((d: any) => {
      rows.push({
        label: d.name || d.studentName || 'Student',
        detail: d.outstanding != null ? `₦${d.outstanding}` : d.amount != null ? `₦${d.amount}` : d.className,
      });
    });
  } else if (toolName === 'list_admissions') {
    const apps = Array.isArray(result.applications) ? result.applications : [];
    const counts = result.counts || {};
    rows.push({
      label: 'Inbox',
      detail: `Pending ${counts.PENDING ?? 0} · Accepted ${counts.ACCEPTED ?? 0} · Declined ${counts.DECLINED ?? 0}`,
    });
    apps.slice(0, 6).forEach((a: any) => {
      rows.push({ label: a.name || 'Applicant', detail: [a.classLevel, a.status].filter(Boolean).join(' · ') });
    });
  } else if (toolName === 'get_school_stats') {
    rows.push({ label: 'Students', detail: String(result.students ?? result.studentCount ?? '—') });
    rows.push({ label: 'Teachers', detail: String(result.teachers ?? result.teacherCount ?? '—') });
    rows.push({ label: 'Class arms', detail: String(result.classArms ?? result.classes ?? '—') });
  } else if (toolName === 'get_attendance_summary') {
    rows.push({
      label: result.className || 'Attendance',
      detail: `Present ${result.present ?? 0} · Absent ${result.absent ?? 0} · Late ${result.late ?? 0}`,
    });
  } else if (toolName === 'get_academic_risk_summary') {
    const risk = Array.isArray(result.students) ? result.students : Array.isArray(result.atRisk) ? result.atRisk : [];
    rows.push({ label: `${risk.length || result.count || 0} at risk` });
    risk.slice(0, 6).forEach((s: any) => {
      rows.push({ label: s.name || 'Student', detail: s.avgPercent != null ? `${s.avgPercent}%` : s.className });
    });
  } else if (toolName === 'draft_parent_message') {
    rows.push({ label: 'Draft only — not sent' });
    if (result.draft || result.text || result.message) {
      rows.push({ label: String(result.draft || result.text || result.message).slice(0, 180) });
    }
  } else if (toolName === 'list_lois_insights') {
    const items = Array.isArray(result.insights) ? result.insights : Array.isArray(result.items) ? result.items : [];
    if (items.length === 0) {
      return <p className="text-xs text-slate-500 italic">{result.message || 'No filed insights.'}</p>;
    }
    items.slice(0, 6).forEach((i: any) => {
      rows.push({ label: i.title || i.type || 'Insight', detail: i.severity || i.status || undefined });
    });
  } else if (toolName === 'search_semantic') {
    const hits = Array.isArray(result.sources) ? result.sources : Array.isArray(result.results) ? result.results : [];
    hits.slice(0, 5).forEach((h: any) => {
      rows.push({ label: h.title || h.label || 'Source' });
    });
  }

  if (rows.length === 0) {
    return result.message
      ? <p className="text-xs text-slate-500 italic">{result.message}</p>
      : <p className="text-xs text-slate-500 italic">No details to show.</p>;
  }

  return (
    <ul className="space-y-1">
      {rows.map((row, i) => (
        <li key={`${row.label}-${i}`} className="text-xs text-emerald-900 dark:text-emerald-300/80">
          <span className="font-medium">{row.label}</span>
          {row.detail ? <span className="opacity-70"> — {row.detail}</span> : null}
        </li>
      ))}
    </ul>
  );
}

// ─── Main Chat Component ──────────────────────────────────────────────────────

interface AgoraChatProps {
  schoolId: string;
  initialConversationId?: string;
  variant?: 'default' | 'minimal';
  /** When false, keep the conversation mounted but do not steal focus. */
  isActive?: boolean;
  pageContext?: string | LoisPageContext;
  headerActions?: React.ReactNode;
}

export const AgoraChat: React.FC<AgoraChatProps> = ({
  schoolId,
  initialConversationId,
  variant = 'default',
  isActive = true,
  pageContext,
  headerActions,
}) => {
  const user = useSelector((state: RootState) => state.auth.user);
  const token = useSelector((state: RootState) => state.auth.token);
  const { data: profileResponse } = useGetMyTeacherProfileQuery(undefined, {
    skip: user?.role !== 'TEACHER'
  });
  const firstName = profileResponse?.data?.firstName || user?.firstName || 'there';
  const isSchoolAdmin = user?.role === 'SCHOOL_ADMIN';
  const workspace = useLoisWorkspaceOptional();
  const structuredFocus: LoisPageContext | null =
    pageContext && typeof pageContext === 'object'
      ? pageContext
      : workspace?.focus ?? null;
  const streamPageContext: LoisPageContext | undefined = structuredFocus
    ? { ...structuredFocus, insightId: workspace?.briefingInsightId || structuredFocus.insightId }
    : workspace?.briefingInsightId
      ? { type: 'generic', schoolId, label: 'Lois briefing', insightId: workspace.briefingInsightId }
      : undefined;
  const pathHint = typeof pageContext === 'string' ? pageContext : structuredFocus?.path || '';

  const [messages, setMessages] = useState<Message[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);

  const { data: historyData } = useGetChatHistoryQuery({ schoolId });
  const [getMessages] = useLazyGetChatMessagesQuery();
  const [deleteConversation] = useDeleteConversationMutation();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!initialConversationId) {
      let greetingDesc = "How can I help you with this school today?";
      if (structuredFocus?.type === 'student') {
        greetingDesc = `You're with ${structuredFocus.label}. I can pull published grades, attendance, or draft a parent note.`;
      } else if (structuredFocus?.type === 'class') {
        greetingDesc = `You're looking at ${structuredFocus.label}. I can check performance, the timetable, or the scheme of work.`;
      } else if (structuredFocus?.type === 'timetable') {
        greetingDesc = `You're on the timetable. I can inspect a class, propose Auto-Fill (not saved until you Apply), or check which subjects still need a scheme.`;
      } else if (structuredFocus?.type === 'scheme') {
        greetingDesc = `You're on the scheme of work for ${structuredFocus.label}. I can compare library weeks with this term, or propose a scheme — Apply on the card to generate.`;
      } else if (structuredFocus?.type === 'school') {
        greetingDesc = `I can summarise the school, explain what I noticed, or look up a student.`;
      } else if (pathHint.includes('/students')) {
        greetingDesc = "I see you're looking at students. Want a performance check or a progress summary?";
      } else if (pathHint.includes('/classes') || pathHint.includes('/levels')) {
        greetingDesc = "I see you're managing a class. Need performance, timetable, or a quiz?";
      } else if (pathHint.includes('/assessments')) {
        greetingDesc = "Working on assessments? I can build a new test or grade existing submissions.";
      }

      const greetingContent = `Hello ${firstName}! I'm Lois, your dedicated Myschoolbud AI Assistant. ${greetingDesc}`;
      setMessages((prev) => {
        // Screen focus / firstName can settle after the owner has already sent.
        // Replacing the array here wiped the live thread and left the empty greeting.
        if (prev.some((m) => m.role === 'user' || m.isStreaming)) return prev;
        if (prev.length === 1 && prev[0]?.role === 'assistant' && prev[0].content === greetingContent) {
          return prev;
        }
        return [
          {
            role: 'assistant',
            content: greetingContent,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ];
      });
    } else if (initialConversationId !== currentConversationId) {
      handleSelectConversation(initialConversationId, 'Existing Chat');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialConversationId, schoolId, firstName, structuredFocus?.type, structuredFocus?.label]);

  useEffect(() => {
    if (variant === 'minimal') return;
    const url = new URL(window.location.href);
    if (currentConversationId) {
      url.searchParams.set('id', currentConversationId);
    } else {
      url.searchParams.delete('id');
    }
    window.history.replaceState(null, '', url.pathname + url.search);
  }, [currentConversationId, variant]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!isActive || isStreaming || isHistoryOpen) return;
    inputRef.current?.focus();
  }, [isActive, isStreaming, isHistoryOpen, messages.length]);

  // ─── SSE Streaming Send ─────────────────────────────────────────────────

  const handleSendMessage = useCallback(async (overrideText?: string, insightIdOverride?: string) => {
    const textToSubmit = overrideText || inputValue;
    if (!textToSubmit.trim() || isStreaming) return;

    const userMessage: Message = {
      role: 'user',
      content: textToSubmit,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const currentInput = textToSubmit;
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsStreaming(true);

    // Create placeholder for streaming assistant message  
    const streamingMessage: Message = {
      role: 'assistant',
      content: '',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isStreaming: true,
      toolEvents: [],
    };
    setMessages(prev => [...prev, streamingMessage]);

    // Prepare the chat history for the API
    const chatHistory = messages
      .slice(1) // skip welcome message
      .map(({ role, content }) => ({ role, content }));
    chatHistory.push({ role: 'user', content: currentInput });

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      await streamAiChat(
        schoolId,
        chatHistory,
        {
          onToken: (tokenString) => {
            setMessages(prev => {
              const updated = [...prev];
              const last = updated[updated.length - 1];
              if (last && last.role === 'assistant') {
                updated[updated.length - 1] = {
                  ...last,
                  content: last.content + tokenString,
                };
              }
              return updated;
            });
          },
          onThinking: (message) => {
            setMessages(prev => {
              const updated = [...prev];
              const last = updated[updated.length - 1];
              if (last && last.role === 'assistant') {
                updated[updated.length - 1] = {
                  ...last,
                  toolEvents: [...(last.toolEvents || []), { type: 'thinking', message }],
                };
              }
              return updated;
            });
          },
          onConversationId: (id) => {
            if (!currentConversationId) {
              setCurrentConversationId(id);
              // Update URL immediately so browser back button works during generation
              const url = new URL(window.location.href);
              url.searchParams.set('id', id);
              window.history.replaceState(null, '', url.pathname + url.search);
            }
          },
          onToolStart: (data) => {
            setMessages(prev => {
              const updated = [...prev];
              const last = updated[updated.length - 1];
              if (last && last.role === 'assistant') {
                updated[updated.length - 1] = {
                  ...last,
                  toolEvents: [
                    ...(last.toolEvents || []),
                    {
                      type: 'tool_start',
                      toolCallId: data.toolCallId,
                      toolName: data.toolName,
                      toolDisplayName: data.toolDisplayName,
                      entityLabel: data.entityLabel,
                      args: data.args,
                    },
                  ],
                };
              }
              return updated;
            });
          },
          onToolResult: (data) => {
            setMessages(prev => {
              const updated = [...prev];
              const last = updated[updated.length - 1];
              if (last && last.role === 'assistant') {
                updated[updated.length - 1] = {
                  ...last,
                  toolEvents: applyToolResultToEvents(last.toolEvents || [], data),
                };
              }
              return updated;
            });
          },
          onDone: (data) => {
            if (!currentConversationId && data.conversationId) {
              setCurrentConversationId(data.conversationId);
            }
            setMessages(prev => {
              const updated = [...prev];
              const last = updated[updated.length - 1];
              if (last && last.role === 'assistant') {
                updated[updated.length - 1] = {
                  ...last,
                  isStreaming: false,
                  sources: data.sources?.length ? data.sources : last.sources,
                };
              }
              return updated;
            });
            setIsStreaming(false);
          },
          onError: (payload) => {
            toast.error(toastTextFromStreamError(payload), { duration: 8000 });
            setMessages(prev => {
              const updated = [...prev];
              const last = updated[updated.length - 1];
              if (last && last.role === 'assistant') {
                const note = inlineAssistantErrorNote(payload);
                const merged = last.content?.trim()
                  ? `${last.content}\n\n${note}`
                  : note;
                return [
                  ...updated.slice(0, -1),
                  { ...last, content: merged, isStreaming: false, toolEvents: last.toolEvents },
                ];
              }
              return updated;
            });
            setIsStreaming(false);
          },
        },
        currentConversationId || undefined,
        abortController.signal,
        token || undefined,
        {
          ...(streamPageContext || { type: 'generic', schoolId, label: 'Lois briefing' }),
          insightId:
            insightIdOverride ||
            streamPageContext?.insightId ||
            workspace?.briefingInsightId ||
            undefined,
        }
      );
    } catch (error: unknown) {
      const err = error as { name?: string };
      if (err?.name !== 'AbortError') {
        toast.error('Connection to AI failed. Check your network and try again.', { duration: 8000 });
        setIsStreaming(false);
        setMessages(prev => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last && last.role === 'assistant') {
            const note =
              'Sorry — we could not finish this reply. Check your connection and try sending your message again.';
            const merged = last.content?.trim() ? `${last.content}\n\n${note}` : note;
            return [...updated.slice(0, -1), { ...last, content: merged, isStreaming: false }];
          }
          return updated;
        });
      }
    }
  }, [inputValue, isStreaming, messages, schoolId, currentConversationId, token, streamPageContext, workspace?.briefingInsightId]);

  useEffect(() => {
    if (variant !== 'minimal' || !workspace?.seedPrompt) return;
    const seed = workspace.consumeSeedPrompt();
    if (seed) {
      void handleSendMessage(seed);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspace?.seedPrompt, variant]);

  const handleStopStreaming = () => {
    abortControllerRef.current?.abort();
    setIsStreaming(false);
    setMessages(prev => {
      const updated = [...prev];
      const last = updated[updated.length - 1];
      if (last && last.role === 'assistant') {
        updated[updated.length - 1] = { ...last, isStreaming: false };
      }
      return updated;
    });
  };

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  // ─── History Management ─────────────────────────────────────────────────

  const handleSelectConversation = async (id: string, title: string) => {
    try {
      setIsHistoryLoading(true);
      setCurrentConversationId(id);
      setIsHistoryOpen(false);

      const res = await getMessages({ schoolId, conversationId: id }).unwrap();

      setMessages([
        {
          role: 'assistant',
          content: `Welcome back! Loading your conversation...`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        },
        ...res
          .filter((m: any) => m.role.toLowerCase() !== 'system')
          .map((m: any) => ({
            role: m.role.toLowerCase() as 'user' | 'assistant',
            content: m.content,
            toolEvents: m.toolEvents || [],
            timestamp: new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }))
      ]);
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to load chat history');
    } finally {
      setIsHistoryLoading(false);
    }
  };

  const handleDeleteConversation = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await deleteConversation({ schoolId, conversationId: id }).unwrap();
      if (currentConversationId === id) {
        handleNewChat();
      }
      toast.success('Deleted');
    } catch (error) {
      toast.error('Failed to delete');
    }
  };

  const handleNewChat = () => {
    setCurrentConversationId(null);
    setMessages([{
      role: 'assistant',
      content: `Hello ${firstName}! I'm Lois. How can I help you today?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }]);
    setIsHistoryOpen(false);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const handleClearChat = () => {
    setMessages([{
      role: 'assistant',
      content: `Chat session refreshed. How can I continue assisting you, ${firstName}?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }]);
    toast.success('Chat cleared');
  };

  const isMinimal = variant === 'minimal';
  const typeScale = {
    title: isMinimal ? 'var(--lois-title)' : 'var(--text-section-title)',
    greeting: isMinimal ? 'var(--lois-greeting)' : '1.15rem',
    body: isMinimal ? 'var(--lois-body)' : 'var(--text-body)',
    small: isMinimal ? 'var(--lois-small)' : 'var(--text-small)',
    tiny: isMinimal ? 'var(--lois-tiny)' : 'var(--text-tiny)',
  };

  return (
    <LoisPlanApplySession conversationId={currentConversationId}>
    <div
      className={cn(
        'lois-panel flex flex-col h-full w-full max-w-7xl mx-auto bg-transparent overflow-hidden relative',
      )}
      style={{ fontFamily: 'var(--font-sans)' }}
    >
      <div
        className={cn(
          'relative z-10 shrink-0 flex items-center justify-between gap-2',
          isMinimal
            ? 'px-3 py-2.5 border-b border-[var(--light-border)] dark:border-[var(--dark-border)]'
            : 'px-4 md:px-8 py-4 md:py-6 border-b border-[var(--light-border)] dark:border-[var(--dark-border)]',
        )}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <LoisOrb size={isMinimal ? 'md' : 'lg'} pulse />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h2
                className="font-semibold text-light-text-primary dark:text-dark-text-primary leading-none tracking-tight"
                style={{ fontFamily: 'var(--font-heading)', fontSize: typeScale.title }}
              >
                Lois
              </h2>
              {isMinimal && (
                <span className="inline-flex items-center gap-1 rounded-full bg-[var(--agora-blue)]/10 px-1.5 py-0.5 text-[var(--agora-blue)]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--agora-blue)] shadow-[0_0_8px_var(--agora-blue)]" />
                  <span className="font-medium leading-none" style={{ fontSize: typeScale.tiny }}>Live</span>
                </span>
              )}
            </div>
            <p
              className="mt-1 text-light-text-secondary dark:text-dark-text-secondary truncate leading-none"
              style={{ fontSize: typeScale.tiny }}
            >
              {structuredFocus?.label || (workspace?.briefingOpen ? 'Briefing ready' : 'School assistant')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-0.5 shrink-0">
          <button
            type="button"
            onClick={handleNewChat}
            className="lois-icon-btn"
            title="New chat"
            aria-label="New chat"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setIsHistoryOpen(true)}
            className="lois-icon-btn"
            title="History"
            aria-label="Chat history"
          >
            <History className="w-3.5 h-3.5" />
          </button>
          {headerActions}
        </div>
      </div>

      <div className="flex-1 relative flex flex-col z-10 min-h-0 overflow-y-auto scrollbar-thin scrollbar-thumb-light-border dark:scrollbar-thumb-white/10 scroll-smooth">
        {isHistoryLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-2">
            <LoisOrb size="md" pulse />
            <p className="text-light-text-secondary dark:text-dark-text-secondary" style={{ fontSize: typeScale.small }}>
              Loading conversations…
            </p>
          </div>
        ) : (
          <>
            {isMinimal && workspace?.briefingOpen ? (
              <LoisBriefingPanel
                schoolId={schoolId}
                focusInsightId={workspace.briefingInsightId}
                compact={messages.length > 1}
                onAsk={(prompt, insight) => void handleSendMessage(prompt, insight.id)}
                onEmpty={workspace.clearBriefing}
                onOpenList={() => workspace.hide()}
              />
            ) : null}
            {messages.length <= 1 && !(isMinimal && workspace?.briefingOpen) ? (
          <div className={cn(
            'flex-1 flex flex-col min-h-0',
            isMinimal ? 'px-3 py-5' : 'max-w-3xl mx-auto w-full px-4 py-6 md:px-5 md:py-8',
          )}>
            <div className="flex-1 min-h-4" />

            <div className={cn('flex flex-col gap-3', isMinimal ? 'items-stretch text-left' : 'items-center text-center')}>
              <div>
                <span
                  className="uppercase tracking-[0.18em] text-light-text-muted dark:text-dark-text-muted font-medium"
                  style={{ fontSize: typeScale.tiny }}
                >
                  Try asking
                </span>
                <h3
                  className="mt-2 font-semibold text-light-text-primary dark:text-dark-text-primary tracking-tight leading-snug"
                  style={{ fontFamily: 'var(--font-heading)', fontSize: typeScale.greeting }}
                >
                  How can I help, {firstName}?
                </h3>
                <p
                  className="mt-1.5 text-light-text-secondary dark:text-dark-text-secondary max-w-md leading-relaxed"
                  style={{ fontSize: typeScale.small }}
                >
                  {isSchoolAdmin
                    ? 'Ask about students, classes, staff, fees, admissions, or the calendar.'
                    : 'Ask for a lesson plan, quiz, grades, or what’s next on the timetable.'}
                </p>
              </div>

              <LoisPromptSuggestions
                cards={loisPromptCards({ isSchoolAdmin, structuredFocus, pathHint })}
                isMinimal={isMinimal}
                typeScale={typeScale}
                onSelect={handleSendMessage}
              />
            </div>
          </div>
        ) : messages.length > 1 ? (
          <div className={cn('space-y-4', isMinimal ? 'px-3 py-4' : 'px-4 md:px-5 py-4 md:py-6')}>
            {messages.map((msg, idx) => (
              idx === 0 ? null : (
                <FadeInUp key={idx} duration={0.25} delay={0}>
                  <div className={cn(
                    "flex gap-2.5 group",
                    msg.role === 'user' ? "flex-row-reverse" : "flex-row"
                  )}>
                    <div className={cn(
                      "flex-shrink-0",
                      msg.role === 'assistant'
                        ? "relative"
                        : "w-7 h-7 rounded-lg flex items-center justify-center bg-[var(--light-card)] dark:bg-[var(--dark-surface)] border border-[var(--light-border)] dark:border-[var(--dark-border)] text-light-text-primary dark:text-dark-text-primary"
                    )}>
                      {msg.role === 'assistant' ? <LoisOrb size="sm" /> : <User size={12} />}
                    </div>

                    <div className={cn(
                      "flex flex-col max-w-[85%] gap-1",
                      msg.role === 'user' ? "items-end text-right" : "items-start text-left"
                    )}>
                      {msg.role === 'assistant' && msg.toolEvents && msg.toolEvents.length > 0 && (
                        <div className="w-full space-y-2 mb-1">
                          {(() => {
                            const visible = visibleToolEvents(msg.toolEvents);
                            const openPlans = openPlansFromEvents(visible);
                            return (
                              <>
                                {openPlans.length >= 2 ? (
                                  <LoisApplyAllBar
                                    schoolId={schoolId}
                                    conversationId={currentConversationId}
                                    plans={openPlans}
                                  />
                                ) : null}
                                {visible.map((event, eventIdx) => (
                                  <ToolCard
                                    key={toolEventKey(event, eventIdx)}
                                    event={event}
                                    schoolId={schoolId}
                                    variant={variant}
                                    conversationId={currentConversationId}
                                  />
                                ))}
                              </>
                            );
                          })()}
                        </div>
                      )}

                      {(msg.content || msg.isStreaming) && (
                        <div
                          className={cn(
                            "leading-relaxed",
                            msg.role === 'user'
                              ? "rounded-2xl rounded-tr-md bg-[var(--agora-blue)] text-white px-3 py-2"
                              : "text-light-text-primary dark:text-dark-text-primary",
                          )}
                          style={{ fontSize: typeScale.body }}
                        >
                          <div className="whitespace-pre-wrap">
                            <div className="flex flex-col gap-1.5">
                              {msg.content}
                              {msg.isStreaming && (
                                <div className="mt-0.5">
                                  <ThreeDotTyping />
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {msg.role === 'assistant' && !msg.isStreaming && msg.sources && msg.sources.length > 0 && (
                        <div className="flex flex-wrap gap-1 px-0.5">
                          {msg.sources.map((source, si) =>
                            source.href ? (
                              <Link
                                key={`${source.label}-${si}`}
                                href={source.href}
                                className="px-1.5 py-0.5 rounded-md border border-[var(--light-border)] dark:border-[var(--dark-border)] text-light-text-secondary dark:text-dark-text-secondary hover:text-[var(--agora-blue)] hover:border-[var(--agora-blue)]/40"
                                style={{ fontSize: typeScale.tiny }}
                              >
                                {source.label}
                              </Link>
                            ) : (
                              <span
                                key={`${source.label}-${si}`}
                                className="px-1.5 py-0.5 rounded-md border border-[var(--light-border)] dark:border-[var(--dark-border)] text-light-text-secondary dark:text-dark-text-secondary"
                                style={{ fontSize: typeScale.tiny }}
                              >
                                {source.label}
                              </span>
                            )
                          )}
                        </div>
                      )}

                      <div className="flex items-center gap-2 px-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-light-text-secondary dark:text-dark-text-secondary" style={{ fontSize: typeScale.tiny }}>
                          {msg.timestamp}
                        </span>
                        {msg.role === 'assistant' && !msg.isStreaming && msg.content && (
                          <button
                            onClick={() => handleCopy(msg.content)}
                            className="text-light-text-muted dark:text-white/30 hover:text-agora-blue dark:hover:text-white transition-colors p-1"
                          >
                            <Copy size={11} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </FadeInUp>
              )
            ))}

            <div ref={messagesEndRef} className="h-4" />
          </div>
            ) : null}
          </>
        )}
      </div>

      <div className={cn('z-20 shrink-0', isMinimal ? 'px-3 pb-3 pt-1' : 'p-2 md:p-12 pb-6 md:pb-12')}>
        <div className="max-w-4xl mx-auto">
          <div className="lois-composer">
            <div className="flex items-center gap-2 rounded-[0.95rem] bg-[var(--input-field-bg)] px-2.5 py-2">
              <input
                ref={inputRef}
                placeholder={workspace?.briefingOpen ? 'Ask a follow-up…' : 'Ask Lois anything…'}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                disabled={isStreaming}
                className="flex-1 min-w-0 disabled:cursor-not-allowed"
              />
              <button
                type="button"
                onClick={() => (isStreaming ? handleStopStreaming() : handleSendMessage())}
                disabled={!isStreaming && !inputValue.trim()}
                className="relative h-7 w-7 shrink-0 rounded-lg overflow-hidden text-white disabled:opacity-35 transition-transform active:scale-95"
                aria-label={isStreaming ? 'Stop' : 'Send'}
              >
                <span className="absolute inset-0 bg-[#0A0A0B]" />
                <span className="absolute inset-0 bg-gradient-to-br from-[#7D52FF]/50 via-[var(--agora-blue)]/30 to-[#00D1FF]/40" />
                <span className="relative flex items-center justify-center">
                  {isStreaming ? <StopCircle className="w-3.5 h-3.5" /> : <ArrowUp className="w-3.5 h-3.5" />}
                </span>
              </button>
            </div>
          </div>
          <p
            className="mt-1.5 text-center text-light-text-muted dark:text-dark-text-muted"
            style={{ fontSize: typeScale.tiny }}
          >
            Lois can be wrong — double-check important details.
          </p>
        </div>
      </div>


      <LoisChatHistory
        isOpen={isHistoryOpen}
        contained={isMinimal}
        chats={historyData ?? []}
        activeId={currentConversationId}
        onClose={() => setIsHistoryOpen(false)}
        onSelect={(id, title) => void handleSelectConversation(id, title)}
        onDelete={(e, id) => void handleDeleteConversation(e, id)}
        onNewChat={handleNewChat}
      />
    </div>
    </LoisPlanApplySession>
  );
};
