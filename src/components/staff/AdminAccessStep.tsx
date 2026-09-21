'use client';

import { useMemo } from 'react';
import { Lightbulb } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import {
  AccessPreview,
  CopyAccessFromAdmin,
  PermissionSelector,
  RoleTemplateCards,
  type CopyAccessCandidate,
} from '@/components/permissions';
import type { AdminPermissionInput, RoleTemplate } from '@/lib/store/api/schoolsApi';
import {
  isSchoolOwnerRole,
  looksLikePrincipalTitle,
  normalizeRoleKey,
} from '@/lib/constants/roles';

interface AdminAccessStepProps {
  schoolId: string;
  templates: RoleTemplate[];
  admins: CopyAccessCandidate[];
  currentAdminId?: string;
  /** Job title of the person doing the granting, for the principal nudge. */
  currentAdminRole?: string;
  /** Whose dashboard is being built, for the preview heading. */
  personName?: string;

  roleTitle: string;
  onRoleTitleChange: (title: string) => void;
  roleTitleError?: string;

  templateId: string | null;
  templateCustomised: boolean;
  onApplyTemplate: (template: RoleTemplate) => void;
  onStartFromScratch: () => void;
  onReapplyTemplate: () => void;

  permissions: AdminPermissionInput[];
  onPermissionsChange: (permissions: AdminPermissionInput[]) => void;
  onCopyFromAdmin: (permissions: AdminPermissionInput[], sourceName: string) => void;

  disabled?: boolean;
}

/**
 * Deciding what an administrator can reach.
 *
 * Roles first, because "what does a Bursar here see?" is a question the school
 * has already answered; the grid is for the exceptions. The title is a separate
 * field from the role on purpose — it is a label, and editing it must not
 * quietly detach the access it came from.
 */
export function AdminAccessStep({
  schoolId,
  templates,
  admins,
  currentAdminId,
  currentAdminRole,
  personName,
  roleTitle,
  onRoleTitleChange,
  roleTitleError,
  templateId,
  templateCustomised,
  onApplyTemplate,
  onStartFromScratch,
  onReapplyTemplate,
  permissions,
  onPermissionsChange,
  onCopyFromAdmin,
  disabled = false,
}: AdminAccessStepProps) {
  // A title typed without picking a role: the school clearly means something by
  // it, and we usually have the bundle they are describing.
  const titleSuggestion = useMemo(() => {
    if (templateId || permissions.length > 0) return null;
    const needle = normalizeRoleKey(roleTitle);
    if (needle.length < 3) return null;
    return (
      templates.find((t) => {
        const candidates = [t.suggestedRole, t.name].filter(Boolean) as string[];
        return candidates.some((candidate) => {
          const key = normalizeRoleKey(candidate);
          return key === needle || key.includes(needle) || needle.includes(key);
        });
      }) || null
    );
  }, [templates, roleTitle, templateId, permissions.length]);

  // A principal-sounding title used to grant total access by accident of string
  // matching. It now grants nothing, so say what to do instead.
  const showPrincipalNudge = looksLikePrincipalTitle(roleTitle);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
      <div className="space-y-5">
        <RoleTemplateCards
          templates={templates}
          selectedId={templateId}
          customised={templateCustomised}
          onSelect={onApplyTemplate}
          onStartFromScratch={onStartFromScratch}
          onReapply={onReapplyTemplate}
          disabled={disabled}
        />

        <CopyAccessFromAdmin
          schoolId={schoolId}
          admins={admins}
          excludeAdminId={currentAdminId}
          onApply={onCopyFromAdmin}
          disabled={disabled}
        />

        <div className="space-y-2 border-t border-light-border pt-5 dark:border-dark-border">
          <Input
            label="Job title *"
            name="roleTitle"
            value={roleTitle}
            onChange={(e) => onRoleTitleChange(e.target.value)}
            placeholder="e.g. Bursar, Head of Academics"
            error={roleTitleError}
            disabled={disabled}
            helperText="What this person is called here. It is a label — it does not grant anything."
          />

          {titleSuggestion && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-900/20">
              <p className="flex items-center gap-2 text-xs text-blue-800 dark:text-blue-300">
                <Lightbulb className="h-4 w-4 flex-shrink-0" />
                That sounds like the {titleSuggestion.name} role.
              </p>
              <button
                type="button"
                onClick={() => onApplyTemplate(titleSuggestion)}
                disabled={disabled}
                className="rounded-md bg-blue-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                Use its access
              </button>
            </div>
          )}

          {showPrincipalNudge && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-900/20">
              <p className="text-xs text-amber-800 dark:text-amber-300">
                <strong>That title does not grant principal-level access.</strong> Job
                titles are labels here. To give someone authority over everything —
                billing, staff and permissions included — add them first, then use{' '}
                <em>Change access level</em> on their row in the staff list.
                {!isSchoolOwnerRole(currentAdminRole) &&
                  ' Only the school owner can do that.'}
              </p>
            </div>
          )}
        </div>

        <div className="border-t border-light-border pt-5 dark:border-dark-border">
          <PermissionSelector
            value={permissions}
            onChange={onPermissionsChange}
            disabled={disabled}
          />
        </div>
      </div>

      <div className="lg:sticky lg:top-6 lg:self-start">
        <AccessPreview permissions={permissions} personName={personName} />
      </div>
    </div>
  );
}
