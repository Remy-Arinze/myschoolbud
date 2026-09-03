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

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [formData, setFormData] = useState({ newPassword: '', confirmPassword: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendDone, setResendDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tokenExpired, setTokenExpired] = useState(false);

  useEffect(() => {
    if (!token) setTokenExpired(true);
  }, [token]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError(null);
  };

  // One-click resend — uses the expired token to look up the user server-side
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
        // If the server can't help (token too old etc.) fall back to forgot-password
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

    if (!token) { setTokenExpired(true); return; }
    if (formData.newPassword.length < 8) { setError('Password must be at least 8 characters long'); return; }
    if (formData.newPassword !== formData.confirmPassword) { setError('Passwords do not match'); return; }

    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_BASE}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: formData.newPassword }),
      });

      const data = await response.json();

      if (!response.ok) {
        const msg = data.message || 'Failed to reset password';
        // Any expiry/invalid error → show the expired UI with one-click resend
        if (
          msg.toLowerCase().includes('expired') ||
          msg.toLowerCase().includes('invalid') ||
          msg.toLowerCase().includes('already been used') ||
          response.status === 400 ||
          response.status === 401
        ) {
          setTokenExpired(true);
          return;
        }
        throw new Error(msg);
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

  // ── Expired / invalid token screen ───────────────────────────────────────
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
                  Link Expired
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
                  Setup links expire after 24 hours.
                  {token
                    ? " Click below to get a fresh one — no email address needed."
                    : " Use the button below to request a new link."}
                </Alert>
              )}

              {!resendDone && token && (
                <Button variant="primary" className="w-full" isLoading={isResending} disabled={isResending} onClick={handleResend}>
                  {isResending ? 'Sending…' : 'Resend Setup Email'}
                </Button>
              )}

              {/* Fallback when token is missing entirely */}
              {!token && (
                <Button variant="primary" className="w-full" onClick={() => router.push('/auth/forgot-password')}>
                  Request a New Link
                </Button>
              )}

              <Button variant="ghost" className="w-full" onClick={() => router.push('/auth/login')}>
                Back to Login
              </Button>
            </CardContent>
          </Card>
        </FadeInUp>
      </div>
    );
  }

  // ── Password form ─────────────────────────────────────────────────────────
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
                Set Your Password
              </CardTitle>
            </div>
            <p className="text-center text-light-text-secondary dark:text-dark-text-secondary">
              Enter your new password to complete account setup
            </p>
            <p className="text-center text-xs text-light-text-muted dark:text-dark-text-muted mt-2">
              Note: If you have accounts at multiple schools, this password applies to all of them.
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
                  New Password *
                </label>
                <div className="relative">
                  <Input
                    name="newPassword"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.newPassword}
                    onChange={handleChange}
                    required
                    placeholder="Enter new password (min. 8 characters)"
                    minLength={8}
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-light-text-muted dark:text-dark-text-muted hover:text-light-text-primary dark:hover:text-dark-text-primary">
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary mb-2">
                  Confirm Password *
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
                  />
                  <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-light-text-muted dark:text-dark-text-muted hover:text-light-text-primary dark:hover:text-dark-text-primary">
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
                {isSubmitting ? 'Setting Password…' : 'Set Password'}
              </Button>
            </form>

            <div className="mt-4 text-center">
              <button onClick={() => router.push('/auth/login')} className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
                Back to Login
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
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[var(--light-bg)] dark:bg-[var(--dark-bg)]">
        <LoadingSpinner />
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}
