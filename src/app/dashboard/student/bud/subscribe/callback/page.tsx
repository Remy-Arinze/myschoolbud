'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Button } from '@/components/ui/Button';
import { FadeInUp } from '@/components/ui/FadeInUp';
import { useVerifyBudPaymentQuery } from '@/lib/store/api/budApi';

function BudCallbackContent() {
  const params = useSearchParams();
  const router = useRouter();
  const reference = params.get('reference') || params.get('trxref') || '';
  const { data, isSuccess, isError } = useVerifyBudPaymentQuery(reference, { skip: !reference });
  const status = (data?.data || data)?.status as string | undefined;
  const paid = isSuccess && status === 'SUCCESS';
  const failed = !reference || isError || (isSuccess && status !== 'SUCCESS');
  const [seconds, setSeconds] = useState(5);

  useEffect(() => {
    if (!paid) return;
    if (seconds <= 0) {
      router.replace('/dashboard/student/bud');
      return;
    }
    const timer = setTimeout(() => setSeconds((current) => current - 1), 1000);
    return () => clearTimeout(timer);
  }, [paid, router, seconds]);

  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-md items-center px-4 py-10">
      <FadeInUp className="w-full">
        <div className="relative overflow-hidden rounded-[2.5rem] border border-amber-100/50 bg-white/80 p-10 text-center shadow-xl shadow-amber-500/10 dark:border-white/10 dark:bg-[var(--dark-surface)]">
          <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-amber-400/20 blur-3xl" />
          <div className="relative space-y-6">
            {!failed && !paid && (
              <>
                <Loader2 className="mx-auto h-16 w-16 animate-spin text-amber-600" />
                <div className="space-y-2">
                  <h1 className="text-2xl font-black tracking-tight text-light-text-primary dark:text-dark-text-primary">
                    Confirming payment
                  </h1>
                  <p className="text-light-text-secondary dark:text-dark-text-secondary">
                    Hang on while Paystack confirms your Bud plan.
                  </p>
                </div>
              </>
            )}
            {paid && (
              <>
                <CheckCircle2 className="mx-auto h-16 w-16 text-amber-500" />
                <div className="space-y-2">
                  <h1 className="text-2xl font-black tracking-tight text-light-text-primary dark:text-dark-text-primary">
                    You&apos;re in
                  </h1>
                  <p className="text-light-text-secondary dark:text-dark-text-secondary">
                    Chat is unlocked. Taking you back to Bud in {seconds}s.
                  </p>
                </div>
                <Link href="/dashboard/student/bud" className="block">
                  <Button fullWidth bgColor="bg-amber-600 hover:bg-amber-500" textColor="text-white" className="rounded-2xl">
                    Back to Bud
                  </Button>
                </Link>
              </>
            )}
            {failed && (
              <>
                <XCircle className="mx-auto h-16 w-16 text-red-500" />
                <div className="space-y-2">
                  <h1 className="text-2xl font-black tracking-tight text-light-text-primary dark:text-dark-text-primary">
                    Payment not confirmed
                  </h1>
                  <p className="text-light-text-secondary dark:text-dark-text-secondary">
                    {reference
                      ? 'We could not verify that payment. Your cards still work.'
                      : 'This return link is missing a payment reference.'}
                  </p>
                </div>
                <Link href="/dashboard/student/bud/subscribe" className="block">
                  <Button fullWidth variant="outline" className="rounded-2xl">
                    Back to plans
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </FadeInUp>
    </div>
  );
}

export default function BudSubscribeCallbackPage() {
  return (
    <ProtectedRoute roles={['STUDENT']}>
      <Suspense
        fallback={
          <div className="flex min-h-[70vh] items-center justify-center">
            <Loader2 className="h-12 w-12 animate-spin text-amber-600" />
          </div>
        }
      >
        <BudCallbackContent />
      </Suspense>
    </ProtectedRoute>
  );
}
