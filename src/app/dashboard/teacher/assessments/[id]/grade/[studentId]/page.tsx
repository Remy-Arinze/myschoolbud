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
    useGradeAssessmentSubmissionMutation,
    useGetMyTeacherSchoolQuery,
    type AssessmentAnswer
} from '@/lib/store/api/schoolAdminApi';
import { useGradeEssayMutation } from '@/lib/store/api/aiApi';
import {
    ArrowLeft,
    CheckCircle2,
    Loader2,
    Sparkles,
    MessageSquare,
    Save,
    Send,
    Bot,
    Award,
    Shield,
    AlertTriangle,
    Eye,
} from 'lucide-react';
import { FadeInUp } from '@/components/ui/FadeInUp';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';
import {
    computeFinalAssessmentScore,
    suggestedLateDueDeduction,
    suggestedLateTimerDeduction,
    sumQuestionScores,
} from '@/lib/assessment-scoring';
import {
    GradingLatePanel,
    GradingScoreBreakdown,
    LateSubmissionBadges,
} from '@/components/assessments/GradingLatePanel';

export default function GradeAssessmentPage() {
    const params = useParams();
    const router = useRouter();
    const assessmentId = params.id as string;
    const studentId = params.studentId as string;

    const { data: schoolResponse } = useGetMyTeacherSchoolQuery();
    const schoolId = schoolResponse?.data?.id;

    const { data: assessmentResponse, isLoading: isLoadingAssessment } = useGetAssessmentByIdQuery(
        { schoolId: schoolId!, assessmentId },
        { skip: !schoolId || !assessmentId }
    );
    const assessment = assessmentResponse?.data; // Use data from ResponseDto

    const submission = assessment?.submissions?.find(s => s.studentId === studentId);
    const [gradeSubmission, { isLoading: isGrading }] = useGradeAssessmentSubmissionMutation();
    const [gradeWithAi] = useGradeEssayMutation();

    const [aiSuggestions, setAiSuggestions] = useState<Record<string, { score: number; feedback: string }>>({});
    const [loadingAI, setLoadingAI] = useState<Record<string, boolean>>({});

    const [questionScores, setQuestionScores] = useState<Record<string, number | string>>({});
    const [questionFeedback, setQuestionFeedback] = useState<Record<string, string>>({});
    const [overallFeedback, setOverallFeedback] = useState('');
    const [applyLateDueDeduction, setApplyLateDueDeduction] = useState(false);
    const [applyLateTimerDeduction, setApplyLateTimerDeduction] = useState(false);
    const [lateDueDeductionAmount, setLateDueDeductionAmount] = useState(0);
    const [lateTimerDeductionAmount, setLateTimerDeductionAmount] = useState(0);
    const [isGradingAll, setIsGradingAll] = useState(false);
    const [allEvaluationsComplete, setAllEvaluationsComplete] = useState(false);
    const [hasAppliedAll, setHasAppliedAll] = useState(false);

    // Check if publish should be enabled
    const isPublishEnabled = () => {
        if (!assessment?.questions) return false;
        
        return assessment.questions.some((q: any) => {
            const score = questionScores[q.id];
            // For multiple choice, any score (including 0) means it's been graded
            if (q.type === 'MULTIPLE_CHOICE') {
                return score !== undefined && score !== '';
            }
            // For essay/short answer, must have a numeric score (not empty string)
            return score !== '' && score !== undefined && score !== null;
        });
    };

    useEffect(() => {
        if (submission && assessment?.questions) {
            const initialScores: Record<string, number | string> = {};
            const initialFeedback: Record<string, string> = {};

            assessment.questions.forEach((q: any) => {
                const ans = submission.answers?.find((a: any) => a.questionId === q.id);
                if (q.type === 'MULTIPLE_CHOICE') {
                    const optionsArray = Array.isArray(q.options) ? q.options as string[] : JSON.parse((q.options as string) || '[]');
                    const getOptText = (val: string) => {
                        if (!val) return '';
                        const clean = val.trim();
                        if (/^[A-D]$/i.test(clean)) {
                            const oIdx = clean.toUpperCase().charCodeAt(0) - 65;
                            if (optionsArray[oIdx]) return optionsArray[oIdx];
                        }
                        const match = clean.match(/^[A-D][\.\)]\s*(.*)/i);
                        if (match) return match[1];
                        return clean;
                    };
                    const normExpected = getOptText(q.correctAnswer || '').toLowerCase();
                    const normActual = getOptText(ans?.selectedOption || '').toLowerCase();
                    const isCorrect = normExpected === normActual && normExpected !== '';
                    initialScores[q.id] = isCorrect ? Number(q.points) : 0;
                } else {
                    initialScores[q.id] = ans?.score ?? ''; 
                }
                initialFeedback[q.id] = ans?.teacherFeedback || '';
            });

            setQuestionScores(initialScores);
            setQuestionFeedback(initialFeedback);
            setOverallFeedback(submission.teacherFeedback || '');

            const suggestedDue = suggestedLateDueDeduction(
                submission.isLateDue,
                assessment.lateDuePenaltyPoints,
            );
            const suggestedTimer = suggestedLateTimerDeduction(
                submission.isLateTimer,
                assessment.lateTimerPenaltyPoints,
            );
            const storedDue = Number(submission.lateDueDeduction ?? suggestedDue);
            const storedTimer = Number(submission.lateTimerDeduction ?? suggestedTimer);

            setLateDueDeductionAmount(storedDue || suggestedDue);
            setLateTimerDeductionAmount(storedTimer || suggestedTimer);
            setApplyLateDueDeduction(submission.isLateDue && storedDue > 0);
            setApplyLateTimerDeduction(submission.isLateTimer && storedTimer > 0);
        }
    }, [submission, assessment]);

    const rawScore = sumQuestionScores(questionScores);
    const integrityDeduction = Number(submission?.pointDeductions || 0);
    const appliedLateDueDeduction = applyLateDueDeduction ? lateDueDeductionAmount : 0;
    const appliedLateTimerDeduction = applyLateTimerDeduction ? lateTimerDeductionAmount : 0;
    const finalScore = computeFinalAssessmentScore({
        rawScore,
        integrityDeduction,
        lateDueDeduction: appliedLateDueDeduction,
        lateTimerDeduction: appliedLateTimerDeduction,
        maxScore: Number(assessment?.maxScore || 0),
    });
    const suggestedLateDue = suggestedLateDueDeduction(
        !!submission?.isLateDue,
        assessment?.lateDuePenaltyPoints,
    );
    const suggestedLateTimer = suggestedLateTimerDeduction(
        !!submission?.isLateTimer,
        assessment?.lateTimerPenaltyPoints,
    );

    const handleScoreChange = (questionId: string, value: string | number, maxPoints: number) => {
        if (value === '') {
            setQuestionScores(prev => ({ ...prev, [questionId]: '' }));
            return;
        }
        let score = Number(value);
        if (isNaN(score)) return;
        if (score > maxPoints) score = maxPoints;
        if (score < 0) score = 0;
        setQuestionScores(prev => ({ ...prev, [questionId]: score }));
    };

    const handleFeedbackChange = (questionId: string, feedback: string) => {
        setQuestionFeedback(prev => ({ ...prev, [questionId]: feedback }));
    };

    const handleAiSuggest = async (questionId: string, qText: string, studentAnswer: string, maxPoints: number) => {
        if (!studentAnswer) {
            toast.error("Student hasn't provided an answer for this question.");
            return;
        }

        setLoadingAI(prev => ({ ...prev, [questionId]: true }));
        try {
            const result = await gradeWithAi({
                schoolId: schoolId!,
                body: {
                    essay: studentAnswer,
                    prompt: qText,
                    subject: assessment?.subject?.name || 'General',
                    gradeLevel: assessment?.class?.name || 'Class',
                    maxScore: maxPoints,
                }
            }).unwrap();

            if (result) {
                setAiSuggestions(prev => ({
                    ...prev,
                    [questionId]: {
                        score: result.score,
                        feedback: result.feedback
                    }
                }));
            }
        } catch (error: any) {
            toast.error(error?.data?.message || 'AI suggest failed. Please try again.');
        } finally {
            setLoadingAI(prev => ({ ...prev, [questionId]: false }));
        }
    };

    const applyAiSuggestion = (questionId: string) => {
        const suggestion = aiSuggestions[questionId];
        if (suggestion) {
            handleScoreChange(questionId, suggestion.score, 1000); // 1000 is just a safe upper bound, handleScoreChange handles maxPoints
            handleFeedbackChange(questionId, suggestion.feedback);
            // Clear suggestion after applying
            const newSuggestions = { ...aiSuggestions };
            delete newSuggestions[questionId];
            setAiSuggestions(newSuggestions);
            toast.success('AI suggestion applied');
        }
    };

    const handleGradeAll = async () => {
        if (!assessment?.questions || !submission) return;

        // Find questions that need AI grading and have a student answer
        const ungradedQs = assessment.questions.filter((q: any) => 
            (q.type === 'ESSAY' || q.type === 'SHORT_ANSWER') && 
            !aiSuggestions[q.id] // Don't re-grade if suggestion is already pending
        );

        const answersToGrade = ungradedQs.filter((q: any) => {
            const answer = submission.answers?.find((a: any) => a.questionId === q.id);
            return !!answer?.text?.trim(); // Ensure the student actually wrote something
        });

        if (answersToGrade.length === 0) {
            toast('No remaining questions require Lois AI analysis.', { icon: '🤖' });
            return;
        }

        setIsGradingAll(true);
        toast(`Lois AI is analyzing ${answersToGrade.length} answers sequentially...`, { icon: '🤖' });

        // Process sequentially to avoid API rate limits to AI provider
        let successCount = 0;
        for (const q of answersToGrade) {
            const answer = submission.answers?.find((a: any) => a.questionId === q.id);
            if (!answer?.text) continue;

            await handleAiSuggest(q.id, q.text, answer.text, q.points);
            successCount++;
        }

        setIsGradingAll(false);
        if (successCount > 0) {
            setAllEvaluationsComplete(true);
            toast.success(`Lois has finished analyzing ${successCount} answers! Please review and apply.`);
        }
    };

    const handleSaveDraft = () => {
        toast.success("Draft saved successfully.");
        // UI only for now
    };

    const applyAllAiSuggestions = () => {
        let appliedCount = 0;
        const newSuggestions = { ...aiSuggestions };
        
        Object.entries(aiSuggestions).forEach(([questionId, suggestion]) => {
            // Only apply if the question hasn't been manually graded or individually applied
            const currentScore = questionScores[questionId];
            const currentFeedback = questionFeedback[questionId];
            
            // Check if this question was already manually set or individually applied
            const wasAlreadyGraded = currentScore !== '' && currentScore !== undefined && 
                                   (currentFeedback !== suggestion.feedback);
            
            if (!wasAlreadyGraded) {
                // Apply the AI suggestion
                const question = assessment?.questions?.find((q: any) => q.id === questionId);
                if (question) {
                    handleScoreChange(questionId, suggestion.score, question.points);
                    handleFeedbackChange(questionId, suggestion.feedback);
                    appliedCount++;
                    delete newSuggestions[questionId];
                }
            }
        });
        
        setAiSuggestions(newSuggestions);
        setAllEvaluationsComplete(false);
        setHasAppliedAll(true);
        
        if (appliedCount > 0) {
            toast.success(`Applied Lois's suggestions to ${appliedCount} questions! Review and publish when ready.`);
        } else {
            toast('All eligible suggestions have already been applied or questions were manually graded.', { icon: 'ℹ️' });
        }
    };

    const handleSubmit = async () => {
        if (!submission) return;

        // Clean any empty string scores to 0 for backend safety
        const cleanedScores: Record<string, number> = {};
        Object.entries(questionScores).forEach(([qId, val]) => {
            cleanedScores[qId] = val === '' ? 0 : Number(val);
        });

        try {
            await gradeSubmission({
                schoolId: schoolId!,
                submissionId: submission.id,
                dto: {
                    totalScore: finalScore,
                    teacherFeedback: overallFeedback,
                    questionScores: cleanedScores,
                    questionFeedback,
                    lateDueDeduction: appliedLateDueDeduction,
                    lateTimerDeduction: appliedLateTimerDeduction,
                }
            }).unwrap();

            toast.success('Assessment graded successfully!');
            router.back();
        } catch (error: any) {
            toast.error(error?.data?.message || 'Failed to submit grade');
        }
    };

    if (isLoadingAssessment) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            </div>
        );
    }

    if (!assessment || !submission) {
        return (
            <div className="p-8 text-center max-w-md mx-auto">
                <Card>
                    <CardContent className="pt-8">
                        <p className="mb-4 text-light-text-secondary dark:text-dark-text-secondary">No submission found for this student.</p>
                        <Button onClick={() => router.back()} className="w-full">
                            Go Back
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const studentName = `${submission.student?.firstName} ${submission.student?.lastName}`;

    return (
        <ProtectedRoute roles={['TEACHER']}>
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
                <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6">
                {/* Header */}
                <FadeInUp from={{ opacity: 0, y: -20 }} to={{ opacity: 1, y: 0 }} duration={0.5}>
                    <Button variant="ghost" className="mb-4" onClick={() => router.back()}>
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Submissions
                    </Button>
                    <div>
                        <h1 className="font-bold text-light-text-primary dark:text-dark-text-primary" style={{ fontSize: 'var(--text-page-title)' }}>
                            Grading: {studentName}
                        </h1>
                        <p className="text-light-text-secondary dark:text-dark-text-secondary mt-1 max-w-2xl" style={{ fontSize: 'var(--text-page-subtitle)' }}>
                            {assessment.title} • {assessment.type}
                        </p>
                        <LateSubmissionBadges
                            className="mt-3"
                            isLateDue={submission.isLateDue}
                            isLateTimer={submission.isLateTimer}
                            isAutoSubmitted={submission.isAutoSubmitted}
                        />
                    </div>
                </FadeInUp>

                {/* Split Pane Layout */}
                <div className="flex flex-col lg:flex-row gap-8 items-start relative">
                    
                    {/* Main Left Pane - Questions List */}
                    <div className="flex-1 w-full space-y-6 lg:pr-96 xl:pr-[28rem]">
                        {assessment.questions?.map((q: any, idx: number) => {
                            const answer = submission.answers?.find((a: any) => a.questionId === q.id);
                            
                            // Helper to normalize A/B/C/D to full option text
                            const optionsArray = Array.isArray(q.options) ? q.options as string[] : JSON.parse((q.options as string) || '[]');
                            const getOptText = (val: string) => {
                                if (!val) return '';
                                const clean = val.trim();
                                if (/^[A-D]$/i.test(clean)) {
                                    const oIdx = clean.toUpperCase().charCodeAt(0) - 65;
                                    if (optionsArray[oIdx]) return optionsArray[oIdx];
                                }
                                const match = clean.match(/^[A-D][\.\)]\s*(.*)/i);
                                if (match) return match[1];
                                return clean;
                            };

                            const normExpected = getOptText(q.correctAnswer || '');
                            const normActual = getOptText(answer?.selectedOption || '');
                            const isMCQCorrect = normExpected.toLowerCase() === normActual.toLowerCase() && normExpected !== '';

                            return (
                                <FadeInUp key={q.id} delay={idx * 0.1}>
                                    <Card className="overflow-hidden border border-slate-200 dark:border-blue-900/30 shadow-sm transition-all hover:shadow-md bg-white dark:bg-dark-surface/50">
                                        <CardContent className="p-0">
                                            {/* Question Header & Points Input */}
                                            <div className="p-6 pb-4 border-b border-slate-100 dark:border-dark-border bg-slate-50/50 dark:bg-dark-surface/50">
                                                <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                                                    <div className="space-y-2 flex-1">
                                                        <div className="flex items-center gap-3">
                                                            <h3 className="font-bold text-lg text-slate-800 dark:text-dark-text-primary">
                                                                Question {idx + 1}
                                                            </h3>
                                                            <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-dark-text-secondary bg-white dark:bg-dark-surface border-slate-200">
                                                                {q.type.replace('_', ' ')}
                                                            </Badge>
                                                        </div>
                                                        <p className="text-slate-700 dark:text-dark-text-primary font-medium text-base">
                                                            {q.text}
                                                        </p>
                                                    </div>
                                                    <div className="text-right shrink-0 bg-white dark:bg-black/40 p-3 rounded-xl border border-slate-200 dark:border-blue-900/30 w-full sm:w-auto shadow-sm">
                                                        <span className="text-xs font-bold text-slate-400 dark:text-blue-400/70 uppercase tracking-widest block mb-1">Score</span>
                                                        <div className="flex items-center gap-2 justify-end">
                                                            <Input
                                                                type="text"
                                                                inputMode="decimal"
                                                                className="w-20 text-center font-black text-lg text-slate-900 dark:text-blue-100 border-slate-200 dark:border-blue-800 bg-white dark:bg-black/60 focus-visible:ring-indigo-500 shadow-inner"
                                                                value={questionScores[q.id] === undefined ? '' : questionScores[q.id]}
                                                                onChange={(e) => handleScoreChange(q.id, e.target.value, q.points)}
                                                                onFocus={(e) => e.target.select()}
                                                                onBlur={(e) => {
                                                                    if (questionScores[q.id] === '') {
                                                                        handleScoreChange(q.id, 0, q.points);
                                                                    }
                                                                }}
                                                            />
                                                            <span className="text-sm font-bold text-slate-400 dark:text-blue-100/40">/ {q.points}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Answer Display */}
                                            <div className="p-6">
                                                <div className="grid grid-cols-1 gap-4 mb-6">
                                                    <div className={`p-5 rounded-xl border ${isMCQCorrect ? 'bg-green-50/50 border-green-100 dark:bg-green-900/10 dark:border-green-900/30' : 'bg-slate-50 border-slate-200 dark:bg-blue-900/10 dark:border-blue-900/30'}`}>
                                                        <p className="text-[10px] font-bold text-slate-500 dark:text-blue-300/60 uppercase tracking-widest mb-3 flex items-center gap-2">
                                                            <span>Student Answer</span>
                                                        </p>
                                                        <p className="text-base font-medium text-light-text-primary dark:text-dark-text-primary leading-relaxed whitespace-pre-wrap">
                                                            {q.type === 'MULTIPLE_CHOICE'
                                                                ? (normActual || <span className="text-light-text-muted italic/80 font-normal">No option selected</span>)
                                                                : (answer?.text || <span className="text-light-text-muted italic/80 font-normal">No answer provided</span>)}
                                                        </p>

                                                        {q.type === 'MULTIPLE_CHOICE' && q.correctAnswer && (
                                                            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-blue-800/60 flex items-center gap-3">
                                                                <Badge variant={isMCQCorrect ? 'success' : 'danger'} className="text-xs px-2 py-0.5 shadow-sm">
                                                                    {isMCQCorrect ? 'Correct' : 'Incorrect'}
                                                                </Badge>
                                                                <span className="text-sm text-slate-500 dark:text-dark-text-secondary">
                                                                    Expected: <span className="font-bold text-slate-700 dark:text-green-400">{normExpected}</span>
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* AISuggest / Lois Auto-Grade Status UI */}
                                                <div className="mb-6">
                                                    {(q.type === 'ESSAY' || q.type === 'SHORT_ANSWER') && (
                                                        <div className="mt-2">
                                                            {!aiSuggestions[q.id] ? (
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    className="text-xs h-9 bg-gradient-to-r from-indigo-50/50 to-blue-50/50 dark:from-indigo-900/10 dark:to-blue-900/10 border-indigo-100 dark:border-indigo-900/30 text-indigo-700 dark:text-indigo-300 gap-2 font-bold px-4 hover:shadow-sm"
                                                                    onClick={() => handleAiSuggest(q.id, q.text, answer?.text || '', q.points)}
                                                                    disabled={loadingAI[q.id]}
                                                                >
                                                                    {loadingAI[q.id] ? (
                                                                        <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
                                                                    ) : (
                                                                        <Sparkles className="h-4 w-4 text-amber-500" />
                                                                    )}
                                                                    {loadingAI[q.id] ? 'Lois is evaluating...' : 'Ask Lois to evaluate'}
                                                                </Button>
                                                            ) : (
                                                                <div className="bg-gradient-to-br from-indigo-50 to-blue-50/50 dark:from-indigo-950/30 dark:to-blue-900/10 p-5 rounded-xl border border-indigo-200 dark:border-indigo-900/50 animate-in fade-in slide-in-from-top-2 relative overflow-hidden shadow-sm">
                                                                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
                                                                    <div className="flex items-center justify-between mb-4 relative z-10">
                                                                        <div className="flex items-center gap-2">
                                                                            <div className="bg-white dark:bg-black/50 p-1.5 rounded-lg shadow-sm border border-indigo-100 dark:border-indigo-800">
                                                                                <Sparkles className="h-4 w-4 text-indigo-500" />
                                                                            </div>
                                                                            <span className="text-xs font-black uppercase tracking-widest text-indigo-800 dark:text-indigo-300">Lois's Feedback</span>
                                                                        </div>
                                                                        <div className="flex gap-2">
                                                                            <Button
                                                                                variant="ghost"
                                                                                size="sm"
                                                                                className="h-8 text-xs font-semibold text-indigo-700/70 dark:text-indigo-300/70 hover:bg-white/50 dark:hover:bg-black/20"
                                                                                onClick={() => {
                                                                                    const newSuggestions = { ...aiSuggestions };
                                                                                    delete newSuggestions[q.id];
                                                                                    setAiSuggestions(newSuggestions);
                                                                                }}
                                                                            >
                                                                                Dismiss
                                                                            </Button>
                                                                            {!allEvaluationsComplete && (
                                                                                <Button
                                                                                    size="sm"
                                                                                    className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
                                                                                    onClick={() => applyAiSuggestion(q.id)}
                                                                                >
                                                                                    Apply Score & Feedback
                                                                                </Button>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                    <div className="grid grid-cols-1 sm:grid-cols-5 gap-6 relative z-10 bg-white/40 dark:bg-black/20 p-4 rounded-lg border border-indigo-100/50 dark:border-indigo-900/30">
                                                                        <div className="sm:col-span-1 border-b sm:border-b-0 sm:border-r border-indigo-200/50 dark:border-indigo-800/50 pb-4 sm:pb-0 sm:pr-4 flex flex-col justify-center">
                                                                            <p className="text-[9px] font-black uppercase tracking-widest text-indigo-500/80 dark:text-indigo-400 mb-1">Suggested</p>
                                                                            <p className="text-4xl font-black text-indigo-900 dark:text-indigo-100 tracking-tighter">{aiSuggestions[q.id].score}</p>
                                                                        </div>
                                                                        <div className="sm:col-span-4">
                                                                            <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500/80 dark:text-indigo-400 mb-2">Detailed Analysis</p>
                                                                            <p className="text-sm font-medium text-indigo-900/80 dark:text-indigo-200/90 leading-relaxed italic border-l-2 border-indigo-300 dark:border-indigo-700 pl-3">
                                                                                "{aiSuggestions[q.id].feedback}"
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Teacher Feedback textarea */}
                                                <div className="space-y-3">
                                                    <div className="flex items-center gap-2 text-xs font-bold text-light-text-secondary dark:text-dark-text-secondary uppercase tracking-wider">
                                                        <MessageSquare className="h-3.5 w-3.5 text-blue-500" />
                                                        Teacher Feedback
                                                    </div>
                                                    <Textarea
                                                        placeholder="Provide specific feedback for this answer... (Students will see this)"
                                                        value={questionFeedback[q.id] || ''}
                                                        onChange={(e) => handleFeedbackChange(q.id, e.target.value)}
                                                        className="min-h-[80px] text-sm resize-none focus-visible:ring-blue-500"
                                                    />
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </FadeInUp>
                            );
                        })}
                    </div>

                    {/* Mobile Sidebar - Bottom of page on mobile/tablet */}
                    <div className="lg:hidden space-y-6 mt-8">
                        {/* Summary Card */}
                        <Card className="border-slate-200 dark:border-blue-900/30 shadow-md hover:shadow-lg transition-shadow overflow-hidden bg-white dark:bg-dark-surface/50">
                            <CardHeader className="bg-slate-900 dark:bg-blue-800 text-white pb-6 pt-5">
                                <CardTitle className="flex items-center gap-2 text-white text-lg">
                                    <Award className="h-5 w-5 text-slate-300 dark:text-blue-200" />
                                    Grading Summary
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="p-6 border-b border-slate-100 dark:border-dark-border bg-slate-50 dark:from-blue-900/10 dark:to-dark-surface/50">
                                    <GradingScoreBreakdown
                                        rawScore={rawScore}
                                        integrityDeduction={integrityDeduction}
                                        lateDueDeduction={appliedLateDueDeduction}
                                        lateTimerDeduction={appliedLateTimerDeduction}
                                        finalScore={finalScore}
                                        maxScore={Number(assessment.maxScore)}
                                    />
                                </div>
                                
                                <div className="p-5 space-y-4">
                                    <GradingLatePanel
                                        isLateDue={submission.isLateDue}
                                        isLateTimer={submission.isLateTimer}
                                        isAutoSubmitted={submission.isAutoSubmitted}
                                        applyLateDueDeduction={applyLateDueDeduction}
                                        applyLateTimerDeduction={applyLateTimerDeduction}
                                        lateDueDeductionAmount={lateDueDeductionAmount}
                                        lateTimerDeductionAmount={lateTimerDeductionAmount}
                                        suggestedLateDue={suggestedLateDue}
                                        suggestedLateTimer={suggestedLateTimer}
                                        onApplyLateDueChange={(apply) => {
                                            setApplyLateDueDeduction(apply);
                                            if (apply && lateDueDeductionAmount === 0) {
                                                setLateDueDeductionAmount(suggestedLateDue);
                                            }
                                        }}
                                        onApplyLateTimerChange={(apply) => {
                                            setApplyLateTimerDeduction(apply);
                                            if (apply && lateTimerDeductionAmount === 0) {
                                                setLateTimerDeductionAmount(suggestedLateTimer);
                                            }
                                        }}
                                        onLateDueAmountChange={setLateDueDeductionAmount}
                                        onLateTimerAmountChange={setLateTimerDeductionAmount}
                                    />
                                    <div className="space-y-3">
                                        <label className="text-xs font-black text-slate-700 dark:text-dark-text-primary uppercase tracking-wider flex items-center gap-2">
                                            <MessageSquare className="h-3.5 w-3.5 text-indigo-500 dark:text-blue-500" />
                                            Global Feedback
                                        </label>
                                        <Textarea
                                            className="w-full min-h-[140px] text-sm resize-none border-slate-200 focus-visible:ring-indigo-500 bg-white dark:bg-dark-surface/50 leading-relaxed shadow-sm"
                                            placeholder="Provide general, overarching feedback on the student's entire performance here..."
                                            value={overallFeedback}
                                            onChange={(e) => setOverallFeedback(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="p-5 bg-slate-50/50 dark:bg-dark-surface/80 border-t border-slate-100 dark:border-dark-border space-y-3">
                                    <Button
                                        className={cn(
                                            "w-full font-bold gap-2 relative overflow-hidden group shadow-md",
                                            allEvaluationsComplete 
                                                ? "bg-green-600 hover:bg-green-700 text-white"
                                                : "bg-indigo-600 hover:bg-indigo-700 text-white"
                                        )}
                                        onClick={allEvaluationsComplete ? applyAllAiSuggestions : handleGradeAll}
                                        disabled={isGradingAll}
                                        isLoading={isGradingAll}
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-[150%] group-hover:translate-x-[150%] transition-transform duration-1000 ease-out" />
                                        {allEvaluationsComplete ? (
                                            <>
                                                <CheckCircle2 className="h-4 w-4" />
                                                {isGradingAll ? 'Applying...' : 'Apply All Scores & Feedback'}
                                            </>
                                        ) : (
                                            <>
                                                <Bot className="h-4 w-4" />
                                                {isGradingAll ? 'Lois is Analyzing...' : 'Grade All with Lois'}
                                            </>
                                        )}
                                    </Button>
                                    
                                    {hasAppliedAll && (
                                        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-900/30 rounded-lg p-3 text-center">
                                            <div className="flex items-center justify-center gap-2 text-green-700 dark:text-green-300">
                                                <CheckCircle2 className="h-4 w-4" />
                                                <span className="text-xs font-bold">All Lois suggestions applied! Review above and publish when ready.</span>
                                            </div>
                                        </div>
                                    )}
                                    
                                    {!isPublishEnabled() && (
                                        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/30 rounded-lg p-3 text-center mb-3">
                                            <div className="flex items-center justify-center gap-2 text-amber-700 dark:text-amber-300">
                                                <AlertTriangle className="h-4 w-4" />
                                                <span className="text-xs font-bold">Please grade at least one question before publishing</span>
                                            </div>
                                        </div>
                                    )}
                                    
                                    <div className="grid grid-cols-2 gap-3 pt-3">
                                        <Button
                                            variant="outline"
                                            className="w-full font-bold border-slate-200 bg-white hover:bg-slate-50 dark:border-dark-border shadow-sm text-slate-700 dark:text-dark-text-secondary"
                                            onClick={handleSaveDraft}
                                        >
                                            Save Draft
                                        </Button>
                                        <Button
                                            className="w-full bg-slate-900 hover:bg-black dark:bg-blue-600 dark:hover:bg-blue-700 text-white font-bold gap-2 shadow-md"
                                            onClick={handleSubmit}
                                            isLoading={isGrading}
                                            disabled={!isPublishEnabled()}
                                        >
                                            <Send className="h-4 w-4" />
                                            Publish
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Sticky Sidebar Right Pane */}
                    <FadeInUp delay={0.2} className="hidden lg:block lg:fixed lg:right-4 lg:top-24 lg:w-80 xl:w-96 space-y-6">
                        
                        {/* Summary Card */}
                        <Card className="border-slate-200 dark:border-blue-900/30 shadow-md hover:shadow-lg transition-shadow overflow-hidden bg-white dark:bg-dark-surface/50">
                            <CardHeader className="bg-slate-900 dark:bg-blue-800 text-white pb-6 pt-5">
                                <CardTitle className="flex items-center gap-2 text-white text-lg">
                                    <Award className="h-5 w-5 text-slate-300 dark:text-blue-200" />
                                    Grading Summary
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="p-6 border-b border-slate-100 dark:border-dark-border bg-slate-50 dark:from-blue-900/10 dark:to-dark-surface/50">
                                    <GradingScoreBreakdown
                                        rawScore={rawScore}
                                        integrityDeduction={integrityDeduction}
                                        lateDueDeduction={appliedLateDueDeduction}
                                        lateTimerDeduction={appliedLateTimerDeduction}
                                        finalScore={finalScore}
                                        maxScore={Number(assessment.maxScore)}
                                    />
                                </div>
                                
                                <div className="p-5 space-y-4">
                                    <GradingLatePanel
                                        isLateDue={submission.isLateDue}
                                        isLateTimer={submission.isLateTimer}
                                        isAutoSubmitted={submission.isAutoSubmitted}
                                        applyLateDueDeduction={applyLateDueDeduction}
                                        applyLateTimerDeduction={applyLateTimerDeduction}
                                        lateDueDeductionAmount={lateDueDeductionAmount}
                                        lateTimerDeductionAmount={lateTimerDeductionAmount}
                                        suggestedLateDue={suggestedLateDue}
                                        suggestedLateTimer={suggestedLateTimer}
                                        onApplyLateDueChange={(apply) => {
                                            setApplyLateDueDeduction(apply);
                                            if (apply && lateDueDeductionAmount === 0) {
                                                setLateDueDeductionAmount(suggestedLateDue);
                                            }
                                        }}
                                        onApplyLateTimerChange={(apply) => {
                                            setApplyLateTimerDeduction(apply);
                                            if (apply && lateTimerDeductionAmount === 0) {
                                                setLateTimerDeductionAmount(suggestedLateTimer);
                                            }
                                        }}
                                        onLateDueAmountChange={setLateDueDeductionAmount}
                                        onLateTimerAmountChange={setLateTimerDeductionAmount}
                                    />
                                    <div className="space-y-3">
                                        <label className="text-xs font-black text-slate-700 dark:text-dark-text-primary uppercase tracking-wider flex items-center gap-2">
                                            <MessageSquare className="h-3.5 w-3.5 text-indigo-500 dark:text-blue-500" />
                                            Global Feedback
                                        </label>
                                        <Textarea
                                            className="w-full min-h-[140px] text-sm resize-none border-slate-200 focus-visible:ring-indigo-500 bg-white dark:bg-dark-surface/50 leading-relaxed shadow-sm"
                                            placeholder="Provide general, overarching feedback on the student's entire performance here..."
                                            value={overallFeedback}
                                            onChange={(e) => setOverallFeedback(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="p-5 bg-slate-50/50 dark:bg-dark-surface/80 border-t border-slate-100 dark:border-dark-border space-y-3">
                                    <Button
                                        className={cn(
                                            "w-full font-bold gap-2 relative overflow-hidden group shadow-md",
                                            allEvaluationsComplete 
                                                ? "bg-green-600 hover:bg-green-700 text-white"
                                                : "bg-indigo-600 hover:bg-indigo-700 text-white"
                                        )}
                                        onClick={allEvaluationsComplete ? applyAllAiSuggestions : handleGradeAll}
                                        disabled={isGradingAll}
                                        isLoading={isGradingAll}
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-[150%] group-hover:translate-x-[150%] transition-transform duration-1000 ease-out" />
                                        {allEvaluationsComplete ? (
                                            <>
                                                <CheckCircle2 className="h-4 w-4" />
                                                {isGradingAll ? 'Applying...' : 'Apply All Scores & Feedback'}
                                            </>
                                        ) : (
                                            <>
                                                <Bot className="h-4 w-4" />
                                                {isGradingAll ? 'Lois is Analyzing...' : 'Grade All with Lois'}
                                            </>
                                        )}
                                    </Button>
                                    
                                    {hasAppliedAll && (
                                        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-900/30 rounded-lg p-3 text-center">
                                            <div className="flex items-center justify-center gap-2 text-green-700 dark:text-green-300">
                                                <CheckCircle2 className="h-4 w-4" />
                                                <span className="text-xs font-bold">All Lois suggestions applied! Review above and publish when ready.</span>
                                            </div>
                                        </div>
                                    )}
                                    
                                    {!isPublishEnabled() && (
                                        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/30 rounded-lg p-3 text-center mb-3">
                                            <div className="flex items-center justify-center gap-2 text-amber-700 dark:text-amber-300">
                                                <AlertTriangle className="h-4 w-4" />
                                                <span className="text-xs font-bold">Please grade at least one question before publishing</span>
                                            </div>
                                        </div>
                                    )}
                                    
                                    <div className="grid grid-cols-2 gap-3 pt-3">
                                        <Button
                                            variant="outline"
                                            className="w-full font-bold border-slate-200 bg-white hover:bg-slate-50 dark:border-dark-border shadow-sm text-slate-700 dark:text-dark-text-secondary"
                                            onClick={handleSaveDraft}
                                        >
                                            Save Draft
                                        </Button>
                                        <Button
                                            className="w-full bg-slate-900 hover:bg-black dark:bg-blue-600 dark:hover:bg-blue-700 text-white font-bold gap-2 shadow-md"
                                            onClick={handleSubmit}
                                            isLoading={isGrading}
                                            disabled={!isPublishEnabled()}
                                        >
                                            <Send className="h-4 w-4" />
                                            Publish
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Integrity Audit Card */}
                        {assessment.hasIntegrity && (
                            <Card className={cn(
                                "shadow-sm border-2",
                                submission.isFlagged ? "border-red-200 bg-red-50/20 dark:border-red-900/30" : "border-slate-100 dark:border-dark-border"
                            )}>
                                <CardHeader className={cn(
                                    "pb-3 pt-4 border-b",
                                    submission.isFlagged ? "bg-red-50 dark:bg-red-900/30 border-red-100 dark:border-red-900/20" : "bg-slate-50 dark:bg-dark-surface border-slate-100 dark:border-dark-border"
                                )}>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Shield className={cn("h-4 w-4", submission.isFlagged ? "text-red-600" : "text-slate-400")} />
                                            <CardTitle className={cn("text-xs font-black uppercase tracking-widest", submission.isFlagged ? "text-red-900 dark:text-red-300" : "text-slate-900 dark:text-dark-text-primary")}>
                                                Integrity Report
                                            </CardTitle>
                                        </div>
                                        <Badge variant={submission.isFlagged ? "danger" : "outline"} className="text-[10px] px-2 py-0">
                                            {submission.isFlagged ? "FLAGGED" : "SECURE"}
                                        </Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-4 space-y-4">
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="bg-white dark:bg-black/20 p-2 rounded-lg border border-slate-100 dark:border-dark-border">
                                            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Violations</p>
                                            <p className={cn("text-lg font-black", submission.violationCount > 0 ? "text-red-600" : "text-slate-900 dark:text-dark-text-primary")}>
                                                {submission.violationCount}
                                            </p>
                                        </div>
                                        <div className="bg-white dark:bg-black/20 p-2 rounded-lg border border-slate-100 dark:border-dark-border">
                                            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Penalties</p>
                                            <p className="text-lg font-black text-slate-900 dark:text-dark-text-primary">
                                                -{submission.pointDeductions}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1 thin-scrollbar">
                                        {submission.violations && (submission as any).violations.length > 0 ? (
                                            (submission as any).violations.map((v: any, i: number) => (
                                                <div key={v.id} className="p-2 bg-white dark:bg-black/20 rounded-lg border border-slate-100 dark:border-dark-border flex items-start gap-3">
                                                    <div className="mt-1">
                                                        <AlertTriangle className="h-3 w-3 text-red-500" />
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] font-bold text-slate-700 dark:text-dark-text-primary uppercase leading-tight">
                                                            {v.type.replace('_', ' ')}
                                                        </p>
                                                        <p className="text-[9px] text-slate-400 mt-0.5">
                                                            {new Date(v.timestamp).toLocaleTimeString()}
                                                        </p>
                                                        {v.details && (
                                                            <p className="text-[9px] text-slate-500 italic mt-1 leading-tight">
                                                                {v.details}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="text-center py-4 opacity-40">
                                                <Eye className="h-4 w-4 mx-auto mb-2" />
                                                <p className="text-[10px] font-bold uppercase tracking-widest leading-tight">No suspicious<br/>activity detected</p>
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Student Context Card */}
                        <Card className="shadow-sm border-light-border dark:border-dark-border">
                            <CardContent className="p-5">
                                <p className="text-[10px] font-black text-light-text-muted uppercase tracking-widest mb-3">Currently Grading</p>
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center font-bold text-blue-600 dark:text-blue-400 text-lg shadow-inner">
                                        {submission.student?.firstName?.[0]}{submission.student?.lastName?.[0]}
                                    </div>
                                    <div>
                                        <p className="font-bold text-light-text-primary dark:text-dark-text-primary leading-tight text-sm">
                                            {studentName}
                                        </p>
                                        <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary mt-1 font-medium">
                                            ID: <span className="text-light-text-muted">{submission.student?.uid}</span>
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </FadeInUp>
                </div>
            </div>
            </div>
        </ProtectedRoute>
    );
}
