'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSelector } from 'react-redux';
import { RootState } from '@/lib/store/store';
import { useSubscription, SubscriptionTier } from '@/hooks/useSubscription';
import {
  useGetPublicPlansQuery,
  useGetPlansForSchoolQuery,
  type SubscriptionPlanDto,
  type FeatureDto,
} from '@/lib/store/api/subscriptionsApi';
import { Check, X, Sparkles, Building2 } from 'lucide-react';
import { FadeInUp } from '@/components/ui/FadeInUp';

const ENTERPRISE_MAILTO =
  'mailto:sales@myschoolbud.com?subject=Enterprise%20Plan%20Inquiry&body=School%20name%3A%0AApproximate%20student%20count%3A%0ABranches%3A%0AContact%20email%2Fphone%3A%0ANotes%3A';

// Pro Plus AI credits (25 000) × 5
const ENTERPRISE_AI_CREDITS = 125_000;

const ENTERPRISE_FEATURES: FeatureDto[] = [
  { text: 'Unlimited students', included: true },
  { text: 'Unlimited teachers & admin users', included: true },
  { text: `${ENTERPRISE_AI_CREDITS.toLocaleString('en-NG')} Myschoolbud AI credits / month`, included: true, isGlowing: true },
  { text: 'Full AI Suite — all LOIS features', included: true, isGlowing: true },
  { text: 'Multi-branch / campus support', included: true },
  { text: 'Custom integrations', included: true },
  { text: 'Dedicated onboarding & success contact', included: true },
  { text: 'Bespoke SLA & data residency', included: true },
];

// ── helpers ──────────────────────────────────────────────────────────────────

function toFiniteNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const n = typeof value === 'number' ? value : parseFloat(String(value).replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
}

function formatNairaAmount(amount: number): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Drop DB feature bullets that duplicate caps / credits so we can render from plan fields (source of truth). */
function isStaleCapacityFeature(text: string): boolean {
  const t = text.trim();
  return (
    /^(\d{1,7}|Unlimited)\s+students\b/i.test(t) ||
    /^(\d{1,7}|Unlimited)\s+teachers?\b/i.test(t) ||
    /^(\d{1,7}|Unlimited)\s+admin\b/i.test(t) ||
    /^\d{1,7}\s+(Myschoolbud|School Bud) AI credits\b/i.test(t) ||
    /^\d{1,7}\s+Agora AI credits\b/i.test(t) ||
    /^No (Myschoolbud|School Bud) AI\b/i.test(t) ||
    /^No Agora AI\b/i.test(t) ||
    /^Unlimited (Myschoolbud|School Bud) AI credits\b/i.test(t) ||
    /^Unlimited Agora AI credits\b/i.test(t)
  );
}

function aiCreditsFeature(plan: SubscriptionPlanDto): FeatureDto {
  if (plan.aiCredits === -1) {
    return { text: 'Unlimited Myschoolbud AI credits / month', included: true, isGlowing: true };
  }
  if (plan.aiCredits === 0) {
    return { text: 'Myschoolbud AI Assistant & grading', included: false };
  }
  return {
    text: `${plan.aiCredits.toLocaleString('en-NG')} Myschoolbud AI credits / month`,
    included: true,
    isGlowing: true,
  };
}

function capacityFeatures(plan: SubscriptionPlanDto): FeatureDto[] {
  const students: FeatureDto =
    plan.maxStudents === -1
      ? { text: 'Unlimited students', included: true }
      : { text: `${Number(plan.maxStudents).toLocaleString('en-NG')} students`, included: true };
  const teachers: FeatureDto =
    plan.maxTeachers === -1
      ? { text: 'Unlimited teachers', included: true }
      : { text: `${Number(plan.maxTeachers).toLocaleString('en-NG')} teachers`, included: true };
  const admins: FeatureDto =
    plan.maxAdmins === -1
      ? { text: 'Unlimited admin users', included: true }
      : { text: `${Number(plan.maxAdmins).toLocaleString('en-NG')} admin users`, included: true };
  return [students, teachers, admins];
}

function mergePlanFeatures(plan: SubscriptionPlanDto): FeatureDto[] {
  const tail = (plan.features || []).filter((f) => !isStaleCapacityFeature(f.text));
  return [...capacityFeatures(plan), aiCreditsFeature(plan), ...tail];
}

// ── component ─────────────────────────────────────────────────────────────────

interface PricingTableProps {
  onSelectPlan?: (tier: SubscriptionTier, isYearly: boolean) => void;
  className?: string;
}

export function PricingTable({ onSelectPlan, className = '' }: PricingTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isYearly] = useState(false);
  const [loadingTier, setLoadingTier] = useState<SubscriptionTier | null>(null);

  const user = useSelector((state: RootState) => state.auth.user);
  const isAuthenticated = !!user;

  const { subscription, canUpgradeTo, upgrade } = useSubscription();
  const currentTier = subscription?.tier || SubscriptionTier.FREE;

  const { data: publicPlansResponse, isLoading: isLoadingPublic } = useGetPublicPlansQuery(undefined, {
    skip: isAuthenticated,
  });
  const { data: schoolPlansResponse, isLoading: isLoadingSchool } = useGetPlansForSchoolQuery(undefined, {
    skip: !isAuthenticated,
  });

  const plans = useMemo(() => {
    const raw = isAuthenticated
      ? (schoolPlansResponse?.data ?? [])
      : (publicPlansResponse?.data ?? []);
    // FREE tier still exists but is not marketed here — hide it from the public grid
    return raw.filter((p) => p.tierCode !== SubscriptionTier.FREE);
  }, [isAuthenticated, schoolPlansResponse, publicPlansResponse]);

  const isLoading = isAuthenticated ? isLoadingSchool : isLoadingPublic;

  // Auto-trigger plan selection if returning from auth with ?plan= param
  useEffect(() => {
    const planFromUrl = searchParams?.get('plan') as SubscriptionTier;
    if (isAuthenticated && planFromUrl && !isLoading && plans.length > 0) {
      const selectedPlan = plans.find((p) => p.tierCode === planFromUrl);
      if (selectedPlan && canUpgradeTo(planFromUrl)) {
        document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' });
        window.history.replaceState({}, '', window.location.pathname);
        handleSelectPlan(planFromUrl);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, isLoading, plans, searchParams]);

  const handleSelectPlan = async (tier: SubscriptionTier) => {
    if (!isAuthenticated) {
      router.push(`/auth/login?plan=${tier}`);
      return;
    }
    setLoadingTier(tier);
    try {
      if (onSelectPlan) {
        await onSelectPlan(tier, isYearly);
      } else if (canUpgradeTo(tier)) {
        const result = await upgrade(tier, isYearly);
        if (result.success && result.url) window.location.href = result.url;
      }
    } finally {
      setLoadingTier(null);
    }
  };

  const formatPrice = (price: unknown, tierCode: string) => {
    const n = toFiniteNumber(price);
    if (tierCode === SubscriptionTier.PRO_PLUS && (n === null || n === 0)) return 'Contact Sales';
    if (n === null || n === 0) return 'Free';
    return formatNairaAmount(n);
  };

  if (isLoading) {
    return (
      <div className={`grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch max-w-7xl mx-auto ${className}`}>
        {[0, 1, 2].map((i) => (
          <div key={i} className="animate-pulse bg-light-card dark:bg-dark-surface h-[600px] rounded-3xl border border-light-border dark:border-dark-border" />
        ))}
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch max-w-7xl mx-auto">

        {/* ── DB-driven plans (Pro, Pro+) ─────────────────────────────── */}
        {plans.map((plan, i) => {
          const rawPrice = isYearly ? plan.yearlyPrice : plan.monthlyPrice;
          const price = toFiniteNumber(rawPrice);
          const displayFeatures = mergePlanFeatures(plan);
          const isCurrentPlan = plan.tierCode === currentTier;
          const canSelect = canUpgradeTo(plan.tierCode as SubscriptionTier);
          const isPrimary = plan.accent === 'blue';

          return (
            <FadeInUp
              key={plan.tierCode}
              from={{ opacity: 0, y: 30 }}
              to={{ opacity: 1, y: 0 }}
              duration={0.5}
              delay={i * 0.1}
              className={`relative flex flex-col h-full bg-light-card dark:bg-dark-surface rounded-3xl transition-all duration-500 ${
                plan.highlight
                  ? 'border-2 border-primary dark:border-primary scale-[1.02] z-10'
                  : 'border border-light-border dark:border-dark-border'
              }`}
            >
              {plan.highlight && (
                <div className="absolute -top-4 inset-x-0 flex justify-center">
                  <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-blue-500 text-white font-bold uppercase tracking-wider shadow-md">
                    <span style={{ fontSize: 'var(--text-small)' }}>Most Popular</span>
                  </div>
                </div>
              )}

              <div className="p-8 flex-1 flex flex-col">
                <div className="mb-6">
                  <h3
                    className={`font-bold mb-1 ${isPrimary ? 'text-blue-600 dark:text-blue-400' : 'text-light-text-primary dark:text-dark-text-primary'}`}
                    style={{ fontSize: 'var(--text-section-title)' }}
                  >
                    {plan.name}
                  </h3>
                  <p className="text-light-text-secondary dark:text-dark-text-secondary h-10" style={{ fontSize: 'var(--text-body)' }}>
                    {plan.description}
                  </p>
                </div>

                <div className="mb-5 pb-5 border-b border-light-border dark:border-dark-border flex flex-col gap-2">
                  <div className="flex items-end gap-2">
                    <div className="font-bold text-light-text-primary dark:text-dark-text-primary tracking-tight text-4xl tabular-nums">
                      {formatPrice(rawPrice, plan.tierCode)}
                    </div>
                    {price !== null && price > 0 && (
                      <div className="text-light-text-secondary dark:text-dark-text-secondary font-medium mb-1" style={{ fontSize: 'var(--text-body)' }}>
                        /mo
                      </div>
                    )}
                  </div>
                  {toFiniteNumber(plan.yearlyPrice) && toFiniteNumber(plan.monthlyPrice) && toFiniteNumber(plan.monthlyPrice)! > 0 ? (
                    <div className="text-xs text-green-600 dark:text-green-500 px-3 py-1 rounded-full w-fit">
                      Save one month with annual billing
                    </div>
                  ) : null}
                </div>

                <ul className="flex-1 space-y-4 mb-8">
                  {displayFeatures.map((feature, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <div className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center ${
                        feature.included
                          ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400'
                          : 'bg-gray-100 text-light-text-muted dark:bg-gray-800 dark:text-dark-text-muted'
                      }`}>
                        {feature.included ? <Check className="w-3 h-3 stroke-[3]" /> : <X className="w-3 h-3 stroke-[3]" />}
                      </div>
                      <span
                        className={
                          feature.included
                            ? feature.isGlowing
                              ? 'font-semibold text-blue-600 dark:text-blue-400'
                              : 'text-light-text-primary dark:text-dark-text-primary font-medium'
                            : 'text-light-text-muted dark:text-dark-text-muted'
                        }
                        style={{ fontSize: 'var(--text-body)' }}
                      >
                        {feature.text}
                      </span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleSelectPlan(plan.tierCode)}
                  disabled={isCurrentPlan || loadingTier !== null || !canSelect}
                  className={`w-full py-4 px-6 rounded-xl font-bold transition-all duration-300 ${
                    isCurrentPlan
                      ? 'bg-light-bg dark:bg-dark-bg text-light-text-muted dark:text-dark-text-muted cursor-not-allowed border border-light-border dark:border-dark-border'
                      : plan.highlight
                        ? 'bg-blue-600 hover:bg-blue-700 text-white border border-transparent'
                        : canSelect
                          ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 border border-transparent hover:bg-gray-800 dark:hover:bg-gray-100'
                          : 'bg-light-bg dark:bg-dark-bg text-light-text-muted dark:text-dark-text-muted cursor-not-allowed border border-light-border dark:border-dark-border'
                  }`}
                  style={{ fontSize: 'var(--text-body)' }}
                >
                  {loadingTier === plan.tierCode
                    ? 'Processing...'
                    : !isAuthenticated
                      ? 'Get Started'
                      : isCurrentPlan
                        ? 'Current Active Plan'
                        : plan.cta}
                </button>
              </div>
            </FadeInUp>
          );
        })}

        {/* ── Static Enterprise card (marketing — not yet purchasable) ── */}
        <FadeInUp
          from={{ opacity: 0, y: 30 }}
          to={{ opacity: 1, y: 0 }}
          duration={0.5}
          delay={plans.length * 0.1}
          className="relative flex flex-col h-full rounded-3xl border border-amber-300/60 dark:border-amber-600/40 bg-amber-50 dark:bg-dark-surface transition-all duration-500"
        >
          <div className="absolute -top-4 inset-x-0 flex justify-center">
            <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-amber-500 text-white font-bold uppercase tracking-wider shadow-md">
              <Building2 className="w-3.5 h-3.5" />
              <span style={{ fontSize: 'var(--text-small)' }}>Enterprise</span>
            </div>
          </div>

          <div className="p-8 flex-1 flex flex-col">
            <div className="mb-6">
              <h3
                className="font-bold mb-1 text-amber-700 dark:text-amber-400"
                style={{ fontSize: 'var(--text-section-title)' }}
              >
                Enterprise
              </h3>
              <p className="text-light-text-secondary dark:text-dark-text-secondary h-10" style={{ fontSize: 'var(--text-body)' }}>
                For large institutions and multi-campus networks that need no limits.
              </p>
            </div>

            <div className="mb-5 pb-5 border-b border-amber-200/60 dark:border-amber-700/40 flex flex-col gap-2">
              <div className="font-bold text-light-text-primary dark:text-dark-text-primary tracking-tight text-4xl">
                Let&apos;s talk
              </div>
              <div className="text-xs text-light-text-secondary dark:text-dark-text-secondary">
                Pricing tailored to your institution&apos;s size and requirements.
              </div>
            </div>

            <ul className="flex-1 space-y-4 mb-8">
              {ENTERPRISE_FEATURES.map((feature, index) => (
                <li key={index} className="flex items-start gap-3">
                  <div className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                  <span
                    className={feature.isGlowing ? 'font-semibold text-amber-700 dark:text-amber-400' : 'text-light-text-primary dark:text-dark-text-primary font-medium'}
                    style={{ fontSize: 'var(--text-body)' }}
                  >
                    {feature.text}
                  </span>
                </li>
              ))}
            </ul>

            <div className="space-y-3">
              <a
                href={ENTERPRISE_MAILTO}
                className="w-full py-4 px-6 rounded-xl font-bold transition-all duration-300 bg-amber-500 hover:bg-amber-600 text-white border border-transparent text-center block"
                style={{ fontSize: 'var(--text-body)' }}
              >
                Contact Sales
              </a>
              <div className="flex items-center justify-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-amber-600 dark:text-amber-500 font-medium" style={{ fontSize: 'var(--text-small)' }}>
                  Self-serve purchase coming soon
                </span>
              </div>
            </div>
          </div>
        </FadeInUp>

      </div>
    </div>
  );
}
