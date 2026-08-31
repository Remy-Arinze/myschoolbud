'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { TermsSessionsSettingsTab } from '@/components/settings/TermsSessionsSettingsTab';
import { SettingsSection, settingsText } from '@/components/settings/SettingsSection';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Checkbox } from '@/components/ui/Checkbox';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import {
  useGetSchoolSettingsQuery,
  useUpdateSettingsSectionMutation,
  useCreateHolidayPresetMutation,
  useDeleteHolidayPresetMutation,
  useApplyHolidayPresetMutation,
} from '@/lib/store/api/schoolSettingsApi';
import { PermissionGate } from '@/components/permissions/PermissionGate';
import { PermissionResource, PermissionType } from '@/hooks/usePermissions';
import { Trash2, CalendarPlus, Loader2, Save } from 'lucide-react';

const WEEKDAYS = [
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY',
] as const;

export function CalendarSettingsTab() {
  const { data, isLoading, refetch } = useGetSchoolSettingsQuery();
  const [updateSection, { isLoading: isSaving }] = useUpdateSettingsSectionMutation();
  const [createHoliday] = useCreateHolidayPresetMutation();
  const [deleteHoliday] = useDeleteHolidayPresetMutation();
  const [applyHoliday] = useApplyHolidayPresetMutation();

  const [workingDays, setWorkingDays] = useState<string[]>(['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY']);
  const [holidayName, setHolidayName] = useState('');
  const [holidayStart, setHolidayStart] = useState('');
  const [holidayEnd, setHolidayEnd] = useState('');

  useEffect(() => {
    if (data?.data?.workingDays) {
      setWorkingDays(data.data.workingDays);
    }
  }, [data]);

  const toggleDay = (day: string) => {
    setWorkingDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    );
  };

  const saveWorkingDays = async () => {
    try {
      await updateSection({ section: 'calendar', body: { workingDays } }).unwrap();
      toast.success('Working days saved.');
      refetch();
    } catch {
      toast.error('Failed to save working days.');
    }
  };

  const addHoliday = async () => {
    if (!holidayName || !holidayStart || !holidayEnd) {
      toast.error('Fill in all holiday fields.');
      return;
    }
    try {
      await createHoliday({ name: holidayName, startDate: holidayStart, endDate: holidayEnd }).unwrap();
      toast.success('Holiday preset added.');
      setHolidayName('');
      setHolidayStart('');
      setHolidayEnd('');
      refetch();
    } catch {
      toast.error('Failed to add holiday.');
    }
  };

  if (isLoading) return <LoadingSpinner />;

  const presets = data?.data?.holidayPresets ?? [];

  return (
    <div className="space-y-8">
      <SettingsSection title="Working Days" description="Days when school is in session. Used for calendars, timetables, and scheme-of-work.">
        <div className="flex flex-wrap gap-3 mb-4">
          {WEEKDAYS.map((day) => (
            <label key={day} className="flex items-center gap-2" style={settingsText.body}>
              <Checkbox checked={workingDays.includes(day)} onCheckedChange={() => toggleDay(day)} />
              {day.charAt(0) + day.slice(1).toLowerCase()}
            </label>
          ))}
        </div>
        <PermissionGate resource={PermissionResource.SETTINGS} type={PermissionType.WRITE}>
          <Button onClick={saveWorkingDays} disabled={isSaving}>
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Save working days
          </Button>
        </PermissionGate>
      </SettingsSection>

      <SettingsSection title="Holiday Presets" description="Reusable holiday blocks. Apply to create calendar events.">
        <div className="grid gap-3 sm:grid-cols-3 mb-4">
          <div>
            <Label>Name</Label>
            <Input value={holidayName} onChange={(e) => setHolidayName(e.target.value)} placeholder="Easter Break" />
          </div>
          <div>
            <Label>Start</Label>
            <Input type="date" value={holidayStart} onChange={(e) => setHolidayStart(e.target.value)} />
          </div>
          <div>
            <Label>End</Label>
            <Input type="date" value={holidayEnd} onChange={(e) => setHolidayEnd(e.target.value)} />
          </div>
        </div>
        <PermissionGate resource={PermissionResource.SETTINGS} type={PermissionType.WRITE}>
          <Button variant="outline" onClick={addHoliday} className="mb-4">
            <CalendarPlus className="h-4 w-4 mr-2" /> Add preset
          </Button>
        </PermissionGate>
        <ul className="space-y-2">
          {presets.map((p) => (
            <li key={p.id} className="flex items-center justify-between rounded-lg border px-3 py-2" style={settingsText.body}>
              <span>
                {p.name} ({new Date(p.startDate).toLocaleDateString()} – {new Date(p.endDate).toLocaleDateString()})
              </span>
              <div className="flex gap-2">
                <PermissionGate resource={PermissionResource.SETTINGS} type={PermissionType.WRITE}>
                  <Button size="sm" variant="outline" onClick={() => applyHoliday(p.id).unwrap().then(() => toast.success('Applied to calendar.')).catch(() => toast.error('Failed.'))}>
                    Apply
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => deleteHoliday(p.id).unwrap().then(() => refetch())}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </PermissionGate>
              </div>
            </li>
          ))}
        </ul>
      </SettingsSection>

      <TermsSessionsSettingsTab />
    </div>
  );
}
