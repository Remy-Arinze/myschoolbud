'use client';

import { AgoraChat } from '@/components/ai/AgoraChat';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useGetMyTeacherSchoolQuery } from '@/lib/store/api/schoolAdminApi';
import { FadeInUp } from '@/components/ui/FadeInUp';
import { cn } from '@/lib/utils';
import { useSearchParams } from 'next/navigation';

export default function AgoraAIPage() {
    const { data: schoolResponse } = useGetMyTeacherSchoolQuery();
    const schoolId = schoolResponse?.data?.id;
    const searchParams = useSearchParams();
    const conversationId = searchParams.get('id');

    return (
        <ProtectedRoute roles={['TEACHER']}>
            <div className={cn(
                "min-h-screen bg-transparent text-light-text-primary dark:text-white overflow-hidden relative flex flex-col transition-colors duration-300",
                "before:absolute before:inset-0 before:bg-gradient-to-b before:from-indigo-50/50 before:to-white/20 before:pointer-events-none dark:before:hidden"
            )}>
                <div className="flex-1 w-full max-w-7xl mx-auto px-2 md:px-6 py-4 md:py-6 relative z-10 flex flex-col">
                    {/* Main Chat Interface */}
                    <FadeInUp duration={0.8} className="flex-1 flex flex-col">
                        {schoolId ? (
                            <AgoraChat 
                                schoolId={schoolId} 
                                initialConversationId={conversationId || undefined} 
                                pageContext="The user is currently on the main Myschoolbud AI fullscreen chat interface."
                            />
                        ) : (
                            <div className="flex-1 flex items-center justify-center bg-light-card/50 dark:bg-white/5 italic text-light-text-muted dark:text-white/20">
                                Connecting to your school network...
                            </div>
                        )}
                    </FadeInUp>
                </div>
            </div>
        </ProtectedRoute>
    );
}
