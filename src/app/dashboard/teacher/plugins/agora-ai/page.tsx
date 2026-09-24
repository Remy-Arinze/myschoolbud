'use client';

import { AgoraChat } from '@/components/ai/AgoraChat';
import {
  buildTeacherLoisWorkspace,
  teacherLoisPageContext,
  type TeacherLoisClass,
} from '@/components/ai/teacherLoisWorkspace';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useGetMyTeacherSchoolQuery } from '@/lib/store/api/schoolAdminApi';
import { useTeacherDashboard } from '@/hooks/useTeacherDashboard';
import { useSearchParams } from 'next/navigation';

export default function AgoraAIPage() {
  const { data: schoolResponse } = useGetMyTeacherSchoolQuery();
  const schoolId = schoolResponse?.data?.id;
  const searchParams = useSearchParams();
  const conversationId = searchParams.get('id');
  const { classes, formClasses, schoolType, isLoadingClasses, teacher } = useTeacherDashboard();

  const formNoun = schoolType === 'PRIMARY' ? 'My class' : 'My form';
  const classRows = (classes || []) as TeacherLoisClass[];
  const formRows = (formClasses || []) as TeacherLoisClass[];
  const workspace = buildTeacherLoisWorkspace({
    teacherId: teacher?.id,
    classesReady: Boolean(teacher?.id) && !isLoadingClasses,
    classes: classRows,
    formClasses: formRows,
    formNoun,
  });
  const pageContext = schoolId
    ? teacherLoisPageContext(schoolId, formRows, formNoun)
    : undefined;

  return (
    <ProtectedRoute roles={['TEACHER']}>
      <div className="flex h-[calc(100dvh-8.5rem)] min-h-0 flex-col">
        {schoolId && pageContext ? (
          <AgoraChat
            schoolId={schoolId}
            initialConversationId={conversationId || undefined}
            variant="page"
            pageContext={pageContext}
            workspace={workspace}
          />
        ) : (
          <div className="flex flex-1 items-center justify-center italic text-light-text-muted dark:text-dark-text-muted">
            Connecting to your school network...
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
