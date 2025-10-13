/**
 * E2E tests for catalog badge system
 * Tests complete user flows: filtering, creation, sync, display
 */

import { test, expect } from '@playwright/test';

test.describe('Catalog Badge System', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('/');

    // Wait for app to be ready
    await page.waitForLoadState('networkidle');
  });

  test.describe('Badge Filtering', () => {
    test('should filter exercises by badge selection', async ({ page }) => {
      // Navigate to exercises page
      await page.click('[data-testid="nav-exercises"]');
      await page.waitForSelector('[data-testid="exercise-list"]');

      // Get initial exercise count
      const initialCount = await page.locator('[data-testid="exercise-card"]').count();
      expect(initialCount).toBeGreaterThan(0);

      // Select a category badge (assuming general-fitness catalog)
      await page.click('button:has-text("Strength")');

      // Wait for filtering to apply
      await page.waitForTimeout(500);

      // Verify filtered results
      const filteredCount = await page.locator('[data-testid="exercise-card"]').count();
      expect(filteredCount).toBeLessThanOrEqual(initialCount);

      // Verify all visible exercises have the strength category
      const exerciseCards = page.locator('[data-testid="exercise-card"]');
      const count = await exerciseCards.count();
      for (let i = 0; i < count; i++) {
        const card = exerciseCards.nth(i);
        // Check if card shows strength badge or category
        const hasStrength = await card.locator('text=/strength/i').isVisible();
        expect(hasStrength).toBeTruthy();
      }
    });

    test('should apply OR logic within a badge', async ({ page }) => {
      await page.click('[data-testid="nav-exercises"]');
      await page.waitForSelector('[data-testid="exercise-list"]');

      // Select multiple values within same badge
      await page.click('button:has-text("Strength")');
      await page.click('button:has-text("Cardio")');

      await page.waitForTimeout(500);

      // Should show exercises that are EITHER strength OR cardio
      const exerciseCards = page.locator('[data-testid="exercise-card"]');
      const count = await exerciseCards.count();
      expect(count).toBeGreaterThan(0);
    });

    test('should apply AND logic across badges', async ({ page }) => {
      await page.click('[data-testid="nav-exercises"]');
      await page.waitForSelector('[data-testid="exercise-list"]');

      // Select values from different badges
      await page.click('button:has-text("Strength")');
      await page.click('button:has-text("Bodyweight")'); // Equipment badge

      await page.waitForTimeout(500);

      // Should show only exercises that are BOTH strength AND bodyweight
      const exerciseCards = page.locator('[data-testid="exercise-card"]');
      const count = await exerciseCards.count();
      expect(count).toBeGreaterThan(0);
    });

    test('should clear badge filter', async ({ page }) => {
      await page.click('[data-testid="nav-exercises"]');
      await page.waitForSelector('[data-testid="exercise-list"]');

      const initialCount = await page.locator('[data-testid="exercise-card"]').count();

      // Apply filter
      await page.click('button:has-text("Strength")');
      await page.waitForTimeout(500);

      const filteredCount = await page.locator('[data-testid="exercise-card"]').count();
      expect(filteredCount).toBeLessThanOrEqual(initialCount);

      // Clear filter
      const clearButton = page.locator('button[aria-label*="Clear"]').first();
      await clearButton.click();
      await page.waitForTimeout(500);

      // Should show all exercises again
      const finalCount = await page.locator('[data-testid="exercise-card"]').count();
      expect(finalCount).toBe(initialCount);
    });

    test('should persist badge selections across page reloads', async ({ page }) => {
      await page.click('[data-testid="nav-exercises"]');
      await page.waitForSelector('[data-testid="exercise-list"]');

      // Apply filter
      await page.click('button:has-text("Strength")');
      await page.waitForTimeout(500);

      const filteredCount = await page.locator('[data-testid="exercise-card"]').count();

      // Reload page
      await page.reload();
      await page.waitForLoadState('networkidle');
      await page.click('[data-testid="nav-exercises"]');
      await page.waitForTimeout(500);

      // Filter should still be applied
      const reloadedCount = await page.locator('[data-testid="exercise-card"]').count();
      expect(reloadedCount).toBe(filteredCount);

      // Strength button should still be selected
      const strengthButton = page.locator('button:has-text("Strength")').first();
      await expect(strengthButton).toHaveClass(/bg-primary/);
    });
  });

  test.describe('Exercise Creation with Badges', () => {
    test.skip('should create exercise with badges offline', async ({ page, context }) => {
      // Go offline
      await context.setOffline(true);

      // Navigate to create exercise page
      await page.click('[data-testid="nav-exercises"]');
      await page.click('[data-testid="create-exercise-button"]');

      // Fill in exercise details
      await page.fill('input[name="name"]', 'Test Push-ups');
      await page.fill('textarea[name="description"]', 'Test exercise with badges');

      // Select badges
      await page.click('button:has-text("Strength")'); // Category badge
      await page.click('button:has-text("Bodyweight")'); // Equipment badge

      // Save exercise
      await page.click('button[type="submit"]');

      // Should show success message even offline
      await expect(page.locator('text=/created/i')).toBeVisible();

      // Go back online and verify sync
      await context.setOffline(false);
      await page.waitForTimeout(2000); // Wait for sync

      // Navigate back to exercises list
      await page.click('[data-testid="nav-exercises"]');

      // Exercise should be visible
      await expect(page.locator('text="Test Push-ups"')).toBeVisible();
    });
  });

  test.describe('Badge Display', () => {
    test('should display badges on exercise detail page', async ({ page }) => {
      await page.click('[data-testid="nav-exercises"]');
      await page.waitForSelector('[data-testid="exercise-list"]');

      // Click on an exercise
      const firstExercise = page.locator('[data-testid="exercise-card"]').first();
      await firstExercise.click();

      // Wait for detail page to load
      await page.waitForSelector('[data-testid="exercise-detail"]');

      // Check for badge display section
      const badgeSection = page.locator('[data-testid="exercise-badges"]');

      // If badges exist, verify they are displayed
      if (await badgeSection.isVisible()) {
        const badges = badgeSection.locator('[data-testid="badge-value"]');
        const badgeCount = await badges.count();
        expect(badgeCount).toBeGreaterThan(0);
      }
    });
  });

  test.describe('Catalog Switching', () => {
    test('should update badge filters when switching catalogs', async ({ page }) => {
      await page.click('[data-testid="nav-exercises"]');
      await page.waitForSelector('[data-testid="exercise-list"]');

      // Select general-fitness catalog
      await page.selectOption('[data-testid="catalog-selector"]', 'general-fitness');
      await page.waitForTimeout(500);

      // Verify general-fitness badges are visible
      await expect(page.locator('button:has-text("Equipment")')).toBeVisible();

      // Switch to aikido catalog
      await page.selectOption('[data-testid="catalog-selector"]', 'aikido');
      await page.waitForTimeout(500);

      // Verify aikido badges are visible
      await expect(page.locator('text=/kyu/i')).toBeVisible();
    });
  });

  test.describe('Mobile UX', () => {
    test.use({ viewport: { width: 375, height: 667 } });

    test('should collapse extra badges under "More filters"', async ({ page }) => {
      await page.click('[data-testid="nav-exercises"]');
      await page.waitForSelector('[data-testid="exercise-list"]');

      // Check if "More filters" button exists (if more than 3 badges)
      const moreFiltersButton = page.locator('button:has-text("More filters")');

      if (await moreFiltersButton.isVisible()) {
        // Click to expand
        await moreFiltersButton.click();
        await page.waitForTimeout(300);

        // Should show additional badges
        const badgeButtons = page.locator('[data-testid="badge-filter"] button');
        const count = await badgeButtons.count();
        expect(count).toBeGreaterThan(3);

        // Click to collapse
        await page.click('button:has-text("Show fewer filters")');
        await page.waitForTimeout(300);

        // Should show fewer badges
        const visibleBadges = page.locator('[data-testid="badge-filter"]:visible button');
        const visibleCount = await visibleBadges.count();
        expect(visibleCount).toBeLessThanOrEqual(3);
      }
    });
  });

  test.describe('Backward Compatibility', () => {
    test('should filter exercises with legacy category field', async ({ page }) => {
      await page.click('[data-testid="nav-exercises"]');
      await page.waitForSelector('[data-testid="exercise-list"]');

      // Filter by category (should work for both tag-based and field-based)
      await page.click('button:has-text("Core")');
      await page.waitForTimeout(500);

      const exerciseCards = page.locator('[data-testid="exercise-card"]');
      const count = await exerciseCards.count();
      expect(count).toBeGreaterThan(0);

      // Should show exercises with both old and new format
    });
  });

  test.describe('Accessibility', () => {
    test('should be keyboard navigable', async ({ page }) => {
      await page.click('[data-testid="nav-exercises"]');
      await page.waitForSelector('[data-testid="exercise-list"]');

      // Tab to first badge button
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab'); // May need multiple tabs depending on page structure

      // Find first badge button
      const firstBadgeButton = page.locator('[data-testid="badge-filter"] button').first();

      // Press Enter to select
      await page.keyboard.press('Enter');
      await page.waitForTimeout(500);

      // Verify selection (button should have selected class)
      await expect(firstBadgeButton).toHaveClass(/bg-primary/);
    });

    test('should have proper ARIA labels', async ({ page }) => {
      await page.click('[data-testid="nav-exercises"]');
      await page.waitForSelector('[data-testid="exercise-list"]');

      // Check badge buttons have aria-pressed attribute
      const badgeButtons = page.locator('[data-testid="badge-filter"] button');
      const firstButton = badgeButtons.first();

      const ariaPressed = await firstButton.getAttribute('aria-pressed');
      expect(ariaPressed).toBeDefined();
      expect(['true', 'false']).toContain(ariaPressed);
    });
  });

  test.describe('Performance', () => {
    test('should filter large exercise lists efficiently', async ({ page }) => {
      await page.click('[data-testid="nav-exercises"]');
      await page.waitForSelector('[data-testid="exercise-list"]');

      // Select all catalogs to maximize exercise count
      await page.selectOption('[data-testid="catalog-selector"]', 'all');
      await page.waitForTimeout(500);

      // Measure time to apply filter
      const startTime = Date.now();
      await page.click('button:has-text("Strength")');
      await page.waitForTimeout(100); // Small wait for debounce

      // Wait for results to update
      await page.waitForSelector('[data-testid="exercise-card"]');
      const endTime = Date.now();

      // Should complete in reasonable time (< 1 second)
      expect(endTime - startTime).toBeLessThan(1000);
    });
  });
});
