'use client';

/**
 * Renders an inline script that runs on the server HTML parse (no FOUC),
 * then becomes inert on the client so React 19 does not warn that
 * scripts inside components are never executed.
 *
 * @see https://nextjs.org/docs/app/guides/preventing-flash-before-hydration
 */
export function InlineScript({
  html,
  type = 'text/javascript',
}: {
  html: string;
  type?: string;
}) {
  return (
    <script
      type={typeof window === 'undefined' ? type : 'text/plain'}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
