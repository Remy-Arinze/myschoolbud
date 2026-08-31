'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { settingsText } from '@/components/settings/SettingsSection';
import { FadeInUp } from '@/components/ui/FadeInUp';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import {
  useGetLoisConfigQuery,
  useUpsertLoisConfigMutation,
  useDeleteLoisConfigMutation,
  type LoisConfigInput,
} from '@/lib/store/api/aiApi';
import { useGetMySchoolQuery } from '@/lib/store/api/schoolAdminApi';
import { Bot, Save, RotateCcw, Loader2, Info } from 'lucide-react';

const FIELD_LIMITS = {
  customGreeting: 300,
  toneNote: 500,
  restrictedTopics: 500,
  schoolContext: 1000,
};

interface LoisConfigTabProps {
  schoolId: string;
}

export function LoisConfigTab({ schoolId }: LoisConfigTabProps) {
  const { data: schoolResponse } = useGetMySchoolQuery();
  const schoolName = schoolResponse?.data?.name ?? 'your school';

  const { data, isLoading, refetch } = useGetLoisConfigQuery(schoolId);
  const [upsert, { isLoading: isSaving }] = useUpsertLoisConfigMutation();
  const [deleteConfig, { isLoading: isDeleting }] = useDeleteLoisConfigMutation();

  const [form, setForm] = useState<LoisConfigInput>({
    customGreeting: '',
    toneNote: '',
    restrictedTopics: '',
    schoolContext: '',
  });
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (data?.data) {
      setForm({
        customGreeting: data.data.customGreeting ?? '',
        toneNote: data.data.toneNote ?? '',
        restrictedTopics: data.data.restrictedTopics ?? '',
        schoolContext: data.data.schoolContext ?? '',
      });
    } else if (!isLoading) {
      setForm({ customGreeting: '', toneNote: '', restrictedTopics: '', schoolContext: '' });
    }
    setIsDirty(false);
  }, [data, isLoading]);

  const update = (key: keyof LoisConfigInput) => (value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setIsDirty(true);
  };

  const handleSave = async () => {
    const payload: LoisConfigInput = {
      customGreeting: form.customGreeting?.trim() || null,
      toneNote: form.toneNote?.trim() || null,
      restrictedTopics: form.restrictedTopics?.trim() || null,
      schoolContext: form.schoolContext?.trim() || null,
    };

    try {
      await upsert({ schoolId, body: payload }).unwrap();
      toast.success('Lois configuration saved.');
      setIsDirty(false);
      refetch();
    } catch (err: unknown) {
      const message =
        (err as { data?: { message?: string } })?.data?.message || 'Failed to save Lois config.';
      toast.error(message);
    }
  };

  const handleReset = async () => {
    try {
      await deleteConfig(schoolId).unwrap();
      toast.success('Lois configuration reset to platform defaults.');
      setIsDirty(false);
      refetch();
    } catch (err: unknown) {
      const message =
        (err as { data?: { message?: string } })?.data?.message || 'Failed to reset Lois config.';
      toast.error(message);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const hasConfig = !!data?.data;

  return (
    <div className="space-y-6">
      <FadeInUp from={{ opacity: 0, y: 12 }} to={{ opacity: 1, y: 0 }} duration={0.35}>
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Customize how Lois presents herself to users at {schoolName}. Structural rules, SQL
            schema hints, and role-based tool routing are platform-managed and cannot be changed
            here.
          </AlertDescription>
        </Alert>
      </FadeInUp>

      <FadeInUp from={{ opacity: 0, y: 12 }} to={{ opacity: 1, y: 0 }} duration={0.35} delay={0.05}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-[var(--agora-blue)]" />
              Lois AI personality
              {hasConfig && (
                <span className="font-normal px-2 py-0.5 rounded-full bg-green-500/10 text-[var(--agora-success)] border border-green-500/20" style={settingsText.tiny}>
                  Custom config active
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <Field
              label="Custom greeting"
              description="How Lois opens a new conversation."
              value={form.customGreeting ?? ''}
              onChange={update('customGreeting')}
              maxLength={FIELD_LIMITS.customGreeting}
              rows={2}
            />
            <Field
              label="Tone guidance"
              description="Personality and tone Lois should adopt for your school."
              value={form.toneNote ?? ''}
              onChange={update('toneNote')}
              maxLength={FIELD_LIMITS.toneNote}
              rows={4}
            />
            <Field
              label="Restricted topics"
              description="Topics Lois should refuse to discuss."
              value={form.restrictedTopics ?? ''}
              onChange={update('restrictedTopics')}
              maxLength={FIELD_LIMITS.restrictedTopics}
              rows={4}
            />
            <Field
              label="School context"
              description="Background information Lois should know about your school."
              value={form.schoolContext ?? ''}
              onChange={update('schoolContext')}
              maxLength={FIELD_LIMITS.schoolContext}
              rows={5}
            />

            <div className="flex flex-wrap gap-3 pt-2">
              <Button onClick={handleSave} disabled={isSaving || !isDirty} className="rounded-xl">
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving…
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save configuration
                  </>
                )}
              </Button>
              {hasConfig && (
                <Button
                  variant="ghost"
                  onClick={handleReset}
                  disabled={isDeleting}
                  className="rounded-xl"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Resetting…
                    </>
                  ) : (
                    <>
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Reset to defaults
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </FadeInUp>
    </div>
  );
}

function Field({
  label,
  description,
  value,
  onChange,
  maxLength,
  rows = 3,
}: {
  label: string;
  description: string;
  value: string;
  onChange: (value: string) => void;
  maxLength: number;
  rows?: number;
}) {
  return (
    <div>
      <label className="block font-medium text-light-text-primary dark:text-dark-text-primary mb-1" style={settingsText.body}>
        {label}
      </label>
      <p className="text-light-text-secondary dark:text-dark-text-secondary mb-2" style={settingsText.body}>
        {description}
      </p>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={maxLength}
        rows={rows}
        className="w-full px-3 py-2 border border-light-border dark:border-dark-border rounded-lg bg-light-card dark:bg-dark-surface text-light-text-primary dark:text-dark-text-primary placeholder:text-light-text-muted dark:placeholder:text-dark-text-muted focus:outline-none focus:ring-2 focus:ring-[var(--agora-blue)] resize-y"
        style={{ fontSize: 'var(--text-body)' }}
      />
      <p className="text-light-text-muted dark:text-dark-text-muted mt-1 text-right tabular-nums" style={settingsText.small}>
        {value.length}/{maxLength}
      </p>
    </div>
  );
}
