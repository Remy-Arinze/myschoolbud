'use client';

import { FadeInUp } from '@/components/ui/FadeInUp';
import { AnimateInView } from '@/components/ui/AnimateInView';
import { LandingNavbar } from '@/components/layout/LandingNavbar';
import { Card, CardContent } from '@/components/ui/Card';
import Link from 'next/link';
import {
  GraduationCap,
  Users,
  BarChart3,
  RefreshCw,
  ShieldCheck,
  History,
  AlertTriangle,
  ArrowLeftRight,
  Rocket,
  Eye,
  CheckCircle2,
  ChevronRight
} from 'lucide-react';

const teamMembers = [
  {
    name: 'Leadership Team',
    role: 'Building the future of African education',
    description: 'A passionate team of educators, engineers, and entrepreneurs dedicated to transforming how education records are managed across Africa.',
  },
];

const coreFeatures = [
  {
    icon: <GraduationCap className="w-6 h-6 text-blue-500" />,
    title: 'Student Management',
    description: 'Complete student lifecycle management from admission to graduation.',
  },
  {
    icon: <Users className="w-6 h-6 text-indigo-500" />,
    title: 'Teacher Portal',
    description: 'Streamlined tools for attendance, grading, and classroom management.',
  },
  {
    icon: <BarChart3 className="w-6 h-6 text-emerald-500" />,
    title: 'Analytics Dashboard',
    description: 'Real-time insights into school performance and student progress.',
  },
  {
    icon: <RefreshCw className="w-6 h-6 text-purple-500" />,
    title: 'Seamless Transfers',
    description: 'One-click student transfers with complete academic history.',
  },
  {
    icon: <ShieldCheck className="w-6 h-6 text-agora-blue" />,
    title: 'Chain-of-Trust',
    description: 'Cryptographically secured records that cannot be tampered with.',
  },
];

const milestones = [
  { year: '2024', title: 'Founded', description: 'School Bud was born from the vision of creating a unified digital identity for every African student.' },
  { year: '2024', title: 'First Schools', description: 'Launched pilot program with select schools in Lagos, Nigeria.' },
  { year: '2025', title: 'Expansion', description: 'Growing our network across Nigeria and preparing for Pan-African expansion.' },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[var(--light-bg)] dark:bg-[var(--dark-bg)] text-[var(--light-text-primary)] dark:text-[var(--dark-text-primary)] transition-colors duration-300 overflow-x-hidden relative">
      <LandingNavbar />

      {/* Background Glows (Same as landing page) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/5 dark:bg-blue-600/10 rounded-full blur-[120px]" />
        <div className="absolute top-1/2 left-0 -translate-x-1/2 w-[600px] h-[600px] bg-indigo-600/5 dark:bg-indigo-600/10 rounded-full blur-[140px]" />
        <div className="absolute bottom-0 right-0 translate-y-1/2 w-[800px] h-[800px] bg-agora-blue/5 dark:bg-agora-blue/10 rounded-full blur-[160px]" />
      </div>

      {/* Hero Section */}
      <section className="pt-40 pb-24 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <FadeInUp from={{ opacity: 0, y: 30 }} to={{ opacity: 1, y: 0 }} duration={0.8} className="text-center max-w-4xl mx-auto">
            <h1 className="text-3xl md:text-5xl font-bold text-[var(--light-text-primary)] dark:text-[var(--dark-text-primary)] mb-6 font-heading leading-tight tracking-tight">
              About <span className="text-agora-blue">School Bud</span>
            </h1>
            <p
              className="text-[var(--light-text-secondary)] dark:text-[var(--dark-text-secondary)] leading-relaxed max-w-2xl mx-auto"
              style={{ fontSize: 'var(--text-page-subtitle)' }}
            >
              We&apos;re building the digital bridge that connects every stage of African education—giving
              every student a permanent, verifiable identity that lasts a lifetime.
            </p>
          </FadeInUp>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="py-24 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-20">
            <AnimateInView from={{ opacity: 0, x: -30 }} to={{ opacity: 1, x: 0 }} duration={0.8}>
              <div className="flex flex-col h-full bg-white/50 dark:bg-white/5 backdrop-blur-sm p-10 rounded-[2.5rem] border border-[var(--light-border)] dark:border-white/10 shadow-sm hover:shadow-xl transition-all duration-500 group">
                <div className="w-14 h-14 bg-blue-500/10 dark:bg-blue-500/20 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
                  <Rocket className="w-6 h-6 text-blue-500" />
                </div>
                <h2
                  className="font-bold text-[var(--light-text-primary)] dark:text-[var(--dark-text-primary)] mb-4 font-heading tracking-tight"
                  style={{ fontSize: 'var(--text-page-title)' }}
                >
                  Our Mission
                </h2>
                <p
                  className="text-[var(--light-text-secondary)] dark:text-[var(--dark-text-secondary)] leading-relaxed mb-6"
                  style={{ fontSize: 'var(--text-body)' }}
                >
                  To eliminate lost records and fraudulent credentials through the creation of a universal, cryptographically secured education registry for all African schools.
                </p>
                <div className="mt-auto flex items-center gap-2 text-agora-blue font-semibold" style={{ fontSize: 'var(--text-small)' }}>
                  <span>Learn about our Registry</span>
                  <ChevronRight className="w-3 h-3" />
                </div>
              </div>
            </AnimateInView>

            <AnimateInView from={{ opacity: 0, x: 30 }} to={{ opacity: 1, x: 0 }} duration={0.8}>
              <div className="flex flex-col h-full bg-white/50 dark:bg-white/5 backdrop-blur-sm p-10 rounded-[2.5rem] border border-[var(--light-border)] dark:border-white/10 shadow-sm hover:shadow-xl transition-all duration-500 group">
                <div className="w-14 h-14 bg-indigo-500/10 dark:bg-indigo-600/20 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
                  <Eye className="w-6 h-6 text-indigo-500" />
                </div>
                <h2
                  className="font-bold text-[var(--light-text-primary)] dark:text-[var(--dark-text-primary)] mb-4 font-heading tracking-tight"
                  style={{ fontSize: 'var(--text-page-title)' }}
                >
                  Our Vision
                </h2>
                <p
                  className="text-[var(--light-text-secondary)] dark:text-[var(--dark-text-secondary)] leading-relaxed mb-6"
                  style={{ fontSize: 'var(--text-body)' }}
                >
                  An Africa where educational achievements are universally trusted, credits transfer instantly between borders, and every learner holds the key to their own future.
                </p>
                <div className="mt-auto flex items-center gap-2 text-indigo-500 font-semibold" style={{ fontSize: 'var(--text-small)' }}>
                  <span>Explore our Vision</span>
                  <ChevronRight className="w-3 h-3" />
                </div>
              </div>
            </AnimateInView>
          </div>
        </div>
      </section>

      {/* Core Platform */}
      <section className="py-24 bg-transparent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <AnimateInView className="text-center mb-20">
            <h2 className="text-2xl md:text-3xl font-bold text-[var(--light-text-primary)] dark:text-[var(--dark-text-primary)] mb-4 font-heading tracking-tight">
              The Education Backbone
            </h2>
            <p
              className="text-[var(--light-text-secondary)] dark:text-[var(--dark-text-secondary)] max-w-xl mx-auto leading-relaxed"
              style={{ fontSize: 'var(--text-page-subtitle)' }}
            >
              Powerful tools designed to simplify school administration and protect student success.
            </p>
          </AnimateInView>

          <AnimateInView from={{ opacity: 0, y: 40 }} to={{ opacity: 1, y: 0 }} duration={0.6} stagger={0.1} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {coreFeatures.map((feature, index) => (
              <Card key={index} className="h-full bg-white/40 dark:bg-white/5 backdrop-blur-sm border-[var(--light-border)] dark:border-white/10 rounded-[2rem] hover:bg-white dark:hover:bg-white/10 transition-all duration-300">
                <CardContent className="p-8">
                  <div className="w-14 h-14 bg-white dark:bg-white/5 rounded-2xl flex items-center justify-center mb-6 shadow-sm border border-[var(--light-border)] dark:border-white/10">
                    {feature.icon}
                  </div>
                  <h3
                    className="font-bold text-[var(--light-text-primary)] dark:text-[var(--dark-text-primary)] mb-2 font-heading tracking-tight"
                    style={{ fontSize: 'var(--text-card-title)' }}
                  >
                    {feature.title}
                  </h3>
                  <p
                    className="text-[var(--light-text-secondary)] dark:text-[var(--dark-text-secondary)] leading-relaxed"
                    style={{ fontSize: 'var(--text-body)' }}
                  >
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </AnimateInView>
        </div>
      </section>

      {/* Problem Solver - Redesigned */}
      <section className="py-24 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimateInView className="mb-16">
            <h2 className="text-2xl md:text-3xl font-bold text-[var(--light-text-primary)] dark:text-[var(--dark-text-primary)] mb-4 font-heading tracking-tight">Solving Systemic Challenges</h2>
            <p
              className="text-[var(--light-text-secondary)] dark:text-[var(--dark-text-secondary)] max-w-2xl leading-relaxed"
              style={{ fontSize: 'var(--text-page-subtitle)' }}
            >
              We tackle the three biggest bottlenecks in African education records.
            </p>
          </AnimateInView>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <AnimateInView delay={0.1} className="p-8 bg-red-500/5 dark:bg-red-500/10 border border-red-500/10 dark:border-red-500/20 rounded-[2rem]">
              <div className="w-10 h-10 bg-red-500/20 rounded-xl flex items-center justify-center mb-6">
                <History className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <h3
                className="font-bold text-[var(--light-text-primary)] dark:text-white mb-3 tracking-tight"
                style={{ fontSize: 'var(--text-page-title)' }}
              >
                Lost Records
              </h3>
              <p
                className="text-[var(--light-text-secondary)] dark:text-gray-300 leading-relaxed"
                style={{ fontSize: 'var(--text-body)' }}
              >
                Ending the era where student history disappears due to administrative failure, hardware crashes, or physical damage.
              </p>
            </AnimateInView>

            <AnimateInView delay={0.2} className="p-8 bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/10 dark:border-amber-500/20 rounded-[2rem]">
              <div className="w-10 h-10 bg-amber-500/20 rounded-xl flex items-center justify-center mb-6">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <h3
                className="font-bold text-[var(--light-text-primary)] dark:text-white mb-3 tracking-tight"
                style={{ fontSize: 'var(--text-page-title)' }}
              >
                Identity Fraud
              </h3>
              <p
                className="text-[var(--light-text-secondary)] dark:text-gray-300 leading-relaxed"
                style={{ fontSize: 'var(--text-body)' }}
              >
                Securing every achievement with immutable proof, rendering ghost students and fake certificates a thing of the past.
              </p>
            </AnimateInView>

            <AnimateInView delay={0.3} className="p-8 bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/10 dark:border-emerald-500/20 rounded-[2rem]">
              <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center mb-6">
                <ArrowLeftRight className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h3
                className="font-bold text-[var(--light-text-primary)] dark:text-white mb-3 tracking-tight"
                style={{ fontSize: 'var(--text-page-title)' }}
              >
                Transfer Friction
              </h3>
              <p
                className="text-[var(--light-text-secondary)] dark:text-gray-300 leading-relaxed"
                style={{ fontSize: 'var(--text-body)' }}
              >
                Transforming the multi-week transcript nightmare into an instant, borderless digital transfer that respects privacy.
              </p>
            </AnimateInView>
          </div>
        </div>
      </section>

      {/* Progress Timeline */}
      <section className="py-24 relative overflow-hidden bg-white/30 dark:bg-white/5 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimateInView className="text-center mb-20">
            <h2 className="text-2xl md:text-3xl font-bold text-[var(--light-text-primary)] dark:text-[var(--dark-text-primary)] mb-4 font-heading tracking-tight">Our Trajectory</h2>
            <p
              className="text-[var(--light-text-secondary)] dark:text-[var(--dark-text-secondary)]"
              style={{ fontSize: 'var(--text-page-subtitle)' }}
            >
              Building the future of African education, step by step.
            </p>
          </AnimateInView>

          <div className="relative">
            <div className="absolute left-1/2 transform -translate-x-1/2 h-full w-px bg-[var(--light-border)] dark:bg-white/10 hidden md:block" />

            <div className="space-y-16">
              {milestones.map((milestone, index) => (
                <AnimateInView key={index} delay={index * 0.1} className={`flex items-center ${index % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'}`}>
                  <div className={`w-full md:w-1/2 ${index % 2 === 0 ? 'md:pr-20 md:text-right' : 'md:pl-20'}`}>
                    <div className="relative group">
                      <div className="absolute -top-10 left-0 md:left-auto md:right-0 bg-[var(--agora-blue)]/10 text-[var(--agora-blue)] px-4 py-1.2 rounded-full text-[10px] font-bold tracking-widest uppercase mb-4 inline-block">
                        {milestone.year}
                      </div>
                      <h3
                        className="font-bold text-[var(--light-text-primary)] dark:text-white mb-3 font-heading tracking-tight"
                        style={{ fontSize: 'var(--text-page-title)' }}
                      >
                        {milestone.title}
                      </h3>
                      <p
                        className="text-[var(--light-text-secondary)] dark:text-[var(--dark-text-secondary)] leading-relaxed"
                        style={{ fontSize: 'var(--text-body)' }}
                      >
                        {milestone.description}
                      </p>
                    </div>
                  </div>
                  <div className="hidden md:flex w-10 h-10 bg-white dark:bg-dark-bg border-4 border-agora-blue rounded-full items-center justify-center z-10 shadow-lg group-hover:scale-125 transition-transform">
                    <CheckCircle2 className="w-5 h-5 text-agora-blue" />
                  </div>
                  <div className="hidden md:block w-1/2" />
                </AnimateInView>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA - Premium Styled */}
      <section className="py-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-agora-blue overflow-hidden">
          <div
            className="absolute top-0 left-0 w-full h-full opacity-30"
            style={{ backgroundImage: 'radial-gradient(circle at 30% 30%, white 0%, transparent 50%)' }}
          />
        </div>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <AnimateInView>
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-6 font-heading tracking-tight">Ready to verify the future?</h2>
            <p
              className="text-blue-50 mb-10 leading-relaxed"
              style={{ fontSize: 'var(--text-page-subtitle)' }}
            >
              Join the schools and institutions already building the School Bud ecosystem.
            </p>
            <Link
              href="/auth/login"
              className="inline-block px-8 py-4 bg-white text-agora-blue font-bold rounded-2xl hover:bg-blue-50 hover:scale-105 transition-all shadow-2xl text-base"
            >
              Get Started for Free
            </Link>
          </AnimateInView>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[var(--light-bg)] dark:bg-[var(--dark-bg)] text-[var(--light-text-secondary)] dark:text-[var(--dark-text-secondary)] py-20 border-t border-[var(--light-border)] dark:border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm font-medium tracking-wide">&copy; 2026 School Bud. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
