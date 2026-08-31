'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { SettingsSection } from '@/components/settings/SettingsSection';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Checkbox } from '@/components/ui/Checkbox';
import {
  useGetSchoolSettingsQuery,
  useUpdateSettingsSectionMutation,
} from '@/lib/store/api/schoolSettingsApi';
import { PermissionGate } from '@/components/permissions/PermissionGate';
import { PermissionResource, PermissionType } from '@/hooks/usePermissions';
import { Save, Loader2 } from 'lucide-react';

const TERMINOLOGY_FIELDS = [
  { key: 'classSingular', label: 'Class (singular)' },
  { key: 'classPlural', label: 'Classes (plural)' },
  { key: 'periodSingular', label: 'Term/Semester (singular)' },
  { key: 'staffSingular', label: 'Teacher/Lecturer (singular)' },
  { key: 'subjectSingular', label: 'Subject (singular)' },
] as const;

export function StructureSettingsSection() {
  const { data, isLoading, refetch } = useGetSchoolSettingsQuery();
  const [updateSection, { isLoading: isSaving }] = useUpdateSettingsSectionMutation();
  const config = data?.data?.structureConfig;

  const [terminology, setTerminology] = useState<Record<string, string>>({});
  const [defaultArms, setDefaultArms] = useState('A, B, C');
  const [facultyVisible, setFacultyVisible] = useState(true);
  const [subjectMode, setSubjectMode] = useState('AGORA_PLUS_CUSTOM');
  const [namingMode, setNamingMode] = useState('STANDARD');

  useEffect(() => {
    if (config) {
      setTerminology((config.terminologyOverrides as Record<string, string>) ?? {});
      setDefaultArms(config.defaultClassArmNames?.join(', ') ?? 'A, B, C');
      setFacultyVisible(config.facultyStructureVisible);
      setSubjectMode(config.subjectRegistryMode);
      setNamingMode(config.classLevelNamingMode);
    }
  }, [config]);

  const handleSave = async () => {
    try {
      await updateSection({
        section: 'structure',
        body: {
          terminologyOverrides: terminology,
          defaultClassArmNames: defaultArms.split(',').map((s) => s.trim()).filter(Boolean),
          facultyStructureVisible: facultyVisible,
          subjectRegistryMode: subjectMode,
          classLevelNamingMode: namingMode,
        },
      }).unwrap();
      toast.success('Structure settings saved.');
      refetch();
    } catch (err: unknown) {
      toast.error((err as { data?: { message?: string } })?.data?.message ?? 'Failed to save.');
    }
  };

  if (isLoading) return <LoadingSpinner />;

  return (
    <>
      <SettingsSection
        title="Naming & Terminology"
        description="Override default labels shown across the dashboard. Leave blank to use school-type defaults."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          {TERMINOLOGY_FIELDS.map(({ key, label }) => (
            <div key={key}>
              <Label htmlFor={key}>{label}</Label>
              <Input
                id={key}
                value={terminology[key] ?? ''}
                onChange={(e) => setTerminology((prev) => ({ ...prev, [key]: e.target.value }))}
                placeholder={`Default ${label.toLowerCase()}`}
              />
            </div>
          ))}
        </div>
      </SettingsSection>

      <SettingsSection title="Class Structure Defaults" description="Default arm names when creating new class levels.">
        <div className="space-y-4">
          <div>
            <Label htmlFor="namingMode">Class level naming</Label>
            <select
              id="namingMode"
              className="w-full mt-1 rounded-lg border px-3 py-2 bg-transparent"
              value={namingMode}
              onChange={(e) => setNamingMode(e.target.value)}
            >
              <option value="STANDARD">Standard templates (JSS1, Primary 1, 100L)</option>
              <option value="CUSTOM">Custom naming</option>
            </select>
          </div>
          <div>
            <Label htmlFor="defaultArms">Default class arms (comma-separated)</Label>
            <Input id="defaultArms" value={defaultArms} onChange={(e) => setDefaultArms(e.target.value)} />
          </div>
        </div>
      </SettingsSection>

      <SettingsSection title="Faculties & Departments" description="Tertiary schools only.">
        <label className="flex items-center gap-2">
          <Checkbox checked={facultyVisible} onCheckedChange={(v) => setFacultyVisible(!!v)} />
          Show faculty and department structure in navigation
        </label>
      </SettingsSection>

      <SettingsSection title="Subject Registry" description="Default curriculum source for new subjects.">
        <select
          className="w-full rounded-lg border px-3 py-2 bg-transparent"
          value={subjectMode}
          onChange={(e) => setSubjectMode(e.target.value)}
        >
          <option value="AGORA_DEFAULT">Agora national curriculum only</option>
          <option value="AGORA_PLUS_CUSTOM">Agora curriculum plus custom subjects</option>
          <option value="CUSTOM_ONLY">Custom subjects only</option>
        </select>
      </SettingsSection>

      <PermissionGate resource={PermissionResource.SETTINGS} type={PermissionType.WRITE}>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
          Save structure settings
        </Button>
      </PermissionGate>
    </>
  );
}
