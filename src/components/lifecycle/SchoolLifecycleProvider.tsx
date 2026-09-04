'use client';

import { ReactNode, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import type { RootState } from '@/lib/store/store';
import { useGetMySchoolQuery } from '@/lib/store/api/schoolAdminApi';
import { Alert, AlertDescription } from '@/components/ui/Alert';

function formatCloseDate(value?: string | null) {
  if (!value) return 'the scheduled date';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'the scheduled date';
  return date.toLocaleString();
}

export function SchoolLifecycleProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const user = useSelector((state: RootState) => state.auth.user);
  const { data } = useGetMySchoolQuery(undefined, { skip: user?.role !== 'SCHOOL_ADMIN' });
  const school = data?.data;

  const lifecycle =
    school?.lifecycleStatus || user?.lifecycleStatus || (school && !school.isActive ? 'DEACTIVATED' : 'ACTIVE');
  const deactivatesAt = school?.deactivatesAt || user?.deactivatesAt || null;
  const reason = school?.deactivationReason || user?.deactivationReason || null;

  useEffect(() => {
    if (!user || !pathname) return;
    if (user.role === 'STUDENT' && lifecycle === 'DEACTIVATED' && !pathname.startsWith('/dashboard/student/school-suspended')) {
      router.replace('/dashboard/student/school-suspended');
    }
    if (user.role === 'SCHOOL_ADMIN' && lifecycle === 'DEACTIVATED' && !pathname.startsWith('/dashboard/school/reactivate')) {
      router.replace('/dashboard/school/reactivate');
    }
  }, [user, lifecycle, pathname, router]);

  return (
    <>
      {children}
    </>
  );
}

export function SchoolLifecycleBanners() {
  const user = useSelector((state: RootState) => state.auth.user);
  const { data } = useGetMySchoolQuery(undefined, { skip: user?.role !== 'SCHOOL_ADMIN' });
  const school = data?.data;
  const lifecycle =
    school?.lifecycleStatus || user?.lifecycleStatus || (school && !school.isActive ? 'DEACTIVATED' : 'ACTIVE');
  const deactivatesAt = school?.deactivatesAt || user?.deactivatesAt || null;
  const reason = school?.deactivationReason || user?.deactivationReason || null;

  return (
    <>
      {lifecycle === 'CLOSING' && (user?.role === 'SCHOOL_ADMIN' || user?.role === 'TEACHER') && (
        <Alert variant="warning" className="mb-4">
          <AlertDescription>
            This school is scheduled to close on {formatCloseDate(deactivatesAt)}.
            {reason ? ` Reason: ${reason}` : ''} An authorised admin can cancel the close from Settings.
          </AlertDescription>
        </Alert>
      )}
      {lifecycle === 'DEACTIVATED' && user?.role === 'TEACHER' && (
        <Alert variant="warning" className="mb-4">
          <AlertDescription>
            This school is deactivated. You can view records, but changes are turned off. Student records are kept.
          </AlertDescription>
        </Alert>
      )}
    </>
  );
}
