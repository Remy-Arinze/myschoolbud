'use client';

import { useState, useMemo } from 'react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { FadeInUp } from '@/components/ui/FadeInUp';
import { Clock, Loader2, AlertCircle } from 'lucide-react';
import {
  useGetSessionsQuery,
  useGetMyStudentTimetableQuery,
} from '@/lib/store/api/schoolAdminApi';
import { TeacherTimetableGrid } from '@/components/timetable/TeacherTimetableGrid';
import { useStudentDashboard, getStudentTerminology } from '@/hooks/useStudentDashboard';

export default function StudentTimetablesPage() {
  const [selectedTermId, setSelectedTermId] = useState<string>('');

  // Use unified dashboard hook - single source of truth for student data
  const {
    school,
    schoolType,
    activeTerm,
    liveTimetable,
    isLoading: isDashboardLoading,
    hasError,
    errorMessage,
  } = useStudentDashboard();

  const schoolId = school?.id;
  const terminology = getStudentTerminology(schoolType);

  // Get all sessions to populate term selector (for selecting different terms)
  const { data: sessionsResponse } = useGetSessionsQuery(
    { schoolId: schoolId || '' },
    { skip: !schoolId }
  );

  // Determine which term to use (selected or active from dashboard)
  const currentTermId = selectedTermId || activeTerm?.id || '';

  // If user selected a different term, fetch that timetable
  const needsSeparateFetch = selectedTermId && selectedTermId !== activeTerm?.id;

  const {
    data: selectedTermTimetableResponse,
    isLoading: isLoadingSelectedTerm,
  } = useGetMyStudentTimetableQuery(
    { termId: selectedTermId },
    { skip: !needsSeparateFetch || !selectedTermId }
  );

  // Use selected term's timetable if fetched, otherwise live timetable for active term
  const timetable = needsSeparateFetch
    ? selectedTermTimetableResponse?.data
    : liveTimetable;

  const termEnded =
    !needsSeparateFetch && activeTerm != null && !activeTerm.isOperationallyActive;
  const termOverdue = termEnded && activeTerm?.isPastEndDate === true;

  const isLoading = isDashboardLoading || (needsSeparateFetch && isLoadingSelectedTerm) || timetable === undefined;

  // Extract all terms from sessions for selector - filtered by school type and deduplicated
  const allTerms = useMemo(() => {
    if (!sessionsResponse?.data) return [];

    // Filter sessions by current school type to avoid duplicates
    const filteredSessions = sessionsResponse.data.filter((session: any) => {
      if (!schoolType) return !session.schoolType;
      return session.schoolType === schoolType;
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

    // Sort by session name and term name
    return terms.sort((a, b) => {
      if (a.sessionName !== b.sessionName) {
        return b.sessionName.localeCompare(a.sessionName);
      }
      return b.name.localeCompare(a.name);
    });
  }, [sessionsResponse, schoolType]);

  if (isLoading) {
    return (
      <ProtectedRoute roles={['STUDENT']}>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 text-light-text-muted dark:text-dark-text-muted mx-auto mb-4 animate-spin" />
            <p className="text-light-text-secondary dark:text-dark-text-secondary">
              Loading timetable...
            </p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (hasError) {
    return (
      <ProtectedRoute roles={['STUDENT']}>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-4" />
            <p className="text-light-text-secondary dark:text-dark-text-secondary">
              {errorMessage || 'Unable to load timetable'}
            </p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute roles={['STUDENT']}>
      <div className="w-full">
        <FadeInUp from={{ opacity: 0, y: -20 }} to={{ opacity: 1, y: 0 }} duration={0.5} className="mb-6">
          <h1 className="text-3xl font-bold text-light-text-primary dark:text-dark-text-primary mb-2">
            My Timetable
          </h1>
          <p className="text-light-text-secondary dark:text-dark-text-secondary">
            View your weekly class schedule
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
                        ? 'Your live timetable is hidden until the next term begins. Select a past term from the dropdown to review its schedule.'
                        : 'Your timetable will appear when this term begins.'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </FadeInUp>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Weekly Schedule
            </CardTitle>
          </CardHeader>
          <CardContent>
            {timetable && timetable.length > 0 ? (
              <TeacherTimetableGrid
                timetable={timetable}
                schoolType={schoolType}
                isLoading={isLoading}
                allTerms={allTerms}
                selectedTermId={currentTermId}
                onTermChange={setSelectedTermId}
                activeTermId={activeTerm?.id}
                terminology={terminology}
              />
            ) : (
              <div className="text-center py-12">
                <Clock className="h-12 w-12 text-light-text-muted dark:text-dark-text-muted mx-auto mb-4" />
                <p className="text-light-text-secondary dark:text-dark-text-secondary">
                  No timetable available for the selected {terminology.periodSingular.toLowerCase()}
                </p>
                {!currentTermId && (
                  <p className="text-sm text-light-text-muted dark:text-dark-text-muted mt-2">
                    Please select a {terminology.periodSingular.toLowerCase()} from the dropdown above to view your timetable.
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  );
}
