'use client';

import { useState } from 'react';
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
  useCreateFeeCategoryMutation,
  useCreateFeeScheduleMutation,
  useGenerateFeesFromScheduleMutation,
} from '@/lib/store/api/schoolSettingsApi';
import { PermissionGate } from '@/components/permissions/PermissionGate';
import { PermissionResource, PermissionType } from '@/hooks/usePermissions';
import { Loader2, Save, Plus } from 'lucide-react';

export function FinanceSettingsTab() {
  const { data, isLoading, refetch } = useGetSchoolSettingsQuery();
  const [updateSection, { isLoading: isSaving }] = useUpdateSettingsSectionMutation();
  const [createCategory] = useCreateFeeCategoryMutation();
  const [createSchedule] = useCreateFeeScheduleMutation();
  const [generateFees] = useGenerateFeesFromScheduleMutation();

  const [categoryName, setCategoryName] = useState('');
  const [financePolicy, setFinancePolicy] = useState<Record<string, unknown>>({});

  if (isLoading) return <LoadingSpinner />;

  const categories = data?.data?.feeCategories ?? [];
  const policy = data?.data?.financePolicy ?? financePolicy;

  const saveFinancePolicy = async () => {
    try {
      await updateSection({ section: 'finance', body: financePolicy }).unwrap();
      toast.success('Finance settings saved.');
      refetch();
    } catch {
      toast.error('Failed to save.');
    }
  };

  const addCategory = async () => {
    if (!categoryName.trim()) return;
    try {
      await createCategory({ name: categoryName }).unwrap();
      setCategoryName('');
      refetch();
      toast.success('Fee category added.');
    } catch {
      toast.error('Failed to add category.');
    }
  };

  return (
    <div className="space-y-8">
      <SettingsSection title="Fee Categories">
        <div className="flex gap-2 mb-3">
          <Input value={categoryName} onChange={(e) => setCategoryName(e.target.value)} placeholder="Tuition" />
          <Button variant="outline" onClick={addCategory}><Plus className="h-4 w-4" /></Button>
        </div>
        <ul className="space-y-1" style={settingsText.body}>
          {categories.map((c: { id: string; name: string }) => (
            <li key={c.id} className="border rounded px-3 py-2">{c.name}</li>
          ))}
        </ul>
      </SettingsSection>

      <SettingsSection title="Payment & Visibility">
        <label className="flex items-center gap-2 mb-3">
          <Checkbox
            checked={(policy as { feeVisibleToStudents?: boolean }).feeVisibleToStudents === true}
            onCheckedChange={(v) => setFinancePolicy((p) => ({ ...p, feeVisibleToStudents: !!v }))}
          />
          Students can view fee balances
        </label>
        <Label>Payment methods (comma-separated)</Label>
        <Input
          defaultValue={((policy as { paymentMethods?: string[] }).paymentMethods ?? ['BANK_TRANSFER', 'PAYSTACK', 'CASH']).join(', ')}
          onChange={(e) => setFinancePolicy((p) => ({ ...p, paymentMethods: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) }))}
        />
      </SettingsSection>

      <PermissionGate resource={PermissionResource.SETTINGS} type={PermissionType.WRITE}>
        <Button onClick={saveFinancePolicy} disabled={isSaving}>{isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}Save finance settings</Button>
      </PermissionGate>
    </div>
  );
}
