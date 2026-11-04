'use client';

import { useState } from 'react';
import { Clapperboard } from 'lucide-react';
import { Modal } from './Modal';
import { cn } from '@/lib/utils';
import { TUTORIALS, resolveTutorialEmbed, type TutorialId } from '@/lib/tutorials';

export function HelpVideoButton({ tutorial, className }: { tutorial: TutorialId; className?: string }) {
  const [open, setOpen] = useState(false);
  const data = TUTORIALS[tutorial];
  const embed = resolveTutorialEmbed(data.url);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Watch tutorial: ${data.title}`}
        title="Watch tutorial"
        className={cn(
          'relative inline-flex h-7 w-9 items-center justify-center rounded-lg transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500/50',
          className
        )}
      >
        <svg viewBox="0 0 28 20" className="relative h-5 w-7 drop-shadow-sm" aria-hidden="true">
          <rect width="28" height="20" rx="5.5" fill="#FF0000" />
          <path d="M11 5.5v9l8-4.5-8-4.5z" fill="#fff" />
        </svg>
      </button>

      <Modal isOpen={open} onClose={() => setOpen(false)} title={data.title} size="xl">
        <div className="space-y-4">
          {embed ? (
            <div className="aspect-video w-full overflow-hidden rounded-2xl bg-black">
              {embed.kind === 'iframe' ? (
                <iframe
                  src={embed.src}
                  title={data.title}
                  className="h-full w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <video src={embed.src} controls className="h-full w-full" />
              )}
            </div>
          ) : (
            <div className="flex aspect-video w-full flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-light-border bg-light-surface text-center dark:border-white/15 dark:bg-white/5">
              <Clapperboard className="h-10 w-10 text-light-text-muted dark:text-dark-text-secondary" />
              <p className="font-semibold text-light-text-primary dark:text-dark-text-primary">
                This tutorial is coming soon
              </p>
            </div>
          )}
          <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
            {data.description}
            {data.duration ? ` · ${data.duration}` : ''}
          </p>
        </div>
      </Modal>
    </>
  );
}
