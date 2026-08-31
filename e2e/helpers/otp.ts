import fs from 'fs';
import path from 'path';

function otpFilePath() {
  return path.resolve(__dirname, '../.otp');
}

/**
 * Manual OTP sources (preferred):
 * 1. E2E_OTP env var
 * 2. frontend/e2e/.otp file (write the 6-digit code there when email arrives)
 */
function readManualOtp(): string | null {
  const fromEnv = process.env.E2E_OTP?.trim();
  if (fromEnv && /^\d{6}$/.test(fromEnv)) {
    return fromEnv;
  }

  const filePath = otpFilePath();
  if (!fs.existsSync(filePath)) {
    return null;
  }

  const raw = fs.readFileSync(filePath, 'utf8').trim();
  const match = raw.match(/\d{6}/);
  return match?.[0] ?? null;
}

export function clearManualOtp() {
  delete process.env.E2E_OTP;
  const filePath = otpFilePath();
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

/**
 * Wait for a 6-digit OTP you paste from email.
 * Put it in e2e/.otp or set E2E_OTP=123456 before/during the wait.
 */
export async function waitForLoginOtp(
  email: string,
  options: { timeoutMs?: number; pollMs?: number } = {},
): Promise<string> {
  const timeoutMs = options.timeoutMs ?? 180_000; // 3 min to paste from mail
  const pollMs = options.pollMs ?? 1000;
  const started = Date.now();
  const filePath = otpFilePath();

  console.log(
    `\n[e2e] Waiting for OTP for ${email}.\n` +
      `      Paste the 6-digit code into: ${filePath}\n` +
      `      (or set E2E_OTP=123456)\n`,
  );

  while (Date.now() - started < timeoutMs) {
    const otp = readManualOtp();
    if (otp) {
      clearManualOtp();
      return otp;
    }
    await new Promise((resolve) => setTimeout(resolve, pollMs));
  }

  throw new Error(
    `Timed out waiting for manual OTP for ${email}. ` +
      `Email yourself the code, then write it to ${filePath} or set E2E_OTP.`,
  );
}

// Kept for API compatibility with older auth helper calls
export function getNestLogOffset(): number {
  return 0;
}
