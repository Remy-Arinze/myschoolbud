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
import { useSchoolType } from '@/hooks/useSchoolType';
import { PermissionGate } from '@/components/permissions/PermissionGate';
import { PermissionResource, PermissionType } from '@/hooks/usePermissions';
import { getScheduleForSchoolType } from '@/lib/utils/nigerianSchoolSchedule';
import { Loader2, Save, RotateCcw } from 'lucide-react';

export function TimetableSettingsTab() {
  const { currentType } = useSchoolType();
  const { data, isLoading, refetch } = useGetSchoolSettingsQuery();
  const [updateSection, { isLoading: isSaving }] = useUpdateSettingsSectionMutation();
  const [policy, setPolicy] = useState<Record<string, unknown>>({});

  useEffect(() => {
    if (data?.data?.timetablePolicy) setPolicy(data.data.timetablePolicy as Record<string, unknown>);
  }, [data]);

  const save = async () => {
    try {
      await updateSection({ section: 'timetable', body: policy }).unwrap();
      toast.success('Timetable settings saved.');
      refetch();
    } catch {
      toast.error('Failed to save.');
    }
  };

  const resetBellSchedule = async () => {
    if (!currentType) return;
    const schedule = getScheduleForSchoolType(currentType);
    try {
      await updateSection({
        section: 'timetable',
        body: {
          bellScheduleTemplates: [{ schoolType: currentType, periods: schedule.periods, isDefault: true }],
        },
      }).unwrap();
      toast.success('Bell schedule reset to Nigerian default.');
      refetch();
    } catch {
      toast.error('Failed to reset schedule.');
    }
  };

  if (isLoading) return <LoadingSpinner />;

  const templates = data?.data?.bellScheduleTemplates ?? [];
  const activeTemplate = templates.find((t) => t.schoolType === currentType);

  return (
    <div className="space-y-8">
      <SettingsSection title="Period Structure" description="Default values for master schedule generation.">
        <div className="grid gap-4 sm:grid-cols-2">
          <div><Label>Default period length (minutes)</Label><Input type="number" value={Number(policy.defaultPeriodLengthMinutes ?? 40)} onChange={(e) => setPolicy((p) => ({ ...p, defaultPeriodLengthMinutes: Number(e.target.value) }))} /></div>
          <div><Label>Max periods per teacher per day</Label><Input type="number" value={Number(policy.maxPeriodsPerTeacherPerDay ?? 6)} onChange={(e) => setPolicy((p) => ({ ...p, maxPeriodsPerTeacherPerDay: Number(e.target.value) }))} /></div>
        </div>
        <div className="mt-3 space-y-2">
          <label className="flex items-center gap-2"><Checkbox checked={policy.roomCapacityWarningEnabled !== false} onCheckedChange={(v) => setPolicy((p) => ({ ...p, roomCapacityWarningEnabled: !!v }))} /> Warn when room capacity exceeded</label>
          <label className="flex items-center gap-2"><Checkbox checked={policy.examBlackoutEnabled !== false} onCheckedChange={(v) => setPolicy((p) => ({ ...p, examBlackoutEnabled: !!v }))} /> Hide lesson timetables during exam period</label>
        </div>
      </SettingsSection>

      <SettingsSection title="Bell Schedule" description={`Active template for ${currentType ?? 'school type'}.`}>
        {activeTemplate ? (
          <p className="text-light-text-secondary dark:text-dark-text-secondary mb-3" style={settingsText.body}>
            {(activeTemplate.periods as unknown[])?.length ?? 0} periods configured
          </p>
        ) : (
          <p className="mb-3" style={settingsText.body}>No custom template — using Nigerian defaults.</p>
        )}
        <Button variant="outline" onClick={resetBellSchedule}><RotateCcw className="h-4 w-4 mr-2" />Reset to Nigerian default</Button>
      </SettingsSection>

      <PermissionGate resource={PermissionResource.SETTINGS} type={PermissionType.WRITE}>
        <Button onClick={save} disabled={isSaving}>{isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}Save timetable settings</Button>
      </PermissionGate>
    </div>
  );
}
