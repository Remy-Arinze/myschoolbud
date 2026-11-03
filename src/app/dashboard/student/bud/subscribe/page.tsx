'use client';

import Link from 'next/link';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Button } from '@/components/ui/Button';
import { BudPageSkeleton, BudShell } from '@/components/bud/BudShell';
import { useGetBudMeQuery, useGetBudPlansQuery, useSubscribeBudMutation } from '@/lib/store/api/budApi';
import toast from 'react-hot-toast';

function intervalLabel(interval: string) {
  if (interval === 'MONTHLY') return 'per month';
  if (interval === 'TERMLY') return 'per term';
  return 'paid plan';
}

function creditLabel(credits: number) {
  if (credits < 0) return 'Unlimited study credits';
  return `${credits.toLocaleString()} study credits`;
}

export default function BudSubscribePage() {
  const { data, isLoading } = useGetBudPlansQuery();
  const { data: me } = useGetBudMeQuery();
  const [subscribe, { isLoading: starting }] = useSubscribeBudMutation();
  const plans = (Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : []).filter(
    (plan: any) => plan.interval !== 'TRIAL' && plan.slug !== 'bud-trial',
  );
  const sub = (me?.data || me)?.subscription;
  const currentPlanId = sub?.status === 'ACTIVE' ? sub.planId || sub.plan?.id : null;

  return (
    <ProtectedRoute roles={['STUDENT']}>
      {isLoading && plans.length === 0 ? (
        <BudPageSkeleton />
      ) : (
        <BudShell>
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-black tracking-tight text-light-text-primary dark:text-dark-text-primary">
                Bud subscription
              </h1>
              <p className="mt-1 text-sm text-light-text-secondary dark:text-dark-text-secondary">
                Paid by you, or a parent email on your account. Separate from school fees. Reviews still work without this.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {plans.map((plan: any) => {
                const current = currentPlanId === plan.id;
                return (
                  <div key={plan.id} className="flex flex-col rounded-[2rem] border border-amber-100/80 bg-white/70 p-5 dark:border-white/10 dark:bg-white/5">
                    <div className="flex items-start justify-between gap-2">
                      <h2 className="text-lg font-bold text-light-text-primary dark:text-dark-text-primary">{plan.name}</h2>
                      {current && (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900 dark:bg-amber-500/20 dark:text-amber-100">
                          Your plan
                        </span>
                      )}
                    </div>
                    <p className="mt-3 text-3xl font-black text-light-text-primary dark:text-dark-text-primary">
                      ₦{(plan.priceKobo / 100).toLocaleString()}
                    </p>
                    <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">{intervalLabel(plan.interval)}</p>
                    <ul className="mt-4 space-y-2 text-sm text-light-text-secondary dark:text-dark-text-secondary">
                      <li>{plan.chatEnabled ? 'Chat with your buddy' : 'Cards with your buddy'}</li>
                      <li>Reviews beyond the free daily limit</li>
                      <li>{creditLabel(plan.aiCredits)}</li>
                    </ul>
                    <Button
                      className="mt-5 rounded-2xl"
                      fullWidth
                      disabled={starting || current}
                      bgColor="bg-amber-600 hover:bg-amber-500"
                      textColor="text-white"
                      onClick={async () => {
                        try {
                          const res = await subscribe({
                            planId: plan.id,
                            callbackUrl: `${window.location.origin}/dashboard/student/bud/subscribe/callback`,
                          }).unwrap();
                          const url = res?.data?.authorizationUrl || res?.authorizationUrl;
                          if (url) window.location.href = url;
                          else toast.error('Could not start payment');
                        } catch (error: any) {
                          toast.error(error?.data?.message || error?.message || 'Payment failed');
                        }
                      }}
                    >
                      {current ? 'Current plan' : 'Continue to Paystack'}
                    </Button>
                  </div>
                );
              })}
            </div>
            <Link href="/dashboard/student/bud" className="inline-block text-sm text-amber-800 underline-offset-4 hover:underline dark:text-amber-200">
              Back to Bud
            </Link>
          </div>
        </BudShell>
      )}
    </ProtectedRoute>
  );
}
