'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { FadeInUp } from '@/components/ui/FadeInUp';
import { cn } from '@/lib/utils';
import {
  Clock,
  Calendar,
  Loader2,
  Users,
  BookOpen,
  ChevronRight,
  MapPin,
  AlertCircle,
} from 'lucide-react';
import { TimetablePeriod } from '@/lib/store/api/schoolAdminApi';
import {
  useTeacherDashboard,
  getTodaySchedule,
  getWeeklySchedule,
  getCurrentAndUpcomingPeriods
} from '@/hooks/useTeacherDashboard';
import { getExamTodaySchedule } from '@/lib/academic/termSession';

const DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'] as const;
const DAY_LABELS: Record<string, string> = {
  MONDAY: 'Monday',
  TUESDAY: 'Tuesday',
  WEDNESDAY: 'Wednesday',
  THURSDAY: 'Thursday',
  FRIDAY: 'Friday',
  SATURDAY: 'Saturday',
  SUNDAY: 'Sunday',
};

const PERIOD_TYPE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  LESSON: {
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    text: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-200 dark:border-blue-800',
  },
  BREAK: {
    bg: 'bg-gray-50 dark:bg-gray-800/50',
    text: 'text-gray-600 dark:text-gray-400',
    border: 'border-gray-200 dark:border-gray-700',
  },
};

export default function TeacherOverviewPage() {
  const router = useRouter();

  // Use unified teacher dashboard hook - handles all data fetching correctly
  const {
    teacher,
    activeSession,
    activeTerm,
    liveTimetable,
    examTimetable,
    classes,
    formClasses,
    schoolType,
    isLoading,
    hasError,
    errorMessage,
  } = useTeacherDashboard();

  // Get current day and time
  const now = useMemo(() => new Date(), []);
  const currentDay = useMemo(() => {
    const dayMap: Record<number, string> = {
      0: 'SUNDAY',
      1: 'MONDAY',
      2: 'TUESDAY',
      3: 'WEDNESDAY',
      4: 'THURSDAY',
      5: 'FRIDAY',
      6: 'SATURDAY',
    };
    return dayMap[now.getDay()];
  }, [now]);

  const currentTime = useMemo(() => {
    return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  }, [now]);

  const termEnded = activeTerm != null && !activeTerm.isOperationallyActive;
  const termOverdue = activeTerm?.isPastEndDate === true;
  const inExamPeriod = activeTerm?.isExamScheduleActive === true;

  // Derived data — lessons or exams depending on term phase
  const todaysPeriods = useMemo(() => getTodaySchedule(liveTimetable), [liveTimetable]);
  const todaysExams = useMemo(() => getExamTodaySchedule(examTimetable), [examTimetable]);
  const { currentPeriod, upcomingPeriods } = useMemo(
    () => getCurrentAndUpcomingPeriods(todaysPeriods, currentTime),
    [todaysPeriods, currentTime]
  );
  const weeklyOverview = useMemo(() => getWeeklySchedule(liveTimetable), [liveTimetable]);

  // Loading state
  if (isLoading) {
    return (
      <ProtectedRoute roles={['TEACHER']}>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
        </div>
      </ProtectedRoute>
    );
  }

  // Error state
  if (hasError) {
    return (
      <ProtectedRoute roles={['TEACHER']}>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <AlertCircle className="h-12 w-12 text-red-500" />
          <p className="text-light-text-secondary dark:text-dark-text-secondary">
            {errorMessage || 'Failed to load dashboard data'}
          </p>
          <Button onClick={() => window.location.reload()}>
            Retry
          </Button>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute roles={['TEACHER']}>
      <div className="w-full space-y-6">
        {/* Header */}
        <FadeInUp from={{ opacity: 0, y: -20 }} to={{ opacity: 1, y: 0 }} duration={0.5} className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h1 className="font-bold text-light-text-primary dark:text-dark-text-primary mb-1" style={{ fontSize: 'var(--text-page-title)' }}>
                Welcome back, {teacher?.firstName || 'Teacher'}!
              </h1>
              <p className="text-light-text-secondary dark:text-dark-text-secondary" style={{ fontSize: 'var(--text-page-subtitle)' }}>
                {DAY_LABELS[currentDay]}, {now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
            </div>
            {activeTerm && (
              <div className="flex items-center gap-2 px-3 py-2 bg-[#2490FD] rounded-lg shadow-sm">
                <Calendar className="h-4 w-4 text-white" />
                <div style={{ fontSize: 'var(--text-body)' }}>
                  <span className="font-medium text-white">
                    {activeTerm.name}
                  </span>
                  {activeSession && (
                    <>
                      <span className="text-white/80 mx-1">•</span>
                      <span className="text-white/90">
                        {activeSession.name}
                      </span>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </FadeInUp>

        {inExamPeriod && activeTerm && (
          <FadeInUp from={{ opacity: 0, y: 10 }} to={{ opacity: 1, y: 0 }} duration={0.4}>
            <div className="rounded-lg border px-4 py-3 flex items-start gap-3 bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700">
              <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
              <div>
                <p className="font-semibold text-red-900 dark:text-red-100" style={{ fontSize: 'var(--text-body)' }}>
                  Exam period — regular timetable paused
                </p>
                <p className="text-red-800 dark:text-red-200" style={{ fontSize: 'var(--text-small)' }}>
                  Follow your published exam timetable below. Exam assessments can be published now if scheme of work is complete.
                </p>
              </div>
            </div>
          </FadeInUp>
        )}

        {termEnded && activeTerm && !inExamPeriod && (
          <FadeInUp from={{ opacity: 0, y: 10 }} to={{ opacity: 1, y: 0 }} duration={0.4}>
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
                  style={{ fontSize: 'var(--text-body)' }}
                >
                  {termOverdue
                    ? `${activeTerm.name} has ended — no classes are scheduled`
                    : `${activeTerm.name} has not started yet`}
                </p>
                <p
                  className={
                    termOverdue
                      ? 'text-amber-800 dark:text-amber-200'
                      : 'text-blue-800 dark:text-blue-200'
                  }
                  style={{ fontSize: 'var(--text-small)' }}
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
                      . Your school admin should end this term or start the next one.
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

        {/* Today's Schedule */}
        <FadeInUp from={{ opacity: 0, y: 20 }} to={{ opacity: 1, y: 0 }} duration={0.5}>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 font-semibold text-light-text-primary dark:text-dark-text-primary" style={{ fontSize: 'var(--text-card-title)' }}>
                  <Calendar className="h-5 w-5 text-[#2490FD]" />
                  Today&apos;s Schedule
                </CardTitle>
                <span className="text-light-text-muted dark:text-dark-text-muted" style={{ fontSize: 'var(--text-small)' }}>
                  {inExamPeriod
                    ? `${todaysExams.length} exam${todaysExams.length === 1 ? '' : 's'}`
                    : `${todaysPeriods.filter((p) => p.type === 'LESSON').length} lessons`}
                </span>
              </div>
            </CardHeader>
            <CardContent>
              {inExamPeriod ? (
                todaysExams.length > 0 ? (
                  <div className="space-y-2">
                    {todaysExams.map((exam) => (
                      <div key={exam.id} className="p-3 rounded-lg border border-red-200 bg-red-50/50 dark:bg-red-900/10">
                        <p className="font-semibold">{exam.subjectName}</p>
                        <p className="text-sm text-light-text-secondary">{exam.startTime} – {exam.endTime}</p>
                        {(exam.classArmName || exam.className) && (
                          <p className="text-xs text-light-text-muted">{exam.classArmName || exam.className}</p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Calendar className="h-12 w-12 text-light-text-muted mx-auto mb-3" />
                    <p className="text-light-text-secondary">No exams scheduled for today</p>
                  </div>
                )
              ) : todaysPeriods.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 text-light-text-muted dark:text-dark-text-muted mx-auto mb-3" />
                  <p className="text-light-text-secondary dark:text-dark-text-secondary">
                    {termEnded
                      ? termOverdue
                        ? 'This term is over — your timetable is paused until the next term begins'
                        : 'No classes scheduled until this term starts'
                      : 'No classes scheduled for today'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Current Period Highlight */}
                  {currentPeriod && (
                    <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border-2 border-green-500 dark:border-green-600">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-2 py-0.5 text-xs font-semibold bg-green-500 text-white rounded animate-pulse">
                          NOW
                        </span>
                        <span className="text-green-700 dark:text-green-300 font-semibold" style={{ fontSize: 'var(--text-body)' }}>
                          {currentPeriod.startTime} - {currentPeriod.endTime}
                        </span>
                      </div>
                      <p className="font-semibold text-green-900 dark:text-green-100">
                        {currentPeriod.subjectName || 'Free Period'}
                      </p>
                      <p className="text-green-700 dark:text-green-300" style={{ fontSize: 'var(--text-body)' }}>
                        {currentPeriod.classArmName || currentPeriod.className || ''}
                      </p>
                      {currentPeriod.roomName && (
                        <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400 mt-2">
                          <MapPin className="h-3 w-3" />
                          {currentPeriod.roomName}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Upcoming Periods */}
                  {upcomingPeriods.length > 0 && (
                    <div className="space-y-2">
                      <p className="font-semibold text-light-text-muted dark:text-dark-text-muted uppercase tracking-wide" style={{ fontSize: 'var(--text-body)' }}>
                        Coming Up
                      </p>
                      {upcomingPeriods.map((period) => {
                        const colors = PERIOD_TYPE_COLORS[period.type] || PERIOD_TYPE_COLORS.LESSON;
                        return (
                          <div
                            key={period.id}
                            className={`p-3 rounded-lg border ${colors.bg} ${colors.border} ${colors.text}`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-semibold" style={{ fontSize: 'var(--text-body)' }}>
                                {period.subjectName || period.type}
                              </span>
                              <span className="text-xs font-medium">
                                {period.startTime} - {period.endTime}
                              </span>
                            </div>
                            {period.type === 'LESSON' && (
                              <p className="text-xs opacity-80">
                                {period.classArmName || period.className || ''}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Full Today's List (collapsed) */}
                  {todaysPeriods.length > (currentPeriod ? 1 : 0) + upcomingPeriods.length && (
                    <div className="pt-3 border-t border-light-border dark:border-dark-border">
                      <p className="font-semibold text-light-text-muted dark:text-dark-text-muted mb-2" style={{ fontSize: 'var(--text-body)' }}>
                        Full Schedule
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {todaysPeriods
                          .filter((p) => p.type === 'LESSON')
                          .map((period) => {
                            const isPast = period.endTime <= currentTime;
                            const isCurrent = currentPeriod?.id === period.id;
                            return (
                              <div
                                key={period.id}
                                className={`p-2 rounded text-xs ${isCurrent
                                  ? 'bg-green-100 dark:bg-green-900/30'
                                  : isPast
                                    ? 'bg-gray-100 dark:bg-gray-800'
                                    : 'bg-blue-50 dark:bg-blue-900/20'
                                  }`}
                              >
                                <div className="flex items-center justify-between gap-1 mb-0.5">
                                  <span className={`font-medium truncate ${isCurrent
                                    ? 'text-green-800 dark:text-green-200'
                                    : isPast
                                      ? 'text-gray-500 dark:text-gray-400 line-through'
                                      : 'text-gray-900 dark:text-gray-100'
                                    }`}>{period.subjectName}</span>
                                  <span className={`text-[10px] font-medium flex-shrink-0 ${isCurrent
                                    ? 'text-green-600 dark:text-green-400'
                                    : isPast
                                      ? 'text-gray-400 dark:text-gray-500'
                                      : 'text-blue-600 dark:text-blue-400'
                                    }`}>
                                    {period.startTime} - {period.endTime}
                                  </span>
                                </div>
                                <div className={`truncate font-medium ${isCurrent
                                  ? 'text-green-700 dark:text-green-300'
                                  : isPast
                                    ? 'text-gray-400 dark:text-gray-500 line-through'
                                    : 'text-purple-600 dark:text-purple-400'
                                  }`}>
                                  {period.classArmName || period.className}
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </FadeInUp>

        {/* Weekly Schedule */}
        <FadeInUp from={{ opacity: 0, y: 20 }} to={{ opacity: 1, y: 0 }} duration={0.5}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-semibold text-light-text-primary dark:text-dark-text-primary" style={{ fontSize: 'var(--text-card-title)' }}>
                <Clock className="h-5 w-5 text-[#2490FD]" />
                Weekly Schedule
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <div className="grid grid-cols-5 gap-3 min-w-[600px]">
                  {DAYS.slice(0, 5).map((day) => {
                    const periods = weeklyOverview[day] || [];
                    const isToday = day === currentDay;
                    return (
                      <div
                        key={day}
                        className={`rounded-lg p-3 ${isToday
                          ? 'bg-blue-50 dark:bg-blue-900/30 border-2 border-blue-500 dark:border-blue-400'
                          : 'bg-[var(--light-surface)] dark:bg-[var(--dark-surface)] border border-light-border dark:border-dark-border'
                          }`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <h3
                            style={{ fontSize: 'var(--text-body)' }}
                            className={`font-semibold ${isToday
                              ? 'text-blue-700 dark:text-blue-300'
                              : 'text-light-text-primary dark:text-dark-text-primary'
                              }`}
                          >
                            {DAY_LABELS[day].slice(0, 3)}
                          </h3>
                          <span className="text-xs text-light-text-muted dark:text-dark-text-muted">
                            {periods.length} lessons
                          </span>
                        </div>
                        <div className="space-y-1.5">
                          {periods.length === 0 ? (
                            <p className="text-xs text-light-text-muted dark:text-dark-text-muted text-center py-2">
                              Free day
                            </p>
                          ) : (
                            periods.slice(0, 4).map((period) => (
                              <div
                                key={period.id}
                                className="text-xs p-2 rounded-md bg-white dark:bg-[var(--dark-bg)] border border-gray-200 dark:border-gray-700"
                              >
                                <div className="flex items-center justify-between gap-1 mb-0.5">
                                  <span className="font-medium truncate text-gray-900 dark:text-gray-100">
                                    {period.subjectName}
                                  </span>
                                  <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium flex-shrink-0">
                                    {period.startTime}
                                  </span>
                                </div>
                                <div className="text-purple-600 dark:text-purple-400 truncate font-medium">
                                  {period.classArmName || period.className}
                                </div>
                              </div>
                            ))
                          )}
                          {periods.length > 4 && (
                            <p className="text-xs text-center text-light-text-muted dark:text-dark-text-muted">
                              +{periods.length - 4} more
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </FadeInUp>

        {/* Form Management / Managed Classes */}
        {formClasses && formClasses.length > 0 && (
          <FadeInUp from={{ opacity: 0, y: 20 }} to={{ opacity: 1, y: 0 }} duration={0.5}>
            <Card className={cn(
              "border-l-4",
              schoolType === 'SECONDARY' ? "bg-green-500/5 border-green-500/20 border-l-green-600" : "bg-purple-500/5 border-purple-500/20 border-l-purple-600"
            )}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 font-semibold text-light-text-primary dark:text-dark-text-primary" style={{ fontSize: 'var(--text-card-title)' }}>
                    <Users className={cn("h-5 w-5", schoolType === 'SECONDARY' ? "text-green-600" : "text-purple-600")} />
                    {schoolType === 'SECONDARY' ? 'My Form Classes' : 'My Primary Classes'}
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {formClasses.map((cls) => (
                    <div
                      key={cls.id}
                      onClick={() => router.push(`/dashboard/teacher/classes/${cls.id}`)}
                      className={cn(
                        "flex items-center justify-between p-4 rounded-xl border border-light-border dark:border-dark-border cursor-pointer transition-all hover:shadow-md",
                        schoolType === 'SECONDARY' ? "hover:border-green-500/50" : "hover:border-purple-500/50"
                      )}
                    >
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "h-10 w-10 rounded-lg flex items-center justify-center font-bold",
                          schoolType === 'SECONDARY' ? "bg-green-100 dark:bg-green-900/30 text-green-600" : "bg-purple-100 dark:bg-purple-900/30 text-purple-600"
                        )}>
                          {cls.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-light-text-primary dark:text-dark-text-primary">
                            {cls.name}
                          </p>
                          <p className="text-xs text-light-text-muted dark:text-dark-text-muted">
                            {cls.studentsCount || 0} Students assigned
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className={cn(
                          "px-2 py-0.5 text-[10px] font-bold uppercase rounded",
                          schoolType === 'SECONDARY' ? "bg-green-100 text-green-700" : "bg-purple-100 text-purple-700"
                        )}>
                          Form
                        </span>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-7 px-2 text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/dashboard/teacher/classes/${cls.id}?tab=roll-call`);
                          }}
                        >
                          Roll Call
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </FadeInUp>
        )}

        {/* My Classes */}
        <FadeInUp from={{ opacity: 0, y: 20 }} to={{ opacity: 1, y: 0 }} duration={0.5}>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 font-semibold text-light-text-primary dark:text-dark-text-primary" style={{ fontSize: 'var(--text-card-title)' }}>
                  <BookOpen className="h-5 w-5 text-[#2490FD]" />
                  My Subjects
                </CardTitle>
                <button
                  onClick={() => router.push('/dashboard/teacher/classes')}
                  className="text-[#2490FD] hover:text-[#2490FD]/80 transition-colors flex items-center font-medium"
                  style={{ fontSize: 'var(--text-body)' }}
                >
                  View All
                  <ChevronRight className="h-4 w-4 ml-1" />
                </button>
              </div>
            </CardHeader>
            <CardContent>
              {classes.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-light-text-muted dark:text-dark-text-muted" style={{ fontSize: 'var(--text-body)' }}>
                    No classes assigned yet
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {classes.slice(0, 6).map((cls) => (
                    <div
                      key={cls.id}
                      onClick={() => router.push(`/dashboard/teacher/classes/${cls.id}`)}
                      className="flex items-center justify-between p-3 rounded-lg border border-light-border dark:border-dark-border hover:bg-light-surface dark:hover:bg-[var(--dark-hover)] cursor-pointer transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-light-text-primary dark:text-dark-text-primary truncate" style={{ fontSize: 'var(--text-body)' }}>
                          {cls.name}
                        </p>
                        {cls.teachers?.[0]?.subject && (
                          <p className="text-xs text-light-text-muted dark:text-dark-text-muted truncate">
                            {cls.teachers[0].subject}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs text-light-text-muted dark:text-dark-text-muted">
                          {cls.studentsCount || 0}
                        </span>
                        <Users className="h-3 w-3 text-light-text-muted dark:text-dark-text-muted" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </FadeInUp>
      </div>
    </ProtectedRoute>
  );
}

