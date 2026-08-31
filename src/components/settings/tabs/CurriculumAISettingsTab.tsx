'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { SettingsSection, settingsText } from '@/components/settings/SettingsSection';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Checkbox } from '@/components/ui/Checkbox';
import { Textarea } from '@/components/ui/Textarea';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { LoisConfigTab } from '@/components/settings/LoisConfigTab';
import {
  useGetSchoolSettingsQuery,
  useUpdateSettingsSectionMutation,
  useCreateKnowledgeDocumentMutation,
  useDeleteKnowledgeDocumentMutation,
} from '@/lib/store/api/schoolSettingsApi';
import { PermissionGate } from '@/components/permissions/PermissionGate';
import { PermissionResource, PermissionType } from '@/hooks/usePermissions';
import { Loader2, Save, Plus, Trash2 } from 'lucide-react';

interface CurriculumAISettingsTabProps {
  schoolId: string;
}

export function CurriculumAISettingsTab({ schoolId }: CurriculumAISettingsTabProps) {
  const { data, isLoading, refetch } = useGetSchoolSettingsQuery();
  const [updateSection, { isLoading: isSaving }] = useUpdateSettingsSectionMutation();
  const [createKnowledge] = useCreateKnowledgeDocumentMutation();
  const [deleteKnowledge] = useDeleteKnowledgeDocumentMutation();

  const [policy, setPolicy] = useState<Record<string, unknown>>({});
  const [kbTitle, setKbTitle] = useState('');
  const [kbContent, setKbContent] = useState('');

  useEffect(() => {
    if (data?.data?.curriculumPolicy) setPolicy(data.data.curriculumPolicy as Record<string, unknown>);
  }, [data]);

  const save = async () => {
    try {
      await updateSection({ section: 'curriculum', body: policy }).unwrap();
      toast.success('Curriculum settings saved.');
      refetch();
    } catch {
      toast.error('Failed to save.');
    }
  };

  const addKnowledge = async () => {
    if (!kbTitle.trim() || !kbContent.trim()) return;
    try {
      await createKnowledge({ title: kbTitle, content: kbContent }).unwrap();
      setKbTitle('');
      setKbContent('');
      refetch();
      toast.success('Document added to knowledge base.');
    } catch {
      toast.error('Failed to add document.');
    }
  };

  if (isLoading) return <LoadingSpinner />;

  const knowledgeChunks = (data?.data as { knowledgeChunks?: Array<{ id: string; content: string; metadata?: { title?: string } }> })?.knowledgeChunks
    ?? [];

  return (
    <div className="space-y-8">
      <LoisConfigTab schoolId={schoolId} />

      <SettingsSection title="Curriculum Source">
        <select
          className="w-full rounded-lg border px-3 py-2 bg-transparent"
          value={String(policy.curriculumSource ?? 'MERGED')}
          onChange={(e) => setPolicy((p) => ({ ...p, curriculumSource: e.target.value }))}
        >
          <option value="AGORA_NATIONAL">Agora national curriculum</option>
          <option value="SCHOOL_UPLOAD">School-uploaded documents</option>
          <option value="MERGED">Merged (Agora + school)</option>
        </select>
      </SettingsSection>

      <SettingsSection title="Scheme of Work Approval">
        <label className="flex items-center gap-2 mb-2">
          <Checkbox checked={!!policy.schemeApprovalRequired} onCheckedChange={(v) => setPolicy((p) => ({ ...p, schemeApprovalRequired: !!v }))} />
          Require HOD/principal approval before teachers use AI-generated schemes
        </label>
      </SettingsSection>

      <SettingsSection title="AI Credit Limits">
        <div className="grid gap-4 sm:grid-cols-2">
          <div><Label>Per teacher (monthly)</Label><Input type="number" value={Number(policy.aiCreditLimitPerTeacher ?? '')} onChange={(e) => setPolicy((p) => ({ ...p, aiCreditLimitPerTeacher: e.target.value ? Number(e.target.value) : null }))} placeholder="Unlimited" /></div>
          <div><Label>Per department (monthly)</Label><Input type="number" value={Number(policy.aiCreditLimitPerDepartment ?? '')} onChange={(e) => setPolicy((p) => ({ ...p, aiCreditLimitPerDepartment: e.target.value ? Number(e.target.value) : null }))} placeholder="Unlimited" /></div>
        </div>
      </SettingsSection>

      <SettingsSection title="Knowledge Base" description="School handbook and policies for Lois to reference.">
        <div className="space-y-3 mb-4">
          <Input value={kbTitle} onChange={(e) => setKbTitle(e.target.value)} placeholder="Student handbook" />
          <Textarea value={kbContent} onChange={(e) => setKbContent(e.target.value)} placeholder="Paste policy text..." rows={4} />
          <Button variant="outline" onClick={addKnowledge}><Plus className="h-4 w-4 mr-2" />Add document</Button>
        </div>
        <ul className="space-y-1" style={settingsText.body}>
          {knowledgeChunks.map((k) => (
            <li key={k.id} className="flex justify-between border rounded px-3 py-2">
              <span>{(k.metadata as { title?: string })?.title ?? k.content.slice(0, 40)}...</span>
              <Button size="sm" variant="ghost" onClick={() => deleteKnowledge(k.id).unwrap().then(() => refetch())}><Trash2 className="h-4 w-4" /></Button>
            </li>
          ))}
        </ul>
      </SettingsSection>

      <PermissionGate resource={PermissionResource.SETTINGS} type={PermissionType.WRITE}>
        <Button onClick={save} disabled={isSaving}>{isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}Save curriculum settings</Button>
      </PermissionGate>
    </div>
  );
}
