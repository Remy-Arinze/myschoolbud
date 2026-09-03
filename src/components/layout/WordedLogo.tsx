import Image from 'next/image';
import { cn } from '@/lib/utils';

const SIZE = {
  sm: { icon: 24, iconClass: 'h-6 w-6', text: 'text-sm' },
  md: { icon: 32, iconClass: 'h-8 w-8', text: 'text-base' },
  lg: { icon: 40, iconClass: 'h-10 w-10', text: 'text-xl' },
} as const;

export type WordedLogoSize = keyof typeof SIZE;

export interface WordedLogoProps {
  className?: string;
  iconClassName?: string;
  textClassName?: string;
  size?: WordedLogoSize;
  priority?: boolean;
}

export function WordedLogo({
  className,
  iconClassName,
  textClassName,
  size = 'md',
  priority = false,
}: WordedLogoProps) {
  const s = SIZE[size];

  return (
    <span className={cn('inline-flex items-center gap-2 min-w-0', className)}>
      <Image
        src="/assets/logos/agora_main.png"
        alt=""
        width={s.icon}
        height={s.icon}
        className={cn('object-contain flex-shrink-0', s.iconClass, iconClassName)}
        priority={priority}
        aria-hidden
      />
      <span
        className={cn(
          'font-heading font-semibold tracking-tight whitespace-nowrap text-agora-text dark:text-white',
          s.text,
          textClassName,
        )}
      >
        Myschoolbud
      </span>
    </span>
  );
}
