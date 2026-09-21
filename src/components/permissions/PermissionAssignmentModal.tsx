'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Loader2, Shield, CheckCircle2, Info, Crown, Lock, MinusCircle, PlusCircle, AlertTriangle } from 'lucide-react';
import {
  useGetAllPermissionsQuery,
  useGetAdminPermissionsQuery,
  useAssignPermissionsMutation,
  Permission,
  PermissionResource,
  PermissionType,
} from '@/lib/store/api/schoolAdminApi';
import { useGetMySchoolQuery } from '@/lib/store/api/schoolAdminApi';
import toast from 'react-hot-toast';
import { hasPrincipalAccess, type AdminAccessTier } from '@/lib/constants/roles';
import {
  PERMISSION_RESOURCE_INFO,
  PERMISSION_TYPE_INFO,
  resourceLabel,
} from '@/lib/constants/permission-metadata';
import { AccessPreview } from './AccessPreview';

interface PermissionAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  adminId: string;
  adminName: string;
  /** Display title, shown in the header. Carries no authority. */
  adminRole: string;
  /** Authority. PRINCIPAL means the rows below are not editable. */
  accessTier?: AdminAccessTier | null;
}

const RESOURCE_INFO = PERMISSION_RESOURCE_INFO;
const TYPE_INFO = PERMISSION_TYPE_INFO;

export function PermissionAssignmentModal({
  isOpen,
  onClose,
  adminId,
  adminName,
  accessTier,
  adminRole,
}: PermissionAssignmentModalProps) {
  const { data: schoolResponse } = useGetMySchoolQuery();
  const schoolId = schoolResponse?.data?.id;

  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set());
  const [isConfirming, setIsConfirming] = useState(false);

  // Principal tier means permanent full access and nothing to edit here. The
  // title in the header is just a label — it never decides this.
  const isPrincipal = hasPrincipalAccess({ accessTier });

  // Get all available permissions
  const { data: allPermissionsResponse, isLoading: isLoadingAll } = useGetAllPermissionsQuery(
    { schoolId: schoolId! },
    { skip: !schoolId || !isOpen }
  );

  // Get current admin permissions (skip for principals - they have all)
  const { data: adminPermissionsResponse, isLoading: isLoadingAdmin } = useGetAdminPermissionsQuery(
    { schoolId: schoolId!, adminId },
    { skip: !schoolId || !adminId || !isOpen || isPrincipal }
  );

  const [assignPermissions, { isLoading: isAssigning }] = useAssignPermissionsMutation();

  const allPermissions = useMemo(
    () => allPermissionsResponse?.data || [],
    [allPermissionsResponse]
  );
  const currentPermissions = useMemo(
    () => adminPermissionsResponse?.data?.permissions || [],
    [adminPermissionsResponse]
  );

  // Seed the ticks from what they hold today, once per admin per open. Keying
  // on the person rather than the response means a background refetch cannot
  // throw away ticks somebody is in the middle of making. The empty case is
  // seeded too, or reopening on an admin with no access would show the
  // previous admin's selection.
  const seededFor = useRef<string | null>(null);
  useEffect(() => {
    if (!isOpen) {
      seededFor.current = null;
      return;
    }
    if (isLoadingAdmin || seededFor.current === adminId) return;
    setSelectedPermissions(new Set(currentPermissions.map((p) => p.id)));
    setIsConfirming(false);
    seededFor.current = adminId;
  }, [isOpen, adminId, isLoadingAdmin, currentPermissions]);

  // Group permissions by resource
  const permissionsByResource = allPermissions.reduce((acc, perm) => {
    if (!acc[perm.resource]) {
      acc[perm.resource] = [];
    }
    acc[perm.resource].push(perm);
    return acc;
  }, {} as Record<PermissionResource, Permission[]>);

  const handleTogglePermission = (permission: Permission) => {
    const resourcePerms = permissionsByResource[permission.resource] || [];
    const byType = Object.fromEntries(resourcePerms.map((p) => [p.type, p]));
    const newSelected = new Set(selectedPermissions);
    const isSelected = newSelected.has(permission.id);

    if (isSelected) {
      if (permission.type === PermissionType.READ) {
        resourcePerms.forEach((p) => newSelected.delete(p.id));
      } else if (permission.type === PermissionType.WRITE) {
        if (byType[PermissionType.WRITE]) newSelected.delete(byType[PermissionType.WRITE].id);
        if (byType[PermissionType.ADMIN]) newSelected.delete(byType[PermissionType.ADMIN].id);
      } else {
        newSelected.delete(permission.id);
      }
    } else {
      newSelected.add(permission.id);
      if (permission.type === PermissionType.WRITE || permission.type === PermissionType.ADMIN) {
        if (byType[PermissionType.READ]) newSelected.add(byType[PermissionType.READ].id);
      }
      if (permission.type === PermissionType.ADMIN) {
        if (byType[PermissionType.WRITE]) newSelected.add(byType[PermissionType.WRITE].id);
      }
    }

    setSelectedPermissions(newSelected);
  };

  const handleSelectAllForResource = (resource: PermissionResource) => {
    const resourcePerms = permissionsByResource[resource] || [];
    const newSelected = new Set(selectedPermissions);
    
    // Check if all are selected
    const allSelected = resourcePerms.every((p) => newSelected.has(p.id));
    
    if (allSelected) {
      // Deselect all
      resourcePerms.forEach((p) => newSelected.delete(p.id));
    } else {
      // Select all
      resourcePerms.forEach((p) => newSelected.add(p.id));
    }
    
    setSelectedPermissions(newSelected);
  };

  // Saving replaces every row rather than merging, so anything unticked is a
  // removal. The service has always logged that diff; the person clicking Save
  // was the only one who never saw it.
  const diff = useMemo(() => {
    const before = new Set(currentPermissions.map((p) => p.id));
    const byId = new Map(allPermissions.map((p) => [p.id, p]));
    const describe = (id: string) => {
      const perm = byId.get(id);
      if (!perm) return null;
      return {
        id,
        label: `${resourceLabel(perm.resource)} — ${TYPE_INFO[perm.type]?.label ?? perm.type}`,
        type: perm.type,
      };
    };

    const added = Array.from(selectedPermissions)
      .filter((id) => !before.has(id))
      .map(describe)
      .filter((x): x is NonNullable<typeof x> => !!x);
    const removed = Array.from(before)
      .filter((id) => !selectedPermissions.has(id))
      .map(describe)
      .filter((x): x is NonNullable<typeof x> => !!x);

    return { added, removed };
  }, [selectedPermissions, currentPermissions, allPermissions]);

  const selectedPairs = useMemo(() => {
    const byId = new Map(allPermissions.map((p) => [p.id, p]));
    return Array.from(selectedPermissions)
      .map((id) => byId.get(id))
      .filter((p): p is Permission => !!p)
      .map((p) => ({ resource: p.resource as string, type: p.type as string }));
  }, [selectedPermissions, allPermissions]);

  const hasChanges = diff.added.length > 0 || diff.removed.length > 0;

  const commit = async () => {
    if (!schoolId) return;

    try {
      await assignPermissions({
        schoolId,
        adminId,
        permissionIds: Array.from(selectedPermissions),
      }).unwrap();

      toast.success(`Access updated for ${adminName}`);
      setIsConfirming(false);
      onClose();
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to update access');
    }
  };

  const handleSave = () => {
    // Taking access away is the change worth pausing on: the other person can
    // be mid-task on a screen that is about to disappear.
    if (diff.removed.length > 0 && !isConfirming) {
      setIsConfirming(true);
      return;
    }
    void commit();
  };

  const isLoading = isLoadingAll || isLoadingAdmin;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Assign Permissions" size="xl">
      <div className="space-y-4">
        {/* Admin Info */}
        <div className="bg-[var(--light-bg)] dark:bg-dark-surface rounded-lg p-4">
          <div className="flex items-center gap-3">
            {isPrincipal ? (
              <Crown className="h-5 w-5 text-amber-500" />
            ) : (
              <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            )}
            <div>
              <p className="font-semibold text-light-text-primary dark:text-dark-text-primary">
                {adminName}
              </p>
              <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                Role: {adminRole}
              </p>
            </div>
          </div>
        </div>

        {/* Principal Full Access Notice */}
        {isPrincipal ? (
          <>
            <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-6 border border-amber-200 dark:border-amber-800">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-800/50 flex items-center justify-center">
                  <Crown className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-amber-800 dark:text-amber-300 mb-2">
                    Principal - Full Access
                  </h3>
                  <p className="text-sm text-amber-700 dark:text-amber-400 mb-4">
                    As the Principal, this account has <strong>permanent full access</strong> to all school resources and features. 
                    This ensures the school leader always maintains complete control over the institution.
                  </p>
                  <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-500">
                    <Lock className="h-4 w-4" />
                    <span>Principal permissions cannot be modified</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* All Permissions Granted (Visual Display) */}
            <div className="space-y-3">
              <p className="text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary">
                All permissions are automatically granted:
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {Object.entries(RESOURCE_INFO).map(([resource, info]) => (
                  <div 
                    key={resource} 
                    className="flex items-center gap-2 p-2 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800"
                  >
                    <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                    <span className="text-sm text-green-800 dark:text-green-300 truncate">{info.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Close Button for Principal */}
            <div className="flex items-center justify-end pt-4 border-t border-light-border dark:border-dark-border">
              <Button variant="primary" onClick={onClose}>
                Close
              </Button>
            </div>
          </>
        ) : (
          <>
            {/* Permission Types Legend */}
        <div className="bg-light-surface dark:bg-dark-surface rounded-lg p-4 border border-light-border dark:border-dark-border">
          <div className="flex items-center gap-2 mb-3">
            <Info className="h-4 w-4 text-light-text-secondary dark:text-dark-text-secondary" />
            <span className="text-sm font-medium text-light-text-primary dark:text-dark-text-primary">
              What each level means
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {Object.entries(TYPE_INFO).map(([type, info]) => {
              const Icon = info.icon;
              return (
                <div key={type} className={`p-3 rounded-lg ${info.bg}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className={`h-4 w-4 ${info.text}`} />
                    <span className={`font-semibold text-sm ${info.text}`}>{info.label}</span>
                  </div>
                  <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary">
                    {info.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Permissions List, with the resulting dashboard beside it */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-400" />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-4">
          <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
            {Object.entries(permissionsByResource).map(([resource, permissions]) => {
              const resourceInfo = RESOURCE_INFO[resource as PermissionResource];
              return (
                <Card key={resource} className="border-light-border dark:border-dark-border">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <span className="text-2xl">{resourceInfo.icon}</span>
                        <div>
                          <CardTitle className="text-base font-semibold text-light-text-primary dark:text-dark-text-primary">
                            {resourceInfo.label}
                          </CardTitle>
                          <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary mt-0.5">
                            {resourceInfo.description}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSelectAllForResource(resource as PermissionResource)}
                        className="text-xs"
                      >
                        {permissions.every((p) => selectedPermissions.has(p.id))
                          ? 'Deselect All'
                          : 'Select All'}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-2">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      {permissions.map((permission) => {
                        const isSelected = selectedPermissions.has(permission.id);
                        const typeInfo = TYPE_INFO[permission.type];
                        const TypeIcon = typeInfo.icon;

                        return (
                          <label
                            key={permission.id}
                            className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                              isSelected
                                ? `${typeInfo.border} ${typeInfo.bg}`
                                : 'border-light-border dark:border-dark-border hover:bg-light-bg dark:hover:bg-dark-bg'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleTogglePermission(permission)}
                              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <TypeIcon className={`h-3.5 w-3.5 ${typeInfo.text}`} />
                                <span className={`font-medium text-sm ${isSelected ? typeInfo.text : 'text-light-text-primary dark:text-dark-text-primary'}`}>
                                  {typeInfo.label}
                                </span>
                              </div>
                            </div>
                            {isSelected && (
                              <CheckCircle2 className={`h-4 w-4 flex-shrink-0 ${typeInfo.text}`} />
                            )}
                          </label>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

            <AccessPreview
              permissions={selectedPairs}
              personName={adminName.split(' ')[0]}
              className="lg:sticky lg:top-0 self-start"
            />
          </div>
        )}

        {/* What is about to change */}
        {hasChanges && (
          <div
            className={`rounded-lg p-3 border space-y-2 ${
              isConfirming
                ? 'border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20'
                : 'border-light-border dark:border-dark-border bg-light-surface dark:bg-dark-surface'
            }`}
          >
            {isConfirming && (
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-amber-800 dark:text-amber-300">
                  {adminName.split(' ')[0]} will lose access to the following the next
                  time the page loads. Anything they have open will stop working.
                </p>
              </div>
            )}
            {diff.removed.length > 0 && (
              <div className="space-y-1">
                {diff.removed.map((item) => (
                  <p
                    key={item.id}
                    className="flex items-center gap-2 text-xs text-light-text-secondary dark:text-dark-text-secondary"
                  >
                    <MinusCircle className="h-3.5 w-3.5 text-red-500 flex-shrink-0" />
                    Removing {item.label}
                  </p>
                ))}
              </div>
            )}
            {diff.added.length > 0 && (
              <div className="space-y-1">
                {diff.added.map((item) => (
                  <p
                    key={item.id}
                    className="flex items-center gap-2 text-xs text-light-text-secondary dark:text-dark-text-secondary"
                  >
                    <PlusCircle className="h-3.5 w-3.5 text-green-600 flex-shrink-0" />
                    Adding {item.label}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-light-border dark:border-dark-border">
              <Button
                variant="ghost"
                onClick={() => (isConfirming ? setIsConfirming(false) : onClose())}
                disabled={isAssigning}
              >
                {isConfirming ? 'Back' : 'Cancel'}
              </Button>
              <Button
                variant={isConfirming ? 'danger' : 'primary'}
                onClick={handleSave}
                disabled={isAssigning || isLoading || !hasChanges}
              >
                {isAssigning ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : isConfirming ? (
                  `Remove and save`
                ) : (
                  'Save access'
                )}
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

