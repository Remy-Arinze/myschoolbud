import { expect, type Page } from '@playwright/test';
import { loginWithOtp } from './login';

export function getSchoolAdminCredentials() {
  const email = process.env.E2E_SCHOOL_ADMIN_EMAIL;
  const password = process.env.E2E_SCHOOL_ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error(
      'Missing E2E_SCHOOL_ADMIN_EMAIL / E2E_SCHOOL_ADMIN_PASSWORD. Copy e2e/.env.e2e.example to e2e/.env.e2e.',
    );
  }

  return { email, password };
}

export async function loginAsSchoolAdmin(page: Page) {
  const { email, password } = getSchoolAdminCredentials();
  await loginWithOtp(page, email, password, /\/dashboard\/school/);
}

export function getTeacherCredentials(kind: 'primary' | 'secondary' = 'primary') {
  const email =
    kind === 'primary'
      ? process.env.E2E_TEACHER_PRIMARY_EMAIL || 'remyarinze+e2e-t-pri@gmail.com'
      : process.env.E2E_TEACHER_SECONDARY_EMAIL || 'remyarinze+e2e-t-sec@gmail.com';
  const password = process.env.E2E_TEACHER_PASSWORD || process.env.E2E_SCHOOL_ADMIN_PASSWORD || 'Test1234!';
  return { email, password };
}

export async function loginAsTeacher(page: Page, kind: 'primary' | 'secondary' = 'primary') {
  const { email, password } = getTeacherCredentials(kind);
  await loginWithOtp(page, email, password, /\/dashboard\/teacher/);
}
