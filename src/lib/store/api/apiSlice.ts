import { createApi, fetchBaseQuery, retry } from '@reduxjs/toolkit/query/react';
import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query';
import { setCredentials, logout } from '../slices/authSlice';
import { openobserveLogs } from '@openobserve/browser-logs';

const baseQuery = fetchBaseQuery({
  baseUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000',
  prepareHeaders: (headers, { getState }) => {
    const state = getState() as { auth: { token?: string | null; tenantId?: string | null } };
    const token = state?.auth?.token;

    // 1. Set Authorization Header — the JWT contains the schoolId,
    //    which is the sole source of truth for tenant context.
    if (token) {
      headers.set('authorization', `Bearer ${token}`);
    }

    // Do not force Content-Type — fetchBaseQuery sets JSON for objects,
    // and the browser must set multipart boundaries for FormData uploads.
    return headers;
  },
});

const baseQueryWithReauth: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  const state = api.getState() as { auth: { token?: string | null; refreshToken?: string | null; user?: any; tenantId?: string | null } };
  const user = state.auth.user;

  // Update OpenObserve user context
  if (user) {
    openobserveLogs.logger.info('User context', { id: user.id, email: user.email });
  }

  let result = await baseQuery(args, api, extraOptions);

  // SANITIZE & HUMANIZE ERRORS
  // This prevents technical leaks (like localhost:4000) and provides better UX for throttles
  if (result.error) {
    if (result.error.status === 'FETCH_ERROR') {
      (result.error as any).data = {
        message: "We're having trouble connecting to Agora services. Please check your internet connection or the server status."
      };
    } else if (result.error.status === 429) {
      (result.error as any).data = {
        message: "Too many requests. Please wait a moment before trying again."
      };
    }
  }

  // Log API errors to OpenObserve (skip 401/404 — handled below / expected)
  if (result.error && result.error.status !== 401 && result.error.status !== 404) {
    const error = result.error;
    if (typeof window !== 'undefined') {
      openobserveLogs.logger.error('API Error', {
        status: error.status,
        data: error.data,
        url: typeof args === 'string' ? args : (args as FetchArgs).url,
      });
    }
  }

  // If we get a 401, try to refresh the token
  if (result.error && result.error.status === 401) {
    const refreshToken = state.auth.refreshToken;

    if (refreshToken) {
      try {
        const refreshResult = await baseQuery(
          {
            url: '/auth/refresh',
            method: 'POST',
            body: { refreshToken },
          },
          api,
          extraOptions
        );

        if (refreshResult.data) {
          const data = refreshResult.data as { accessToken: string; refreshToken: string };

          // Update the store with new tokens
          api.dispatch(
            setCredentials({
              accessToken: data.accessToken,
              refreshToken: data.refreshToken,
              user: state.auth.user, // Keep existing user data
            })
          );

          // Retry the original query with new token
          result = await baseQuery(args, api, extraOptions);
        } else {
          api.dispatch(logout());
          if (typeof window !== 'undefined') {
            window.location.href = '/auth/login?expired=true';
          }
        }
      } catch (error) {
        api.dispatch(logout());
        if (typeof window !== 'undefined') {
          window.location.href = '/auth/login?expired=true';
        }
      }
    } else {
      api.dispatch(logout());
      if (typeof window !== 'undefined') {
        window.location.href = '/auth/login?expired=true';
      }
    }
  }

  return result;
};

/**
 * Robust Retry Strategy:
 * 1. Exponential Backoff (1s, 2s, 4s...)
 * 2. Fail-Fast for auth/logic errors (401, 403, 404, 400)
 * 3. Max 5 attempts for transient network/server errors
 */
const staggeredBaseQuery = retry(
  async (args: string | FetchArgs, api, extraOptions) => {
    const result = await baseQueryWithReauth(args, api, extraOptions);
    
    // Fail immediately for these status codes — no point in retrying
    if (
      result.error?.status === 401 || 
      result.error?.status === 403 || 
      result.error?.status === 404 ||
      result.error?.status === 400
    ) {
      retry.fail(result.error);
    }
    
    return result;
  },
  {
    maxRetries: 5,
  }
);

export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: staggeredBaseQuery,
  tagTypes: ['Student', 'School', 'User', 'Timetable', 'Event', 'Session', 'ClassLevel', 'ClassArm', 'Subject', 'Room', 'Class', 'ClassResource', 'StudentResource', 'Permission', 'Curriculum', 'Grade', 'Grades', 'Transfer', 'Subscription', 'SubscriptionPlan', 'TeacherSubject', 'Faculty', 'Department', 'SchoolErrors', 'Error', 'ErrorStats', 'TeacherWorkload', 'Assessments', 'Submissions', 'AiHistory', 'Attendance', 'SchemeOfWork', 'AgoraCurriculum', 'AgoraCurriculumSource', 'AgoraSubject', 'Campaigns', 'LoisSystemConfig', 'LoisSkills', 'Notification', 'SchoolSettings', 'BackupStatus'],
  endpoints: (builder) => ({
    changePassword: builder.mutation<
      { success: boolean; message: string },
      { currentPassword: string; newPassword: string }
    >({
      query: (credentials) => ({
        url: '/auth/change-password',
        method: 'POST',
        body: credentials,
      }),
    }),

    // Upload super admin profile image
    uploadProfileImage: builder.mutation<
      { success: boolean; data: { profileImage: string }; message: string },
      { file: File }
    >({
      queryFn: async ({ file }, _api, _extraOptions) => {
        const formData = new FormData();
        formData.append('image', file);

        const state = _api.getState() as { auth: { token?: string | null } };
        const token = state?.auth?.token;

        const envUrl = typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_URL;
        const baseUrl = envUrl || 'http://localhost:4000';
        const url = `${baseUrl}/auth/profile/upload-image`;

        const headers: HeadersInit = {};
        if (token) {
          headers['authorization'] = `Bearer ${token}`;
        }

        try {
          const response = await fetch(url, {
            method: 'POST',
            headers,
            body: formData,
          });

          const data = await response.json();

          if (!response.ok) {
            return { error: { status: response.status, data } };
          }

          return { data };
        } catch (error: any) {
          return { error: { status: 'FETCH_ERROR', error: error.message } };
        }
      },
      invalidatesTags: ['User'],
    }),
    // Fetch login sessions for history
    getLoginSessions: builder.query<{ success: boolean; data: any[] }, void>({
      query: () => '/auth/login-sessions',
      providesTags: ['User'],
    }),
  }),
});

export const { 
  useChangePasswordMutation, 
  useUploadProfileImageMutation,
  useGetLoginSessionsQuery
} = apiSlice;
