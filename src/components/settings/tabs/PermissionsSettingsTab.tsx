'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { SettingsSection, settingsText } from '@/components/settings/SettingsSection';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import {
  useGetSchoolSettingsQuery,
  useUpdateSettingsSectionMutation,
  useCreateRoleTemplateMutation,
  useDeleteRoleTemplateMutation,
} from '@/lib/store/api/schoolSettingsApi';
import { useGetStaffListQuery } from '@/lib/store/api/schoolAdminApi';
import { PermissionGate } from '@/components/permissions/PermissionGate';
import { PermissionResource, PermissionType } from '@/hooks/usePermissions';
import { Loader2, Save, Plus, Trash2 } from 'lucide-react';

export function PermissionsSettingsTab() {
  const { data, isLoading, refetch } = useGetSchoolSettingsQuery();
  const { data: staffData } = useGetStaffListQuery({ page: 1, limit: 100 });
  const [updateSection, { isLoading: isSaving }] = useUpdateSettingsSectionMutation();
  const [createTemplate] = useCreateRoleTemplateMutation();
  const [deleteTemplate] = useDeleteRoleTemplateMutation();

  const [customRoles, setCustomRoles] = useState('');
  const [teacherScope, setTeacherScope] = useState('ASSIGNED_ONLY');
  const [templateName, setTemplateName] = useState('');

  const structure = data?.data?.structureConfig;
  const roleTemplates = data?.data?.roleTemplates ?? [];
  const staff = staffData?.data?.items?.filter((s) => s.type === 'admin') ?? [];

  if (isLoading) return <LoadingSpinner />;

  const savePermissionsPolicy = async () => {
    try {
      await updateSection({
        section: 'permissions',
        body: {
          customRoles: (customRoles || structure?.customRoles?.join(', ') || '')
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
          teacherScope,
        },
      }).unwrap();
      toast.success('Permission settings saved.');
      refetch();
    } catch {
      toast.error('Failed to save.');
    }
  };

  const addTemplate = async () => {
    if (!templateName.trim()) return;
    try {
      await createTemplate({ name: templateName, permissionIds: [] }).unwrap();
      setTemplateName('');
      refetch();
      toast.success('Role template created — assign permissions on staff detail page.');
    } catch {
      toast.error('Failed to create template.');
    }
  };

  return (
    <div className="space-y-8">
      <SettingsSection title="Role Templates" description="Pre-configured permission bundles for common admin roles.">
        <div className="flex gap-2 mb-3">
          <Input value={templateName} onChange={(e) => setTemplateName(e.target.value)} placeholder="Registrar" />
          <Button variant="outline" onClick={addTemplate}><Plus className="h-4 w-4" /></Button>
        </div>
        <ul className="space-y-1" style={settingsText.body}>
          {roleTemplates.map((t) => (
            <li key={t.id} className="flex justify-between border rounded px-3 py-2">
              <span>{t.name} {t.isSystem && '(system)'}</span>
              {!t.isSystem && (
                <Button size="sm" variant="ghost" onClick={() => deleteTemplate(t.id).unwrap().then(() => refetch())}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </li>
          ))}
        </ul>
      </SettingsSection>

      <SettingsSection title="Custom Roles Catalog">
        <Label>Roles (comma-separated)</Label>
        <Input
          defaultValue={structure?.customRoles?.join(', ') ?? ''}
          onChange={(e) => setCustomRoles(e.target.value)}
          placeholder="registrar, bursar, hod"
        />
      </SettingsSection>

      <SettingsSection title="Teacher Scope">
        <select
          className="w-full rounded-lg border px-3 py-2 bg-transparent"
          defaultValue={structure?.teacherScope ?? 'ASSIGNED_ONLY'}
          onChange={(e) => setTeacherScope(e.target.value)}
        >
          <option value="ASSIGNED_ONLY">Assigned classes only</option>
          <option value="ALL_SCHOOL">All school classes</option>
        </select>
      </SettingsSection>

      <SettingsSection title="Staff Overview">
        <div className="overflow-x-auto" style={settingsText.body}>
          <table className="w-full border-collapse">
            <thead><tr className="border-b"><th className="text-left p-2">Name</th><th className="text-left p-2">Role</th></tr></thead>
            <tbody>
              {staff.map((s) => (
                <tr key={s.id} className="border-b"><td className="p-2">{s.firstName} {s.lastName}</td><td className="p-2">{s.role}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </SettingsSection>

      <PermissionGate resource={PermissionResource.SETTINGS} type={PermissionType.WRITE}>
        <Button onClick={savePermissionsPolicy} disabled={isSaving}>
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
          Save permission settings
        </Button>
      </PermissionGate>
    </div>
  );
}
