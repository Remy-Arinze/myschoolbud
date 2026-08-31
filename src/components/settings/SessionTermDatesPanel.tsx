'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { FadeInUp } from '@/components/ui/FadeInUp';
import { SettingsSection } from '@/components/settings/SettingsSection';
import { Clock, Lock, Pencil } from 'lucide-react';
import { PermissionGate } from '@/components/permissions/PermissionGate';
import { PermissionResource, PermissionType } from '@/hooks/usePermissions';
import { EditTermDatesModal, EditSessionDatesModal } from '@/components/modals';
import type { ActiveSession, Term } from '@/lib/store/api/schoolAdminApi';
import {
  formatDateRange,
  type TermEditFocus,
} from '@/components/settings/termsSessionHelpers';

interface SessionTermDatesPanelProps {
  schoolId: string;
  activeSession: ActiveSession;
  termLabel?: string;
  /** Open the active term date editor on mount (e.g. from setup checklist deep link) */
  autoOpenActiveTerm?: boolean;
  /** Which section to focus in the term editor when auto-opening */
  autoOpenFocus?: TermEditFocus;
}

export function SessionTermDatesPanel({
  schoolId,
  activeSession,
  termLabel = 'Term',
  autoOpenActiveTerm = false,
  autoOpenFocus = 'dates',
}: SessionTermDatesPanelProps) {
  const [editingTerm, setEditingTerm] = useState<Term | null>(null);
  const [termEditFocus, setTermEditFocus] = useState<TermEditFocus>('dates');
  const [editingSession, setEditingSession] = useState(false);

  useEffect(() => {
    if (!autoOpenActiveTerm || !activeSession.term) return;
    setTermEditFocus(autoOpenFocus);
    setEditingTerm(activeSession.term);
  }, [autoOpenActiveTerm, autoOpenFocus, activeSession.term]);

  const session = activeSession.session;
  if (!session?.terms?.length) return null;

  const termLabelLower = termLabel.toLowerCase();

  return (
    <>
      <FadeInUp from={{ opacity: 0, y: 20 }} to={{ opacity: 1, y: 0 }} duration={0.4} delay={0.1}>
        <SettingsSection
          title="Session dates"
          description="Adjust the academic year period. Session start can be changed before it begins or within the first week."
          className="mb-6"
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

      <FadeInUp from={{ opacity: 0, y: 20 }} to={{ opacity: 1, y: 0 }} duration={0.4} delay={0.15}>
        <SettingsSection
          title={`${termLabel} dates`}
          description={`Adjust start and end dates for your ${termLabelLower}s. Milestones like midterm and exams can be edited from Settings → Terms & Sessions.`}
        >
          <Card>
            <CardContent className="pt-5 space-y-3">
              {[...session.terms]
                .sort((a, b) => a.number - b.number)
                .map((term) => {
                  const isActive = term.status === 'ACTIVE';
                  const isCompleted = term.status === 'COMPLETED' || term.status === 'ARCHIVED';

                  return (
                    <div
                      key={term.id}
                      className={`flex items-center justify-between gap-3 p-4 rounded-lg border transition-colors ${
                        isActive
                          ? 'border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/10'
                          : 'border-light-border dark:border-dark-border bg-light-surface dark:bg-dark-bg'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
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
                          {isActive && term.currentWeek && (
                            <span
                              className="text-[var(--agora-blue)] font-medium"
                              style={{ fontSize: 'var(--text-small)' }}
                            >
                              Week {term.currentWeek}
                              {term.totalWeeks ? ` of ${term.totalWeeks}` : ''}
                            </span>
                          )}
                        </div>
                        <div
                          className="flex items-center gap-1 text-light-text-secondary dark:text-dark-text-secondary flex-wrap"
                          style={{ fontSize: 'var(--text-small)' }}
                        >
                          <Clock className="h-3.5 w-3.5 flex-shrink-0" />
                          <span>{formatDateRange(term.startDate, term.endDate)}</span>
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
                              onClick={() => {
                                setTermEditFocus('dates');
                                setEditingTerm(term);
                              }}
                              className="text-[var(--agora-blue)]"
                              style={{ fontSize: 'var(--text-small)' }}
                            >
                              <Pencil className="h-3.5 w-3.5 mr-1" />
                              Edit dates
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

      {editingSession && (
        <EditSessionDatesModal
          isOpen={editingSession}
          onClose={() => setEditingSession(false)}
          session={session}
          schoolId={schoolId}
          termLabel={termLabel}
        />
      )}

      {editingTerm && (
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
    </>
  );
}
