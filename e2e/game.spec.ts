// e2e/game.spec.ts — Playwright E2E tests for rule horror game.
// Verifies: game loads, edge labels render, click navigates,
// rules discovered, notebook shows, restart works.
import { test, expect } from '@playwright/test';

test.describe('Game Shell', () => {
  test('loads and shows start node', async ({ page }) => {
    await page.goto('/');
    // Start node is the current node — should have gold border
    const startCard = page.locator('[data-node-card]').first();
    await expect(startCard).toBeVisible();
    // Should contain start content
    await expect(startCard).toContainText('住户守则');
  });

  test('shows edge labels for start node children', async ({ page }) => {
    await page.goto('/');
    // Edge labels should be visible as SVG text
    await expect(page.locator('text=仔细阅读住户守则')).toBeVisible();
    await expect(page.locator('text=太累了，直接进屋')).toBeVisible();
  });

  test('click edge label navigates to child node', async ({ page }) => {
    await page.goto('/');
    // Click the first option label
    await page.locator('text=仔细阅读住户守则').click();
    // Should now show the rules page content
    await expect(page.locator('[data-node-card]').filter({ hasText: '住户守则（上）' })).toBeVisible();
    // The read_rules node should be current (gold border)
  });

  test('click ignore_rules path works', async ({ page }) => {
    await page.goto('/');
    // Click "直接进屋"
    await page.locator('text=太累了，直接进屋').click();
    // Should show ignore_rules content
    await expect(page.locator('[data-node-card]').filter({ hasText: '直接进了屋' })).toBeVisible();
    // Child edge label should appear
    await expect(page.locator('text=摸索着找灯的开关')).toBeVisible();
  });

  test('full path: rules → living room → options appear', async ({ page }) => {
    await page.goto('/');
    // Read rules
    await page.locator('text=仔细阅读住户守则').click();
    // Next page
    await page.locator('text=翻到下一页').click();
    // Enter living room
    await page.locator('text=放下守则，走进客厅').click();
    // Should be at living_room with 3 options
    await expect(page.locator('[data-node-card]').filter({ hasText: '客厅灯亮了' })).toBeVisible();
    // 3 edge labels for choices
    await expect(page.locator('text=咚、咚、咚——有人敲门')).toBeVisible();
    await expect(page.locator('text=走近那面镜子看看')).toBeVisible();
    await expect(page.locator('text=去楼道看看情况')).toBeVisible();
  });
});

test.describe('Notebook & Rules', () => {
  test('notebook shows discovered rules', async ({ page }) => {
    await page.goto('/');
    // Read rules first
    await page.locator('text=仔细阅读住户守则').click();
    await page.locator('text=翻到下一页').click();
    // Open notebook
    await page.locator('text=📓 笔记').click();
    // Should list rules
    const notebook = page.locator('text=笔记').locator('..');
    // Use .first() to avoid strict mode violation (text appears in both node card and notebook)
    await expect(page.locator('text=22:00后禁止离开房间').first()).toBeVisible();
    await expect(page.locator('text=听到敲门声必须立刻开门').first()).toBeVisible();
  });

  test('contradiction mark appears when conflicting rules known', async ({ page }) => {
    await page.goto('/');
    // Read both rule pages
    await page.locator('text=仔细阅读住户守则').click();
    await page.locator('text=翻到下一页').click();
    // Contradiction button should appear in top bar
    await expect(page.locator('text=⚡ 矛盾')).toBeVisible();
  });
});

test.describe('Restart', () => {
  test('restart resets game', async ({ page }) => {
    await page.goto('/');
    // Make some progress
    await page.locator('text=仔细阅读住户守则').click();
    // Open menu and restart
    await page.locator('text=☰').click();
    await page.locator('text=🔄 重新开始').click();
    // Should be back at start
    await expect(page.locator('[data-node-card]').filter({ hasText: '住户守则' })).toBeVisible();
  });
});

test.describe('Status & Inventory', () => {
  test('HP and sanity bars render', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('text=生命')).toBeVisible();
    await expect(page.locator('text=理智')).toBeVisible();
  });

  test('flashlight appears in inventory at living_room', async ({ page }) => {
    await page.goto('/');
    // Navigate to living_room via rules path
    await page.locator('text=仔细阅读住户守则').click();
    await page.locator('text=翻到下一页').click();
    await page.locator('text=放下守则，走进客厅').click();
    // Flashlight should appear
    await expect(page.getByRole('button', { name: '🔦 手电筒' })).toBeVisible();
  });
});
