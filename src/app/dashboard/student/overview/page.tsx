'use client';

import { useMemo, useRef, useEffect } from 'react';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { FadeInUp } from '@/components/ui/FadeInUp';
import {
  BookOpen,
  Clock,
  FileText,
  GraduationCap,
  Award,
  TrendingUp,
  Calendar,
  Loader2,
  AlertCircle,
  MapPin,
  ArrowRight,
  Users,
  CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  useGetUpcomingEventsQuery,
  useGetMyStudentCalendarQuery,
  useGetClassAssessmentsQuery,
} from '@/lib/store/api/schoolAdminApi';
import {
  useStudentDashboard,
  getStudentTodaySchedule,
  getStudentTerminology
} from '@/hooks/useStudentDashboard';
import { getExamTodaySchedule } from '@/lib/academic/termSession';
import { format, parseISO } from 'date-fns';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  Sector
} from 'recharts';

export default function StudentOverviewPage() {
  // Use unified dashboard hook for core data
  const {
    student,
    school,
    schoolType,
    activeEnrollment,
    activeClass,
    activeTerm,
    liveTimetable,
    examTimetable,
    stats,
    isLoading,
    isLoadingProfile,
    isLoadingEnrollments,
    isLoadingClasses,
    isLoadingSession,
    isLoadingTimetable,
    isInitialLoadingTimetable,
    hasError,
    errorMessage,
    isReady,
  } = useStudentDashboard();

  const terminology = getStudentTerminology(schoolType);
  const schoolId = school?.id;
  const activeTermId = activeTerm?.id;

  const termEnded = activeTerm != null && !activeTerm.isOperationallyActive;
  const termOverdue = activeTerm?.isPastEndDate === true;
  const inExamPeriod = activeTerm?.isExamScheduleActive === true;

  const todaySchedule = useMemo(() => {
    return getStudentTodaySchedule(liveTimetable);
  }, [liveTimetable]);
  const todaysExams = useMemo(() => getExamTodaySchedule(examTimetable), [examTimetable]);

  const upcomingPromotedIndex = useMemo(() => {
    if (todaySchedule.length === 0) return -1;
    const now = new Date();
    return todaySchedule.findIndex((p: any) => {
      const [endH, endM] = p.endTime.split(':').map(Number);
      const end = new Date();
      end.setHours(endH, endM, 0, 0);
      return now < end;
    });
  }, [todaySchedule]);

  const scheduleContainerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Auto-scroll the schedule panel to the upcoming/ongoing class (not the whole page)
  useEffect(() => {
    if (!isInitialLoadingTimetable && upcomingPromotedIndex !== -1) {
      const timer = setTimeout(() => {
        const container = scheduleContainerRef.current;
        const target = cardRefs.current[upcomingPromotedIndex];
        if (!container || !target) return;

        const containerRect = container.getBoundingClientRect();
        const targetRect = target.getBoundingClientRect();
        const scrollTop =
          container.scrollTop + (targetRect.top - containerRect.top) - 8;

        container.scrollTo({
          top: Math.max(0, scrollTop),
          behavior: 'smooth',
        });
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [upcomingPromotedIndex, todaySchedule, isInitialLoadingTimetable]);

  // Get calendar data (events) for next 7 days
  const startDate = new Date().toISOString().split('T')[0];
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + 7);
  const endDateStr = endDate.toISOString().split('T')[0];

  const { data: calendarResponse } = useGetMyStudentCalendarQuery(
    { startDate, endDate: endDateStr },
    { skip: !schoolId }
  );
  const calendarData = calendarResponse?.data;
  const calendarEvents = calendarData?.events;

  // Get upcoming events (fallback to events query if calendar doesn't have events)
  const { data: upcomingEventsResponse } = useGetUpcomingEventsQuery(
    { schoolId: schoolId!, days: 7, schoolType: schoolType || undefined },
    { skip: !schoolId || (calendarEvents && calendarEvents.length > 0) }
  );
  const upcomingEvents = (calendarEvents && calendarEvents.length > 0) ? calendarEvents : upcomingEventsResponse?.data;

  // Fetch assessments for the active class
  const { data: assessmentsResponse, isLoading: isLoadingAssessments } = useGetClassAssessmentsQuery(
    {
      schoolId: schoolId!,
      classId: activeClass?.id!,
      termId: activeTermId || undefined,
      studentId: student?.id
    },
    { skip: !schoolId || !activeClass?.id || !student?.id }
  );

  const assessments = assessmentsResponse?.data;
  const recentAssessments = assessments?.slice(0, 4);

  if (isLoading || !isReady || isLoadingProfile || isLoadingEnrollments) {
    return (
      <ProtectedRoute roles={['STUDENT']}>
        <div className="w-full space-y-8 p-8 max-w-7xl mx-auto">
          <Skeleton className="h-64 w-full rounded-[2.5rem]" />
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            <div className="xl:col-span-2 space-y-6">
              <Skeleton className="h-10 w-48" />
              <div className="space-y-3">
                <Skeleton className="h-20 w-full rounded-xl" />
                <Skeleton className="h-20 w-full rounded-xl" />
                <Skeleton className="h-20 w-full rounded-xl" />
              </div>
            </div>
            <div className="space-y-6">
              <Skeleton className="h-48 w-full rounded-xl" />
              <Skeleton className="h-48 w-full rounded-xl" />
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (hasError || !student) {
    return (
      <ProtectedRoute roles={['STUDENT']}>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-4" />
            <p className="text-light-text-secondary dark:text-dark-text-secondary">
              {errorMessage || 'Unable to load student profile'}
            </p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  const studentName = `${student.firstName} ${student.lastName}`.trim();

  return (
    <ProtectedRoute roles={['STUDENT']}>
      <div className="w-full space-y-8 pb-10">
        {/* Personalized Welcome Section */}
        <FadeInUp from={{ opacity: 0, y: -20 }} to={{ opacity: 1, y: 0 }} duration={0.6}>
          <div className="relative flex flex-col md:flex-row items-center justify-between gap-6 p-8 rounded-[2.5rem] overflow-hidden group transition-all duration-500 border border-blue-100/20 dark:border-blue-700/10">
            {/* Inner Glass Layer */}
            <div className="absolute inset-0 bg-white/40 dark:bg-white/5 backdrop-blur-3xl z-0" />

            {/* Animated accent gradient */}
            <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-blue-500/10 to-transparent dark:from-blue-500/5 z-0" />

            <div className="relative flex-1 space-y-5 text-center md:text-left z-10 w-full">
              <div className="space-y-2">
                <div className="flex items-center justify-center md:justify-start gap-2">
                  <div className="h-1 w-8 bg-red-600 rounded-full" />
                  <p className="font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-[0.1em]" style={{ fontSize: 'var(--text-body)' }}>Dashboard Overview</p>
                </div>
                <h1 className="font-black text-light-text-primary dark:text-dark-text-primary tracking-tight" style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', lineHeight: '1' }}>
                  Hey, {student.firstName}! 👋
                </h1>
                <p className="text-light-text-secondary dark:text-dark-text-secondary max-w-lg" style={{ fontSize: 'var(--text-page-subtitle)' }}>
                  How are you,
                  Here&apos;s your schedule for today.
                </p>
              </div>

              <div className="flex flex-wrap justify-center md:justify-start gap-3">
                <Badge className="px-4 py-1.5 rounded-xl font-semibold border-blue-200/50 dark:border-blue-700/30 text-blue-600 dark:text-blue-400 bg-white/30 dark:bg-white/5 backdrop-blur-md" style={{ fontSize: 'var(--text-body)' }}>
                  {activeTerm?.name || 'Current Term'}
                </Badge>
                {activeEnrollment?.classLevel && <Badge className="px-4 py-1.5 rounded-xl font-semibold border-blue-200/50 dark:border-blue-700/30 text-blue-600 dark:text-blue-400 bg-white/30 dark:bg-white/5 backdrop-blur-md" style={{ fontSize: 'var(--text-body)' }}>
                  {activeEnrollment?.classLevel || ''}
                </Badge>}
                <Badge className="px-4 py-1.5 rounded-xl font-semibold border-blue-200/50 dark:border-blue-700/30 text-blue-600 dark:text-blue-400 bg-white/30 dark:bg-white/5 backdrop-blur-md" style={{ fontSize: 'var(--text-body)' }}>
                  {school?.name || 'Your School'}
                </Badge>
              </div>
            </div>

            <div className="relative hidden md:flex items-center gap-8 z-10">
              <div className="text-right">
                <p className="font-semibold text-light-text-muted uppercase tracking-[0.1em] mb-1" style={{ fontSize: 'var(--text-body)' }}>Pulse</p>
                <p className="font-semibold text-blue-600 dark:text-blue-400" style={{ fontSize: 'var(--text-page-title)' }}>{stats.averageScore}%</p>
              </div>
              <div className="h-20 w-[1px] bg-gradient-to-b from-transparent via-blue-200 dark:via-blue-800 to-transparent" />
              <div className="relative">
                <div className="absolute inset-0 bg-black dark:bg-white blur-2xl opacity-5 group-hover:opacity-10 transition-opacity" />
                <GraduationCap className="h-16 w-16 text-black dark:text-white relative z-10 rotate-3 transform transition-transform group-hover:rotate-0" />
              </div>
            </div>
          </div>
        </FadeInUp>

        {inExamPeriod && activeTerm && (
          <FadeInUp from={{ opacity: 0, y: 10 }} to={{ opacity: 1, y: 0 }} duration={0.4} className="mb-6">
            <div className="rounded-lg border px-4 py-3 bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700">
              <p className="font-semibold text-red-900 dark:text-red-100">Exam period — follow your exam timetable</p>
              <p className="text-sm text-red-800 dark:text-red-200 mt-1">Regular classes are paused. Good luck!</p>
            </div>
          </FadeInUp>
        )}

        {termEnded && activeTerm && !inExamPeriod && (
          <FadeInUp from={{ opacity: 0, y: 10 }} to={{ opacity: 1, y: 0 }} duration={0.4} className="mb-6">
            <div
              className={`rounded-lg border px-4 py-3 flex items-start gap-3 ${
                termOverdue
                  ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700'
                  : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
              }`}
            >
              <AlertCircle
                className={`h-5 w-5 flex-shrink-0 mt-0.5 ${
                  termOverdue ? 'text-amber-600 dark:text-amber-400' : 'text-blue-600 dark:text-blue-400'
                }`}
              />
              <div>
                <p
                  className={`font-semibold ${
                    termOverdue
                      ? 'text-amber-900 dark:text-amber-100'
                      : 'text-blue-900 dark:text-blue-100'
                  }`}
                >
                  {termOverdue
                    ? `${activeTerm.name} has ended — no classes are scheduled`
                    : `${activeTerm.name} has not started yet`}
                </p>
                <p
                  className={`text-sm mt-1 ${
                    termOverdue
                      ? 'text-amber-800 dark:text-amber-200'
                      : 'text-blue-800 dark:text-blue-200'
                  }`}
                >
                  {termOverdue ? (
                    <>
                      Scheduled end was{' '}
                      {new Date(activeTerm.endDate).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                      {Math.abs(activeTerm.daysRemaining) > 0 && (
                        <>
                          {' '}
                          · overdue by {Math.abs(activeTerm.daysRemaining)}{' '}
                          {Math.abs(activeTerm.daysRemaining) === 1 ? 'day' : 'days'}
                        </>
                      )}
                      . Your school will start the next {terminology.periodSingular.toLowerCase()} soon.
                    </>
                  ) : (
                    <>
                      Classes begin{' '}
                      {new Date(activeTerm.startDate).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                      .
                    </>
                  )}
                </p>
              </div>
            </div>
          </FadeInUp>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Main Column */}
          <div className="xl:col-span-2 space-y-8">

            {/* Today's Classes Section */}
            <section className="space-y-4">
              <div className="flex items-center justify-between px-2">
                <h2 className="font-bold text-light-text-primary dark:text-dark-text-primary" style={{ fontSize: 'var(--text-card-title)' }}>
                  Today&apos;s Schedule
                </h2>
                <Link href="/dashboard/student/timetables">
                  <p className="text-blue-600 text-xs">View Full Schedule</p>
                </Link>
              </div>

              {isInitialLoadingTimetable ? (
                <div className="space-y-2 px-2">
                  <Skeleton className="h-[74px] w-full rounded-xl border border-light-border dark:border-dark-border" />
                  <Skeleton className="h-[74px] w-full rounded-xl border border-light-border dark:border-dark-border" />
                  <Skeleton className="h-[74px] w-full rounded-xl border border-light-border dark:border-dark-border" />
                </div>
              ) : inExamPeriod ? (
                todaysExams.length > 0 ? (
                  <div className="space-y-2 px-2">
                    {todaysExams.map((exam) => (
                      <Card key={exam.id}>
                        <CardContent className="py-3">
                          <p className="font-bold text-sm">{exam.subjectName}</p>
                          <p className="text-xs text-light-text-secondary">{exam.startTime} – {exam.endTime}</p>
                          {exam.roomName && <p className="text-xs text-light-text-muted">{exam.roomName}</p>}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card className="border-dashed py-12 text-center mx-2">
                    <Calendar className="h-8 w-8 text-light-text-muted mx-auto mb-3" />
                    <p className="text-sm text-light-text-secondary">No exams scheduled for today</p>
                  </Card>
                )
              ) : todaySchedule.length > 0 ? (
                <div ref={scheduleContainerRef} className="max-h-[350px]  overflow-y-auto scrollbar-hide pr-2 py-2 scroll-smooth">
                  <div className="relative pl-6 space-y-2 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-blue-100 dark:before:bg-blue-900/40">
                    {todaySchedule.map((period: any, index: number) => {
                      const nowTime = new Date();
                      const [startHour, startMin] = period.startTime.split(':').map(Number);
                      const [endHour, endMin] = period.endTime.split(':').map(Number);

                      const startTime = new Date();
                      startTime.setHours(startHour, startMin, 0, 0);
                      const endTime = new Date();
                      endTime.setHours(endHour, endMin, 0, 0);

                      const isOngoing = nowTime >= startTime && nowTime <= endTime;
                      const isUpcoming = nowTime < startTime;
                      const isPast = nowTime > endTime;
                      const isPromoted = index === upcomingPromotedIndex;

                      const isFreePeriod = period.type !== 'LESSON' ||
                        (!period.subjectName && !period.subject?.name && !period.courseName && !period.course?.name);

                      const periodTitle = isFreePeriod ? 'Free Period ☕' : (period.subjectName || period.subject?.name || period.courseName || period.course?.name);

                      return (
                        <FadeInUp key={period.id || index} delay={index * 0.05}>
                          <div
                            ref={(el) => { cardRefs.current[index] = el }}
                            className={`relative group transition-all duration-300 ${isPast ? 'opacity-50 grayscale-[0.3]' : ''}`}
                          >
                            {/* Dot on the timeline */}
                            <div className={`absolute -left-[22px] top-6 w-3 h-3 rounded-full border-2 transition-all ${isOngoing ? 'bg-blue-600 border-white dark:border-blue-950 animate-pulse' :
                              isPast ? 'bg-slate-300 dark:bg-dark-border border-transparent' :
                                'bg-white dark:bg-blue-950 border-blue-200 dark:border-blue-900'
                              }`} />

                            <Card className={`overflow-hidden transition-all duration-500 ${isOngoing ? 'border-blue-500 bg-blue-50/20 dark:bg-blue-900/10 shadow-lg shadow-blue-500/10' :
                              isPromoted && isUpcoming ? 'border-amber-400 bg-amber-50/10' :
                                isPast ? 'bg-slate-50 dark:bg-dark-surface/30 border-dashed' :
                                  'hover:border-blue-300 dark:hover:border-blue-800'
                              } ${isPromoted ? 'ring-2 ring-blue-600 ring-offset-2 dark:ring-offset-dark-surface' : ''}`}>
                              <CardContent className="">
                                <div className="flex items-center justify-between gap-4">
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                      <p className={`text-[10px] font-bold uppercase tracking-wider ${isPast ? 'text-light-text-muted' : 'text-blue-600 dark:text-blue-400'}`}>
                                        {period.startTime} — {period.endTime}
                                      </p>
                                      {isOngoing && <Badge className="bg-blue-600 text-[9px] h-4 py-0">ACTIVE NOW</Badge>}
                                      {isPromoted && !isOngoing && <Badge variant="outline" className="text-amber-600 border-amber-600 text-[9px] h-4 py-0">UP NEXT</Badge>}
                                    </div>
                                    <h3 className={`text-sm font-bold ${isPast ? 'text-light-text-muted' : 'text-light-text-primary dark:text-dark-text-primary'}`}>
                                      {periodTitle}
                                    </h3>
                                    <div className="flex items-center gap-3">
                                      <p className="text-[11px] text-light-text-secondary dark:text-dark-text-secondary flex items-center gap-1.5 font-medium">
                                        <Users className={`h-3 w-3 ${isPast ? 'text-light-text-muted opacity-40' : 'text-blue-500'}`} />
                                        {period.className || period.class?.name || activeClass?.name || 'Class TBD'}
                                      </p>
                                      {!isFreePeriod && period.teacher && (
                                        <p className="text-[11px] text-light-text-secondary dark:text-dark-text-secondary flex items-center gap-1.5 font-medium border-l border-light-border dark:border-dark-border pl-3">
                                          <GraduationCap className={`h-3 w-3 ${isPast ? 'text-light-text-muted opacity-40' : 'text-emerald-500'}`} />
                                          {period.teacher.lastName}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                  <div className={`p-2 rounded-xl ${isOngoing ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-dark-bg/50'}`}>
                                    {isFreePeriod ? (
                                      <Clock className="h-4 w-4" />
                                    ) : (
                                      <BookOpen className="h-4 w-4" />
                                    )}
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          </div>
                        </FadeInUp>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <Card className="border-dashed py-12 text-center">
                  <div className="bg-slate-100 dark:bg-dark-surface h-20 w-20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Calendar className="h-8 w-8 text-light-text-muted" />
                  </div>
                  <h3 className="text-lg font-bold">
                    {termEnded
                      ? termOverdue
                        ? 'Term is over'
                        : 'Term not started yet'
                      : 'A Clean Slate!'}
                  </h3>
                  <p className="text-light-text-secondary max-w-[280px] mx-auto text-sm">
                    {termEnded
                      ? termOverdue
                        ? 'This term is over — your timetable is paused until the next term begins.'
                        : 'No classes scheduled until this term starts.'
                      : 'No classes scheduled for today. Take some time for self-study and rest.'}
                  </p>
                </Card>
              )}
            </section>

            {/* Upcoming Tasks - Assessments */}
            <section className="space-y-4">
              <div className="flex items-center justify-between px-2">
                <h2 className="font-bold text-light-text-primary dark:text-dark-text-primary" style={{ fontSize: 'var(--text-card-title)' }}>
                  Assessments to do
                </h2>
                <Link href="/dashboard/student/classes?tab=assessments">
                  <p className="text-xs text-blue-600">All Assessments</p>
                </Link>
              </div>

              {isLoadingAssessments || recentAssessments === undefined ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[1, 2].map((i) => (
                    <Card key={i} className="animate-pulse h-32 bg-slate-50 dark:bg-slate-900/10" />
                  ))}
                </div>
              ) : recentAssessments.length > 0 ? (
                <div className="space-y-4">
                  {recentAssessments?.map((assessment: any, i: number) => {
                    const submission = assessment.submission;
                    const isSubmitted = assessment.isSubmitted;
                    const isGraded = submission?.status === 'GRADED';

                    return (
                      <FadeInUp key={i} from={{ opacity: 0, x: -20 }} to={{ opacity: 1, x: 0 }} duration={0.3} delay={i * 0.1}>
                        <Link href={`/dashboard/student/assessments/${assessment.id}`}>
                          <Card className={cn(
                            "group hover:border-blue-500 transition-all cursor-pointer overflow-hidden",
                            isSubmitted ? "opacity-90 grayscale-[0.3]" : ""
                          )}>
                            <CardContent className="p-4 flex items-start gap-4">
                              <div className={cn(
                                "h-10 w-10 rounded-xl flex items-center justify-center shrink-0",
                                isSubmitted ? "bg-green-100 dark:bg-green-900/30" : "bg-blue-100 dark:bg-blue-900/30"
                              )}>
                                {isSubmitted ? (
                                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                                ) : (
                                  <FileText className="h-5 w-5 text-blue-600" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                  <h4 className="font-bold text-sm truncate group-hover:text-blue-600 transition-colors">
                                    {assessment.title}
                                  </h4>
                                  <span className={cn(
                                    "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                                    isGraded ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" :
                                      isSubmitted ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                                        "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                                  )}>
                                    {isGraded ? `Graded: ${submission.totalScore}/${assessment.maxScore}` :
                                      isSubmitted ? "Submitted" : "Not Done"}
                                  </span>
                                </div>
                                <p className="text-[10px] text-light-text-muted uppercase font-bold tracking-wider mt-1">
                                  {assessment.subject?.name || 'General'} • {assessment.dueDate ? `Due ${new Date(assessment.dueDate).toLocaleDateString()}` : 'No deadline'}
                                </p>
                              </div>
                            </CardContent>
                          </Card>
                        </Link>
                      </FadeInUp>
                    );
                  })}
                </div>
              ) : (
                <Card className="border-dashed py-10 text-center opacity-60">
                  <p className="text-sm text-light-text-muted">No assessments found for this term.</p>
                </Card>
              )}
            </section>
          </div>

          {/* Side Column */}
          <div className="space-y-8">

            {/* Quick Shortcuts - More Visual */}
            <section className="space-y-4">
              <h2 className=" px-2" style={{ fontSize: 'var(--text-body)' }}>Shortcuts</h2>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'Classes', icon: BookOpen, color: 'blue', link: '/dashboard/student/classes' },
                  { label: 'Results', icon: FileText, color: 'green', link: '/dashboard/student/results' },
                  { label: 'Resources', icon: GraduationCap, color: 'purple', link: '/dashboard/student/resources' },
                  { label: 'Calendar', icon: Calendar, color: 'orange', link: '/dashboard/student/calendar' }
                ].map((action, i) => (
                  <Link key={i} href={action.link}>
                    <button className="w-full group p-4 rounded-2xl bg-white dark:bg-dark-surface border border-light-border dark:border-dark-border hover:border-blue-500 transition-all text-center space-y-3">
                      <action.icon className="h-6 w-6 mx-auto group-hover:scale-110 transition-transform text-black dark:text-white" />
                      <span className="text-sm font-bold text-light-text-primary dark:text-dark-text-primary group-hover:text-blue-600 transition-colors">
                        {action.label}
                      </span>
                    </button>
                  </Link>
                ))}
              </div>
            </section>

            {/* Upcoming Events - Card Style */}
            {upcomingEvents && upcomingEvents.length > 0 && (
              <section className="space-y-4">
                <div className="flex items-center justify-between px-2">
                  <h2 className="font-bold" style={{ fontSize: 'var(--text-card-title)' }}>Events</h2>
                  <Link href="/dashboard/student/calendar">
                    <Button variant="ghost" size="sm" className="text-xs">View All</Button>
                  </Link>
                </div>
                <Card className="bg-gradient-to-br from-indigo-600 to-blue-700 text-white border-none overflow-hidden">
                  <CardContent className="p-0">
                    <div className="p-5 space-y-5">
                      {upcomingEvents?.slice(0, 3).map((event: any, i: number) => (
                        <div key={i} className="flex gap-4 group cursor-pointer">
                          <div className="h-10 w-10 rounded-lg bg-white/20 backdrop-blur-md flex flex-col items-center justify-center text-[10px] font-bold uppercase overflow-hidden shrink-0">
                            <span className="bg-white/40 w-full text-center py-0.5">{format(parseISO(event.startDate), 'MMM')}</span>
                            <span className="text-sm leading-none pt-1">{format(parseISO(event.startDate), 'd')}</span>
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-sm font-bold truncate group-hover:underline underline-offset-2">{event.title}</h4>
                            <p className="text-[11px] opacity-80">{format(parseISO(event.startDate), 'h:mm a')} • {event.location || 'Online'}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="bg-black/10 p-4 flex items-center justify-between text-xs font-bold border-t border-white/10 uppercase tracking-widest">
                      <span>3 Events Upcoming</span>
                      <TrendingUp className="h-4 w-4" />
                    </div>
                  </CardContent>
                </Card>
              </section>
            )}

            {/* Pulse Distribution - Circular Chart & Breakdown side-by-side */}
            <Card className="bg-white dark:bg-dark-surface border-light-border dark:border-dark-border overflow-hidden">
              <CardHeader className="pb-0">
                <CardTitle className="text-xs font-bold text-light-text-muted uppercase tracking-widest">Pulse Distribution</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row items-center gap-6">
                  {/* Circular Chart Container */}
                  <div className="h-[180px] w-full lg:w-1/2 relative shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={stats.subjectBreakdown.length > 0 ? stats.subjectBreakdown : [{ name: 'No Data', percentage: 100 }]}
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={75}
                          paddingAngle={5}
                          dataKey="percentage"
                          nameKey="name"
                          animationBegin={0}
                          animationDuration={1500}
                        >
                          {stats.subjectBreakdown.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={[
                                '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f43f5e'
                              ][index % 8]}
                              stroke="none"
                            />
                          ))}
                          {stats.subjectBreakdown.length === 0 && <Cell fill="#e2e8f0" stroke="none" />}
                        </Pie>
                        <RechartsTooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              return (
                                <div className="bg-white dark:bg-dark-surface border border-light-border dark:border-dark-border p-2 rounded-lg shadow-xl text-xs">
                                  <p className="font-bold">{payload[0].name}</p>
                                  <p className="text-blue-600 dark:text-blue-400">{payload[0].value}% Average</p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>

                    {/* Center Overlay */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-2xl font-black text-light-text-primary dark:text-dark-text-primary">{stats.averageScore}%</span>
                      <span className="text-[9px] font-bold text-light-text-muted uppercase tracking-tighter">Overall</span>
                    </div>
                  </div>

                  {/* Subject Breakdown List (Side) */}
                  <div className="w-full lg:w-1/2 space-y-3 lg:border-l lg:border-light-border lg:dark:border-dark-border lg:pl-6">
                    <p className="text-[10px] font-bold text-light-text-muted uppercase tracking-widest border-b border-light-border dark:border-dark-border pb-1">Breakdown</p>
                    <div className="max-h-[160px] overflow-y-auto pr-1 space-y-2 scrollbar-hide">
                      {stats.subjectBreakdown.length > 0 ? stats.subjectBreakdown.slice(0, 6).map((subject, index) => (
                        <div key={index} className="flex items-center justify-between group">
                          <div className="flex items-center gap-2 min-w-0">
                            <div
                              className="w-1.5 h-1.5 rounded-full shrink-0"
                              style={{
                                backgroundColor: [
                                  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f43f5e'
                                ][index % 8]
                              }}
                            />
                            <span className="text-[11px] font-medium text-light-text-secondary dark:text-dark-text-secondary truncate">
                              {subject.name}
                            </span>
                          </div>
                          <span className="text-[11px] font-bold text-light-text-primary dark:text-dark-text-primary ml-2 shrink-0">
                            {subject.percentage}%
                          </span>
                        </div>
                      )) : (
                        <p className="text-xs text-center py-4 text-light-text-muted italic">No grades yet</p>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
