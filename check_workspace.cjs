const { chromium } = require('playwright');
const { exec } = require('child_process');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  page.on('console', msg => {
    console.log(`BROWSER ${msg.type().toUpperCase()}: ${msg.text()}`);
  });

  page.on('pageerror', err => {
    console.log('BROWSER ERROR:', err.message);
  });

  console.log('Starting dev server...');
  const server = exec('npm run dev');

  await new Promise(resolve => setTimeout(resolve, 10000));

  try {
    console.log('Navigating to http://localhost:5173/project/ABC12...');
    await page.goto('http://localhost:5173/project/ABC12');

    await page.waitForTimeout(5000);

    await page.screenshot({ path: 'workspace_v3.png' });
    console.log('Screenshot saved');

    const projectIsolated = await page.isVisible('text=Project Isolated');
    console.log('Project Isolated text visible (expected if not signed in):', projectIsolated);

  } catch (err) {
    console.error('Check failed:', err);
  } finally {
    await browser.close();
    server.kill();
    process.exit(0);
  }
})();
