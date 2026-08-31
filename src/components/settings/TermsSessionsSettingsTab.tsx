'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { FadeInUp } from '@/components/ui/FadeInUp';
import { SettingsSection } from '@/components/settings/SettingsSection';
import { EditTermDatesModal, EditSessionDatesModal } from '@/components/modals';
import {
  Calendar,
  GraduationCap,
  ArrowRight,
  AlertCircle,
  Clock,
  Pencil,
  Lock,
  BookOpen,
  ClipboardList,
} from 'lucide-react';
import {
  useGetMySchoolQuery,
  useGetActiveSessionQuery,
  type Term,
} from '@/lib/store/api/schoolAdminApi';
import { useSchoolType } from '@/hooks/useSchoolType';
import { PermissionGate } from '@/components/permissions/PermissionGate';
import { PermissionResource, PermissionType } from '@/hooks/usePermissions';
import {
  formatDateRange,
  getSchoolTypeLabel,
  getTermLabel,
  parseTermEditFocus,
  type TermEditFocus,
} from '@/components/settings/termsSessionHelpers';

function MilestoneRow({
  label,
  description,
  start,
  end,
  emptyLabel,
  onEdit,
  canEdit = true,
}: {
  label: string;
  description?: string;
  start?: string | null;
  end?: string | null;
  emptyLabel: string;
  onEdit: () => void;
  canEdit?: boolean;
}) {
  const range = formatDateRange(start, end);

  return (
    <div className="flex items-center justify-between gap-3 p-3 rounded-lg border border-light-border dark:border-dark-border bg-light-surface dark:bg-dark-bg">
      <div className="min-w-0">
        <p
          className="font-medium text-light-text-primary dark:text-dark-text-primary"
          style={{ fontSize: 'var(--text-body)' }}
        >
          {label}
        </p>
        {description && (
          <p
            className="text-light-text-muted dark:text-dark-text-muted mt-0.5"
            style={{ fontSize: 'var(--text-small)' }}
          >
            {description}
          </p>
        )}
        <p
          className={`mt-1 ${range ? 'text-light-text-secondary dark:text-dark-text-secondary' : 'text-light-text-muted dark:text-dark-text-muted italic'}`}
          style={{ fontSize: 'var(--text-body)' }}
        >
          {range ?? emptyLabel}
        </p>
      </div>
      {canEdit ? (
        <PermissionGate resource={PermissionResource.SESSIONS} type={PermissionType.WRITE}>
          <Button
            variant="ghost"
            size="sm"
            onClick={onEdit}
            className="flex-shrink-0 text-[var(--agora-blue)]"
            style={{ fontSize: 'var(--text-small)' }}
          >
            <Pencil className="h-3.5 w-3.5 mr-1" />
            Edit
          </Button>
        </PermissionGate>
      ) : (
        <div
          className="flex items-center gap-1 text-light-text-muted dark:text-dark-text-muted flex-shrink-0"
          style={{ fontSize: 'var(--text-small)' }}
        >
          <Lock className="h-3.5 w-3.5" />
          Locked
        </div>
      )}
    </div>
  );
}

export function TermsSessionsSettingsTab() {
  const searchParams = useSearchParams();
  const { currentType, isMixed } = useSchoolType();
  const termLabel = getTermLabel(currentType);
  const termLabelLower = termLabel.toLowerCase();

  const [editingTerm, setEditingTerm] = useState<Term | null>(null);
  const [termEditFocus, setTermEditFocus] = useState<TermEditFocus>('dates');
  const [editingSession, setEditingSession] = useState(false);

  const { data: schoolResponse, isLoading: isLoadingSchool } = useGetMySchoolQuery();
  const schoolId = schoolResponse?.data?.id;

  const { data: activeSessionResponse, isLoading: isLoadingSession } = useGetActiveSessionQuery(
    { schoolId: schoolId!, schoolType: currentType || undefined },
    { skip: !schoolId || !currentType },
  );

  const activeSession = activeSessionResponse?.data;
  const session = activeSession?.session;
  const activeTerm = activeSession?.term;
  const hasActiveSession = !!session;
  const hasActiveTerm = !!activeTerm;

  const openTermEditor = (term: Term, focus: TermEditFocus) => {
    setTermEditFocus(focus);
    setEditingTerm(term);
  };

  useEffect(() => {
    if (searchParams.get('action') !== 'term-dates') return;
    const term = activeTerm;
    if (!term) return;
    setTermEditFocus(parseTermEditFocus(searchParams.get('focus')));
    setEditingTerm(term);
  }, [searchParams, activeTerm]);

  if (isLoadingSchool || isLoadingSession) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!schoolId || !currentType) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <span style={{ fontSize: 'var(--text-body)' }}>
          Select a school type to manage sessions and {termLabelLower}s.
        </span>
      </Alert>
    );
  }

  const isTermLocked =
    activeTerm?.status === 'COMPLETED' || activeTerm?.status === 'ARCHIVED';

  return (
    <div className="space-y-8">
      {/* ── General ── */}
      <FadeInUp from={{ opacity: 0, y: 12 }} to={{ opacity: 1, y: 0 }} duration={0.35}>
        <SettingsSection
          title="General"
          description={`Academic calendar overview for ${getSchoolTypeLabel(currentType)}.`}
        >
          {isMixed && (
            <Alert className="mb-3">
              <GraduationCap className="h-4 w-4" />
              <div style={{ fontSize: 'var(--text-body)' }}>
                <strong>Managing:</strong> {getSchoolTypeLabel(currentType)}
                <p
                  className="text-light-text-secondary dark:text-dark-text-secondary mt-1"
                  style={{ fontSize: 'var(--text-small)' }}
                >
                  Each school type has independent sessions and {termLabelLower}s.
                </p>
              </div>
            </Alert>
          )}

          <Card>
            <CardContent className="pt-5 space-y-4">
              {hasActiveSession ? (
                <div className="rounded-lg border border-light-border dark:border-dark-border p-4 bg-light-surface dark:bg-dark-bg">
                  <p
                    className="text-light-text-secondary dark:text-dark-text-secondary mb-1"
                    style={{ fontSize: 'var(--text-small)' }}
                  >
                    Active session
                  </p>
                  <p
                    className="font-semibold text-light-text-primary dark:text-dark-text-primary"
                    style={{ fontSize: 'var(--text-card-title)' }}
                  >
                    {session!.name}
                    {hasActiveTerm && (
                      <span
                        className="font-normal text-light-text-secondary dark:text-dark-text-secondary"
                        style={{ fontSize: 'var(--text-body)' }}
                      >
                        {' '}
                        · {activeTerm!.name}
                      </span>
                    )}
                  </p>
                  {hasActiveTerm && activeTerm?.daysRemaining != null && (
                    <p
                      className="text-light-text-muted dark:text-dark-text-muted mt-2"
                      style={{ fontSize: 'var(--text-small)' }}
                    >
                      {activeTerm.daysRemaining >= 0
                        ? `${activeTerm.daysRemaining} days remaining in this ${termLabelLower}`
                        : `${Math.abs(activeTerm.daysRemaining)} days past scheduled end`}
                    </p>
                  )}
                </div>
              ) : (
                <p
                  className="text-light-text-secondary dark:text-dark-text-secondary"
                  style={{ fontSize: 'var(--text-body)' }}
                >
                  No active session for {getSchoolTypeLabel(currentType)}. Start a session to begin
                  the academic year.
                </p>
              )}

              <Button asChild className="rounded-xl" style={{ fontSize: 'var(--text-body)' }}>
                <Link href="/dashboard/school/settings/session">
                  {hasActiveSession
                    ? `Open session & ${termLabelLower} wizard`
                    : 'Start session wizard'}
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </SettingsSection>
      </FadeInUp>

      {/* ── Current Session ── */}
      {hasActiveSession && session && (
        <FadeInUp from={{ opacity: 0, y: 12 }} to={{ opacity: 1, y: 0 }} duration={0.35} delay={0.05}>
          <SettingsSection
            title="Current session"
            description="Adjust the academic year period. Session start can be changed before it begins or within the first week."
          >
            <Card>
              <CardContent className="pt-5">
                <div className="flex items-center justify-between gap-3 p-4 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/10">
                  <div>
                    <p
                      className="font-medium text-light-text-primary dark:text-dark-text-primary mb-1"
                      style={{ fontSize: 'var(--text-body)' }}
                    >
                      {session.name}
                    </p>
                    <div
                      className="flex items-center gap-1 text-light-text-secondary dark:text-dark-text-secondary"
                      style={{ fontSize: 'var(--text-small)' }}
                    >
                      <Clock className="h-3.5 w-3.5 flex-shrink-0" />
                      <span>{formatDateRange(session.startDate, session.endDate)}</span>
                    </div>
                  </div>
                  <PermissionGate resource={PermissionResource.SESSIONS} type={PermissionType.WRITE}>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingSession(true)}
                      disabled={session.status === 'COMPLETED'}
                      className="text-[var(--agora-blue)]"
                      style={{ fontSize: 'var(--text-small)' }}
                    >
                      <Pencil className="h-3.5 w-3.5 mr-1" />
                      Edit dates
                    </Button>
                  </PermissionGate>
                </div>
              </CardContent>
            </Card>
          </SettingsSection>
        </FadeInUp>
      )}

      {/* ── Current Term ── */}
      {hasActiveSession && session && (
        <FadeInUp from={{ opacity: 0, y: 12 }} to={{ opacity: 1, y: 0 }} duration={0.35} delay={0.1}>
          <SettingsSection
            title={`Current ${termLabelLower}`}
            description={
              hasActiveTerm
                ? `Manage ${termLabelLower} dates, midterm tests, exams, and breaks for the active ${termLabelLower}.`
                : `No active ${termLabelLower} right now. Start one from the session wizard.`
            }
          >
            {hasActiveTerm && activeTerm ? (
              <Card>
                <CardContent className="pt-5 space-y-3">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <Calendar className="h-4 w-4 text-[var(--agora-blue)]" />
                    <span
                      className="font-semibold text-light-text-primary dark:text-dark-text-primary"
                      style={{ fontSize: 'var(--text-card-title)' }}
                    >
                      {activeTerm.name}
                    </span>
                    <span
                      className="px-2 py-0.5 rounded-full font-medium bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300"
                      style={{ fontSize: 'var(--text-tiny)' }}
                    >
                      {activeTerm.status}
                    </span>
                    {activeTerm.currentWeek != null && (
                      <span
                        className="text-[var(--agora-blue)] font-medium"
                        style={{ fontSize: 'var(--text-small)' }}
                      >
                        Week {activeTerm.currentWeek}
                        {activeTerm.totalWeeks ? ` of ${activeTerm.totalWeeks}` : ''}
                      </span>
                    )}
                  </div>

                  <MilestoneRow
                    label={`${termLabel} period`}
                    description="Start and end dates"
                    start={activeTerm.startDate}
                    end={activeTerm.endDate}
                    emptyLabel="Not set"
                    canEdit={!isTermLocked}
                    onEdit={() => openTermEditor(activeTerm, 'dates')}
                  />

                  <MilestoneRow
                    label="Half-term break"
                    description="Non-teaching days"
                    start={activeTerm.halfTermStart}
                    end={activeTerm.halfTermEnd}
                    emptyLabel="Not set — add break dates"
                    canEdit={!isTermLocked}
                    onEdit={() => openTermEditor(activeTerm, 'halfTerm')}
                  />

                  <MilestoneRow
                    label="Midterm tests"
                    description="Assessment window"
                    start={activeTerm.midtermStart}
                    end={activeTerm.midtermEnd}
                    emptyLabel="Not set — add midterm dates"
                    canEdit={!isTermLocked}
                    onEdit={() => openTermEditor(activeTerm, 'midterm')}
                  />

                  <MilestoneRow
                    label="Exam dates"
                    description={`End-of-${termLabelLower} exams`}
                    start={activeTerm.examStart}
                    end={activeTerm.examEnd}
                    emptyLabel="Not set — add exam dates"
                    canEdit={!isTermLocked}
                    onEdit={() => openTermEditor(activeTerm, 'exam')}
                  />

                  {!isTermLocked && (
                    <PermissionGate resource={PermissionResource.SESSIONS} type={PermissionType.WRITE}>
                      <Button
                        variant="ghost"
                        className="w-full mt-1 text-[var(--agora-blue)]"
                        style={{ fontSize: 'var(--text-body)' }}
                        onClick={() => openTermEditor(activeTerm, 'dates')}
                      >
                        <BookOpen className="h-4 w-4 mr-2" />
                        Edit all {termLabelLower} dates
                      </Button>
                    </PermissionGate>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="pt-5">
                  <p
                    className="text-light-text-secondary dark:text-dark-text-secondary"
                    style={{ fontSize: 'var(--text-body)' }}
                  >
                    Start a {termLabelLower} from the session wizard to configure dates and
                    assessments here.
                  </p>
                </CardContent>
              </Card>
            )}
          </SettingsSection>
        </FadeInUp>
      )}

      {/* ── All Terms ── */}
      {hasActiveSession && session?.terms && session.terms.length > 0 && (
        <FadeInUp from={{ opacity: 0, y: 12 }} to={{ opacity: 1, y: 0 }} duration={0.35} delay={0.15}>
          <SettingsSection
            title={`All ${termLabelLower}s in session`}
            description={`View and edit dates for every ${termLabelLower} in ${session.name}.`}
          >
            <Card>
              <CardContent className="pt-5 space-y-3">
                {[...session.terms]
                  .sort((a, b) => a.number - b.number)
                  .map((term) => {
                    const isActive = term.status === 'ACTIVE';
                    const isCompleted =
                      term.status === 'COMPLETED' || term.status === 'ARCHIVED';

                    return (
                      <div
                        key={term.id}
                        className={`flex items-center justify-between gap-3 p-4 rounded-lg border transition-colors ${
                          isActive
                            ? 'border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/10'
                            : 'border-light-border dark:border-dark-border bg-light-surface dark:bg-dark-bg'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span
                              className="font-medium text-light-text-primary dark:text-dark-text-primary"
                              style={{ fontSize: 'var(--text-body)' }}
                            >
                              {term.name}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-full font-medium ${
                                isActive
                                  ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
                                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                              }`}
                              style={{ fontSize: 'var(--text-tiny)' }}
                            >
                              {term.status}
                            </span>
                          </div>
                          <div
                            className="flex items-center gap-1 text-light-text-secondary dark:text-dark-text-secondary flex-wrap"
                            style={{ fontSize: 'var(--text-small)' }}
                          >
                            <Clock className="h-3.5 w-3.5 flex-shrink-0" />
                            <span>{formatDateRange(term.startDate, term.endDate)}</span>
                          </div>
                          <div
                            className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-light-text-muted dark:text-dark-text-muted"
                            style={{ fontSize: 'var(--text-tiny)' }}
                          >
                            <span className="inline-flex items-center gap-1">
                              <ClipboardList className="h-3 w-3" />
                              Midterm:{' '}
                              {formatDateRange(term.midtermStart, term.midtermEnd) ?? 'Not set'}
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <BookOpen className="h-3 w-3" />
                              Exams: {formatDateRange(term.examStart, term.examEnd) ?? 'Not set'}
                            </span>
                          </div>
                        </div>
                        <div className="flex-shrink-0">
                          {isCompleted ? (
                            <div
                              className="flex items-center gap-1 text-light-text-muted dark:text-dark-text-muted"
                              style={{ fontSize: 'var(--text-small)' }}
                            >
                              <Lock className="h-3.5 w-3.5" />
                              Locked
                            </div>
                          ) : (
                            <PermissionGate
                              resource={PermissionResource.SESSIONS}
                              type={PermissionType.WRITE}
                            >
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openTermEditor(term, 'dates')}
                                className="text-[var(--agora-blue)]"
                                style={{ fontSize: 'var(--text-small)' }}
                              >
                                <Pencil className="h-3.5 w-3.5 mr-1" />
                                Edit
                              </Button>
                            </PermissionGate>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </CardContent>
            </Card>
          </SettingsSection>
        </FadeInUp>
      )}

      {editingSession && session && (
        <EditSessionDatesModal
          isOpen={editingSession}
          onClose={() => setEditingSession(false)}
          session={session}
          schoolId={schoolId}
          termLabel={termLabel}
        />
      )}

      {editingTerm && session && (
        <EditTermDatesModal
          isOpen={!!editingTerm}
          onClose={() => setEditingTerm(null)}
          term={editingTerm}
          session={session}
          schoolId={schoolId}
          termLabel={termLabel}
          initialFocus={termEditFocus}
        />
      )}
    </div>
  );
}
