'use client';

import Link from 'next/link';
import { useCallback, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { usePathname } from 'next/navigation';
import { RootState } from '@/lib/store/store';
import {
  useGetSubscriptionSummaryQuery,
  useGetBillingUiFlagsQuery,
} from '@/lib/store/api/subscriptionsApi';
import { X } from 'lucide-react';
import { hasPrincipalAccess } from '@/lib/constants/roles';

// Pages where the blocking modal must not appear so the user can act on their subscription
const SUBSCRIPTION_ROUTES = [
  '/dashboard/school/subscription',
  '/dashboard/school/subscription/downgrade',
  '/dashboard/school/subscription/callback',
];

const graceDismissKey = (schoolId: string) => `agora_billing_grace_dismissed_${schoolId}`;

export function SchoolBillingShell() {
  const user = useSelector((s: RootState) => s.auth.user);
  const tenantId = useSelector((s: RootState) => s.auth.tenantId);
  const schoolId = tenantId;
  const pathname = usePathname();
  const isPrincipalAdmin =
    user?.role === 'SCHOOL_ADMIN' &&
    hasPrincipalAccess({ accessTier: user?.adminAccessTier });

  const onSubscriptionPage = SUBSCRIPTION_ROUTES.some((route) =>
    pathname?.startsWith(route),
  );

  const { data: summaryRes } = useGetSubscriptionSummaryQuery(undefined, {
    skip: !isPrincipalAdmin || !schoolId,
  });
  const { data: flagsRes } = useGetBillingUiFlagsQuery(undefined, {
    skip: !isPrincipalAdmin || !schoolId,
    // Poll every 30 s so the modal clears automatically after a successful payment
    // without requiring a manual page refresh.
    pollingInterval: 30_000,
  });

  const flags = flagsRes?.data;

  const [graceDismissed, setGraceDismissed] = useState(false);

  const readGraceDismissed = useCallback(() => {
    if (!schoolId || typeof window === 'undefined') return false;
    return localStorage.getItem(graceDismissKey(schoolId)) === '1';
  }, [schoolId]);

  const showGrace =
    isPrincipalAdmin &&
    (flags?.showGraceBanner ?? false) &&
    !graceDismissed &&
    !readGraceDismissed();

  const blockAdmin = isPrincipalAdmin && (flags?.blockAdminDashboard ?? false) && !onSubscriptionPage;

  const dismissGrace = () => {
    if (schoolId) localStorage.setItem(graceDismissKey(schoolId), '1');
    setGraceDismissed(true);
  };

  const graceEndsLabel = useMemo(() => {
    const raw = summaryRes?.data?.billing?.graceEndsAt;
    if (!raw) return '';
    try {
      return new Date(raw).toLocaleDateString(undefined, { dateStyle: 'medium' });
    } catch {
      return '';
    }
  }, [summaryRes?.data?.billing?.graceEndsAt]);

  if (!isPrincipalAdmin) return null;

  return (
    <>
      {showGrace && (
        <div className="sticky top-0 z-[60] border-b border-amber-200/80 bg-amber-50/95 dark:bg-amber-950/90 dark:border-amber-800/50 px-4 py-3 text-amber-950 dark:text-amber-100 shadow-sm">
          <div className="max-w-5xl mx-auto flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-medium pr-8">
              Your subscription payment period has ended. You are in a grace window
              {graceEndsLabel ? ` until ${graceEndsLabel}` : ''}. Renew now to avoid interruption — after grace,
              administrators must renew or move to the Free plan (student caps will apply).
            </p>
            <div className="flex items-center gap-2 shrink-0">
              <Link
                href="/dashboard/school/subscription"
                className="inline-flex items-center justify-center rounded-lg px-3 py-1.5 text-sm font-medium bg-amber-700 hover:bg-amber-800 text-white"
              >
                Renew now
              </Link>
              <button
                type="button"
                aria-label="Dismiss"
                onClick={dismissGrace}
                className="rounded-lg p-1.5 hover:bg-amber-200/60 dark:hover:bg-amber-900/50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {blockAdmin && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4">
          <div className="max-w-lg w-full rounded-2xl bg-white dark:bg-zinc-900 p-6 shadow-2xl border border-zinc-200 dark:border-zinc-700">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              Your subscription has expired
            </h2>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
              Renew to restore full access immediately, or move to the Free plan. If you choose Free and you are over
              student limits, you will choose which enrollments stay active; others will be locked (not deleted) until
              you upgrade again.
            </p>
            <ul className="mt-3 text-sm text-zinc-700 dark:text-zinc-300 list-disc pl-5 space-y-1">
              <li>Free plan operational student cap: 100 (you will confirm which enrollments stay active if you are over cap).</li>
            </ul>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row">
              <Link
                href="/dashboard/school/subscription"
                className="flex-1 inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white text-center"
              >
                Renew subscription
              </Link>
              <Link
                href="/dashboard/school/subscription/downgrade"
                className="flex-1 inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-medium border border-zinc-300 dark:border-zinc-600 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-center"
              >
                Downgrade to Free
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
