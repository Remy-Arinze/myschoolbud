'use client';

import React from 'react';
import { useGetAiUsageHistoryQuery } from '@/lib/store/api/subscriptionsApi';
import {
    Activity,
    User,
    Calendar,
    Coins,
    BrainCircuit,
    FileText,
    CheckSquare,
    GraduationCap,
    Clock,
    ChevronRight
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { FadeInUp } from '@/components/ui/FadeInUp';

const actionIcons: Record<string, any> = {
    generate_quiz: CheckSquare,
    generate_assessment: Activity,
    generate_lesson_plan: FileText,
    grade_essay: GraduationCap,
    generate_flashcards: BrainCircuit,
    generate_summary: FileText,
    unknown: Activity,
};

const actionNames: Record<string, string> = {
    generate_quiz: 'Quiz Generation',
    generate_assessment: 'Full Assessment',
    generate_lesson_plan: 'Lesson Planning',
    grade_essay: 'Essay Grading',
    generate_flashcards: 'Flashcard Set',
    generate_summary: 'Study Summary',
    unknown: 'AI Assistant Action',
};

export const AiUsageHistory: React.FC = () => {
    const { data, isLoading, isError } = useGetAiUsageHistoryQuery();

    if (isLoading) {
        return (
            <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="h-20 w-full bg-light-card dark:bg-dark-surface animate-pulse rounded-2xl border border-light-border dark:border-dark-border"></div>
                ))}
            </div>
        );
    }

    if (isError || !data?.success) {
        return (
            <div className="p-12 text-center bg-light-card dark:bg-dark-surface rounded-3xl border border-dashed border-light-border dark:border-dark-border opacity-60">
                <p className="text-light-text-secondary dark:text-dark-text-secondary">Failed to load AI usage history.</p>
            </div>
        );
    }

    const logs = data.data;

    if (logs.length === 0) {
        return (
            <div className="p-16 text-center bg-light-card dark:bg-dark-surface rounded-3xl border border-dashed border-light-border dark:border-dark-border">
                <div className="w-20 h-20 bg-light-bg dark:bg-dark-bg rounded-full flex items-center justify-center mx-auto mb-6">
                    <BrainCircuit className="w-10 h-10 text-light-text-muted dark:text-dark-text-muted opacity-40" />
                </div>
                <h3 className="text-xl font-bold text-light-text-primary dark:text-dark-text-primary mb-2">No AI usage yet</h3>
                <p className="text-light-text-secondary text-xs dark:text-dark-text-secondary max-w-sm mx-auto">
                    When your teachers start using Myschoolbud AI tools, the history will appear here for you to track consumption.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between mb-2 px-2">
                <h3 className="font-bold text-light-text-primary dark:text-dark-text-primary flex items-center gap-2" style={{ fontSize: 'var(--text-card-title)' }}>
                    <Activity className="w-5 h-5 text-blue-500" />
                    Recent AI Activity
                </h3>
                <span className="text-light-text-muted dark:text-dark-text-muted" style={{ fontSize: 'var(--text-small)' }}>
                    Showing latest {logs.length} transactions
                </span>
            </div>

            <div
                className="grid gap-3 overflow-y-auto pr-1 [&::-webkit-scrollbar]:hidden"
                style={{
                    maxHeight: '520px',
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none',
                }}
            >
                {logs.map((log, index) => {
                    const Icon = actionIcons[log.action] || actionIcons.unknown;
                    const actionName = actionNames[log.action] || log.action;

                    return (
                        <FadeInUp
                            key={log.id}
                            delay={index * 0.05}
                            duration={0.4}
                            className="group relative overflow-hidden flex items-center justify-between p-5 rounded-2xl bg-light-card dark:bg-dark-surface border border-light-border dark:border-dark-border hover:shadow-lg hover:border-blue-400/30 dark:hover:border-blue-500/30 transition-all cursor-default"
                        >
                            <div className="flex items-center gap-5">
                                {/* Action Icon Wrapper */}
                                <div className="relative shrink-0 w-12 h-12 rounded-xl bg-light-bg dark:bg-dark-bg flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                                    <Icon className="w-6 h-6 text-light-text-primary dark:text-dark-text-primary opacity-80" />
                                    <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-md bg-blue-500 flex items-center justify-center text-[10px] text-white font-bold shadow-sm">
                                        {log.creditsUsed}
                                    </div>
                                </div>

                                {/* Info Column */}
                                <div className="space-y-1">
                                    <h4 className="font-bold text-light-text-primary dark:text-dark-text-primary" style={{ fontSize: 'var(--text-body)' }}>
                                        {actionName}
                                    </h4>
                                    <div className="flex items-center gap-3 text-light-text-secondary dark:text-dark-text-secondary" style={{ fontSize: 'var(--text-small)' }}>
                                        <div className="flex items-center gap-1.5 font-medium">
                                            <User className="w-3.5 h-3.5" />
                                            {log.user.firstName} {log.user.lastName}
                                        </div>
                                        <span className="opacity-20">•</span>
                                        <div className="flex items-center gap-1.5 opacity-80">
                                            <Clock className="w-3.5 h-3.5" />
                                            {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Right side metric */}
                            <div className="text-right flex flex-col items-end gap-1">
                                <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-bold" style={{ fontSize: 'var(--text-small)' }}>
                                    <Coins className="w-3.5 h-3.5" />
                                    -{log.creditsUsed}
                                </div>
                                <span className="text-[10px] font-medium uppercase tracking-widest text-light-text-muted dark:text-dark-text-muted px-1">
                                    Credits
                                </span>
                            </div>

                            {/* Decorative hover background */}
                            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-blue-500/0 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                        </FadeInUp>
                    );
                })}
            </div>
        </div>
    );
};
