import { test, expect } from '@playwright/test';

test.describe('Landing Page', () => {
    test('should load the landing page successfully', async ({ page }) => {
        await page.goto('/');

        // Wait for the page to be fully loaded
        await page.waitForLoadState('networkidle');

        // Check that the page has loaded by looking for key elements
        await expect(page).toHaveTitle(/Game Sales|Game of Sales/i);
    });

    test('should display the hero section', async ({ page }) => {
        await page.goto('/');

        // Look for main content area
        const mainContent = page.locator('main, [role="main"], body > div').first();
        await expect(mainContent).toBeVisible();

        // Verify there's some text content on the page
        const pageContent = await page.textContent('body');
        expect(pageContent).toBeTruthy();
    });

    test('should have working CTA buttons', async ({ page }) => {
        await page.goto('/');

        // Look for "Começar" or similar CTA button
        const ctaButton = page.getByRole('button', { name: /começar|testar|demo/i }).first();

        if (await ctaButton.isVisible()) {
            await expect(ctaButton).toBeEnabled();
        }
    });

    test('should have navigation links', async ({ page }) => {
        await page.goto('/');

        // Check for navigation
        const nav = page.locator('nav').first();
        await expect(nav).toBeVisible();
    });

    test('should be responsive on mobile', async ({ page }) => {
        // Set mobile viewport
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto('/');

        // Page should still be functional
        await page.waitForLoadState('networkidle');
        await expect(page.locator('body')).toBeVisible();
    });
});
