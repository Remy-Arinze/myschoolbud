'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';

/** @deprecated Use /dashboard/school/timetables?tab=exam */
export default function ExamTimetablesRedirectPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', 'exam');
    router.replace(`/dashboard/school/timetables?${params.toString()}`);
  }, [router, searchParams]);

  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
    </div>
  );
}
