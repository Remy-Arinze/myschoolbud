'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLazyVerifyPaymentQuery } from '@/lib/store/api/paymentsApi';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { CheckCircle2, XCircle, Loader2, ArrowRight } from 'lucide-react';
import { FadeInUp } from '@/components/ui/FadeInUp';
import Link from 'next/link';

import { Suspense } from 'react';

function PaymentCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reference = searchParams?.get('reference') || searchParams?.get('trxref');
  const { user, getDashboardPath } = useAuth();
  const [verifyPayment, { isLoading, data, isError }] = useLazyVerifyPaymentQuery();
  const [redirectCountdown, setRedirectCountdown] = useState(5);

  useEffect(() => {
    if (reference) {
      verifyPayment(reference);
    }
  }, [reference, verifyPayment]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (data?.success && redirectCountdown > 0) {
      timer = setInterval(() => {
        setRedirectCountdown((prev) => prev - 1);
      }, 1000);
    } else if (data?.success && redirectCountdown === 0) {
      const path = user ? getDashboardPath() : '/';
      router.push(path);
    }
    return () => clearInterval(timer);
  }, [data, redirectCountdown, user, getDashboardPath, router]);

  const handleManualRedirect = () => {
    const path = user ? getDashboardPath() : '/';
    router.push(path);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--light-bg)] dark:bg-[var(--dark-bg)] p-4">
      <div className="max-w-md w-full">
        <FadeInUp duration={0.6}>
          <div className="bg-white dark:bg-[var(--dark-surface)] rounded-[2.5rem] p-10 shadow-2xl shadow-blue-500/10 border border-blue-100/20 dark:border-blue-700/10 text-center relative overflow-hidden">
            {/* Background decorative blob */}
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-500/10 dark:bg-blue-500/5 rounded-full blur-3xl" />
            
            {isLoading ? (
              <div className="space-y-6 py-8">
                <div className="flex justify-center">
                  <div className="relative">
                    <div className="absolute inset-0 bg-blue-500/20 blur-xl rounded-full" />
                    <Loader2 className="h-16 w-16 text-blue-600 animate-spin relative z-10" />
                  </div>
                </div>
                <div className="space-y-2">
                  <h1 className="text-2xl font-black text-light-text-primary dark:text-dark-text-primary uppercase tracking-tight">
                    Verifying Payment
                  </h1>
                  <p className="text-light-text-secondary dark:text-dark-text-secondary">
                    Please wait while we confirm your transaction with Paystack...
                  </p>
                </div>
              </div>
            ) : data?.success ? (
              <div className="space-y-6">
                <div className="flex justify-center">
                  <div className="relative">
                    <div className="absolute inset-0 bg-green-500/20 blur-xl rounded-full" />
                    <CheckCircle2 className="h-20 w-20 text-green-500 relative z-10" />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h1 className="text-3xl font-black text-light-text-primary dark:text-dark-text-primary uppercase tracking-tight">
                    Thank You!
                  </h1>
                  <p className="text-light-text-secondary dark:text-dark-text-secondary text-lg">
                    Your subscription has been successfully activated.
                  </p>
                </div>

                <div className="py-4 px-6 bg-green-50 dark:bg-green-900/10 rounded-2xl border border-green-100 dark:border-green-800/20 group">
                  <p className="text-sm font-bold text-green-700 dark:text-green-400">
                    Redirecting you in {redirectCountdown} seconds...
                  </p>
                </div>

                <Button 
                  onClick={handleManualRedirect} 
                  variant="primary" 
                  size="lg" 
                  isFlat
                  className="w-full rounded-2xl font-bold py-4 group"
                >
                  Return to Dashboard
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex justify-center">
                  <div className="relative">
                    <div className="absolute inset-0 bg-red-500/20 blur-xl rounded-full" />
                    <XCircle className="h-20 w-20 text-red-500 relative z-10" />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h1 className="text-2xl font-black text-light-text-primary dark:text-dark-text-primary uppercase tracking-tight">
                    Verification Failed
                  </h1>
                  <p className="text-light-text-secondary dark:text-dark-text-secondary">
                    {isError ? "We couldn't verify your payment reference." : "The transaction could not be confirmed at this time."}
                  </p>
                </div>

                <div className="space-y-3">
                  <Link href={user ? getDashboardPath() : '/'} className="block">
                    <Button variant="outline" size="lg" isFlat className="w-full rounded-2xl font-bold">
                      Return to Home
                    </Button>
                  </Link>
                  <p className="text-xs text-light-text-muted mt-4">
                    If funds were deducted, please contact support at support@myschoolbud.com
                  </p>
                </div>
              </div>
            )}
          </div>
        </FadeInUp>
      </div>
    </div>
  );
}

export default function PaymentCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[var(--light-bg)] dark:bg-[var(--dark-bg)]">
        <Loader2 className="h-12 w-12 text-blue-600 animate-spin" />
      </div>
    }>
      <PaymentCallbackContent />
    </Suspense>
  );
}
