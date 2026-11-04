'use client';

import { useLayoutEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import gsap from 'gsap';

/**
 * Next only re-mounts a template when the segment directly below it changes, so moving between
 * pages inside one section (e.g. students -> staff) never re-ran the old mount-only animation.
 * Animating on pathname change covers every dashboard navigation without remounting layouts.
 */
export default function DashboardTemplate({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      gsap.set(el, { clearProps: 'opacity,transform' });
      return;
    }
    const tween = gsap.fromTo(
      el,
      { opacity: 0, y: 16 },
      { opacity: 1, y: 0, duration: 0.45, ease: 'power3.out', clearProps: 'opacity,transform' },
    );
    return () => {
      tween.kill();
    };
  }, [pathname]);

  return (
    <div ref={ref} style={{ opacity: 0 }}>
      {children}
    </div>
  );
}
