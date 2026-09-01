'use client';

import { FadeInUp } from '@/components/ui/FadeInUp';
import { AnimateInView } from '@/components/ui/AnimateInView';
import { LandingNavbar } from '@/components/layout/LandingNavbar';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';
import { useEffect } from 'react';

const products = [
  {
    id: 'core-platform',
    icon: '🏫',
    name: 'Myschoolbud Core Platform',
    tagline: 'The Foundation of Academic Trust',
    description: 'A complete multi-tenant infrastructure for schools. Manage students, classes, transfers, and records in an offline-first environment.',
    features: [
      'Multi-tenant isolated school portals',
      'Immutable student academic history',
      'Seamless verifiable transfers',
      'Offline-first capabilities',
      'Comprehensive parent portal',
      'Debt checking and verification',
    ],
    accent: 'blue',
    status: 'Live',
  },
  {
    id: 'agora-ai',
    icon: '🤖',
    name: 'Lois',
    tagline: "Myschoolbud's intelligent education assistant",
    description: 'Instantly generate lesson plans, automatically evaluate written essays, and uncover deep insights into student performance using advanced AI.',
    features: [
      'Automated essay and assignment grading',
      'Personalized learning gaps identification',
      'Context-aware lesson plan generation',
      'Intelligent curriculum alignment support',
      'Cohort performance analytics',
      'Deep actionable insights for educators',
    ],
    accent: 'blue',
    status: 'Live',
  },
  {
    id: 'rollcall',
    icon: '📍',
    name: 'RollCall',
    tagline: 'Automated Safety & Attendance',
    description: 'Biometric gate attendance that sends an instant SMS to parents when their child arrives safely, logging exact times seamlessly.',
    features: [
      'Biometric & RFID identification',
      'Instant parent SMS alerts',
      'Real-time automated attendance tracking',
      'Pattern detection for absences',
      'Late arrival tracking',
      'Integrated emergency contact system',
    ],
    accent: 'emerald',
    status: 'Coming Soon',
  },
  {
    id: 'bursary-pro',
    icon: '💸',
    name: 'Bursary Pro',
    tagline: 'Accountant-Grade Financial Engine',
    description: 'Track every Naira seamlessly from tuition to expenditures. Gain total control over the financial health of your school.',
    features: [
      'Complete fee allocation and management',
      'Granular expense tracking',
      'Seamless payment gateway integration',
      'Automated debtor management',
      'Financial analytics and dashboards',
      'Audit-ready customizable reports',
    ],
    accent: 'amber',
    status: 'Coming Soon',
  }
];

export default function ProductsPage() {
  // Hide scrollbar on landing page for aesthetic cohesion
  useEffect(() => {
    document.documentElement.classList.add('scrollbar-hide');
    document.body.classList.add('scrollbar-hide');

    return () => {
      document.documentElement.classList.remove('scrollbar-hide');
      document.body.classList.remove('scrollbar-hide');
    };
  }, []);

  return (
    <div className="min-h-screen bg-[var(--light-bg)] dark:bg-[var(--dark-bg)] text-[var(--light-text-primary)] dark:text-[var(--dark-text-primary)] transition-colors duration-300 overflow-x-hidden">
      <LandingNavbar />

      {/* Hero Section */}
      <section className="pt-40 pb-24 relative overflow-hidden flex items-center justify-center">

        {/* Floating Particles/Shapes for Depth */}
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-agora-blue/10 rounded-full blur-3xl animate-pulse delay-1000" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full">
          <FadeInUp from={{ opacity: 0, y: 30 }} to={{ opacity: 1, y: 0 }} duration={0.8} className="text-center max-w-4xl mx-auto">
            <h1 className="text-5xl md:text-7xl font-bold text-[var(--light-text-primary)] dark:text-[var(--dark-text-primary)] mb-6 tracking-tight leading-tight font-heading">
              Powerful tools.<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--agora-blue)] to-sky-400">Infinite possibilities.</span>
            </h1>
            <p className="text-xl text-[var(--light-text-secondary)] dark:text-[var(--dark-text-secondary)] leading-relaxed max-w-2xl mx-auto">
              A meticulously crafted suite designed to transform every aspect of school management. From AI-powered assistants to bulletproof core infrastructure.
            </p>
          </FadeInUp>
        </div>
      </section>

      {/* Modern Refined Products Section */}
      <section className="py-24 relative" data-navbar-light="true">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] bg-blue-600/5 rounded-full blur-[150px] pointer-events-none" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <AnimateInView className="text-center mb-20">
            <span className="inline-block px-4 py-2 bg-blue-900/30 text-blue-400 rounded-full text-xs font-semibold mb-6 uppercase tracking-widest">
              The Ecosystem
            </span>
          </AnimateInView>

          <AnimateInView from={{ opacity: 0, y: 40 }} to={{ opacity: 1, y: 0 }} stagger={0.15} className="space-y-12">
            {products.map((product, idx) => {
              const accentMap: Record<string, string> = {
                blue: "text-blue-500 from-blue-500/20 to-blue-600/5 bg-blue-500/10 border-blue-500/20",
                indigo: "text-agora-blue from-agora-blue/20 to-agora-blue/5 bg-agora-blue/10 border-agora-blue/20",
                emerald: "text-emerald-500 from-emerald-500/20 to-emerald-600/5 bg-emerald-500/10 border-emerald-500/20",
                amber: "text-amber-500 from-amber-500/20 to-amber-600/5 bg-amber-500/10 border-amber-500/20",
                cyan: "text-cyan-500 from-cyan-500/20 to-cyan-600/5 bg-cyan-500/10 border-cyan-500/20",
              };

              // Safely fallback
              const classes = accentMap[product.accent] || accentMap.blue;
              // Extract colors
              const textClass = classes.split(' ')[0];
              const borderClass = classes.split(' ')[3];
              const bgClass = classes.split(' ')[2];

              const isEven = idx % 2 === 0;

              return (
                <div key={product.id} className="relative rounded-3xl overflow-hidden border border-[var(--light-border)] dark:border-[var(--dark-border)] bg-[var(--light-card)] dark:bg-[var(--dark-surface)] shadow-none group transition-all duration-500">
                  {/* Subtle dynamic background gradient tailored to product */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${classes.split(' ')[1]} ${classes.split(' ')[2]} opacity-10 group-hover:opacity-20 transition-opacity duration-500`} />

                  <div className={`flex flex-col ${isEven ? 'lg:flex-row' : 'lg:flex-row-reverse'} p-8 md:p-14 gap-12 relative z-10`}>

                    {/* Left/Right Text Content */}
                    <div className="flex-1 flex flex-col justify-center">
                      <div className="flex items-center gap-4 mb-6">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border ${borderClass} ${bgClass} text-2xl backdrop-blur-md shadow-lg transform group-hover:scale-110 transition-transform duration-500`}>
                          {product.icon}
                        </div>
                        <div>
                          <h3 className="text-3xl font-bold text-[var(--light-text-primary)] dark:text-[var(--dark-text-primary)] mb-1 tracking-tight font-heading">
                            {product.name}
                          </h3>
                          <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${bgClass} ${textClass} border ${borderClass}`}>
                            {product.status}
                          </span>
                        </div>
                      </div>

                      <h4 className={`text-xl font-semibold ${textClass} mb-4`}>
                        {product.tagline}
                      </h4>
                      <p className="text-lg text-[var(--light-text-secondary)] dark:text-[var(--dark-text-secondary)] leading-relaxed mb-8">
                        {product.description}
                      </p>
                    </div>

                    {/* Right/Left Features Box */}
                    <div className="lg:w-96 shrink-0">
                      <div className="bg-black/20 dark:bg-black/40 border border-white/5 rounded-2xl p-6 h-full backdrop-blur-sm shadow-inner group-hover:border-white/10 transition-colors duration-500">
                        <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-6">
                          Core Capabilities
                        </h4>
                        <ul className="space-y-4">
                          {product.features.map((feature, fIndex) => (
                            <li key={fIndex} className="flex items-start gap-3">
                              <svg className={`w-5 h-5 ${textClass} flex-shrink-0 mt-0.5`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                              </svg>
                              <span className="text-[var(--light-text-secondary)] dark:text-[var(--dark-text-secondary)] text-sm font-medium leading-relaxed">{feature}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                  </div>
                </div>
              );
            })}
          </AnimateInView>
        </div>
      </section>

      {/* Integration Section */}
      <section className="py-32 relative overflow-hidden" data-navbar-light="true">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1200px] h-[1200px] bg-agora-blue/5 rounded-full blur-[150px] pointer-events-none" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <AnimateInView from={{ opacity: 0, x: -30 }} to={{ opacity: 1, x: 0 }}>
              <h2 className="text-4xl md:text-5xl font-bold text-[var(--light-text-primary)] dark:text-[var(--dark-text-primary)] mb-6 leading-tight tracking-tight font-heading">
                An Ecosystem that <br />Works in Sync
              </h2>
              <p className="text-lg text-[var(--light-text-secondary)] dark:text-[var(--dark-text-secondary)] mb-6 leading-relaxed">
                All our products are intrinsically woven into the Myschoolbud Core Platform. Data flows seamlessly without silos.
              </p>
              <p className="text-lg text-[var(--light-text-secondary)] dark:text-[var(--dark-text-secondary)] leading-relaxed">
                When a student enters the gates with RollCall, their attendance immediately informs analytics. Lois leverages real-time understanding to craft perfect assessments and adapt to curriculum changes effortlessly.
                <span className="block mt-4 font-semibold text-[var(--light-text-primary)] dark:text-[var(--dark-text-primary)]">One digital identity. Infinite synergies.</span>
              </p>
            </AnimateInView>

            <AnimateInView from={{ opacity: 0, x: 30 }} to={{ opacity: 1, x: 0 }} className="relative h-96">
              {/* Abstract visualization of the ecosystem */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-48 h-48 bg-blue-600 rounded-full flex items-center justify-center shadow-[0_0_80px_rgba(37,99,235,0.4)] z-20 absolute">
                  <span className="text-white font-bold text-2xl tracking-widest uppercase">Myschoolbud</span>
                </div>

                {/* Orbiting Elements */}
                <div className="absolute w-72 h-72 border border-white/10 rounded-full animate-[spin_20s_linear_infinite]" />
                <div className="absolute w-[450px] h-[450px] border border-white/5 rounded-full animate-[spin_35s_linear_infinite_reverse]" />

                {/* Nodes */}
                <div className="absolute -top-6 w-14 h-14 bg-[var(--light-card)] dark:bg-[var(--dark-surface)] border border-[var(--light-border)] dark:border-[var(--dark-border)] rounded-2xl flex items-center justify-center shadow-lg text-2xl z-30">🤖</div>
                <div className="absolute -bottom-16 w-14 h-14 bg-[var(--light-card)] dark:bg-[var(--dark-surface)] border border-[var(--light-border)] dark:border-[var(--dark-border)] rounded-2xl flex items-center justify-center shadow-lg text-2xl z-30">📍</div>
                <div className="absolute -left-20 w-14 h-14 bg-[var(--light-card)] dark:bg-[var(--dark-surface)] border border-[var(--light-border)] dark:border-[var(--dark-border)] rounded-2xl flex items-center justify-center shadow-lg text-2xl z-30">🏫</div>
                <div className="absolute -right-20 w-14 h-14 bg-[var(--light-card)] dark:bg-[var(--dark-surface)] border border-[var(--light-border)] dark:border-[var(--dark-border)] rounded-2xl flex items-center justify-center shadow-lg text-2xl z-30">💸</div>
              </div>
            </AnimateInView>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 relative overflow-hidden" data-navbar-light="true">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />
        </div>

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <AnimateInView duration={0.8}>
            <h2 className="text-4xl md:text-5xl lg:text-5xl font-bold text-white mb-6 leading-tight tracking-tight">
              Ready to Upgrade Your Institution?
            </h2>
            <p className="text-lg md:text-xl text-gray-300 mb-12 max-w-2xl mx-auto leading-relaxed">
              Start with the core platform and integrate powerful AI plugins seamlessly as you scale.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/auth/login">
                <Button size="lg" variant="primary" className="px-8 py-4 font-bold rounded-full w-full sm:w-auto shadow-lg hover:shadow-blue-500/25 transition-all">
                  Get Started Free
                </Button>
              </Link>
              <Link href="/contact">
                <Button size="lg" variant="white" className="px-8 py-4 font-bold rounded-full w-full sm:w-auto">
                  Contact Sales
                </Button>
              </Link>
            </div>
          </AnimateInView>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[var(--light-bg)] dark:bg-[var(--dark-bg)] text-[var(--light-text-secondary)] dark:text-[var(--dark-text-secondary)] py-12 border-t border-[var(--light-border)] dark:border-[var(--dark-border)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm">&copy; 2026 Myschoolbud. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
