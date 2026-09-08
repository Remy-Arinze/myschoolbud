import { apiSlice } from './apiSlice';

export interface AgoraSubjectDto {
  id: string;
  name: string;
  code: string;
  schoolTypes: string[];
  levelStreams?: string[];
  category?: string;
  description?: string;
  isActive: boolean;
}

export interface CreateAgoraSubjectDto {
  name: string;
  code: string;
  category?: string;
  schoolTypes: string[];
  levelStreams?: string[];
  description?: string;
}

export interface UpdateAgoraSubjectDto {
  name?: string;
  code?: string;
  category?: string;
  schoolTypes?: string[];
  levelStreams?: string[];
  description?: string;
  isActive?: boolean;
}

export interface AgoraCurriculumSource {
  id: string;
  subjectId: string;
  gradeLevel: string;
  sourceType: 'MANUAL' | 'FILE_UPLOAD';
  fileName?: string;
  fileUrl?: string;
  fileType?: string;
  parsedData?: any;
  parseErrors?: string;
  status: 'PENDING_PARSE' | 'PARSING' | 'PARSED' | 'APPROVED' | 'REJECTED' | 'FAILED';
  manualContent?: any;
  createdBy: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
  subject?: AgoraSubjectDto;
  jobProgress?: any;
  queuePosition?: number;
}

export interface AgoraCurriculumTopic {
  id: string;
  curriculumId: string;
  title: string;
  description?: string;
  weekNumber: number;
  topic?: string;
  subTopics: string[];
  learningOutcomes: string[];
  studentFriendlyOutcomes: string[];
  suggestedActivities: string[];
  resources: string[];
  assessmentType?: string;
  assessmentGuidance?: string;
  duration?: string;
  order: number;
  term: number;
  deprecatedAt?: string | null;
}

export interface AgoraCurriculum {
  id: string;
  subjectId: string;
  gradeLevel: string;
  version: number;
  status: 'DRAFT' | 'PUBLISHED';
  sourceIds: string[];
  consolidationNotes?: string;
  publishedAt?: string;
  publishedBy?: string;
  createdAt: string;
  updatedAt: string;
  subject?: AgoraSubjectDto;
  topics?: AgoraCurriculumTopic[];
}

export interface CreateAgoraCurriculumSourceDto {
  subjectId: string;
  gradeLevel: string;
  sourceType: 'MANUAL' | 'FILE_UPLOAD';
  fileName?: string;
  fileUrl?: string;
  fileType?: string;
  manualContent?: any;
}

export interface ConsolidateCurriculumDto {
  subjectId: string;
  gradeLevel: string;
  sourceIds: string[];
  forceNewVersion?: boolean;
}

export interface PublishCurriculumDto {
  status: 'DRAFT' | 'PUBLISHED';
}

export const agoraCurriculumApi = apiSlice.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    getAgoraSubjectRegistry: builder.query<AgoraSubjectDto[], { schoolType?: string; category?: string; search?: string; levelStream?: string } | void>({
      query: (params) => {
        const urlParams = new URLSearchParams();
        if (params?.schoolType) urlParams.append('schoolType', params.schoolType);
        if (params?.levelStream) urlParams.append('levelStream', params.levelStream);
        if (params?.category) urlParams.append('category', params.category);
        if (params?.search) urlParams.append('search', params.search);
        const queryString = urlParams.toString();
        
        return {
          url: `/agora-curriculum/subjects${queryString ? `?${queryString}` : ''}`,
          method: 'GET',
        };
      },
      transformResponse: (response: any) => response.data,
      providesTags: ['AgoraSubject'],
    }),

    createAgoraSubject: builder.mutation<AgoraSubjectDto, CreateAgoraSubjectDto>({
      query: (data) => ({
        url: '/agora-curriculum/subjects',
        method: 'POST',
        body: data,
      }),
      transformResponse: (response: any) => response.data,
      invalidatesTags: ['AgoraSubject'],
    }),

    updateAgoraSubject: builder.mutation<AgoraSubjectDto, { id: string; data: UpdateAgoraSubjectDto }>({
      query: ({ id, data }) => ({
        url: `/agora-curriculum/subjects/${id}`,
        method: 'PATCH',
        body: data,
      }),
      transformResponse: (response: any) => response.data,
      invalidatesTags: ['AgoraSubject'],
    }),

    deleteAgoraSubject: builder.mutation<any, string>({
      query: (id) => ({
        url: `/agora-curriculum/subjects/${id}`,
        method: 'DELETE',
      }),
      transformResponse: (response: any) => response.data,
      invalidatesTags: ['AgoraSubject'],
    }),

    getAgoraCurriculumSources: builder.query<AgoraCurriculumSource[], { subjectId?: string; gradeLevel?: string } | void>({
      query: (params) => {
        const urlParams = new URLSearchParams();
        if (params?.subjectId) urlParams.append('subjectId', params.subjectId);
        if (params?.gradeLevel) urlParams.append('gradeLevel', params.gradeLevel);
        const queryString = urlParams.toString();
        
        return {
          url: `/agora-curriculum/sources${queryString ? `?${queryString}` : ''}`,
          method: 'GET',
        };
      },
      transformResponse: (response: any) => response.data,
      providesTags: ['AgoraCurriculumSource'],
    }),

    createAgoraCurriculumSource: builder.mutation<AgoraCurriculumSource, CreateAgoraCurriculumSourceDto>({
      query: (data) => ({
        url: '/agora-curriculum/sources',
        method: 'POST',
        body: data,
      }),
      transformResponse: (response: any) => response.data,
      invalidatesTags: ['AgoraCurriculumSource'],
    }),

    uploadAgoraCurriculumSource: builder.mutation<AgoraCurriculumSource, FormData>({
      query: (data) => ({
        url: '/agora-curriculum/sources/upload',
        method: 'POST',
        body: data,
      }),
      transformResponse: (response: any) => response.data,
      invalidatesTags: ['AgoraCurriculumSource'],
    }),

    uploadMultipleAgoraCurriculumSources: builder.mutation<AgoraCurriculumSource[], FormData>({
      query: (data) => ({
        url: '/agora-curriculum/sources/upload-multiple',
        method: 'POST',
        body: data,
      }),
      transformResponse: (response: any) => response.data,
      invalidatesTags: ['AgoraCurriculumSource'],
    }),

    getSourceStatus: builder.query<any, string>({
      query: (id) => `/agora-curriculum/sources/${id}/status`,
      transformResponse: (response: any) => response.data,
    }),

    deleteAgoraCurriculumSource: builder.mutation<void, string>({
      query: (id) => ({
        url: `/agora-curriculum/sources/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['AgoraCurriculumSource'],
    }),

    cancelAgoraCurriculumProcessing: builder.mutation<any, string>({
      query: (id) => ({
        url: `/agora-curriculum/sources/${id}/cancel`,
        method: 'POST',
      }),
      invalidatesTags: ['AgoraCurriculumSource'],
    }),

    retryAgoraCurriculumParsing: builder.mutation<any, string>({
      query: (id) => ({
        url: `/agora-curriculum/sources/${id}/retry`,
        method: 'POST',
      }),
      invalidatesTags: ['AgoraCurriculumSource'],
    }),

    getAgoraCurricula: builder.query<AgoraCurriculum[], { subjectId?: string; gradeLevel?: string; status?: string } | void>({
      query: (params) => {
        const urlParams = new URLSearchParams();
        if (params?.subjectId) urlParams.append('subjectId', params.subjectId);
        if (params?.gradeLevel) urlParams.append('gradeLevel', params.gradeLevel);
        if (params?.status) urlParams.append('status', params.status);
        const queryString = urlParams.toString();
        
        return {
          url: `/agora-curriculum${queryString ? `?${queryString}` : ''}`,
          method: 'GET',
        };
      },
      transformResponse: (response: any) => response.data,
      providesTags: ['AgoraCurriculum'],
    }),

    getAgoraCurriculum: builder.query<AgoraCurriculum, string>({
      query: (id) => ({
        url: `/agora-curriculum/${id}`,
        method: 'GET',
      }),
      transformResponse: (response: any) => response.data,
      providesTags: (result, error, id) => [{ type: 'AgoraCurriculum', id }],
    }),

    consolidateAgoraCurriculum: builder.mutation<AgoraCurriculum, ConsolidateCurriculumDto>({
      query: (data) => ({
        url: '/agora-curriculum/consolidate',
        method: 'POST',
        body: data,
      }),
      transformResponse: (response: any) => response.data,
      invalidatesTags: ['AgoraCurriculum'],
    }),

    publishAgoraCurriculum: builder.mutation<AgoraCurriculum, { id: string; data: PublishCurriculumDto }>({
      query: ({ id, data }) => ({
        url: `/agora-curriculum/${id}/publish`,
        method: 'PATCH',
        body: data,
      }),
      transformResponse: (response: any) => response.data,
      invalidatesTags: (result, error, { id }) => [
        { type: 'AgoraCurriculum', id },
        'AgoraCurriculum', // To refresh lists
      ],
    }),

    deleteAgoraCurriculum: builder.mutation<void, string>({
      query: (id) => ({
        url: `/agora-curriculum/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['AgoraCurriculum'],
    }),

    updateAgoraCurriculumTopic: builder.mutation<AgoraCurriculumTopic, { topicId: string; data: Partial<AgoraCurriculumTopic> }>({
      query: ({ topicId, data }) => ({
        url: `/agora-curriculum/topics/${topicId}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: ['AgoraCurriculum'],
    }),

    addAgoraCurriculumTopic: builder.mutation<AgoraCurriculumTopic, { curriculumId: string; data: Partial<AgoraCurriculumTopic> }>({
      query: ({ curriculumId, data }) => ({
        url: `/agora-curriculum/${curriculumId}/topics`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['AgoraCurriculum'],
    }),

    deleteAgoraCurriculumTopic: builder.mutation<void, string>({
      query: (topicId) => ({
        url: `/agora-curriculum/topics/${topicId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['AgoraCurriculum'],
    }),
  }),
});

export const {
  useGetAgoraSubjectRegistryQuery,
  useCreateAgoraSubjectMutation,
  useUpdateAgoraSubjectMutation,
  useDeleteAgoraSubjectMutation,
  useGetAgoraCurriculumSourcesQuery,
  useCreateAgoraCurriculumSourceMutation,
  useUploadAgoraCurriculumSourceMutation,
  useUploadMultipleAgoraCurriculumSourcesMutation,
  useGetSourceStatusQuery,
  useDeleteAgoraCurriculumSourceMutation,
  useCancelAgoraCurriculumProcessingMutation,
  useRetryAgoraCurriculumParsingMutation,
  useGetAgoraCurriculaQuery,
  useGetAgoraCurriculumQuery,
  useConsolidateAgoraCurriculumMutation,
  usePublishAgoraCurriculumMutation,
  useDeleteAgoraCurriculumMutation,
  useUpdateAgoraCurriculumTopicMutation,
  useAddAgoraCurriculumTopicMutation,
  useDeleteAgoraCurriculumTopicMutation,
} = agoraCurriculumApi;
