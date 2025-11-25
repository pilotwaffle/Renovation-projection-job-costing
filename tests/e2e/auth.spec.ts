import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('should display login page', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('h2')).toContainText('Sign in to your account');
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
  });

  test('should show validation for empty fields', async ({ page }) => {
    await page.goto('/login');
    await page.locator('button[type="submit"]').click();
    // Check that required fields are enforced
    await expect(page.locator('input[name="email"]')).toHaveAttribute('required', '');
    await expect(page.locator('input[name="password"]')).toHaveAttribute('required', '');
  });

  test('should navigate to signup page', async ({ page }) => {
    await page.goto('/login');
    await page.locator('a[href="/signup"]').click();
    await expect(page).toHaveURL(/.*signup/);
  });
});

test.describe('Protected Routes', () => {
  test('should redirect unauthenticated users to login', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/.*login/);
  });

  test('should redirect from jobs page to login', async ({ page }) => {
    await page.goto('/jobs');
    await expect(page).toHaveURL(/.*login/);
  });
});
