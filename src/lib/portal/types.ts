export interface PortalBranding {
  schoolId: string;
  name: string;
  slug: string;
  logo: string | null;
  accentColor: string | null;
  faviconUrl: string | null;
  loginTagline: string | null;
  hidePlatformMark: boolean;
  customDomain: string | null;
  portalUrl: string;
}
