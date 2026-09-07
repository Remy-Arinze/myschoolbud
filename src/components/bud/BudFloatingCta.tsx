'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Sparkles } from 'lucide-react';
import { useGetBudMeQuery } from '@/lib/store/api/budApi';

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
      <Sparkles className="h-4 w-4" />
      <span className="text-sm font-semibold">{name}</span>
    </button>
  );
}
