'use client';

import React, { useState } from 'react';
import { X, Maximize2, Minimize2, Sparkles } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { AgoraChat } from './AgoraChat';
import { cn } from '@/lib/utils';
import { useTheme } from '@/contexts/ThemeContext';

import { AgoraAssistant } from '@/components/ai/AgoraAssistant';

interface AiChatDrawerProps {
  schoolId: string;
  isOpen: boolean;
  onClose: () => void;
}

export const AiChatDrawer: React.FC<AiChatDrawerProps> = ({ schoolId, isOpen, onClose }) => {
  const [isMaximized, setIsMaximized] = useState(false);
  const { theme } = useTheme();
  const pathname = usePathname();
  
  const pageContext = `The user is currently viewing the page at path: ${pathname}. Provide context-aware assistance if they ask about their current screen.`;

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-md z-[99] animate-in fade-in duration-300"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div
        className={cn(
          "fixed right-0 bottom-0 z-[100] transition-all duration-700 cubic-bezier(0.4, 0, 0.2, 1) transform flex flex-col overflow-hidden rounded-t-[3rem] lg:rounded-tr-none lg:rounded-l-[3rem] border-l border-t",
          "bg-white dark:bg-[var(--dark-bg)] backdrop-blur-2xl border-gray-200/50 dark:border-white/10 shadow-[0_-20px_80px_-20px_rgba(0,0,0,0.1)] dark:shadow-[0_-20px_80px_-20px_rgba(0,0,0,0.8)]",
          isOpen ? "translate-y-0 lg:translate-x-0" : "translate-y-full lg:translate-x-full lg:translate-y-0",
          isMaximized
            ? "w-screen h-screen rounded-none"
            : "w-full lg:w-[550px] h-[90vh]",
          theme === 'dark' ? 'dark' : ''
        )}
      >
        {/* Glow Decor */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/10 dark:bg-indigo-600/20 blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-600/5 dark:bg-blue-600/10 blur-[100px] pointer-events-none" />

        <div className="flex-1 overflow-hidden relative flex flex-col">

        {/* Header Controls */}
        <div className="absolute top-6 right-8 z-[101] flex items-center gap-3">
          <button
            onClick={() => setIsMaximized(!isMaximized)}
            className="p-2.5 rounded-2xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-all text-gray-500 dark:text-white/40 hover:text-gray-900 dark:hover:text-white border border-black/5 dark:border-white/5 hidden lg:block shadow-sm"
          >
            {isMaximized ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
          </button>
          <button
            onClick={onClose}
            className="p-2.5 rounded-2xl bg-red-500/10 hover:bg-red-500/20 transition-all text-red-500 dark:text-red-400 border border-red-500/10 shadow-sm"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 min-h-0 flex flex-col pt-16">
          <div className="flex-1 relative overflow-hidden">
            <AgoraChat schoolId={schoolId} variant="minimal" pageContext={pageContext} />
          </div>
        </div>
      </div>
      </div>
    </>
  );
};
