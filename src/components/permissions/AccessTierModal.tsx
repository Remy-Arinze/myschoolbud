'use client';

import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Crown, ShieldOff } from 'lucide-react';
import { ConfirmModal } from '@/components/ui/Modal';
import {
  useChangeAccessTierMutation,
  useGetRoleTemplatesQuery,
} from '@/lib/store/api/schoolsApi';
import type { AdminAccessTier } from '@/lib/constants/roles';
import { AccessPreview } from './AccessPreview';

interface AccessTierModalProps {
  isOpen: boolean;
  onClose: () => void;
  schoolId: string;
  admin: { id: string; name: string; role: string; accessTier: AdminAccessTier | null };
  /** Which way we are going. */
  target: AdminAccessTier;
  onChanged?: () => void;
}

/**
 * Moving an administrator between principal- and staff-level access.
 *
 * Both directions get a confirmation because both are consequential, and the
 * consequence is spelled out rather than implied. Demotion additionally needs a
 * landing place: a principal has no permission rows at all, so dropping the
 * tier without naming replacement access leaves someone with a dashboard of
 * nothing. The picker in the confirmation is how that gets named.
 */
export function AccessTierModal({
  isOpen,
  onClose,
  schoolId,
  admin,
  target,
  onChanged,
}: AccessTierModalProps) {
  const isPromotion = target === 'PRINCIPAL';
  const [replacementTemplateId, setReplacementTemplateId] = useState<string>('');
  const [changeAccessTier, { isLoading }] = useChangeAccessTierMutation();

  const { data: templatesResponse } = useGetRoleTemplatesQuery(
    { schoolId },
    { skip: !isOpen || isPromotion }
  );
  const templates = useMemo(() => templatesResponse?.data || [], [templatesResponse]);
  const chosen = templates.find((t) => t.id === replacementTemplateId) || null;

  const firstName = admin.name.split(' ')[0];

  const handleConfirm = async () => {
    try {
      await changeAccessTier({
        schoolId,
        adminId: admin.id,
        accessTier: target,
        roleTemplateId: isPromotion ? undefined : replacementTemplateId,
      }).unwrap();
      toast.success(
        isPromotion
          ? `${firstName} now has principal-level access`
          : `${firstName} is now a staff-level administrator`
      );
      onChanged?.();
    } catch (error: any) {
      toast.error(error?.data?.message || 'Could not change access level');
      throw error;
    }
  };

  return (
    <ConfirmModal
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={handleConfirm}
      variant={isPromotion ? 'warning' : 'danger'}
      title={
        <span className="flex items-center gap-2">
          {isPromotion ? (
            <Crown className="h-5 w-5 text-amber-500" />
          ) : (
            <ShieldOff className="h-5 w-5 text-red-500" />
          )}
          {isPromotion ? 'Give principal-level access' : 'Remove principal-level access'}
        </span>
      }
      message={
        isPromotion
          ? `${admin.name} will be able to reach every screen in the school — ` +
            'students, staff, grades, settings, billing, and everyone\'s permissions ' +
            'including yours. Permission tick-boxes stop applying to them entirely. ' +
            'Their job title does not change.'
          : `${admin.name} currently bypasses permissions completely. Removing that ` +
            'means they can only reach what you grant below — so choose it now, or ' +
            'they will sign in to an empty dashboard.'
      }
      confirmText={isPromotion ? 'Give full access' : 'Remove and apply access'}
      isLoading={isLoading}
      confirmDisabled={!isPromotion && !replacementTemplateId}
    >
      {!isPromotion && (
        <div className="space-y-3">
          <label className="block text-sm font-medium text-light-text-primary dark:text-dark-text-primary">
            What {firstName} keeps
          </label>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {templates.map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => setReplacementTemplateId(template.id)}
                className={`w-full text-left px-3 py-2 rounded-lg border transition-colors ${
                  replacementTemplateId === template.id
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-light-border dark:border-dark-border hover:bg-light-bg dark:hover:bg-dark-bg'
                }`}
              >
                <span className="block text-sm font-medium text-light-text-primary dark:text-dark-text-primary">
                  {template.name}
                </span>
                <span className="block text-xs text-light-text-secondary dark:text-dark-text-secondary">
                  {template.description ||
                    `${template.permissions.filter((p) => p.type === 'READ').length} screens`}
                </span>
              </button>
            ))}
          </div>

          {chosen && (
            <AccessPreview
              permissions={chosen.permissions.map((p) => ({
                resource: p.resource,
                type: p.type,
              }))}
              personName={firstName}
            />
          )}
        </div>
      )}
    </ConfirmModal>
  );
}
