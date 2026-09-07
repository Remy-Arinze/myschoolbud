'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useVerifyBudPaymentQuery } from '@/lib/store/api/budApi';

export default function BudSubscribeCallbackPage() {
  const params = useSearchParams();
  const router = useRouter();
  const reference = params.get('reference') || params.get('trxref') || '';
  const { isSuccess, isError } = useVerifyBudPaymentQuery(reference, { skip: !reference });

  useEffect(() => {
    if (isSuccess) router.replace('/dashboard/student/bud');
  }, [isSuccess, router]);

  return (
    <ProtectedRoute roles={['STUDENT']}>
      <div className="p-10 text-center">
        {!reference && <p>Missing payment reference.</p>}
        {reference && !isError && <p>Confirming your Bud subscription…</p>}
        {isError && <p>We could not verify that payment. Check Subscription.</p>}
      </div>
    </ProtectedRoute>
  );
}
