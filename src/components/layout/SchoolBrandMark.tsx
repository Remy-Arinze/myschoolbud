'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useSelector } from 'react-redux';
import type { RootState } from '@/lib/store/store';
import { WordedLogo } from '@/components/layout/WordedLogo';
import { usePortal } from '@/components/portal/PortalProvider';
import {
  useGetMySchoolQuery,
  useGetMyTeacherSchoolQuery,
  useGetMyStudentSchoolQuery,
} from '@/lib/store/api/schoolAdminApi';
import { getRoleBasedRedirect } from '@/utils/security/redirect-validator';

const FALLBACK_LOGO = '/assets/logos/agora_main.png';

export function SchoolBrandMark({ size = 'md' }: { size?: 'sm' | 'md' }) {
  const userRole = useSelector((state: RootState) => state.auth.user?.role);
  const { branding } = usePortal();
  const { data: adminSchool } = useGetMySchoolQuery(undefined, { skip: userRole !== 'SCHOOL_ADMIN' });
  const { data: teacherSchool } = useGetMyTeacherSchoolQuery(undefined, { skip: userRole !== 'TEACHER' });
  const { data: studentSchool } = useGetMyStudentSchoolQuery(undefined, { skip: userRole !== 'STUDENT' });
  const school = adminSchool?.data || teacherSchool?.data || studentSchool?.data;
  const logo = branding?.logo || school?.logo || null;
  const name = branding?.name || school?.name || null;
  const hideMark = branding?.hidePlatformMark;
  const homeHref = userRole && userRole !== 'SUPER_ADMIN' ? getRoleBasedRedirect(userRole) : '/';
  const iconPx = size === 'sm' ? 24 : 32;
  const iconClass = size === 'sm' ? 'h-6 w-6' : 'h-8 w-8';

  if (userRole === 'SUPER_ADMIN' || !name) {
    return (
      <Link href="/" className="flex items-center py-1 px-3 relative z-20">
        <WordedLogo size={size} priority />
      </Link>
    );
  }

  return (
    <Link href={homeHref} className="flex items-center py-1 px-3 relative z-20 gap-2 min-w-0">
      {logo ? (
        <img src={logo} alt={name} className={`${iconClass} object-contain rounded flex-shrink-0`} />
      ) : (
        <Image
          src={FALLBACK_LOGO}
          alt=""
          width={iconPx}
          height={iconPx}
          className={`${iconClass} object-contain flex-shrink-0`}
          priority
          aria-hidden
        />
      )}
      <div className="min-w-0">
        <div className="font-bold truncate text-[var(--light-text-primary)] dark:text-[var(--dark-text-primary)]">
          {name}
        </div>
        {!hideMark && (
          <div className="text-[10px] text-[var(--light-text-muted)] dark:text-[var(--dark-text-muted)] truncate">
            Powered by Myschoolbud
          </div>
        )}
      </div>
    </Link>
  );
}
