'use client';

import { useState, FormEvent, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useDispatch } from 'react-redux';
import { Eye, EyeOff } from 'lucide-react';
import { setCredentials } from '@/lib/store/slices/authSlice';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import Link from 'next/link';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { WordedLogo } from '@/components/layout/WordedLogo';
import { OtpVerification } from '@/components/auth/OtpVerification';
import { getReturnToParameter } from '@/utils/security/redirect-validator';
import { postLoginPath } from '@/lib/auth/postLoginPath';
import { maybeRedirectToSchoolPortal } from '@/lib/portal/finishLogin';
import { usePortal } from '@/components/portal/PortalProvider';
import { apexOrigin } from '@/lib/portal/host';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useDispatch();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [requiresOtp, setRequiresOtp] = useState(false);
  const [otpSessionId, setOtpSessionId] = useState<string | null>(null);
  const [otpEmail, setOtpEmail] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    emailOrPublicId: '',
    password: '',
  });
  const { branding, isPortalHost } = usePortal();
  const registerSchoolHref = isPortalHost
    ? `${apexOrigin()}/auth/register-school`
    : '/auth/register-school';
  const sessionExpired = searchParams?.get('expired') === 'true';

  const portalHeaders = (): Record<string, string> => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const portalSchoolId =
      branding?.schoolId ||
      (typeof window !== 'undefined' ? sessionStorage.getItem('msbPortalSchoolId') : null);
    if (portalSchoolId) headers['x-portal-school-id'] = portalSchoolId;
    return headers;
  };
  const intendedPlan = searchParams?.get('plan');

  // Get secure return-to parameter
  const returnTo = getReturnToParameter();

  useEffect(() => {
    if (intendedPlan) {
      sessionStorage.setItem('intendedPlan', intendedPlan);
    }
  }, [intendedPlan]);

  useEffect(() => {
    if (sessionExpired) {
      setError('Your session has expired. Please log in again to continue.');
    }
  }, [sessionExpired]);

  // Helper function to handle post-login redirect
  const handlePostLoginRedirect = (user: any) => {
    // Priority 1: Return-to parameter (from email links)
    if (returnTo) {
      console.log('Redirecting to return-to URL:', returnTo);
      router.push(returnTo);
      return;
    }

    // Priority 2: Plan parameter (for subscription flow)
    const storedPlan = sessionStorage.getItem('intendedPlan');
    if (storedPlan && user.role === 'SCHOOL_ADMIN') {
      sessionStorage.removeItem('intendedPlan');
      router.push(`/?plan=${storedPlan}`);
      return;
    }

    // Priority 3: Role + school lifecycle
    const roleRedirect = postLoginPath(user);
    console.log('Redirecting to role-based URL:', roleRedirect);
    router.push(roleRedirect);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/auth/login`,
        {
          method: 'POST',
          headers: portalHeaders(),
          // Include credentials to receive httpOnly cookie from server
          credentials: 'include',
          body: JSON.stringify({
            emailOrPublicId: formData.emailOrPublicId,
            password: formData.password,
          }),
        }
      );

      const data = await response.json();

      // Debug logging
      console.log('Login response:', {
        ok: response.ok,
        status: response.status,
        data,
        requiresOtp: data?.data?.requiresOtp,
        sessionId: data?.data?.sessionId,
        email: data?.data?.email,
      });

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error("Too many attempts. Please wait a moment before trying again.");
        }
        // Handle validation errors from backend
        const errorMessage = data.message ||
          (data.error && typeof data.error === 'string' ? data.error : null) ||
          (data.error && Array.isArray(data.error) ? data.error.join(', ') : null) ||
          'Login failed';
        throw new Error(errorMessage);
      }

      // Backend returns ResponseDto<T> structure: { success, message, data, timestamp }
      if (data.success && data.data) {
        // Check if OTP is required
        if (data.data.requiresOtp && data.data.sessionId) {
          console.log('OTP required, showing OTP screen');
          setRequiresOtp(true);
          setOtpSessionId(data.data.sessionId);
          setOtpEmail(data.data.email || formData.emailOrPublicId);
          setError(null);
          return;
        }

        // Legacy flow (should not happen with new implementation)
        if (data.data.accessToken && data.data.user) {
          console.warn('Legacy login flow detected - OTP was bypassed!', data.data);
          if (maybeRedirectToSchoolPortal(data.data)) {
            return;
          }

          dispatch(
            setCredentials({
              accessToken: data.data.accessToken,
              refreshToken: data.data.refreshToken,
              user: data.data.user,
              tenantId: data.data.user.tenantId,
            })
          );

          if (data.data.user.schoolId) {
            localStorage.setItem('currentSchoolId', data.data.user.schoolId);
          }
          if (data.data.user.tenantId) {
            localStorage.setItem('tenantId', data.data.user.tenantId);
          }

          // Handle secure post-login redirect
          handlePostLoginRedirect(data.data.user);
        } else {
          console.error('Unexpected login response structure:', data);
          setError('Unexpected response from server. Please try again.');
        }
      } else {
        console.error('Login response missing success or data:', data);
        setError('Invalid response from server. Please try again.');
      }
    } catch (err) {
      if (err instanceof TypeError && (err.message === 'Failed to fetch' || err.message === 'NetworkError when attempting to fetch resource')) {
        setError("We're having trouble connecting to Myschoolbud services. Please check your internet connection or the server status.");
      } else {
        setError(err instanceof Error ? err.message : 'An error occurred');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpVerify = async (code: string) => {
    if (!otpSessionId) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/auth/verify-login-otp`,
        {
          method: 'POST',
          headers: portalHeaders(),
          credentials: 'include',
          body: JSON.stringify({
            sessionId: otpSessionId,
            code,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error("Too many attempts. Please wait a moment before trying again.");
        }
        const errorMessage = data.message ||
          (data.error && typeof data.error === 'string' ? data.error : null) ||
          (data.error && Array.isArray(data.error) ? data.error.join(', ') : null) ||
          'OTP verification failed';
        throw new Error(errorMessage);
      }

      if (data.success && data.data) {
        if (maybeRedirectToSchoolPortal(data.data)) {
          return;
        }
        dispatch(
          setCredentials({
            accessToken: data.data.accessToken,
            refreshToken: data.data.refreshToken,
            user: data.data.user,
            tenantId: data.data.user.tenantId, // ✅ Use tenantId from user object
          })
        );

        if (data.data.user.schoolId) {
          localStorage.setItem('currentSchoolId', data.data.user.schoolId);
        }
        if (data.data.user.tenantId) {
          localStorage.setItem('tenantId', data.data.user.tenantId);
        }

        // Handle secure post-login redirect
        handlePostLoginRedirect(data.data.user);
      }
    } catch (err) {
      if (err instanceof TypeError && (err.message === 'Failed to fetch' || err.message === 'NetworkError when attempting to fetch resource')) {
        setError("We're having trouble connecting to Myschoolbud services. Please check your internet connection or the server status.");
      } else {
        setError(err instanceof Error ? err.message : 'OTP verification failed');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    // Re-submit login to get new OTP
    if (!formData.emailOrPublicId || !formData.password) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/auth/login`,
        {
          method: 'POST',
          headers: portalHeaders(),
          credentials: 'include',
          body: JSON.stringify({
            emailOrPublicId: formData.emailOrPublicId,
            password: formData.password,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to resend OTP');
      }

      if (data.success && data.data && data.data.sessionId) {
        setOtpSessionId(data.data.sessionId);
        setOtpEmail(data.data.email || formData.emailOrPublicId);
        setError(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resend OTP');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToLogin = () => {
    setRequiresOtp(false);
    setOtpSessionId(null);
    setOtpEmail(null);
    setError(null);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--light-bg)] dark:bg-[var(--dark-bg)] py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-300">
      <div className="w-full max-w-md">
        {requiresOtp && otpSessionId && otpEmail ? (
          <>
            <OtpVerification
              email={otpEmail}
              sessionId={otpSessionId}
              onVerify={handleOtpVerify}
              onResend={handleResendOtp}
              isLoading={isLoading}
              error={error}
            />
            <div className="mt-6 text-center">
              <button
                onClick={handleBackToLogin}
                className="text-sm text-[var(--light-text-secondary)] dark:text-[#9ca3af] hover:text-[#2490FD] dark:hover:text-white hover:underline transition-colors font-medium"
              >
                ← Back to login
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Logo */}
            <div className="flex items-center justify-center mb-8">
              {branding?.logo ? (
                <div className="flex flex-col items-center gap-2">
                  <img src={branding.logo} alt={branding.name} className="h-14 w-14 object-contain rounded" />
                  <span className="text-xl font-bold text-[var(--light-text-primary)] dark:text-[var(--dark-text-primary)]">
                    {branding.name}
                  </span>
                </div>
              ) : (
                <Link href="/" className="inline-block transition-transform hover:scale-105 active:scale-95 cursor-pointer">
                  <WordedLogo size="sm" priority />
                </Link>
              )}
            </div>

            {/* Heading */}
            <h1 className="text-3xl font-bold text-[var(--light-text-primary)] dark:text-[var(--dark-text-primary)] mb-3 text-center">
              {branding ? `Sign in to ${branding.name}` : 'Sign in to your account'}
            </h1>
            {branding?.loginTagline && (
              <p className="text-center text-[var(--light-text-secondary)] dark:text-[var(--dark-text-secondary)] mb-2">
                {branding.loginTagline}
              </p>
            )}
            {branding && !branding.hidePlatformMark && (
              <p className="text-center text-xs text-[var(--light-text-muted)] dark:text-[var(--dark-text-muted)] mb-2">
                Powered by Myschoolbud
              </p>
            )}

            <form onSubmit={handleSubmit} className="space-y-6 mt-8">
              {sessionExpired && (
                <div className="mb-4">
                  <Alert variant="warning">
                    <div>
                      <p className="font-semibold">Session Expired</p>
                      <p className="text-sm mt-1">Your session has expired for security reasons. Please log in again to continue.</p>
                    </div>
                  </Alert>
                </div>
              )}
              {error && !sessionExpired && (
                <div className="mb-4">
                  <Alert variant="error">{error}</Alert>
                </div>
              )}

              <div className="w-full">
                <label
                  htmlFor="email-input"
                  className="block text-sm font-medium text-[var(--light-text-primary)] dark:text-[var(--dark-text-primary)] mb-2"
                >
                  Email or Public ID
                </label>
                <input
                  id="email-input"
                  type="text"
                  placeholder="superadmin@myschoolbud.com or AG-SCHL-A3B5C7"
                  value={formData.emailOrPublicId}
                  onChange={(e) =>
                    setFormData({ ...formData, emailOrPublicId: e.target.value })
                  }
                  required
                  className="w-full px-4 py-3 border-2 rounded-lg bg-white dark:bg-[#151a23] text-[var(--light-text-primary)] dark:text-[var(--dark-text-primary)] placeholder-[var(--light-text-muted)] dark:placeholder-[var(--dark-text-muted)] focus:outline-none focus:ring-2 focus:ring-[#2490FD] focus:border-[#2490FD] transition-all border-gray-200 dark:border-[#1a1f2e]"
                />
              </div>

              <div className="w-full">
                <label
                  htmlFor="password-input"
                  className="block text-sm font-medium text-[var(--light-text-primary)] dark:text-[var(--dark-text-primary)] mb-2"
                >
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password-input"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    required
                    minLength={8}
                    className="w-full px-4 py-3 pr-10 border-2 rounded-lg bg-white dark:bg-[#151a23] text-[var(--light-text-primary)] dark:text-[var(--dark-text-primary)] placeholder-[var(--light-text-muted)] dark:placeholder-[var(--dark-text-muted)] focus:outline-none focus:ring-2 focus:ring-[#2490FD] focus:border-[#2490FD] transition-all border-gray-200 dark:border-[#1a1f2e]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--light-text-muted)] hover:text-[var(--light-text-primary)] dark:hover:text-[var(--dark-text-primary)] transition-colors focus:outline-none focus:ring-2 focus:ring-[#2490FD] rounded p-1"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                className="w-full py-3.5"
                isLoading={isLoading}
                isFlat={!(
                  formData.password &&
                  formData.password.length >= 8 &&
                  formData.emailOrPublicId
                )}
                disabled={
                  !formData.password ||
                  formData.password.length < 8 ||
                  !formData.emailOrPublicId
                }
              >
                Sign In
              </Button>

              <div className="text-center pt-2 space-y-3">
                <Link
                  href="/auth/forgot-password"
                  className="block text-sm text-[var(--light-text-secondary)] dark:text-[var(--dark-text-secondary)] hover:text-[#2490FD] hover:underline transition-colors font-medium"
                >
                  Forgot your password?
                </Link>
                <div className="text-sm text-[var(--light-text-muted)] dark:text-[var(--dark-text-muted)]">
                  Don't have an account?{' '}
                  <Link
                    href={registerSchoolHref}
                    className="text-[var(--agora-blue)] hover:text-[#2490FD] hover:underline transition-colors"
                  >
                    Register your school
                  </Link>
                </div>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[var(--light-bg)] dark:bg-[var(--dark-bg)]">
        <LoadingSpinner />
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}

