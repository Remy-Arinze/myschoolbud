'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import type { RootState } from '@/lib/store/store';
import { extractPortalSlug, isApexHost, apexOrigin } from '@/lib/portal/host';
import type { PortalBranding } from '@/lib/portal/types';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface PortalContextValue {
  branding: PortalBranding | null;
  slug: string | null;
  isPortalHost: boolean;
  isLoading: boolean;
  missingPortal: boolean;
}

const PortalContext = createContext<PortalContextValue>({
  branding: null,
  slug: null,
  isPortalHost: false,
  isLoading: true,
  missingPortal: false,
});

export function usePortal() {
  return useContext(PortalContext);
}

export function PortalProvider({ children }: { children: React.ReactNode }) {
  const [branding, setBranding] = useState<PortalBranding | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [missingPortal, setMissingPortal] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const userRole = useSelector((state: RootState) => state.auth.user?.role);

  const host = typeof window !== 'undefined' ? window.location.host : '';
  const slug = useMemo(() => (host ? extractPortalSlug(host) : null), [host]);
  const isPortalHost = !!slug || !!branding;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const currentHost = window.location.host;
    const slugFromHost = extractPortalSlug(currentHost);
    const maybeCustom = !isApexHost(currentHost) && !slugFromHost && !currentHost.includes('vercel.app');
    if (!slugFromHost && !maybeCustom) {
      setBranding(null);
      setMissingPortal(false);
      setIsLoading(false);
      sessionStorage.removeItem('msbPortalSchoolId');
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    fetch(`${API}/public/portals/by-host?host=${encodeURIComponent(currentHost)}`)
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return;
        const data = json?.data ?? null;
        setBranding(data);
        setMissingPortal(!!slugFromHost && !data);
        if (data?.schoolId) {
          sessionStorage.setItem('msbPortalSchoolId', data.schoolId);
        } else {
          sessionStorage.removeItem('msbPortalSchoolId');
        }
      })
      .catch(() => {
        if (!cancelled) {
          setBranding(null);
          setMissingPortal(true);
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [host]);

  useEffect(() => {
    if (!branding) return;
    if (branding.accentColor) {
      document.documentElement.style.setProperty('--school-accent', branding.accentColor);
    }
    if (branding.faviconUrl) {
      let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }
      link.href = branding.faviconUrl;
    }
    if (branding.accentColor) {
      let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
      if (!meta) {
        meta = document.createElement('meta');
        meta.name = 'theme-color';
        document.head.appendChild(meta);
      }
      meta.content = branding.accentColor;
    }
  }, [branding]);

  useEffect(() => {
    if (userRole === 'SUPER_ADMIN' && isPortalHost && pathname?.startsWith('/dashboard')) {
      window.location.href = `${apexOrigin()}/dashboard/super-admin/overview`;
    }
  }, [userRole, isPortalHost, pathname, router]);

  if (missingPortal && isPortalHost && !isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--light-bg)] dark:bg-[var(--dark-bg)] px-6">
        <div className="max-w-md text-center space-y-3">
          <h1 className="text-2xl font-bold text-[var(--light-text-primary)] dark:text-[var(--dark-text-primary)]">
            School not found
          </h1>
          <p className="text-[var(--light-text-secondary)] dark:text-[var(--dark-text-secondary)]">
            This portal address is not active yet. If you just registered, wait until your school is verified.
          </p>
          <a href={apexOrigin()} className="text-[#2490FD] hover:underline">
            Go to Myschoolbud
          </a>
        </div>
      </div>
    );
  }

  return (
    <PortalContext.Provider value={{ branding, slug, isPortalHost, isLoading, missingPortal }}>
      {children}
    </PortalContext.Provider>
  );
}
