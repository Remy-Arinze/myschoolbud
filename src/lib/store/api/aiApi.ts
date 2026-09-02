import { apiSlice } from './apiSlice';
import {
    normalizeSseErrorData,
    streamErrorPayloadFromHttp,
    type AiChatStreamErrorPayload,
} from '@/lib/ai-chat-errors';

export type { AiChatStreamErrorPayload };

export interface LoisConfigDto {
    id: string;
    schoolId: string;
    customGreeting: string | null;
    toneNote: string | null;
    restrictedTopics: string | null;
    schoolContext: string | null;
    updatedAt: string;
    createdAt: string;
}

export interface LoisConfigInput {
    customGreeting?: string | null;
    toneNote?: string | null;
    restrictedTopics?: string | null;
    schoolContext?: string | null;
}

export interface SystemPromptConfigDto {
    id: string;
    identityOverride: string | null;
    additionalRules: string | null;
    teacherRulesOverride: string | null;
    adminRulesOverride: string | null;
    studentRulesOverride: string | null;
    internalNotes: string | null;
    updatedAt: string;
    createdAt: string;
}

export interface SystemPromptConfigInput {
    identityOverride?: string | null;
    additionalRules?: string | null;
    teacherRulesOverride?: string | null;
    adminRulesOverride?: string | null;
    studentRulesOverride?: string | null;
    internalNotes?: string | null;
}

export interface LoisToolDefinition {
    name: string;
    description: string;
    parameters: {
        type: string;
        properties: Record<string, { type: string; description?: string; enum?: string[]; items?: object }>;
        required?: string[];
    };
}

export type SkillCategory = 'behavior' | 'knowledge' | 'tone' | 'workflow';
export type SkillTargetRole = 'TEACHER' | 'SCHOOL_ADMIN' | 'STUDENT' | 'ALL';

export interface LoisSkillDto {
    id: string;
    name: string;
    description: string;
    content: string;
    targetRoles: string; // comma-separated e.g. "TEACHER,STUDENT"
    category: SkillCategory;
    isActive: boolean;
    priority: number;
    internalNotes: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface CreateSkillInput {
    name: string;
    description: string;
    content: string;
    targetRoles?: string;
    category?: SkillCategory;
    isActive?: boolean;
    priority?: number;
    internalNotes?: string | null;
}

export interface UpdateSkillInput extends Partial<CreateSkillInput> {}

export const aiApi = apiSlice.injectEndpoints({
    endpoints: (builder) => ({
        generateLessonPlan: builder.mutation<
            any,
            {
                schoolId: string;
                body: {
                    topic: string;
                    subject: string;
                    gradeLevel: string;
                    objectives: string[];
                    duration?: number;
                };
            }
        >({
            query: ({ schoolId, body }) => ({
                url: `/schools/${schoolId}/ai/lesson-plan`,
                method: 'POST',
                body,
            }),
        }),
        generateAssessment: builder.mutation<
            any,
            {
                schoolId: string;
                body: {
                    topic: string;
                    subject: string;
                    gradeLevel: string;
                    questionCount?: number;
                    questionTypes?: ('multiple_choice' | 'short_answer' | 'essay')[];
                    difficulty?: 'easy' | 'medium' | 'hard' | 'mixed';
                    curriculum?: string;
                };
            }
        >({
            query: ({ schoolId, body }) => ({
                url: `/schools/${schoolId}/ai/assessment`,
                method: 'POST',
                body,
            }),
        }),
        generateQuiz: builder.mutation<
            any,
            {
                schoolId: string;
                body: {
                    topic: string;
                    subject: string;
                    gradeLevel: string;
                    questionCount?: number;
                    questionTypes?: ('multiple_choice' | 'true_false' | 'short_answer')[];
                    difficulty?: 'easy' | 'medium' | 'hard';
                };
            }
        >({
            query: ({ schoolId, body }) => ({
                url: `/schools/${schoolId}/ai/quiz`,
                method: 'POST',
                body,
            }),
        }),
        gradeEssay: builder.mutation<
            any,
            {
                schoolId: string;
                body: {
                    essay: string;
                    prompt: string;
                    rubric?: string;
                    maxScore?: number;
                    subject: string;
                    gradeLevel: string;
                };
            }
        >({
            query: ({ schoolId, body }) => ({
                url: `/schools/${schoolId}/ai/grade-essay`,
                method: 'POST',
                body,
            }),
        }),
        // Legacy non-streaming chat (kept for backward compat)
        askAi: builder.mutation<
            { response: string; conversationId: string },
            {
                schoolId: string;
                body: {
                    messages: { role: 'user' | 'assistant' | 'system'; content: string }[];
                    conversationId?: string;
                };
            }
        >({
            query: ({ schoolId, body }) => ({
                url: `/schools/${schoolId}/ai/chat`,
                method: 'POST',
                body,
            }),
            invalidatesTags: ['AiHistory'],
        }),
        getChatHistory: builder.query<any[], { schoolId: string }>({
            query: ({ schoolId }) => `/schools/${schoolId}/ai/history`,
            providesTags: ['AiHistory'],
        }),
        getChatMessages: builder.query<any[], { schoolId: string; conversationId: string }>({
            query: ({ schoolId, conversationId }) => `/schools/${schoolId}/ai/history/${conversationId}`,
            providesTags: (result, error, { conversationId }) => [{ type: 'AiHistory', id: conversationId }],
        }),
        deleteConversation: builder.mutation<{ success: boolean }, { schoolId: string; conversationId: string }>({
            query: ({ schoolId, conversationId }) => ({
                url: `/schools/${schoolId}/ai/history/${conversationId}`,
                method: 'DELETE',
            }),
            invalidatesTags: ['AiHistory'],
        }),

        // ── Lois Config (per-school) ────────────────────────────────────────
        getLoisConfig: builder.query<{ success: boolean; data: LoisConfigDto | null }, string>({
            query: (schoolId) => `/schools/${schoolId}/ai/lois-config`,
            providesTags: (_r, _e, schoolId) => [{ type: 'AiHistory', id: `lois-${schoolId}` }],
        }),
        upsertLoisConfig: builder.mutation<{ success: boolean; data: LoisConfigDto }, { schoolId: string; body: LoisConfigInput }>({
            query: ({ schoolId, body }) => ({
                url: `/schools/${schoolId}/ai/lois-config`,
                method: 'PUT',
                body,
            }),
            invalidatesTags: (_r, _e, { schoolId }) => [{ type: 'AiHistory', id: `lois-${schoolId}` }],
        }),
        deleteLoisConfig: builder.mutation<{ success: boolean }, string>({
            query: (schoolId) => ({
                url: `/schools/${schoolId}/ai/lois-config`,
                method: 'DELETE',
            }),
            invalidatesTags: (_r, _e, schoolId) => [{ type: 'AiHistory', id: `lois-${schoolId}` }],
        }),

        // ── Lois Config (super admin) ───────────────────────────────────────
        adminGetAllLoisConfigs: builder.query<{ success: boolean; data: (LoisConfigDto & { school: { id: string; name: string } })[] }, void>({
            query: () => '/admin/lois/configs',
        }),
        adminGetSystemPromptPreview: builder.query<{ success: boolean; data: { prompt: string; note: string } }, void>({
            query: () => '/admin/lois/system-prompt-preview',
        }),
        adminGetLoisConfig: builder.query<{ success: boolean; data: LoisConfigDto | null }, string>({
            query: (schoolId) => `/admin/lois/configs/${schoolId}`,
        }),
        adminUpsertLoisConfig: builder.mutation<{ success: boolean; data: LoisConfigDto }, { schoolId: string; body: LoisConfigInput }>({
            query: ({ schoolId, body }) => ({
                url: `/admin/lois/configs/${schoolId}`,
                method: 'PUT',
                body,
            }),
        }),
        adminDeleteLoisConfig: builder.mutation<{ success: boolean }, string>({
            query: (schoolId) => ({
                url: `/admin/lois/configs/${schoolId}`,
                method: 'DELETE',
            }),
        }),

        // ── System prompt config (super admin — global) ─────────────────────
        adminGetSystemConfig: builder.query<{ success: boolean; data: SystemPromptConfigDto | null }, void>({
            query: () => '/admin/lois/system-config',
            providesTags: ['LoisSystemConfig'],
        }),
        adminUpsertSystemConfig: builder.mutation<{ success: boolean; data: SystemPromptConfigDto }, SystemPromptConfigInput>({
            query: (body) => ({
                url: '/admin/lois/system-config',
                method: 'PUT',
                body,
            }),
            invalidatesTags: ['LoisSystemConfig'],
        }),
        adminResetSystemConfig: builder.mutation<{ success: boolean }, void>({
            query: () => ({
                url: '/admin/lois/system-config',
                method: 'DELETE',
            }),
            invalidatesTags: ['LoisSystemConfig'],
        }),

        // ── Tools registry ───────────────────────────────────────────────────
        adminGetLoisTools: builder.query<{ success: boolean; data: LoisToolDefinition[] }, void>({
            query: () => '/admin/lois/tools',
        }),

        // ── Skills ───────────────────────────────────────────────────────────
        adminListSkills: builder.query<{ success: boolean; data: LoisSkillDto[] }, void>({
            query: () => '/admin/lois/skills',
            providesTags: ['LoisSkills'],
        }),
        adminCreateSkill: builder.mutation<{ success: boolean; data: LoisSkillDto }, CreateSkillInput>({
            query: (body) => ({ url: '/admin/lois/skills', method: 'POST', body }),
            invalidatesTags: ['LoisSkills'],
        }),
        adminUpdateSkill: builder.mutation<{ success: boolean; data: LoisSkillDto }, { id: string; body: UpdateSkillInput }>({
            query: ({ id, body }) => ({ url: `/admin/lois/skills/${id}`, method: 'PUT', body }),
            invalidatesTags: ['LoisSkills'],
        }),
        adminToggleSkill: builder.mutation<{ success: boolean; data: LoisSkillDto }, string>({
            query: (id) => ({ url: `/admin/lois/skills/${id}/toggle`, method: 'PATCH' }),
            invalidatesTags: ['LoisSkills'],
        }),
        adminDeleteSkill: builder.mutation<{ success: boolean }, string>({
            query: (id) => ({ url: `/admin/lois/skills/${id}`, method: 'DELETE' }),
            invalidatesTags: ['LoisSkills'],
        }),
    }),
});

export const {
    useGenerateLessonPlanMutation,
    useGenerateAssessmentMutation,
    useGenerateQuizMutation,
    useGradeEssayMutation,
    useAskAiMutation,
    useGetChatHistoryQuery,
    useGetChatMessagesQuery,
    useLazyGetChatMessagesQuery,
    useDeleteConversationMutation,
    // Lois Config — school admin
    useGetLoisConfigQuery,
    useUpsertLoisConfigMutation,
    useDeleteLoisConfigMutation,
    // Lois Config — super admin
    useAdminGetAllLoisConfigsQuery,
    useAdminGetSystemPromptPreviewQuery,
    useAdminGetLoisConfigQuery,
    useAdminUpsertLoisConfigMutation,
    useAdminDeleteLoisConfigMutation,
    // System Prompt Config — super admin global
    useAdminGetSystemConfigQuery,
    useAdminUpsertSystemConfigMutation,
    useAdminResetSystemConfigMutation,
    // Tools registry
    useAdminGetLoisToolsQuery,
    // Skills
    useAdminListSkillsQuery,
    useAdminCreateSkillMutation,
    useAdminUpdateSkillMutation,
    useAdminToggleSkillMutation,
    useAdminDeleteSkillMutation,
} = aiApi;

// ─── SSE Streaming Types ──────────────────────────────────────────────────────

export interface SSEToolStartEvent {
    toolName: string;
    toolDisplayName: string;
    args: Record<string, any>;
}

export interface SSEToolResultEvent {
    toolName: string;
    toolDisplayName: string;
    result: any;
}

export interface SSEDoneEvent {
    conversationId?: string;
    usage?: any;
}

export type SSEEventType = 'token' | 'tool_start' | 'tool_result' | 'done' | 'error' | 'thinking' | 'conversation_id';

export interface SSECallbacks {
    onToken: (token: string) => void;
    onToolStart: (data: SSEToolStartEvent) => void;
    onToolResult: (data: SSEToolResultEvent) => void;
    onThinking: (message: string) => void;
    onConversationId: (id: string) => void;
    onDone: (data: SSEDoneEvent) => void;
    onError: (payload: AiChatStreamErrorPayload) => void;
}

/**
 * SSE Chat Stream client — connects to POST /ai/chat/stream via fetch + ReadableStream
 * This is the primary way the frontend communicates with the AI now
 */
export async function streamAiChat(
    schoolId: string,
    messages: { role: 'user' | 'assistant' | 'system'; content: string }[],
    callbacks: SSECallbacks,
    conversationId?: string,
    abortSignal?: AbortSignal,
    token?: string
): Promise<void> {
    const envUrl = typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_URL;
    const baseUrl = envUrl || 'http://localhost:4000';

    // Get auth token from Redux store fallback if not provided
    let authToken = token || '';
    if (!authToken) {
        try {
            const persistedState = localStorage.getItem('persist:root');
            if (persistedState) {
                const parsed = JSON.parse(persistedState);
                const authState = JSON.parse(parsed.auth || '{}');
                authToken = authState.token || '';
            }
        } catch {
            // Fallback: token will be empty
        }
    }

    const url = `${baseUrl}/schools/${schoolId}/ai/chat/stream`;

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({ messages, conversationId }),
        signal: abortSignal,
    });

    if (!response.ok) {
        const errorText = await response.text();
        callbacks.onError(streamErrorPayloadFromHttp(response.status, errorText));
        return;
    }

    const reader = response.body?.getReader();
    if (!reader) {
        callbacks.onError({
            code: 'LOIS_PROVIDER',
            title: 'Stream unavailable',
            message: 'Your browser could not open the reply stream. Try refreshing the page.',
        });
        return;
    }

    const decoder = new TextDecoder();
    let buffer = '';
    let sawTerminalEvent = false;
    let conversationIdFromStream = '';

    const parseSseBuffer = (): void => {
        const lines = buffer.split('\n');
        buffer = '';

        let currentEvent = '';
        let currentData = '';

        for (const line of lines) {
            if (line.startsWith('event: ')) {
                currentEvent = line.slice(7).trim();
            } else if (line.startsWith('data: ')) {
                currentData = line.slice(6).trim();
            } else if (line === '' && currentEvent && currentData) {
                try {
                    const parsed = JSON.parse(currentData);

                    switch (currentEvent as SSEEventType) {
                        case 'token':
                            callbacks.onToken(parsed.token);
                            break;
                        case 'tool_start':
                            callbacks.onToolStart(parsed);
                            break;
                        case 'tool_result':
                            callbacks.onToolResult(parsed);
                            break;
                        case 'thinking':
                            callbacks.onThinking(parsed.message);
                            break;
                        case 'conversation_id':
                            if (parsed.conversationId) {
                                conversationIdFromStream = parsed.conversationId;
                            }
                            callbacks.onConversationId(parsed.conversationId);
                            break;
                        case 'done':
                            sawTerminalEvent = true;
                            callbacks.onDone(parsed);
                            break;
                        case 'error':
                            sawTerminalEvent = true;
                            callbacks.onError(normalizeSseErrorData(parsed));
                            break;
                    }
                } catch {
                    // Skip malformed events
                }
                currentEvent = '';
                currentData = '';
            } else if (line !== '' && !line.startsWith('event:') && !line.startsWith('data:')) {
                buffer = line;
            }
        }

        if (currentEvent || currentData) {
            if (currentEvent) buffer += `event: ${currentEvent}\n`;
            if (currentData) buffer += `data: ${currentData}\n`;
        }
    };

    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) {
                buffer += decoder.decode(new Uint8Array(0), { stream: false });
                parseSseBuffer();
                break;
            }

            buffer += decoder.decode(value, { stream: true });
            parseSseBuffer();
        }

        if (!sawTerminalEvent) {
            callbacks.onDone({ conversationId: conversationIdFromStream || '' });
        }
    } catch (error: unknown) {
        const err = error as { name?: string; message?: string };
        if (err?.name === 'AbortError') {
            return;
        }
        if (!sawTerminalEvent) {
            const msg = err?.message || '';
            const lower = msg.toLowerCase();
            const networkish =
                lower.includes('fetch') ||
                lower.includes('network') ||
                lower.includes('failed to fetch') ||
                lower.includes('load failed');
            callbacks.onError({
                code: networkish ? 'LOIS_NETWORK' : 'LOIS_UNKNOWN',
                title: networkish ? 'Connection' : 'Interrupted',
                message: networkish
                    ? "We could not reach Myschoolbud. Check your connection and try again."
                    : 'The reply was interrupted. Try sending your message again.',
            });
        }
    }
}
