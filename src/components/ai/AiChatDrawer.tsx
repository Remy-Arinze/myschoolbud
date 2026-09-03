'use client';

import React, { useState } from 'react';
import { X, Maximize2, Minimize2 } from 'lucide-react';
import { AgoraChat } from './AgoraChat';
import { cn } from '@/lib/utils';
import { useTheme } from '@/contexts/ThemeContext';
import type { LoisPageContext } from './LoisWorkspace';

interface AiChatDrawerProps {
  schoolId: string;
  isOpen: boolean;
  onClose: () => void;
  docked?: boolean;
  pageContext?: LoisPageContext | null;
}

export const AiChatDrawer: React.FC<AiChatDrawerProps> = ({
  schoolId,
  isOpen,
  onClose,
  docked = false,
  pageContext,
}) => {
  const [isMaximized, setIsMaximized] = useState(false);
  const { theme } = useTheme();

  const widthClass = docked && !isMaximized
    ? 'w-full lg:w-[400px]'
    : isMaximized
      ? 'w-screen'
      : 'w-full lg:w-[550px]';

  return (
    <>
      {isOpen && !docked && (
        <div
          className="fixed inset-0 bg-black/40 z-[99] animate-in fade-in duration-200"
          onClick={onClose}
        />
      )}

      <div
        className={cn(
          'lois-panel lois-shell fixed z-[100] transition-all duration-300 flex flex-col overflow-hidden',
          isMaximized
            ? 'lois-shell--max inset-0 h-screen rounded-none shadow-none'
            : cn(
                'right-0 bottom-0 h-[70vh] rounded-t-2xl',
                'lg:right-4 lg:bottom-4 lg:rounded-2xl',
                'shadow-[0_18px_50px_-20px_rgba(2,23,61,0.35)]',
              ),
          isOpen ? 'translate-y-0' : 'translate-y-full',
          widthClass,
          theme === 'dark' ? 'dark' : '',
        )}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 -right-16 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(125,82,255,0.22),transparent_68%)] lois-mesh-blob blur-2xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute top-32 -left-10 h-40 w-40 rounded-full bg-[radial-gradient(circle,rgba(0,127,255,0.16),transparent_70%)] lois-mesh-blob blur-2xl"
          style={{ animationDelay: '2.4s' }}
        />
        <AgoraChat
          schoolId={schoolId}
          variant="minimal"
          pageContext={pageContext || undefined}
          headerActions={
            <>
              <button
                type="button"
                onClick={() => setIsMaximized(!isMaximized)}
                className="lois-icon-btn hidden lg:inline-flex"
                aria-label={isMaximized ? 'Restore panel size' : 'Expand panel'}
                title={isMaximized ? 'Restore' : 'Expand'}
              >
                {isMaximized ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="lois-icon-btn"
                aria-label="Close Lois"
                title="Close"
              >
                <X size={14} />
              </button>
            </>
          }
        />
      </div>
    </>
  );
};
