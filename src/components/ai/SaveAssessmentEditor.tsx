import React, { useState, useEffect } from 'react';
import { useCreateAssessmentMutation } from '@/lib/store/api/schoolAdminApi';
import { useTeacherDashboard } from '@/hooks/useTeacherDashboard';
import { Button } from '@/components/ui/Button';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Plus, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

export const SaveAssessmentEditor = ({ 
  toolName, 
  initialData, 
  schoolId, 
  conversationId,
  variant = 'default' 
}: { 
  toolName: string; 
  initialData: any; 
  schoolId: string; 
  conversationId?: string | null;
  variant?: 'default' | 'minimal' 
}) => {
  const router = useRouter();
  const { classes, isLoadingClasses: classesLoading, isReady } = useTeacherDashboard();
  const [createAssessment, { isLoading: isSaving }] = useCreateAssessmentMutation();
  const [isEditing, setIsEditing] = useState(false); // Default to closed to avoid squishing in chat
  const [publishImmediately, setPublishImmediately] = useState(false);
  const [assessmentData, setAssessmentData] = useState<any>(null);

  useEffect(() => {
    // Normalize OpenAI JSON string to Object if needed
    try {
      if (typeof initialData === 'string') {
        setAssessmentData(JSON.parse(initialData));
      } else {
        setAssessmentData(initialData);
      }
    } catch (e) {
      setAssessmentData(initialData);
    }
  }, [initialData]);

  const [formData, setFormData] = useState({ classId: '', title: '' });

  useEffect(() => {
    if (assessmentData?.title && !formData.title) {
       setFormData(f => ({ ...f, title: assessmentData.title || (toolName === 'generate_quiz' ? 'New Quiz' : 'New Assessment') }));
    } else if (!formData.title) {
       setFormData(f => ({ ...f, title: toolName === 'generate_quiz' ? 'New Quiz' : 'New Assessment' }));
    }
  }, [assessmentData, formData.title, toolName]);

  // Auto-select class if unique
  useEffect(() => {
    if (classes?.length === 1 && !formData.classId) {
      setFormData(f => ({ ...f, classId: classes[0].id }));
    }
  }, [classes, formData.classId]);

  const handleProceedToEdit = () => {
    // Determine the most up-to-date data
    const rawData = assessmentData || (typeof initialData === 'string' ? JSON.parse(initialData) : initialData);
    
    // Recursive deep-search for 'questions' array in case of deep nesting from AI
    const findQuestions = (obj: any): any[] => {
      if (Array.isArray(obj)) return obj;
      if (!obj || typeof obj !== 'object') return [];
      if (Array.isArray(obj.questions)) return obj.questions;
      if (Array.isArray(obj.quiz_questions)) return obj.quiz_questions;
      
      for (const key in obj) {
        const nested = findQuestions(obj[key]);
        if (nested.length > 0) return nested;
      }
      return [];
    };

    const questionsList = findQuestions(rawData);
    const chosenType = String(rawData?.type || '').toUpperCase();
    const type = chosenType === 'EXAM' || chosenType === 'QUIZ' || chosenType === 'ASSIGNMENT'
      ? chosenType
      : toolName === 'generate_quiz'
        ? 'QUIZ'
        : 'ASSIGNMENT';
    
    // Save AI context to localStorage
    const context = {
      questions: questionsList,
      title: formData.title || rawData.title || (type === 'QUIZ' ? 'New Quiz' : type === 'EXAM' ? 'New Exam' : 'New Assessment'),
      description: rawData.description || '',
      classId: formData.classId || rawData.classId || '',
      className: rawData.className || '',
      gradeLevel: rawData.gradeLevel || '',
      type,
      dueDate: rawData.dueDate || '',
      subject: rawData.subject || rawData.subjectName || '',
      subjectId: rawData.subjectId || '',
      toolName,
      conversationId
    };
    
    console.log('[Lois] Explicitly Packing Context:', context);
    localStorage.setItem('agora_ai_assessment_context', JSON.stringify(context));
    // Redirect with Next router to maintain SPA state
    router.push(`/dashboard/teacher/assessments/new?source=ai`);
  };

  if (!assessmentData) return <div className="p-4 text-xs text-emerald-600">Loading editor...</div>;
  const payload = assessmentData?.data && !Array.isArray(assessmentData.data) ? assessmentData.data : assessmentData;
  if (payload?.blocked || payload?.needsScope || payload?.error) return null;
  const questionsList = Array.isArray(assessmentData) ? assessmentData : assessmentData.questions || payload?.questions || [];
  if (!questionsList.length) return null;
  const typeLabel = String(payload?.type || '').toUpperCase() === 'EXAM'
    ? 'Exam'
    : String(payload?.type || '').toUpperCase() === 'QUIZ' || toolName === 'generate_quiz'
      ? 'Quiz'
      : 'Assignment';

  return (
    <div className="bg-white dark:bg-black/30 w-full rounded-2xl border border-emerald-200 dark:border-emerald-500/20 overflow-hidden shadow-sm mt-2 transition-all duration-300">
      <div className="p-4 flex flex-col md:flex-row gap-3 justify-between md:items-center bg-emerald-50/50 dark:bg-emerald-500/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 dark:bg-emerald-400/10 flex items-center justify-center shrink-0">
             <Sparkles className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h3 className="font-bold text-[#111827] dark:text-emerald-300 text-sm md:text-base">{formData.title || 'Generated Assessment'}</h3>
            <p className="text-[10px] uppercase font-black text-emerald-600 dark:text-emerald-400/70 tracking-widest">{typeLabel} · {questionsList?.length || 0} questions</p>
          </div>
        </div>
        <div className="flex gap-2 items-center">
          <Button isFlat size="sm" onClick={handleProceedToEdit} className="h-8 px-3.5 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-700 dark:text-indigo-400 gap-1.5 rounded-lg border border-indigo-200/50 dark:border-indigo-500/15 font-bold text-[10px] uppercase tracking-wider transition-colors">
            <Sparkles size={12} />
            Edit in Full Screen
          </Button>
        </div>
      </div>

      <AnimatePresence>
        {isEditing && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden bg-[#f8fafc] dark:bg-white/[0.02] border-t border-emerald-100 dark:border-white/5">
            <div className="p-4 space-y-4 text-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] uppercase font-bold text-[#4b5563] dark:text-white/40 mb-1.5 block tracking-wider">Title</label>
                  <input type="text" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} className="w-full h-10 rounded-xl border border-[#e2e8f0] dark:border-white/10 bg-white dark:bg-black/50 px-4 text-sm font-medium text-[#111827] dark:text-white focus:border-indigo-500 transition-colors outline-none" />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-[#4b5563] dark:text-white/40 mb-1.5 block tracking-wider">Quick Class Verification</label>
                  {!classesLoading && classes?.length === 1 ? (
                    <div className="h-10 flex items-center px-4 font-black text-emerald-600 dark:text-emerald-400 bg-white dark:bg-black/50 rounded-xl border border-emerald-100 dark:border-white/10">
                      {classes[0].name}
                    </div>
                  ) : (
                    <select value={formData.classId} onChange={e => setFormData({ ...formData, classId: e.target.value })} className="w-full h-10 rounded-xl border border-[#e2e8f0] dark:border-white/10 bg-white dark:bg-black/50 px-4 text-sm font-medium text-[#111827] dark:text-white outline-none focus:border-indigo-500 transition-colors">
                      <option value="">Select a class...</option>
                      {classes?.map((c: any) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              <div className="mt-6">
                <p className="text-[10px] font-black uppercase text-[#4b5563] dark:text-white/30 mb-3 border-b border-[#e2e8f0] dark:border-white/5 pb-2">Questions Preview</p>
                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 scrollbar-thin">
                  {questionsList.map((q: any, i: number) => (
                    <div key={i} className="p-4 bg-white dark:bg-black/40 rounded-2xl border border-[#e2e8f0] dark:border-white/5 shadow-sm">
                      <div className="flex justify-between items-start gap-4 mb-2">
                        <textarea
                          value={q.question}
                          onChange={(e) => {
                            const newQs = [...questionsList];
                            newQs[i].question = e.target.value;
                            if (Array.isArray(assessmentData)) setAssessmentData(newQs);
                            else setAssessmentData({ ...assessmentData, questions: newQs });
                          }}
                          className="w-full bg-transparent border-none outline-none font-bold text-[#111827] dark:text-white/90 resize-none overflow-hidden text-sm leading-relaxed"
                          rows={2}
                        />
                        <div className="shrink-0 flex flex-col items-center">
                           <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-500 mb-1">PTS</span>
                           <input type="number" value={q.points || 1} onChange={(e) => {
                              const newQs = [...questionsList];
                              newQs[i].points = Number(e.target.value);
                              if (Array.isArray(assessmentData)) setAssessmentData(newQs);
                              else setAssessmentData({ ...assessmentData, questions: newQs });
                            }} className="w-12 h-8 text-center rounded-lg bg-[#f1f5f9] dark:bg-white/10 text-xs font-bold text-[#111827] dark:text-white" min="1" title="Points" />
                        </div>
                      </div>
                      {q.options?.length > 0 && (
                        <div className="space-y-2 pl-4 mt-3 border-l-2 border-[#e2e8f0] dark:border-white/5">
                          {q.options.map((opt: string, optIdx: number) => (
                            <div key={optIdx} className="flex gap-3 items-center text-xs">
                              <div className={cn("w-3 h-3 rounded-full border-2", q.correctAnswer === opt ? "bg-emerald-500 border-emerald-500" : "border-[#cbd5e1] dark:border-white/10")} />
                              <span className={cn("flex-1 font-medium", q.correctAnswer === opt ? "font-bold text-emerald-600 dark:text-emerald-400" : "text-[#4b5563] dark:text-white/40")}>{opt}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-6 flex flex-col md:flex-row justify-between items-center gap-4 border-t border-[#e2e8f0] dark:border-white/5">
                 <p className="text-[10px] text-[#64748b] dark:text-white/20 italic max-w-xs leading-relaxed font-medium">
                   Quick review complete. Click below to enter the full-screen editor where you can add images, timers, and advanced settings.
                 </p>

                <Button onClick={handleProceedToEdit} className={cn(
                  "w-full md:w-auto h-12 px-10 rounded-2xl font-black transition-all shadow-xl text-white bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/20 uppercase tracking-wider text-xs"
                )}>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Continue to Full Editor
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
