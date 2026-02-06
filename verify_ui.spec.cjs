const { test, expect } = require('@playwright/test');

test('workspace UI check', async ({ page }) => {
  await page.goto('http://localhost:5174/workspace/1');
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'workspace_check.png', fullPage: true });
});
