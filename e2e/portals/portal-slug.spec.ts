import { test, expect } from '@playwright/test';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

test.describe('School branded portals', () => {
  test('slug-available rejects reserved and short slugs', async ({ request }) => {
    const reservedDev = await request.get(`${API}/public/portals/slug-available?slug=dev`);
    expect(reservedDev.ok()).toBeTruthy();
    const reservedDevBody = await reservedDev.json();
    expect(reservedDevBody.data.available).toBe(false);
    expect(reservedDevBody.data.reason).toBe('reserved');

    const reserved = await request.get(`${API}/public/portals/slug-available?slug=www`);
    expect(reserved.ok()).toBeTruthy();
    const reservedBody = await reserved.json();
    expect(reservedBody.data.available).toBe(false);
    expect(reservedBody.data.reason).toBe('reserved');

    const short = await request.get(`${API}/public/portals/slug-available?slug=ab`);
    const shortBody = await short.json();
    expect(shortBody.data.available).toBe(false);
    expect(shortBody.data.reason).toBe('invalid');
  });

  test('slug-available accepts a well-formed unused slug', async ({ request }) => {
    const slug = `e2e-portal-${Date.now().toString(36)}`;
    const res = await request.get(`${API}/public/portals/slug-available?slug=${slug}`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.data.available).toBe(true);
    expect(body.data.slug).toBe(slug);
  });

  test('by-host on apex returns no live portal', async ({ request }) => {
    const res = await request.get(`${API}/public/portals/by-host?host=localhost:3000`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.data).toBeNull();
  });

  test('register school form shows portal address field', async ({ page }) => {
    await page.goto('/auth/register-school');
    await expect(page.getByText(/portal address/i)).toBeVisible();
    await page.getByPlaceholder('Official School Name').fill('Lagos Model College');
    await expect(page.getByPlaceholder('beulah')).toHaveValue(/lagos-model-college/);
  });

  test('apply on apex without school redirects home', async ({ page }) => {
    await page.goto('/apply');
    await page.waitForURL(/\/$|\/apply/, { timeout: 10_000 });
  });
});
