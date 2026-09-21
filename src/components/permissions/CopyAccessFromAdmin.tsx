'use client';

import { useMemo, useState } from 'react';
import { Copy, Loader2 } from 'lucide-react';
import { Select } from '@/components/ui/Select';
import { useGetAdminPermissionsQuery } from '@/lib/store/api/schoolAdminApi';
import type { AdminPermissionInput } from '@/lib/store/api/schoolsApi';
import { hasPrincipalAccess, type AdminAccessTier } from '@/lib/constants/roles';
import { PERMISSION_RESOURCE_INFO } from '@/lib/constants/permission-metadata';
import { PermissionResource, PermissionType } from '@/lib/store/api/schoolAdminApi';

/** Enough of an admin to offer them as a source. Tier is optional because not
 *  every list the school API returns carries it. */
export interface CopyAccessCandidate {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
  accessTier?: AdminAccessTier | null;
}

interface CopyAccessFromAdminProps {
  schoolId: string;
  /** Everyone already administering this school. */
  admins: CopyAccessCandidate[];
  /** The admin doing the granting, who is not a useful thing to copy from. */
  excludeAdminId?: string;
  onApply: (permissions: AdminPermissionInput[], sourceName: string) => void;
  disabled?: boolean;
}

/**
 * "Give her what Tunde has."
 *
 * The roles cover the common jobs, but every school has a Sports Coordinator
 * that no bundle describes, and the access for the second one should not have
 * to be reconstructed from memory.
 */
export function CopyAccessFromAdmin({
  schoolId,
  admins,
  excludeAdminId,
  onApply,
  disabled = false,
}: CopyAccessFromAdminProps) {
  const [sourceId, setSourceId] = useState('');

  // Principals hold no permission rows — their tier is the grant — so copying
  // one would quietly produce an empty set. Where the tier is not on the list we
  // were handed, the check below catches it once their access is fetched.
  const candidates = useMemo(
    () =>
      admins.filter((admin) => admin.id !== excludeAdminId && !hasPrincipalAccess(admin)),
    [admins, excludeAdminId]
  );

  const { data: sourceResponse, isFetching } = useGetAdminPermissionsQuery(
    { schoolId, adminId: sourceId },
    { skip: !sourceId }
  );

  const source = sourceResponse?.data;
  const sourceAdmin = candidates.find((a) => a.id === sourceId);
  const sourceName = sourceAdmin
    ? `${sourceAdmin.firstName} ${sourceAdmin.lastName}`
    : '';

  const screens = useMemo(() => {
    if (!source?.permissions) return 0;
    const seen = new Set<string>();
    source.permissions.forEach((p) => {
      const info = PERMISSION_RESOURCE_INFO[p.resource as PermissionResource];
      if (info?.visibility === 'screen' && p.type === PermissionType.READ) {
        seen.add(p.resource);
      }
    });
    return seen.size;
  }, [source]);

  // A principal has nothing to copy, and an admin with no rows yet is not a
  // useful source either. Say so rather than applying an empty set.
  const isPrincipalSource = source ? hasPrincipalAccess(source) : false;
  const isEmptySource = !!source && !isPrincipalSource && source.permissions.length === 0;
  const canApply = !!source && !isPrincipalSource && !isEmptySource;

  if (candidates.length === 0) return null;

  return (
    <div className="rounded-lg border border-light-border p-3 dark:border-dark-border">
      <label className="block text-sm font-medium text-light-text-primary dark:text-dark-text-primary">
        Or copy a colleague&apos;s access
      </label>
      <p className="mb-2 text-xs text-light-text-secondary dark:text-dark-text-secondary">
        Useful for a job none of the roles above describes.
      </p>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Select
          value={sourceId}
          onChange={(e) => setSourceId(e.target.value)}
          disabled={disabled}
          placeholder="Select an administrator"
          wrapperClassName="flex-1"
        >
          {candidates.map((admin) => (
            <option key={admin.id} value={admin.id}>
              {admin.firstName} {admin.lastName} — {admin.role}
            </option>
          ))}
        </Select>

        <button
          type="button"
          onClick={() => {
            if (!source) return;
            onApply(
              source.permissions.map((p) => ({ resource: p.resource, type: p.type })),
              sourceName
            );
          }}
          disabled={disabled || !canApply || isFetching}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-light-border px-3 py-2 text-sm font-medium text-light-text-primary transition-colors hover:bg-light-bg disabled:opacity-50 dark:border-dark-border dark:text-dark-text-primary dark:hover:bg-dark-bg"
        >
          {isFetching ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
          Copy
        </button>
      </div>

      {sourceId && !isFetching && (
        <p className="mt-2 text-xs text-light-text-secondary dark:text-dark-text-secondary">
          {isPrincipalSource
            ? `${sourceName} has principal-level access, which does not come from permissions — there is nothing to copy.`
            : isEmptySource
              ? `${sourceName} has no access granted yet.`
              : `${sourceName} can reach ${screens} screen${screens !== 1 ? 's' : ''}.`}
        </p>
      )}
    </div>
  );
}
