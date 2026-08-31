'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { SettingsSection, settingsText } from '@/components/settings/SettingsSection';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Checkbox } from '@/components/ui/Checkbox';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useGetSchoolSettingsQuery, useUpdateSettingsSectionMutation } from '@/lib/store/api/schoolSettingsApi';
import { PermissionGate } from '@/components/permissions/PermissionGate';
import { PermissionResource, PermissionType } from '@/hooks/usePermissions';
import { Loader2, Save } from 'lucide-react';

const TRIGGER_KEYS = ['GRADE_PUBLISHED', 'ABSENCE', 'TRANSFER_APPROVED', 'FEE_DUE', 'ADMISSION_RECEIVED'] as const;

export function CommunicationsSettingsTab() {
  const { data, isLoading, refetch } = useGetSchoolSettingsQuery();
  const [updateSection, { isLoading: isSaving }] = useUpdateSettingsSectionMutation();
  const [policy, setPolicy] = useState<Record<string, unknown>>({});

  useEffect(() => {
    if (data?.data?.notificationPolicy) setPolicy(data.data.notificationPolicy as Record<string, unknown>);
  }, [data]);

  const save = async () => {
    try {
      await updateSection({ section: 'communications', body: policy }).unwrap();
      toast.success('Communication settings saved.');
      refetch();
    } catch {
      toast.error('Failed to save.');
    }
  };

  const triggers = (policy.eventTriggers as Record<string, boolean>) ?? {};

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-8">
      <SettingsSection title="Email Branding">
        <Label>Sender display name</Label>
        <Input value={String(policy.emailSenderName ?? '')} onChange={(e) => setPolicy((p) => ({ ...p, emailSenderName: e.target.value }))} placeholder="Lagos Model College via Agora" />
      </SettingsSection>

      <SettingsSection title="Notification Channels">
        <Input
          defaultValue={(policy.enabledChannels as string[])?.join(', ') ?? 'EMAIL, IN_APP, PUSH'}
          onChange={(e) => setPolicy((p) => ({ ...p, enabledChannels: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) }))}
        />
      </SettingsSection>

      <SettingsSection title="Event Triggers">
        <div className="space-y-2">
          {TRIGGER_KEYS.map((key) => (
            <label key={key} className="flex items-center gap-2" style={settingsText.body}>
              <Checkbox
                checked={triggers[key] !== false}
                onCheckedChange={(v) => setPolicy((p) => ({ ...p, eventTriggers: { ...triggers, [key]: !!v } }))}
              />
              {key.replace(/_/g, ' ')}
            </label>
          ))}
        </div>
      </SettingsSection>

      <SettingsSection title="Quiet Hours">
        <div className="grid gap-4 sm:grid-cols-3">
          <div><Label>Start (HH:mm)</Label><Input value={String(policy.quietHoursStart ?? '')} onChange={(e) => setPolicy((p) => ({ ...p, quietHoursStart: e.target.value }))} placeholder="20:00" /></div>
          <div><Label>End (HH:mm)</Label><Input value={String(policy.quietHoursEnd ?? '')} onChange={(e) => setPolicy((p) => ({ ...p, quietHoursEnd: e.target.value }))} placeholder="07:00" /></div>
          <div><Label>Timezone</Label><Input value={String(policy.quietHoursTimezone ?? 'Africa/Lagos')} onChange={(e) => setPolicy((p) => ({ ...p, quietHoursTimezone: e.target.value }))} /></div>
        </div>
      </SettingsSection>

      <PermissionGate resource={PermissionResource.SETTINGS} type={PermissionType.WRITE}>
        <Button onClick={save} disabled={isSaving}>{isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}Save communication settings</Button>
      </PermissionGate>
    </div>
  );
}
