import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
    useCreateAssessmentMutation,
    useGetTermsQuery,
    useGetTeacherSubjectsQuery,
    useGetCurriculumForClassQuery,
    useGetMyTeacherProfileQuery,
    type AssessmentType,
    type QuestionType,
    type CurriculumItem
} from '@/lib/store/api/schoolAdminApi';
import { useGenerateAssessmentMutation } from '@/lib/store/api/aiApi';
import { useRuntimePolicies } from '@/hooks/useRuntimePolicies';
import { Trash2, Plus, Sparkles, Loader2, BookOpen, ChevronDown, ChevronUp, CheckCircle2, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

interface CreateAssessmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    schoolId: string;
    classId: string;
    activeTermId?: string;
    subjectId?: string;
}

interface Question {
    text: string;
    type: QuestionType;
    options: string[];
    correctAnswer: string;
    points: number;
    order: number;
}

export function CreateAssessmentModal({ isOpen, onClose, schoolId, classId, activeTermId, subjectId }: CreateAssessmentModalProps) {
    const [createAssessment, { isLoading: isCreating }] = useCreateAssessmentMutation();
    const [generateAiAssessment, { isLoading: isGeneratingAi }] = useGenerateAssessmentMutation();
    const { data: termsResponse } = useGetTermsQuery({ schoolId });
    const { data: teacherProfileResponse } = useGetMyTeacherProfileQuery();
    const { data: subjectsResponse } = useGetTeacherSubjectsQuery({ schoolId, teacherId: 'me' });

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [type, setType] = useState<AssessmentType>('QUIZ');
    const [termId, setTermId] = useState(activeTermId || '');
    const [selectedSubjectId, setSelectedSubjectId] = useState(subjectId || '');
    const [dueDate, setDueDate] = useState('');
    const [maxScore, setMaxScore] = useState(100);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [isTimed, setIsTimed] = useState(false);
    const [duration, setDuration] = useState(30);
    const [autoSubmitOnTimeout, setAutoSubmitOnTimeout] = useState(true);
    const [allowLateSubmissionAfterDue, setAllowLateSubmissionAfterDue] = useState(false);
    const [allowLateSubmissionAfterTimer, setAllowLateSubmissionAfterTimer] = useState(false);
    const [lateDuePenaltyPoints, setLateDuePenaltyPoints] = useState(0);
    const [lateTimerPenaltyPoints, setLateTimerPenaltyPoints] = useState(0);
    const [hasIntegrity, setHasIntegrity] = useState(false);
    const [violationThreshold, setViolationThreshold] = useState(1);
    const [pointsPerViolation, setPointsPerViolation] = useState(0);
    const [selectedTemplateId, setSelectedTemplateId] = useState('');
    const { policies } = useRuntimePolicies();
    const templates = policies.grading.templates ?? [];
    const requireTemplate =
        policies.grading.templatesMode === 'SCHOOL_TEMPLATES' && templates.length > 0;

    // AI Generation state
    const [useAi, setUseAi] = useState(false);
    const [aiCount, setAiCount] = useState(10);
    const [selectedWeeks, setSelectedWeeks] = useState<number[]>([]);
    const [showWeeks, setShowWeeks] = useState(false);

    // Fetch curriculum based on selected subject and term
    const selectedSubject = subjectsResponse?.data?.find((s: any) => s.id === selectedSubjectId);
    
    const { data: curriculumResponse, isLoading: isLoadingCurriculum } = useGetCurriculumForClassQuery({
        schoolId,
        classId,
        subject: selectedSubject?.name,
        termId: termId,
    }, { 
        skip: !selectedSubjectId || !termId || !useAi,
        refetchOnMountOrArgChange: true 
    });

    const curriculumItems = curriculumResponse?.data?.items || [];

    useEffect(() => {
        if (activeTermId) setTermId(activeTermId);
        if (subjectId) setSelectedSubjectId(subjectId);
    }, [activeTermId, subjectId, isOpen]);

    useEffect(() => {
        if (!isOpen) return;
        const g = policies.grading;
        setAllowLateSubmissionAfterDue(g.defaultAllowLateSubmissionAfterDue);
        setAllowLateSubmissionAfterTimer(g.defaultAllowLateSubmissionAfterTimer);
        setLateDuePenaltyPoints(g.defaultLateDuePenalty);
        setLateTimerPenaltyPoints(g.defaultLateTimerPenalty);
        setHasIntegrity(g.defaultIntegrityEnabled);
        setViolationThreshold(g.defaultViolationThreshold);
        setPointsPerViolation(g.defaultPointsPerViolation);
        setSelectedTemplateId('');
    }, [isOpen, policies.grading]);

    // Reset selected weeks when subject or term changes
    useEffect(() => {
        setSelectedWeeks([]);
    }, [selectedSubjectId, termId]);

    const addQuestion = () => {
        setQuestions([
            ...questions,
            {
                text: '',
                type: 'MULTIPLE_CHOICE',
                options: ['', '', '', ''],
                correctAnswer: '',
                points: 1,
                order: questions.length
            }
        ]);
    };

    const removeQuestion = (index: number) => {
        const newQuestions = [...questions];
        newQuestions.splice(index, 1);
        // Re-order
        const reordered = newQuestions.map((q, i) => ({ ...q, order: i }));
        setQuestions(reordered);
    };

    const updateQuestion = (index: number, field: keyof Question, value: any) => {
        const newQuestions = [...questions];
        newQuestions[index] = { ...newQuestions[index], [field]: value };
        setQuestions(newQuestions);
    };

    const handleAiGenerate = async () => {
        if (!selectedSubject) {
            toast.error('Please select a subject first');
            return;
        }

        if (selectedWeeks.length === 0) {
            toast.error('Please select at least one week from the curriculum');
            return;
        }

        // Construct combined topic and objectives from selected weeks
        const selectedItems = curriculumItems.filter(item => selectedWeeks.includes(item.weekNumber));
        const combinedTopics = selectedItems.map(item => item.topic).join(', ');
        const combinedObjectives = selectedItems.flatMap(item => item.objectives).join('; ');
        
        const fullPrompt = `Topics: ${combinedTopics}. Learning Objectives: ${combinedObjectives}`;

        try {
            const result = await generateAiAssessment({
                schoolId,
                body: {
                    topic: fullPrompt,
                    subject: selectedSubject.name,
                    gradeLevel: teacherProfileResponse?.data?.schoolType === 'PRIMARY' ? 'Primary' : 'Grade', // Use appropriate context
                    questionCount: aiCount,
                    questionTypes: ['multiple_choice', 'short_answer'],
                    difficulty: 'medium'
                }
            }).unwrap();

            if (result && result.questions) {
                const aiQuestions = result.questions.map((q: any, i: number) => ({
                    text: q.question,
                    type: q.type === 'multiple_choice' ? 'MULTIPLE_CHOICE' : (q.type === 'short_answer' ? 'SHORT_ANSWER' : 'ESSAY'),
                    options: q.options || [],
                    correctAnswer: q.correctAnswer,
                    points: q.points || 1,
                    order: i
                }));
                setQuestions(aiQuestions);
                setUseAi(false);
                toast.success('Questions generated by AI!');
            }
        } catch (error: any) {
            toast.error(error?.data?.message || 'Failed to generate AI questions. Ensure you have enough credits.');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (requireTemplate && !selectedTemplateId) {
            toast.error('Please pick a school assessment template');
            return;
        }

        if (!selectedSubjectId) {
            toast.error('Please select a subject');
            return;
        }

        if (questions.length === 0) {
            toast.error('Please add at least one question');
            return;
        }

        try {
            await createAssessment({
                schoolId,
                classId,
                dto: {
                    title,
                    description,
                    type,
                    subjectId: selectedSubjectId,
                    termId,
                    dueDate,
                    maxScore,
                    isTimed,
                    duration: isTimed ? duration : undefined,
                    autoSubmitOnTimeout,
                    allowLateSubmissionAfterDue,
                    allowLateSubmissionAfterTimer,
                    lateDuePenaltyPoints: allowLateSubmissionAfterDue ? lateDuePenaltyPoints : 0,
                    lateTimerPenaltyPoints: allowLateSubmissionAfterTimer ? lateTimerPenaltyPoints : 0,
                    hasIntegrity,
                    violationThreshold,
                    pointsPerViolation: hasIntegrity ? pointsPerViolation : 0,
                    questions: questions.map(q => ({
                        ...q,
                        options: q.type === 'MULTIPLE_CHOICE' ? q.options : undefined
                    }))
                }
            }).unwrap();

            toast.success('Assessment created successfully!');
            onClose();
            // Reset form
            setTitle('');
            setDescription('');
            setQuestions([]);
        } catch (error: any) {
            toast.error(error?.data?.message || 'Failed to create assessment');
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Create Assessment"
            size="xl"
            // scrollable removed because it's not a prop
        >
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                        <label className="block text-sm font-semibold mb-1">Title</label>
                        <Input
                            placeholder="e.g. Mid-Term Mathematics Quiz"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            required
                        />
                    </div>

                    {templates.length > 0 && policies.grading.templatesMode === 'SCHOOL_TEMPLATES' && (
                    <div className="md:col-span-2">
                        <label className="block text-sm font-semibold mb-1">
                            School template{requireTemplate ? ' *' : ''}
                        </label>
                        <select
                            value={selectedTemplateId}
                            required={requireTemplate}
                            onChange={(e) => {
                                const id = e.target.value;
                                setSelectedTemplateId(id);
                                const tpl = templates.find((t) => t.id === id);
                                if (!tpl) return;
                                setMaxScore(tpl.maxScore);
                                if (tpl.gradeType === 'EXAM') setType('EXAM');
                                else if (tpl.gradeType === 'ASSIGNMENT') setType('ASSIGNMENT');
                                else setType('QUIZ');
                                if (!title) setTitle(tpl.name);
                            }}
                            className="w-full h-10 rounded-md border border-light-border dark:border-dark-border bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">Select template</option>
                            {templates.map((t) => (
                                <option key={t.id} value={t.id}>
                                    {t.name} ({t.gradeType}, {t.maxScore} pts)
                                </option>
                            ))}
                        </select>
                    </div>
                    )}

                    <div>
                        <label className="block text-sm font-semibold mb-1">Subject</label>
                        <select
                            value={selectedSubjectId}
                            onChange={(e) => setSelectedSubjectId(e.target.value)}
                            className="w-full h-10 rounded-md border border-light-border dark:border-dark-border bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                        >
                            <option value="">Select Subject</option>
                            {subjectsResponse?.data?.map((subject: any) => (
                                <option key={subject.id} value={subject.id}>
                                    {subject.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold mb-1">Academic Term</label>
                        <select
                            value={termId}
                            onChange={(e) => setTermId(e.target.value)}
                            className="w-full h-10 rounded-md border border-light-border dark:border-dark-border bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                        >
                            <option value="">Select Term</option>
                            {(Array.isArray(termsResponse?.data?.items) ? termsResponse.data.items : Array.isArray(termsResponse?.data) ? termsResponse.data : []).map((term: any) => (
                                <option key={term.id} value={term.id}>
                                    {term.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold mb-1">Assessment Type</label>
                        <select
                            value={type}
                            onChange={(e) => setType(e.target.value as AssessmentType)}
                            className="w-full h-10 rounded-md border border-light-border dark:border-dark-border bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                        >
                            <option value="QUIZ">Quiz</option>
                            <option value="EXAM">Exam</option>
                            <option value="ASSIGNMENT">Assignment</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold mb-1">Max Score</label>
                        <Input
                            type="number"
                            value={maxScore}
                            onChange={(e) => setMaxScore(Number(e.target.value))}
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold mb-1">Due Date (Optional)</label>
                        <Input
                            type="date"
                            value={dueDate}
                            onChange={(e) => setDueDate(e.target.value)}
                        />
                        <label className="mt-2 flex items-center gap-2 text-xs text-light-text-secondary cursor-pointer">
                            <input
                                type="checkbox"
                                checked={allowLateSubmissionAfterDue}
                                onChange={(e) => setAllowLateSubmissionAfterDue(e.target.checked)}
                                className="rounded border-light-border"
                            />
                            Allow submissions after due date (flagged late for grading)
                        </label>
                        {allowLateSubmissionAfterDue && (
                            <Input
                                type="number"
                                min={0}
                                className="mt-2"
                                placeholder="Late penalty points"
                                value={lateDuePenaltyPoints}
                                onChange={(e) => setLateDuePenaltyPoints(Math.max(0, Number(e.target.value) || 0))}
                            />
                        )}
                    </div>
                </div>

                <div className="p-4 border border-light-border dark:border-dark-border rounded-xl space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-orange-500" />
                            <h3 className="font-bold text-sm">Timed Exam</h3>
                        </div>
                        <label className="flex items-center gap-2 text-xs cursor-pointer">
                            <input
                                type="checkbox"
                                checked={isTimed}
                                onChange={(e) => setIsTimed(e.target.checked)}
                                className="rounded border-light-border"
                            />
                            Enable timer
                        </label>
                    </div>
                    {isTimed && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-1">
                            <div>
                                <label className="block text-xs font-semibold mb-1">Duration (minutes)</label>
                                <Input
                                    type="number"
                                    min={1}
                                    value={duration}
                                    onChange={(e) => setDuration(Number(e.target.value) || 30)}
                                />
                            </div>
                            <div className="space-y-2 text-xs">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={autoSubmitOnTimeout}
                                        onChange={(e) => setAutoSubmitOnTimeout(e.target.checked)}
                                        className="rounded border-light-border"
                                    />
                                    Auto-submit when time runs out
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={allowLateSubmissionAfterTimer}
                                        onChange={(e) => setAllowLateSubmissionAfterTimer(e.target.checked)}
                                        className="rounded border-light-border"
                                    />
                                    Allow manual submit after timer expires
                                </label>
                                {allowLateSubmissionAfterTimer && (
                                    <Input
                                        type="number"
                                        min={0}
                                        placeholder="Late timer penalty points"
                                        value={lateTimerPenaltyPoints}
                                        onChange={(e) => setLateTimerPenaltyPoints(Math.max(0, Number(e.target.value) || 0))}
                                    />
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* AI Helper Toggle */}
                <div className="p-4 border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/20 rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                            <Sparkles className="h-5 w-5" />
                            <h3 className="font-bold">AI Assessment Generator</h3>
                        </div>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setUseAi(!useAi)}
                            className="border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400"
                        >
                            {useAi ? 'Hide' : 'Use AI Helper'}
                        </Button>
                    </div>

                    {useAi && (
                        <div className="space-y-4 mt-4 animate-in fade-in slide-in-from-top-2">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="md:col-span-1">
                                    <label className="block text-xs font-semibold mb-1 uppercase tracking-wider opacity-70">Curriculum Coverage</label>
                                    <div className="relative">
                                        <button
                                            type="button"
                                            onClick={() => setShowWeeks(!showWeeks)}
                                            disabled={!selectedSubjectId || !termId}
                                            className="w-full h-10 flex items-center justify-between rounded-md border border-blue-200 dark:border-blue-800 bg-white dark:bg-dark-surface px-3 py-2 text-sm text-left disabled:opacity-50"
                                        >
                                            <div className="flex items-center gap-2 truncate">
                                                <BookOpen className="h-4 w-4 text-blue-500" />
                                                <span>
                                                    {selectedWeeks.length === 0 
                                                        ? "Select weeks (Scheme of Work)" 
                                                        : `${selectedWeeks.length} week(s) selected`}
                                                </span>
                                            </div>
                                            {showWeeks ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                        </button>

                                        {showWeeks && (
                                            <div className="absolute z-50 mt-1 w-full max-h-60 overflow-y-auto rounded-md border border-light-border dark:border-dark-border bg-white dark:bg-dark-surface shadow-lg p-2 space-y-1">
                                                {isLoadingCurriculum ? (
                                                    <div className="p-4 text-center">
                                                        <Loader2 className="h-5 w-5 animate-spin mx-auto text-blue-500" />
                                                        <p className="text-xs mt-2">Fetching Scheme of Work...</p>
                                                    </div>
                                                ) : curriculumItems.length > 0 ? (
                                                    curriculumItems.map((item) => (
                                                        <div 
                                                            key={item.id}
                                                            onClick={() => {
                                                                setSelectedWeeks(prev => 
                                                                    prev.includes(item.weekNumber) 
                                                                        ? prev.filter(w => w !== item.weekNumber)
                                                                        : [...prev, item.weekNumber]
                                                                );
                                                            }}
                                                            className={`flex items-start gap-2 p-2 rounded-md hover:bg-light-surface dark:hover:bg-dark-border cursor-pointer transition-colors ${
                                                                selectedWeeks.includes(item.weekNumber) ? 'bg-blue-50 dark:bg-blue-900/30' : ''
                                                            }`}
                                                        >
                                                            <div className={`mt-0.5 h-4 w-4 rounded border flex items-center justify-center shrink-0 ${
                                                                selectedWeeks.includes(item.weekNumber) 
                                                                    ? 'bg-blue-600 border-blue-600 text-white' 
                                                                    : 'border-light-border dark:border-dark-border'
                                                            }`}>
                                                                {selectedWeeks.includes(item.weekNumber) && <CheckCircle2 className="h-3 w-3" />}
                                                            </div>
                                                            <div className="text-xs">
                                                                <span className="font-bold text-blue-600 dark:text-blue-400">Week {item.weekNumber}:</span>
                                                                <p className="line-clamp-2">{item.topic}</p>
                                                            </div>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className="p-4 text-center">
                                                        <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary">
                                                            No curriculum found for this selection. Try selecting a subject and term first.
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="md:col-span-1">
                                    <label className="block text-xs font-semibold mb-1 uppercase tracking-wider opacity-70">Number of Questions</label>
                                    <Input
                                        type="number"
                                        value={aiCount}
                                        onChange={(e) => setAiCount(Number(e.target.value))}
                                        min={1}
                                        max={30}
                                    />
                                </div>
                            </div>

                            {selectedWeeks.length > 0 && (
                                <div className="p-3 bg-white dark:bg-black/20 rounded-lg border border-blue-100 dark:border-blue-900 animate-in zoom-in-95 duration-200">
                                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400 mb-2">Selected Topics Coverage</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {curriculumItems.filter(i => selectedWeeks.includes(i.weekNumber)).map(i => (
                                            <span key={i.id} className="text-[10px] px-2 py-0.5 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-full border border-blue-200 dark:border-blue-800">
                                                W{i.weekNumber}: {i.topic}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <Button
                                type="button"
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white gap-2 h-11"
                                onClick={handleAiGenerate}
                                isLoading={isGeneratingAi}
                                disabled={selectedWeeks.length === 0}
                            >
                                <Sparkles className="h-4 w-4" />
                                Generate Assessment Questions
                            </Button>
                            <p className="text-[10px] text-center text-light-text-secondary dark:text-dark-text-secondary">
                                Lois will analyze your Scheme of Work and generate questions that match your learning objectives.
                            </p>
                        </div>
                    )}
                </div>

                {/* Questions Section */}
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-lg">Questions ({questions.length})</h3>
                        <Button type="button" variant="outline" size="sm" onClick={addQuestion}>
                            <Plus className="h-4 w-4 mr-2" /> Add Question
                        </Button>
                    </div>

                    <div className="space-y-6">
                        {questions.map((q, idx) => (
                            <div key={idx} className="p-4 border border-light-border dark:border-dark-border rounded-xl bg-light-surface/50 dark:bg-dark-surface/50 relative group">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="absolute top-2 right-2 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={() => removeQuestion(idx)}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>

                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                        <div className="md:col-span-3">
                                            <label className="block text-xs font-semibold mb-1 opacity-70">Question {idx + 1}</label>
                                            <Input
                                                value={q.text}
                                                onChange={(e) => updateQuestion(idx, 'text', e.target.value)}
                                                placeholder="Enter question text"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold mb-1 opacity-70">Points</label>
                                            <Input
                                                type="number"
                                                value={q.points}
                                                onChange={(e) => updateQuestion(idx, 'points', Number(e.target.value))}
                                                min={0}
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold mb-1 opacity-70">Question Type</label>
                                        <div className="flex gap-2">
                                            {['MULTIPLE_CHOICE', 'SHORT_ANSWER', 'ESSAY'].map((t) => (
                                                <button
                                                    key={t}
                                                    type="button"
                                                    onClick={() => updateQuestion(idx, 'type', t as QuestionType)}
                                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${q.type === t
                                                            ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                                                            : 'border-light-border dark:border-dark-border hover:bg-light-surface dark:hover:bg-dark-surface'
                                                        }`}
                                                >
                                                    {t.replace('_', ' ')}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {q.type === 'MULTIPLE_CHOICE' && (
                                        <div className="space-y-3 pl-4 border-l-2 border-blue-200 dark:border-blue-800">
                                            <label className="block text-xs font-semibold opacity-70 italic">Options (Select the correct one)</label>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                {q.options.map((opt, optIdx) => (
                                                    <div key={optIdx} className="flex items-center gap-2">
                                                        <input
                                                            type="radio"
                                                            name={`correct-${idx}`}
                                                            checked={q.correctAnswer === opt && opt !== ''}
                                                            onChange={() => updateQuestion(idx, 'correctAnswer', opt)}
                                                            className="w-4 h-4 text-blue-600"
                                                            required={q.type === 'MULTIPLE_CHOICE'}
                                                        />
                                                        <Input
                                                            value={opt}
                                                            onChange={(e) => {
                                                                const newOpts = [...q.options];
                                                                newOpts[optIdx] = e.target.value;
                                                                updateQuestion(idx, 'options', newOpts);
                                                            }}
                                                            placeholder={`Option ${String.fromCharCode(65 + optIdx)}`}
                                                            className="h-8"
                                                            required={q.type === 'MULTIPLE_CHOICE'}
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {(q.type === 'SHORT_ANSWER' || q.type === 'ESSAY') && (
                                        <div>
                                            <label className="block text-xs font-semibold mb-1 opacity-70">Correct Answer / Sample Answer</label>
                                            <Input
                                                value={q.correctAnswer}
                                                onChange={(e) => updateQuestion(idx, 'correctAnswer', e.target.value)}
                                                placeholder="What are you looking for in the answer?"
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    {questions.length === 0 && (
                        <div className="text-center py-12 border-2 border-dashed border-light-border dark:border-dark-border rounded-xl">
                            <p className="text-light-text-secondary dark:text-dark-text-secondary mb-4">No questions added yet.</p>
                            <Button type="button" variant="outline" onClick={addQuestion}>
                                <Plus className="h-4 w-4 mr-2" /> Add First Question
                            </Button>
                        </div>
                    )}
                </div>

                <div className="flex justify-end gap-3 pt-6 border-t border-light-border dark:border-dark-border">
                    <Button variant="ghost" onClick={onClose} type="button">Cancel</Button>
                    <Button type="submit" className="px-8" isLoading={isCreating}>
                        Save Assessment
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
