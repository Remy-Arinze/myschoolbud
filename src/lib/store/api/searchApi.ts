import { apiSlice } from './apiSlice';

export type GlobalSearchResultType = 'student' | 'staff' | 'class' | 'subject';

export interface GlobalSearchResult {
  id: string;
  type: GlobalSearchResultType;
  title: string;
  subtitle?: string;
  image?: string | null;
}

interface GlobalSearchEnvelope {
  data: { query: string; results: GlobalSearchResult[] };
}

export const searchApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    globalSearch: builder.query<GlobalSearchResult[], string>({
      query: (q) => `/school-admin/search?q=${encodeURIComponent(q)}`,
      transformResponse: (response: GlobalSearchEnvelope) => response?.data?.results ?? [],
      keepUnusedDataFor: 60,
    }),
  }),
});

export const { useGlobalSearchQuery } = searchApi;
