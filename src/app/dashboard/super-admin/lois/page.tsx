'use client';

import { useState, useEffect } from 'react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { FadeInUp } from '@/components/ui/FadeInUp';
import {
    BrainCircuit,
    Sparkles,
    Code2,
    Eye,
    Save,
    RotateCcw,
    Loader2,
    CheckCircle2,
    ChevronDown,
    ChevronUp,
    Wrench,
    Info,
    AlertTriangle,
    FileText,
    Users,
    GraduationCap,
    ShieldCheck,
    Plus,
} from 'lucide-react';
import {
    useAdminGetSystemConfigQuery,
    useAdminUpsertSystemConfigMutation,
    useAdminResetSystemConfigMutation,
    useAdminGetSystemPromptPreviewQuery,
    useAdminGetLoisToolsQuery,
    type SystemPromptConfigInput,
    type LoisToolDefinition,
} from '@/lib/store/api/aiApi';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';
import { SkillsTab } from '@/components/ai/SkillsTab';

type ActiveTab = 'prompt' | 'skills' | 'tools';

// ── Character counter ─────────────────────────────────────────────────────────
function CharCounter({ value, max }: { value: string; max: number }) {
    const count = value?.length ?? 0;
    const pct = (count / max) * 100;
    return (
        <span
            className={cn(
                'tabular-nums transition-colors',
                pct >= 100 ? 'text-red-500 font-semibold' : pct >= 80 ? 'text-amber-500' : 'text-light-text-muted dark:text-dark-text-muted'
            )}
            style={{ fontSize: 'var(--text-small)' }}
        >
            {count}/{max}
        </span>
    );
}

// ── Prompt section editor card ────────────────────────────────────────────────
function PromptSection({
    icon,
    accentClass,
    title,
    description,
    placeholder,
    value,
    onChange,
    maxLength,
    rows = 6,
    badge,
}: {
    icon: React.ReactNode;
    accentClass: string;
    title: string;
    description: string;
    placeholder: string;
    value: string;
    onChange: (v: string) => void;
    maxLength: number;
    rows?: number;
    badge?: string;
}) {
    const isEmpty = !value.trim();
    return (
        <Card className="overflow-hidden group hover:shadow-md transition-all duration-200 border-light-border dark:border-dark-border">
            <div className={cn('h-0.5 w-full group-hover:h-1 transition-all duration-300', accentClass)} />
            <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                    <CardTitle
                        className="flex items-center gap-2.5 font-bold text-light-text-primary dark:text-dark-text-primary"
                        style={{ fontSize: 'var(--text-body)' }}
                    >
                        <span className={cn('flex items-center justify-center w-7 h-7 rounded-lg opacity-80', accentClass.replace('bg-', 'bg-').replace('-500', '-500/15').replace('-600', '-600/15'))}>
                            {icon}
                        </span>
                        {title}
                    </CardTitle>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                        {badge && (
                            <span className="px-2 py-0.5 rounded-full bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border text-light-text-muted dark:text-dark-text-muted font-mono" style={{ fontSize: 'var(--text-tiny)' }}>
                                {badge}
                            </span>
                        )}
                        {isEmpty ? (
                            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20" style={{ fontSize: 'var(--text-tiny)' }}>
                                Using default
                            </span>
                        ) : (
                            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--agora-blue)]/10 text-[var(--agora-blue)] border border-[var(--agora-blue)]/20" style={{ fontSize: 'var(--text-tiny)' }}>
                                <CheckCircle2 className="h-3 w-3" />
                                Override active
                            </span>
                        )}
                    </div>
                </div>
                <p className="text-light-text-secondary dark:text-dark-text-secondary mt-0.5 ml-9" style={{ fontSize: 'var(--text-small)' }}>
                    {description}
                </p>
            </CardHeader>
            <CardContent>
                <textarea
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    rows={rows}
                    maxLength={maxLength}
                    className="w-full px-3 py-2.5 rounded-xl border border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg text-light-text-primary dark:text-dark-text-primary font-mono resize-y focus:outline-none focus:ring-2 focus:ring-[var(--agora-blue)]/30 transition-all"
                    style={{ fontSize: '0.75rem', lineHeight: '1.6' }}
                />
                <div className="flex items-center justify-between mt-1.5 px-1">
                    {!isEmpty && (
                        <button
                            type="button"
                            onClick={() => onChange('')}
                            className="text-light-text-muted dark:text-dark-text-muted hover:text-red-500 transition-colors"
                            style={{ fontSize: 'var(--text-small)' }}
                        >
                            Clear (revert to default)
                        </button>
                    )}
                    {isEmpty && <span />}
                    <CharCounter value={value} max={maxLength} />
                </div>
            </CardContent>
        </Card>
    );
}

// ── Live prompt preview panel ──────────────────────────────────────────────────
function LivePromptPreview() {
    const [open, setOpen] = useState(false);
    const { data, isLoading, refetch } = useAdminGetSystemPromptPreviewQuery(undefined, { skip: !open });

    return (
        <div className="rounded-2xl border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-surface overflow-hidden">
            <button
                type="button"
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-light-hover dark:hover:bg-dark-hover transition-colors"
                onClick={() => {
                    if (!open) refetch();
                    setOpen((v) => !v);
                }}
            >
                <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
                        <Eye className="h-4 w-4" />
                    </div>
                    <div className="text-left">
                        <p className="font-semibold text-light-text-primary dark:text-dark-text-primary" style={{ fontSize: 'var(--text-body)' }}>
                            Live Rendered Prompt Preview
                        </p>
                        <p className="text-light-text-secondary dark:text-dark-text-secondary" style={{ fontSize: 'var(--text-small)' }}>
                            What Lois is actually running right now — click to fetch
                        </p>
                    </div>
                </div>
                {open ? <ChevronUp className="h-4 w-4 text-light-text-muted dark:text-dark-text-muted" /> : <ChevronDown className="h-4 w-4 text-light-text-muted dark:text-dark-text-muted" />}
            </button>

            {open && (
                <div className="border-t border-light-border dark:border-dark-border px-5 py-4">
                    {isLoading ? (
                        <div className="flex items-center gap-2 py-6 text-light-text-secondary dark:text-dark-text-secondary">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span style={{ fontSize: 'var(--text-body)' }}>Rendering prompt…</span>
                        </div>
                    ) : (
                        <>
                            <div className="flex items-start gap-2 mb-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30">
                                <Info className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                                <p className="text-amber-700 dark:text-amber-400" style={{ fontSize: 'var(--text-small)' }}>
                                    {data?.data?.note}
                                </p>
                            </div>
                            <pre
                                className="whitespace-pre-wrap font-mono text-light-text-secondary dark:text-dark-text-secondary bg-light-bg dark:bg-dark-bg rounded-xl p-4 max-h-[500px] overflow-y-auto border border-light-border dark:border-dark-border"
                                style={{ fontSize: '0.68rem', lineHeight: '1.7' }}
                            >
                                {data?.data?.prompt}
                            </pre>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}

// ── Tool card ─────────────────────────────────────────────────────────────────
const TOOL_COLORS: Record<string, { accent: string; icon: React.ReactNode }> = {
    execute_sql: { accent: 'border-blue-500/30 bg-blue-500/5', icon: <Code2 className="h-4 w-4 text-blue-500" /> },
    search_semantic: { accent: 'border-purple-500/30 bg-purple-500/5', icon: <Sparkles className="h-4 w-4 text-purple-500" /> },
    get_school_stats: { accent: 'border-emerald-500/30 bg-emerald-500/5', icon: <BrainCircuit className="h-4 w-4 text-emerald-500" /> },
    get_academic_risk_summary: { accent: 'border-red-500/30 bg-red-500/5', icon: <AlertTriangle className="h-4 w-4 text-red-500" /> },
    grade_essay: { accent: 'border-orange-500/30 bg-orange-500/5', icon: <FileText className="h-4 w-4 text-orange-500" /> },
    generate_lesson_plan: { accent: 'border-indigo-500/30 bg-indigo-500/5', icon: <FileText className="h-4 w-4 text-indigo-500" /> },
    generate_quiz: { accent: 'border-cyan-500/30 bg-cyan-500/5', icon: <GraduationCap className="h-4 w-4 text-cyan-500" /> },
    generate_flashcards: { accent: 'border-teal-500/30 bg-teal-500/5', icon: <Sparkles className="h-4 w-4 text-teal-500" /> },
    generate_summary: { accent: 'border-violet-500/30 bg-violet-500/5', icon: <FileText className="h-4 w-4 text-violet-500" /> },
    generate_assessment: { accent: 'border-rose-500/30 bg-rose-500/5', icon: <ShieldCheck className="h-4 w-4 text-rose-500" /> },
};

function ToolCard({ tool, index }: { tool: LoisToolDefinition; index: number }) {
    const [expanded, setExpanded] = useState(false);
    const style = TOOL_COLORS[tool.name] ?? { accent: 'border-gray-300/30 bg-gray-500/5', icon: <Wrench className="h-4 w-4 text-gray-500" /> };
    const params = Object.entries(tool.parameters?.properties ?? {});
    const required = tool.parameters?.required ?? [];

    return (
        <FadeInUp staggerIndex={index} staggerDelay={0.04}>
            <div className={cn('rounded-2xl border p-4 transition-all duration-200', style.accent)}>
                <div
                    className="flex items-start gap-3 cursor-pointer"
                    onClick={() => setExpanded((v) => !v)}
                >
                    <div className="flex items-center justify-center w-9 h-9 rounded-xl border border-white/10 dark:border-black/20 bg-white/60 dark:bg-dark-bg/60 flex-shrink-0 mt-0.5">
                        {style.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                            <code className="font-bold text-light-text-primary dark:text-dark-text-primary" style={{ fontSize: 'var(--text-body)', fontFamily: 'monospace' }}>
                                {tool.name}
                            </code>
                            <span className="text-light-text-muted dark:text-dark-text-muted" style={{ fontSize: 'var(--text-tiny)' }}>
                                {params.length} param{params.length !== 1 ? 's' : ''}
                            </span>
                        </div>
                        <p className="text-light-text-secondary dark:text-dark-text-secondary line-clamp-2" style={{ fontSize: 'var(--text-small)' }}>
                            {tool.description}
                        </p>
                    </div>
                    <button type="button" className="text-light-text-muted dark:text-dark-text-muted flex-shrink-0 mt-1">
                        {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    </button>
                </div>

                {expanded && params.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-light-border dark:border-dark-border space-y-2">
                        {params.map(([name, def]: [string, any]) => (
                            <div key={name} className="flex items-start gap-2">
                                <code
                                    className={cn(
                                        'flex-shrink-0 px-1.5 py-0.5 rounded font-bold',
                                        required.includes(name)
                                            ? 'bg-[var(--agora-blue)]/10 text-[var(--agora-blue)]'
                                            : 'bg-light-bg dark:bg-dark-bg text-light-text-muted dark:text-dark-text-muted'
                                    )}
                                    style={{ fontSize: 'var(--text-tiny)', fontFamily: 'monospace' }}
                                >
                                    {name}
                                    {required.includes(name) ? ' *' : ''}
                                </code>
                                <div className="flex-1 min-w-0">
                                    <span className="text-light-text-muted dark:text-dark-text-muted" style={{ fontSize: 'var(--text-tiny)', fontFamily: 'monospace' }}>
                                        {def.type}{def.enum ? ` (${def.enum.join(' | ')})` : ''}
                                    </span>
                                    {def.description && (
                                        <p className="text-light-text-secondary dark:text-dark-text-secondary mt-0.5" style={{ fontSize: 'var(--text-small)' }}>
                                            {def.description}
                                        </p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </FadeInUp>
    );
}

// ── Tools tab ─────────────────────────────────────────────────────────────────
function ToolsTab() {
    const { data, isLoading } = useAdminGetLoisToolsQuery();
    const tools = data?.data ?? [];

    return (
        <div className="space-y-4">
            <FadeInUp>
                <div className="flex items-start gap-4 p-5 rounded-2xl bg-gradient-to-br from-[#2490FD]/5 to-purple-500/5 border border-[#2490FD]/15">
                    <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#2490FD]/10 border border-[#2490FD]/20 flex-shrink-0">
                        <Wrench className="h-5 w-5 text-[#2490FD]" />
                    </div>
                    <div>
                        <p className="font-bold text-light-text-primary dark:text-dark-text-primary mb-0.5" style={{ fontSize: 'var(--text-body)' }}>
                            Lois Agent Tools ({tools.length})
                        </p>
                        <p className="text-light-text-secondary dark:text-dark-text-secondary" style={{ fontSize: 'var(--text-small)' }}>
                            These are the function-calling tools available to Lois during a chat session. Lois autonomously selects which tools to use based on the user's query. Tool definitions live in <code className="font-mono bg-light-bg dark:bg-dark-bg px-1 rounded" style={{ fontSize: '0.7rem' }}>agora-chat-tools.definition.ts</code> and require a code deployment to change.
                        </p>
                    </div>
                </div>
            </FadeInUp>

            {isLoading ? (
                <div className="flex items-center justify-center py-16">
                    <Loader2 className="h-8 w-8 animate-spin text-[var(--agora-blue)]" />
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                    {tools.map((tool, i) => (
                        <ToolCard key={tool.name} tool={tool} index={i} />
                    ))}
                </div>
            )}
        </div>
    );
}

// ── Main Prompt Config Tab ─────────────────────────────────────────────────────
const FIELD_LIMITS: Record<keyof SystemPromptConfigInput, number> = {
    identityOverride: 3000,
    additionalRules: 3000,
    teacherRulesOverride: 2000,
    adminRulesOverride: 2000,
    studentRulesOverride: 2000,
    internalNotes: 2000,
};

function PromptConfigTab() {
    const { data, isLoading } = useAdminGetSystemConfigQuery();
    const [upsert, { isLoading: isSaving }] = useAdminUpsertSystemConfigMutation();
    const [reset, { isLoading: isResetting }] = useAdminResetSystemConfigMutation();

    const emptyForm: SystemPromptConfigInput = {
        identityOverride: '',
        additionalRules: '',
        teacherRulesOverride: '',
        adminRulesOverride: '',
        studentRulesOverride: '',
        internalNotes: '',
    };

    const [form, setForm] = useState<SystemPromptConfigInput>(emptyForm);
    const [isDirty, setIsDirty] = useState(false);

    useEffect(() => {
        if (data?.data) {
            setForm({
                identityOverride: data.data.identityOverride ?? '',
                additionalRules: data.data.additionalRules ?? '',
                teacherRulesOverride: data.data.teacherRulesOverride ?? '',
                adminRulesOverride: data.data.adminRulesOverride ?? '',
                studentRulesOverride: data.data.studentRulesOverride ?? '',
                internalNotes: data.data.internalNotes ?? '',
            });
        } else if (!isLoading) {
            setForm(emptyForm);
        }
        setIsDirty(false);
    }, [data, isLoading]);

    const update = (key: keyof SystemPromptConfigInput) => (val: string) => {
        setForm((prev) => ({ ...prev, [key]: val }));
        setIsDirty(true);
    };

    const handleSave = async () => {
        const payload: SystemPromptConfigInput = Object.fromEntries(
            Object.entries(form).map(([k, v]) => [k, typeof v === 'string' ? v.trim() || null : v])
        ) as SystemPromptConfigInput;
        try {
            await upsert(payload).unwrap();
            toast.success('System prompt configuration saved.');
            setIsDirty(false);
        } catch (err: any) {
            toast.error(err?.data?.message || 'Failed to save.');
        }
    };

    const handleReset = async () => {
        try {
            await reset().unwrap();
            toast.success('Reset to hardcoded defaults.');
            setIsDirty(false);
        } catch (err: any) {
            toast.error(err?.data?.message || 'Failed to reset.');
        }
    };

    const hasAnyOverride = Object.entries(form).some(([k, v]) => k !== 'internalNotes' && typeof v === 'string' && v.trim());

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-[var(--agora-blue)]" />
                    <span className="text-light-text-secondary dark:text-dark-text-secondary animate-pulse" style={{ fontSize: 'var(--text-body)' }}>
                        Loading system config…
                    </span>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Warning banner */}
            <FadeInUp staggerIndex={0}>
                <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-700/30">
                    <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="font-semibold text-amber-800 dark:text-amber-300 mb-0.5" style={{ fontSize: 'var(--text-body)' }}>
                            System-wide overrides
                        </p>
                        <p className="text-amber-700 dark:text-amber-400" style={{ fontSize: 'var(--text-small)' }}>
                            These settings affect Lois for <strong>every school on the platform</strong>. Fields left blank use the hardcoded defaults. Runtime context (SQL schema, tool routing, school data) is always injected and cannot be removed here.
                        </p>
                    </div>
                </div>
            </FadeInUp>

            {/* Identity override */}
            <FadeInUp staggerIndex={1}>
                <PromptSection
                    icon={<BrainCircuit className="h-3.5 w-3.5 text-[#2490FD]" />}
                    accentClass="bg-blue-500"
                    title="Identity & Introduction"
                    description="Overrides the opening identity block — who Lois says she is and how she introduces herself."
                    placeholder={`Your identity: You are Lois, the Myschoolbud AI Assistant assigned to [school name].\n\nIntroduction rule:\n- At the start of a new conversation, you may mention you are Lois.\n- If asked your name or who you are: say "I am Lois, the AI assistant for [school] on Myschoolbud."\n- Otherwise do NOT open every reply with a formal introduction — answer directly.`}
                    value={form.identityOverride ?? ''}
                    onChange={update('identityOverride')}
                    maxLength={FIELD_LIMITS.identityOverride}
                    rows={8}
                    badge="identity block"
                />
            </FadeInUp>

            {/* Additional rules */}
            <FadeInUp staggerIndex={2}>
                <PromptSection
                    icon={<Plus className="h-3.5 w-3.5 text-emerald-600" />}
                    accentClass="bg-emerald-500"
                    title="Additional Core Rules"
                    description="Appended after the default operational rules. Use this to add platform-wide behavioural rules without replacing the defaults."
                    placeholder={`e.g.\n9. Always respond in the same language the user writes in.\n10. Do not suggest third-party apps or tools outside of Myschoolbud.`}
                    value={form.additionalRules ?? ''}
                    onChange={update('additionalRules')}
                    maxLength={FIELD_LIMITS.additionalRules}
                    rows={6}
                    badge="appended"
                />
            </FadeInUp>

            {/* Role overrides grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <FadeInUp staggerIndex={3}>
                    <PromptSection
                        icon={<Users className="h-3.5 w-3.5 text-indigo-600" />}
                        accentClass="bg-indigo-500"
                        title="Teacher Rules"
                        description="Replaces the TEACHER-SPECIFIC RULES block."
                        placeholder={`TEACHER-SPECIFIC RULES:\n- Tone: Be a helpful professional AI colleague to teachers.\n- ...`}
                        value={form.teacherRulesOverride ?? ''}
                        onChange={update('teacherRulesOverride')}
                        maxLength={FIELD_LIMITS.teacherRulesOverride}
                        rows={10}
                        badge="replaces"
                    />
                </FadeInUp>
                <FadeInUp staggerIndex={4}>
                    <PromptSection
                        icon={<ShieldCheck className="h-3.5 w-3.5 text-orange-600" />}
                        accentClass="bg-orange-500"
                        title="Admin Rules"
                        description="Replaces the SCHOOL ADMIN-SPECIFIC RULES block."
                        placeholder={`SCHOOL ADMIN-SPECIFIC RULES:\n- Tone: Be a high-level strategic assistant to the school leadership.\n- ...`}
                        value={form.adminRulesOverride ?? ''}
                        onChange={update('adminRulesOverride')}
                        maxLength={FIELD_LIMITS.adminRulesOverride}
                        rows={10}
                        badge="replaces"
                    />
                </FadeInUp>
                <FadeInUp staggerIndex={5}>
                    <PromptSection
                        icon={<GraduationCap className="h-3.5 w-3.5 text-purple-600" />}
                        accentClass="bg-purple-500"
                        title="Student Rules"
                        description="Replaces the STUDENT-SPECIFIC RULES block."
                        placeholder={`STUDENT-SPECIFIC RULES:\n- Tone: Be encouraging, clear, and student-friendly.\n- ...`}
                        value={form.studentRulesOverride ?? ''}
                        onChange={update('studentRulesOverride')}
                        maxLength={FIELD_LIMITS.studentRulesOverride}
                        rows={10}
                        badge="replaces"
                    />
                </FadeInUp>
            </div>

            {/* Internal notes */}
            <FadeInUp staggerIndex={6}>
                <PromptSection
                    icon={<FileText className="h-3.5 w-3.5 text-gray-500" />}
                    accentClass="bg-gray-400"
                    title="Internal Notes"
                    description="Super admin only. Never injected into Lois's prompt — just for your own documentation."
                    placeholder="e.g. Changed teacher rules on 2026-06-10 to remove the secondary school guard. Reverted on..."
                    value={form.internalNotes ?? ''}
                    onChange={update('internalNotes')}
                    maxLength={FIELD_LIMITS.internalNotes}
                    rows={4}
                    badge="not injected"
                />
            </FadeInUp>

            {/* Live preview */}
            <FadeInUp staggerIndex={7}>
                <LivePromptPreview />
            </FadeInUp>

            {/* Action bar */}
            <FadeInUp staggerIndex={8}>
                <div className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-light-card dark:bg-dark-surface border border-light-border dark:border-dark-border">
                    <div>
                        {isDirty ? (
                            <p className="font-medium text-amber-600 dark:text-amber-400" style={{ fontSize: 'var(--text-small)' }}>
                                Unsaved changes
                            </p>
                        ) : hasAnyOverride ? (
                            <p className="font-medium text-[var(--agora-success)]" style={{ fontSize: 'var(--text-small)' }}>
                                Custom overrides active
                            </p>
                        ) : (
                            <p className="text-light-text-muted dark:text-dark-text-muted" style={{ fontSize: 'var(--text-small)' }}>
                                Running on hardcoded defaults
                            </p>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        {hasAnyOverride && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleReset}
                                disabled={isResetting || isSaving}
                                className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 gap-1.5"
                            >
                                {isResetting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
                                Reset all to defaults
                            </Button>
                        )}
                        <Button
                            variant="primary"
                            size="sm"
                            onClick={handleSave}
                            disabled={isSaving || isResetting || !isDirty}
                            className="gap-1.5 min-w-[110px]"
                        >
                            {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                            Save Changes
                        </Button>
                    </div>
                </div>
            </FadeInUp>
        </div>
    );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function LoisAdminPage() {
    const [activeTab, setActiveTab] = useState<ActiveTab>('prompt');

    const TABS: { id: ActiveTab; label: string; icon: React.ReactNode }[] = [
        { id: 'prompt', label: 'System Prompt', icon: <Code2 className="h-4 w-4" /> },
        { id: 'skills', label: 'Skills', icon: <Sparkles className="h-4 w-4" /> },
        { id: 'tools', label: 'Tools', icon: <Wrench className="h-4 w-4" /> },
    ];

    return (
        <ProtectedRoute roles={['SUPER_ADMIN']}>
            <div className="w-full">
                {/* Page header */}
                <FadeInUp from={{ opacity: 0, y: -20 }} to={{ opacity: 1, y: 0 }} className="mb-6">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-[#2490FD]/20 to-purple-500/20 border border-[#2490FD]/20">
                            <BrainCircuit className="h-6 w-6 text-[#2490FD]" />
                        </div>
                        <div>
                            <h1
                                className="font-bold text-light-text-primary dark:text-dark-text-primary"
                                style={{ fontSize: 'var(--text-page-title)', fontFamily: 'var(--font-heading)' }}
                            >
                                Lois AI Studio
                            </h1>
                            <p
                                className="text-light-text-secondary dark:text-dark-text-secondary mt-0.5"
                                style={{ fontSize: 'var(--text-page-subtitle)' }}
                            >
                                Configure the system prompt, craft skills, and inspect tools platform-wide
                            </p>
                        </div>
                    </div>
                </FadeInUp>

                {/* Tab bar — border-b style matching the rest of the dashboard */}
                <div className="border-b border-light-border dark:border-dark-border mb-6">
                    <div className="flex space-x-1">
                        {TABS.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-5 py-3.5 font-bold transition-all whitespace-nowrap border-b-2 ${
                                    activeTab === tab.id
                                        ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                                        : 'border-transparent text-light-text-secondary dark:text-dark-text-secondary hover:text-light-text-primary dark:hover:text-dark-text-primary'
                                }`}
                                style={{ fontSize: 'var(--text-small)' }}
                            >
                                {tab.icon}
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Tab content */}
                {activeTab === 'prompt' && <PromptConfigTab />}
                {activeTab === 'skills' && <SkillsTab />}
                {activeTab === 'tools' && <ToolsTab />}
            </div>
        </ProtectedRoute>
    );
}
