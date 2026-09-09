'use client';

export function ProChip({ className = '' }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center rounded px-1.5 py-0.5 font-bold uppercase tracking-wider bg-agora-blue/10 text-agora-blue ${className}`}
      style={{ fontSize: '9px' }}
    >
      Pro
    </span>
  );
}
