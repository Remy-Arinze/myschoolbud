'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useDispatch } from 'react-redux';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { useGetMySchoolQuery, useReactivateMySchoolMutation } from '@/lib/store/api/schoolAdminApi';
import { setCredentials } from '@/lib/store/slices/authSlice';
import { useSelector } from 'react-redux';
import type { RootState } from '@/lib/store/store';

export default function ReactivateSchoolPage() {
  const router = useRouter();
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.auth.user);
  const token = useSelector((state: RootState) => state.auth.token);
  const { data, isLoading } = useGetMySchoolQuery();
  const [reactivate, { isLoading: isSaving }] = useReactivateMySchoolMutation();
  const [done, setDone] = useState(false);
  const school = data?.data;

  const handleReactivate = async () => {
    try {
      const result = await reactivate().unwrap();
      toast.success(result.message || 'School reactivated');
      if (user && token) {
        dispatch(
          setCredentials({
            accessToken: token,
            user: { ...user, lifecycleStatus: 'ACTIVE', deactivatesAt: null, deactivationReason: null, deactivatedAt: null },
          }),
        );
      }
      setDone(true);
      router.replace('/dashboard/school');
    } catch (err: any) {
      toast.error(err?.data?.message || err?.message || 'Could not reactivate this school');
    }
  };

  return (
    <div className="max-w-xl mx-auto py-10">
      <Card>
        <CardHeader>
          <CardTitle>This school is deactivated</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
            {school?.name || 'Your school'} is deactivated. Records are kept. Teachers have read-only access.
            Students can transfer with a code that does not expire.
            {school?.deactivationReason ? ` Reason: ${school.deactivationReason}` : ''}
          </p>
          <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
            Only the school owner or a principal can reactivate. Students who already transferred stay at their new school.
          </p>
          <Button onClick={handleReactivate} isLoading={isSaving || isLoading} disabled={done}>
            Reactivate school
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
