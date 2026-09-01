'use client';

import { useEffect } from 'react';
// global-error renders before any providers, so we log directly to console here.
// OpenObserve's forwardErrorsToLogs picks up unhandled errors automatically.

/**
 * global-error.tsx — the nuclear option.
 *
 * This REPLACES the root layout when it throws, so it must provide its own
 * <html> and <body> tags. It covers scenarios where:
 *   1. The root layout itself crashes (e.g. StoreProvider, ThemeProvider throws)
 *   2. A ChunkLoadError prevents the layout chunk from loading at all
 *
 * This file intentionally has ZERO imports from the design system or the store
 * to guarantee it can always render, even if those modules are the ones that broke.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // global-error renders before any providers (no OpenObserve context available)
    // so we fall back to console.error in all environments; the error will still
    // be forwarded to OpenObserve by forwardErrorsToLogs once the SDK loads.
    console.error('[GlobalError Boundary]', error);
  }, [error]);

  const isChunkError =
    error.message?.includes('ChunkLoadError') ||
    error.message?.includes('Loading chunk') ||
    error.message?.includes('Failed to fetch dynamically imported module');

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Agora — Something went wrong</title>
        <style
          dangerouslySetInnerHTML={{
            __html: `
              *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
              body {
                font-family: 'Montserrat', 'Poppins', system-ui, -apple-system, sans-serif;
                background: #1C1C1D;
                color: #ffffff;
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
              }
              .container {
                max-width: 440px;
                width: 100%;
                text-align: center;
                padding: 2rem;
              }
              .icon-wrap {
                position: relative;
                display: inline-block;
                margin-bottom: 1.5rem;
              }
              .icon-bg {
                font-size: 6rem;
                font-weight: 900;
                color: rgba(36, 144, 253, 0.12);
                user-select: none;
                line-height: 1;
              }
              .icon-fg {
                position: absolute;
                inset: 0;
                display: flex;
                align-items: center;
                justify-content: center;
              }
              .icon-fg svg {
                width: 3.5rem;
                height: 3.5rem;
                color: #2490FD;
              }
              h1 {
                font-size: 1.5rem;
                font-weight: 700;
                margin-bottom: 0.75rem;
                letter-spacing: -0.01em;
              }
              p {
                font-size: 0.875rem;
                color: #9ca3af;
                line-height: 1.6;
                margin-bottom: 1.5rem;
                max-width: 360px;
                margin-left: auto;
                margin-right: auto;
              }
              .actions {
                display: flex;
                gap: 0.75rem;
                justify-content: center;
                flex-wrap: wrap;
              }
              .btn {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                padding: 0.625rem 1.5rem;
                border-radius: 0.75rem;
                font-weight: 600;
                font-size: 0.875rem;
                cursor: pointer;
                transition: all 150ms ease;
                text-decoration: none;
                border: none;
              }
              .btn:active { transform: scale(0.97); }
              .btn-primary {
                background: #2490FD;
                color: white;
                box-shadow: 0 4px 14px rgba(36, 144, 253, 0.25);
              }
              .btn-primary:hover { filter: brightness(1.1); }
              .btn-outline {
                background: transparent;
                color: #9ca3af;
                border: 1px solid #232327;
              }
              .btn-outline:hover { background: #1f1f22; color: white; }
              .digest {
                margin-top: 2rem;
                font-size: 0.625rem;
                font-family: monospace;
                color: #6b7280;
              }
            `,
          }}
        />
      </head>
      <body>
        <div className="container">
          <div className="icon-wrap">
            <div className="icon-bg">!</div>
            <div className="icon-fg">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
          </div>

          <h1>{isChunkError ? 'Update Available' : 'Something went wrong'}</h1>
          <p>
            {isChunkError
              ? 'A new version of Agora has been deployed. Click below to refresh and load the latest version.'
              : "We've hit an unexpected issue. Our team has been notified and is looking into it. Please try refreshing or head back to the home page."}
          </p>

          <div className="actions">
            <button
              className="btn btn-primary"
              onClick={isChunkError ? () => window.location.reload() : reset}
            >
              {isChunkError ? 'Refresh Now' : 'Try Again'}
            </button>
            <a href="/" className="btn btn-outline">
              Go Home
            </a>
          </div>

          {error.digest && (
            <div className="digest">Error ID: {error.digest}</div>
          )}
        </div>
      </body>
    </html>
  );
}
