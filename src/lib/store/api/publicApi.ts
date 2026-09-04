import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export interface PublicSchool {
  id: string;
  name: string;
  logo: string | null;
  type: string;
  state: string | null;
}

export interface PlatformStats {
  totalSchools: number;
  totalStudents: number;
  totalRecords: number;
  totalTeachers: number;
}

interface ResponseDto<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface RegisterSchoolDto {
  name: string;
  email: string;
  phone: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  hasPrimary?: boolean;
  hasSecondary?: boolean;
  hasTertiary?: boolean;
  registrationNote?: string;
  ownerFirstName: string;
  ownerLastName: string;
  ownerEmail: string;
  ownerPhone: string;
  slug?: string;
}

export interface RegisterSchoolResponseDto {
  schoolId: string;
  name: string;
  status: string;
  message: string;
}

export const publicApi = createApi({
  reducerPath: 'publicApi',
  baseQuery: fetchBaseQuery({
    baseUrl: (() => {
      const envUrl = typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_URL;
      const baseUrl = envUrl || 'http://localhost:4000';
      // Routes are directly accessible without /api prefix
      return baseUrl;
    })(),
  }),
  endpoints: (builder) => ({
    getPublicSchools: builder.query<PublicSchool[], void>({
      query: () => '/public/schools',
      transformResponse: (response: ResponseDto<PublicSchool[]>) => response.data,
    }),
    getPlatformStats: builder.query<PlatformStats, void>({
      query: () => '/public/stats',
      transformResponse: (response: ResponseDto<PlatformStats>) => response.data,
    }),
    registerSchool: builder.mutation<ResponseDto<RegisterSchoolResponseDto>, RegisterSchoolDto>({
      query: (body) => ({
        url: '/schools/public/register',
        method: 'POST',
        body: {
          schoolName: body.name,
          schoolEmail: body.email,
          schoolPhone: body.phone,
          address: body.address,
          city: body.city,
          state: body.state,
          country: body.country,
          levels: {
            primary: body.hasPrimary,
            secondary: body.hasSecondary,
            tertiary: body.hasTertiary,
          },
          owner: {
            firstName: body.ownerFirstName,
            lastName: body.ownerLastName,
            email: body.ownerEmail,
            phone: body.ownerPhone,
          },
          registrationNote: body.registrationNote,
          slug: body.slug,
        },
      }),
    }),
    checkSlugAvailable: builder.query<{ available: boolean; slug: string; reason?: string }, string>({
      query: (slug) => `/public/portals/slug-available?slug=${encodeURIComponent(slug)}`,
      transformResponse: (response: ResponseDto<{ available: boolean; slug: string; reason?: string }>) => response.data,
    }),
    getPortalByHost: builder.query<any, string>({
      query: (host) => `/public/portals/by-host?host=${encodeURIComponent(host)}`,
      transformResponse: (response: ResponseDto<any>) => response.data,
    }),
    getPublicSchool: builder.query<any, string>({
      query: (id) => `/public/schools/${id}`,
      transformResponse: (response: ResponseDto<any>) => response.data,
    }),
    getAdmissionConfig: builder.query<
      { applicationsOpen: boolean; applicationDeadline?: string; formFields?: unknown[]; documentRequirements?: unknown[] },
      string
    >({
      query: (schoolId) => `/public/schools/${schoolId}/admission-config`,
      transformResponse: (response: ResponseDto<any>) => response.data,
    }),
    submitAdmissionApplication: builder.mutation<ResponseDto<any>, { schoolId: string; application: any }>({
      query: ({ schoolId, application }) => ({
        url: `/public/schools/${schoolId}/apply`,
        method: 'POST',
        body: application,
      }),
    }),
  }),
});

export const { useGetPublicSchoolsQuery, useGetPlatformStatsQuery, useRegisterSchoolMutation, useGetPublicSchoolQuery, useGetAdmissionConfigQuery, useSubmitAdmissionApplicationMutation, useCheckSlugAvailableQuery, useLazyCheckSlugAvailableQuery, useGetPortalByHostQuery } = publicApi;

