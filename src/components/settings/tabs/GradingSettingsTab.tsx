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
  useCreateAssessmentTemplateMutation,
  useDeleteAssessmentTemplateMutation,
} from '@/lib/store/api/schoolSettingsApi';
import { PermissionGate } from '@/components/permissions/PermissionGate';
import { PermissionResource, PermissionType } from '@/hooks/usePermissions';
import { Loader2, Save, Plus, Trash2 } from 'lucide-react';
import type { GradingPolicy } from '@/lib/store/api/schoolSettingsApi';

export function GradingSettingsTab() {
  const { data, isLoading, refetch } = useGetSchoolSettingsQuery();
  const [updateSection, { isLoading: isSaving }] = useUpdateSettingsSectionMutation();
  const [createTemplate] = useCreateAssessmentTemplateMutation();
  const [deleteTemplate] = useDeleteAssessmentTemplateMutation();

  const [policy, setPolicy] = useState<Partial<GradingPolicy>>({});
  const [newTemplateName, setNewTemplateName] = useState('');

  useEffect(() => {
    if (data?.data?.gradingPolicy) setPolicy(data.data.gradingPolicy);
  }, [data]);

  const save = async () => {
    try {
      await updateSection({ section: 'grading', body: policy as Record<string, unknown> }).unwrap();
      toast.success('Grading policy saved.');
      refetch();
    } catch {
      toast.error('Failed to save grading policy.');
    }
  };

  const addTemplate = async () => {
    if (!newTemplateName.trim()) return;
    try {
      await createTemplate({ name: newTemplateName, gradeType: 'CA', maxScore: 100 }).unwrap();
      setNewTemplateName('');
      refetch();
      toast.success('Template added.');
    } catch {
      toast.error('Failed to add template.');
    }
  };

  if (isLoading) return <LoadingSpinner />;

  const templates = data?.data?.assessmentTemplates ?? [];
  const showTemplates = policy.templatesMode !== 'TEACHER_DISCRETION';

  return (
    <div className="space-y-8">
      <SettingsSection title="Grade Scale & Weights" description="School-wide defaults for grading.">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Grade scale</Label>
            <select
              className="w-full mt-1 rounded-lg border px-3 py-2 bg-transparent"
              value={policy.gradeScaleType ?? 'PERCENTAGE'}
              onChange={(e) => setPolicy((p) => ({ ...p, gradeScaleType: e.target.value as GradingPolicy['gradeScaleType'] }))}
            >
              <option value="PERCENTAGE">Percentage</option>
              <option value="A1_F9">A1–F9 (WAEC)</option>
              <option value="CUSTOM">Custom bands</option>
            </select>
          </div>
          <div>
            <Label>Pass mark (%)</Label>
            <Input type="number" value={policy.passMark ?? 40} onChange={(e) => setPolicy((p) => ({ ...p, passMark: Number(e.target.value) }))} />
          </div>
          <div>
            <Label>Default CA weight (%)</Label>
            <Input type="number" value={policy.defaultCaWeight ?? 40} onChange={(e) => setPolicy((p) => ({ ...p, defaultCaWeight: Number(e.target.value) }))} />
          </div>
          <div>
            <Label>Default exam weight (%)</Label>
            <Input type="number" value={policy.defaultExamWeight ?? 60} onChange={(e) => setPolicy((p) => ({ ...p, defaultExamWeight: Number(e.target.value) }))} />
          </div>
        </div>
      </SettingsSection>

      <SettingsSection title="Assessment Templates" description="Use school templates or leave to teacher discretion.">
        <div className="mb-4">
          <Label>Template mode</Label>
          <select
            className="w-full mt-1 rounded-lg border px-3 py-2 bg-transparent"
            value={policy.templatesMode ?? 'TEACHER_DISCRETION'}
            onChange={(e) => setPolicy((p) => ({ ...p, templatesMode: e.target.value as GradingPolicy['templatesMode'] }))}
          >
            <option value="TEACHER_DISCRETION">Teacher discretion</option>
            <option value="SCHOOL_TEMPLATES">School templates</option>
          </select>
        </div>
        {showTemplates && (
          <>
            <div className="flex gap-2 mb-3">
              <Input value={newTemplateName} onChange={(e) => setNewTemplateName(e.target.value)} placeholder="First CA" />
              <Button variant="outline" onClick={addTemplate}><Plus className="h-4 w-4" /></Button>
            </div>
            <ul className="space-y-1" style={settingsText.body}>
              {templates.map((t) => (
                <li key={t.id} className="flex justify-between border rounded px-3 py-2">
                  <span>{t.name} ({t.gradeType}, max {t.maxScore})</span>
                  <Button size="sm" variant="ghost" onClick={() => deleteTemplate(t.id).unwrap().then(() => refetch())}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          </>
        )}
      </SettingsSection>

      <SettingsSection title="Late Submission & Integrity Defaults">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex items-center gap-2"><Checkbox checked={!!policy.defaultAllowLateSubmissionAfterDue} onCheckedChange={(v) => setPolicy((p) => ({ ...p, defaultAllowLateSubmissionAfterDue: !!v }))} /> Allow late after due date</label>
          <label className="flex items-center gap-2"><Checkbox checked={!!policy.defaultIntegrityEnabled} onCheckedChange={(v) => setPolicy((p) => ({ ...p, defaultIntegrityEnabled: !!v }))} /> Enable anti-cheat by default</label>
          <div><Label>Late penalty (points)</Label><Input type="number" value={policy.defaultLateDuePenalty ?? 0} onChange={(e) => setPolicy((p) => ({ ...p, defaultLateDuePenalty: Number(e.target.value) }))} /></div>
          <div><Label>Violation threshold</Label><Input type="number" value={policy.defaultViolationThreshold ?? 1} onChange={(e) => setPolicy((p) => ({ ...p, defaultViolationThreshold: Number(e.target.value) }))} /></div>
        </div>
      </SettingsSection>

      <SettingsSection title="Grade Lock & Report Cards">
        <div className="grid gap-4 sm:grid-cols-2">
          <div><Label>Lock grades (days after term end)</Label><Input type="number" value={policy.gradeLockDaysAfterTermEnd ?? 7} onChange={(e) => setPolicy((p) => ({ ...p, gradeLockDaysAfterTermEnd: Number(e.target.value) }))} /></div>
          <div>
            <Label>Report card release</Label>
            <select className="w-full mt-1 rounded-lg border px-3 py-2 bg-transparent" value={policy.reportCardReleaseMode ?? 'MANUAL'} onChange={(e) => setPolicy((p) => ({ ...p, reportCardReleaseMode: e.target.value as GradingPolicy['reportCardReleaseMode'] }))}>
              <option value="MANUAL">Manual publish</option>
              <option value="AUTO_AFTER_LOCK">Auto after lock period</option>
              <option value="AUTO_ON_TERM_END">Auto on term end</option>
            </select>
          </div>
          <label className="flex items-center gap-2"><Checkbox checked={!!policy.gradeApprovalRequired} onCheckedChange={(v) => setPolicy((p) => ({ ...p, gradeApprovalRequired: !!v }))} /> Require approval before publish</label>
          <div><Label>Min attendance for exams (%)</Label><Input type="number" value={policy.minAttendancePercentForExam ?? 75} onChange={(e) => setPolicy((p) => ({ ...p, minAttendancePercentForExam: Number(e.target.value) }))} /></div>
        </div>
      </SettingsSection>

      <PermissionGate resource={PermissionResource.SETTINGS} type={PermissionType.WRITE}>
        <Button onClick={save} disabled={isSaving}>{isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}Save grading settings</Button>
      </PermissionGate>
    </div>
  );
}
