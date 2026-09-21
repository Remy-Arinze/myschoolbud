'use client';

import { Mail, Pencil, UserCog } from 'lucide-react';
import { AccessPreview } from '@/components/permissions';
import type { AdminPermissionInput, RoleTemplate } from '@/lib/store/api/schoolsApi';

interface AdminReviewStepProps {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  roleTitle: string;
  /** The role the access came from, when it still matches it. */
  template: RoleTemplate | null;
  templateCustomised: boolean;
  permissions: AdminPermissionInput[];
  /** Set when this is an existing teacher being given an admin account too. */
  convertingTeacherName?: string | null;
  keepAsTeacher?: boolean;
  onEditStep: (step: number) => void;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2 py-1.5">
      <dt className="text-xs text-light-text-secondary dark:text-dark-text-secondary">
        {label}
      </dt>
      <dd className="text-sm text-light-text-primary dark:text-dark-text-primary">
        {value}
      </dd>
    </div>
  );
}

/**
 * The last look before an invite goes out.
 *
 * Creating an administrator emails someone a way into real student records, so
 * the form says what is about to happen rather than ending on a button labelled
 * "Continue".
 */
export function AdminReviewStep({
  firstName,
  lastName,
  email,
  phone,
  roleTitle,
  template,
  templateCustomised,
  permissions,
  convertingTeacherName,
  keepAsTeacher,
  onEditStep,
}: AdminReviewStepProps) {
  const fullName = `${firstName} ${lastName}`.trim();

  const accessSummary = template
    ? templateCustomised
      ? `${template.name}, customised`
      : template.name
    : 'Hand-picked access';

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
      <div className="space-y-4">
        {convertingTeacherName && (
          <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-900/20">
            <UserCog className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-600 dark:text-blue-400" />
            <p className="text-xs text-blue-800 dark:text-blue-300">
              {convertingTeacherName} already works here as a teacher, so this adds
              an administrator account to their existing login rather than creating
              a second one.{' '}
              {keepAsTeacher
                ? 'They will stay a teacher as well.'
                : 'Their teacher record will be removed.'}
            </p>
          </div>
        )}

        <section className="rounded-lg border border-light-border p-4 dark:border-dark-border">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-light-text-primary dark:text-dark-text-primary">
              Who
            </h3>
            <button
              type="button"
              onClick={() => onEditStep(1)}
              className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline dark:text-blue-400"
            >
              <Pencil className="h-3 w-3" />
              Edit
            </button>
          </div>
          <dl className="divide-y divide-light-border dark:divide-dark-border">
            <Row label="Name" value={fullName} />
            <Row label="Email" value={email} />
            <Row label="Phone" value={phone} />
          </dl>
        </section>

        <section className="rounded-lg border border-light-border p-4 dark:border-dark-border">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-light-text-primary dark:text-dark-text-primary">
              Access
            </h3>
            <button
              type="button"
              onClick={() => onEditStep(2)}
              className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline dark:text-blue-400"
            >
              <Pencil className="h-3 w-3" />
              Edit
            </button>
          </div>
          <dl className="divide-y divide-light-border dark:divide-dark-border">
            <Row label="Job title" value={roleTitle} />
            <Row label="Based on" value={accessSummary} />
            <Row
              label="Authority"
              value="Staff level — limited to the access below"
            />
          </dl>
        </section>

        <div className="flex items-start gap-2 rounded-lg bg-gray-50 p-3 dark:bg-gray-800/40">
          <Mail className="mt-0.5 h-4 w-4 flex-shrink-0 text-light-text-secondary dark:text-dark-text-secondary" />
          <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary">
            {firstName || 'They'} will get an email at <strong>{email}</strong> with a
            link to set a password. Nothing is visible to them until they do.
          </p>
        </div>
      </div>

      <div className="lg:sticky lg:top-6 lg:self-start">
        <AccessPreview permissions={permissions} personName={firstName || undefined} />
      </div>
    </div>
  );
}
