export function maybeRedirectToSchoolPortal(data: {
  transferCode?: string;
  portalUrl?: string;
}): boolean {
  if (!data.transferCode || !data.portalUrl || typeof window === 'undefined') {
    return false;
  }
  try {
    const dest = new URL(data.portalUrl);
    if (dest.host === window.location.host) {
      return false;
    }
    window.location.href = `${data.portalUrl.replace(/\/+$/, '')}/auth/complete?code=${encodeURIComponent(data.transferCode)}`;
    return true;
  } catch {
    return false;
  }
}
