'use client';

import { createElement, useLayoutEffect, useRef, type ReactNode } from 'react';
import gsap from 'gsap';

interface AnimatedListProps {
  children: ReactNode;
  as?: 'div' | 'tbody' | 'ul';
  className?: string;
  stagger?: number;
}

/**
 * Animates direct children as they appear (initial render and any item added later,
 * e.g. a class just generated or a timetable just created). Existing children are untouched.
 */
export function AnimatedList({ children, as = 'div', className, stagger = 0.05 }: AnimatedListProps) {
  const ref = useRef<HTMLElement | null>(null);
  const seen = useRef<WeakSet<Element>>(new WeakSet());

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fresh = Array.from(el.children).filter((child) => !seen.current.has(child));
    fresh.forEach((child) => seen.current.add(child));
    if (fresh.length === 0) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

    const tween = gsap.fromTo(
      fresh,
      { opacity: 0, y: 14, scale: 0.98 },
      {
        opacity: 1,
        y: 0,
        scale: 1,
        duration: 0.45,
        ease: 'power3.out',
        stagger: Math.min(stagger, 0.6 / fresh.length),
        clearProps: 'opacity,transform',
      }
    );
    return () => {
      tween.progress(1);
    };
  });

  return createElement(as, { ref, className }, children);
}
