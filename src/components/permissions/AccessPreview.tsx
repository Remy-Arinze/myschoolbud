'use client';

import { useMemo } from 'react';
import { AlertTriangle, Crown, Layout, MinusCircle } from 'lucide-react';
import { useSidebarConfig } from '@/hooks/useSidebarConfig';
import { PermissionResource, PermissionType } from '@/lib/store/api/schoolAdminApi';
import {
  PERMISSION_RESOURCE_INFO,
  PERMISSION_TYPE_INFO,
  grants,
  inertGrants,
  inlineGrants,
  resourceLabel,
} from '@/lib/constants/permission-metadata';

/** A resource/level pair, however the caller happens to hold it. */
export interface AccessPair {
  resource: string;
  type: string;
}

interface AccessPreviewProps {
  /** The access being granted. Ignored when isPrincipal is true. */
  permissions: AccessPair[];
  /** Principal-level access sees everything, permission rows or not. */
  isPrincipal?: boolean;
  /** Whose dashboard this is, for the heading. */
  personName?: string;
  className?: string;
}

/**
 * The dashboard the granter is actually building.
 *
 * Ticking eighteen rows of resource/level checkboxes tells you nothing about
 * what the other person will log in to. This renders the same nav that
 * `usePermissionFilteredSidebar` will produce, using the same rule — view
 * access on the item's resource — so the two cannot drift.
 */
export function AccessPreview({
  permissions,
  isPrincipal = false,
  personName,
  className = '',
}: AccessPreviewProps) {
  const { sections } = useSidebarConfig();

  const granted = useMemo(() => {
    const set = new Set<string>();
    permissions.forEach((p) => {
      if (p?.resource && p?.type) set.add(`${p.resource}:${p.type}`);
    });
    return set;
  }, [permissions]);

  const canView = (resource?: PermissionResource) => {
    if (!resource) return true;
    if (isPrincipal) return true;
    return grants(granted, resource, PermissionType.READ);
  };

  const navItems = useMemo(
    () =>
      sections.flatMap((section) =>
        section.items.filter(
          (item) =>
            // Subscription and friends are principal-only regardless of rows,
            // so showing them to a staff-tier grant would be a lie.
            (!item.principalOnly || isPrincipal) && canView(item.permission)
        )
      ),
    [sections, granted, isPrincipal]
  );

  // Over half the picker never reaches the sidebar. Listing only nav items made
  // those grants look like they had done nothing, so they get named too.
  const inline = useMemo(
    () => (isPrincipal ? [] : inlineGrants(permissions)),
    [permissions, isPrincipal]
  );

  // Grants that genuinely change nothing for a staff-level administrator.
  const inert = useMemo(
    () => (isPrincipal ? [] : inertGrants(permissions)),
    [permissions, isPrincipal]
  );

  // Levels above view do not add a screen, but they change what the person can
  // do once inside it, so they are worth naming.
  const elevated = useMemo(() => {
    const byResource = new Map<string, PermissionType>();
    permissions.forEach((p) => {
      if (p.type === PermissionType.WRITE || p.type === PermissionType.ADMIN) {
        const existing = byResource.get(p.resource);
        if (existing !== PermissionType.ADMIN) {
          byResource.set(p.resource, p.type as PermissionType);
        }
      }
    });
    return Array.from(byResource.entries());
  }, [permissions]);

  return (
    <div
      className={`rounded-lg border border-light-border dark:border-dark-border bg-light-surface dark:bg-dark-surface ${className}`}
    >
      <div className="flex items-center gap-2 px-4 py-3 border-b border-light-border dark:border-dark-border">
        <Layout className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        <h4 className="font-heading text-sm font-semibold text-light-text-primary dark:text-dark-text-primary">
          {personName ? `What ${personName} will see` : 'What they will see'}
        </h4>
      </div>

      <div className="p-4 space-y-4">
        {isPrincipal ? (
          <div className="flex items-start gap-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-3">
            <Crown className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700 dark:text-amber-400">
              Principal-level access: every screen, including billing, staff and
              permissions.
            </p>
          </div>
        ) : navItems.length === 0 ? (
          <div className="flex items-start gap-2 rounded-lg bg-gray-50 dark:bg-gray-800/40 border border-light-border dark:border-dark-border p-3">
            <MinusCircle className="h-4 w-4 text-gray-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary">
              {inline.length > 0
                ? 'No screens on their sidebar. They can sign in, but only the abilities below will apply.'
                : 'An empty dashboard. They can sign in, but there is nothing for them to open yet.'}
            </p>
          </div>
        ) : (
          <ul className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <li
                  key={item.href}
                  className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 bg-gray-50 dark:bg-gray-800/40"
                >
                  <Icon className="h-4 w-4 text-light-text-secondary dark:text-dark-text-secondary flex-shrink-0" />
                  <span className="text-sm text-light-text-primary dark:text-dark-text-primary truncate">
                    {item.label}
                  </span>
                </li>
              );
            })}
          </ul>
        )}

        {inline.length > 0 && (
          <div className="pt-3 border-t border-light-border dark:border-dark-border space-y-1.5">
            <p className="text-xs font-medium text-light-text-secondary dark:text-dark-text-secondary">
              Also allowed, inside those screens
            </p>
            {inline.map((resource) => (
              <p
                key={resource}
                className="flex items-center gap-1.5 text-xs text-light-text-secondary dark:text-dark-text-secondary"
              >
                <span aria-hidden>{PERMISSION_RESOURCE_INFO[resource]?.icon}</span>
                {resourceLabel(resource)}
              </p>
            ))}
          </div>
        )}

        {!isPrincipal && elevated.length > 0 && (
          <div className="pt-3 border-t border-light-border dark:border-dark-border space-y-1.5">
            <p className="text-xs font-medium text-light-text-secondary dark:text-dark-text-secondary">
              Beyond viewing
            </p>
            {elevated.map(([resource, type]) => {
              const info = PERMISSION_TYPE_INFO[type];
              return (
                <p key={resource} className="text-xs text-light-text-secondary dark:text-dark-text-secondary">
                  {resourceLabel(resource as PermissionResource)} —{' '}
                  <span className={info.text}>{info.label.toLowerCase()}</span>
                </p>
              );
            })}
          </div>
        )}

        {inert.length > 0 && (
          <div className="pt-3 border-t border-light-border dark:border-dark-border">
            <p className="flex items-start gap-1.5 text-xs text-amber-700 dark:text-amber-400">
              <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
              <span>
                {inert.map((r) => resourceLabel(r)).join(' and ')}{' '}
                {inert.length === 1 ? 'is' : 'are'} principal-level only, so this
                grant will not appear on their dashboard.
              </span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
