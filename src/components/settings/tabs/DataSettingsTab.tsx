'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useDispatch } from 'react-redux';
import toast from 'react-hot-toast';
import { Loader2, HardDrive, Download } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { SettingsSection } from '@/components/settings/SettingsSection';
import { useFileDownload } from '@/hooks/useFileDownload';
import { apiSlice } from '@/lib/store/api/apiSlice';
import type { BackupStatus } from '@/lib/store/api/schoolAdminApi';
import {
  useGetActiveSessionQuery,
  useGetSessionsQuery,
  useGetClassArmsQuery,
  useLazyExportRosterQuery,
  useLazyExportAttendanceCsvQuery,
  useLazyExportGradesCsvQuery,
  useLazyExportFeesCsvQuery,
  useGetBackupStatusQuery,
  useLazyGetBackupAuthUrlQuery,
  useDisconnectBackupMutation,
  useConnectMegaBackupMutation,
  useTriggerBackupMutation,
} from '@/lib/store/api/schoolAdminApi';

// ─────────────────────────────────────────────────────────────────────────────
// ExportCard
// ─────────────────────────────────────────────────────────────────────────────

interface ExportCardProps {
  title: string;
  description: string;
  params: React.ReactNode;
  onDownload: () => Promise<void>;
  isDownloading: boolean;
  isValid: boolean;
}

function ExportCard({
  title,
  description,
  params,
  onDownload,
  isDownloading,
  isValid,
}: ExportCardProps): JSX.Element {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base font-semibold text-light-text-primary dark:text-dark-text-primary">
              {title}
            </CardTitle>
            <p className="text-light-text-secondary dark:text-dark-text-secondary mt-1 text-sm">
              {description}
            </p>
          </div>
          <span className="shrink-0 rounded px-2 py-0.5 text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
            CSV
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">{params}</div>
        <Button
          variant="outline"
          size="sm"
          onClick={onDownload}
          disabled={!isValid || isDownloading}
          className="w-full"
        >
          {isDownloading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Downloading…
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              Download
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CloudBackupCard
// ─────────────────────────────────────────────────────────────────────────────

interface CloudBackupCardProps {
  provider: 'GOOGLE_DRIVE' | 'DROPBOX' | 'MEGA';
  label: string;
  iconColor: string;
  status: BackupStatus | undefined;
  isStatusLoading: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  onBackupNow: () => void;
  isBackingUp: boolean;
  isDisconnecting: boolean;
}

function CloudBackupCard({
  label,
  iconColor,
  status,
  isStatusLoading,
  onConnect,
  onDisconnect,
  onBackupNow,
  isBackingUp,
  isDisconnecting,
}: CloudBackupCardProps): JSX.Element {
  const isConnected = status?.isConnected ?? false;

  const formatBackupDate = (dateStr: string | null): string => {
    if (!dateStr) return 'Never backed up';
    try {
      return `Last backup: ${new Date(dateStr).toLocaleString()}`;
    } catch {
      return 'Last backup: Unknown';
    }
  };

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        {/* Header: icon + label + status badge */}
        <div className="flex items-center gap-3">
          <HardDrive className={`h-6 w-6 shrink-0 ${iconColor}`} />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-light-text-primary dark:text-dark-text-primary truncate">
              {label}
            </p>
            {isStatusLoading ? (
              <span className="text-xs text-light-text-muted dark:text-dark-text-muted">
                Loading…
              </span>
            ) : (
              <span
                className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium mt-0.5 ${
                  isConnected
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                }`}
              >
                {isConnected ? 'Connected' : 'Not connected'}
              </span>
            )}
          </div>
        </div>

        {/* Last backup info */}
        <p className="text-xs text-light-text-muted dark:text-dark-text-muted">
          {formatBackupDate(status?.lastBackupAt ?? null)}
          {status?.lastBackupStatus === 'FAILED' && (
            <span className="ml-1 text-red-500 dark:text-red-400">(Failed)</span>
          )}
        </p>

        {/* Action buttons */}
        <div className="flex flex-col gap-2">
          {isConnected ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={onDisconnect}
              disabled={isDisconnecting}
              className="w-full text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/20"
            >
              {isDisconnecting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Disconnecting…
                </>
              ) : (
                'Disconnect'
              )}
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={onConnect}
              className="w-full"
            >
              Connect
            </Button>
          )}

          {isConnected && (
            <Button
              variant="primary"
              size="sm"
              onClick={onBackupNow}
              disabled={isBackingUp}
              className="w-full"
            >
              {isBackingUp ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Backing up…
                </>
              ) : (
                'Backup Now'
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MEGA inline connect form
// ─────────────────────────────────────────────────────────────────────────────

interface MegaConnectFormProps {
  schoolId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

function MegaConnectForm({ schoolId, onSuccess, onCancel }: MegaConnectFormProps): JSX.Element {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [connectMega, { isLoading }] = useConnectMegaBackupMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;
    try {
      await connectMega({ schoolId, email, password }).unwrap();
      toast.success('MEGA connected successfully.');
      onSuccess();
    } catch (err: unknown) {
      const error = err as { data?: { message?: string } };
      toast.error(error?.data?.message ?? 'Failed to connect MEGA.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 mt-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40">
      <p className="text-sm font-medium text-light-text-primary dark:text-dark-text-primary">
        Connect MEGA account
      </p>
      <div>
        <label className="block text-xs text-light-text-secondary dark:text-dark-text-secondary mb-1">
          Email
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          required
          className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm text-light-text-primary dark:text-dark-text-primary placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        <label className="block text-xs text-light-text-secondary dark:text-dark-text-secondary mb-1">
          Password
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          required
          className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm text-light-text-primary dark:text-dark-text-primary placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div className="flex gap-2">
        <Button type="submit" variant="primary" size="sm" disabled={isLoading} className="flex-1">
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Connect'}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
      </div>
    </form>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MEGA card (wraps CloudBackupCard with inline form state)
// ─────────────────────────────────────────────────────────────────────────────

interface MegaBackupCardProps {
  schoolId: string;
  status: BackupStatus | undefined;
  isStatusLoading: boolean;
  onDisconnect: () => void;
  onBackupNow: () => void;
  isBackingUp: boolean;
  isDisconnecting: boolean;
  onConnectSuccess: () => void;
}

function MegaBackupCard({
  schoolId,
  status,
  isStatusLoading,
  onDisconnect,
  onBackupNow,
  isBackingUp,
  isDisconnecting,
  onConnectSuccess,
}: MegaBackupCardProps): JSX.Element {
  const [showForm, setShowForm] = useState(false);

  return (
    <div>
      <CloudBackupCard
        provider="MEGA"
        label="MEGA"
        iconColor="text-red-500"
        status={status}
        isStatusLoading={isStatusLoading}
        onConnect={() => setShowForm(true)}
        onDisconnect={onDisconnect}
        onBackupNow={onBackupNow}
        isBackingUp={isBackingUp}
        isDisconnecting={isDisconnecting}
      />
      {showForm && !status?.isConnected && (
        <MegaConnectForm
          schoolId={schoolId}
          onSuccess={() => {
            setShowForm(false);
            onConnectSuccess();
          }}
          onCancel={() => setShowForm(false)}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DataSettingsTab
// ─────────────────────────────────────────────────────────────────────────────

interface DataSettingsTabProps {
  schoolId: string;
}

export function DataSettingsTab({ schoolId }: DataSettingsTabProps): JSX.Element {
  const dispatch = useDispatch();
  const searchParams = useSearchParams();

  // ── Sessions & class arms ───────────────────────────────────────────────
  const { data: activeSessionData } = useGetActiveSessionQuery({ schoolId });
  const { data: sessionsData } = useGetSessionsQuery({ schoolId });
  const { data: classArmsData } = useGetClassArmsQuery({ schoolId });

  const sessions = sessionsData?.data ?? [];
  const classArms = classArmsData?.data ?? [];
  const activeSession = activeSessionData?.data;

  // Build term list from all sessions (flat)
  const allTerms = sessions.flatMap((s) => s.terms ?? []);

  // ── Export param state ──────────────────────────────────────────────────
  const [rosterAcademicYear, setRosterAcademicYear] = useState('');
  const [attendanceClassId, setAttendanceClassId] = useState('');
  const [attendanceTermId, setAttendanceTermId] = useState('');
  const [gradesClassId, setGradesClassId] = useState('');
  const [gradesTermId, setGradesTermId] = useState('');
  const [feesTermId, setFeesTermId] = useState('');

  // Pre-select active session/term when data loads
  useEffect(() => {
    if (activeSession?.session?.name && !rosterAcademicYear) {
      setRosterAcademicYear(activeSession.session.name);
    }
    if (activeSession?.term?.id) {
      if (!attendanceTermId) setAttendanceTermId(activeSession.term.id);
      if (!gradesTermId) setGradesTermId(activeSession.term.id);
      if (!feesTermId) setFeesTermId(activeSession.term.id);
    }
  }, [activeSession, rosterAcademicYear, attendanceTermId, gradesTermId, feesTermId]);

  // ── Lazy export query triggers ──────────────────────────────────────────
  const [triggerRoster] = useLazyExportRosterQuery();
  const [triggerAttendance] = useLazyExportAttendanceCsvQuery();
  const [triggerGrades] = useLazyExportGradesCsvQuery();
  const [triggerFees] = useLazyExportFeesCsvQuery();

  const { isDownloading: isDownloadingRoster, download: downloadRoster } = useFileDownload();
  const { isDownloading: isDownloadingAttendance, download: downloadAttendance } = useFileDownload();
  const { isDownloading: isDownloadingGrades, download: downloadGrades } = useFileDownload();
  const { isDownloading: isDownloadingFees, download: downloadFees } = useFileDownload();

  // ── Backup status queries ───────────────────────────────────────────────
  const { data: gdStatusData, isLoading: isGdStatusLoading } = useGetBackupStatusQuery({
    schoolId,
    provider: 'GOOGLE_DRIVE',
  });
  const { data: dbxStatusData, isLoading: isDbxStatusLoading } = useGetBackupStatusQuery({
    schoolId,
    provider: 'DROPBOX',
  });
  const { data: megaStatusData, isLoading: isMegaStatusLoading } = useGetBackupStatusQuery({
    schoolId,
    provider: 'MEGA',
  });

  // ── Backup mutations ────────────────────────────────────────────────────
  const [disconnectBackup] = useDisconnectBackupMutation();
  const [triggerBackup] = useTriggerBackupMutation();
  const [getAuthUrl] = useLazyGetBackupAuthUrlQuery();

  // Track per-provider backing up / disconnecting state
  const [backingUpProvider, setBackingUpProvider] = useState<string | null>(null);
  const [disconnectingProvider, setDisconnectingProvider] = useState<string | null>(null);

  // ── OAuth callback detection ────────────────────────────────────────────
  useEffect(() => {
    const gdConnected = searchParams.get('google-drive_connected');
    const dbxConnected = searchParams.get('dropbox_connected');

    if (gdConnected === 'true') {
      dispatch(apiSlice.util.invalidateTags([{ type: 'BackupStatus', id: 'GOOGLE_DRIVE' }]));
      toast.success('Google Drive connected successfully.');
    }
    if (dbxConnected === 'true') {
      dispatch(apiSlice.util.invalidateTags([{ type: 'BackupStatus', id: 'DROPBOX' }]));
      toast.success('Dropbox connected successfully.');
    }
  }, [searchParams, dispatch]);

  // ── Handler helpers ─────────────────────────────────────────────────────
  const handleOAuthConnect = async (provider: 'google-drive' | 'dropbox') => {
    try {
      const result = await getAuthUrl({ schoolId, provider }).unwrap();
      if (result?.authUrl) {
        window.open(result.authUrl, '_blank');
      } else {
        toast.error('Could not get authorization URL. Please try again.');
      }
    } catch {
      toast.error('Failed to start OAuth flow. Please try again.');
    }
  };

  const handleDisconnect = async (provider: string) => {
    setDisconnectingProvider(provider);
    try {
      await disconnectBackup({ schoolId, provider }).unwrap();
      toast.success(`${providerLabel(provider)} disconnected.`);
    } catch {
      toast.error(`Failed to disconnect ${providerLabel(provider)}.`);
    } finally {
      setDisconnectingProvider(null);
    }
  };

  const handleBackupNow = async (provider: string) => {
    setBackingUpProvider(provider);
    try {
      await triggerBackup({ schoolId, provider }).unwrap();
      toast.success(`Backup to ${providerLabel(provider)} completed.`);
    } catch {
      toast.error(`Backup to ${providerLabel(provider)} failed. Please try again.`);
    } finally {
      setBackingUpProvider(null);
    }
  };

  // ── Select helpers ──────────────────────────────────────────────────────
  const selectClass = 'w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm text-light-text-primary dark:text-dark-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500';
  const selectLabel = 'block text-xs text-light-text-secondary dark:text-dark-text-secondary mb-1';

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="space-y-10">
      {/* ── Export Data section ── */}
      <SettingsSection
        title="Export Data"
        description="Download school data as CSV files. Select the parameters for each report."
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Student Roster */}
          <ExportCard
            title="Student Roster"
            description="Export all enrolled students for a given academic year."
            isDownloading={isDownloadingRoster}
            isValid={!!rosterAcademicYear}
            onDownload={() =>
              downloadRoster(
                () => triggerRoster({ schoolId, academicYear: rosterAcademicYear }),
                `student-roster-${schoolId}-${today()}.csv`,
              )
            }
            params={
              <div>
                <label className={selectLabel}>Academic Year</label>
                <select
                  className={selectClass}
                  value={rosterAcademicYear}
                  onChange={(e) => setRosterAcademicYear(e.target.value)}
                >
                  <option value="">Select academic year</option>
                  {sessions.map((s) => (
                    <option key={s.id} value={s.name}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            }
          />

          {/* Attendance Report */}
          <ExportCard
            title="Attendance Report"
            description="Export attendance records for a class arm within a term."
            isDownloading={isDownloadingAttendance}
            isValid={!!attendanceClassId && !!attendanceTermId}
            onDownload={() =>
              downloadAttendance(
                () =>
                  triggerAttendance({
                    schoolId,
                    classId: attendanceClassId,
                    classType: 'CLASS_ARM',
                    termId: attendanceTermId,
                  }),
                `attendance-${attendanceClassId}-${attendanceTermId}-${today()}.csv`,
              )
            }
            params={
              <div className="space-y-2">
                <div>
                  <label className={selectLabel}>Class</label>
                  <select
                    className={selectClass}
                    value={attendanceClassId}
                    onChange={(e) => setAttendanceClassId(e.target.value)}
                  >
                    <option value="">Select class</option>
                    {classArms.map((arm) => (
                      <option key={arm.id} value={arm.id}>
                        {arm.classLevelName} — {arm.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={selectLabel}>Term</label>
                  <select
                    className={selectClass}
                    value={attendanceTermId}
                    onChange={(e) => setAttendanceTermId(e.target.value)}
                  >
                    <option value="">Select term</option>
                    {allTerms.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            }
          />

          {/* Grade Report */}
          <ExportCard
            title="Grade Report"
            description="Export grades for a class during a specific term."
            isDownloading={isDownloadingGrades}
            isValid={!!gradesClassId && !!gradesTermId}
            onDownload={() =>
              downloadGrades(
                () =>
                  triggerGrades({
                    schoolId,
                    classId: gradesClassId,
                    termId: gradesTermId,
                  }),
                `grades-${gradesClassId}-${gradesTermId}-${today()}.csv`,
              )
            }
            params={
              <div className="space-y-2">
                <div>
                  <label className={selectLabel}>Class</label>
                  <select
                    className={selectClass}
                    value={gradesClassId}
                    onChange={(e) => setGradesClassId(e.target.value)}
                  >
                    <option value="">Select class</option>
                    {classArms.map((arm) => (
                      <option key={arm.id} value={arm.id}>
                        {arm.classLevelName} — {arm.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={selectLabel}>Term</label>
                  <select
                    className={selectClass}
                    value={gradesTermId}
                    onChange={(e) => setGradesTermId(e.target.value)}
                  >
                    <option value="">Select term</option>
                    {allTerms.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            }
          />

          {/* Fee Report */}
          <ExportCard
            title="Fee Report"
            description="Export fee records for all students in a given term."
            isDownloading={isDownloadingFees}
            isValid={!!feesTermId}
            onDownload={() =>
              downloadFees(
                () => triggerFees({ schoolId, termId: feesTermId }),
                `fees-${schoolId}-${feesTermId}-${today()}.csv`,
              )
            }
            params={
              <div>
                <label className={selectLabel}>Term</label>
                <select
                  className={selectClass}
                  value={feesTermId}
                  onChange={(e) => setFeesTermId(e.target.value)}
                >
                  <option value="">Select term</option>
                  {allTerms.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            }
          />
        </div>
      </SettingsSection>

      {/* ── Cloud Backup section ── */}
      <SettingsSection
        title="Cloud Backup"
        description="Connect a cloud storage provider to automatically back up your school data as a ZIP archive."
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Google Drive */}
          <CloudBackupCard
            provider="GOOGLE_DRIVE"
            label="Google Drive"
            iconColor="text-blue-500"
            status={gdStatusData}
            isStatusLoading={isGdStatusLoading}
            onConnect={() => handleOAuthConnect('google-drive')}
            onDisconnect={() => handleDisconnect('GOOGLE_DRIVE')}
            onBackupNow={() => handleBackupNow('GOOGLE_DRIVE')}
            isBackingUp={backingUpProvider === 'GOOGLE_DRIVE'}
            isDisconnecting={disconnectingProvider === 'GOOGLE_DRIVE'}
          />

          {/* Dropbox */}
          <CloudBackupCard
            provider="DROPBOX"
            label="Dropbox"
            iconColor="text-[#0061FF]"
            status={dbxStatusData}
            isStatusLoading={isDbxStatusLoading}
            onConnect={() => handleOAuthConnect('dropbox')}
            onDisconnect={() => handleDisconnect('DROPBOX')}
            onBackupNow={() => handleBackupNow('DROPBOX')}
            isBackingUp={backingUpProvider === 'DROPBOX'}
            isDisconnecting={disconnectingProvider === 'DROPBOX'}
          />

          {/* MEGA */}
          <MegaBackupCard
            schoolId={schoolId}
            status={megaStatusData}
            isStatusLoading={isMegaStatusLoading}
            onDisconnect={() => handleDisconnect('MEGA')}
            onBackupNow={() => handleBackupNow('MEGA')}
            isBackingUp={backingUpProvider === 'MEGA'}
            isDisconnecting={disconnectingProvider === 'MEGA'}
            onConnectSuccess={() => {
              dispatch(apiSlice.util.invalidateTags([{ type: 'BackupStatus', id: 'MEGA' }]));
            }}
          />
        </div>
      </SettingsSection>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function providerLabel(provider: string): string {
  switch (provider) {
    case 'GOOGLE_DRIVE':
      return 'Google Drive';
    case 'DROPBOX':
      return 'Dropbox';
    case 'MEGA':
      return 'MEGA';
    default:
      return provider;
  }
}
