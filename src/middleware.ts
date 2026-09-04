import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { extractPortalSlug, isApexHost } from '@/lib/portal/host';

export function middleware(request: NextRequest) {
  const host = request.headers.get('host') || '';
  const slugHeader = request.headers.get('x-msb-slug');
  const slug = slugHeader || extractPortalSlug(host);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-portal-host', host);
  if (slug) {
    requestHeaders.set('x-portal-slug', slug);
  }

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });
  response.headers.set('x-portal-host', host);
  if (slug) response.headers.set('x-portal-slug', slug);

  const isPortal = !!slug || (!!host && !isApexHost(host));
  if (isPortal && !request.nextUrl.pathname.startsWith('/apply')) {
    response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|assets|sw.js).*)'],
};
