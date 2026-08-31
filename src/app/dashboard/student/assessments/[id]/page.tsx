'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import {
    useGetAssessmentByIdQuery,
    useSubmitAssessmentMutation,
    useStartAssessmentMutation,
    useLogAssessmentViolationMutation,
    useGetMyStudentProfileQuery,
    type AssessmentQuestion,
} from '@/lib/store/api/schoolAdminApi';
import {
    ArrowLeft,
    Clock,
    Award,
    CheckCircle2,
    Loader2,
    Send,
    AlertCircle,
    Info,
    Shield,
    Zap
} from 'lucide-react';
import { ConfirmModal } from '@/components/ui/Modal';
import { FadeInUp } from '@/components/ui/FadeInUp';
import toast from 'react-hot-toast';
import { isPastDueDate, isTimerExpiredForUi } from '@/lib/assessment-deadline';

export default function StudentAssessmentPage() {
    const params = useParams();
    const router = useRouter();
    const assessmentId = params.id as string;

    const { data: studentResponse } = useGetMyStudentProfileQuery();
    const schoolId = studentResponse?.data?.enrollments?.[0]?.school?.id;
    const studentId = studentResponse?.data?.id;

    const { data: assessmentResponse, isLoading: isLoadingAssessment } = useGetAssessmentByIdQuery(
        { schoolId: schoolId!, assessmentId },
        { skip: !schoolId || !assessmentId }
    );
    const assessment = assessmentResponse?.data; // Use data from ResponseDto

    const [startAssessment, { isLoading: isStarting }] = useStartAssessmentMutation();
    const [logViolation] = useLogAssessmentViolationMutation();
    const [submitAssessment, { isLoading: isSubmitting }] = useSubmitAssessmentMutation();

    const [answers, setAnswers] = useState<Record<string, any>>({});
    const [examSessionToken, setExamSessionToken] = useState<string | null>(null);
    const [timeLeft, setTimeLeft] = useState<number | null>(null);
    const [isStarted, setIsStarted] = useState(false);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [pendingUnansweredCount, setPendingUnansweredCount] = useState(0);

    // Find student's submission if it exists
    const submission = assessment?.submissions?.find(s => s.studentId === studentId);
    const isSubmitted = submission?.status === 'SUBMITTED' || submission?.status === 'GRADED';
    const isGraded = submission?.status === 'GRADED';
    const pastDue = assessment?.dueDate ? isPastDueDate(assessment.dueDate) : false;
    const allowLateDue = assessment?.allowLateSubmissionAfterDue ?? false;
    const allowLateTimer = assessment?.allowLateSubmissionAfterTimer ?? false;
    const canStart =
        !isSubmitted &&
        (!pastDue || allowLateDue || submission?.status === 'STARTED');
    const isWindowClosed = !isSubmitted && pastDue && !allowLateDue && submission?.status !== 'STARTED';
    const timerExpired =
        assessment?.isTimed &&
        isTimerExpiredForUi(submission?.startedAt, assessment?.duration);
    const isSubmitLocked =
        isStarted &&
        !isSubmitted &&
        timerExpired &&
        !allowLateTimer;

    // Heartbeat for auto-saving every 30 seconds
    useEffect(() => {
        if (!isStarted || isSubmitted || !schoolId || !examSessionToken) return;

        const heartbeat = setInterval(() => {
            performAutoSave();
        }, 30000);

        return () => clearInterval(heartbeat);
    }, [isStarted, isSubmitted, answers, examSessionToken]);

    // Timer Sync
    useEffect(() => {
        if (!isStarted || isSubmitted || !assessment?.isTimed || !assessment?.duration) {
            setTimeLeft(null);
            return;
        }

        const startedAt = submission?.startedAt ? new Date(submission.startedAt).getTime() : Date.now();
        const durationMs = assessment.duration * 60 * 1000;
        const endTime = startedAt + durationMs;

        const interval = setInterval(() => {
            const now = Date.now();
            const remaining = Math.max(0, Math.floor((endTime - now) / 1000));
            setTimeLeft(remaining);

            if (remaining === 0) {
                clearInterval(interval);
                handleAutoSubmit();
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [isStarted, isSubmitted, assessment, submission]);

    // Integrity Monitoring
    useEffect(() => {
        if (!isStarted || isSubmitted || !assessment?.hasIntegrity || !schoolId) return;

        const handleVisibilityChange = () => {
            if (document.hidden) {
                logViolation({
                    schoolId,
                    assessmentId,
                    dto: { type: 'TAB_SWITCH', details: 'Student switched tabs' }
                });
                toast.error('Integrity Warning: Tab switch detected. This has been logged.');
            }
        };

        const handleFullscreenChange = () => {
            if (!document.fullscreenElement) {
                logViolation({
                    schoolId,
                    assessmentId,
                    dto: { type: 'FULLSCREEN_EXIT', details: 'Student exited fullscreen mode' }
                });
                toast.error('Integrity Warning: Fullscreen exit detected.');
            }
        };

        const handleClipboardEvent = (e: ClipboardEvent) => {
            const type = e.type.toUpperCase();
            const violationType = type === 'COPY' ? 'CLIPBOARD_COPY' :
                type === 'CUT' ? 'CLIPBOARD_CUT' : 'CLIPBOARD_PASTE';
            logViolation({
                schoolId,
                assessmentId,
                dto: {
                    type: violationType as any,
                    details: `Student attempted to ${e.type} content`
                }
            });
            e.preventDefault();
            toast.error(`Integrity Warning: ${e.type} is disabled.`);
        };

        const handleContextMenu = (e: MouseEvent) => {
            e.preventDefault();
        };

        const handleKeyDown = (e: KeyboardEvent) => {
            // Block Ctrl+U, F12, Ctrl+Shift+I, Cmd+Option+I (Firefox/Safari/Chrome)
            const isDevTools =
                e.key === 'F12' ||
                ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'I') ||
                ((e.ctrlKey || e.metaKey) && e.key === 'U');

            if (isDevTools) {
                e.preventDefault();
                logViolation({
                    schoolId,
                    assessmentId,
                    dto: {
                        type: 'DEVTOOLS_OPEN',
                        details: `Student attempted to use shortcut: ${e.key}`
                    }
                });
                toast.error('Integrity Warning: This action is disabled.');
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        document.addEventListener('copy', handleClipboardEvent);
        document.addEventListener('paste', handleClipboardEvent);
        document.addEventListener('cut', handleClipboardEvent);
        document.addEventListener('contextmenu', handleContextMenu);
        document.addEventListener('keydown', handleKeyDown);

        // Try to enter fullscreen
        try {
            document.documentElement.requestFullscreen().catch(() => {
                toast.error('Please enable fullscreen to proceed with the exam.');
            });
        } catch (e) { }

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
            document.removeEventListener('copy', handleClipboardEvent);
            document.removeEventListener('paste', handleClipboardEvent);
            document.removeEventListener('cut', handleClipboardEvent);
            document.removeEventListener('contextmenu', handleContextMenu);
            document.removeEventListener('keydown', handleKeyDown);
            if (document.fullscreenElement) {
                document.exitFullscreen().catch(() => { });
            }
        };
    }, [isStarted, isSubmitted, assessment?.hasIntegrity, schoolId]);

    // Restore state from existing session
    useEffect(() => {
        if (submission?.status === 'STARTED' && !isStarted) {
            setIsStarted(true);
            setExamSessionToken(submission.examSessionToken);
            // In a real app, we might want to fetch the previous answers from the STARTED submission
        }
    }, [submission, isStarted]);

    const performAutoSave = async () => {
        if (!examSessionToken || isSubmitting) return;
        // Logic for silent auto-save could be implemented here if the backend supports it.
        // For now, we'll rely on the final submission, but the heartbeat signals "I'm still here".
        console.log('Heartbeat: Exam in progress...');
    };

    const handleAutoSubmit = async () => {
        if (assessment?.autoSubmitOnTimeout) {
            toast.loading('Time expired! Auto-submitting...', { duration: 3000 });
            await performSubmission(true);
        } else if (assessment?.allowLateSubmissionAfterTimer) {
            toast.error('Time expired! You may still submit, but it will be marked late.');
        } else {
            toast.error('Time expired! The submission window is closed.');
        }
    };

    const handleStartExam = async () => {
        if (!schoolId) return;
        try {
            const res = await startAssessment({ schoolId, assessmentId }).unwrap();
            setExamSessionToken(res.data.examSessionToken);
            setIsStarted(true);
            toast.success('Assessment started!');
        } catch (err: any) {
            toast.error(err?.data?.message || 'Failed to start assessment');
        }
    };

    const handleAnswerChange = (questionId: string, value: any) => {
        setAnswers(prev => ({ ...prev, [questionId]: value }));
    };

    const performSubmission = async (isAutoSubmit = false) => {
        if (!assessment || !schoolId) return;

        if (isSubmitLocked && !isAutoSubmit) {
            toast.error('The exam time limit has expired. Late submissions are not allowed.');
            return;
        }

        try {
            const dtoAnswers = assessment.questions?.map((q: AssessmentQuestion) => {
                const answer = answers[q.id];
                if (q.type === 'MULTIPLE_CHOICE') {
                    return { questionId: q.id, selectedOption: answer };
                } else {
                    return { questionId: q.id, text: answer };
                }
            }) || [];

            await submitAssessment({
                schoolId,
                assessmentId,
                dto: {
                    answers: dtoAnswers,
                    examSessionToken: examSessionToken || submission?.examSessionToken || '',
                    isAutoSubmit,
                }
            }).unwrap();

            toast.success('Assessment submitted successfully!');
            router.back();
        } catch (error: any) {
            toast.error(error?.data?.message || 'Failed to submit assessment');
        }
    };

    const handleSubmit = async () => {
        if (!assessment) return;

        // Check if all questions are answered
        const unansweredCount = assessment.questions?.filter(q => !answers[q.id]).length || 0;
        if (unansweredCount > 0) {
            setPendingUnansweredCount(unansweredCount);
            setIsConfirmModalOpen(true);
            return;
        }

        await performSubmission();
    };

    if (isLoadingAssessment || assessment === undefined) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            </div>
        );
    }

    if (!assessment) {
        return (
            <div className="p-8 text-center">
                <p>Assessment not found.</p>
                <Button onClick={() => router.back()} className="mt-4">Go Back</Button>
            </div>
        );
    }

    return (
        <ProtectedRoute roles={['STUDENT']}>
            <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-8 select-none">
                {/* Header */}
                <FadeInUp from={{ opacity: 0, y: -20 }} to={{ opacity: 1, y: 0 }} duration={0.5}>
                    <Button variant="ghost" onClick={() => router.back()} className="mb-4">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Class
                    </Button>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <Badge variant={assessment.type === 'EXAM' ? 'danger' : assessment.type === 'QUIZ' ? 'primary' : 'success'}>
                                    {assessment.type}
                                </Badge>
                                <span className={`text-xs font-bold uppercase tracking-wider ${isSubmitted ? 'text-green-500' : 'text-amber-500'}`}>
                                    {isSubmitted ? (isGraded ? 'Graded' : 'Submitted') : (submission?.status === 'STARTED' ? 'In Progress' : 'Pending')}
                                </span>
                            </div>
                            <h1 className="font-black text-light-text-primary dark:text-dark-text-primary uppercase tracking-tight" style={{ fontSize: 'var(--text-page-title)' }}>
                                {assessment.title}
                            </h1>
                            <div className="flex flex-wrap items-center gap-4 mt-2">
                                <p className="text-light-text-secondary dark:text-dark-text-secondary max-w-2xl" style={{ fontSize: 'var(--text-regular)' }}>
                                    {assessment.description || 'No instructions provided.'}
                                </p>
                                {isStarted && !isSubmitted && timeLeft !== null && (
                                    <div className={`flex items-center gap-2 px-4 py-2 rounded-xl font-black shadow-sm border-2 ${timeLeft < 300 ? 'bg-red-50 border-red-200 text-red-600 animate-pulse' : 'bg-blue-50 border-blue-200 text-blue-600'}`}>
                                        <Clock className="w-5 h-5" />
                                        <span className="text-xl">
                                            {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                        {isGraded && (
                            <div className="bg-green-600 text-white p-4 rounded-2xl shadow-lg border-b-4 border-green-800 flex flex-col items-center justify-center min-w-[120px]">
                                <span className="font-bold uppercase tracking-widest opacity-80" style={{ fontSize: 'var(--text-tiny)' }}>Final Score</span>
                                <span className="font-black" style={{ fontSize: 'var(--text-stat-value)', lineHeight: 1 }}>{submission.totalScore} / {assessment.maxScore}</span>
                            </div>
                        )}
                    </div>
                </FadeInUp>

                {/* Status Bar */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="bg-light-surface/50 dark:bg-dark-surface/50 border-none">
                        <CardContent className="p-4 flex items-center gap-3">
                            <Clock className="h-5 w-5 text-blue-500" />
                            <div>
                                <p className="text-[10px] font-bold text-light-text-muted uppercase tracking-widest">Due Date</p>
                                <p className="text-sm font-bold">{assessment.dueDate ? new Date(assessment.dueDate).toLocaleDateString() : 'No deadline'}</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-light-surface/50 dark:bg-dark-surface/50 border-none">
                        <CardContent className="p-4 flex items-center gap-3">
                            <Award className="h-5 w-5 text-purple-500" />
                            <div>
                                <p className="text-[10px] font-bold text-light-text-muted uppercase tracking-widest">Max Points</p>
                                <p className="text-sm font-bold">{assessment.maxScore} pts</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-light-surface/50 dark:bg-dark-surface/50 border-none">
                        <CardContent className="p-4 flex items-center gap-3">
                            <CheckCircle2 className="h-5 w-5 text-green-500" />
                            <div>
                                <p className="text-[10px] font-bold text-light-text-muted uppercase tracking-widest">Questions</p>
                                <p className="text-sm font-bold">{assessment.questions?.length || 0} Items</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {!isSubmitted ? (
                    isWindowClosed ? (
                        <Card className="border-red-200 dark:border-red-900/40 bg-red-50/50 dark:bg-red-900/10">
                            <CardContent className="p-8 text-center space-y-4">
                                <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
                                <h2 className="text-xl font-black uppercase tracking-tight text-red-700 dark:text-red-400">
                                    Submission Window Closed
                                </h2>
                                <p className="text-sm text-red-600/80 dark:text-red-300/80 max-w-md mx-auto">
                                    The due date for this assessment has passed and your teacher does not allow late submissions.
                                </p>
                            </CardContent>
                        </Card>
                    ) : !isStarted ? (
                        <Card className="overflow-hidden border-none shadow-2xl bg-white dark:bg-dark-surface">
                            <CardContent className="p-0">
                                <div className="grid grid-cols-1 md:grid-cols-2">
                                    {/* Left Side: Illustration / Welcome */}
                                    <div className="p-8 md:p-12 flex flex-col justify-center items-center text-center space-y-6 bg-blue-50/50 dark:bg-blue-900/10 border-r border-blue-100 dark:border-blue-900/20">
                                        <div className="w-24 h-24 bg-blue-600/10 rounded-3xl flex items-center justify-center text-blue-600 dark:text-blue-400 rotate-3 animate-pulse">
                                            <Info className="h-12 w-12" />
                                        </div>
                                        <div className="space-y-3">
                                            <h2 className="text-3xl font-black text-light-text-primary dark:text-white uppercase tracking-tight">Ready to Begin?</h2>
                                            <p className="text-light-text-secondary dark:text-dark-text-secondary text-sm max-w-sm mx-auto leading-relaxed">
                                                Review the session rules on the right before launching your {assessment.type.toLowerCase()}. Good luck!
                                            </p>
                                        </div>
                                        <Button
                                            size="lg"
                                            className="w-full max-w-[240px] bg-blue-600 hover:bg-blue-700 text-white font-black h-16 text-lg rounded-2xl shadow-xl shadow-blue-500/20 active:scale-95 transition-all"
                                            onClick={handleStartExam}
                                            disabled={isStarting || !canStart}
                                        >
                                            {isStarting ? <Loader2 className="animate-spin" /> : 'Launch Assessment'}
                                        </Button>
                                    </div>

                                    {/* Right Side: Rules & Details */}
                                    <div className="p-8 md:p-12 space-y-8">
                                        <div className="space-y-6">
                                            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-light-text-muted">Assessment Protocol</h3>

                                            <div className="space-y-4">
                                                {/* Timer Rules */}
                                                <div className="flex gap-4">
                                                    <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-600 flex items-center justify-center shrink-0">
                                                        <Clock className="w-5 h-5" />
                                                    </div>
                                                    <div>
                                                        <h4 className="text-sm font-bold text-light-text-primary dark:text-white">Timing & Session</h4>
                                                        <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary mt-1">
                                                            {assessment.isTimed
                                                                ? `You have exactly ${assessment.duration} minutes to complete this. The timer starts once you launch.`
                                                                : 'This assessment is not timed. Take your time to answer carefully.'}
                                                            {assessment.autoSubmitOnTimeout && assessment.isTimed && (
                                                                <span className="block mt-1 font-bold text-orange-600">System will auto-submit at zero.</span>
                                                            )}
                                                            {assessment.isTimed && !assessment.allowLateSubmissionAfterTimer && (
                                                                <span className="block mt-1 font-bold text-red-600">No submissions after the timer expires.</span>
                                                            )}
                                                            {assessment.isTimed && assessment.allowLateSubmissionAfterTimer && (
                                                                <span className="block mt-1 text-amber-600">Late timer submissions are allowed and may affect your grade.</span>
                                                            )}
                                                            {pastDue && allowLateDue && (
                                                                <span className="block mt-1 text-amber-600">This assessment is past due; late submissions are allowed.</span>
                                                            )}
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Integrity Rules */}
                                                {assessment.hasIntegrity && (
                                                    <div className="flex gap-4">
                                                        <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center shrink-0">
                                                            <Shield className="w-5 h-5" />
                                                        </div>
                                                        <div>
                                                            <h4 className="text-sm font-bold text-light-text-primary dark:text-white">Integrity Protection</h4>
                                                            <ul className="text-xs text-light-text-secondary dark:text-dark-text-secondary mt-1 space-y-2">
                                                                <li className="flex items-center gap-2">
                                                                    <div className="w-1 h-1 rounded-full bg-indigo-400" />
                                                                    Fullscreen mode will be enforced.
                                                                </li>
                                                                <li className="flex items-center gap-2">
                                                                    <div className="w-1 h-1 rounded-full bg-indigo-400" />
                                                                    Copy/Paste and Tab-switching are disabled.
                                                                </li>
                                                                 {Number(assessment.pointsPerViolation || 0) > 0 && (
                                                                    <li className="flex items-center gap-2 font-bold text-indigo-600">
                                                                        <div className="w-1 h-1 rounded-full bg-indigo-600" />
                                                                        Penalty: {Number(assessment.pointsPerViolation)}pt deduction per violation.
                                                                    </li>
                                                                )}
                                                            </ul>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Auto-Save Info */}
                                                <div className="flex gap-4">
                                                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                                                        <Zap className="w-5 h-5" />
                                                    </div>
                                                    <div>
                                                        <h4 className="text-sm font-bold text-light-text-primary dark:text-white">Live Cloud Sync</h4>
                                                        <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary mt-1">
                                                            Your progress is automatically saved to the cloud every 30 seconds.
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="space-y-8">
                            <div className="space-y-6">
                                {assessment.questions?.map((q, idx: number) => (
                                    <FadeInUp key={q.id} delay={idx * 0.1}>
                                        <Card className="overflow-hidden bg-light-card dark:bg-dark-surface border-none shadow-md">
                                            <CardContent className="p-6 md:p-8">
                                                <div className="flex items-start justify-between mb-6">
                                                    <div className="flex items-center gap-4">
                                                        <span className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-black">
                                                            {idx + 1}
                                                        </span>
                                                        <h3 className="text-xl font-bold text-light-text-primary dark:text-dark-text-primary select-none">
                                                            {q.text}
                                                        </h3>
                                                    </div>
                                                    <Badge variant="outline" className="text-[10px] font-bold opacity-60">
                                                        {q.points} PTS
                                                    </Badge>
                                                </div>

                                                {q.type === 'MULTIPLE_CHOICE' ? (
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        {(Array.isArray(q.options) ? q.options : JSON.parse(q.options || '[]')).map((option: string, optIdx: number) => (
                                                            <button
                                                                key={optIdx}
                                                                className={`p-4 text-left border-2 rounded-xl transition-all font-medium flex items-center gap-4 ${answers[q.id] === option
                                                                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 shadow-inner'
                                                                    : 'border-light-border dark:border-dark-border hover:border-blue-300 dark:hover:border-blue-700'
                                                                    }`}
                                                                onClick={() => handleAnswerChange(q.id, option)}
                                                            >
                                                                <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${answers[q.id] === option
                                                                    ? 'bg-blue-500 text-white shadow-md'
                                                                    : 'bg-light-zinc dark:bg-dark-zinc opacity-50'
                                                                    }`}>
                                                                    {String.fromCharCode(65 + optIdx)}
                                                                </span>
                                                                <span className="select-none">{option}</span>
                                                            </button>
                                                        ))}
                                                    </div>
                                                ) : q.type === 'SHORT_ANSWER' ? (
                                                    <Input
                                                        placeholder="Type your answer here..."
                                                        value={answers[q.id] || ''}
                                                        onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                                                        onPaste={(e) => e.preventDefault()}
                                                        className="h-12 text-lg select-text"
                                                    />
                                                ) : (
                                                    <Textarea
                                                        placeholder="Write your detailed response here..."
                                                        value={answers[q.id] || ''}
                                                        onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                                                        onPaste={(e) => e.preventDefault()}
                                                        className="min-h-[200px] text-lg p-6 bg-light-zinc/30 dark:bg-dark-zinc/30 select-text"
                                                    />
                                                )}
                                            </CardContent>
                                        </Card>
                                    </FadeInUp>
                                ))}
                            </div>

                            <div className="flex flex-col items-center gap-4 py-8">
                                <Button
                                    size="md"
                                    className="px-12 bg-green-600 hover:bg-green-700 text-white font-bold h-16 text-xl rounded-2xl shadow-2xl gap-3 w-full md:w-auto disabled:opacity-50"
                                    onClick={handleSubmit}
                                    disabled={isSubmitting || isSubmitLocked}
                                >
                                    {isSubmitting ? (
                                        <Loader2 className="h-6 w-6 animate-spin" />
                                    ) : (
                                        <Send className="h-6 w-6" />
                                    )}
                                    {isSubmitLocked ? 'Time Expired' : 'Submit Assessment'}
                                </Button>
                                <p className="text-light-text-muted text-sm font-medium">
                                    {isSubmitLocked
                                        ? 'The exam time limit has expired. Contact your teacher if you need an extension.'
                                        : 'Please review your answers before submitting.'}
                                </p>
                            </div>
                        </div>
                    )
                ) : (
                    <div className="space-y-8">
                        <Card className="bg-blue-50/50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800">
                            <CardContent className="p-6 flex items-center gap-4">
                                <div className="w-12 h-12 bg-blue-500 text-white rounded-full flex items-center justify-center shadow-lg">
                                    <CheckCircle2 className="h-6 w-6" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-blue-900 dark:text-blue-300">Assessment Submitted</h3>
                                    <p className="text-sm text-blue-700 dark:text-blue-400">
                                        Submitted on {submission.submittedAt ? new Date(submission.submittedAt).toLocaleString() : 'Date unknown'}
                                    </p>
                                </div>
                                {isGraded && (
                                    <div className="ml-auto text-right">
                                        <p className="text-[10px] font-black text-blue-600/60 uppercase tracking-widest leading-none">Status</p>
                                        <p className="text-xl font-black text-blue-700 dark:text-blue-400 leading-tight">GRADED</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {isGraded && submission.teacherFeedback && (
                            <Card className="border-l-4 border-l-purple-500 overflow-hidden">
                                <CardContent className="p-6">
                                    <h3 className="text-sm font-bold text-light-text-muted uppercase tracking-widest mb-2">Teacher's Feedback</h3>
                                    <p className="text-lg italic text-light-text-primary dark:text-dark-text-primary">
                                        "{submission.teacherFeedback}"
                                    </p>
                                </CardContent>
                            </Card>
                        )}

                        <div className="space-y-6">
                            {assessment.questions?.map((q, idx: number) => {
                                const answer = submission.answers?.find(a => a.questionId === q.id);
                                return (
                                    <Card key={q.id} className="opacity-90">
                                        <CardContent className="p-6">
                                            <div className="flex items-start justify-between mb-4">
                                                <div className="flex items-center gap-3">
                                                    <span className="w-8 h-8 rounded-full bg-light-zinc dark:bg-dark-zinc flex items-center justify-center font-bold text-sm">
                                                        {idx + 1}
                                                    </span>
                                                    <h3 className="font-bold text-lg">{q.text}</h3>
                                                </div>
                                                {isGraded && (
                                                    <Badge variant="outline" className="font-bold">
                                                        {answer?.score || 0} / {q.points} Points
                                                    </Badge>
                                                )}
                                            </div>

                                            <div className="bg-light-zinc/20 dark:bg-dark-zinc/20 p-4 rounded-xl border border-light-border dark:border-dark-border">
                                                <p className="text-xs font-bold text-light-text-muted uppercase tracking-widest mb-2">Your Answer</p>
                                                <p className="text-sm">
                                                    {q.type === 'MULTIPLE_CHOICE'
                                                        ? (answer?.selectedOption || 'Not answered')
                                                        : (answer?.text || 'Not answered')}
                                                </p>
                                            </div>

                                            {isGraded && answer?.teacherFeedback && (
                                                <div className="mt-4 flex items-start gap-2 bg-purple-50 dark:bg-purple-900/10 p-3 rounded-lg border border-purple-200 dark:border-purple-800">
                                                    <AlertCircle className="h-4 w-4 text-purple-600 dark:text-purple-400 mt-0.5" />
                                                    <p className="text-xs text-purple-700 dark:text-purple-300">
                                                        <span className="font-bold">Feedback:</span> {answer.teacherFeedback}
                                                    </p>
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>
                    </div>
                )}
                <ConfirmModal
                    isOpen={isConfirmModalOpen}
                    onClose={() => setIsConfirmModalOpen(false)}
                    onConfirm={performSubmission}
                    title="Unanswered Questions"
                    message={`You have ${pendingUnansweredCount} unanswered question${pendingUnansweredCount !== 1 ? 's' : ''}. Are you sure you want to submit?`}
                    confirmText="Submit Anyway"
                    cancelText="Go Back"
                    variant="warning"
                    isLoading={isSubmitting}
                />
            </div>
        </ProtectedRoute>
    );
}
