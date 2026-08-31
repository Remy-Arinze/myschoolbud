'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { DatePicker } from '@/components/ui/DatePicker';
import { Alert } from '@/components/ui/Alert';
import { SessionWizardInfoModal } from '@/components/modals';
import { SchoolSettingsTabs } from '@/components/settings/SchoolSettingsTabs';
import { SessionTermDatesPanel } from '@/components/settings/SessionTermDatesPanel';
import { parseTermEditFocus } from '@/components/settings/termsSessionHelpers';
import { FadeInUp } from '@/components/ui/FadeInUp';
import {
  Calendar,
  ArrowRight,
  CheckCircle,
  Loader2,
  AlertCircle,
  XCircle,
  GraduationCap,
  Info,
} from 'lucide-react';
import {
  useGetMySchoolQuery,
  useGetActiveSessionQuery,
  useStartNewTermMutation,
  useEndSessionMutation,
  useEndTermMutation,
  useReactivateTermMutation,
  useGetSessionsQuery,
  type SessionType,
  type TermDateInput,
} from '@/lib/store/api/schoolAdminApi';
import { useSchoolType } from '@/hooks/useSchoolType';
import toast from 'react-hot-toast';
import { PermissionGate } from '@/components/permissions/PermissionGate';
import { PermissionResource, PermissionType } from '@/hooks/usePermissions';
import { ConfirmModal } from '@/components/ui/Modal';
import {
  suggestSessionEndDate,
  suggestSessionName,
  validateSessionDateRange,
} from '@/lib/academic/termSession';
import { getPromotionExamples } from '@/lib/utils/terminology';

// ─── Helpers ────────────────────────────────────────────────────────────────────

type Step = 1 | 2 | 3 | 4;

const getSchoolTypeLabel = (type?: string | null) => {
  if (!type) return 'your school';
  switch (type) {
    case 'PRIMARY':
      return 'Primary School';
    case 'SECONDARY':
      return 'Secondary School';
    case 'TERTIARY':
      return 'University/Polytechnic';
    default:
      return type;
  }
};

const getTermLabel = (schoolType?: string | null) => {
  return schoolType === 'TERTIARY' ? 'Semester' : 'Term';
};

const getTermCount = (schoolType?: string | null) => {
  return schoolType === 'TERTIARY' ? 2 : 3;
};

const getOrdinal = (n: number) => (n === 1 ? '1st' : n === 2 ? '2nd' : '3rd');

// ─── Main Component ─────────────────────────────────────────────────────────────

export default function SessionWizardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [sessionType, setSessionType] = useState<SessionType>('NEW_TERM');
  const currentYear = new Date().getFullYear();
  const [sessionName, setSessionName] = useState(`${currentYear}/`);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [endDateManuallySet, setEndDateManuallySet] = useState(false);
  const [carryOver, setCarryOver] = useState<boolean>(false);
  const [selectedTermId, setSelectedTermId] = useState<string>('');
  const [showInfoModal, setShowInfoModal] = useState(false);
  const infoDismissedRef = useRef(false);

  // New: which term to start in & custom term dates
  const [startingTermNumber, setStartingTermNumber] = useState<number>(1);
  const [useCustomTermDates, setUseCustomTermDates] = useState(false);
  const [customTermDates, setCustomTermDates] = useState<TermDateInput[]>([]);

  // Validation errors
  const [validationError, setValidationError] = useState<string | null>(null);

  // Confirmation modal states
  const [showEndSessionModal, setShowEndSessionModal] = useState(false);
  const [showEndTermModal, setShowEndTermModal] = useState(false);
  const { data: schoolResponse } = useGetMySchoolQuery();
  const schoolId = schoolResponse?.data?.id;
  const { currentType, isMixed } = useSchoolType();

  const { data: activeSessionResponse, isLoading: isLoadingActiveSession, refetch: refetchActiveSession } = useGetActiveSessionQuery(
    { schoolId: schoolId!, schoolType: currentType || undefined },
    { skip: !schoolId || !currentType }
  );

  const { data: sessionsResponse, isLoading: isLoadingSessions } = useGetSessionsQuery(
    { schoolId: schoolId!, schoolType: currentType || undefined },
    { skip: !schoolId || !currentType }
  );

  const [startNewTerm, { isLoading: isStarting }] = useStartNewTermMutation();
  const [reactivateTerm, { isLoading: isReactivating }] = useReactivateTermMutation();
  const [endSession, { isLoading: isEndingSession }] = useEndSessionMutation();
  const [endTerm, { isLoading: isEndingTerm }] = useEndTermMutation();

  const activeSession = activeSessionResponse?.data;
  const sessions = sessionsResponse?.data || [];
  const termLabel = getTermLabel(currentType);
  const termCount = getTermCount(currentType);
  const hasActiveTerm = !!activeSession?.term;
  const isNewSession = sessionType === 'NEW_SESSION';
  const wizardTitle = isNewSession ? 'Start New Session' : `Start New ${termLabel}`;
  const wizardSubtitle = isNewSession
    ? 'Set up a new academic year and promote students to the next level'
    : `Transition your school from "Holiday" to "Active ${termLabel}"`;
  const startActionLabel = isNewSession ? 'Session' : termLabel;
  const promotionExamples = getPromotionExamples(currentType);

  // Filter available terms (DRAFT or continuable COMPLETED)
  const availableTerms = useMemo(() => {
    const terms: {
      id: string;
      name: string;
      sessionName: string;
      status: string;
      endDate?: string;
      canContinue?: boolean;
    }[] = [];
    const now = new Date();

    sessions.forEach((session) => {
      if (session.terms) {
        session.terms.forEach((term) => {
          if (term.status === 'DRAFT') {
            terms.push({
              id: term.id,
              name: term.name,
              sessionName: session.name,
              status: term.status,
              endDate: term.endDate,
              canContinue: false,
            });
          } else if (term.status === 'COMPLETED' && term.endDate) {
            const termEndDate = new Date(term.endDate);
            if (termEndDate > now) {
              terms.push({
                id: term.id,
                name: term.name,
                sessionName: session.name,
                status: term.status,
                endDate: term.endDate,
                canContinue: true,
              });
            }
          }
        });
      }
    });

    return terms.sort((a, b) => {
      if (a.canContinue && !b.canContinue) return -1;
      if (!a.canContinue && b.canContinue) return 1;
      return 0;
    });
  }, [sessions]);

  // Show info modal once when page loads if no active session
  useEffect(() => {
    if (!isLoadingActiveSession && activeSessionResponse) {
      if (!activeSession?.session && !infoDismissedRef.current) {
        setShowInfoModal(true);
      }
    }
  }, [isLoadingActiveSession, activeSessionResponse, activeSession]);

  const applySuggestedSessionDates = (start: string) => {
    if (!start) return;
    setEndDate(suggestSessionEndDate(start));
    setSessionName(suggestSessionName(start));
  };

  const handleSessionTypeChange = (type: SessionType) => {
    setEndDateManuallySet(false);
    setSessionType(type);
    if (type === 'NEW_SESSION' && startDate) {
      applySuggestedSessionDates(startDate);
    }
  };

  // Initialize custom term date slots when session dates change
  useEffect(() => {
    if (startDate && endDate && sessionType === 'NEW_SESSION') {
      const sessionStart = new Date(startDate);
      const sessionEnd = new Date(endDate);
      if (sessionStart < sessionEnd) {
        const durationMs = sessionEnd.getTime() - sessionStart.getTime();
        const termDurationMs = durationMs / termCount;

        const defaults: TermDateInput[] = [];
        for (let i = 0; i < termCount; i++) {
          const tStart =
            i === 0
              ? sessionStart
              : new Date(sessionStart.getTime() + termDurationMs * i + 1);
          const tEnd =
            i === termCount - 1
              ? sessionEnd
              : new Date(sessionStart.getTime() + termDurationMs * (i + 1));

          defaults.push({
            number: i + 1,
            startDate: tStart.toISOString().split('T')[0],
            endDate: tEnd.toISOString().split('T')[0],
          });
        }
        setCustomTermDates(defaults);
      }
    }
  }, [startDate, endDate, sessionType, termCount]);

  // ─── Validation Helpers ─────────────────────────────────────────────────────

  const validateSessionDates = validateSessionDateRange;

  const handleStartDateChange = (value: string) => {
    setStartDate(value);
    if (value && !endDateManuallySet) {
      setEndDate(suggestSessionEndDate(value));
    }
    if (value && sessionType === 'NEW_SESSION') {
      setSessionName(suggestSessionName(value));
    }
  };

  const handleEndDateChange = (value: string) => {
    setEndDate(value);
    setEndDateManuallySet(true);
  };

  const validateSessionName = (name: string): string | null => {
    if (!name) return 'Session name is required';
    const pattern = /^\d{4}\/\d{4}$/;
    if (!pattern.test(name)) {
      return 'Session name must follow the format YYYY/YYYY (e.g., 2025/2026)';
    }
    const parts = name.split('/');
    const year1 = parseInt(parts[0]);
    const year2 = parseInt(parts[1]);
    if (year2 !== year1 + 1) {
      return 'The academic session years must be consecutive (e.g., 2025/2026)';
    }
    return null;
  };

  const validateCustomTermDates = (): string | null => {
    if (!useCustomTermDates) return null;
    for (const td of customTermDates) {
      if (!td.startDate || !td.endDate) {
        return `${getOrdinal(td.number)} ${termLabel}: Please set both start and end dates.`;
      }
      const s = new Date(td.startDate);
      const e = new Date(td.endDate);
      if (s >= e) {
        return `${getOrdinal(td.number)} ${termLabel}: Start date must be before end date.`;
      }
      if (startDate && s < new Date(startDate)) {
        return `${getOrdinal(td.number)} ${termLabel}: Start date cannot be before session start.`;
      }
      if (endDate && e > new Date(endDate)) {
        return `${getOrdinal(td.number)} ${termLabel}: End date cannot be after session end.`;
      }
    }
    return null;
  };

  // ─── Step Navigation ────────────────────────────────────────────────────────

  // Check if selected term is a "continue" (reactivation) scenario
  const selectedTermData = availableTerms.find((t) => t.id === selectedTermId);
  const isReactivation = selectedTermData?.canContinue === true;

  // For NEW_TERM on PRIMARY/SECONDARY, skip student migration step
  const shouldShowMigrationStep =
    sessionType === 'NEW_SESSION' || currentType === 'TERTIARY';

  // When continuing a term (reactivation), skip the dates step
  const shouldShowDatesStep = !isReactivation;

  // Determine steps based on session type
  const getStepLabels = (): { step: number; label: string }[] => {
    if (sessionType === 'NEW_TERM') {
      if (isReactivation) {
        return [{ step: 1, label: `Continue ${termLabel}` }];
      }
      return [
        { step: 1, label: `Session & ${termLabel}` },
        { step: 2, label: 'Dates' },
      ];
    }
    // NEW_SESSION
    if (shouldShowMigrationStep) {
      return [
        { step: 1, label: 'Session Setup' },
        { step: 2, label: 'Dates & Terms' },
        { step: 3, label: 'Migration' },
      ];
    }
    return [
      { step: 1, label: 'Session Setup' },
      { step: 2, label: 'Dates & Terms' },
    ];
  };

  const stepLabels = getStepLabels();
  const totalSteps = stepLabels.length;

  // Derived validation states
  const sessionNameError = validateSessionName(sessionName);
  const sessionDateError = validateSessionDates(startDate, endDate);
  const customTermDateError = validateCustomTermDates();

  const canProceedStep1 =
    sessionType &&
    (sessionType === 'NEW_SESSION'
      ? sessionName.trim().length > 0 && !sessionNameError && !activeSession?.session
      : selectedTermId.trim().length > 0 && availableTerms.length > 0 && !hasActiveTerm);

  const canProceedStep2 =
    startDate && endDate && !sessionDateError && !customTermDateError;

  const handleNext = () => {
    setValidationError(null);

    if (currentStep === 1) {
      if (sessionType === 'NEW_SESSION') {
        const nameError = validateSessionName(sessionName);
        if (nameError) {
          setValidationError(nameError);
          return;
        }
      } else if (sessionType === 'NEW_TERM') {
        if (!selectedTermId) {
          setValidationError('Please select a term to start.');
          return;
        }
      }
      // If continuing a term (reactivation), submit directly
      if (isReactivation) {
        handleSubmit();
        return;
      }
    }

    if (currentStep === 2) {
      const dateError = validateSessionDates(startDate, endDate);
      if (dateError) {
        setValidationError(dateError);
        return;
      }
      if (useCustomTermDates) {
        const termError = validateCustomTermDates();
        if (termError) {
          setValidationError(termError);
          return;
        }
      }

      // For NEW_TERM without migration step, submit directly
      if (sessionType === 'NEW_TERM') {
        handleSubmit();
        return;
      }

      // For NEW_SESSION without migration step, submit directly
      if (!shouldShowMigrationStep) {
        handleSubmit();
        return;
      }
    }

    if (currentStep < (totalSteps as Step)) {
      setCurrentStep((prev) => (prev + 1) as Step);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as Step);
    }
  };

  // ─── Actions ─────────────────────────────────────────────────────────────────

  const handleEndSession = async () => {
    if (!schoolId) {
      toast.error('School not found');
      return;
    }
    try {
      await endSession({ schoolId, schoolType: currentType || undefined }).unwrap();
      await refetchActiveSession();
      setShowEndSessionModal(false);
      toast.success(
        `Session ended successfully for ${getSchoolTypeLabel(currentType)}! You can now start a new session.`
      );
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to end session');
    }
  };

  const handleEndTerm = async () => {
    if (!schoolId) {
      toast.error('School not found');
      return;
    }
    try {
      await endTerm({ schoolId, schoolType: currentType || undefined }).unwrap();
      await refetchActiveSession();
      setShowEndTermModal(false);
      toast.success(
        `${termLabel} ended successfully for ${getSchoolTypeLabel(currentType)}! You can now start a new ${termLabel.toLowerCase()}.`
      );
    } catch (error: any) {
      toast.error(error?.data?.message || `Failed to end ${termLabel.toLowerCase()}`);
    }
  };

  const handleSubmit = async () => {
    if (!schoolId) {
      toast.error('School not found');
      return;
    }

    try {
      // Reactivation: continue a completed term
      if (sessionType === 'NEW_TERM' && isReactivation && selectedTermId) {
        await reactivateTerm({
          schoolId,
          termId: selectedTermId,
          schoolType: currentType || undefined,
        }).unwrap();

        toast.success(
          `${termLabel} continued successfully for ${getSchoolTypeLabel(currentType)}!`
        );
        router.push('/dashboard/school/overview');
        return;
      }

      // Normal start
      const result = await startNewTerm({
        schoolId,
        data: {
          name: sessionName,
          startDate,
          endDate,
          type: sessionType,
          schoolType: currentType || undefined,
          ...(sessionType === 'NEW_TERM' && selectedTermId && { termId: selectedTermId }),
          ...(sessionType === 'NEW_SESSION' && {
            startingTermNumber,
            carryOver,
            ...(useCustomTermDates &&
              customTermDates.length > 0 && { termDates: customTermDates }),
          }),
        },
      }).unwrap();

      toast.success(
        isNewSession
          ? `Session started successfully for ${getSchoolTypeLabel(currentType)}! ${result.data.migratedCount} students migrated.`
          : `${termLabel} started successfully for ${getSchoolTypeLabel(currentType)}! ${result.data.migratedCount} students migrated.`
      );
      router.push('/dashboard/school/overview');
    } catch (error: any) {
      toast.error(
        error?.data?.message ||
        `Failed to ${isReactivation ? 'continue' : 'start'} ${termLabel.toLowerCase()}`
      );
    }
  };

  // Helper to update a single custom term date field
  const updateTermDate = (
    termNumber: number,
    field: 'startDate' | 'endDate',
    value: string
  ) => {
    setCustomTermDates((prev) =>
      prev.map((td) => (td.number === termNumber ? { ...td, [field]: value } : td))
    );
  };

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <ProtectedRoute roles={['SCHOOL_ADMIN']}>
      {/* Info Modal */}
      <SessionWizardInfoModal
        isOpen={showInfoModal}
        onClose={() => {
          infoDismissedRef.current = true;
          setShowInfoModal(false);
        }}
        schoolType={currentType}
      />

      <div className="w-full max-w-6xl mx-auto p-6">
        <SchoolSettingsTabs activeTab="calendar" className="mb-8" />

        {/* Header */}
        <FadeInUp
          from={{ opacity: 0, y: -20 }}
          to={{ opacity: 1, y: 0 }}
          duration={0.5}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold text-light-text-primary dark:text-dark-text-primary mb-2">
            {wizardTitle}
          </h1>
          <p className="text-light-text-secondary dark:text-dark-text-secondary">
            {wizardSubtitle}
          </p>
        </FadeInUp>

        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-8">
          {stepLabels.map(({ step, label }, idx) => (
            <div key={step} className="flex items-center flex-1">
              <div className="flex flex-col items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${currentStep >= step
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                    }`}
                >
                  {currentStep > step ? (
                    <CheckCircle className="h-5 w-5" />
                  ) : (
                    idx + 1
                  )}
                </div>
                <p className="text-xs mt-2 text-center text-light-text-secondary dark:text-dark-text-secondary">
                  {label}
                </p>
              </div>
              {idx < stepLabels.length - 1 && (
                <div
                  className={`flex-1 h-1 mx-2 ${currentStep > step
                    ? 'bg-blue-600'
                    : 'bg-gray-200 dark:bg-gray-700'
                    }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* ═══════════════════ Step 1: Session & Term Selection ═══════════════════ */}
        {currentStep === 1 && (
          <Card className="overflow-visible">
            <CardHeader>
              <CardTitle>
                Step 1: {isNewSession ? 'Session Setup' : `Select Session & ${termLabel}`}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Mixed school type indicator */}
              {isMixed && (
                <Alert>
                  <GraduationCap className="h-4 w-4" />
                  <div>
                    <strong>Managing:</strong> {getSchoolTypeLabel(currentType)}
                    <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                      Each school type has independent sessions and{' '}
                      {termLabel.toLowerCase()}s.
                    </p>
                  </div>
                </Alert>
              )}

              {/* Session type selector */}
              <div>
                <label className="block text-sm font-medium mb-2 text-light-text-primary dark:text-dark-text-primary">
                  Type
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => handleSessionTypeChange('NEW_SESSION')}
                    className={`p-4 rounded-lg border-2 transition-colors ${sessionType === 'NEW_SESSION'
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/30'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                      }`}
                  >
                    <h3 className="font-semibold mb-1">New Session</h3>
                    <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                      Start new academic year (Promotes students)
                    </p>
                  </button>
                  <button
                    onClick={() => handleSessionTypeChange('NEW_TERM')}
                    className={`p-4 rounded-lg border-2 transition-colors ${sessionType === 'NEW_TERM'
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/30'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                      }`}
                  >
                    <h3 className="font-semibold mb-1">New {termLabel}</h3>
                    <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                      {currentType === 'TERTIARY'
                        ? 'Start new semester (Carries over students)'
                        : 'Start new term (Carries over students)'}
                    </p>
                  </button>
                </div>
              </div>

              {/* NEW SESSION - session name */}
              {sessionType === 'NEW_SESSION' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2 text-light-text-primary dark:text-dark-text-primary">
                      Session Name (e.g., &quot;2025/2026&quot;)
                    </label>
                    <Input
                      value={sessionName}
                      onChange={(e) => setSessionName(e.target.value)}
                      placeholder="2025/2026"
                      disabled={!!activeSession?.session}
                      className={
                        validationError ||
                          (sessionNameError && sessionName.length > 5)
                          ? 'border-red-500'
                          : ''
                      }
                    />
                    {(validationError ||
                      (sessionNameError && sessionName.length > 5)) && (
                        <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {validationError || sessionNameError}
                        </p>
                      )}
                  </div>

                  {/* Active session blocker */}
                  {activeSession?.session && (
                    <div className="p-4 border-2 border-orange-300 dark:border-orange-700 rounded-lg bg-orange-50 dark:bg-orange-900/20">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 text-orange-600 dark:text-orange-400 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="font-semibold text-orange-800 dark:text-orange-200 mb-1">
                            Active Session: {activeSession.session.name}
                            {activeSession.term &&
                              ` - ${activeSession.term.name}`}
                          </p>
                          <p className="text-sm text-orange-700 dark:text-orange-300 mb-3">
                            You must end the current session before creating a
                            new one. This will mark all{' '}
                            {termLabel.toLowerCase()}s as completed.
                          </p>
                          <PermissionGate resource={PermissionResource.SESSIONS} type={PermissionType.WRITE}>
                            <Button
                              variant="outline"
                              onClick={() => setShowEndSessionModal(true)}
                              className="border-orange-500 text-orange-700 hover:bg-orange-100 dark:border-orange-400 dark:text-orange-300 dark:hover:bg-orange-900/40"
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              End Current Session
                            </Button>
                          </PermissionGate>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* NEW TERM - select from existing */}
              {sessionType === 'NEW_TERM' && (
                <div className="space-y-4">
                  {/* Active term warning */}
                  {hasActiveTerm && (
                    <div className="p-4 border-2 border-blue-300 dark:border-blue-700 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="font-semibold text-blue-800 dark:text-blue-200 mb-1">
                            Active {termLabel}: {activeSession?.term?.name}
                          </p>
                          <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
                            You must end the current {termLabel.toLowerCase()}{' '}
                            before starting a new one.
                          </p>
                          <PermissionGate resource={PermissionResource.SESSIONS} type={PermissionType.WRITE}>
                            <Button
                              variant="outline"
                              onClick={() => setShowEndTermModal(true)}
                              className="border-blue-500 text-blue-700 hover:bg-blue-100 dark:border-blue-400 dark:text-blue-300 dark:hover:bg-blue-900/40"
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              End Current {termLabel}
                            </Button>
                          </PermissionGate>
                        </div>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium mb-2 text-light-text-primary dark:text-dark-text-primary">
                      Select {termLabel} to Activate
                    </label>
                    {isLoadingSessions ? (
                      <div className="p-4 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-dark-surface flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                          Loading sessions...
                        </p>
                      </div>
                    ) : sessions.length === 0 ? (
                      <div className="p-4 border border-yellow-300 dark:border-yellow-700 rounded-lg bg-yellow-50 dark:bg-yellow-900/20">
                        <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                          <strong>
                            No sessions found
                            {isMixed
                              ? ` for ${getSchoolTypeLabel(currentType)}`
                              : ''}
                            .
                          </strong>{' '}
                          Please select &quot;New Session&quot; to start a new
                          academic year first.
                        </p>
                      </div>
                    ) : availableTerms.length === 0 ? (
                      <div className="p-4 border border-yellow-300 dark:border-yellow-700 rounded-lg bg-yellow-50 dark:bg-yellow-900/20">
                        <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                          <strong>
                            No available {termLabel.toLowerCase()}s.
                          </strong>{' '}
                          All {termLabel.toLowerCase()}s in the current session
                          have been activated or completed. You may need to start
                          a new academic session.
                        </p>
                      </div>
                    ) : (
                      <>
                        <select
                          value={selectedTermId}
                          onChange={(e) => setSelectedTermId(e.target.value)}
                          disabled={hasActiveTerm}
                          className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-dark-surface text-light-text-primary dark:text-dark-text-primary ${hasActiveTerm
                            ? 'opacity-50 cursor-not-allowed'
                            : ''
                            }`}
                        >
                          <option value="">
                            Select a {termLabel.toLowerCase()}...
                          </option>
                          {availableTerms.map((term) => {
                            const daysRemaining = term.endDate
                              ? Math.ceil(
                                (new Date(term.endDate).getTime() -
                                  Date.now()) /
                                (1000 * 60 * 60 * 24)
                              )
                              : 0;
                            return (
                              <option key={term.id} value={term.id}>
                                {term.canContinue ? '↩ Continue' : '▶ Start'}{' '}
                                {term.sessionName} - {term.name}
                                {term.canContinue && daysRemaining > 0
                                  ? ` (${daysRemaining} days left)`
                                  : ''}
                              </option>
                            );
                          })}
                        </select>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                          {hasActiveTerm
                            ? `End the current ${termLabel.toLowerCase()} to select a new one.`
                            : availableTerms.some((t) => t.canContinue)
                              ? `You can continue a ${termLabel.toLowerCase()} that was ended early, or start a new one.`
                              : `Only ${termLabel.toLowerCase()}s that haven't been activated yet are shown.`}
                        </p>
                      </>
                    )}
                  </div>
                </div>
              )}

              {activeSession?.session && sessionType === 'NEW_TERM' && (
                <Alert>
                  <Calendar className="h-4 w-4" />
                  <div>
                    <strong>Current:</strong> {activeSession.session.name}
                    {activeSession.term &&
                      ` - ${activeSession.term.name} (Active)`}
                    {activeSession.term?.currentWeek && (
                      <span className="ml-2 text-blue-600 dark:text-blue-400 font-medium">
                        — Week {activeSession.term.currentWeek}
                        {activeSession.term.totalWeeks
                          ? ` of ${activeSession.term.totalWeeks}`
                          : ''}
                      </span>
                    )}
                    <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mt-1">
                      Starting a new {termLabel.toLowerCase()} will carry over
                      students and clone timetables.
                    </p>
                  </div>
                </Alert>
              )}

              <div className="flex justify-end">
                <PermissionGate resource={PermissionResource.SESSIONS} type={PermissionType.WRITE}>
                  <Button
                    onClick={handleNext}
                    disabled={!canProceedStep1 || isReactivating}
                  >
                    {isReactivation ? (
                      isReactivating ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Continuing {termLabel}...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Continue {termLabel}
                        </>
                      )
                    ) : (
                      <>
                        Next <ArrowRight className="h-4 w-4 ml-2" />
                      </>
                    )}
                  </Button>
                </PermissionGate>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ═══════════════════ Step 2: Dates & Term Configuration ═══════════════════ */}
        {currentStep === 2 && (
          <Card className="overflow-visible">
            <CardHeader>
              <CardTitle>Step 2: Set Dates{sessionType === 'NEW_SESSION' ? ` & ${termLabel}s` : ''}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Session dates */}
              <div>
                <h3 className="text-sm font-semibold text-light-text-primary dark:text-dark-text-primary mb-3">
                  Session Period
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <DatePicker
                      label="Start Date"
                      value={startDate}
                      onChange={handleStartDateChange}
                      placeholder="Select start date"
                    />
                  </div>
                  <div>
                    <DatePicker
                      label="End Date"
                      value={endDate}
                      onChange={handleEndDateChange}
                      min={startDate || undefined}
                      placeholder="Select end date"
                    />
                    {isNewSession && startDate && endDate && !endDateManuallySet && (
                      <p className="text-xs text-light-text-muted dark:text-dark-text-muted mt-1.5">
                        Suggested end date for a standard academic year (Sep–Jul). You can adjust if needed.
                      </p>
                    )}
                  </div>
                </div>
                {(validationError || sessionDateError) && (
                  <Alert variant="error" className="mt-3">
                    <AlertCircle className="h-4 w-4" />
                    <p className="text-sm">
                      {validationError || sessionDateError}
                    </p>
                  </Alert>
                )}
                {startDate &&
                  endDate &&
                  !validationError &&
                  !sessionDateError && (
                    <p className="text-xs text-green-600 dark:text-green-400 mt-2">
                      ✓ Session duration is valid (10-12 months)
                    </p>
                  )}
              </div>

              {/* NEW SESSION: which term to start in & custom dates */}
              {sessionType === 'NEW_SESSION' && startDate && endDate && !sessionDateError && (
                <>
                  {/* Divider */}
                  <div className="border-t border-gray-200 dark:border-gray-700" />

                  {/* Which term are you in? */}
                  <div>
                    <h3 className="text-sm font-semibold text-light-text-primary dark:text-dark-text-primary mb-1">
                      Which {termLabel.toLowerCase()} are you currently in?
                    </h3>
                    <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary mb-3">
                      If your school already started this session, select the{' '}
                      {termLabel.toLowerCase()} you&apos;re currently in. Earlier{' '}
                      {termLabel.toLowerCase()}s will be marked as completed.
                    </p>
                    <div className={`grid gap-3 ${termCount === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
                      {Array.from({ length: termCount }, (_, i) => i + 1).map(
                        (num) => (
                          <button
                            key={num}
                            onClick={() => setStartingTermNumber(num)}
                            className={`p-3 rounded-lg border-2 transition-all text-center ${startingTermNumber === num
                              ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/30 shadow-sm'
                              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                              }`}
                          >
                            <p className="font-semibold text-sm">
                              {getOrdinal(num)} {termLabel}
                            </p>
                            <p className="text-xs text-light-text-muted dark:text-dark-text-muted mt-0.5">
                              {num < startingTermNumber
                                ? 'Will be marked completed'
                                : num === startingTermNumber
                                  ? 'Will be activated'
                                  : 'Will remain as draft'}
                            </p>
                          </button>
                        )
                      )}
                    </div>

                    {startingTermNumber > 1 && (
                      <div className="mt-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                        <div className="flex items-start gap-2">
                          <Info className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                          <p className="text-xs text-amber-700 dark:text-amber-300">
                            <strong>Late onboarding mode:</strong>{' '}
                            {getOrdinal(startingTermNumber)} {termLabel} will be
                            activated, and earlier {termLabel.toLowerCase()}s
                            will be marked as completed since your school has
                            already gone through them.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Divider */}
                  <div className="border-t border-gray-200 dark:border-gray-700" />

                  {/* Custom term dates toggle */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="text-sm font-semibold text-light-text-primary dark:text-dark-text-primary">
                          Custom {termLabel} Dates
                        </h3>
                        <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary">
                          Set specific start/end dates for each{' '}
                          {termLabel.toLowerCase()} instead of equal splits.
                        </p>
                      </div>
                      <button
                        onClick={() =>
                          setUseCustomTermDates(!useCustomTermDates)
                        }
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${useCustomTermDates
                          ? 'bg-blue-600'
                          : 'bg-gray-300 dark:bg-gray-600'
                          }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${useCustomTermDates
                            ? 'translate-x-6'
                            : 'translate-x-1'
                            }`}
                        />
                      </button>
                    </div>

                    {useCustomTermDates && customTermDates.length > 0 && (
                      <div className="space-y-4">
                        {customTermDates.map((td) => (
                          <div
                            key={td.number}
                            className={`p-4 rounded-lg border transition-colors ${td.number === startingTermNumber
                              ? 'border-blue-300 dark:border-blue-700 bg-blue-50/50 dark:bg-blue-900/10'
                              : 'border-gray-200 dark:border-gray-700'
                              }`}
                          >
                            <div className="flex items-center gap-2 mb-3">
                              <p className="text-sm font-medium text-light-text-primary dark:text-dark-text-primary">
                                {getOrdinal(td.number)} {termLabel}
                              </p>
                              {td.number === startingTermNumber && (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-medium">
                                  Starting here
                                </span>
                              )}
                              {td.number < startingTermNumber && (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 font-medium">
                                  Completed
                                </span>
                              )}
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <DatePicker
                                label="Start"
                                value={td.startDate}
                                onChange={(val) =>
                                  updateTermDate(td.number, 'startDate', val)
                                }
                                min={startDate || undefined}
                                max={endDate || undefined}
                                placeholder="Start date"
                              />
                              <DatePicker
                                label="End"
                                value={td.endDate}
                                onChange={(val) =>
                                  updateTermDate(td.number, 'endDate', val)
                                }
                                min={td.startDate || startDate || undefined}
                                max={endDate || undefined}
                                placeholder="End date"
                              />
                            </div>
                          </div>
                        ))}
                        {customTermDateError && (
                          <Alert variant="error">
                            <AlertCircle className="h-4 w-4" />
                            <p className="text-sm">{customTermDateError}</p>
                          </Alert>
                        )}
                      </div>
                    )}

                    {!useCustomTermDates && (
                      <p className="text-xs text-light-text-muted dark:text-dark-text-muted italic">
                        {termLabel}s will be automatically split equally across
                        the session period.
                      </p>
                    )}
                  </div>
                </>
              )}

              {/* Navigation */}
              <div className="flex justify-between">
                <Button variant="ghost" onClick={handleBack}>
                  Back
                </Button>
                <PermissionGate resource={PermissionResource.SESSIONS} type={PermissionType.WRITE}>
                  <Button
                    onClick={handleNext}
                    disabled={
                      !canProceedStep2 || isStarting || isReactivating
                    }
                  >
                    {totalSteps > 2 && currentStep < totalSteps ? (
                      <>
                        Next <ArrowRight className="h-4 w-4 ml-2" />
                      </>
                    ) : isStarting || isReactivating ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {isReactivation ? 'Continuing' : 'Starting'}{' '}
                        {startActionLabel}...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        {isReactivation ? 'Continue' : 'Start'} {startActionLabel}
                      </>
                    )}
                  </Button>
                </PermissionGate>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ═══════════════════ Step 3: Student Migration ═══════════════════ */}
        {currentStep === 3 && shouldShowMigrationStep && (
          <Card>
            <CardHeader>
              <CardTitle>Step 3: Student Migration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-4 text-light-text-primary dark:text-dark-text-primary">
                  What should happen to student classes for the new session?
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setCarryOver(false)}
                    className={`p-4 rounded-lg border-2 transition-colors text-left ${!carryOver
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/30'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                      }`}
                  >
                    <h3 className="font-semibold mb-1">
                      Promote to next level
                      <span className="ml-2 text-xs font-normal text-blue-600 dark:text-blue-400">
                        Recommended
                      </span>
                    </h3>
                    <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                      Move students up ({promotionExamples.levelTransition})
                    </p>
                  </button>
                  <button
                    onClick={() => setCarryOver(true)}
                    className={`p-4 rounded-lg border-2 transition-colors text-left ${carryOver
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/30'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                      }`}
                  >
                    <h3 className="font-semibold mb-1">Keep same class/level</h3>
                    <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                      No promotion — students stay where they are
                    </p>
                  </button>
                </div>
              </div>

              <Alert>
                <Calendar className="h-4 w-4" />
                <div>
                  <strong>Note:</strong>{' '}
                  {carryOver
                    ? `Students will remain in their current class for the new ${termLabel.toLowerCase()}.`
                    : currentType === 'TERTIARY'
                      ? 'Students will be promoted to the next level. Final year students will be marked as ALUMNI.'
                      : `Students will be promoted to the next level. ${promotionExamples.finalYearLabel} students will be marked as ALUMNI.`}
                </div>
              </Alert>

              <div className="flex justify-between">
                <Button variant="ghost" onClick={handleBack}>
                  Back
                </Button>
                <PermissionGate resource={PermissionResource.SESSIONS} type={PermissionType.WRITE}>
                  <Button
                    onClick={handleSubmit}
                    disabled={isStarting}
                    className="flex items-center gap-2"
                  >
                    {isStarting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Starting {startActionLabel}...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4" />
                        Start {startActionLabel}
                      </>
                    )}
                  </Button>
                </PermissionGate>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {activeSession?.session && schoolId && (
        <div className="mt-8">
          <SessionTermDatesPanel
            schoolId={schoolId}
            activeSession={activeSession}
            termLabel={termLabel}
            autoOpenActiveTerm={searchParams.get('action') === 'term-dates'}
            autoOpenFocus={parseTermEditFocus(searchParams.get('focus'))}
          />
        </div>
      )}

      {/* ═══════════════════ Modals ═══════════════════ */}

      {/* End Session Confirmation */}
      <ConfirmModal
        isOpen={showEndSessionModal}
        onClose={() => setShowEndSessionModal(false)}
        onConfirm={handleEndSession}
        title="End Current Session?"
        message={`Are you sure you want to end the session "${activeSession?.session?.name}" for ${getSchoolTypeLabel(currentType)}? This will mark all ${termLabel.toLowerCase()}s as completed and cannot be undone.`}
        confirmText="End Session"
        variant="danger"
        isLoading={isEndingSession}
      />

      {/* End Term Confirmation */}
      <ConfirmModal
        isOpen={showEndTermModal}
        onClose={() => setShowEndTermModal(false)}
        onConfirm={handleEndTerm}
        title={(() => {
          const termEndDate = activeSession?.term?.endDate;
          const isEarly = termEndDate && new Date(termEndDate) > new Date();
          return isEarly
            ? `End ${termLabel} Early?`
            : `End Current ${termLabel}?`;
        })()}
        message={(() => {
          const termEndDate = activeSession?.term?.endDate;
          const isEarly = termEndDate && new Date(termEndDate) > new Date();
          const daysRemaining = termEndDate
            ? Math.ceil(
              (new Date(termEndDate).getTime() - Date.now()) /
              (1000 * 60 * 60 * 24)
            )
            : 0;

          let msg = `Are you sure you want to end "${activeSession?.term?.name}" for ${getSchoolTypeLabel(currentType)}?`;

          if (isEarly) {
            msg += `\n\n⚠️ WARNING: You are ending this ${termLabel.toLowerCase()} ${daysRemaining} days before its scheduled end date. You can continue it later from this wizard.`;
          }

          msg += `\n\nYou will then be able to start a new ${termLabel.toLowerCase()}.`;
          return msg;
        })()}
        confirmText={(() => {
          const termEndDate = activeSession?.term?.endDate;
          const isEarly = termEndDate && new Date(termEndDate) > new Date();
          return isEarly
            ? `End ${termLabel} Early`
            : `End ${termLabel}`;
        })()}
        variant={(() => {
          const termEndDate = activeSession?.term?.endDate;
          const isEarly = termEndDate && new Date(termEndDate) > new Date();
          return isEarly ? 'danger' : 'warning';
        })()}
        isLoading={isEndingTerm}
      />

    </ProtectedRoute>
  );
}
