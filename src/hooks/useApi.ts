'use client';

import { useSelector } from 'react-redux';
import { RootState } from '@/lib/store/store';
import { useCallback } from 'react';

interface ApiOptions extends RequestInit {
  requireAuth?: boolean;
}

export function useApi() {
  const token = useSelector((state: RootState) => state.auth.token);

  const apiCall = useCallback(
    async <T = unknown>(
      endpoint: string,
      options: ApiOptions = {}
    ): Promise<{ success: boolean; data?: T; message?: string }> => {
      const { requireAuth = true, ...fetchOptions } = options;

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(fetchOptions.headers as Record<string, string>),
      };

      // JWT-first: the token contains the schoolId, no need for x-tenant-id header
      if (requireAuth && token) {
        headers.Authorization = `Bearer ${token}`;
      }

      try {
        const baseUrl =
          process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
        const response = await fetch(`${baseUrl}${endpoint}`, {
          ...fetchOptions,
          headers,
          credentials: 'include',
        });

        const data = await response.json();

        if (!response.ok) {
          return {
            success: false,
            message: data.message || 'Request failed',
          };
        }

        return {
          success: true,
          data: data.data,
          message: data.message,
        };
      } catch (error) {
        // Sanitize network errors — never expose raw browser fetch errors
        // (e.g. "Failed to fetch https://api.agora-schools.com/...") to the user
        const isNetworkError =
          error instanceof TypeError ||
          (error instanceof Error && (
            error.message.toLowerCase().includes('failed to fetch') ||
            error.message.toLowerCase().includes('network') ||
            error.message.toLowerCase().includes('load failed')
          ));

        return {
          success: false,
          message: isNetworkError
            ? "We're having trouble connecting to Myschoolbud services. Please check your internet connection."
            : 'Something went wrong. Please try again.',
        };
      }
    },
    [token]
  );

  return { apiCall };
}
