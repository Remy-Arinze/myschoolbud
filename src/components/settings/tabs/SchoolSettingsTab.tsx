'use client';

import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import { SchoolProfileTab } from '@/components/settings/SchoolProfileTab';
import { StructureSettingsSection } from '@/components/settings/tabs/StructureSettingsSection';
import { PortalBrandingSection } from '@/components/settings/tabs/PortalBrandingSection';

interface SchoolSettingsTabProps {
  token: string | null;
  router: AppRouterInstance;
}

export function SchoolSettingsTabContent({ token, router }: SchoolSettingsTabProps) {
  return (
    <div className="space-y-8">
      <SchoolProfileTab token={token} router={router} />
      {!token && <PortalBrandingSection />}
      {!token && <StructureSettingsSection />}
    </div>
  );
}
