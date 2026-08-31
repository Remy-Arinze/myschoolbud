'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import type { TermEditFocus } from '@/components/settings/termsSessionHelpers';
import { Modal } from '@/components/ui/Modal';
import { DatePicker } from '@/components/ui/DatePicker';
import { Button } from '@/components/ui/Button';
import {
    Loader2,
    Lock,
    AlertTriangle,
    CheckCircle,
} from 'lucide-react';
import {
    useUpdateTermDatesMutation,
    type Term,
    type AcademicSession,
} from '@/lib/store/api/schoolAdminApi';
import toast from 'react-hot-toast';
import { suggestTermMilestoneDates } from '@/lib/academic/termSession';

interface EditTermDatesModalProps {
    isOpen: boolean;
    onClose: () => void;
    term: Term;
    session: AcademicSession;
    schoolId: string;
    termLabel?: string; // "Term" or "Semester"
    /** Scroll to a specific section when the modal opens */
    initialFocus?: TermEditFocus;
}

/**
 * Determines the editability state for the term's start date.
 *
 * Rules:
 * - DRAFT terms: always editable
 * - ACTIVE terms: editable pre-term or within 7 days of the original start date
 * - COMPLETED/ARCHIVED: modal shouldn't even open for these (backend guard)
 */
function getStartDateEditability(
    term: Term,
    termLabel = 'Term',
): {
    editable: boolean;
    message: string;
    variant: 'success' | 'warning' | 'locked';
    daysRemaining?: number;
} {
    const termLabelLower = termLabel.toLowerCase();

    if (term.status === 'DRAFT') {
        return {
            editable: true,
            message: `This ${termLabelLower} hasn't started yet — dates are fully adjustable.`,
            variant: 'success',
        };
    }

    if (term.status === 'ACTIVE') {
        const now = new Date();
        const startDate = new Date(term.startDate);
        const gracePeriodEnd = new Date(startDate);
        gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 7);

        if (now < startDate) {
            return {
                editable: true,
                message: `This ${termLabelLower} hasn't started yet — the start date can still be changed.`,
                variant: 'success',
            };
        }

        if (now <= gracePeriodEnd) {
            const daysLeft = Math.ceil(
                (gracePeriodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
            );
            return {
                editable: true,
                message:
                    daysLeft >= 7
                        ? `The ${termLabelLower} start date can be adjusted for the next 7 days in case you made a mistake during setup.`
                        : `The ${termLabelLower} start date can still be adjusted for ${daysLeft} more ${daysLeft === 1 ? 'day' : 'days'} in case you made a mistake during setup.`,
                variant: 'warning',
                daysRemaining: daysLeft,
            };
        }

        return {
            editable: false,
            message: `The ${termLabelLower} start date is locked after the first week to keep attendance and week numbers accurate.`,
            variant: 'locked',
        };
    }

    return {
        editable: false,
        message: `Completed ${termLabelLower}s cannot be modified.`,
        variant: 'locked',
    };
}

function DateSection({
    title,
    subtitle,
    recommendation,
    children,
    sectionRef,
}: {
    title: string;
    subtitle?: string;
    recommendation?: string;
    children: React.ReactNode;
    sectionRef?: React.RefObject<HTMLDivElement | null>;
}) {
    return (
        <div
            ref={sectionRef}
            className="rounded-xl bg-light-surface dark:bg-dark-bg border border-light-border dark:border-dark-border p-4 overflow-visible scroll-mt-4"
        >
            <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-2 min-w-0 flex-wrap">
                    <span
                        className="font-medium text-light-text-primary dark:text-dark-text-primary"
                        style={{ fontSize: 'var(--text-body)' }}
                    >
                        {title}
                    </span>
                    {subtitle && (
                        <span
                            className="text-light-text-secondary dark:text-dark-text-secondary"
                            style={{ fontSize: 'var(--text-small)' }}
                        >
                            {subtitle}
                        </span>
                    )}
                </div>
                {recommendation && (
                    <span
                        className="text-light-text-muted dark:text-dark-text-muted text-right flex-shrink-0 leading-snug"
                        style={{ fontSize: 'var(--text-tiny)' }}
                    >
                        ({recommendation})
                    </span>
                )}
            </div>
            {children}
        </div>
    );
}

export function EditTermDatesModal({
    isOpen,
    onClose,
    term,
    session,
    schoolId,
    termLabel = 'Term',
    initialFocus = 'dates',
}: EditTermDatesModalProps) {
    const [updateTermDates, { isLoading }] = useUpdateTermDatesMutation();
    const datesSectionRef = useRef<HTMLDivElement>(null);
    const halfTermSectionRef = useRef<HTMLDivElement>(null);
    const midtermSectionRef = useRef<HTMLDivElement>(null);
    const examSectionRef = useRef<HTMLDivElement>(null);

    const [startDate, setStartDate] = useState(term.startDate.split('T')[0]);
    const [endDate, setEndDate] = useState(term.endDate.split('T')[0]);
    const [halfTermStart, setHalfTermStart] = useState(
        term.halfTermStart ? term.halfTermStart.split('T')[0] : ''
    );
    const [halfTermEnd, setHalfTermEnd] = useState(
        term.halfTermEnd ? term.halfTermEnd.split('T')[0] : ''
    );
    const [midtermStart, setMidtermStart] = useState(
        term.midtermStart ? term.midtermStart.split('T')[0] : ''
    );
    const [midtermEnd, setMidtermEnd] = useState(
        term.midtermEnd ? term.midtermEnd.split('T')[0] : ''
    );
    const [examStart, setExamStart] = useState(
        term.examStart ? term.examStart.split('T')[0] : ''
    );
    const [examEnd, setExamEnd] = useState(
        term.examEnd ? term.examEnd.split('T')[0] : ''
    );

    useEffect(() => {
        if (isOpen) {
            setStartDate(term.startDate.split('T')[0]);
            setEndDate(term.endDate.split('T')[0]);
            setHalfTermStart(term.halfTermStart ? term.halfTermStart.split('T')[0] : '');
            setHalfTermEnd(term.halfTermEnd ? term.halfTermEnd.split('T')[0] : '');
            setMidtermStart(term.midtermStart ? term.midtermStart.split('T')[0] : '');
            setMidtermEnd(term.midtermEnd ? term.midtermEnd.split('T')[0] : '');
            setExamStart(term.examStart ? term.examStart.split('T')[0] : '');
            setExamEnd(term.examEnd ? term.examEnd.split('T')[0] : '');
        }
    }, [isOpen, term]);

    useEffect(() => {
        if (!isOpen) return;
        const target =
            initialFocus === 'halfTerm'
                ? halfTermSectionRef
                : initialFocus === 'midterm'
                  ? midtermSectionRef
                  : initialFocus === 'exam'
                    ? examSectionRef
                    : datesSectionRef;
        const timer = window.setTimeout(() => {
            target.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 150);
        return () => window.clearTimeout(timer);
    }, [isOpen, initialFocus, term.id]);

    const startDateEditability = useMemo(
        () => getStartDateEditability(term, termLabel),
        [term, termLabel],
    );

    const sessionStartDate = session.startDate.split('T')[0];
    const sessionEndDate = session.endDate.split('T')[0];

    const milestoneSuggestions = useMemo(
        () => suggestTermMilestoneDates(startDate, endDate),
        [startDate, endDate],
    );

    const validationError = useMemo(() => {
        if (!startDate || !endDate) return 'Both start and end dates are required.';
        const s = new Date(startDate);
        const e = new Date(endDate);
        if (s >= e) return 'Start date must be before end date.';

        const sessionStart = new Date(sessionStartDate);
        const sessionEnd = new Date(sessionEndDate);
        if (s < sessionStart) return `Start date cannot be before session start (${sessionStartDate}).`;
        if (e > sessionEnd) return `End date cannot be after session end (${sessionEndDate}).`;

        if (halfTermStart && halfTermEnd) {
            const hts = new Date(halfTermStart);
            const hte = new Date(halfTermEnd);
            if (hts >= hte) return 'Half-term start must be before half-term end.';
            if (hts < s) return 'Half-term break cannot start before the term starts.';
            if (hte > e) return 'Half-term break cannot end after the term ends.';
        } else if ((halfTermStart && !halfTermEnd) || (!halfTermStart && halfTermEnd)) {
            return 'Both half-term start and end dates are required, or leave both empty.';
        }

        if (midtermStart && midtermEnd) {
            const ms = new Date(midtermStart);
            const me = new Date(midtermEnd);
            if (ms >= me) return 'Midterm start must be before midterm end.';
            if (ms < s || me > e) return 'Midterm tests must fall within the term.';
        } else if ((midtermStart && !midtermEnd) || (!midtermStart && midtermEnd)) {
            return 'Both midterm test start and end dates are required, or leave both empty.';
        }

        if (examStart && examEnd) {
            const es = new Date(examStart);
            const ee = new Date(examEnd);
            if (es >= ee) return 'Exam start must be before exam end.';
            if (es < s || ee > e) return 'Exam dates must fall within the term.';
        } else if ((examStart && !examEnd) || (!examStart && examEnd)) {
            return 'Both exam start and end dates are required, or leave both empty.';
        }

        return null;
    }, [
        startDate,
        endDate,
        halfTermStart,
        halfTermEnd,
        midtermStart,
        midtermEnd,
        examStart,
        examEnd,
        sessionStartDate,
        sessionEndDate,
    ]);

    const hasChanges = useMemo(() => {
        const origStart = term.startDate.split('T')[0];
        const origEnd = term.endDate.split('T')[0];
        const origHalfStart = term.halfTermStart ? term.halfTermStart.split('T')[0] : '';
        const origHalfEnd = term.halfTermEnd ? term.halfTermEnd.split('T')[0] : '';
        const origMidStart = term.midtermStart ? term.midtermStart.split('T')[0] : '';
        const origMidEnd = term.midtermEnd ? term.midtermEnd.split('T')[0] : '';
        const origExamStart = term.examStart ? term.examStart.split('T')[0] : '';
        const origExamEnd = term.examEnd ? term.examEnd.split('T')[0] : '';

        return (
            startDate !== origStart ||
            endDate !== origEnd ||
            halfTermStart !== origHalfStart ||
            halfTermEnd !== origHalfEnd ||
            midtermStart !== origMidStart ||
            midtermEnd !== origMidEnd ||
            examStart !== origExamStart ||
            examEnd !== origExamEnd
        );
    }, [startDate, endDate, halfTermStart, halfTermEnd, midtermStart, midtermEnd, examStart, examEnd, term]);

    const canSubmit = !validationError && hasChanges && !isLoading;

    const handleSave = async () => {
        if (!canSubmit) return;

        const payload: Record<string, string | undefined> = {};
        const origStart = term.startDate.split('T')[0];
        const origEnd = term.endDate.split('T')[0];
        const origHalfStart = term.halfTermStart ? term.halfTermStart.split('T')[0] : '';
        const origHalfEnd = term.halfTermEnd ? term.halfTermEnd.split('T')[0] : '';
        const origMidStart = term.midtermStart ? term.midtermStart.split('T')[0] : '';
        const origMidEnd = term.midtermEnd ? term.midtermEnd.split('T')[0] : '';
        const origExamStart = term.examStart ? term.examStart.split('T')[0] : '';
        const origExamEnd = term.examEnd ? term.examEnd.split('T')[0] : '';

        if (startDate !== origStart) payload.startDate = startDate;
        if (endDate !== origEnd) payload.endDate = endDate;
        if (halfTermStart !== origHalfStart) payload.halfTermStart = halfTermStart || undefined;
        if (halfTermEnd !== origHalfEnd) payload.halfTermEnd = halfTermEnd || undefined;
        if (midtermStart !== origMidStart) payload.midtermStart = midtermStart || undefined;
        if (midtermEnd !== origMidEnd) payload.midtermEnd = midtermEnd || undefined;
        if (examStart !== origExamStart) payload.examStart = examStart || undefined;
        if (examEnd !== origExamEnd) payload.examEnd = examEnd || undefined;

        try {
            await updateTermDates({
                schoolId,
                sessionId: session.id,
                termId: term.id,
                data: payload,
            }).unwrap();
            toast.success(`${termLabel} dates updated successfully.`);
            onClose();
        } catch (error: any) {
            toast.error(error?.data?.message || `Failed to update ${termLabel.toLowerCase()} dates.`);
        }
    };

    const StatusIcon =
        startDateEditability.variant === 'success'
            ? CheckCircle
            : startDateEditability.variant === 'warning'
                ? AlertTriangle
                : Lock;

    const statusColorClass =
        startDateEditability.variant === 'success'
            ? 'text-green-700 dark:text-green-400'
            : startDateEditability.variant === 'warning'
                ? 'text-amber-700 dark:text-amber-400'
                : 'text-light-text-secondary dark:text-dark-text-secondary';

    const statusBgClass =
        startDateEditability.variant === 'success'
            ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
            : startDateEditability.variant === 'warning'
                ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
                : 'bg-light-surface dark:bg-dark-bg border-light-border dark:border-dark-border';

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`Adjust ${term.name} Dates`}
            size="lg"
            contentClassName="space-y-5"
            footer={
                <div className="flex items-center justify-end gap-3">
                    <Button variant="ghost" onClick={onClose} disabled={isLoading} className="rounded-xl">
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={!canSubmit}
                        className="rounded-xl px-6"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            'Save Changes'
                        )}
                    </Button>
                </div>
            }
        >
            <p
                className="text-light-text-secondary dark:text-dark-text-secondary -mt-2"
                style={{ fontSize: 'var(--text-body)' }}
            >
                {session.name}
                <span className="mx-1.5 text-light-border dark:text-dark-border">·</span>
                <span
                    className="inline-flex items-center rounded-full bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 font-medium text-blue-700 dark:text-blue-300"
                    style={{ fontSize: 'var(--text-small)' }}
                >
                    {term.status}
                </span>
            </p>

            <div className={`flex items-start gap-2 p-2.5 rounded-lg border ${statusBgClass}`}>
                <StatusIcon className={`h-3.5 w-3.5 mt-0.5 flex-shrink-0 ${statusColorClass}`} />
                <p
                    className={`leading-relaxed ${statusColorClass}`}
                    style={{ fontSize: 'var(--text-small)' }}
                >
                    {startDateEditability.message}
                </p>
            </div>

            <div
                ref={datesSectionRef}
                className="grid grid-cols-1 sm:grid-cols-2 gap-4 overflow-visible scroll-mt-4"
            >
                <div className="overflow-visible">
                    <div className="flex items-center gap-2 mb-1.5">
                        <label
                            className="font-medium text-light-text-primary dark:text-dark-text-primary"
                            style={{ fontSize: 'var(--text-body)' }}
                        >
                            Start Date
                        </label>
                        {!startDateEditability.editable && (
                            <Lock className="h-3.5 w-3.5 text-light-text-secondary dark:text-dark-text-secondary" />
                        )}
                    </div>
                    <DatePicker
                        value={startDate}
                        onChange={setStartDate}
                        disabled={!startDateEditability.editable}
                        min={sessionStartDate}
                        max={endDate || sessionEndDate}
                        placeholder="Select start date"
                    />
                </div>

                <div className="overflow-visible">
                    <label
                        className="font-medium text-light-text-primary dark:text-dark-text-primary block mb-1.5"
                        style={{ fontSize: 'var(--text-body)' }}
                    >
                        End Date
                    </label>
                    <DatePicker
                        value={endDate}
                        onChange={setEndDate}
                        min={startDate || sessionStartDate}
                        max={sessionEndDate}
                        placeholder="Select end date"
                    />
                    <p
                        className="text-light-text-secondary dark:text-dark-text-secondary mt-1.5"
                        style={{ fontSize: 'var(--text-small)' }}
                    >
                        Must be within session bounds (ends{' '}
                        {new Date(sessionEndDate).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                        })}
                        )
                    </p>
                </div>
            </div>

            <DateSection
                title="Half-Term Break"
                subtitle="(Non-teaching days)"
                sectionRef={halfTermSectionRef}
                recommendation={
                    milestoneSuggestions.halfTerm
                        ? `suggested: ${milestoneSuggestions.halfTerm.display}`
                        : undefined
                }
            >
                <div className="grid grid-cols-2 gap-3 overflow-visible">
                    <DatePicker
                        value={halfTermStart}
                        onChange={setHalfTermStart}
                        min={startDate || sessionStartDate}
                        max={halfTermEnd || endDate || sessionEndDate}
                        placeholder="Break starts"
                    />
                    <DatePicker
                        value={halfTermEnd}
                        onChange={setHalfTermEnd}
                        min={halfTermStart || startDate || sessionStartDate}
                        max={endDate || sessionEndDate}
                        placeholder="Break ends"
                    />
                </div>
                {(halfTermStart || halfTermEnd) && (
                    <button
                        type="button"
                        onClick={() => {
                            setHalfTermStart('');
                            setHalfTermEnd('');
                        }}
                        className="text-xs text-red-600 dark:text-red-400 hover:underline mt-2"
                    >
                        Clear half-term dates
                    </button>
                )}
            </DateSection>

            <DateSection
                title="Midterm Tests"
                subtitle="(Assessment window)"
                sectionRef={midtermSectionRef}
                recommendation={
                    milestoneSuggestions.midtermTests
                        ? `suggested: ${milestoneSuggestions.midtermTests.display}`
                        : undefined
                }
            >
                <div className="grid grid-cols-2 gap-3 overflow-visible">
                    <DatePicker
                        value={midtermStart}
                        onChange={setMidtermStart}
                        min={startDate || sessionStartDate}
                        max={midtermEnd || endDate || sessionEndDate}
                        placeholder="Tests start"
                    />
                    <DatePicker
                        value={midtermEnd}
                        onChange={setMidtermEnd}
                        min={midtermStart || startDate || sessionStartDate}
                        max={endDate || sessionEndDate}
                        placeholder="Tests end"
                    />
                </div>
                {(midtermStart || midtermEnd) && (
                    <button
                        type="button"
                        onClick={() => {
                            setMidtermStart('');
                            setMidtermEnd('');
                        }}
                        className="text-xs text-red-600 dark:text-red-400 hover:underline mt-2"
                    >
                        Clear midterm tests
                    </button>
                )}
            </DateSection>

            <DateSection
                title="Exam Dates"
                subtitle={`(End-of-${termLabel.toLowerCase()} exams)`}
                sectionRef={examSectionRef}
                recommendation={
                    milestoneSuggestions.exams
                        ? `suggested: ${milestoneSuggestions.exams.display}`
                        : undefined
                }
            >
                <div className="grid grid-cols-2 gap-3 overflow-visible">
                    <DatePicker
                        value={examStart}
                        onChange={setExamStart}
                        min={startDate || sessionStartDate}
                        max={examEnd || endDate || sessionEndDate}
                        placeholder="Exams start"
                    />
                    <DatePicker
                        value={examEnd}
                        onChange={setExamEnd}
                        min={examStart || startDate || sessionStartDate}
                        max={endDate || sessionEndDate}
                        placeholder="Exams end"
                    />
                </div>
                {(examStart || examEnd) && (
                    <button
                        type="button"
                        onClick={() => {
                            setExamStart('');
                            setExamEnd('');
                        }}
                        className="text-xs text-red-600 dark:text-red-400 hover:underline mt-2"
                    >
                        Clear exam dates
                    </button>
                )}
            </DateSection>

            {validationError && hasChanges && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                    <AlertTriangle className="h-4 w-4 mt-0.5 text-red-500 flex-shrink-0" />
                    <p className="text-sm text-red-600 dark:text-red-400">{validationError}</p>
                </div>
            )}
        </Modal>
    );
}
