'use client';

import { useSubscription, SubscriptionTier } from '@/hooks/useSubscription';
import { useToolAccess } from '@/hooks/useToolAccess';
import { PricingTable } from '@/components/subscriptions/PricingTable';
import { FadeInUp } from '@/components/ui/FadeInUp';
import { Sparkles, Zap, ShieldCheck, ChevronDown, Coins } from 'lucide-react';

import { useCurrentAdminPermissions } from '@/hooks/usePermissions';
import { AiUsageHistory } from '@/components/subscriptions/AiUsageHistory';

export default function SubscriptionPage() {
  const { isPrincipal, isLoading: isLoadingAuth } = useCurrentAdminPermissions();
  const { subscription, summary, isLoading: isLoadingSub } = useSubscription();
  const { aiCredits, accessibleTools } = useToolAccess();

  const isLoading = isLoadingAuth || isLoadingSub;

  if (isLoading) {
    return (
      <div className="p-8 max-w-7xl mx-auto space-y-8 animate-pulse">
        <div className="h-12 w-64 bg-light-card dark:bg-dark-surface rounded-lg"></div>
        <div className="h-[250px] w-full bg-light-card dark:bg-dark-surface rounded-3xl"></div>
        <div className="h-[600px] w-full bg-light-card dark:bg-dark-surface rounded-3xl"></div>
      </div>
    );
  }

  // Final check: Only Principals (Owners, Heads) can access this page
  if (!isPrincipal) {
    return (
      <div className="p-8 max-w-7xl mx-auto text-center py-20">
        <div className="bg-light-card dark:bg-dark-surface rounded-3xl border border-light-border dark:border-dark-border p-12 shadow-sm">
          <ShieldCheck className="w-16 h-16 text-light-text-muted dark:text-dark-text-muted mx-auto mb-6 opacity-20" />
          <h1 className="text-2xl font-bold text-light-text-primary dark:text-dark-text-primary mb-4">
            Access Restricted
          </h1>
          <p className="text-light-text-secondary dark:text-dark-text-secondary max-w-md mx-auto">
            Only designated school leaders (School Owner, Principal, or Head Teacher) are authorized to access billing and subscription management.
          </p>
        </div>
      </div>
    );
  }

  const tier = summary?.tier || SubscriptionTier.FREE;

  const tierInfo: Record<string, { name: string; color: string; bgClass: string; icon: any }> = {
    [SubscriptionTier.FREE]: {
      name: 'Free Plan',
      color: 'text-light-text-primary dark:text-dark-text-primary',
      bgClass: 'bg-gray-50 dark:bg-gray-900/40',
      icon: ShieldCheck
    },
    [SubscriptionTier.PRO]: {
      name: 'Pro',
      color: 'text-blue-600 dark:text-blue-400',
      bgClass: 'bg-blue-50 dark:bg-blue-900/20',
      icon: Sparkles
    },
    [SubscriptionTier.PRO_PLUS]: {
      name: 'Pro+',
      color: 'text-amber-600 dark:text-amber-400',
      bgClass: 'bg-amber-50 dark:bg-amber-900/20',
      icon: ShieldCheck
    },
    [SubscriptionTier.CUSTOM]: {
      name: 'Custom',
      color: 'text-purple-600 dark:text-purple-400',
      bgClass: 'bg-purple-50 dark:bg-purple-900/20',
      icon: Zap
    },
  };

  const currentTierInfo = tierInfo[tier];
  const Icon = currentTierInfo.icon;

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-12">
      {/* Header section */}
      <FadeInUp from={{ opacity: 0, y: 20 }} to={{ opacity: 1, y: 0 }} duration={0.6}>
        <div className="relative overflow-hidden rounded-3xl bg-light-card dark:bg-dark-surface border border-light-border dark:border-dark-">
          <div className="relative p-8 md:p-12">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">

              <div className="max-w-xl space-y-4">
                {(() => {
                  const phase = summary?.billing?.phase;
                  const isExpired = phase === 'ADMIN_ACTION_REQUIRED';
                  const isGrace = phase === 'GRACE_PERIOD';
                  return (
                    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border ${
                      isExpired
                        ? 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800'
                        : isGrace
                        ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800'
                        : 'bg-light-bg dark:bg-dark-bg text-light-text-secondary dark:text-dark-text-secondary border-light-border dark:border-dark-border'
                    }`} style={{ fontSize: 'var(--text-small)' }}>
                      <span className="relative flex h-2 w-2">
                        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                          isExpired ? 'bg-red-400' : isGrace ? 'bg-amber-400' : 'bg-emerald-400'
                        }`}></span>
                        <span className={`relative inline-flex rounded-full h-2 w-2 ${
                          isExpired ? 'bg-red-500' : isGrace ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}></span>
                      </span>
                      {isExpired ? 'Subscription expired' : isGrace ? 'Grace period active' : 'Subscription active'}
                    </div>
                  );
                })()}
                <h1 className="font-extrabold tracking-tight text-light-text-primary dark:text-dark-text-primary" style={{ fontSize: 'var(--text-page-title)' }}>
                  Billing & Plans
                </h1>
                <p className="text-light-text-secondary dark:text-dark-text-secondary leading-relaxed" style={{ fontSize: 'var(--text-body)' }}>
                  Manage your subscription, track your AI token consumption, and unlock the full potential of Myschoolbud.
                </p>
              </div>

              {/* Current Plan Overview Card inside header */}
              <div className={`shrink-0 w-full md:w-80 p-6 rounded-2xl ${currentTierInfo.bgClass} border border-light-border dark:border-dark-border shadow-sm`}>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="uppercase tracking-widest text-light-text-muted dark:text-dark-text-muted mb-1" style={{ fontSize: 'var(--text-small)' }}>
                      Current Plan
                    </p>
                    <h2 className={`font-black ${currentTierInfo.color} flex items-center gap-2`} style={{ fontSize: 'var(--text-card-title)' }}>
                      <Icon className="w-5 h-5" />
                      {currentTierInfo.name}
                    </h2>
                  </div>
                </div>

                {subscription?.endDate && (() => {
                  const endDate = new Date(subscription.endDate);
                  const isExpired = endDate.getTime() < Date.now();
                  const isRecurring = summary?.billing?.isRecurring;
                  const formattedDate = endDate.toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  });
                  return (
                    <div className="space-y-2 mb-6">
                      <p className="font-medium text-light-text-secondary dark:text-dark-text-secondary" style={{ fontSize: 'var(--text-small)' }}>
                        {isExpired ? (
                          <span className="text-red-600 dark:text-red-400 font-semibold">
                            Expired on {formattedDate}
                          </span>
                        ) : (
                          <>
                            {isRecurring ? 'Next charge on' : 'Renews on'}{' '}
                            <span className="font-bold">{formattedDate}</span>
                          </>
                        )}
                      </p>
                      {isRecurring && (
                        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/50 text-[10px] font-bold uppercase tracking-wider">
                          <Zap className="w-3 h-3" />
                          Auto-Renew On
                        </div>
                      )}
                    </div>
                  );
                })()}

                <div className="space-y-4 pt-4 border-t border-light-border dark:border-dark-border">
                  <div className="flex justify-between items-center" style={{ fontSize: 'var(--text-body)' }}>
                    <span className="text-light-text-secondary dark:text-dark-text-secondary font-medium">Myschoolbud AI Tokens</span>
                    <span className="font-bold text-light-text-primary dark:text-dark-text-primary">
                      {aiCredits.remaining === -1 ? 'Unlimited' : `${aiCredits.remaining.toLocaleString()}`}
                      {aiCredits.total > 0 && aiCredits.total !== -1 && (
                        <span className="text-light-text-muted dark:text-dark-text-muted font-medium"> / {aiCredits.total.toLocaleString()}</span>
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between items-center" style={{ fontSize: 'var(--text-body)' }}>
                    <span className="text-light-text-secondary dark:text-dark-text-secondary font-medium">Admin Seats</span>
                    <span className="font-bold text-light-text-primary dark:text-dark-text-primary">
                      {summary?.limits.maxAdmins === -1 ? 'Unlimited' : summary?.limits.maxAdmins}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </FadeInUp>

      {/* AI Usage & Metrics Section */}
      <FadeInUp from={{ opacity: 0, y: 30 }} to={{ opacity: 1, y: 0 }} duration={0.6} delay={0.1}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Main Log Table */}
          <div className="lg:col-span-2">
            <AiUsageHistory />
          </div>

          {/* Sidebar Metrics/Info */}
          <div className="space-y-6">
            <div className={`relative overflow-hidden group p-8 rounded-3xl border border-light-border dark:border-dark-border shadow-xl ${tier === SubscriptionTier.FREE
              ? 'bg-gradient-to-br from-blue-600 to-indigo-700 text-white'
              : 'bg-light-card dark:bg-dark-surface'
              }`}>
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-6 opacity-70">
                  <Sparkles className="w-5 h-5 text-amber-300" />
                  <span className="font-bold tracking-widest uppercase text-[10px]">AI Utilization</span>
                </div>

                <h3 className={`text-2xl font-black mb-4 ${tier === SubscriptionTier.FREE ? 'text-white' : 'text-light-text-primary dark:text-dark-text-primary'
                  }`}>
                  Scale your school with AI power
                </h3>

                <p className={`mb-8 text-sm leading-relaxed ${tier === SubscriptionTier.FREE ? 'text-blue-50/80' : 'text-light-text-secondary dark:text-dark-text-secondary'
                  }`}>
                  {tier === SubscriptionTier.FREE
                    ? "Upgrade to Myschoolbud PRO to give every teacher their own AI assistant for quizzes and grading."
                    : "You are currently unlocking thousands of teacher hours through Myschoolbud's proprietary AI engine."
                  }
                </p>

                {tier === SubscriptionTier.FREE && (
                  <button
                    onClick={() => {
                      const pricingSection = document.getElementById('pricing-plans');
                      pricingSection?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="w-full bg-white text-blue-600 py-3 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all"
                  >
                    View Upgrade Plans
                  </button>
                )}
              </div>

              {tier === SubscriptionTier.FREE && (
                <>
                  <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700"></div>
                  <div className="absolute -left-10 -top-10 w-32 h-32 bg-indigo-400/20 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
                </>
              )}
            </div>

            <div className="bg-light-card dark:bg-dark-surface rounded-3xl border border-light-border dark:border-dark-border p-8">
              <h4 className="font-bold text-light-text-primary dark:text-dark-text-primary mb-6 flex items-center gap-2">
                <Coins className="w-4 h-4 text-amber-500" />
                Myschoolbud AI Tokens Rate
              </h4>
              <div className="space-y-4">
                {[
                  { label: 'Short Quiz', cost: '5 credits' },
                  { label: 'Lesson Plan', cost: '10 credits' },
                  { label: 'Full Assessment', cost: '15 credits' },
                  { label: 'Essay Grading', cost: '3 credits' },
                  { label: 'Study Summary', cost: '2 credits' },
                ].map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center py-2.5 border-b border-light-border/40 dark:border-dark-border/40 last:border-0 hover:bg-light-bg/50 dark:hover:bg-dark-bg/50 transition-colors px-1 rounded-lg">
                    <span className="text-light-text-secondary dark:text-dark-text-secondary font-medium" style={{ fontSize: 'var(--text-small)' }}>{item.label}</span>
                    <span className="font-bold text-light-text-primary dark:text-dark-text-primary" style={{ fontSize: 'var(--text-small)' }}>{item.cost}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </FadeInUp>

      {/* Pricing Section */}
      <div id="pricing-plans" />
      <FadeInUp from={{ opacity: 0, scale: 0.95 }} to={{ opacity: 1, scale: 1 }} duration={0.6} delay={0.1}>
        <div className="text-center mb-10 mt-16">
          <h2 className="font-extrabold text-light-text-primary dark:text-dark-text-primary mb-4 text-lg">
            {tier === SubscriptionTier.FREE ? 'Upgrade your workflow' : 'Manage your scaling'}
          </h2>
          <p className="text-light-text-secondary dark:text-dark-text-secondary max-w-2xl mx-auto" style={{ fontSize: 'var(--text-body)' }}>
            Myschoolbud AI generates high-quality curriculum, quizzes, and automated essay grades so your teachers can focus on teaching.
          </p>
        </div>

        <PricingTable />
      </FadeInUp>

      {/* Modern FAQ */}
      <FadeInUp from={{ opacity: 0, y: 30 }} to={{ opacity: 1, y: 0 }} duration={0.6} delay={0.2} className="pt-20">
        <div className="bg-light-card dark:bg-dark-surface rounded-3xl border border-light-border dark:border-dark-border p-8 md:p-12">
          <div className="flex flex-col md:flex-row gap-12">
            <div className="md:w-1/3">
              <div className="sticky top-8">
                <h3 className="font-bold text-light-text-primary dark:text-dark-text-primary mb-4" style={{ fontSize: 'var(--text-section-title)' }}>
                  Common questions
                </h3>
                <p className="text-light-text-secondary dark:text-dark-text-secondary" style={{ fontSize: 'var(--text-body)' }}>
                  Everything you need to know about billing, AI credits, and upgrading.
                </p>
                <div className="mt-8">
                  <a href="mailto:support@myschoolbud.com" className="inline-flex items-center gap-2 font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 transition-colors" style={{ fontSize: 'var(--text-body)' }}>
                    Get in touch
                  </a>
                </div>
              </div>
            </div>

            <div className="md:w-2/3 space-y-6">
              {[
                {
                  q: 'What happens when I upgrade?',
                  a: 'Your new plan activates immediately. You get instant access to the Myschoolbud AI engine and your AI credits align to the new tier\'s allowance (e.g., 10,000 Myschoolbud credits on Pro), with any unused balance from the prior paid period rolled in on renewal where applicable.'
                },
                {
                  q: 'How do AI Credits work?',
                  a: 'Every time a teacher generates a lesson plan, quiz, or grades an essay, Myschoolbud credits are consumed based on model usage. Higher tiers include larger monthly credit pools (e.g., 25,000 on Pro+).'
                },
                {
                  q: 'What if we run out of tokens mid-month?',
                  a: 'Your token bank resets automatically at the start of your billing cycle. If you hit your limit early, contact us or use the "Top Up" feature (coming soon) to buy discounted Token Packs instantly.'
                },
                {
                  q: 'Can I downgrade my plan?',
                  a: 'Yes, you can cancel or downgrade at any time. Your current plan will remain active for the remainder of the billing period.'
                }
              ].map((faq, i) => (
                <details key={i} className="group overflow-hidden rounded-2xl bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border">
                  <summary className="flex justify-between items-center cursor-pointer p-6 list-none font-semibold text-light-text-primary dark:text-dark-text-primary transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50" style={{ fontSize: 'var(--text-body)' }}>
                    {faq.q}
                    <ChevronDown className="w-5 h-5 text-light-text-muted dark:text-dark-text-muted group-open:-rotate-180 transition-transform duration-300" />
                  </summary>
                  <div className="px-6 pb-6 text-light-text-secondary dark:text-dark-text-secondary leading-relaxed" style={{ fontSize: 'var(--text-body)' }}>
                    {faq.a}
                  </div>
                </details>
              ))}
            </div>
          </div>
        </div>
      </FadeInUp>
    </div>
  );
}
