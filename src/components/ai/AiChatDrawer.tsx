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
          className="fixed inset-0 bg-black/40 backdrop-blur-md z-[99] animate-in fade-in duration-300"
          onClick={onClose}
        />
      )}

      <div
        className={cn(
          "fixed right-0 bottom-0 z-[100] transition-all duration-500 flex flex-col overflow-hidden border-l border-t",
          "bg-white dark:bg-[var(--dark-bg)] border-gray-200/50 dark:border-white/10",
          docked
            ? "lg:top-0 lg:h-screen lg:rounded-none"
            : "rounded-t-[3rem] lg:rounded-tr-none lg:rounded-l-[3rem]",
          isOpen
            ? "translate-y-0 lg:translate-x-0"
            : "translate-y-full lg:translate-x-full lg:translate-y-0",
          docked && !isMaximized ? "h-[90vh] lg:h-screen" : isMaximized ? "h-screen rounded-none" : "h-[90vh]",
          widthClass,
          theme === 'dark' ? 'dark' : ''
        )}
      >
        <div className="flex-1 overflow-hidden relative flex flex-col">
          <div className="absolute top-6 right-8 z-[101] flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsMaximized(!isMaximized)}
              className="p-2.5 rounded-2xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-all text-gray-500 dark:text-white/40 hover:text-gray-900 dark:hover:text-white border border-black/5 dark:border-white/5 hidden lg:block"
            >
              {isMaximized ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2.5 rounded-2xl bg-red-500/10 hover:bg-red-500/20 transition-all text-red-500 dark:text-red-400 border border-red-500/10"
            >
              <X size={18} />
            </button>
          </div>

          <div className="flex-1 min-h-0 flex flex-col pt-16">
            <div className="flex-1 relative overflow-hidden">
              <AgoraChat schoolId={schoolId} variant="minimal" pageContext={pageContext || undefined} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
