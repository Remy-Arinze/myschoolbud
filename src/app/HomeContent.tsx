'use client';

import { useSelector } from 'react-redux';
import { useRouter } from 'next/navigation';
import { FadeInUp } from '@/components/ui/FadeInUp';
import { AnimateInView } from '@/components/ui/AnimateInView';
import { RootState } from '@/lib/store/store';
import { LandingNavbar } from '@/components/layout/LandingNavbar';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';
import Image from 'next/image';
import { PricingTable } from '@/components/subscriptions/PricingTable';
import { useState, useEffect, useRef } from 'react';
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SkewSection } from '@/components/ui/SkewSection';
import { TransferVisual } from '@/components/ui/TransferVisual';
import { useTheme } from '@/contexts/ThemeContext';

// Color classes for the timetable mini-grid cells
const TIMETABLE_CELL_CLASSES = Array.from({ length: 20 }).map((_, i) => {
  if ([2, 5, 8, 11, 14, 17].includes(i)) return 'bg-agora-blue/20';
  if ([3, 7, 13, 19].includes(i)) return 'bg-agora-success/15';
  if ([6, 12].includes(i)) return 'bg-agora-accent/15';
  return 'bg-white/[0.04]';
});

// Grid dimensions: 5 cols × 4 rows, cell 32×20, gap 6
const TT_W = 32, TT_H = 20, TT_GAP = 6;
const TT_COLS = 5, TT_ROWS = 4;
const TT_TOTAL_W = TT_COLS * TT_W + (TT_COLS - 1) * TT_GAP; // 184
const TT_TOTAL_H = TT_ROWS * TT_H + (TT_ROWS - 1) * TT_GAP; // 98

// Build a serpentine SVG path tracing each cell's top border L→R, then R→L
const buildTimetablePath = () => {
  const segments: string[] = [];
  for (let row = 0; row < TT_ROWS; row++) {
    const y = row * (TT_H + TT_GAP) + 1; // 1px inside top border
    const ltr = row % 2 === 0;
    for (let col = 0; col < TT_COLS; col++) {
      const c = ltr ? col : TT_COLS - 1 - col;
      const x1 = c * (TT_W + TT_GAP);
      const x2 = x1 + TT_W;
      if (row === 0 && col === 0) {
        segments.push(`M ${x1} ${y}`);
      } else if (col === 0) {
        // drop down from previous row
        const prevY = (row - 1) * (TT_H + TT_GAP) + 1;
        segments.push(`L ${ltr ? x1 : x2} ${prevY}`);
        segments.push(`L ${ltr ? x1 : x2} ${y}`);
      }
      segments.push(ltr ? `L ${x2} ${y}` : `L ${x1} ${y}`);
    }
  }
  return segments.join(' ');
};

const TIMETABLE_PATH = buildTimetablePath();

function TimetableGlowGrid() {
  const pathRef = useRef<SVGPathElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const path = pathRef.current;
    const wrapper = wrapperRef.current;
    if (!path || !wrapper) return;

    const totalLength = path.getTotalLength();
    const segmentLength = totalLength * 0.12; // short glowing segment

    path.style.strokeDasharray = `${segmentLength} ${totalLength}`;
    path.style.strokeDashoffset = `${totalLength}`;

    const ctx = gsap.context(() => {
      gsap.to(path, {
        strokeDashoffset: -totalLength,
        ease: 'none',
        scrollTrigger: {
          trigger: wrapper,
          start: 'top 85%',
          end: 'bottom 40%',
          scrub: 1,
        },
      });
    }, wrapper);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={wrapperRef} className="hidden md:grid grid-cols-5 gap-1.5 flex-shrink-0 relative">
      {TIMETABLE_CELL_CLASSES.map((cls, i) => (
        <div key={`tt-${i}`} className={`w-8 h-5 rounded-md ${cls}`} />
      ))}
      {/* SVG overlay for the traveling border light */}
      <svg
        className="absolute inset-0 pointer-events-none z-10"
        width={TT_TOTAL_W}
        height={TT_TOTAL_H}
        viewBox={`0 0 ${TT_TOTAL_W} ${TT_TOTAL_H}`}
        fill="none"
      >
        <defs>
          <filter id="tt-glow">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <path
          ref={pathRef}
          d={TIMETABLE_PATH}
          stroke="rgba(36,144,253,0.5)"
          strokeWidth="1.5"
          strokeLinecap="round"
          filter="url(#tt-glow)"
        />
      </svg>
    </div>
  );
}

export default function HomeContent() {
  const { theme } = useTheme();
  const user = useSelector((state: RootState) => state.auth.user);
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);

  // Ensure component is mounted before using persisted auth state
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Initialize Lenis smooth scroll and sync with GSAP
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 2,
    });

    lenis.on('scroll', ScrollTrigger.update);

    gsap.ticker.add((time) => {
      lenis.raf(time * 1000);
    });

    gsap.ticker.lagSmoothing(0);

    // Refresh ScrollTrigger after a short delay for accurate positioning
    setTimeout(() => {
      ScrollTrigger.refresh();
    }, 100);

    return () => {
      lenis.destroy();
      gsap.ticker.remove((time) => lenis.raf(time * 1000));
    };
  }, []);

  // Only use user state after hydration to avoid mismatch
  const isLoggedIn = isMounted && !!user;

  const handleGetStarted = () => {
    if (isLoggedIn && user) {
      const roleMap: Record<string, string> = {
        SUPER_ADMIN: '/dashboard/super-admin',
        SCHOOL_ADMIN: '/dashboard/school',
        TEACHER: '/dashboard/teacher',
        STUDENT: '/dashboard/student',
      };
      router.push(roleMap[user.role] || '/dashboard');
    } else {
      router.push('/auth/register-school');
    }
  };

  return (
    <>
      {/* Navbar outside overflow-x-hidden so fixed nav links are never clipped (e.g. Pricing). */}
      <LandingNavbar />

      <div className="min-h-screen bg-[var(--light-bg)] dark:bg-[var(--dark-bg)] text-gray-900 dark:text-[var(--dark-text-primary)] transition-colors duration-300 overflow-x-hidden relative">
      {/* Global Background Grid */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none z-0"
        style={{ backgroundImage: 'radial-gradient(circle, var(--agora-blue) 1px, transparent 1px)', backgroundSize: '40px 40px' }}
      />

      {/* Hero Section */}
      <section className="relative pt-32 pb-32 flex flex-col items-center justify-center text-center px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto mt-12 md:mt-16 z-10">
          <FadeInUp from={{ opacity: 0, y: 30 }} to={{ opacity: 1, y: 0 }} delay={0.1} duration={0.8}>
            <h1 className="text-5xl md:text-[4rem] font-bold text-[var(--dark-text-primary)] leading-tight mb-8 tracking-tight font-heading">
              The way we manage schools can be smarter
            </h1>
          </FadeInUp>

          <FadeInUp from={{ opacity: 0, y: 20 }} to={{ opacity: 1, y: 0 }} delay={0.3} duration={0.8}>
            <p className="text-lg md:text-xl text-[var(--dark-text-secondary)] mb-12 max-w-2xl mx-auto leading-relaxed">
              School Bud uses AI to generate curriculums, auto-grade assessments, build timetables, and predict student performance — so your teachers can focus on what matters most: teaching.
            </p>
          </FadeInUp>

          <FadeInUp from={{ opacity: 0, y: 20 }} to={{ opacity: 1, y: 0 }} delay={0.5} duration={0.8} className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              size="md"
              variant="primary"
              isFlat
              onClick={handleGetStarted}
              className="rounded hover:scale-105 font-bold bg-agora-blue text-white w-full sm:w-auto hover:bg-agora-blue/90"
            >
              {isLoggedIn ? 'Go to dashboard' : 'Get Started Free'}
            </Button>
            <Link href="/about" className="w-full sm:w-auto">
              <Button
                variant="outline"
                size="md"
                isFlat
                className="w-full sm:w-auto rounded hover:scale-105 font-bold"
              >
                How it works
              </Button>
            </Link>
          </FadeInUp>
        </div>

        {/* Dashboard Mockup Perspective */}
        {/* Hero Banner Image */}
        <FadeInUp from={{ opacity: 0, y: 30 }} to={{ opacity: 1, y: 0 }} delay={0.6} duration={1} className="w-full max-w-6xl mx-auto mt-16 relative z-10 px-4">
          <div className="relative rounded-[2rem] overflow-hidden border border-[var(--dark-border)] h-[300px] md:h-[400px]">
            <Image
              src="/smiling_students_banner.png"
              alt="Smiling students collaborating"
              width={1920}
              height={1080}
              className="w-full h-full object-cover hover:scale-[1.02] transition-transform duration-1000"
              priority
            />
            {/* Subtle overlay for depth */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent pointer-events-none" />
          </div>
        </FadeInUp>

        {/* Dashboard Mockup Perspective - Commented out for now
        <FadeInUp from={{ opacity: 0, y: 50 }} to={{ opacity: 1, y: 0 }} delay={0.7} duration={1} className="w-full max-w-5xl mx-auto mt-24 relative z-10 px-4">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />

          <div
            className="w-full rounded-xl border border-[var(--dark-border)] bg-[var(--dark-surface)] overflow-hidden relative mx-auto transition-transform duration-700 hover:scale-[1.07] mockup-perspective"
            style={{
              transformOrigin: "top center",
              boxShadow: "0 25px 60px -12px rgba(0, 0, 0, 0.4), 0 0 40px 0 rgba(36, 144, 253, 0.1)"
            }}
          >
            <div className="h-10 border-b border-white/5 bg-[#1b1b1c] flex items-center px-4 gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500/80" />
              <div className="w-3 h-3 rounded-full bg-amber-500/80" />
              <div className="w-3 h-3 rounded-full bg-green-500/80" />
              <div className="ml-auto w-32 h-4 bg-white/5 rounded-full" />
            </div>

            <div className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-4 gap-6 bg-[#1f1f22]">
              <div className="hidden md:flex flex-col gap-4 border-r border-white/5 pr-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded bg-agora-blue/20 flex-shrink-0" />
                  <div className="h-5 w-20 bg-white/10 rounded-md" />
                </div>
                {[...Array(6)].map((_, i) => (
                  <div key={`nav-${i}`} className="flex items-center gap-3 py-1">
                    <div className={`w-4 h-4 rounded-sm ${i === 1 ? 'bg-agora-blue' : 'bg-white/10'}`} />
                    <div className={`h-3 w-full rounded-md ${i === 1 ? 'bg-white/20' : 'bg-white/5'}`} />
                  </div>
                ))}
              </div>

              <div className="md:col-span-3 flex flex-col gap-6">
                <div className="flex justify-between items-center hidden sm:flex pb-2">
                  <div className="h-6 w-48 bg-white/10 rounded-md" />
                  <div className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-white/10" />
                    <div className="w-8 h-8 rounded-full bg-white/10" />
                  </div>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {[...Array(4)].map((_, i) => (
                    <div key={`stat-${i}`} className="bg-white/5 rounded-xl p-4 border border-white/5">
                      <div className="h-3 w-1/2 bg-white/10 rounded mb-3" />
                      <div className="h-7 w-3/4 bg-white/20 rounded mb-2" />
                      <div className="h-2 w-1/3 bg-agora-success/50 rounded" />
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 bg-white/5 rounded-xl border border-white/5 h-[280px] p-5 relative overflow-hidden">
                    <div className="h-4 w-32 bg-white/10 rounded-md mb-8" />
                    <div className="absolute bottom-0 left-0 right-0 h-48 px-5 pb-5">
                      <div className="w-full h-full border-b border-l border-white/10 relative">
                        <div className="absolute top-1/4 left-0 right-0 h-px bg-white/5" />
                        <div className="absolute top-2/4 left-0 right-0 h-px bg-white/5" />
                        <div className="absolute top-3/4 left-0 right-0 h-px bg-white/5" />

                        <svg className="absolute inset-0 w-full h-full text-agora-accent" preserveAspectRatio="none" viewBox="0 0 100 100">
                          <path d="M0,80 Q10,70 20,75 T40,50 T60,65 T80,30 T100,45 L100,100 L0,100 Z" fill="url(#gradient)" opacity="0.3" />
                          <path d="M0,80 Q10,70 20,75 T40,50 T60,65 T80,30 T100,45" fill="transparent" stroke="currentColor" strokeWidth="2.5" />
                          <defs>
                            <linearGradient id="gradient" x1="0" x2="0" y1="0" y2="1">
                              <stop offset="0%" stopColor="currentColor" stopOpacity="0.8" />
                              <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
                            </linearGradient>
                          </defs>
                        </svg>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white/5 rounded-xl border border-white/5 p-5 flex flex-col h-[280px]">
                    <div className="h-4 w-28 bg-white/10 rounded-md mb-6" />
                    <div className="flex flex-col gap-4 flex-1">
                      {[...Array(5)].map((_, i) => (
                        <div key={`list-${i}`} className="flex items-center gap-4">
                          <div className={`w-2 h-2 rounded-full ${i % 2 === 0 ? 'bg-agora-success' : 'bg-agora-blue'}`} />
                          <div className="flex-1">
                            <div className="h-3 w-full bg-white/10 rounded mb-1.5" />
                            <div className="h-2 w-1/2 bg-white/5 rounded" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </FadeInUp>
        */}
      </section>

      {/* School Bud AI Section */}
      <section data-navbar-light="true" className="py-24 relative">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <AnimateInView from={{ opacity: 0, x: -30 }} to={{ opacity: 1, x: 0 }}>
              <div className="inline-flex items-center gap-2 text-agora-lois text-sm font-bold mb-6 uppercase tracking-wider">
                Introducing LOIS
              </div>
              <h2 className="text-3xl md:text-5xl font-bold text-[var(--dark-text-primary)] mb-6 leading-tight font-heading tracking-tight">
                Empower Teachers <br className="hidden md:block" />
                with AI
              </h2>
              <p className="text-lg text-[var(--dark-text-secondary)] mb-10 leading-relaxed font-light">
                LOIS is an orchestral intelligence layer designed to remove cognitive load from educators.
                Transition from manual overhead to high-precision pedagogical oversight.
              </p>

              <div className="grid grid-cols-1 gap-6">
                {[
                  {
                    title: 'Generate assessments in seconds',
                    desc: 'AI-driven question banking that adapts to curriculum standards and difficulty levels instantly.',
                    icon: (
                      <svg className="w-5 h-5 text-agora-lois" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                    ),
                  },
                  {
                    title: 'Auto-grade essay submissions',
                    desc: 'Deep linguistic analysis providing students with instant, high-fidelity feedback and rubric-based scores.',
                    icon: (
                      <svg className="w-5 h-5 text-agora-lois" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    ),
                  },
                  {
                    title: 'Predict student performance trends',
                    desc: 'Machine learning models that identify students at risk and forecast academic outcomes across cohorts.',
                    icon: (
                      <svg className="w-5 h-5 text-agora-lois" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                    ),
                  },
                  {
                    title: 'Personalize learning paths',
                    desc: 'Students falling behind are automatically recommended personalized learning paths to get back on track.',
                    icon: (
                      <svg className="w-5 h-5 text-agora-lois" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    ),
                  }
                ].map((item, idx) => (
                  <div key={idx} className="flex gap-5 group p-4 rounded-2xl hover:bg-agora-lois/[0.03] dark:hover:bg-white/[0.02] transition-colors border border-transparent hover:border-agora-lois/20 dark:hover:border-white/5">
                    <div className="w-12 h-12 rounded-xl bg-agora-lois/10 flex items-center justify-center shrink-0 border border-agora-lois/20 group-hover:scale-110 transition-transform duration-500">
                      {item.icon}
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <h4 className="text-gray-900 dark:text-[var(--dark-text-primary)] font-bold text-base font-heading">{item.title}</h4>
                      </div>
                      <p className="text-gray-600 dark:text-[var(--dark-text-secondary)] leading-relaxed text-sm font-light">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </AnimateInView>

            <AnimateInView from={{ opacity: 0, x: 30 }} to={{ opacity: 1, x: 0 }} delay={0.2} className="relative mt-12 lg:mt-0 px-4 md:px-0">
              <div className="relative rounded-3xl overflow-hidden border border-[var(--dark-border)] bg-gradient-to-br from-[var(--dark-surface)]/20 to-transparent p-6 md:p-8 shadow-xl backdrop-blur-sm group">
                <div className="absolute inset-0 bg-blue-500/5 group-hover:bg-blue-500/10 transition-colors duration-500" />
                <div className="relative z-10 flex flex-col gap-6">
                  {/* Mock UI for AI Grading */}
                  <div className="bg-[var(--dark-surface)] rounded-xl p-4 border border-[var(--dark-border)] shadow-lg transform -rotate-1 hover:rotate-0 transition-transform duration-300">
                    <div className="flex items-center gap-3 mb-3 border-b border-[var(--dark-border)] pb-3">
                      <div className="w-8 h-8 rounded-full bg-blue-600/20 flex items-center justify-center text-blue-400">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      </div>
                      <span className="text-sm font-medium text-[var(--dark-text-primary)]">English Essay Analysis</span>
                      <span className="ml-auto text-xs text-blue-400 bg-blue-900/30 px-2 py-1 rounded-full">Graded in 1.2s</span>
                    </div>
                    <div className="space-y-2">
                      <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                        <div className="w-[85%] h-full bg-gradient-to-r from-blue-500 to-indigo-500" />
                      </div>
                      <div className="flex justify-between text-xs text-[var(--dark-text-muted)]">
                        <span>Originality: 98%</span>
                        <span>Grammar: 92%</span>
                        <span className="text-agora-success font-medium">Score: 85/100</span>
                      </div>
                    </div>
                  </div>

                  {/* Mock UI for AI Generation */}
                  <div className="bg-[var(--dark-surface)] rounded-xl p-4 border border-[var(--dark-border)] shadow-lg transform rotate-2 hover:rotate-0 transition-transform duration-300 ml-8">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-agora-lois/20 flex items-center justify-center text-agora-lois mt-1 shrink-0">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                        </svg>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-[var(--dark-text-primary)] block mb-1">LOIS Assistant</span>
                        <p className="text-xs text-[var(--dark-text-secondary)] bg-[var(--dark-bg)] p-3 rounded-lg border border-[var(--dark-border)] leading-relaxed">
                          "Based on recent test scores, I recommend focusing next week's lesson on quadratic equations. Here is a generated lesson plan draft..."
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </AnimateInView>
          </div>
        </div>
      </section>

      {/* Command Center Section */}
      <section className="py-24 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-8">
            <AnimateInView className="max-w-2xl px-4 md:px-0">
              <span className="inline-block px-4 py-1.5 bg-agora-blue/10 text-agora-blue rounded-full text-[10px] md:text-xs font-bold mb-4 uppercase tracking-wider">
                AI Does the Heavy Lifting
              </span>
              <h2 className="text-3xl md:text-5xl lg:text-6xl font-bold text-[var(--dark-text-primary)] mb-6 font-heading tracking-tight leading-[1.1]">
                Every Tool, Powered <br /> by Intelligence.
              </h2>
              <p className="text-base md:text-lg text-[var(--dark-text-secondary)] leading-relaxed font-light">
                From AI-parsed curriculums to auto-graded assessments — School Bud doesn't just automate your school, it thinks alongside you.
              </p>
            </AnimateInView>
          </div>

          {/* Bento Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">

            {/* 1. Curriculum Engine — Featured (spans 2 cols) */}
            <AnimateInView delay={0.05} className="md:col-span-2 bg-gradient-to-br from-white/[0.04] to-transparent border border-white/[0.06] rounded-3xl p-7 md:p-9 relative group overflow-hidden hover:border-white/[0.1] transition-all duration-500">
              <div className="absolute top-0 right-0 -translate-y-1/3 translate-x-1/4 w-72 h-72 bg-agora-blue/8 rounded-full blur-[80px] pointer-events-none group-hover:bg-agora-blue/15 transition-colors duration-700" />
              <div className="relative z-10">
                <div className="w-9 h-9 bg-white/[0.06] rounded-lg flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-500">
                  <svg className="w-[18px] h-[18px] text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <div className="flex items-center gap-3 mb-3">
                  <h3 className="text-xl md:text-2xl font-bold text-[var(--dark-text-primary)] font-heading">Curriculum Engine</h3>
                  <span className="px-2 py-0.5 text-[9px] font-bold text-blue-400 bg-blue-500/10 rounded-full border border-blue-500/20">✦ AI</span>
                </div>
                <p className="text-[var(--dark-text-secondary)] text-sm leading-relaxed font-light mb-6 max-w-lg">
                  Browse a library of vetted, standards-aligned curriculums — including the national NERDC framework — and adopt one for your school in a single click. Prefer your own? Upload your documents and let AI transform them into structured, week-by-week teaching plans instantly.
                </p>
                <div className="flex flex-wrap gap-2">
                  {['Vetted Curriculums', 'NERDC Ready', 'Custom Upload', 'AI-Powered Plans'].map((tag) => (
                    <span key={tag} className="px-3 py-1 text-[10px] font-medium text-white/50 bg-white/[0.04] rounded-full border border-white/[0.06]">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </AnimateInView>

            {/* 2. Scheme of Work */}
            <AnimateInView delay={0.1} className="bg-[var(--dark-surface)]/20 border border-white/[0.06] rounded-3xl p-7 hover:border-white/[0.1] transition-all duration-500 group">
              <div className="w-9 h-9 bg-white/[0.06] rounded-lg flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-500">
                <svg className="w-[18px] h-[18px] text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
              </div>
              <div className="flex items-center gap-2 mb-2">
                <h4 className="text-lg font-bold text-[var(--dark-text-primary)] font-heading">Scheme of Work</h4>
                <span className="px-2 py-0.5 text-[9px] font-bold text-blue-400 bg-blue-500/10 rounded-full border border-blue-500/20">✦ AI</span>
              </div>
              <p className="text-[var(--dark-text-secondary)] text-sm leading-relaxed font-light">
                AI-generated weekly teaching plans with topic tracking. Teachers mark delivery status in real-time.
              </p>
            </AnimateInView>

            {/* 3. Smart Assessments */}
            <AnimateInView delay={0.15} className="bg-[var(--dark-surface)]/20 border border-white/[0.06] rounded-3xl p-7 hover:border-white/[0.1] transition-all duration-500 group">
              <div className="w-9 h-9 bg-white/[0.06] rounded-lg flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-500">
                <svg className="w-[18px] h-[18px] text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="flex items-center gap-2 mb-2">
                <h4 className="text-lg font-bold text-[var(--dark-text-primary)] font-heading">Smart Assessments</h4>
                <span className="px-2 py-0.5 text-[9px] font-bold text-blue-400 bg-blue-500/10 rounded-full border border-blue-500/20">✦ AI</span>
              </div>
              <p className="text-[var(--dark-text-secondary)] text-sm leading-relaxed font-light">
                Create timed exams with integrity monitoring. AI auto-grades MCQs and short answers instantly.
              </p>
            </AnimateInView>

            {/* 4. AI-Powered Grading */}
            <AnimateInView delay={0.2} className="bg-[var(--dark-surface)]/20 border border-white/[0.06] rounded-3xl p-7 hover:border-white/[0.1] transition-all duration-500 group">
              <div className="w-9 h-9 bg-white/[0.06] rounded-lg flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-500">
                <svg className="w-[18px] h-[18px] text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <div className="flex items-center gap-2 mb-2">
                <h4 className="text-lg font-bold text-[var(--dark-text-primary)] font-heading">AI-Powered Grading</h4>
                <span className="px-2 py-0.5 text-[9px] font-bold text-blue-400 bg-blue-500/10 rounded-full border border-blue-500/20">✦ AI</span>
              </div>
              <p className="text-[var(--dark-text-secondary)] text-sm leading-relaxed font-light">
                Let AI handle the heavy lifting. It creates assessments, grades answers instantly, and gives teachers hours back in their day.
              </p>
            </AnimateInView>

            {/* 5. Student Transfers */}
            <AnimateInView delay={0.25} className="bg-[var(--dark-surface)]/20 border border-white/[0.06] rounded-3xl p-7 hover:border-white/[0.1] transition-all duration-500 group">
              <div className="w-9 h-9 bg-white/[0.06] rounded-lg flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-500">
                <svg className="w-[18px] h-[18px] text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
              </div>
              <h4 className="text-lg font-bold text-[var(--dark-text-primary)] mb-2 font-heading">Student Transfers</h4>
              <p className="text-[var(--dark-text-secondary)] text-sm leading-relaxed font-light">
                Transfer students across schools with a secure TAC code. Grades, health records, and history migrate automatically.
              </p>
            </AnimateInView>

            {/* 6. Attendance Tracking */}
            <AnimateInView delay={0.3} className="bg-[var(--dark-surface)]/20 border border-white/[0.06] rounded-3xl p-7 hover:border-white/[0.1] transition-all duration-500 group">
              <div className="w-9 h-9 bg-white/[0.06] rounded-lg flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-500">
                <svg className="w-[18px] h-[18px] text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h4 className="text-lg font-bold text-[var(--dark-text-primary)] mb-2 font-heading">Attendance Tracking</h4>
              <p className="text-[var(--dark-text-secondary)] text-sm leading-relaxed font-light">
                Mark attendance individually or in bulk. Generate summaries showing present, absent, and late trends.
              </p>
            </AnimateInView>

            {/* 7. Timetable Generation — Featured (spans 2 cols) */}
            <AnimateInView delay={0.35} className="md:col-span-2 bg-gradient-to-br from-white/[0.04] to-transparent border border-white/[0.06] rounded-3xl p-7 md:p-9 relative group overflow-hidden hover:border-white/[0.1] transition-all duration-500">
              <div className="absolute bottom-0 left-0 translate-y-1/3 -translate-x-1/4 w-64 h-64 bg-agora-accent/8 rounded-full blur-[80px] pointer-events-none group-hover:bg-agora-accent/15 transition-colors duration-700" />
              <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-6">
                <div className="flex-1">
                  <div className="w-9 h-9 bg-white/[0.06] rounded-lg flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-500">
                    <svg className="w-[18px] h-[18px] text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h3 className="text-xl md:text-2xl font-bold text-[var(--dark-text-primary)] mb-3 font-heading">Timetable Generation</h3>
                  <p className="text-[var(--dark-text-secondary)] text-sm leading-relaxed font-light max-w-md">
                    Automated scheduling that resolves teacher and room conflicts. Assign subjects, set periods, and manage breaks — all conflict-free.
                  </p>
                </div>
                {/* Mini timetable visual — scroll-triggered glow */}
                <TimetableGlowGrid />
              </div>
            </AnimateInView>

            {/* 8. Session & Term Management */}
            <AnimateInView delay={0.4} className="bg-[var(--dark-surface)]/20 border border-white/[0.06] rounded-3xl p-7 hover:border-white/[0.1] transition-all duration-500 group">
              <div className="w-9 h-9 bg-white/[0.06] rounded-lg flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-500">
                <svg className="w-[18px] h-[18px] text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
              <h4 className="text-lg font-bold text-[var(--dark-text-primary)] mb-2 font-heading">Session Management</h4>
              <p className="text-[var(--dark-text-secondary)] text-sm leading-relaxed font-light">
                Orchestrate academic sessions and terms with automated transitions. Keep your entire school calendar in sync.
              </p>
            </AnimateInView>

            {/* 9. Teacher & Student Dashboards */}
            <AnimateInView delay={0.45} className="bg-[var(--dark-surface)]/20 border border-white/[0.06] rounded-3xl p-7 hover:border-white/[0.1] transition-all duration-500 group">
              <div className="w-9 h-9 bg-white/[0.06] rounded-lg flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-500">
                <svg className="w-[18px] h-[18px] text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm0 8a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zm10 0a1 1 0 011-1h4a1 1 0 011 1v6a1 1 0 01-1 1h-4a1 1 0 01-1-1v-6z" />
                </svg>
              </div>
              <h4 className="text-lg font-bold text-[var(--dark-text-primary)] mb-2 font-heading">Dedicated Dashboards</h4>
              <p className="text-[var(--dark-text-secondary)] text-sm leading-relaxed font-light">
                Teachers and students each get their own workspace. Track academic progress, spot at-risk students early, and celebrate growth.
              </p>
            </AnimateInView>

          </div>
        </div>
      </section>

      {/* Protocol Stream Section */}
      <section data-navbar-light="true" className="py-32 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <AnimateInView className="text-center mb-16 md:mb-24 px-4">
            <span className="inline-block text-agora-blue text-[10px] font-mono mb-6 uppercase tracking-[0.3em]">
              How we do it
            </span>
            <h2 className="text-4xl md:text-6xl font-bold text-[var(--dark-text-primary)] mb-8 font-heading tracking-tighter leading-[1.1]">
              Unified Data <br /> Infrastructure
            </h2>
            <p className="text-base md:text-xl text-[var(--dark-text-secondary)] max-w-2xl mx-auto leading-relaxed font-light">
              School Bud removes the administrative walls between institutions. Transfer students, their grades, and their entire legacy across schools as fast as a single click securely.
            </p>
          </AnimateInView>

          {/* Protocol Stream Animation */}
          <div className="mb-32">
            <TransferVisual />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <AnimateInView delay={0.1} className="p-6 md:p-8 rounded-2xl bg-[var(--dark-surface)]/20 border border-[var(--dark-border)] hover:border-agora-lois/20 transition-all duration-500 group relative overflow-hidden">
              <div className="mb-6 md:mb-8">
                <div className="w-12 h-12 rounded-xl bg-agora-lois/10 flex items-center justify-center shrink-0 border border-agora-lois/20 group-hover:scale-110 transition-transform duration-500">
                  <svg className="w-5 h-5 text-agora-lois" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
              </div>
              <h3 className="text-lg md:text-xl font-bold text-[var(--dark-text-primary)] mb-3 font-heading tracking-tight">Data In-Motion</h3>
              <p className="text-sm text-[var(--dark-text-secondary)] leading-relaxed font-light">
                Academic history, verified credentials, and institutional records flow through an encrypted, high-availability backbone.
              </p>
            </AnimateInView>

            <AnimateInView delay={0.2} className="p-6 md:p-8 rounded-2xl bg-[var(--dark-surface)]/20 border border-[var(--dark-border)] hover:border-agora-lois/20 transition-all duration-500 group relative overflow-hidden">
              <div className="mb-6 md:mb-8">
                <div className="w-12 h-12 rounded-xl bg-agora-lois/10 flex items-center justify-center shrink-0 border border-agora-lois/20 group-hover:scale-110 transition-transform duration-500">
                  <svg className="w-5 h-5 text-agora-lois" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
              </div>
              <h3 className="text-lg md:text-xl font-bold text-[var(--dark-text-primary)] mb-3 font-heading tracking-tight">Smart Verification</h3>
              <p className="text-sm text-[var(--dark-text-secondary)] leading-relaxed font-light">
                Enforce zero-trust financial clearance and automated academic auditing before any data transition is authorized.
              </p>
            </AnimateInView>

            <AnimateInView delay={0.3} className="p-6 md:p-8 rounded-2xl bg-[var(--dark-surface)]/20 border border-[var(--dark-border)] hover:border-agora-lois/20 transition-all duration-500 group relative overflow-hidden">
              <div className="mb-6 md:mb-8">
                <div className="w-12 h-12 rounded-xl bg-agora-lois/10 flex items-center justify-center shrink-0 border border-agora-lois/20 group-hover:scale-110 transition-transform duration-500">
                  <svg className="w-5 h-5 text-agora-lois" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16m-7 6h7" />
                  </svg>
                </div>
              </div>
              <h3 className="text-lg md:text-xl font-bold text-[var(--dark-text-primary)] mb-3 font-heading tracking-tight">Protocol Governance</h3>
              <p className="text-sm text-[var(--dark-text-secondary)] leading-relaxed font-light">
                Multi-institution consensus protocols ensure that both schools mutually acknowledge and secure the transfer process.
              </p>
            </AnimateInView>
          </div>
        </div>
      </section>


      {/* Pricing Plans Section */}
      <section id="pricing" data-navbar-light="true" className="py-24 relative">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-agora-blue/5 rounded-full blur-[120px] pointer-events-none" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <AnimateInView className="text-center mb-16">
            <span className="inline-block text-agora-blue text-[10px] font-mono mb-6 uppercase tracking-[0.3em]">
              Pricing
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-[var(--dark-text-primary)] mb-4 font-heading">
              Choose Your School Management Plan
            </h2>
            <p className="text-base md:text-lg text-[var(--dark-text-secondary)] max-w-2xl mx-auto">
              Choose the plan that best fits your institution&apos;s needs.
            </p>
          </AnimateInView>

          <AnimateInView delay={0.2}>
            <PricingTable className="" />
          </AnimateInView>
        </div>
      </section>

      {/* Schools Network Section */}
      <section data-navbar-light="true" className="py-32 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1200px] h-[600px] bg-agora-blue/5 rounded-full blur-[160px] pointer-events-none opacity-50" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <AnimateInView className="text-center mb-20 px-4">
            <span className="inline-block text-agora-blue text-[10px] font-mono mb-6 uppercase tracking-[0.3em]">
              The_School_Bud_Network
            </span>
            <h2 className="text-4xl md:text-6xl font-bold text-[var(--dark-text-primary)] mb-8 font-heading tracking-tight leading-[1.1]">
              Schools Are Already <br className="md:hidden" /> Using School Bud
            </h2>
            <p className="text-base md:text-xl text-[var(--dark-text-secondary)] max-w-2xl mx-auto leading-relaxed font-light">
              Join the growing ecosystem of world-class institutions digitizing the future of African education.
            </p>
          </AnimateInView>

          <AnimateInView delay={0.2} className="flex justify-center pt-4">
            <Button
              size="md"
              variant="primary"
              isFlat
              onClick={handleGetStarted}
              className="rounded hover:scale-105 font-bold bg-agora-blue text-white hover:bg-agora-blue/90 px-10"
            >
              {isLoggedIn ? 'Go to Dashboard' : 'Get Started Free'}
            </Button>
          </AnimateInView>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[var(--light-bg)] dark:bg-[var(--dark-bg)] text-[var(--light-text-secondary)] dark:text-[var(--dark-text-secondary)] py-20 relative z-10 border-t border-[var(--light-border)] dark:border-[var(--dark-border)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-16 md:gap-8">
            <div className="col-span-1 md:col-span-1">
              <Image
                src={theme === 'light' ? '/assets/logos/agora_word_blue.png' : '/assets/logos/agora_worded_white.png'}
                alt="School Bud - Verified Academic History Logo"
                width={140}
                height={38}
                className="h-8 w-auto mb-8 opacity-90 transition-opacity"
              />
              <p className="text-xs leading-relaxed text-[var(--dark-text-muted)] max-w-[240px] font-light">
                The Chain-of-Trust Registry for the African education ecosystem. Securing academic identities forever.
              </p>
            </div>
            <div>
              <h4 className="text-gray-900 dark:text-[var(--dark-text-primary)] font-bold mb-8 text-sm font-heading uppercase tracking-widest">Product</h4>
              <ul className="space-y-4 text-gray-600 dark:text-[var(--dark-text-secondary)] text-sm font-light">
                <li><Link href="#features" className="hover:text-agora-blue transition-colors">Features</Link></li>
                <li><Link href="/products" className="hover:text-agora-blue transition-colors">Solutions</Link></li>
                <li><Link href="/pricing" className="hover:text-agora-blue transition-colors">Pricing</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-gray-900 dark:text-[var(--dark-text-primary)] font-bold mb-8 text-sm font-heading uppercase tracking-widest">Company</h4>
              <ul className="space-y-4 text-gray-600 dark:text-[var(--dark-text-secondary)] text-sm font-light">
                <li><Link href="/about" className="hover:text-agora-blue transition-colors">About Us</Link></li>
                <li><Link href="/contact" className="hover:text-agora-blue transition-colors">Contact</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-gray-900 dark:text-[var(--dark-text-primary)] font-bold mb-8 text-sm font-heading uppercase tracking-widest">Legal</h4>
              <ul className="space-y-4 text-gray-600 dark:text-[var(--dark-text-secondary)] text-sm font-light">
                <li><Link href="/privacy" className="hover:text-agora-blue transition-colors">Privacy Policy</Link></li>
                <li><Link href="/terms" className="hover:text-agora-blue transition-colors">Terms of Service</Link></li>
              </ul>
            </div>
          </div>
          <div className="mt-20 pt-8 border-t border-[var(--dark-border)] flex flex-col md:flex-row justify-between items-center gap-6">
            <p className="text-sm text-[var(--dark-text-muted)] font-light">&copy; 2026 School Bud. All rights reserved.</p>
            <div className="flex gap-8">
              {/* Optional Social Icons */}
            </div>
          </div>
        </div>
      </footer>
      </div>
    </>
  );
}
