'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { FadeInUp } from '@/components/ui/FadeInUp';
import {
  BookOpen,
  Users,
  FileText,
  Clock,
  User,
  Mail,
  Phone,
  Download,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { isPastDueDate } from '@/lib/assessment-deadline';
import {
  useGetMyStudentProfileQuery,
  useGetMyStudentClassesQuery,
  useGetMyStudentTimetableQuery,
  useGetActiveSessionQuery,
  useGetSessionsQuery,
  useGetCurriculumForClassQuery,
  useGetMyClassmatesQuery,
  useGetClassAssessmentsQuery,
} from '@/lib/store/api/schoolAdminApi';
import { TeacherTimetableGrid } from '@/components/timetable/TeacherTimetableGrid';
import { useStudentSchoolType, getStudentTerminology } from '@/hooks/useStudentDashboard';
import { safeDownload } from '@/lib/utils/download';
import toast from 'react-hot-toast';

type TabType = 'assessments' | 'teachers' | 'resources' | 'curriculum' | 'timetable' | 'classmates';

// Classmate Card Component
function ClassmateCard({ classmate }: { classmate: any }) {
  const [imageError, setImageError] = useState(false);

  const getInitials = () => {
    const first = classmate.firstName?.[0]?.toUpperCase() || '';
    const last = classmate.lastName?.[0]?.toUpperCase() || '';
    return first + last || '?';
  };

  const fullName = `${classmate.firstName || ''} ${classmate.lastName || ''}`.trim() || 'Unknown';
  const shouldShowImage = classmate.profileImage && !imageError && classmate.profileImage.trim() !== '';

  return (
    <Link href={`/dashboard/school/students/${classmate.id}`}>
      <FadeInUp from={{ opacity: 0, y: 10 }} to={{ opacity: 1, y: 0 }} duration={0.5} className="p-4 border border-light-border dark:border-dark-border rounded-lg hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-md transition-all cursor-pointer bg-light-card dark:bg-dark-surface">
        <div className="flex items-center gap-4">
          {shouldShowImage ? (
            <img
              src={classmate.profileImage}
              alt={fullName}
              className="w-12 h-12 rounded-full object-cover border-2 border-light-border dark:border-dark-border"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="w-12 h-12 rounded-full flex items-center justify-center text-black dark:text-white font-semibold text-sm border-2 border-black dark:border-white">
              {getInitials()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-light-text-primary dark:text-dark-text-primary truncate">
              {fullName}
            </h3>
            {classmate.enrollment?.classLevel && (
              <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                {classmate.enrollment.classLevel}
              </p>
            )}
            {classmate.uid && (
              <p className="text-xs text-light-text-muted dark:text-dark-text-muted mt-1">
                ID: {classmate.uid}
              </p>
            )}
          </div>
        </div>
      </FadeInUp>
    </Link>
  );
}

export default function StudentClassesPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('assessments');
  const [selectedTermId, setSelectedTermId] = useState<string>('');

  // Get school type from student's enrollment (not localStorage)
  const { schoolType: currentType, schoolId, isLoading: isLoadingSchoolType } = useStudentSchoolType();
  const terminology = getStudentTerminology(currentType);

  // Get student profile for studentId
  const { data: profileResponse, isLoading: isLoadingProfile } = useGetMyStudentProfileQuery();
  const student = profileResponse?.data;

  // Get student's classes
  const { data: classesResponse, isLoading: isLoadingClasses } = useGetMyStudentClassesQuery();
  const classes = classesResponse?.data || [];

  // Get the active/primary class (first one, or could filter by isActive enrollment)
  const classData = useMemo(() => {
    // If multiple classes, show the first one (most recent enrollment)
    // In practice, students typically have one active class
    return classes[0] || null;
  }, [classes]);

  // Get active session
  const { data: activeSessionResponse } = useGetActiveSessionQuery(
    { schoolId: schoolId! },
    { skip: !schoolId }
  );
  const activeSession = activeSessionResponse?.data;

  // Get curriculum for class
  // Note: For students, we don't filter by subject - they should see all curriculum for their class
  const { data: curriculumResponse } = useGetCurriculumForClassQuery(
    {
      schoolId: schoolId!,
      classId: classData?.id!,
      // Don't filter by subject for students - show all curriculum for the class
      subject: undefined,
      academicYear: classData?.academicYear || activeSession?.session?.name,
      termId: activeSession?.term?.id || undefined,
    },
    { skip: !schoolId || !classData?.id || activeTab !== 'curriculum' }
  );

  // Get classmates
  const { data: classmatesResponse, isLoading: isLoadingClassmates } = useGetMyClassmatesQuery(
    { classId: classData?.id },
    { skip: !classData?.id || activeTab !== 'classmates' }
  );
  const classmates = classmatesResponse?.data;

  // Get all sessions for term selector
  const { data: sessionsResponse } = useGetSessionsQuery(
    { schoolId: schoolId! },
    { skip: !schoolId }
  );

  // Determine which term to use
  const currentTermId = selectedTermId || activeSession?.term?.id || '';

  // Get student's timetable - unified endpoint handles all school types
  const { data: timetableResponse, isLoading: isLoadingTimetable } = useGetMyStudentTimetableQuery(
    { termId: currentTermId || undefined },
    { skip: !classData } // Skip until we know student is enrolled
  );
  const timetable = timetableResponse?.data || [];

  // Get class assessments
  const { data: assessmentsResponse, isLoading: isLoadingAssessments } = useGetClassAssessmentsQuery(
    {
      schoolId: schoolId!,
      classId: classData?.id!,
      termId: activeSession?.term?.id || undefined,
      studentId: student?.id,
    },
    { skip: !schoolId || !classData?.id || !student?.id }
  );
  const assessments = assessmentsResponse?.data; // Use data from ResponseDto

  // Calculate unread assessments (published and not submitted)
  const pendingAssessmentsCount = useMemo(() => {
    return assessments?.filter((a: any) =>
      a.status === 'PUBLISHED' &&
      (!a.submissions || a.submissions.length === 0)
    ).length || 0;
  }, [assessments]);

  // Extract all terms from sessions for selector - filtered by school type and deduplicated
  const allTerms = useMemo(() => {
    if (!sessionsResponse?.data) return [];

    // Filter sessions by current school type to avoid duplicates
    const filteredSessions = sessionsResponse.data.filter((session: any) => {
      if (!currentType) return !session.schoolType;
      return session.schoolType === currentType;
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
      if (session.terms) {
        session.terms.forEach((term: any) => {
          terms.push({
            id: term.id,
            name: term.name,
            sessionName: session.name,
          });
        });
      }
    });

    return terms.sort((a, b) => {
      if (a.sessionName !== b.sessionName) {
        return b.sessionName.localeCompare(a.sessionName);
      }
      return b.name.localeCompare(a.name);
    });
  }, [sessionsResponse, currentType]);

  const isLoading = isLoadingProfile || isLoadingSchoolType || isLoadingClasses || isLoadingTimetable || (activeSessionResponse === undefined);

  // Handle resource download
  const handleDownload = async (resource: any) => {
    try {
      if (!schoolId || !classData?.id) {
        toast.error('Unable to download resource');
        return;
      }

      const baseUrl = (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_URL) || 'http://localhost:4000/api';
      const downloadUrl = `${baseUrl}/schools/${schoolId}/classes/${classData.id}/resources/${resource.id}/download`;

      // Get auth token from localStorage
      const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') || localStorage.getItem('token') : null;

      // Fetch and create blob for download
      const response = await fetch(downloadUrl, {
        headers: token ? {
          'Authorization': `Bearer ${token}`,
        } : {},
      });

      if (!response.ok) {
        throw new Error('Failed to download resource');
      }


      const blob = await response.blob();
      const fileName = resource.name || resource.fileName || 'resource';
      safeDownload(blob, fileName);
    } catch (error: any) {
      toast.error(error?.message || 'Failed to download resource');
    }
  };

  const tabs = [
    {
      id: 'assessments' as TabType,
      label: 'Assessments',
      icon: (
        <div className="relative">
          <FileText className="h-4 w-4" />
          {pendingAssessmentsCount > 0 && (
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-dark-bg" />
          )}
        </div>
      ),
      available: true,
      badge: pendingAssessmentsCount > 0 ? pendingAssessmentsCount : undefined,
    },
    {
      id: 'teachers' as TabType,
      label: terminology.staff,
      icon: <Users className="h-4 w-4" />,
      available: true,
    },
    {
      id: 'resources' as TabType,
      label: 'Resources',
      icon: <FileText className="h-4 w-4" />,
      available: true,
    },
    {
      id: 'curriculum' as TabType,
      label: 'Curriculum',
      icon: <BookOpen className="h-4 w-4" />,
      available: true,
    },
    {
      id: 'timetable' as TabType,
      label: 'Timetable',
      icon: <Clock className="h-4 w-4" />,
      available: true,
    },
    {
      id: 'classmates' as TabType,
      label: 'Classmates',
      icon: <Users className="h-4 w-4" />,
      available: true,
    },
  ];

  if (isLoading) {
    return (
      <ProtectedRoute roles={['STUDENT']}>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 text-light-text-muted dark:text-dark-text-muted mx-auto mb-4 animate-spin" />
            <p className="text-light-text-secondary dark:text-dark-text-secondary">
              Loading {terminology.courseSingular.toLowerCase()}...
            </p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (!classData && !isLoading) {
    return (
      <ProtectedRoute roles={['STUDENT']}>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-light-text-secondary dark:text-dark-text-secondary mb-2">
              No {terminology.courseSingular.toLowerCase()} found
            </p>
            <p className="text-sm text-light-text-muted dark:text-dark-text-muted">
              You may not be enrolled in any {terminology.courses.toLowerCase()} for the current term.
            </p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute roles={['STUDENT']}>
      <div className="w-full">
        {/* Header */}
        <FadeInUp from={{ opacity: 0, y: -20 }} to={{ opacity: 1, y: 0 }} duration={0.5} className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-bold text-light-text-primary dark:text-dark-text-primary mb-1" style={{ fontSize: 'var(--text-page-title)' }}>
                {classData.name}
              </h1>
              <p className="text-light-text-secondary dark:text-dark-text-secondary">
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
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors whitespace-nowrap ${activeTab === tab.id
                  ? 'border-b-2 border-blue-600 dark:border-blue-400 text-blue-600 dark:text-blue-400'
                  : 'text-light-text-secondary dark:text-dark-text-secondary hover:text-light-text-primary dark:hover:text-dark-text-primary'
                  }`}
                style={{ fontSize: 'var(--text-tiny)' }}
              >
                {tab.icon}
                <div className="flex items-center gap-1.5">
                  {tab.label}
                  {tab.badge && (
                    <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                      {tab.badge}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <FadeInUp from={{ opacity: 0, y: 10 }} to={{ opacity: 1, y: 0 }} duration={0.2}>
          {/* Assessments Tab */}
          {activeTab === 'assessments' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {isLoadingAssessments || assessments === undefined ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <Card key={i} className="animate-pulse">
                      <div className="h-32 bg-gray-100 dark:bg-gray-800 rounded-t-lg" />
                      <div className="p-6 space-y-3">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 w-3/4 rounded" />
                        <div className="h-3 bg-gray-200 dark:bg-gray-700 w-1/2 rounded" />
                      </div>
                    </Card>
                  ))
                ) : assessments && assessments.length > 0 ? (
                  assessments.map((assessment: any) => {
                    const submission = assessment.submission;
                    const isSubmitted = assessment.isSubmitted;
                    const isGraded = submission?.status === 'GRADED';
                    const isPastDue = assessment.isPastDue ?? (assessment.dueDate ? isPastDueDate(assessment.dueDate) : false);
                    const isMissed = assessment.isMissed ?? (!isSubmitted && isPastDue && !assessment.allowLateSubmissionAfterDue && submission?.status !== 'STARTED');

                    return (
                      <FadeInUp key={assessment.id} duration={0.4}>
                        <Link href={`/dashboard/student/assessments/${assessment.id}`}>
                          <Card className={`h-full group hover:shadow-xl transition-all duration-300 border-t-4 overflow-hidden bg-light-card dark:bg-dark-surface ${
                            isMissed ? 'border-t-red-500 opacity-80' : 
                            isGraded ? 'border-t-green-500' : 
                            isSubmitted ? 'border-t-blue-500' : 'border-t-amber-500'
                          }`}>
                            <CardHeader className="pb-2">
                              <div className="flex justify-between items-start mb-2">
                                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${assessment.type === 'EXAM' ? 'bg-red-100 text-red-600 dark:bg-red-900/30' :
                                  assessment.type === 'QUIZ' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30' : 'bg-green-100 text-green-600 dark:bg-green-900/30'
                                  }`}>
                                  {assessment.type}
                                </span>
                                {isMissed ? (
                                  <span className="text-[10px] font-bold text-red-500 uppercase tracking-wider">
                                    MISSED
                                  </span>
                                ) : isSubmitted ? (
                                  <span className={`text-[10px] font-bold uppercase tracking-wider ${isGraded ? 'text-green-500' : 'text-blue-500'}`}>
                                    {isGraded ? 'GRADED' : 'SUBMITTED'}
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider">
                                    PENDING
                                  </span>
                                )}
                              </div>
                              <CardTitle className="group-hover:text-blue-600 transition-colors uppercase tracking-tight font-black" style={{ fontSize: 'var(--text-card-title)' }}>
                                {assessment.title}
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <p className="text-light-text-secondary dark:text-dark-text-secondary line-clamp-2 mb-4 h-10" style={{ fontSize: 'var(--text-small)' }}>
                                {assessment.description || 'No description provided.'}
                              </p>

                              {isGraded && (
                                <div className="mb-4 bg-green-50 dark:bg-green-900/10 p-3 rounded-lg flex items-center justify-between border border-green-200 dark:border-green-800">
                                  <span className="font-bold text-green-700 dark:text-green-400" style={{ fontSize: 'var(--text-tiny)' }}>YOUR SCORE</span>
                                  <span className="font-black text-green-700 dark:text-green-400" style={{ fontSize: 'var(--text-stat-value)' }}>
                                    {submission.totalScore} / {assessment.maxScore}
                                  </span>
                                </div>
                              )}

                              <div className="space-y-2 pt-4 border-t border-light-border dark:border-dark-border">
                                <div className="flex items-center justify-between font-bold uppercase tracking-widest text-light-text-muted" style={{ fontSize: 'var(--text-tiny)' }}>
                                  <span>Subject</span>
                                  <span className="text-light-text-primary dark:text-dark-text-primary">{assessment.subjectName || 'General'}</span>
                                </div>
                                <div className="flex items-center justify-between font-bold uppercase tracking-widest text-light-text-muted" style={{ fontSize: 'var(--text-tiny)' }}>
                                  <span>Due Date</span>
                                  <span className="text-light-text-primary dark:text-dark-text-primary">
                                    {assessment.dueDate ? new Date(assessment.dueDate).toLocaleDateString() : 'No deadline'}
                                  </span>
                                </div>
                              </div>

                              <div className="mt-6">
                                {isSubmitted && !isGraded ? (
                                  <div className="text-center py-2 px-4 bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-blue-100 dark:border-blue-900/30">
                                    <p className="text-xs font-bold text-blue-600 dark:text-blue-400 flex items-center justify-center gap-2">
                                      <Clock className="h-3 w-3" />
                                      Awaiting Grade
                                    </p>
                                  </div>
                                ) : isMissed ? (
                                  <div className="text-center py-2 px-4 bg-red-50 dark:bg-red-900/10 rounded-lg border border-red-100 dark:border-red-900/30">
                                    <p className="text-xs font-bold text-red-600 dark:text-red-400">
                                      Submission Window Closed
                                    </p>
                                  </div>
                                ) : !isSubmitted && !isPastDue ? (
                                  <div className="text-center py-2 px-4 bg-amber-50 dark:bg-amber-900/10 rounded-lg border border-amber-100 dark:border-amber-900/30">
                                    <p className="text-xs font-bold text-amber-600 dark:text-amber-400">
                                      Click to Take Assessment
                                    </p>
                                  </div>
                                ) : isGraded ? (
                                  <div className="text-center py-2 px-4 bg-green-50 dark:bg-green-900/10 rounded-lg border border-green-100 dark:border-green-900/30">
                                    <p className="text-xs font-bold text-green-600 dark:text-green-400">
                                      View Detailed Result
                                    </p>
                                  </div>
                                ) : null}
                              </div>
                            </CardContent>
                          </Card>
                        </Link>
                      </FadeInUp>
                    );
                  })
                ) : (
                  <div className="col-span-full py-20 text-center">
                    <FileText className="h-16 w-16 mx-auto mb-4 text-light-text-muted opacity-20" />
                    <p className="text-light-text-secondary dark:text-dark-text-secondary text-lg font-medium">No assessments available.</p>
                    <p className="text-sm text-light-text-muted mt-2">When your teacher publishes an assessment, it will appear here.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Teachers Tab */}
          {activeTab === 'teachers' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="font-bold text-light-text-primary dark:text-dark-text-primary" style={{ fontSize: 'var(--text-card-title)' }}>
                    {terminology.staff}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {classData.teachers && classData.teachers.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {classData.teachers.map((teacher: any) => (
                        <Card key={teacher.id} className="border border-light-border dark:border-dark-border">
                          <CardContent className="pt-6">
                            <div className="flex items-start gap-4">
                              <div className="w-12 h-12 flex items-center justify-center flex-shrink-0">
                                <User className="h-8 w-8 text-black dark:text-white" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-light-text-primary dark:text-dark-text-primary mb-1">
                                  {teacher.firstName} {teacher.lastName}
                                  {teacher.isPrimary && (
                                    <span className="ml-2 text-xs text-blue-600 dark:text-blue-400">(Primary)</span>
                                  )}
                                </h3>
                                {teacher.subject && (
                                  <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mb-2">
                                    {teacher.subject}
                                  </p>
                                )}
                                <div className="space-y-1">
                                  {teacher.email && (
                                    <div className="flex items-center gap-2 text-sm text-light-text-secondary dark:text-dark-text-secondary">
                                      <Mail className="h-4 w-4" />
                                      <a href={`mailto:${teacher.email}`} className="hover:text-blue-600 dark:hover:text-blue-400">
                                        {teacher.email}
                                      </a>
                                    </div>
                                  )}
                                  {teacher.phone && (
                                    <div className="flex items-center gap-2 text-sm text-light-text-secondary dark:text-dark-text-secondary">
                                      <Phone className="h-4 w-4" />
                                      <a href={`tel:${teacher.phone}`} className="hover:text-blue-600 dark:hover:text-blue-400">
                                        {teacher.phone}
                                      </a>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Users className="h-12 w-12 text-light-text-muted dark:text-dark-text-muted mx-auto mb-4" />
                      <p className="text-light-text-secondary dark:text-dark-text-secondary">
                        No {terminology.staffSingular.toLowerCase()} assigned to this {terminology.courseSingular.toLowerCase()}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Curriculum Tab */}
          {activeTab === 'curriculum' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="font-bold text-light-text-primary dark:text-dark-text-primary" style={{ fontSize: 'var(--text-card-title)' }}>
                    Curriculum Overview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {curriculumResponse?.data ? (
                    <div className="space-y-6">
                      {curriculumResponse.data.items.map((item: any, index: number) => (
                        <div
                          key={item.id || index}
                          className="pb-6 border-b border-light-border dark:border-dark-border last:border-0 last:pb-0"
                        >
                          <div className="flex items-start gap-4 mb-4">
                            <div className="flex-shrink-0 w-16 h-16 flex items-center justify-center">
                              <span className="text-black dark:text-white font-bold text-sm text-center leading-tight">
                                Week {item.week}
                              </span>
                            </div>
                            <div className="flex-1">
                              <h3 className="text-lg font-semibold text-light-text-primary dark:text-dark-text-primary mb-2">
                                {item.topic}
                              </h3>
                              {item.objectives && item.objectives.length > 0 && (
                                <div className="space-y-2 mb-3">
                                  <p className="text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary">
                                    Learning Objectives:
                                  </p>
                                  <ul className="list-disc list-inside space-y-1 ml-2">
                                    {item.objectives.map((objective: string, objIndex: number) => (
                                      <li
                                        key={objIndex}
                                        className="text-sm text-light-text-secondary dark:text-dark-text-secondary"
                                      >
                                        {objective}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              {item.resources && item.resources.length > 0 && (
                                <div>
                                  <p className="text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary mb-2">
                                    Resources:
                                  </p>
                                  <div className="flex flex-wrap gap-2">
                                    {item.resources.map((resource: string, resIndex: number) => (
                                      <span
                                        key={resIndex}
                                        className="px-3 py-1 bg-light-bg dark:bg-dark-surface rounded-md text-xs text-light-text-secondary dark:text-dark-text-secondary"
                                      >
                                        {resource}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <BookOpen className="h-12 w-12 text-light-text-muted dark:text-dark-text-muted mx-auto mb-4" />
                      <p className="text-light-text-secondary dark:text-dark-text-secondary mb-4">
                        No curriculum created yet.
                      </p>
                      <p className="text-sm text-light-text-muted dark:text-dark-text-muted mb-4">
                        Teachers can create a curriculum with weekly topics, objectives, and resources.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Resources Tab */}
          {activeTab === 'resources' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="font-bold text-light-text-primary dark:text-dark-text-primary" style={{ fontSize: 'var(--text-card-title)' }}>
                    Resources
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {classData.resources && classData.resources.length > 0 ? (
                    <div className="space-y-3">
                      {classData.resources.map((resource: any) => (
                        <Card key={resource.id} className="border border-light-border dark:border-dark-border">
                          <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4 flex-1 min-w-0">
                                <div className="w-10 h-10 flex items-center justify-center flex-shrink-0">
                                  <FileText className="h-6 w-6 text-black dark:text-white" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h3 className="font-semibold text-light-text-primary dark:text-dark-text-primary truncate">
                                    {resource.name}
                                  </h3>
                                  {resource.description && (
                                    <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary truncate">
                                      {resource.description}
                                    </p>
                                  )}
                                  <p className="text-xs text-light-text-muted dark:text-dark-text-muted mt-1">
                                    {resource.fileType} • {new Date(resource.createdAt).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDownload(resource)}
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <FileText className="h-12 w-12 text-light-text-muted dark:text-dark-text-muted mx-auto mb-4" />
                      <p className="text-light-text-secondary dark:text-dark-text-secondary">
                        No resources available for this {terminology.courseSingular.toLowerCase()}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Timetable Tab */}
          {activeTab === 'timetable' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="font-bold text-light-text-primary dark:text-dark-text-primary" style={{ fontSize: 'var(--text-card-title)' }}>
                    Weekly Timetable
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {timetable.length > 0 ? (
                    <TeacherTimetableGrid
                      timetable={timetable}
                      schoolType={currentType}
                      isLoading={isLoadingTimetable}
                      allTerms={allTerms}
                      selectedTermId={currentTermId}
                      onTermChange={setSelectedTermId}
                      activeTermId={activeSession?.term?.id}
                      terminology={terminology}
                    />
                  ) : (
                    <div className="text-center py-12">
                      <Clock className="h-12 w-12 text-light-text-muted dark:text-dark-text-muted mx-auto mb-4" />
                      <p className="text-light-text-secondary dark:text-dark-text-secondary">
                        No timetable available for the selected {terminology.periodSingular.toLowerCase()}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Classmates Tab */}
          {activeTab === 'classmates' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="font-bold text-light-text-primary dark:text-dark-text-primary" style={{ fontSize: 'var(--text-card-title)' }}>
                    Classmates
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoadingClassmates || classmates === undefined ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 text-light-text-muted dark:text-dark-text-muted animate-spin" />
                    </div>
                  ) : classmates && classmates.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {classmates.map((classmate: any) => (
                        <ClassmateCard key={classmate.id} classmate={classmate} />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Users className="h-12 w-12 text-light-text-muted dark:text-dark-text-muted mx-auto mb-4" />
                      <p className="text-light-text-secondary dark:text-dark-text-secondary">
                        No classmates found in this {terminology.courseSingular.toLowerCase()}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </FadeInUp>
      </div>
    </ProtectedRoute>
  );
}

