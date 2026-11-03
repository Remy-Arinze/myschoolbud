'use client';

import { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useRouter, usePathname } from 'next/navigation';
import { RootState } from '@/lib/store/store';
import { logout } from '@/lib/store/slices/authSlice';
import { createReturnToUrl } from '@/utils/security/redirect-validator';

// Helper to decode JWT and check if it has expired 
const isTokenExpired = (token: string | null) => {
  if (!token) return true;
  try {
    const payloadBase64 = token.split('.')[1];
    const decodedJson = atob(payloadBase64.replace(/-/g, '+').replace(/_/g, '/'));
    const payload = JSON.parse(decodedJson);
    // Return true if expired (add a 5 second grace period)
    return payload.exp * 1000 < Date.now() + 5000;
  } catch (e) {
    return true; // Treat unparseable tokens as expired
  }
};

let hasHydratedOnce = false;

interface ProtectedRouteProps {
  children: React.ReactNode;
  roles?: string[];
  redirectTo?: string;
}

export function ProtectedRoute({
  children,
  roles,
  redirectTo = '/auth/login',
}: ProtectedRouteProps) {
  const { user, token, refreshToken } = useSelector((state: RootState) => state.auth);
  const router = useRouter();
  const pathname = usePathname();
  const dispatch = useDispatch();
  // After the first hydration, later page mounts skip the spinner frame so route transitions animate real content.
  const [isHydrated, setIsHydrated] = useState(() => hasHydratedOnce);

  // Wait for client-side hydration
  useEffect(() => {
    hasHydratedOnce = true;
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    // Only proceed if hydrated
    if (isHydrated) {
      if (!user) {
        // Create secure return-to URL for post-login redirect
        const loginUrl = createReturnToUrl(pathname);
        router.push(loginUrl);
        return;
      }
      
      // Fluid Auth Guard: If navigating around with an expired token and refresh token,
      // proactively boot them to the login screen instead of waiting for a network fetch to fail.
      if (token && isTokenExpired(token)) {
        if (!refreshToken || isTokenExpired(refreshToken)) {
          dispatch(logout());
          router.replace('/auth/login?expired=true');
        }
      }
    }
  }, [user, token, refreshToken, router, pathname, isHydrated, dispatch]);

  // Show loading while hydrating
  if (!isHydrated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (roles && !roles.includes(user.role)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Access Denied
          </h1>
          <p className="text-gray-600">
            You don&apos;t have permission to access this page.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

