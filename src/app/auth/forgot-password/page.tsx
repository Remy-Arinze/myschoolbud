'use client';

import { useState, Suspense, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Alert';
import { FadeInUp } from '@/components/ui/FadeInUp';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Mail, ArrowLeft, Eye, EyeOff, Lock } from 'lucide-react';
import Link from 'next/link';
import { WordedLogo } from '@/components/layout/WordedLogo';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

function ForgotPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefill = (searchParams.get('identifier') || searchParams.get('email') || '').trim();

  const [step, setStep] = useState<'request' | 'verify'>(prefill ? 'verify' : 'request');
  const [identifier, setIdentifier] = useState(prefill);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(prefill ? 0 : 60);
  const [error, setError] = useState<string | null>(null);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (step !== 'verify' || resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [step, resendCooldown]);

  useEffect(() => {
    if (step === 'verify') {
      otpRefs.current[0]?.focus();
    }
  }, [step]);

  const requestCode = async (id: string) => {
    const response = await fetch(`${API_BASE}/auth/request-password-reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emailOrPublicId: id, email: id }),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Failed to send verification code');
    }
  };

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const id = identifier.trim();
    if (!id) {
      setError('Enter your email address or Public ID');
      return;
    }

    setIsSubmitting(true);
    try {
      await requestCode(id);
      setStep('verify');
      setResendCooldown(60);
      setOtp(['', '', '', '', '', '']);
      toast.success('If an account exists, a verification code is on its way.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'An error occurred';
      setError(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || isResending) return;
    setIsResending(true);
    setError(null);
    try {
      await requestCode(identifier.trim());
      setResendCooldown(60);
      setOtp(['', '', '', '', '', '']);
      otpRefs.current[0]?.focus();
      toast.success('A new code has been sent if the account exists.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not resend code';
      setError(msg);
    } finally {
      setIsResending(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value && !/^\d$/.test(value)) return;
    const next = [...otp];
    next[index] = value;
    setOtp(next);
    setError(null);
    if (value && index < 5) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const digits = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6).split('');
    if (!digits.length) return;
    const next = [...otp];
    digits.forEach((d, i) => {
      if (i < 6) next[i] = d;
    });
    setOtp(next);
    otpRefs.current[Math.min(digits.length, 5)]?.focus();
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const otpCode = otp.join('');
    if (otpCode.length !== 6) {
      setError('Enter the 6-digit code from your email');
      return;
    }
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_BASE}/auth/verify-reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailOrPublicId: identifier.trim(),
          email: identifier.trim(),
          otpCode,
          newPassword,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Could not reset password');
      }
      toast.success('Password reset. You can now log in.');
      router.push('/auth/login');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'An error occurred';
      setError(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

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
              {step === 'request' ? (
                <Mail className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              ) : (
                <Lock className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              )}
              <CardTitle className="text-2xl font-bold text-light-text-primary dark:text-dark-text-primary">
                {step === 'request' ? 'Forgot password?' : 'Set a new password'}
              </CardTitle>
            </div>
            <p className="text-center text-light-text-secondary dark:text-dark-text-secondary">
              {step === 'request'
                ? 'Enter the email or Public ID you use to sign in. If we find an account, we will send a 6-digit code that expires in 10 minutes.'
                : `Enter the code sent to the email on this account, then choose a new password.`}
            </p>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="error" className="mb-4">
                {error}
              </Alert>
            )}

            {step === 'request' ? (
              <form onSubmit={handleRequest} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary mb-2">
                    Email or Public ID *
                  </label>
                  <Input
                    type="text"
                    value={identifier}
                    onChange={(e) => {
                      setIdentifier(e.target.value);
                      setError(null);
                    }}
                    required
                    placeholder="name@school.com or your Public ID"
                    autoFocus
                    autoComplete="username"
                  />
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  className="w-full"
                  isLoading={isSubmitting}
                  disabled={isSubmitting || !identifier.trim()}
                >
                  {isSubmitting ? 'Sending…' : 'Send verification code'}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleVerify} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary mb-2">
                    Verification code
                  </label>
                  <div className="flex justify-between gap-1.5 sm:gap-2">
                    {otp.map((digit, index) => (
                      <input
                        key={index}
                        ref={(el) => {
                          otpRefs.current[index] = el;
                        }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpChange(index, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(index, e)}
                        onPaste={index === 0 ? handleOtpPaste : undefined}
                        className="w-[42px] h-[48px] sm:w-12 sm:h-12 text-center text-xl font-bold border-2 rounded-xl bg-white dark:bg-[#151a23] text-[var(--light-text-primary)] dark:text-[var(--dark-text-primary)] border-gray-200 dark:border-[#1a1f2e] focus:outline-none focus:ring-4 focus:ring-[#2490FD]/20 focus:border-[#2490FD]"
                        disabled={isSubmitting}
                        aria-label={`Digit ${index + 1}`}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-light-text-muted dark:text-dark-text-muted mt-2">
                    Account: <span className="font-medium">{identifier}</span>
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary mb-2">
                    New password *
                  </label>
                  <div className="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => {
                        setNewPassword(e.target.value);
                        setError(null);
                      }}
                      required
                      minLength={8}
                      placeholder="At least 8 characters"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-light-text-muted dark:text-dark-text-muted"
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
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        setError(null);
                      }}
                      required
                      minLength={8}
                      placeholder="Confirm new password"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-light-text-muted dark:text-dark-text-muted"
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
                  disabled={isSubmitting || otp.some((d) => !d) || !newPassword || !confirmPassword}
                >
                  {isSubmitting ? 'Saving…' : 'Reset password'}
                </Button>

                <p className="text-center text-sm text-light-text-secondary dark:text-dark-text-secondary">
                  Didn&apos;t get a code?{' '}
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={resendCooldown > 0 || isResending}
                    className="text-blue-600 dark:text-blue-400 font-semibold disabled:opacity-50"
                  >
                    {isResending ? 'Sending…' : resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}
                  </button>
                </p>

                <button
                  type="button"
                  className="w-full text-sm text-light-text-secondary dark:text-dark-text-secondary hover:underline"
                  onClick={() => {
                    setStep('request');
                    setError(null);
                    setOtp(['', '', '', '', '', '']);
                    setNewPassword('');
                    setConfirmPassword('');
                  }}
                >
                  Use a different email or Public ID
                </button>
              </form>
            )}

            <div className="mt-4 text-center">
              <Link
                href="/auth/login"
                className="inline-flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to login
              </Link>
            </div>
          </CardContent>
        </Card>
      </FadeInUp>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[var(--light-bg)] dark:bg-[var(--dark-bg)]">
          <LoadingSpinner />
        </div>
      }
    >
      <ForgotPasswordContent />
    </Suspense>
  );
}
