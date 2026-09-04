import { getRoleBasedRedirect } from '@/utils/security/redirect-validator';

export function postLoginPath(user: {
  role?: string | null;
  lifecycleStatus?: string | null;
}): string {
  const lifecycle = user.lifecycleStatus || 'ACTIVE';
  if (lifecycle === 'DEACTIVATED' && user.role === 'STUDENT') {
    return '/dashboard/student/school-suspended';
  }
  if (lifecycle === 'DEACTIVATED' && user.role === 'SCHOOL_ADMIN') {
    return '/dashboard/school/reactivate';
  }
  return getRoleBasedRedirect(user.role || '');
}
