'use client';

import { useState, useMemo } from 'react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { FadeInUp } from '@/components/ui/FadeInUp';
import { Clock, Calendar, Loader2, AlertCircle, ChevronDown } from 'lucide-react';
import {
  useGetSessionsQuery,
  useGetTimetableForTeacherQuery,
} from '@/lib/store/api/schoolAdminApi';
import { TeacherTimetableGrid } from '@/components/timetable/TeacherTimetableGrid';
import { useTeacherDashboard } from '@/hooks/useTeacherDashboard';
import { getTerminology } from '@/lib/utils/terminology';

export default function TeacherTimetablesPage() {
  const [selectedTermId, setSelectedTermId] = useState<string>('');

  // Use unified teacher dashboard hook for core data
  const {
    teacher,
    school,
    schoolType,
    activeTerm,
    liveTimetable,
    isLoading: isDashboardLoading,
    hasError,
    errorMessage,
  } = useTeacherDashboard();

  const schoolId = school?.id;
  const teacherId = teacher?.id;

  const terminology = getTerminology(schoolType) || {
    courses: 'Classes',
    courseSingular: 'Class',
    staff: 'Teachers',
    staffSingular: 'Teacher',
    periods: 'Terms',
    periodSingular: 'Term',
    subjects: 'Subjects',
    subjectSingular: 'Subject',
  };

  // Get all sessions to populate term selector
  const { data: sessionsResponse } = useGetSessionsQuery(
    { schoolId: schoolId! },
    { skip: !schoolId }
  );

  // Determine which term to use (selected or active from dashboard)
  const currentTermId = selectedTermId || activeTerm?.id || '';

  // If user selected a different term, fetch that timetable
  // Otherwise use the dashboard's timetable (which is for the active term)
  const needsSeparateFetch = selectedTermId && selectedTermId !== activeTerm?.id;

  const { data: selectedTermTimetableResponse, isLoading: isLoadingSelectedTerm, error } = useGetTimetableForTeacherQuery(
    {
      schoolId: schoolId!,
      teacherId: teacherId!,
      termId: selectedTermId,
    },
    { skip: !needsSeparateFetch || !schoolId || !teacherId || !selectedTermId }
  );

  // Use selected term's timetable if fetched, otherwise live timetable for active term
  const timetable = needsSeparateFetch
    ? (selectedTermTimetableResponse?.data || [])
    : liveTimetable;

  const termEnded =
    !needsSeparateFetch && activeTerm != null && !activeTerm.isOperationallyActive;
  const termOverdue = termEnded && activeTerm?.isPastEndDate === true;

  const isLoading = isDashboardLoading || (needsSeparateFetch && isLoadingSelectedTerm);

  // Get all terms from sessions for term selector - filtered by school type and deduplicated
  const allTerms = useMemo(() => {
    if (!sessionsResponse?.data) return [];

    // Filter sessions by current school type to avoid duplicates
    const filteredSessions = sessionsResponse.data.filter((session) => {
      if (!schoolType) return !session.schoolType;
      return session.schoolType === schoolType;
    });

    // Deduplicate sessions by name (keep first/latest)
    const uniqueSessionsMap = new Map<string, typeof filteredSessions[0]>();
    filteredSessions.forEach((session) => {
      if (!uniqueSessionsMap.has(session.name)) {
        uniqueSessionsMap.set(session.name, session);
      }
    });

    const terms: Array<{ id: string; name: string; sessionName: string }> = [];
    Array.from(uniqueSessionsMap.values()).forEach((session) => {
      if (session.terms) {
        session.terms.forEach((term) => {
          terms.push({
            id: term.id,
            name: term.name,
            sessionName: session.name,
          });
        });
      }
    });

    // Sort by session name (desc) then term number
    return terms.sort((a, b) => {
      const sessionCompare = b.sessionName.localeCompare(a.sessionName);
      if (sessionCompare !== 0) return sessionCompare;
      return a.name.localeCompare(b.name);
    });
  }, [sessionsResponse, schoolType]);

  return (
    <ProtectedRoute roles={['TEACHER']}>
      <div className="w-full">
        {/* Header */}
        <FadeInUp from={{ opacity: 0, y: -20 }} to={{ opacity: 1, y: 0 }} duration={0.5} className="mb-8">
          <h1 className="font-bold text-light-text-primary dark:text-dark-text-primary mb-2" style={{ fontSize: 'var(--text-page-title)' }}>
            My Timetable
          </h1>
          <p className="text-light-text-secondary dark:text-dark-text-secondary">
            View your weekly teaching schedule for the current {terminology.periodSingular.toLowerCase()}
          </p>
        </FadeInUp>

        {termEnded && activeTerm && (
          <FadeInUp from={{ opacity: 0, y: 10 }} to={{ opacity: 1, y: 0 }} duration={0.4} className="mb-6">
            <Card className="border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-900 dark:text-amber-100">
                      {termOverdue
                        ? `${activeTerm.name} ended on ${new Date(activeTerm.endDate).toLocaleDateString()}`
                        : `${activeTerm.name} has not started yet`}
                    </p>
                    <p className="text-sm text-amber-800 dark:text-amber-200 mt-1">
                      {termOverdue
                        ? 'Your live timetable is hidden until the school admin ends this term or starts the next one. Select a past term from the dropdown to review its schedule.'
                        : 'Your live timetable will appear when this term begins.'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </FadeInUp>
        )}

        {/* Error State */}
        {error && (
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
                <AlertCircle className="h-5 w-5" />
                <div>
                  <p className="font-medium">Failed to load timetable</p>
                  <p className="text-sm text-light-text-muted dark:text-dark-text-muted">
                    Please try refreshing the page or contact support if the issue persists.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Loading State */}
        {isLoading && (
          <Card>
            <CardContent className="py-12 text-center">
              <Loader2 className="h-12 w-12 text-light-text-muted dark:text-dark-text-muted mx-auto mb-4 animate-spin" />
              <p className="text-light-text-secondary dark:text-dark-text-secondary">
                Loading timetable...
              </p>
            </CardContent>
          </Card>
        )}

        {/* Timetable Grid */}
        {!isLoading && !error && (
          <TeacherTimetableGrid
            timetable={timetable}
            schoolType={schoolType}
            isLoading={!!isLoading}
            allTerms={allTerms}
            selectedTermId={currentTermId}
            onTermChange={setSelectedTermId}
            activeTermId={activeTerm?.id}
            terminology={terminology}
          />
        )}

        {/* Empty State - No Term Selected */}
        {!isLoading && !error && !currentTermId && (
          <Card>
            <CardContent className="py-12 text-center">
              <Calendar className="h-12 w-12 text-light-text-muted dark:text-dark-text-muted mx-auto mb-4" />
              <p className="text-light-text-secondary dark:text-dark-text-secondary mb-2">
                No {terminology.periodSingular.toLowerCase()} selected
              </p>
              <p className="text-sm text-light-text-muted dark:text-dark-text-muted">
                Please select a {terminology.periodSingular.toLowerCase()} from the dropdown above to view your timetable.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </ProtectedRoute>
  );
}
