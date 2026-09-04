'use client';

import { useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import type { RootState } from '@/lib/store/store';
import { setCredentials } from '@/lib/store/slices/authSlice';
import {
  useGetMyStudentEnrollmentsQuery,
  useGetClosureTacMutation,
  useSwitchStudentSchoolMutation,
} from '@/lib/store/api/schoolAdminApi';
import { maybeRedirectToSchoolPortal } from '@/lib/portal/finishLogin';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

export default function SchoolSuspendedPage() {
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.auth.user);
  const { data, isLoading } = useGetMyStudentEnrollmentsQuery();
  const [getTac, { isLoading: isGettingTac }] = useGetClosureTacMutation();
  const [switchSchool, { isLoading: isSwitching }] = useSwitchStudentSchoolMutation();
  const [tac, setTac] = useState<string | null>(null);

  const enrollments = data?.data || [];
  const currentSchoolId = user?.schoolId;
  const current = enrollments.find((e: any) => e.school?.id === currentSchoolId) || enrollments[0];
  const liveOthers = useMemo(
    () =>
      enrollments.filter(
        (e: any) =>
          e.isActive &&
          e.school?.id !== currentSchoolId &&
          e.school?.lifecycleStatus !== 'DEACTIVATED' &&
          e.school?.isActive !== false,
      ),
    [enrollments, currentSchoolId],
  );

  const handleCopyTac = async () => {
    try {
      const result = await getTac().unwrap();
      const code = result.data?.tac;
      if (!code) throw new Error('No transfer code returned');
      setTac(code);
      await navigator.clipboard.writeText(code);
      toast.success('Transfer code copied');
    } catch (err: any) {
      toast.error(err?.data?.message || err?.message || 'Could not get a transfer code');
    }
  };

  const handleSwitch = async (schoolId: string) => {
    try {
      const result = await switchSchool({ schoolId }).unwrap();
      const payload = result.data;
      if (payload?.accessToken && payload?.user) {
        if (maybeRedirectToSchoolPortal(payload)) return;
        dispatch(
          setCredentials({
            accessToken: payload.accessToken,
            refreshToken: payload.refreshToken,
            user: payload.user,
            tenantId: payload.user.tenantId,
          }),
        );
        if (payload.user.schoolId) localStorage.setItem('currentSchoolId', payload.user.schoolId);
        window.location.href = '/dashboard/student';
      }
    } catch (err: any) {
      toast.error(err?.data?.message || err?.message || 'Could not switch school');
    }
  };

  return (
    <div className="max-w-xl mx-auto py-10 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Current school is suspended</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
            {current?.school?.name || 'Your school'} is deactivated. Your academic records are kept.
            Share this transfer code and your student ID with a new school. The code does not expire
            and is only used after you are enrolled there.
          </p>
          {tac && (
            <p className="font-mono text-lg break-all bg-black/5 dark:bg-white/5 rounded-md px-3 py-2">
              {tac}
            </p>
          )}
          <Button onClick={handleCopyTac} isLoading={isGettingTac || isLoading}>
            {tac ? 'Copy transfer code again' : 'Get transfer code'}
          </Button>
        </CardContent>
      </Card>

      {liveOthers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Switch to another school</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {liveOthers.map((enrollment: any) => (
              <div key={enrollment.id} className="flex items-center justify-between gap-3">
                <span>{enrollment.school?.name}</span>
                <Button
                  variant="secondary"
                  size="sm"
                  isLoading={isSwitching}
                  onClick={() => handleSwitch(enrollment.school.id)}
                >
                  Switch
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
