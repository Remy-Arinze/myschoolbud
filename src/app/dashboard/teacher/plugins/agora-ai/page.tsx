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
            <div className="relative flex min-h-[calc(100vh-8.5rem)] flex-col">
                <FadeInUp duration={0.8} className="flex min-h-0 flex-1 flex-col items-center justify-center py-2 md:py-3">
                    {schoolId ? (
                        <div className="lois-shell lois-stage flex min-h-0 w-full max-w-[44rem] flex-1 flex-col overflow-hidden">
                            <AgoraChat
                                schoolId={schoolId}
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
