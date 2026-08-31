'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { SettingsSection, settingsText } from '@/components/settings/SettingsSection';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Checkbox } from '@/components/ui/Checkbox';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import {
  useGetSchoolSettingsQuery,
  useUpdateSettingsSectionMutation,
} from '@/lib/store/api/schoolSettingsApi';
import { PermissionGate } from '@/components/permissions/PermissionGate';
import { PermissionResource, PermissionType } from '@/hooks/usePermissions';
import { Loader2, Save } from 'lucide-react';
import type { AdmissionPolicy } from '@/lib/store/api/schoolSettingsApi';

export function AdmissionsSettingsTab() {
  const { data, isLoading, refetch } = useGetSchoolSettingsQuery();
  const [updateSection, { isLoading: isSaving }] = useUpdateSettingsSectionMutation();
  const [policy, setPolicy] = useState<Partial<AdmissionPolicy>>({});

  useEffect(() => {
    if (data?.data?.admissionPolicy) setPolicy(data.data.admissionPolicy);
  }, [data]);

  const save = async () => {
    try {
      await updateSection({ section: 'admissions', body: policy as Record<string, unknown> }).unwrap();
      toast.success('Admissions settings saved.');
      refetch();
    } catch {
      toast.error('Failed to save.');
    }
  };

  const toggleFormField = (key: string, field: 'required' | 'visible') => {
    const fields = [...(policy.formFields ?? [])];
    const idx = fields.findIndex((f) => f.key === key);
    if (idx >= 0) {
      fields[idx] = { ...fields[idx], [field]: !fields[idx][field] };
      setPolicy((p) => ({ ...p, formFields: fields }));
    }
  };

  if (isLoading) return <LoadingSpinner />;

  const formFields = policy.formFields ?? [];

  return (
    <div className="space-y-8">
      <SettingsSection title="Application Window">
        <label className="flex items-center gap-2 mb-3">
          <Checkbox checked={policy.applicationsOpen !== false} onCheckedChange={(v) => setPolicy((p) => ({ ...p, applicationsOpen: !!v }))} />
          Applications open
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <div><Label>Application deadline</Label><Input type="datetime-local" value={policy.applicationDeadline?.slice(0, 16) ?? ''} onChange={(e) => setPolicy((p) => ({ ...p, applicationDeadline: e.target.value || null }))} /></div>
          <div><Label>TAC expiry (days)</Label><Input type="number" value={policy.tacExpiryDays ?? 30} onChange={(e) => setPolicy((p) => ({ ...p, tacExpiryDays: Number(e.target.value) }))} /></div>
        </div>
      </SettingsSection>

      <SettingsSection title="Transfer Policy">
        <select className="w-full rounded-lg border px-3 py-2 bg-transparent" value={policy.transferPolicy ?? 'MANUAL_REVIEW'} onChange={(e) => setPolicy((p) => ({ ...p, transferPolicy: e.target.value as AdmissionPolicy['transferPolicy'] }))}>
          <option value="MANUAL_REVIEW">Manual review</option>
          <option value="AUTO_ACCEPT">Auto accept incoming</option>
          <option value="DISABLED">Transfers disabled</option>
        </select>
      </SettingsSection>

      <SettingsSection title="Admission Form Fields" description="Configure which fields appear on the public application form.">
        <div className="space-y-2" style={settingsText.body}>
          {formFields.map((f) => (
            <div key={f.key} className="flex items-center justify-between border rounded px-3 py-2">
              <span>{f.label}</span>
              <div className="flex gap-4">
                <label className="flex items-center gap-1"><Checkbox checked={f.visible} onCheckedChange={() => toggleFormField(f.key, 'visible')} /> Visible</label>
                <label className="flex items-center gap-1"><Checkbox checked={f.required} onCheckedChange={() => toggleFormField(f.key, 'required')} /> Required</label>
              </div>
            </div>
          ))}
        </div>
      </SettingsSection>

      <SettingsSection title="Document Requirements">
        <ul className="space-y-1" style={settingsText.body}>
          {(policy.documentRequirements ?? []).map((d) => (
            <li key={d.key} className="border rounded px-3 py-2">{d.label} {d.required && '(required)'}</li>
          ))}
        </ul>
      </SettingsSection>

      <PermissionGate resource={PermissionResource.SETTINGS} type={PermissionType.WRITE}>
        <Button onClick={save} disabled={isSaving}>{isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}Save admissions settings</Button>
      </PermissionGate>
    </div>
  );
}
