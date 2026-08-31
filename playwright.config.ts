import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, 'e2e/.env.e2e') });
dotenv.config({ path: path.resolve(__dirname, '../backend/.env') });

const baseURL = process.env.E2E_BASE_URL || 'http://localhost:3000';
const authFile = path.join(__dirname, 'e2e/.auth/school-admin.json');
const teacherPrimaryAuth = path.join(__dirname, 'e2e/.auth/teacher-primary.json');
const headed = process.env.E2E_HEADED !== '0';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  timeout: 240_000,
  expect: { timeout: 20_000 },
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL,
    headless: !headed,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 20_000,
  },
  projects: [
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: 'teacher-setup',
      testMatch: /teacher-auth\.setup\.ts/,
    },
    {
      // Uses saved school-admin session — no OTP re-login
      name: 'school-admin',
      testMatch: /school-admin\/.*\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        storageState: authFile,
      },
    },
    {
      name: 'teacher',
      testMatch: /teacher\/.*\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        // Specs set primary/secondary storageState per describe; default to primary
        storageState: teacherPrimaryAuth,
      },
    },
    {
      name: 'super-admin',
      testMatch: /super-admin\/.*\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
      },
    },
    {
      name: 'content',
      testMatch: /content\/.*\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        storageState: authFile,
        viewport: { width: 1440, height: 900 },
        headless: true,
      },
    },
  ],
});
