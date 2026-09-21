'use client';

import { useMemo, useState } from 'react';
import { ChevronDown, Info, Lightbulb, Plus } from 'lucide-react';
import { SearchInput } from '@/components/ui/SearchInput';
import { PermissionResource, PermissionType } from '@/lib/store/api/schoolAdminApi';
import { AdminPermissionInput } from '@/lib/store/api/schoolsApi';
import {
  ALL_PERMISSION_RESOURCES,
  ALL_PERMISSION_TYPES,
  BASELINE_RESOURCE,
  PERMISSION_DOMAINS,
  PERMISSION_RESOURCE_INFO,
  PERMISSION_TYPE_INFO,
  missingCompanions,
  permissionConsequence,
  resourceLabel,
  typeLabel,
} from '@/lib/constants/permission-metadata';

interface PermissionSelectorProps {
  value: AdminPermissionInput[];
  onChange: (permissions: AdminPermissionInput[]) => void;
  disabled?: boolean;
}

// Labels, descriptions, icons and level colours all come from one place now —
// see lib/constants/permission-metadata.
const RESOURCE_INFO = PERMISSION_RESOURCE_INFO;
const TYPE_INFO = PERMISSION_TYPE_INFO;
const ALL_RESOURCES = ALL_PERMISSION_RESOURCES;
const ALL_TYPES = ALL_PERMISSION_TYPES;

/** What granting this row will actually do, in four words on a chip. */
const VISIBILITY_CHIP: Record<string, { label: string; className: string }> = {
  screen: {
    label: 'Adds a screen',
    className:
      'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800',
  },
  inline: {
    label: 'Inside other screens',
    className:
      'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-700',
  },
  principal: {
    label: 'Principal only',
    className:
      'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800',
  },
};

/**
 * Choosing what an administrator can reach.
 *
 * Grouped by what a school is actually deciding about — people, teaching, the
 * school day, administration — because eighteen equal-looking rows is where
 * people stop reading and grant everything instead. Nothing is granted until
 * it is ticked.
 */
export function PermissionSelector({
  value,
  onChange,
  disabled = false,
}: PermissionSelectorProps) {
  const [query, setQuery] = useState('');
  const [collapsedDomains, setCollapsedDomains] = useState<Set<string>>(new Set());
  const [dismissedHints, setDismissedHints] = useState(false);

  // Build a Set for quick lookup of selected permissions
  const selectedPermissions = useMemo(() => {
    const set = new Set<string>();
    if (Array.isArray(value)) {
      value.forEach((p) => {
        if (p && p.resource && p.type) {
          set.add(`${p.resource}:${p.type}`);
        }
      });
    }
    return set;
  }, [value]);

  // Check if a permission is selected
  const hasPermission = (resource: PermissionResource, type: PermissionType): boolean => {
    return selectedPermissions.has(`${resource}:${type}`);
  };

  // Toggle a permission with auto-selection of dependent permissions
  // - ADMIN requires WRITE and READ
  // - WRITE requires READ
  const togglePermission = (resource: PermissionResource, type: PermissionType) => {
    if (disabled) return;

    try {
      const key = `${resource}:${type}`;
      const currentValue = Array.isArray(value) ? value : [];
      let newPermissions = [...currentValue];

      if (selectedPermissions.has(key)) {
        // Remove the permission and any higher-level permissions that depend on it
        if (type === PermissionType.READ) {
          // Removing READ also removes WRITE and ADMIN (they require READ)
          newPermissions = newPermissions.filter((p) =>
            !(p.resource === resource && (p.type === PermissionType.READ || p.type === PermissionType.WRITE || p.type === PermissionType.ADMIN)) &&
            !(resource === PermissionResource.CURRICULUM && p.resource === PermissionResource.SCHEME_OF_WORK && (p.type === PermissionType.READ || p.type === PermissionType.WRITE || p.type === PermissionType.ADMIN))
          );
        } else if (type === PermissionType.WRITE) {
          // Removing WRITE also removes ADMIN (it requires WRITE)
          newPermissions = newPermissions.filter((p) =>
            !(p.resource === resource && (p.type === PermissionType.WRITE || p.type === PermissionType.ADMIN)) &&
            !(resource === PermissionResource.CURRICULUM && p.resource === PermissionResource.SCHEME_OF_WORK && (p.type === PermissionType.WRITE || p.type === PermissionType.ADMIN))
          );
        } else {
          // Removing ADMIN only removes ADMIN
          newPermissions = newPermissions.filter((p) =>
            !(p.resource === resource && p.type === type) &&
            !(resource === PermissionResource.CURRICULUM && p.resource === PermissionResource.SCHEME_OF_WORK && p.type === type)
          );
        }
        onChange(newPermissions);
      } else {
        // Add the permission and any lower-level permissions it requires
        const permissionsToAdd: PermissionType[] = [type];

        if (type === PermissionType.ADMIN) {
          // ADMIN requires WRITE and READ
          if (!hasPermission(resource, PermissionType.WRITE)) {
            permissionsToAdd.push(PermissionType.WRITE);
          }
          if (!hasPermission(resource, PermissionType.READ)) {
            permissionsToAdd.push(PermissionType.READ);
          }
        } else if (type === PermissionType.WRITE) {
          // WRITE requires READ
          if (!hasPermission(resource, PermissionType.READ)) {
            permissionsToAdd.push(PermissionType.READ);
          }
        }

        permissionsToAdd.forEach((t) => {
          if (!hasPermission(resource, t)) {
            newPermissions.push({ resource: resource as string, type: t as string });
          }
          if (resource === PermissionResource.CURRICULUM && !hasPermission(PermissionResource.SCHEME_OF_WORK, t)) {
            newPermissions.push({ resource: PermissionResource.SCHEME_OF_WORK as string, type: t as string });
          }
        });
        onChange(newPermissions);
      }
    } catch (error) {
      console.error('Error toggling permission:', error);
    }
  };

  /** Add a list of grants at once, for the companion-access suggestions. */
  const addPermissions = (pairs: Array<{ resource: string; type: string }>) => {
    if (disabled) return;
    const current = Array.isArray(value) ? value : [];
    const existing = new Set(current.map((p) => `${p.resource}:${p.type}`));
    const additions = pairs.filter((p) => !existing.has(`${p.resource}:${p.type}`));
    if (additions.length === 0) return;
    onChange([...current, ...additions]);
  };

  /** Every resource in a group to view level, or none of them. */
  const toggleDomain = (resources: PermissionResource[]) => {
    if (disabled) return;
    const current = Array.isArray(value) ? value : [];
    const allSelected = resources.every((r) => hasPermission(r, PermissionType.READ));

    if (allSelected) {
      // Scheme of work is granted with curriculum, so it has to be cleared with
      // it too, or it is left behind with nothing to hang off.
      const clearing = new Set<string>(resources as string[]);
      if (clearing.has(PermissionResource.CURRICULUM)) {
        clearing.add(PermissionResource.SCHEME_OF_WORK);
      }
      onChange(current.filter((p) => !clearing.has(p.resource)));
      return;
    }

    const next = [...current];
    resources.forEach((resource) => {
      if (!hasPermission(resource, PermissionType.READ)) {
        next.push({ resource: resource as string, type: PermissionType.READ as string });
      }
      // Same coupling the single-row toggle keeps: lesson planning is not a
      // grant a school can reason about without the curriculum it hangs off.
      if (
        resource === PermissionResource.CURRICULUM &&
        !hasPermission(PermissionResource.SCHEME_OF_WORK, PermissionType.READ)
      ) {
        next.push({
          resource: PermissionResource.SCHEME_OF_WORK as string,
          type: PermissionType.READ as string,
        });
      }
    });
    onChange(next);
  };

  const toggleDomainCollapsed = (key: string) => {
    setCollapsedDomains((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const needle = query.trim().toLowerCase();
  const matchesQuery = (resource: PermissionResource): boolean => {
    if (!needle) return true;
    const info = RESOURCE_INFO[resource];
    if (!info) return false;
    return (
      info.label.toLowerCase().includes(needle) ||
      info.description.toLowerCase().includes(needle)
    );
  };

  const companions = useMemo(
    () => (dismissedHints ? [] : missingCompanions(value || [])),
    [value, dismissedHints]
  );

  const grantedCount = useMemo(
    () => ALL_RESOURCES.filter((r) => hasPermission(r, PermissionType.READ)).length,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedPermissions]
  );

  const renderRow = (resource: PermissionResource) => {
    const info = RESOURCE_INFO[resource];
    if (!info) {
      console.warn(`Missing RESOURCE_INFO for resource: ${resource}`);
      return null;
    }
    const chip = VISIBILITY_CHIP[info.visibility];
    const selectedLevels = ALL_TYPES.filter((type) => hasPermission(resource, type));
    const highest = selectedLevels[selectedLevels.length - 1];
    const consequence = highest ? permissionConsequence(resource, highest) : undefined;
    const isOn = selectedLevels.length > 0;

    return (
      <div
        key={resource}
        className={`rounded-lg border p-3 transition-colors ${
          isOn
            ? 'border-blue-200 dark:border-blue-800 bg-blue-50/40 dark:bg-blue-900/10'
            : 'border-light-border dark:border-dark-border'
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span aria-hidden>{info.icon}</span>
              <span className="text-sm font-medium text-light-text-primary dark:text-dark-text-primary">
                {info.label}
              </span>
              {chip && (
                <span
                  className={`rounded-full border px-2 py-0.5 text-[11px] leading-none ${chip.className}`}
                >
                  {chip.label}
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-light-text-secondary dark:text-dark-text-secondary">
              {info.description}
            </p>
          </div>

          <div className="flex flex-shrink-0 items-center gap-1">
            {ALL_TYPES.map((type) => {
              const typeInfo = TYPE_INFO[type];
              if (!typeInfo) return null;
              const TypeIcon = typeInfo.icon;
              const selected = hasPermission(resource, type);
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => togglePermission(resource, type)}
                  disabled={disabled}
                  aria-pressed={selected}
                  title={`${typeInfo.label} — ${typeInfo.description}`}
                  className={`flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-xs font-medium transition-all disabled:opacity-50 ${
                    selected
                      ? `${typeInfo.border} ${typeInfo.bg} ${typeInfo.text}`
                      : 'border-gray-200 text-gray-500 hover:border-gray-300 dark:border-gray-700 dark:text-gray-400 dark:hover:border-gray-600'
                  }`}
                >
                  <TypeIcon className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{typeInfo.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {(consequence || (isOn && info.note)) && (
          <p className="mt-2 border-t border-light-border pt-2 text-xs text-amber-700 dark:border-dark-border dark:text-amber-400">
            {consequence || info.note}
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-light-text-primary dark:text-dark-text-primary">
            What they can reach
          </h3>
          <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary">
            Nothing is granted until you tick it.
          </p>
        </div>
        <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs text-light-text-secondary dark:bg-gray-800 dark:text-dark-text-secondary">
          {grantedCount} of {ALL_RESOURCES.length} areas
        </span>
      </div>

      {/* Level legend */}
      <div className="flex flex-wrap items-center gap-4 rounded-lg border border-light-border bg-gray-50 p-3 text-xs dark:border-dark-border dark:bg-gray-800/40">
        {ALL_TYPES.map((type) => {
          const info = TYPE_INFO[type];
          const Icon = info.icon;
          return (
            <div key={type} className="flex items-center gap-1.5">
              <Icon className={`h-3.5 w-3.5 ${info.text}`} />
              <span className="text-light-text-secondary dark:text-dark-text-secondary">
                <strong className={info.text}>{info.label}</strong> = {info.description}
              </span>
            </div>
          );
        })}
      </div>

      <SearchInput
        value={query}
        onChange={setQuery}
        placeholder="Search access areas..."
        size="sm"
      />

      {/* The home screen, granted by every built-in role. Pinned so it does not
          read as one of eighteen equal choices. */}
      {matchesQuery(BASELINE_RESOURCE) && renderRow(BASELINE_RESOURCE)}

      {PERMISSION_DOMAINS.map((domain) => {
        const visible = domain.resources.filter(matchesQuery);
        if (visible.length === 0) return null;

        const selectedInDomain = domain.resources.filter((r) =>
          hasPermission(r, PermissionType.READ)
        ).length;
        // Searching should reveal what it matched, not hide it behind a chevron.
        const isCollapsed = !needle && collapsedDomains.has(domain.key);

        return (
          <div
            key={domain.key}
            className="overflow-hidden rounded-lg border border-light-border dark:border-dark-border"
          >
            <div className="flex items-center justify-between gap-3 bg-gray-50 px-3 py-2.5 dark:bg-gray-800/40">
              <button
                type="button"
                onClick={() => toggleDomainCollapsed(domain.key)}
                className="flex min-w-0 flex-1 items-center gap-2 text-left"
              >
                <ChevronDown
                  className={`h-4 w-4 flex-shrink-0 text-gray-400 transition-transform ${
                    isCollapsed ? '-rotate-90' : ''
                  }`}
                />
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-light-text-primary dark:text-dark-text-primary">
                    {domain.label}
                    {selectedInDomain > 0 && (
                      <span className="ml-2 text-xs font-normal text-blue-600 dark:text-blue-400">
                        {selectedInDomain} of {domain.resources.length}
                      </span>
                    )}
                  </span>
                  <span className="block truncate text-xs text-light-text-secondary dark:text-dark-text-secondary">
                    {domain.description}
                  </span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => toggleDomain(domain.resources)}
                disabled={disabled}
                className="flex-shrink-0 text-xs text-blue-600 hover:underline disabled:opacity-50 dark:text-blue-400"
              >
                {selectedInDomain === domain.resources.length ? 'Clear all' : 'View all'}
              </button>
            </div>

            {!isCollapsed && <div className="space-y-2 p-2">{visible.map(renderRow)}</div>}
          </div>
        );
      })}

      {companions.length > 0 && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-900/20">
          <div className="flex items-start gap-2">
            <Lightbulb className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-600 dark:text-blue-400" />
            <div className="min-w-0 flex-1">
              <p className="text-xs text-blue-800 dark:text-blue-300">
                What you have picked usually needs{' '}
                {companions
                  .map((p) => `${resourceLabel(p.resource)} (${typeLabel(p.type).toLowerCase()})`)
                  .join(', ')}{' '}
                to be useful.
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => addPermissions(companions)}
                  disabled={disabled}
                  className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  <Plus className="h-3 w-3" />
                  Add {companions.length === 1 ? 'it' : 'them'}
                </button>
                <button
                  type="button"
                  onClick={() => setDismissedHints(true)}
                  className="text-xs text-blue-700 hover:underline dark:text-blue-400"
                >
                  No thanks
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 border-t border-light-border pt-3 text-xs text-light-text-secondary dark:border-dark-border dark:text-dark-text-secondary">
        <Info className="h-3.5 w-3.5 flex-shrink-0" />
        <span>
          {value.length} permission{value.length !== 1 ? 's' : ''} selected
          {value.length === 0 && ' — this administrator will have no dashboard access'}
        </span>
      </div>
    </div>
  );
}

/**
 * Every screen at view level.
 *
 * This is the shape of the old create-form default, kept only as a shortcut. It
 * is no longer what a new administrator starts with — that would hand a new
 * bursar the grades and staff screens on day one because nobody thought to
 * untick them.
 */
export function allReadPermissions(): AdminPermissionInput[] {
  return ALL_RESOURCES.map((resource) => ({
    resource: resource as string,
    type: PermissionType.READ as string,
  }));
}

export { ALL_RESOURCES, ALL_TYPES, RESOURCE_INFO, TYPE_INFO };
