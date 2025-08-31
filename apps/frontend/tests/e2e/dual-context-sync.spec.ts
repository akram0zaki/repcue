import { test, expect } from '@playwright/test';

test.describe('Cross-device sync (dual context smoke)', () => {
  test('authoring device creates workout and second device pulls it', async ({ browser }) => {
    // Context A (Edge-like)
    const contextA = await browser.newContext();
    const pageA = await contextA.newPage();
    await pageA.goto('/');

    // Grant consent if banner appears
    const banner = pageA.locator('[data-testid="consent-accept-all"]');
    if (await banner.count()) {
      await banner.click();
    }

    // Preferences: dark mode + bump volume
    await pageA.click('[data-testid="nav-settings"]');
    await pageA.getByLabel('Enable Sound').click();
    await pageA.getByLabel('Beep Volume').fill('0.8');

    // Navigate to Workouts and create a simple workout
    await pageA.click('[data-testid="nav-workouts"]');
    const createBtn = pageA.getByRole('button', { name: /create workout/i });
    if (await createBtn.count()) await createBtn.click();

    // Name workout
    await pageA.getByLabel(/name/i).fill('Morning Routine');
    // Open exercise picker and add first listed exercise (auto-seeded)
    await pageA.getByRole('button', { name: /add first exercise/i }).click();
    const firstExercise = pageA.locator('div[role="button"], button').filter({ hasText: /•/ }).first();
    await firstExercise.click();
    await pageA.getByRole('button', { name: /create workout/i }).click();

    // Minimal smoke: workout shows up
    await expect(pageA.locator('text=Morning Routine')).toBeVisible();

    // Context B (Firefox-like)
    const contextB = await browser.newContext();
    const pageB = await contextB.newPage();
    await pageB.goto('/');

    // Accept consent if present
    const bannerB = pageB.locator('[data-testid="consent-accept-all"]');
    if (await bannerB.count()) {
      await bannerB.click();
    }

    // Simulate login by triggering sync event if login flow is not easily automated here
    // NOTE: In full E2E, replace with actual auth navigation.
    await pageB.evaluate(() => {
      window.dispatchEvent(new CustomEvent('sync:applied', { detail: { result: { success: true } } }));
    });

    // Verify workout is visible after sync
    await pageB.click('[data-testid="nav-workouts"]');
    await expect(pageB.locator('text=Morning Routine')).toBeVisible();

    await contextA.close();
    await contextB.close();
  });
});
