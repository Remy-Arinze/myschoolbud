'use client';

import { cn } from '@/lib/utils';

export type LoisOrbSize = 'xs' | 'sm' | 'md' | 'lg';

const SIZE_STYLES: Record<
  LoisOrbSize,
  { box: string; radius: string; inset: string; logo: string }
> = {
  xs: {
    box: 'w-4 h-4',
    radius: 'rounded-[0.35rem]',
    inset: 'inset-[1px]',
    logo: 'w-[70%] h-[70%]',
  },
  sm: {
    box: 'w-6 h-6',
    radius: 'rounded-[0.55rem]',
    inset: 'inset-[1.4px]',
    logo: 'w-[62%] h-[62%]',
  },
  md: {
    box: 'w-7 h-7',
    radius: 'rounded-[0.65rem]',
    inset: 'inset-[1.6px]',
    logo: 'w-[62%] h-[62%]',
  },
  lg: {
    box: 'w-9 h-9',
    radius: 'rounded-[0.8rem]',
    inset: 'inset-[1.6px]',
    logo: 'w-[62%] h-[62%]',
  },
};

export function LoisOrb({
  size = 'md',
  pulse = false,
  className,
}: {
  size?: LoisOrbSize;
  pulse?: boolean;
  className?: string;
}) {
  const styles = SIZE_STYLES[size];

  return (
    <div
      className={cn('relative flex items-center justify-center shrink-0', styles.box, className)}
      aria-hidden
    >
      {pulse && <div className="absolute -inset-1 lois-orb-glow rounded-full pointer-events-none" />}
      <div className={cn('absolute inset-0 overflow-hidden', styles.radius)}>
        <div className="absolute inset-0 lois-orb-ring" />
        <div
          className={cn(
            'absolute bg-[#0A0A0B] flex items-center justify-center overflow-hidden',
            styles.inset,
            styles.radius,
          )}
        >
          <img
            src="/assets/logos/agora_main.png"
            alt=""
            className={cn('object-contain', styles.logo)}
          />
        </div>
      </div>
    </div>
  );
}
