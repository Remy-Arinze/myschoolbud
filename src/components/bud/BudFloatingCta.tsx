'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useGetBudMeQuery } from '@/lib/store/api/budApi';
import { BudMark } from '@/components/bud/BudMark';

export function BudFloatingCta() {
  const pathname = usePathname();
  const router = useRouter();
  const { data } = useGetBudMeQuery();
  const name = data?.data?.profile?.companionName || data?.profile?.companionName || 'Bud';

  if (pathname?.includes('/assessments/') || pathname?.includes('/bud')) return null;

  return (
    <button
      type="button"
      onClick={() => router.push('/dashboard/student/bud')}
      className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-amber-600 px-4 py-3 text-white shadow-lg hover:bg-amber-500"
    >
      <BudMark size="sm" className="bg-white/20 shadow-none" />
      <span className="text-sm font-semibold">{name}</span>
    </button>
  );
}
