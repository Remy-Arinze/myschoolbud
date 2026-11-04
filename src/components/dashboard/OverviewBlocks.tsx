'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { cn } from '@/lib/utils';

gsap.registerPlugin(ScrollTrigger);

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const FROM = {
  up: { y: 48 },
  left: { x: -56 },
  right: { x: 56 },
} as const;

/** Scroll-triggered entrance. `from` picks the direction the block travels in from. */
export function Reveal({
  children,
  className,
  delay = 0,
  from = 'up',
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  from?: keyof typeof FROM;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion()) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        el,
        { opacity: 0, scale: 0.97, filter: 'blur(6px)', ...FROM[from] },
        {
          opacity: 1,
          x: 0,
          y: 0,
          scale: 1,
          filter: 'blur(0px)',
          duration: 0.9,
          delay,
          ease: 'power3.out',
          clearProps: 'transform,filter,opacity',
          scrollTrigger: { trigger: el, start: 'top 90%', once: true },
        },
      );
    }, el);
    return () => ctx.revert();
  }, [delay, from]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}

/** Staggers every `[data-reveal-item]` descendant in as the group scrolls into view. */
export function RevealStagger({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion()) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        el.querySelectorAll('[data-reveal-item]'),
        { opacity: 0, y: 36, scale: 0.92 },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.8,
          ease: 'back.out(1.4)',
          stagger: 0.1,
          clearProps: 'transform,opacity',
          scrollTrigger: { trigger: el, start: 'top 90%', once: true },
        },
      );
    }, el);
    return () => ctx.revert();
  }, []);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}

const TONE =
  'bg-white text-[var(--light-text-primary)] dark:bg-white/5 dark:text-white';

/** Pastel tile palettes: azure tint plus a warm peach that complements it. */
const TILE_TONES = {
  sky: {
    card: 'bg-[#dcecff] text-[#02173D] dark:bg-white/5 dark:text-white',
    chip: 'bg-white/70 text-[#1e6bd1] dark:bg-[var(--agora-blue)]/10 dark:text-[var(--agora-blue)]',
  },
  peach: {
    card: 'bg-[#ffe3d6] text-[#02173D] dark:bg-white/5 dark:text-white',
    chip: 'bg-white/70 text-[#c2410c] dark:bg-[var(--agora-blue)]/10 dark:text-[var(--agora-blue)]',
  },
} as const;

/** Animates a formatted number from 0 once it scrolls into view. */
function CountUp({ value }: { value: string }) {
  const ref = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const el = ref.current;
    const target = Number(value.replace(/,/g, ''));
    if (!el || !Number.isFinite(target) || prefersReducedMotion()) return;
    const counter = { n: 0 };
    const ctx = gsap.context(() => {
      gsap.to(counter, {
        n: target,
        duration: 1.4,
        ease: 'power2.out',
        onUpdate: () => {
          el.textContent = Math.round(counter.n).toLocaleString();
        },
        scrollTrigger: { trigger: el, start: 'top 95%', once: true },
      });
    }, el);
    return () => ctx.revert();
  }, [value]);

  return (
    <p
      ref={ref}
      className="text-2xl font-semibold tracking-tight tabular-nums"
      style={{ fontFamily: 'var(--font-geist-sans), system-ui, sans-serif' }}
    >
      {value}
    </p>
  );
}

export function OverviewStatTile({
  title,
  value,
  change,
  changeType = 'neutral',
  icon,
  tone,
}: {
  title: string;
  value: string;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: React.ReactNode;
  tone?: keyof typeof TILE_TONES;
}) {
  const palette = tone ? TILE_TONES[tone] : null;
  return (
    <div
      data-reveal-item
      className={cn(
        'flex flex-col justify-between rounded-3xl p-4 min-h-[120px] transition-transform duration-300 hover:-translate-y-1',
        palette ? palette.card : TONE,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium text-[var(--light-text-secondary)] leading-snug">{title}</p>
        <span className={cn(
          'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full',
          palette ? palette.chip : 'bg-[var(--agora-blue)]/10 text-[var(--agora-blue)]',
        )}>
          {icon}
        </span>
      </div>
      <div className="flex items-end justify-between gap-2">
        <CountUp value={value} />
        {change && (
          <span
            className={cn(
              'rounded-full px-2 py-0.5 text-[11px] font-semibold',
              palette ? palette.chip : 'bg-[var(--agora-blue)]/10 text-[var(--agora-blue)]',
              changeType === 'negative' && 'text-red-600 dark:text-red-300',
            )}
          >
            {change}
          </span>
        )}
      </div>
    </div>
  );
}

export function ProgressRing({
  percent,
  size = 120,
  stroke = 12,
  label,
  onDark = false,
}: {
  onDark?: boolean;
  percent: number;
  size?: number;
  stroke?: number;
  label?: string;
}) {
  const clamped = Math.max(0, Math.min(100, percent));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const arcRef = useRef<SVGCircleElement>(null);
  const numRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const arc = arcRef.current;
    const num = numRef.current;
    if (!arc || !num) return;
    if (prefersReducedMotion()) {
      arc.style.strokeDashoffset = String(circumference * (1 - clamped / 100));
      return;
    }
    const counter = { n: 0 };
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ scrollTrigger: { trigger: arc, start: 'top 95%', once: true } });
      tl.fromTo(
        arc,
        { strokeDashoffset: circumference },
        { strokeDashoffset: circumference * (1 - clamped / 100), duration: 1.5, ease: 'power3.out' },
        0.15,
      ).to(
        counter,
        {
          n: clamped,
          duration: 1.5,
          ease: 'power3.out',
          onUpdate: () => {
            num.textContent = `${Math.round(counter.n)}%`;
          },
        },
        0.15,
      );
    });
    return () => ctx.revert();
  }, [clamped, circumference]);

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          className={onDark ? "stroke-white/25" : "stroke-black/10"}
        />
        <circle
          ref={arcRef}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          className={onDark ? "stroke-white" : "stroke-[var(--agora-blue)]"}
          strokeDasharray={circumference}
          strokeDashoffset={circumference}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span ref={numRef} className="text-2xl font-semibold tabular-nums">
          0%
        </span>
        {label && <span className="text-[11px] opacity-70">{label}</span>}
      </div>
    </div>
  );
}
