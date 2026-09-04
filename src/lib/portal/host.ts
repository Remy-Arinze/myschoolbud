export const RESERVED_SLUGS = new Set([
  'www', 'www2', 'app', 'api', 'admin', 'auth', 'mail', 'status', 'help',
  'docs', 'staging', 'cdn', 'static', 'public', 'assets',
]);

const ROOT_DOMAINS = ['myschoolbud.com'];

export function normalizeSlug(raw: string): string {
  return raw
    .toLowerCase()
    .trim()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32);
}

export function extractPortalSlug(host: string): string | null {
  const hostname = host.split(':')[0].toLowerCase();
  if (hostname === 'localhost' || hostname === '127.0.0.1') return null;
  if (hostname.endsWith('.localhost')) {
    const sub = hostname.slice(0, -'.localhost'.length);
    return sub && !sub.includes('.') ? sub : null;
  }
  for (const root of ROOT_DOMAINS) {
    if (hostname === root || hostname === `www.${root}`) return null;
    if (hostname.endsWith(`.${root}`)) {
      const sub = hostname.slice(0, -`.${root}`.length);
      if (sub && !sub.includes('.') && !RESERVED_SLUGS.has(sub)) return sub;
      return null;
    }
  }
  return null;
}

export function isApexHost(host: string): boolean {
  const hostname = host.split(':')[0].toLowerCase();
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === 'myschoolbud.com' ||
    hostname === 'www.myschoolbud.com'
  );
}

export function apexOrigin(): string {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host === 'localhost' || host.endsWith('.localhost') || host === '127.0.0.1') {
      return `${window.location.protocol}//localhost:${window.location.port || '3000'}`;
    }
  }
  return process.env.NEXT_PUBLIC_APEX_URL || 'https://myschoolbud.com';
}

export function applyAdmissionUrl(schoolId?: string | null): string {
  if (typeof window !== 'undefined' && extractPortalSlug(window.location.host)) {
    return `${window.location.origin}/apply`;
  }
  if (schoolId) return `${typeof window !== 'undefined' ? window.location.origin : ''}/admission/${schoolId}`;
  return '/apply';
}
