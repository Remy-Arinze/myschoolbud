'use client';

import React from 'react';
import { BrainCircuit } from 'lucide-react';
import { cn } from '@/lib/utils';

import { LoisInsightBadge } from './LoisInboxCard';
import { LoisOrb } from './LoisOrb';

interface FloatingAiCtaProps {
  onClick: () => void;
  className?: string;
  schoolId?: string;
}

export const FloatingAiCta: React.FC<FloatingAiCtaProps> = ({ onClick, className, schoolId }) => {
  return (
    <button
      onClick={onClick}
      className={cn(
        "fixed bottom-8 right-8 z-[90] group flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0A0A0B] text-white shadow-[0_15px_30px_-8px_rgba(0,0,0,0.8)] transition-all duration-500 hover:scale-105 active:scale-95 border-none overflow-hidden isolate",
        className
      )}
    >
      {/* Animated Gradient Border Layer */}
      <div className="absolute inset-0 p-[1.5px] -z-10 rounded-xl overflow-hidden">
        <div className="absolute inset-[-200%] bg-[conic-gradient(from_0deg,transparent_0deg,#7D52FF_90deg,transparent_180deg,#00D1FF_270deg,transparent_360deg)] animate-[spin_4s_linear_infinite]" />
      </div>

      {/* Inner Surface */}
      <div className="absolute inset-[1.5px] bg-[#0A0A0B] rounded-[calc(0.75rem-1px)] -z-10 group-hover:bg-[#111113] transition-colors" />

      {/* Gloss Effect */}
      <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent opacity-50 pointer-events-none" />

      <div className="relative flex items-center gap-2">
        <LoisOrb size="xs" className="group-hover:scale-110 transition-transform duration-500" />
        
        <span className="font-heading text-sm font-semibold tracking-tight" style={{ fontFamily: 'var(--font-heading)' }}>
          Ask Lois
        </span>
        {schoolId ? <LoisInsightBadge schoolId={schoolId} /> : null}

        <div className="ml-0.5 p-1 rounded-md bg-white/5 border border-white/10 group-hover:bg-indigo-500/10 group-hover:border-indigo-500/20 transition-all">
            <BrainCircuit size={10} className="text-white/40 group-hover:text-indigo-400" />
        </div>
      </div>

      {/* External Glow Pulse */}
      <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500/20 via-blue-500/20 to-purple-500/20 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 -z-20" />
      
      {/* Animated Shine */}
      <div className="absolute top-0 -inset-full h-full w-1/2 z-5 block transform -skew-x-12 bg-gradient-to-r from-transparent via-white/10 to-transparent group-hover:animate-[shine_1.5s_ease-in-out_infinite]" />

      <style jsx>{`
        @keyframes shine {
          100% {
            left: 200%;
          }
        }
      `}</style>
    </button>
  );
};
