'use client';

import { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { FadeInUp } from '@/components/ui/FadeInUp';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { PermissionGate } from '@/components/permissions/PermissionGate';
import { PermissionResource, PermissionType } from '@/hooks/usePermissions';
import { useSelector } from 'react-redux';
import { RootState } from '@/lib/store/store';
import {
  SchoolSettingsTabs,
  useSchoolSettingsTab,
} from '@/components/settings/SchoolSettingsTabs';
import { SchoolSettingsTabContent } from '@/components/settings/tabs/SchoolSettingsTab';
import { CalendarSettingsTab } from '@/components/settings/tabs/CalendarSettingsTab';
import { GradingSettingsTab } from '@/components/settings/tabs/GradingSettingsTab';
import { PermissionsSettingsTab } from '@/components/settings/tabs/PermissionsSettingsTab';
import { AdmissionsSettingsTab } from '@/components/settings/tabs/AdmissionsSettingsTab';
import { TimetableSettingsTab } from '@/components/settings/tabs/TimetableSettingsTab';
import { AttendanceSettingsTab } from '@/components/settings/tabs/AttendanceSettingsTab';
import { CommunicationsSettingsTab } from '@/components/settings/tabs/CommunicationsSettingsTab';
import { FinanceSettingsTab } from '@/components/settings/tabs/FinanceSettingsTab';
import { CurriculumAISettingsTab } from '@/components/settings/tabs/CurriculumAISettingsTab';
import { SecuritySettingsTab } from '@/components/settings/tabs/SecuritySettingsTab';
import { DataSettingsTab } from '@/components/settings/tabs/DataSettingsTab';

function SettingsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const activeTab = useSchoolSettingsTab('school');

  const user = useSelector((state: RootState) => state.auth.user);
  const schoolId = user?.schoolId;

  return (
    <ProtectedRoute roles={['SCHOOL_ADMIN']}>
      <PermissionGate resource={PermissionResource.SETTINGS} type={PermissionType.READ}>
        <div className="w-full max-w-6xl mx-auto p-6">
          <FadeInUp from={{ opacity: 0, y: -20 }} to={{ opacity: 1, y: 0 }} duration={0.5} className="mb-6">
            <h1
              className="font-bold text-light-text-primary dark:text-dark-text-primary mb-1"
              style={{ fontSize: 'var(--text-page-title)' }}
            >
              Settings
            </h1>
            <p
              className="text-light-text-secondary dark:text-dark-text-secondary"
              style={{ fontSize: 'var(--text-page-subtitle)' }}
            >
              Configure school profile, policies, permissions, admissions, timetables, and more.
            </p>
          </FadeInUp>

          <SchoolSettingsTabs activeTab={activeTab} />

          {(activeTab === 'school' || token) && (
            <SchoolSettingsTabContent token={token} router={router} />
          )}
          {activeTab === 'calendar' && !token && <CalendarSettingsTab />}
          {activeTab === 'grading' && !token && <GradingSettingsTab />}
          {activeTab === 'permissions' && !token && <PermissionsSettingsTab />}
          {activeTab === 'admissions' && !token && <AdmissionsSettingsTab />}
          {activeTab === 'timetable' && !token && <TimetableSettingsTab />}
          {activeTab === 'attendance' && !token && <AttendanceSettingsTab />}
          {activeTab === 'communications' && !token && <CommunicationsSettingsTab />}
          {activeTab === 'finance' && !token && <FinanceSettingsTab />}
          {activeTab === 'lois' && schoolId && !token && <CurriculumAISettingsTab schoolId={schoolId} />}
          {activeTab === 'data' && schoolId && !token && <DataSettingsTab schoolId={schoolId} />}
          {activeTab === 'security' && !token && <SecuritySettingsTab />}
        </div>
      </PermissionGate>
    </ProtectedRoute>
  );
}

export default function SettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-24">
          <LoadingSpinner size="lg" />
        </div>
      }
    >
      <SettingsPageContent />
    </Suspense>
  );
}
