'use client';

import { useState, useEffect, useMemo } from 'react';
import { Modal } from '@/components/ui/Modal';
import { DatePicker } from '@/components/ui/DatePicker';
import { Button } from '@/components/ui/Button';
import { Loader2, Lock, AlertTriangle, CheckCircle } from 'lucide-react';
import {
  useUpdateSessionDatesMutation,
  type AcademicSession,
} from '@/lib/store/api/schoolAdminApi';
import toast from 'react-hot-toast';
import {
  getSessionStartEditability,
  getSessionEndEditability,
  validateSessionDateRange,
} from '@/lib/academic/termSession';

interface EditSessionDatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: AcademicSession;
  schoolId: string;
  termLabel?: string;
}

export function EditSessionDatesModal({
  isOpen,
  onClose,
  session,
  schoolId,
  termLabel = 'Term',
}: EditSessionDatesModalProps) {
  const [updateSessionDates, { isLoading }] = useUpdateSessionDatesMutation();

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [recalibrateDraftTerms, setRecalibrateDraftTerms] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setStartDate(session.startDate.split('T')[0]);
    setEndDate(session.endDate.split('T')[0]);
    setRecalibrateDraftTerms(false);
  }, [isOpen, session]);

  const startDateEditability = useMemo(
    () => getSessionStartEditability(session),
    [session],
  );
  const endDateEditability = useMemo(
    () => getSessionEndEditability(session),
    [session],
  );

  const hasDraftTerms = useMemo(
    () => session.terms?.some((t) => t.status === 'DRAFT') ?? false,
    [session.terms],
  );

  const datesChanged =
    startDate !== session.startDate.split('T')[0] ||
    endDate !== session.endDate.split('T')[0];

  const validationError = useMemo(() => {
    if (!startDate || !endDate) return 'Both start and end dates are required.';
    return validateSessionDateRange(startDate, endDate);
  }, [startDate, endDate]);

  const canSubmit = !validationError && datesChanged && !isLoading;

  const handleSave = async () => {
    if (!canSubmit) return;

    const payload: {
      startDate?: string;
      endDate?: string;
      recalibrateTerms?: 'none' | 'draft_only';
    } = {};

    const origStart = session.startDate.split('T')[0];
    const origEnd = session.endDate.split('T')[0];
    if (startDate !== origStart) payload.startDate = startDate;
    if (endDate !== origEnd) payload.endDate = endDate;
    if (recalibrateDraftTerms && hasDraftTerms) {
      payload.recalibrateTerms = 'draft_only';
    }

    try {
      await updateSessionDates({
        schoolId,
        sessionId: session.id,
        data: payload,
      }).unwrap();
      toast.success('Session dates updated successfully.');
      onClose();
    } catch (error: unknown) {
      const message =
        error && typeof error === 'object' && 'data' in error
          ? (error as { data?: { message?: string } }).data?.message
          : undefined;
      toast.error(message || 'Failed to update session dates.');
    }
  };

  const StatusIcon =
    startDateEditability.variant === 'success'
      ? CheckCircle
      : startDateEditability.variant === 'warning'
        ? AlertTriangle
        : Lock;

  const statusColorClass =
    startDateEditability.variant === 'success'
      ? 'text-green-700 dark:text-green-400'
      : startDateEditability.variant === 'warning'
        ? 'text-amber-700 dark:text-amber-400'
        : 'text-light-text-secondary dark:text-dark-text-secondary';

  const statusBgClass =
    startDateEditability.variant === 'success'
      ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
      : startDateEditability.variant === 'warning'
        ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
        : 'bg-light-surface dark:bg-dark-bg border-light-border dark:border-dark-border';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Adjust ${session.name} Session Dates`}
      size="lg"
      contentClassName="space-y-5"
      footer={
        <div className="flex items-center justify-end gap-3">
          <Button variant="ghost" onClick={onClose} disabled={isLoading} className="rounded-xl">
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!canSubmit} className="rounded-xl px-6">
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </div>
      }
    >
      <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary -mt-2">
        {session.name}
        <span className="mx-1.5 text-light-border dark:text-dark-border">·</span>
        <span className="inline-flex items-center rounded-full bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 text-xs font-medium text-blue-700 dark:text-blue-300">
          {session.status}
        </span>
      </p>

      <div className={`flex items-start gap-2 p-2.5 rounded-lg border ${statusBgClass}`}>
        <StatusIcon className={`h-3.5 w-3.5 mt-0.5 flex-shrink-0 ${statusColorClass}`} />
        <p className={`text-xs leading-relaxed ${statusColorClass}`}>
          {startDateEditability.message}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 overflow-visible">
        <div className="overflow-visible">
          <div className="flex items-center gap-2 mb-1.5">
            <label className="text-sm font-medium text-light-text-primary dark:text-dark-text-primary">
              Session Start
            </label>
            {!startDateEditability.editable && (
              <Lock className="h-3.5 w-3.5 text-light-text-secondary dark:text-dark-text-secondary" />
            )}
          </div>
          <DatePicker
            value={startDate}
            onChange={setStartDate}
            disabled={!startDateEditability.editable}
            max={endDate || undefined}
            placeholder="Select start date"
          />
        </div>

        <div className="overflow-visible">
          <div className="flex items-center gap-2 mb-1.5">
            <label className="text-sm font-medium text-light-text-primary dark:text-dark-text-primary">
              Session End
            </label>
            {!endDateEditability.editable && (
              <Lock className="h-3.5 w-3.5 text-light-text-secondary dark:text-dark-text-secondary" />
            )}
          </div>
          <DatePicker
            value={endDate}
            onChange={setEndDate}
            disabled={!endDateEditability.editable}
            min={startDate || undefined}
            placeholder="Select end date"
          />
          <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary mt-1.5">
            {endDateEditability.message}
          </p>
        </div>
      </div>

      {hasDraftTerms && datesChanged && (
        <label className="flex items-start gap-3 p-3 rounded-lg border border-light-border dark:border-dark-border bg-light-surface dark:bg-dark-bg cursor-pointer">
          <input
            type="checkbox"
            checked={recalibrateDraftTerms}
            onChange={(e) => setRecalibrateDraftTerms(e.target.checked)}
            className="mt-0.5 rounded border-light-border"
          />
          <span className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
            Recalculate future {termLabel.toLowerCase()} dates to fit the new session period.
            Completed and active {termLabel.toLowerCase()}s will not change.
          </span>
        </label>
      )}

      {validationError && (
        <p className="text-sm text-red-600 dark:text-red-400">{validationError}</p>
      )}
    </Modal>
  );
}
