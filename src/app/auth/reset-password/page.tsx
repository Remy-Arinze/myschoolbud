'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Alert';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { FadeInUp } from '@/components/ui/FadeInUp';
import { Lock, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';
import { WordedLogo } from '@/components/layout/WordedLogo';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

function isTokenDeadMessage(message: string) {
  const msg = message.toLowerCase();
  return (
    msg.includes('expired') ||
    msg.includes('already been used') ||
    msg.includes('invalid or expired reset token') ||
    msg.includes('invalid or expired')
  );
}

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [formData, setFormData] = useState({ newPassword: '', confirmPassword: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [isCheckingToken, setIsCheckingToken] = useState(!!token);
  const [resendDone, setResendDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tokenExpired, setTokenExpired] = useState(!token);

  useEffect(() => {
    if (!token) {
      setTokenExpired(true);
      setIsCheckingToken(false);
      return;
    }

    let cancelled = false;
    const check = async () => {
      try {
        const res = await fetch(`${API_BASE}/auth/validate-reset-token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });
        const data = await res.json();
        if (cancelled) return;
        if (data?.data?.valid === false) {
          setTokenExpired(true);
        }
      } catch {
        // Network errors should not look like an expired link
      } finally {
        if (!cancelled) setIsCheckingToken(false);
      }
    };
    void check();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError(null);
  };

  const handleResend = async () => {
    setIsResending(true);
    try {
      const res = await fetch(`${API_BASE}/auth/resend-reset-by-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      if (res.ok) {
        setResendDone(true);
        toast.success('A new password setup email has been sent. Please check your inbox.');
      } else {
        router.push('/auth/forgot-password');
      }
    } catch {
      router.push('/auth/forgot-password');
    } finally {
      setIsResending(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!token) {
      setTokenExpired(true);
      return;
    }
    if (formData.newPassword.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }
    if (formData.newPassword !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_BASE}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: formData.newPassword }),
      });

      const data = await response.json();
      const msg = data.message || 'Failed to set password';

      if (!response.ok) {
        if (isTokenDeadMessage(msg)) {
          setTokenExpired(true);
          return;
        }
        setError(msg);
        toast.error(msg);
        return;
      }

      if (data.success) {
        toast.success('Password set successfully! You can now log in.');
        router.push('/auth/login');
      } else {
        throw new Error('Unexpected response format');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'An error occurred';
      setError(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isCheckingToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--light-bg)] dark:bg-[var(--dark-bg)]">
        <LoadingSpinner />
      </div>
    );
  }

  if (tokenExpired) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--light-bg)] dark:bg-[var(--dark-bg)] py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-300">
        <FadeInUp from={{ opacity: 0, y: 20 }} to={{ opacity: 1, y: 0 }} duration={0.5} className="w-full max-w-md">
          <div className="flex items-center justify-center mb-8">
            <Link href="/" className="inline-block transition-transform hover:scale-105 active:scale-95 cursor-pointer">
              <WordedLogo size="lg" priority />
            </Link>
          </div>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-center gap-3 mb-2">
                <Lock className="h-6 w-6 text-orange-500" />
                <CardTitle className="text-2xl font-bold text-light-text-primary dark:text-dark-text-primary text-center">
                  Link expired
                </CardTitle>
              </div>
              <p className="text-center text-light-text-secondary dark:text-dark-text-secondary">
                This password setup link has expired or has already been used.
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              {resendDone ? (
                <Alert variant="success">
                  A new password setup email is on its way. Please check your inbox (and spam folder).
                </Alert>
              ) : (
                <Alert variant="error">
                  Setup links expire 24 hours after they are sent, or after you successfully set a password.
                  Opening the link does not use it up.
                  {token
                    ? ' Click below to get a fresh one — no email address needed.'
                    : ' Request a new link to continue.'}
                </Alert>
              )}

              {!resendDone && token && (
                <Button variant="primary" className="w-full" isLoading={isResending} disabled={isResending} onClick={handleResend}>
                  {isResending ? 'Sending…' : 'Resend setup email'}
                </Button>
              )}

              {!token && (
                <Button variant="primary" className="w-full" onClick={() => router.push('/auth/forgot-password')}>
                  Request a new code
                </Button>
              )}

              <Button variant="ghost" className="w-full" onClick={() => router.push('/auth/login')}>
                Back to login
              </Button>
            </CardContent>
          </Card>
        </FadeInUp>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--light-bg)] dark:bg-[var(--dark-bg)] py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-300">
      <FadeInUp from={{ opacity: 0, y: 20 }} to={{ opacity: 1, y: 0 }} duration={0.5} className="w-full max-w-md">
        <div className="flex items-center justify-center mb-8">
          <Link href="/" className="inline-block transition-transform hover:scale-105 active:scale-95 cursor-pointer">
            <WordedLogo size="lg" priority />
          </Link>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-center gap-3 mb-2">
              <Lock className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              <CardTitle className="text-2xl font-bold text-light-text-primary dark:text-dark-text-primary">
                Set your password
              </CardTitle>
            </div>
            <p className="text-center text-light-text-secondary dark:text-dark-text-secondary">
              Choose a password to finish setting up your account. This link stays valid until you save a password or 24 hours pass.
            </p>
            <p className="text-center text-xs text-light-text-muted dark:text-dark-text-muted mt-2">
              If you have accounts at more than one school, this password applies to all of them.
            </p>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="error" className="mb-4">
                {error}
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary mb-2">
                  New password *
                </label>
                <div className="relative">
                  <Input
                    name="newPassword"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.newPassword}
                    onChange={handleChange}
                    required
                    placeholder="At least 8 characters"
                    minLength={8}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-light-text-muted dark:text-dark-text-muted hover:text-light-text-primary dark:hover:text-dark-text-primary"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary mb-2">
                  Confirm password *
                </label>
                <div className="relative">
                  <Input
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                    placeholder="Confirm new password"
                    minLength={8}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-light-text-muted dark:text-dark-text-muted hover:text-light-text-primary dark:hover:text-dark-text-primary"
                  >
                    {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                className="w-full"
                isLoading={isSubmitting}
                disabled={isSubmitting || !formData.newPassword || !formData.confirmPassword}
              >
                {isSubmitting ? 'Saving…' : 'Set password'}
              </Button>
            </form>

            <div className="mt-4 text-center">
              <button onClick={() => router.push('/auth/login')} className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
                Back to login
              </button>
            </div>
          </CardContent>
        </Card>
      </FadeInUp>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[var(--light-bg)] dark:bg-[var(--dark-bg)]">
          <LoadingSpinner />
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
