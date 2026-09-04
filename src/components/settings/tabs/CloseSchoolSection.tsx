'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { useSelector } from 'react-redux';
import type { RootState } from '@/lib/store/store';
import { isPrincipalRole } from '@/lib/constants/roles';
import {
  useGetMySchoolQuery,
  useScheduleSchoolCloseMutation,
  useCancelSchoolCloseMutation,
} from '@/lib/store/api/schoolAdminApi';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Label } from '@/components/ui/Label';
import { Alert, AlertDescription } from '@/components/ui/Alert';

export function CloseSchoolSection() {
  const user = useSelector((state: RootState) => state.auth.user);
  const canClose = user?.role === 'SCHOOL_ADMIN' && isPrincipalRole(user.adminRole ?? null);
  const { data, refetch } = useGetMySchoolQuery(undefined, { skip: !canClose });
  const [scheduleClose, { isLoading: isScheduling }] = useScheduleSchoolCloseMutation();
  const [cancelClose, { isLoading: isCancelling }] = useCancelSchoolCloseMutation();
  const [reason, setReason] = useState('');
  const [confirm, setConfirm] = useState('');

  if (!canClose) return null;

  const school = data?.data;
  const lifecycle = school?.lifecycleStatus || (school && !school.isActive ? 'DEACTIVATED' : 'ACTIVE');

  const handleSchedule = async () => {
    if (reason.trim().length < 8) {
      toast.error('Please provide a reason (at least 8 characters).');
      return;
    }
    if (confirm.trim().toLowerCase() !== 'close') {
      toast.error('Type CLOSE to confirm.');
      return;
    }
    try {
      await scheduleClose({ reason: reason.trim() }).unwrap();
      toast.success('School close scheduled. You have 7 days to cancel.');
      setReason('');
      setConfirm('');
      refetch();
    } catch (err: any) {
      toast.error(err?.data?.message || err?.message || 'Could not schedule close');
    }
  };

  const handleCancel = async () => {
    try {
      await cancelClose().unwrap();
      toast.success('School close cancelled.');
      refetch();
    } catch (err: any) {
      toast.error(err?.data?.message || err?.message || 'Could not cancel close');
    }
  };

  return (
    <Card className="border-red-200 dark:border-red-900/50">
      <CardHeader>
        <CardTitle className="text-red-700 dark:text-red-400">Close school</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
          Closing deactivates the school after 7 days. Records are kept. Teachers become read-only.
          Students receive a transfer code that does not expire.
        </p>
        {lifecycle === 'CLOSING' ? (
          <>
            <Alert variant="warning">
              <AlertDescription>
                A close is scheduled{school?.deactivatesAt ? ` for ${new Date(school.deactivatesAt).toLocaleString()}` : ''}.
                {school?.deactivationReason ? ` Reason: ${school.deactivationReason}` : ''}
              </AlertDescription>
            </Alert>
            <Button variant="secondary" onClick={handleCancel} isLoading={isCancelling}>
              Cancel close
            </Button>
          </>
        ) : lifecycle === 'DEACTIVATED' ? (
          <Alert variant="warning">
            <AlertDescription>This school is already deactivated. Use the reactivate page to restore it.</AlertDescription>
          </Alert>
        ) : (
          <>
            <div>
              <Label>Reason</Label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="mt-1 w-full px-3 py-2 border rounded-md dark:bg-gray-800 dark:border-gray-700 h-24 resize-none"
                placeholder="Why is this school closing?"
              />
            </div>
            <div>
              <Label>Type CLOSE to confirm</Label>
              <input
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="mt-1 w-full px-3 py-2 border rounded-md dark:bg-gray-800 dark:border-gray-700"
              />
            </div>
            <Button variant="danger" onClick={handleSchedule} isLoading={isScheduling}>
              Schedule close (7 days)
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
