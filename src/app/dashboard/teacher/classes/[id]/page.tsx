'use client';

import React, { useState, useMemo } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useSelector, useDispatch } from 'react-redux';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { FadeInUp } from '@/components/ui/FadeInUp';
import {
  BookOpen,
  Users,
  FileText,
  Smartphone,
  ArrowLeft,
  Search,
  Calendar,
  Award,
  Clock,
  CheckCircle2,
  XCircle,
  Plus,
  Download,
  Upload,
  Loader2,
  AlertCircle,
  QrCode,
  Trash2,
  ChevronDown,
  ChevronUp,
  LayoutDashboard,
  FileCheck,
  CheckSquare,
  ListChecks,
  BookMarked,
  ChevronRight,
  Edit,
  X,
  GraduationCap
} from 'lucide-react';
import {
  useGetClassByIdQuery,
  useGetMyTeacherSchoolQuery,
  useGetActiveSessionQuery,
  useGetClassStudentsQuery,
  useGetClassGradesQuery,
  useGetClassGradesGroupedByStudentsQuery,
  useDeleteGradeMutation,
  useUpdateGradeMutation,
  useGetCurriculumForClassQuery,
  useGetTimetableForClassQuery,
  useGetSessionsQuery,
  useGetClassAssessmentsQuery,
  useGetTeacherSubjectsForClassQuery,
  useMarkBulkAttendanceMutation,
  useMarkAttendanceMutation,
  useGetClassAttendanceQuery,
  useDeleteAssessmentMutation,
  type StudentWithEnrollment,
  type Grade,
  type GradeType,
  type Assessment
} from '@/lib/store/api/schoolAdminApi';
import { useClassResources } from '@/hooks/useClassResources';
import { BulkGradeEntryModal } from '@/components/modals/BulkGradeEntryModal';
import { GradeEntryModal } from '@/components/modals/GradeEntryModal';
import { TeacherTimetableGrid } from '@/components/timetable/TeacherTimetableGrid';
import { SchemeOfWorkView } from '@/components/scheme-of-work/SchemeOfWorkView';
import toast from 'react-hot-toast';
import { safeDownload } from '@/lib/utils/download';
import { cn } from '@/lib/utils';
import { useSchoolType } from '@/hooks/useSchoolType';
import { useRuntimePolicies } from '@/hooks/useRuntimePolicies';
import { getTerminology } from '@/lib/utils/terminology';
import { AgoraAiTools } from '@/components/ai/AgoraAiTools';
import { FloatingAiCta } from '@/components/ai/FloatingAiCta';
import { AiChatDrawer } from '@/components/ai/AiChatDrawer';
import { Sparkles } from 'lucide-react';
import { LiveStatusBadge } from '@/components/ui/LiveStatusBadge';
import { ConfirmModal } from '@/components/ui/Modal';
import { StatCard } from '@/components/dashboard/StatCard';
import { ActivityLog } from '@/components/dashboard/ActivityLog';
import { useTeacherDashboard } from '@/hooks/useTeacherDashboard';

type TabType = 'overview' | 'curriculum' | 'students' | 'grades' | 'timetable' | 'resources' | 'assessments' | 'roll-call' | 'scheme-of-work';

export default function ClassDetailPage() {
  const params = useParams();
  const router = useRouter();
  const classId = params.id as string;
  const searchParams = useSearchParams();
  const urlTab = searchParams.get('tab') as TabType;
  const [activeTab, setActiveTab] = useState<TabType>(urlTab || 'overview');

  // Sync state with URL changes (for browser back/forward)
  React.useEffect(() => {
    if (urlTab && urlTab !== activeTab) {
      setActiveTab(urlTab);
    }
  }, [urlTab]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showBulkGradeModal, setShowBulkGradeModal] = useState(false);
  const [showGradeModal, setShowGradeModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentWithEnrollment | null>(null);
  const [selectedGrade, setSelectedGrade] = useState<Grade | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [gradeTypeFilter, setGradeTypeFilter] = useState<GradeType | ''>('');
  const [termFilter, setTermFilter] = useState<string>('');
  const [sequenceFilter, setSequenceFilter] = useState<number | ''>('');
  const [selectedTimetableTermId, setSelectedTimetableTermId] = useState<string>('');
  const [showUploadResourceModal, setShowUploadResourceModal] = useState(false);
  const [assessmentToDelete, setAssessmentToDelete] = useState<Assessment | null>(null);
  const [assessmentTermFilter, setAssessmentTermFilter] = useState<string>('');
  const [showDeleteAssessmentModal, setShowDeleteAssessmentModal] = useState(false);
  const [showAiChat, setShowAiChat] = useState(false);

  const { currentType } = useSchoolType();
  const terminology = getTerminology(currentType) || {
    courses: 'Classes',
    courseSingular: 'Class',
    staff: 'Teachers',
    staffSingular: 'Teacher',
    periods: 'Terms',
    periodSingular: 'Term',
    subjects: 'Subjects',
    subjectSingular: 'Subject',
  };

  // Get school ID from Redux auth state (populated during login)
  const { user } = useSelector((state: any) => state.auth);
  const schoolId = user?.schoolId;

  // Get class data first - we need the class type to fetch the correct active session
  const { data: classResponse, isLoading, error } = useGetClassByIdQuery(
    { schoolId: schoolId!, classId },
    { skip: !schoolId || !classId }
  );

  const classData = classResponse?.data;

  // Derive school type from the class being viewed (more accurate than localStorage)
  const classType = classData?.type as 'PRIMARY' | 'SECONDARY' | 'TERTIARY' | undefined;

  // Get active session - use the class type to get the correct session for this school type
  const { data: activeSessionResponse, isLoading: isLoadingActiveSession } = useGetActiveSessionQuery(
    { schoolId: schoolId!, schoolType: classType || currentType || undefined },
    { skip: !schoolId }
  );
  const activeSession = activeSessionResponse?.data;

  // Use teacher dashboard hook to determine if this is the teacher's form class
  const { formClass, teacher: teacherProfile } = useTeacherDashboard();
  const isFormTeacher = formClass?.id === classId;

  // Get all sessions for timetable term selector
  const { data: sessionsResponse } = useGetSessionsQuery(
    { schoolId: schoolId! },
    { skip: !schoolId || activeTab !== 'timetable' }
  );

  // Get students in class (always fetch so they're available for grade entry modal)
  const { data: studentsResponse, isLoading: isLoadingStudents } = useGetClassStudentsQuery(
    { schoolId: schoolId!, classId },
    { skip: !schoolId || !classId }
  );

  // Get teacher's subjects and roles for this class to determine permissions
  const { data: teacherSubjectsResponse } = useGetTeacherSubjectsForClassQuery(
    { classId },
    { skip: !classId }
  );

  const teacherSubjects = teacherSubjectsResponse?.data?.subjects || [];
  const canGradeAll = teacherSubjectsResponse?.data?.canGradeAllSubjects || false;
  const isPrimaryTeacher = teacherSubjectsResponse?.data?.isPrimaryTeacher || false;

  // READ-ONLY LOGIC:
  // In Secondary schools, if a teacher is a Form Teacher but has NO subjects assigned in this class,
  // they should only have view access to academic materials (assessments, curriculum, etc.)
  const isReadOnly = useMemo(() => {
    // If they have "manage all" permissions or are the primary/subject teacher, they are NOT read-only
    if (canGradeAll || isPrimaryTeacher || teacherSubjects.length > 0) return false;
    
    // If they are ONLY the form teacher (identified by dashboard context), they are read-only
    return isFormTeacher;
  }, [canGradeAll, isPrimaryTeacher, teacherSubjects.length, isFormTeacher]);

  // Get grades for class
  const { data: gradesResponse, isLoading: isLoadingGrades, refetch: refetchGrades } = useGetClassGradesQuery(
    {
      schoolId: schoolId!,
      classId,
      gradeType: gradeTypeFilter || undefined,
      termId: termFilter || undefined,
    },
    { skip: !schoolId || !classId || (activeTab !== 'grades' && activeTab !== 'overview') }
  );

  // Get student-grouped grades for the new UI
  const { data: studentGradesResponse, isLoading: isLoadingStudentGrades } = useGetClassGradesGroupedByStudentsQuery(
    {
      schoolId: schoolId!,
      classId,
      gradeType: gradeTypeFilter || undefined,
      termId: termFilter || undefined,
    },
    { skip: !schoolId || !classId || (activeTab !== 'grades' && activeTab !== 'overview') }
  );

  // State for expanded student card
  const [expandedStudentId, setExpandedStudentId] = useState<string | null>(null);

  // Get assessments for class
  const { data: assessmentsResponse, isLoading: isLoadingAssessments } = useGetClassAssessmentsQuery(
    {
      schoolId: schoolId!,
      classId,
      termId: assessmentTermFilter || activeSession?.term?.id || undefined,
    },
    { skip: !schoolId || !classId || (activeTab !== 'assessments' && activeTab !== 'overview') }
  );

  const assessments = assessmentsResponse?.data || []; // Use data from ResponseDto

  const [deleteGrade, { isLoading: isDeleting }] = useDeleteGradeMutation();
  const [deleteAssessment, { isLoading: isDeletingAssessment }] = useDeleteAssessmentMutation();
  const [updateGrade, { isLoading: isPublishing }] = useUpdateGradeMutation();

  const handleDeleteAssessment = async () => {
    if (!assessmentToDelete || !schoolId) return;

    if ((assessmentToDelete._count?.submissions ?? 0) > 0) {
      toast.error('Cannot delete an assessment that already has student submissions.');
      setShowDeleteAssessmentModal(false);
      return;
    }

    try {
      await deleteAssessment({
        schoolId,
        assessmentId: assessmentToDelete.id,
      }).unwrap();
      toast.success('Assessment deleted successfully');
      setShowDeleteAssessmentModal(false);
      setAssessmentToDelete(null);
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to delete assessment');
    }
  };

  const handlePublishGrade = async (gradeId: string) => {
    if (!schoolId) return;

    try {
      await updateGrade({
        schoolId,
        gradeId,
        gradeData: { isPublished: true },
      }).unwrap();
      toast.success('Grade published successfully');
      refetchGrades();
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to publish grade');
    }
  };

  // Get curriculum for class (falls back to published SchemeOfWork on the backend)
  const { data: curriculumResponse, isLoading: isLoadingCurriculum, refetch: refetchCurriculum } = useGetCurriculumForClassQuery(
    {
      schoolId: schoolId!,
      classId,
      // Prefer an explicit subject when present; otherwise backend picks a published scheme for the level
      subject: classResponse?.data?.teachers?.[0]?.subject || undefined,
      academicYear: classResponse?.data?.academicYear || activeSession?.session?.name,
      termId: activeSession?.term?.id || undefined,
    },
    { skip: !schoolId || !classId || (activeTab !== 'curriculum' && activeTab !== 'overview') }
  );
  const students = studentsResponse?.data || [];
  const allGrades = gradesResponse?.data || [];

  // Filter grades by sequence on frontend
  const grades = useMemo(() => {
    if (sequenceFilter === '') return allGrades;
    return allGrades.filter((grade: any) => grade.sequence === sequenceFilter);
  }, [allGrades, sequenceFilter]);

  // Get unique sequence numbers from grades for filter dropdown
  const uniqueSequences = useMemo(() => {
    const sequences = allGrades
      .map((g: any) => g.sequence)
      .filter((s: number | null | undefined): s is number => s !== null && s !== undefined && typeof s === 'number')
      .sort((a: number, b: number) => a - b);
    return Array.from(new Set(sequences));
  }, [allGrades]);

  // Extract all terms from sessions for timetable term selector - filtered by school type and deduplicated
  // Use classType (from the class being viewed) as primary, fallback to currentType (from localStorage)
  const effectiveSchoolType: 'PRIMARY' | 'SECONDARY' | 'TERTIARY' | null = classType || currentType || null;

  const timetableTerms = useMemo(() => {
    if (!sessionsResponse?.data) return [];

    // Filter sessions by the class's school type to show the correct terms
    const filteredSessions = sessionsResponse.data.filter((session: any) => {
      if (!effectiveSchoolType) return !session.schoolType;
      return session.schoolType === effectiveSchoolType;
    });

    // Deduplicate sessions by name (keep first/latest)
    const uniqueSessionsMap = new Map<string, any>();
    filteredSessions.forEach((session: any) => {
      if (!uniqueSessionsMap.has(session.name)) {
        uniqueSessionsMap.set(session.name, session);
      }
    });

    const terms: Array<{ id: string; name: string; sessionName: string }> = [];
    Array.from(uniqueSessionsMap.values()).forEach((session: any) => {
      if (session.terms && Array.isArray(session.terms)) {
        session.terms.forEach((term: any) => {
          terms.push({
            id: term.id,
            name: term.name,
            sessionName: session.name,
          });
        });
      }
    });
    return terms;
  }, [sessionsResponse, effectiveSchoolType]);

  // Determine which term to use for timetable
  const timetableTermId = selectedTimetableTermId || activeSession?.term?.id || '';

  const filteredStudents = useMemo(() => {
    if (!searchQuery) return students;

    const query = searchQuery.toLowerCase();
    return students.filter(
      (student: StudentWithEnrollment) =>
        student.firstName?.toLowerCase().includes(query) ||
        student.lastName?.toLowerCase().includes(query) ||
        student.uid?.toLowerCase().includes(query) ||
        (student.middleName?.toLowerCase().includes(query) ?? false)
    );
  }, [students, searchQuery]);

  // Get class resources using the hook
  const {
    resources,
    isLoading: isLoadingResources,
    isUploading: isUploadingResource,
    isDeleting: isDeletingResource,
    selectedFile,
    resourceDescription,
    setSelectedFile,
    setResourceDescription,
    handleUpload,
    handleDelete: handleDeleteResource,
    refetchResources,
  } = useClassResources({
    schoolId,
    classId,
    activeTab,
  });

  // Logic to synthesize an activity feed from available data
  const activityItems = useMemo(() => {
    const items: { type: string; description: string; timestamp: string }[] = [];

    if (gradesResponse?.data) {
      const recentGrades = [...gradesResponse.data]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5);

      recentGrades.forEach(grade => {
        items.push({
          type: 'Graded',
          description: `${grade.student?.firstName} ${grade.student?.lastName} graded for ${grade.assessmentName || grade.subject}`,
          timestamp: grade.createdAt
        });
      });
    }

    if (assessmentsResponse?.data) {
      const recentAssessments = [...assessmentsResponse.data]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 3);

      recentAssessments.forEach(assessment => {
        items.push({
          type: 'Assessment Published',
          description: `New ${assessment.type.toLowerCase()} "${assessment.title}" published`,
          timestamp: assessment.createdAt
        });
      });
    }

    if (resources) {
      const recentResources = [...resources]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 3);

      recentResources.forEach(resource => {
        items.push({
          type: 'Resource Uploaded',
          description: `New resource "${resource.name}" uploaded`,
          timestamp: resource.createdAt
        });
      });
    }

    return items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [gradesResponse, assessmentsResponse, resources]);

  // Determine the next topic in the curriculum
  const nextCurriculumTopic = useMemo(() => {
    if (!curriculumResponse?.data?.items) return null;
    return curriculumResponse.data.items.find((item: any) => 
      item.status === 'PENDING' || item.status === 'IN_PROGRESS'
    );
  }, [curriculumResponse]);

  // Build tabs dynamically based on available plugins
  const tabs: { id: TabType; label: string; icon: React.ReactNode; available: boolean }[] = [
    { id: 'overview', label: 'Overview', icon: <LayoutDashboard className="h-4 w-4" />, available: true },
    { id: 'timetable', label: 'Timetable', icon: <Clock className="h-4 w-4" />, available: true },
    { id: 'students', label: 'Students', icon: <Users className="h-4 w-4" />, available: true },
    { id: 'grades', label: 'Grades', icon: <Award className="h-4 w-4" />, available: true },
    { id: 'assessments', label: 'Assessments', icon: <FileCheck className="h-4 w-4" />, available: true },
    { id: 'roll-call', label: 'Roll Call', icon: <CheckSquare className="h-4 w-4" />, available: true },
    { id: 'scheme-of-work', label: 'Scheme of Work', icon: <ListChecks className="h-4 w-4" />, available: true },
    // Curriculum tab hidden — Scheme of Work is the teacher-facing source of truth
    // { id: 'curriculum', label: 'Curriculum', icon: <BookMarked className="h-4 w-4" />, available: true },
    { id: 'resources', label: 'Resources', icon: <FileText className="h-4 w-4" />, available: true },
  ];

  if (isLoading) {
    return (
      <ProtectedRoute roles={['TEACHER']}>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 text-light-text-muted dark:text-dark-text-muted mx-auto mb-4 animate-spin" />
            <p className="text-light-text-secondary dark:text-dark-text-secondary">
              Loading {terminology.courseSingular.toLowerCase()} details...
            </p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (error || !classData) {
    return (
      <ProtectedRoute roles={['TEACHER']}>
        <div className="w-full">
          <Link href={classType === 'PRIMARY' ? '/dashboard/teacher/overview' : '/dashboard/teacher/classes'}>
            <Button variant="ghost" size="sm" className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              {classType === 'PRIMARY' ? 'Back to Overview' : `Back to ${terminology.courses}`}
            </Button>
          </Link>
          <div className="text-center py-12">
            <AlertCircle className="h-12 w-12 text-light-text-muted dark:text-dark-text-muted mx-auto mb-4" />
            <p className="text-light-text-secondary dark:text-dark-text-secondary">
              {terminology.courseSingular} not found or error loading details.
            </p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute roles={['TEACHER']}>
      <div className="w-full">
        {/* Header */}
        <FadeInUp from={{ opacity: 0, y: -20 }} to={{ opacity: 1, y: 0 }} duration={0.5} className="mb-8">
          <Link href={classType === 'PRIMARY' ? '/dashboard/teacher/overview' : '/dashboard/teacher/classes'}>
            <Button variant="ghost" size="sm" className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              {classType === 'PRIMARY' ? 'Back to Overview' : `Back to ${terminology.courses}`}
            </Button>
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="font-bold text-light-text-primary dark:text-dark-text-primary" style={{ fontSize: 'var(--text-page-title)' }}>
                  {classData.name}
                </h1>
                {isFormTeacher && (
                  <span className={cn(
                    "px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded border",
                    classType === 'SECONDARY' 
                      ? "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800"
                      : "bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800"
                  )}>
                    {classType === 'SECONDARY' ? 'My Form' : 'My Class'}
                  </span>
                )}
              </div>
              <p className="text-light-text-secondary dark:text-dark-text-secondary" style={{ fontSize: 'var(--text-page-subtitle)' }}>
                {classData.code && `${classData.code} • `}
                {classData.classLevel && `${classData.classLevel} • `}
                {classData.academicYear}
                {activeSession?.term && ` • ${activeSession.term.name}`}
              </p>
            </div>
          </div>
        </FadeInUp>

        {/* Tabs */}
        <div className="mb-6 border-b border-light-border dark:border-dark-border">
          <div className="flex space-x-1 overflow-x-auto">
            {tabs.filter(tab => tab.available).map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  const url = new URL(window.location.href);
                  url.searchParams.set('tab', tab.id);
                  window.history.pushState({}, '', url);
                }}
                className={`flex items-center gap-2 px-4 py-3 font-semibold transition-colors whitespace-nowrap ${activeTab === tab.id
                  ? 'border-b-2 border-blue-600 dark:border-blue-400 text-blue-600 dark:text-blue-400'
                  : 'text-light-text-secondary dark:text-dark-text-secondary hover:text-light-text-primary dark:hover:text-dark-text-primary'
                  }`}
                style={{ fontSize: 'var(--text-tiny)' }}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <FadeInUp from={{ opacity: 0, y: 10 }} to={{ opacity: 1, y: 0 }} duration={0.2}>
          <div className="mt-6">
            {activeTab === 'overview' && (
              <div className="space-y-8 pb-10">
                {/* Quick Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <StatCard
                    title="Class Enrollment"
                    value={classData?.studentsCount || 0}
                    icon={<Users className="h-5 w-5" />}
                    description="Total students enrolled"
                    color="blue"
                  />
                  <StatCard
                    title="Academic Progress"
                    value={`Week ${activeSession?.term?.currentWeek || '1'}`}
                    icon={<Calendar className="h-5 w-5" />}
                    description={activeSession?.term ? `${activeSession.term.name}` : 'Current term'}
                    color="purple"
                  />
                  <StatCard
                    title="Total Resources"
                    value={resources?.length || 0}
                    icon={<BookOpen className="h-5 w-5" />}
                    description="Study materials uploaded"
                    color="green"
                  />
                  <StatCard
                    title="Assessments"
                    value={assessments?.length || 0}
                    icon={<FileCheck className="h-5 w-5" />}
                    description="Total published assessments"
                    color="indigo"
                  />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Activity Log */}
                  <div className="lg:col-span-2 space-y-6">
                    <ActivityLog
                      activities={activityItems}
                      onViewAll={() => setActiveTab('grades')}
                    />
                    
                    {/* Secondary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg flex items-center gap-2">
                            <ListChecks className="h-5 w-5 text-blue-400" />
                            Next in Curriculum
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          {nextCurriculumTopic ? (
                            <div className="space-y-4">
                              <div>
                                <p className="text-xs font-semibold text-blue-500 uppercase tracking-wider mb-1">
                                  Week {nextCurriculumTopic.weekNumber}
                                </p>
                                <h4 className="font-bold text-light-text-primary dark:text-white line-clamp-1">
                                  {nextCurriculumTopic.topic}
                                </h4>
                                <p className="text-xs text-light-text-secondary dark:text-gray-400 mt-1 line-clamp-2">
                                  {Array.isArray(nextCurriculumTopic.objectives) 
                                    ? nextCurriculumTopic.objectives.join(', ') 
                                    : nextCurriculumTopic.objectives || 'No objectives defined'}
                                </p>
                              </div>
                              <Button 
                                variant="primary" 
                                size="sm" 
                                className="w-full justify-between"
                                onClick={() => setActiveTab('scheme-of-work')}
                              >
                                {nextCurriculumTopic.status === 'IN_PROGRESS' ? 'Continue Teaching' : 'Start Teaching'}
                                <ChevronRight className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <>
                              <p className="text-light-text-secondary dark:text-gray-400 text-sm">
                                {isLoadingCurriculum ? 'Loading teaching plan...' : 'Your teaching plan is all caught up or not yet set.'}
                              </p>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="mt-4 w-full justify-between"
                                onClick={() => setActiveTab('scheme-of-work')}
                                disabled={isLoadingCurriculum}
                              >
                                View Teaching Plan
                                <ChevronRight className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg flex items-center gap-2">
                            <GraduationCap className="h-5 w-5 text-indigo-400" />
                            Quick Grading
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-light-text-secondary dark:text-gray-400 text-sm">
                            {assessments?.some(a => (a._count?.submissions ?? 0) > 0) 
                              ? "You have ungraded submissions waiting for review."
                              : "No pending submissions to grade at this time."}
                          </p>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="mt-4 w-full justify-between"
                            onClick={() => setActiveTab('assessments')}
                          >
                            Manage Assessments
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </CardContent>
                      </Card>
                    </div>
                  </div>

                  {/* Sidebar Info */}
                  <div className="space-y-6">
                    <Card className="bg-blue-500/5 border-blue-500/20">
                      <CardHeader>
                        <CardTitle className="text-lg">Class Information</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-800">
                          <span className="text-sm text-light-text-secondary dark:text-gray-400">Class Level</span>
                          <span className="text-sm font-medium">{classData?.classLevel || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-800">
                          <span className="text-sm text-light-text-secondary dark:text-gray-400">Class Code</span>
                          <span className="text-sm font-medium">{classData?.code || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-800">
                          <span className="text-sm text-light-text-secondary dark:text-gray-400">Academic Year</span>
                          <span className="text-sm font-medium">{classData?.academicYear || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between items-center py-2">
                          <span className="text-sm text-light-text-secondary dark:text-gray-400">Type</span>
                          <span className="text-sm font-medium capitalize font-mono text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded">
                            {classData?.type?.toLowerCase() || 'N/A'}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Instructors</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {classData?.teachers.map((t: any) => (
                          <div key={t.id} className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-xs">
                              {t.firstName[0]}{t.lastName[0]}
                            </div>
                            <div>
                              <p className="text-sm font-medium">{t.firstName} {t.lastName}</p>
                              <p className="text-xs text-light-text-secondary dark:text-gray-400">{t.subject || 'Instructor'}</p>
                            </div>
                            {t.isPrimary && (
                              <span className="ml-auto text-[10px] bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 px-1.5 py-0.5 rounded font-medium">
                                Form
                              </span>
                            )}
                          </div>
                        ))}
                      </CardContent>
                    </Card>

                    {isFormTeacher && (
                      <Card className={cn(
                        "border-l-4",
                        classType === 'SECONDARY' ? "bg-green-500/5 border-green-500/20 border-l-green-500" : "bg-purple-500/5 border-purple-500/20 border-l-purple-500"
                      )}>
                        <CardHeader>
                          <CardTitle className="text-lg flex items-center gap-2">
                            <Users className={cn("h-5 w-5", classType === 'SECONDARY' ? "text-green-500" : "text-purple-500")} />
                            {classType === 'SECONDARY' ? 'Form Management' : 'Class Management'}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <p className="text-sm text-light-text-secondary dark:text-gray-400">
                            {classType === 'SECONDARY' 
                              ? "As the form teacher, you manage the overall welfare, attendance, and pastoral care for this class."
                              : "As the primary class teacher, you manage all activities and attendance for this class."}
                          </p>
                          <div className="grid grid-cols-1 gap-2">
                            <Button 
                              variant={classType === 'SECONDARY' ? "secondary" : "ghost"} 
                              size="sm" 
                              className="w-full justify-start"
                              onClick={() => setActiveTab('roll-call')}
                            >
                              <CheckSquare className="h-4 w-4 mr-2" />
                              Take Daily Roll Call
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'timetable' && (
              <div className="space-y-6">
                {isLoadingActiveSession ? (
                  <div className="flex items-center justify-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                  </div>
                ) : timetableTermId ? (
                  <ClassTimetableView
                    schoolId={schoolId!}
                    classId={classId}
                    termId={timetableTermId}
                    schoolType={effectiveSchoolType}
                    allTerms={timetableTerms}
                    selectedTermId={timetableTermId}
                    onTermChange={setSelectedTimetableTermId}
                    activeTermId={activeSession?.term?.id}
                    terminology={terminology}
                  />
                ) : (
                  <Card>
                    <CardContent className="pt-12 pb-12 text-center">
                      <Clock className="h-12 w-12 text-light-text-muted dark:text-dark-text-muted mx-auto mb-4" />
                      <p className="text-light-text-secondary dark:text-dark-text-secondary">
                        No active term found. Please select a term to view the timetable.
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* Students Tab */}
            {activeTab === 'students' && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-light-text-primary dark:text-dark-text-primary">
                        Students ({filteredStudents.length})
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {isLoadingStudents ? (
                      <div className="flex items-center justify-center py-20">
                        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                      </div>
                    ) : filteredStudents.length === 0 ? (
                      <div className="text-center py-12">
                        <Users className="h-12 w-12 text-light-text-muted dark:text-dark-text-muted mx-auto mb-4" />
                        <p className="text-light-text-secondary dark:text-dark-text-secondary mb-4">
                          {searchQuery ? 'No students found matching your search.' : 'No students enrolled in this class yet.'}
                        </p>
                      </div>
                    ) : (
                      <>
                        <div className="mb-4">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-light-text-muted dark:text-dark-text-muted" />
                            <Input
                              placeholder="Search students by name or student ID..."
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              className="pl-10"
                            />
                          </div>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr className="border-b border-light-border dark:border-dark-border">
                                <th className="text-left py-3 px-4 text-sm font-semibold text-light-text-secondary dark:text-dark-text-secondary">
                                  Name
                                </th>
                                <th className="text-left py-3 px-4 text-sm font-semibold text-light-text-secondary dark:text-dark-text-secondary">
                                  Student ID
                                </th>
                                <th className="text-left py-3 px-4 text-sm font-semibold text-light-text-secondary dark:text-dark-text-secondary">
                                  Date of Birth
                                </th>
                                <th className="text-left py-3 px-4 text-sm font-semibold text-light-text-secondary dark:text-dark-text-secondary">
                                  Status
                                </th>
                                <th className="text-left py-3 px-4 text-sm font-semibold text-light-text-secondary dark:text-dark-text-secondary">
                                  Actions
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {filteredStudents.map((student: any, index: number) => (
                                <tr
                                  key={student.id}
                                  className="border-b border-light-border dark:border-dark-border hover:bg-gray-50 dark:hover:bg-[var(--dark-hover)] transition-colors"
                                >
                                  <td className="py-4 px-4">
                                    <div>
                                      <p className="font-medium text-light-text-primary dark:text-dark-text-primary">
                                        {student.firstName} {student.middleName ? `${student.middleName} ` : ''}{student.lastName}
                                      </p>
                                      <LiveStatusBadge activity={student.currentActivity} size="sm" />
                                    </div>
                                  </td>

                                <td className="py-4 px-4 text-sm text-light-text-secondary dark:text-dark-text-secondary">
                                  {student.uid}
                                </td>
                                <td className="py-4 px-4 text-sm text-light-text-secondary dark:text-dark-text-secondary">
                                  {new Date(student.dateOfBirth).toLocaleDateString()}
                                </td>
                                <td className="py-4 px-4">
                                  <span
                                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${!student.profileLocked
                                      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                      : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'
                                      }`}
                                  >
                                    {student.profileLocked ? 'Locked' : 'Active'}
                                  </span>
                                </td>
                                <td className="py-4 px-4">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => router.push(`/dashboard/teacher/students/${student.id}`)}
                                  >
                                    View
                                  </Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Grades Tab */}
          {(activeTab as TabType) === 'grades' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-light-text-primary dark:text-dark-text-primary">
                      Grades
                    </CardTitle>
                    <div className="flex items-center gap-3">
                      {/* Filters */}
                      <div className="flex items-center gap-2">
                        <select
                          value={gradeTypeFilter}
                          onChange={(e) => setGradeTypeFilter(e.target.value as GradeType | '')}
                          className="text-xs px-2 py-1.5 border border-[var(--light-border)] dark:border-dark-border rounded-md bg-[var(--light-bg)] dark:bg-dark-surface text-light-text-primary dark:text-dark-text-primary"
                          style={{ width: '100px' }}
                        >
                          <option value="">All Types</option>
                          <option value="CA">CA</option>
                          <option value="ASSIGNMENT">Assignment</option>
                          <option value="EXAM">Exam</option>
                        </select>
                        <select
                          value={termFilter}
                          onChange={(e) => setTermFilter(e.target.value)}
                          className="text-xs px-2 py-1.5 border border-[var(--light-border)] dark:border-dark-border rounded-md bg-[var(--light-bg)] dark:bg-dark-surface text-light-text-primary dark:text-dark-text-primary"
                          style={{ width: '100px' }}
                        >
                          <option value="">All Terms</option>
                          {activeSession?.session?.terms?.map((term: any) => (
                            <option key={term.id} value={term.id}>
                              {term.name}
                            </option>
                          ))}
                        </select>
                        {uniqueSequences.length > 0 && (
                          <select
                            value={sequenceFilter}
                            onChange={(e) => setSequenceFilter(e.target.value === '' ? '' : parseInt(e.target.value))}
                            className="text-xs px-2 py-1.5 border border-[var(--light-border)] dark:border-dark-border rounded-md bg-[var(--light-bg)] dark:bg-dark-surface text-light-text-primary dark:text-dark-text-primary"
                            style={{ width: '80px' }}
                          >
                            <option value="">All Seq</option>
                            {uniqueSequences.map((seq) => (
                              <option key={seq} value={seq}>
                                {seq}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                      {!isReadOnly && (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => setShowBulkGradeModal(true)}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Bulk Entry
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">

                    {/* Student-Centric Grade Cards */}
                    {isLoadingStudentGrades ? (
                      <div className="flex items-center justify-center py-20">
                        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                      </div>
                    ) : !studentGradesResponse?.data || studentGradesResponse.data.length === 0 ? (
                      <div className="text-center py-12">
                        <Award className="h-12 w-12 text-light-text-muted dark:text-dark-text-muted mx-auto mb-4" />
                        <p className="text-light-text-secondary dark:text-dark-text-secondary mb-4">
                          No grades found.
                        </p>
                        {!isReadOnly && (
                          <Button
                            variant="primary"
                            onClick={() => setShowBulkGradeModal(true)}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Enter Grades
                          </Button>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {studentGradesResponse.data.map((studentGrade: any) => (
                          <Card
                            key={studentGrade.student.id}
                            className="transition-all duration-300 hover:shadow-lg border-light-border dark:border-dark-border"
                          >
                            <CardHeader
                              className="cursor-pointer select-none"
                              onClick={() => setExpandedStudentId(
                                expandedStudentId === studentGrade.student.id ? null : studentGrade.student.id
                              )}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                  <div className="flex-shrink-0">
                                    <div className="w-12 h-12 rounded-full flex items-center justify-center font-bold bg-gray-400 dark:bg-gray-400 text-gray-600 dark:text-gray-300" style={{ 
                                      fontSize: 'var(--text-body)'
                                    }}>
                                      {studentGrade.student.firstName[0]}{studentGrade.student.lastName[0]}
                                    </div>
                                  </div>
                                  <div>
                                    <h3 className="font-semibold text-light-text-primary dark:text-dark-text-primary" style={{ fontSize: 'var(--text-card-title)' }}>
                                      {studentGrade.student.firstName} {studentGrade.student.lastName}
                                    </h3>
                                    <p className="text-light-text-muted dark:text-dark-text-muted" style={{ fontSize: 'var(--text-small)' }}>
                                      ID: {studentGrade.student.uid}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-4">
                                  <div className="text-right">
                                    <div className="flex items-center gap-2">
                                      <span className={`px-2 py-1 text-xs font-medium rounded ${
                                        studentGrade.performanceStatus === 'above'
                                          ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400'
                                          : studentGrade.performanceStatus === 'below'
                                            ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400'
                                            : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400'
                                      }`}>
                                        {studentGrade.performanceStatus === 'above' ? 'Excellent' :
                                         studentGrade.performanceStatus === 'below' ? 'Needs Improvement' : 'Average'}
                                      </span>
                                      <span className="font-bold text-light-text-primary dark:text-dark-text-primary" style={{ fontSize: 'var(--text-stat-value)' }}>
                                        {studentGrade.averagePercentage}%
                                      </span>
                                    </div>
                                    <p className="text-xs text-light-text-muted dark:text-dark-text-muted mt-1">
                                      {studentGrade.gradedCount} of {studentGrade.totalCount} grades published
                                    </p>
                                  </div>
                                  <div className="transition-transform duration-200">
                                    {expandedStudentId === studentGrade.student.id ? (
                                      <ChevronUp className="h-5 w-5 text-light-text-muted dark:text-dark-text-muted" />
                                    ) : (
                                      <ChevronDown className="h-5 w-5 text-light-text-muted dark:text-dark-text-muted" />
                                    )}
                                  </div>
                                </div>
                              </div>
                            </CardHeader>
                            
                            {expandedStudentId === studentGrade.student.id && (
                              <CardContent className="border-t border-light-border dark:border-dark-border">
                                <div className="pt-4">
                                  <h4 className="font-medium text-light-text-secondary dark:text-dark-text-secondary mb-3" style={{ fontSize: 'var(--text-body)' }}>
                                    Assessment Details
                                  </h4>
                                  {studentGrade.grades.length === 0 ? (
                                    <p className="text-center py-8 text-light-text-muted dark:text-dark-text-muted">
                                      No assessments recorded for this student
                                    </p>
                                  ) : (
                                    <div className="space-y-3">
                                      {studentGrade.grades.map((grade: any) => (
                                        <div
                                          key={grade.id}
                                          className="flex items-center justify-between p-3 rounded-lg bg-light-surface dark:bg-dark-surface"
                                        >
                                          <div className="flex items-center gap-3">
                                            <div className={`w-2 h-2 rounded-full ${
                                              grade.gradeType === 'CA'
                                                ? 'bg-blue-500'
                                                : grade.gradeType === 'ASSIGNMENT'
                                                  ? 'bg-green-500'
                                                  : 'bg-purple-500'
                                            }`} />
                                            <div>
                                              <p className="text-sm font-medium text-light-text-primary dark:text-dark-text-primary">
                                                {grade.assessmentName || 'Unnamed Assessment'}
                                              </p>
                                              <p className="text-xs text-light-text-muted dark:text-dark-text-muted">
                                                {grade.gradeType} {grade.sequence && `• Seq ${grade.sequence}`}
                                                {grade.assessmentDate && ` • ${new Date(grade.assessmentDate).toLocaleDateString()}`}
                                              </p>
                                            </div>
                                          </div>
                                          <div className="flex items-center gap-3">
                                            <div className="text-right">
                                              <p className="text-sm font-medium text-light-text-primary dark:text-dark-text-primary">
                                                {grade.score} / {grade.maxScore}
                                              </p>
                                              <p className={`text-xs ${
                                                grade.percentage >= 80
                                                  ? 'text-green-600 dark:text-green-400'
                                                  : grade.percentage >= 60
                                                    ? 'text-yellow-600 dark:text-yellow-400'
                                                    : 'text-red-600 dark:text-red-400'
                                              }`}>
                                                {grade.percentage}%
                                              </p>
                                            </div>
                                            <div className="flex flex-col items-end gap-1">
                                              {grade.isPublished ? (
                                                <span className="px-2 py-1 text-xs font-medium rounded bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400">
                                                  Published
                                                </span>
                                              ) : (
                                                <>
                                                  <span className="px-2 py-1 text-xs font-medium rounded bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400">
                                                    Draft
                                                  </span>
                                                  {!isReadOnly && (
                                                    <button
                                                      type="button"
                                                      onClick={(e) => {
                                                        e.stopPropagation();
                                                        handlePublishGrade(grade.id);
                                                      }}
                                                      disabled={isPublishing}
                                                      className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium disabled:opacity-50"
                                                    >
                                                      {isPublishing ? 'Publishing...' : 'Publish'}
                                                    </button>
                                                  )}
                                                </>
                                              )}
                                              {!isReadOnly && (
                                                <button
                                                  type="button"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedGrade(grade);
                                                    setShowDeleteModal(true);
                                                  }}
                                                  className="p-1 rounded text-light-text-muted hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                                  aria-label="Delete grade"
                                                >
                                                  <Trash2 className="h-3.5 w-3.5" />
                                                </button>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </CardContent>
                            )}
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Assessments Tab */}
          {(activeTab as TabType) === 'assessments' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <h2 className="text-xl font-bold text-light-text-primary dark:text-dark-text-primary">
                    Assessments
                  </h2>
                  <select
                    value={assessmentTermFilter || activeSession?.term?.id || ''}
                    onChange={(e) => setAssessmentTermFilter(e.target.value)}
                    className="text-xs px-2 py-1.5 border border-light-border dark:border-dark-border rounded-md bg-transparent"
                  >
                    <option value="">Select Term</option>
                    {timetableTerms.map((term: any) => (
                      <option key={term.id} value={term.id}>{term.name} ({term.sessionName})</option>
                    ))}
                  </select>
                </div>
                {!isReadOnly && (
                  <Button onClick={() => router.push(`/dashboard/teacher/assessments/new?source=manual&classId=${classId}`)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Assessment
                  </Button>
                )}
              </div>

              {isLoadingAssessments ? (
                <div className="flex justify-center py-20">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                </div>
              ) : assessments.length === 0 ? (
                <Card>
                  <CardContent className="py-20 text-center">
                    <FileText className="h-16 w-16 mx-auto mb-4 text-light-text-muted opacity-20" />
                    <p className="text-light-text-secondary dark:text-dark-text-secondary text-lg font-medium">No assessments found for this term.</p>
                    <p className="text-sm text-light-text-muted mt-2 mb-6">Create your first assessment or use AI to generate one.</p>
                    {!isReadOnly && (
                      <Button variant="outline" onClick={() => router.push(`/dashboard/teacher/assessments/new?source=manual&classId=${classId}`)}>
                        <Plus className="h-4 w-4 mr-2" /> Create First Assessment
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-8">
                  {Object.entries(
                    assessments.reduce((groups: any, assessment) => {
                      const date = new Date(assessment.createdAt);
                      const month = date.toLocaleString('default', { month: 'long', year: 'numeric' });
                      if (!groups[month]) groups[month] = [];
                      groups[month].push(assessment);
                      return groups;
                    }, {})
                  ).map(([month, monthAssessments]: [string, any]) => (
                    <div key={month} className="space-y-4">
                      <div className="flex items-center gap-4">
                        <span className="text-xs font-bold uppercase tracking-widest text-light-text-muted">{month}</span>
                        <div className="h-[1px] flex-1 bg-light-border dark:bg-dark-border opacity-50" />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {monthAssessments.map((assessment: Assessment) => (
                          <Card
                            key={assessment.id}
                            className="group relative hover:shadow-lg transition-all duration-300 overflow-hidden cursor-pointer border-light-border dark:border-dark-border"
                            onClick={() => router.push(`/dashboard/teacher/assessments/${assessment.id}`)}
                          >
                            <CardHeader className="pb-2 pt-5">
                              <div className="flex justify-between items-start">
                                <span className={`font-bold uppercase tracking-wider px-2 py-0.5 rounded ${assessment.type === 'EXAM' ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' :
                                    assessment.type === 'QUIZ' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' :
                                      'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                                  }`} style={{ fontSize: 'var(--text-tiny)' }}>
                                  {assessment.type}
                                </span>
                                <div className="flex items-center gap-2">
                                  <span className={`font-bold uppercase tracking-wider ${assessment.status === 'PUBLISHED' ? 'text-green-500' : 'text-amber-500'
                                    }`} style={{ fontSize: 'var(--text-tiny)' }}>
                                    {assessment.status}
                                  </span>
                                  {!isReadOnly && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setAssessmentToDelete(assessment);
                                        setShowDeleteAssessmentModal(true);
                                      }}
                                      className="p-1.5 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 text-light-text-muted hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  )}
                                </div>
                              </div>
                              <CardTitle className="mt-2 group-hover:text-blue-600 transition-colors truncate" style={{ fontSize: 'var(--text-card-title)' }}>{assessment.title}</CardTitle>
                              <p className="text-light-text-muted flex items-center gap-1 font-medium" style={{ fontSize: 'var(--text-tiny)' }}>
                                <Calendar className="h-3 w-3" />
                                {new Date(assessment.createdAt).toLocaleDateString()}
                              </p>
                            </CardHeader>
                            <CardContent>
                              <p className="text-light-text-secondary dark:text-dark-text-secondary line-clamp-2 mb-4 h-8" style={{ fontSize: 'var(--text-small)' }}>
                                {assessment.description || 'No description provided.'}
                              </p>
                              <div className="grid grid-cols-2 gap-2 pt-3 border-t border-light-border dark:border-dark-border">
                                <div className="space-y-0.5">
                                  <p className="text-light-text-muted uppercase tracking-tighter" style={{ fontSize: 'var(--text-tiny)' }}>Submissions</p>
                                  <p className="font-bold" style={{ fontSize: 'var(--text-body)' }}>{assessment._count?.submissions || 0}</p>
                                </div>
                                <div className="space-y-0.5 text-right">
                                  <p className="text-light-text-muted uppercase tracking-tighter" style={{ fontSize: 'var(--text-tiny)' }}>Max Score</p>
                                  <p className="font-bold" style={{ fontSize: 'var(--text-body)' }}>{assessment.maxScore}</p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Resources Tab */}

          {(activeTab as TabType) === 'resources' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-light-text-primary dark:text-dark-text-primary">
                      Class Resources
                    </CardTitle>
                    {!isReadOnly && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => setShowUploadResourceModal(true)}
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Resource
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {isLoadingResources ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 text-light-text-muted dark:text-dark-text-muted animate-spin" />
                    </div>
                  ) : resources.length > 0 ? (
                    <div className="space-y-4">
                      {resources.map((resource: any) => (
                        <FadeInUp key={resource.id} from={{ opacity: 0, y: 10 }} to={{ opacity: 1, y: 0 }} duration={0.4} className="p-4 border border-light-border dark:border-dark-border rounded-lg hover:border-blue-500 dark:hover:border-blue-500 transition-colors bg-light-card dark:bg-dark-surface">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4 flex-1 min-w-0">
                              <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="font-semibold text-light-text-primary dark:text-dark-text-primary truncate">
                                  {resource.name}
                                </h4>
                                {resource.description && (
                                  <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mt-1 line-clamp-2">
                                    {resource.description}
                                  </p>
                                )}
                                <div className="flex items-center gap-4 mt-2 text-xs text-light-text-muted dark:text-dark-text-muted">
                                  <span>{resource.fileType || 'Document'}</span>
                                  {resource.fileSize && (
                                    <span>
                                      {(resource.fileSize / 1024 / 1024).toFixed(2)} MB
                                    </span>
                                  )}
                                  {resource.createdAt && (
                                    <span>
                                      {new Date(resource.createdAt).toLocaleDateString()}
                                    </span>
                                  )}
                                  {resource.uploadedByName && (
                                    <span className="text-light-text-secondary dark:text-dark-text-secondary">
                                      By {resource.uploadedByName}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 ml-4">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  if (!schoolId || !classId) return;
                                  const downloadUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'}/schools/${schoolId}/classes/${classId}/resources/${resource.id}/download`;
                                  const token = typeof window !== 'undefined' ? (localStorage.getItem('token') || localStorage.getItem('accessToken')) : null;

                                  fetch(downloadUrl, {
                                    headers: token ? { Authorization: `Bearer ${token}` } : {},
                                  })
                                    .then((response) => response.blob())
                                    .then((blob) => {
                                      safeDownload(blob, resource.name);
                                    })
                                    .catch((error) => {
                                      toast.error('Failed to download resource');
                                      console.error('Download error:', error);
                                    });
                                }}
                              >
                                <Download className="h-4 w-4 mr-2" />
                                Download
                              </Button>
                              {!isReadOnly && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteResource(resource.id)}
                                  disabled={isDeletingResource}
                                  className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                                >
                                  {isDeletingResource ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    'Delete'
                                  )}
                                </Button>
                              )}
                            </div>
                          </div>
                        </FadeInUp>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <FileText className="h-12 w-12 text-light-text-muted dark:text-dark-text-muted mx-auto mb-4" />
                      <p className="text-light-text-secondary dark:text-dark-text-secondary mb-4">
                        No resources uploaded yet.
                      </p>
                      <p className="text-sm text-light-text-muted dark:text-dark-text-muted mb-4">
                        Upload documents, spreadsheets, and other files for your students.
                      </p>
                      {!isReadOnly && (
                        <Button
                          variant="primary"
                          onClick={() => setShowUploadResourceModal(true)}
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          Upload Your First Resource
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}


          {/* Roll Call Tab */}
          {(activeTab as TabType) === 'roll-call' && schoolId && (
            <RollCallView
              schoolId={schoolId}
              classId={classId}
              classType={classData?.type === 'TERTIARY' ? 'CLASS' : 'CLASS_ARM'}
              students={students}
            />
          )}

          {/* Scheme of Work Tab */}
          {(activeTab as TabType) === 'scheme-of-work' && schoolId && (
            <SchemeOfWorkView
              schoolId={schoolId}
              classId={classId}
              role="TEACHER"
              terminology={terminology}
              isReadOnly={isReadOnly}
              schoolType={
                classData?.type === 'PRIMARY' ||
                classData?.type === 'SECONDARY' ||
                classData?.type === 'TERTIARY'
                  ? classData.type
                  : null
              }
            />
          )}

          {/* Curriculum Tab — commented out; Scheme of Work covers weekly delivery */}
          {/* {(activeTab as TabType) === 'curriculum' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-light-text-primary dark:text-dark-text-primary">
                    Curriculum {terminology.courses}
                  </h2>
                  {curriculumResponse?.data?.subject && (
                    <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mt-1">
                      {curriculumResponse.data.subject}
                      {curriculumResponse.data.termName ? ` · ${curriculumResponse.data.termName}` : ''}
                    </p>
                  )}
                </div>
                {!isReadOnly && (
                  <Button variant="outline" size="sm" onClick={() => refetchCurriculum()}>
                    <Sparkles className="h-4 w-4 mr-2 text-blue-500" />
                    Sync Curriculum
                  </Button>
                )}
              </div>
              
              {isLoadingCurriculum ? (
                <div className="flex justify-center py-20">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                </div>
              ) : !curriculumResponse?.data?.items || curriculumResponse.data.items.length === 0 ? (
                <Card>
                  <CardContent className="py-20 text-center">
                    <BookOpen className="h-16 w-16 mx-auto mb-4 text-light-text-muted opacity-20" />
                    <h3 className="text-lg font-bold">No Curriculum Found</h3>
                    <p className="text-light-text-secondary dark:text-dark-text-secondary mt-2">
                      The curriculum for this subject hasn't been set up yet.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {curriculumResponse.data.items.map((item: any, idx: number) => (
                    <Card key={idx} className={cn(
                      "transition-all",
                      item.status === 'COMPLETED' ? "opacity-75 bg-gray-50 dark:bg-dark-surface/50" : ""
                    )}>
                      <CardContent className="p-5 flex items-start gap-4">
                        <div className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm",
                          item.status === 'COMPLETED' ? "bg-green-100 text-green-600" : 
                          item.status === 'IN_PROGRESS' ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-600"
                        )}>
                          {item.weekNumber || (idx + 1)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-bold text-light-text-primary dark:text-dark-text-primary">{item.topic}</h4>
                            {item.status === 'COMPLETED' && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                          </div>
                          {item.subTopics && item.subTopics.length > 0 && (
                            <ul className="mt-2 space-y-1">
                              {item.subTopics.map((sub: string, sIdx: number) => (
                                <li key={sIdx} className="text-xs text-light-text-secondary dark:text-dark-text-secondary flex items-center gap-2">
                                  <div className="w-1 h-1 rounded-full bg-light-text-muted" />
                                  {sub}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                        <Badge variant={
                          item.status === 'COMPLETED' ? 'success' : 
                          item.status === 'IN_PROGRESS' ? 'info' : 'outline'
                        }>
                          {item.status}
                        </Badge>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )} */}

          </div>
        </FadeInUp>

      {/* Modals */}
      <BulkGradeEntryModal
        isOpen={showBulkGradeModal}
        onClose={() => setShowBulkGradeModal(false)}
        schoolId={schoolId!}
        classId={classId}
        students={students}
        subject={classData?.teachers?.[0]?.subject || undefined}
        termId={activeSession?.term?.id || undefined}
        academicYear={classData?.academicYear || activeSession?.session?.name}
        onSuccess={() => {
          refetchGrades();
          setShowBulkGradeModal(false);
        }}
      />


      {selectedStudent && (
        <GradeEntryModal
          isOpen={showGradeModal}
          onClose={() => {
            setShowGradeModal(false);
            setSelectedStudent(null);
          }}
          schoolId={schoolId!}
          student={selectedStudent}
          classId={classId}
          subject={classData?.teachers?.[0]?.subject || undefined}
          termId={activeSession?.term?.id || undefined}
          academicYear={classData?.academicYear || activeSession?.session?.name}
          onSuccess={() => {
            refetchGrades();
            setShowGradeModal(false);
            setSelectedStudent(null);
          }}
        />
      )}

      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setSelectedGrade(null);
        }}
        onConfirm={async () => {
          if (selectedGrade && schoolId) {
            try {
              await deleteGrade({
                schoolId,
                gradeId: selectedGrade.id,
              }).unwrap();
              toast.success('Grade deleted successfully');
              refetchGrades();
              setShowDeleteModal(false);
              setSelectedGrade(null);
            } catch (error: any) {
              toast.error(error?.data?.message || 'Failed to delete grade');
            }
          }
        }}
        title="Delete Grade"
        message="Are you sure you want to delete this grade? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        isLoading={isDeleting}
      />

      <ConfirmModal
        isOpen={showDeleteAssessmentModal}
        onClose={() => {
          setShowDeleteAssessmentModal(false);
          setAssessmentToDelete(null);
        }}
        onConfirm={handleDeleteAssessment}
        title="Delete Assessment"
        message={`Are you sure you want to delete "${assessmentToDelete?.title}"? This action cannot be undone and will be blocked if students have already submitted answers.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        isLoading={isDeletingAssessment}
      />

      {/* Upload Resource Modal */}
      {showUploadResourceModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <FadeInUp from={{ opacity: 0, scale: 0.95 }} to={{ opacity: 1, scale: 1 }} duration={0.25} className="bg-light-card dark:bg-dark-surface rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-bold text-light-text-primary dark:text-dark-text-primary" style={{ fontSize: 'var(--text-stat-value)' }}>
                  Upload Resource
                </h2>
                <button
                  onClick={() => {
                    setShowUploadResourceModal(false);
                    setSelectedFile(null);
                    setResourceDescription('');
                  }}
                  className="text-light-text-secondary dark:text-dark-text-secondary hover:text-light-text-primary dark:hover:text-dark-text-primary"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-light-text-primary dark:text-dark-text-primary mb-2">
                    Select File <span className="text-red-500">*</span>
                  </label>
                  <div className="border-2 border-dashed border-light-border dark:border-dark-border rounded-lg p-6 text-center hover:border-blue-500 dark:hover:border-blue-500 transition-colors">
                    <input
                      type="file"
                      id="file-upload"
                      className="hidden"
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setSelectedFile(file);
                        }
                      }}
                    />
                    <label
                      htmlFor="file-upload"
                      className="cursor-pointer flex flex-col items-center"
                    >
                      <Upload className="h-8 w-8 text-light-text-muted dark:text-dark-text-muted mb-2" />
                      <span className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                        {selectedFile ? selectedFile.name : 'Click to upload or drag and drop'}
                      </span>
                      <span className="text-xs text-light-text-muted dark:text-dark-text-muted mt-1">
                        PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT, CSV (Max 50MB)
                      </span>
                    </label>
                  </div>
                  {selectedFile && (
                    <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary mt-2">
                      Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-light-text-primary dark:text-dark-text-primary mb-2">
                    Description (Optional)
                  </label>
                  <Input
                    placeholder="Add a description for this resource..."
                    value={resourceDescription}
                    onChange={(e) => setResourceDescription(e.target.value)}
                    className="w-full"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setShowUploadResourceModal(false);
                    setSelectedFile(null);
                    setResourceDescription('');
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={async () => {
                    await handleUpload();
                    setShowUploadResourceModal(false);
                  }}
                  disabled={isUploadingResource || !selectedFile}
                >
                  {isUploadingResource ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Resource
                    </>
                  )}
                </Button>
              </div>
            </div>
          </FadeInUp>
        </div>
      )}

      {/* Floating AI CTA */}
      <FloatingAiCta onClick={() => setShowAiChat(true)} />

      {/* AI Chat Drawer */}
      {schoolId && (
        <AiChatDrawer
          schoolId={schoolId}
          isOpen={showAiChat}
          onClose={() => setShowAiChat(false)}
        />
      )}
      </div>
    </ProtectedRoute>
  );
}

// Roll Call View Component
function RollCallView({
  schoolId,
  classId,
  classType,
  students,
}: {
  schoolId: string;
  classId: string;
  classType: 'CLASS' | 'CLASS_ARM';
  students: StudentWithEnrollment[];
}) {
  const { policies } = useRuntimePolicies();
  const statusOptions = policies.attendanceStatusOptions?.length
    ? policies.attendanceStatusOptions
    : ['PRESENT', 'LATE', 'ABSENT'];
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [scanCode, setScanCode] = useState('');

  const { data: attendanceResponse, isLoading: isLoadingAttendance } = useGetClassAttendanceQuery(
    {
      schoolId,
      classId,
      classType,
      date: selectedDate,
    },
    { skip: !schoolId || !classId || !selectedDate }
  );

  const [markAttendance] = useMarkAttendanceMutation();
  const [markBulkAttendance, { isLoading: isBulkMarking }] = useMarkBulkAttendanceMutation();

  const attendanceRecords = attendanceResponse?.data || [];

  // Map attendance records to students
  const attendanceMap = useMemo(() => {
    const map = new Map<string, string>();
    attendanceRecords.forEach((record: any) => {
      map.set(record.enrollment.id, record.status);
    });
    return map;
  }, [attendanceRecords]);

  const handleMarkAttendance = async (enrollmentId: string, status: string) => {
    try {
      await markAttendance({
        schoolId,
        attendanceData: {
          enrollmentId,
          status,
          date: selectedDate,
        },
      }).unwrap();
      toast.success(`Marked as ${status.toLowerCase()}`);
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to mark attendance');
    }
  };

  const handleBulkMark = async (status: string) => {
    try {
      const attendanceData = {
        classId,
        classType,
        date: selectedDate,
        students: students.map((s) => ({
          enrollmentId: s.enrollment?.id,
          status,
        })),
      };

      await markBulkAttendance({
        schoolId,
        attendanceData,
      }).unwrap();
      toast.success(`All marked as ${status.toLowerCase()}`);
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to mark bulk attendance');
    }
  };

  const handleScan = async () => {
    if (!scanCode) return;

    // Find student by UID (scanCode)
    const student = students.find((s) => s.uid === scanCode || s.publicId === scanCode);

    if (student && student.enrollment?.id) {
      await handleMarkAttendance(student.enrollment.id, 'PRESENT');
      setScanCode('');
    } else {
      toast.error('Student not found in this class');
    }
  };

  const presentCount = attendanceRecords.filter((a: any) => a.status === 'PRESENT').length;
  const absentCount = attendanceRecords.filter((a: any) => a.status === 'ABSENT').length;
  const lateCount = attendanceRecords.filter((a: any) => a.status === 'LATE').length;

  return (
    <div className="space-y-6 relative">
      {/* Coming Soon Overlay */}
      <div className="absolute inset-0 z-10 bg-white/60 dark:bg-dark-bg/60 backdrop-blur-[2px] rounded-xl flex items-center justify-center p-6 text-center">
        <div className="max-w-md bg-white dark:bg-dark-surface p-8 rounded-2xl shadow-2xl border border-light-border dark:border-dark-border transform -rotate-1">
          <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <Clock className="h-8 w-8 text-blue-600 dark:text-blue-400 animate-pulse" />
          </div>
          <h2 className="text-2xl font-black text-light-text-primary dark:text-white mb-3">
            Roll Call <span className="text-blue-500">Coming Soon</span>
          </h2>
          <p className="text-light-text-secondary dark:text-dark-text-secondary mb-6 leading-relaxed">
            We are building a powerful, automated attendance system. Soon, you'll be able to mark daily attendance using 
            <span className="font-bold text-blue-500"> QR code scans</span>, handle bulk marking, and view real-time 
            attendance insights for your form class.
          </p>
          <div className="flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-widest text-blue-500 bg-blue-50 dark:bg-blue-900/10 py-2 px-4 rounded-full w-fit mx-auto">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            Under Development
          </div>
        </div>
      </div>

      <div className="opacity-40 pointer-events-none filter blur-[1px]">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-blue-50/50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/10 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mb-1">Total Students</p>
              <h3 className="text-2xl font-bold text-blue-700 dark:text-blue-300">{students.length}</h3>
            </div>
            <Users className="h-8 w-8 text-blue-300 dark:text-blue-800" />
          </CardContent>
        </Card>

        <Card className="bg-green-50/50 dark:bg-green-900/10 border-green-100 dark:border-green-900/10 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-green-600 dark:text-green-400 font-medium mb-1">Present</p>
              <h3 className="text-2xl font-bold text-green-700 dark:text-green-300">{presentCount}</h3>
            </div>
            <CheckCircle2 className="h-8 w-8 text-green-300 dark:text-green-800" />
          </CardContent>
        </Card>

        <Card className="bg-red-50/50 dark:bg-red-900/10 border-red-100 dark:border-red-900/10 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-red-600 dark:text-red-400 font-medium mb-1">Absent</p>
              <h3 className="text-2xl font-bold text-red-700 dark:text-red-300">{absentCount}</h3>
            </div>
            <XCircle className="h-8 w-8 text-red-300 dark:text-red-800" />
          </CardContent>
        </Card>

        <Card className="bg-amber-50/50 dark:bg-amber-900/10 border-amber-100 dark:border-amber-900/10 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-amber-600 dark:text-amber-400 font-medium mb-1">Late</p>
              <h3 className="text-2xl font-bold text-amber-700 dark:text-amber-300">{lateCount}</h3>
            </div>
            <Clock className="h-8 w-8 text-amber-300 dark:text-amber-800" />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-bold">Attendance List</CardTitle>
              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-40 h-9"
                />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2 mb-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkMark('PRESENT')}
                  disabled={isBulkMarking || students.length === 0}
                  className="text-green-600 dark:text-green-400 border-green-200 dark:border-green-900/30 hover:bg-green-50 dark:hover:bg-green-900/20"
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Mark All Present
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkMark('ABSENT')}
                  disabled={isBulkMarking || students.length === 0}
                  className="text-red-600 dark:text-red-400 border-red-200 dark:border-red-900/30 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Mark All Absent
                </Button>
              </div>

              <div className="space-y-1">
                {isLoadingAttendance ? (
                  <div className="text-center py-12">
                    <Loader2 className="h-8 w-8 text-light-text-muted dark:text-dark-text-muted mx-auto mb-4 animate-spin" />
                    <p className="text-light-text-secondary dark:text-dark-text-secondary">Loading attendance...</p>
                  </div>
                ) : students.length > 0 ? (
                  students.map((student) => {
                    const status = attendanceMap.get(student.enrollment?.id || '');
                    return (
                      <div
                        key={student.id}
                        className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-dark-surface transition-colors border border-transparent hover:border-light-border dark:hover:border-dark-border"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold overflow-hidden">
                            {student.profileImage ? (
                              <img src={student.profileImage} alt="" className="h-full w-full object-cover" />
                            ) : (
                              `${student.firstName[0]}${student.lastName[0]}`
                            )}
                          </div>
                          <div>
                            <p className="font-semibold text-light-text-primary dark:text-dark-text-primary">
                              {student.firstName} {student.lastName}
                            </p>
                            <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary">
                              {student.uid}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {statusOptions.map((opt) => {
                            const styles: Record<string, { active: string; icon: React.ReactNode; title: string }> = {
                              PRESENT: {
                                active: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
                                icon: <CheckCircle2 className="h-5 w-5" />,
                                title: 'Present',
                              },
                              LATE: {
                                active: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
                                icon: <Clock className="h-5 w-5" />,
                                title: 'Late',
                              },
                              ABSENT: {
                                active: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
                                icon: <XCircle className="h-5 w-5" />,
                                title: 'Absent',
                              },
                              EXCUSED: {
                                active: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
                                icon: <CheckSquare className="h-5 w-5" />,
                                title: 'Excused',
                              },
                              SICK: {
                                active: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
                                icon: <AlertCircle className="h-5 w-5" />,
                                title: 'Sick',
                              },
                            };
                            const meta = styles[opt] ?? {
                              active: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200',
                              icon: <CheckSquare className="h-5 w-5" />,
                              title: opt.charAt(0) + opt.slice(1).toLowerCase(),
                            };
                            return (
                              <button
                                key={opt}
                                onClick={() => handleMarkAttendance(student.enrollment!.id, opt)}
                                className={cn(
                                  'p-2 rounded-full transition-all',
                                  status === opt
                                    ? meta.active
                                    : 'text-light-text-muted dark:text-dark-text-muted hover:bg-gray-100 dark:hover:bg-dark-surface'
                                )}
                                title={meta.title}
                              >
                                {meta.icon}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-12">
                    <Users className="h-12 w-12 text-light-text-muted dark:text-dark-text-muted mx-auto mb-4" />
                    <p className="text-light-text-secondary dark:text-dark-text-secondary">
                      No students found in this class.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                Quick Scan
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="p-6 bg-gray-50 dark:bg-dark-surface rounded-lg text-center border-2 border-dashed border-light-border dark:border-dark-border">
                <QrCode className="h-12 w-12 text-light-text-muted dark:text-dark-text-muted mx-auto mb-4" />
                <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mb-4">
                  Scan QR code or enter ID manually
                </p>
                <div className="space-y-3">
                  <Input
                    placeholder="Student ID / UID"
                    value={scanCode}
                    onChange={(e) => setScanCode(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleScan()}
                  />
                  <Button variant="primary" className="w-full" onClick={handleScan}>
                    Mark Present
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-bold">Today&apos;s Insights</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="relative pt-1">
                  <div className="flex mb-2 items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-green-600 bg-green-200 dark:bg-green-900/30 dark:text-green-400">
                        Attendance Rate
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-semibold inline-block text-green-600 dark:text-green-400">
                        {students.length > 0 ? Math.round((presentCount / students.length) * 100) : 0}%
                      </span>
                    </div>
                  </div>
                  <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-green-100 dark:bg-green-900/20">
                    <div
                      style={{ width: `${students.length > 0 ? (presentCount / students.length) * 100 : 0}%` }}
                      className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-green-500 transition-all duration-500"
                    ></div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-light-text-secondary dark:text-dark-text-secondary">Expected Students</span>
                    <span className="font-bold">{students.length}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-light-text-secondary dark:text-dark-text-secondary">Actual Present</span>
                    <span className="font-bold text-green-600 dark:text-green-400">{presentCount}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-light-text-secondary dark:text-dark-text-secondary">Late Arrivals</span>
                    <span className="font-bold text-amber-600 dark:text-amber-400">{lateCount}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  </div>
);
}

// Class Timetable View Component
function ClassTimetableView({
  schoolId,
  classId,
  termId,
  schoolType,
  allTerms,
  selectedTermId,
  onTermChange,
  activeTermId,
  terminology,
}: {
  schoolId: string;
  classId: string;
  termId: string;
  schoolType: 'PRIMARY' | 'SECONDARY' | 'TERTIARY' | null;
  allTerms?: Array<{ id: string; name: string; sessionName: string }>;
  selectedTermId?: string;
  onTermChange?: (termId: string) => void;
  activeTermId?: string;
  terminology?: any;
}) {
  const { data: timetableResponse, isLoading } = useGetTimetableForClassQuery(
    {
      schoolId,
      classId,
      termId,
    },
    { skip: !schoolId || !classId || !termId }
  );

  const timetable = timetableResponse?.data || [];

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-12 pb-12 text-center">
          <Loader2 className="h-8 w-8 text-light-text-muted dark:text-dark-text-muted mx-auto mb-4 animate-spin" />
          <p className="text-light-text-secondary dark:text-dark-text-secondary">Loading timetable...</p>
        </CardContent>
      </Card>
    );
  }

  if (timetable.length === 0) {
    return (
      <Card>
        <CardContent className="pt-12 pb-12 text-center">
          <Clock className="h-12 w-12 text-light-text-muted dark:text-dark-text-muted mx-auto mb-4" />
          <p className="text-light-text-secondary dark:text-dark-text-secondary">
            No timetable periods found for this class.
          </p>
          <p className="text-sm text-light-text-muted dark:text-dark-text-muted mt-2">
            The timetable will appear here once periods are assigned by the administrator.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <TeacherTimetableGrid
      timetable={timetable}
      schoolType={schoolType}
      isLoading={false}
      allTerms={allTerms}
      selectedTermId={selectedTermId}
      onTermChange={onTermChange}
      activeTermId={activeTermId}
      terminology={terminology}
    />
  );
}