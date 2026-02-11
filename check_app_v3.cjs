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
    console.log('Navigating to http://localhost:5173...');
    await page.goto('http://localhost:5173');

    await page.waitForTimeout(5000);

    const onyxText = await page.isVisible('text=OnyxGPT');
    console.log('OnyxGPT text visible:', onyxText);

    const bodyBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    console.log('Body background color:', bodyBg);

    await page.screenshot({ path: 'app_v3_start.png' });
    console.log('Screenshot saved');

  } catch (err) {
    console.error('Check failed:', err);
  } finally {
    await browser.close();
    server.kill();
    process.exit(0);
  }
})();
