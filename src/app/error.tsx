'use client';

import { useEffect } from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';
import { openobserveLogs } from '@openobserve/browser-logs';

/**
 * Root error boundary — catches any uncaught error inside the root layout's {children}.
 * Per-screen error.tsx files take priority; this only fires if they don't exist or re-throw.
 *
 * In development, Next.js still shows its own error overlay on top — this boundary
 * does not suppress it.
 */
export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') {
      openobserveLogs.logger.error('[RootError Boundary]', {
        message: error.message,
        digest: error.digest,
        boundary: 'root-error',
      });
    } else {
      console.error('[RootError Boundary]', error);
    }
  }, [error]);

  const isChunkError =
    error.message?.includes('ChunkLoadError') ||
    error.message?.includes('Loading chunk') ||
    error.message?.includes('Failed to fetch dynamically imported module');

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Icon */}
        <div className="relative inline-block">
          <div className="text-8xl font-black text-blue-600/15 dark:text-blue-400/15 select-none">!</div>
          <div className="absolute inset-0 flex items-center justify-center">
            <AlertCircle className="h-14 w-14 text-blue-600 dark:text-blue-400" />
          </div>
        </div>

        {/* Heading */}
        <h1
          className="text-2xl font-bold text-[var(--light-text-primary)] dark:text-white tracking-tight"
          style={{ fontFamily: 'var(--font-heading, system-ui)' }}
        >
          {isChunkError ? 'Update Available' : 'Something went wrong'}
        </h1>

        {/* Description */}
        <p className="text-sm text-[var(--light-text-secondary)] dark:text-[var(--dark-text-secondary)] max-w-xs mx-auto leading-relaxed">
          {isChunkError
            ? 'A new version of Myschoolbud is available. Click below to refresh and get the latest updates.'
            : "We hit an unexpected issue. Our team has been notified. You can try again or head back to safety."}
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center items-center pt-2">
          <button
            onClick={isChunkError ? () => window.location.reload() : reset}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[var(--agora-blue,#2490FD)] hover:brightness-110 text-white font-semibold text-sm transition-all active:scale-[0.97] shadow-md shadow-blue-500/20"
          >
            <RefreshCw className="h-4 w-4" />
            {isChunkError ? 'Refresh Now' : 'Try Again'}
          </button>
          <a
            href="/dashboard"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl border border-[var(--light-border)] dark:border-[var(--dark-border)] text-[var(--light-text-secondary)] dark:text-[var(--dark-text-secondary)] hover:bg-[var(--light-hover)] dark:hover:bg-[var(--dark-hover)] font-semibold text-sm transition-all"
          >
            <Home className="h-4 w-4" />
            Go to Dashboard
          </a>
        </div>

        {/* Digest (non-production debug aid) */}
        {error.digest && (
          <p className="text-[10px] text-[var(--light-text-muted)] dark:text-[var(--dark-text-muted)] font-mono mt-4">
            Error ID: {error.digest}
          </p>
        )}
      </div>
    </div>
  );
}
