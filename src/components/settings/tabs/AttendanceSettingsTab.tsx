'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { SettingsSection, settingsText } from '@/components/settings/SettingsSection';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useGetSchoolSettingsQuery, useUpdateSettingsSectionMutation } from '@/lib/store/api/schoolSettingsApi';
import { PermissionGate } from '@/components/permissions/PermissionGate';
import { PermissionResource, PermissionType } from '@/hooks/usePermissions';
import { Loader2, Save } from 'lucide-react';

export function AttendanceSettingsTab() {
  const { data, isLoading, refetch } = useGetSchoolSettingsQuery();
  const [updateSection, { isLoading: isSaving }] = useUpdateSettingsSectionMutation();
  const [policy, setPolicy] = useState<Record<string, unknown>>({});

  useEffect(() => {
    if (data?.data?.attendancePolicy) setPolicy(data.data.attendancePolicy as Record<string, unknown>);
  }, [data]);

  const save = async () => {
    try {
      await updateSection({ section: 'attendance', body: policy }).unwrap();
      toast.success('Attendance policy saved.');
      refetch();
    } catch {
      toast.error('Failed to save.');
    }
  };

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-8">
      <SettingsSection title="Marking Rules" description="Controls how teachers record attendance via RollCall.">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Marking window (hours)</Label>
            <Input type="number" value={Number(policy.markingWindowHours ?? 24)} onChange={(e) => setPolicy((p) => ({ ...p, markingWindowHours: Number(e.target.value) }))} />
            <p className="mt-1 text-light-text-secondary dark:text-dark-text-secondary" style={settingsText.small}>0 = same day only</p>
          </div>
          <div>
            <Label>Minimum attendance (%)</Label>
            <Input type="number" value={Number(policy.minAttendancePercent ?? 75)} onChange={(e) => setPolicy((p) => ({ ...p, minAttendancePercent: Number(e.target.value) }))} />
          </div>
        </div>
      </SettingsSection>

      <SettingsSection title="Status Options">
        <Input
          defaultValue={(policy.statusOptions as string[])?.join(', ') ?? 'PRESENT, ABSENT, LATE, EXCUSED, SICK'}
          onChange={(e) => setPolicy((p) => ({ ...p, statusOptions: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) }))}
          placeholder="PRESENT, ABSENT, LATE"
        />
      </SettingsSection>

      <SettingsSection title="Notifications">
        <Input
          defaultValue={(policy.absenceNotifyChannels as string[])?.join(', ') ?? 'EMAIL, IN_APP'}
          onChange={(e) => setPolicy((p) => ({ ...p, absenceNotifyChannels: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) }))}
          placeholder="EMAIL, IN_APP"
        />
      </SettingsSection>

      <PermissionGate resource={PermissionResource.SETTINGS} type={PermissionType.WRITE}>
        <Button onClick={save} disabled={isSaving}>{isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}Save attendance settings</Button>
      </PermissionGate>
    </div>
  );
}
