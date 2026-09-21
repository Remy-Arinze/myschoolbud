'use client';

import { useMemo } from 'react';
import { Check, PencilRuler, RotateCcw, Users } from 'lucide-react';
import type { RoleTemplate } from '@/lib/store/api/schoolsApi';
import { PermissionResource, PermissionType } from '@/lib/store/api/schoolAdminApi';
import { PERMISSION_RESOURCE_INFO } from '@/lib/constants/permission-metadata';

interface RoleTemplateCardsProps {
  templates: RoleTemplate[];
  /** The role currently applied, if any. */
  selectedId: string | null;
  /** Whether the ticks have since been edited away from that role. */
  customised?: boolean;
  onSelect: (template: RoleTemplate) => void;
  /** Chosen "Start from scratch": no role, empty access, grid open. */
  onStartFromScratch: () => void;
  /** Put the role's own access back after a hand-edit. */
  onReapply?: () => void;
  disabled?: boolean;
}

/** Screens this role puts in a sidebar — not the raw permission-row count. */
function screenCount(template: RoleTemplate): number {
  const seen = new Set<string>();
  template.permissions.forEach((p) => {
    const info = PERMISSION_RESOURCE_INFO[p.resource as PermissionResource];
    if (info?.visibility === 'screen') seen.add(p.resource);
  });
  return seen.size;
}

/** Whether a role lets its holder change anything, or only look. */
function isViewOnly(template: RoleTemplate): boolean {
  return template.permissions.every((p) => p.type === PermissionType.READ);
}

/**
 * Picking the access by naming the job.
 *
 * Roles used to be autocomplete entries inside the job-title box, so a school
 * that did not already know the word "Bursar" never found out the bundles
 * existed and faced an empty grid instead. Showing them makes the curated
 * answer the obvious one, and hand-building the exception.
 */
export function RoleTemplateCards({
  templates,
  selectedId,
  customised = false,
  onSelect,
  onStartFromScratch,
  onReapply,
  disabled = false,
}: RoleTemplateCardsProps) {
  // A school that has settled into its own conventions should see them first.
  const ordered = useMemo(
    () =>
      [...templates].sort((a, b) => {
        if (b.holderCount !== a.holderCount) return b.holderCount - a.holderCount;
        if (a.isBuiltIn !== b.isBuiltIn) return a.isBuiltIn ? -1 : 1;
        return a.name.localeCompare(b.name);
      }),
    [templates]
  );

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-light-text-primary dark:text-dark-text-primary">
          Start from a role <span className="text-red-500">*</span>
        </label>
        <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary">
          Each one fills in the access below. You can adjust it afterwards.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {ordered.map((template) => {
          const isSelected = template.id === selectedId;
          const screens = screenCount(template);

          return (
            <button
              key={template.id}
              type="button"
              onClick={() => onSelect(template)}
              disabled={disabled}
              aria-pressed={isSelected}
              className={`rounded-lg border p-3 text-left transition-all disabled:opacity-50 ${
                isSelected
                  ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500 dark:bg-blue-900/20'
                  : 'border-light-border hover:border-blue-300 dark:border-dark-border dark:hover:border-blue-700'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-sm font-semibold text-light-text-primary dark:text-dark-text-primary">
                  {template.name}
                </span>
                {isSelected && (
                  <Check className="h-4 w-4 flex-shrink-0 text-blue-600 dark:text-blue-400" />
                )}
              </div>

              {template.description && (
                <p className="mt-1 text-xs text-light-text-secondary dark:text-dark-text-secondary">
                  {template.description}
                </p>
              )}

              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-light-text-muted dark:text-dark-text-muted">
                <span>
                  {screens} screen{screens !== 1 ? 's' : ''}
                  {isViewOnly(template) ? ' · view only' : ''}
                </span>
                {template.holderCount > 0 && (
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {template.holderCount} here
                  </span>
                )}
                {!template.isBuiltIn && (
                  <span className="rounded-full bg-gray-100 px-1.5 py-0.5 dark:bg-gray-800">
                    Yours
                  </span>
                )}
              </div>
            </button>
          );
        })}

        <button
          type="button"
          onClick={onStartFromScratch}
          disabled={disabled}
          aria-pressed={selectedId === null}
          className={`flex items-start gap-2 rounded-lg border border-dashed p-3 text-left transition-all disabled:opacity-50 ${
            selectedId === null
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
              : 'border-light-border hover:border-blue-300 dark:border-dark-border dark:hover:border-blue-700'
          }`}
        >
          <PencilRuler className="mt-0.5 h-4 w-4 flex-shrink-0 text-light-text-secondary dark:text-dark-text-secondary" />
          <span>
            <span className="block text-sm font-semibold text-light-text-primary dark:text-dark-text-primary">
              Start from scratch
            </span>
            <span className="block text-xs text-light-text-secondary dark:text-dark-text-secondary">
              Tick the access yourself.
            </span>
          </span>
        </button>
      </div>

      {selectedId && customised && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-900/20">
          <p className="text-xs text-amber-800 dark:text-amber-300">
            You have changed the access from this role, so it will be saved as their
            own set rather than as the role.
          </p>
          {onReapply && (
            <button
              type="button"
              onClick={onReapply}
              disabled={disabled}
              className="inline-flex items-center gap-1 text-xs font-medium text-amber-900 hover:underline disabled:opacity-50 dark:text-amber-200"
            >
              <RotateCcw className="h-3 w-3" />
              Undo my changes
            </button>
          )}
        </div>
      )}
    </div>
  );
}
