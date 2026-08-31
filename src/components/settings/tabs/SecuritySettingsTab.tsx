'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { SettingsSection, settingsText } from '@/components/settings/SettingsSection';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Checkbox } from '@/components/ui/Checkbox';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useGetSchoolSettingsQuery, useUpdateSettingsSectionMutation, useGetAuditLogsQuery } from '@/lib/store/api/schoolSettingsApi';
import { PermissionGate } from '@/components/permissions/PermissionGate';
import { PermissionResource, PermissionType } from '@/hooks/usePermissions';
import { Loader2, Save } from 'lucide-react';

export function SecuritySettingsTab() {
  const { data, isLoading, refetch } = useGetSchoolSettingsQuery();
  const { data: auditData } = useGetAuditLogsQuery();
  const [updateSection, { isLoading: isSaving }] = useUpdateSettingsSectionMutation();
  const [policy, setPolicy] = useState<Record<string, unknown>>({});

  useEffect(() => {
    if (data?.data?.securityPolicy) setPolicy(data.data.securityPolicy as Record<string, unknown>);
  }, [data]);

  const save = async () => {
    try {
      await updateSection({ section: 'security', body: policy }).unwrap();
      toast.success('Security settings saved.');
      refetch();
    } catch {
      toast.error('Failed to save.');
    }
  };

  if (isLoading) return <LoadingSpinner />;

  const studentAudits = auditData?.data?.studentAudits ?? [];
  const profileAudits = auditData?.data?.profileAudits ?? [];

  return (
    <div className="space-y-8">
      <SettingsSection title="Session & Password">
        <div className="grid gap-4 sm:grid-cols-2">
          <div><Label>Session timeout (minutes)</Label><Input type="number" value={Number(policy.sessionTimeoutMinutes ?? 480)} onChange={(e) => setPolicy((p) => ({ ...p, sessionTimeoutMinutes: Number(e.target.value) }))} /></div>
          <div><Label>Minimum password length</Label><Input type="number" value={Number(policy.passwordMinLength ?? 8)} onChange={(e) => setPolicy((p) => ({ ...p, passwordMinLength: Number(e.target.value) }))} /></div>
          <div><Label>Password reset interval (days)</Label><Input type="number" value={Number(policy.passwordResetDays ?? 90)} onChange={(e) => setPolicy((p) => ({ ...p, passwordResetDays: Number(e.target.value) }))} /></div>
        </div>
        <label className="flex items-center gap-2 mt-3">
          <Checkbox checked={policy.passwordRequireSpecialChar !== false} onCheckedChange={(v) => setPolicy((p) => ({ ...p, passwordRequireSpecialChar: !!v }))} />
          Require special character in passwords
        </label>
      </SettingsSection>

      <SettingsSection title="Data Retention">
        <div className="grid gap-4 sm:grid-cols-2">
          <div><Label>Audit log retention (days)</Label><Input type="number" value={Number(policy.auditLogRetentionDays ?? 365)} onChange={(e) => setPolicy((p) => ({ ...p, auditLogRetentionDays: Number(e.target.value) }))} /></div>
          <div><Label>Alumni data retention (years)</Label><Input type="number" value={Number(policy.alumniDataRetentionYears ?? 7)} onChange={(e) => setPolicy((p) => ({ ...p, alumniDataRetentionYears: Number(e.target.value) }))} /></div>
        </div>
      </SettingsSection>

      <SettingsSection title="Consent & Verification">
        <label className="flex items-center gap-2 mb-2">
          <Checkbox checked={!!policy.studentPhotoConsentRequired} onCheckedChange={(v) => setPolicy((p) => ({ ...p, studentPhotoConsentRequired: !!v }))} />
          Require photo consent for student ID cards / directory
        </label>
        <label className="flex items-center gap-2">
          <Checkbox checked={policy.sensitiveChangesRequireEmailVerification !== false} onCheckedChange={(v) => setPolicy((p) => ({ ...p, sensitiveChangesRequireEmailVerification: !!v }))} />
          Sensitive changes require email verification
        </label>
      </SettingsSection>

      <SettingsSection title="Audit Log" description="Recent profile and student record access events.">
        <div className="space-y-2 max-h-48 overflow-y-auto" style={settingsText.tiny}>
          {[...studentAudits.slice(0, 10), ...profileAudits.slice(0, 10)].map((a: { id: string; action?: string; event?: string; createdAt: string }) => (
            <div key={a.id} className="border rounded px-2 py-1">{a.action ?? a.event} — {new Date(a.createdAt).toLocaleString()}</div>
          ))}
          {studentAudits.length === 0 && profileAudits.length === 0 && <p className="text-[var(--light-text-secondary)]">No audit entries yet.</p>}
        </div>
      </SettingsSection>

      <PermissionGate resource={PermissionResource.SETTINGS} type={PermissionType.WRITE}>
        <Button onClick={save} disabled={isSaving}>{isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}Save security settings</Button>
      </PermissionGate>
    </div>
  );
}
