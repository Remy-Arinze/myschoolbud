'use client';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { useGetBudPlansQuery, useSubscribeBudMutation } from '@/lib/store/api/budApi';
import toast from 'react-hot-toast';

export default function BudSubscribePage() {
  const { data } = useGetBudPlansQuery();
  const [subscribe, { isLoading }] = useSubscribeBudMutation();
  const plans = data?.data || data || [];

  return (
    <ProtectedRoute roles={['STUDENT']}>
      <div className="max-w-3xl mx-auto p-6 space-y-4">
        <h1 className="text-2xl font-black">Bud subscription</h1>
        <p className="text-sm text-light-text-secondary">
          Paid by you (or a parent email on your account). Separate from school fees.
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          {(Array.isArray(plans) ? plans : []).map((plan: any) => (
            <Card key={plan.id}>
              <CardHeader>
                <CardTitle>{plan.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-2xl font-bold">₦{(plan.priceKobo / 100).toLocaleString()}</p>
                <p className="text-sm opacity-70">{plan.interval}</p>
                <Button
                  disabled={isLoading}
                  onClick={async () => {
                    try {
                      const res = await subscribe({
                        planId: plan.id,
                        callbackUrl: `${window.location.origin}/dashboard/student/bud/subscribe/callback`,
                      }).unwrap();
                      const url = res?.data?.authorizationUrl || res?.authorizationUrl;
                      if (url) window.location.href = url;
                      else toast.error('Could not start payment');
                    } catch (e: any) {
                      toast.error(e?.data?.message || e?.message || 'Payment failed');
                    }
                  }}
                >
                  Continue to Paystack
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </ProtectedRoute>
  );
}
