'use client';

import { AgoraChat } from '@/components/ai/AgoraChat';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useGetMyTeacherSchoolQuery } from '@/lib/store/api/schoolAdminApi';
import { FadeInUp } from '@/components/ui/FadeInUp';
import { useSearchParams } from 'next/navigation';

export default function AgoraAIPage() {
    const { data: schoolResponse } = useGetMyTeacherSchoolQuery();
    const schoolId = schoolResponse?.data?.id;
    const searchParams = useSearchParams();
    const conversationId = searchParams.get('id');

    return (
        <ProtectedRoute roles={['TEACHER']}>
            <div className="relative flex h-[calc(100vh-6.5rem)] min-h-[32rem] flex-col">
                <FadeInUp duration={0.6} className="flex min-h-0 flex-1 flex-col">
                    {schoolId ? (
                        <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200/70 bg-[var(--light-bg)] dark:border-white/10 dark:bg-[var(--dark-bg)]">
                            <AgoraChat
                                schoolId={schoolId}
                                fullPage
                                initialConversationId={conversationId || undefined}
                                pageContext="The user is currently on the main Myschoolbud AI fullscreen chat interface."
                            />
                        </div>
                    ) : (
                        <div className="flex flex-1 items-center justify-center italic text-light-text-muted dark:text-white/20">
                            Connecting to your school network...
                        </div>
                    )}
                </FadeInUp>
            </div>
        </ProtectedRoute>
    );
}
